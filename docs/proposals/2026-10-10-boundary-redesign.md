# OncoGrowth boundary redesign: proposal from Vinesh (Dev 3)

Status: **proposal, not agreed.** Base: `origin/main` @ `381c0a2`. This branch (`feat/vinesh-boundary-redesign`) is the exact patch for other owners' files: [contracts/](../../contracts/), [CONTRACTS.md](../CONTRACTS.md), [DATA_AND_MODEL.md](../DATA_AND_MODEL.md), the role files, the master plan, the judge overview, the runbook and `.env.example`. Nothing reaches `main` until the owners named in §3 accept their rows and Chaandan merges. `tests/contracts/test_contract_schemas.py` validates every example and one negative case per resolved shape contradiction.

## 0. Design brief I worked from (the metaprompt)

```text
Role: architect for a 4-owner, 24-36 h hackathon codebase.
Input: every doc and schema on origin/main@381c0a2 (CLAUDE.md, docs/**, contracts/**,
.env.example, .gitignore). Read all of it; do not rely on summaries.
Goal: each owner can build and test their part alone, from hour 1, against
fixtures, with the fewest possible shared seams.
Keep: product scope (breast, paclitaxel, two engines, local + Pages), stack,
ownership registry, REST table, modular monolith. Redesign seams, not product.
Method:
 1. List every fact that crosses an owner boundary; give each one a single source.
 2. Cross-read every pair of docs; also check prose against the machine schema.
    Record each conflict, ambiguity, or orphan (a thing with no owner or no consumer).
 3. Resolve each one with a named principle. Prefer: one implementation
    exported to both runtimes > data files > published pure functions > ports.
    A query across owners becomes a snapshot.
 4. Every seam: one producer, named consumers, schema or Protocol, a contract
    test, and a fixture available at H1.
 5. Verify mechanically: build the proposed schemas and validate the examples, plus
    a negative case per resolved contradiction.
Acceptance: every contradiction is resolved, or deferred to a named data gate; no owner
needs another owner's running code to run their tests; the seam list fits on one
screen; nothing claims verification that wasn't run.
```

## 1. Verdict

This doesn't restart the product: scope, stack, roles, REST table and module table all stay. It redesigns the **seams between owners**. Four moves remove most of the coupling:

1. **One implementation, exported to both runtimes.** Both numerical engines become ONNX graphs that contain *every* transform. The browser and the Python handler pass volumes and days in and get volumes out. Nobody reimplements a scaler, an inverse transform or a physics formula. (Fixes C1–C5, C19, C20.)
2. **Seams are data files with schemas.** These are the artifact sets, a release index, case catalogs, explanation templates and DTO-level parity fixtures. Producers and consumers meet at a file, never at each other's code. (C13–C17.)
3. **Snapshots, not queries.** A job carries a frozen copy of everything it needs: the case for scenarios, the stored result for explanations. Executor code never reads anyone else's tables. (C22, part of C9.)
4. **One port at the only code-to-code seam** (jobs ↔ persistence). The policy side owns the Protocol and ships the contract tests; the SQLite side implements it and runs those same tests. (C9–C12, C18, C21, C26.)

## 2. Principles and where each one is applied

| Principle | Applied as |
|---|---|
| Single source of truth | Observations only in CaseRecord (C7). Versions only in the release index (C16). Domain rules only in `admission_check` (C18). |
| One implementation per formula | ONNX graphs carry transforms and physics; templates are data rendered by a trivial substitution engine (C1, C4, C13) |
| Dependency inversion | `app/jobs` defines `JobStore`/`ResultCache`; `app/persistence` implements them. Arrows point from mechanism to policy (C9) |
| Interface segregation | Nisheeth calls three published functions of mine; Praneeth reads files only; Chaandan validates files only (§5) |
| Immutability | Artifact sets are content-hashed and never edited; job payloads are snapshots (C22) |
| Explicit over implicit | Units in names; `result_id` meaning pinned per kind; the day grid is fixed by contract (C8, C25) |
| Consumer-driven contract tests | DTO-level parity fixtures (C17); a JobStore contract suite that Nisheeth runs against SQLite (§4.3) |
| YAGNI | Empirical bands, 3D field transport, exposure windows and the knowledge corpus are deferred to P1, each with the contract change it would need |

