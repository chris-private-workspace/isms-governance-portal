"""
File: scripts/lint/tests/test_backlog_counts.py
Purpose: Tests for check_backlog_counts.py — four failure directions plus the
    false-positive regression the historical figures create.
Category: Tooling / lint / test
Scope: CH-027

Description:
    unittest, not pytest: this project has no Python dependency management and
    `pip install` fails behind the corporate proxy (CH-007 measured the wheel
    arriving as 0 bytes). The detector is loaded via importlib by path, which is
    why its Violation is a NamedTuple (lint-detector-authoring.md:120).

    Division of labour with the detector's own self_test(): self_test runs on
    EVERY run_all invocation and covers the two directions cheaply enough to pay
    for every time (baseline clean, wrong total caught). This file covers the
    other three failure directions, the parser traps, and the derived figures.
    Neither is redundant with the other -- the fast one is always on, the
    thorough one runs with the test suite.

    ⚠️ Every negative test first asserts the baseline is CLEAN. W08's N6 broke a
    fixture in a way that left the run green and looked exactly like success
    (AD-MetaVerificationBug-1); a negative case measured against an already
    broken baseline proves nothing.

Usage:
    python scripts/lint/tests/test_backlog_counts.py

Created: 2026-08-14 (CH-027)
Last Modified: 2026-08-14

Modification History (newest-first):
    - 2026-08-14: Initial creation (CH-027)
"""

import importlib.util
import unittest
from pathlib import Path

_LINT_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _LINT_DIR.parents[1]
_DETECTOR = _LINT_DIR / "check_backlog_counts.py"

_spec = importlib.util.spec_from_file_location("cbc", _DETECTOR)
cbc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cbc)

BASELINE = (_REPO_ROOT / cbc.BASELINE_REL).read_text(encoding="utf-8")


