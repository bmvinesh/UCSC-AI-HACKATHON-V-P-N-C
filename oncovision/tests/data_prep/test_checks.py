"""Tests for plan T2: hashing, record checks, and the validate CLI. Run: python3 -m unittest discover oncovision/tests/data_prep"""

from __future__ import annotations

import contextlib
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "data_prep"))

import cli  # noqa: E402
import hashing  # noqa: E402
from checks import FieldNames, check_records  # noqa: E402


def record(rid: str, path: str, data: bytes, **overrides):
    rec = {"id": rid, "path": path, "sha256": hashlib.sha256(data).hexdigest(), "size_bytes": len(data)}
    rec.update(overrides)
    return rec


class Base(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name) / "slides"
        self.root.mkdir()
        self.outside = Path(tmp.name) / "outside.bin"
        self.outside.write_bytes(b"secret")

    def write(self, name: str, data: bytes) -> bytes:
        (self.root / name).write_bytes(data)
        return data

    def codes(self, records):
        return [i.code for i in check_records(records, self.root)]


class HashingTests(Base):
    def test_matches_hashlib_across_chunk_boundaries(self):
        data = bytes(range(256)) * 50  # 12800 bytes, chunk of 1000 -> many chunks plus a partial one
        self.write("a.bin", data)
        digest, size = hashing.sha256_file(self.root / "a.bin", chunk_bytes=1000)
        self.assertEqual((digest, size), (hashlib.sha256(data).hexdigest(), len(data)))

    def test_empty_file(self):
        self.write("e.bin", b"")
        self.assertEqual(hashing.sha256_file(self.root / "e.bin"), (hashlib.sha256(b"").hexdigest(), 0))


class CheckTests(Base):
    def test_valid_records_have_no_issues(self):
        a, b = self.write("a.bin", b"aaa"), self.write("b.bin", b"bbbb")
        self.assertEqual(self.codes([record("a", "a.bin", a), record("b", "b.bin", b)]), [])

    def test_checksum_mismatch(self):
        self.write("a.bin", b"aaa")
        self.assertEqual(self.codes([record("a", "a.bin", b"different")]), ["HASH_MISMATCH", "SIZE_MISMATCH"])

    def test_size_mismatch_only(self):
        a = self.write("a.bin", b"aaa")
        self.assertEqual(self.codes([record("a", "a.bin", a, size_bytes=99)]), ["SIZE_MISMATCH"])

    def test_missing_file_is_reported_not_hashed(self):
        self.assertEqual(self.codes([record("a", "nope.bin", b"x")]), ["FILE_MISSING"])

    def test_path_escape_dotdot(self):
        self.assertEqual(self.codes([record("a", "../outside.bin", b"secret")]), ["PATH_ESCAPE"])

    def test_path_escape_absolute(self):
        self.assertEqual(self.codes([record("a", str(self.outside), b"secret")]), ["PATH_ESCAPE"])

    def test_path_escape_via_symlink(self):
        (self.root / "link.bin").symlink_to(self.outside)
        self.assertEqual(self.codes([record("a", "link.bin", b"secret")]), ["PATH_ESCAPE"])

    def test_duplicate_id(self):
        a = self.write("a.bin", b"aaa")
        b = self.write("b.bin", b"bbb")
        self.assertEqual(self.codes([record("x", "a.bin", a), record("x", "b.bin", b)]), ["DUPLICATE_ID"])

    def test_duplicate_hash_under_different_ids(self):
        a = self.write("a.bin", b"same")
        self.write("b.bin", b"same")
        self.assertEqual(self.codes([record("a", "a.bin", a), record("b", "b.bin", a)]), ["DUPLICATE_HASH"])

    def test_missing_required_fields_are_flagged_and_never_defaulted(self):
        rec = {"id": "a", "path": "a.bin"}  # no sha256, no size_bytes
        self.assertEqual(self.codes([rec]), ["MISSING_FIELD", "MISSING_FIELD", "FILE_MISSING"])
        self.assertEqual(self.codes([{"id": "  ", "path": None, "sha256": "", "size_bytes": None}]),
                         ["MISSING_FIELD"] * 4)

    def test_zero_size_is_a_value_not_missing(self):
        e = self.write("e.bin", b"")
        self.assertEqual(self.codes([record("e", "e.bin", e)]), [])

    def test_malformed_sha256(self):
        a = self.write("a.bin", b"aaa")
        self.assertEqual(self.codes([record("a", "a.bin", a, sha256="xyz")]), ["INVALID_SHA256"])

    def test_uppercase_hash_accepted(self):
        a = self.write("a.bin", b"aaa")
        self.assertEqual(self.codes([record("a", "a.bin", a, sha256=hashlib.sha256(a).hexdigest().upper())]), [])

    def test_reports_all_issues_not_just_first(self):
        a = self.write("a.bin", b"aaa")
        recs = [record("a", "a.bin", b"zzzz"), record("b", "gone.bin", b"q")]
        self.assertEqual(self.codes(recs), ["HASH_MISMATCH", "SIZE_MISMATCH", "FILE_MISSING"])

    def test_custom_field_names(self):
        a = self.write("a.bin", b"aaa")
        fields = FieldNames(id="slide_id", path="file", sha256="hash", size_bytes="bytes",
                            required=("slide_id", "file", "hash", "bytes"))
        rec = {"slide_id": "a", "file": "a.bin", "hash": hashlib.sha256(a).hexdigest(), "bytes": 3}
        self.assertEqual(check_records([rec], self.root, fields), [])


class CliTests(Base):
    def run_cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = cli.main(list(argv))
        return code, out.getvalue(), err.getvalue()

    def manifest(self, payload) -> str:
        path = self.root.parent / "m.json"
        path.write_text(json.dumps(payload))
        return str(path)

    def test_exit_0_and_reports_schema_not_run(self):
        a = self.write("a.bin", b"aaa")
        code, out, _ = self.run_cli("validate", "--manifest", self.manifest([record("a", "a.bin", a)]),
                                    "--slide-root", str(self.root))
        self.assertEqual(code, 0)
        self.assertIn("schema validation: NOT RUN", out)

    def test_exit_1_on_errors(self):
        self.write("a.bin", b"aaa")
        code, out, _ = self.run_cli("validate", "--manifest", self.manifest([record("a", "a.bin", b"no")]),
                                    "--slide-root", str(self.root))
        self.assertEqual(code, 1)
        self.assertIn("HASH_MISMATCH", out)

    def test_records_key(self):
        a = self.write("a.bin", b"aaa")
        code, _, _ = self.run_cli("validate", "--manifest", self.manifest({"slides": [record("a", "a.bin", a)]}),
                                  "--slide-root", str(self.root), "--records-key", "slides")
        self.assertEqual(code, 0)

    def test_exit_2_when_cannot_run(self):
        self.assertEqual(self.run_cli("validate", "--manifest", "/no/such.json", "--slide-root", str(self.root))[0], 2)
        self.assertEqual(self.run_cli("validate", "--manifest", self.manifest({"x": 1}),
                                      "--slide-root", str(self.root))[0], 2)
        self.assertEqual(self.run_cli("validate", "--manifest", self.manifest([]),
                                      "--slide-root", "/no/such/dir")[0], 2)


if __name__ == "__main__":
    unittest.main()
