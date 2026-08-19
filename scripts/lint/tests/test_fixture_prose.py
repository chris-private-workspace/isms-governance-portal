"""
File: scripts/lint/tests/test_fixture_prose.py
Purpose: Tests for check_fixture_prose.py — the parser traps, and both rules in
    both directions past what the built-in self-test can afford.
Category: Tooling / lint / test
Scope: Phase W24

Description:
    unittest, not pytest: this project has no Python dependency management and
    `pip install` fails behind the corporate proxy (CH-007 measured the wheel
    arriving as 0 bytes). The detector is loaded via importlib by path, which is
    why its Violation is a NamedTuple (lint-detector-authoring.md:120).

    Division of labour with the detector's own self_test(): self_test runs
    unconditionally on EVERY run_all invocation and covers nine cases cheap
    enough to pay for every time. This file covers the tag-association parser,
    the type-position allowances one by one, and the ways rule 2 could go wrong
    on real-looking input.

    ⚠️ WHY THE TYPE-POSITION CASES MATTER MOST. The guard's job is to fire when a
    record-claim fixture reaches a live screen. The opposite failure — firing on
    W22's correct neutralisation of /risks/[id], where the builders are named in
    ReturnType<typeof …> and never called — would make the guard go red on the
    one page that did it right, and it would be switched off within a phase.
    Every allowance below is therefore also a hole, so each is tested from both
    sides: the type form stays silent, the value form fires.

Usage:
    python scripts/lint/tests/test_fixture_prose.py

Created: 2026-08-19 (Phase W24)
Last Modified: 2026-08-19

Modification History (newest-first):
    - 2026-08-19: Initial creation (Phase W24) — CH-044
"""

import importlib.util
import unittest
from pathlib import Path

_LINT_DIR = Path(__file__).resolve().parents[1]
_SPEC = importlib.util.spec_from_file_location(
    "check_fixture_prose", _LINT_DIR / "check_fixture_prose.py"
)
assert _SPEC and _SPEC.loader
mod = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(mod)


class TagAssociation(unittest.TestCase):
    """@record-claim attaches to the NEXT export, and only that one."""

    def test_tags_the_next_export_only(self):
        src = (
            "/** @record-claim — one record's signatures. */\n"
            "export const riskSignOff = [];\n"
            "export const RISK_CATEGORY_META = {};\n"
        )
        self.assertEqual(mod.record_claim_exports(src), ["riskSignOff"])

    def test_a_blank_line_breaks_the_association(self):
        # Otherwise one stray tag silently covers everything below it, and the
        # set stops being the closed, reviewable thing the design depends on.
        src = "/** @record-claim */\n\nexport const NOT_TAGGED = 1;\n"
        self.assertEqual(mod.record_claim_exports(src), [])

    def test_a_statement_between_tag_and_export_breaks_it(self):
        src = "// @record-claim\nconst helper = 1;\nexport const NOT_TAGGED = 2;\n"
        self.assertEqual(mod.record_claim_exports(src), [])

    def test_multi_line_comment_block_keeps_the_tag_alive(self):
        src = (
            "/**\n"
            " * @record-claim — named people signing one control.\n"
            " * More prose that should not break the association.\n"
            " */\n"
            "export function controlSignOff() {}\n"
        )
        self.assertEqual(mod.record_claim_exports(src), ["controlSignOff"])

    def test_every_export_keyword_is_recognised(self):
        for kw in ("const", "let", "function", "class", "interface", "type"):
            with self.subTest(kw=kw):
                src = f"/** @record-claim */\nexport {kw} Thing = 1;\n"
                self.assertEqual(mod.record_claim_exports(src), ["Thing"])

    def test_untagged_exports_are_not_collected(self):
        src = "export const A = 1;\nexport const B = 2;\n"
        self.assertEqual(mod.record_claim_exports(src), [])


