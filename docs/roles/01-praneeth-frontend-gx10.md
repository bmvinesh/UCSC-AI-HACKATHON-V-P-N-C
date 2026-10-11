# Dev 1: Praneeth — frontend/UX and GX10 operation

Own the React experience and direct GX10 operation with your installed Claude Code. Read root rules and Hour 1 contracts. Writable files: `web/**` except generated; `app/telemetry/**`; `scripts/gx10/**`; frontend/hardware tests. Chaandan owns root CI/release scripts; Nisheeth owns API; Vinesh owns model/executors.

## Deliver in order

1. Inventory GX10 and installed Qwen runtime; discover local endpoint/served ID/quantization without replacing a working installation. Supply settings to Nisheeth without committing secrets. Agree one hardware-test window at a time.
2. Create exported React/Tailwind UI scaffold, reviewed locally. Implement case list, baseline observations, empirical forecast, clearly separate mechanistic what-if comparison, assumptions/model-card panel and responsive chart.
3. Define/use `LocalApiEngine` and `BrowserEngine` against generated DTOs. Poll local jobs; perform ONNX inference in a worker with versioned transforms. No duplicated numerical logic in components.
4. Add local explanation progress/cached/template states; Pages chat unavailable label and deterministic current-result explanation. Never call localhost from Pages.
5. Integrate Vinesh's real CUDA/ONNX probe and Nisheeth's monolith on GX10. Capture cold/warm timings, actual memory/source attribution, same-workload CPU/GPU comparison and Qwen degradation.
6. Work with Chaandan on repository base path/hash routing and local build. Finish accessibility, readable provenance, cancel/retry/stale response handling, tested export and offline local startup.

## Guardrails

Do not edit shared schemas, backend state machines, trained model artifacts or biological parameters in the UI. Do not expose model runtime tokens or place them in `VITE_*`. Render measured facts and source labels; predicted or illustrative is never observed. Reject stale results from an earlier case/request. One job response does not authorize a dosing recommendation.

Hardware changes that require privileges follow host permissions. Separate checkouts do not imply independent GPUs: coordinate loads/restarts and benchmarks. Small training speedup is not assumed. Public browser inference has different capability and throughput from GX10.

## Acceptance

- [ ] Both adapters produce the same domain shape and tested prediction parity fixtures.
- [ ] Case/chart/assumptions and job progress remain responsive on slow work.
- [ ] Pages runs numerical model without API/chat requests or credentials.
- [ ] Local Qwen failure leaves modeling usable and fallback labeled.
- [ ] Cold local start, browser stale/cancel cases, actual hardware observations delivered.

Handoff: tested commit, frontend build/base path, exact local runtime settings without secrets, parity/UX results, and remaining model/API dependencies.
