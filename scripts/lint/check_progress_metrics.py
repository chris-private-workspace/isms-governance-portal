"""
File: scripts/lint/check_progress_metrics.py
Purpose: Derive the five Wave-1 progress rulers from the repo and compare them to what PROGRESS-METRICS.md declares.
Category: Tooling / lint
Scope: CH-046

Description:
    "How far along is M0-M9" used to be recomputed by hand every time it was
    asked, and a hand recount is wrong sooner or later. CH-046 opens with two
    that were: `2 / 29` pages wired (it is 3 -- /risks/[id] was missed) and
    `5 / 8` scopes with code (it is 6 -- five API scopes were compared against
    a denominator that includes `ui`). Those are the sixth and seventh
    hand-written counters found on this project.

    This detector derives five rulers and compares each against the figure
    PROGRESS-METRICS.md declares. Any mismatch is a hard failure.

    ⛔ IT HOLDS NO EXPECTED FIGURE OF ITS OWN. Wiring one in would move the
    hand-written counter into Python -- the wording is lifted from
    check_backlog_counts.py:17-19, which solved this exact problem for the
    BACKLOG counts. CH-046 exists partly because that solution stayed where it
    was written (audit #10, AD-65).

    ⛔ MILESTONE VERDICTS ARE NOT COMPUTED. Whether M6 counts as done depends on
    whether the detail page counts, which is judgement, and judgement encoded in
    Python is judgement wearing a measurement's clothes (AP-3). Instead each
    milestone row carries an ANCHOR: the machine-checkable fact the verdict was
    based on. The detector re-checks the anchor, never the verdict. Add the
    first file to identity/ and M4's anchor breaks, which forces a human to
    re-judge M4 rather than letting the table quietly rot.

    Milestones whose basis is not cheaply derivable declare `manual` and are
    reported as such. Inventing an anchor for them would be worse than none:
    a green check that stands for nothing.

    ⛔ NO SINGLE OVERALL PERCENTAGE. Ruled by the user on 2026-08-20. The
    conversation that produced this file started from "is it only 50%?", and an
    honest answer needed five rulers plus a framing correction (M0-M9 is Wave 1
    only). A tool printing "progress: 47%" would manufacture that conversation
    again. Per-ruler ratios (34 / 36) do print -- those have a stated
    denominator, which is the thing an overall percentage lacks.

Key Components:
    - Facts: the five rulers, derived once, passed to anchor evaluation
    - evaluate_anchor(): closed expression grammar, NOT eval()
    - check(): pure comparison over declared vs derived. The unit of testing.
    - self_test(): runs unconditionally before the real scan, both directions

Usage:
    python scripts/lint/check_progress_metrics.py [--root <repo_root>] [--self-test]

Created: 2026-08-20 (CH-046)
Last Modified: 2026-08-20

Modification History (newest-first):
    - 2026-08-20: Initial creation (CH-046) — five rulers + milestone anchors

Related:
    - docs/03-implementation/changes/CH-046-progress-metrics-derivation/spec.md
    - docs/01-planning/PROGRESS-METRICS.md (the declaration this checks)
    - scripts/lint/check_backlog_counts.py (the contract shape this reuses)
    - docs/rules-on-demand/lint-detector-authoring.md
"""

from __future__ import annotations

import argparse
import importlib.util
import re
import sys
from pathlib import Path
from typing import NamedTuple

LINT_DIR = Path(__file__).resolve().parent

DOC_REL = "docs/01-planning/PROGRESS-METRICS.md"
AUDIT_MODULE_REL = "apps/api/src/audit-trail/audit.module.ts"
WEB_APP_REL = "apps/web/src/app"
API_SRC_REL = "apps/api/src"
MIGRATIONS_REL = "apps/api/prisma/migrations"

# The eight scopes are CLAUDE.md §Scopes. Seven live under apps/api/src; the
# eighth is `ui`, which is the whole of apps/web. Mixing those two denominators
# is exactly the mistake this file was written after (5/8 vs 6/8).
API_SCOPES = (
    "core-model",
    "entity-scope",
    "identity",
    "workflow",
    "audit-trail",
    "contracts",
    "modules",
)
UI_SCOPE = "ui"