## 3. Contradiction register

Status: **R** = resolved by this proposal (needs owner acceptance) · **D** = deferred to a data gate · **W** = wording fix only.

### Numerics and runtimes

| ID | Conflict (source) | Resolution | Who changes | St |
|---|---|---|---|---|
| C1 | `DATA_AND_MODEL.md`: transforms and anchoring live *inside the exported graph*. `CONTRACTS.md`: Python and JS *consume the fitted transforms* from the preprocessing manifest | All transforms go inside the graph. Inputs `baseline_volume_cm3`, `elapsed_days` [batch,1]; outputs `log_volume_ratio`, `volume_cm3`. `preprocessing.json` is published and hashed **for audit only**; no runtime reads it | Chaandan (schema), Praneeth (worker passes raw values) | R |
| C2 | The anchor `f(z(t)) − f(z(0))` needs `z(0)`, which needs the scaler, so the scaler *has* to be inside the graph or the anchor can't be built there | Same as C1; this is the deciding argument | — | R |
| C3 | Manifest allows `band_kind: sensitivity\|empirical_interval`, docs ask for bootstrap spread, but the tensor contract has one output | `EmpiricalManifest.band_kind = "none"` in v1. Ensembles are P1 (they need `lower`/`upper` outputs: a versioned contract change) | Chaandan | R |
| C4 | `examples.json` Capabilities for **pages** says `mechanistic_available: true`, but the mechanistic engine is Python/CUDA, and repo rules forbid a JS reimplementation | The mechanistic product engine is the 0-D logistic-with-suppression ODE in closed form, exported as ONNX. Its sensitivity sweep is baked into the graph, which outputs `volume`/`lower`/`upper`. Both runtimes run the same file. New `MechanisticManifest` | Me (graph), Chaandan (schema), Praneeth (second ONNX session) | R |
| C5 | The 3D Fisher-KPP CUDA field has **no consumer**: the contract transports only curves, and Pages can't run it | 3D CUDA is the GX10 hardware workload, not an API engine in v1. It is tied to the product by a test: with D=0 and a uniform field, it must match the 0-D graph. Exposing it is P1 (`engine: mechanistic_3d`) | Me | R |
| C19 | "Declared handling of physically invalid outputs" is never declared | `V = exp(lr)(V0+ε) − ε > −ε` always, so the graph applies `max(V,0)`. The error is bounded by ε, which the manifest now carries (`volume_epsilon_cm3`) | Me | R |
| C20 | It's unclear whether the log-baseline feature is standardized as well as days | Moot after C1: it's internal to the graph | — | R |
| C25 | No contract for which days a curve contains, so two runtimes can produce different points | Grid = integer days `0..horizon_days` inclusive; `horizon_days` becomes `integer`. Empirical requires `horizon_days ≤ validated_horizon_days`, else `OUT_OF_DOMAIN` | Chaandan, me, Praneeth | R |

### Contract shapes

| ID | Conflict | Resolution | Who changes | St |
|---|---|---|---|---|
| C6 | `ModelManifest` consts are empirical-only, yet `ScenarioRequest.model_version` is required for mechanistic too; `Capabilities.model_version` is a single value for two engines | Split into `EmpiricalManifest` + `MechanisticManifest`. Capabilities gets `empirical_model_version`, `mechanistic_model_version` and `degraded_reasons` | Chaandan, Nisheeth, Praneeth | R |
| C7 | Observed data has two sources: `CaseRecord.observations` and `Curve.evidence="observed"` | Drop `observed` from `Curve.evidence`. The UI draws observations from the CaseRecord | Chaandan, Praneeth | R |
| C8 | `JobRecord.result_id` is ambiguous for explanation jobs | Scenario job → `ScenarioResult.id`; explanation job → `ExplanationResult.id` (pinned in a schema `description`) | Chaandan, Nisheeth | R |
| C28 | REST table requires `Idempotency-Key` only for scenarios, yet explanations are "idempotent" | Both POSTs require it | Chaandan (doc), Nisheeth | R |

