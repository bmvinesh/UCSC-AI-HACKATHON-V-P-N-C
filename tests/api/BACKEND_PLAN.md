# Dev 2 operating plan: Nisheeth (backend, persistence, local sessions)

This is the living plan for Nisheeth's Dev 2 role in OncoGrowth. It records what to build, in what order, how each change is checked, and what is finished with evidence. Every change set passes the [pre-change gate](#3-pre-change-gate) and the [post-change verification](#4-post-change-verification) and gets a [change-log](#12-change-log) entry. The [guard](#23-enforcement) checks the mechanical parts on every edit and at the end of every turn.

- Owner: **Nisheeth (Dev 2)** | Branch: `claude/confident-cannon-hjek6r` (see Q14) | Scope: breast cancer, paclitaxel, contract schema version `1`
- Contract baseline commit: `7d6cb32` (PR #1 boundary redesign merged)
- Contract fingerprint: `9529ffd33ae3`
- Plan revision: 1 (2026-10-11)

The fingerprint covers the normative files in [§2.4](#24-normative-inputs). `python3 tests/api/nisheeth_guard.py fingerprint` prints the current value.

**Precedence:** explicit written team decisions, then [CLAUDE.md](../../CLAUDE.md), then [CONTRACTS.md](../../docs/CONTRACTS.md) with `contracts/*.json`, then the [ownership registry](../../docs/roles/README.md), then my [role contract](../../docs/roles/02-nisheeth-backend.md), then the [boundary redesign](../../docs/proposals/2026-10-10-boundary-redesign.md), [master plan](../../docs/MASTER_IMPLEMENTATION_PLAN.md), [workflow](../../docs/GIT_AND_AGENT_WORKFLOW.md) and [runbook](../../docs/DEMO_RUNBOOK.md), then this plan. When this plan disagrees with a source, the source wins and this plan gets fixed.

**Next up:** N1 Hour-1 freeze answers (Q1-Q9) and N2 dependency request to Chaandan; then N3 settings and N4 persistence foundation.

## 1. Mission and non-goals

**Mission:** a local FastAPI monolith boundary that validates every request, persists sessions, jobs, results, cache and idempotency in SQLite atomically, returns 202 for heavy work without waiting on GPU or Qwen, implements Vinesh's `JobStore`/`ResultCache` port over SQLite, and wires the app lifespan. It never fabricates data and never hides a fault as a success.

**Non-goals (owned by others):**

- Vinesh: job policy (when to claim, renew, cancel, fail), the port definition, the supervisor, `admission_check`, `load_release`, cache keys, ONNX graphs, Qwen, explanation text, case catalogs, templates.
- Chaandan: schemas and generated clients (`app/generated/**`), `pyproject.toml`/lockfiles/CI, `.env.example`, `docs/**`, release index, synthetic catalog, Pages.
- Praneeth: `web/**`, `app/telemetry/**`, GX10 operation and hardware windows, the Qwen endpoint and model ID discovery.
- Joint: schema meaning. I propose; Chaandan generates after the owners agree.
- Nobody: numerical formulas in Python handlers, clinical claims, dosing, treatment recommendations.

## 2. Boundary

### 2.1 Write tiers

| Tier | Paths | Guard behavior |
| --- | --- | --- |
| Owned | `app/routes/**`, `app/persistence/**`, `app/services/scenarios.py`, `app/session.py`, `app/main.py`, `app/settings.py`, `tests/api/**`, `tests/persistence/**` | Allowed |
| Guard | `tests/api/nisheeth_guard.py`, `tests/api/test_nisheeth_guard.py`, `.claude/settings.local.json` | Asks the human, so the guard cannot quietly weaken itself |
| Needs assignment | `app/__init__.py`, `app/services/__init__.py` (Q10) | Asks the human; record the team's assignment in §12 |
| Generated | `app/generated/**`, `web/src/generated/**` | Denied; request a schema change from Chaandan |
| Everyone else's | `app/jobs/**`, `app/integrations/**`, `app/services/explanations.py`, `app/telemetry/**`, `modeling/**`, `prompts/**`, `data/**`, `artifacts/**`, `web/**`, `contracts/**`, `docs/**`, `scripts/**`, other `tests/**`, root config, `CLAUDE.md`, `.claude/settings.json`, any unlisted path | Denied; use §8 |
| Denied types (any path) | `.env*` except `.env.example`; keys and certificates; weights (`*.pt`, `*.pth`, `*.ckpt`, `*.safetensors`, `*.gguf`, `*.onnx`); raw/array data (`*.nii*`, `*.dcm`, `*.npz`); databases (`*.db`, `*.sqlite*`); credential-like content | Denied |

Shared edges:

- `.env.example` is Chaandan's, but its `APP_*` keys mirror my `app/settings.py`. New keys go to him as a request (Q9); secret values stay empty.
- `app/persistence` implements Vinesh's port; the Protocol in `app/jobs/ports.py` and the contract suite `tests/jobs/jobstore_contract.py` are his. I run his suite, I never edit it.
- `app/telemetry/**` is Praneeth's code behind my API wiring: `main.py` includes his router by an explicit import once it exists.

### 2.2 Action limits

- Human authorization is required for pushes outside this branch, PRs, merges into `main`, messages to teammates and anything public. Claude drafts; the human sends.
- No force push, history rewrite, or stash/reset/clean of anyone's work. Leave `origin/claude/dreamy-brahmagupta-i6bey7` alone (retired OncoVision data-prep scope, Q15).
- No GX10 runtime changes, restarts or benchmarks outside Praneeth's scheduled window.
- No secrets, raw data, weights or runtime databases in git, logs or screenshots.

### 2.3 Enforcement

| Mechanism | What it does |
| --- | --- |
| [`tests/api/nisheeth_guard.py`](nisheeth_guard.py) | Standard-library guard. Its tier constants mirror §2.1; change both together. |
| `python3 tests/api/nisheeth_guard.py audit [--base origin/main]` | Run before every commit. **FAIL** on out-of-boundary, generated or denied-type paths, owned changes without a plan update, credential-like text, files over 1 MB, or a recorded fingerprint that differs from the working tree. **WARN** on guard or needs-assignment changes and on upstream contract drift. |
| `python3 tests/api/nisheeth_guard.py fingerprint` | Prints working-tree, HEAD, `origin/main` and recorded fingerprints. |
| `python3 -m unittest discover -s tests/api -p test_nisheeth_guard.py` | Guard tests: tiers, path handling, secret patterns, hook decisions, drift and plan-update rules on a throwaway repo. |
| `.claude/settings.local.json` (personal; excluded through `.git/info/exclude`) | `PreToolUse` on Edit/Write/NotebookEdit denies forbidden, generated, denied-type and credential-bearing writes and asks on guard and needs-assignment files; the guard exits 2 (blocks) if it crashes. `UserPromptSubmit` injects the re-read reminder, branch and tree state, **Next up** and drift warnings. `Stop` audits the working tree once per turn and blocks the stop while problems remain. |
| `CLAUDE.md` pointers in `app/routes/`, `app/persistence/`, `tests/api/`, `tests/persistence/` | Committed fallback: a session that reads files there without the hooks is told to read this plan and run the audit. |

Known gaps: shell writes bypass `PreToolUse`, so the `Stop` audit catches them at the end of the turn. Hooks load when a session starts. On Windows replace `python3` with `py -3`.

Hook configuration to recreate in a new clone, worktree or cloud container:

```json
{
  "hooks": {
    "PreToolUse": [{ "matcher": "Edit|Write|NotebookEdit", "hooks": [{ "type": "command", "command": "python3 \"$CLAUDE_PROJECT_DIR/tests/api/nisheeth_guard.py\" hook-pre-tool", "timeout": 15, "onFailure": "block" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "python3 \"$CLAUDE_PROJECT_DIR/tests/api/nisheeth_guard.py\" hook-prompt", "timeout": 15 }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "python3 \"$CLAUDE_PROJECT_DIR/tests/api/nisheeth_guard.py\" hook-stop", "timeout": 30 }] }]
  }
}
```

### 2.4 Normative inputs

`CLAUDE.md`, `.env.example`, `contracts/**`, `docs/CONTRACTS.md`, `docs/DATA_AND_MODEL.md`, `docs/DEMO_RUNBOOK.md`, `docs/GIT_AND_AGENT_WORKFLOW.md`, `docs/MASTER_IMPLEMENTATION_PLAN.md`, `docs/proposals/**`, `docs/roles/**`, and Vinesh's port `app/jobs/ports.py` with its contract suite `tests/jobs/jobstore_contract.py` (fingerprinted before they exist, so their arrival forces a reconciliation).

When the fingerprint changes, whether from a teammate's merge or a port change:

1. Read `git diff <baseline commit> -- <paths above>`.
2. Update §5, §6, §7 and §13 where affected.
3. Record the new baseline commit and fingerprint, then bump the plan revision.
4. Log the reconciliation in §12.

## 3. Pre-change gate

Run all six before any change.

1. **Contracts current.** After `git fetch`, the prompt hook or `fingerprint` shows no drift. If it does, reconcile per §2.4 first.
2. **Task identified.** The change maps to a §5 ID. If none fits, add the row first. Only one functional slice is in progress at a time.
3. **Paths in bounds.** Every target is Owned. Needed changes in other owners' paths go through §8.
4. **Inputs available.** The §7 inputs the task needs exist. If one is missing, mark the task `blocked: <exact item>` and switch to an unblocked task. Never write a local stand-in for another owner's DTO, function or file.
5. **Slice written down.** Target files, pseudocode, contract version and sample payload, error and cancel behavior, verification command, and expected diff size, as the workflow doc requires. Put these in the task notes or the §12 entry.
6. **Others' work safe.** `git status` shows nothing I would overwrite that I did not write. Never stash or reset another person's edits.

## 4. Post-change verification

Run all seven before committing.

1. **Audit passes.** `python3 tests/api/nisheeth_guard.py audit` prints `Result: PASS`.
2. **Task checks ran.** The slice's verification command was executed (normally `python3 -m pytest tests/api tests/persistence`, plus the JobStore contract suite once it exists). The command and observed result go in §12. Anything not run is written as "not run".
3. **Boundaries held.** Routes only parse, delegate and shape; no SQL outside `app/persistence`; no numerics, ONNX, torch or Qwen imports anywhere in my paths; admission rules come from `admission_check`, not re-encoded.
4. **Async held.** POST routes do one write transaction and a non-blocking wake, then return 202. No `BackgroundTasks`, no awaiting the supervisor.
5. **Honesty held.** No fabricated cases or results, no relabeled `source`/`evidence`, no weakened expectation, schema bound or fixture, no swallowed exception turned into success.
6. **Plan updated.** §5 status and a §12 entry are current. Update the §2.4 fingerprint if normative files changed, and run the guard tests if the guard changed.
7. **Micro-commit.** Stage named paths only (never `git add .`), write a concrete message, commit to my branch. Push only to my branch.

## 5. Work breakdown

Status values: `todo`, `doing`, `blocked: <missing input>`, `done` (requires a §12 entry with evidence). Windows are hours from kickoff per [master plan §5](../../docs/MASTER_IMPLEMENTATION_PLAN.md#5-schedule-and-exit-gates). Numbers in parentheses are the role contract's "Deliver in order" items.

| ID | Task | Deliverable (owned paths) | Window | Depends on | Status | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| N0 | Plan and enforcement system | this plan, `tests/api/nisheeth_guard.py`, `tests/api/test_nisheeth_guard.py`, `CLAUDE.md` pointers, local hooks | H0 | none | done | Guard tests pass; hook entry points pipe-tested (§12) |
| N1 | Hour-1 freeze answers | §13 rows Q1-Q9 resolved; CONTRACTS.md checklist lines "Route/status/error/idempotency" and "Persistence tables/migration, JobStore port and lanes" acknowledged | H0.25-1 | Chaandan, Vinesh, Praneeth | todo | Each answer recorded in §13 with who agreed; contract changes go through Chaandan |
| N2 | Dependency and tooling request (1) | Request R1 (§8) | H0.25-1 | Chaandan's C4 | todo | `fastapi`, `uvicorn`, `pydantic` 2, `pydantic-settings`, `sqlalchemy` 2, `alembic`; test: `pytest`, `httpx`; pytest config sees `app` on the path |
| N3 | Settings (1) | `app/settings.py`, `tests/api/test_settings.py` | H1-2 | N2; Vinesh's config dataclasses for the mapping functions | todo | All `APP_*` keys of §6.8 validated at startup with readable errors; Qwen URL loopback-only; `SecretStr` never in `repr`, logs or errors; `VITE_*` lines in `.env` ignored; mapping to `ExecutorConfig`/`QwenConfig`/`CacheConfig` tested |
| N4 | Persistence foundation (1) | `app/persistence/{db,tables,codec,errors,migrate}.py`, `app/persistence/migrations/**`, `tests/persistence/test_migrations.py` | H1-2 | N2 | todo | Empty file DB upgrades to head; every CONTRACTS.md table and column exists with the §6.5 constraints and indexes; WAL, `foreign_keys`, `busy_timeout` verified on a live connection; write transactions use `BEGIN IMMEDIATE` |
| N5 | App skeleton and Problems (3) | `app/main.py` (`create_app`, lifespan, `run`), `app/routes/{__init__,deps,problems,health}.py`, `tests/api/test_problems.py` | H2-4 | N3, N4; generated `Problem` model (Chaandan C3) | todo | `python -m app.main` starts one worker on the configured loopback port; every error (422, 404, 405, 409, 429, 503, 500) is a Problem with `trace_id` and `X-Trace-Id`; 422 never echoes input values; 500 logs the traceback with the trace id and returns no internals |
| N6 | Local sessions (2) | `app/session.py`, `app/persistence/sessions.py`, `app/routes/sessions.py`, `tests/api/test_sessions.py` | H2-4 | N4, N5, Q2, Q3 | todo | Cookie is HttpOnly, SameSite=Strict, Path `/api`, short-lived, Secure when configured; DB stores only the token's sha256; missing or expired session and disallowed origin give the agreed Problems; another session's objects are 404 |
| N7 | Release, cases, capabilities (5) | lifespan release loading, `app/persistence/cases.py`, `app/routes/{cases,capabilities}.py`, capabilities derivation in `app/services/scenarios.py`, tests | H4-8 | Vinesh's `load_release`; fixture release index and synthetic catalog (Chaandan/Vinesh); Q6 | todo | Catalogs replace `cases` in one transaction at startup; a missing or hash-failing index starts the app with empty cases, engines unavailable and `degraded_reasons`; capabilities match the release per engine; nothing is fabricated |
| N8 | Admission (3, 4) | `app/persistence/admission.py`, `ScenarioService.submit_scenario`/`submit_explanation`, `app/routes/{scenarios,explanations}.py` POSTs, tests | H4-8 | N6, N7; `admission_check`; generated DTOs; Q1, Q5, Q7, Q11 | todo | Both POSTs require `Idempotency-Key`; idempotency row and job insert are one transaction; replay returns the same job (202), mismatch 409, queue full 429 with `Retry-After` per lane; payload holds the snapshot (`{request, case}` or `{request, result, session_scope}`); 202 returned without touching the supervisor beyond a non-blocking `wake` |
| N9 | Reads and cancel (3) | `app/persistence/{jobs,results}.py`, `app/routes/jobs.py`, GETs in `scenarios.py`/`explanations.py`, tests | H6-10 | N8 | todo | Job, result and explanation reads are session-scoped (404 otherwise); cancel: queued -> cancelled at once, running -> `cancel_requested`, terminal -> unchanged, always 202 with the current record |
| N10 | SQLite `JobStore` and `ResultCache` (4) | `app/persistence/{job_store,result_cache}.py`, `tests/persistence/test_job_store_contract.py` (runs Vinesh's suite), own concurrency tests | H4-12 | `app/jobs/ports.py` and `tests/jobs/jobstore_contract.py`; Q4, Q12 | todo | Vinesh's contract suite passes on SQLite; N threads claiming M jobs claim each exactly once; lease-less writes are logged no-ops; `complete` is one transaction; cache honors TTL, size budget and exact keys |
| N11 | Supervisor wiring (4) | lifespan in `app/main.py`, settings mapping completed, `tests/api/test_lifespan.py` | H8-12 | N10; `make_supervisor`; config dataclasses | todo | Startup order of §6.3; running jobs from a previous process end `failed/INTERRUPTED`; queued jobs survive restart and run once; shutdown stops the supervisor with a bounded timeout |
| N12 | Resilience suite (6) | tests across `tests/api/**`, `tests/persistence/**` | H12-18 | N8-N11 | todo | All §10 rows have a passing test with the command and output in §12 |
| N13 | Integration | static `web/dist` mount, telemetry router wiring, Vite proxy agreement, smoke with Chaandan, GX10 run in Praneeth's window | H12-18 | Praneeth's build and telemetry; Chaandan's smoke | todo | Runbook local steps 1-7 pass against my API, observed on the target machine, with results recorded |
| N14 | Handoff | §11 handoff | End | All | todo | Matches §11 |

**Gates:** H4: N3-N6 merged (app starts, health, sessions, Problem shape). H8: N7-N9 with Vinesh's stub supervisor (POST 202 -> job visible -> result readable). H12: N10-N11 (contract suite green on SQLite; real supervisor wired). H18: N12-N13.

## 6. Design

### 6.1 Principles applied

| Principle | Applied as |
| --- | --- |
| Single responsibility | Routes parse/delegate/shape; `services/scenarios.py` coordinates; `persistence` owns SQL and transactions; `main.py` only composes |
| Dependency inversion | `persistence` implements Vinesh's `JobStore`/`ResultCache` Protocols; services depend on repository interfaces passed in, not on globals |
| Explicit composition root | `create_app(settings, *, supervisor_factory, release_loader, clock)` builds one frozen `AppContainer`; routes get it through typed `Depends`. No service locator, no module-level singletons |
| Single source of truth | Domain rules only in `admission_check`; DTO shapes only in generated models; versions only in the release index; config only in `Settings` |
| Fail fast, degrade explicitly | Invalid settings stop startup with a readable message; missing artifacts degrade with `degraded_reasons`; unexpected faults are typed 500s |
| Atomicity and idempotency | Every state change is one `BEGIN IMMEDIATE` transaction with conditional `UPDATE ... WHERE state = ...`; POSTs are idempotent per session and key |
| Least privilege | Loopback bind, HttpOnly cookies, hashed session tokens, ownership on every read, no secret in logs |
| YAGNI | No accounts, no CORS (same origin via Vite proxy), no multi-worker claim protocol, no session cleanup job in v1 |

### 6.2 Module map

Dependency rule: `routes -> services -> persistence`; `main` wires all; `persistence` imports only stdlib, SQLAlchemy, generated DTOs and `app.jobs.ports` types. Nothing of mine imports `modeling`, `onnxruntime`, `torch` or a Qwen client.

| Module | Responsibility |
| --- | --- |
| `app/settings.py` | `Settings` (pydantic-settings, prefix `APP_`), validators, `executor_config()`, `qwen_config()`, `cache_config()` mapping to Vinesh's dataclasses |
| `app/session.py` | Token creation, `sha256` session id, cookie flags, origin check. No SQL |
| `app/main.py` | `create_app`, lifespan (§6.3), `run()` (uvicorn, `workers=1`, settings host/port), `__main__` |
| `app/routes/__init__.py` | `api_router` under `/api/v1` |
| `app/routes/deps.py` | `get_container`, `require_session`, `require_idempotency_key`, `trace_id` |
| `app/routes/problems.py` | `ApiProblem` exception, handlers, trace-id middleware, status mapping (§6.7) |
| `app/routes/{health,capabilities,sessions,cases,scenarios,jobs,explanations}.py` | One file per resource; each handler is a few lines |
| `app/services/scenarios.py` | `ScenarioService`: `submit_scenario`, `submit_explanation`, `capabilities`. Calls `admission_check`, builds snapshots, calls the admission unit, wakes the lane |
| `app/persistence/db.py` | Engine factory, connection pragmas, `read()`/`write()` transaction scopes, busy -> `StoreBusy` |
| `app/persistence/tables.py` | SQLAlchemy Core tables, CHECK constraints, indexes (§6.5) |
| `app/persistence/migrate.py` + `migrations/` | Programmatic Alembic upgrade to head (no root `alembic.ini`), revision check |
| `app/persistence/codec.py` | Canonical JSON (sorted keys, compact, `allow_nan=False`), `request_hash`, UTC timestamps |
| `app/persistence/errors.py` | `NotFound`, `IdempotencyConflict`, `QueueFull(retry_after_s)`, `StoreBusy` |
| `app/persistence/sessions.py`, `cases.py`, `jobs.py`, `results.py` | Small repositories: create/lookup session; replace/list/get cases; owned job read and cancel; owned result and explanation reads |
| `app/persistence/admission.py` | The one admission unit of work (§6.4) |
| `app/persistence/job_store.py`, `result_cache.py` | SQLite implementations of the port (§6.6) |

### 6.3 Composition root and lifespan

```text
create_app(settings=None, *, supervisor_factory=make_supervisor, release_loader=load_release, clock=utc_now):
  settings = settings or Settings()                 # fail fast on invalid config, no secret echo
  lifespan:
    configure logging (trace-id filter; never cookies, auth headers, env, question text)
    engine = make_engine(settings.database_path, busy_timeout)   # WAL, FK, busy_timeout
    migrate_to_head(engine)
    release = release_loader(settings.release_index_path)        # missing/bad index -> degraded release, no crash
    cases.replace_all(release catalogs)                          # one transaction; jobs hold snapshots, so safe
    store, cache = SqliteJobStore(engine, clock), SqliteResultCache(engine, clock, budget)
    store.fail_interrupted(clock())                              # before any claim (Q4)
    supervisor = supervisor_factory(settings.executor_config(), store, cache, release, settings.qwen_config())
    supervisor.start()
    app.state.container = AppContainer(settings, engine, release, store, cache, supervisor, clock)  # frozen
    yield
    supervisor.stop(timeout_s=settings.shutdown_timeout_seconds); engine.dispose()
  include api_router; include telemetry router (explicit import, when Praneeth ships it)
  mount web/dist at "/" if configured and present (after the API, never shadowing /api)
```

Tests pass a fake `supervisor_factory` and a fake `release_loader`, so the app starts without GPU, weights or Vinesh's code.

### 6.4 Admission flow (POST scenarios and explanations)

```text
route: body -> generated ScenarioRequest (422 on shape) ; session = require_session ; key = require_idempotency_key
service.submit_scenario(session, key, req, trace_id):
  case = cases.get(req.case_id)                     or raise NotFound           # 404
  problem = admission_check(req, case, release)     -> raise ApiProblem(problem with this trace_id)   # 422 / 503
  payload = {request: req, case: case}               # snapshot (C22)
  job, replayed = admission.admit(session, key, request_hash("/api/v1/scenarios", req),
                                  kind="scenario", lane="compute", payload, capacity)
  if not replayed: supervisor.wake("compute")       # non-blocking; it polls anyway
  return job                                        # 202 JobRecord

service.submit_explanation(session, key, req, trace_id):
  result = results.get_owned(session, req.result_id) or raise NotFound
  payload = {request: req, result: result, session_scope: session.id}   # lane "io"

admission.admit(...)  # one BEGIN IMMEDIATE transaction
  row = idempotency[(session, key)]
  if row: same hash -> return (current job, replayed=True)  else raise IdempotencyConflict   # 409
  if count(jobs in lane with state in queued|running) >= capacity: raise QueueFull          # 429 (Q7)
  insert job(queued, progress 0, cancel_requested 0, attempt 0) ; insert idempotency(response = job)
```

The replay check runs before the capacity check, so a replay is never rejected as queue-full. Any exception rolls back both inserts.

### 6.5 Data model (one migration, `0001_initial`)

Exactly the CONTRACTS.md tables. Timestamps are UTC text in a fixed-width RFC3339 form so they sort; JSON columns hold canonical JSON of validated DTOs and are re-validated through the generated models on read.

| Table | Key and constraints | Indexes |
| --- | --- | --- |
| `sessions(id, created_at, expires_at)` | `id` = sha256 hex of the cookie token (raw token never stored) | `expires_at` |
| `cases(id, payload_json, source_hash)` | `source_hash` = catalog sha256 from the release index | PK |
| `jobs(id, session_id, kind, lane, state, payload_json, progress, result_id, error_json, cancel_requested, lease_owner, lease_expires_at, attempt, created_at, updated_at)` | FK `session_id`; CHECKs: enums; `(kind, lane)` in {(scenario, compute), (explanation, io)}; `0 <= progress <= 1`; succeeded => result_id set, progress 1, no error; failed => error set, no result; queued/running/cancelled => no result; queued => no lease, no error; running => lease set | `(lane, state, created_at)`, `(session_id, created_at)`, `(state, lease_expires_at)` |
| `results(id, session_id, payload_json, model_version, created_at)` | FK `session_id` | `session_id` |
| `explanations(id, session_id, result_id, payload_json, created_at)` | FK `session_id`, FK `result_id -> results` | `session_id`, `result_id` |
| `cache(key, payload_json, source, created_at, expires_at)` | `expires_at` null = immutable scenario entry | `expires_at`, `created_at` |
| `idempotency(session_id, key, request_hash, response_json, created_at)` | composite PK `(session_id, key)`; FK `session_id` | PK |

SQLite specifics: `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout` from settings, `synchronous=NORMAL` on every connection; writes use `BEGIN IMMEDIATE` (SQLAlchemy's documented pysqlite transaction recipe) so writers never deadlock on lock upgrade; reads use deferred transactions and never block the writer under WAL. Sync SQLAlchemy Core with `def` endpoints (FastAPI threadpool). `UPDATE ... RETURNING` needs SQLite >= 3.35 (this container: 3.45.1; GX10: Q18).

### 6.6 JobStore mechanics (policy stays in Vinesh's supervisor)

| Method | One transaction doing |
| --- | --- |
| `claim_next(lane, worker, lease_s)` | `UPDATE jobs SET state='running', lease_owner, lease_expires_at, attempt=attempt+1 WHERE id=(oldest queued, not cancel-requested, in lane) AND state='queued' RETURNING ...` -> `Claim` or `None` |
| `renew(job_id, worker, lease_s)` | Extend lease only if the guard holds; `False` means lease lost, abandon |
| `progress(job_id, worker, value)` | Monotonic progress under the guard; returns `cancel_requested` (and `True` if the lease is lost, Q12) |
| `complete(job_id, worker, result)` | Guard; insert `results` or `explanations` row with the job's `session_id`; job -> succeeded, progress 1, `result_id`; lease cleared. Guard failure -> rollback, logged no-op |
| `fail(job_id, worker, problem)` | Guard; job -> failed with `error_json`; lease cleared |
| `confirm_cancelled(job_id, worker)` | Guard and `cancel_requested=1`; job -> cancelled |
| `fail_interrupted(now)` | Running jobs whose lease expired (and at startup, all running jobs, Q4) -> failed with Problem `INTERRUPTED`, retryable; returns the count; no retry |

Guard = `state='running' AND lease_owner=:worker AND lease_expires_at > :now`. A zombie worker can never overwrite a reconciled job. `ResultCache.get` ignores expired rows; `put` upserts and evicts oldest entries past `APP_CACHE_MAX_MB`; keys are opaque strings computed by Vinesh.

### 6.7 Error mapping

Every error is a `Problem` with the request's `trace_id`, also sent as `X-Trace-Id`. Messages never contain tokens, cookies, raw patient data or input values.

| Condition | Status | Problem code | Retryable |
| --- | --- | --- | --- |
| Body, path, query or header shape invalid (incl. missing `Idempotency-Key`) | 422 | `INVALID_INPUT` | no |
| `admission_check` -> out of domain | 422 | `OUT_OF_DOMAIN` | no |
| Case, job, result or explanation missing or owned by another session; unknown route | 404 | `NOT_FOUND` | no |
| Idempotency key reused with a different request | 409 | `INVALID_INPUT` (Q1) | no |
| Lane at capacity | 429 + `Retry-After` | `QUEUE_FULL` | yes |
| Engine unavailable in the release | 503 | `MODEL_UNAVAILABLE` | no |
| SQLite busy past `busy_timeout` | 503 + `Retry-After` | `DEPENDENCY_TIMEOUT` | yes |
| Missing or expired session cookie | 401 | `INVALID_INPUT` (Q2) | yes |
| Mutation from a disallowed `Origin` | 403 | `INVALID_INPUT` (Q2) | no |
| Anything unexpected | 500 | `INTERNAL` (traceback logged with trace id) | no |

### 6.8 Settings

All keys validated at startup; bounds are sanity limits, not hardware measurements. `api_key` is `SecretStr` and never logged.

| Key | Validation | Consumer |
| --- | --- | --- |
| `APP_BIND_HOST`, `APP_BIND_PORT` | loopback only (Q19); port 1-65535 | `run()` |
| `APP_DATABASE_PATH` | parent directory created at startup; outside tracked dirs | `db.py` |
| `APP_RELEASE_INDEX_PATH` | path | `load_release` |
| `APP_QWEN_BASE_URL`, `APP_QWEN_MODEL_ID`, `APP_QWEN_API_KEY` | URL empty or http(s) to a loopback host; model ID required when URL set; key optional | `QwenConfig` |
| `APP_QWEN_MAX_OUTPUT_TOKENS`, `APP_QWEN_TIMEOUT_SECONDS` | > 0 | `QwenConfig` |
| `APP_BREAKER_FAILURE_THRESHOLD`, `APP_BREAKER_COOLDOWN_SECONDS` | >= 1, > 0 | `QwenConfig` |
| `APP_JOB_QUEUE_CAPACITY` | >= 1, per lane | `ExecutorConfig`, admission |
| `APP_GPU_WORKERS`, `APP_IO_WORKERS`, `APP_JOB_LEASE_SECONDS` | >= 1, >= 1, > 0 | `ExecutorConfig` |
| `APP_CACHE_MAX_MB`, `APP_EXPLANATION_CACHE_TTL_SECONDS` | > 0 | `CacheConfig`, `SqliteResultCache` |
| `APP_SEED` | >= 0 | consumer to confirm (Q8) |
| Proposed (Q9): `APP_SESSION_TTL_SECONDS`, `APP_COOKIE_SECURE`, `APP_ALLOWED_ORIGINS`, `APP_DB_BUSY_TIMEOUT_MS`, `APP_QUEUE_RETRY_AFTER_SECONDS`, `APP_SHUTDOWN_TIMEOUT_SECONDS`, `APP_WEB_DIST_PATH` | typed with safe defaults | sessions, db, admission, lifespan |

## 7. Interfaces

**Consumed** (never re-implemented locally; if missing, the task is blocked):

| Input | Producer | Exact shape | Needed by | Status |
| --- | --- | --- | --- | --- |
| Generated Pydantic DTOs (`app/generated/**`) | Chaandan | from `contracts/domain.schema.json` v1 | N5-N9 | not yet |
| Semantic validators (job/result/case rules) | Chaandan (his D7) | one implementation per language | N8-N10 | not yet |
| `load_release(index_path) -> Release` | Vinesh | `Release.engines[e].available/.version/.reason`, verified catalogs | N7 | not yet |
| `admission_check(req, case, release) -> Problem \| None` | Vinesh | pure | N8 | not yet |
| `make_supervisor(cfg, store, cache, release, qwen) -> Supervisor` | Vinesh | `start()`, `stop(timeout_s)`, `wake(lane)` | N11 | not yet; stub promised |
| `app/jobs/ports.py`: `Lane`, `Claim`, `ScenarioJobPayload`, `ExplanationJobPayload`, `JobStore`, `ResultCache` | Vinesh | per CONTRACTS.md "Port" | N8, N10 | not yet |
| `ExecutorConfig`, `QwenConfig`, `CacheConfig` | Vinesh | per proposal §4.4 | N3, N11 | not yet |
| `tests/jobs/jobstore_contract.py` + `InMemoryJobStore` | Vinesh | parametrized test class | N10 | not yet |
| Fixture release index, synthetic catalog | Chaandan, Vinesh | `release-index.schema.json`, `CaseRecord[]` | N7, N12 | not yet |
| Python deps, pytest config | Chaandan | `pyproject.toml` | N2+ | not yet |
| Qwen endpoint and served model ID (local `.env`, never committed) | Praneeth | values only | N13 | not yet |
| Vite dev proxy for `/api`; telemetry router import path | Praneeth | config/module path | N13 | not yet |

**Provided:**

| Output | Consumers | Promise |
| --- | --- | --- |
| REST API per CONTRACTS.md table | Praneeth's `LocalApiEngine`, Chaandan's smoke | Generated DTOs only; Problems everywhere; 202 never waits on work |
| `SqliteJobStore`, `SqliteResultCache` | Vinesh's supervisor | Passes his contract suite; one transaction per state change |
| Start and migration commands | Everyone | `python -m app.main`; `python -m app.persistence.migrate` |
| Settings key list | Chaandan (`.env.example`), Praneeth (local values) | Changes go through §8 |
| Route fixtures (request/response samples) | Praneeth, Chaandan | Taken from passing tests, labeled synthetic |

## 8. Handoff and request protocol

A request names the owner and path, current behavior with a failing sample, requested behavior, a proposed interface example or patch, affected consumers and fixtures, and how to verify. Claude drafts; the human sends; the outcome goes in §12 and §13.

Drafted requests (not sent yet):

| ID | To | Request |
| --- | --- | --- |
| R1 | Chaandan | Add N2 dependencies to `pyproject.toml`; pytest path includes repo root; confirm Python version for CI and GX10 |
| R2 | Chaandan | Add the Q9 keys to `.env.example` with safe defaults (no secret values) |
| R3 | Chaandan | One line in `docs/roles/02-nisheeth-backend.md`: "Working plan: `tests/api/BACKEND_PLAN.md`" so sessions without hooks find it |
| R4 | Chaandan + all | Resolve Q1 (409 code), Q2 (401/403), Q3 (`/session` and `/health` bodies) in the contract |
| R5 | Vinesh | Answer Q4, Q5, Q6, Q7, Q8, Q11, Q12, Q13, Q20 |
| R6 | Praneeth | Vite dev proxy for `/api` (same origin, no CORS); telemetry router module path; Qwen values out of band |
| R7 | Team | Assign `app/__init__.py` and `app/services/__init__.py` (Q10) |

## 9. Guardrails

From CLAUDE.md, the role contract and CONTRACTS.md.

- No numerical, model or LLM work in routes, services or repositories; never import `modeling`, `torch`, `onnxruntime` or a Qwen client.
- Do not re-encode admission rules (call `admission_check`), compute cache keys (Vinesh's) or decide job policy (Vinesh's).
- POST job routes persist, queue and return 202 promptly. No inline training, inference, scraping or LLM call. No `BackgroundTasks` for durable work.
- Never turn missing source data into fabricated cases or results. A missing release degrades capabilities with reasons.
- Store DTOs exactly as produced; never relabel `source`, `evidence` or `band_kind`; cached results keep `origin_source`.
- Generated files are never hand-edited; no local duplicate DTOs; no casts that hide schema drift.
- No token literals, even placeholders; tests generate dummy secrets at runtime. Never log cookies, auth headers, the full environment or explanation question text.
- Sessions are local demo isolation, not patient authentication. Ownership failures are 404.
- One API worker; no Redis, Celery, microservices, hosted backend or new state library.
- Unexpected bugs stay typed and logged; "no 500 during judging" is a tested goal, not permission to suppress faults.
- Small diffs, named-path staging, micro-commits; Rule of 3 for bugs (§14).
- Never claim tests, migrations, GX10 runs or integrations passed without the run that shows them.

## 10. Test plan and acceptance

A box is checked only with a §12 evidence entry.

| Role acceptance item | Tests that prove it |
| --- | --- |
| [ ] Requests do not wait for GPU/Qwen; job creation/idempotency transactional | `test_post_returns_202_without_running_work` (blocking fake supervisor never invoked inline; latency measured, not assumed); `test_admission_rolls_back_both_rows`; `test_idempotent_replay_same_job`; `test_idempotency_mismatch_409` |
| [ ] Session ownership, error shape and semantic bounds tested | `test_cookie_flags`; `test_missing_and_expired_session`; `test_other_session_gets_404`; `test_problem_shape_every_status`; `test_422_does_not_echo_input`; `test_horizon_must_be_integer`; `test_extra_fields_rejected` |
| [ ] Running jobs reconcile on restart; queued jobs cannot execute twice | Vinesh's contract suite on SQLite; `test_restart_interrupts_running`; `test_queued_survives_restart_and_runs_once`; `test_concurrent_claims_each_job_once`; `test_zombie_worker_write_is_noop` |
| [ ] Local/mock app starts without real GPU/weights | `test_lifespan_with_fixture_release_and_fake_supervisor`; `test_missing_release_degrades`; manual `python -m app.main` with the synthetic release, recorded |
| [ ] Shared schema and DB changes generate consistent consumers | `test_migration_matches_contract_tables`; examples in `contracts/examples.json` round-trip through routes; Chaandan's generation `--check` green |

Also required by the role contract: `test_queue_full_429_retry_after`, `test_missing_artifact_503`, `test_concurrent_reads_during_writes` (WAL), `test_secret_never_logged` (runtime-generated secret).

## 11. Handoff format

Every handoff, per change and final, lists:

1. Tested commit and branch
2. Owned paths changed and the behavior delivered
3. Contract version, fingerprint and the fixtures used
4. Migration and start commands
5. Commands actually executed and their observed results
6. Executor injection contract as wired (factory, config mapping, startup order)
7. Settings needed from Praneeth, known limitations, skipped checks, remaining dependencies and prepared requests

Label every claim as measured, target, estimated, synthetic, or not tested.

## 12. Change log

Newest first. Bump the plan revision when §2 or §5 changes structure or when the contract baseline changes.

| Date | Rev | Task | Files | Verification (command and observed result) |
| --- | --- | --- | --- | --- |
| 2026-10-11 | 1 | N0 | `tests/api/BACKEND_PLAN.md`, `tests/api/nisheeth_guard.py`, `tests/api/test_nisheeth_guard.py`, `CLAUDE.md` pointers in `app/routes/`, `app/persistence/`, `tests/api/`, `tests/persistence/`; local only: `.claude/settings.local.json`, `.git/info/exclude` | Branch fast-forwarded `381c0a2` -> `7d6cb32` (no local commits). `python3 -m unittest discover -s tests/api -p test_nisheeth_guard.py`: 20 tests OK. `fingerprint`: working tree = HEAD = `origin/main` = plan = `9529ffd33ae3`. Hook commands piped directly (11 payloads): deny for `app/jobs/ports.py`, `app/generated/models.py`, `.env`; ask for the guard and `app/__init__.py`; silent for an owned file and a path outside the repo; malformed payload exits 2; prompt hook printed reminder, branch, tree state and Next up; stop hook silent on this tree and with `stop_hook_active`. `jq -e` validated all three hook commands. Live in this session: a sentinel showed `PreToolUse` firing on an Edit of this plan; a Write to `app/jobs/hook_probe.txt` was blocked with the boundary message and no file was created; Claude Code loaded `tests/api/CLAUDE.md` on first touch. `audit --base origin/main`: PASS (7 paths: 5 owned, 2 guard; expected guard-changed warning). Not verified: `UserPromptSubmit` and `Stop` firing live (they run outside this turn); hooks in a fresh session or on Windows. |

## 13. Open decisions

| ID | Question | Proposal | Decides | Status |
| --- | --- | --- | --- | --- |
| Q1 | Problem code for a 409 idempotency mismatch (enum has no conflict code) | `INVALID_INPUT`, retryable false; or add `CONFLICT` in a versioned change | Joint via Chaandan | raised in PR #1 review |
| Q2 | Status for missing/expired session and disallowed origin | 401 and 403, both `INVALID_INPUT`; cross-session objects 404 | Joint via Chaandan | raised in PR #1 review |
| Q3 | Bodies of `POST /session` (201) and `GET /health` (200) are undefined | `/session`: empty body; `/health`: `{"status": "ok"}` added to the schema | Joint via Chaandan | open |
| Q4 | `fail_interrupted(now)` only sees expired leases, but startup must interrupt every running job of the dead process | Add a startup form (e.g. `fail_interrupted(now, all_running=True)`) or per-boot worker ids | Vinesh | open |
| Q5 | `admission_check` returns a `Problem`, which needs a `trace_id` a pure function lacks | The route stamps the request's trace id over the returned one | Vinesh | open |
| Q6 | Source of `chat_available` and `status=starting` | `Supervisor.health() -> {chat_available, starting, reasons}` | Vinesh | open |
| Q7 | What counts against per-lane capacity | `queued + running` in the lane, checked inside the admission transaction | Vinesh | open |
| Q8 | `ExecutorConfig.poll_interval_s` has no `APP_*` key; `APP_SEED` has no named consumer | Vinesh default for poll interval; name the `APP_SEED` consumer or drop it | Vinesh, Chaandan | open |
| Q9 | New settings keys | The proposed list in §6.8 | Chaandan (`.env.example`) | open |
| Q10 | `app/__init__.py` and `app/services/__init__.py` are unlisted | Nisheeth creates them empty (app owner, lifespan owner) | Team | open |
| Q11 | Where explanation admission lives (`services/explanations.py` is Vinesh's) | `ScenarioService.submit_explanation` in `app/services/scenarios.py` (explaining a stored scenario result) | Vinesh | open |
| Q12 | `progress()` result when the lease is lost | Return `True` so the worker stops | Vinesh | open |
| Q13 | `session_scope` value in explanation payloads | `sessions.id` (already a sha256 digest; raw token never leaves the cookie) | Vinesh | open |
| Q14 | Branch name | Work on this session branch; merge into `dev/nisheeth-api`/`main` through Chaandan's gate | Nisheeth | open |
| Q15 | Retired branch `origin/claude/dreamy-brahmagupta-i6bey7` (old OncoVision data prep; Chaandan's D8 leaves it to Nisheeth) | Leave untouched; archive or delete only on Nisheeth's explicit word | Nisheeth | open |
| Q16 | Plan pointer for sessions without hooks | Request R3 | Chaandan | open |
| Q17 | Two near-identical guards (Dev 2 and Dev 4) | After `cha2` merges, fold both into one owner-parameterized guard | Chaandan, Nisheeth | open |
| Q18 | Python and SQLite versions on GX10 (`RETURNING` needs SQLite >= 3.35) | Check in Praneeth's first window; fall back to select-then-conditional-update if older | Praneeth | open |
| Q19 | LAN access to the local app | Loopback only in v1; LAN needs HTTPS and an origin review first | Team | open |
| Q20 | Integrity check in `complete` | Reject a result whose `request` differs from the job's snapshot request | Vinesh | open |

## 14. Rule of 3 bug log

After three materially different failed attempts on one bug: stop, preserve the diff and fresh logs (no secrets) on a clean committed branch, restart the session, and re-feed only this plan, the role contract, the minimal failing files, the reproduction command and the logs.

| Bug | Attempt | Hypothesis and patch | Fresh result |
| --- | --- | --- | --- |
| (none yet) | | | |
