# Shared engineering contract

Version 2.0. Assignments: R1 Praneeth, R2 Nisheeth, R3 Chaandan, R4 Vinesh. Applies to R1-R4 and every coding assistant. Application path root: `UCSC-AI-HACKATHON-V-P-N-C/oncovision/`.

## Product and scope

Build the supplied P0: case/specimen board, deep-zoom slides, viewport-first scores, nuclei overlays, ranked regions, editable grounded draft with review/sign action, and measured telemetry. Preserve P1 Live Scope, report explanation mode, and case summary, plus P2 local voice and optional encoder optimization. Follow the original gate: P1/P2 begin only after P0 passes an offline rehearsal. Changing scope is a team decision, not an agent shortcut.

This is a research workflow demonstration. Synthetic case/margin assignments must be labeled. MRI risk, simulation density, tissue-model score, and clinical ground truth are different quantities. Neither old prognostic scores nor simulated growth are inputs to the new margin rules.

## Ownership registry

A listed exception overrides its parent directory. Owners may edit their paths without repeated permission. Everyone may read and review other paths. Ownership prevents concurrent edits; it does not require repeated user approval for assigned work. Role numbering changed in version 2; old role files are superseded.

| Owner | Writable source paths |
| --- | --- |
| R1 Praneeth | `web/**` except generated output; `compose*.yaml`, `services/llm/**`, `.env.example`, `Makefile`, root `pyproject.toml`, `uv.lock`, application CI configuration; `scripts/{preflight,bench,soak,netwatch,prefetch_models}.py`, `scripts/package_offline*`; `services/api/src/onco_api/telemetry/**`; `tests/{hardware,frontend,e2e/core}/**`; `docs/{contracts,decisions,runbooks,demo/product}/**` |
| R2 Nisheeth | `scripts/data_prep/**`, `tests/data_prep/**`, `data-manifests/{slides,demo-case}.json`, `fixtures/demo/catalog/**`, `docs/data/**` |
| R3 Chaandan | `tests/e2e/regression/**`, `tests/qa/**`, `fixtures/qa/**`, `docs/qa/**`, `docs/demo/rehearsal/**` |
| R4 Vinesh | `packages/onco_common/**`; `services/api/**` except telemetry; `services/vision/**`; `prompts/{report_v1.md,conch_prompts_v1.yaml}`; `scripts/{export_schemas,gen_types,seed_demo,gc_artifacts}.*`; `tests/{api,contracts,reports,vision}/**`; `fixtures/{contracts,reports,vision,demo/core}/**`; `data-manifests/schema/**` |
| R4 generated only | `web/src/api/generated/**`, `web/src/api/ws/schemas.generated.ts`, generated schemas under `build/` |

Praneeth owns frontend package/lock files and generator configuration; Vinesh owns generation and committed generated output. Vinesh owns API and vision Dockerfiles and per-service dependency declarations; Praneeth owns Compose wiring and root dependency resolution. Vinesh supplies dependency requests; no one independently changes the shared root lockfile.

All paths above are relative to `oncovision/`. GitHub only loads Actions workflows from the repository-root `.github/workflows/`: Praneeth owns that external exception, narrowly for OncoVision CI. It must not change unrelated jobs. Commands in CI must use the correct application working directory.

Vinesh defines the slide/demo-manifest schema and supplies a minimal core fixture. Nisheeth populates the catalog and validates it using that schema. Runtime boot cannot depend on executing Nisheeth's preparation scripts: it consumes prepared local files through Vinesh's loader. `scripts/seed_demo.py` accepts the catalog when available and an explicit labeled core fixture for development; it never quietly invents real evidence.

Chaandan's tests are additive and runnable separately. Praneeth owns browser-test configuration and core e2e tests; Vinesh owns backend/vision test configuration. They keep testing their own work even if QA contributions are not ready. Tests that reveal real release defects must be resolved by the responsible core owner.

Unlisted paths are assigned by Praneeth with the affected owner. New files within owned paths need no further assignment. Old QBIHack applications are read-only external sources. No hand edits to generated output, edits in another person's worktree, or overwriting uncommitted work.

## Cross-owner change protocol

