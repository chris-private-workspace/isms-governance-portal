"""
File: scripts/lint/tests/test_sha_anchors.py
Purpose: Tests for check_sha_anchors.py — the reference-vs-mention split, the
    four length false-positive classes, and the self-referential case.
Category: Tooling / lint / test
Scope: CH-036

Description:
    unittest, not pytest: no Python dependency management here and `pip install`
    fails behind the corporate proxy (CH-007 measured the wheel arriving as
    0 bytes). The detector is loaded via importlib by path, which is why its
    Violation is a NamedTuple (lint-detector-authoring.md:120).

    ⚠️ ON THE TWO "MANDATORY" TESTS: lint-detector-authoring.md:218 requires a
    comment false-positive and a docstring false-positive. Those are written for
    detectors that read SOURCE. This one reads Markdown, where the equivalent
    failure — and the one :63 actually names — is "does your detector fire on
    its own rule document?". It did: the first run flagged six SHAs in this
    detector's own spec, which cites them as examples of the defect. The
    equivalent pair is therefore test_pragma_* and test_prose_saying_it_is_dead_*.
    Stating the substitution rather than quietly skipping the requirement.

    Division of labour with the detector's own self_test(): self_test runs on
    every run_all invocation and covers the two cheap directions (fixture caught,
    live anchor accepted). This file covers the classification edges.

Usage:
    python scripts/lint/tests/test_sha_anchors.py

Created: 2026-08-16 (CH-036)
Last Modified: 2026-08-16

Modification History (newest-first):
    - 2026-08-16: Initial creation (CH-036)
"""

import importlib.util
import subprocess
import unittest
from pathlib import Path

_LINT_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _LINT_DIR.parents[1]
_DETECTOR = _LINT_DIR / "check_sha_anchors.py"

_spec = importlib.util.spec_from_file_location("csa", _DETECTOR)
csa = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(csa)

LIVE, ARCHIVED = csa.reachable(_REPO_ROOT)
HEAD = subprocess.run(
    ["git", "rev-parse", "--short=7", "HEAD"],
    cwd=_REPO_ROOT, capture_output=True, text=True, check=True,
).stdout.strip()
DEAD = "deadbee"


def verdict(text: str, sha: str, path: str = "docs/x.md") -> str:  # path-check: ignore — synthetic
    return csa.classify(csa.Hit(path, 1, sha, text), LIVE, ARCHIVED)


