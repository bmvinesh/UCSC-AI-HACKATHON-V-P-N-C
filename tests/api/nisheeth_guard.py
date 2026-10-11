#!/usr/bin/env python3
"""Dev 2 (Nisheeth) ownership-boundary and plan guard for OncoGrowth.

Boundary source of truth: the Nisheeth entries in docs/roles/README.md,
docs/roles/02-nisheeth-backend.md and docs/CONTRACTS.md "Code/file boundaries".
Operating plan and checklists: tests/api/BACKEND_PLAN.md; its section 2 mirrors
the tiers below, so change both together. Standard library only.

Usage (from anywhere in the repository; on Windows use `py -3`):
  python3 tests/api/nisheeth_guard.py audit [--base origin/main]
  python3 tests/api/nisheeth_guard.py fingerprint
  <hook JSON on stdin> | python3 tests/api/nisheeth_guard.py hook-pre-tool | hook-prompt | hook-stop

Exit codes: 0 ok (hook decisions are JSON on stdout); 1 audit found problems;
2 the guard could not run (for hook-pre-tool this blocks the edit).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PLAN_PATH = "tests/api/BACKEND_PLAN.md"
GUARD_PATH = "tests/api/nisheeth_guard.py"
GUARD_TEST_PATH = "tests/api/test_nisheeth_guard.py"
LOCAL_SETTINGS = ".claude/settings.local.json"
UPSTREAM_REF = "origin/main"
MAX_FILE_BYTES = 1024 * 1024

# Write tiers; BACKEND_PLAN.md section 2.1 documents the same table.
OWNED = "owned"
GUARD = "guard"  # This guard, its tests and hook config; changes need the human.
NEEDS_ASSIGNMENT = "needs-assignment"  # Unlisted package markers the app needs (plan Q10).
GENERATED = "generated"  # Written only by Chaandan's scripts/generate_contracts.*.
DENIED_TYPE = "denied-type"  # Secrets, weights, raw data, databases.
FORBIDDEN = "forbidden"  # Another owner's path or an unassigned path.

OWNED_FILES = frozenset(
    p.casefold() for p in ("app/main.py", "app/settings.py", "app/session.py", "app/services/scenarios.py")
)
OWNED_PREFIXES = ("app/routes/", "app/persistence/", "tests/api/", "tests/persistence/")
GUARD_FILES = frozenset(p.casefold() for p in (GUARD_PATH, GUARD_TEST_PATH, LOCAL_SETTINGS))
NEEDS_ASSIGNMENT_FILES = frozenset(p.casefold() for p in ("app/__init__.py", "app/services/__init__.py"))
GENERATED_PREFIXES = ("app/generated/", "web/src/generated/")

DENIED_NAME_RE = re.compile(
    r"(^|/)\.env(\.(?!example$)[^/]*)?$"
    r"|\.(pem|key|p12|pfx|pt|pth|ckpt|safetensors|gguf|onnx|npz|nii|nii\.gz|dcm|db|sqlite3?(-wal|-shm|-journal)?)$",
    re.IGNORECASE,
)

# Credential-shaped text (same rules as the Dev 4 guard). Patterns never match their own source lines.
SECRET_PATTERNS = (
    ("private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("GitHub token", re.compile(r"\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b")),
    ("secret API key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Hugging Face token", re.compile(r"\bhf_[A-Za-z0-9]{30,}\b")),
    ("Slack token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}")),
    ("bearer credential", re.compile(r"(?i)\bbearer[ \t]+[A-Za-z0-9._~+/-]{20,}=*")),
    # [ \t] rather than \s: an empty assignment must not borrow the next line's value.
    ("env secret assignment", re.compile(
        r"(?m)^[ \t]*(export[ \t]+)?[A-Z0-9_]*(API_KEY|TOKEN|SECRET|PASSWORD)[ \t]*=[ \t]*[^\s#]{8,}"
    )),
    ("quoted secret literal", re.compile(
        r"(?i)\b[a-z0-9_]*(api_key|token|secret|password)[ \t]*[=:][ \t]*['\"][^'\"\s]{8,}['\"]"
    )),
)

# Files whose content defines this role's obligations; the plan records their fingerprint.
# app/jobs/ports.py and the JobStore contract suite are Vinesh's port that app/persistence
# implements: when they appear or change, the plan must be reconciled before more work.
NORMATIVE_PATHS = (
    "CLAUDE.md",
    ".env.example",
    "contracts",
    "docs/CONTRACTS.md",
    "docs/DATA_AND_MODEL.md",
    "docs/DEMO_RUNBOOK.md",
    "docs/GIT_AND_AGENT_WORKFLOW.md",
    "docs/MASTER_IMPLEMENTATION_PLAN.md",
    "docs/proposals",
    "docs/roles",
    "app/jobs/ports.py",
    "tests/jobs/jobstore_contract.py",
)
FINGERPRINT_RE = re.compile(r"Contract fingerprint: `([0-9a-f]{12})`")
NEXT_UP_RE = re.compile(r"^\*\*Next up:\*\*\s*(.+)$", re.MULTILINE)


@dataclass(frozen=True)
class Decision:
    permission: str  # "deny" or "ask"
    reason: str


@dataclass
class Report:
    rows: list[tuple[str, str]] = field(default_factory=list)
    problems: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def classify(rel_path: str) -> str:
    """Return the write tier of a repo-relative path (case-insensitive, POSIX separators)."""
    path = rel_path.replace("\\", "/").casefold()
    if DENIED_NAME_RE.search(path):
        return DENIED_TYPE
    if path in GUARD_FILES:
        return GUARD
    if path.startswith(GENERATED_PREFIXES):
        return GENERATED
    if path in OWNED_FILES or path.startswith(OWNED_PREFIXES):
        return OWNED
    if path in NEEDS_ASSIGNMENT_FILES:
        return NEEDS_ASSIGNMENT
    return FORBIDDEN


def find_secrets(text: str) -> list[str]:
    return [name for name, pattern in SECRET_PATTERNS if pattern.search(text)]


def repo_relative(path: str, root: Path, cwd: str | None = None) -> str | None:
    """Return the repo-relative POSIX path, or None when the path is outside the repository."""
    candidate = Path(path)
    if not candidate.is_absolute():
        candidate = Path(cwd or os.getcwd()) / candidate
    absolute = os.path.abspath(candidate)
    base = os.path.abspath(root)
    folded, folded_base = os.path.normcase(absolute), os.path.normcase(base)
    if folded == folded_base or not folded.startswith(folded_base.rstrip(os.sep) + os.sep):
        return None
    return Path(os.path.relpath(absolute, base)).as_posix()


def _proposed_text(tool_input: dict) -> str:
    parts = [tool_input.get(key) for key in ("content", "new_string", "new_source")]
    parts += [edit.get("new_string") for edit in tool_input.get("edits") or [] if isinstance(edit, dict)]
    return "\n".join(part for part in parts if isinstance(part, str))


def pre_tool_decision(payload: dict, root: Path = REPO_ROOT) -> Decision | None:
    """Decide on one Edit/Write/NotebookEdit call; None means no objection."""
    tool_input = payload.get("tool_input") or {}
    target = tool_input.get("file_path") or tool_input.get("notebook_path")
    if not target:
        return None
    rel_path = repo_relative(target, root, payload.get("cwd"))
    if rel_path is None:
        return None
    tier = classify(rel_path)
    if tier == FORBIDDEN:
        return Decision("deny", (
            f"Blocked by the Dev 2 boundary guard: '{rel_path}' is outside Nisheeth's writable paths "
            f"(docs/roles/README.md). Do not edit it. Prepare a handoff request for its owner per "
            f"{PLAN_PATH} section 8 and continue with owned work."
        ))
    if tier == DENIED_TYPE:
        return Decision("deny", (
            f"Blocked: '{rel_path}' is a secret, weight, raw-data or database file type that is never "
            "committed (CLAUDE.md configuration and data rules). Tests create databases in temp dirs."
        ))
    if tier == GENERATED:
        return Decision("deny", (
            f"Blocked: '{rel_path}' is generated output owned by Chaandan's scripts/generate_contracts. "
            "Request a schema change instead of hand-editing."
        ))
    secrets = find_secrets(_proposed_text(tool_input))
    if secrets:
        return Decision("deny", (
            f"Blocked: proposed content for '{rel_path}' contains credential-like text ({', '.join(secrets)}). "
            "Never write token literals, even placeholders; tests generate dummy secrets at runtime."
        ))
    if tier == NEEDS_ASSIGNMENT:
        return Decision("ask", (
            f"'{rel_path}' is unlisted in the ownership registry ({PLAN_PATH} Q10). Approve only if the "
            "team has assigned it to Nisheeth, and record that in section 12."
        ))
    if tier == GUARD:
        return Decision("ask", (
            f"'{rel_path}' is the boundary guard, its tests or its hook configuration. Approve only if you "
            f"intend to change how edits are checked, and record it in {PLAN_PATH} section 12."
        ))
    return None


def git(root: Path, *args: str, input_text: str | None = None) -> str:
    result = subprocess.run(
        ["git", "-C", str(root), *args],
        input=input_text, capture_output=True, check=True, encoding="utf-8", errors="replace",
    )
    return result.stdout


def working_tree_changes(root: Path) -> list[str]:
    """Staged, unstaged and untracked paths, including the source side of renames."""
    entries = iter(git(root, "status", "--porcelain=v1", "-z", "--untracked-files=all").split("\0"))
    paths: list[str] = []
    for entry in entries:
        if not entry:
            continue
        status, path = entry[:2], entry[3:]
        paths.append(path)
        if "R" in status or "C" in status:
            source = next(entries, "")
            if "R" in status and source:
                paths.append(source)
    return paths


def branch_changes(root: Path, base: str) -> list[str]:
    return [p for p in git(root, "diff", "--name-only", "-z", f"{base}...HEAD").split("\0") if p]


def _digest(blob_ids: dict[str, str]) -> str:
    digest = hashlib.sha256()
    for path in sorted(blob_ids):
        digest.update(f"{path}\0{blob_ids[path]}\n".encode("utf-8"))
    return digest.hexdigest()[:12]


def ref_fingerprint(root: Path, ref: str) -> str | None:
    """Fingerprint of the normative files at a commit-ish, or None if the ref is unavailable."""
    try:
        listing = git(root, "ls-tree", "-r", "-z", ref, "--", *NORMATIVE_PATHS)
    except (subprocess.CalledProcessError, OSError):
        return None
    blob_ids = {}
    for record in filter(None, listing.split("\0")):
        meta, path = record.split("\t", 1)
        blob_ids[path] = meta.split()[2]
    return _digest(blob_ids)


def worktree_fingerprint(root: Path) -> str:
    """Fingerprint of the normative files on disk, hashed through git's filters to match ref_fingerprint."""
    listed = git(root, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", *NORMATIVE_PATHS)
    paths = sorted({p for p in listed.split("\0") if p and (root / p).is_file()})
    if not paths:
        return _digest({})
    blob_ids = git(root, "hash-object", "--stdin-paths", input_text="\n".join(paths) + "\n").split()
    return _digest(dict(zip(paths, blob_ids)))


def recorded_fingerprint(root: Path) -> str | None:
    plan = root / PLAN_PATH
    if not plan.is_file():
        return None
    match = FINGERPRINT_RE.search(plan.read_text(encoding="utf-8"))
    return match.group(1) if match else None


def drift_findings(root: Path) -> tuple[list[str], list[str]]:
    """Problems when the plan's fingerprint is stale locally; warnings when upstream moved."""
    if not (root / PLAN_PATH).is_file():
        return [f"{PLAN_PATH} is missing; restore it before changing anything."], []
    recorded = recorded_fingerprint(root)
    if recorded is None:
        return [f"{PLAN_PATH} has no 'Contract fingerprint: `<12 hex>`' line."], []
    problems, warnings = [], []
    local = worktree_fingerprint(root)
    if local != recorded:
        problems.append(
            f"Normative contract files changed (plan records {recorded}, working tree is {local}). "
            f"Re-read them (git diff <plan baseline commit> -- {' '.join(NORMATIVE_PATHS)}), reconcile "
            f"{PLAN_PATH} per section 2.4, then record the new fingerprint."
        )
    upstream = ref_fingerprint(root, UPSTREAM_REF)
    if upstream is not None and upstream not in (recorded, local):
        warnings.append(
            f"{UPSTREAM_REF} has different normative contract files ({upstream}). Merge it into this branch, "
            "re-read the changes and reconcile the plan."
        )
    return problems, warnings


def collect_report(root: Path, paths: list[str], check_drift: bool = True) -> Report:
    report = Report()
    by_tier: dict[str, list[str]] = {}
    for path in sorted(set(paths)):
        tier = classify(path)
        report.rows.append((tier, path))
        by_tier.setdefault(tier, []).append(path)

    blocked = by_tier.get(FORBIDDEN, []) + by_tier.get(DENIED_TYPE, []) + by_tier.get(GENERATED, [])
    if blocked:
        report.problems.append(
            "Changed paths outside Nisheeth's writable boundary, generated, or of a denied type: "
            + ", ".join(blocked) + ". Revert only changes you made; report anything else to the user. "
            f"Fixes in other owners' paths go through {PLAN_PATH} section 8."
        )
    my_work = [p for tier in (OWNED, GUARD, NEEDS_ASSIGNMENT) for p in by_tier.get(tier, []) if p != PLAN_PATH]
    if my_work and PLAN_PATH not in paths:
        report.problems.append(
            f"Owned files changed but {PLAN_PATH} was not updated. Run its section 4 post-change "
            "verification and add a section 12 change-log entry."
        )
    if NEEDS_ASSIGNMENT in by_tier:
        report.warnings.append(
            "Unlisted paths changed: " + ", ".join(by_tier[NEEDS_ASSIGNMENT])
            + f". Record the team's assignment ({PLAN_PATH} Q10) before merging."
        )
    if GUARD in by_tier:
        report.warnings.append(
            f"Guard changed: run `python3 -m unittest discover -s tests/api -p {Path(GUARD_TEST_PATH).name}`."
        )
    for path in sorted(set(paths)):
        report.problems.extend(_file_problems(root, path))
    if check_drift:
        problems, warnings = drift_findings(root)
        report.problems.extend(problems)
        report.warnings.extend(warnings)
    return report


def _file_problems(root: Path, path: str) -> list[str]:
    file = root / path
    if not file.is_file():
        return []
    size = file.stat().st_size
    if size > MAX_FILE_BYTES:
        return [f"{path} is {size} bytes (limit {MAX_FILE_BYTES}); large files do not belong in backend commits."]
    secrets = find_secrets(file.read_text(encoding="utf-8", errors="ignore"))
    if secrets:
        return [f"{path} contains credential-like text ({', '.join(secrets)}); remove it before committing."]
    return []


def run_audit(root: Path, base: str | None) -> int:
    try:
        paths = working_tree_changes(root)
        if base:
            paths += branch_changes(root, base)
        report = collect_report(root, paths)
    except (subprocess.CalledProcessError, OSError) as error:
        print(f"NOT RUN: the guard could not read git state ({error}).")
        return 2
    print(f"Dev 2 boundary audit (base: {base or 'working tree only'})")
    for tier, path in report.rows:
        print(f"  {tier:<16}  {path}")
    if not report.rows:
        print("  (no changed paths)")
    for problem in report.problems:
        print(f"PROBLEM: {problem}")
    for warning in report.warnings:
        print(f"WARNING: {warning}")
    print("Result: " + ("FAIL" if report.problems else "PASS"))
    return 1 if report.problems else 0


def run_fingerprint(root: Path) -> int:
    print(f"working tree: {worktree_fingerprint(root)}")
    print(f"HEAD:         {ref_fingerprint(root, 'HEAD') or 'unavailable'}")
    print(f"{UPSTREAM_REF}:  {ref_fingerprint(root, UPSTREAM_REF) or 'unavailable'}")
    print(f"plan records: {recorded_fingerprint(root) or 'missing'}")
    return 0


def hook_pre_tool(payload: dict, root: Path) -> int:
    decision = pre_tool_decision(payload, root)
    if decision:
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision.permission,
            "permissionDecisionReason": decision.reason,
        }}))
    return 0


