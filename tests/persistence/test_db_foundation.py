"""N1: connections, WAL, transactions, migrations and schema constraints."""
from __future__ import annotations

import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from app.persistence.db import PersistenceError, connect, transaction  # noqa: E402
from app.persistence.migrations import MigrationError, load_migrations, migrate  # noqa: E402

NOW = "2026-10-11T00:00:00Z"
TABLES = {"cache", "cases", "explanations", "idempotency", "jobs", "results", "sessions"}


class DbCase(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = Path(tmp.name)
        self.path = self.dir / "app.db"
        self.conn = connect(self.path)
        self.addCleanup(self.conn.close)


class ConnectTests(DbCase):
    def test_pragmas(self):
        q = lambda p: self.conn.execute(f"PRAGMA {p}").fetchone()[0]
        self.assertEqual(q("journal_mode"), "wal")
        self.assertEqual(q("foreign_keys"), 1)
        self.assertEqual(q("busy_timeout"), 5000)

    def test_transaction_commits_and_rolls_back(self):
        self.conn.execute("CREATE TABLE t (x INTEGER)")
        with transaction(self.conn):
            self.conn.execute("INSERT INTO t VALUES (1)")
        with self.assertRaises(ZeroDivisionError):
            with transaction(self.conn):
                self.conn.execute("INSERT INTO t VALUES (2)")
                1 / 0
        self.assertEqual([r[0] for r in self.conn.execute("SELECT x FROM t")], [1])
        self.assertFalse(self.conn.in_transaction)

    def test_reader_is_not_blocked_by_open_writer_and_sees_only_committed_data(self):
        self.conn.execute("CREATE TABLE t (x INTEGER)")
        self.conn.execute("INSERT INTO t VALUES (1)")
        reader = connect(self.path)
        self.addCleanup(reader.close)
        with transaction(self.conn):
            self.conn.execute("INSERT INTO t VALUES (2)")  # uncommitted
            self.assertEqual(reader.execute("SELECT count(*) FROM t").fetchone()[0], 1)
        self.assertEqual(reader.execute("SELECT count(*) FROM t").fetchone()[0], 2)

    def test_second_writer_waits_then_reports_busy(self):
        other = connect(self.path, busy_timeout_ms=50)
        self.addCleanup(other.close)
        self.conn.execute("CREATE TABLE t (x INTEGER)")
        with transaction(self.conn):
            with self.assertRaises(sqlite3.OperationalError):
                other.execute("BEGIN IMMEDIATE")


class MigrationTests(DbCase):
    def test_fresh_db_migrates_and_is_idempotent(self):
        self.assertEqual(migrate(self.conn), 1)
        names = {r[0] for r in self.conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertEqual(names, TABLES)
        self.assertEqual(migrate(self.conn), 1)

    def test_newer_database_is_refused(self):
        self.conn.execute("PRAGMA user_version = 99")
        with self.assertRaisesRegex(MigrationError, "version 99"):
            migrate(self.conn)

    def _dir(self, files):
        d = self.dir / "mig"
        d.mkdir(exist_ok=True)
        for name, sql in files.items():
            (d / name).write_text(sql)
        return d

    def test_failed_migration_rolls_back_completely_and_keeps_prior_version(self):
        d = self._dir({"001_a.sql": "CREATE TABLE a (x INTEGER);",
                       "002_b.sql": "CREATE TABLE b (x INTEGER);\nINSERT INTO nope VALUES (1);"})
        with self.assertRaisesRegex(MigrationError, "002_b.sql"):
            migrate(self.conn, d)
        self.assertEqual(self.conn.execute("PRAGMA user_version").fetchone()[0], 1)
        names = {r[0] for r in self.conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertEqual(names, {"a"})

    def test_numbering_and_names_are_validated(self):
        with self.assertRaises(MigrationError):
            load_migrations(self._dir({"001_a.sql": "SELECT 1;", "003_c.sql": "SELECT 1;"}))
        with self.assertRaises(MigrationError):
            load_migrations(self._dir({"001_a.sql": "SELECT 1;", "bad.sql": "SELECT 1;"}))

    def test_trigger_statements_are_not_split(self):
        d = self._dir({"001_t.sql": "CREATE TABLE a (x INTEGER); CREATE TABLE log (x INTEGER);\n"
                                    "CREATE TRIGGER trg AFTER INSERT ON a BEGIN INSERT INTO log VALUES (NEW.x); END;"})
        migrate(self.conn, d)
        self.conn.execute("INSERT INTO a VALUES (7)")
        self.assertEqual(self.conn.execute("SELECT x FROM log").fetchone()[0], 7)

    def test_semicolons_in_strings_and_comments_and_trailing_comment(self):
        from app.persistence.migrations import _statements
        sql = ("CREATE TABLE a (x TEXT); -- note; with semicolon\n"
               "INSERT INTO a VALUES ('p;q');\n"
               "/* block; comment */ INSERT INTO a VALUES ('r');\n-- end of file\n")
        parts = [p.strip() for p in _statements(sql)]
        self.assertEqual(len(parts), 3)
        self.assertIn("'p;q'", parts[1])
        migrate(self.conn, self._dir({"001_s.sql": sql}))
        self.assertEqual([r[0] for r in self.conn.execute("SELECT x FROM a ORDER BY x")], ["p;q", "r"])

    def test_incomplete_statement_is_an_error(self):
        with self.assertRaises(MigrationError):
            migrate(self.conn, self._dir({"001_a.sql": "CREATE TABLE a (x INTEGER"}))


class SchemaTests(DbCase):
    def setUp(self):
        super().setUp()
        migrate(self.conn)
        self.conn.execute("INSERT INTO sessions VALUES ('s1', ?, ?)", (NOW, NOW))
        self.conn.execute("INSERT INTO sessions VALUES ('s2', ?, ?)", (NOW, NOW))

    def job(self, id="j1", session="s1", state="queued", payload="{}", progress=0, result=None, error=None, lane="compute", kind="scenario"):
        self.conn.execute(
            "INSERT INTO jobs (id, session_id, kind, lane, state, payload_json, progress, result_id, error_json, created_at, updated_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?)", (id, session, kind, lane, state, payload, progress, result, error, NOW, NOW))

    def test_valid_job_lifecycle_rows(self):
        self.job("q", state="queued")
        self.job("r", state="running", progress=0.5)
        self.job("ok", state="succeeded", progress=1, result="res1")
        self.job("bad", state="failed", error=json.dumps({"code": "INTERRUPTED"}))
        self.job("c", state="cancelled")
        self.assertEqual(self.conn.execute("SELECT count(*) FROM jobs").fetchone()[0], 5)

    def test_contract_job_rules_are_enforced(self):
        for kwargs in ({"state": "queued", "result": "x"},                       # queued with result
                       {"state": "running", "error": "{}"},                      # running with error
                       {"state": "succeeded", "progress": 1},                    # succeeded without result
                       {"state": "succeeded", "result": "x", "progress": 0.9},   # progress must be 1
                       {"state": "succeeded", "result": "x", "progress": 1, "error": "{}"},
                       {"state": "failed"},                                      # failed without error
                       {"state": "failed", "error": "{}", "result": "x"},        # failed with result
                       {"state": "paused"}, {"lane": "gpu"}, {"kind": "other"},  # enums
                       {"progress": 1.5}, {"progress": -0.1}):                   # bounds
            with self.subTest(kwargs=kwargs), self.assertRaises(sqlite3.IntegrityError):
                self.job(**kwargs)

    def test_foreign_keys_and_json_validity(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.job(session="nobody")
        with self.assertRaises(sqlite3.IntegrityError):
            self.job(payload="{not json")
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("INSERT INTO cases VALUES ('c', 'nope', 'h')")

    def test_strict_typing_rejects_wrong_types(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("INSERT INTO sessions VALUES (?, ?, ?)", (b"blob", NOW, NOW))

    def test_idempotency_key_is_unique_per_session_only(self):
        ins = "INSERT INTO idempotency VALUES (?, 'k', 'h', '{}', ?)"
        self.conn.execute(ins, ("s1", NOW))
        self.conn.execute(ins, ("s2", NOW))  # same key, other session: fine
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute(ins, ("s1", NOW))

    def test_explanation_must_reference_an_existing_result(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("INSERT INTO explanations VALUES ('e', 's1', 'missing', '{}', ?)", (NOW,))

    def test_hot_queries_use_indexes(self):
        def plan(sql, *args):
            return " ".join(r[3] for r in self.conn.execute("EXPLAIN QUERY PLAN " + sql, args))
        self.assertIn("jobs_lane_state_created", plan(
            "SELECT id FROM jobs WHERE lane = ? AND state = 'queued' ORDER BY created_at LIMIT 1", "compute"))
        self.assertIn("jobs_state_lease", plan(
            "SELECT id FROM jobs WHERE state = 'running' AND lease_expires_at < ?", NOW))
        self.assertIn("jobs_session_created", plan("SELECT id FROM jobs WHERE session_id = ?", "s1"))
        self.assertIn("results_session_created", plan("SELECT id FROM results WHERE session_id = ?", "s1"))
        self.assertIn("sessions_expires_at", plan("SELECT id FROM sessions WHERE expires_at < ?", NOW))
        self.assertIn("cache_expires_at", plan("SELECT key FROM cache WHERE expires_at < ?", NOW))


class EnvironmentTests(unittest.TestCase):
    def test_old_sqlite_is_rejected_clearly(self):
        import app.persistence.db as db
        real = sqlite3.sqlite_version_info
        try:
            sqlite3.sqlite_version_info = (3, 30, 0)
            with self.assertRaisesRegex(PersistenceError, "STRICT"):
                db.connect(":memory:")
        finally:
            sqlite3.sqlite_version_info = real


if __name__ == "__main__":
    unittest.main()