DECLARED_BLOCK = re.compile(
    r"<!--\s*progress-metrics:declared\s*-->(.*?)<!--\s*/progress-metrics:declared\s*-->",
    re.S,
)
MILESTONE_BLOCK = re.compile(
    r"<!--\s*progress-metrics:milestones\s*-->(.*?)<!--\s*/progress-metrics:milestones\s*-->",
    re.S,
)
DECLARED_ROW = re.compile(r"^\|\s*`([a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|", re.M)
MILESTONE_ROW = re.compile(r"^\|\s*(M[0-9][a-z]?)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|", re.M)

# The disclaimer is part of the output contract, not decoration. A ruler set
# printed without its scope reads as a completeness score, which is the one
# thing these numbers are not.
DISCLAIMER = (
    "  NOTE: these are proxy metrics, not completeness.\n"
    "  Denominator is Wave 1 (07-wave1-build-plan.md). Wave 2/3 not in scope."
)


class Facts(NamedTuple):
    """Everything derived from the repo. Anchors are evaluated against this."""

    data_model_built: int
    data_model_indexed: int
    audited_models: int
    pages: dict[str, str]  # route key -> domain | other-http | static
    scope_ts: dict[str, int]
    loc_api_prod: int
    loc_api_test: int
    loc_generated: int
    rls_enable: int
    rls_force: int

    @property
    def pages_domain(self) -> int:
        return sum(1 for v in self.pages.values() if v == "domain")

    @property
    def pages_other_http(self) -> int:
        return sum(1 for v in self.pages.values() if v == "other-http")

    @property
    def pages_static(self) -> int:
        return sum(1 for v in self.pages.values() if v == "static")

    @property
    def scopes_with_code(self) -> int:
        return sum(1 for n in self.scope_ts.values() if n > 0)

    @property
    def rls_gap(self) -> int:
        return self.rls_enable - self.rls_force


