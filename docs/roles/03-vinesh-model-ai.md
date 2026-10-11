# Dev 3: Vinesh — growth model, CUDA simulation, AI and async pipeline

Own the scientific engine and local inference/explanation execution. Writable files: `modeling/**`, `app/jobs/**`, `app/integrations/**`, `app/services/explanations.py`, `prompts/**`, prepared-data/modeling/job/explanation tests and public trained artifacts. Do not put raw archives/restricted weights into Git.

## Deliver in order

1. Audit actual I-SPY2 measurements/times/exposure; publish provenance and eligible-patient/exclusion counts. Provide minimal labeled fixtures at Hour 1 so API/UI build independently.
2. Split by patient before transforms, fit persistence/linear baselines and small CUDA model, save preprocessing/weights/seeds/splits/metrics. No future-treatment labels in input or test-driven feature tuning.
3. Implement the one-drug mechanistic engine with stable timestep/spacing and bounded batched CUDA workloads. Keep hypothetical untreated/drug-suppression assumptions separate from empirical treated evolution.
4. Export ONNX/manifest/model card; parity-test Python/ONNX and give Praneeth worker fixtures. Record supported feature order and horizon. Poor evaluation is reported honestly, not concealed by impressive 3D graphics.
5. Implement bounded background scheduler/process executor with Nisheeth's repository interface, progress, cancellation, error recovery, lease/claim semantics and restart behavior. No distributed broker.
6. Adapt the installed Qwen runtime using configurable loopback endpoint/served ID. Generate explanations from immutable stored facts and approved snippets, validate references, cache by versions and implement breaker/timeout/template fallback.
7. Measure representative GPU work through Praneeth's GX10 windows; no competing server restarts. Training, numerical inference and Qwen have resource budgets and coordinated concurrency.

## Guardrails

Do not rewrite UI/routes/root CI. Numerical core must not import DB/LLM/web frameworks. Qwen explains but cannot set volume, efficacy or prescriptions. A fitted treated rate cannot establish independent natural growth and drug kill; honor illustrative labels. Bands from parameter sweeps are sensitivity, not calibrated confidence. Synthetic training artifacts never carry real-cohort labels.

Model/scaler/version/provenance are one atomic artifact set. No hardcoded credentials, runtime aliases or token limits scattered in code. Avoid fork after CUDA initialization; use supported spawn/supervised lifecycle. Do not claim OOM recovery without demonstrating it.

## Acceptance

- [ ] Cohort audit and patient-leakage tests pass, or empirical objective clearly unmet.
- [ ] Held-out metrics and baseline comparison saved; no invented accuracy.
- [ ] Physics invariants/convergence and ONNX/browser parity pass.
- [ ] Background work bounded, cancel/restart safe, POST remains fast.
- [ ] Qwen missing/rate-limited/invalid output yields a labeled cached/template explanation without corrupting numerical results.

Handoff: actual source hashes/eligibility, artifact set, reproducible training and inference commands, benchmark probe, executor contract and limitations.
