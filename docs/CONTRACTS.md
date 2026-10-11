# Hour 1 contract and file-boundary checklist

Schema version `1`. [domain.schema.json](../contracts/domain.schema.json) is the normative draft-2020-12 field/enum/bounds contract. [examples.json](../contracts/examples.json) contains labeled synthetic boundary fixtures. Praneeth, Nisheeth and Vinesh agree semantics; Chaandan generates/validates artifacts before feature coding.

## Exact contract definitions

All objects reject extra fields. All numbers must be finite. UUID identifiers are opaque UUID strings. Timestamps are RFC3339 UTC. Volume is always explicitly `cm3` in the domain contract; import converts source units only after verification (1 cm3 = 1000 mm3). No NaN/Infinity in JSON. Pydantic models and generated TS/Zod must match these definitions; field omission differs from null.

- `CaseRecord`: id, label, cancer=`breast`, source=`ispy2|synthetic`, patient_group_id, baseline_volume_cm3 >0, subtype nullable, observations `[Observation]`, provenance=`Provenance`, eligible_paclitaxel boolean. No exposed direct identifiers.
- `Observation`: day >=0, volume_cm3 >=0, measurement=`ftv|mask_volume|synthetic`, phase=`baseline|early_paclitaxel`, source_ref string. Unique sorted days are a semantic validator.
- `Provenance`: source_ref, dataset_version, measurement_method, regimen_verified, synthetic, limitations string array. Real/synthetic values must agree with CaseRecord source.
- `ScenarioRequest`: contract_version=1, case_id, engine=`empirical|mechanistic`, horizon_days [1,84], intervention=`paclitaxel|none`, sensitivity_scale [0,2], model_version nonempty, seed integer >=0. `none` is a comparator, not a second drug. Empirical accepts only paclitaxel, scale=1, eligible case and validated horizon; mechanistic accepts none and bounded what-if scale. Server validates supported ranges from ModelManifest, never assumes 84 days is empirically trained.
- `CurvePoint`: day >=0, volume_cm3 >=0, lower_cm3 nullable >=0, upper_cm3 nullable >=0. Bands are either both null or satisfy lower <= volume <= upper. Day 0 equals baseline.
- `ScenarioResult`: id, request, source=`trained_model|conditional_calibration|mechanistic|cached|synthetic`, origin_source nullable (required for cached), curves `[Curve]`, model_version, assumptions array, warnings array, provenance, created_at. Never attach a trained-model label to hand-generated curves.
- `Curve`: label, evidence=`observed|forecast|illustrative`, band_kind=`none|sensitivity|empirical_interval`, points. Observed points are measurements; a drug-off curve is illustrative absent untreated data.
- `JobRecord`: id, kind=`scenario|explanation`, state=`queued|running|succeeded|failed|cancelled`, progress [0,1], result_id nullable, error nullable=`Problem`, created_at, updated_at. Terminal fields and progress rules are semantic validators, not guesses in UI.
- `ExplanationRequest`: result_id, question length 1-1000. `ExplanationResult`: id, result_id, source=`qwen|cached_qwen|template`, text, referenced_fields string array, model_id nullable, warnings. LLM output references stored facts; no new numerical claims.
- `Capabilities`: profile=`local|pages`, empirical_available boolean, mechanistic_available boolean, chat_available boolean, model_version nullable, status=`ready|degraded|starting`.
- `Problem`: code enum (`INVALID_INPUT`, `NOT_FOUND`, `QUEUE_FULL`, `MODEL_UNAVAILABLE`, `OUT_OF_DOMAIN`, `DEPENDENCY_TIMEOUT`, `INTERRUPTED`, `INTERNAL`), message, retryable boolean, trace_id. Error details never contain tokens or raw patient data.
- `ModelManifest`: contract_version=1, model_version, sha256, artifact_path, input_names=`[features]`, feature_order=`[log_baseline_ftv_cm3,elapsed_days]`, feature_count=2, output_name=`log_volume_ratio`, dtype=`float32`, feature_transform artifact, validated_horizon_days >0, cancer=`breast`, intervention=`paclitaxel`, trained_on=`real|synthetic`, band_kind, parity_tolerance >0, train/validation/test independent-patient counts, limits. Immutable per release; missing manifest disables empirical mode.

## Hour 1 checklist

- [ ] Schema/enum/unit/name set agreed; machine schema and positive/negative fixtures validate.
- [ ] Route/status/error/idempotency contract and job state transitions agreed.
- [ ] Empirical/illustrative/cache labels and supported intervention semantics agreed.
- [ ] Domain engine interface: `listCases()`, `capabilities()`, `submitScenario(request)`, `getJob(id)`, `getResult(id)`, `submitExplanation(request)`; cancellation included for local jobs. Browser uses same DTOs and local job handles.
- [ ] Features fixed at H1: `features` float32 `[batch,2]` ordered as `log_baseline_ftv_cm3`, `elapsed_days`; output `log_volume_ratio` float32 `[batch,1]`. H2 source audit fills mapping and training-only scaler statistics without changing this interface.
- [ ] PyTorch/ONNX tensor names, preprocessing manifest and browser parity fixture agreed.
- [ ] Persistence tables/migration and single-process executor boundary agreed.
- [ ] File owners and generated-output paths assigned; agents read rules before feature work.