def hook_prompt(payload: dict, root: Path) -> int:
    tag = "[Dev 2 plan guard]"
    lines = [
        f"{tag} Before changing files, re-read {PLAN_PATH} and pass its section 3 pre-change gate. "
        f"After changing files, run section 4 (including `python3 {GUARD_PATH} audit`) and add a section 12 entry."
    ]
    try:
        branch = git(root, "rev-parse", "--abbrev-ref", "HEAD").strip()
        changes = working_tree_changes(root)
        state = "clean" if not changes else f"{len(set(changes))} changed path(s)"
        lines.append(f"{tag} Branch {branch}; working tree {state}.")
        plan = root / PLAN_PATH
        match = NEXT_UP_RE.search(plan.read_text(encoding="utf-8")) if plan.is_file() else None
        if match:
            lines.append(f"{tag} Next up: {match.group(1).strip()}")
        problems, warnings = drift_findings(root)
        lines.extend(f"{tag} WARNING: {message}" for message in problems + warnings)
    except (subprocess.CalledProcessError, OSError) as error:
        lines.append(f"{tag} WARNING: the guard could not inspect the repository ({error}).")
    print("\n".join(lines))
    return 0


def hook_stop(payload: dict, root: Path) -> int:
    if payload.get("stop_hook_active"):
        return 0  # Already blocked once this turn; never loop.
    try:
        report = collect_report(root, working_tree_changes(root))
    except (subprocess.CalledProcessError, OSError) as error:
        print(f"[Dev 2 plan guard] could not audit the working tree ({error}).", file=sys.stderr)
        return 0
    if report.problems:
        print(json.dumps({"decision": "block", "reason": "[Dev 2 plan guard] " + " ".join(report.problems)}))
    return 0


