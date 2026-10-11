# OncoGrowth: technical explanation for judges

## What we are building

OncoGrowth explores how **breast tumor volume changes during an early paclitaxel treatment window** and lets users inspect a separate assumption-based growth/intervention simulation. It combines a small trained numerical model, an interpretable simulator and a local explanation assistant. This document describes the intended system; replace planned statements with verified release evidence before presenting.

Why breast: serial MRI/measurement resources provide a practical larger data starting point than our previous glioma demo. We audit the usable subset, rather than claim every available patient qualifies. Why paclitaxel: it appears in the early I-SPY2 treatment phase; we exclude experimental/concurrent regimens and later multi-drug periods when their exposure cannot support this scope. We are not identifying a causal single-drug effect from combination treatment.

## How the numerical model works

The empirical model takes verified baseline features and elapsed time and predicts the log change in functional tumor volume. Positive values indicate expansion; negative values indicate reduction. It is fitted and evaluated using patient-disjoint groups. All transforms are saved with the model; observed volumes are shown beside forecasts. We compare against simple baselines and report actual held-out errors and sample counts.

The mechanistic engine follows:

`density change = diffusion + logistic growth - intervention suppression`

The on/off comparison depends on disclosed growth/drug assumptions. Treated measurements alone cannot uniquely identify untreated proliferation and drug suppression. Therefore the no-intervention curve is an **illustrative what-if**, not a validated counterfactual. Functional tumor volume is an MRI-derived measurement, not direct tumor-cell count.

## What the GX10 contributes

The ASUS Ascent GX10 runs CUDA training/calibration and batched parameter/3D simulations locally. The installed Qwen 3.8 27B explains stored results without sending case data to a remote LLM. A single application coordinates jobs with SQLite-backed state and bounded executors. The UI stays responsive while heavy computations run asynchronously.

We measure actual GPU/CPU timings, workload shapes, memory behavior and Qwen latency. Small tabular training may not be faster on GPU; our hardware demonstration focuses on representative ensemble simulations and local language inference. We do not claim theoretical FLOPs or fill memory for show.

## What runs on GitHub Pages

Pages hosts the React UI, small exported ONNX growth model, preprocessing manifest, charts and allowed demo data. Browser WASM inference runs new inputs through the exported trained model, with parity checks against Python outputs. Training and CUDA simulation remain local; optional static scenarios carry cached provenance.

Qwen chat is a **local GX10 feature**. Pages shows deterministic explanations of current results and marks local chat unavailable. It does not contain Qwen weights, a secret token, a remote inference backend, or a connection to a visitor's localhost. GitHub Pages is static hosting; this split is how the public numerical demo remains usable without a server.

## Why the design is reliable

One repository, modular monolith, shared schemas and clear responsibilities. Data preparation, numerical modeling, persistence, jobs, UI and explanation adapters are independent modules. Heavy requests return job handles rather than hold HTTP open. Versioned cache keys avoid using results from the wrong model or case. Qwen timeout/invalid answers fall back to transparent templates; model failures offer labeled cached/illustrative examples.

The language model does not calculate tumor volume, tune intervention parameters or make medical recommendations. Server code and the numerical engine determine values; Qwen can reference only stored facts and approved material. It is an explanation layer that can fail independently.

## Responsible claims and next steps

This is an exploratory research/education prototype, not a clinical prescribing or diagnosis system. The main limitations are cohort eligibility, sparse observations, regimen confounding, model generalization, measurement differences and untreated-counterfactual identifiability. Sensitivity bands are not calibrated clinical uncertainty unless independent coverage validation demonstrates that.

Before judging, fill in: actual eligible patient count, train/validation/test counts, comparison metric, GPU workload and measured timings, numerical/browser parity, current artifact version, and whether any part remains synthetic. Future work is independent cohort validation, more accurately specified treatment exposure and prospective scientific evaluation.

## Suggested 30-second explanation

“We focus on one cancer, breast cancer, and one intervention, paclitaxel. A small numerical model learns early volume evolution from audited serial measurements, while a separate simulator makes growth and intervention assumptions visible. We train and simulate locally on the GX10, where Qwen explains the stored evidence. The exported model also runs in the browser on GitHub Pages. We show which outputs are observed, predicted or illustrative, and report validation rather than claim clinical efficacy.”
