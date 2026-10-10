#!/usr/bin/env python3
"""R2 (Nisheeth) change gate: verify every changed file stays inside the R2 boundary.

Run from anywhere inside the repository:
    python3 oncovision/scripts/data_prep/check_boundary.py [--base origin/main]

Checks committed, staged, unstaged, and untracked changes relative to the
merge-base with --base. Rejects paths outside the R2 boundary, slide/weight
file types, files over the size limit, and secret-looking files.
Exit 0 = OK, 1 = violations, 2 = could not run.
See oncovision/docs/data/IMPLEMENTATION_PLAN.md §0.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

APP = "oncovision/"
ALLOWED_DIRS = (
    APP + "scripts/data_prep/",
    APP + "tests/data_prep/",
    APP + "fixtures/demo/catalog/",
    APP + "docs/data/",
)
ALLOWED_FILES = (
    APP + "data-manifests/slides.json",
    APP + "data-manifests/demo-case.json",
)
FORBIDDEN_SUFFIXES = (
    # whole-slide images
    ".svs", ".tif", ".tiff", ".ndpi", ".mrxs", ".scn", ".vms", ".vmu", ".bif", ".isyntax", ".czi",
    # model weights
    ".pt", ".pth", ".ckpt", ".safetensors", ".bin", ".onnx", ".gguf",
    # confidential documents / secrets
    ".pdf", ".pem", ".key",
)
SECRET_NAMES = (".env", "credentials.json", "token.json")
MAX_BYTES = 5 * 1024 * 1024


def git(*args: str, cwd: Path) -> list[str]:
    out = subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True).stdout
    return [line for line in out.splitlines() if line]


def changed_paths(root: Path, base: str) -> set[str]:
    merge_base = git("merge-base", "HEAD", base, cwd=root)[0]
    paths = set(git("diff", "--name-only", merge_base, cwd=root))
    paths |= set(git("ls-files", "--others", "--exclude-standard", cwd=root))
    return paths


def violations(root: Path, paths: set[str]) -> list[str]:
    problems = []
    for path in sorted(paths):
        if not (path.startswith(ALLOWED_DIRS) or path in ALLOWED_FILES):
            problems.append(f"outside R2 boundary: {path}")
        name = path.rsplit("/", 1)[-1].lower()
        if name.endswith(FORBIDDEN_SUFFIXES) or name in SECRET_NAMES:
            problems.append(f"restricted file type: {path}")
        full = root / path
        if full.is_file() and full.stat().st_size > MAX_BYTES:
            problems.append(f"file over {MAX_BYTES // (1024 * 1024)} MB: {path}")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base", default="origin/main", help="branch to diff against (default: origin/main)")
    args = parser.parse_args()
    try:
        root = Path(git("rev-parse", "--show-toplevel", cwd=Path.cwd())[0])
        paths = changed_paths(root, args.base)
    except (subprocess.CalledProcessError, IndexError, FileNotFoundError) as exc:
        print(f"NOT RUN: could not read git state ({exc})", file=sys.stderr)
        return 2
    problems = violations(root, paths)
    for problem in problems:
        print(problem)
    if problems:
        print(f"FAIL: {len(problems)} violation(s) in {len(paths)} changed file(s)")
        return 1
    print(f"OK: {len(paths)} changed file(s) inside the R2 boundary")
    return 0


if __name__ == "__main__":
    sys.exit(main())
