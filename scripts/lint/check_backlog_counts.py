"""
File: scripts/lint/check_backlog_counts.py
Purpose: Derive BACKLOG's §Open counts from the table instead of trusting the hand-copied header.
Category: Tooling / lint
Scope: CH-027

Description:
    BACKLOG.md opens by declaring how many carryover ADs are open and how they
    split across P0/P1/P2. That figure has always been copied by hand, and
    AD-CountBeforeLastEdit-1 records two occasions where the copy was made and
    then the table was edited again -- so the number shipped wrong into the file
    header, a checklist, a commit message and a PR description.

    This detector reads both sides of the same file and compares them:
      declared = the one header marker
      actual   = the rows of the §Open table, parsed cell by cell
    Any mismatch is a hard failure. The detector holds NO expected figure of its
    own; wiring one in would just move the hand-written counter into Python.

    ⚠️ SCOPE BOUNDARY, stated because the name is wider than the proof: this
    checks that the DECLARATION MATCHES THE TABLE. It cannot check that the
    table matches reality -- an AD that was never written into the table is
    invisible here, exactly as it is to everything else.

    Parsing strategy is measured, not assumed (CH-027 progress.md E1-E8):
      - The §Open section also contains the priority LEGEND table, whose rows
        start with `| 🔴 P0 |`. Section bounds alone over-count by 3, so rows
        are also required to start with an AD id.
      - The priority cell has THREE spellings in the live file, not one: the
        plain `🟡 P1`, plus `🔴 **P0 候選**` and `🟡 **P1**（升級）`.
      - A cell that cannot be parsed is a FAILURE, never a skip. Skipping is how
        a detector ends up green because it cannot see (lint-detector-authoring.md).
      - Cells contain BARE PIPES (`:145` carries `|R-1.0|` inside a code span,
        which markdown does not exempt), so a fixed column index -- from either
        end -- silently lands on the wrong cell. The priority is therefore found
        by matching WHOLE CELLS and requiring exactly one hit per row. Notes
        cells mentioning `（原 🟡 P1）` or `grep -c "🔴 P0"` do not match, because
        they are not whole cells.

Key Components:
    - check_text(): pure function over the file's text. The unit of testing.
    - parse_priority(): the three-spelling cell reader.
    - self_test(): runs unconditionally before the real scan, both directions.

Usage:
    python scripts/lint/check_backlog_counts.py [--root <repo_root>] [--self-test]

Created: 2026-08-14 (CH-027)
Last Modified: 2026-08-14

Modification History (newest-first):
    - 2026-08-14: Initial creation (CH-027) — closes AD-CountBeforeLastEdit-1

Related:
    - docs/03-implementation/changes/CH-027-backlog-count-derivation/spec.md
    - docs/rules-on-demand/lint-detector-authoring.md
    - scripts/lint/check_entity_index.py (the unconditional-self-test shape)
"""

import argparse
import re
import sys
from pathlib import Path
from typing import NamedTuple

LINT_DIR = Path(__file__).resolve().parent

BACKLOG_REL = "docs/01-planning/BACKLOG.md"
BASELINE_REL = "scripts/lint/__fixtures__/backlog-count-drift/backlog-baseline.md"

OPEN_HEADING = "## §Open Carryover ADs"

# The declared marker. Anchored on the FULL shape, not on the word 現為 alone:
# that word appears three times in the live file (once as the marker, twice
# inside AD prose). The trailing `P0 a / P1 b / P2 c` is what makes it unique,
# and it is also what keeps the historical figures in the same paragraph
# ("其前 86 條", "達 48 條") from being mistaken for the current one.
DECLARED_RE = re.compile(r"現為 (\d+) 條 —— P0 (\d+) / P1 (\d+) / P2 (\d+)")

# A data row of the §Open table: first cell is an AD id.
AD_ROW_RE = re.compile(r"^\|\s*(AD-[A-Za-z0-9._-]+)\s*\|")

