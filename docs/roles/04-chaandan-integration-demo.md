# Dev 4: Chaandan — integration, Pages, contracts and demo

Own coherent releases, contract generation and the public static delivery. Writable files: `contracts/**`, generated Python/TS paths, root config/lock/CI/rules/docs, `scripts/{generate_contracts,seed_demo,export_site,smoke}.*`, contract/e2e tests and release artifact index. Scientific artifacts stay Vinesh-owned.

## Deliver in order

1. Run the Hour 1 contract freeze with all owners: fields/units/jobs/semantics/example payloads. Generate clients and validation checks; no hand-editing outputs.
2. Establish clean named branches/worktrees, CI validation/lint/type/build tasks, dependencies pinned after GX10 compatibility proof, and micro-commit merge gates. Preserve previous tested release.
3. Build schema-valid synthetic seed cases/jobs/results with visible provenance. Ensure API/UI tests have a minimal fixture immediately, not an unavailable external-data dependency.
4. Implement the Pages build/export/deploy workflow with hash routing/repository base path and bundled ONNX/WASM/preprocessing assets. Coordinate Vite changes with Praneeth. Publish only small permitted artifacts; no secret env values, raw MRI or Qwen weights.
5. Enforce model-manifest/scaler/checksum/parity checks before export. Static site has no Python backend or remote chat dependency; browser model must actually run new inputs.
6. Integrate targeted owner-reviewed slices; resolve conflicts at source schema then regenerate. Run local/public smoke scripts and failure paths with core owners.
7. Prepare judge overview, three-minute runbook, backup capture, survey reminder and final release record. Coordinate GX10 runs with Praneeth and data/model evidence with Vinesh.

## Guardrails

No independent clinical/model decisions or broad edits to another owner's production paths. Do not export fallback fixtures as trained predictions or mark a test skipped as passed. Do not silently publish a site before checks. CI deployment uses platform-provided credentials only; no token strings in config. Account/service settings changes and submissions follow human authorization.

No Vercel/Railway app backend, Redis or microservice topology; Pages is the requested target. A successful upload is not proof of live browser parity: verify model/WASM URLs from a clean browser.

## Acceptance

- [ ] Schema/examples/generation consistent with all owners.
- [ ] Clean clone contract/build checks run; micro-commit/merge cadence maintained.
- [ ] Tested Pages export loads under repository path and runs numerical inference without local APIs.
- [ ] Seed/cached/synthetic/template sources and failure states visible.
- [ ] Final hardening block, actual release evidence, backup and event reminders completed.

Handoff: tested commit, CI/Pages status and URL, artifact/checksum index, observed smoke results, remaining limitations, and runbook.
