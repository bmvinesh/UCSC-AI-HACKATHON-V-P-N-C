# R1 contract: Praneeth — frontend, GX10 runtime, integration

Version 2.0 | Owner: **Praneeth** | Work location: **directly on ASUS Ascent GX10 with Claude Code** | Workload: **heavy**

Read [the shared contract](00-shared-contract.md). Paths are relative to `oncovision/`. You own the entire user experience and on-device deployment; Vinesh owns scientific/backend behavior. You are the integration/release lead.

## Writable boundary

- `web/**` except Vinesh-generated API/schema files, including frontend dependencies, build, state, generator configuration, and test configuration.
- `compose*.yaml`, `services/llm/**`, `.env.example`, `Makefile`, root `pyproject.toml`, `uv.lock`; repository-root `.github/workflows/**` narrowly for this application.
- `scripts/{preflight,bench,soak,netwatch,prefetch_models}.py`, `scripts/package_offline*`.
- `services/api/src/onco_api/telemetry/**`, `tests/{hardware,frontend,e2e/core}/**`.
- `docs/{contracts,decisions,runbooks,demo/product}/**`.

## Cannot touch without a named handoff

Shared DTOs, generated output by hand, DB/migrations, report rules/prompts, vision algorithms, artifact writers, and Vinesh's API/vision Dockerfiles. Request the exact change from Vinesh. Do not infer backend status in the browser to work around an API bug. Hardware access does not authorize destructive driver/OS changes or edits to teammates' worktrees.

## Deliverables in order

1. Establish the GX10 integration checkout and runtime inventory: GPU/driver/container toolkit, disk, supplied power/display, local weights, account permissions. Preserve the working host and coordinate any required privileged setup.
2. Adapt the old UI visual design into React components. Implement case board, OpenSeadragon, live heatmap, nuclei, ranked-region fly-to, report editor/review, and telemetry. Replace pre-baked MRI arrays with local API data; bundle retained fonts/icons/scripts.
3. Serve Nemotron locally with a reproducible image/checkpoint/configuration. Start conservatively with speculative decoding off. Verify a real completion before tuning context, batches, or concurrency.
4. Run Vinesh's first real vision crop on GX10 while the LLM stays resident. Return logs, versions, exact commands, results, and failures. This hardware feedback must happen early, not at final integration.
5. Wire Compose, mounts, health/readiness, startup order, GPU allocation, and egress restrictions. Maintain a GPU-free test profile for mock API/UI development.
6. Implement telemetry collection, system panel, kiosk launch, offline preflight, packaging, benchmark, soak, and restart runbook. Use directory mounts for atomically replaced host telemetry.
7. Build frontend core e2e tests and validate geometry, pending/failed states, stale request cancellation, snapshot/delta resync, report edit conflicts, and cold-browser offline startup yourself. Chaandan adds independent coverage; he is not your testing gatekeeper.
8. After P0 offline acceptance, own P1/P2 UI and runtime wiring: simulated Live Scope display, evidence explanations, case summary, and local voice interface. Vinesh owns their backend/inference implementations.

## Direct agreement with Vinesh

Vinesh supplies canonical schemas, mock API fixtures, artifact/geometry fixture, Dockerfiles, model requirements, and request examples. You supply local LLM endpoint/model identity, tested deployment config, real telemetry, hardware logs, and reproducible viewer failures. Coordinate schema/client generation in one integration change. Do not wait for Nisheeth's complete catalog or Chaandan's full QA suite to connect a minimal real slide path.

## Guardrails

- One owner controls the GX10 runtime. Separate sessions use separate worktrees and agreed GPU windows; no simultaneous benchmarks or unannounced service restarts.
- Browser talks only to API. Pending/unknown is not zero; backend controls statuses and grounded report content.
- Keep streamed tile state outside React's full render tree; bound buffers, redraw frequency, and viewport traffic. Reject late results for a previous slide/analysis even after request cancellation.
- Verify separate X/Y MPP and level-0 transforms at edges and multiple zooms. Preserve unsaved report edits across unrelated updates.
- Egress enforcement, link state, and default route are separate signals. Loopback publishing alone does not block outbound traffic.
- No fixed “VRAM used” gauges, silent CDN/model downloads, cloud fallback, or unsupported latency claims. Record units/source/age; do not double-count file cache.
- No speculative acceleration before a correct measured baseline. All required model residency is verified under concurrent load.

## Acceptance and handoff

- [ ] Real slide/UI path and generated clients integrated; all P0 interactions work.
- [ ] Real LLM and both vision models coexist on GX10 with warmup/readiness verified.
- [ ] Geometry, reconnect/stale responses, report revisions, and failure states pass core e2e checks.
- [ ] Cold offline launch uses only local assets; actual network restrictions tested.
- [ ] Mixed-load benchmark/soak and two offline rehearsals recorded; unmet targets disclosed.
- [ ] Tested commit, image/checkpoint hashes, startup/recovery instructions, hardware return plan delivered.

Own release acceptance with Vinesh. Chaandan assists rehearsal and survey reminders. Nisheeth assists prepared data. If either support task blocks release, explicitly take over the small needed task rather than wait indefinitely; keep its scientific and release checks intact.
