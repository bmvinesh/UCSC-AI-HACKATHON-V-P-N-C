# R2 contract: vision, slide data, artifacts

Owner: **unassigned** | Reviewer partners: R3 for events/artifacts, R4 for geometry, R1 for hardware

Read [the shared contract](00-shared-contract.md) first. Paths are relative to `UCSC-AI-HACKATHON-V-P-N-C/oncovision/`.

## Outcome

A real frozen-slide pipeline that emits correctly located tile evidence and nuclei incrementally, prioritizes the viewport, and exposes honest coverage and quality. Deliver executable real-model adapters early, before optimizing throughput.

## You may touch

`services/vision/**`, `prompts/conch_prompts_v1.yaml`, `scripts/prefetch_slides.py`, `tests/vision/**`, `fixtures/vision/**`, `data-manifests/slides.json`.

## You may not touch without a named handoff

SQLite, API routes/services, shared Pydantic definitions, generated clients, frontend rendering, Compose, root lockfiles, report prompts, or clinical status rules. Emit measurements and quality; R3 applies agreed rules. Do not import MRI risk models or the PDE solver as histology evidence.

## Reuse deliberately

Read the old manifest/discovery, mask comparison, and extraction tests for robust metadata handling. Extract small useful helpers with tests. MRI DCE enhancement segmentation, full-volume normalization, and 3D coordinate assumptions do not become H&E inference adapters by renaming fields.

## Implementation sequence

1. Obtain permitted local checkpoints and representative slides with R1. Record source, hash, license/access requirements, preparation type, and real metadata. Do not infer a surgical margin orientation from TS/BS slide codes.
2. Implement OpenSlide-backed `SlideReader`: bounded region reads, dimensions, pyramid levels, `mpp_x/y`, errors. Missing spacing blocks physical measurement unless an explicit verified override is recorded.
3. Prove CONCH and CellViT on one real crop on GX10. Use checkpoint preprocessing, correct text/image features, explicit logit scaling, and verified class remapping.
4. Produce a geometry fixture: source crop bounds, level-0 nuclei/polygons, tile identity, expected physical area. R4 must be able to draw it without guessing transforms.
5. Add tissue masking, physical grid, viewport-first scheduling, batching, coverage and quality accounting. Do not block the command loop or heartbeats during compute.
6. Publish immutable artifact shards and a manifest after close/rename; emit artifact-ready events using R3's schema. Supply a file schema/reader fixture for R3's read-only adapter.
7. Implement region extraction and final snapshots. Preserve evidence of small excluded hotspots and distinguish grid footprint from tissue area.
8. Optimize reads, caches, batches, and transfers using R1's measurements. Implement P1 Live Scope only after P0 offline acceptance, with explicit simulated-feed labeling and agreed binary transport.

## Handoff obligations

- To R3: accepted/start/result/finish/error fixtures; artifact manifest and finalized shard; class mapping; counts, coverage, quality, and cache-key inputs; restart/gap behavior.
- To R4 through R3: level-0 geometry fixture including anisotropic spacing, edge crops, and high-zoom nuclei.
- To R1: image/build requirements, checkpoint manifest, warmup entrypoint, model residency, and stage timers with correct GPU synchronization/event timing.

## Non-negotiable guardrails

- No whole-slide decompression into RAM. Bound decoded cache, prefetch, shared-memory slots, and pending work.
- Match checkpoint-native dimensions explicitly. A 224 micrometer tile plus fixed pixel padding differs at 20x and 40x; never silently resize without preserving physical meaning.
- Centroid ownership is a rule, not proof of zero edge artifacts. Test seam nuclei and consistent transforms on both sides of boundaries.
- Do not reinterpret background/padding as tissue, exclude failed tiles from denominators silently, or treat uncomputed scores as zero.
- Score is prompt-relative, not a validated tumor probability. QC heuristics are flags, not validated artifact diagnoses.
- Do not publish unfinished Parquet files. Cancelled attempts remain unpublished; retries cannot overwrite artifacts still referenced by completed analyses.
- A CUDA OOM does not guarantee the process can safely continue. Clean up and demonstrate recovery, or exit with a clear failure so supervision restarts it.
- Do not alter events locally to “make the API work.” Request R3's coordinated contract change.

## Acceptance

- [ ] Real adapters run on GX10 alongside the local LLM.
- [ ] Geometry verified at 20x/40x, non-square spacing, slide edges, and adjacent cores.
- [ ] Cell class IDs verified against checkpoint output rather than assumed enum order.
- [ ] Empty tissue, missing MPP, failed inference, and zero detected nuclei remain distinct.
- [ ] Viewer/API can read a completed shard while later superblocks are still computing.
- [ ] Accepted jobs can wait without a false start timeout; cancellation/heartbeats stay responsive.
- [ ] Final counts, sequences, manifests, and coverage reconcile; cache invalidates on model/prompt/preprocessing change.
- [ ] Stage latency and throughput measured on representative slides; real and fixture output clearly distinguished.

## Handoff

Deliver a small redistributable-or-locally-reproducible fixture, event transcript, artifact schema/sample, geometry checks, model/prompt hashes, and known domain limitations. Keep restricted weights and slides out of Git.
