"""SQLite connections and transactions.

One short-lived connection per unit of work. WAL lets readers proceed during a write;
writes use BEGIN IMMEDIATE so a lock conflict surfaces at the start (and waits up to
busy_timeout) instead of failing mid-transaction. Autocommit mode: the only
transactions are the ones `transaction()` opens explicitly.
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

MIN_SQLITE = (3, 37, 0)  # STRICT tables
BUSY_TIMEOUT_MS = 5000


class PersistenceError(RuntimeError):
    """Raised for unusable database environments or files."""


def connect(path: str | Path, busy_timeout_ms: int = BUSY_TIMEOUT_MS) -> sqlite3.Connection:
    if sqlite3.sqlite_version_info < MIN_SQLITE:
        need = ".".join(map(str, MIN_SQLITE))
        raise PersistenceError(f"SQLite {need}+ required (STRICT tables); found {sqlite3.sqlite_version}")
    conn = sqlite3.connect(str(path), isolation_level=None, check_same_thread=True)
    conn.row_factory = sqlite3.Row
    conn.execute(f"PRAGMA busy_timeout = {int(busy_timeout_ms)}")
    conn.execute("PRAGMA foreign_keys = ON")
    mode = conn.execute("PRAGMA journal_mode = WAL").fetchone()[0]
    if str(path) != ":memory:" and mode.lower() != "wal":
        conn.close()
        raise PersistenceError(f"could not enable WAL for {path} (journal_mode={mode})")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn


@contextmanager
def transaction(conn: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    """BEGIN IMMEDIATE ... COMMIT; ROLLBACK on any exception, which is re-raised."""
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
    except BaseException:
        conn.execute("ROLLBACK")
        raise
    else:
        conn.execute("COMMIT")
