# R1 contract: platform, LLM serving, integration

Owner: **unassigned** | Reviewer partners: R2 for GPU behavior, R3 for API integration, R4 for rehearsal

Read [the shared contract](00-shared-contract.md) first. Its ownership exceptions and amendments are binding. Paths are relative to `UCSC-AI-HACKATHON-V-P-N-C/oncovision/`.

## Outcome

A reproducible local deployment on the supplied ASUS Ascent GX10, with all required models resident, useful measured telemetry, offline readiness, and one tested integration branch. You own the release process, not everyone else's implementation.

## You may touch

- `compose*.yaml`, `services/llm/**`, `.env.example`, `Makefile`, root `pyproject.toml`, `uv.lock`, `.github/workflows/**`.
- `scripts/{preflight,bench,soak,netwatch,prefetch_models}.py`, `scripts/package_offline*`.
- `services/api/src/onco_api/telemetry/**`, `tests/hardware/**`.
- `docs/{contracts,decisions,runbooks}/**`.

## You may not touch without a named handoff

- Vision/model algorithms, prompts, report semantics, database migrations, shared schemas, UI, or generated clients.
- R2's vision Dockerfile or R3's API Dockerfile. Request the concrete base-image/build change from the owner.
- The old OncoPulse applications, private credentials, or teammates' working trees.
- Host security settings, driver replacement, account permissions, or destructive cleanup outside the agreed setup without the required host/user authorization.

## Implementation sequence

1. Inventory supplied device, architecture, OS, driver/runtime, disk, model files, display/power, and access. Confirm GX10 rather than assuming every Spark-branded device satisfies this track.
2. Pin a known working local serving image and checkpoint revision. Record exact startup command and hashes. Confirm model list and a small completion on the device.
3. Establish a conservative baseline: one report at a time, bounded context, speculative decoding off. Tune memory from actual startup and concurrent-load results.
4. Work with R2 to run both vision models while LLM stays resident. Benchmark mixed inference, not just isolated throughput.
5. Implement Compose paths, startup ordering, mounts, health checks, offline flags, local-only publishing, and egress enforcement. Ensure test/mock profile can start without model containers or GPU dependencies.
6. Supply host telemetry through a directory mount. Integrate via R3's schema and lifecycle hooks. Preserve unavailable/stale values and document accounting limits.
7. Add preflight, readiness checks, warmup, cold-start runbook, soak, offline package, and release evidence. Health endpoint alone is not proof every component warmed up.
8. Enable speculative decoding or other tuning only with before/after evidence and a revertable configuration.

## Inputs and outputs

| Partner | Receive | Deliver |
| --- | --- | --- |
| R2 | Vision image, checkpoint requirements, warmup and benchmark entrypoints | GPU/runtime environment, resource envelope, mixed-load results |
| R3 | Telemetry schema, LLM request fixture, API image and readiness contract | Local LLM endpoint/model identity, sampler implementation, health/failure evidence |
| R4 | Display needs and demo sequence | Kiosk launch instructions, real telemetry, offline rehearsal environment |

Shared setting changes go through R3's Settings contract and your `.env.example` in the same integration change. Do not add environment variables only to Compose.

## Non-negotiable guardrails

- Do not report allocated VRAM from unsupported GPU APIs or hard-code capacity usage to impress judges.
- Allocator settings are tuning controls, not reliable complete process limits. Check host available memory, swap behavior, and container/process attribution without double-counting cache.
- Zero external sockets observed is evidence at a moment, not an enforcement policy. Test the policy itself.
- No API keys or tokens in committed files, logs, images, fixtures, or demo runtime. Gated weight access occurs during authorized preparation.
- Do not pass only a warm-cache unplug test. Verify assets and inference from a cold offline start.
- Prefer rollback of the integration commit over unreviewed edits inside another role's modules.

## Acceptance

- [ ] One command launches the documented configuration on GX10 using locally available assets.
- [ ] LLM + CONCH + CellViT load and run together; exact settings and measured peaks recorded.
- [ ] API readiness reflects warmup and failures; mocked development has a GPU-free startup path.
- [ ] Host link changes reach the container after atomic telemetry replacement.
- [ ] Public egress is blocked as intended while browser/API/model communication works.
- [ ] Telemetry labels source, units, sample age, and unsupported values honestly.
- [ ] Mixed-load soak and both offline rehearsals completed; failures and unmet targets recorded.
- [ ] Hardware return plan and feedback-survey owner confirmed.

## Handoff

Deliver `docs/runbooks/gx10.md`, the exact image/model manifest, benchmark results, startup/recovery commands, and the tested commit identifier. Never label a performance target achieved until the measurement is saved.