### Jobs and persistence

| ID | Conflict | Resolution | Who changes | St |
|---|---|---|---|---|
| C9 | Nisheeth's step 4, "reconcile interrupted jobs and atomic queue claims", overlaps my step 5, "lease/claim semantics and restart behavior" | **Policy is mine, mechanism is Nisheeth's.** I own *when* to claim, renew, cancel or fail, behind `JobStore` (§4.3). Nisheeth owns *how* (SQL, transactions) | Both role files | R |
| C10 | The table spec `jobs(...)` has no lease or cancel columns, though lease/claim semantics are required | Add `lane, lease_owner, lease_expires_at, cancel_requested, attempt` | Nisheeth | R |
| C11 | Cancel "transitions when the executor confirms", but a queued job has no executor | Queued → the store cancels it atomically at once. Running → it sets `cancel_requested`; the executor confirms at its next progress checkpoint | Nisheeth, me | R |
| C12 | No lane is given for explanation jobs. In a spawn process pool the in-memory breaker would be per-process and useless | Two lanes: `compute` (spawn process pool, `APP_GPU_WORKERS`) for scenarios; `io` (bounded threads in the app process) for explanations, holding the one breaker | Me | R |
| C18 | Eligibility, horizon and scale rules are needed both at admission (Nisheeth, for a fast 422) and in the handler (me) | One pure function, `admission_check(request, case, release)`, published by me and called by both | Me (provide), Nisheeth (call) | R |
| C21 | "Scientific cache immutable by artifact version" vs "no cross-session cache leakage" | Scenario cache is global: its inputs are public and deterministic. Explanation cache key includes the session, because questions are private text | Me (keys), Nisheeth (table) | R |
| C22 | An explanation needs "immutable stored facts", but the handler reading Nisheeth's tables would couple us | Admission snapshots the stored `ScenarioResult` (and, for scenarios, the `CaseRecord`) into the job payload | Nisheeth (snapshot at insert), me (pure handlers) | R |
| C26 | `app/settings.py` is Nisheeth's, but most of its fields configure my modules | My modules take typed config dataclasses (`ExecutorConfig`, `QwenConfig`, `CacheConfig`); settings only maps `APP_*` env to them | Nisheeth, me | R |

### Explanations

| ID | Conflict | Resolution | Who changes | St |
|---|---|---|---|---|
| C13 | Pages must show a "deterministic explanation" with no backend, so the template logic would exist in both Python and JS | Templates are a schema-validated data file: `{dotted.path}` substitution, number format in the file, no logic. A shared rendered-output fixture proves Python and JS agree | Me (file + fixture), Praneeth (renderer) | R |
| C14 | "Approved source snippets / knowledge version" (runbook cache key) has no owner, path or schema | Mine, at `prompts/knowledge_v1.json`. It is **nullable in v1**: Qwen is grounded on result facts only until it exists | Me | R |

### Artifacts and release

| ID | Conflict | Resolution | Who changes | St |
|---|---|---|---|---|
| C15 | Cases come from three places (Chaandan's synthetic seed, my real cases, Nisheeth's "integrate prepared cases") with no shared format or path | One format, `CaseRecord[]` JSON. Each producer owns its own file; the release index lists them; the API loads them into `cases`, Pages export copies them | All | R |
| C16 | `APP_MODEL_MANIFEST_PATH` is one flat path, but artifact sets are atomic and versioned and there are now two engines | Chaandan's **release index** is the only file that selects versions (schema: `release-index.schema.json`); `APP_RELEASE_INDEX_PATH` replaces the manifest path | Chaandan, Nisheeth | R |
| C17 | Three owners claim parity checks (me: Python/ONNX; Praneeth: browser; Chaandan: "enforce before export") | One DTO-level fixture format (`parity-fixture.schema.json`). I produce it and pass it in Python; Praneeth passes it in the worker; Chaandan's export gate *runs* both and reimplements neither | All | R |

