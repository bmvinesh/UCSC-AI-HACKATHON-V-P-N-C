# Handoff to Vinesh (Dev 3) from Praneeth (Dev 1, GX10)

Written 2026-10-11 on branch `dev/praneeth-ui-gx10`. For Vinesh and his coding agent. It lists what the GX10 side and the frontend are waiting on from you, in the order that unblocks the most. Each item says what to deliver, where it goes, and how I will check it. The full plan and evidence log are in [web/PRANEETH_PLAN.md](../../web/PRANEETH_PLAN.md); item IDs (D3, Q11, ...) refer to it.

**Nothing has been trained and no dataset has been downloaded.** Both wait on items 2 and 3 below. Every path named here under `modeling/`, `artifacts/public/`, `app/jobs/`, `app/integrations/` and `prompts/` is yours; I have not created or edited any of them.

## What is ready on the GX10

| Thing | State | Where |
| --- | --- | --- |
| Python environment | Python 3.12.3, `torch 2.14.1+cu130`, `numpy 2.5.4`, `onnx 1.23.2`, `onnxruntime 1.31.0`. CUDA works on the NVIDIA GB10 (aarch64, driver 580.142, CUDA 13.0) | `scripts/gx10/requirements-gx10.txt`, `setup_env.sh`, `probe_env.py` |
| Run harness | Wraps any command; records commit, seed, start and end, exit code, package list, input and output SHA-256. One heavy run at a time. Tested with dummy commands only | `scripts/gx10/run.sh`, `tests/hardware/run_harness_test.sh` |
| Qwen | `qwen3.6:35b` (Q4_K_M) served by Ollama 0.23.2 at `http://127.0.0.1:11434`, OpenAI-compatible API under `/v1`, no API key. Cold completion 51 s (50 s is model load), warm 0.27 s, 34.6 GB loaded, unloads after about 5 minutes idle | `scripts/gx10/inventory.sh`, `models.sh` |
| Telemetry | Timing (cold, warm median, CUDA-synchronized) and memory readings with their source | `app/telemetry/measure.py` |
| Frontend | UI, `LocalApiEngine`, and the core of `BrowserEngine`, all on synthetic contract fixtures. 107 tests pass | `web/src/`, `tests/frontend/` |

Three facts about this machine that affect your code:

- The aarch64 `onnxruntime` wheel has **only the CPU provider**. The local handler will run the ONNX graphs on CPU; GPU work is PyTorch.
- The default ONNX exporter in this PyTorch needs `onnxscript`, which is **not installed**. My probe used the legacy exporter (`dynamo=False`). Tell me which you need and I will install and pin it.
- CPU and GPU share one 121 GiB memory pool. Qwen takes about 35 GB of it while loaded.

## What I need from you, in order

### 1. Synthetic artifact sets, parity fixtures and templates (D3) — blocks the browser model

This is your first slice in the boundary redesign. Until it exists the public build runs on canned fixtures and no ONNX graph has ever run in a browser.

Deliver under `artifacts/public/`, exactly as laid out in `docs/CONTRACTS.md`:

- `empirical/<version>/`: `manifest.json`, `model.onnx`, `preprocessing.json`, `MODEL_CARD.md`, `metrics.json`, `parity.json`
- `mechanistic/<version>/`: `manifest.json`, `model.onnx`, `MODEL_CARD.md`, `parity.json`
- `templates/explanations-<v>.json` and `templates/explanations-<v>.rendered.json`
- Real SHA-256 values in the manifests. `trained_on: synthetic` is fine for this first set.

How my code will call the graphs (`web/src/engines/browser/inference.ts`). Please confirm it matches what you export:

| Engine | I feed (float32) | I read |
| --- | --- | --- |
| empirical | `baseline_volume_cm3` [N,1] and `elapsed_days` [N,1], one row per whole day 0 to `horizon_days`, raw values | `volume_cm3` [N,1] |
| mechanistic | `baseline_volume_cm3` [1], `days` [T] = 0 to `horizon_days`, `intervention_on` [1] (1 for paclitaxel, 0 for none), `sensitivity_scale` [1] | `volume_cm3`, `lower_cm3`, `upper_cm3`, each [T] |

I apply no transform on either side. A NaN, a negative volume or a wrong-length output fails the job; I do not clip.

