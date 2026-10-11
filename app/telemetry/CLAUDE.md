# app/telemetry/ (Praneeth-owned measurement code)

Before and after every change under this directory, re-read the active slice, boundaries and invariants in [web/PRANEETH_PLAN.md](../../web/PRANEETH_PLAN.md), then run `scripts/gx10/change_gate.sh` from the repo root. A failing gate means stop and fix the cause; never bypass it or edit it to pass.

This package measures and records; nothing depends on it. It adds no route and imports no FastAPI, database or model code. A value that was not measured is reported as not measured, never estimated.