# A WHOLE priority cell, after bold markers are stripped. Must START with the
# swatch -- that is what excludes notes cells that merely mention a priority.
PRIORITY_CELL_RE = re.compile(
    r"^[🔴🟡🟢⚪]\s*P([0-3])(?:\s*(?:候選|（[^）]*）))?$"
)


class Violation(NamedTuple):
    """NamedTuple, NOT dataclass -- tests load this script via importlib
    file-path, where dataclass + future-annotations breaks."""

    line: int
    detail: str


def parse_priority(cell: str) -> str | None:
    """Return '0'..'3' for a priority cell, else None.

    Bold markers are removed before matching because two of the three live
    spellings wrap the level in `**`.
    """
    normalised = cell.replace("*", "").strip()
    m = PRIORITY_CELL_RE.match(normalised)
    return m.group(1) if m else None


def open_section(lines: list[str]) -> tuple[int, int] | None:
    """Return (start, end) 0-based line bounds of the §Open section body."""
    start = None
    for i, line in enumerate(lines):
        if line.strip() == OPEN_HEADING:
            start = i + 1
            break
    if start is None:
        return None
    for j in range(start, len(lines)):
        if lines[j].startswith("## "):
            return start, j
    return start, len(lines)


def derive_counts(
    text: str, label: str = "input"
) -> tuple[dict[str, int] | None, list[Violation]]:
    """Parse the §Open table into counts. Returns (counts, parse violations).

    Separate from check_text so a test can assert the DERIVED FIGURES rather
    than "zero violations" -- agreement between two sides proves nothing about
    either if the parser silently read neither.
    """
    lines = text.splitlines()
    bounds = open_section(lines)
    if bounds is None:
        return None, [
            Violation(
                0,
                f"{label}: heading `{OPEN_HEADING}` not found -- the counts "
                f"cannot be derived. If the section was renamed, update "
                f"OPEN_HEADING in this file in the same change",
            )
        ]

    start, end = bounds
    counts = {"total": 0, "0": 0, "1": 0, "2": 0, "3": 0}
    violations: list[Violation] = []

    for i in range(start, end):
        line = lines[i]
        row = AD_ROW_RE.match(line)
        if not row:
            continue
        counts["total"] += 1

        cells = line.split("|")[1:-1]
        found = [p for c in cells if (p := parse_priority(c)) is not None]

        if len(found) != 1:
            violations.append(
                Violation(
                    i + 1,
                    f"{label}: {row.group(1)} has {len(found)} parsable priority "
                    f"cell(s); exactly one is required. Known spellings: "
                    f"`<swatch> P1`, `<swatch> **P0 候選**`, "
                    f"`<swatch> **P1**（升級）`. A new spelling must be added to "
                    f"PRIORITY_CELL_RE in the same change -- this is deliberately "
                    f"a failure and not a skip, because skipping is how a counter "
                    f"goes green by not seeing its own rows",
                )
            )
            continue
        counts[found[0]] += 1

    return counts, violations


