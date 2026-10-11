# OncoGrowth: breast cancer growth and paclitaxel response

A fresh implementation plan for a four-person, 24-36 hour hackathon. The previous histology workstation plan is retired. This repository currently contains **planning documents and interface artifacts, not a trained model or working application**.

**One cancer:** breast cancer. **One modeled drug:** paclitaxel. **Hardware:** ASUS Ascent GX10. **Local assistant:** the team's installed Qwen 3.8 27B. **Public delivery:** GitHub Pages with browser inference using an exported small growth/response model.

Start with [Master Implementation Plan](docs/MASTER_IMPLEMENTATION_PLAN.md), then [Hour 1 contracts](docs/CONTRACTS.md). Give agents [CLAUDE.md](CLAUDE.md) and their [role contract](docs/roles/README.md). Use [the judge-facing explanation](docs/JUDGE_TECHNICAL_OVERVIEW.md) and [demo runbook](docs/DEMO_RUNBOOK.md).

## Decisions

- Single repository and modular FastAPI monolith with React/Vite/Tailwind assets; no application microservices, Redis, Celery, Kubernetes, or hosted backend.
- SQLite stores local sessions/jobs/results. Heavy tasks execute through bounded local background executors; browser polls job state. Qwen is an existing loopback-only runtime dependency, not a new distributed application service.
- Training, GPU simulation and chat run on GX10. GitHub Pages serves static assets and browser model inference; it cannot execute Python or host Qwen.
- Primary data candidate: I-SPY2 early serial breast MRI and released measurements. Audit actual downloadable columns, drug exposure, exclusions, and usable patient counts before training.
- Treated-volume forecasts and illustrative untreated counterfactuals have different evidence. No claim of clinically validated drug efficacy, causal drug isolation, treatment recommendation, or calibrated uncertainty.
- No API/secret tokens in source, prompts, frontend bundles, artifacts, logs, or checked-in configuration. Model identifiers and generation/resource limits are configuration, not hardcoded assumptions.

## Plan files

| File | Purpose |
| --- | --- |
| [Master plan](docs/MASTER_IMPLEMENTATION_PLAN.md) | Phases, commitments, SRP architecture, release gates |
| [Data and model design](docs/DATA_AND_MODEL.md) | Cancer/drug choice, cohort audit, training, physics, validation |
| [Contracts](docs/CONTRACTS.md) | Exact boundaries, DTOs, routes, persistence, static/local behavior |
| [Git and agent workflow](docs/GIT_AND_AGENT_WORKFLOW.md) | Plan-before-code, clean trees, micro-commits, Rule of 3 |
| [Demo runbook](docs/DEMO_RUNBOOK.md) | Cache/breaker/fallback checks and rehearsals |
| [Judge overview](docs/JUDGE_TECHNICAL_OVERVIEW.md) | Short explanation, equations, hardware value, limitations |
| [Role index](docs/roles/README.md) | Four named owners and writable boundaries |
| [Machine-readable schema](contracts/domain.schema.json) | Draft-2020-12 domain definitions and normative bounds |
| [Illustrative fixtures](contracts/examples.json) | Labeled synthetic payloads for parallel build |
| [Source register](docs/SOURCES.md) | Primary references and claims requiring verification |

Implement the planned `web/`, `app/`, `modeling/`, `tests/`, and `scripts/` modules after the Hour 1 freeze. Existing QBIHack is an external reuse reference, not a dependency automatically installed here. No Pages deployment or model training has been performed by publishing this plan.
