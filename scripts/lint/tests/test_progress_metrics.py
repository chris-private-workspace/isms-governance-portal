"""
File: scripts/lint/tests/test_progress_metrics.py
Purpose: Unit tests for the progress-metrics detector — rulers, anchors, and both failure directions.
Category: Tooling / lint tests
Scope: CH-046

Description:
    check_progress_metrics.py makes two kinds of claim: that the rulers it
    derives match what PROGRESS-METRICS.md declares, and that each milestone's
    anchor still holds. Both claims are only worth anything if the detector can
    be shown to FAIL when they are false, so every positive test here has a
    negative twin.

    The detector is loaded via importlib by path, matching test_fixture_prose.py
    — scripts/lint is not a package.

Created: 2026-08-20 (CH-046)
Last Modified: 2026-08-20

Modification History (newest-first):
    - 2026-08-20: Initial creation (CH-046)

Related:
    - scripts/lint/check_progress_metrics.py
    - docs/rules-on-demand/lint-detector-authoring.md
"""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

_LINT_DIR = Path(__file__).resolve().parents[1]
_SPEC = importlib.util.spec_from_file_location(
    "check_progress_metrics", _LINT_DIR / "check_progress_metrics.py"
)
assert _SPEC and _SPEC.loader
mod = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(mod)


def facts(**over):
    base = dict(
        data_model_built=34,
        data_model_indexed=36,
        audited_models=16,
        pages={
            "(app)/risks": "domain",
            "(app)/risks/[id]": "domain",
            "(app)/policies": "domain",
            "(app)/policies/[id]": "static",
            "login": "other-http",
            "/": "other-http",
        },
        scope_ts={
            "core-model": 20,
            "entity-scope": 4,
            "identity": 0,
            "workflow": 0,
            "audit-trail": 5,
            "contracts": 1,
            "modules": 26,
            "ui": 95,
        },
        loc_api_prod=7765,
        loc_api_test=14663,
        loc_generated=96617,
        rls_enable=27,
        rls_force=27,
    )
    base.update(over)
    return mod.Facts(**base)


DECLARED = """<!-- progress-metrics:declared -->
| `data-model` | 34 / 36 |
| `audit-coverage` | 16 / 34 |
| `pages-domain` | 3 |
| `pages-other-http` | 2 |
| `pages-static` | 1 |
| `scopes-with-code` | 6 / 8 |
| `rls-enable-force` | 27 / 27 |
| `loc-api-prod` | 7765 |
| `loc-api-test` | 14663 |
| `loc-generated` | 96617 |
<!-- /progress-metrics:declared -->
"""

MILESTONES = """<!-- progress-metrics:milestones -->
| M1 | done | `data_model_built() == 34` |
| M4 | not started | `scope_ts_count('identity') == 0` |
| M6 | partial | `page_class('(app)/policies/[id]') == 'static'` |
| M0 | partial | `manual` |
<!-- /progress-metrics:milestones -->
"""

DOC = DECLARED + MILESTONES


class DerivedMatchesDeclared(unittest.TestCase):
    def test_matching_document_is_clean(self):
        # The legitimate state must not be blocked. A guard that fires on the
        # correct state gets switched off within a phase (W24's lesson).
        self.assertEqual(mod.check(DOC, facts()), [])

    def test_a_drifted_ruler_fails_and_names_which(self):
        bad = DOC.replace("| `data-model` | 34 / 36 |", "| `data-model` | 35 / 36 |")
        problems = mod.check(bad, facts())
        self.assertTrue(problems)
        self.assertTrue(
            any("`data-model`" in p for p in problems),
            f"failure must name the ruler, got {problems}",
        )

    def test_a_missing_ruler_is_a_failure_not_a_skip(self):
        bad = DOC.replace("| `loc-generated` | 96617 |\n", "")
        problems = mod.check(bad, facts())
        self.assertTrue(any("loc-generated" in p and "not declared" in p for p in problems))

    def test_an_unknown_declared_ruler_is_a_failure(self):
        # Otherwise a ruler could be renamed in the detector and the stale row
        # would sit in the document forever, silently unchecked.
        bad = DOC.replace(
            "<!-- /progress-metrics:declared -->",
            "| `made-up-ruler` | 1 |\n<!-- /progress-metrics:declared -->",
        )
        problems = mod.check(bad, facts())
        self.assertTrue(any("made-up-ruler" in p for p in problems))

    def test_audit_coverage_denominator_is_built_entities(self):
        problems = mod.check(DOC, facts(audited_models=17))
        self.assertTrue(any("audit-coverage" in p for p in problems))