class TestShaAnchors(unittest.TestCase):
    # --- the precondition every negative case is measured against ---------

    def _assert_instrument_works(self) -> None:
        """A live anchor must pass and a dead one must fail, or nothing below
        proves anything (AD-MetaVerificationBug-1)."""
        self.assertEqual(verdict(f"anchored at `{HEAD}`", HEAD), "valid")
        self.assertEqual(verdict(f"anchored at `{DEAD}`", DEAD), "STALE")

    def test_instrument(self) -> None:
        self._assert_instrument_works()

    # --- positive: the real repo ------------------------------------------

    def test_live_repo_is_clean(self) -> None:
        """The real files, because a detector nobody points at the real data is
        a detector that has never been tried."""
        self._assert_instrument_works()
        violations = csa.find_violations(_REPO_ROOT)
        self.assertEqual(
            violations,
            [],
            "stale anchors in the repo:\n"
            + "\n".join(f"  {v.path}:{v.line} {v.sha}" for v in violations[:20]),
        )

    # --- the detector must not fire on documents ABOUT stale anchors -------

    def test_pragma_suppresses(self) -> None:
        self._assert_instrument_works()
        self.assertEqual(
            verdict(f"quoted as an example: `{DEAD}` <!-- {csa.PRAGMA} -->", DEAD),
            "pragma",
        )

    def test_prose_saying_it_is_dead_suppresses(self) -> None:
        self._assert_instrument_works()
        self.assertEqual(verdict(f"rebase rewrote `{DEAD}`", DEAD), "recorded-dead")
        self.assertEqual(verdict(f"`{DEAD}` 已不在 main 上", DEAD), "recorded-dead")

    def test_detectors_own_spec_is_clean(self) -> None:
        """lint-detector-authoring.md:63 — does it fire on its own document?"""
        self._assert_instrument_works()
        spec = "docs/03-implementation/changes/CH-036-stale-sha-anchor-detector/spec.md"
        offenders = [v for v in csa.find_violations(_REPO_ROOT) if v.path == spec]
        self.assertEqual(offenders, [])

    # --- repoint records: arrow and the arrowless two-column tables --------

    def test_arrow_left_dead_right_live_is_a_record(self) -> None:
        self._assert_instrument_works()
        self.assertEqual(verdict(f"`{DEAD}` → `{HEAD}`", DEAD), "recorded-dead")

    def test_arrow_both_dead_is_still_stale(self) -> None:
        """W15/retrospective.md:85 is a MEASUREMENT WINDOW, not a repoint —
        both ends are dead and both are genuinely broken. The arrow alone must
        not be enough to pass."""
        self._assert_instrument_works()
        self.assertEqual(verdict(f"（`{DEAD}` → `beefbee`）17.03 min", DEAD), "STALE")

    def test_two_column_table_without_arrow_is_a_record(self) -> None:
        """W14/progress.md:508-512 uses `| 舊 | 新 |` with no arrow at all."""
        self._assert_instrument_works()
        self.assertEqual(verdict(f"| `{DEAD}` | `{HEAD}` |", DEAD), "recorded-dead")

    def test_live_sha_to_the_LEFT_does_not_excuse(self) -> None:
        """Order matters: only a live SHA to the RIGHT means 'was rewritten to'."""
        self._assert_instrument_works()
        self.assertEqual(verdict(f"| `{HEAD}` | `{DEAD}` |", DEAD), "STALE")

    # --- the four length false-positive classes ---------------------------

    def test_dates_are_not_shas(self) -> None:
        self.assertEqual(csa.SHA_RE.findall("audit-20260807.md"), [])

    def test_ci_run_ids_are_not_shas(self) -> None:
        self.assertEqual(csa.SHA_RE.findall("run `31299823765`"), [])

    def test_migration_timestamps_are_not_shas(self) -> None:
        self.assertEqual(csa.SHA_RE.findall("Migration `20260812131655`"), [])

    def test_checksum_prefixes_are_not_shas(self) -> None:
        self.assertEqual(csa.SHA_RE.findall("checksum `ac8d1b35…`"), [])

    def test_uuid_segments_are_not_shas(self) -> None:
        self.assertEqual(csa.SHA_RE.findall("ffffffff-0000-0000-0000-0000dead0000"), [])

    def test_seven_char_all_digits_IS_a_sha(self) -> None:
        """5 measured tokens are 7 all-digit commits (6446099, 7251670, ...), so
        'all digits means CI run id' would have been a false-negative rule."""
        self.assertEqual(csa.SHA_RE.findall("MERGED (PR #50, 6446099)"), ["6446099"])

    # --- explicit allowlist ------------------------------------------------

    def test_allowlist_is_path_scoped_not_global(self) -> None:
        """A bare token exemption would excuse the same string anywhere. The
        pattern version of this rule swallowed 16 real references before it was
        replaced by the named list."""
        self._assert_instrument_works()
        (path, token), _ = next(iter(csa.ALLOWED.items()))
        self.assertEqual(verdict(f"| `{token}` |", token, path=path), "allowed")
        other = "docs/other.md"  # path-check: ignore — synthetic
        self.assertEqual(verdict(f"| `{token}` |", token, path=other), "STALE")

    # --- the fixture must stay broken --------------------------------------

    def test_self_test_runs_both_directions(self) -> None:
        csa.self_test(_REPO_ROOT)


if __name__ == "__main__":
    unittest.main(verbosity=2)
