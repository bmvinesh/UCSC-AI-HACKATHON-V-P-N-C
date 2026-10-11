"""Forward-only SQL migrations tracked with PRAGMA user_version.

Files `NNN_name.sql` in ./migrations must be numbered 001..N with no gaps or repeats.
Each migration runs in its own transaction together with its version bump, so a failure
leaves the database exactly at the previous version. A database newer than this code is
refused rather than guessed at.
"""
from __future__ import annotations

import re
import sqlite3
from pathlib import Path
from typing import Iterator

from app.persistence.db import PersistenceError, transaction

MIGRATIONS_DIR = Path(__file__).parent / "migrations"
_NAME_RE = re.compile(r"^(\d{3})_[a-z0-9_]+\.sql$")


class MigrationError(PersistenceError):
    pass


def load_migrations(directory: Path = MIGRATIONS_DIR) -> list[tuple[int, Path]]:
    found = []
    for file in sorted(directory.glob("*.sql")):
        match = _NAME_RE.match(file.name)
        if not match:
            raise MigrationError(f"bad migration file name: {file.name} (want NNN_name.sql)")
        found.append((int(match.group(1)), file))
    if [n for n, _ in found] != list(range(1, len(found) + 1)):
        raise MigrationError(f"migrations must be numbered 001..N without gaps or repeats: {[f.name for _, f in found]}")
    return found


_COMMENT_RE = re.compile(r"--[^\n]*|/\*.*?\*/", re.DOTALL)


def _statements(sql: str) -> Iterator[str]:
    """Split a script into complete statements at ';' (strings, comments and triggers respected).

    Avoids executescript(), which issues an implicit COMMIT and would break the per-migration transaction.
    """
    *pieces, tail = sql.split(";")
    buffer = ""
    for piece in pieces:
        buffer += piece + ";"
        if sqlite3.complete_statement(buffer):
            yield buffer
            buffer = ""
    remainder = buffer + tail
    if _COMMENT_RE.sub("", remainder).strip():
        raise MigrationError(f"incomplete SQL statement at end of migration: {remainder.strip()[:60]!r}")


def current_version(conn: sqlite3.Connection) -> int:
    return conn.execute("PRAGMA user_version").fetchone()[0]


def migrate(conn: sqlite3.Connection, directory: Path = MIGRATIONS_DIR) -> int:
    """Apply pending migrations; return the resulting version. Safe to call at every start."""
    migrations = load_migrations(directory)
    latest = len(migrations)
    version = current_version(conn)
    if version > latest:
        raise MigrationError(f"database is at version {version} but this code only knows up to {latest}")
    for number, file in migrations[version:]:
        try:
            with transaction(conn):
                for statement in _statements(file.read_text(encoding="utf-8")):
                    conn.execute(statement)
                conn.execute(f"PRAGMA user_version = {number}")
        except (sqlite3.Error, MigrationError) as exc:
            raise MigrationError(f"migration {file.name} failed; database left at version {number - 1}: {exc}") from exc
    return current_version(conn)