Check on my side: your parity fixtures pass in the browser worker within `tolerance_cm3`, with `evidence` and `band_kind` exact.

Two risks to settle with this first set:

- **Q12.** Nothing yet shows the closed-form mechanistic graph uses only operators that ONNX Runtime Web (WASM) supports. I will run your first graph in the browser as soon as it lands and report back.
- **Q11.** Pages has no Python, so `web/src/engines/browser/admission.ts` re-implements your `admission_check`. Please add **rejected requests with the expected `Problem.code`** to the parity fixtures so mine is pinned to yours. My current reading: horizon beyond the manifest is `OUT_OF_DOMAIN`; wrong intervention, a scale other than 1, an ineligible case or a wrong `model_version` on the empirical engine is `INVALID_INPUT`.

### 2. Dataset source list (D10) — blocks any download

I run every download on the GX10, but you decide what is fetched. Send a list with, per file: URL, version, licence, expected size, and SHA-256 if published. Released measurement tables first, then the few representative MRI volumes. I will not pull the full archive.

I fetch into the git-ignored `data/raw/`, record the hashes, and hand you the file listing. Eligibility, column meaning and `data/processed/**` stay yours.

### 3. Training and export entrypoints (D11) — blocks training

No training can run until `modeling/` has something to run. I need commands I can launch from the repo root, for example:

```bash
scripts/gx10/run.sh --seed 7 --in data/processed/<file> --out artifacts/checkpoints/<file> train-mlp -- python -m modeling.train <args>
```

Requirements so a run is reproducible and recorded:

- Runs with the repo root as working directory, inside `.venv/`. `run.sh` exports `APP_SEED`; read the seed from it or take `--seed`.
- Input and output paths are arguments. Checkpoints go to `artifacts/checkpoints/` (ignored), never straight to `artifacts/public/`.
- No network access during training.
- Non-zero exit on failure. A run that is interrupted or fails is recorded as such, never as success.
- Any package beyond the four pinned above: tell me the name, and I will install it, probe it on aarch64 and add the pin.

Same shape for the baselines, the export step, and your Python parity test.

### 4. CUDA and ONNX benchmark probe (D6) — blocks the hardware evidence

One command for the representative GPU workload (the 3D ensemble simulation) that runs the same workload on CPU and on CUDA, plus the D=0 check against the closed form. I run it in a hardware window through `run.sh` and record timings and memory with `app/telemetry`.

### 5. Decisions

- **Q8: how trained artifacts get committed.** They are produced on this machine, but `artifacts/public/**` is your path and you are not on it. Options: you give me a named assignment to push a hand-off branch containing only the run's outputs for you to review and merge; or you pull the files yourself. Pick one.
- **D13: keeping Qwen warm.** A cold load takes 50 s and `APP_QWEN_TIMEOUT_SECONDS` defaults to 20, so the first explanation after idle will time out and fall back to the template. Choose: keep-alive set by your adapter, a warm-up call at app start, or a longer timeout.
- **Q9: model identity.** The README says Qwen 3.8 27B. The machine serves `qwen3.6:35b`. I am assuming we use what is installed; say so if you need a different model downloaded.
- **Q14: template renderer details.** I implemented: every number, integers included, takes the configured decimals, so `{request.horizon_days}` renders `21.00`; booleans render `true` or `false`; `null` makes the template invalid. Put one of each in the rendered fixture so both renderers are pinned.
- **Q13: manifests in the local UI.** The REST table has no route for manifests or model cards. I suggest the monolith serves `artifacts/public/` as static files, so both profiles read the release index the same way. This also needs Nisheeth.

## How to ask for a GX10 run

Send the exact command, the commit it should run at, expected duration and memory, and whether Qwen may stay loaded. I run one heavy job at a time and send back the run record from `runtime/gx10/runs/<utc>-<label>/` (record, stdout, stderr, package list).

## Blockers on my side

- **These commits may not be on the remote.** The token on the GX10 gets HTTP 403 on push, so `dev/praneeth-ui-gx10` is local until Praneeth re-authenticates. If you are reading this on GitHub, that is fixed.
- Generated TypeScript clients from Chaandan do not exist yet. I derive types locally from `contracts/*.json` and commit nothing derived.
- Nisheeth's API does not exist yet, so `LocalApiEngine` is tested against a fake of the REST table only.
