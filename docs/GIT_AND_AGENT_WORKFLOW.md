# Git and AI development operating protocol

## Plan-before-code requirement

“Plan mode” here is a repository workflow, not a command that changes an assistant's platform mode. Every task begins with a short saved or visible plan: target owned files, pseudocode, contract version/sample payload, imports/dependencies, failure behavior, acceptance command, and expected diff size. Verify the actual source first. Agents may implement after the assigned human/task authorization; do not invent extra confirmation gates for routine work.

Read `CLAUDE.md`, role file, relevant DTOs, and only the modules needed for the current task. Avoid dumping the entire repository/data/history into each context window. End each task with a handoff containing commit, changed behavior, executed commands/results, remaining blocker and next step. Save a compact checkpoint before clearing context.

## Branches and clean-tree discipline

- Shared stable branch: `main`. Role branches: `dev/praneeth-ui-gx10`, `dev/nisheeth-api`, `dev/vinesh-model-pipeline`, `dev/chaandan-integration`. Feature branches use `feat/<owner>-<small-slice>` when needed.
- Separate worktrees/checkouts per person/session. Start each new functional task from `git status --porcelain` empty. Existing edits are reviewed and committed by their owner or the task pauses with a concrete report; never silently stash/reset someone else's work.
- Within one planned functional slice, edits naturally dirty the tree. This rule forbids starting the next slice or another agent generation onto unreviewed changes; it does not make iterative editing impossible.
- Immediately after each functional change and targeted checks, commit the owned diff with a concrete message. If intentionally incomplete, commit a clearly named WIP on the feature branch; do not merge unverified WIP. Never batch an entire day's generation into one commit.
- No secrets/raw archives/model weights in a broad `git add .`; stage reviewed named paths. No force pushes to shared branches. No unrequested reset/clean/history rewrites.
- Fetch current `main` before merge. Chaandan arbitrates integration; each core owner can keep working and self-test without awaiting global review. Honor repository protection and CI.

## Review and conflict resolution

Before merging: contract fixtures pass; no schema/client drift; owner boundary holds; job paths do not block; cache/fallback provenance correct; model split/units/treatment claims preserved; no credentials/data leaks; change has a meaningful acceptance result.

For a conflict, stop the merge, identify the path owner and intended behavior, and resolve with that owner's small patch. Never pick “ours/theirs” for generated types or model manifests blindly. Resolve normative schema first, then regenerate outputs; resolve lockfiles through the package tool and owner rather than manual concatenation. Freeze model/scaler/manifest as a matched artifact set.

Contract update: proposal -> consumer examples -> affected-owner acknowledgment -> version if incompatible -> generated output -> producer/consumer tests -> coordinated micro-commit. No local duplicate DTO or `as any` workaround.

## Rule of 3 for bugs

Track three materially different hypotheses/attempts, their exact patch and fresh error/test result. After attempt 3 fails: stop speculative changes; preserve the diff/evidence on a clean committed branch, save reproduction and logs without secrets, then the human clears/restarts the coding session (`/clear` when supported). Feed only role/rules/contracts, minimal failing source, reproduction command and fresh terminal logs. Reproduce before another patch. If external dependency/hardware is the blocker, assign it to the correct owner rather than repeatedly rewrite code.

## Reusable task metaprompt

```text
Implement this assigned functional slice of OncoGrowth.
Read CLAUDE.md, my role contract and the referenced schema before editing.
First state owned target files, minimal pseudocode, contract/sample, failure
states and verification commands. Check the working tree is clean.
Keep single-responsibility boundaries and the modular monolith. Use exact
units and provenance. Do not invent trained data, efficacy, uncertainty,
performance, model identity or hidden cloud dependencies. No token literals.
Implement only this slice, inspect the diff, run relevant checks, and commit
immediately. If another owner's change is required, prepare the exact
interface example/patch and continue independent work within my ownership.
After three failed bug attempts, preserve clean evidence and restart context.
Report the commit, observed results, limitations and next integration step.
Do not claim hardware tests, training, deployment or clinical validity that
were not actually verified. Publishing/messaging/account operations follow
explicit human authorization and tool permissions.
```
