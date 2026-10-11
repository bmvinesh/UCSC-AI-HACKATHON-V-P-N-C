# Named role contracts and file ownership

New growth-modeling scope supersedes all old OncoVision assignments. Paths below are repository-relative. Existing files named here are planning files; most application paths are to be created after contract freeze.

| Developer | Owner | Contract |
| --- | --- | --- |
| Dev 1 frontend/UX and on-device operation | Praneeth | [Praneeth](01-praneeth-frontend-gx10.md) |
| Dev 2 backend/persistence | Nisheeth | [Nisheeth](02-nisheeth-backend.md) |
| Dev 3 modeling/AI/async pipeline | Vinesh | [Vinesh](03-vinesh-model-ai.md) |
| Dev 4 integration/deployment/demo | Chaandan | [Chaandan](04-chaandan-integration-demo.md) |

## Ownership registry

- Praneeth: `web/**` except generated clients, `app/telemetry/**`, `scripts/gx10/**`, `tests/frontend/**`, `tests/hardware/**`.
- Nisheeth: `app/routes/**`, `app/persistence/**`, `app/services/scenarios.py`, `app/session.py`, `app/main.py`, `app/settings.py`, `tests/api/**`, `tests/persistence/**`.
- Vinesh: `modeling/**`, `app/jobs/**`, `app/integrations/**`, `app/services/explanations.py`, `prompts/**`, `data/processed/**`, `tests/modeling/**`, `tests/jobs/**`, `tests/explanations/**`; public model/scaler/card artifacts under `artifacts/public/**` except release index.
- Chaandan: `contracts/**`, `app/generated/**`, `web/src/generated/**`, `scripts/{generate_contracts,seed_demo,export_site,smoke}.*`, `.github/workflows/**`, root `pyproject.toml`/lockfiles/`Makefile`, root README/rules/ignore/environment template, `docs/**`, `tests/contracts/**`, `tests/e2e/**`, release artifact index.

Exceptions override directories. Praneeth owns frontend package/lockfile and Vite/build config; Chaandan owns Pages workflow/export script and asks Praneeth for any Vite changes. Nisheeth owns settings and API lifespan; Vinesh provides executor factory/adapters without independently changing startup. Praneeth owns hardware windows; Chaandan coordinates release windows. Schema semantic decisions are joint; Chaandan generates output only after owners agree. Vinesh owns modeling preprocessing content; static exporter must not edit scientific model artifacts.

Unlisted paths require a named assignment. Everyone may read/review all code. No edits to another owner's files/worktree without a small explicit handoff. Shared-boundary changes update producer, generated client, consumer and fixture together. Four separate checkouts/branches; no simultaneous GX10 runtime mutation. No credential sharing among coding accounts.
