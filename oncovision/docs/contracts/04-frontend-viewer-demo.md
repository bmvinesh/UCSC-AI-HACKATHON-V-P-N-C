# R4 contract: frontend, viewer, demo experience

Owner: **unassigned** | Reviewer partners: R3 for data/state, R2 for geometry, R1 for offline display

Read [the shared contract](00-shared-contract.md) first. Paths are relative to `UCSC-AI-HACKATHON-V-P-N-C/oncovision/`.

## Outcome

An understandable workstation experience that displays real streamed evidence, reveals uncertainty and failures, and supports a repeatable three-minute local demonstration. Reuse the existing visual design while implementing the new slide-viewing and runtime-data behavior.

## You may touch

`web/**` except generated API/schema output, `tests/e2e/**`, `fixtures/demo/**`, `data-manifests/demo-case.json`, `docs/demo/**`.

Own frontend package/lock files and generator configuration, coordinating generator changes with R3. Supply the demo case manifest; R3 owns the script that writes those records into the database.

## You may not touch without a named handoff

Shared schemas/generated types, backend endpoints, SQL, rules, report prompt/validator, model code, artifact writers, Compose, or hardware settings. Do not directly access LLM/vision or write your own inferred status from heatmap colors. Do not change the old published `docs/index.html` while building this separate application.

## Reuse deliberately

Extract styling and useful interaction patterns from `breast-cancer-sim/visualization-jasim/_template.html` and the existing palette. Keep source provenance. Replace pre-baked volumetric arrays and Plotly 3D assumptions with OpenSeadragon and runtime tile/event data. Do not infer viability, hypoxia, or necrosis from the old simulation palette in a new histology legend.

## Implementation sequence

1. Reuse the shell as small components: case board, viewer, regions, report, system status. Bundle fonts/icons locally and remove retained CDN dependencies.
2. Render a real slide via DeepZoom before adding model overlays. Use R3's generated API clients and fixture payloads while endpoints are arriving.
3. Implement heatmap state outside React render state, with pending/excluded/failed/complete distinctions. Use bounded redraw and viewport update rates.
4. Draw R2's geometry fixture at several zooms and slide positions. Apply the OpenSeadragon image-to-view transform consistently to tiles, polygons, and fly-to regions.
5. Integrate incremental scores/nuclei and snapshot/watermark resync. Abort obsolete viewport fetches and ignore late responses belonging to a previous slide/analysis.
6. Add report progress, validated draft, evidence links, edit/review controls, provenance, and visible fallback state. Preserve unsaved edits during unrelated events; handle version conflicts explicitly.
7. Render measured telemetry with source/age and unavailable states. Coordinate the display and offline test with R1.
8. Add P1/P2 controls only after their real contracts/backends exist and P0 passes. Live Scope is labeled simulated; explanation UI presents evidence/limitations rather than claiming validated model reasoning.

## UI and performance guardrails

- Browser requests only the local API origin. No remote fonts, analytics, model calls, automatic cloud fallback, or external content in the runtime.
- A missing score is not zero. Unanalyzed cells are visibly distinct; class confidence is not a diagnostic probability.
- Backend decides status and reporting readiness; show its explanation and coverage. Synthetic margin/case assignments are visible.
- Patient prognostic risk and tissue score never share an ambiguous label or combined progress bar.
- Stream buffers are bounded typed arrays/stores; changing tiles must not cause full React-tree updates. Do not copy entire slide arrays into component state.
- AbortController does not prevent every race: also check request/analysis identity before applying a result.
- Do not draw polygons with stale transforms or approximate millimeter/micrometer conversions. Test x/y orientation and non-square spacing.
- Do not hide backend contract errors with casts, swallowed parsing errors, dummy values, or frontend-only alternate schemas. Report the defect to R3 with the failing payload.
- Use accessible controls, visible focus, readable legends, and text as well as color for status.
- Raw unvalidated LLM deltas never look like a usable signed report. Human-modified measurements lose any automatic verified-value presentation unless separately validated.

## Demo ownership

Write a timed three-minute script with real analysis, visible coverage, one hotspot/nuclei view, a local draft, edit/review action, and measured telemetry. Distinguish live compute from cached results; label cache hits. Include realistic failure recovery and the offline startup steps supplied by R1.

Keep synthetic case metadata separate from real slide provenance. Own the reminder for the required ASUS feedback survey. Social-content submission is optional; do not publish or submit anything without explicit human authorization. R1 owns hardware return.

## Acceptance

- [ ] Real slide pans/zooms; overlays align at edges and several zoom levels using the shared geometry fixture.
- [ ] Pending/no-tissue/failed/zero-score states are distinct and correct.
- [ ] Pan, slide switch, reconnect, late fetches, and snapshot/delta races do not corrupt displayed analysis.
- [ ] Region evidence links and fly-to locations remain tied to the report's frozen analysis.
- [ ] Drafting/validated/template/human-edited/signed states are distinguishable; conflicts preserve user work.
- [ ] No external request occurs from a cold browser session offline; fonts/scripts remain available.
- [ ] Telemetry uses real values, units, source/age, and unavailable labels.
- [ ] End-to-end demo and backup recording use the tested release; survey reminder assigned.

## Handoff

Deliver the build command, e2e results, demo manifest, timed script, offline request audit, and a list of remaining backend/vision dependencies. Provide actual frame/interaction measurements instead of asserting 60 fps from implementation choice.
