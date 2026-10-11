"""Timing and memory readings with the source of every number attached.

A reading whose value is None was not measured; `note` says why. Nothing here
estimates, and nothing here imports the web framework, the database or a model.
"""
from __future__ import annotations

import json
import statistics
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable

MEMINFO = Path("/proc/meminfo")
KIB = 1024


@dataclass(frozen=True)
class Reading:
    name: str
    value: float | None
    unit: str
    source: str
    note: str = ""


@dataclass(frozen=True)
class Timing:
    name: str
    cold_seconds: float
    warm_median_seconds: float | None
    warm_repeats: int
    device_synchronized: bool


def time_call(name: str, call: Callable[[], object], *, warm_repeats: int = 5,
              synchronize: Callable[[], None] | None = None) -> Timing:
    """Time the first (cold) call, then the median of `warm_repeats` further calls.

    Pass `synchronize` (for CUDA, `torch.cuda.synchronize`) so queued device work is
    inside the timed region; without it a GPU timing only measures the launch.
    """
    def once() -> float:
        start = time.perf_counter()
        call()
        if synchronize is not None:
            synchronize()
        return time.perf_counter() - start

    cold = once()
    warm = [once() for _ in range(warm_repeats)]
    return Timing(name, cold, statistics.median(warm) if warm else None, warm_repeats, synchronize is not None)


def _meminfo_bytes(field: str, meminfo: Path) -> Reading:
    name = f"host_{field.lower()}"
    try:
        for line in meminfo.read_text().splitlines():
            key, _, rest = line.partition(":")
            if key == field:
                return Reading(name, float(int(rest.split()[0]) * KIB), "bytes", str(meminfo))
    except OSError as error:
        return Reading(name, None, "bytes", str(meminfo), f"not measured: {error}")
    return Reading(name, None, "bytes", str(meminfo), f"not measured: no {field} field")


def _torch_readings() -> list[Reading]:
    names = ("torch_cuda_allocated", "torch_cuda_reserved", "torch_cuda_peak_allocated")
    try:
        import torch
    except ImportError:
        return [Reading(n, None, "bytes", "torch.cuda", "not measured: torch is not installed") for n in names]
    if not torch.cuda.is_available():
        return [Reading(n, None, "bytes", "torch.cuda", "not measured: CUDA is not available") for n in names]
    values = (torch.cuda.memory_allocated(), torch.cuda.memory_reserved(), torch.cuda.max_memory_allocated())
    # Counts this process's PyTorch allocations only. Other processes, such as the LLM runtime, are not included.
    return [Reading(n, float(v), "bytes", "torch.cuda (this process only)") for n, v in zip(names, values)]


def memory_snapshot(meminfo: Path = MEMINFO) -> list[Reading]:
    """Host memory from /proc/meminfo and this process's PyTorch CUDA memory.

    The GX10 shares one memory pool between CPU and GPU, and its driver reports no
    separate GPU total, so host MemAvailable is the figure that shows mixed-load headroom.
    """
    return [_meminfo_bytes("MemTotal", meminfo), _meminfo_bytes("MemAvailable", meminfo), *_torch_readings()]


def write_report(path: Path, *, label: str, timings: list[Timing], readings: list[Reading]) -> None:
    """Write one JSON evidence file. Unmeasured readings stay in it, marked as such."""
    path.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "label": label,
        "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "timings": [asdict(t) for t in timings],
        "readings": [asdict(r) for r in readings],
        "not_measured": [r.name for r in readings if r.value is None],
    }
    path.write_text(json.dumps(report, indent=2) + "\n")
