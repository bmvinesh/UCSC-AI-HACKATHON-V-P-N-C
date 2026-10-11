# Master Implementation Plan

Version 1.0 | Reset: 2026-10-10 | Four developers | 24-36 hours

## 1. Product and critical path

Build a research tool for **breast cancer volume evolution with one paclitaxel intervention**. The user selects a de-identified demonstration case, inspects observed volume points, explores a bounded early-treatment forecast, and compares it with an explicitly assumption-based no-intervention scenario. The chart distinguishes observed, forecast, illustrative physics, and uncertainty sources. Qwen explains stored model outputs on GX10; numerical modeling works independently of chat.

Choose breast cancer because serial treatment MRI and released measurement tables offer a larger verified starting pool than the project's previous glioma cohort. This is a pragmatic data choice, not a claim that breast cancer has the most longitudinal data worldwide. See [data/model design](DATA_AND_MODEL.md) for treatment restrictions and the Hour 2 evidence gate.

**Critical path:** source audit -> eligible longitudinal records -> patient-disjoint model training/evaluation -> ONNX/browser parity -> working static demo. Local GPU simulation and Qwen are demonstrated on GX10 in parallel. If the empirical cohort fails audit, ship a labeled mechanistic/synthetic research demonstration; do not call it a patient-trained model or mark the full training objective achieved.

## 2. Two runtime profiles, one codebase

**Local:** one FastAPI app serves the built React frontend, validated API, SQLite sessions/jobs, growth inference and background-job supervisor. Process/thread executors belong to this monolith. The app calls the installed local Qwen runtime through an adapter. No application service-to-service architecture or broker.

**Pages:** same React UI uses a `BrowserEngine` adapter. An ONNX model and preprocessing manifest load once in a Web Worker; WASM inference is the compatible baseline. Charts, selection, assumptions and export run without a Python server. Qwen chat is visibly unavailable; a deterministic explanation of the current result remains available. Optional precomputed scenarios are labeled cached fixtures, not fresh inference.

Select the adapter explicitly from build config. Pages never probes visitor localhost, contacts a public GPU endpoint, or puts a credential in client config. Local UI talks to its same-origin API. No Vercel/Railway dependency: GitHub Pages is the requested public target.

## 3. Single-responsibility module design

| Module | Sole responsibility | Must not do |
| --- | --- | --- |
| `contracts/` | Schemas, semantic validation rules, generated interfaces | Train, access database, render UI |
| `app/routes/` | Parse request, invoke service, shape response | Run GPU/LLM work inline |
| `app/services/scenarios.py` | Coordinate validated scenario lifecycle | Numerical formulas or SQL inline |
| `app/persistence/` | SQLite transaction/repository logic | Invoke model or change scientific outputs |
| `app/jobs/` | Admission, claims, progress, recovery, cancellation | Define biology or UI state |
| `app/integrations/qwen.py` | Local model runtime protocol and health | Determine volume or drug efficacy |
| `app/services/explanations.py` | Grounded context, validation and fallback | Alter model outputs |
| `modeling/data/` | Import/join/audit/preprocess records | Train or fabricate labels |
| `modeling/train/` | Patient-disjoint fitting and validation | Import UI/routes or publish automatically |
| `modeling/simulation/` | Growth/intervention math and invariants | Call LLM, database, network |
| `modeling/export/` | Export checkpoint/scaler/model card and parity | Fit on test patients |
| `web/src/engines/` | Same domain interface for API/browser engines | Mix charts, clinical logic, credentials |
| `web/src/features/` | Case/curve/assumption/explanation interactions | Duplicate model formulas or API schemas |

No global service locator, universal manager class, or invented event bus. Use explicit dependencies and small pure functions. Stable data contract allows code to be local or browser-executed without duplicating interpretation.

## 4. Named ownership

Follow the newly requested four-developer allocation; earlier heavy/support assignments are superseded.

- **Dev 1 Praneeth:** frontend/UX plus direct GX10 operation and local runtime coordination using his installed Claude Code.
- **Dev 2 Nisheeth:** FastAPI routes, SQLite/ORM/migrations, local session/job persistence, validation.
- **Dev 3 Vinesh:** data audit, trained growth/response model, CUDA simulation, background execution, Qwen/caching/fallback pipeline.
- **Dev 4 Chaandan:** contract enforcement/generation, branch arbitration, CI/Pages export, synthetic seeds, smoke tests and pitch runbook. Coordinate shared root files and hardware windows with Praneeth.

Read [role contracts](roles/README.md). Vinesh supplies minimal fixtures immediately so UI/API do not wait for training. Nisheeth and Vinesh agree job interfaces; Chaandan generates the frozen schemas, not scientific decisions. Each developer verifies their own behavior.

## 5. Schedule and exit gates

The final four hours are **inside** the chosen duration. For 24h, hardening is hours 20-24; for 36h, hours 32-36. Do not append four hours to a 24h deadline.

