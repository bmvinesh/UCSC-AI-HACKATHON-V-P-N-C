# Praneeth execution plan: frontend/UX and GX10 operation

Working plan for Dev 1 (Praneeth). It turns the [role contract](../docs/roles/01-praneeth-frontend-gx10.md) into ordered, verifiable slices. It does not restate or override the contract: on any conflict the sources in section 2 win and this file gets fixed.

- Contract baseline commit: `7d6cb3285e5e73bb71461b0ef51285a6a40dc747` (`origin/main`, 2026-10-11: the merge of Vinesh's boundary redesign, pull request 1). The gate compares against `origin/main` by default; a temporary base can be set with `git config gate.baseRef`.
- Role branch: `dev/praneeth-ui-gx10`
- Gate: `scripts/gx10/change_gate.sh`, run before and after every change
- Automatic runs: `scripts/gx10/install_gate_hooks.sh` installs a git pre-commit hook and a Claude Code edit hook in local, untracked files, so the gate runs after every agent edit and blocks a failing commit
- Scope: the frontend, plus every job that has to run on the GX10 (model and dataset downloads, environment, training, export, benchmarks). Section 3a says what "run" covers and what it does not.
- State at baseline: the repository holds planning documents only. No UI, engine, model, API or hardware measurement exists. Nothing below is finished unless its Status is `done` and section 9 shows the evidence.

## 1. Change gate (every change goes through this)

**Start of a slice**

1. `git fetch origin`, then run the gate. The tree must be clean, or hold only this plan.
2. In section 5 set exactly one slice to `active`. Re-read its row and notes, section 3 (boundaries) and section 4 (invariants).
3. Before editing, state: target owned files, minimal pseudocode, contract sample payload, failure and cancel behaviour, verify command. This is the repo's plan-before-code rule.

**Before and after each edit inside the slice**

4. Run the gate. A FAIL means stop and fix the cause. Never bypass the gate or edit it to pass.
5. Read the diff against invariants I1 to I14.

**End of a slice**

6. Run the slice's Verify commands. Record real output only. A check that was skipped is recorded as skipped, not passed.
7. Commit named paths on the role branch, one slice per commit. No `git add .`.
8. Set the slice to `done`, add a row to section 9 with the commit hash and evidence, and mark the next slice `active`. This bookkeeping edit rides in the next commit.

**When another owner's file would have to change:** do not edit it. Write the exact interface example or patch as a request in section 6 and keep working inside ownership.

**Rule of 3:** after three distinct failed fixes for one bug, save the patch, reproduction and logs on a clean branch, restart the session context, and re-feed only the minimal failing files, contracts and logs.

The gate checks seven things mechanically:

| # | Check | Fails when |
| --- | --- | --- |
| 1 | Ownership | A path changed on the branch or in the working tree is outside section 3 |
| 2 | Pointers | An owned root exists without a `CLAUDE.md` naming this plan |
| 3 | Public env | A changed file under `web/` names a secret-like `VITE_*` variable |
| 4 | Contract drift | A contract source (section 2, items 1 to 5) differs on `origin/main` from the baseline commit above |
| 5 | One slice | The working tree has changes beyond this plan and the count of `active` slices is not exactly 1 |
| 6 | No weights or data in Git | A changed file is a weight, checkpoint, ONNX or raw-imaging file, or is larger than 5 MB |
| 7 | No tokens | A changed file holds a token-like literal (Hugging Face, GitHub, `sk-`, bearer) |

Everything else in section 4 is a manual check at steps 5 and 6. When check 4 fires: re-read the changed files, update this plan, then set the baseline to the new `origin/main` commit.

## 2. Sources of truth, highest first

1. [CLAUDE.md](../CLAUDE.md), the root rules
2. The machine schemas in [contracts/](../contracts/): `domain`, `release-index`, `parity-fixture`, `explanation-templates`, `preprocessing`, and the fixtures in `examples.json`
3. [docs/CONTRACTS.md](../docs/CONTRACTS.md), with its rationale in [the boundary redesign](../docs/proposals/2026-10-10-boundary-redesign.md)
4. [My role contract](../docs/roles/01-praneeth-frontend-gx10.md) and the [ownership registry](../docs/roles/README.md)
5. [docs/GIT_AND_AGENT_WORKFLOW.md](../docs/GIT_AND_AGENT_WORKFLOW.md)
6. [Master plan](../docs/MASTER_IMPLEMENTATION_PLAN.md) (schedule and gates), [data and model](../docs/DATA_AND_MODEL.md) (browser export), [demo runbook](../docs/DEMO_RUNBOOK.md) (smoke sequences)
7. This plan

The `oncovision/` material on branches `cha1` and `claude/dreamy-brahmagupta-i6bey7` belongs to the retired histology plan and is not a source.

## 3. Boundaries

| Access | Paths | Owner |
| --- | --- | --- |
| Write | `web/**` except `web/src/generated/**`, including the frontend package, lockfile and Vite/build config | Praneeth |
| Write | `app/telemetry/**`, `scripts/gx10/**`, `tests/frontend/**`, `tests/hardware/**` | Praneeth |
| Read only | `contracts/**`, `web/src/generated/**`, `app/generated/**`, `docs/**`, root `CLAUDE.md`, `README.md`, `.gitignore`, `.env.example`, root `pyproject.toml`, lockfiles, `Makefile`, `.github/workflows/**`, `scripts/{generate_contracts,seed_demo,export_site,smoke}.*`, `tests/contracts/**`, `tests/e2e/**` | Chaandan |
| Read only | `app/routes/**`, `app/persistence/**`, `app/services/scenarios.py`, `app/session.py`, `app/main.py`, `app/settings.py`, `tests/api/**`, `tests/persistence/**` | Nisheeth |
| Read only | `modeling/**`, `app/jobs/**`, `app/integrations/**`, `app/services/explanations.py`, `prompts/**`, `data/processed/**`, `artifacts/public/**`, `tests/modeling/**`, `tests/jobs/**`, `tests/explanations/**` | Vinesh |
| Ask first | Any path not listed above | Named assignment required |

Also mine to coordinate, not files: GX10 hardware-test windows, one at a time.

### 3a. GX10 operation: what I run and what stays with its owner

I am the only one on the GX10, so every download, install, training run, export run and benchmark is executed by me, through `scripts/gx10/**`, inside a hardware window. Under the registry at the baseline commit this makes me the operator of that work. The scientific code and decisions keep their owners until the registry changes (request D9, question Q10).

| Work on the GX10 | I run it and own | Stays with |
| --- | --- | --- |
| Qwen runtime: discovery, health, keeping it loaded, any model pull | `scripts/gx10/**`, the window, the reported settings | Vinesh: adapter and prompts. Nisheeth: settings validation |
| Python and CUDA environment: PyTorch for aarch64, ONNX, ONNX Runtime | Local `.venv/` (ignored), the compatibility proof, proposed pins | Chaandan: root `pyproject.toml` and lockfile |
| Dataset download: I-SPY2 tables, a few representative MRI volumes | Fetch script, checksums, `data/raw/` (ignored) | Vinesh: what to fetch, audit, eligibility, `data/processed/**` |
| Training runs | Run harness, logs, seeds, timings, `artifacts/checkpoints/` (ignored) | Vinesh: training code, splits, hyperparameters, metric claims |
| ONNX export run and parity run | Running both, and the browser side of parity | Vinesh: export code, manifest, model card, `artifacts/public/**` |
| CUDA simulation benchmark | The run and the CPU versus GPU record | Vinesh: probe and physics |
| ONNX Runtime Web WASM assets | `web/` package and bundling | nobody else |

Every output of a run lands in a git-ignored directory. Getting a trained artifact set into `artifacts/public/**` is Vinesh's commit today, which is awkward because the files are produced here. Q8 asks the team to settle that path.

## 4. Invariants

- **I1 Ownership.** Edit only the Write rows of section 3. Never touch shared schemas, backend state machines, trained model artifacts or biological parameters.
- **I2 One implementation of the numbers.** No formula, scaler, inverse transform or clinical rule in a component, an engine or a worker. Every transform lives inside the ONNX graphs. My code passes raw volumes and day numbers in and reads volumes out. No runtime reads `preprocessing.json`; it is an audit record.
- **I3 No secrets.** No token literals anywhere. Nothing secret in `VITE_*`. Never log auth headers, full environment or sensitive prompts.
- **I4 Evidence labels never blur.** Observed points are drawn only from `CaseRecord.observations`; a result curve is `forecast` or `illustrative`, never observed. The three are distinct in drawing and in text. `source`, `evidence` and `band_kind` are assigned by the table in `docs/CONTRACTS.md`, not chosen by the UI. Cached results show their origin. Synthetic is visibly marked. Volume is always shown as cm3. `sensitivity` and `empirical_interval` bands are labelled differently.
- **I5 Stale results are rejected.** A response for an earlier case or request is never rendered.
- **I6 Pages is static.** No request to an API, to localhost or to a remote chat endpoint. Chat is labelled as a local GX10 feature.
- **I7 No clinical claims.** No dosing or prescribing control. `none` is a comparator, not a second drug.
- **I8 The UI does not guess.** Job state rules come from validated DTOs. Every `Problem` is caught and the UI stays usable. Errors are never shown as success.
- **I9 Stack.** React, Vite, TypeScript, Tailwind. ONNX Runtime Web (WASM) in a Web Worker. No new state library, no hosted backend, no cloud inference.
- **I10 Hardware honesty.** Do not replace or restart a working Qwen install. Privileged changes follow host permissions. No timing, memory or speedup is reported unless it was measured.
- **I11 No DTO copies.** Types and validators come from `web/src/generated/**`. No local duplicate DTO and no `as any`.
- **I12 Operator, not author.** I run downloads, training and export on the GX10. I do not write or tune `modeling/**`, choose splits or hyperparameters, or state a metric, unless the registry on `origin/main` assigns that to me.
- **I13 Every run is reproducible and recorded.** A download or training run writes one record under `runtime/gx10/runs/`: command, repo commit, seed, start and end time, exit code, input and output SHA-256, package versions. Downloads are bounded and named in advance; the multi-terabyte archive is never pulled. Weights, checkpoints and raw data stay in ignored directories.
- **I14 One heavy load at a time.** Training, benchmarks and Qwen share one GPU and one memory pool. A run starts only in a declared window, and nothing is restarted while someone else depends on it.

## 5. Slices

Status is the last column: `todo`, `active`, `blocked` or `done`. Windows are the 24-hour track from the master plan. "Deliver n" refers to the numbered list in the role contract.

| ID | Slice | Contract | Window | Needs | Status |
| --- | --- | --- | --- | --- | --- |
| S0 | Plan, change gate, role branch | Workflow | H0 | none | done |
| G1 | GX10 and Qwen runtime inventory, read-only | Deliver 1 | H0 to H1 | none | done |
| E1 | Python and CUDA environment on the GX10, proposed pins | Deliver 1, 5 | H0 to H2 | none | done |
| M1 | Model and runtime assets: verify what is installed, fetch only what is missing | Deliver 1 | H0 to H2 | G1, Q9 | done |
| M2 | Dataset fetch with checksums | Deliver 5 | H1 to H4 | D10 | blocked |
| M3 | Training run harness, then the runs | Deliver 5 | H2 to H12 | E1, M2, D11 | blocked |
| M4 | Export run and on-device parity run | Deliver 5 | H8 to H18 | M3, D3 | todo |
| C1 | Hour 1 freeze: agree DTO and engine semantics, resolve section 8 | Deliver 3 | H0.25 to H1 | all owners | todo |
| F1 | React, Vite, TypeScript, Tailwind scaffold, versions pinned on aarch64 | Deliver 2 | H1 to H2 | none | done |
| F2 | `DomainEngine` interface and fixture-backed engine | Deliver 3 | H1 to H4 | D1 (interim below), Q7 | done |
| F5 | `BrowserEngine`: release index, two ONNX sessions in a worker, DTO assembly, parity. My first slice after the freeze, per the redesign | Deliver 3 | H2 to H12 | D3, Q11 | todo |
| F6 | Template renderer, and explanation states for local and Pages | Deliver 4 | H4 to H12 | F2, D3 | active |
| F3 | Case list, observations from CaseRecord, chart, assumptions and model-card panel | Deliver 2 | H2 to H8 | F2, Q13 | done, except manifest facts (Q13) |
| F4 | `LocalApiEngine`: session, idempotent submit, polling, cancel, Problems | Deliver 3 | H4 to H12 | D4 | done against a fake; real API check waits on D4 |
| T1 | `app/telemetry`: timings, memory, source attribution | Deliver 5 | H12 to H18 | D5, Q4 | todo |
| G2 | On-device integration and measurements | Deliver 5 | H12 to H20 | D4, D6 | todo |
| F7 | Resilience, accessibility, provenance, export | Deliver 6 | H18 to H24 | F4, F5, Q6 | todo |
| R1 | Pages base path, hash routing, local build, offline local start | Deliver 6 | H12 to T-3h | D7 | todo |

Verify commands marked (F1) are npm scripts that F1 creates. They do not exist yet.

### S0 Plan, change gate, role branch

- Files: `web/PRANEETH_PLAN.md`, `web/CLAUDE.md`, `scripts/gx10/change_gate.sh`, `scripts/gx10/install_gate_hooks.sh`, `scripts/gx10/CLAUDE.md`.
- Done when: the gate passes on the role branch and rejects an out-of-ownership path, a second active slice, and a missing pointer.
- Verify: `scripts/gx10/change_gate.sh`.

### G1 GX10 and Qwen runtime inventory

- Files: `scripts/gx10/inventory.sh`. Output goes to git-ignored `runtime/gx10/`.
- Done when: architecture, CPU, RAM, GPU, driver, CUDA, Python and Node versions are recorded; the runtime serving Qwen, its loopback endpoint, served ID and quantization are discovered without restarting or replacing anything; one small loopback completion succeeds; the settings are handed to Nisheeth with no secrets.
- Verify: run the script twice and compare; confirm no process was restarted; search the output for token-like strings.
- Already observed on this machine, read-only, 2026-10-10: aarch64; 20 cores; 121 GiB RAM, shared with the GPU; NVIDIA GB10, driver 580.142 (`nvidia-smi` reports GPU memory as N/A); 614 GB free on `/`; Node v24.15.0; npm 11.12.1; Python 3.12.3; git 2.43.0.
- Qwen, observed read-only the same day: Ollama 0.23.2 listens on `127.0.0.1:11434` and lists `qwen3.6:35b` (36.0B parameters, Q4_K_M, GGUF, 23 GB). No model was loaded at the time. `~/unsloth` also holds a Qwen3.6-35B-A3B GGUF at UD-Q4_K_XL for llama.cpp. Nothing named Qwen 3.8 27B is installed (Q9).
- Measured 2026-10-11 with `scripts/gx10/inventory.sh --completion`: cold completion 51.1 s wall, of which 50.1 s is model load; warm completion 0.27 s; the loaded model occupies 34.6 GB; available memory fell from 110 to 72 GiB; Ollama unloads it after about 5 minutes idle. The Ollama process ID was 2142 before and after. `127.0.0.1:11000` is the NVIDIA DGX Dashboard, not a model runtime.
- Handoff to Nisheeth and Vinesh (no secret involved): `APP_QWEN_BASE_URL=http://127.0.0.1:11434`, with the OpenAI-compatible API under `/v1`; `APP_QWEN_MODEL_ID=qwen3.6:35b`; `APP_QWEN_API_KEY` stays empty. The 20 s default in `APP_QWEN_TIMEOUT_SECONDS` is shorter than a cold load, so the first explanation after idle will time out and fall back to a template unless the model is warmed and kept loaded (request D13).

### E1 Python and CUDA environment

- Files: `scripts/gx10/setup_env.sh`, `scripts/gx10/probe_env.py`. The environment itself is the ignored `.venv/`.
- Observed 2026-10-10: neither the system Python nor `~/venv` has PyTorch, ONNX or ONNX Runtime. No training can run until this slice is done.
- Behaviour: create `.venv/`, install a CUDA build of PyTorch that supports aarch64 and this driver, plus ONNX and ONNX Runtime. The probe prints versions, `torch.cuda.is_available()`, the device name, and the result of one small tensor operation on CPU and on CUDA.
- Done when: the probe passes twice from a fresh shell, and the exact working versions are sent to Chaandan as proposed pins (D12). I do not edit the root `pyproject.toml` or lockfile.
- Verify: `scripts/gx10/setup_env.sh`, then `.venv/bin/python scripts/gx10/probe_env.py`.
- Result 2026-10-11: Python 3.12.3, `torch 2.14.1+cu130`, `numpy 2.5.4`, `onnx 1.23.2`, `onnxruntime 1.31.0`, pinned in `scripts/gx10/requirements-gx10.txt`. CUDA is available on the NVIDIA GB10. A 2048 by 2048 float32 matmul took a median 0.026 s on CPU and 0.001 s on CUDA; that is one synthetic operation, not a training benchmark. A small MLP exported to ONNX matched PyTorch to 3e-08. The install took 10 minutes and `.venv/` is 5.4 GB.
- Two facts for Vinesh: the aarch64 `onnxruntime` wheel has only the CPU provider, so the local handler runs the ONNX graphs on CPU while PyTorch does the GPU work; and the probe used the legacy exporter (`dynamo=False`), because the default exporter in this PyTorch needs `onnxscript`, which is not installed.

### M1 Model and runtime assets

- Files: `scripts/gx10/models.sh` (subcommands `status` and `fetch`), `scripts/gx10/assets.lock.json` listing each asset's name, source, size and SHA-256.
- Behaviour: `status` reports what is installed and whether its hash matches the lock. `fetch` downloads only an asset that is in the lock and missing, verifies the hash, and refuses anything else. It never replaces or restarts the working Qwen install. A download that needs a credential reads it from the environment and never echoes it.
- Default until Q9 is answered: use the installed `qwen3.6:35b`, so no LLM download is needed.
- Done when: `status` output is recorded, and the endpoint, served ID and quantization are handed to Nisheeth for `APP_QWEN_BASE_URL` and `APP_QWEN_MODEL_ID`, with no secret.
- Verify: `scripts/gx10/models.sh status` twice, compare; confirm the Qwen process ID is unchanged.
- Result 2026-10-11: the lock holds one asset, `qwen3.6:35b`, identified by its Ollama digest. `status` reports it `ok`; `fetch` pulled nothing because nothing is missing. Assets are checked by Ollama digest, not a file SHA-256, because that is the identity the runtime exposes.

### M2 Dataset fetch

- Files: `scripts/gx10/fetch_data.sh`, and a source list that Vinesh supplies (D10). Output goes to the ignored `data/raw/`.
- Behaviour: fetch exactly the listed files (released measurement tables first, then a few representative MRI volumes), record URL, version, licence, size and SHA-256 in the run record, and stop on any size above the declared bound.
- Not mine: deciding what is eligible, reading columns for meaning, or writing `data/processed/**`. I hand Vinesh the hashes and the file listing.
- Verify: re-run and confirm it downloads nothing and the hashes match.

### M3 Training run harness and runs

- Files: `scripts/gx10/run.sh` (wraps any command with a run record), `tests/hardware/**` for the harness.
- Behaviour: `run.sh <label> -- <command>` checks that the tree is clean and no other heavy run is active, records the fields in I13, runs the command inside `.venv/`, and stores stdout, stderr and the exit code. Training itself is Vinesh's entrypoint under `modeling/train/` (D11), called through this wrapper with his config and seed.
- Done when: a baseline run and an MLP run each have a complete record, the same seed reproduces the same metrics file, and the records and checkpoints are handed to Vinesh. A failed or interrupted run is recorded as failed.
- Not mine: reading the metrics as good or bad, or choosing the model.
- Verify: harness tests with a dummy command (success, failure, interrupt, second run refused); then the real runs.
- Status 2026-10-11: the harness is built and tested. The training runs wait for Vinesh's entrypoints (D11) and the dataset (M2, D10), so the slice is `blocked`, not `done`.
- Usage: `scripts/gx10/run.sh --seed 7 --out artifacts/checkpoints/model.pt train-mlp -- python -m modeling.train ...`. The record lands in `runtime/gx10/runs/<utc>-<label>/record.json`.

### M4 Export run and on-device parity

- Files: `scripts/gx10/**` wrappers only; parity fixtures and export code are Vinesh's.
- Behaviour: run Vinesh's export entrypoint through `run.sh` for both artifact sets (`empirical/<version>/` and `mechanistic/<version>/`), check each file's SHA-256 against its manifest, and run his Python parity test on the GX10. Browser parity is F5. The 3D CUDA simulation is a GX10-only workload with no API consumer; I run it and its D=0 check against the closed form as hardware evidence in G2.
- Done when: the artifact set, its hashes and the parity output are recorded and handed over by the route agreed in Q8.

### C1 Hour 1 freeze

- Files: none of mine. Schemas and generated clients are Chaandan's.
- Done when: every question in section 8 has an owner-agreed answer recorded in the contract sources, generated clients exist under `web/src/generated/**`, and the baseline commit above is bumped.

### F1 Scaffold

- Files: `web/package.json`, lockfile, `web/vite.config.ts`, `web/tsconfig*.json`, Tailwind config, `web/index.html`, `web/src/main.tsx`, app shell.
- Decisions: Vite `base` from `VITE_BASE_PATH`. Engine profile from `VITE_PROFILE` (`local` or `pages`), chosen at build time, never probed at runtime. Hash routing. Dev-only proxy of `/api` to the local app so the UI stays same-origin. npm scripts `typecheck`, `lint`, `test`, `build`. Unit specs live beside the code in `web/src`; cross-engine parity and browser checks live in `tests/frontend/`.
- Note: `web/` already holds this plan and `CLAUDE.md`. Scaffold in a temporary directory and move the files in, so the generator cannot overwrite them.
- Done when: on the GX10 a clean clone passes install, typecheck and build, exact versions are pinned, and the empty shell renders with a visible profile label.
- Verify: `npm --prefix web ci`, then `npm --prefix web run typecheck` and `npm --prefix web run build`.
- Result 2026-10-11: React 19.3.0, Vite 8.3.4, TypeScript 6.0.3, Tailwind 4.3.3, Vitest 5.0.3, all pinned exactly in `web/package.json` with a lockfile. Lint is oxlint, which the current Vite template ships. Environment files are read from the repository root (`envDir: '..'`), and only `VITE_*` reaches the bundle. The dev server proxies `/api` to `APP_BIND_HOST:APP_BIND_PORT`. Hash routing is a 25-line hook, so no router dependency was added. A build with no valid `VITE_PROFILE` throws at start-up instead of guessing.
- Commands: `npm --prefix web run dev`, `typecheck`, `lint`, `test`, `build`. Pages build: `VITE_PROFILE=pages VITE_BASE_PATH=/UCSC-AI-HACKATHON-V-P-N-C/ npm --prefix web run build`.

### F2 Engine interface and fixture engine

- Files: `web/src/engines/` (interface, profile selection, fixture engine).
- Interface, the eight methods fixed by the Hour 1 checklist:

  ```ts
  interface DomainEngine {
    capabilities(): Promise<Capabilities>
    listCases(): Promise<CaseRecord[]>
    submitScenario(request: ScenarioRequest): Promise<JobRecord>
    getJob(id: string): Promise<JobRecord>
    cancelJob(id: string): Promise<JobRecord>
    getResult(id: string): Promise<ScenarioResult>
    submitExplanation(request: ExplanationRequest): Promise<JobRecord>
    getExplanation(id: string): Promise<ExplanationResult>
  }
  ```

- `JobRecord.result_id` is a `ScenarioResult` id for a scenario job and an `ExplanationResult` id for an explanation job. `Capabilities` carries one version per engine plus `degraded_reasons`.

- Interim for D1, decided by Praneeth on 2026-10-10: until Chaandan's generated clients exist, `web/scripts/derive-contracts.mjs` derives TypeScript types from `contracts/*.json` into the git-ignored `web/.contracts/`, using `json-schema-to-typescript`, the tool Chaandan's plan names. Runtime validation compiles the source schemas with Ajv. Nothing derived is committed and no DTO is written by hand. All code imports types and validators through `web/src/contracts/`, so moving to `web/src/generated/**` changes that one folder.
- Schema validation covers shape only. The semantic rules (job terminal fields, paired bands, day grid) belong to the contract's validators; I do not re-encode them in the UI.
- Import rule: features depend on the interface only. They never import a concrete engine, `fetch`, or the ONNX runtime. Engines depend on generated DTOs.
- Done when: the UI can run end to end on synthetic fixtures; every payload passes the generated validator; fixtures are read from the contract source, not copied into `web/`.
- Verify (F1): `npm --prefix web run typecheck`, `npm --prefix web test`.
- Result 2026-10-11: `web/src/contracts/` (types and `parseContract`), `web/src/engines/` (`DomainEngine`, `EngineError`, `LocalJobs`, `FixtureEngine`). `tests/frontend/engineConformance.ts` is one suite that every engine must pass; `LocalApiEngine` and `BrowserEngine` will run the same file, which is how the first acceptance row gets its evidence. Fixtures are a read-only import of `contracts/examples.json` (my default for Q7). Until F4 and F5 exist, both profiles run on the fixture engine and the UI says so.

### F3 Case flow and chart

- Files: `web/src/features/` (cases, chart, scenario controls, assumptions and model card).
- Done when: selecting a case shows observed points, drawn from the `CaseRecord`, with cm3 units, source and measurement window; forecast and illustrative curves are distinct in drawing and in text; band kind is labelled; cached and synthetic labels show with origin; assumptions, warnings, provenance limitations and manifest facts (trained_on, patient counts, validated horizon, parameter basis, limits) are readable; the horizon control takes whole days only, bounded by 1 to 84 and by the selected engine's manifest (`validated_horizon_days` or `max_horizon_days`); sensitivity is bounded 0 to 2; the empirical engine is offered only for paclitaxel, scale 1 and an eligible case; a degraded engine shows its reason from `degraded_reasons`; layout works at narrow width.
- Open decision, mine: plain SVG chart or a chart library. Default is plain SVG, which adds no dependency. If a library is added, record why in section 9.
- Verify (F1): component tests on fixtures; manual check at narrow width.
- Result 2026-10-11: built in `web/src/features/` (cases, chart, scenario, model). The chart is plain SVG with no chart library: observed dots from the `CaseRecord`, solid forecast lines, dashed illustrative lines, a shaded band only when the points carry one, a hover and arrow-key readout, a text legend and a data table. Series colours were checked with the dataviz palette validator. Input bounds are read from the schema, not typed in. A result can be kept on the chart to compare paclitaxel with the no-intervention comparator.
- Not done: manifest facts (trained_on, patient counts, validated horizon, parameter basis). `DomainEngine` has no method that returns a manifest, and the REST table has no route for one, so the panel says those details appear once an artifact is published. See Q13. The horizon control is bounded by the schema, and the engine rejects anything beyond its manifest with a Problem.

### F4 LocalApiEngine

- Files: `web/src/engines/local/`.
- Behaviour: create the session once with POST `/api/v1/session`. Send `Idempotency-Key` on scenario and explanation POSTs. Poll a job at 1 s with bounded backoff while `queued` or `running`. Cancel with POST `/api/v1/jobs/{id}/cancel`. Map 422, 404, 429 with Retry-After, 503 and 500 to typed `Problem` states. Validate every response with the generated validator. Drop any response whose request is no longer current.
- Done when: tests with a mocked `fetch` cover success, each Problem code, cancel, stale response and 429 retry guidance, and the UI stays interactive while polling.
- Verify (F1): `npm --prefix web test`.
- Result 2026-10-11: `web/src/engines/local/LocalApiEngine.ts`, tested against `tests/frontend/fakeApi.ts`, an in-memory stand-in for the REST table. It passes the same conformance suite as the fixture engine. Polling, backoff and stale rejection live in `useScenarioJob` (F3), so they are identical for every engine. The local profile now selects this engine; the API client is compiled out of the Pages bundle.
- Not verified: anything against Nisheeth's real API, which does not exist yet (D4). With no API running, the local build shows a retryable Problem and stays usable. To see the UI with data today, run the Pages profile: `VITE_PROFILE=pages npm --prefix web run dev`.
- Assumption to confirm with Nisheeth: `POST /api/v1/session` returns 201 with a cookie and no body I need; an error response body is a `Problem`.

### F5 BrowserEngine

- Files: `web/src/engines/browser/`, including the worker.
- Behaviour, in order:
  1. Fetch `release-index.json` under the base path and validate it. For each listed file (manifests, ONNX graphs, case catalogs, templates) verify the SHA-256 before use. A null, missing or mismatching entry disables that engine and adds a `degraded_reasons` entry; the other engine keeps working.
  2. Inside one Web Worker, create at most two ONNX Runtime sessions, once each, with WASM assets bundled locally and single-thread operation working.
  3. Empirical: feed `baseline_volume_cm3` [batch,1] and `elapsed_days` [batch,1] for every integer day 0 to `horizon_days`; read `volume_cm3`. Mechanistic: feed `baseline_volume_cm3` [1], `days` [T], `intervention_on` [1], `sensitivity_scale` [1]; read `volume_cm3`, `lower_cm3`, `upper_cm3`. Raw values only, float32, no arithmetic of mine on either side.
  4. Assemble the `ScenarioResult` with the source table in `docs/CONTRACTS.md`. One point per integer day, 0 to `horizon_days` inclusive.
  5. Return the same `JobRecord` and `ScenarioResult` shapes through local job handles. `cancelJob` on a finished handle returns it unchanged.
- Artifacts are served from `artifacts/public/` as Vinesh and Chaandan publish them. No copy of an ONNX file or a catalog lives under `web/`; the gate rejects one.
- Hashing uses the browser's Web Crypto API, which needs HTTPS or a loopback origin. Pages and the local app both qualify.
- Request admission (eligible case, paclitaxel and scale 1 for empirical, horizon within the manifest) must give the same answer as Vinesh's `admission_check`. I do not invent those rules; see Q11.
- Done when: Vinesh's parity fixtures pass in a test runner, with `points` within `tolerance_cm3` and `evidence` and `band_kind` exact; day 0 equals baseline; a worker failure surfaces a typed Problem and the page stays usable; the only requests are static assets.
- Verify (F1): parity test; inspect a Pages-profile build for zero API or localhost requests.

### F6 Explanation states

- Files: `web/src/features/explanation/`, plus the template renderer in `web/src/engines/browser/`.
- Renderer: the template file is data from the release index. The first template whose `when_source` contains the result's `source` is used. `{dotted.path}` placeholders resolve into the `ScenarioResult`; a segment is a field name or an integer index, and `-1` means last. A placeholder that does not resolve to a scalar makes the template invalid. Numbers use the file's `number_format`: fields ending `_cm3` take `volume_cm3_decimals`, all others `ratio_decimals`, formatted with `toFixed`. No other logic.
- Local: job progress, then the source label `qwen`, `cached_qwen` or `template`, with `model_id` and warnings. The text comes from the API. A failed explanation leaves the chart usable.
- Pages: the panel says chat is a local GX10 feature. The explanation comes from the renderer, with source `template`. It adds no numbers of its own.
- Done when: the renderer reproduces Vinesh's `*.rendered.json` fixture byte for byte, including its rounding tie case.
- Verify (F1): rendered-fixture test; tests for the three sources; network assertion for the Pages profile.

### T1 Telemetry

- Files: `app/telemetry/**`, `tests/hardware/**`. Scope depends on Q4.
- Captures cold and warm timings, memory, and which component produced each number. A missing probe is reported as "not measured". I add no route; exposure goes through Nisheeth's wiring.

### G2 On-device integration and measurements

- Files: `scripts/gx10/**`, `tests/hardware/**`.
- Done when, on the GX10: Nisheeth's monolith and Vinesh's CUDA/ONNX probe run together; cold and warm timings, memory, a same-workload CPU versus GPU comparison and Qwen degradation are recorded with the commands and raw output. Degradation means stopping Qwen in a scheduled window and seeing the labelled template fallback while modeling still works.
- One hardware window at a time. No restart of a runtime someone else is using.

### F7 Resilience and accessibility

- Files: `web/src/**`.
- Done when: the failure paths from the master plan (queue full, missing data or model, corrupt artifact, Qwen timeout, out-of-range scenario, empty browser cache, worker failure) each show a readable, recoverable state; cancel, retry and stale handling are tested; keyboard use, contrast and labels are checked; provenance is readable; export is tested (format per Q6).

### R1 Pages and local build

- Files: `web/vite.config.ts` and build-related files under `web/`. Chaandan owns the Pages workflow and export script and asks me for Vite changes.
- Done when: the Pages build works under `/UCSC-AI-HACKATHON-V-P-N-C/`; hash routes survive reload and deep links; ONNX, preprocessing and WASM paths resolve under the base; the local build is served at `/` by the monolith; local start works with the network disabled, with nothing loaded from a CDN.
- Verify (F1): build both profiles; serve the Pages bundle under the subpath; search the bundle for `localhost`, `127.0.0.1`, `APP_` and key-like strings.

## 6. Dependencies and requests

What I need from other owners. Each is a request, never an edit by me.

| ID | Need | From | Blocks | Meanwhile |
| --- | --- | --- | --- | --- |
| D1 | Generated TypeScript types and runtime validators in `web/src/generated/**` | Chaandan | F2 onward | G1, F1 |
| D3 | Synthetic artifact sets for both engines (real ONNX files, real hashes), parity fixtures, the template file and its rendered fixture, under `artifacts/public/**`; and a fixture release index from Chaandan | Vinesh, Chaandan | F5 and F6 real tests | Build against the null-manifest path in `examples.json`, which is contract behaviour |
| D4 | Running local API: session, cases, jobs, results, explanations | Nisheeth | F4 integration, G2 | Develop F4 against mocked `fetch` and contract fixtures |
| D5 | Decision and wiring for telemetry exposure | Nisheeth | T1 exposure | Offline measurement module only |
| D6 | CUDA and ONNX benchmark probe | Vinesh | G2 | G1 inventory |
| D7 | Pages workflow and export script; any Vite change requests | Chaandan | R1 | Local build of both profiles |
| D8 | Any new `VITE_*` entry in `.env.example` | Chaandan | Whichever slice needs it | Use `VITE_PROFILE` and `VITE_BASE_PATH`, which exist |
| D9 | Registry amendment naming me GX10 operator for downloads, training and export runs (draft below) | Chaandan, with Vinesh's agreement | Nothing; it removes ambiguity | Work as operator under section 3a |
| D10 | Exact source list to download: URLs, versions, licence, expected files and sizes | Vinesh | M2 | E1, M1 |
| D11 | Training and export entrypoints in `modeling/**` with config and seed arguments | Vinesh | M3, M4 real runs | Build and test the harness with a dummy command |
| D12 | Root `pyproject.toml` and lockfile pins taken from my E1 proof | Chaandan | Clean-clone reproducibility | Local `.venv/` |
| D13 | Decide how Qwen stays warm: a keep-alive set by the adapter, a warm-up call at app start, or a longer timeout. A cold load took 50 s against a 20 s default timeout | Vinesh (adapter), Nisheeth (settings) | First explanation after idle | I can warm it by hand before a demo with `inventory.sh --completion` |

Draft for D9, to be added to `docs/roles/README.md` by Chaandan. I do not edit that file.

> GX10 execution. Praneeth runs every job that needs the GX10: environment setup, model and dataset downloads, training, export and benchmark runs, through `scripts/gx10/**` in a declared hardware window. Vinesh owns the code, configuration and scientific decisions those runs execute, and reviews each run record before its outputs are published. Run outputs stay in ignored directories until then.

What I owe others: Qwen loopback endpoint, served ID, quantization and resource limits to Nisheeth, without secrets; frontend build command and base-path behaviour to Chaandan; hardware windows and measured evidence to Vinesh and Chaandan. Final handoff per contract: tested commit, frontend build and base path, exact local runtime settings without secrets, parity and UX results, remaining model and API dependencies.

## 7. Acceptance traceability

All unchecked. Tick only with evidence logged in section 9.

| Contract acceptance | Slices | Evidence required |
| --- | --- | --- |
| [ ] Both adapters produce the same domain shape and tested prediction parity fixtures | F2, F4, F5 | Shape tests for both engines against generated validators; parity test output |
| [ ] Case, chart, assumptions and job progress remain responsive on slow work | F3, F4, F5 | Slow-job test with a delayed engine; inference runs in the worker |
| [ ] Pages runs the numerical model without API or chat requests or credentials | F5, F6, R1 | Network log of the Pages build; bundle search for secrets |
| [ ] Local Qwen failure leaves modeling usable and the fallback labelled | F6, G2 | Runbook local step 6, on the GX10 |
| [ ] Cold local start, browser stale and cancel cases, actual hardware observations delivered | F7, G2, T1 | Cold-start run; stale and cancel tests; raw measurement output |

## 8. Open questions for the Hour 1 freeze

Answered by the boundary redesign at the baseline commit:

- **Q1.** The graph standardizes. No runtime reads `preprocessing.json` (redesign C1, C2).
- **Q2 and Q3.** `cancelJob(id)` and `getExplanation(id)` are in the interface. `result_id` is the explanation id for an explanation job (C8, C11).
- **Q4.** Telemetry is offline evidence. It reads logs and metrics and nothing depends on it, so T1 adds no route or DTO.
- **Q5.** My assumption was wrong. The mechanistic engine is a second ONNX graph that Pages runs live (C4). Presets are not needed.

Still open:

- **Q6, team.** "Tested export" in Deliver 6: which content and format? Assumed: the `ScenarioResult` as JSON with its provenance.
- **Q7, Chaandan.** How do fixtures reach the frontend: a generated module under `web/src/generated/**`, or a read-only import of `contracts/examples.json`?
- **Q8, Vinesh and Chaandan.** Trained artifacts are produced on the GX10, but `artifacts/public/**` is Vinesh's path. How do they get committed: I push a hand-off branch under a named assignment, or Vinesh pulls the files and commits them?
- **Q9, team.** The README names Qwen 3.8 27B. The GX10 serves `qwen3.6:35b` (Q4_K_M) through Ollama. Use what is installed, or download a different model? Assumed: use what is installed. The README wording is Chaandan's to correct.
- **Q10, team.** Should authorship of the training code move to me as well, or only its execution? This plan assumes execution only (I12). A move needs the registry changed on `origin/main`; the gate's contract-drift check then forces this plan to be re-derived.

- **Q11, Vinesh.** On Pages there is no Python, so the browser has to apply the admission rules that `admission_check` owns. That is a second implementation of one rule set. Can the parity fixtures include rejected requests with the expected `Problem.code`, so my check is pinned to his?
- **Q13, Nisheeth and Vinesh.** How does the local UI read the manifests and model cards? The REST table has no route for them. Options: the monolith serves `artifacts/public/` as static files, so both profiles read the release index the same way; or a new route. I prefer the static mount, because it needs no new DTO.
- **Q12, Vinesh.** The redesign itself notes that no graph exists yet, so nothing shows the closed-form mechanistic graph uses only operators that ONNX Runtime Web supports. I will run the first synthetic graph in the WASM runtime as soon as it is published and report the result before the freeze is relied on.

### 8a. My rows in the boundary redesign

The redesign asks each owner to accept or object to the rows that change their work. Mine, with what each one changes for me:

| Row | Change for me | Position |
| --- | --- | --- |
| C1, C2 | Worker passes raw volume and days; no scaler, no inverse, no reading of `preprocessing.json` | Accept. It removes my largest parity risk |
| C4 | A second ONNX session for the mechanistic engine, live on Pages | Accept, subject to Q12 |
| C6 | Two manifests; `Capabilities` has a version per engine and `degraded_reasons` | Accept |
| C7 | Observed points come only from `CaseRecord`; no `observed` curve | Accept |
| C13 | Template renderer in the browser, matched to a rendered fixture | Accept |
| C17 | I pass Vinesh's DTO-level parity fixtures in the worker; Chaandan's gate runs my test | Accept |
| C25 | Integer horizon; one point per day from 0 to the horizon | Accept |

Praneeth stated on 2026-10-10 that the team follows this flow. Nothing in the redesign moves training or downloads to me; section 3a and request D9 still stand.

## 9. Log

Append only. One row per finished slice or notable event.

| Date | Slice | Commit | Evidence | Notes |
| --- | --- | --- | --- | --- |
| 2026-10-10 | S0 | not committed | `scripts/gx10/change_gate.sh` exits 0 on the role branch with 4 owned paths. It exited 1 on each of 7 deliberate violations: another owner's path, a generated client, an owned root without a pointer, a secret-like `VITE_*` name, two active slices, zero active slices, and a baseline older than the contract on `origin/main`. `bash -n` passes. shellcheck is not installed, so it was not run. | Files await Praneeth's go-ahead to commit. No git identity is configured on this machine. S0 stays `active` until that commit exists. |
| 2026-10-10 | S0 | not committed | Re-derived against the boundary redesign `ab8b6f3`. `pytest tests/contracts` on that commit: 19 passed. Gate extended with checks 6 and 7 and exits 0 with `BASE_REF=origin/feat/vinesh-boundary-redesign`. It exited 1 on each of: a path under `modeling/`, a 6 MB file, a token-like literal, a secret-like `VITE_*` name, an `.onnx` file under `web/`. A `.pt` file is not seen by the gate because `.gitignore` already excludes it. With the default base the gate fails, as expected, until `origin/main` contains the redesign. `install_gate_hooks.sh` installed the pre-commit hook and the Claude Code edit hook. | Added GX10 operation slices E1, M1 to M4 and section 3a. Read-only inventory found no PyTorch or ONNX on the machine and `qwen3.6:35b` served by Ollama (Q9). A git identity is now configured. |
| 2026-10-10 | S0 | `9134d9a` | Committed on `dev/praneeth-ui-gx10`. Push to `origin` was refused with HTTP 403: the token on this machine cannot write to the repository. Gate base is now read from local `git config gate.baseRef`. | S0 done. `main` still at `381c0a2`; Praneeth to push after re-authenticating. |
| 2026-10-11 | G1 | this commit | `scripts/gx10/inventory.sh` run twice gave identical output. `--completion` returned the expected reply cold and warm; timings and memory are in the G1 notes. No process was restarted. Output searched for token-like strings: none. Also fixed the Claude Code edit hook to resolve the repository from the working directory. | Raw output is in the ignored `runtime/gx10/`. |
| 2026-10-11 | E1 | this commit | `setup_env.sh` built `.venv/`; `probe_env.py` printed `result: PASS` twice from separate shells; the pinned requirements file resolves with a pip dry run. Versions and timings are in the E1 notes. | Pins go to Chaandan as request D12. |
| 2026-10-11 | M1 | this commit | `models.sh status` exits 0 with `ok qwen3.6:35b`. Against a temporary lock with a wrong digest and an absent model it printed `mismatch` and `missing` and exited 1. `fetch` with nothing missing pulled nothing. The `ollama serve` process ID stayed 2142. | No model download was needed. M2 is blocked on Vinesh's source list (D10). |
| 2026-10-11 | M3 | this commit | `tests/hardware/run_harness_test.sh`: 17 checks passed (success, failure, missing output, record present while running, second run refused, interrupt, bad label, dirty tree refused). | Harness only. No training has been run. Blocked on D10 and D11. |
| 2026-10-11 | F1 | this commit | On the GX10 after `npm ci` from the lockfile: `typecheck` clean, `lint` exit 0, `test` 5 passed, `build` succeeded for both profiles. The Pages build references assets under `/UCSC-AI-HACKATHON-V-P-N-C/`; a search of that bundle for `localhost`, `127.0.0.1`, `APP_`, the Ollama port and the model name found nothing. In the dev server the shell rendered at desktop and 375 px widths, the `#/model` deep link loaded directly, and the console had no errors. | Shell only: it states that no case, model or result is loaded. F2 needs generated DTOs (D1). |
| 2026-10-11 | F1 | `8ba24b3` | `origin/main` now holds the redesign (`7d6cb32`, merged by Chaandan). Merged it into the role branch with no conflicts; the gate passes against `origin/main` and the temporary `gate.baseRef` is removed. | F1 done. F2 starts with the D1 interim. |
| 2026-10-11 | F2 | this commit | `npm test`: 32 passed in 5 files, including every example in `contracts/examples.json` against its schema, four rejected mutations, and the conformance suite on `FixtureEngine`. `typecheck` and `lint` clean. Pages build succeeds. | Types are derived locally into the ignored `web/.contracts/`; nothing derived is committed. |
| 2026-10-11 | F2 | this commit | Correction to the row above: at commit `881d9e2` `typecheck` and the Pages build were failing, because `tests/frontend/` could not resolve `vitest` from outside `web/`. I committed without reading the exit codes. Fixed with a `paths` entry in `web/tsconfig.app.json`. Now measured with exit codes: `typecheck` 0, `lint` 0, `test` 32 passed, Pages `build` 0. | Added `npm --prefix web run check`, which chains all four and stops on the first failure. It runs before every frontend commit from here on. |
| 2026-10-11 | F3 | this commit | `npm --prefix web run check` exit 0: typecheck, lint, 46 tests, build. Tests cover the case facts with units and the synthetic label, the ineligible-case rule, a full scenario run, a failing engine shown as a typed Problem, stale-response rejection, overlapping runs, cancel, and a failed job. In the browser the chart, hover readout and result panel rendered with the fixture; the 375 px width was not re-checked for this slice. | A test caught a real bug: a failed job's Problem was shown as `[object Object]`. Fixed before commit. |
| 2026-10-11 | F4 | this commit | `npm --prefix web run check` exit 0 with 65 tests. New tests: one session under racing calls, session retry after a failure, a fresh `Idempotency-Key` on both POSTs and none on reads, a Problem passed through unchanged, `Retry-After` kept on 429, six status codes with unreadable bodies, a contract-breaking response reported as a fault, an unreachable API. A search of the Pages bundle for the API path, `Idempotency-Key`, `localhost`, `127.0.0.1` and `APP_` found nothing. In the browser, the local build with no API showed the Problem state. | Tested against my fake only. Nothing here shows the real API works. |
