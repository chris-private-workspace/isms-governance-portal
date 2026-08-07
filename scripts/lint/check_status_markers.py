"""
File: scripts/lint/check_status_markers.py
Purpose: Status-marker health across ALL THREE tracks — the machine guard
    behind PROCESS R9 ("closeout must flip the status frontmatter").
Category: Tooling / lint
Scope: Template v2.6.1

Description:
    PROCESS R9 requires every closeout to flip `status:` in that track's
    pre-doc. A rule that nothing enforces is not a rule.

    In the source project R9 was written, and ONE DAY LATER a cross-source
    audit found it structurally inoperative on most artifacts: 31 / 108
    plan.md files had no `status:` field at all, and 13 phases had BODY
    markers still reading `active` / `draft` while every one of them had
    long been closed. Nobody noticed, because nothing would ever fail.

    Authority per track (the pre-doc, not the siblings):

        Phase   docs/01-planning/W*/plan.md
        Change  docs/03-implementation/changes/CH-*/spec.md
        Bug     docs/03-implementation/bugs/BUG-*/report.md

    SINGLE-FILE records (`CH-NNN-slug.md` / `BUG-NNN-slug.md`) are skipped
    on purpose: the 1-page form exists for work that closes the same day,
    so it records a conclusion, not a lifecycle. Demanding a status field
    there would produce noise without catching anything.

Checks:
    E1  pre-doc has no frontmatter `status:`          -> audits under-count   (FAIL)
    E2  frontmatter vs body marker COARSE mismatch    -> one says closed, the
                                                         other in-flight      (FAIL)
    E3  open but no commit for a long time            -> missed closeout      (WARN)
    E4  a sibling contradicts the pre-doc             -> pre-doc is authority (FAIL)

    E2/E4 compare COARSE state only (closed vs open). `closed_partial` in
    frontmatter vs "closed - gate PARTIAL" in prose mean the same thing;
    comparing verbatim produces false positives, and a check with more false
    positives than true ones gets habitually ignored.

    E4 fires only when the sibling HAS a status field. Missing sibling
    frontmatter is deliberately NOT an error: the pre-doc alone decides
    whether the work is alive, and requiring the rest only creates backfill
    plus a chance to guess a state wrong.

Two authoring lessons are baked in (see rules-on-demand/lint-detector-authoring.md):

    1. ENUMERATE THE REAL FORMATS FIRST. An earlier version matched only 2 of
       the 4 body-marker formats present in the repo, and 2 stale phases lived
       in a format it did not match. BODY_PATTERNS is deliberately broad, and
       STATE_WORDS carries both English and Chinese vocabulary.

    2. A CHECK NOBODY RUNS IS NOT A CHECK. An earlier version shelled out per
       file; on Windows that is ~0.3 s of process spawn each. This one touches
       git only for the handful of artifacts currently marked open.

Usage:
    python scripts/lint/check_status_markers.py [--root <repo_root>] [--stale-days N]

Created: 2026-08-07
Last Modified: 2026-08-07

Modification History (newest-first):
    - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

Related:
    - docs/01-planning/PROCESS.md §5 R9
    - docs/01-planning/STATUS_AUDIT.md §1
    - docs/rules-on-demand/lint-detector-authoring.md
"""

import argparse
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import NamedTuple

# Frontmatter: `status: <value>` on its own line, optional trailing comment.
FM_PATTERN = re.compile(r"^status:[ \t]*([^\s#]+)", re.MULTILINE)

# Body markers. Historically FOUR mutually incompatible formats coexisted in
# one repo, none of them the frontmatter the template prescribes. Matching only
# the obvious two let 2 stale phases through. Do not narrow this set.
#
#   (1) table      | Status | **active** (...) |
#   (2) table (zh) | 狀態   | 已收尾            |
#   (3) bold       **Status**: active
#   (4) blockquote > **狀態**：`active` — ...
BODY_PATTERNS = [
    re.compile(r"^\|[ \t]*(?:Status|狀態)[ \t]*\|(.*)$", re.MULTILINE),
    re.compile(r"^>?[ \t]*\*\*(?:Status|狀態)\*\*[:：](.*)$", re.MULTILINE),
]

# Vocabulary. Longest-first so `closed_partial` wins over `closed` and
# `已完成` over `完成`.
STATE_WORDS = [
    "closed_partial",
    "approved-to-execute",
    "investigating",
    "in_progress",
    "verifying",
    "cancelled",
    "wont-fix",
    "proposed",
    "approved",
    "triaged",
    "fixing",
    "closed",
    "active",
    "draft",
    "open",
    "done",
    "已修復",
    "已完成",
    "已收尾",
    "已關閉",
    "已結案",
    "進行中",
    "待處理",
    "調查中",
    "規劃中",
    "草稿",
]
STATE_RE = re.compile("|".join(STATE_WORDS), re.IGNORECASE)

CLOSED_STATES = {
    "closed",
    "closed_partial",
    "done",
    "cancelled",
    "wont-fix",
    "已修復",
    "已完成",
    "已收尾",
    "已關閉",
    "已結案",
}
OPEN_STATES = {
    "active",
    "draft",
    "proposed",
    "approved",
    "approved-to-execute",
    "in_progress",
    "open",
    "triaged",
    "investigating",
    "fixing",
    "verifying",
    "進行中",
    "待處理",
    "調查中",
    "規劃中",
    "草稿",
}

