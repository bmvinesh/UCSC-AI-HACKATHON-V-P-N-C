# R2 contract: Nisheeth — data preparation and provenance

Version 2.0 | Owner: **Nisheeth** | Workload: **bounded support** | Core partners: Vinesh for schema, Praneeth for GX10 files

Read [the shared contract](00-shared-contract.md). Your job is a reliable local slide/catalog package and clear demo metadata. You do not own model inference, APIs, deployment, or a prerequisite architecture decision.

## Writable boundary

`scripts/data_prep/**`, `tests/data_prep/**`, `data-manifests/{slides,demo-case}.json`, `fixtures/demo/catalog/**`, `docs/data/**` (all relative to `oncovision/`).

## Cannot touch

Runtime services, shared schemas, generated clients, production prompts/rules, frontend, Docker/Compose, dependency locks, or the GX10 integration checkout. Do not tune tumor thresholds, fabricate clinical labels, distribute restricted weights, or change metadata just to make a test pass. Propose schema changes to Vinesh with a concrete example.

## Bounded tasks

1. Read Vinesh's manifest schema and example. Create a small slide inventory with source/reference, local relative filename, SHA-256, size, preparation metadata, dimensions and MPP when verified, plus license/access notes.
2. Help obtain the agreed slides through authorized sources and stage them in a separate preparation directory. Downloads happen before offline rehearsal. Transfer to GX10 only through Praneeth's agreed destination; never overwrite an active slide or model.
3. Implement small preparation/validation scripts under your owned directory: file existence, checksum, required fields, path containment, duplicate IDs, and missing metadata. Use schema validation supplied by Vinesh; do not write another schema.
4. Populate the demo case manifest and human-readable slide catalog. Explicitly mark case/margin assignments as synthetic when not established by the source. Do not combine unrelated patients as a genuine operation.
5. Provide representative cases for normal operation, missing MPP, missing file, and duplicate record; label intentionally invalid fixtures and keep them outside the real catalog.
6. Produce `docs/data/README.md` with preparation commands, provenance, local storage expectations, and unresolved access/metadata issues.

## Inputs / outputs

Vinesh provides schema and minimal fixture immediately; Praneeth provides storage/transfer instructions. You deliver validated JSON, hashes, local file locations, and preparation results. Large slides, models, tokens, raw personal records, and the confidential ASUS PDF do not enter Git.

## Non-blocking agreement

Praneeth and Vinesh start using their minimal core fixture and first real slide without waiting for the complete catalog. Your prepared catalog is additive. If access is delayed, report exactly which file is unavailable and continue manifest validation/documentation. Never replace an unavailable real slide with an unlabeled synthetic result. Real data remains required for the real demo; Praneeth/Vinesh can explicitly take over a needed preparation task.

## Acceptance

- [ ] Manifest validates against Vinesh's schema; each available file has a verified hash and size.
- [ ] Provenance, preparation type, known/missing MPP, and synthetic mappings are explicit.
- [ ] Preparation utilities have meaningful malformed/missing/duplicate checks.
- [ ] Praneeth receives a reproducible local-file handoff; no runtime downloads introduced.
- [ ] Restricted/large files and credentials are absent from Git.

## Handoff

Send a small owner-reviewed commit plus the catalog path, transfer instructions, validation command/output, and unresolved data questions. You are not responsible for CUDA, CONCH/CellViT integration, clinical classification, report generation, or final deployment.