### Hour 0-2: setup and schema freeze

- H0-0.25: choose breast/paclitaxel, inspect GX10 and installed Qwen runtime, create clean branches/checkouts, agree artifact names and read repo rules.
- H0.25-1: finalize all DTO fields/bounds, API paths, errors, job states, mode capabilities, model tensors/preprocessing, volume units, data/provenance labels. Chaandan validates machine schemas/fixtures and generates clients. **Freeze by Hour 1.**
- H1-2: Nisheeth creates app/session/job migrations; Praneeth starts layout/engine mocks; Vinesh audits measurement/treatment/time columns and provides a runnable CUDA toy baseline; Chaandan provisions CI tasks/build skeleton and static seed.
- Exit: clean clone builds the skeleton; contract validation passes; usable source plan and exact Qwen local endpoint/model identity are recorded. No feature coding before Hour 1 contract agreement; scaffolding/audit may proceed.

### Hour 2-12: parallel core build

- Praneeth: case flow, observations/forecast comparison, assumptions/coverage panel, engine adapter, chart responsiveness, local chat progress UI. Use v0/Lovable exports as optional scaffolds; inspect/export source, then operate in the repo with no builder cloud dependency.
- Nisheeth: session cookie, data/result routes, persistent jobs, transactions/idempotency, stable errors, recovery, model metadata/capabilities. Routes return 202 quickly; job execution belongs to Vinesh's executor.
- Vinesh: cohort importer/exclusions, patient-grouped splits, baseline and small CUDA model, physics/sensitivity simulation, ONNX export; asynchronous explanation adapter and deterministic fallback. No last-minute research architecture.
- Chaandan: contract/client generation, pages base path/router/asset fixture, CI and smoke suite, reproducible seed/pitch flow. Merge runnable slices by H4/H8/H12.
- H4 gate: real audited sample and at least one held-out patient path; if blocked, openly switch development fixtures to synthetic while recording the unmet empirical objective.
- H8 gate: local core scenario works; first model exports or precise blocker identified.
- H12 gate: shared schema intact, training pipeline produces reproducible candidate, frontend has an end-to-end fixture flow.

### Hour 12-18: merge and pipeline hookup

- Connect UI to local API/jobs and to the browser model using the same domain engine interface.
- Run held-out validation against persistence/linear baselines; export preprocessing and verify Python/ONNX/browser parity.
- Bind installed Qwen runtime; generate an explanation from stored findings, never free-form new measurements.
- Verify job cancellation/restart semantics, patient leakage checks, no synchronous inference in POST routes, local secrets absent from bundles.
- Exit: real or explicitly synthetic local flow, browser model result and parity evidence, first Pages build ready, local chat can fail without breaking modeling.

### Hour 18-24: polish, edge cases and fallbacks

- Warm hash-keyed scenario cache, source snapshots, cached explanations and static fixtures.
- Exercise queue full, missing data/model, corrupt artifact, Qwen timeout/rate limit, out-of-range scenario, empty browser cache, and worker failure.
- Use typed recoverable errors; expected outages yield cached/template outputs or a readable retry state. Do not hide unexpected bugs as fabricated successful results.
- Complete model card, provenance/exclusion counts, readable limits, accessibility, source attribution and measured GX10 evidence.
- On 24h track: H18-20 are polishing; H20-24 are the locked final-hardening block below.

### Hour 24-32: optional 36h extension

Improve empirical cohort coverage, bootstrap stability, additional held-out analyses, measured CUDA batching, richer 3D visualization, and browser performance. Preserve one cancer/one drug. No second model family, cloud service, authentication platform or new state library. Freeze at H32.

### Final four hours: demo hardening

- T-4h: lock dependency/schema/model versions and record release commit; feature freeze.
- T-3h: deploy tested Pages build, verify clean-browser URLs/hash routing/model+WASM assets, and rehearse local GX10 with internet disabled.
- T-2h: run [smoke script](DEMO_RUNBOOK.md), cached Qwen-failure path, and restart recovery; repair only release-critical defects through micro-commits.
- T-1h: confirm source/license/model card links, prerecorded backup, three-minute pitch, survey reminder and hardware-return plan; preserve last tested artifacts.

## 6. Delivery acceptance

- One cancer and one user-facing intervention; audited regimen inclusion and outcome horizon.
- Real model training/inference provenance is visible; empirical, calibrated, synthetic and cached labels never blur.
- Patient-disjoint validation and documented comparison to simple baselines; no invented accuracy figures.
- Interactive public Pages model inference without Qwen/backend dependency; local GX10 app has live inference/chat and measured hardware work.
- Typed faults, cache keys with versions, deterministic fallback and cold/restart tests.
- No credential in repository/build/artifact; no privileged clinical claims or prescription UI.
- No application microservices; each module owns one responsibility; small reviewed commits and bounded agent context.

These are delivery targets. Publishing this plan does not demonstrate that any gate has passed or make the prototype clinically production-ready.
