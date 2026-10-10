# R3 contract: backend, shared contracts, reports

Owner: **unassigned** | Reviewer partners: R2 for evidence, R4 for client behavior, R1 for serving

Read [the shared contract](00-shared-contract.md) first. Paths are relative to `UCSC-AI-HACKATHON-V-P-N-C/oncovision/`.

## Outcome

A coherent API that persists authoritative state, delivers live results without silently losing them, and creates grounded, provenance-preserving draft reports. You are the shared-interface owner and resolve schema ambiguity before parallel implementations diverge.

## You may touch

- `packages/onco_common/**`, `services/api/**` except `src/onco_api/telemetry/**`.
- `prompts/report_v1.md`, `scripts/{export_schemas,gen_types,seed_demo,gc_artifacts}.*`.
- `tests/{api,contracts,reports}/**`, `fixtures/{contracts,reports}/**`.
- Generated API/client/schema output through the generator only, including the shared paths listed in the ownership registry.

## You may not touch without a named handoff

Vision algorithms/artifact writers, LLM launch configuration, telemetry sampler internals, frontend components/state, Compose/root dependencies, R4's demo case manifest, or old applications. Ask R4 to update generator configuration when necessary; you regenerate outputs afterward.

## Reuse deliberately

Extract `config_fingerprint` and useful batch-state test patterns. Keep runtime lifecycle in SQLite; do not maintain competing JSON state. The old LLM narrative function is unimplemented, so budget report behavior as new code.

## Implementation sequence

1. Define the amended shared contracts and representative fixtures before broad endpoint implementation. Generate Python/TypeScript boundary validators reproducibly.
2. Implement app lifecycle, dependency adapters, bounded single writer, migrations, and basic specimen/slide/analysis routes. Keep domain functions independent of FastAPI and integrations independent of routes.
3. Deliver mock vision/LLM adapters behind the same protocols. Explicit modes and provenance follow results through persistence and UI. Test profile starts without real model services.
4. Implement acknowledged job dispatch, queue states, event ordering/gap handling, artifact-ready consumption, and final reconciliation. One success transition validates the final expected counts and published manifest.
5. Implement REST snapshots plus WebSocket deltas/reconnects with a shared watermark. Bound per-client queues; reserve/control resync delivery or close the slow connection for recovery.
6. Build deterministic coverage/status rules, frozen findings, and a template report first. Then connect R1's real LLM endpoint with bounded generation, repair, fallback, and cleanup.
7. Implement editing, immutable signed revisions, and stable provenance links. Read shards through a read-only adapter using R2's schema; validate all artifact paths.
8. Add case summary/explanation support after P0 acceptance. Wire P1 transport/schema changes before producers and consumers start using them.

## Required rules and invariants

- Exactly one API writer process; DB writes and durable events commit together. Idempotency records and created entities share a transaction.
- Acceptance timeout is distinct from queue duration. Failed/restarted worker handling addresses every affected queued/running job, not just the visible job.
- Reject stale/duplicate events; detect missing sequences. Do not mark a partial stream succeeded merely because a completion event arrived.
- `report_ready` is recomputed on relevant score, segmentation, region, and completion updates. It distinguishes provisional from finalized regions and never uses vacuous region coverage as negative evidence.
- Freeze per-slide analysis IDs and coverage for multi-slide specimens. Do not silently report only the one slide that finished.
- Keep rule status, thresholds, coverage, limitations, measurements, and recommendations server-controlled. A placeholder validator is necessary but insufficient.
- Findings-link validation checks that each placeholder belongs to the referenced finding; stable region IDs/snapshots survive recomputation and cache-copy operations.
- Never show malformed/contradictory LLM output as a draft. Template fallback is explicit; runtime never switches to an unlabeled mock.
- Record edits separately from grounded machine text. An edited quantity is human-authored, not automatically source-verified.
- Throttle ownership is composable: a report finishing must not remove throttling still required by Live Scope. Use reasons/leases or equivalent state and guaranteed cleanup.
- Retain referenced artifacts; garbage collection skips active producers and never deletes another role's source/data.

## Inputs and outputs

Receive local endpoint/readiness/telemetry from R1, real events/artifacts from R2, and case manifest/UI requirements from R4. Deliver generated clients, fixtures, route behavior, Problem errors, schema version, migration command, readiness model, and complete snapshot/resync examples.

## Acceptance

- [ ] Mock end-to-end flow works with one shared schema and no handcrafted duplicate frontend DTOs.
- [ ] Duplicate requests, lost acknowledgment, queued work, sequence gaps, worker restart, and cancellation are tested.
- [ ] Concurrent reader/writer behavior and atomic state/outbox changes verified.
- [ ] No regions, small excluded hotspots, missing/no tissue, incomplete segmentation, and multi-slide coverage have explicit safe outcomes.
- [ ] Unknown tokens, wrong finding links, stray numbers, contradictory conclusions, omitted limitations, and invalid streams cannot become validated reports.
- [ ] LLM timeout/invalid output yields a labeled deterministic template and restores only its own throttle reason.
- [ ] Human edits, sign/revision behavior, and stable evidence links verified.
- [ ] Generated code is reproducible; migrations and relevant contract checks pass.

## Handoff

Deliver generated clients, canonical fixtures, endpoint examples, lifecycle diagrams/table, actual test results, and a real/template report with evidence links. Explicitly list pending integrations instead of presenting mocks as completion.
