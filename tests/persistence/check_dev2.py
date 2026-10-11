#!/usr/bin/env python3
"""Dev 2 (Nisheeth) change gate: ownership boundary, plan-updated rule, secrets, size, contract drift.

Plan: app/persistence/IMPLEMENTATION_PLAN.md (section 0 gate). Reuses Chaandan's
tests/contracts/check_boundary.py for secret detection, denied file types and the
contract fingerprint, so those rules have one implementation.

Usage (from the repository root):
  python3 tests/persistence/check_dev2.py audit [--base origin/main]
  python3 tests/persistence/check_dev2.py fingerprint

Exit codes: 0 pass, 1 problems found, 2 could not run.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PLAN_PATH = "app/persistence/IMPLEMENTATION_PLAN.md"
OWNED_FILES = frozenset({"app/session.py", "app/main.py", "app/settings.py", "app/services/scenarios.py"})
OWNED_PREFIXES = ("app/routes/", "app/persistence/", "tests/api/", "tests/persistence/")
FINGERPRINT_RE = re.compile(r"Contract fingerprint: `([0-9a-f]{12})`")
UPSTREAM_REF = "origin/main"

OWNED, DENIED_TYPE, FORBIDDEN = "owned", "denied-type", "forbidden"

try:
    sys.path.insert(0, str(REPO_ROOT / "tests" / "contracts"))
    import check_boundary as shared  # Chaandan's guard: secrets, denied types, fingerprint, git helpers
except ImportError as exc:  # pragma: no cover - reported by main()
    shared = None
    SHARED_ERROR = exc


@dataclass
class Report:
    rows: list[tuple[str, str]] = field(default_factory=list)
    problems: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def classify(rel_path: str) -> str:
    path = rel_path.replace("\\", "/").casefold()
    if shared.DENIED_NAME_RE.search(path):
        return DENIED_TYPE
    if path in OWNED_FILES or path.startswith(OWNED_PREFIXES):
        return OWNED
    return FORBIDDEN


def recorded_fingerprint(root: Path) -> str | None:
    plan = root / PLAN_PATH
    match = FINGERPRINT_RE.search(plan.read_text(encoding="utf-8")) if plan.is_file() else None
    return match.group(1) if match else None


def file_problems(root: Path, path: str) -> list[str]:
    file = root / path
    if not file.is_file():
        return []
    size = file.stat().st_size
    if size > shared.MAX_FILE_BYTES:
        return [f"{path} is {size} bytes (limit {shared.MAX_FILE_BYTES})."]
    secrets = shared.find_secrets(file.read_text(encoding="utf-8", errors="ignore"))
    return [f"{path} contains credential-like text ({', '.join(secrets)}); remove it."] if secrets else []


def build_report(root: Path, paths: list[str], recorded: str | None, local: str, upstream: str | None) -> Report:
    report = Report()
    tiers = {path: classify(path) for path in sorted(set(paths))}
    report.rows = [(tier, path) for path, tier in tiers.items()]

    blocked = [p for p, t in tiers.items() if t != OWNED]
    if blocked:
        report.problems.append(
            "Changed paths outside Dev 2's writable boundary or of a denied type: " + ", ".join(blocked)
            + ". Revert only changes you made; for another owner's file prepare a handoff (plan section 7)."
        )
    owned_work = [p for p, t in tiers.items() if t == OWNED and p != PLAN_PATH]
    if owned_work and PLAN_PATH not in tiers:
        report.problems.append(f"Owned files changed but {PLAN_PATH} was not updated (progress log, section 9).")
    for path in tiers:
        report.problems += file_problems(root, path)

    if recorded is None:
        report.problems.append(f"{PLAN_PATH} has no 'Contract fingerprint: `<12 hex>`' line.")
    elif recorded != local:
        report.problems.append(
            f"Contract files changed (plan records {recorded}, working tree is {local}). Re-read "
            "CLAUDE.md, contracts/, docs/CONTRACTS.md, docs/roles/, reconcile the plan, then update the fingerprint."
        )
    if upstream is not None and upstream not in (recorded, local):
        report.warnings.append(f"{UPSTREAM_REF} has different contract files ({upstream}); merge it and re-read.")
    return report


def run_audit(root: Path, base: str | None) -> int:
    paths = shared.working_tree_changes(root)
    if base:
        paths += shared.branch_changes(root, base)
    report = build_report(root, paths, recorded_fingerprint(root),
                          shared.worktree_fingerprint(root), shared.ref_fingerprint(root, UPSTREAM_REF))
    print(f"Dev 2 change gate (base: {base or 'working tree only'})")
    for tier, path in report.rows:
        print(f"  {tier:<11}  {path}")
    if not report.rows:
        print("  (no changed paths)")
    for problem in report.problems:
        print(f"PROBLEM: {problem}")
    for warning in report.warnings:
        print(f"WARNING: {warning}")
    print("Result: " + ("FAIL" if report.problems else "PASS"))
    return 1 if report.problems else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)
    audit = commands.add_parser("audit", help="check changed paths, plan update, secrets, size, contract drift")
    audit.add_argument("--base", help="also include commits since the merge base with this ref")
    commands.add_parser("fingerprint", help="print the contract fingerprint to record in the plan")
    args = parser.parse_args(argv)
    if shared is None:
        print(f"NOT RUN: cannot import tests/contracts/check_boundary.py ({SHARED_ERROR})", file=sys.stderr)
        return 2
    try:
        if args.command == "fingerprint":
            print(shared.worktree_fingerprint(REPO_ROOT))
            return 0
        return run_audit(REPO_ROOT, args.base)
    except (subprocess.CalledProcessError, OSError) as exc:
        print(f"NOT RUN: could not read git state ({exc})", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
