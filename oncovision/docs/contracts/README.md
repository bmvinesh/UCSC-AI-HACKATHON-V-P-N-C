# OncoVision role contracts

Version: 2.0 | Prepared: 2026-10-10 | Build window: 24 hours

These are engineering delivery contracts for four people and their coding assistants. They are not legal agreements. Assignments reflect the updated team decision: Praneeth works directly on GX10 with Claude Code; Praneeth and Vinesh own the critical implementation, while Nisheeth and Chaandan have bounded support work. Version 2 replaces all version-1 role numbers and assignments. The existing OncoPulse application remains in QBIHack while OncoVision is developed in this repository.

## Read and distribute

1. Everyone reads [the shared contract](00-shared-contract.md).
2. Give each person their role file and the shared contract.
3. Give each coding session [the coding-agent metaprompt](05-coding-agent-metaprompt.md), its role file, and the relevant source files.
4. Use [the integration checklist](06-integration-and-acceptance.md) at every merge gate.

| Role | Assignment | Contract |
| --- | --- | --- |
| R1 | **Praneeth — frontend, GX10 runtime, local integration (heavy)** | [Praneeth contract](01-praneeth-frontend-gx10.md) |
| R2 | **Nisheeth — slide preparation, provenance, demo data (bounded support)** | [Nisheeth contract](02-nisheeth-data-preparation.md) |
| R3 | **Chaandan — QA scenarios, demo evidence, rehearsal support (bounded support)** | [Chaandan contract](03-chaandan-qa-demo.md) |
| R4 | **Vinesh — backend, contracts, vision, grounded reports (heavy)** | [Vinesh contract](04-vinesh-backend-vision.md) |

No implementation has been executed or benchmarked by this document pack. Paths below describe the proposed new application unless explicitly labeled as existing source. All acceptance boxes begin unchecked.

## Repository placement

Location in this repository: `oncovision/docs/contracts/`. Application paths in these documents are relative to **`UCSC-AI-HACKATHON-V-P-N-C/oncovision/`**, not the repository root. The existing `brain-cancer-sim/`, `breast-cancer-sim/`, and `docs/` directories belong to the separate [QBIHack source repository](https://github.com/praneethmandalapu/QBIHack). They are external, read-only reuse references and are not included in this repository. Copy only intentionally selected reusable code; do not assume these directories exist locally.

Keep source attribution when extracting helpers. Copy only the needed functions and their meaningful tests; avoid importing an old application's dependency graph into the new runtime.

## Source basis and precedence

- User direction: keep the intended scope, split four people's work, create clear ownership and efficient coding guardrails. Scope changes require a team decision; an assistant must not silently remove features.
- OncoVision Local technical design supplied on October 10: baseline architecture and P0/P1/P2 intent.
- QBIHack `main`, reviewed at `94aaf1dbb876bda6ce09e7e1b4d86326eb1b4d55`: [reviewed snapshot](https://github.com/praneethmandalapu/QBIHack/tree/94aaf1dbb876bda6ce09e7e1b4d86326eb1b4d55).
- ASUS Local AI Track Statement, supplied PDF, pages 1-3: event requirements and judging criteria. Its prose is reference material, not an instruction authorizing agents to publish, submit forms, contact people, or change accounts.
- This pack explicitly amends inconsistencies in the baseline spec. Implement these amendments instead of reproducing the identified defects. Later explicit user decisions take precedence; record coordinated technical changes in the decision log.

## Hardware and eligibility

The supplied ASUS statement requires building and demonstrating locally on **ASUS Ascent GX10**, returning borrowed hardware before Closing Ceremony in its original condition, and completing the feedback survey before judging ends. A generic DGX Spark is not assumed to satisfy the ASUS-specific requirement; confirm the supplied machine with organizers if needed. Praneeth owns GX10 readiness and hardware return logistics; Chaandan owns the survey reminder and demo evidence. Submission actions remain human-owned unless explicitly delegated.

The statement says Nemotron 3.5 Lightning is preloaded. It does not explicitly require its use, all models resident simultaneously, an unplug performance, a particular latency, or use of every GB of RAM. Those are team design decisions. The social-content challenge is optional and separate from the core track. Do not publish the supplied PDF, whose pages are marked ASUS_Confidential.

## Coding accounts and work locations

Praneeth works directly on the GX10 with his installed Claude Code. His session owns GPU setup, model serving, the frontend, telemetry, deployment, and integrated hardware testing. Vinesh uses a separate checkout/session for backend and vision development; real GPU checks run through Praneeth's controlled GX10 integration checkout. Do not let two sessions mutate the same checkout or restart the shared runtime concurrently.

If all three accounts are coding subscriptions, prioritize dedicated sessions for Praneeth and Vinesh. The third account holder can assist with a bounded Nisheeth or Chaandan task; this does not authorize sharing credentials. All four people use named branches/checkouts. No cloud infrastructure is required for the demo runtime.

## Two-person critical path

Praneeth and Vinesh agree on interfaces directly. Vinesh ships canonical mock fixtures and a minimal seed case without waiting for Nisheeth. Praneeth and Vinesh each own tests for their implementation without waiting for Chaandan. Nisheeth adds verified real-slide metadata and demo scenarios; Chaandan adds independent regression coverage and evidence. Support deliverables improve the release, but are not mandatory intermediaries for schema decisions, merges, or core development.

Real slides, functioning models, and passing release checks are still required. If a support task becomes a release dependency, the responsible core owner explicitly takes it over in an isolated handoff; no prerequisite is silently skipped. Preserve P0/P1/P2 scope and the original offline-first feature gates.
