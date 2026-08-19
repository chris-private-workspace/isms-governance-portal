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
    E5  a merge marker still says PENDING while the
        artifact that owns it is already closed       -> false pending        (FAIL)

    E2/E4 compare COARSE state only (closed vs open). `closed_partial` in
    frontmatter vs "closed - gate PARTIAL" in prose mean the same thing;
    comparing verbatim produces false positives, and a check with more false
    positives than true ones gets habitually ignored.

    E4 fires only when the sibling HAS a status field. Missing sibling
    frontmatter is deliberately NOT an error: the pre-doc alone decides
    whether the work is alive, and requiring the rest only creates backfill
    plus a chance to guess a state wrong.

    E5 exists because W21's merge markers stayed `PR-pending` in FOUR places
    while PR #84 had been merged since 2026-08-18T07:08:46Z, and NOTHING found
    it for an entire phase -- run_all was 9/9 green the whole time, because
    E1-E4 only ever read the pre-doc's own `status:` (AD-StalePrPendingNoDetector-1).
    The cost had already been paid once: CLAUDE.md's Current-Phase cell told
    every session that a PR merged ten hours earlier was still open.

    ⛔ E5 DOES NOT FIRE ON `PR-pending` ITSELF. At closeout the marker is
    supposed to be there -- the closeout documents are written BEFORE the merge
    (git-workflow.md:222). What E5 fires on is the CONTRADICTION: the owning
    artifact says closed and the marker still says pending. A check that went
    red during every legitimate closeout is a check people would switch off,
    which is why the self-test asserts that direction too.

Three authoring lessons are baked in (see rules-on-demand/lint-detector-authoring.md):

    1. ENUMERATE THE REAL FORMATS FIRST. An earlier version matched only 2 of
       the 4 body-marker formats present in the repo, and 2 stale phases lived
       in a format it did not match. BODY_PATTERNS is deliberately broad, and
       STATE_WORDS carries both English and Chinese vocabulary.

       The same enumeration was run again for E5 before PENDING_PATTERNS was
       written, and it earned its keep twice: it turned up a FIFTH marker
       format nobody would have guessed (`PR 待開`, in ADR-0005), and it turned
       up the false-positive class that dominates -- the repo is full of PROSE
       about `PR-pending`, roughly ten times more of it than real markers.

    2. MASK BEFORE MATCHING. Every prose mention found above is inside
       backticks; every real marker is bare. That separation is a convention,
       not a guarantee, so it is not relied on alone -- the scan is also scoped
       to artifact files, and fenced blocks / inline code / HTML comments are
       blanked first. The HTML-comment mask is not theoretical: W21's
       retrospective carries a back-fill note that mentions the marker in prose,
       unbackticked, inside a comment.

    3. A CHECK NOBODY RUNS IS NOT A CHECK. An earlier version shelled out per
       file; on Windows that is ~0.3 s of process spawn each. This one touches
       git only for the handful of artifacts currently marked open.

Usage:
    python scripts/lint/check_status_markers.py [--root <repo_root>] [--stale-days N]

Created: 2026-08-07
Last Modified: 2026-08-19

Modification History (newest-first):
    - 2026-08-19: Add E5 stale-pending guard (W23) — closes AD-StalePrPendingNoDetector-1
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

# === E5: stale merge markers ==========================================
# Why these three and not a looser net: they are what a `grep -rni` for every
# plausible spelling actually returned across the repo on 2026-08-19. Bare
# `TBD` is deliberately NOT here -- it appears in prose ("10 處 PR-pending /
# TBD 已翻") far more often than as a marker, and widening to catch one more
# true positive at the cost of a dozen false ones is how a lint gets ignored.
PENDING_PATTERNS = [
    re.compile(r"PR[- ]pending", re.IGNORECASE),
    re.compile(r"#TBD\b", re.IGNORECASE),
    re.compile(r"PR[ 　]*待開"),
]

# Blanked before matching, longest-lived construct first. Same-length blanking
# keeps line numbers honest.
_MASKS = [
    re.compile(r"^```.*?^```", re.MULTILINE | re.DOTALL),  # fenced blocks
    re.compile(r"<!--.*?-->", re.DOTALL),                  # HTML comments
    re.compile(r"`[^`\n]*`"),                              # inline code
]

