"""
File: scripts/lint/check_sha_anchors.py
Purpose: Flag commit-SHA references in documentation that no longer resolve to anything.
Category: Tooling / lint
Scope: CH-036

Description:
    `required_linear_history = true` means every PR is rebase-merged, which
    rewrites every SHA on the feature branch. Closeout documents are written
    BEFORE the merge, so a sentence like "the predictions were locked into
    commit `57d13c6`" points at a commit that does not exist on main. The whole
    persuasive force of that sentence is "go look it up yourself", and you cannot.

    Measured 2026-08-16 across docs/ memory/ CLAUDE.md MEMORY.md: 709 candidate
    tokens, of which 120 no longer resolve. Two of them are the sentence
    "the prediction was committed first, so nothing about it can be claimed in
    hindsight" -- which had lost the ability to make its own case.

    Two things make this hard, and both were learned the expensive way:

    1. W05 proposed `git cat-file -e` and it PASSED on the very defect it was
       written for (commit a5d86ad), because feature branches were not deleted
       and the objects were still reachable. "This SHA exists" and "this SHA is
       in main's history" are different questions. This file asks the second.

    2. About two thirds of the non-resolving tokens are DELIBERATE -- the line
       itself says "this SHA was rewritten to Y". ROADMAP.md:87 states the
       constraint: a detector must tell a reference from a mention, or it
       reports correct prose as drift.

Key Components:
    - SHA_RE: `{7}|{40}` and NOT `{7,40}`. Measured: `{7,40}` yields 95 false
      positives (dates, CI run ids, migration timestamps, checksum prefixes,
      UUID segments); `{7}|{40}` yields 1, with zero loss of true findings.
    - reachable(): full SHAs from origin/main, HEAD, and refs/tags/archive/*.
      HEAD is in there on purpose -- see `_ANCHOR_NOTE`.
    - classify(): the reference-vs-mention split (categories 1/2a/2b/3/4).
    - self_test(): runs unconditionally, before the real scan, in both directions.

⚠️ ASSUMPTION WITH AN EXPIRY DATE:
    The `{7}` half of the pattern relies on git's abbreviation length being
    exactly 7 here. git raises it as the object count grows; at 8 the dates
    (`20260807`), the checksum prefixes (`ac8d1b35`) and the HSTS max-age
    (`31536000`) all start matching. When that happens the fix is NOT to widen
    the pattern -- widening is what re-admits all 95 false positives. Require
    anchors to be written with an explicit `--abbrev=7` instead, and re-measure
    the four length classes before touching anything here.

Usage:
    python scripts/lint/check_sha_anchors.py [--root <repo_root>] [--stats] [--self-test]

Created: 2026-08-16 (CH-036)
Last Modified: 2026-08-16

Modification History (newest-first):
    - 2026-08-16: Initial creation (CH-036) — ROADMAP line 9; AD-DesignNoteAnchor-1

Related:
    - docs/03-implementation/changes/CH-036-stale-sha-anchor-detector/spec.md
    - docs/rules-on-demand/lint-detector-authoring.md
    - docs/01-planning/ROADMAP.md:87 (reference vs mention)
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

LINT_DIR = Path(__file__).resolve().parent

SCAN_DIRS = ("docs", "memory")
SCAN_ROOT_FILES = ("CLAUDE.md", "MEMORY.md")
FIXTURE_REL = "scripts/lint/__fixtures__/sha-anchor-drift/stale-anchor.md"

# See the module docstring: {7}|{40}, never {7,40}.
SHA_RE = re.compile(r"\b([0-9a-f]{7}|[0-9a-f]{40})\b")

# === Why HEAD counts as reachable ==========================================
# _ANCHOR_NOTE: a closeout document is written before its own merge, so on the
# PR that introduces it the SHA is legitimately not on main yet. Asking only
# about origin/main would redden every closeout PR against itself, which is the
# timing problem AD-26 recorded. Adding HEAD fixes it without bringing back the
# false negative -- that came from leftover LOCAL BRANCHES, not from HEAD.
_ANCHOR_NOTE = "origin/main or HEAD"

# === PRAGMA: an explicit "this one is a mention, not a reference" ===========
# Same shape as check_path_references.py:76. Needed because a document ABOUT
# stale anchors quotes stale anchors: this detector's own spec cites `020fe11`
# and `d6d2d38` as examples of the defect, and the first run flagged all six.
# That is lint-detector-authoring.md:63 ("does your detector fire on its own
# rule document?") and it is AD-GuardMatchesItsOwnDisclaimer-1 a second time --
# in W17 a guard asserting `FOR UPDATE` was absent matched the comment saying
# it was absent.
#
# Prefer saying it in prose ("rewritten to X", "no longer on main") -- the
# DEAD_VALUE_MARKERS below pick that up with no pragma at all. Reach for the
# pragma only when the sentence cannot carry that phrasing.
PRAGMA = "sha-check: ignore"

# A line that says the SHA is dead is not a stale anchor, it is a record.
DEAD_VALUE_MARKERS = (
    "改寫",
    "死值",
    "不在 main",
    "不在 `main`",
    "不在 origin/main",
    "rebase",
    "repoint",
    "已失效",
    "stale",
    "rewritten",
    "no longer",
)

# === ALLOWED: hex tokens that are not commit references ====================
# A LIST OF NAMES, never a pattern. This started as a pattern -- "exempt any
# line containing YYYY-MM-DD or <sha>" -- and the first run showed why that is
# wrong here: BACKLOG.md:253, :287 and ROADMAP.md:87 are single lines running to
# hundreds of characters, so a placeholder near the start exempted 16 REAL SHA
# references hundreds of characters later. The pattern swallowed the very thing
# the detector exists to find, which is the lesson check_entity_index.py:63-76
# had already written down.
#
# Classic placeholders (`<sha>`, `{sha}`, `abc1234`) need no entry: they carry
# angle or curly brackets and never match the hex pattern in the first place.
# Measured 2026-08-16: the length rule leaves exactly ONE survivor repo-wide.
#
# Adding an entry is a decision. Say why on the line, in the same change.
ALLOWED: dict[tuple[str, str], str] = {
    (
        "docs/06-reference/mockup-to-production-frontend-playbook.md",
        "a385180",
    ): "sample row in a template table; its own date column is still YYYY-MM-DD",
}

_ARROW = re.compile(
    r"`?([0-9a-f]{7,40})`?\s*(?:→|->)\s*\*{0,2}`?([0-9a-f]{7,40})`?"
)


class Violation(NamedTuple):
    """A SHA reference that resolves to nothing and is not flagged as dead.

    NamedTuple rather than dataclass: the tests load this module by file path
    via importlib, and dataclass + future annotations breaks under that
    (lint-detector-authoring.md:120-121).
    """

    path: str
    line: int
    sha: str
    context: str


class Hit(NamedTuple):
    path: str
    line: int
    sha: str
    text: str


def _git(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args], cwd=root, capture_output=True, text=True, timeout=60
    )


def _ref_exists(root: Path, ref: str) -> bool:
    return _git(root, "rev-parse", "--verify", "--quiet", ref).returncode == 0


def reachable(root: Path) -> tuple[set[str], set[str]]:
    """(main-or-HEAD reachable, archive-tag reachable) as 7-char prefixes.

    One `git rev-list` per set, not one `git cat-file` per token
    (lint-detector-authoring.md:89 forbids spawning git inside a loop).
    """
    refs = [r for r in ("origin/main", "HEAD") if _ref_exists(root, r)]
    if not refs:
        # Never fall through to "no violations". A detector that goes quiet
        # when it cannot do its job reads exactly like success.
        raise SystemExit(
            "sha-anchors: FAIL — neither origin/main nor HEAD resolves.\n"
            "In CI this means the checkout is too shallow: the gates job needs\n"
            "fetch-depth: 0 (see .github/workflows/ci.yml)."
        )
    live = _git(root, "rev-list", *refs)
    if live.returncode != 0:
        raise SystemExit(f"sha-anchors: FAIL — git rev-list failed: {live.stderr.strip()}")

    tags = _git(root, "tag", "-l", "archive/*").stdout.split()
    archived: set[str] = set()
    if tags:
        got = _git(root, "rev-list", *tags)
        if got.returncode == 0:
            archived = {s[:7] for s in got.stdout.split()}

    return {s[:7] for s in live.stdout.split()}, archived


def collect(root: Path) -> list[Hit]:
    """Every SHA-shaped token in the documentation trees."""
    files: list[Path] = []
    for rel in SCAN_DIRS:
        files.extend(sorted((root / rel).rglob("*.md")))
    for name in SCAN_ROOT_FILES:
        path = root / name
        if path.is_file():
            files.append(path)

    hits: list[Hit] = []
    for path in files:
        rel = path.relative_to(root).as_posix()
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for lineno, line in enumerate(text.splitlines(), start=1):
            for match in SHA_RE.finditer(line):
                hits.append(Hit(rel, lineno, match.group(1), line))
    return hits


def _reaches(sha: str, prefixes: set[str]) -> bool:
    return sha[:7] in prefixes


def _repointed(text: str, sha: str, live: set[str]) -> bool:
    """`X` → `Y` where Y is alive: X is a recorded dead value, not a stale anchor.

    ⚠️ The arrow is OVERLOADED in this repo -- it is also the start→end of a
    calibration measurement window. W15/retrospective.md:85 reads
    "Day-0 成本 17.03 min（`d6d2d38` → `b7fddaf`）" and BOTH ends are dead, so
    it looks like a repoint record and is in fact two stale anchors. Requiring
    the right-hand side to be alive is what separates them.
    """
    for match in _ARROW.finditer(text):
        left, right = match.group(1), match.group(2)
        if left.startswith(sha) or sha.startswith(left):
            return _reaches(right, live)
    return False


def _followed_by_live(text: str, sha: str, live: set[str]) -> bool:
    """A dead SHA with a live one to its RIGHT on the same line is a repoint record.

    Generalises `_repointed`: the two-column mapping tables use no arrow at all
    (`| 舊 | 新 |` in W14/progress.md:506, `| branch 側 | main 側 |` in
    W12/progress.md:809), so an arrow-only rule reports 11 correct records as
    drift. Requiring the right-hand SHA to be ALIVE is what keeps this from
    swallowing W15/retrospective.md:85, where both ends of a measurement window
    are dead and both are genuinely stale.
    """
    positions = [(m.start(), m.group(1)) for m in SHA_RE.finditer(text)]
    first = next((p for p, s in positions if s == sha), None)
    if first is None:
        return False
    return any(_reaches(s, live) for p, s in positions if p > first)


def classify(hit: Hit, live: set[str], archived: set[str]) -> str:
    """One of: valid, archived, allowed, pragma, recorded-dead, STALE."""
    if _reaches(hit.sha, live):
        return "valid"
    if _reaches(hit.sha, archived):
        return "archived"
    if (hit.path, hit.sha) in ALLOWED:
        return "allowed"
    if PRAGMA in hit.text:
        return "pragma"
    if any(marker in hit.text for marker in DEAD_VALUE_MARKERS):
        return "recorded-dead"
    if _repointed(hit.text, hit.sha, live):
        return "recorded-dead"
    if _followed_by_live(hit.text, hit.sha, live):
        return "recorded-dead"
    return "STALE"


def find_violations(repo_root: Path) -> list[Violation]:
    live, archived = reachable(repo_root)
    out: list[Violation] = []
    for hit in collect(repo_root):
        if classify(hit, live, archived) == "STALE":
            snippet = hit.text.strip()
            if len(snippet) > 110:
                snippet = snippet[:107] + "..."
            out.append(Violation(hit.path, hit.line, hit.sha, snippet))
    return out


def tally(repo_root: Path) -> dict[str, int]:
    live, archived = reachable(repo_root)
    counts = {k: 0 for k in ("valid", "archived", "allowed", "pragma", "recorded-dead", "STALE")}
    for hit in collect(repo_root):
        counts[classify(hit, live, archived)] += 1
    return counts


def self_test(root: Path) -> None:
    """Both directions, unconditionally, before the real scan.

    A one-directional meta-verification is indistinguishable from a broken one
    (AD-MetaVerificationBug-1): the fixture must be caught AND a known-good
    anchor must be let through. Checking only the first would still pass with a
    classify() that returns STALE for everything.
    """
    fixture = root / FIXTURE_REL
    if not fixture.is_file():
        raise SystemExit(
            f"sha-anchors: FAIL — self-test fixture missing: {FIXTURE_REL}\n"
            "Without it nothing proves the detector still detects."
        )
    live, archived = reachable(root)

    caught = [
        h
        for h in (
            Hit(FIXTURE_REL, n, m.group(1), line)
            for n, line in enumerate(fixture.read_text(encoding="utf-8").splitlines(), 1)
            for m in SHA_RE.finditer(line)
        )
        if classify(h, live, archived) == "STALE"
    ]
    if not caught:
        raise SystemExit(
            "sha-anchors: FAIL — the self-test fixture was NOT flagged.\n"
            f"Fixture: {FIXTURE_REL}\n"
            "Either the pattern went stale or the fixture was 'cleaned up'."
        )

    head = _git(root, "rev-parse", "--short=7", "HEAD").stdout.strip()
    if not head:
        raise SystemExit("sha-anchors: FAIL — cannot resolve HEAD for the positive control.")
    good = Hit("<self-test>", 1, head, f"anchored at commit `{head}`")
    if classify(good, live, archived) != "valid":
        raise SystemExit(
            "sha-anchors: FAIL — a live HEAD anchor was NOT accepted.\n"
            "The detector would flag every correct reference in the repo."
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Flag documentation commit-SHA references that resolve to nothing."
    )
    parser.add_argument("--root", default=str(LINT_DIR.parents[1]))
    parser.add_argument("--stats", action="store_true", help="Print the full classification tally.")
    parser.add_argument("--show-passed", action="store_true", help="List what was let through and why.")
    parser.add_argument("--self-test", action="store_true", help="Meta-verification only, then exit.")
    cli = parser.parse_args(argv)
    root = Path(cli.root)

    self_test(root)
    if cli.self_test:
        print("sha-anchors: SELF-TEST PASS — fixture caught, live anchor accepted.")
        return 0

    if cli.stats:
        for name, count in tally(root).items():
            print(f"  {name}: {count}")

    if cli.show_passed:
        live, archived = reachable(root)
        for hit in collect(root):
            verdict = classify(hit, live, archived)
            if verdict in ("recorded-dead", "archived", "allowed", "pragma"):
                print(f"  [{verdict}] {hit.path}:{hit.line} {hit.sha}")

    violations = find_violations(root)
    if violations:
        print(f"sha-anchors: {len(violations)} stale anchor(s):")
        for v in violations:
            print(f"  {v.path}:{v.line}: `{v.sha}` resolves to nothing ({_ANCHOR_NOTE})")
            print(f"      {v.context}")
        print(
            "  Repoint to the post-rebase SHA (match by commit subject + author date --\n"
            "  `git log --format='%h %ad %s'`; the old object is gone, `git show` cannot help),\n"
            "  or, if the line is ABOUT the SHA being dead, say so on the line."
        )
        return 1

    print(f"sha-anchors: OK (every documented SHA resolves against {_ANCHOR_NOTE})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
