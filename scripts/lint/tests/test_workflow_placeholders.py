"""
File: scripts/lint/tests/test_workflow_placeholders.py
Purpose: Tests for check_workflow_placeholders.py, including the two mandatory
    false-positive regressions.
Category: Tooling / lint / test
Scope: CH-007

Description:
    Uses unittest from the standard library rather than pytest: this project has
    no Python dependency management, and `pip install` fails behind the corporate
    proxy (verified during CH-007 — the wheel downloads as 0 bytes). A test that
    cannot run is worse than one written against a plainer framework.

    The detector is loaded via importlib by path, which is why its Violation is a
    NamedTuple and not a dataclass (lint-detector-authoring.md:120).

Usage:
    python scripts/lint/tests/test_workflow_placeholders.py

Created: 2026-08-07 (CH-007)
Last Modified: 2026-08-07

Modification History (newest-first):
    - 2026-08-07: Initial creation (CH-007)
"""

import importlib.util
import tempfile
import unittest
from pathlib import Path

_DETECTOR = Path(__file__).resolve().parents[1] / "check_workflow_placeholders.py"
_spec = importlib.util.spec_from_file_location("cwp", _DETECTOR)
cwp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cwp)


class _Repo:
    """Throwaway repo tree with a .github/workflows/ directory."""

    def __init__(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        (self.root / ".github" / "workflows").mkdir(parents=True)

    def write(self, name: str, body: str) -> None:
        (self.root / ".github" / "workflows" / name).write_text(body, encoding="utf-8")

    def __enter__(self) -> "_Repo":
        return self

    def __exit__(self, *exc) -> None:
        self._tmp.cleanup()


class TestWorkflowPlaceholders(unittest.TestCase):
    def setUp(self) -> None:
        self._saved = dict(cwp.ALLOWED)

    def tearDown(self) -> None:
        cwp.ALLOWED.clear()
        cwp.ALLOWED.update(self._saved)

    # ── mandatory false-positive regressions ────────────────────────────────

    def test_allowed_placeholder_does_not_fire(self):
        """A baselined placeholder at its expected count is not a violation."""
        with _Repo() as r:
            r.write("w.yml", "jobs:\n  a:\n    run: CMD='<設定我>'\n")
            cwp.ALLOWED.clear()
            cwp.ALLOWED["w.yml::<設定我>"] = (1, "reason + unblock")
            self.assertEqual(cwp.find_violations(r.root), [])

    def test_pragma_suppresses(self):
        """The escape hatch works — needed for shell redirection false positives."""
        with _Repo() as r:
            r.write(
                "w.yml",
                f"jobs:\n  a:\n    run: cat < in.txt > out.txt  # {cwp.PRAGMA}\n",
            )
            cwp.ALLOWED.clear()
            self.assertEqual(cwp.find_violations(r.root), [])

    def test_ignores_files_outside_workflows(self):
        with _Repo() as r:
            (r.root / "README.md").write_text("see <你的設定>", encoding="utf-8")
            cwp.ALLOWED.clear()
            self.assertEqual(cwp.find_violations(r.root), [])

    # ── true positives ──────────────────────────────────────────────────────

    def test_new_placeholder_fires(self):
        with _Repo() as r:
            r.write("w.yml", "jobs:\n  a:\n    run: <格式檢查指令>\n")
            cwp.ALLOWED.clear()
            v = cwp.find_violations(r.root)
            self.assertEqual(len(v), 1)
            self.assertIn("new unfilled placeholder", v[0].detail)
            self.assertEqual(v[0].line, 3)

    def test_count_increase_fires(self):
        """The ratchet must not turn up."""
        with _Repo() as r:
            r.write("w.yml", "a: <設定我>\nb: <設定我>\n")
            cwp.ALLOWED.clear()
            cwp.ALLOWED["w.yml::<設定我>"] = (1, "reason")
            v = cwp.find_violations(r.root)
            self.assertEqual(len(v), 1)
            self.assertIn("only turns down", v[0].detail)

    def test_filled_placeholder_forces_baseline_update(self):
        """The teeth: filling one makes the same change shrink the baseline."""
        with _Repo() as r:
            r.write("w.yml", "jobs:\n  a:\n    run: npm run lint\n")
            cwp.ALLOWED.clear()
            cwp.ALLOWED["w.yml::<設定我>"] = (1, "reason")
            v = cwp.find_violations(r.root)
            self.assertEqual(len(v), 1)
            self.assertIn("was filled in", v[0].detail)

    def test_count_decrease_still_fires(self):
        """2 -> 1 is progress, but the baseline must be lowered to match."""
        with _Repo() as r:
            r.write("w.yml", "a: <設定我>\n")
            cwp.ALLOWED.clear()
            cwp.ALLOWED["w.yml::<設定我>"] = (2, "reason")
            v = cwp.find_violations(r.root)
            self.assertEqual(len(v), 1)
            self.assertIn("expects 2 but 1 found", v[0].detail)

    # ── the real repo ───────────────────────────────────────────────────────

    def test_real_repo_is_clean(self):
        """The shipped baseline must match the shipped workflows."""
        repo_root = Path(__file__).resolve().parents[3]
        self.assertEqual(cwp.find_violations(repo_root), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