HOOKS = {"hook-pre-tool": hook_pre_tool, "hook-prompt": hook_prompt, "hook-stop": hook_stop}


def read_hook_payload() -> dict:
    raw = sys.stdin.buffer.read().decode("utf-8", errors="replace")
    return json.loads(raw) if raw.strip() else {}


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)
    audit = commands.add_parser("audit", help="Check changed paths, plan update, secrets, size and contract drift.")
    audit.add_argument("--base", help="Also include commits since the merge base with this ref.")
    commands.add_parser("fingerprint", help="Print normative-file fingerprints to record in the plan.")
    for name in HOOKS:
        commands.add_parser(name, help="Claude Code hook entry point; reads hook JSON on stdin.")
    args = parser.parse_args(argv)
    if args.command == "audit":
        return run_audit(REPO_ROOT, args.base)
    if args.command == "fingerprint":
        return run_fingerprint(REPO_ROOT)
    if args.command == "hook-pre-tool":
        try:
            return hook_pre_tool(read_hook_payload(), REPO_ROOT)
        except Exception as error:  # Fail closed: exit 2 makes Claude Code block the edit.
            print(f"Dev 2 boundary guard failed ({error!r}); edit blocked until it is fixed.", file=sys.stderr)
            return 2
    return HOOKS[args.command](read_hook_payload(), REPO_ROOT)


if __name__ == "__main__":
    sys.exit(main())