# (glob for the authoritative pre-doc, sibling filenames, human label)
TRACKS = [
    ("docs/01-planning/W*/plan.md",
     ("checklist.md", "progress.md", "retrospective.md"), "phase"),
    ("docs/03-implementation/changes/CH-*/spec.md",
     ("checklist.md", "progress.md"), "change"),
    ("docs/03-implementation/bugs/BUG-*/report.md",
     ("checklist.md", "progress.md", "postmortem.md"), "bug"),
]


class Violation(NamedTuple):
    """NamedTuple, NOT dataclass -- tests load this script via importlib
    file-path, where dataclass + future-annotations breaks."""

    check: str  # "E1" | "E2" | "E3" | "E4"
    artifact: str
    detail: str


def coarse(state: str) -> str:
    """Collapse a status value to closed / open. Unknown values pass through."""
    s = state.strip().strip("`*\"'").lower()
    if s in CLOSED_STATES:
        return "closed"
    if s in OPEN_STATES:
        return "open"
    return s


def frontmatter_status(text: str) -> str | None:
    """`status:` from the leading YAML block only (not from fenced examples)."""
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    m = FM_PATTERN.search(text[3:end])
    return m.group(1).strip().strip("`\"'") if m else None


def body_status(text: str) -> str | None:
    """First filled-in state word carried by a body status marker.

    A marker line listing SEVERAL states is an unfilled template placeholder
    (`**Status**: Draft / Approved-to-execute / Closed`). Matching its first
    word would flag every freshly copied template -- the fastest way to teach
    people to ignore a lint. Such lines are skipped.
    """
    for pattern in BODY_PATTERNS:
        for m in pattern.finditer(text):
            found = [w.lower() for w in STATE_RE.findall(m.group(1))]
            if len(set(found)) == 1:
                return found[0]
    return None


def _last_commit_epoch(repo_root: Path, rel_dir: str) -> int:
    """Epoch seconds of the last commit touching rel_dir; 0 if unknown."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%ct", "--", rel_dir],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=20,
        )
    except (OSError, subprocess.SubprocessError):
        return 0
    value = out.stdout.strip()
    return int(value) if value.isdigit() else 0


def find_violations(repo_root: Path, stale_days: int = 30) -> list[Violation]:
    """Return all status-marker violations (empty list = clean)."""
    violations: list[Violation] = []
    now = int(time.time())

    for glob, siblings, label in TRACKS:
        for predoc in sorted(repo_root.glob(glob)):
            name = f"{predoc.parent.name}/{predoc.name}"
            text = predoc.read_text(encoding="utf-8", errors="replace")

            fm = frontmatter_status(text)
            if not fm:
                violations.append(
                    Violation(
                        "E1",
                        name,
                        f"{label} pre-doc has no frontmatter `status:` -- status "
                        f"audits will silently skip it. Add it per the matching "
                        f"docs/01-planning/_templates/ file",
                    )
                )
                continue

            body = body_status(text)
            if body and coarse(fm) != coarse(body):
                violations.append(
                    Violation(
                        "E2",
                        name,
                        f"frontmatter `{fm}` vs body marker `{body}` disagree "
                        f"(coarse: {coarse(fm)} vs {coarse(body)}) -- frontmatter "
                        f"is authority; fix whichever is wrong",
                    )
                )

            for sibling in siblings:
                path = predoc.parent / sibling
                if not path.is_file():
                    continue
                sib = frontmatter_status(
                    path.read_text(encoding="utf-8", errors="replace")
                )
                # Missing sibling frontmatter is fine by design -- see docstring.
                if sib and coarse(sib) != coarse(fm):
                    violations.append(
                        Violation(
                            "E4",
                            name,
                            f"{sibling} declares `{sib}` but the pre-doc says "
                            f"`{fm}` -- the pre-doc is the single authority",
                        )
                    )

            if coarse(fm) == "open":
                rel = predoc.parent.relative_to(repo_root).as_posix()
                last = _last_commit_epoch(repo_root, rel)
                if last:
                    days = (now - last) // 86_400
                    if days > stale_days:
                        violations.append(
                            Violation(
                                "E3",
                                name,
                                f"marked `{fm}` but no commit in {days} days -- "
                                f"probably a closeout that never flipped the "
                                f"status (legitimately-blocked work is expected "
                                f"here)",
                            )
                        )

    return violations


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Status-marker health across all three tracks (PROCESS R9)."
    )
    parser.add_argument(
        "--root",
        default=str(Path(__file__).resolve().parents[2]),
        help="Repo root (default: two levels above scripts/lint/).",
    )
    parser.add_argument(
        "--stale-days",
        type=int,
        default=30,
        help="E3 threshold: days without a commit before open work is flagged "
        "(default: 30).",
    )
    cli = parser.parse_args(argv)
    repo_root = Path(cli.root)

    scanned = sum(len(list(repo_root.glob(g))) for g, _, _ in TRACKS)
    violations = find_violations(repo_root, cli.stale_days)

    hard = [v for v in violations if v.check in ("E1", "E2", "E4")]
    warn = [v for v in violations if v.check == "E3"]

    if not violations:
        print(f"status-markers: OK ({scanned} pre-doc(s), E1/E2/E3/E4 clean)")
        return 0

    print(f"status-markers: {len(hard)} error(s), {len(warn)} warning(s):")
    for v in hard + warn:
        mark = "WARN" if v.check == "E3" else "FAIL"
        print(f"  [{mark} {v.check}] {v.artifact}: {v.detail}")

    # E3 alone must not fail: work can be legitimately parked for months on an
    # external blocker, and a lint that goes red for a known-good state is a
    # lint people learn to ignore.
    return 1 if hard else 0


if __name__ == "__main__":
    sys.exit(main())
