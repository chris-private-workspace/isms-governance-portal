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
Last Modified: 2026-08-07

Modification History (newest-first):
    - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

Related:
    - docs/rules-on-demand/lint-detector-authoring.md
    - .claude/rules/task-workflow.md §Before Commit Checklist
"""

import argparse
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

    proc = subprocess.run(args, capture_output=True, text=True)
    output = (proc.stdout + proc.stderr).strip()

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
