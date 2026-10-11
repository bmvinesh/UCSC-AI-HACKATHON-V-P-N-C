# Data and model design

## Cancer and intervention decision

Use **breast cancer** and **paclitaxel**. I-SPY2 is a relevant verified candidate for serial treatment MRI; the collection advertises 719 cases and a combined imaging cohort of 985 including ACRIN-6698, four treatment-time MRI exams, and a smaller released multi-feature measurement table. These populations overlap: do not add them together. The number meeting our one-drug/early-window requirements is **unknown until audit**. [TCIA collection](https://www.cancerimagingarchive.net/collection/ispy2/)

The older QBIHack breast module contains more precomputed patient risk records than its glioma module, but prognosis/genes are not longitudinal growth labels. Reuse helper patterns and selected compatible volume data, never rename a mortality classifier into a growth model. MRI simulation frames are simulated labels unless explicitly generated from an identified observation.

## Hour 2 cohort gate

Vinesh records source URL/version/license, actual file hashes/column dictionary, join keys, measurement derivation, timing units, treatment arms, exposure details, and exclusions. First use released measurement tables and metadata; download only a few representative MRI volumes. Never attempt to download the entire multi-terabyte archive during judging preparation.

Required for empirical training: baseline plus at least one early follow-up functional tumor volume (FTV), time interval, patient identifier, and verified paclitaxel exposure without an experimental agent or a concurrent confounding therapy in the chosen window. Missing treatment detail, unclear units, post-AC observation, incompatible measurement implementation, or duplicate patient aliases excludes that row from a paclitaxel-specific fit. Verify that “control” really satisfies this filter; HER2 therapies/other co-medications may matter. No dosing recommendation or schedule is inferred.

Use T0->T1 early-phase changes when timestamps and regimen support it. Later time points may follow other drugs and must not silently become single-drug labels. FTV is an imaging-derived enhancement measure, not a direct tumor-cell count; keep its identity and provenance. Never mix mask volume/FTV implementations without an audited transformation.

If the released workbook lacks usable volume/timing columns, inspect the data dictionary and derived imaging objects for a bounded subset. Record this extraction cost. Do not assume a download link establishes an immediately trainable dataset. If too few eligible independent patients remain for a credible split, retain the one-cancer/one-drug scope but label the fitted model exploratory or use synthetic simulation with the empirical-training objective unmet.

## Two explicitly different engines

### A. Empirical early-treatment volume forecast

Predict `log((V_t + epsilon)/(V_0 + epsilon))` from baseline log-FTV and elapsed early-window days using a small bounded MLP. Freeze exactly two float32 input features at Hour 1: `log_baseline_ftv_cm3`, `elapsed_days`, in that order. No biomarkers or subtype enter this initial model; adding them requires a coordinated versioned contract update, not a silent optional feature. `epsilon` and units live in the versioned preprocessing manifest, with sensitivity checked near zero.

Anchor the exported output at baseline using `log_ratio(t) = f(z(t)) - f(z(0))`, with both transforms and evaluations inside the fitted/exported graph. This guarantees the day-zero curve is the baseline rather than relying on a UI correction. Validate the same graph in training and ONNX.

The small model learns **observed early evolution during the selected treatment setting**, not untreated biological growth, drug causality, survival or clinical benefit. Positive log-ratio means expansion; negative means reduction. Use `V_t = exp(log_ratio)*(V_0+epsilon)-epsilon`, with declared handling of physically invalid outputs. No unsupported interpolation/extrapolation is silently accepted.

Input tensor: float32 `[batch, 2]`, named `features`. Output tensor: float32 `[batch, 1]`, the log volume ratio. `feature_count=2` and the fixed feature order are verified against the manifest; both Python and JS consume its fitted transforms. Hour 2 audits source-column mapping and fitted training statistics, not a different tensor interface. An observation beyond the declared training horizon is rejected or switched explicitly to illustrative simulation.

Train a persistence baseline (no volume change) and simple ridge/linear baseline before the MLP. Use grouped patient splits 70/15/15 only when group counts permit; otherwise predeclare grouped cross-validation and disclose its uncertainty. Split before scaling, imputation or feature selection. No follow-up volume or post-treatment response variable in baseline features. All intervals/images from a patient stay in one group; deduplicate overlapping collections.

Report held-out MAE in log-ratio, absolute FTV error in the verified unit, median error, cohort counts/exclusions and baseline comparison. Select model/hyperparameters on validation only; locked test patients never drive model selection or demo selection. If MLP loses to the baseline, publish the better honestly described fitted model or retain the MLP as exploratory; do not claim GPU use proves accuracy.

Use patient bootstraps/ensembles to explore prediction spread. “Sensitivity range” and “empirical interval” are different labels; claim calibrated coverage only after measuring it on independent data. Save split IDs, seeds, scaler, fitted weights, manifest, metrics and commit in the model card.

### B. Mechanistic growth/intervention sandbox

Use a bounded Fisher-KPP/logistic model with one drug term:

`du/dt = D * Laplacian(u) + r*u*(1-u) - k*s(t)*u`

`u` is simulated normalized density; `D` diffusion; `r` proliferation; `k` an assumption-based paclitaxel-associated suppression parameter; `s(t)` is the selected nonclinical on/off exposure window. With zero diffusion this reduces to a tractable volume/density trajectory. Drug inputs are an educational intervention flag/sensitivity parameter, not mg dosing or a prescribing interface.

Treated observations generally identify net behavior, not independent untreated `r` and drug `k`. Do not claim both were learned uniquely from treated points. The empirical model's primary role is the early treated forecast; untreated and altered-intervention curves are labeled **illustrative what-if simulation**, with assumptions shown separately. If r/k are fitted with fixed assumptions, save those assumptions and call it conditional calibration.

CUDA batched simulation on GX10 supports parameter ensembles and optional 3D fields from a compatible baseline. Correct anisotropic Laplacian divides each axis by its own spacing squared; the old mean-spacing shortcut is unsuitable for anisotropic data. Assert stability using `dt <= 1/(2*D*sum(1/h_i^2))` for explicit diffusion, plus checks for reaction/drug steps; do not silently clip unstable outputs and declare success. Test no-drug, zero rate/diffusion, tiny/zero volumes, positivity, finite values, and timestep convergence. Derived area/volume uses real spacing; idealized geometry is labeled illustrative.

## GX10 and browser export

Train and batch simulations with PyTorch CUDA on GX10. Measure CUDA work with synchronized timing/events, fixed seeds, dtype, batch/grid shape and warmup. Compare CPU/CUDA on the same workload and numerical tolerance; a small tabular fit may not outperform CPU and must be reported honestly. The useful workload is reproducible ensemble simulation plus local Qwen, not forced maximum RAM occupancy.

Export the small fitted forecast to ONNX plus a preprocessing/domain manifest and model card. Browser WASM performs inference in a Web Worker; no training or CUDA claim for the public website. Export physics presets/cached scenarios separately with provenance labels. Require Python-to-ONNX-to-browser prediction parity on held-out and edge-case fixtures within recorded tolerance. Bundle matching ONNX Runtime WASM assets locally, initialize the session once, and test single-thread operation on Pages.

## Data/publication boundaries

No raw MRI archive, restricted weights, credentials or sensitive patient information in Git/Pages. Publish only license-permitted de-identified demonstration records and small model artifacts with attribution. Synthetic examples stay labeled. A real trained artifact/model card is required to say “trained on patient data”; a generated fixture is never training evidence.
