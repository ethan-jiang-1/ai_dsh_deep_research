---
name: validation-evidence
description: Route an approved acceptance criterion to this repository's existing evidence owner without inventing a parallel test or evaluation system.
whenToUse: A plan already states what must be true and needs a credible evidence route before or during implementation. Not requirements discovery, test-framework design, or a new queue.
---

# Route acceptance evidence

**Input:** the acceptance matrix in a confirmed plan, including behavior class, pass/fail signal,
negative or complementary state, and any named human judgment. Before proceeding, read
[validation-design](validation-design.md). If the criterion itself is uncertain, return to the
requirements chain instead of choosing evidence to hide the gap.

## 1. Select the existing owner

Use the local owner contract: [development guide](../../docs/guides/60-dev-loop.md), [evaluation contract](../../docs/evaluation.md), relevant test/gate README, smoke entrypoint, or run-bundle contract. Route by the behavior actually being proven, not by the fact that the product uses an agent:

| Plan behavior class | Existing evidence route | Proves | Does not prove |
|---|---|---|---|
| Deterministic code or package contract | Focused `node --test` on the owning `tests/*.test.mjs`, then `pnpm test` | The exercised deterministic behavior and import/consumer contract | Browser installation, model quality, or user acceptance |
| Verification rule or repository documentation shape | `pnpm verify`; when a gate changes, inject its real regression through `node scripts/smoke/gates-smoke.mjs` | The registered static contract and its tested negative case | Semantic correctness of the requirement itself |
| Preset composition or model-visible behavior | `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs` for keyless mounting; use the task-specific snapshot/replay or model probe listed in [guides/60](../../docs/guides/60-dev-loop.md) when that evidence matches | Preset loading or the declared captured behavior | General model quality, arbitrary run behavior, or user value |
| Client rendering or installation shape | Relevant `node scripts/smoke/client-load-smoke.mjs` or `node scripts/smoke/release-smoke.mjs` through the true DSH entry | Browser client loading or pack installation contract | Model quality or product acceptance |
| Run-bundle state or evidence | Existing `scripts/run-gates/` command named in [guides/61](../../docs/guides/61-run-playbook.md), against a real bundle and its recorded baseline | The exact bundle predicate exercised | Future run behavior or quality outside that bundle |
| Prompt-arrival investigation | Read the actual runtime request/session transcript through the task-specific probe or recorded-session source; follow the evidence owner linked from the relevant card | What reached that request | A durable regression asset; a single successful probe is not a regression suite |
| Session or web replay | Relevant existing smoke and fixtures under [`scripts/smoke/`](../../scripts/README.md), only for the shapes they admit | The captured keyless session or web expectation | Unit/CLI expectations or an unimplemented session harness |

Do not create a general evidence bucket. Deterministic test fixtures stay with their owning test; run evidence stays with the run bundle and its consumer; generated outputs remain generated. If no evidence owner exists, name the needed reading protocol and the missing owner. Ask the relevant owner to decide whether to add a durable carrier.

## 1b. When no owner exists, say so and name the reading protocol

Some load-bearing behavior is only visible when the product actually runs (for example, a browser rendering, a real-model side effect, or a state transition). A screenshot or local path alone is not an evidence owner: the record must identify how a later reviewer can inspect the observation, the state and input that produced it, and the limitation of that evidence.

Before reporting such a row, take these three steps instead of inventing a bucket:

1. **Name the reading protocol, not only the artifact.** Write down the assertion object, input/state,
   and the existing command or file that lets a reviewer inspect it. For a run, link the bundle record
   and applicable run-gate or dashboard source; do not assume a generated image or a particular log
   generation is authoritative. The protocol is what a later reviewer can repeat; the screenshot is
   only one view of a single session.
2. **Record the row as blocked, with the gap named.** Evidence that cannot be re-obtained at the stated
   baseline is blocked, not pass ([validation-judgment](validation-judgment.md) §1). Do not let a
   one-time pass stand as the current result.
3. **If the observation class keeps recurring, admit a durable owner deliberately.** Do not promote
   one-off artifacts into a repository-wide evidence system by habit. Name the repeated need and let
   the relevant owner decide whether the existing carriers should be extended.

**Done:** every row either points at an existing owner, or is explicitly blocked with its reading
protocol named and its missing owner identified.

This playbook helps identify evidence before implementation and record what the selected owner actually proves. During implementation, use the current task route in [guides/60](../../docs/guides/60-dev-loop.md), not a command copied from an old plan. If existing checks do not cover a criterion, report that gap in the record that owns the work and let its authorized owner decide next steps. This method does not define note content or lifecycle.

## 2. Make the evidence complementary and attributable

For each matrix row, record the exact command or artifact, baseline/commit, input and state, and what
it can and cannot establish. A conditional claim needs both the triggering and complementary state.
A happy-path demo, keyword search, command exit code, or green unrelated suite is not acceptance.
For a new mechanical guard, the evidence includes a prove-it-red negative fixture before the guard is
reported as protective.

Keep independent evidence separate: deterministic tests, composition/render evidence, model evaluation,
and human judgment answer different questions. Do not merge them into one score or let an automatic
model score stand in for user value, taste, risk, compliance or authority.

**Done:** every plan row points to an existing owner, a runnable or explicitly human evidence action,
its limitation, and the complementary/negative case required to interpret the result.
