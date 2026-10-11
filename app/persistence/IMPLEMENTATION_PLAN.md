# Dev 2 (Nisheeth) implementation plan — backend, persistence, local sessions

Role: [`docs/roles/02-nisheeth-backend.md`](../../docs/roles/02-nisheeth-backend.md) | Rules: [`CLAUDE.md`](../../CLAUDE.md) | Contracts: [`docs/CONTRACTS.md`](../../docs/CONTRACTS.md) (schema version 1)
Contract fingerprint: `f4bfbd58fd59`
**Next up:** N1b (types, blocked — handoff in §7) and N2 (sessions).
Status: **N0 and N1 done and verified (§9). Everything else not started.** MVP only: build the smallest thing that satisfies the role's acceptance list, one task at a time, and verify each before the next. A box is checked only on observed evidence.

Lives in `app/persistence/` because `docs/**` belongs to Chaandan; this directory is Nisheeth's. (The earlier OncoVision data-prep plan was for a retired scope and is not part of this project.)

---

## 0. Change gate — before AND after every change

**Before editing**

1. Re-read this file. Run `python3 tests/persistence/check_dev2.py audit`: if it reports contract drift, stop, read the changed contract files, update §2–§6 and the fingerprint line above, then continue.
2. Name the plan task (N0–N6) the change implements. If none fits, it is out of scope: log a decision (§10) before editing.
3. Confirm every file you touch is in §1. Reading other owners' files is always fine.
4. Start a new task only from a clean tree (`git status --porcelain` empty). State the target files, pseudocode, failure behaviour and verification command first (repo workflow: plan before code).

**Before committing**

5. Run the task's tests (`python3 -m unittest discover -s tests/persistence`; add `-s tests/api` when it exists). Record command and actual result in §9.
6. Run `python3 tests/persistence/check_dev2.py audit --base origin/main`. It must print `Result: PASS`. It fails on: paths outside §1, secret/weight/db file types, files over 2 MB, credential-looking text, owned code changed without this plan changed, and contract drift.
7. Re-read the diff against §3 (guardrails). Look for: hand-written DTO, formula or scaler, inline model/LLM work in a route, SQL outside `app/persistence`, a token literal, missing → zero/invented data.
8. Update §9 and the acceptance boxes (§8). Commit immediately with a concrete message; one task per commit.

---

## 1. Writable boundary (role file + `docs/roles/README.md` — do not widen)

`app/routes/**`, `app/persistence/**`, `app/services/scenarios.py`, `app/session.py`, `app/main.py`, `app/settings.py`, `tests/api/**`, `tests/persistence/**`.

**Never write:** `contracts/**`, `app/generated/**`, `web/src/generated/**` (Chaandan; generated, never by hand), `app/jobs/**`, `app/integrations/**`, `app/services/explanations.py`, `modeling/**`, `prompts/**`, `data/**`, `artifacts/public/**` (Vinesh), `web/**`, `app/telemetry/**`, `scripts/gx10/**` (Praneeth), `docs/**`, `pyproject.toml`, `uv.lock`, `Makefile`, `.github/**`, `.env.example`, `README.md` (Chaandan), and any unlisted path (e.g. `app/__init__.py` — needs a named assignment; we rely on a namespace package until one exists).
**Never commit:** `.env*`, weights, raw data, `*.sqlite*`, credentials.
Dependency needs are *requests* to Chaandan (root lockfile) — never edits.

## 2. Contract facts this plan relies on (re-check on drift)

- Schema v1: `domain.schema.json` is normative; all objects reject extra fields; timestamps RFC 3339 UTC; volume in `cm3`.
- Persistence (CONTRACTS.md "Persistence and queue semantics"): one SQLite DB, WAL + migrations. Tables `sessions, cases, jobs, results, explanations, cache, idempotency` with the exact columns listed there; `idempotency` composite-unique on `(session_id, key)`; job + idempotency rows created in one transaction; job `payload_json` snapshots everything the executor needs (scenario `{request, case}`, explanation `{request, result, session_scope}`); lanes `compute` / `io`; one API worker initially; no automatic retry (a claim runs at most once); interrupted job → `failed` with Problem `INTERRUPTED`.
- Job semantics: queued/running have no result; succeeded needs `result_id`, progress 1, no error; failed needs error and no result.
- REST table (CONTRACTS.md): 422 invalid, 404 missing, 409 idempotency mismatch, 429 + `Retry-After` queue full, 503 unavailable engine, 500 typed Problem for unexpected faults. POST routes persist + queue + return 202 promptly; no GPU/Qwen wait.
- Port (Vinesh `app/jobs/ports.py`, **not yet present**): `JobStore` (`claim_next, renew, progress, complete, fail, confirm_cancelled, fail_interrupted`), `ResultCache` (`get, put`). I implement over SQLite and run his suite `tests/jobs/jobstore_contract.py`.

