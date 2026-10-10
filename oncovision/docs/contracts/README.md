# OncoVision role contracts

Version: 1.0 | Prepared: 2026-10-10 | Build window: 24 hours

These are engineering delivery contracts for four people and their coding assistants. They are not legal agreements. Role numbers are assignments to fill in, not assumptions about team members' names. The existing OncoPulse application remains in QBIHack while OncoVision is developed in this repository.

## Read and distribute

1. Everyone reads [the shared contract](00-shared-contract.md).
2. Give each person their role file and the shared contract.
3. Give each coding session [the coding-agent metaprompt](05-coding-agent-metaprompt.md), its role file, and the relevant source files.
4. Use [the integration checklist](06-integration-and-acceptance.md) at every merge gate.

| Role | Assignment | Contract |
| --- | --- | --- |
| R1 | Platform, LLM serving, integration lead: **unassigned** | [R1 contract](01-platform-llm-integration.md) |
| R2 | Vision, slide data, artifact pipeline: **unassigned** | [R2 contract](02-vision-and-data.md) |
| R3 | Backend, shared interfaces, grounded reports: **unassigned** | [R3 contract](03-backend-contracts-reports.md) |
| R4 | Frontend, viewer, demo experience: **unassigned** | [R4 contract](04-frontend-viewer-demo.md) |

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

The supplied ASUS statement requires building and demonstrating locally on **ASUS Ascent GX10**, returning borrowed hardware before Closing Ceremony in its original condition, and completing the feedback survey before judging ends. A generic DGX Spark is not assumed to satisfy the ASUS-specific requirement; confirm the supplied machine with organizers if needed. R1 owns hardware readiness and return logistics; R4 owns the survey reminder and demo evidence. Submission actions remain human-owned unless explicitly delegated.

The statement says Nemotron 3.5 Lightning is preloaded. It does not explicitly require its use, all models resident simultaneously, an unplug performance, a particular latency, or use of every GB of RAM. Those are team design decisions. The social-content challenge is optional and separate from the core track. Do not publish the supplied PDF, whose pages are marked ASUS_Confidential.

## Three-account arrangement

Account type remains unconfirmed. If these are Claude coding accounts, use separate sessions for R2, R3, and R4; R1 coordinates hardware and integrates, pairing with an account holder when coding assistance is needed. Use distinct branches/worktrees. Do not share credentials or assume one person's account authorizes another person's access. If these are cloud infrastructure accounts, use them only for permitted development preparation; the demonstrated runtime has no cloud dependency. Account count must not dictate runtime topology.
