# Source register and assumptions

Reviewed 2026-10-10. References support architecture/data choices, not a claim that the planned prototype has trained or passed validation.

1. [TCIA I-SPY2 collection](https://www.cancerimagingarchive.net/collection/ispy2/): serial treatment MRI, cohort sizes, measurement/clinical resources, exposure phases and licensing. The 719-case and combined 985-case releases overlap. Final usable early paclitaxel subset and measurement columns require a file-level audit.
2. [I-SPY2 collection wiki](https://wiki.cancerimagingarchive.net/pages/viewpage.action?pageId=70230072): alternate collection description and data dictionaries. Do not mix versions or add overlapping patients.
3. [Derived DWI/DCE MRI data dictionary](https://www.cancerimagingarchive.net/wp-content/uploads/ACRIN-6698-ISPY2-DWI-and-DCE-MRI-Data-Descriptions_20210520.pdf): consult before interpreting derived FTV and measurement units/implementations. The linked dictionary was identified, not parsed; inspect the complete relevant entries before implementing conversion.
4. [Official Qwen3.8-27B model card](https://huggingface.co/Qwen/Qwen3.8-27B): model identity/local serving compatibility. User reports it installed; the actual installed quantization/runtime/served alias remains to be probed on GX10. No hardcoded model alias or downloaded replacement assumed.
5. [GitHub Pages creation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) and [limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits): static hosting and delivery constraints. Pages cannot run Python/SQLite/Qwen backend. Keep built site/model small and check current limits before release.
6. [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html), [deployment assets](https://onnxruntime.ai/docs/tutorials/web/deploy.html), [WebGPU guidance](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html): browser inference, matching WASM files, runtime capability choices. WASM is the baseline; no mandatory WebGPU/cross-origin-isolation dependency.
7. [Prior QBIHack implementation](https://github.com/praneethmandalapu/QBIHack/tree/94aaf1dbb876bda6ce09e7e1b4d86326eb1b4d55): possible visual design, array/metadata handling, checkpoint utilities and PDE tests. Old prognostic models are not growth models; old MRI arrays may be unavailable in Git.
8. Supplied ASUS Local AI Track Statement (private reference, not committed): requires building/demonstrating on ASUS Ascent GX10, feedback survey and hardware return. Social challenge optional. Do not publish the confidential PDF or treat its marketing claims as measured guarantees.

## Unverified at plan publication

No GX10 connection, installed-Qwen health check, downloaded-table inspection, cohort selection, training, model export, browser inference or Pages deployment was performed. Artifacts in `contracts/examples.json` are synthetic interface fixtures only. Real empirical deliverables require the execution/evidence gates in the master plan.
