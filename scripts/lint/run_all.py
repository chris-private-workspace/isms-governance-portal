"""
File: scripts/lint/run_all.py
Purpose: One-stop aggregator for the project's architecture lints.
Category: Tooling / lint
Scope: Template v2.6.1

Description:
    Runs every registered detector with its CORRECT arguments and reports a
    single pass/fail summary.

    Why an aggregator instead of calling each script directly: a detector
    invoked with the wrong --root SILENTLY PASSES (it scans an empty tree,
    finds 0 violations, exits 0). Centralising the argument list in one
    place is the only reliable way to stop that failure mode — it was a
    real drift finding in the source project.

Key Components:
    - DETECTORS: the registry. Add new detectors here (see
      docs/rules-on-demand/lint-detector-authoring.md).
    - run_one(): subprocess wrapper capturing exit code + last output line.
    - main(): prints "<passed>/<total>" and exits non-zero on any failure.

Usage:
    python scripts/lint/run_all.py [--root <repo_root>] [--verbose]

Created: 2026-08-07
Last Modified: 2026-08-12

Modification History (newest-first):
    - 2026-08-19: Register fixture-prose detector (Phase W24) — 9 -> 10
    - 2026-08-14: Register backlog-counts detector (CH-027) — 7 -> 8
    - 2026-08-12: Register entity-index detector (Phase W08) — 6 -> 7
    - 2026-08-07: Register workflow-placeholders detector (CH-007)
    - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

Related:
    - docs/rules-on-demand/lint-detector-authoring.md
    - .claude/rules/task-workflow.md §Before Commit Checklist
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

LINT_DIR = Path(__file__).resolve().parent

# Registry: (display name, script filename, extra args)
#
# NOTE the extra args carefully — each detector may expect a different root
# (repo root vs source root). Getting this wrong makes the detector pass
# silently. Add new detectors here after writing them.
DETECTORS: list[tuple[str, str, list[str]]] = [
    ("rules-hygiene", "check_rules_hygiene.py", []),
    ("doc-links", "check_doc_links.py", []),
    ("path-references", "check_path_references.py", []),
    # Passes trivially until the project has its first phase / change / bug pre-doc.
    ("status-markers", "check_status_markers.py", []),
    # Skips itself when the project has no .mockup-fidelity.json.
    ("mockup-fidelity", "check_mockup_fidelity.py", []),
    # Ratchet on unfilled workflow placeholders. Complements actionlint in ci.yml:
    # actionlint catches placeholders that are shell syntax errors, this catches
    # the ones that are valid shell but mean "not finished yet" (CH-007).
    ("workflow-placeholders", "check_workflow_placeholders.py", []),
    # Derives the Wave-1 entity count from schema.prisma ∩ 02a §0 instead of
    # letting each document carry its own hand-written figure (W08).
    ("entity-index", "check_entity_index.py", []),
    # Derives BACKLOG's §Open counts from its own table instead of trusting the
    # figure copied into the header by hand (CH-027).
    ("backlog-counts", "check_backlog_counts.py", []),
    # Documented commit SHAs that no longer resolve. Rebase merge rewrites every
    # SHA on a feature branch, and closeout docs are written before the merge
    # (CH-036). ⚠️ Needs real git history: the gates job checks out with
    # fetch-depth: 0 for this, and the detector hard-fails rather than skipping
    # when it cannot see origin/main.
    ("sha-anchors", "check_sha_anchors.py", []),
    # Fixture prose that would become a forged governance artifact: a
    # @record-claim constant reaching a screen that reads the API, or this
    # platform claiming a certification it does not hold (W24, CH-044).
    # ⚠️ It measures whether anyone bypassed the two mechanisms, NOT whether
    # the prose on a screen is honest. That is the drive-through's job.
    ("fixture-prose", "check_fixture_prose.py", []),
    # ("your-detector", "check_your_pattern.py", ["--root", "src"]),
]


def run_one(
    name: str, script: str, extra: list[str], repo_root: Path, verbose: bool
) -> tuple[bool, str]:
    """Run one detector. Return (passed, last_output_line)."""
    path = LINT_DIR / script
    if not path.is_file():
        return False, f"script not found: {path}"

    args = [sys.executable, str(path), *extra]
    if "--root" not in extra:
        args += ["--root", str(repo_root)]

    # === UTF-8 on both ends of the pipe ===================================
    # Why: `text=True` alone decodes with the locale encoding, which on Windows
    # is cp950 here. The first detector to print a line of Chinese blew up the
    # RUNNER, not the detector -- UnicodeDecodeError inside run_one, so every
    # remaining detector went unrun (CH-036 hit it; the quoted line was a
    # document excerpt). PYTHONIOENCODING fixes the child's writer, encoding=
    # fixes this reader, and errors="replace" means a stray byte degrades one
    # character instead of taking down the whole lint run.
    # ⚠️ Platform-specific: this passes on Linux CI either way, so nothing in CI
    # would ever have caught it (Risk Class B in task-workflow.md).
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    proc = subprocess.run(
        args, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env
    )
    output = ((proc.stdout or "") + (proc.stderr or "")).strip()

    if verbose and output:
        print(f"--- {name} ---")
        print(output)

    last_line = output.splitlines()[-1] if output else "(no output)"
    return proc.returncode == 0, last_line


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run all architecture lints.")
    parser.add_argument(
        "--root",
        default=str(LINT_DIR.parents[1]),
        help="Repo root (default: two levels above scripts/lint/).",
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Print each detector's full output."
    )
    cli = parser.parse_args(argv)
    repo_root = Path(cli.root)

    if not DETECTORS:
        print("run_all: no detectors registered -- add them to DETECTORS in run_all.py")
        return 0

    results: list[tuple[str, bool, str]] = []
    for name, script, extra in DETECTORS:
        passed, summary = run_one(name, script, extra, repo_root, cli.verbose)
        results.append((name, passed, summary))

    total = len(results)
    passed_count = sum(1 for _, ok, _ in results if ok)

    print(f"\nrun_all: {passed_count}/{total} passed")
    for name, ok, summary in results:
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {name}: {summary}")

    return 0 if passed_count == total else 1


if __name__ == "__main__":
    sys.exit(main())