## REST contract (local only)

| Method / path | Success | Behavior |
| --- | --- | --- |
| GET `/api/v1/health` | 200 | Process liveness, no model calls |
| GET `/api/v1/capabilities` | 200 Capabilities | Distinguishes mode and unavailable components |
| POST `/api/v1/session` | 201 | Create local opaque session cookie; no password/account platform |
| GET `/api/v1/cases` | 200 CaseRecord[] | Prepared, bounded demo catalog |
| POST `/api/v1/scenarios` | 202 JobRecord | Validate, persist and queue; Idempotency-Key required |
| GET `/api/v1/jobs/{id}` | 200 JobRecord | Poll at 1s while active, bounded backoff; no GPU wait |
| POST `/api/v1/jobs/{id}/cancel` | 202 JobRecord | Cooperative cancel, transition when executor confirms |
| GET `/api/v1/results/{id}` | 200 ScenarioResult | Stable stored result, session ownership checked |
| POST `/api/v1/explanations` | 202 JobRecord | Local Qwen task; idempotent and background-only |
| GET `/api/v1/explanations/{id}` | 200 ExplanationResult | Cached/template/Qwen provenance visible |

Expected invalid input ->422, missing ->404, queue full ->429 with Retry-After, unavailable engine ->503 typed Problem. Unexpected faults ->500 typed Problem with trace logging; UI catches all Problems and remains usable. “No 500 during judging” is a tested resilience goal, not permission to suppress software faults. On Qwen outage, accepted explanation jobs complete with a labeled template where evidence exists.

## Persistence and queue semantics

One SQLite DB with WAL and migrations: `sessions(id,created_at,expires_at)`, `cases(id,payload_json,source_hash)`, `jobs(id,session_id,kind,state,payload_json,progress,result_id,error_json,created_at,updated_at)`, `results(id,session_id,payload_json,model_version,created_at)`, `explanations(id,session_id,result_id,payload_json,created_at)`, `cache(key,payload_json,source,created_at,expires_at)`, `idempotency(session_id,key,request_hash,response_json,created_at)` with composite uniqueness. Transactions atomically create job/idempotency; replay mismatch is 409.

App lifespan owns one bounded supervisor/scheduler; DB persists queue state. Worker threads handle local HTTP; a supervised process executor handles CPU/CUDA numerical work (spawn after initialization planning, never fork a live CUDA context). One GPU job at a time initially. HTTP inserts and returns; process completion updates DB through repository calls. App restart marks previous running jobs interrupted; queued jobs are admitted safely by a lease/atomic claim. Do not rely on FastAPI fire-and-forget BackgroundTasks for durable long jobs. Single API worker initially; scaling needs a new reviewed claim protocol.

Session cookies are HttpOnly, SameSite, short-lived and Secure when using HTTPS. Restrict mutations to expected origin and validate session ownership. Binding localhost limits exposure; no claim of real patient authentication. Pages needs no server session; local browser storage contains only demonstration selections/results, never secrets.

## Preprocessing artifact

`contracts/preprocessing.schema.json` fixes a JSON artifact with schema_version=1, the exact two-feature order, means/stds arrays of length two fitted only on train groups, positive volume_epsilon_cm3, transform=`log_baseline_then_standardize`, missing_policy=`reject`, output_inverse=`exp_ratio`, and source_volume_unit=`cm3`. The baseline input uses `log(V0+epsilon)`; elapsed days are standardized with training-only statistics. Inverse output matches the target definition in data/model design. Save these fitted values with the weights and hash them. Fixture means/stds are synthetic, not a fitted release artifact.

Semantic validation: standard deviations must be positive; feature_count/order must match; require at least one baseline observation, sorted unique days, consistent baseline volume and provenance; empirical requests require paclitaxel/scale=1/eligible case/horizon within manifest; successful jobs require result ID/progress=1/no error, failed jobs require error/no result; queued/running jobs have no result; cached results require origin_source; other sources require null origin_source; curve bounds must be paired and ordered. Published empirical artifacts require real file checksum, nonzero independent-patient groups and saved evaluation evidence; the fixture's zero hash is never release-valid.

## Code/file boundaries

- Chaandan: `contracts/domain.schema.json`, `contracts/examples.json`, generation scripts; generated `web/src/generated/**` and `app/generated/**`. Semantic changes need Nisheeth/Vinesh/Praneeth agreement.
- Nisheeth: `app/routes/**`, `app/persistence/**`, `app/services/scenarios.py`, `app/session.py`, `app/main.py` and lifespan integration.
- Vinesh: `modeling/**`, `app/jobs/**`, `app/integrations/**`, `app/services/explanations.py`; contract-compatible executor factory injected into lifespan.
- Praneeth: `web/**` except generated; engine adapters/workers; `app/telemetry/**` behind Nisheeth's API wiring, and GX10 scripts.

Never add a second formula/scaler implementation inside a React component. Shared artifact transforms are data, loaded by tested engine modules. Boundary changes are one coordinated commit/merge, never a silent runtime cast.