## 3. Guardrails (checked at gate step 7)

1. **One implementation per rule.** No hand-written DTOs, enums, `admission_check`, cache keys, formulas or scalers. Types come from generated code; admission/cache keys from Vinesh's functions.
2. **Layers.** Routes parse/delegate/shape; services coordinate; persistence is SQL and transactions only; no SQL outside `app/persistence`; no numerical/model/LLM work in routes or repositories.
3. **POST never waits on compute.** Persist + queue + 202.
4. **Missing is not zero; no invented patient data.** Absent source data stays absent; synthetic data is labeled.
5. **Typed failures.** Expected faults → Problem with the contract code; unexpected → typed 500 with trace id and logs, never fake success. Error bodies carry no tokens or raw patient data.
6. **No secrets.** Settings validate endpoints/limits; no token literals; no full-env logging; `.env.example` keys are Chaandan's but mirror `app/settings.py` (new key → his acknowledgment).
7. **Bounded + deterministic.** Explicit queue/lease/timeouts from settings; UTC RFC 3339 timestamps; injectable clock/ID source in persistence so tests are deterministic.
8. **Micro-commits.** One task per commit; no force-push; no stash/reset of others' work; fetch `main` before merging.

## 4. MVP decisions (recorded; revisit only with the owners)

- **D-A: stdlib `sqlite3` + forward-only SQL migrations (`PRAGMA user_version`)** instead of SQLAlchemy + Alembic. CLAUDE.md lists SQLAlchemy as allowed, not required. Reason: zero dependencies to lock on aarch64, `BEGIN IMMEDIATE` and atomic claim are direct, and the persistence layer only stores contract JSON plus indexed columns. Cost: no ORM models. Reversible: repositories are the only SQL users.
- **D-B: STRICT tables + CHECK constraints** mirror contract rules (job state/terminal rules, enums, `json_valid`). They are defense in depth; the contract stays normative, so a contract change that touches them needs a new migration.
- **D-C: payloads stay opaque `payload_json` at the persistence layer.** Validation against generated models happens in services/routes (N3–N4), not in SQL.
- **D-D: separate connection per unit of work** (cheap in SQLite), writes in `BEGIN IMMEDIATE`, WAL, `busy_timeout`, foreign keys on.

## 5. Tasks (role deliverables 1–6; one at a time)