1. Describe the defect and propose a minimal versioned schema/example or patch. Name producer, consumers, migration, and acceptance test.
2. Vinesh owns contracts and backend/vision decisions; Praneeth owns UI/runtime integration. These two coordinate directly without waiting for support-role approval.
3. The path owner implements the change or delegates named paths for a stated period. Record the handoff before editing, including any support task taken over by a core owner.
4. Shared schema updates include producers, generated clients, fixtures, and consumers in the same coordinated integration change. Vinesh generates; Praneeth verifies UI/runtime compatibility.
5. Nisheeth and Chaandan report blocked work with the concrete sample/error, then continue independent catalog/QA work. They do not invent replacement schemas or fix production code outside their boundaries.

Use one branch/worktree per person. Praneeth controls the GX10 integration checkout and restart/benchmark schedule. Vinesh can provide scripts and PRs for hardware checks; direct GX10 edits require an isolated checkout and agreed test window. No concurrent inference benchmarks, driver changes, or model-server restarts from competing sessions. Development fixtures unblock laptops; only real hardware evidence satisfies hardware gates.

No force pushes, broad cleanups, unrelated formatting, or unrequested history rewriting. Support-role review is useful but never a required approval gate for core work. Existing repository protection and CI rules still apply. Scope remains unchanged; this version redistributes ownership rather than deleting deliverables.

## Runtime boundaries

- `api` alone writes SQLite; one API process owns the writer. Frontend, vision, and LLM never write it.
- `vision` alone writes analysis artifacts. API reads only published artifacts and validates paths under the artifact root.
- `llm` serves the local model. Vinesh owns client behavior, report prompt, validation, and rendering.
- Browser speaks to API only. It never contacts model containers or a remote inference service.
- CPU-bound reads/encoding/hash work runs in bounded workers, not on the event loop. Queues, caches, concurrency, and buffers have explicit bounds.
- Register and supervise tasks. Use timeouts and cleanup for all external waits. Avoid per-request model loading, clients, process pools, and full-slide decoding.
- Explicit units and names beat ambiguous abstractions. Preserve missing values; never replace unknown, failed, or pending measurements with zero.

## Minimum shared interface contract

Vinesh translates this contract into versioned frozen Pydantic models and generated TypeScript validators at the first gate. Examples and tests are delivered alongside the models. The baseline spec remains the detailed route reference, with the amendments below.

| Boundary | Required semantics |
| --- | --- |
| Slide geometry | Level-0 origin at top left; x right, y down; separate `mpp_x`, `mpp_y`; width/height; pyramid downsample factors; explicit coordinate space. Never silently assume MPP. |
| Tile identity | `(analysis_id, col, row)` identifies a 224 micrometer physical core. Compute X/Y pixel boundaries from physical coordinates, retaining consistent rounding; avoid cumulative grid drift. |
| Nuclei | Polygon and centroid in level-0 coordinates; class mapping explicitly remapped from checkpoint labels. Missing segmentation differs from an empty successful result. |
| Commands | Version, message ID, trace ID, timestamp, analysis ID as applicable. Start, cancel, viewport, throttle, probe; bounded queues. |
| Job lifecycle | Immediate accepted/rejected acknowledgment separate from actual start. One active vision job; queued jobs are not failed merely for waiting longer than ten seconds. |
| Results | Ordered per-analysis sequence, tile results, stage/coverage, quality flags, artifact-ready event, region snapshot, completion. Include final counts and artifact manifest revision. |
| Artifacts | Relative path, immutable file identity/checksum, coordinate/schema version, tile membership. Publish only after successful close and atomic rename. |
| Browser streams | Validated entity events plus ephemeral tile/telemetry updates. Initial snapshot and subsequent deltas have a defined revision/watermark so late snapshots cannot overwrite newer cells. |
| Findings | Frozen analysis IDs, final region references, model/prompt/config hashes, measured values with units, coverage, limitations, quality, thresholds, and provenance. |
| Telemetry | Value, unit, source, sample time, availability; no synthetic performance figures. Expose stale samples. |

For reliable results, Vinesh implements acknowledgments/replay or detect gaps and fail the affected analysis explicitly. A larger sequence number alone is not proof no results were lost. Prevent terminal transitions from incomplete/gapped streams. Viewport/throttle updates may coalesce; scientific results may not silently disappear. Worker command handling and heartbeats must remain responsive during inference.

## Amendments to the original design

### Coverage and scientific claims

