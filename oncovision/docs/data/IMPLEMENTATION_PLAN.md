# R2 implementation plan: Nisheeth — data preparation and provenance

Owner: **Nisheeth (R2)** | Contract: [`02-nisheeth-data-preparation.md`](../contracts/02-nisheeth-data-preparation.md) v2.0 | Shared contract: [`00-shared-contract.md`](../contracts/00-shared-contract.md) v2.0
Status: **plan only — nothing below is implemented, run, or verified yet.** Acceptance boxes stay unchecked until a command has actually run and its output was inspected.

All paths are relative to `oncovision/` unless they start with the repository root.

---

## 0. Change gate — run this before AND after every change

This plan is the reference for every R2 change. A coding session reads it before editing and repeats the checklist before committing.

**Before editing:**

1. Re-read this file and the current contract versions in `docs/contracts/README.md`. If the contract version changed from 2.0, stop and reconcile this plan first.
2. Name the plan task (T1–T9 below) the change implements. If none fits, the change is out of scope: add a decision-log entry and get agreement before you edit.
3. Confirm every file you will touch is inside the R2 boundary (§1). Read-only access to other owners' paths is fine.

**Before committing:**

4. Run `python3 oncovision/scripts/data_prep/check_boundary.py` from the repository root. It must print `OK`. It rejects files outside the R2 boundary, slide/weight file types, files larger than 5 MB, and secret-looking files.
5. Run the R2 tests (`pytest oncovision/tests/data_prep`, once T2 exists) and the validator on the real manifest (once T5 exists). Record the commands and actual output in the progress log (§8).
6. Re-read the diff against the guardrails (§2). Check for invented schema fields, guessed MPP, unlabeled synthetic data, a network call, a zero standing in for missing data, or a large or restricted file.
7. Update the progress log and the acceptance checkboxes (§7). Check a box only on observed evidence.

---

## 1. Boundary (from the contract — do not widen)

| May write | Purpose |
| --- | --- |
| `scripts/data_prep/**` | Preparation and validation tooling (stdlib-first) |
| `tests/data_prep/**` | Tests plus intentionally invalid fixtures |
| `data-manifests/slides.json` | Slide inventory (real slides only) |
| `data-manifests/demo-case.json` | Demo case and specimen mapping |
| `fixtures/demo/catalog/**` | Small, valid, labeled demo catalog package (no large binaries) |
| `docs/data/**` | This plan, data README, human-readable catalog, open issues |

**Never write:** `data-manifests/schema/**` (Vinesh), `scripts/seed_demo.py` (Vinesh), `packages/**`, `services/**`, `web/**`, Compose/Docker, root `pyproject.toml`/`uv.lock`, CI, prompts, generated clients, other people's tests or fixtures, the GX10 integration checkout.

**Never commit:** slide images, model weights, tokens or credentials, raw personal records, the confidential ASUS PDF, or any file larger than 5 MB.

**Dependencies:** Adding a package to the root lockfile is Praneeth's job. Scripts use only the standard library. The two optional imports are Vinesh's schema package (validation) and `openslide` (metadata reading). Each one is detected at runtime, and if it is missing the tool reports the step as **not run**. It never reports a pass for a step it skipped.

---

## 2. Guardrails (checked in step 6 of the change gate)

1. **No second schema.** Field names come from Vinesh's schema and example in `data-manifests/schema/`. R2 code reads fields through one adapter module (`manifest_fields.py`), so a schema rename touches one file. Propose schema changes to Vinesh with a concrete example; never edit them yourself.
2. **Missing is not zero.** Unknown MPP, dimensions, or size stay `null`/absent, with an explicit reason such as `"mpp_status": "missing_in_source"`, whatever form the schema allows. Never default MPP (no assumed 0.25 or 0.5) and never assume `mpp_x == mpp_y`.
3. **Verified means read from the file.** Dimensions and MPP are recorded as verified only when read from the slide with OpenSlide. Values from a website or paper are recorded as source-reported and never promoted to verified.
4. **Synthetic is always labeled.** Any case, specimen, or margin assignment that the source does not establish is marked synthetic, with a reason. Slides from different source patients can never form a genuine single operation. The validator enforces this rule.
5. **Real stays real.** An unavailable real slide is reported as unavailable. It is never replaced by a synthetic or unlabeled stand-in, and no metadata is changed just to make a test pass.
6. **Offline runtime.** Downloads happen only in the explicit preparation step, before offline rehearsal. Nothing at runtime downloads, and validation makes no network calls.
7. **Never overwrite.** Transfer tooling refuses to overwrite a destination file whose hash differs. It only copies new files and verifies hashes afterwards. Active slides and models on the GX10 are never touched. Praneeth names the destination.
8. **Bounded resources.** Hash in fixed-size chunks (e.g. 8 MiB) so memory stays bounded for multi-GB slides. Never decode a full slide; only read the header and properties.
9. **Deterministic output.** Sorted keys, stable record ordering, fixed indentation, trailing newline. The same input always gives byte-identical output, so diffs stay reviewable.
10. **Scope.** No clinical labels, threshold tuning, inference, API, or UI work. If a blocker sits in another owner's path, report it with the concrete sample or error and continue independent work.