| ID | Task | Role item | Depends on | Done when |
| --- | --- | --- | --- | --- |
| N0 ✅ | This plan, boundary/drift guard, nested `CLAUDE.md` pointers | — | — | `check_dev2.py audit` → PASS; guard tests pass |
| N1 ✅ | DB foundation: `db.py` (connect, WAL, FK, busy timeout, `transaction`), `migrations.py`, `001_initial.sql` (7 tables, indexes, CHECKs), tests | 1 (database half) | — | Fresh DB migrates to v1; idempotent re-run; newer-DB and bad-migration refused/rolled back; constraints and indexed claim query verified; WAL reader not blocked by writer |
| N1b | Imported validated types: use `app/generated/**` Pydantic models for all DTOs | 1 (types half) | **Chaandan: C2 freeze record + C3 generator** | A route-level test round-trips `contracts/examples.json` through the generated models; no local DTO exists |
| N2 | Sessions: `app/session.py` + `app/persistence/sessions.py` — opaque id (`secrets`), expiry, `require_owner`, purge expired | 2 | N1 | Cookie attrs correct (HttpOnly, SameSite, Secure over HTTPS); expired/unknown rejected; session A cannot read B's job/result |
| N3 | Admission and reads: `app/persistence/{cases,jobs,results,idempotency}.py`; one-transaction job+idempotency insert; replay returns stored response; hash mismatch → conflict; queue-capacity check per lane; `app/services/scenarios.py` coordinates | 3 (persistence half) | N1, N2 (types: N1b) | Tests: replay, mismatch, rollback leaves no job and no key, queue full, concurrent duplicate keys yield one job |
| N4 | `app/settings.py` (`APP_*` → validated; maps to Vinesh's config dataclasses), `app/main.py` lifespan, routes per REST table with typed Problems | 3, 5 | N3, N1b, **Chaandan: FastAPI/uvicorn in lockfile**, **Vinesh: `load_release`, `admission_check`, `make_supervisor`** | Mock-profile app starts without GPU/weights; every route returns the specified status; POST returns 202 without waiting |
| N5 | SQLite `JobStore`/`ResultCache`; run Vinesh's contract suite | 4 | N1, **Vinesh: `app/jobs/ports.py` + `tests/jobs/jobstore_contract.py`** | Contract suite passes against SQLite; running jobs reconcile to `failed/INTERRUPTED` on restart; a queued job is claimed at most once under concurrent claimers |
| N6 | Role test checklist audit: idempotency mismatch/replay, rollback, session isolation, queue full, missing artifact, interruption, concurrent read/write — confirm each has a real test | 6 | N1–N5 | Each item mapped to a named passing test in §9 |

Order of work: N1 → N2 → N3 while waiting on others → N1b/N4/N5 as their dependencies land. Never start a task whose dependency is unmet by faking it; report it (§7) and continue independent work.

## 6. Gate alignment (MASTER_IMPLEMENTATION_PLAN.md §5)

H1–2: N1 (migrations) — and report app skeleton/dependency list/start command (§7). H2–12: N2–N4 (session cookie, routes, persistent jobs, idempotency, errors, capabilities). H12–18: N5 and restart/cancel semantics. H18–24: N6 plus queue-full / missing-model / corrupt-artifact cases. Final 4 h: release-critical fixes only, micro-commits.

## 7. Open items, requests and handoffs (none sent — a human sends them)

| # | To | Request | Status |
| --- | --- | --- | --- |
| R1 | Chaandan | Generate Pydantic v2 models from the frozen schema into `app/generated/` (CI plan C3). Needed by N1b/N3/N4. | open |
| R2 | Chaandan | Add to root `pyproject.toml`/lockfile: `fastapi`, `uvicorn`, `pydantic` (runtime); `pytest`, `httpx` (dev). N1–N3 need none (stdlib only). Needed by N4. | open |
| R3 | Vinesh | Publish `app/jobs/ports.py`, `tests/jobs/jobstore_contract.py` with the in-memory implementation, `load_release`, `admission_check`, `make_supervisor`, config dataclasses. Needed by N4/N5. | open |
| R4 | Praneeth | Settings keys the UI/runtime need (Qwen endpoint/model ID, ports, origins); GX10 start expectations. Needed by N4. | open |
| R5 | Team | D10 in `docs/integration/PLAN.md`: record Nisheeth's accept/object for the redesign rows C8–C12, C18, C21, C22, C26. This is a human decision; not recorded by this plan. | open |
| R6 | Team | `app/__init__.py` is unlisted: assign an owner or confirm the namespace package is intended. | open |
| R7 | Self | D8: old branch `origin/claude/dreamy-brahmagupta-i6bey7` (retired OncoVision data-prep work) — drop or archive is Nisheeth's decision; untouched for now. | open |

## 8. Acceptance (from the role file — check only with evidence)

- [ ] Requests do not wait for GPU/Qwen; job creation/idempotency transactional.
- [ ] Session ownership, error shape and semantic bounds tested.
- [ ] Running jobs reconcile on restart; queued jobs cannot execute twice under the chosen process model.
- [ ] Local/mock development app starts without real GPU/weights.
- [ ] Shared schema and DB changes generate consistent consumers.

Handoff content when done: migration/start command, exact route fixtures, real test results, executor injection contract, settings needed from Praneeth.

## 9. Progress log

| Date | Task | Change | Verification (command → actual result) |
| --- | --- | --- | --- |
| 2026-10-11 | N0 | Plan, `tests/persistence/check_dev2.py` (+ `test_check_dev2.py`), nested `CLAUDE.md` in `app/persistence`, `app/routes`, `tests/persistence` | `python3 -m unittest discover -s tests/persistence` → `Ran 11 tests ... OK`. `check_dev2.py audit --base origin/main` → `Result: PASS`; with a probe file `web_probe.ts` → `PROBLEM: ... outside Dev 2's writable boundary` and `Result: FAIL` (probe removed). |

## 10. Decisions

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-11 | D-A … D-D (§4) | MVP: no new dependencies, direct transactions, reversible |
