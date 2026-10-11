"""SQL for the sessions table. Policy (ids, TTL, ownership, cookies) lives in app/session.py."""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass

from app.persistence.db import transaction


@dataclass(frozen=True)
class SessionRow:
    id: str
    created_at: str
    expires_at: str


@dataclass(frozen=True)
class PurgeResult:
    deleted: int
    skipped_active_jobs: int


def insert(conn: sqlite3.Connection, row: SessionRow) -> None:
    conn.execute("INSERT INTO sessions (id, created_at, expires_at) VALUES (?, ?, ?)",
                 (row.id, row.created_at, row.expires_at))


def find_active(conn: sqlite3.Connection, session_id: str, now: str) -> SessionRow | None:
    """A session is active while now < expires_at (the expiry instant itself is expired)."""
    found = conn.execute("SELECT id, created_at, expires_at FROM sessions WHERE id = ? AND expires_at > ?",
                         (session_id, now)).fetchone()
    return SessionRow(**dict(found)) if found else None


def purge_expired(conn: sqlite3.Connection, now: str) -> PurgeResult:
    """Delete expired sessions and everything they own, one transaction per session.

    A session that still has a queued or running job is skipped so an executor never loses its row.
    A foreign-key failure (e.g. another session referencing this one's result) rolls that session back
    and propagates: it means ownership was violated somewhere.
    """
    expired = [r[0] for r in conn.execute("SELECT id FROM sessions WHERE expires_at <= ?", (now,))]
    deleted = skipped = 0
    for session_id in expired:
        with transaction(conn):
            if conn.execute("SELECT 1 FROM jobs WHERE session_id = ? AND state IN ('queued', 'running') LIMIT 1",
                            (session_id,)).fetchone():
                skipped += 1
                continue
            for table in ("explanations", "results", "jobs", "idempotency"):
                conn.execute(f"DELETE FROM {table} WHERE session_id = ?", (session_id,))  # fixed names, not input
            conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            deleted += 1
    return PurgeResult(deleted, skipped)