---

## 3. Architecture of the R2 tooling

Single-responsibility modules with pure checks and I/O at the edges:

```
scripts/data_prep/
  check_boundary.py     # change gate: git diff ⊆ R2 paths, no large/restricted files   [exists]
  manifest_fields.py    # ONLY place that knows Vinesh's field names → typed views (adapter)
  hashing.py            # streamed sha256 + size; no other logic
  slide_metadata.py     # optional openslide: dimensions, levels, downsamples, mpp_x/mpp_y; returns explicit "unverified" on any gap
  checks.py             # pure functions: records → list[Issue]; no I/O beyond stat/hash via injected callables
  schema_validation.py  # delegates to Vinesh's validator/Pydantic model; returns Issue or NOT_RUN
  inventory.py          # scan a staging dir → draft slide records (never overwrites hand-entered provenance)
  transfer.py           # plan/copy/verify to Praneeth's destination; no-overwrite, re-hash on arrival
  render_catalog.py     # manifests → docs/data/catalog.md (human-readable)
  cli.py                # argparse subcommands: inventory | validate | transfer-plan | transfer | verify | render
```

- **Issue model:** `Issue(code, severity: error|warning, record_id, field, message)`. Validation returns every issue rather than stopping at the first one. Exit code 0 means no errors. Exit code 1 means errors were found. Exit code 2 means a required step could not run (for example, the schema is unavailable). A step that could not run is never reported as a pass.
- **Path roots are explicit.** Manifest paths are relative to a slide root passed with `--slide-root` or the `ONCO_SLIDE_ROOT` environment variable. There is no default inside the repository.
- **Testability.** `checks.py` takes data plus injected `exists/stat/hash` callables, so unit tests need no multi-GB files. Tests use tiny generated byte files.

---

## 4. Tasks (mapped to contract bounded tasks 1–6)

| ID | Task | Contract | Depends on | Done when |
| --- | --- | --- | --- | --- |
| T1 | Change gate: `check_boundary.py` and this plan | guardrail | — | Prints `OK` on a clean branch; rejects an out-of-boundary path (manually verified) |
| T2 | Skeleton: `hashing.py`, `checks.py`, Issue model, `cli.py validate`, pytest suite | 3 | — | Tests cover checksum mismatch, missing file, path escape (`..`, absolute, symlink out of root), duplicate IDs, duplicate hashes, missing required fields |
| T3 | Read Vinesh's schema and example; write `manifest_fields.py` and `schema_validation.py` | 1, 3 | **Vinesh's `data-manifests/schema/**`** | Vinesh's own example validates; field adapter covered by tests; nothing schema-shaped defined by R2 |
| T4 | Slide inventory: identify agreed slides, check access and licence, stage outside the repository, `inventory` + `slide_metadata.py` | 1, 2 | Agreed slide list (team); authorized access | Each available slide has sha256, size, source/reference, licence/access note, preparation metadata, verified-or-explicitly-missing dimensions/MPP |
| T5 | Populate `data-manifests/slides.json` and `data-manifests/demo-case.json` | 4 | T3, T4 | `cli validate` exits 0 against the schema; synthetic mappings labeled; patient-mixing rule enforced |
| T6 | Edge-case fixtures: normal, missing MPP, missing file, duplicate record | 5 | T3 | Invalid fixtures live in `tests/data_prep/fixtures/invalid/`, carry an `"_intentionally_invalid"` label, and each causes its expected issue code; only valid labeled data goes in `fixtures/demo/catalog/` |
| T7 | Transfer handoff: `transfer-plan`, `transfer`, `verify` | 2 | Praneeth's destination path and storage instructions | Dry run lists actions; transfer refuses to overwrite a differing file; re-hash on destination matches the manifest |
| T8 | `docs/data/README.md` + `docs/data/catalog.md` (rendered) | 6 | T5 | Contains preparation commands, provenance, local storage expectations, unresolved access/metadata issues |
| T9 | Handoff package | handoff | T5–T8 | Small commit + catalog path, transfer instructions, validation command/output, open data questions sent to Vinesh/Praneeth |