class Rule1TypePositions(unittest.TestCase):
    """Each allowance, from both sides. An allowance is a hole; holes get tested."""

    CLAIMS = {"riskSignOff": "data/extended/riskDetail.ts"}

    def _fires(self, src: str) -> int:
        return len(mod.check_rule1("p.tsx", src, self.CLAIMS))

    def test_return_type_of_typeof_is_silent(self):
        # This is literally risks/[id]/page.tsx:511 after W22's fix.
        src = "import { riskSignOff } from '@/data/x';\nconst s: ReturnType<typeof riskSignOff> = [];\n"
        self.assertEqual(self._fires(src), 0)

    def test_typeof_indexed_access_is_silent(self):
        src = "import { riskSignOff } from '@/data/x';\nlet c: (typeof riskSignOff)[number];\n"
        self.assertEqual(self._fires(src), 0)

    def test_import_type_alone_is_silent(self):
        src = "import type { riskSignOff } from '@/data/x';\n"
        self.assertEqual(self._fires(src), 0)

    def test_a_plain_import_is_silent(self):
        # Importing without rendering is what W22 left behind on purpose.
        src = "import { riskSignOff } from '@/data/x';\n"
        self.assertEqual(self._fires(src), 0)

    def test_a_call_fires(self):
        src = "import { riskSignOff } from '@/data/x';\nconst s = riskSignOff(risk);\n"
        self.assertEqual(self._fires(src), 1)

    def test_a_jsx_reference_fires(self):
        src = "import { riskSignOff } from '@/data/x';\nreturn <List rows={riskSignOff} />;\n"
        self.assertEqual(self._fires(src), 1)

    def test_a_map_over_it_fires(self):
        src = "import { riskSignOff } from '@/data/x';\n{riskSignOff.map((s) => s)}\n"
        self.assertEqual(self._fires(src), 1)

    def test_a_substring_of_another_identifier_does_not_fire(self):
        # \b anchors: riskSignOffLegacy is a different symbol.
        src = "const x = riskSignOffLegacy(risk);\n"
        self.assertEqual(self._fires(src), 0)

    def test_one_violation_per_export_not_per_occurrence(self):
        src = "const a = riskSignOff(r);\nconst b = riskSignOff(r2);\n"
        self.assertEqual(self._fires(src), 1)

    def test_the_message_names_the_export_and_its_origin(self):
        # A guard that says "something is wrong" costs a bisect to act on.
        v = mod.check_rule1("p.tsx", "const a = riskSignOff(r);", self.CLAIMS)
        self.assertIn("riskSignOff", v[0].detail)
        self.assertIn("data/extended/riskDetail.ts", v[0].detail)
        self.assertEqual(v[0].rule, "rule1")


class Rule1SurfaceSelection(unittest.TestCase):
    """Which files count as reading the API."""

    MARKERS = ["from '@/lib/api/", "fetch("]

    def test_api_import_counts(self):
        self.assertTrue(mod.reads_api("import { x } from '@/lib/api/policies';", self.MARKERS))

    def test_direct_fetch_counts(self):
        # AppShell.tsx:247 is exactly this, and it renders on 25 screens.
        self.assertTrue(mod.reads_api("await fetch('/api/demo-session');", self.MARKERS))

    def test_a_fixture_only_screen_does_not_count(self):
        self.assertFalse(mod.reads_api("import { policies } from '@/data/policies';", self.MARKERS))


class Rule2SelfClaims(unittest.TestCase):
    """Certification claims about the platform itself."""

    CLAIMS = ["SOC 2 Type II", "ISO/IEC 27001 certified"]

    def test_a_claim_in_json_fires(self):
        v = mod.check_rule2("a.json", '{"k": "SOC 2 Type II"}', self.CLAIMS, [])
        self.assertEqual(len(v), 1)
        self.assertEqual(v[0].rule, "rule2")

    def test_the_framework_reference_does_not_fire(self):
        # 15 real occurrences in this repo look like this. A GRC platform citing
        # SOC 2 control clauses is the product working, not a false claim.
        v = mod.check_rule2("a.ts", "{ fw: 'SOC 2', ref: 'CC6.1' }", self.CLAIMS, [])
        self.assertEqual(v, [])

    def test_a_line_comment_about_the_claim_does_not_fire(self):
        # The guard reported exactly this on its first real run, against the two
        # files where the claim had just been removed and the removal explained.
        v = mod.check_rule2("a.tsx", "// we removed the SOC 2 Type II line\n", self.CLAIMS, [])
        self.assertEqual(v, [])

    def test_a_block_comment_about_the_claim_does_not_fire(self):
        v = mod.check_rule2("a.tsx", "/* it said SOC 2 Type II */\nconst x = 1;", self.CLAIMS, [])
        self.assertEqual(v, [])

    def test_json_keeps_its_text_because_json_has_no_comments(self):
        v = mod.check_rule2("a.json", '{"_note": "// SOC 2 Type II"}', self.CLAIMS, [])
        self.assertEqual(len(v), 1)

    def test_a_claim_in_code_still_fires_when_a_comment_sits_above_it(self):
        src = "// unrelated note\nconst label = 'ISO/IEC 27001 certified';\n"
        v = mod.check_rule2("a.ts", src, self.CLAIMS, [])
        self.assertEqual(len(v), 1)

    def test_an_allowlist_entry_exempts_the_file(self):
        v = mod.check_rule2("a.ts", "SOC 2 Type II // ALLOW-CLAIM", self.CLAIMS, ["ALLOW-CLAIM"])
        self.assertEqual(v, [])

    def test_an_empty_allowlist_entry_does_not_exempt_everything(self):
        # `any("" in src)` is True for every string. A blank line in the config
        # would otherwise switch the rule off in silence.
        v = mod.check_rule2("a.json", '{"k": "SOC 2 Type II"}', self.CLAIMS, [""])
        self.assertEqual(len(v), 1)

    def test_each_distinct_claim_reports_separately(self):
        src = '{"a": "SOC 2 Type II", "b": "ISO/IEC 27001 certified"}'
        self.assertEqual(len(mod.check_rule2("a.json", src, self.CLAIMS, [])), 2)


class BuiltInSelfTest(unittest.TestCase):
    def test_the_detectors_own_self_test_passes(self):
        # It runs on every run_all invocation; if it ever fails there, the whole
        # detector is reported broken rather than clean.
        self.assertEqual(mod.self_test(), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
