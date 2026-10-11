# Dev 4 operating plan: Chaandan (integration, Pages, contracts, demo)

This is the living plan for Chaandan's Dev 4 role in OncoGrowth. It records what comes next, how each change is checked, and what is finished with evidence. Every change set passes the [pre-change gate](#3-pre-change-gate) and the [post-change verification](#4-post-change-verification) and gets a [change-log](#12-change-log) entry. The [guard](#23-enforcement) checks the mechanical parts on every edit and at the end of every turn.

- Owner: **Chaandan (Dev 4)** | Branch: `cha2` (see D1) | Scope: breast cancer, paclitaxel, contract schema version `1`
- Contract baseline commit: `7d6cb32` (merge of PR #1, the boundary redesign)
- Contract fingerprint: `f4bfbd58fd59`
- Plan revision: 2 (2026-10-10)

The fingerprint covers the normative files in [§2.4](#24-normative-inputs). `py -3 tests/contracts/check_boundary.py fingerprint` prints the current value.

**Precedence:** explicit written team decisions, then [CLAUDE.md](../../CLAUDE.md), then [CONTRACTS.md](../CONTRACTS.md) with `contracts/*.json`, then the [boundary redesign](../proposals/2026-10-10-boundary-redesign.md) as the rationale for each C-numbered rule, then the [ownership registry](../roles/README.md), then my [role contract](../roles/04-chaandan-integration-demo.md), then the [master plan](../MASTER_IMPLEMENTATION_PLAN.md), [workflow](../GIT_AND_AGENT_WORKFLOW.md), [data/model design](../DATA_AND_MODEL.md) and [runbook](../DEMO_RUNBOOK.md), then this plan. When this plan disagrees with a source, the source wins and this plan gets fixed.

**Next up:** C2 record owner acceptance of the merged redesign (D10); C4 root tooling so CI runs `tests/contracts`; then C3 client generation and C16 fixture release index.

## 1. Mission and non-goals

**Mission:** make four owners' work fit together into coherent, honestly labeled releases. That means one frozen contract and the clients generated from it, the release index that selects artifact versions, CI and merge gates, a reproducible synthetic case catalog, a verified GitHub Pages build that runs both browser ONNX graphs on new inputs, smoke evidence, and the demo and release package.

**Design rule I enforce, never implement around** (CONTRACTS.md): every number shown to a user comes from exactly one implementation. Both engines are ONNX graphs with every transform inside. Owners meet at schema-validated files or at the single port `app/jobs/ports.py`. My gates *run* other owners' tests; they never reimplement a formula, a scaler, a template renderer or a parity check.

**Non-goals (owned by others):**

- Vinesh: biology, cohort eligibility, model design, metrics, prompts, artifact sets, real case catalogs, templates, parity fixtures, `load_release`/`admission_check`/`make_supervisor`, the `JobStore` port.
- Praneeth: UI, `BrowserEngine` worker and template renderer, Vite/build config, web package and lockfile, GX10 operation and hardware windows.
- Nisheeth: routes, persistence (implements `JobStore`/`ResultCache`), sessions, settings, app lifespan.
- Joint: schema meaning. I generate output only after the owners agree.
- Nobody: clinical claims, dosing, or treatment recommendations.

## 2. Boundary

### 2.1 Write tiers

| Tier | Paths | Guard behavior |
| --- | --- | --- |
| Owned | `docs/**` except joint files; `README.md`, `.gitignore`, `.env.example`; `pyproject.toml`, `uv.lock`, `Makefile`; `.github/workflows/**`; `tests/contracts/**`, `tests/e2e/**`; `scripts/{generate_contracts,seed_demo,export_site,smoke}.*`; `artifacts/public/release-index.json`; `artifacts/public/cases/synthetic-*.json` | Allowed |
| Joint (I am custodian; owners agree on meaning) | `contracts/**`, `docs/CONTRACTS.md`, `docs/roles/**`, `docs/proposals/**`, `docs/MASTER_IMPLEMENTATION_PLAN.md`, `docs/DATA_AND_MODEL.md`, `docs/GIT_AND_AGENT_WORKFLOW.md`, `CLAUDE.md` | Asks the human; record the agreement in §12 |
| Generated | `app/generated/**`, `web/src/generated/**` | Hand edits denied; only `scripts/generate_contracts.*` writes them |
| Guard | `tests/contracts/check_boundary.py`, `.claude/settings.local.json` | Asks the human, so the guard cannot quietly weaken itself |
| Everyone else's | `web/**` except generated (Praneeth); `app/**` except generated (Nisheeth, Vinesh); `modeling/**`, `prompts/**`, `data/**`; `artifacts/public/**` except my two entries (Vinesh: artifact sets, real catalogs, templates, parity and rendered fixtures); `scripts/gx10/**`; any other `tests/**`; `.claude/settings.json`; any unlisted path | Denied; use §8 |
| Denied types (any path) | `.env*` except `.env.example`; keys and certificates; weights and graphs (`*.pt`, `*.pth`, `*.ckpt`, `*.safetensors`, `*.gguf`, `*.onnx`); raw/array data (`*.nii*`, `*.dcm`, `*.npz`); databases (`*.db`, `*.sqlite*`); any credential-like content | Denied |

Notes on shared edges:

- `.env.example` is mine, but its keys mirror Nisheeth's `app/settings.py` (which maps `APP_*` onto Vinesh's `ExecutorConfig`/`QwenConfig`/`CacheConfig`). Secret values stay empty, and a new key needs his acknowledgment. The redesign already swapped `APP_MODEL_MANIFEST_PATH` for `APP_RELEASE_INDEX_PATH` and added `APP_IO_WORKERS`, `APP_JOB_LEASE_SECONDS`.
- `tests/contracts/test_contract_schemas.py` was authored by Vinesh inside my path as part of the redesign. I maintain and extend it; I never weaken its negative cases (C1, C3, C6, C7, C25).
- The Pages workflow and export script are mine. Vite and base-path config are Praneeth's, so I request changes from him.
- The exporter copies Vinesh's `artifacts/public/**` into the build byte-for-byte and never edits it. The release index is the only file that selects versions (C16); I write it, Vinesh's `load_release` and Praneeth's worker read it.
- `docs/proposals/**` are teammates' design records. I link to them; I don't rewrite them.
- Root lockfiles are resolved through the package tool with the dependency owner, never by hand-merging text.
- The repo-local `.venv/` (gitignored) holds dev tools until C4 provides `pyproject.toml`.

### 2.2 Action limits

- Human authorization is required for pushes, PRs, merges into `main`, tags, Pages or repository settings, the ASUS survey, messages to teammates, and any public post. Claude drafts; the human sends.
- No force push, history rewrite, or stash/reset/clean of anyone's work. Leave `stash@{0}` on `cha1` and `origin/claude/dreamy-brahmagupta-i6bey7` alone; both belong to the retired OncoVision scope (D8). Don't commit to other people's branches, such as `feat/vinesh-boundary-redesign`.
- No GX10 runtime changes, restarts, or benchmarks outside Praneeth's scheduled window.
- No secrets, raw MRI, Qwen weights, or the confidential ASUS PDF in git, Pages, logs, or screenshots.

### 2.3 Enforcement

| Mechanism | What it does |
| --- | --- |
| [`tests/contracts/check_boundary.py`](../../tests/contracts/check_boundary.py) | Standard-library guard. Its tier constants mirror §2.1; change both together. |
| `py -3 tests/contracts/check_boundary.py audit [--base origin/main]` | Run before every commit and merge. **FAIL** on out-of-boundary or denied-type paths, owned changes without a PLAN.md update, credential-like text, files over 2 MB, or a plan fingerprint that differs from the working tree. **WARN** on joint, generated, or guard changes and on upstream contract drift. |
| `py -3 tests/contracts/check_boundary.py fingerprint` | Prints working-tree, HEAD, `origin/main`, and recorded fingerprints. |
| `py -3 -m unittest discover -s tests/contracts -p test_check_boundary.py` | Guard tests: tiers, path handling, secret patterns, hook decisions, drift on a throwaway repo. |
| `.venv/Scripts/python -m pytest tests/contracts -q` (`.venv/bin/python` off Windows) | Contract tests: every example validates against its schema; each resolved shape contradiction has a negative case. Needs `jsonschema` and `pytest` in `.venv` until C4. |
| `.claude/settings.local.json` (personal; excluded through `.git/info/exclude`) | `PreToolUse` on Edit/Write/NotebookEdit denies forbidden, generated, denied-type, and credential-bearing writes and asks on joint and guard files. It fails closed if the guard crashes. `UserPromptSubmit` injects the re-read reminder, branch and tree state, **Next up**, and drift warnings. `Stop` audits the working tree once per turn and blocks the stop when problems remain. |

Known gaps: file writes made through a shell bypass `PreToolUse`, so the `Stop` audit catches them at the end of the turn. Hook configuration loads when a session starts, so start a new session after changing it. On a branch without `check_boundary.py`, the `PreToolUse` hook fails closed and blocks every edit; work from `cha2` (or a branch that contains the guard).

Hook configuration to recreate in a new clone or worktree:

```json
{
  "hooks": {
    "PreToolUse": [{ "matcher": "Edit|Write|NotebookEdit", "hooks": [{ "type": "command", "command": "py -3 \"$CLAUDE_PROJECT_DIR/tests/contracts/check_boundary.py\" hook-pre-tool", "timeout": 15, "onFailure": "block" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "py -3 \"$CLAUDE_PROJECT_DIR/tests/contracts/check_boundary.py\" hook-prompt", "timeout": 15 }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "py -3 \"$CLAUDE_PROJECT_DIR/tests/contracts/check_boundary.py\" hook-stop", "timeout": 30 }] }]
  }
}
```

### 2.4 Normative inputs

`CLAUDE.md`, `contracts/**`, `docs/CONTRACTS.md`, `docs/DATA_AND_MODEL.md`, `docs/DEMO_RUNBOOK.md`, `docs/GIT_AND_AGENT_WORKFLOW.md`, `docs/MASTER_IMPLEMENTATION_PLAN.md`, `docs/proposals/**`, `docs/roles/**`.

When the fingerprint changes, whether from my edit or a teammate's merge:

1. Read `git diff <baseline commit> -- <paths above>`.
2. Update §2, §5, §6, §7, and §13 where affected.
3. Record the new baseline commit and fingerprint, then bump the plan revision.
4. Log the reconciliation in §12.

## 3. Pre-change gate

Run all seven before any change.

1. **Contracts current.** After `git fetch`, the prompt hook or `fingerprint` shows no drift. If it does, reconcile per §2.4 first.
2. **Task identified.** The change maps to a §5 ID. If none fits, add the row first. Only one functional slice is in progress at a time.
3. **Paths in bounds.** Every target is Owned, or Joint with recorded agreement. Fixes in other owners' paths go through §8.
4. **Seam named.** If the change touches a seam (S1-S9 in [§7](#7-interfaces-seams-merge-gate-contract-changes)), name its producer, its consumers, its schema and its contract test. A change that needs a new seam is a contract change, not a task.
5. **Inputs available.** The §6 inputs the task needs exist. If one is missing, mark the task `blocked: <exact item>` and switch to an unblocked task.
6. **Slice written down.** Target files, pseudocode, contract version and sample payload, failure and cancel behavior, verification command, and expected diff size, as the workflow doc requires. Put these in the task notes or the §12 entry.
7. **Others' work safe.** `git status` shows nothing I would overwrite that I did not write. Never stash or reset another person's edits.

## 4. Post-change verification

Run all eight before committing.

1. **Audit passes.** `py -3 tests/contracts/check_boundary.py audit` prints `Result: PASS`.
2. **Contract tests pass.** `.venv/Scripts/python -m pytest tests/contracts -q` passes (once C4 lands: `make check`).
3. **Task checks ran.** The slice's verification command was executed, and the command and observed result go in §12. Anything not run is written as "not run".
4. **Labels stay distinct.** Curve evidence stays forecast or illustrative (observed points come only from CaseRecord, C7). Sources stay trained_model, conditional_calibration, mechanistic, cached (with `origin_source`), or synthetic. Explanations stay qwen, cached_qwen, or template. Skipped is never passed, synthetic is never trained, and a zero hash is never release-valid.
5. **Expectations untouched.** No expected value, schema bound, negative case, or fixture was weakened to make something pass.
6. **Generated outputs regenerated.** They are never hand-edited, and the drift check is clean once C3 exists.
7. **Plan updated.** §5 status and a §12 entry are current. Update the §2.4 fingerprint if normative files changed, and run the guard tests if the guard changed.
8. **Micro-commit.** Stage named paths only (never `git add .`), write a concrete message, and commit to my own branch. Push only with the human's approval.

## 5. Work breakdown

Status values: `todo`, `doing`, `blocked: <missing input>`, `done` (requires a §12 entry with evidence). Windows are hours from kickoff (D9), per [master plan §5](../MASTER_IMPLEMENTATION_PLAN.md#5-schedule-and-exit-gates). Numbers in parentheses are the role contract's "Deliver in order" items. IDs are stable across revisions; new tasks get new numbers.

| ID | Task | Deliverable (owned paths) | Window | Depends on | Status | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| C0 | Plan and enforcement system | `docs/integration/PLAN.md`, `tests/contracts/check_boundary.py`, `tests/contracts/test_check_boundary.py`, local hooks | H0 | none | done | Guard tests pass; hook entry points pipe-tested; reconciled with the redesign at rev 2 (§12) |
| C1 | Contract validation (1) | Extend `tests/contracts/` (shape tests already exist in `test_contract_schemas.py`); semantic validators per D7; negative fixtures under `tests/contracts/fixtures/invalid/` | H0.25-1 | D7 | todo | Shape: all five schemas compile as draft 2020-12, `preprocessing.schema.json` is covered (it has no example or test today; adding an example to `examples.json` is a joint edit). NaN/Infinity are rejected at JSON parse. Semantic: one positive and one negative fixture per rule in CONTRACTS.md "Semantic validation", plus the redesign rules: curve grid is every integer day `0..horizon_days`; day 0 equals baseline; bands paired and ordered; JobRecord state/result/error rules; cached requires `origin_source`, others forbid it; the engine-to-source/evidence/band_kind table; preprocessing epsilon equals the manifest epsilon. Exit codes 0 valid, 1 invalid, 2 usage. |
| C2 | Contract freeze record (1) | §12 freeze record; CONTRACTS.md checklist ticks (joint) | H0.25-1 | D10: owners' accept/object per C-row | blocked: owner acknowledgments not recorded | PR #1 is merged on `main` (`7d6cb32`), but the proposal still reads "proposal, not agreed". Each owner's accept/object for their C-rows (Praneeth C1, C4, C7, C13, C17; Nisheeth C8-C12, C18, C21, C22, C26; Chaandan C6, C15, C16, C25, C28) is recorded, each CONTRACTS.md checklist line has named acknowledgments, contract tests pass on the frozen files, and the freeze commit and fingerprint are recorded. C27 stays deferred to the H4 data gate. |
| C3 | Client generation (1) | `scripts/generate_contracts.py generate` and `--check`; output in `app/generated/` and `web/src/generated/` | H1-2 | C2, C4, D3; app and web skeletons | todo | Covers all five schemas: domain DTOs (S1), `ReleaseIndex`, `ExplanationTemplates`, `ParityFixture`, `Preprocessing`, with the cross-file `urn:oncogrowth:domain:1#/$defs/...` references resolved. Pydantic v2 models (extra forbidden, finite numbers) and TS types with Zod schemas (strict, finite) carry a "generated from schema sha256; do not edit" header. Examples round-trip through both, and `--check` fails on any drift. |
| C4 | Repo and CI skeleton (2) | `pyproject.toml`, `Makefile`, `.github/workflows/ci.yml` | H1-2 | Dependency lists from Nisheeth and Vinesh; Praneeth's web scripts | todo | Redesign §5 first slice: a clean clone runs `make check`: `pytest tests/contracts`, guard tests, generation drift, then lint/type/tests for present modules and the web build. CI uses no secrets and runs on pushes and PRs. The first green run is linked. |
| C5 | Branches and merge gates (2) | §7 branch map and merge gate | H0-1 | D1 | todo | One branch or worktree per owner is recorded, and the gate is applied at every H4/H8/H12 merge. |
| C6 | Dependency lock (2) | `uv.lock` (the web lockfile is Praneeth's) | After GX10 aarch64 smoke | Praneeth's GX10 window; Vinesh's torch/onnx/onnxruntime versions | blocked: no GX10 compatibility proof | Locked versions install and import on GX10 and in CI, and the previous tested lock is kept. |
| C7 | Synthetic seeds (3) | `scripts/seed_demo.py` writes `artifacts/public/cases/synthetic-<version>.json` (`CaseRecord[]`, S4) and the non-case test seeds (location D5) | H1-2 | C1 | todo | Deterministic from a seed. Catalog: three named cases (reduction, increase, limited data) with `source=synthetic`, `provenance.synthetic=true`, sorted unique days from day 0, baseline consistent with the day-0 observation. Test seeds: a JobRecord per state (interrupted = failed/`INTERRUPTED`), ScenarioResults with `source=synthetic`, a template ExplanationResult, a Problem per code. Everything passes C1 and lets API/UI tests run with no external data. |
| C8 | Pages build and deploy (4) | `scripts/export_site.py`, `.github/workflows/pages.yml` | First build by H18 | Praneeth: base path `/UCSC-AI-HACKATHON-V-P-N-C/`, hash router, `BrowserEngine` with two ONNX sessions, local ORT WASM assets. Vinesh: artifact sets. C16. D6. | todo | `VITE_PROFILE=pages` build. Copies, unchanged, exactly the files the release index selects plus the files their manifests reference (`onnx_path`, `preprocessing_path`, `model_card_path`), plus the WASM assets, under the repository path. The publish allowlist is enforced. A bundle scan finds no credentials, `/api/`, localhost, `127.0.0.1`, or chat endpoints. Deploys use the official Pages actions with the platform-issued token only. |
| C9 | Export gates (5) | Gate functions in `export_site.py`; `tests/contracts/test_export_gates.py` | H8-18 | Vinesh's manifests, artifact sets, parity fixtures, templates and rendered fixture, Python parity test command; Praneeth's browser parity and renderer test command; C16 | blocked: no artifact sets yet | Export refuses, naming the reason, when the release index or any manifest is schema-invalid; any sha256 in the index or a manifest does not match the file bytes; a hash is zero; `trained_on=real` lacks nonzero patient counts or `metrics.json`; preprocessing epsilon differs from the manifest; or Vinesh's Python parity test, Praneeth's browser parity test, or either template renderer against `*.rendered.json` fails or was not run. The gate *runs* those tests and reimplements none. Synthetic artifacts ship only with synthetic labels. |
| C10 | Smoke suite (6) | `scripts/smoke.py` (`local` and `pages` modes), `tests/e2e/**` | H8-18 | Nisheeth's start command and routes; Praneeth's UI and test hooks; Vinesh's supervisor | blocked: no app yet | Runbook local steps 1-8 and Pages steps 1-5 are automated where supported and listed as manual otherwise. Pages smoke runs a new in-domain input on both engines in a clean browser and checks parity. Each run records commit and mode. |
| C11 | Integration merges (6) | §12 merge records | H4, H8, H12, then H12-18 | Owner slices | todo | Every merge passes §7. Conflicts are resolved at the source schema and then regenerated. The previous tested release is preserved. |
| C12 | Failure paths (6) | Smoke cases and §12 evidence | H18-24 | C10 | blocked: C10 | Each failure case, run with the owning developer, shows its typed Problem or labeled fallback: queue full (429 with Retry-After), missing or hash-failing manifest (engine disabled with a `degraded_reasons` entry), Qwen down or timing out (template explanation), out-of-domain horizon (`OUT_OF_DOMAIN`), invalid input, cancel queued and running jobs, restart (`failed/INTERRUPTED`), empty browser cache, blocked artifact. |
| C13 | Demo package (7) | `docs/DEMO_RUNBOOK.md`, `docs/JUDGE_TECHNICAL_OVERVIEW.md` fill-ins, `docs/integration/backup-capture.md` | Draft H12, final T-1h | Vinesh's cohort, metric, and parity evidence; Praneeth's GX10 timings | todo | Every "fill in" is replaced by sourced evidence or "not measured". The three-minute pitch is timed, backup-capture instructions work for teammates, and the survey reminder names a human and a deadline. |
| C14 | Release record (7) | `docs/integration/RELEASE.md` | T-4h to T-1h | C8-C13, C16 | todo | Records release commit, CI run, Pages URL, the release index with its checksums, observed smoke results, and limitations. The previous release is retained. |
| C15 | Handoff | `docs/integration/HANDOFF.md` | End | All | todo | Matches §11. |
| C16 | Release index (5) | `artifacts/public/release-index.json` (S6), written by an `export_site.py index` subcommand; `.gitattributes` for byte-stable artifacts | H1 fixture; each release | Vinesh's synthetic empirical and mechanistic sets and templates (his first slice); C7; D11 | blocked: no artifact sets yet | Schema-valid against `release-index.schema.json`. Lists both manifests (or `null` with the reason recorded), every case catalog with its `source`, the templates file, and `knowledge` (`null` until Vinesh ships it, C14). Every sha256 is computed from the committed bytes, never typed, and none is zero. A clean Linux checkout reproduces the same hashes as a Windows checkout (`core.autocrlf=true` here, so `artifacts/public/** -text` or equivalent is in place). |

## 6. Upstream inputs

When a task is blocked, record the exact missing item, continue unblocked work, and never invent schemas, fixtures, or evidence to stand in for an owner's.

| Input | Producer | Needed by | Status |
| --- | --- | --- | --- |
| Accept/object on the redesign C-rows | Praneeth, Nisheeth, Vinesh | C2, C3 | not recorded (PR #1 merged by Chaandan at 18:39) |
| App skeleton, Python dependency list, start command, settings keys | Nisheeth | C3, C4, C10 | not yet |
| Web scaffold, package scripts, Vite base path, hash router, `BrowserEngine` (two ONNX sessions, template renderer), browser parity test command | Praneeth | C3, C4, C8, C9, C10 | not yet |
| Synthetic empirical and mechanistic artifact sets (real ONNX, real hashes, `trained_on=synthetic`), parity fixtures, templates and rendered fixture, Python parity test command | Vinesh | C9, C16 | not yet (only the synthetic interface fixtures in `contracts/examples.json` exist) |
| Modeling dependencies; real artifact sets, ispy2 catalog, cohort and metric evidence | Vinesh | C4, C6, C9, C13 | not yet |
| `JobStore` contract suite passing against SQLite | Vinesh (suite), Nisheeth (impl) | C10, C12 | not yet |
| GX10 aarch64 smoke window and rehearsal window | Praneeth | C6, C12, C13 | not scheduled |
| Pages enabled with source "GitHub Actions" | Repository admin | C8 | not yet (D6) |

## 7. Interfaces, seams, merge gate, contract changes

**Seams** (CONTRACTS.md and redesign §4; nothing else crosses an owner boundary). My role at each is validation, never implementation.

| # | Seam | Producer | Consumers | My job |
| --- | --- | --- | --- | --- |
| S1 | REST DTOs (`domain.schema.json`) | Nisheeth | Praneeth | Schema, examples, generated clients, CI |
| S2 | Empirical artifact set | Vinesh | Nisheeth (via S9), Praneeth | Hash and schema gate; run parity tests |
| S3 | Mechanistic artifact set | Vinesh | Nisheeth (via S9), Praneeth | Same |
| S4 | Case catalogs (`CaseRecord[]`) | Vinesh (ispy2), **me (synthetic)** | Nisheeth, Pages export | Produce synthetic catalog; schema gate |
| S5 | Parity fixtures | Vinesh | Praneeth, my export gate | Run both runtimes' tests |
| S6 | Release index | **me** | Nisheeth (`load_release`), Praneeth's worker, export | Produce; hashes from bytes |
| S7 | Explanation templates and rendered fixture | Vinesh | Vinesh's service, Praneeth | Run both renderers' tests |
| S8 | `JobStore`/`ResultCache` port | Vinesh (Protocol), Nisheeth (impl) | — | Merge gate only |
| S9 | `load_release`, `admission_check`, `make_supervisor` | Vinesh | Nisheeth | Merge gate only |

**What I provide:**

| Output | Consumers | Promise |
| --- | --- | --- |
| `contracts/*.json` and the contract tests | Everyone | Changes only through the contract change procedure below |
| `app/generated/**` | Nisheeth, Vinesh | Regenerated, never hand-edited; header carries the schema hash |
| `web/src/generated/**` | Praneeth | Same |
| Release index | Nisheeth, Praneeth, export | Only file selecting versions; every hash computed from bytes |
| Synthetic case catalog and test seeds | Nisheeth (API tests), Praneeth (UI) | Deterministic and always labeled synthetic |
| CI (`make check`) | Everyone | No secrets; red CI blocks a merge |
| Pages export and gates | Team, judges | Fails closed |
| Smoke scripts and runbook | Team | Every run records commit and mode |

**Branch map** (pending D1): shared `main`; role branches from the workflow doc are `dev/praneeth-ui-gx10`, `dev/nisheeth-api`, `dev/vinesh-model-pipeline`, `dev/chaandan-integration`. Mine is currently `cha2`.

**Merge gate.** All must hold before a slice merges into `main`. The merge itself needs human authorization.

- [ ] `git fetch` done and the branch is up to date with `main`.
- [ ] `pytest tests/contracts` passes and there is no schema or client drift (`generate_contracts --check` once C3 exists).
- [ ] The diff stays inside its owner's boundary. A shared-boundary change updates producer, generated client, consumer, and fixture in one coordinated change.
- [ ] No formula, scaler, inverse transform or template logic added outside the ONNX graphs and the one substitution renderer per runtime.
- [ ] Job POST routes still return 202 promptly, with no inline GPU or LLM work. Executors read only their payload snapshot.
- [ ] Cache and fallback provenance are correct (`origin_source` on cached), and model split, units, and treatment claims are preserved.
- [ ] No credential or data leak: audit passes, and the bundle scan passes once C8 exists.
- [ ] A meaningful acceptance result is recorded and CI is green.

**Contract change procedure:** proposal, then consumer examples, then affected-owner acknowledgment, then a version bump if incompatible, then regeneration, then producer and consumer tests (including a negative case for the change), then one coordinated micro-commit, then a fingerprint update here.

**Conflict resolution:** stop the merge and identify the path owner and the intended behavior. Resolve with that owner's small patch. Never pick ours/theirs blindly for generated files, manifests or the release index: resolve the schema first, then regenerate or recompute hashes. Lockfiles go through the package tool and the owner.

## 8. Defect and handoff protocol

**Defect log** (`docs/integration/defects.md`, created on first use). Fields: ID (`INT-###`), title, severity, owner, commit, mode (synthetic / local / GX10 / Pages), steps to reproduce, expected behavior with its contract source, actual behavior, evidence (no secrets), disposition, date.

**Severity:**

- S1: wrong number or unit, false success, unsupported scientific or clinical claim, or leaked secret or data. Report immediately.
- S2: core flow broken.
- S3: degraded or confusing behavior.
- S4: cosmetic.

**Disposition:** `open`, `acknowledged`, `fixed-verified` (I re-ran it), `assessed` (the owner's release decision is recorded), `wontfix` (with reason).

**Routing** follows the [ownership registry](../roles/README.md): `web/**` goes to Praneeth; routes, persistence, sessions, settings, `main.py`, and `scenarios.py` go to Nisheeth; modeling, jobs, integrations, explanations, prompts, data, artifact sets, real catalogs and templates go to Vinesh. An unlisted path needs a named assignment from the team.

**Cross-owner request:** owner and path, current behavior with the failing sample, requested behavior, proposed interface example or patch, affected consumers and fixtures, and how to verify. Claude drafts it; a human sends it.

## 9. Guardrails

From the role contract, CLAUDE.md, CONTRACTS.md and the runbook.

- Generate, don't decide: schema meaning is joint.
- One implementation per formula: never add a scaler, inverse, physics formula or template logic in scripts, gates or tests. Gates run owners' tests.
- Never export fallback fixtures as trained predictions, never describe a synthetic model as patient-trained, never ship a zero hash, and never mark a skipped test as passed.
- Pages never calls a local or remote API or chat endpoint, and no `VITE_*` value holds a credential. The browser model must actually run new inputs; a successful upload is not proof of parity, so verify model and WASM URLs from a clean browser.
- No silent publishing: deploy only a commit that passed CI and the export gates.
- No Vercel, Railway, or hosted backend; no Redis, Celery, microservices, or new state library.
- Volumes are always cm3. FTV is not a cell count. Drug-off curves are illustrative what-ifs. Sensitivity bands are not calibrated intervals; the empirical engine has `band_kind=none` in v1.
- Cache keys include case, manifest sha256, schema and prompt versions; cached results keep `origin_source`. Explanation cache is session-scoped.
- Small diffs, named-path staging, micro-commits. Rule of 3 for bugs: after three failed attempts, preserve the evidence on a clean branch and restart context.
- Never claim tests, CI, deployment, parity, or hardware results without the run that shows them.

## 10. Acceptance criteria

Taken from the role contract. A box is checked only with a §12 evidence entry.

- [ ] Schema, examples, and generation consistent with all owners (C1, C2, C3)
- [ ] Clean-clone contract and build checks run; micro-commit and merge cadence maintained (C4, C5, C11)
- [ ] Tested Pages export loads under the repository path and runs numerical inference without local APIs (C8, C9, C10, C16)
- [ ] Seed, cached, synthetic, and template sources and failure states visible (C7, C12)
- [ ] Final hardening block, actual release evidence, backup, and event reminders completed (C13, C14)

## 11. Handoff format

Every handoff, per change and final, lists:

1. Tested commit, CI and Pages status, and the Pages URL
2. Owned paths changed and the behavior delivered
3. Contract version and the fixtures used
4. Release index and its checksums
5. Commands actually executed and their observed results, including smoke results
6. Known limitations, skipped checks, and hardware checks not yet run
7. Remaining dependencies, their owners, and any prepared cross-owner request

Label every claim as measured, target, estimated, synthetic, or not tested.

## 12. Change log

Newest first. Bump the plan revision when §2 or §5 changes structure or when the contract baseline changes.

| Date | Rev | Task | Files | Verification (command and observed result) |
| --- | --- | --- | --- | --- |
| 2026-10-10 | 2 | C0 reconcile | Merged `origin/main` (`7d6cb32`, boundary redesign PR #1) into `cha2`. `tests/contracts/check_boundary.py`: release index and `artifacts/public/cases/synthetic-*.json` now Owned, `docs/proposals/**` Joint and normative. `tests/contracts/test_check_boundary.py`: 11 new tier cases. This plan: baseline, fingerprint, tiers, seams S1-S9, C1/C2/C3/C7/C8/C9/C12/C14 re-specified, new C16, §6 inputs, D4 closed, D2/D5/D7 updated, D10-D11 added. | Before the edit, `audit` failed as designed: fingerprint drift `384ecc2db233` → `5f5da7022998`. New guard cases failed first (3 failures), then `py -3 -m unittest discover -s tests/contracts -p test_check_boundary.py`: 30 tests OK. `.venv/Scripts/python -m pytest tests/contracts/test_contract_schemas.py -q`: 19 passed (jsonschema 4.26.0, pytest 9.1.1 in a gitignored repo `.venv`). `fingerprint`: working tree = HEAD = `origin/main` = `f4bfbd58fd59`. `audit`: see commit. Not verified: live hook firing in a fresh session. |
| 2026-10-10 | 1 | C0 | `docs/integration/PLAN.md`, `tests/contracts/check_boundary.py`, `tests/contracts/test_check_boundary.py`; local only: `.claude/settings.local.json` (hooks repointed from the retired `oncovision/tests/qa/` path, which no longer exists on this branch) | `py -3 -m unittest discover -s tests/contracts -p test_check_boundary.py`: 30 tests OK. `fingerprint`: working tree = HEAD = `origin/main` = `384ecc2db233` (CRLF checkout hashes match committed blobs). Configured commands confirmed in the settings JSON, then piped directly: 13 `PreToolUse` payloads gave the expected decision (deny: other owner, notebook in `modeling/`, relative path from `web/`, generated file, `.env`, credential in an owned file; ask: `contracts/`, `docs/roles/03`, guard self-edit; allow: PLAN.md, `scripts/seed_demo.py`, lowercase-drive `readme.md`, path outside the repo). A malformed payload exits 1, which `onFailure: block` turns into a blocked write. `UserPromptSubmit` printed the reminder, branch, tree state and Next up. `Stop` was silent on this tree and with `stop_hook_active`. `audit`: PASS (see commit). Not verified: live firing inside a session, because hooks load at session start and this session began outside the repo. |

## 13. Open decisions

| ID | Question | Proposal | Decides |
| --- | --- | --- | --- |
| D1 | Keep my branch as `cha2` or rename it to `dev/chaandan-integration` from the workflow doc? | Keep `cha2` until the team confirms the map in §7 | Chaandan |
| D2 | Python schema validator | Settled by use: `jsonschema` (draft 2020-12) plus `referencing` for the cross-file URN refs, as `test_contract_schemas.py` already does. Pin them with `pytest` as dev dependencies in root `pyproject.toml` (C4) | Chaandan with Nisheeth |
| D3 | Code generators | `datamodel-code-generator` for Pydantic v2; `json-schema-to-typescript` and `json-schema-to-zod` for TS. Each must resolve `urn:oncogrowth:domain:1` refs across files (bundle schemas first if not). Pin after a CI and GX10 smoke | Nisheeth (Python), Praneeth (TS) |
| D4 | Release artifact index path | **Closed** by the redesign: `artifacts/public/release-index.json`, owned by Chaandan (registry, C16) | — |
| D5 | Where non-case test seeds live (jobs, results, problems) | `tests/fixtures/synthetic-seed.json`, read by API/UI tests. Case catalog location is fixed by the redesign (`artifacts/public/cases/synthetic-<v>.json`) | Nisheeth, Praneeth |
| D6 | Enable Pages (Settings, Pages, source "GitHub Actions") on `bmvinesh/UCSC-AI-HACKATHON-V-P-N-C` | The repository admin enables it before C8 | Repository admin |
| D7 | Where the semantic validators (CONTRACTS.md "Semantic validation") live, given they are needed in Python and TS | Implement once in Python next to the contract tests for CI and the export gate; the API gets them through Nisheeth's Pydantic validators and the browser through Praneeth's Zod refinements, all three checked against one shared fixture suite in `tests/contracts/` | Joint |
| D8 | Retired-scope leftovers: `stash@{0}` on `cha1` (old QA plan and guard) and `origin/claude/dreamy-brahmagupta-i6bey7` (old data-prep work) | Leave untouched; their authors decide whether to drop or archive them | Chaandan (stash); Nisheeth (branch) |
| D9 | Kickoff time (H0) and the 24 h or 36 h track | Record both here so windows become clock times | Team |
| D10 | The redesign is merged on `main`, but its status line says "proposal, not agreed" and no accept/object record exists | Collect each owner's accept/object for their C-rows (redesign §6 step 2) and record it in §12; ask Vinesh to update the proposal's status line | Praneeth, Nisheeth, Vinesh |
| D11 | Parity fixtures (`parity.json`) and the rendered template fixture are not referenced from the release index or a manifest, so the export gate can find them only by the CONTRACTS.md directory layout | Accept the layout as the contract for v1, or add their paths and hashes to the manifests or index in a coordinated contract change | Vinesh with Chaandan |