### Process and claims

| ID | Conflict | Resolution | St |
|---|---|---|---|
| C23 | "Freeze at Hour 1", but the plan landed at 17:32 and the data audit is at H2 | The redesigned interface is data-independent: the audit fills in values (ε, horizon, counts), never shapes | R |
| C24 | Judge overview: "GX10 runs CUDA training". Data doc: small tabular fit may not beat CPU | Pitch the GPU work as 3D ensemble simulation plus Qwen; report training device and timing as measured | W |
| C27 | `horizon_days ≤ 84` vs fixture `validated_horizon_days: 21`; is the ~12-week scan "early_paclitaxel"? | Decided by the D1 audit; the manifest already decouples it | D (H4) |

## 4. Target seams (the complete list)

| # | Seam | Producer | Consumers | Form | Contract test | H1 fixture |
|---|---|---|---|---|---|---|
| S1 | REST DTOs | Nisheeth | Praneeth | `domain.schema.json` + REST table | schema + examples (Chaandan CI) | `examples.json` |
| S2 | Empirical artifact set | me | Nisheeth (via S6), Praneeth | ONNX + `EmpiricalManifest` + card | parity fixture (S5) | synthetic set from my F1 |
| S3 | Mechanistic artifact set | me | same | ONNX + `MechanisticManifest` + card | parity fixture (S5) | synthetic set |
| S4 | Case catalogs | me (real), Chaandan (synthetic) | Nisheeth, Pages export | `CaseRecord[]` | schema | `examples.json` case |
| S5 | Parity fixtures | me | Praneeth, Chaandan CI | `parity-fixture.schema.json` | Praneeth's worker test; my pytest | with F1 |
| S6 | Release index | Chaandan | Nisheeth, Praneeth, export | `release-index.schema.json` | hash check in `load_release` | fixture index |
| S7 | Explanation templates | me | my service, Praneeth | `explanation-templates.schema.json` + rendered fixture | both renderers vs fixture | one template |
| S8 | Job seam | me (Protocol), Nisheeth (impl) | — | `app/jobs/ports.py` | JobStore contract suite | `InMemoryJobStore` |
| S9 | Published functions | me | Nisheeth | `load_release`, `admission_check`, `make_supervisor` | my unit tests | stub supervisor |

Nothing else crosses an owner boundary. Telemetry (Praneeth) reads logs and metrics; nothing depends on it.

### 4.1 Engine graphs (S2, S3)

- **Empirical** — in: `baseline_volume_cm3` [B,1], `elapsed_days` [B,1]. Out: `log_volume_ratio` [B,1], `volume_cm3` [B,1]. Inside the graph: `log(V0+ε)`, standardize both features, `f(z(t)) − f(z(0))`, then `max(exp(lr)(V0+ε)−ε, 0)`.
- **Mechanistic** — in: `baseline_volume_cm3` [1], `days` [T], `intervention_on` [1], `sensitivity_scale` [1]. Out: `volume_cm3`, `lower_cm3`, `upper_cm3`, each [T]. The closed-form logistic with constant suppression `k·scale` runs over a baked (r,k) grid; `volume` is the grid median and the band is the grid envelope. Exposure is on for the whole horizon when `intervention_on=1` (windows are P1).
- **DTO assembly**, the same in both runtimes and pinned by the parity fixture:

