# Hour 1 contract and file-boundary checklist

Schema version `1`. [domain.schema.json](../contracts/domain.schema.json) is the normative draft-2020-12 field/enum/bounds contract. [examples.json](../contracts/examples.json) contains labeled synthetic boundary fixtures. Artifact files have their own schemas: [release-index](../contracts/release-index.schema.json), [explanation-templates](../contracts/explanation-templates.schema.json), [parity-fixture](../contracts/parity-fixture.schema.json) and [preprocessing](../contracts/preprocessing.schema.json). Praneeth, Nisheeth and Vinesh agree on the semantics; Chaandan generates and validates the artifacts before feature coding. The rationale for every boundary rule below is in [the boundary redesign](proposals/2026-10-10-boundary-redesign.md); C-numbers refer to its contradiction register.

## Design rule: one implementation, seams are data

Every number shown to a user is computed by exactly one implementation:
- Both numerical engines are exported ONNX graphs that contain every transform: log, epsilon, standardization, anchoring, inverse and physics. The local job handler and the browser worker run **the same file**; neither implements a formula (C1, C4).
- Owners meet at schema-validated files (artifact sets, release index, case catalogs, templates, parity fixtures) or at the single Python port `app/jobs/ports.py`. Nothing else crosses an owner boundary.

## Exact contract definitions

All objects reject extra fields. All numbers must be finite. UUID identifiers are opaque UUID strings. Timestamps are RFC3339 UTC. Volume is always explicitly `cm3` in the domain contract; import converts source units only after verification (1 cm3 = 1000 mm3). No NaN/Infinity in JSON. Pydantic models and generated TS/Zod must match these definitions; field omission differs from null.

