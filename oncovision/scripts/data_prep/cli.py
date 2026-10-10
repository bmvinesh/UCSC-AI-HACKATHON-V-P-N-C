#!/usr/bin/env python3
"""R2 data-prep CLI. Currently: `validate` (plan T2).

    python3 oncovision/scripts/data_prep/cli.py validate --manifest FILE --slide-root DIR [--records-key KEY]

Exit codes: 0 = no errors, 1 = errors found, 2 = could not run (bad args / unreadable manifest).
Schema validation against Vinesh's schema is NOT implemented yet (plan T3) and is reported as such.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from checks import FieldNames, check_records


def load_records(manifest: Path, records_key: str | None) -> list[dict]:
    """Manifest is a JSON list of records, or an object holding that list under `records_key`."""
    data = json.loads(manifest.read_text(encoding="utf-8"))
    if records_key is not None:
        data = data[records_key]
    if not isinstance(data, list) or not all(isinstance(r, dict) for r in data):
        raise ValueError("records must be a JSON list of objects")
    return data


def cmd_validate(args: argparse.Namespace) -> int:
    root_arg = args.slide_root or os.environ.get("ONCO_SLIDE_ROOT")
    if not root_arg:
        print("NOT RUN: pass --slide-root or set ONCO_SLIDE_ROOT", file=sys.stderr)
        return 2
    root = Path(root_arg)
    if not root.is_dir():
        print(f"NOT RUN: slide root is not a directory: {root}", file=sys.stderr)
        return 2
    try:
        records = load_records(args.manifest, args.records_key)
    except (OSError, ValueError, KeyError) as exc:
        print(f"NOT RUN: cannot read manifest ({type(exc).__name__}: {exc})", file=sys.stderr)
        return 2

    issues = check_records(records, root, FieldNames())
    for issue in issues:
        print(issue)
    print("checks run: required fields, duplicate id/hash, path containment, file, sha256, size")
    print("schema validation: NOT RUN (pending plan T3: Vinesh's schema)")
    print(f"{'FAIL' if issues else 'OK'}: {len(records)} record(s), {len(issues)} issue(s)")
    return 1 if issues else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    val = sub.add_parser("validate", help="check manifest records against files on disk")
    val.add_argument("--manifest", type=Path, required=True)
    val.add_argument("--slide-root", type=Path, default=None)
    val.add_argument("--records-key", default=None, help="key holding the record list, if not a bare list")
    val.set_defaults(func=cmd_validate)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