| Engine | Condition | `source` | Curve `evidence` | `band_kind` |
|---|---|---|---|---|
| empirical | `trained_on=real` | `trained_model` | `forecast` | `none` |
| empirical | `trained_on=synthetic` | `synthetic` | `forecast` | `none` |
| mechanistic | `parameter_basis=assumption` | `mechanistic` | `illustrative` | `sensitivity` |
| mechanistic | `parameter_basis=conditional_calibration` | `conditional_calibration` | `illustrative` | `sensitivity` |
| any | cache hit | `cached`, with `origin_source` = the original source | — | — |

  The parity fixture compares `points` within tolerance, and `evidence` and `band_kind` exactly. Curve labels are presentation and aren't compared.

### 4.2 Published functions (S9): Nisheeth's whole dependency on my code

```python
def load_release(index_path: Path) -> Release: ...
    # verifies schemas and sha256; Release.engines[e].available / .version / .reason -> Capabilities
def admission_check(req: ScenarioRequest, case: CaseRecord, release: Release) -> Problem | None: ...
    # pure; Nisheeth calls it at admission (fast 422), my handler calls it again (same function)
def make_supervisor(cfg: ExecutorConfig, store: JobStore, cache: ResultCache,
                    release: Release, qwen: QwenConfig) -> Supervisor: ...
    # Supervisor.start(); .stop(timeout_s); .wake(lane)  (a wake after insert is optional; it polls anyway)
```

### 4.3 Job seam (S8): `app/jobs/ports.py`

```python
Lane = Literal["compute", "io"]          # scenario -> compute, explanation -> io

@dataclass(frozen=True)
class ScenarioJobPayload:  request: ScenarioRequest; case: CaseRecord            # snapshot at admission
@dataclass(frozen=True)
class ExplanationJobPayload: request: ExplanationRequest; result: ScenarioResult; session_scope: str

class JobStore(Protocol):                 # implemented in app/persistence (Nisheeth)
    def claim_next(self, lane: Lane, worker: str, lease_s: float) -> Claim | None: ...  # atomic
    def renew(self, job_id: UUID, worker: str, lease_s: float) -> bool: ...  # False: lease lost, abandon
    def progress(self, job_id: UUID, worker: str, value: float) -> bool: ...  # returns cancel_requested
    def complete(self, job_id: UUID, worker: str, result: ScenarioResult | ExplanationResult) -> None: ...
        # writes result row + job succeeded/progress=1/result_id in ONE transaction
    def fail(self, job_id: UUID, worker: str, problem: Problem) -> None: ...
    def confirm_cancelled(self, job_id: UUID, worker: str) -> None: ...
    def fail_interrupted(self, now: datetime) -> int: ...
        # startup: all running -> failed INTERRUPTED; periodic: expired leases -> failed INTERRUPTED

class ResultCache(Protocol):
    def get(self, key: str) -> dict | None: ...
    def put(self, key: str, payload: dict, ttl_s: float | None) -> None: ...
```

- No automatic retry after an interruption. One claim executes at most once, and a lost worker becomes `failed/INTERRUPTED`, never a success.
- A write by a worker without the lease is a no-op and gets logged. This stops a zombie worker overwriting a reconciled job.
- **Contract suite:** `tests/jobs/jobstore_contract.py` (mine) is a parametrized test class. I run it against `InMemoryJobStore`; Nisheeth runs the same class against the SQLite store from `tests/persistence/`. That makes two implementations and one specification.

### 4.4 Config (C26)

`ExecutorConfig(compute_workers, io_workers, queue_capacity_per_lane, lease_s, poll_interval_s)` · `QwenConfig(base_url, model_id, api_key: SecretStr | None, timeout_s, max_output_tokens, breaker_threshold, breaker_cooldown_s)` · `CacheConfig(max_mb, explanation_ttl_s)`.

Requested `.env.example` changes (Chaandan): replace `APP_MODEL_MANIFEST_PATH` with `APP_RELEASE_INDEX_PATH`; add `APP_IO_WORKERS` and `APP_JOB_LEASE_SECONDS`.

## 5. What each owner builds against, starting at H1