# Where markers legitimately live. `_templates` is excluded because a template's
# `PR-pending` is the placeholder being copied FROM, and `__fixtures__` because
# the self-test fixture must stay broken on purpose.
E5_SCAN_GLOBS = ("docs/**/*.md", "memory/*.md", "MEMORY.md", "CLAUDE.md")
E5_SKIP_PARTS = ("_templates", "__fixtures__", "node_modules", ".git")

# Authority hints, in the order they are tried.
PHASE_ID_RE = re.compile(r"\bW(\d{2})\b")
FILE_PHASE_RE = re.compile(r"^\*\*Phase\*\*[:：](.*)$", re.MULTILINE)
ARTIFACT_DIR_RE = re.compile(r"^(?:W\d{2}|CH-\d{3}|BUG-\d{3})[-_]")

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


def mask_non_prose(text: str) -> str:
    """Blank fenced blocks, HTML comments and inline code, preserving offsets.

    Without this the detector fires on every document that DISCUSSES stale
    markers -- including this repo's own backlog entry for the defect, its
    phase plans, and the rule file that tells you to write the detector
    (lint-detector-authoring.md:63 makes that the acceptance question).
    """
    for pattern in _MASKS:
        text = pattern.sub(lambda m: re.sub(r"[^\n]", " ", m.group(0)), text)
    return text


def artifact_status_index(repo_root: Path) -> dict[str, str]:
    """Coarse status keyed by BOTH the artifact folder name and its bare id.

    `W21-azure-web-demo-deploy` and `W21` both resolve, because a marker in a
    navigation file (BACKLOG, MEMORY) names the phase by id while a marker
    inside the phase folder is identified by the folder itself.
    """
    index: dict[str, str] = {}
    for glob, _siblings, _label in TRACKS:
        for predoc in repo_root.glob(glob):
            fm = frontmatter_status(predoc.read_text(encoding="utf-8", errors="replace"))
            if not fm:
                continue
            folder = predoc.parent.name
            index[folder] = coarse(fm)
            index.setdefault(folder.split("-")[0], coarse(fm))
    return index


def _owner_from_path(path: Path, index: dict[str, str]) -> str | None:
    """Authority 1 of 3: the artifact folder the file physically lives in."""
    for parent in path.parents:
        if ARTIFACT_DIR_RE.match(parent.name) and parent.name in index:
            return parent.name
    return None


def _owner_from_text(line: str, header_phase: str | None, index: dict[str, str]) -> str | None:
    """Authority 2 and 3: a phase id on the marker line, else the file header.

    The RAW line is searched, not the masked one -- an id being written as
    `W03` in backticks says nothing about whether the marker beside it is real.
    """
    for source in (line, header_phase or ""):
        m = PHASE_ID_RE.search(source)
        if m and f"W{m.group(1)}" in index:
            return f"W{m.group(1)}"
    return None


