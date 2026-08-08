"""
File: scripts/lint/check_workflow_placeholders.py
Purpose: Ratchet on unfilled template placeholders in GitHub Actions workflows —
    the count may go down, never up.
Category: Tooling / lint
Scope: CH-007

Description:
    A placeholder that is GUARDED does not crash the job, so nothing ever fails
    because of it. security-scan.yml:203 already names the failure mode this
    creates: "不閘很快就變成不存在" — a scan that permanently skips reads as a
    scan that exists. Right now SCA and SAST are exactly that (AD-SecScan-1).

    actionlint covers the other half of this problem: a placeholder in an
    EXECUTABLE position (`run: <format check 指令>`) is a shell syntax error and
    it reports SC1072/SC1073. That was the CH-006 bug and it is not this
    detector's job. This detector covers what actionlint correctly does NOT
    flag — placeholders that are valid shell but mean "not finished yet".

    Mechanism: an allow-list with an exact expected count per placeholder.
      - a placeholder absent from ALLOWED        -> a new one was introduced
      - a count higher than ALLOWED              -> more were introduced
      - an ALLOWED entry no longer present       -> it got filled; drop the entry
    The last rule is what makes it a ratchet rather than a static allow-list:
    filling a placeholder forces the same PR to shrink the baseline, so the
    number is always the truth rather than an aspiration.

Key Components:
    - ALLOWED: the baseline. Every entry carries WHY it is still unfilled and
      WHAT unblocks it — an exemption without those is one nobody revisits.
    - find_violations(): pure function; unit-testable via tmp dirs.
    - main(): CLI wrapper; exit 0 clean, 1 on any violation.

Usage:
    python scripts/lint/check_workflow_placeholders.py [--root <repo_root>]

Created: 2026-08-07 (CH-007)
Last Modified: 2026-08-07

Modification History (newest-first):
    - 2026-08-07: Initial creation (CH-007) — ratchet for AD-SecScan-1

Related:
    - docs/rules-on-demand/lint-detector-authoring.md
    - docs/03-implementation/changes/CH-007-placeholder-detector.md
    - .github/workflows/security-scan.yml (the current baseline's source)
"""

import argparse
import re
import sys
from collections import Counter
from pathlib import Path
from typing import NamedTuple

# Windows consoles default to cp950/cp1252. This detector's violation messages
# quote the placeholder text verbatim, and every placeholder in this repo is
# Traditional Chinese — without this the lint CRASHES mid-report with
# UnicodeEncodeError, after printing a partial count that looks like a result.
# Same guard as check_path_references.py:67.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except (AttributeError, OSError):
        pass

WORKFLOW_GLOB = ".github/workflows/*.yml"
PRAGMA = "placeholder-check: ignore"

# Deliberately broad. Verified against this repo at creation time: 4 matches,
# all true positives, zero false positives.
#
# KNOWN LIMITATION: shell redirection written as `cmd < in.txt > out.txt` would
# match. No workflow here does that, and the pragma above is the escape hatch if
# one ever does. Narrowing the pattern to "must contain CJK" was rejected — it
# would go blind the moment an English-language template is used.
PLACEHOLDER_RE = re.compile(r"<[^<>\n]{2,140}>")

# ── The baseline ────────────────────────────────────────────────────────────
#
# Key format: "<workflow filename>::<exact placeholder text>"
# Value:      (expected occurrence count, why it is still unfilled + what unblocks it)
#
# ⚠️ Lowering a count or removing an entry is the POINT of this file. Raising one
# is not: if a change needs a new placeholder, the placeholder is the thing to
# reconsider, not this baseline.
# 2026-08-08 (W01): emptied. All four entries were filled once the monorepo
# scaffold existed — env setup ×2, SCA_CMD (`npm audit --audit-level=low`) and
# SAST_CMD (semgrep). The ratchet requires dropping them in the same change,
# which is why this is now a deliberate blank rather than a stale baseline.
#
# ⚠️ An empty baseline means the next placeholder introduced anywhere in
# .github/workflows/ fails immediately. That is the intent.
ALLOWED: dict[str, tuple[int, str]] = {}


class Violation(NamedTuple):
    """NamedTuple, NOT dataclass — tests may load this file via importlib, and
    dataclass + future annotations breaks under that."""

    file: str
    line: int
    detail: str


def _scan(repo_root: Path) -> tuple[Counter, dict[str, tuple[str, int]]]:
    """Return (counts per key, first-seen location per key)."""
    counts: Counter = Counter()
    where: dict[str, tuple[str, int]] = {}

    for path in sorted(repo_root.glob(WORKFLOW_GLOB)):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for lineno, line in enumerate(text.split("\n"), start=1):
            if PRAGMA in line:
                continue
            for m in PLACEHOLDER_RE.finditer(line):
                key = f"{path.name}::{m.group(0)}"
                counts[key] += 1
                where.setdefault(key, (path.name, lineno))
    return counts, where


def find_violations(repo_root: Path) -> list[Violation]:
    """Pure function — testable with a temporary directory tree."""
    counts, where = _scan(repo_root)
    violations: list[Violation] = []

    for key, found in sorted(counts.items()):
        fname, lineno = where[key]
        allowed = ALLOWED.get(key)
        if allowed is None:
            violations.append(
                Violation(
                    f".github/workflows/{fname}",
                    lineno,
                    f"new unfilled placeholder {key.split('::', 1)[1]!r} — either fill it, "
                    f"or add it to ALLOWED in check_workflow_placeholders.py with a reason "
                    f"and what unblocks it",
                )
            )
            continue
        expected, _reason = allowed
        if found > expected:
            violations.append(
                Violation(
                    f".github/workflows/{fname}",
                    lineno,
                    f"placeholder {key.split('::', 1)[1]!r} now appears {found}x "
                    f"(baseline {expected}) — the ratchet only turns down",
                )
            )

    # The ratchet's teeth: a baseline entry with nothing left to match has been
    # filled, and leaving it behind lets the number drift away from reality.
    for key, (expected, reason) in sorted(ALLOWED.items()):
        found = counts.get(key, 0)
        if found < expected:
            fname = key.split("::", 1)[0]
            violations.append(
                Violation(
                    f"scripts/lint/{Path(__file__).name}",
                    0,
                    f"baseline for {key!r} expects {expected} but {found} found — it was "
                    f"filled in ({reason}). Lower the count or drop the entry in the same "
                    f"change that filled it",
                )
            )

    return violations


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Ratchet on unfilled placeholders in GitHub Actions workflows."
    )
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    cli = parser.parse_args(argv)

    violations = find_violations(Path(cli.root))
    if not violations:
        total = sum(c for c, _ in ALLOWED.values())
        print(
            f"workflow-placeholders: OK ({total} known unfilled, none new "
            f"— see ALLOWED in check_workflow_placeholders.py)"
        )
        return 0

    print(f"workflow-placeholders: {len(violations)} violation(s):")
    for v in violations:
        loc = f"{v.file}:{v.line}" if v.line else v.file
        print(f"  {loc}: {v.detail}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
