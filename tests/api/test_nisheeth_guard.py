"""Tests for the Dev 2 boundary and plan guard (tests/api/nisheeth_guard.py). Standard library only.

Run: python3 -m unittest discover -s tests/api -p test_nisheeth_guard.py
Credential-shaped strings are assembled at runtime so this file never trips its own scan.
"""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

# Load by file path so this works whether or not tests/api becomes a package.
_SPEC = importlib.util.spec_from_file_location("nisheeth_guard", Path(__file__).with_name("nisheeth_guard.py"))
guard = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = guard  # dataclasses resolve annotations through sys.modules
_SPEC.loader.exec_module(guard)


class ClassifyTest(unittest.TestCase):
    def test_tiers(self):
        cases = {
            "app/routes/scenarios.py": guard.OWNED,
            "app/persistence/migrations/versions/0001_initial.py": guard.OWNED,
            "app/services/scenarios.py": guard.OWNED,
            "app/main.py": guard.OWNED,
            "app/settings.py": guard.OWNED,
            "app/session.py": guard.OWNED,
            "tests/api/test_routes.py": guard.OWNED,
            "tests/persistence/test_job_store.py": guard.OWNED,
            guard.PLAN_PATH: guard.OWNED,
            guard.GUARD_PATH: guard.GUARD,
            guard.GUARD_TEST_PATH: guard.GUARD,
            ".claude/settings.local.json": guard.GUARD,
            "app/__init__.py": guard.NEEDS_ASSIGNMENT,
            "app/services/__init__.py": guard.NEEDS_ASSIGNMENT,
            "app/generated/models.py": guard.GENERATED,
            "web/src/generated/dto.ts": guard.GENERATED,
            "app/jobs/ports.py": guard.FORBIDDEN,
            "app/services/explanations.py": guard.FORBIDDEN,
            "app/telemetry/router.py": guard.FORBIDDEN,
            "contracts/domain.schema.json": guard.FORBIDDEN,
            "docs/roles/02-nisheeth-backend.md": guard.FORBIDDEN,
            "tests/jobs/jobstore_contract.py": guard.FORBIDDEN,
            "web/src/App.tsx": guard.FORBIDDEN,
            "pyproject.toml": guard.FORBIDDEN,
            ".env": guard.DENIED_TYPE,
            ".env.local": guard.DENIED_TYPE,
            "tests/api/fixture.sqlite3": guard.DENIED_TYPE,
            "app/persistence/oncogrowth.db": guard.DENIED_TYPE,
            "tests/api/model.onnx": guard.DENIED_TYPE,
        }
        for path, tier in cases.items():
            with self.subTest(path=path):
                self.assertEqual(guard.classify(path), tier)

    def test_case_and_separator_insensitive(self):
        self.assertEqual(guard.classify("App\\Routes\\health.py"), guard.OWNED)
        self.assertEqual(guard.classify("APP/JOBS/ports.py"), guard.FORBIDDEN)

    def test_env_example_is_not_a_denied_type(self):
        self.assertEqual(guard.classify(".env.example"), guard.FORBIDDEN)  # Chaandan's file, not a secret.


class SecretTest(unittest.TestCase):
    def test_detects_credential_shapes(self):
        samples = {
            "GitHub token": "gh" + "p_" + "A" * 36,
            "secret API key": "s" + "k-" + "b" * 24,
            "env secret assignment": "APP_QWEN_API" + "_KEY=" + "c" * 12,
            "quoted secret literal": "api" + '_key = "' + "d" * 12 + '"',
            "bearer credential": "Authorization: Bear" + "er " + "e" * 24,
        }
        for name, text in samples.items():
            with self.subTest(name=name):
                self.assertIn(name, guard.find_secrets(text))

    def test_ignores_empty_assignment_and_plain_settings(self):
        text = "APP_QWEN_API" + "_KEY=\nAPP_QWEN_MAX_OUTPUT_TOKENS=512\nqwen_api_key: SecretStr | None = None\n"
        self.assertEqual(guard.find_secrets(text), [])

    def test_guard_and_plan_files_are_clean(self):
        for rel in (guard.GUARD_PATH, guard.GUARD_TEST_PATH, guard.PLAN_PATH):
            path = guard.REPO_ROOT / rel
            if path.is_file():
                with self.subTest(rel=rel):
                    self.assertEqual(guard.find_secrets(path.read_text(encoding="utf-8")), [])