def stale_pending(repo_root: Path) -> list[Violation]:
    """E5 -- merge markers left pending on artifacts that are already closed.

    Returns [] when no marker can be tied to a closed owner. ⛔ An unresolvable
    marker is SKIPPED, never guessed: `CH-006`/`CH-007` say `**Phase**: 無 ——
    獨立 CH`, so nothing in the repo states whether they shipped, and inventing
    a verdict there would be the detector asserting something it cannot see.
    """
    index = artifact_status_index(repo_root)
    violations: list[Violation] = []
    seen: set[Path] = set()

    for glob in E5_SCAN_GLOBS:
        for path in sorted(repo_root.glob(glob)):
            if path in seen or not path.is_file():
                continue
            seen.add(path)
            # ⚠️ RELATIVE parts, not absolute: the self-test points this scan AT
            # a directory that itself lives under `__fixtures__`, so filtering on
            # the absolute path silently skips the entire fixture tree -- and a
            # self-test that finds nothing to check reads exactly like a broken
            # detector. Measured on the first run of this function.
            relative = path.relative_to(repo_root)
            if any(part in E5_SKIP_PARTS for part in relative.parts):
                continue

            raw = path.read_text(encoding="utf-8", errors="replace")
            masked = mask_non_prose(raw)
            header = FILE_PHASE_RE.search(raw)
            header_phase = header.group(1) if header else None
            rel = relative.as_posix()

            for n, (masked_line, raw_line) in enumerate(
                zip(masked.splitlines(), raw.splitlines()), 1
            ):
                marker = next(
                    (m.group(0) for p in PENDING_PATTERNS for m in [p.search(masked_line)] if m),
                    None,
                )
                if marker is None:
                    continue
                owner = _owner_from_path(path, index) or _owner_from_text(
                    raw_line, header_phase, index
                )
                if owner is None or index.get(owner) != "closed":
                    continue
                violations.append(
                    Violation(
                        "E5",
                        f"{rel}:{n}",
                        f"marker `{marker}` is still pending but `{owner}` is "
                        f"closed -- flip it to `MERGED (PR #N, <sha>)`, and "
                        f"confirm with `gh pr view <N> --json state,mergedAt` "
                        f"rather than from memory",
                    )
                )
    return violations


def find_violations(repo_root: Path, stale_days: int = 30) -> list[Violation]:
    """Return all status-marker violations (empty list = clean)."""
    violations: list[Violation] = list(stale_pending(repo_root))
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


FIXTURE_REL = "scripts/lint/__fixtures__/stale-pr-pending"


def self_test(root: Path) -> None:
    """E5 in BOTH directions, unconditionally, before the real scan.

    A one-directional meta-verification is indistinguishable from a broken one
    (AD-MetaVerificationBug-1): proving the fixture is caught would still pass
    with a stale_pending() that flagged every marker it saw -- and THAT failure
    mode is the specific one plan R4 warns about, because it would go red on
    every legitimate closeout until somebody removed the check.

    The fixture tree therefore carries both cases side by side, so the negative
    control cannot be quietly dropped: it is the sibling directory.
    """
    fixture = root / FIXTURE_REL
    if not fixture.is_dir():
        raise SystemExit(
            f"status-markers: FAIL -- E5 self-test fixture missing: {FIXTURE_REL}\n"
            "Without it nothing proves the detector still detects."
        )
    found = stale_pending(fixture)
    caught = {v.artifact.split(":")[0] for v in found}

    must_catch = "docs/01-planning/W99-fixture-closed/retrospective.md"  # path-check: ignore — synthetic
    if must_catch not in caught:
        raise SystemExit(
            "status-markers: FAIL -- E5 did NOT flag the stale fixture.\n"
            f"Expected a hit in {FIXTURE_REL}/{must_catch}\n"
            "Either PENDING_PATTERNS went stale or the fixture was 'cleaned up'."
        )

    must_not_catch = "docs/01-planning/W98-fixture-active/retrospective.md"  # path-check: ignore — synthetic
    if must_not_catch in caught:
        raise SystemExit(
            "status-markers: FAIL -- E5 flagged a marker the fixture says is legitimate.\n"
            f"{FIXTURE_REL}/{must_not_catch} belongs to an artifact the fixture\n"
            "marks `active`, which is the state every closeout passes through.\n"
            "E5 must fire on the CONTRADICTION, never on the marker itself.\n"
            "⚠️ TWO CAUSES. CHECK (a) FIRST -- it is the cheap one:\n"
            "  (a) the fixture was edited: `git diff` the W98 plan.md, whose\n"
            "      `status:` must stay `active` for this control to mean anything\n"
            "  (b) E5 itself regressed and now fires on the marker rather than\n"
            "      on the contradiction"
        )


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

    self_test(repo_root)

    scanned = sum(len(list(repo_root.glob(g))) for g, _, _ in TRACKS)
    violations = find_violations(repo_root, cli.stale_days)

    hard = [v for v in violations if v.check in ("E1", "E2", "E4", "E5")]
    warn = [v for v in violations if v.check == "E3"]

    if not violations:
        print(f"status-markers: OK ({scanned} pre-doc(s), E1/E2/E3/E4/E5 clean)")
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
