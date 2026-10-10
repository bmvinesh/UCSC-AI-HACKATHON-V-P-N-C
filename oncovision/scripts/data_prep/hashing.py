"""Streamed SHA-256 and size for large slide files (fixed-size chunks, bounded memory)."""

from __future__ import annotations

import hashlib
from pathlib import Path

CHUNK_BYTES = 8 * 1024 * 1024


def sha256_file(path: Path, chunk_bytes: int = CHUNK_BYTES) -> tuple[str, int]:
    """Return (lowercase hex sha256, size in bytes) without loading the file into memory."""
    digest = hashlib.sha256()
    size = 0
    with open(path, "rb") as handle:
        while chunk := handle.read(chunk_bytes):
            digest.update(chunk)
            size += len(chunk)
    return digest.hexdigest(), size