- Report generation can produce a coverage-qualified draft; it does not certify negative findings.
- An empty region list must not imply adequate segmentation or a negative result. Record no-tissue, missing MPP, small excluded hotspots, quality failures, and incomplete coverage explicitly.
- Use “no regions exceeded the configured threshold” where supported. Do not equate it with a clear surgical margin. Status machine can retain internal enums only if outward wording and evidence requirements are corrected together.
- CONCH output is an uncalibrated prompt-relative score. Specify logit-scale handling; do not label it a clinical probability or average it with a cell fraction without a separately justified method.
- Region area must say whether it is grid footprint or tissue-covered area. Density denominators use the measured segmented tissue area. Use per-slide and per-stage coverage in multi-slide specimens.
- Use stable final region references in reports. Recomputed ranks must not redirect an old report's evidence links.

### Vision/artifacts

- Adapt the 224 micrometer grid to checkpoint-native crops explicitly; 64 pixels of padding per side produces different input sizes at 20x and 40x. Validate padding/resampling, coordinate transforms, border handling, and class mapping.
- Prefer immutable completed superblock shards plus an atomic manifest. Do not expose an unfinished append-only Parquet file to ordinary readers.
- Cache keys include slide hash, model checkpoints, preprocessing, actual prompt content hash, and pipeline configuration/version. Concurrent requests for the same artifact key must share a producer or use isolated attempt directories with one final publisher.

### Reports

- Server controls status, limitations, coverage, measured values, and recommendations. LLM prose cannot contradict them.
- Numeric placeholders alone are insufficient validation. Validate finding-to-token associations, required limitations, and allowed narrative structure; handle spelled-out claims and contradictory conclusions.
- Finalize evidence snapshots before generating. A report over partial coverage must remain explicitly partial.
- No unvalidated stream is presented as a usable report. Show drafting progress, then validated content. LLM failure may produce a visibly marked deterministic template; never fabricated model output.
- Preserve original machine output and human edits separately. Sign/review is a demo workflow action, not authenticated clinical certification. Signed text is immutable; later edits require a new revision.
- P1 “show reasoning” means an evidence-based explanation with linked measurements and limitations; do not promise access to hidden model reasoning or treat a model trace as proof.

### Platform/offline

- Mount a telemetry directory read-only into API, not a single atomically replaced file. Host sampling owns sibling-container/host telemetry where container namespaces hide it.
- API loopback port binding does not prevent outbound traffic. Enforce the intended egress policy and test permitted local calls plus prohibited public connections.
- Distinguish network links, routes, and enforced isolation. No default route alone is not proof of an air gap.
- Memory category totals must not double-count cgroup file cache and host page cache. Do not call allocator fractions hard whole-process memory caps. Measure actual behavior on the device.
- Start with speculative decoding disabled; add it only after a working measured baseline. No hardware throughput claim follows solely from active parameter count.
- All dependencies, assets, weights, tokenizer/config files, and slides needed by demo are available before disconnection. No silent downloads or cloud fallback.

### Fallback policy

Development/test may use explicitly labeled mocks with provenance. Demo requires real CONCH, real CellViT, and real local LLM availability at readiness; no silent runtime switch to mock. Invalid report output can fall back to a labeled template. After a component failure, preserve available results and show the failure. A reduced-capability demo profile requires a team decision, updated readiness/rules/UI, and rehearsal; never activate it as an undocumented exception.

## Code quality and efficiency

Use the baseline modern Python/FastAPI/Pydantic/SQLAlchemy APIs and React/TypeScript patterns with pinned dependencies. Prefer small domain functions and adapters; keep route parsing, business decisions, persistence, and model execution separate. Common schemas depend only on lightweight libraries and never import services. No broad framework rewrites or duplicative “universal” abstractions.

Use representative fixtures early. Implement a working slice before optimizing it. Benchmark before adding shared-memory rings, compilation, TensorRT, or speculative execution complexity. This is sequencing, not removal of planned features. Keep caches byte-bounded and avoid copying large arrays between processes or React states.

Write meaningful tests at boundaries: transforms, coverage, missing data, restart/order handling, report contradictions, and offline cold starts. Do not spend the deadline testing trivial getters or demanding that every legitimate SQL scan disappear. Use query plans and profiling where they reveal actual bottlenecks.

## Handoff format

Every change provides: owned paths changed; behavior and interface version; verification command and actual result; fixture/example; known limitations; remaining dependencies. Distinguish measured, target, estimated, mocked, and not tested. A checklist cannot be checked by intention alone.
