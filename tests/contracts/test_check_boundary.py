"""Tests for the Dev 4 boundary and plan guard.

Run: py -3 -m unittest discover -s tests/contracts -p test_check_boundary.py
Credential-shaped samples are assembled at runtime so no token literal exists in source.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_boundary as guard  # noqa: E402

GUARD_SCRIPT = Path(guard.__file__).resolve()


def temp_root(test: unittest.TestCase) -> Path:
    holder = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
    test.addCleanup(holder.cleanup)
    return Path(holder.name)


class ClassifyTests(unittest.TestCase):
    CASES = {
        "docs/integration/PLAN.md": guard.OWNED,
        "docs/DEMO_RUNBOOK.md": guard.OWNED,
        "README.md": guard.OWNED,
        "readme.md": guard.OWNED,
        ".env.example": guard.OWNED,
        "Makefile": guard.OWNED,
        ".github/workflows/ci.yml": guard.OWNED,
        "tests/e2e/pages_smoke.spec.ts": guard.OWNED,
        "tests/contracts/test_fixtures.py": guard.OWNED,
        "scripts/seed_demo.py": guard.OWNED,
        "scripts/smoke.sh": guard.OWNED,
        "artifacts/public/release-index.json": guard.OWNED,
        "artifacts/public/cases/synthetic-v1.json": guard.OWNED,
        "tests/contracts/test_contract_schemas.py": guard.OWNED,
        "contracts/domain.schema.json": guard.JOINT,
        "contracts/release-index.schema.json": guard.JOINT,
        "docs/proposals/2026-10-10-boundary-redesign.md": guard.JOINT,
        "docs/roles/02-nisheeth-backend.md": guard.JOINT,
        "docs/CONTRACTS.md": guard.JOINT,
        "CLAUDE.md": guard.JOINT,
        "app/generated/models.py": guard.GENERATED,
        "web/src/generated/domain.ts": guard.GENERATED,
        "tests/contracts/check_boundary.py": guard.GUARD,
        ".claude/settings.local.json": guard.GUARD,
        ".env": guard.DENIED_TYPE,
        ".env.local": guard.DENIED_TYPE,
        "docs/model.onnx": guard.DENIED_TYPE,
        "tests/e2e/fixture.sqlite3": guard.DENIED_TYPE,
        "web/src/App.tsx": guard.FORBIDDEN,
        "web/vite.config.ts": guard.FORBIDDEN,
        "app/routes/cases.py": guard.FORBIDDEN,
        "app/settings.py": guard.FORBIDDEN,
        "modeling/train/fit.py": guard.FORBIDDEN,
        "artifacts/public/model-manifest.json": guard.FORBIDDEN,
        "artifacts/public/cases/ispy2-v1.json": guard.FORBIDDEN,
        "artifacts/public/cases/synthetic-v1/cases.json": guard.FORBIDDEN,
        "artifacts/public/cases/synthetic-v1.md": guard.FORBIDDEN,
        "artifacts/public/empirical/v1/manifest.json": guard.FORBIDDEN,
        "artifacts/public/templates/explanations-v1.json": guard.FORBIDDEN,
        "artifacts/public/empirical/v1/model.onnx": guard.DENIED_TYPE,
        "scripts/gx10/bench.sh": guard.FORBIDDEN,
        "scripts/seed_demo_extra.py": guard.FORBIDDEN,
        "tests/api/test_routes.py": guard.FORBIDDEN,
        ".claude/settings.json": guard.FORBIDDEN,
        "docs-evil/notes.md": guard.FORBIDDEN,
        "contractsx/schema.json": guard.FORBIDDEN,
    }

    def test_tiers(self):
        for path, tier in self.CASES.items():
            with self.subTest(path=path):
                self.assertEqual(guard.classify(path), tier)

    def test_backslashes_normalized(self):
        self.assertEqual(guard.classify("web\\src\\App.tsx"), guard.FORBIDDEN)


class RepoRelativeTests(unittest.TestCase):
    def setUp(self):
        self.root = temp_root(self)

    def test_inside_absolute(self):
        self.assertEqual(guard.repo_relative(str(self.root / "docs" / "a.md"), self.root), "docs/a.md")

    def test_relative_uses_cwd(self):
        self.assertEqual(guard.repo_relative("a.md", self.root, str(self.root / "docs")), "docs/a.md")

    def test_traversal_and_outside(self):
        self.assertIsNone(guard.repo_relative(str(self.root / ".." / "x.md"), self.root))
        self.assertIsNone(guard.repo_relative(str(self.root), self.root))

    def test_sibling_prefix_is_outside(self):
        self.assertIsNone(guard.repo_relative(str(self.root) + "-evil/a.md", self.root))

    @unittest.skipUnless(os.name == "nt", "case-insensitive paths")
    def test_drive_case_insensitive(self):
        swapped = str(self.root / "docs" / "a.md").swapcase()
        self.assertEqual(guard.classify(guard.repo_relative(swapped, self.root)), guard.OWNED)


def sample_secrets() -> dict[str, str]:
    return {
        "GitHub token": "gh" + "p_" + "a1" * 18,
        "secret API key": "sk" + "-" + "x" * 24,
        "private key block": "-----BEGIN " + "RSA PRIVATE KEY-----",
        "AWS access key": "AK" + "IA" + "Q" * 16,
        "env secret assignment": "APP_QWEN_API_" + "KEY=" + "z" * 12,
        "quoted secret literal": "token = " + '"' + "q" * 16 + '"',
    }


class SecretTests(unittest.TestCase):
    def test_detects_samples(self):
        for name, text in sample_secrets().items():
            with self.subTest(name=name):
                self.assertIn(name, guard.find_secrets(f"prefix\n{text}\nsuffix"))

    def test_allows_ordinary_text(self):
        benign = (
            "APP_QWEN_API_KEY=\nAPP_QWEN_MAX_OUTPUT_TOKENS=512\n"
            "api_key = settings.qwen_api_key\nrun task-abcdefghijklmnopqrstuvwxyz\n"
            "permissions:\n  id-token: write\n"
        )
        self.assertEqual(guard.find_secrets(benign), [])

    def test_repository_rule_files_are_clean(self):
        for name in ("check_boundary.py", "test_check_boundary.py"):
            text = (GUARD_SCRIPT.parent / name).read_text(encoding="utf-8")
            self.assertEqual(guard.find_secrets(text), [], name)


class PreToolDecisionTests(unittest.TestCase):
    root = Path(tempfile.gettempdir()) / "oncogrowth-guard-root"

    def decide(self, rel_path: str | None, **tool_input):
        if rel_path is not None:
            tool_input.setdefault("file_path", str(self.root / rel_path))
        return guard.pre_tool_decision({"tool_name": "Write", "tool_input": tool_input}, self.root)

    def test_owned_allowed(self):
        self.assertIsNone(self.decide("docs/integration/PLAN.md", content="plan"))

    def test_forbidden_denied(self):
        self.assertEqual(self.decide("web/src/App.tsx").permission, "deny")

    def test_generated_denied(self):
        self.assertEqual(self.decide("app/generated/models.py").permission, "deny")

    def test_joint_and_guard_ask(self):
        self.assertEqual(self.decide("contracts/examples.json").permission, "ask")
        self.assertEqual(self.decide(".claude/settings.local.json").permission, "ask")

    def test_secret_content_denied_even_when_owned(self):
        secret = sample_secrets()["GitHub token"]
        self.assertEqual(self.decide("docs/notes.md", content=secret).permission, "deny")
        self.assertEqual(self.decide("docs/notes.md", new_string=secret).permission, "deny")
        self.assertEqual(self.decide("docs/notes.md", edits=[{"new_string": secret}]).permission, "deny")

    def test_notebook_path_checked(self):
        self.assertEqual(self.decide(None, notebook_path=str(self.root / "modeling" / "eda.ipynb")).permission, "deny")

    def test_outside_repo_and_missing_path_ignored(self):
        self.assertIsNone(self.decide(None, file_path=str(self.root.parent / "elsewhere" / "x.md")))
        self.assertIsNone(self.decide(None))


def run_git(root: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, check=True, text=True).stdout


class GitIntegrationTests(unittest.TestCase):
    """Uses a throwaway repository so fingerprints, change lists and audits are exercised for real."""

    def setUp(self):
        self.root = temp_root(self)
        run_git(self.root, "init", "-q")
        run_git(self.root, "config", "user.email", "guard-test@example.invalid")
        run_git(self.root, "config", "user.name", "guard test")
        self.write("contracts/domain.schema.json", "{}\n")
        self.write("docs/roles/README.md", "registry\n")
        self.write("README.md", "readme\n")
        self.write(guard.PLAN_PATH, "placeholder\n")
        run_git(self.root, "add", "-A")
        run_git(self.root, "commit", "-q", "-m", "seed")
        self.record_fingerprint()

    def write(self, rel_path: str, text: str):
        path = self.root / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def record_fingerprint(self):
        fingerprint = guard.worktree_fingerprint(self.root)
        self.write(guard.PLAN_PATH, f"Contract fingerprint: `{fingerprint}`\n**Next up:** C1\n")
        run_git(self.root, "add", "-A")
        run_git(self.root, "commit", "-q", "-m", "record fingerprint")

    def report(self):
        return guard.collect_report(self.root, guard.working_tree_changes(self.root))

    def test_clean_tree_matches_head_and_passes(self):
        self.assertEqual(guard.worktree_fingerprint(self.root), guard.ref_fingerprint(self.root, "HEAD"))
        self.assertEqual(self.report().problems, [])

    def test_unavailable_ref(self):
        self.assertIsNone(guard.ref_fingerprint(self.root, "origin/does-not-exist"))

    def test_non_normative_change_keeps_fingerprint(self):
        before = guard.worktree_fingerprint(self.root)
        self.write("README.md", "changed\n")
        self.assertEqual(guard.worktree_fingerprint(self.root), before)

    def test_normative_change_is_drift(self):
        self.write("contracts/domain.schema.json", '{"changed": true}\n')
        self.write(guard.PLAN_PATH, (self.root / guard.PLAN_PATH).read_text() + "log\n")
        problems = self.report().problems
        self.assertTrue(any("Normative contract files changed" in p for p in problems), problems)

    def test_untracked_normative_file_is_drift(self):
        self.write("docs/roles/05-new.md", "new role\n")
        self.assertNotEqual(guard.worktree_fingerprint(self.root), guard.recorded_fingerprint(self.root))

    def test_owned_change_requires_plan_update(self):
        self.write("README.md", "changed\n")
        self.assertTrue(any("was not updated" in p for p in self.report().problems))
        self.write(guard.PLAN_PATH, (self.root / guard.PLAN_PATH).read_text() + "log\n")
        self.assertEqual(self.report().problems, [])

    def test_forbidden_change_and_rename_reported(self):
        self.write("web/src/App.tsx", "ui\n")
        run_git(self.root, "mv", "README.md", "README-old.md")
        changes = guard.working_tree_changes(self.root)
        self.assertIn("README.md", changes)
        self.assertIn("web/src/App.tsx", changes)
        self.assertTrue(any("outside Chaandan's writable boundary" in p for p in self.report().problems))

    def test_secret_in_changed_file_reported(self):
        self.write("docs/notes.md", sample_secrets()["secret API key"] + "\n")
        self.write(guard.PLAN_PATH, (self.root / guard.PLAN_PATH).read_text() + "log\n")
        self.assertTrue(any("credential-like" in p for p in self.report().problems))

    def test_missing_fingerprint_line(self):
        self.write(guard.PLAN_PATH, "no fingerprint here\n")
        problems, _ = guard.drift_findings(self.root)
        self.assertTrue(problems)


class HookEntryPointTests(unittest.TestCase):
    """Runs the script the way Claude Code hooks do: JSON on stdin, decision on stdout."""

    def run_hook(self, command: str, payload: dict) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(GUARD_SCRIPT), command],
            input=json.dumps(payload), capture_output=True, text=True, encoding="utf-8",
        )

    def test_pre_tool_denies_other_owner_path(self):
        target = str(guard.REPO_ROOT / "web" / "src" / "App.tsx")
        result = self.run_hook("hook-pre-tool", {"tool_name": "Edit", "tool_input": {"file_path": target}})
        self.assertEqual(result.returncode, 0, result.stderr)
        output = json.loads(result.stdout)["hookSpecificOutput"]
        self.assertEqual(output["permissionDecision"], "deny")

    def test_pre_tool_allows_plan(self):
        target = str(guard.REPO_ROOT / guard.PLAN_PATH)
        result = self.run_hook("hook-pre-tool", {"tool_name": "Edit", "tool_input": {"file_path": target}})
        self.assertEqual((result.returncode, result.stdout.strip()), (0, ""))

    def test_stop_hook_never_loops(self):
        result = self.run_hook("hook-stop", {"stop_hook_active": True})
        self.assertEqual((result.returncode, result.stdout.strip()), (0, ""))

    def test_prompt_hook_reminds(self):
        result = self.run_hook("hook-prompt", {})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(guard.PLAN_PATH, result.stdout)


if __name__ == "__main__":
    unittest.main()