**Non-blocking order:** T1 → T2 can start now. T4 (access and inventory) runs in parallel because it needs no schema. T3, T5 and T6 wait for Vinesh's schema. Until then, T2 checks stay schema-independent, built on file, hash, path and ID primitives behind the adapter, so nothing waits idle. T7 waits only on Praneeth's destination path.

---

## 5. Gate alignment (06-integration-and-acceptance.md)

| Window | R2 deliverable | Exit evidence |
| --- | --- | --- |
| 0–2 h | T1, T2 skeleton; T4 begins: list available slides and access status | Boundary check `OK`; access table in `docs/data/README.md` |
| 2–6 h | T4 hashing/metadata of staged slides; T3 once schema lands | sha256/size per available slide; schema example validates |
| 6–10 h | T5 manifests, T6 fixtures; validated catalog handed off; T7 transfer | `cli validate` exit 0; transfer verify output |
| 10–14 h | T8 provenance and edge-case docs complete | README + rendered catalog committed |
| 14–18 h | Resolve catalog discrepancies reported by Vinesh/Praneeth | Issues closed or listed as open |
| 18–21 h | Verify final release files and hashes on GX10 (via Praneeth's window) | `verify` output against final manifest |
| 21–24 h | T9 final data handoff | Handoff message per §6 |

---

## 6. Interfaces and handoffs

- **From Vinesh:** the manifest schema and minimal example (`data-manifests/schema/**`), plus how to invoke his validator (Pydantic model import or exported JSON Schema). If anything is missing or ambiguous, send him a boundary-change request (template in `05-coding-agent-metaprompt.md`) with a concrete example.
- **From Praneeth:** the GX10 destination directory, the transfer method and window, and the storage budget.
- **To both:** a handoff in the format of shared contract §Handoff: owned paths changed, behavior/interface version, verification command and actual result, fixture/example, known limitations, remaining dependencies. Label every claim as measured, mocked, estimated, or not tested.
- **Runtime independence:** boot never runs R2 scripts. Vinesh's loader and `seed_demo.py` consume the prepared files.

---

## 7. Acceptance (copied from the contract — check only with evidence)

- [ ] Manifest validates against Vinesh's schema; each available file has a verified hash and size.
- [ ] Provenance, preparation type, known/missing MPP, and synthetic mappings are explicit.
- [ ] Preparation utilities have meaningful malformed/missing/duplicate checks.
- [ ] Praneeth receives a reproducible local-file handoff; no runtime downloads introduced.
- [ ] Restricted/large files and credentials are absent from Git.

---

## 8. Open questions (resolve; do not guess)

1. Which slides are agreed for the demo? What is their source (e.g. TCGA or another public repository), and does access require accounts or a data-use agreement?
2. What format is Vinesh's schema: an exported JSON Schema, or an importable Pydantic model in `packages/onco_common`? Where does `slides.json` sit relative to `demo-case.json`, as one file or linked by ID?
3. What exactly belongs in `fixtures/demo/catalog/` compared with `data-manifests/*.json`? Proposed: the manifests are the real catalog, and `fixtures/demo/catalog/` is a small labeled dev package for `seed_demo.py`. Confirm with Vinesh.
4. What GX10 destination path and transfer method will Praneeth provide (rsync, USB, or scp over the local network)?
5. Is `pytest` available in the root dev dependencies? If not, request it from Praneeth.

## 9. Progress and decision log

| Date | Task | Change | Verification (command → actual result) |
| --- | --- | --- | --- |
| 2026-10-10 | T1 | Plan written; `check_boundary.py` added | `check_boundary.py` → `OK: 5 changed file(s)` (exit 0); probe file `oncovision/web_test_probe` → `FAIL: 1 violation` (exit 1) |
