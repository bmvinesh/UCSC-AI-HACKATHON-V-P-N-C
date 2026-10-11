"""Tests for app.telemetry. Run from the repo root: .venv/bin/python -m unittest discover tests/hardware"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.telemetry import memory_snapshot, time_call, write_report  # noqa: E402


class TimeCallTest(unittest.TestCase):
    def test_cold_call_is_separate_from_warm_calls(self):
        calls = []
        timing = time_call("probe", lambda: calls.append(1), warm_repeats=4)
        self.assertEqual(len(calls), 5)
        self.assertEqual(timing.warm_repeats, 4)
        self.assertGreaterEqual(timing.cold_seconds, 0)
        self.assertIsNotNone(timing.warm_median_seconds)
        self.assertFalse(timing.device_synchronized)

    def test_synchronize_runs_inside_every_timed_call(self):
        order = []
        timing = time_call("probe", lambda: order.append("call"), warm_repeats=1, synchronize=lambda: order.append("sync"))
        self.assertEqual(order, ["call", "sync", "call", "sync"])
        self.assertTrue(timing.device_synchronized)

    def test_no_warm_repeats_reports_no_warm_median(self):
        self.assertIsNone(time_call("probe", lambda: None, warm_repeats=0).warm_median_seconds)

    def test_a_failing_call_raises_instead_of_producing_a_timing(self):
        with self.assertRaises(ZeroDivisionError):
            time_call("probe", lambda: 1 / 0)


class MemorySnapshotTest(unittest.TestCase):
    def test_host_memory_is_read_in_bytes_with_its_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            meminfo = Path(tmp) / "meminfo"
            meminfo.write_text("MemTotal:       1000 kB\nMemFree:         10 kB\nMemAvailable:    250 kB\n")
            readings = {r.name: r for r in memory_snapshot(meminfo)}
        self.assertEqual(readings["host_memtotal"].value, 1000 * 1024)
        self.assertEqual(readings["host_memavailable"].value, 250 * 1024)
        self.assertEqual(readings["host_memavailable"].source, str(meminfo))

    def test_a_missing_source_is_not_measured_rather_than_zero(self):
        readings = {r.name: r for r in memory_snapshot(Path("/nonexistent/meminfo"))}
        self.assertIsNone(readings["host_memavailable"].value)
        self.assertIn("not measured", readings["host_memavailable"].note)

    def test_every_reading_names_a_source(self):
        for reading in memory_snapshot():
            self.assertTrue(reading.source)
            self.assertTrue(reading.value is not None or "not measured" in reading.note)


class WriteReportTest(unittest.TestCase):
    def test_report_lists_what_was_not_measured(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "nested" / "report.json"
            write_report(path, label="unit", timings=[time_call("probe", lambda: None, warm_repeats=1)],
                         readings=memory_snapshot(Path("/nonexistent/meminfo")))
            report = json.loads(path.read_text())
        self.assertEqual(report["label"], "unit")
        self.assertEqual(report["timings"][0]["name"], "probe")
        self.assertIn("host_memtotal", report["not_measured"])


if __name__ == "__main__":
    unittest.main()
