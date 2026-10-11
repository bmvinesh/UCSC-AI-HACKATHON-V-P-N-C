# Demo fail-safe and smoke runbook

## Before release lock

- [ ] Source table/license hashes, patient exclusions/split counts, actual drug exposure and eligible horizon recorded.
- [ ] Model/scaler/ONNX manifest match; checksum and parity tests pass; public artifact within Git/Pages limits.
- [ ] Three named demonstration cases (reduce/increase/limited data) selected from allowed development/demo data, not cherry-picked to tune locked test metrics; synthetic cases visibly marked.
- [ ] Hash-keyed cached scenario seeds for exact demo requests available; no approximation to unsupported inputs disguised as a cache hit.
- [ ] Stable template explanations from facts and approved source snippets available without Qwen.
- [ ] Installed Qwen endpoint/model discovered and a small loopback completion checked; no credentials logged/committed.
- [ ] GX10 warmup, local build, GPU timing and mixed-load memory measured; model work independent of Qwen.
- [ ] Pages base `/UCSC-AI-HACKATHON-V-P-N-C/`, hash routing, ONNX/scaler/WASM paths and reloads verified with empty cache. No localhost probing/chat call from Pages.
- [ ] Fresh Pages load requires connectivity to download assets; offline local build is separate. If adding a service worker, test the explicitly preloaded offline state and version invalidation; never promise first-load offline access to a public URL.

## Cache and circuit breaker contract

Scenario key includes canonical request, case content hash, model/scaler/schema version, solver config/dtype and seed. Explanation key includes result hash, normalized question, approved knowledge version, prompt version and exact Qwen model/runtime identity. Imported source cache is immutable versioned preparation data, not a live scrape.

Bound disk/RAM cache and retain last tested release seeds. Scientific-result cache entries are immutable by artifact version; explanations use configured TTL. Every result retains original source; cached outputs add cached provenance. Never serve another session's private results through an unscoped key.

Qwen breaker starts closed. Three retryable failures in a configurable window open it; cooldown then permits one half-open probe. Retry at most once with jitter for transport/429/503 when safe, respecting Retry-After and total deadline; no retry for invalid requests. Config defaults are startup settings, not copied magic constants. Breaker, timeout or invalid grounded output returns a labeled template; UI remains interactive.

Queue-full response is typed 429 with retry guidance; front end offers exact cached scenario or explicit illustrative fixture. A corrupt/missing empirical artifact disables that mode, shows reason and offers the separately labeled mechanistic/cached experience. Unexpected bugs remain logged/typed; they do not become invented successful results.

## Local smoke sequence

1. Launch the tested local build on GX10. Confirm capabilities/model version, real/fixture data provenance, healthy queue and no browser external requests.
2. Select the baseline case. Chart shows observed points and correct cm3 units; source/measurement window is visible.
3. Submit an in-domain paclitaxel forecast. POST returns a job immediately; state progresses queued->running->succeeded. Pan/controls remain responsive.
4. Inspect empirical forecast and uncertainty label. Change to mechanistic what-if; compare intervention on/off and show assumptions. No clinical dosing control or untreated causal claim.
5. Ask Qwen to explain the result; asynchronous job completes with linked stored facts. Measure actual latency rather than fabricate a number.
6. Stop/disable Qwen in a scheduled window; ask again. Template/cached Qwen explanation appears with its source label and modeling still works. Restore runtime.
7. Simulate queue busy, missing model, invalid input, out-of-domain horizon, canceled job and app restart; verify readable state and correct terminal behavior. No lost job silently marked success.
8. Disable internet and cold-start local assets. Repeat modeling and local explanation where runtime is available. Qwen and growth workers use only local resources.

## Pages smoke sequence

1. Open published URL in a clean browser and deep-link/hash route; assets resolve under repository path.
2. Load model once, run a new in-domain input in worker, compare expected parity fixture; demonstrate actual browser inference label.
3. Exercise mechanistic/example controls and responsive plots. Cached examples display cached/synthetic labels.
4. Chat panel says local GX10 feature; deterministic current-result explanation works. No HTTP request to an API, localhost, remote Qwen or token-bearing service occurs.
5. Block artifact load once: page remains usable with explicit cached fixture/error recovery. Retry successfully after restoring assets.

## Three-minute pitch

0:00-0:30 problem and one-cancer/one-drug scope. 0:30-1:15 observed data and early treated forecast. 1:15-1:50 assumption-based what-if comparison. 1:50-2:25 GX10 work and local Qwen explanation/fallback. 2:25-3:00 public browser inference, evidence/limitations, next validation step.

Record a tested local demonstration and retain the previous release artifacts. Complete the ASUS survey before judging ends and return hardware before Closing Ceremony. No public posting, form submission or confidential-PDF publication by an agent without explicit authorization.