- `CaseRecord`: id, label, cancer=`breast`, source=`ispy2|synthetic`, patient_group_id, baseline_volume_cm3 >0, subtype nullable, observations `[Observation]`, provenance=`Provenance`, eligible_paclitaxel boolean. No exposed direct identifiers. **The only source of observed points** (C7).
- `Observation`: day >=0, volume_cm3 >=0, measurement=`ftv|mask_volume|synthetic`, phase=`baseline|early_paclitaxel`, source_ref string. Unique sorted days are a semantic validator.
- `Provenance`: source_ref, dataset_version, measurement_method, regimen_verified, synthetic, limitations string array. Real/synthetic values must agree with CaseRecord source.
- `ScenarioRequest`: contract_version=1, case_id, engine=`empirical|mechanistic`, horizon_days **integer** [1,84], intervention=`paclitaxel|none`, sensitivity_scale [0,2], model_version nonempty (the selected engine's manifest version), seed integer >=0. `none` is a comparator, not a second drug. Empirical accepts only paclitaxel, scale=1, an eligible case and `horizon_days <= validated_horizon_days`. Mechanistic accepts none, a bounded what-if scale and `horizon_days <= max_horizon_days`. These rules live in one function, `admission_check(req, case, release, trace_id) -> Problem | None` (C18, C32).
- `CurvePoint`: day >=0, volume_cm3 >=0, lower_cm3 nullable >=0, upper_cm3 nullable >=0. Bands are either both null or satisfy lower <= volume <= upper. Day 0 equals the case baseline within the engine manifest's `parity_tolerance`, because a float32 graph cannot reproduce it bit-exactly (C30). **Grid:** every curve has one point per integer day `0..horizon_days` inclusive (C25).
- `ScenarioResult`: id, request, source=`trained_model|conditional_calibration|mechanistic|cached|synthetic`, origin_source nullable (required for cached), curves: exactly one `Curve`, for the requested intervention (a drug-on vs drug-off comparison is two requests, C31), model_version, assumptions array, warnings array, provenance, created_at. Never attach a trained-model label to hand-generated curves. Source assignment is fixed by the table under "Engine artifacts".
- `Curve`: label, evidence=`forecast|illustrative`, band_kind=`none|sensitivity|empirical_interval`, points. Results never contain observed points; the UI draws them from the CaseRecord. A drug-off curve is illustrative, because there is no untreated data.
- `JobRecord`: id, kind=`scenario|explanation`, state=`queued|running|succeeded|failed|cancelled`, progress [0,1], result_id nullable, error nullable=`Problem`, created_at, updated_at. `result_id` is a ScenarioResult id for `scenario` jobs and an ExplanationResult id for `explanation` jobs (C8). Terminal fields and progress rules are semantic validators, not guesses in UI. An interrupted job is `failed` with Problem `INTERRUPTED`.
- `ExplanationRequest`: result_id, question length 1-1000. `ExplanationResult`: id, result_id (the explained ScenarioResult), source=`qwen|cached_qwen|template`, text, referenced_fields string array, model_id nullable, warnings. LLM output references stored facts; no new numerical claims.
- `Capabilities`: profile=`local|pages`, empirical_available, mechanistic_available, chat_available booleans, empirical_model_version nullable, mechanistic_model_version nullable, status=`ready|degraded|starting`, degraded_reasons string array (C6).
- `Problem`: code enum (`INVALID_INPUT`, `NOT_FOUND`, `QUEUE_FULL`, `MODEL_UNAVAILABLE`, `OUT_OF_DOMAIN`, `DEPENDENCY_TIMEOUT`, `INTERRUPTED`, `INTERNAL`), message, retryable boolean, trace_id. Error details never contain tokens or raw patient data.
- `EmpiricalManifest`: contract_version=1, engine=`empirical`, model_version, onnx_path + onnx_sha256, preprocessing_path + preprocessing_sha256, model_card_path, inputs/outputs (fixed below), dtype=`float32`, volume_epsilon_cm3 >0, validated_horizon_days >0, cancer=`breast`, intervention=`paclitaxel`, trained_on=`real|synthetic`, band_kind=`none` (v1, C3), parity_tolerance >0, train/validation/test independent-patient counts, limits.
- `MechanisticManifest`: contract_version=1, engine=`mechanistic`, model_version, onnx_path + onnx_sha256, model_card_path, inputs/outputs (fixed below), dtype=`float32`, max_horizon_days (0,84], parameter_basis=`assumption|conditional_calibration`, assumptions (>=1), band_kind=`sensitivity`, parity_tolerance >0, limits.

Manifests are immutable per release. A missing manifest, or one whose hash fails, disables that engine and adds a `degraded_reasons` entry.

## Engine artifacts (tensor contract)

| Engine | Inputs (float32) | Outputs (float32) | Inside the graph |
|---|---|---|---|
| empirical | `baseline_volume_cm3` [batch,1], `elapsed_days` [batch,1] | `log_volume_ratio` [batch,1], `volume_cm3` [batch,1] | `log(V0+eps)`, standardization of both features with train-only stats, `f(z(t)) - f(z(0))`, `max(exp(lr)*(V0+eps)-eps, 0)` (error from the floor <= eps) |
| mechanistic | `baseline_volume_cm3` [1], `days` [T], `intervention_on` [1], `sensitivity_scale` [1] | `volume_cm3` [T], `lower_cm3` [T], `upper_cm3` [T] | closed-form logistic growth with constant suppression `k*scale` while on, evaluated over a baked (r,k) grid; volume = grid median, band = grid envelope. Exposure is on for the whole horizon when `intervention_on=1` |

Both graphs are exported at ONNX opset 17 with float32 tensors; the browser's onnxruntime-web build must load opset 17 (C34). Callers pass raw volumes and day numbers and do nothing else numerically. `preprocessing.json` is published and hashed for audit; **no runtime reads it** (C1).

DTO assembly is the same in both runtimes and is pinned by the parity fixture:

| Engine / condition | `source` | Curve `evidence` | `band_kind` |
|---|---|---|---|
| empirical, `trained_on=real` | `trained_model` | `forecast` | `none` |
| empirical, `trained_on=synthetic` | `synthetic` | `forecast` | `none` |
| mechanistic, `parameter_basis=assumption` | `mechanistic` | `illustrative` | `sensitivity` |
| mechanistic, `parameter_basis=conditional_calibration` | `conditional_calibration` | `illustrative` | `sensitivity` |
| any cache hit | `cached`, `origin_source` = original source | unchanged | unchanged |

Parity fixtures (`parity-fixture.schema.json`) compare `points` within `tolerance_cm3`, and `evidence`/`band_kind` exactly. Labels are presentation and aren't compared. Vinesh produces each fixture and passes it in Python; Praneeth's worker passes it in the browser; Chaandan's export gate runs both tests and reimplements neither (C17).

## Release and artifact layout

All paths are relative to `artifacts/public/`. The release index is the only file that selects versions (C16).

```
artifacts/public/release-index.json                 Chaandan  (release-index.schema.json)
artifacts/public/empirical/<version>/               Vinesh    manifest.json, model.onnx, preprocessing.json,
                                                              MODEL_CARD.md, metrics.json, parity.json
artifacts/public/mechanistic/<version>/             Vinesh    manifest.json, model.onnx, MODEL_CARD.md, parity.json
artifacts/public/cases/ispy2-<version>.json         Vinesh    CaseRecord[] (de-identified, licence-permitted)
artifacts/public/cases/synthetic-<version>.json     Chaandan  CaseRecord[] (synthetic seed)
artifacts/public/templates/explanations-<v>.json    Vinesh    explanation-templates.schema.json
artifacts/public/templates/explanations-<v>.rendered.json  Vinesh  [{template_id, result, expected_text}]
```

Readers verify each sha256 in the index before use. The local API loads the case catalogs into `cases` at startup; the Pages export copies the listed files unchanged.

**Explanation templates** (C13). A template is plain text with `{dotted.path}` placeholders into the ScenarioResult. Path segments are field names or integer indices, and `-1` means last. A placeholder must resolve to a scalar or the template is invalid. Numbers render with `number_format`: fields ending `_cm3` use `volume_cm3_decimals`, all others `ratio_decimals`. Rounding is half away from zero on the exact binary value: JS `toFixed` semantics, Python `Decimal(x).quantize(..., ROUND_HALF_UP)`. The first template whose `when_source` contains the result's `source` is used. Both renderers must reproduce `*.rendered.json` byte-for-byte, and that fixture includes a rounding tie case.

## Hour 1 checklist

- [ ] Schema/enum/unit/name set agreed; machine schemas and positive/negative fixtures validate.
- [ ] Route/status/error/idempotency contract and job state transitions agreed.
- [ ] Empirical/illustrative/cache labels and supported intervention semantics agreed.
- [ ] Domain engine interface: `listCases()`, `capabilities()`, `submitScenario(request)`, `getJob(id)`, `cancelJob(id)`, `getResult(id)`, `submitExplanation(request)`, `getExplanation(id)`. The browser uses the same DTOs and local job handles.
- [ ] Engine tensor contract above fixed at H1. The H2 source audit fills in values (eps, scaler stats, horizon, counts), never shapes.
- [ ] Synthetic artifact sets, parity fixtures and a synthetic release index published by Vinesh/Chaandan so UI/API build without training.
- [ ] Persistence tables/migration, `JobStore` port and lanes agreed.
- [ ] File owners and generated-output paths assigned; agents read rules before feature work.

## REST contract (local only)

| Method / path | Success | Behavior |
| --- | --- | --- |
| GET `/api/v1/health` | 200 | Process liveness, no model calls |
| GET `/api/v1/capabilities` | 200 Capabilities | Per-engine availability and version, degraded reasons |
| POST `/api/v1/session` | 201 | Create local opaque session cookie; no password/account platform |
| GET `/api/v1/cases` | 200 CaseRecord[] | Catalogs listed in the release index |
| POST `/api/v1/scenarios` | 202 JobRecord | `admission_check`, then persist + queue; Idempotency-Key required |
| GET `/api/v1/jobs/{id}` | 200 JobRecord | Poll at 1s while active, bounded backoff; no GPU wait |
| POST `/api/v1/jobs/{id}/cancel` | 202 JobRecord | Queued: cancelled at once. Running: `cancel_requested`, becomes `cancelled` when the executor confirms. Terminal: unchanged record (idempotent) (C11) |
| GET `/api/v1/results/{id}` | 200 ScenarioResult | Stable stored result, session ownership checked |
| POST `/api/v1/explanations` | 202 JobRecord | Local Qwen task; Idempotency-Key required (C28); background-only |
| GET `/api/v1/explanations/{id}` | 200 ExplanationResult | `{id}` is the explanation job's `result_id`; cached/template/Qwen provenance visible |

Expected invalid input ->422, missing ->404, idempotency replay mismatch ->409, queue full ->429 with Retry-After, unavailable engine ->503 typed Problem. Unexpected faults ->500 typed Problem with trace logging; the UI catches all Problems and remains usable. "No 500 during judging" is a tested resilience goal, not permission to suppress software faults. On Qwen outage, accepted explanation jobs complete with a labeled template.

## Persistence and queue semantics

One SQLite DB with WAL and migrations: `sessions(id,created_at,expires_at)`, `cases(id,payload_json,source_hash)`, `jobs(id,session_id,kind,lane,state,payload_json,progress,result_id,error_json,cancel_requested,lease_owner,lease_expires_at,attempt,created_at,updated_at)`, `results(id,session_id,payload_json,model_version,created_at)`, `explanations(id,session_id,result_id,payload_json,created_at)`, `cache(key,payload_json,source,created_at,expires_at)`, `idempotency(session_id,key,request_hash,response_json,created_at)` with composite uniqueness. Transactions atomically create job/idempotency (C10).

**Snapshots** (C22). Admission writes everything a job needs into `payload_json`: scenario = `{request, case}` (CaseRecord snapshot); explanation = `{request, result, session_scope}` (stored ScenarioResult snapshot). Executors never query other tables.

**Lanes** (C12). `compute`: scenario jobs, a supervised spawn-context process pool of `APP_GPU_WORKERS` (never fork a live CUDA context). `io`: explanation jobs, bounded threads in the app process, which hold the single Qwen breaker. Queue capacity is per lane. A running compute job is not interrupted mid-inference: cancel is honoured before the job starts, or when its result returns, in which case the result is discarded and the job is confirmed `cancelled`. A compute worker process that dies makes its job `failed/INTERRUPTED` (C33).

**Port** (C9). Policy is Vinesh's and mechanism is Nisheeth's. `app/jobs/ports.py` (Vinesh) defines `JobStore` (`claim_next`, `renew`, `progress` -> cancel_requested, `complete`, `fail`, `confirm_cancelled`, `fail_interrupted`) and `ResultCache` (`get`, `put`). `app/persistence` (Nisheeth) implements them over SQLite and runs Vinesh's contract suite `tests/jobs/jobstore_contract.py` against that implementation. `complete` writes the result row and the job transition in one transaction. Writes from a worker that no longer holds the lease are no-ops and get logged. App start and expired leases mark running jobs `failed/INTERRUPTED`; no job is retried automatically, so one claim runs at most once. `fail_interrupted(now)` fails every running job with `lease_expires_at <= now`; at startup the supervisor passes `now + lease_s`, which covers every lease a dead process could hold (C36). Implementations take an injectable clock in their constructor so the contract suite tests lease expiry without sleeping (C35). Single API worker initially; scaling needs a new reviewed claim protocol. Do not rely on FastAPI BackgroundTasks for durable jobs.

**Cache keys** (C21) are computed only in `app/jobs`. Scenario: canonical request + case hash + manifest sha256 + schema version, shared across sessions (public, deterministic inputs). Explanation: result hash + normalized question + templates/knowledge/prompt versions + Qwen model id + session scope (questions are private).

Session cookies are HttpOnly, SameSite, short-lived and Secure when using HTTPS. Restrict mutations to the expected origin and validate session ownership. Binding localhost limits exposure; no claim of real patient authentication. Pages needs no server session; local browser storage contains only demonstration selections/results, never secrets.

## Preprocessing artifact

`contracts/preprocessing.schema.json` fixes a JSON artifact with schema_version=1, the exact two-feature order, means/stds arrays of length two fitted only on train groups, positive volume_epsilon_cm3, transform=`log_baseline_then_standardize`, missing_policy=`reject`, output_inverse=`exp_ratio` and source_volume_unit=`cm3`. Both features (`log(V0+eps)` and elapsed days) are standardized with training-only statistics. **These values are baked into the empirical ONNX graph at export.** The JSON file is the audit record, saved and hashed with the weights. Its `volume_epsilon_cm3` must equal the manifest's. Fixture means/stds are synthetic, not a fitted release artifact.

Semantic validation: standard deviations must be positive; require at least one baseline observation, sorted unique days, consistent baseline volume and provenance; `admission_check` rules as above; successful jobs require result ID/progress=1/no error, failed jobs require error/no result; queued/running jobs have no result; cached results require origin_source; other sources require null origin_source; curve bounds must be paired and ordered; the curve grid matches `horizon_days`. Published empirical artifacts require a real file checksum, nonzero independent-patient groups and saved evaluation evidence; the fixture's zero hash is never release-valid.

## Code/file boundaries

- Chaandan: `contracts/**`, generation scripts, generated `web/src/generated/**` and `app/generated/**`, `artifacts/public/release-index.json`, `artifacts/public/cases/synthetic-*.json`. Semantic changes need Nisheeth/Vinesh/Praneeth agreement.
- Nisheeth: `app/routes/**`, `app/persistence/**` (implements `JobStore`/`ResultCache`), `app/services/scenarios.py`, `app/session.py`, `app/main.py`, `app/settings.py` (maps `APP_*` to Vinesh's config dataclasses) and lifespan integration.
- Vinesh: `modeling/**`, `app/jobs/**` (ports, supervisor, handlers, cache keys and the published `load_release`, `admission_check`, `make_supervisor`), `app/integrations/**`, `app/services/explanations.py`, `prompts/**`, artifact sets, real case catalogs and templates under `artifacts/public/`.
- Praneeth: `web/**` except generated; engine adapters/workers (two ONNX sessions + template renderer); `app/telemetry/**` behind Nisheeth's API wiring, and GX10 scripts.

Never add a formula, scaler or inverse transform in Python handlers or React/worker code; it lives in the graph. Boundary changes are one coordinated commit/merge, never a silent runtime cast.
