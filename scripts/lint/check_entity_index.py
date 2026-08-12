"""
File: scripts/lint/check_entity_index.py
Purpose: Derive the Wave-1 entity count from schema.prisma and 02a §0 instead of counting by hand.
Category: Tooling / lint
Scope: Phase W08

Description:
    02a §0 opens with a rule about itself: "Nothing is buildable that is not on
    this list; adding an entity means adding a row here in the same change."
    Nothing enforced it. RefCodeCounter was built in W04 and sat off the index
    for three phases, and the "N / 35" figure quoted in CLAUDE.md, ROADMAP.md
    and three change records was written by hand each time -- so it was 8, 9, 10
    and 12 in documents that were all current (AD-EntityCountDerivation-1).

    This detector reads both sides and reports the intersection:
      A = models in schema.prisma (with their @@map table names)
      B = entities on the 02a §0 index, per section, filtered to Wave 1
    A \\ (B + EXCLUDED) non-empty is a hard failure -- that is exactly the shape
    AD-EntityIndexIncomplete-1 describes. Building something the index lists as
    "not yet specified" fails too, for the opposite reason.

    ⚠️ Names do NOT match mechanically across the two sides, so the mapping is
    explicit rather than derived. Measured in W08 Day 0: the model is
    `ExtensionField`, the table is `extension_fields`, and the index calls it
    `extension_field_catalog` -- three names, no rule connecting them. A detector
    that compared strings would have reported a false orphan and a false gap in
    the same run.

Key Components:
    - EXCLUDED: infrastructure tables that are deliberately not domain entities.
      A LIST OF NAMES, never a pattern -- a pattern would also swallow the next
      real entity someone forgets to index, which is the bug this file exists for.
    - ALIASES: model name -> the name 02a §0 uses, where they differ.
    - parse_schema_models() / parse_index(): the two readers.
    - self_test(): runs unconditionally, before the real scan.

Usage:
    python scripts/lint/check_entity_index.py [--root <repo_root>] [--self-test]

Created: 2026-08-12 (Phase W08)
Last Modified: 2026-08-12

Modification History (newest-first):
    - 2026-08-12: Initial creation (Phase W08) — closes AD-EntityCountDerivation-1

Related:
    - docs/02-architecture/02a-data-model-spec.md §0
    - docs/rules-on-demand/lint-detector-authoring.md
    - scripts/assert-no-scope-bypass.mjs (the unconditional-self-test shape)
"""

import argparse
import re
import sys
from pathlib import Path

LINT_DIR = Path(__file__).resolve().parent

SCHEMA_REL = "apps/api/prisma/schema.prisma"
INDEX_REL = "docs/02-architecture/02a-data-model-spec.md"
FIXTURE_REL = "scripts/lint/__fixtures__/entity-index-drift/schema-with-orphan.prisma"

# === EXCLUDED: deliberately off the index ===================================
# Why a list and not a rule: the decision to exclude is a judgement about what
# kind of thing a table is, and no column tells you that. RefCodeCounter carries
# org_entity_id and is entity-scoped ON PURPOSE (schema.prisma:163) -- so "has no
# org_entity_id" would have been the wrong test, and it is the test this file's
# plan originally proposed before Day 0 measured it.
#
# What actually separates it: it has none of the §1.1 base fields (no id, no
# ref_code, no status, no owner_user_id, no version, no extensions, no
# retired_at; its key is the composite (org_entity_id, entity_type)), and it is
# the mechanism that ISSUES ref_code rather than a record that carries one.
#
# Adding a name here is a decision. Make it in the same change as the table, and
# say why on the line.
EXCLUDED: dict[str, str] = {
    "RefCodeCounter": "ref_code sequence state; no §1.1 base fields; issues codes rather than carrying one",
}

# === ALIASES: model name -> the name 02a §0 uses ============================
# Only for entities where the index name is neither the model name nor the table
# name. Each entry is a documented mismatch, not a convenience.
ALIASES: dict[str, str] = {
    # model ExtensionField / table extension_fields / index extension_field_catalog
    "ExtensionField": "extension_field_catalog",
}

# The four subsections of 02a §0. The first three carry a Wave column; the
# fourth ("Not yet specified") does not, and is not part of the denominator --
# it is the list of things that must NOT be built.
SECTION_SPECIFIED = "Shared core"
SECTION_FOUNDATION = "Foundation services"
SECTION_MODULE = "Module-local"
SECTION_BLOCKED = "Not yet specified"

_BACKTICK = re.compile(r"`([^`]+)`")
_MODEL = re.compile(r"^model\s+(\w+)\s*\{", re.MULTILINE)
_MAP = re.compile(r'@@map\("([^"]+)"\)')


def entities_in_cell(cell: str) -> list[str]:
    """Backticked tokens that look like entity names.

    Cells mix entity names with prose that also uses backticks, e.g.
    "`Role` · `Permission` (and the `(user, role, entity_scope)` assignment)".
    An entity name has no spaces, commas or parentheses; the assignment tuple has
    all three.
    """
    out = []
    for tok in _BACKTICK.findall(cell):
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", tok):
            out.append(tok)
    return out


