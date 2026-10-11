"""N2: opaque sessions, expiry, ownership, cookies, purge."""
from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from app import session as svc  # noqa: E402
from app.persistence.db import connect  # noqa: E402
from app.persistence.migrations import migrate  # noqa: E402
from app.persistence.timeutil import format_utc  # noqa: E402

T0 = datetime(2026, 10, 11, 8, 0, 0, tzinfo=timezone.utc)
STAMP = "2026-10-11T08:00:00.000Z"


class Base(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.conn = connect(Path(tmp.name) / "app.db")
        self.addCleanup(self.conn.close)
        migrate(self.conn)


class TimeTests(unittest.TestCase):
    def test_format_is_fixed_width_utc_and_truncates_to_ms(self):
        self.assertEqual(format_utc(T0), "2026-10-11T08:00:00.000Z")
        self.assertEqual(format_utc(T0.replace(microsecond=123999)), "2026-10-11T08:00:00.123Z")
        plus2 = timezone(timedelta(hours=2))
        self.assertEqual(format_utc(datetime(2026, 10, 11, 10, 0, tzinfo=plus2)), "2026-10-11T08:00:00.000Z")

    def test_naive_datetime_rejected_and_order_matches_time(self):
        with self.assertRaises(ValueError):
            format_utc(datetime(2026, 10, 11))
        self.assertLess(format_utc(T0), format_utc(T0 + timedelta(milliseconds=1)))


class CreateResolveTests(Base):
    def test_create_persists_opaque_unique_ids_with_expiry(self):
        ids = {svc.create_session(self.conn, now=T0).id for _ in range(200)}
        self.assertEqual(len(ids), 200)
        s = svc.create_session(self.conn, ttl_seconds=60, now=T0)
        self.assertRegex(s.id, r"^[A-Za-z0-9_-]{43}$")
        self.assertEqual((s.created_at, s.expires_at), (STAMP, "2026-10-11T08:01:00.000Z"))
        self.assertEqual(self.conn.execute("SELECT count(*) FROM sessions").fetchone()[0], 201)

    def test_ttl_bounds(self):
        for bad in (0, -5, svc.MAX_TTL_SECONDS + 1):
            with self.subTest(ttl=bad), self.assertRaises(ValueError):
                svc.create_session(self.conn, ttl_seconds=bad, now=T0)
        self.assertEqual(self.conn.execute("SELECT count(*) FROM sessions").fetchone()[0], 0)

    def test_deterministic_id_injection(self):
        s = svc.create_session(self.conn, now=T0, new_id=lambda: "A" * 43)
        self.assertEqual(s.id, "A" * 43)

    def test_resolve_valid(self):
        s = svc.create_session(self.conn, ttl_seconds=60, now=T0)
        self.assertEqual(svc.resolve_session(self.conn, s.id, now=T0 + timedelta(seconds=30)), s)

    def test_expiry_instant_is_expired_and_one_ms_before_is_valid(self):
        s = svc.create_session(self.conn, ttl_seconds=60, now=T0)
        end = T0 + timedelta(seconds=60)
        svc.resolve_session(self.conn, s.id, now=end - timedelta(milliseconds=1))
        with self.assertRaises(svc.SessionError) as ctx:
            svc.resolve_session(self.conn, s.id, now=end)
        self.assertEqual(ctx.exception.reason, "unknown_or_expired")

    def test_missing_malformed_unknown(self):
        cases = {None: "missing", "": "missing", "short": "malformed", "!" * 43: "malformed",
                 "'; DROP TABLE sessions;--" + "a" * 20: "malformed", "B" * 43: "unknown_or_expired"}
        for value, reason in cases.items():
            with self.subTest(value=value), self.assertRaises(svc.SessionError) as ctx:
                svc.resolve_session(self.conn, value, now=T0)
            self.assertEqual(ctx.exception.reason, reason)


class OwnershipTests(Base):
    def test_session_cannot_claim_another_sessions_resource(self):
        a = svc.create_session(self.conn, now=T0)
        b = svc.create_session(self.conn, now=T0)
        self.conn.execute(
            "INSERT INTO jobs (id, session_id, kind, lane, state, payload_json, created_at, updated_at)"
            " VALUES ('jb', ?, 'scenario', 'compute', 'queued', '{}', ?, ?)", (b.id, STAMP, STAMP))
        owner = self.conn.execute("SELECT session_id FROM jobs WHERE id = 'jb'").fetchone()[0]
        svc.ensure_owner(b, owner)
        with self.assertRaises(svc.NotOwnerError):
            svc.ensure_owner(a, owner)
        with self.assertRaises(svc.NotOwnerError):
            svc.ensure_owner(a, None)


class CookieTests(unittest.TestCase):
    def test_attributes(self):
        header = svc.cookie_header("x" * 43, max_age_seconds=3600, secure=False)
        for needle in ("HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=3600", f"{svc.COOKIE_NAME}={'x' * 43}"):
            self.assertIn(needle, header)
        self.assertNotIn("Secure", header)
        self.assertIn("Secure", svc.cookie_header("x" * 43, max_age_seconds=1, secure=True))

    def test_parse_round_trip_and_garbage(self):
        sid = svc.new_session_id()
        self.assertEqual(svc.session_id_from_cookie_header(f"theme=dark; {svc.COOKIE_NAME}={sid}; other=1"), sid)
        for header in (None, "", "theme=dark", "not a cookie ;;;", f"{svc.COOKIE_NAME}"):
            self.assertIsNone(svc.session_id_from_cookie_header(header), header)


class PurgeTests(Base):
    def populate(self, sid, state="succeeded"):
        c = self.conn
        c.execute("INSERT INTO results VALUES (?, ?, '{}', 'm1', ?)", (f"r-{sid[:4]}", sid, STAMP))
        c.execute("INSERT INTO explanations VALUES (?, ?, ?, '{}', ?)", (f"e-{sid[:4]}", sid, f"r-{sid[:4]}", STAMP))
        c.execute("INSERT INTO idempotency VALUES (?, 'k', 'h', '{}', ?)", (sid, STAMP))
        extra = {"result_id": f"r-{sid[:4]}", "progress": 1} if state == "succeeded" else {"result_id": None, "progress": 0}
        c.execute("INSERT INTO jobs (id, session_id, kind, lane, state, payload_json, progress, result_id, created_at, updated_at)"
                  " VALUES (?, ?, 'scenario', 'compute', ?, '{}', ?, ?, ?, ?)",
                  (f"j-{sid[:4]}", sid, state, extra["progress"], extra["result_id"], STAMP, STAMP))

    def counts(self):
        return {t: self.conn.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
                for t in ("sessions", "jobs", "results", "explanations", "idempotency")}

    def test_expired_sessions_and_their_rows_are_removed_active_ones_kept(self):
        old = svc.create_session(self.conn, ttl_seconds=60, now=T0, new_id=lambda: "o" * 43)
        live = svc.create_session(self.conn, ttl_seconds=3600, now=T0, new_id=lambda: "l" * 43)
        self.populate(old.id)
        self.populate(live.id)
        result = svc.purge_expired(self.conn, now=T0 + timedelta(seconds=60))  # boundary: expired
        self.assertEqual((result.deleted, result.skipped_active_jobs), (1, 0))
        self.assertEqual(self.counts(), {"sessions": 1, "jobs": 1, "results": 1, "explanations": 1, "idempotency": 1})
        self.assertEqual(self.conn.execute("SELECT id FROM sessions").fetchone()[0], live.id)

    def test_nothing_expired_is_a_no_op(self):
        s = svc.create_session(self.conn, ttl_seconds=60, now=T0)
        self.populate(s.id)
        before = self.counts()
        self.assertEqual(svc.purge_expired(self.conn, now=T0 + timedelta(seconds=59)).deleted, 0)
        self.assertEqual(self.counts(), before)

    def test_session_with_queued_or_running_job_is_skipped(self):
        for state in ("queued", "running"):
            with self.subTest(state=state):
                s = svc.create_session(self.conn, ttl_seconds=60, now=T0, new_id=lambda st=state: st[0] * 43)
                self.populate(s.id, state=state)
                before = self.counts()
                result = svc.purge_expired(self.conn, now=T0 + timedelta(hours=1))
                self.assertEqual((result.deleted, result.skipped_active_jobs), (0, 1))
                self.assertEqual(self.counts(), before)
                self.conn.execute("DELETE FROM jobs WHERE session_id = ?", (s.id,))  # cleanup for next subtest
                self.conn.execute("DELETE FROM idempotency WHERE session_id = ?", (s.id,))
                self.conn.execute("DELETE FROM explanations WHERE session_id = ?", (s.id,))
                self.conn.execute("DELETE FROM results WHERE session_id = ?", (s.id,))
                self.conn.execute("DELETE FROM sessions WHERE id = ?", (s.id,))

    def test_cross_session_reference_rolls_back_that_session_and_raises(self):
        old = svc.create_session(self.conn, ttl_seconds=60, now=T0, new_id=lambda: "o" * 43)
        live = svc.create_session(self.conn, ttl_seconds=3600, now=T0, new_id=lambda: "l" * 43)
        self.populate(old.id)
        # a LIVE session's explanation wrongly points at the expired session's result
        self.conn.execute("INSERT INTO explanations VALUES ('bad', ?, ?, '{}', ?)", (live.id, f"r-{old.id[:4]}", STAMP))
        before = self.counts()
        with self.assertRaises(sqlite3.IntegrityError):
            svc.purge_expired(self.conn, now=T0 + timedelta(hours=1))
        self.assertEqual(self.counts(), before)
        self.assertFalse(self.conn.in_transaction)


if __name__ == "__main__":
    unittest.main()
