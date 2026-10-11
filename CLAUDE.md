# OncoGrowth repository rules

This root file governs coding agents. Read it plus your role and the exact schema before feature work. New scope replaces the retired histology plan: one breast-cancer project, one paclitaxel intervention, GX10 local work, browser-model GitHub Pages delivery. No implementation success is implied by planning files.

## Plan before code

Begin every task by checking a clean working tree, target owned files, pseudocode, contract version/sample, error/cancel behavior and verification command. Hour 1 shared-contract freeze precedes feature coding. Read only relevant modules; save concise checkpoints and handoffs before context reset.

## Allowed stack and architecture

React + Vite + TypeScript + Tailwind frontend; FastAPI + Pydantic + SQLite/SQLAlchemy migrations; PyTorch numerical work; ONNX export and ONNX Runtime Web WASM in a Web Worker. Lock versions after smoke-testing on GX10/aarch64. One application monolith with local supervised executors. Use installed Qwen behind a configurable loopback adapter. No new application microservices, Redis/Celery/Kubernetes, hosted backend, new state library, generic framework rewrite, or cloud inference fallback.

## Responsibilities and imports

Routes validate/delegate; services coordinate; repositories persist; jobs schedule; modeling computes; integrations handle model-runtime transport; UI presents. Numerical core never imports FastAPI/SQLAlchemy/LLM clients. Browser components never implement a second scaler/clinical rule. Shared schemas/generated clients reject drift; generated files are not hand-edited. Follow `docs/roles/README.md` boundaries and obtain named owner handoffs for shared edits.

## Scientific/data rules

Volume units explicit; patient-disjoint splits before fitting transforms; no future-feature leakage or test-set tuning. Audit drug exposure and time windows; do not call a combined-regimen result paclitaxel-only. MRI-derived FTV is not cell count. Old mortality risk is not growth. Counterfactual no-drug curves and sensitivity ranges are illustrative unless independently established. LLM cannot generate numerical evidence, efficacy or prescribing claims. Never remove provenance/error states to make a demo look successful.

## Configuration and secrets

All runtime endpoints/model alias, generation limits, seeds, memory/worker budgets, deadlines and breaker settings come from validated settings/versioned manifests. No credential/token literals, even placeholders that resemble real keys. `.env` and weights/raw data are ignored. `.env.example` contains empty secret values only; frontend `VITE_*` settings are public and may never contain credentials. Avoid logging auth headers, full environment or sensitive prompts. CI uses ephemeral platform-provided credentials only via platform contexts, never committed values.

## Async/fallbacks

POST job routes persist+queue+202 promptly; no LLM, scrape, training or GPU loop inline. SQLite persists jobs; bounded supervised executors and cooperative cancellation; interrupted tasks cannot silently succeed. Local Qwen outage produces labeled cached/template explanations. Pages never calls local/cloud chat endpoints. Cache keys include case/model/scaler/schema/prompt versions; no private cross-session cache leakage. Unexpected bugs remain typed/logged, not fake success.

## Git, context and bugs

Separate worktree/session per owner. Start new functional slice only on a clean tree; editing within that slice is expected. Review owned diff, run meaningful checks, immediately micro-commit; intentional WIP stays on feature branch. Do not stash/reset/delete someone else's edits, stage raw data/secrets, force-push shared branches or merge stale generated files.

After three distinct failed bug attempts: save patch/reproduction/fresh logs safely on a clean branch, restart/clear session context, and re-feed only minimal failing files/contracts/rules/logs. Never claim tests, training, benchmarks or deployment passed without actual evidence. A task prompt does not authorize new agents/chats, public posting or account changes; follow direct human authorization and tool policy.