class TestBacklogCounts(unittest.TestCase):
    def _assert_baseline_clean(self) -> None:
        """The precondition every negative case is measured against."""
        self.assertEqual(
            cbc.check_text(BASELINE, "baseline"),
            [],
            "baseline fixture is not clean -- every negative assertion below "
            "would be measured against a broken baseline",
        )

    def _details(self, violations) -> str:
        return " || ".join(v.detail for v in violations)

    # --- positive ---------------------------------------------------------

    def test_baseline_fixture_passes(self) -> None:
        self._assert_baseline_clean()

    def test_live_backlog_passes(self) -> None:
        """The real file, because a detector nobody points at the real data is
        a detector that has never been tried."""
        self.assertEqual(cbc.find_violations(_REPO_ROOT), [])

    def test_baseline_counts_exclude_the_three_known_parser_traps(self) -> None:
        """3/1/1/1 is only reachable if all three traps are handled.

        The baseline carries one of each, and each has a distinct wrong answer:
          - section bounds ignored  -> total 4 (the §Shipped row joins in)
          - emoji counted, not cells -> P1 becomes 2 (a notes cell says 原 🟡 P1)
          - fixed column index used  -> the bare-pipe row yields no priority
        """
        counts, errors = cbc.derive_counts(BASELINE, "baseline")
        self.assertEqual(errors, [])
        self.assertEqual(
            counts, {"total": 3, "0": 1, "1": 1, "2": 1, "3": 0}
        )

    # --- negative: the four failure directions ----------------------------

    def test_wrong_total_is_detected(self) -> None:
        self._assert_baseline_clean()
        broken = BASELINE.replace("現為 3 條", "現為 4 條", 1)
        self.assertNotEqual(broken, BASELINE)
        found = cbc.check_text(broken, "broken")
        self.assertIn("declares total=4", self._details(found))
        self.assertIn("table has 3", self._details(found))

    def test_wrong_priority_split_is_detected(self) -> None:
        """A total that still adds up while a band is misdeclared."""
        self._assert_baseline_clean()
        broken = BASELINE.replace("P0 1 / P1 1 / P2 1", "P0 2 / P1 0 / P2 1", 1)
        self.assertNotEqual(broken, BASELINE)
        found = cbc.check_text(broken, "broken")
        self.assertIn("declares P0=2", self._details(found))
        self.assertIn("declares P1=0", self._details(found))

    def test_unparsable_priority_cell_is_detected_not_skipped(self) -> None:
        """The one that matters most: an unknown spelling must FAIL.

        Skipping it would drop the row from the count silently, which is the
        exact shape of a detector that is green because it cannot see.
        """
        self._assert_baseline_clean()
        broken = BASELINE.replace("| 🟢 P2 |", "| 低 |", 1)
        self.assertNotEqual(broken, BASELINE)
        found = cbc.check_text(broken, "broken")
        self.assertIn("AD-Fixture-Plain has 0 parsable priority cell", self._details(found))

    def test_duplicate_declaration_marker_is_detected(self) -> None:
        """Two counters and no rule saying which one is authoritative."""
        self._assert_baseline_clean()
        marker = "（**現為 3 條 —— P0 1 / P1 1 / P2 1**"
        self.assertIn(marker, BASELINE)
        broken = BASELINE.replace(marker, marker + "\n> " + marker, 1)
        found = cbc.check_text(broken, "broken")
        self.assertIn("matched 2 time(s)", self._details(found))

    def test_missing_declaration_marker_is_detected(self) -> None:
        """A reworded header must not silently disable the check."""
        self._assert_baseline_clean()
        broken = BASELINE.replace("現為 3 條 —— P0 1 / P1 1 / P2 1", "數量見表格", 1)
        self.assertNotEqual(broken, BASELINE)
        found = cbc.check_text(broken, "broken")
        self.assertIn("matched 0 time(s)", self._details(found))

    # --- false-positive regressions ---------------------------------------

    def test_historical_figures_are_not_read_as_the_declaration(self) -> None:
        """`其前 9 條` / `達 48 條` sit in the same paragraph as the marker.

        Anchoring on 現為 alone matches three places in the live file; only the
        full shape is unique. The baseline carries both decoys, so this passing
        while the counts stay 3/1/1/1 is what proves neither was picked up.
        """
        self._assert_baseline_clean()
        self.assertIn("其前 9 條", BASELINE)
        self.assertIn("達 48 條", BASELINE)

    def test_a_history_line_carrying_the_full_shape_is_still_excluded(self) -> None:
        """What the 現為 anchor actually buys: no false positive.

        Added because neutralising the anchor turned NOTHING red (CH-027 N4a).
        The anchor does not stop a wrong count from slipping through -- the
        exactly-once rule does that. It stops a PAST figure written in the
        current shape from being read as a second declaration. Today's file has
        no such line, so nothing else in this suite can reach the case.
        """
        self._assert_baseline_clean()
        decoy = BASELINE.replace(
            "> 其前 9 條，某次 closeout：新增 2 條。",
            "> 其前 9 條 —— P0 3 / P1 4 / P2 2，某次 closeout：新增 2 條。",
            1,
        )
        self.assertNotEqual(decoy, BASELINE)
        self.assertEqual(cbc.check_text(decoy, "decoy"), [])

    def test_rows_below_the_open_section_are_not_counted(self) -> None:
        """Direct proof of the section boundary, not an inference from the total.

        Demote the §Shipped heading and its row joins §Open -- the total must
        move, which is only possible if the bound was doing work.
        """
        self._assert_baseline_clean()
        merged = BASELINE.replace(
            "## §Shipped Phases Pointer Index", "### §Shipped Phases Pointer Index", 1
        )
        self.assertNotEqual(merged, BASELINE)
        counts, errors = cbc.derive_counts(merged, "merged")
        self.assertEqual(errors, [])
        self.assertEqual(counts["total"], 4)
        self.assertEqual(counts["0"], 2)

    def test_priority_named_inside_a_notes_cell_is_not_counted(self) -> None:
        """`（原 🟡 P1）` is a mention, not a whole cell."""
        self.assertIsNone(cbc.parse_priority(" 成本已下修（原 🟡 P1）"))
        self.assertIsNone(cbc.parse_priority(' grep -c "🔴 P0"'))
        self.assertEqual(cbc.parse_priority(" 🟡 P1 "), "1")

    def test_all_three_live_spellings_parse(self) -> None:
        """The two bold spellings are real rows in BACKLOG.md, not hypotheses."""
        self.assertEqual(cbc.parse_priority(" 🔴 **P0 候選** "), "0")
        self.assertEqual(cbc.parse_priority(" 🟡 **P1**（升級）"), "1")
        self.assertEqual(cbc.parse_priority(" 🟢 P2 "), "2")


if __name__ == "__main__":
    unittest.main(verbosity=2)