def parse_schema_models(text: str) -> dict[str, str]:
    """model name -> table name (from @@map, or the model name when absent)."""
    models: dict[str, str] = {}
    positions = [(m.group(1), m.start()) for m in _MODEL.finditer(text)]
    for i, (name, start) in enumerate(positions):
        end = positions[i + 1][1] if i + 1 < len(positions) else len(text)
        block = text[start:end]
        mapped = _MAP.search(block)
        models[name] = mapped.group(1) if mapped else name
    return models


def parse_index(text: str) -> tuple[dict[str, set[str]], set[str]]:
    """Return ({section: wave-1 entity names}, blocked entity names).

    Only §0 is read: the parse stops at "## 1.", because §3 names every entity
    again in prose and would double-count.
    """
    start = text.find("## 0. Entity index")
    if start < 0:
        raise SystemExit("check-entity-index: FAIL — '## 0. Entity index' not found")
    end = text.find("\n## 1.", start)
    section_text = text[start : end if end > 0 else len(text)]

    sections: dict[str, set[str]] = {
        SECTION_SPECIFIED: set(),
        SECTION_FOUNDATION: set(),
        SECTION_MODULE: set(),
    }
    blocked: set[str] = set()
    current: str | None = None

    for line in section_text.splitlines():
        if line.startswith("### "):
            head = line[4:]
            current = next(
                (k for k in (*sections, SECTION_BLOCKED) if head.startswith(k)), None
            )
            continue
        if current is None or not line.startswith("|"):
            continue

        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 2 or set(cells[0]) <= set("- :"):
            continue  # separator row
        names = entities_in_cell(cells[0])
        if not names:
            continue

        if current == SECTION_BLOCKED:
            blocked.update(names)
        elif cells[1].strip() == "1":  # Wave column; Wave 2 is out of M1's scope
            sections[current].update(names)

    return sections, blocked


def orphans(models: dict[str, str], indexed: set[str]) -> list[str]:
    """Models that are on neither the index nor the excluded list."""
    out = []
    for model, table in models.items():
        if model in EXCLUDED:
            continue
        candidates = {model, table, ALIASES.get(model, "")}
        if not (candidates & indexed):
            out.append(model)
    return sorted(out)


def self_test(root: Path) -> None:
    """Does the detector still detect? Runs before the real scan, not behind a flag.

    A detector whose pattern goes stale reports zero violations and exits 0,
    which reads exactly like success (AD-NegativeGate-1). The fixture is a
    schema carrying one model that is on no index, and it must be caught.
    """
    fixture = root / FIXTURE_REL
    if not fixture.is_file():
        raise SystemExit(
            f"check-entity-index: FAIL — self-test fixture missing: {FIXTURE_REL}\n"
            "Without it nothing proves the detector still detects."
        )
    index_text = (root / INDEX_REL).read_text(encoding="utf-8")
    sections, _ = parse_index(index_text)
    indexed = set().union(*sections.values())

    found = orphans(parse_schema_models(fixture.read_text(encoding="utf-8")), indexed)
    if not found:
        raise SystemExit(
            "check-entity-index: FAIL — the self-test fixture was NOT flagged.\n"
            f"Fixture: {FIXTURE_REL}\n"
            "Either the parser went stale or the fixture was 'cleaned up'. Both\n"
            "leave a detector that passes everything."
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Derive the Wave-1 entity count.")
    parser.add_argument("--root", default=str(LINT_DIR.parents[1]))
    parser.add_argument(
        "--self-test", action="store_true", help="Meta-verification only, then exit."
    )
    cli = parser.parse_args(argv)
    root = Path(cli.root)

    self_test(root)
    if cli.self_test:
        print("check-entity-index: SELF-TEST PASS — fixture orphan detected.")
        return 0

    models = parse_schema_models((root / SCHEMA_REL).read_text(encoding="utf-8"))
    sections, blocked = parse_index((root / INDEX_REL).read_text(encoding="utf-8"))
    indexed = set().union(*sections.values())

    found = orphans(models, indexed)
    built_blocked = sorted(
        m
        for m, t in models.items()
        if m not in EXCLUDED and ({m, t, ALIASES.get(m, "")} & blocked)
    )
    built = sorted(
        m
        for m, t in models.items()
        if m not in EXCLUDED and ({m, t, ALIASES.get(m, "")} & indexed)
    )

    for name, members in sections.items():
        print(f"  {name}: {len(members)} Wave-1 entities on the index")
    print(f"  excluded (deliberate): {', '.join(sorted(EXCLUDED)) or '(none)'}")
    print(f"  models in schema.prisma: {len(models)}")

    if found:
        print(
            f"check-entity-index: FAIL — {len(found)} model(s) on no index row: "
            f"{', '.join(found)}. 02a §0 says adding an entity means adding a row "
            "there in the same change; add one, or add the name to EXCLUDED with "
            "the reason."
        )
        return 1
    if built_blocked:
        print(
            f"check-entity-index: FAIL — {len(built_blocked)} model(s) the index "
            f"lists as not-yet-specified: {', '.join(built_blocked)}."
        )
        return 1

    print(f"check-entity-index: OK ({len(built)} / {len(indexed)} Wave-1 entities built)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
