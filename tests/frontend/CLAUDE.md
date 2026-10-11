# tests/frontend/ (Praneeth-owned frontend tests)

Before and after every change under this directory, re-read the active slice, boundaries and invariants in [web/PRANEETH_PLAN.md](../../web/PRANEETH_PLAN.md), then run `scripts/gx10/change_gate.sh` from the repo root. A failing gate means stop and fix the cause; never bypass it or edit it to pass.

Cross-engine checks live here; unit tests sit beside the code in `web/src`. Run both with `npm --prefix web test`.
