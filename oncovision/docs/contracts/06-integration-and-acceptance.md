# Integration schedule and acceptance record

Read [the shared contract](00-shared-contract.md). This preserves the original scope and stages integration early. Times are elapsed hours from team kickoff, not promises of measured hardware performance.

## Gates

| Window | R1 | R2 | R3 | R4 | Exit evidence |
| --- | --- | --- | --- | --- | --- |
| 0-2 h | Inventory GX10, start serving proof, establish branches/deps | Real crop and slide metadata, checkpoint proof | Amended schemas, fixtures, generated types | Extract UI shell, render real DeepZoom slide | Contract version agreed; exact hardware and real-model blockers recorded |
| 2-6 h | Real local completion, coexistence probe | Real scored crop/nuclei with geometry fixture | Mock API-to-report lifecycle complete | Full UI flow on canonical fixtures | Mock integrated demo plus separate real-model evidence |
| 6-10 h | Stable serving/runtime, early mixed-load bench | Real event stream and immutable shard publication | Consume real events/artifacts; queue acknowledgments | Real scores/nuclei and alignment checks | One real slide through viewer, evidence, and persistence |
| 10-14 h | Telemetry and enforced offline topology | Scheduler, coverage/QC, counts and final regions | Real grounded report, fallback, edits/review | Regions/report links, resync and measured system panel | Real P0 path works as one deployment |
| 14-18 h | Full P0 offline rehearsal | Resolve real pipeline issues; then P1 | Resolve correctness; then P1 contracts | Rehearse; then P1 experience | P0 offline pass unlocks P1/P2 according to original priority |
| 18-21 h | Mixed-load soak and restart checks | Cancellation/recovery and edge crops | Ordering, evidence/fallback, multispecimen checks | End-to-end offline/reconnect coverage | Defects assigned and repaired; claims reconciled with measurements |
| 21-24 h | Freeze tested release; cold boot and hardware logistics | Assist defect fixes and benchmark interpretation | Assist defect fixes and provenance review | Two rehearsals/backup capture; survey reminder | Reproducible judged demo; no unverified performance claims |

If a gate slips, preserve scope in the backlog and report the dependency. Team decides tradeoffs explicitly. Do not start unintegrated optional work while P0 remains broken. Merge small owner-reviewed changes throughout the day instead of waiting for a final bulk integration.

## Tests that matter

| Test | Producer / verifier | Pass condition |
| --- | --- | --- |
| Geometry fixture | R2 / R4 | Known level-0 points and polygons land on expected pixels across zoom, borders, and MPP axes |
| Live artifact publication | R2 / R3 | API reads a closed shard while other superblocks run; no partially published file is visible |
| Queue and recovery | R2+R3 / R1 | Accepted second job waits legitimately; restart/gap/cancel cannot produce false success |
| Coverage rules | R3 / R2 | Zero regions, zero tissue, partial segmentation, small hotspots, and failed slides never produce unsupported negative findings |
| Report grounding | R3 / R4 | Values, links, limitations, and status match frozen evidence; adversarial/invalid prose falls back visibly |
| Snapshot/delta race | R3 / R4 | Reconnect and late snapshot never overwrite newer cells or mix analyses |
| Stale viewport query | R4 / R3 | Delayed nuclei response from old viewport/slide is ignored |
| Resource sharing | R1 / R2+R3 | Models coexist and measured latency/memory remain within the chosen release envelope |
| Cold offline start | R1 / R4 | Empty browser cache, no runtime internet, no missing assets/weights; complete flow succeeds |
| Human edits | R3 / R4 | Original machine draft retained; modified values are human-authored; signed revision is immutable |
| Test profile | R1 / R3 | Contract/e2e mock tests do not require CUDA images, model health checks, or real weights |
| Demo transparency | R4 / all | Synthetic mappings, cache hits, templates, partial coverage, and unsupported measurements are visible |

## Readiness is layered

- Process health: process can answer a liveness check.
- Component ready: required model loaded and warmed or service initialized.
- Analysis complete: final counts, sequences, and artifacts reconcile; no unresolved failures.
- Report-ready evidence: frozen usable evidence exists with explicit coverage/limitations.
- Demo ready: end-to-end local flow and cold offline rehearsal pass on the actual GX10.

Do not collapse these into a single optimistic green check.

## Release record

Fill with observations, not planned values:

- Tested repository commit:
- Hardware model / OS / driver:
- Image digests and checkpoint hashes:
- Slide IDs/hashes and synthetic mapping disclosure:
- Shared contract version:
- Cold boot to ready:
- Full-slide pass 1 / segmentation coverage / total:
- Viewport-to-visible-result p50/p95 and sample count:
- Report TTFT / validated draft time / token count:
- Peak host memory / measurement method / swap baseline and change:
- Mixed-load latency and temperature/power where supported:
- Offline enforcement tests and cold-browser result:
- Actual fallback exercised:
- Remaining limitations and targets not achieved:
- Feedback survey completed by / time:
- Hardware return responsible person / deadline:

## Source and claim reminders

The supplied ASUS PDF requires GX10 local development/demo, hardware return, and survey completion. It provides four judging themes: meaningful problem, originality, value of local AI, and engaging utility. Demonstrate them through one understandable workflow, real local compute, measured behavior, and evidence the user can inspect.

Do not repeat the PDF's general marketing language as a proven absolute privacy/security guarantee. Air-gap behavior, model validity, and performance are separate claims needing their own evidence. The optional public social-content challenge does not authorize publication by a coding assistant.
