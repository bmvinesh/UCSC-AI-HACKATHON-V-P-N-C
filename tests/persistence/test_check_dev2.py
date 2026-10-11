"""Tests for the Dev 2 change gate (plan N0)."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_dev2 as gate  # noqa: E402

PLAN = gate.PLAN_PATH


class ClassifyTests(unittest.TestCase):
    def test_owned_paths(self):
        for path in ("app/routes/cases.py", "app/persistence/db.py", "app/session.py", "app/main.py",
                     "app/settings.py", "app/services/scenarios.py", "tests/api/test_x.py",
                     "tests/persistence/test_db.py", PLAN):
            self.assertEqual(gate.classify(path), gate.OWNED, path)

    def test_other_owners_and_unlisted_paths_are_forbidden(self):
        for path in ("contracts/domain.schema.json", "app/generated/models.py", "app/jobs/ports.py",
                     "app/services/explanations.py", "app/__init__.py", "app/other.py", "web/src/x.ts",
                     "docs/CONTRACTS.md", "pyproject.toml", "tests/contracts/check_boundary.py",
                     "app/persistence_evil/x.py"):
            self.assertEqual(gate.classify(path), gate.FORBIDDEN, path)

    def test_denied_types_win_even_inside_owned_dirs(self):
        for path in ("app/persistence/dev.sqlite3", "app/persistence/.env", "app/persistence/model.onnx"):
            self.assertEqual(gate.classify(path), gate.DENIED_TYPE, path)
        self.assertEqual(gate.classify("app/persistence/.env.example"), gate.OWNED)

    def test_case_and_separator_insensitive(self):
        self.assertEqual(gate.classify("App\\Routes\\x.py"), gate.OWNED)


class ReportTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)

    def report(self, paths, recorded="aaaaaaaaaaaa", local="aaaaaaaaaaaa", upstream=None):
        return gate.build_report(self.root, paths, recorded, local, upstream)

    def test_clean_change_with_plan_passes(self):
        r = self.report(["app/persistence/db.py", PLAN])
        self.assertEqual((r.problems, r.warnings), ([], []))

    def test_owned_code_without_plan_update_fails(self):
        self.assertTrue(any("not updated" in p for p in self.report(["app/persistence/db.py"]).problems))

    def test_plan_only_change_is_fine(self):
        self.assertEqual(self.report([PLAN]).problems, [])

    def test_forbidden_path_fails(self):
        self.assertTrue(any("outside Dev 2" in p for p in self.report(["contracts/domain.schema.json", PLAN]).problems))

    def test_contract_drift_fails_and_missing_fingerprint_fails(self):
        self.assertTrue(any("Contract files changed" in p for p in self.report([], local="bbbbbbbbbbbb").problems))
        self.assertTrue(any("no 'Contract fingerprint" in p for p in self.report([], recorded=None).problems))

    def test_upstream_difference_warns_only(self):
        r = self.report([], upstream="cccccccccccc")
        self.assertEqual(r.problems, [])
        self.assertEqual(len(r.warnings), 1)

    def test_secret_like_text_and_size_are_flagged(self):
        (self.root / "app").mkdir()
        leak = self.root / "app" / "settings.py"
        leak.write_text('API_TOKEN = "' + "x" * 24 + '"\n')
        self.assertTrue(any("credential-like" in p for p in self.report(["app/settings.py", PLAN]).problems))
        big = self.root / "app" / "session.py"
        big.write_bytes(b"0" * (gate.shared.MAX_FILE_BYTES + 1))
        self.assertTrue(any("limit" in p for p in self.report(["app/session.py", PLAN]).problems))


if __name__ == "__main__":
    unittest.main()
