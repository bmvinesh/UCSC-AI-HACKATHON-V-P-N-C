"""Pure-ish manifest record checks: required fields, duplicates, path containment, file, hash, size.

Schema-independent on purpose (plan T2). Field names are passed in via `FieldNames`;
T3 replaces the provisional defaults with names read from Vinesh's schema.
No network, no schema definition, no guessing of missing values.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Mapping

from hashing import sha256_file

ERROR = "error"
_SHA256_RE = re.compile(r"[0-9a-fA-F]{64}")


@dataclass(frozen=True)
class Issue:
    code: str
    record_id: str | None
    field: str | None
    message: str
    severity: str = ERROR

    def __str__(self) -> str:
        where = f"{self.record_id or '<no id>'}" + (f".{self.field}" if self.field else "")
        return f"{self.severity.upper()} {self.code} [{where}] {self.message}"


@dataclass(frozen=True)
class FieldNames:
    """Record key names. PROVISIONAL until T3 reads them from Vinesh's schema."""

    id: str = "id"
    path: str = "path"
    sha256: str = "sha256"
    size_bytes: str = "size_bytes"
    required: tuple[str, ...] = ("id", "path", "sha256", "size_bytes")


def _is_missing(value: object) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _check_path(record_id: str | None, raw: str, root: Path) -> tuple[list[Issue], Path | None]:
    """Resolve `raw` under `root`; reject absolute paths and anything resolving outside it."""
    field = "path"
    if Path(raw).is_absolute():
        return [Issue("PATH_ESCAPE", record_id, field, f"absolute path not allowed: {raw}")], None
    resolved = (root / raw).resolve()
    if not resolved.is_relative_to(root.resolve()):
        return [Issue("PATH_ESCAPE", record_id, field, f"resolves outside slide root: {raw}")], None
    return [], resolved


def check_records(
    records: Iterable[Mapping[str, object]],
    root: Path,
    fields: FieldNames = FieldNames(),
    hasher: Callable[[Path], tuple[str, int]] = sha256_file,
) -> list[Issue]:
    """Return every issue found; never stops at the first one."""
    issues: list[Issue] = []
    seen_ids: dict[str, int] = {}
    seen_hashes: dict[str, str | None] = {}

    for record in records:
        rid = record.get(fields.id)
        rid = None if _is_missing(rid) else str(rid)

        for name in fields.required:
            if _is_missing(record.get(name)):
                issues.append(Issue("MISSING_FIELD", rid, name, "required field absent or empty"))

        if rid is not None:
            seen_ids[rid] = seen_ids.get(rid, 0) + 1
            if seen_ids[rid] == 2:
                issues.append(Issue("DUPLICATE_ID", rid, fields.id, "id appears more than once"))

        declared = record.get(fields.sha256)
        declared_hash = None
        if not _is_missing(declared):
            if isinstance(declared, str) and _SHA256_RE.fullmatch(declared):
                declared_hash = declared.lower()
                first = seen_hashes.setdefault(declared_hash, rid)
                if first != rid:
                    issues.append(Issue("DUPLICATE_HASH", rid, fields.sha256,
                                        f"same sha256 as record {first or '<no id>'}"))
            else:
                issues.append(Issue("INVALID_SHA256", rid, fields.sha256, "not a 64-char hex digest"))

        raw_path = record.get(fields.path)
        if _is_missing(raw_path):
            continue
        path_issues, resolved = _check_path(rid, str(raw_path), root)
        issues += path_issues
        if resolved is None:
            continue
        if not resolved.is_file():
            issues.append(Issue("FILE_MISSING", rid, fields.path, f"not found under slide root: {raw_path}"))
            continue

        actual_hash, actual_size = hasher(resolved)
        if declared_hash is not None and declared_hash != actual_hash:
            issues.append(Issue("HASH_MISMATCH", rid, fields.sha256,
                                f"declared {declared_hash[:12]}… but file is {actual_hash[:12]}…"))
        declared_size = record.get(fields.size_bytes)
        if isinstance(declared_size, int) and not isinstance(declared_size, bool) and declared_size != actual_size:
            issues.append(Issue("SIZE_MISMATCH", rid, fields.size_bytes,
                                f"declared {declared_size} but file is {actual_size} bytes"))
    return issues
