# R3 contract: Chaandan — QA, rehearsal, demo evidence

Version 2.0 | Owner: **Chaandan** | Workload: **bounded support** | Core partners: Praneeth for UI/runtime, Vinesh for API/vision

Read [the shared contract](00-shared-contract.md). Your job is independent regression checks and a clear rehearsal/evidence package. Core engineers still own their own tests and fixes; your availability is not required for them to merge or integrate.

## Writable boundary

`tests/e2e/regression/**`, `tests/qa/**`, `fixtures/qa/**`, `docs/qa/**`, `docs/demo/rehearsal/**`, relative to `oncovision/`.

## Cannot touch

Production UI/API/model code, schemas, prompts, generated clients, global test/build/CI configuration, root lockfiles, Docker, or runtime settings. No direct GPU service restart or benchmark on GX10 without Praneeth's agreed window. Report defects to the relevant owner rather than changing their files or weakening assertions.

## Bounded tasks

1. Write a short manual regression matrix from the shared contract: launch, case navigation, slide pan/zoom, pending cells, nuclei, regions, report fallback/edit/review, reconnect, and offline operation.
2. Add browser regression scenarios using Praneeth's existing harness and Vinesh's canonical fixtures. Keep them independently runnable; do not introduce new infrastructure or duplicate schema definitions.
3. Exercise expected failure cases: worker unavailable, LLM error/template fallback, missing slide, stale data, interrupted connection, and invalid report state. Use supported test controls; do not damage real data to manufacture errors.
4. Record bugs with reproducible steps, expected versus actual behavior, commit, runtime mode, screenshot/log where appropriate, and owner. Report evidence of wrong measurements or false success immediately.
5. Prepare a timed three-minute rehearsal script and a checklist for visible synthetic mappings, partial coverage, cached/live computation, real telemetry, and template drafts.
6. During Praneeth's scheduled GX10 rehearsal, capture actual observations and help record the backup demo. Clearly distinguish your own measurement from a value shown by the application.
7. Own reminders for the required ASUS feedback survey and coordinate its completion with a human team member before judging ends. Public social-content submission is optional and requires explicit authorization.

## Non-blocking agreement

Start manual cases and documentation before the full app exists. Once Praneeth's mock UI is ready, test it without the GX10. Praneeth and Vinesh run core acceptance checks themselves; your additional suite and reports improve coverage. A real discovered defect is not optional merely because your role is support: the core owner must resolve or explicitly assess it before release.

## Guardrails

- Never change expected values to accept a broken result or label a skipped test passed.
- Keep real, mock, template, cached, and human-edited states distinct in evidence.
- Verify cold browser/offline behavior during a scheduled run; a loaded page is insufficient.
- Do not use a model-generated explanation as proof of scientific correctness.
- Avoid tests tied to incidental CSS/text when stable user behavior is available. Coordinate needed test hooks with Praneeth.
- No screenshots containing secrets, private data, or confidential event documents in published artifacts.

## Acceptance

- [ ] Regression matrix and a few reproducible high-value automated scenarios delivered.
- [ ] Bugs include evidence, owner, and current disposition; test runs identify their commit and mode.
- [ ] Demo script, offline rehearsal checklist, and backup-recording instructions usable by teammates.
- [ ] Observed failures, skipped tests, and unverified targets remain visible.
- [ ] Survey reminder and human completion owner recorded.

## Handoff

Deliver the small QA commit, exact commands/results, prioritized bug list, and rehearsal materials. You do not own implementation fixes, deployment, final scientific claims, or release approval.