# === Ruler 1: data model =============================================
# Reused, not reimplemented. A second definition of "which models are Wave-1
# entities" is AP-2 waiting to happen, and check_entity_index already owns it.
def data_model(root: Path) -> tuple[int, int]:
    spec = importlib.util.spec_from_file_location(
        "check_entity_index", LINT_DIR / "check_entity_index.py"
    )
    if not (spec and spec.loader):  # pragma: no cover - import plumbing
        raise RuntimeError("cannot load check_entity_index.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    models = mod.parse_schema_models((root / mod.SCHEMA_REL).read_text(encoding="utf-8"))
    sections, _blocked = mod.parse_index((root / mod.INDEX_REL).read_text(encoding="utf-8"))
    indexed: set[str] = set().union(*sections.values())
    built = [
        m
        for m, t in models.items()
        if m not in mod.EXCLUDED and ({m, t, mod.ALIASES.get(m, "")} & indexed)
    ]
    return len(built), len(indexed)


# === Ruler 2: audit coverage =========================================
def audited_models(root: Path) -> int:
    text = (root / AUDIT_MODULE_REL).read_text(encoding="utf-8")
    block = re.search(r"AUDITED_MODELS[^=]*=\s*new Set\(\[(.*?)\]\)", text, re.S)
    if not block:
        raise RuntimeError(f"AUDITED_MODELS not found in {AUDIT_MODULE_REL}")
    return len(re.findall(r"'([A-Za-z0-9_]+)'", block.group(1)))


# === Ruler 3: page wiring ============================================
# "Wired" has two defensible definitions and they give different numbers, so
# this returns the classification rather than a count. /login posts to a Next
# route handler and / probes /health -- both speak HTTP, neither reaches domain
# data. Collapsing them into one figure is how "2 / 29" happened.
def classify_pages(root: Path) -> dict[str, str]:
    app_dir = root / WEB_APP_REL
    out: dict[str, str] = {}
    for page in sorted(app_dir.rglob("page.tsx")):
        rel = page.parent.relative_to(app_dir).as_posix()
        key = "/" if rel == "." else rel
        src = page.read_text(encoding="utf-8")
        if re.search(r"from\s+['\"][^'\"]*lib/api/", src):
            out[key] = "domain"
        elif "fetch(" in src:
            out[key] = "other-http"
        else:
            out[key] = "static"
    return out


# === Ruler 4: scopes with code =======================================
def scope_ts_counts(root: Path) -> dict[str, int]:
    out: dict[str, int] = {}
    for scope in API_SCOPES:
        d = root / API_SRC_REL / scope
        out[scope] = (
            sum(1 for p in d.rglob("*.ts") if not p.name.endswith(".spec.ts")) if d.is_dir() else 0
        )
    web = root / "apps/web/src"
    out[UI_SCOPE] = (
        sum(
            1
            for p in list(web.rglob("*.ts")) + list(web.rglob("*.tsx"))
            if ".test." not in p.name and ".spec." not in p.name
        )
        if web.is_dir()
        else 0
    )
    return out


# === Ruler 5: authored lines =========================================
# `generated/` is the Prisma client. Reporting apps/api as ~104k lines would
# credit 96,613 lines nobody wrote, which is the same species of error as the
# counters above -- a number that is true and answers the wrong question.
def _count_lines(paths: list[Path]) -> int:
    total = 0
    for p in paths:
        try:
            total += len(p.read_text(encoding="utf-8", errors="replace").splitlines())
        except OSError:  # pragma: no cover - unreadable file
            continue
    return total


def authored_loc(root: Path) -> tuple[int, int, int]:
    src = root / API_SRC_REL
    all_ts = list(src.rglob("*.ts"))
    prod = [p for p in all_ts if "generated" not in p.parts and not p.name.endswith(".spec.ts")]
    test = [p for p in all_ts if "generated" not in p.parts and p.name.endswith(".spec.ts")]
    gen = [p for p in all_ts if "generated" in p.parts]
    return _count_lines(prod), _count_lines(test), _count_lines(gen)


# === Ruler 5b: RLS switch ============================================
def rls_counts(root: Path) -> tuple[int, int]:
    d = root / MIGRATIONS_REL
    enable = force = 0
    if d.is_dir():
        for sql in d.rglob("*.sql"):
            text = sql.read_text(encoding="utf-8", errors="replace")
            enable += len(re.findall(r"ENABLE\s+ROW LEVEL SECURITY", text))
            force += len(re.findall(r"FORCE\s+ROW LEVEL SECURITY", text))
    return enable, force


def gather(root: Path) -> Facts:
    built, indexed = data_model(root)
    prod, test, gen = authored_loc(root)
    enable, force = rls_counts(root)
    return Facts(
        data_model_built=built,
        data_model_indexed=indexed,
        audited_models=audited_models(root),
        pages=classify_pages(root),
        scope_ts=scope_ts_counts(root),
        loc_api_prod=prod,
        loc_api_test=test,
        loc_generated=gen,
        rls_enable=enable,
        rls_force=force,
    )


# === Anchor grammar ==================================================
# A closed set of forms, matched by regex. NOT eval(): an anchor is data read
# from a markdown table, and a document that can execute arbitrary Python is a
# platform that fails its own guardrail 1.
_ANCHORS = (
    (re.compile(r"^data_model_built\(\)\s*==\s*(\d+)$"), "data_model_built"),
    (re.compile(r"^audited_models\(\)\s*==\s*(\d+)$"), "audited_models"),
    (re.compile(r"^pages_domain_wired\(\)\s*==\s*(\d+)$"), "pages_domain"),
    (re.compile(r"^rls_gap\(\)\s*==\s*(\d+)$"), "rls_gap"),
)
_ANCHOR_SCOPE = re.compile(r"^scope_ts_count\('([a-z-]+)'\)\s*==\s*(\d+)$")
_ANCHOR_PAGE = re.compile(r"^page_class\('([^']+)'\)\s*==\s*'([a-z-]+)'$")


def evaluate_anchor(anchor: str, f: Facts) -> tuple[bool | None, str]:
    """(None, reason) = manual. (True/False, reason) = checked."""
    a = anchor.strip()
    if a == "manual":
        return None, "declared manual"

    for pattern, attr in _ANCHORS:
        m = pattern.match(a)
        if m:
            want = int(m.group(1))
            got = getattr(f, attr)
            return got == want, f"{attr} is {got}, anchor says {want}"

    m = _ANCHOR_SCOPE.match(a)
    if m:
        scope, want = m.group(1), int(m.group(2))
        if scope not in f.scope_ts:
            return False, f"unknown scope '{scope}'"
        got = f.scope_ts[scope]
        return got == want, f"scope_ts_count('{scope}') is {got}, anchor says {want}"

    m = _ANCHOR_PAGE.match(a)
    if m:
        route, want = m.group(1), m.group(2)
        if route not in f.pages:
            return False, f"no page at route '{route}'"
        got = f.pages[route]
        return got == want, f"page_class('{route}') is '{got}', anchor says '{want}'"

    return False, f"unparseable anchor {a!r}"


def parse_declared(text: str) -> dict[str, str]:
    block = DECLARED_BLOCK.search(text)
    if not block:
        raise RuntimeError("declared block markers missing from PROGRESS-METRICS.md")
    return {m.group(1): m.group(2).strip() for m in DECLARED_ROW.finditer(block.group(1))}


def parse_milestones(text: str) -> list[tuple[str, str, str]]:
    block = MILESTONE_BLOCK.search(text)
    if not block:
        raise RuntimeError("milestone block markers missing from PROGRESS-METRICS.md")
    return [(m.group(1), m.group(2).strip(), m.group(3)) for m in MILESTONE_ROW.finditer(block.group(1))]


def check(text: str, f: Facts) -> list[str]:
    """Pure. Returns failure lines; empty means clean."""
    problems: list[str] = []
    declared = parse_declared(text)

    expected = {
        "data-model": f"{f.data_model_built} / {f.data_model_indexed}",
        "audit-coverage": f"{f.audited_models} / {f.data_model_built}",
        "pages-domain": str(f.pages_domain),
        "pages-other-http": str(f.pages_other_http),
        "pages-static": str(f.pages_static),
        "scopes-with-code": f"{f.scopes_with_code} / {len(f.scope_ts)}",
        "rls-enable-force": f"{f.rls_enable} / {f.rls_force}",
        "loc-api-prod": str(f.loc_api_prod),
        "loc-api-test": str(f.loc_api_test),
        "loc-generated": str(f.loc_generated),
    }

    for key, want in expected.items():
        if key not in declared:
            problems.append(f"ruler `{key}` is not declared in {DOC_REL}; derived value is {want}")
        elif declared[key] != want:
            problems.append(
                f"ruler `{key}`: document declares {declared[key]!r}, repo derives {want!r}"
            )

    for extra in sorted(set(declared) - set(expected)):
        problems.append(f"ruler `{extra}` is declared but this detector derives no such ruler")

    milestones = parse_milestones(text)
    if not milestones:
        problems.append("milestone block parsed to zero rows -- a skip, not a pass")
    for mid, verdict, anchor in milestones:
        ok, reason = evaluate_anchor(anchor, f)
        if ok is False:
            problems.append(
                f"{mid} anchor broke: {reason}. The verdict {verdict!r} was based on it -- "
                f"re-judge {mid} and update both cells."
            )
    return problems


def render(f: Facts, milestones: list[tuple[str, str, str]]) -> str:
    verified = sum(1 for _, _, a in milestones if evaluate_anchor(a, f)[0] is not None)
    manual = [mid for mid, _, a in milestones if evaluate_anchor(a, f)[0] is None]
    zero = sorted(n for n, c in f.scope_ts.items() if c == 0)
    return "\n".join(
        [
            "progress-metrics: Wave 1 only (M0-M9 + M6b/M6c)",
            "",
            f"  data model        {f.data_model_built} / {f.data_model_indexed}",
            f"  audit coverage    {f.audited_models} / {f.data_model_built}",
            f"  pages wired       {f.pages_domain} domain / {f.pages_other_http} other-http"
            f" / {f.pages_static} static",
            f"  scopes with code  {f.scopes_with_code} / {len(f.scope_ts)}"
            + (f"   ({', '.join(f'{n} 0' for n in zero)})" if zero else ""),
            f"  RLS enable/force  {f.rls_enable} / {f.rls_force}  (gap {f.rls_gap})",
            f"  authored LOC      api {f.loc_api_prod} prod / {f.loc_api_test} test",
            f"                    (excl. src/generated/ {f.loc_generated})",
            "",
            f"  milestone anchors {verified} verified / {len(manual)} manual"
            + (f" ({', '.join(manual)})" if manual else ""),
            "",
            DISCLAIMER,
        ]
    )


def self_test(root: Path) -> None:
    """Both directions, unconditionally, before the real scan.

    A detector that only ever proves it can pass has not been shown to be able
    to fail (lint-detector-authoring.md).
    """
    f = Facts(
        data_model_built=2,
        data_model_indexed=3,
        audited_models=1,
        pages={"a": "domain", "b": "static"},
        scope_ts={"x": 1, "y": 0},
        loc_api_prod=10,
        loc_api_test=20,
        loc_generated=30,
        rls_enable=4,
        rls_force=4,
    )
    good = (
        "<!-- progress-metrics:declared -->\n"
        "| `data-model` | 2 / 3 |\n| `audit-coverage` | 1 / 2 |\n"
        "| `pages-domain` | 1 |\n| `pages-other-http` | 0 |\n| `pages-static` | 1 |\n"
        "| `scopes-with-code` | 1 / 2 |\n| `rls-enable-force` | 4 / 4 |\n"
        "| `loc-api-prod` | 10 |\n| `loc-api-test` | 20 |\n| `loc-generated` | 30 |\n"
        "<!-- /progress-metrics:declared -->\n"
        "<!-- progress-metrics:milestones -->\n"
        "| M1 | done | `data_model_built() == 2` |\n"
        "| M0 | partial | `manual` |\n"
        "<!-- /progress-metrics:milestones -->\n"
    )
    if check(good, f):
        raise SystemExit(
            "progress-metrics: FAIL -- self-test flagged a document that matches the facts.\n"
            f"  {check(good, f)}"
        )
    drifted = good.replace("| `data-model` | 2 / 3 |", "| `data-model` | 3 / 3 |")
    if not check(drifted, f):
        raise SystemExit(
            "progress-metrics: FAIL -- self-test did NOT flag a drifted declaration.\n"
            "  The comparison is not running; a green result below would mean nothing."
        )
    broken = good.replace("`data_model_built() == 2`", "`data_model_built() == 99`")
    if not any("M1 anchor broke" in p for p in check(broken, f)):
        raise SystemExit(
            "progress-metrics: FAIL -- self-test did NOT flag a broken milestone anchor.\n"
            "  Anchors are the only thing keeping the milestone table honest."
        )


def _force_utf8_stdout() -> None:
    """Windows consoles default to cp1252 and this detector quotes the document.

    ⛔ FOUND BY NEUTRALISATION N2, NOT BY DESIGN. The detector's own output is
    English, so this looked unnecessary -- until breaking M4's anchor made it
    interpolate the verdict cell (`🔴 未開始`) into the failure message and the
    print crashed. Detection worked; the crash happened while SAYING what was
    detected, which locally is indistinguishable from not detecting it.
    AD-ShaDetectorConsoleEncoding-1, fifth occurrence on this project.
    """
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
        except (AttributeError, OSError):  # pragma: no cover - already utf-8 or not a tty
            pass


def main(argv: list[str] | None = None) -> int:
    _force_utf8_stdout()
    parser = argparse.ArgumentParser(description="Derive the Wave-1 progress rulers.")
    parser.add_argument("--root", default=str(LINT_DIR.parents[1]))
    parser.add_argument("--self-test", action="store_true", help="Meta-verification only.")
    cli = parser.parse_args(argv)
    root = Path(cli.root)

    self_test(root)
    if cli.self_test:
        print("progress-metrics: SELF-TEST PASS -- drift and broken anchors both detected.")
        return 0

    facts = gather(root)
    text = (root / DOC_REL).read_text(encoding="utf-8")
    problems = check(text, facts)

    print(render(facts, parse_milestones(text)))

    if problems:
        print("")
        print(f"progress-metrics: FAIL -- {len(problems)} mismatch(es) against {DOC_REL}:")
        for p in problems:
            print(f"  - {p}")
        print("  Update the document, or explain the change there. The repo is the truth.")
        return 1

    print("")
    print("progress-metrics: OK (declared rulers match the repo; anchors hold)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
