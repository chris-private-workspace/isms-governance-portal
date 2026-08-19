"""
File: scripts/lint/tests/test_status_markers.py
Purpose: Tests for check_status_markers.py E5 — the contradiction rule, the
    three masking classes, and the deliberate blind spot.
Category: Tooling / lint / test
Scope: W23

Description:
    unittest, not pytest: no Python dependency management here and `pip install`
    fails behind the corporate proxy (CH-007 measured the wheel arriving as
    0 bytes). The detector is loaded via importlib by path, which is why its
    Violation is a NamedTuple (lint-detector-authoring.md:120).

    ⚠️ WHAT THE TWO "MANDATORY" TESTS BECOME HERE. lint-detector-authoring.md:218
    requires a comment false-positive and a docstring false-positive. Those are
    written for detectors that read SOURCE; this one reads Markdown, where :63's
    acceptance question — "does it fire on its own rule document?" — is the real
    equivalent. It very nearly did: this repo contains roughly ten times more
    PROSE about `PR-pending` than actual markers, including in the backlog entry
    for the defect and in the plan for this phase. The substituted pair is
    test_prose_in_backticks_* and test_html_comment_*.

    ⛔ ON COUNTS VS NAMES (plan R8 / AD-NarrowPatternWideClaim-1): the live-repo
    test asserts the offender SET, listing files by name. A count assertion would
    pass just as happily with the right number of the wrong files, and audit #8
    had just demonstrated that failure the week this was written.

Usage:
    python scripts/lint/tests/test_status_markers.py

Created: 2026-08-19 (W23)
Last Modified: 2026-08-19

Modification History (newest-first):
    - 2026-08-19: Initial creation (W23) — E5 coverage
"""

import importlib.util
import tempfile
import unittest
from pathlib import Path

_LINT_DIR = Path(__file__).resolve().parents[1]
_REPO_ROOT = _LINT_DIR.parents[1]
_DETECTOR = _LINT_DIR / "check_status_markers.py"

_spec = importlib.util.spec_from_file_location("csm", _DETECTOR)
csm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(csm)

FIXTURE = _REPO_ROOT / csm.FIXTURE_REL

CLOSED_PLAN = "---\nstatus: closed\n---\n\n# W50\n"
ACTIVE_PLAN = "---\nstatus: active\n---\n\n# W51\n"


def _tree(root: Path, files: dict[str, str]) -> Path:
    for rel, body in files.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body, encoding="utf-8")
    return root