class MilestoneAnchors(unittest.TestCase):
    def test_manual_is_neither_pass_nor_fail(self):
        ok, reason = mod.evaluate_anchor("manual", facts())
        self.assertIsNone(ok)
        self.assertIn("manual", reason)

    def test_broken_anchor_names_the_milestone_and_the_verdict(self):
        problems = mod.check(DOC, facts(data_model_built=35))
        hit = [p for p in problems if p.startswith("M1 anchor broke")]
        self.assertTrue(hit, f"expected an M1 anchor failure, got {problems}")
        self.assertIn("re-judge M1", hit[0])

    def test_scope_anchor_breaks_when_the_first_file_lands(self):
        # This is the anchor's whole purpose: adding identity/ code must force a
        # human back to the M4 row rather than leaving 🔴 未開始 standing.
        f = facts(scope_ts={**facts().scope_ts, "identity": 1})
        problems = mod.check(DOC, f)
        self.assertTrue(any(p.startswith("M4 anchor broke") for p in problems))

    def test_page_anchor_breaks_when_the_detail_page_gets_wired(self):
        f = facts(pages={**facts().pages, "(app)/policies/[id]": "domain"})
        problems = mod.check(DOC, f)
        self.assertTrue(any(p.startswith("M6 anchor broke") for p in problems))

    def test_unknown_scope_in_an_anchor_fails_loudly(self):
        ok, reason = mod.evaluate_anchor("scope_ts_count('nope') == 0", facts())
        self.assertFalse(ok)
        self.assertIn("unknown scope", reason)

    def test_unknown_route_in_an_anchor_fails_loudly(self):
        ok, reason = mod.evaluate_anchor("page_class('nope') == 'static'", facts())
        self.assertFalse(ok)
        self.assertIn("no page at route", reason)

    def test_unparseable_anchor_is_a_failure_not_a_skip(self):
        ok, reason = mod.evaluate_anchor("os.system('rm -rf /')", facts())
        self.assertFalse(ok)
        self.assertIn("unparseable", reason)

    def test_zero_milestone_rows_is_a_failure(self):
        empty = DECLARED + (
            "<!-- progress-metrics:milestones -->\n<!-- /progress-metrics:milestones -->\n"
        )
        problems = mod.check(empty, facts())
        self.assertTrue(any("zero rows" in p for p in problems))


class BlockMarkers(unittest.TestCase):
    def test_missing_declared_block_raises(self):
        with self.assertRaises(RuntimeError):
            mod.parse_declared(MILESTONES)

    def test_missing_milestone_block_raises(self):
        with self.assertRaises(RuntimeError):
            mod.parse_milestones(DECLARED)


class Output(unittest.TestCase):
    def test_render_carries_the_scope_disclaimer(self):
        # Removing it turns a ruler set into what looks like a completeness
        # score, which is the one thing these numbers are not.
        out = mod.render(facts(), mod.parse_milestones(DOC))
        self.assertIn("proxy metrics, not completeness", out)
        self.assertIn("Wave 1", out)

    def test_render_never_prints_an_overall_percentage(self):
        # Ruled by the user on 2026-08-20. Per-ruler ratios are fine; a single
        # headline number is not.
        out = mod.render(facts(), mod.parse_milestones(DOC))
        self.assertNotIn("%", out)

    def test_render_splits_wiring_into_three_numbers(self):
        out = mod.render(facts(), mod.parse_milestones(DOC))
        self.assertIn("domain", out)
        self.assertIn("other-http", out)
        self.assertIn("static", out)

    def test_render_counts_manual_anchors_separately(self):
        out = mod.render(facts(), mod.parse_milestones(DOC))
        self.assertIn("3 verified / 1 manual", out)


class PageClassification(unittest.TestCase):
    def _tree(self, files: dict[str, str]) -> Path:
        tmp = Path(tempfile.mkdtemp())
        for rel, body in files.items():
            p = tmp / mod.WEB_APP_REL / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(body, encoding="utf-8")
        return tmp

    def test_lib_api_import_is_domain(self):
        root = self._tree({"risks/page.tsx": "import { listRisks } from '@/lib/api/risks';\n"})
        self.assertEqual(mod.classify_pages(root), {"risks": "domain"})

    def test_bare_fetch_is_other_http_not_domain(self):
        # /login posts to a Next route handler and / probes /health. Both speak
        # HTTP; neither reaches domain data. Collapsing them is how "2 / 29"
        # became the number in the first place.
        root = self._tree({"login/page.tsx": "await fetch('/api/demo-session');\n"})
        self.assertEqual(mod.classify_pages(root), {"login": "other-http"})

    def test_no_http_at_all_is_static(self):
        root = self._tree({"controls/page.tsx": "export default function P(){return null;}\n"})
        self.assertEqual(mod.classify_pages(root), {"controls": "static"})

    def test_root_page_gets_a_stable_key(self):
        root = self._tree({"page.tsx": "await fetch('/health');\n"})
        self.assertEqual(mod.classify_pages(root), {"/": "other-http"})

    def test_domain_wins_over_bare_fetch_in_the_same_file(self):
        root = self._tree(
            {"risks/page.tsx": "import { listRisks } from '@/lib/api/risks';\nfetch('/x');\n"}
        )
        self.assertEqual(mod.classify_pages(root), {"risks": "domain"})


class AuditedModelsParsing(unittest.TestCase):
    def _module(self, body: str) -> Path:
        tmp = Path(tempfile.mkdtemp())
        p = tmp / mod.AUDIT_MODULE_REL
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body, encoding="utf-8")
        return tmp

    def test_counts_the_quoted_names(self):
        root = self._module(
            "export const AUDITED_MODELS: ReadonlySet<string> = new Set([\n"
            "  'Policy',\n  'Risk',\n  'Control',\n]);\n"
        )
        self.assertEqual(mod.audited_models(root), 3)

    def test_missing_set_raises_rather_than_returning_zero(self):
        # Returning 0 would read as "nothing is audited", which is a far more
        # alarming and far less true statement than "I could not find the set".
        root = self._module("export const SOMETHING_ELSE = 1;\n")
        with self.assertRaises(RuntimeError):
            mod.audited_models(root)


class SelfTest(unittest.TestCase):
    def test_self_test_passes_on_the_real_repo(self):
        mod.self_test(_LINT_DIR.parents[1])


if __name__ == "__main__":
    unittest.main()
