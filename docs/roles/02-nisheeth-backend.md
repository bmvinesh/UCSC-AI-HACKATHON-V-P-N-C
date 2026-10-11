# Dev 2: Nisheeth — backend, persistence, local sessions

Own the modular FastAPI app boundary, validated routes and SQLite state. Writable files: `app/routes/**`, `app/persistence/**`, `app/services/scenarios.py`, `app/session.py`, `app/main.py`, `app/settings.py`, API/persistence tests. Read Hour 1 DTOs and coordinate executor inputs with Vinesh.

## Deliver in order

1. Translate frozen schema to generated/imported validated types; provision SQLite WAL/migrations, session/job/result/cache/idempotency tables and indexed access.
2. Implement local opaque sessions and ownership checks; no account/password/OAuth infrastructure. Pages uses a browser engine, not these sessions.
3. Create capability/case/job/result routes and typed Problems. Scenario/explanation POST validates and inserts an idempotent job atomically, then returns 202 immediately.
4. Implement Vinesh's `JobStore`/`ResultCache` port over SQLite (atomic claim, lease columns, single-transaction completion, cancel of queued jobs, `fail_interrupted`) and pass his contract suite. Map `APP_*` settings to his config dataclasses and start/stop `make_supervisor` in lifespan. Snapshot the case or stored result into job payloads at admission. One API worker initially.
5. Load the release index with `load_release` (case catalogs into `cases`, per-engine Capabilities with degraded reasons). Call `admission_check` before admission instead of re-encoding its rules.
6. Implement tests for idempotency mismatch/replay, transaction rollback, session isolation, queue full, missing artifact, interruption and concurrent reads/writes.

## Guardrails

No numerical/model/LLM work inside routes or DB repository. Do not modify training columns, physics, frontend or generated files by hand. Settings validate endpoint/model ID/resource limits; no token literals or full-env logging. Never turn missing source data into fabricated patient records. Unexpected faults return typed errors and trace logs; expected model/chat degradation is explicit.

Vinesh owns job policy and the port definition; you own its SQLite implementation and lifespan wiring. The port is in `docs/CONTRACTS.md`; changes go through both of you. Chaandan owns root package lock/CI and contract generation; request additions rather than editing those concurrently.

## Acceptance

- [ ] Requests do not wait for GPU/Qwen; job creation/idempotency transactional.
- [ ] Session ownership, error shape and semantic bounds tested.
- [ ] Running jobs reconcile on restart; queued jobs cannot execute twice under the chosen process model.
- [ ] Local/mock development app starts without real GPU/weights.
- [ ] Shared schema and DB changes generate consistent consumers.

Handoff: migration/start command, exact route fixtures, real test results, executor injection contract, and settings needed from Praneeth.
