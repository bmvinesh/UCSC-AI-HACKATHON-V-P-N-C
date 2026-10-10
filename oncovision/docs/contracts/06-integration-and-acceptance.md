# Integration schedule and acceptance record

Version 2.0. Read [the shared contract](00-shared-contract.md). Praneeth and Vinesh own the critical path; Nisheeth and Chaandan have independent support deliverables. Scope is preserved. Times are elapsed from kickoff, not hardware performance promises.

## Critical-path agreement

- **Praneeth (R1):** frontend, GX10 setup, LLM serving, telemetry, deployment, hardware checks, release integration. Works directly on GX10 with Claude Code.
- **Vinesh (R4):** backend, schemas/generated clients, vision/artifacts, report grounding, domain tests. Supplies executable hardware probes to Praneeth early.
- **Nisheeth (R2):** prepared slide catalog/provenance and demo metadata; consumes Vinesh's schema.
- **Chaandan (R3):** additive QA/regression, bug evidence, rehearsal package, survey reminder.

Vinesh provides a minimal core seed and canonical fixtures; Praneeth and Vinesh run their own tests. Core development does not wait for a complete catalog, finished QA suite, or support-role signoff. Real slides, successful hardware operation, and correctness checks remain necessary for release. If a support task becomes blocking, a core owner explicitly takes it over with a path handoff; do not silently skip it.

## Gates

| Window | Praneeth: heavy, on GX10 | Vinesh: heavy, core implementation | Nisheeth: bounded support | Chaandan: bounded support | Exit evidence |
| --- | --- | --- | --- | --- | --- |
| 0-2 h | Inventory GX10; local LLM proof; UI shell and viewer | Schemas, manifest schema, mock fixture; runnable real-crop probe | Inventory available slides and access | Draft regression/rehearsal matrix | Direct API/geometry agreement; real hardware blockers identified |
| 2-6 h | Real vision probe while LLM resident; full fixture-backed UI flow | Mock API/evidence/report path; real crop adapters and geometry fixture | Hash/check files and populate catalog | Manual mock-flow checks | Mock integrated flow and separate real-model evidence |
| 6-10 h | Display real scores/nuclei; validate transforms; Compose integration | Real event/artifact path; queue acknowledgments and persistence | Validate and hand off prepared catalog | Add independent regressions and reproducible bug reports | One real slide through viewer and persistent evidence |
| 10-14 h | Telemetry, network restrictions, report UI and recovery | Real local LLM client, grounded reports, resync, final coverage | Complete provenance/edge-case fixture docs | Report/failure/reconnect checks | Complete real P0 deployment |
| 14-18 h | Run P0 offline rehearsal; then P1 UI/runtime | Fix core defects; then P1 inference/API | Resolve catalog discrepancies | Assist rehearsal and collect observations | P0 offline pass unlocks P1/P2 under original priority |
| 18-21 h | Mixed-load soak, cold-browser/boot tests | Ordering, geometry, evidence and restart fixes | Verify final release files/hashes | Execute additive regression; record remaining issues | Release candidate with measured claims |
| 21-24 h | Freeze tested release; final hardware rehearsals/return logistics | Core fixes and final scientific/provenance review | Final data handoff | Script, backup capture, survey reminder | Reproducible demo and actual acceptance record |

Merge small working changes throughout the day. If a gate slips, report its concrete dependency and agree on sequencing; do not silently remove features. Praneeth controls GX10 restart and GPU test windows so Vinesh's probes, local coding sessions, and rehearsals do not disrupt each other.

## Core acceptance checks: never delegated away

| Check | Accountable owner / partner | Pass condition |
| --- | --- | --- |
| Geometry | Vinesh / Praneeth | Known level-0 points/polygons align across zoom, tile seams, edges, 20x/40x, and separate MPP axes |
| Live artifacts | Vinesh | API reads closed shards while later superblocks compute; no partial publication |
| Queue/recovery | Vinesh / Praneeth on GX10 | Accepted jobs wait correctly; lost events/restart/cancel cannot produce false success |
| Coverage | Vinesh | Empty regions, no tissue, excluded hotspots, failures, partial segmentation, and multiple slides retain explicit evidence limits |
| Grounded report | Vinesh / Praneeth | Frozen measurements/links/status/limitations agree; invalid or contradictory generation falls back visibly |
| Browser state | Praneeth / Vinesh | Reconnect and late snapshots/viewport requests cannot overwrite newer results or mix analyses |
| Human edits | Vinesh + Praneeth | Original draft retained; edited values are human-authored; signed revision immutable |
| GPU coexistence | Praneeth / Vinesh | Real models coexist with recorded memory and mixed-load timings |
| Cold offline start | Praneeth | No cached external browser assets or runtime downloads required; enforced egress policy and local flow verified |
| Mock test profile | Praneeth + Vinesh | Core contract/UI tests do not require GPU containers, model health checks, or real weights |

Chaandan adds independent observations/regression, and Nisheeth validates catalog/provenance. Their contributions do not replace core owner verification. A defect they uncover still needs resolution or explicit release assessment.

## Readiness is layered

1. Process healthy: can answer a liveness check.
2. Component ready: required model warmed or service initialized.
3. Analysis complete: final counts, sequences and artifacts reconcile.
4. Report-ready evidence: frozen usable evidence exists with explicit coverage/limitations.
5. Demo ready: end-to-end local flow and cold offline rehearsal pass on the actual GX10.

Do not collapse these into one optimistic green indicator. Do not label mock, cached, estimated, or unmeasured behavior as fresh real inference.

## Release record

Praneeth and Vinesh complete technical evidence; Chaandan helps collect it. Fill with observations, not targets:

- Tested repository commit / contract version:
- GX10 model / OS / driver / image digests:
- Model/checkpoint/prompt hashes:
- Slide hashes / real provenance / synthetic mapping disclosure:
- Cold boot to ready:
- Pass 1 time / segmentation coverage / full analysis time:
- Viewport latency p50/p95 and sample count:
- Report TTFT / validated draft time / completion tokens:
- Peak memory / accounting method / swap baseline and change:
- Mixed-load latency / temperature / power where supported:
- Network enforcement tests / cold-browser offline result:
- Fallback and recovery cases actually exercised:
- Remaining defects, limitations, untested or missed targets:
- Feedback survey human owner / completion time (Chaandan reminds):
- Hardware return responsible person / deadline (Praneeth):

## Event and claim reminders

The supplied ASUS statement requires GX10 local development/demo, hardware return, and survey completion. Judging themes are meaningful problem, originality, value of local AI, and engaging utility. Demonstrate these with an understandable workflow, real local compute, measured behavior, and inspectable evidence.

Marketing language is not an absolute privacy/security guarantee. Isolation, scientific validity, and performance require separate evidence. Optional public social content does not authorize an assistant to publish or submit anything. Preserve the confidential source PDF outside the repository.