class TestE5StalePending(unittest.TestCase):
    # --- the precondition every negative case is measured against ----------

    def _assert_instrument_works(self) -> None:
        """The fixture pair must behave, or nothing below proves anything.

        AD-MetaVerificationBug-1: a test suite whose instrument is broken
        reports 'no violations' in exactly the same words as a clean repo.
        """
        hits = {v.artifact.split(":")[0] for v in csm.stale_pending(FIXTURE, require_landed=False)}
        self.assertIn(
            "docs/01-planning/W99-fixture-closed/retrospective.md",  # path-check: ignore — synthetic
            hits,
            "E5 no longer catches its own fixture — the instrument is broken",
        )
        self.assertNotIn(
            "docs/01-planning/W98-fixture-active/retrospective.md",  # path-check: ignore — synthetic
            hits,
            "E5 flagged a legitimate mid-closeout marker — see plan R4",
        )

    def test_instrument(self) -> None:
        self._assert_instrument_works()

    # --- both directions, which is the whole point (plan R4) ---------------

    def test_self_test_runs_both_directions(self) -> None:
        """self_test() raises SystemExit on either failure; silence is a pass."""
        csm.self_test(_REPO_ROOT)

    def test_fixture_scan_is_not_swallowed_by_its_own_skip_list(self) -> None:
        """Regression: E5_SKIP_PARTS was first checked against the ABSOLUTE path.

        The fixture root itself lives under `__fixtures__`, so every fixture file
        was skipped and self_test reported 'did NOT flag the stale fixture' — a
        message that reads like a broken pattern but was a broken scope. Measured
        on the first run of stale_pending().
        """
        self.assertTrue(csm.stale_pending(FIXTURE, require_landed=False), "fixture tree scanned as empty")

    # --- the live repo, named not counted (plan R8) ------------------------

    def test_live_repo_is_clean(self) -> None:
        self._assert_instrument_works()
        offenders = sorted(v.artifact for v in csm.stale_pending(_REPO_ROOT))
        self.assertEqual(
            offenders,
            [],
            "stale merge markers in the repo:\n" + "\n".join(f"  {o}" for o in offenders),
        )

    def test_detector_does_not_fire_on_documents_about_the_defect(self) -> None:
        """lint-detector-authoring.md:63 — the acceptance question.

        These four files all discuss `PR-pending` at length. Named individually
        rather than asserted as a count, so a future narrowing that drops one
        cannot hide behind an unchanged total.
        """
        self._assert_instrument_works()
        discussed = {
            "docs/01-planning/BACKLOG.md",
            "docs/01-planning/STATUS_AUDIT.md",
            "docs/rules-on-demand/lint-detector-authoring.md",
            "docs/rules-on-demand/git-workflow.md",
        }
        for rel in discussed:
            self.assertTrue((_REPO_ROOT / rel).is_file(), f"missing: {rel}")
        hit = {v.artifact.split(":")[0] for v in csm.stale_pending(_REPO_ROOT)}
        self.assertEqual(hit & discussed, set())

    # --- the three masking classes -----------------------------------------

    def test_prose_in_backticks_does_not_fire(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "docs/01-planning/W50-x/progress.md": "W50 的四處 `PR-pending` 已翻\n",  # path-check: ignore — synthetic
                },
            )
            self.assertEqual(csm.stale_pending(root, require_landed=False), [])

    def test_html_comment_does_not_fire(self) -> None:
        """The real W21 case: a back-fill note mentions the marker UNBACKTICKED
        inside an HTML comment. Without the comment mask this is a false positive
        on a file somebody had already fixed correctly."""
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "docs/01-planning/W50-x/retrospective.md": (  # path-check: ignore — synthetic
                        "**PR**: MERGED (PR #84, 700ef62)\n"
                        "<!-- back-filled: this line said PR-pending at closeout -->\n"
                    ),
                },
            )
            self.assertEqual(csm.stale_pending(root, require_landed=False), [])

    def test_fenced_block_does_not_fire(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "docs/01-planning/W50-x/progress.md": (  # path-check: ignore — synthetic
                        "example of the defect:\n\n```\n**PR**: #TBD\n```\n"
                    ),
                },
            )
            self.assertEqual(csm.stale_pending(root, require_landed=False), [])

    def test_masking_preserves_line_numbers(self) -> None:
        """A mask that changed length would report the defect on the wrong line,
        which is worse than not reporting it — it sends the reader elsewhere."""
        text = "a\n`x`\n<!--\nb\n-->\nc\n"
        self.assertEqual(len(csm.mask_non_prose(text).splitlines()), len(text.splitlines()))

    # --- the marker itself is never the offence (plan R4) -------------------

    def test_pending_marker_on_an_open_artifact_is_accepted(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W51-y/plan.md": ACTIVE_PLAN,  # path-check: ignore — synthetic
                    "docs/01-planning/W51-y/retrospective.md": "**PR**: #TBD\n",  # path-check: ignore — synthetic
                },
            )
            self.assertEqual(csm.stale_pending(root, require_landed=False), [])

    def test_pending_marker_on_a_closed_artifact_fires(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "docs/01-planning/W50-x/retrospective.md": "**PR**: #TBD\n",  # path-check: ignore — synthetic
                },
            )
            found = csm.stale_pending(root, require_landed=False)
            self.assertEqual(
                [v.artifact for v in found],
                ["docs/01-planning/W50-x/retrospective.md:1"],  # path-check: ignore — synthetic
            )
            self.assertEqual(found[0].check, "E5")

    # --- the three authority routes ----------------------------------------

    def test_authority_from_a_phase_id_on_the_line(self) -> None:
        """Navigation files (BACKLOG, MEMORY) carry the phase id inline; the
        marker is nowhere near the phase folder."""
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "MEMORY.md": "- W50 shipped — PR-pending\n",
                },
            )
            self.assertEqual([v.artifact for v in csm.stale_pending(root, require_landed=False)], ["MEMORY.md:1"])

    def test_authority_from_the_file_header(self) -> None:
        """Single-file CH records carry `**Phase**: W21` in the header, not on
        the marker line — the CH-041 shape."""
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "docs/03-implementation/changes/CH-900-z.md": (  # path-check: ignore — synthetic
                        "# CH-900\n\n**Phase**: W50\n**PR**: #TBD\n"
                    ),
                },
            )
            self.assertEqual(
                [v.artifact for v in csm.stale_pending(root, require_landed=False)],
                ["docs/03-implementation/changes/CH-900-z.md:4"],  # path-check: ignore — synthetic
            )

    def test_unresolvable_authority_is_skipped_not_guessed(self) -> None:
        """⛔ THE DELIBERATE BLIND SPOT, asserted so it cannot drift silently.

        `**Phase**: 無 —— 獨立 CH` on a single-file record means nothing in the
        repo states whether it shipped. E5 stays quiet rather than inventing a
        verdict. Two such records (CH-006, CH-007) were genuinely stale on
        2026-08-19 and E5 could not see either — they were found by the manual
        enumeration instead, and the gap is tracked as AD-E5BlindToStandaloneCh-1.
        """
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "docs/03-implementation/changes/CH-901-z.md": (  # path-check: ignore — synthetic
                        "# CH-901\n\n**Phase**: 無 —— 獨立 CH\n**PR**: #TBD\n"
                    ),
                },
            )
            self.assertEqual(csm.stale_pending(root, require_landed=False), [])

    def test_templates_are_excluded(self) -> None:
        """A template's `PR-pending` is the placeholder being copied FROM."""
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "docs/01-planning/_templates/phase/retrospective.md": (  # path-check: ignore — synthetic
                        "W50\n**PR**: #N（<MERGED sha> / PR-pending）\n"
                    ),
                },
            )
            self.assertEqual(csm.stale_pending(root, require_landed=False), [])

    # --- all five enumerated marker formats --------------------------------

    def test_every_enumerated_marker_format_matches(self) -> None:
        """The formats a `grep -rni` actually returned on 2026-08-19.

        ⭐ `PR 待開` is here because the enumeration found it in ADR-0005 — it
        would not have been guessed, and it was one of the three live defects.
        """
        for marker in ("PR-pending", "PR pending", "#TBD", "PR 待開"):
            with self.subTest(marker=marker):
                self.assertTrue(
                    any(p.search(marker) for p in csm.PENDING_PATTERNS),
                    f"no pattern matches the enumerated format {marker!r}",
                )

    def test_every_pr_field_value_that_means_unresolved(self) -> None:
        """⛔ THE DAY-4 LESSON, pinned.

        The first version of this check enumerated SPELLINGS and shipped missing
        three of them, all live in the repo: `#86（pending）` (CH-042),
        `待開` (CH-016/017), `#<TBD>` (CH-032). The set of spellings is open;
        the set of MARKER FIELDS is closed and greppable. Anchoring on
        `**PR**:` and classifying the value is what makes this list finite.
        """
        for value in ("#TBD", "#<TBD>", "待開", "#86（pending）", "#86 (pending)", "PR-pending"):
            with self.subTest(value=value):
                line = f"**PR**: {value}"
                m = csm.PR_FIELD_RE.match(line)
                self.assertIsNotNone(m, f"PR_FIELD_RE did not match {line!r}")
                self.assertTrue(
                    csm.UNRESOLVED_VALUE_RE.search(m.group(1))
                    or any(p.search(line) for p in csm.PENDING_PATTERNS),
                    f"{value!r} is not recognised as unresolved",
                )

    def test_resolved_pr_field_values_do_not_fire(self) -> None:
        """The other half: every shape a SETTLED marker takes in this repo.

        Without this, widening the value rule to catch `pending` would quietly
        start flagging `MERGED (PR #6, 58d39ec)` too, and the check would go red
        on 60-odd correctly-closed records.
        """
        for value in (
            "MERGED (PR #6, 58d39ec)",
            "**MERGED** (PR #86, `33efd4f`) —— 經 `gh pr view` 驗證",
            "#47 —— **MERGED** 2026-08-13（rebase，main head `74d8d56`）",
            "併入 PR #79",
            "#27 · #28（表單欄位還原）",
        ):
            with self.subTest(value=value):
                line = f"**PR**: {value}"
                m = csm.PR_FIELD_RE.match(line)
                self.assertIsNotNone(m)
                self.assertIsNone(
                    csm.UNRESOLVED_VALUE_RE.search(m.group(1)),
                    f"{value!r} was misread as unresolved",
                )

    def test_bare_TBD_is_deliberately_not_a_marker(self) -> None:
        """Widening to bare `TBD` would catch one more true positive and a dozen
        prose mentions ("10 處 PR-pending / TBD 已翻"). Asserted so the choice is
        a decision on record, not an oversight."""
        self.assertFalse(any(p.search("TBD 已翻") for p in csm.PENDING_PATTERNS))

    # --- the landed gate: E5 must not fire on the closeout it is part of ---

    def test_unmerged_close_is_in_flight_BOTH_directions(self) -> None:
        """⛔ plan R4 ARRIVING ON SCHEDULE — measured, not theorised.

        Closeout flips `status:` to closed BEFORE the PR exists (phase-closeout
        §4.5 precedes §7). Simulating this phase's own closeout made E5 fire on
        CH-043 and on plan.md — i.e. it would have gone red on its own PR's CI,
        and a check that reddens every closeout is one that gets switched off.

        Both directions in one test on purpose: `require_landed=True` must stay
        silent AND `False` must still catch it. Asserting only the first would
        pass with a stale_pending() that had stopped working altogether.
        """
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "docs/01-planning/W50-x/retrospective.md": "**PR**: PR-pending\n",  # path-check: ignore — synthetic
                },
            )
            # no origin/main counterpart exists -> the close has not landed
            self.assertEqual(csm.stale_pending(root, require_landed=True), [])
            self.assertEqual(
                [v.artifact for v in csm.stale_pending(root, require_landed=False)],
                ["docs/01-planning/W50-x/retrospective.md:1"],  # path-check: ignore — synthetic
            )

    def test_landed_gate_agrees_with_origin_main(self) -> None:
        """A phase closed several PRs ago IS on origin/main, so E5 adjudicates it.

        W22 is used because it is the most recent landed closeout; if this ever
        fails, check that the branch has an `origin/main` ref before suspecting
        the gate (CI needs fetch-depth: 0, as check_sha_anchors already requires).
        """
        self.assertTrue(
            csm._closed_on_origin_main(
                _REPO_ROOT, "docs/01-planning/W22-risks-vertical-slice/plan.md"
            )
        )

    def test_landed_gate_stays_quiet_when_it_cannot_tell(self) -> None:
        """No such path on origin/main -> False -> in-flight -> silent.

        Guessing in the dark is worse than waiting: the post-merge run sees it.
        """
        self.assertFalse(
            csm._closed_on_origin_main(_REPO_ROOT, "docs/01-planning/W00-nope/plan.md")  # path-check: ignore — synthetic
        )

    # --- E5 must not disturb what was already there ------------------------

    def test_E4_missing_sibling_frontmatter_exemption_survives(self) -> None:
        """check_status_markers.py:42 — 'Missing sibling frontmatter is fine by
        design'. E5 shares the module; a regression here would surface as a wave
        of E4 noise on every artifact."""
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "docs/01-planning/W50-x/progress.md": "# no frontmatter here\n",  # path-check: ignore — synthetic
                },
            )
            self.assertEqual([v for v in csm.find_violations(root, require_landed=False) if v.check == "E4"], [])

    def test_find_violations_includes_E5(self) -> None:
        """E5 must reach the aggregate, not just its own function — a check that
        runs but is never collected is the Potemkin version of a gate."""
        with tempfile.TemporaryDirectory() as tmp:
            root = _tree(
                Path(tmp),
                {
                    "docs/01-planning/W50-x/plan.md": CLOSED_PLAN,  # path-check: ignore — synthetic
                    "docs/01-planning/W50-x/retrospective.md": "**PR**: #TBD\n",  # path-check: ignore — synthetic
                },
            )
            self.assertEqual([v.check for v in csm.find_violations(root, require_landed=False)], ["E5"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
