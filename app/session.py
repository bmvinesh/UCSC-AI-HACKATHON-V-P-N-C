"""Local opaque sessions (Dev 2). No accounts, passwords or OAuth; this is not real authentication.

A session is a random 256-bit id kept in an HttpOnly cookie and in the sessions table. It scopes
jobs, results and idempotency keys to one browser. Missing, malformed, unknown, expired and
not-owned all end the same way for the caller (routes map them to NOT_FOUND, which also avoids
revealing that another session's resource exists).
"""
from __future__ import annotations

import re
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from http.cookies import CookieError, SimpleCookie
from typing import Callable

from app.persistence import sessions as store
from app.persistence.timeutil import format_utc, utc_now

COOKIE_NAME = "oncogrowth_session"
DEFAULT_TTL_SECONDS = 8 * 3600
MAX_TTL_SECONDS = 7 * 24 * 3600
_ID_RE = re.compile(r"[A-Za-z0-9_-]{43}")  # token_urlsafe(32)


class SessionError(Exception):
    """No usable session. `reason` is 'missing', 'malformed' or 'unknown_or_expired'."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


class NotOwnerError(Exception):
    """The resource belongs to a different session (or has none)."""


@dataclass(frozen=True)
class Session:
    id: str
    created_at: str
    expires_at: str


def new_session_id() -> str:
    return secrets.token_urlsafe(32)


def create_session(conn: sqlite3.Connection, *, ttl_seconds: int = DEFAULT_TTL_SECONDS,
                   now: datetime | None = None, new_id: Callable[[], str] = new_session_id) -> Session:
    if not 0 < ttl_seconds <= MAX_TTL_SECONDS:
        raise ValueError(f"ttl_seconds must be in (0, {MAX_TTL_SECONDS}]")
    moment = now or utc_now()
    row = store.SessionRow(new_id(), format_utc(moment), format_utc(moment + timedelta(seconds=ttl_seconds)))
    store.insert(conn, row)
    return Session(row.id, row.created_at, row.expires_at)


def resolve_session(conn: sqlite3.Connection, session_id: str | None, *, now: datetime | None = None) -> Session:
    if not session_id:
        raise SessionError("missing")
    if not _ID_RE.fullmatch(session_id):
        raise SessionError("malformed")  # rejected before touching the database
    row = store.find_active(conn, session_id, format_utc(now or utc_now()))
    if row is None:
        raise SessionError("unknown_or_expired")
    return Session(row.id, row.created_at, row.expires_at)


def ensure_owner(session: Session, resource_session_id: str | None) -> None:
    if resource_session_id is None or not secrets.compare_digest(session.id, resource_session_id):
        raise NotOwnerError("resource belongs to another session")


def cookie_header(session_id: str, *, max_age_seconds: int, secure: bool) -> str:
    """Set-Cookie value: HttpOnly, SameSite=Lax, Path=/, Max-Age; Secure only when served over HTTPS."""
    cookie: SimpleCookie = SimpleCookie()
    cookie[COOKIE_NAME] = session_id
    morsel = cookie[COOKIE_NAME]
    morsel["httponly"] = True
    morsel["samesite"] = "Lax"
    morsel["path"] = "/"
    morsel["max-age"] = str(max_age_seconds)
    if secure:
        morsel["secure"] = True
    return morsel.OutputString()


def session_id_from_cookie_header(header: str | None) -> str | None:
    """Extract our session id from a Cookie request header; None if absent or unparsable."""
    if not header:
        return None
    try:
        cookies: SimpleCookie = SimpleCookie(header)
    except CookieError:
        return None
    morsel = cookies.get(COOKIE_NAME)
    return morsel.value if morsel else None


def purge_expired(conn: sqlite3.Connection, *, now: datetime | None = None) -> store.PurgeResult:
    return store.purge_expired(conn, format_utc(now or utc_now()))