class PreToolTest(unittest.TestCase):
    root = Path("/repo")

    def decide(self, file_path, content="x = 1\n", cwd="/repo"):
        payload = {"cwd": cwd, "tool_input": {"file_path": file_path, "content": content}}
        return guard.pre_tool_decision(payload, self.root)

    def test_allows_owned(self):
        self.assertIsNone(self.decide("/repo/app/persistence/job_store.py"))
        self.assertIsNone(self.decide("app/routes/health.py"))

    def test_denies_other_owner_generated_and_denied_types(self):
        for path in ("/repo/app/jobs/ports.py", "/repo/app/generated/models.py", "/repo/.env", "../repo/web/x.ts"):
            with self.subTest(path=path):
                self.assertEqual(self.decide(path).permission, "deny")

    def test_relative_path_resolves_against_cwd(self):
        self.assertEqual(self.decide("../jobs/ports.py", cwd="/repo/app/routes").permission, "deny")
        self.assertIsNone(self.decide("health.py", cwd="/repo/app/routes"))

    def test_denies_credential_in_owned_file(self):
        decision = self.decide("/repo/app/settings.py", content="token = '" + "f" * 16 + "'\n")
        self.assertEqual(decision.permission, "deny")

    def test_checks_multi_edit_strings(self):
        payload = {"cwd": "/repo", "tool_input": {
            "file_path": "/repo/app/settings.py", "edits": [{"new_string": "s" + "k-" + "g" * 24}]}}
        self.assertEqual(guard.pre_tool_decision(payload, self.root).permission, "deny")

    def test_asks_for_guard_and_unassigned_files(self):
        self.assertEqual(self.decide("/repo/tests/api/nisheeth_guard.py").permission, "ask")
        self.assertEqual(self.decide("/repo/app/__init__.py").permission, "ask")

    def test_ignores_paths_outside_repo_and_missing_targets(self):
        self.assertIsNone(self.decide("/tmp/scratch/notes.md"))
        self.assertIsNone(guard.pre_tool_decision({"tool_input": {}}, self.root))


class RepoStateTest(unittest.TestCase):
    """Drift, plan-update and stop-hook behaviour on a throwaway git repository."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.git("init", "-q")
        self.git("config", "user.email", "guard-test@example.invalid")
        self.git("config", "user.name", "guard test")
        self.write("docs/CONTRACTS.md", "contract v1\n")
        self.write(guard.PLAN_PATH, "plan\n")
        self.git("add", "-A")
        self.git("commit", "-qm", "base")
        self.record_fingerprint()

    def tearDown(self):
        self._tmp.cleanup()

    def git(self, *args):
        subprocess.run(["git", "-C", str(self.root), *args], check=True, capture_output=True)

    def write(self, rel, text):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def record_fingerprint(self):
        value = guard.worktree_fingerprint(self.root)
        self.write(guard.PLAN_PATH, f"Contract fingerprint: `{value}`\n**Next up:** N1\n")

    def test_no_drift_after_recording(self):
        problems, _ = guard.drift_findings(self.root)
        self.assertEqual(problems, [])

    def test_contract_change_is_drift_until_recorded(self):
        self.write("docs/CONTRACTS.md", "contract v2\n")
        problems, _ = guard.drift_findings(self.root)
        self.assertEqual(len(problems), 1)
        self.record_fingerprint()
        self.assertEqual(guard.drift_findings(self.root)[0], [])

    def test_port_appearing_is_drift(self):
        self.write("app/jobs/ports.py", "class JobStore: ...\n")
        self.assertEqual(len(guard.drift_findings(self.root)[0]), 1)

    def test_owned_change_requires_plan_update(self):
        self.git("add", "-A")
        self.git("commit", "-qm", "record fingerprint")
        self.write("app/persistence/db.py", "PRAGMAS = ()\n")
        report = guard.collect_report(self.root, guard.working_tree_changes(self.root))
        self.assertTrue(any("was not updated" in p for p in report.problems))
        self.write(guard.PLAN_PATH, (self.root / guard.PLAN_PATH).read_text(encoding="utf-8") + "log\n")
        report = guard.collect_report(self.root, guard.working_tree_changes(self.root))
        self.assertEqual(report.problems, [])

    def test_forbidden_change_is_a_problem(self):
        self.write("app/jobs/supervisor.py", "pass\n")
        report = guard.collect_report(self.root, guard.working_tree_changes(self.root))
        self.assertTrue(any("outside Nisheeth's writable boundary" in p for p in report.problems))

    def test_stop_hook_blocks_once_then_yields(self):
        self.write("app/jobs/supervisor.py", "pass\n")
        output = self.capture(guard.hook_stop, {})
        self.assertEqual(json.loads(output)["decision"], "block")
        self.assertEqual(self.capture(guard.hook_stop, {"stop_hook_active": True}), "")

    def test_prompt_hook_reports_next_up(self):
        self.assertIn("Next up: N1", self.capture(guard.hook_prompt, {}))

    def capture(self, hook, payload):
        import contextlib
        import io

        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            self.assertEqual(hook(payload, self.root), 0)
        return buffer.getvalue().strip()


if __name__ == "__main__":
    unittest.main()