| Owner | Produces | Consumes | Starts immediately with | Never needs |
|---|---|---|---|---|
| **Praneeth** | UI, `LocalApiEngine`, `BrowserEngine` (2 ONNX sessions + template renderer) | S1, S2, S3, S5, S6, S7 | `examples.json`, my synthetic artifact sets + parity fixtures | any transform or formula; Python |
| **Nisheeth** | routes, SQLite store implementing `JobStore`/`ResultCache`, settings → config, lifespan wiring | S1 (as producer), S4, S6, S9 | `InMemoryJobStore` as reference, contract suite, stub supervisor | numerics, Qwen, manifest internals |
| **Chaandan** | schemas, generated clients, release index, synthetic catalog, export, CI gates | all files (validation only) | this branch's `contracts/**` | any scientific logic; reimplementing parity |
| **Vinesh** | artifact sets, real catalog, templates, parity fixtures, `app/jobs`, Qwen adapter, explanation service | S1 DTOs (generated), S6, S8 implementation | `InMemoryJobStore`, synthetic data | routes, SQL, UI |

### First slice per owner after merge (each independent of the others' code)

| Owner | First slice | Done when |
|---|---|---|
| Chaandan | Root Python/web tooling; generate Pydantic + TS/Zod from the merged schemas; CI runs `tests/contracts`; fixture release index + synthetic catalog | Clean clone: `pytest tests/contracts` and generation pass in CI |
| Vinesh | Synthetic empirical + mechanistic artifact sets (real ONNX, real hashes, `trained_on=synthetic`), parity fixtures, template file + rendered fixture; `app/jobs/ports.py`, `InMemoryJobStore`, JobStore contract suite, stub supervisor | Python parity passes against both ONNX files; the contract suite passes on the in-memory store |
| Nisheeth | Migration with the new `jobs` columns; SQLite `JobStore`/`ResultCache`; routes against the stub supervisor | Vinesh's contract suite passes against SQLite; POSTs return 202 with no executor running |
| Praneeth | `BrowserEngine` worker loading the fixture release index; two ONNX sessions; template renderer; chart drawing observations from CaseRecord | Browser parity and template fixtures pass in a test runner; no network calls besides static assets |

## 6. Flow and time to agreement

| Step | Who | Time | Output |
|---|---|---|---|
| 1. Share the branch link | Vinesh | 5 min | link in the team channel |
| 2. Async read; each owner marks the C-rows in their "who changes" column accept/object | Praneeth: C1, C4, C7, C13, C17 · Nisheeth: C8–C12, C18, C21, C22, C26 · Chaandan: C6, C15, C16, C25, C28 | 15 min, in parallel | objections only |
| 3. Sync on the objections only | all four | ≤20 min | each row `agreed` / `rejected` (+ alternative) |
| 4. Fold rejected rows into this branch; Chaandan merges it as the coordinated contract commit and regenerates clients | Vinesh, Chaandan | 20–30 min | one commit on `main` |
| 5. Freeze; everyone starts their first slice (above) | all | — | no owner waits on another's code |

That's about one hour of wall-clock time to freeze; only step 3 needs everyone at once. C27 waits for the H4 data gate. If C1 or C4 is rejected, the fallback is the original plan plus the preprocessing manifest shared by both runtimes. Then the parity fixture (S5) is the only guard against transform drift, so it has to stay at DTO level.

## 7. Evidence and limits

`pytest tests/contracts/test_contract_schemas.py` validates every example in `examples.json` against its schema, and checks one negative case for each of C1, C3, C6, C7 and C25. The commit message records the observed result.

What this verification doesn't cover:
- **Shape only.** It checks schema shape, not the semantic invariants: day 0 = baseline, `lower ≤ volume ≤ upper`, job-state field rules. Those need the semantic validators.
- **No ONNX built yet.** No graph exists, so nothing has shown that the manifest I/O matches a real exported graph, or that the closed-form mechanistic graph exports to ONNX ops that ONNX Runtime Web supports. Vinesh's first slice has to prove that before the freeze is relied on.
- **No owner agreement yet.** The doc edits on this branch are proposals until §6 step 3.
