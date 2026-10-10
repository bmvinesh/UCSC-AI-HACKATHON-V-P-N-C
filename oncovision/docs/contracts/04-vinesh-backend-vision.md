# R4 contract: Vinesh — backend, vision, shared contracts, reports

Version 2.0 | Owner: **Vinesh** | Workload: **heavy** | Direct integration partner: **Praneeth on GX10**

Read [the shared contract](00-shared-contract.md). You own the complete evidence-to-report backend and scientific pipeline. Coordinate API/UI and hardware requirements directly with Praneeth. Nisheeth's data pack and Chaandan's QA add value but do not gate your first working implementation.

## Writable boundary

- `packages/onco_common/**`, `services/api/**` except telemetry, `services/vision/**` including their Dockerfiles/service dependency declarations.
- `prompts/{report_v1.md,conch_prompts_v1.yaml}`, `scripts/{export_schemas,gen_types,seed_demo,gc_artifacts}.*`.
- `tests/{api,contracts,reports,vision}/**`, `fixtures/{contracts,reports,vision,demo/core}/**`, `data-manifests/schema/**`.
- Generated API/WS clients and schema output, through generators only.

## Cannot touch without a named handoff

Frontend source/configuration, telemetry sampler implementation, LLM launch scripts, Compose, root locks/CI, or Praneeth's GX10 integration checkout. Request hardware changes and runtime windows from Praneeth. Review Nisheeth's catalog and Chaandan's findings without silently editing their work.

## Implementation sequence

1. Publish amended Pydantic schemas, generated client types, manifest schema, and canonical examples. Agree with Praneeth on geometry, accepted/start states, event sequences, artifacts, snapshot watermarks, findings, errors, and telemetry before broad implementation.
2. Supply a minimal labeled seed case plus deterministic mock adapters independent of Nisheeth. Build the whole API-to-report development path while proving real CONCH/CellViT on a crop through Praneeth's GX10 test window.
3. Implement OpenSlide reads, tissue mask, physical tile grid, model preprocessing/class mapping, viewport scheduling, quality and coverage, immutable artifact shards, and final region extraction. Bound caches, readers, queues, and batches.
4. Implement FastAPI lifecycle/routes, single SQLite writer, migrations, transactional outbox/idempotency, IPC acknowledgments, job queue/recovery, read-only artifact access, and snapshot/delta resync.
5. Build deterministic status/coverage rules, frozen findings, template reports, and server-controlled measured values/limitations. Connect Praneeth's local LLM endpoint with validation, repair, timeout/fallback, and composable throttle cleanup.
6. Implement report edit/review/revisions with stable evidence links. Integrate Nisheeth's schema-validated catalog when ready, preserving source provenance and explicit missing-data behavior.
7. Own backend/vision/contract tests. Give Praneeth runnable warmup/crop/throughput commands and interpret hardware failures together. Do not defer testing until Chaandan finishes regression work.
8. After P0 offline acceptance, own P1 Live Scope backend/transport, evidence explanations/case summaries, and P2 local voice backend/encoder optimization as scoped; Praneeth owns UI/runtime integration.

## Critical correctness guardrails

- Match checkpoint-native input dimensions explicitly at 20x/40x; preserve separate X/Y MPP, crop origins, rounding, core ownership, padding and class mapping. Test seams, borders, anisotropy, and missing MPP.
- CONCH softmax is prompt-relative score, not calibrated clinical probability. Old MRI risk/PDE outputs are never tissue evidence.
- API alone writes SQLite; vision alone writes artifacts. Publish closed immutable shards and a manifest atomically. Cache keys include actual prompt/preprocessing/model hashes; concurrent producers cannot corrupt shared keys.
- A queued acknowledgment is not a started event. Detect sequence gaps and reconcile final counts/artifacts before success. Commands and heartbeats stay responsive while inference executes.
- Empty region coverage cannot establish a negative result. Preserve excluded small hotspots, failed/no-tissue states, and per-slide coverage. Draft readiness differs from sufficient evidence for a conclusion.
- Placeholders alone do not prevent contradictory prose. Server controls status, coverage, limitations, recommendations, and measurements; validate finding-token associations and freeze evidence before generation.
- Distinguish machine drafts and human edits. Signed revisions are immutable; report links survive region reranking/recomputation.
- One throttle reason ending cannot cancel another. Use leases/reasons or equivalent composable state. Worker OOM recovery must be demonstrated or trigger a supervised restart.
- No remote calls/downloads in runtime, handwritten parallel frontend DTOs, or silently accepted invalid data. Keep routes/domain/persistence/inference separate even though one person owns them.

## Acceptance and handoff

- [ ] Generated schemas/fixtures and mock full flow ready early; manifest/core seed do not depend on support delivery.
- [ ] Real crop and full-slide evidence verified on GX10 with Praneeth; nuclei geometry and classes checked.
- [ ] Published artifacts readable during ongoing computation; counts, gaps, queue/restart/cancel behavior tested.
- [ ] Snapshot/delta reconnection and transactional persistence work without false success.
- [ ] Coverage edge cases and adversarial report output cannot produce unsupported conclusions.
- [ ] Real LLM integration, labeled fallback, edits/revisions, and evidence links verified.
- [ ] Tests, actual hardware results, fixtures, endpoint examples, and unresolved limitations handed to Praneeth.

Deliver small runnable slices rather than a final bulk backend merge. The first priority is one real slide → evidence → local grounded report; complete the remaining planned capabilities through subsequent gates.