def check_text(text: str, label: str) -> list[Violation]:
    """Compare the declared counts against the §Open table. Pure function."""
    violations: list[Violation] = []
    lines = text.splitlines()

    # --- declared side -----------------------------------------------------
    hits = [
        (i + 1, m)
        for i, line in enumerate(lines)
        for m in [DECLARED_RE.search(line)]
        if m
    ]
    if len(hits) != 1:
        where = ", ".join(str(n) for n, _ in hits) or "nowhere"
        violations.append(
            Violation(
                hits[0][0] if hits else 0,
                f"{label}: the declared-count marker matched {len(hits)} time(s) "
                f"({where}); it must match exactly once. Expected shape: "
                f"`現為 N 條 —— P0 a / P1 b / P2 c`. Zero matches means the marker "
                f"was reworded; two or more means a second counter was introduced "
                f"and there is no rule saying which one is authoritative",
            )
        )
        return violations

    declared_line, m = hits[0]
    declared = {
        "total": int(m.group(1)),
        "0": int(m.group(2)),
        "1": int(m.group(3)),
        "2": int(m.group(4)),
    }

    # --- actual side -------------------------------------------------------
    actual, parse_errors = derive_counts(text, label)
    violations.extend(parse_errors)
    if actual is None:
        return violations
    total = actual["total"]

    if actual["3"]:
        violations.append(
            Violation(
                declared_line,
                f"{label}: {actual['3']} row(s) are P3, but the declared marker "
                f"has no P3 field, so those rows are counted in the total and "
                f"nowhere else. Either re-prioritise them or extend the marker "
                f"shape (and DECLARED_RE) in the same change",
            )
        )

    # --- compare -----------------------------------------------------------
    for key, name in (("total", "total"), ("0", "P0"), ("1", "P1"), ("2", "P2")):
        got = total if key == "total" else actual[key]
        if declared[key] != got:
            violations.append(
                Violation(
                    declared_line,
                    f"{label}: header declares {name}={declared[key]} but the "
                    f"§Open table has {got} (delta {got - declared[key]:+d}). "
                    f"The table is the truth; fix the header -- and re-derive it "
                    f"AFTER the last edit, which is the whole point of this check",
                )
            )

    return violations


def self_test(repo_root: Path) -> list[str]:
    """Prove this detector still fails on a broken file. Both directions.

    Why both: W08's N6 changed a fixture to two names that were ALSO off the
    index, so the fixture stayed a violation, the run stayed green, and the
    broken meta-verification looked exactly like a passing one
    (AD-MetaVerificationBug-1). A negative case is only evidence if the
    positive case next to it passes.
    """
    errors: list[str] = []
    baseline_path = repo_root / BASELINE_REL
    if not baseline_path.is_file():
        return [f"baseline fixture missing: {BASELINE_REL}"]

    baseline = baseline_path.read_text(encoding="utf-8")

    if check_text(baseline, "self-test/baseline"):
        errors.append(
            "baseline fixture does not pass -- every negative case below is "
            "measured against a broken baseline and proves nothing"
        )

    broken = baseline.replace("現為 3 條", "現為 4 條", 1)
    if broken == baseline:
        errors.append("baseline fixture no longer carries the expected marker")
    elif not check_text(broken, "self-test/broken"):
        errors.append("a wrong total was NOT detected")

    return errors


def find_violations(repo_root: Path) -> list[Violation]:
    path = repo_root / BACKLOG_REL
    if not path.is_file():
        return [Violation(0, f"{BACKLOG_REL} not found under {repo_root}")]
    return check_text(path.read_text(encoding="utf-8"), BACKLOG_REL)


def main(argv: list[str] | None = None) -> int:
    # The file this reads is Chinese and the priority cells carry emoji; on a
    # cp950 console an unguarded print of either raises UnicodeEncodeError and
    # the detector dies for a reason that has nothing to do with the check.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):  # pragma: no cover - non-reconfigurable stream
        pass

    parser = argparse.ArgumentParser(description="Check BACKLOG.md's declared counts.")
    parser.add_argument("--root", default=str(LINT_DIR.parents[1]))
    parser.add_argument(
        "--self-test", action="store_true", help="Run only the self-test and exit."
    )
    cli = parser.parse_args(argv)
    repo_root = Path(cli.root)

    errors = self_test(repo_root)
    if errors:
        print(f"backlog-counts: SELF-TEST FAILED ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
        return 1
    if cli.self_test:
        print("backlog-counts: self-test OK")
        return 0

    violations = find_violations(repo_root)
    if not violations:
        print("backlog-counts: OK (declared counts match the §Open table)")
        return 0

    print(f"backlog-counts: {len(violations)} violation(s):")
    for v in violations:
        print(f"  {BACKLOG_REL}:{v.line}: {v.detail}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
