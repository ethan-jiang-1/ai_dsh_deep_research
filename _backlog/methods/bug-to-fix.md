---
name: bug-to-fix
description: Fix one defect or a batch of defect cards in this DSH plugin pack from 排查中 to 已修 — triage the plugin surface and lowest real boundary, cluster a batch by root cause before fixing, reproduce at the boundary, confirm the mechanism and class, write the criterion and red test, land the fix with red/green/guard evidence, and close with the right disposition.
whenToUse: A deferred defect card exists (or a batch of them shares a root cause or a work slice) and the work is to diagnose and fix it in this DSH plugin pack. Not for in-scope fixes that need no card, and not a substitute for the state machine in bugs/README.
---

# Fix a DSH plugin defect: boundary first, evidence before state

**Input:** an active bug card (`_backlog/bugs/BUG-<NNN>-<slug>.md`) with symptoms, severity and current state.
**Output:** the fix in the tree, a `json fix-evidence` block on the card, a permanent guard at the same boundary, and the card archived as `已修` with the right disposition.

The card is the package; this method is the route. The state machine, card template and authorization boundaries are owned by [bugs/README](../bugs/README.md) and [_backlog/AGENTS](../AGENTS.md); the command and evidence owners are [guides/60](../../docs/guides/60-dev-loop.md), [guides/62](../../docs/guides/62-plugin-authoring.md) and [guides/67](../../docs/guides/67-test-strategy.md). This method adds the DSH-plugin triage and the evidence standard inside those states.

## 0. Why a DSH plugin bug is boundary-first

A DSH plugin is composed at several surfaces: pack source, generated overlay, profile mirror, installed tarball, browser client, assembled model request, run bundle, and the read-only vendor mechanism. The same defect can be green at one boundary and red at the next. The first question is not "what is the root cause?" but "which surface owns this, and what is the lowest real boundary that can see it?" A fix proved at a lower boundary than the bug is a false green.

The repo's acceptance axiom is also the bug-fix axiom: **能加载 ≠ 有行为证据 ≠ 能安装 ≠ 已获交付批准** ([evaluation §完成判断四分离](../../docs/evaluation.md)). A bug card must say which of these the fix proves, and which it does not.

## 1. Triage: surface, boundary, authorization

1. **Card or not.** Fix in the current authorization scope, or defer into a card. A deferred card is the package; an in-scope fix follows the dev loop and needs no card.
2. **Surface.** Find the first owner in the table below. If the symptom crosses surfaces, fix the one that owns the mechanism, not the one that displays it.
3. **Boundary.** Pick the lowest real boundary that can see the failure. Read the exact command from [guides/60 §2](../../docs/guides/60-dev-loop.md); the Lane column names the lane.
4. **DSH invariant.** Name the invariant at stake: fail-loud, model-visible ⟺ logged, registrations are effects, plugins not loop changes, host read-only. If none applies, say so.
5. **Authorization.** P1/P2 修理型修复 = self-authorized. P0, or a fix touching the entry chain, gates/acceptance contract, docs contract, pack public behavior or a recorded D (D-number) = `等人拍板`; record the user's release. Severity is a channel boundary, not a taste label.

| Symptom surface | First owner | Lowest real boundary | Lane | Typical false green |
|---|---|---|---|---|
| `src/lib/` pure predicate or codec | pack source + `faces.json` | ② behavior | focused `node --test` + L0 | testing the function, not its consumer |
| `src/client/` cockpit (slots, tabs, copy) | [design/40](../../docs/design/40-research-cockpit.md) + client source | ④ real mount + ⑤ rendering | `pnpm build` → `client-load.entry`; C layer for rendering | jsdom or a unit test as browser |
| plugin export / inject / registration | `src/index.ts`, `src/client/index.ts` | ① export + ③ registration + ④ real mount | export-shape / `client-effect-wrap` / `client-keys` + L1 | unit-testing `apply` without a mount |
| preset row, roster, skills | `presets/<role>.patch.yml` + skills | L1 real mount | `preset.e2e` + `preset-structure` / `role-list-sync` | reading YAML as proof |
| persona / skill / manual text | pack source + overlay + snapshot | ⑤ assembly + L4-lite | `render-overlay` → L1 → snapshot B → `l4-lite`; restart the run channel | changing the string and calling it behavior |
| bundle row / provider / fetch fallback | `cordis.patch.yml` + pack code | L1 + L2 | `overlay-fresh` / `row-deps` → L1 → `release.entry` | source-domain green as installed green |
| startup / defaults / doctor | `src/startup`, `src/defaults`, `scripts/doctor.mjs` | L2 install / first boot | `install-shape.entry` + `product-boot.entry` + `release.entry` | dev channel green as product green |
| content injection | `src/content` + `content/` | ⑤ assembly + L2 | `content-shape` + `install-shape.entry` / `product-boot.entry` + snapshot B (L4-lite when behavior is the claim) | injected text present but absent from the assembled request |
| install / release / tarball / profile | pack + `_dist` + profile | L2 real entry | `release.entry` / `lifecycle.entry` / `install-shape.entry` | dev overlay or profile mirror as install |
| run bundle / delivery gate | run tools + the bundle | real bundle + run gate | `run-accept` / `evidence-audit` / owning `run-gates/` | a fixture or unit test as a real run |
| vendor behavior / mechanism | `vendor/dsh/` (read-only) | vendor source + a seam probe | read the pinned source; record the seam; do not patch vendor | editing vendor or trusting the global install |

①–⑤ = the evidence staircase in [guides/62 §自写代码的证据阶梯](../../docs/guides/62-plugin-authoring.md): export shape → behavior/predicate → registration lifecycle → real mount → assembly.

The rows also map to the S0–S3 participation ladder in the same guide: S0 composition, S1 extension points, S2 capability seam, S3 vendor loop. S3 is never a local patch: record the seam and go upstream.

Record the triage on the card under `## 分诊与授权`: severity, surface/boundary, DSH invariant, touched surface, authorization and `批`.

## 2. Batch mode: cluster before fixing

Trigger: two or more active bug cards in the same work slice, or a batch handed by the user, or the same mechanism/surface recurs across cards.

### 2.1 Cluster before fixing

Build one table on the batch Note (or the existing issue card that owns the batch):

| Card | Symptom | Surface / boundary | Suspected mechanism | Shared root-cause candidate | Severity | Disposition |
|---|---|---|---|---|---|---|

Do not fix a card until the table is filled. Group by mechanism, not by symptom or file. Cross-surface batches (CI workflow, notes, readiness) often share one mechanism — a parser/judgment that models only one shape. Look for that shared mechanism before splitting by surface. Duplicates and not-a-bug cards get a disposition (`none` + link, or close/merge), not code.

### 2.2 Choose the fix unit

- **One cause, many cards** → one class fix at the shared owner; each card's reproduction becomes a case in the shared guard; one batch Note (one root cause); each card's `fix-evidence` points to the shared red/green command and names its case.
- **Several causes, one batch** → one fix slice per cause; share the evidence run and archival; one batch Note if the slices carry a shared decision, otherwise per-card evidence plus a batch index line.
- **Duplicate / not a bug** → merge or close with `none`/link; record why; no code.
- **Partial** → fix the confirmed subset, keep the rest active, and record the residual in the Note.

### 2.3 Order and evidence

Root cause first, cards second: fix the shared code path once, not card 1 then card 2 on the same path. Shared guard first (red on the class), then the fix. Each card still needs its own `json fix-evidence`: `changes` may be the shared paths; `red`/`green` are the shared command, and the output must name the card's case; `guard` is the shared guard path or the card's case. A shared green that does not exercise the card's case is not that card's evidence.

### 2.4 Traceability

When the batch shares a root cause or carries a decision, write one batch Note (`## 决定` = shared root cause/class, one fix, card→case map, residual; `## 输掉的方案` = per-card/symptom-order fixes; `## 实际跑过的验证` = per-card case table + shared command + guard + uncovered). Each fixed card gets `批：` with the cluster id, sibling links and Note link, and records `去向：implemented — <batch Note>`; `## 修复关联` links the Note; the fixed cards and the Note close in the same change. Duplicates/not-a-bug cards close with their link or `none`. A batch of independent mechanical fixes can use `none` and the existing issue/round record as the batch index; the default for a shared root cause is a Note.

### 2.5 Batch anti-patterns

- fixing cards one by one and re-touching the same code;
- one shared test without each card's case;
- copying one card's `fix-evidence` to the others;
- archiving the whole batch when only one root cause is fixed;
- a cluster Note that is only a card list, with no shared decision.

For each card in the cluster, use §3–§9.

## 3. Reproduce at the boundary

Build a tight red loop at the boundary chosen above: a command or capture that sees the user's symptom, is deterministic, fast enough to iterate, and runs unattended. Minimise it until every remaining element is load-bearing.

The boundary rules are not optional:

- **Source vs installed.** If the bug is in the product, reproduce with the L2 entry (`release.entry` / `install-shape.entry` / `product-boot.entry`); a dev overlay green is not the product.
- **Model-visible.** Reproduce in the assembled request: snapshot B and/or `l4-lite`, plus the real transcript when the claim is about model behavior. A unit test on the text proves only the string.
- **Client.** Reproduce in a real browser via `client-load.entry`; keyed literals, locale and scoped effects are part of the boundary.
- **Composition.** Reproduce by mounting the preset (`preset.e2e`), not by reading YAML.
- **Vendor.** Reproduce with a seam probe or a real request; the global install is not mechanism evidence.
- **Intermittent.** Use [reproducing-a-failure](../../.agents/skills/reproducing-a-failure/SKILL.md): staged loads, a transparent tee, a same-minute standalone contrast, an instrumented soak. Capture the scene before theorising.
- **Not reproducible.** Record `复现状态：未复现` plus the reading protocol and why the fix is still warranted (for example a code-path proof and a constructed test at the nearest seam). Do not claim a fix without a red-capable check. If no seam exists, record the missing seam as a finding.

Record `## 复现` as: status (稳定 / 间歇 / 未复现), boundary, command or capture, and the reading protocol for anything not replayable.

## 4. Diagnose the mechanism

Generate 3–5 falsifiable hypotheses before testing any of them; each states the prediction that would confirm or refute it. Change one variable at a time. Use a contrast or negative control, not a code-reading assertion. Tag instrumentation, then remove it.

For a DSH plugin, check the invariant as part of the mechanism:

- **fail-loud.** A missing/invalid config, row, registration or value must be red or explicit unknown, never a silent default. If the bug is a silent fail-open, the fix is fail-loud and the guard is a bad-input case.
- **model-visible ⟺ logged.** A model-visible fact must be in the assembled request and reconstructable from the session log after reload/resume/fork. The fix belongs in the vendor projection or the pack's content injection, not in a display-only copy. If it needs a new session event, the change is vendor/upstream; the pack only injects content and introduces existing capabilities.
- **registrations are effects.** A client slot/tab/page/active-title contribution must be a `scoped.effect`; a host tool/service registration goes through the plugin context (`apply(ctx)`), not a bare side effect. A missing or undisposed registration is the defect; the client guards are `client-effect-wrap` / `client-keys`.
- **plugins not loop changes.** If the fix would change the agent loop, stop: use S0/S1 composition or an upstream seam.
- **host read-only.** A client or read-only surface must not write host state; route the write to the owning host command or startup.

If the mechanism is in vendor, read the pinned source in `vendor/dsh/`, record the seam, and fix at the seam or upstream. Do not patch vendor; do not use the global install as authority.

Record `根因证据：<command / contrast / trace> — <what it proves>` and the invariant if one applies. Withdrawn hypotheses stay on the card with their withdrawal; the withdrawal is evidence.

## 5. Decide the class

Name the failure class before choosing the fix. The class is a fact about the mechanism, not a description of the symptom: the same fact written two ways, read by two readers, at two moments; a consumer set that forgot a member; a registration surface; an assembly section; an install form; a vendor seam.

Answer the template's required question: **同机制第 <N> 次**; from the 2nd occurrence write **类修（link the class card）** or **实例修 + why**. The repo's recurring families (readiness, method-library headings) are the cost of skipping this.

If the class is unclear, use [judgment-design](judgment-design.md) to make it decidable before writing a matrix; if the fix is instance-only, say what makes the class not worth a matrix now. The six guard shapes and the anti-patterns are in [class-level-guards](class-level-guards.md).

## 6. Write the fix approach and criterion

Write `## 修法`: the chosen approach, the layer that owns it (pack source / generated artifact / install form / vendor seam), why the alternatives were rejected, and any follow-up split. A generated artifact is never hand-edited: fix the pack and re-render; a profile mirror is rebuilt by `boot-run`, not patched.

Write `## 修复判据`: the reported case, the adjacent variant(s) that must also pass (or the class decision's reason an instance-only criterion is enough), and the negative/complementary case. A criterion that only names the reported string is a regression, not a class criterion. Choose the guard form at the same time: a permanent test/gate under `tests/` or `scripts/smoke/`, or `notMechanizable` with a trigger. A lower-boundary guard does not guard a higher-boundary bug.

## 7. Red, then green

Write the failing test/assertion before the fix, at the chosen boundary. Run it: the same command must exit non-zero for the right reason. If the red is at L1/L2/browser/model, the command is the lane's real entry; the `json fix-evidence` block accepts it, but if it is not replayable in the fast lane, `changes` must include the test/gate asset and the card records the reading protocol.

Then fix at the owning layer and run the same command: exit 0. Run the adjacent/negative controls. Do not weaken an assertion to make the fix pass; a test-only change is not a fix.

Record `## 修复落地` with one `json fix-evidence` block: `changes` (code + test/gate asset), `red` (command, exit ≠ 0, output), `green` (same command, exit 0), `guard` (path or `notMechanizable` + trigger). The exit code is the oracle. The guard must fail on the regression at the same boundary; if it cannot, say why and use the trigger.

## 8. Close honestly

- Run the applicable L0 lane plus the boundary lane; report what each proves and does not. Keep the four separations: load, behavior, install, approval.
- Review: mechanical checks are not skipped; semantic self-review is risk-based; P0/P1/protected surfaces are reviewed. Record a skip as a skip, never as verified.
- Business acceptance belongs to the user for P0, public behavior and user-facing results; severity, root cause, class and fix evidence belong to the agent.
- Choose the disposition with [issue-to-note](issue-to-note.md): mechanical/local = `none`; a persistent decision = `implemented` Note in the same change; deferred = trigger owner. A bug card is not a Note by default.
- Archive with status `已修`, `git mv` to the fixed pool, and the code/tests/guard in the same staged set. A recurrence is a new card that references the old one, never a reopened `已修`.

## 9. Stop conditions

Stop and record instead of improvising when:

- the symptom cannot be reproduced and no seam can test the mechanism;
- the root cause is a hypothesis with no confirming contrast;
- the fix would change the agent loop, patch vendor, or write host state from a read-only surface;
- the fix touches a protected surface and the user has not released it;
- the only available guard is at a lower boundary than the bug;
- the evidence is green but does not prove the symptom the user reported.

## Done

The card has the triage and the evidence at each flip; the fix is in the tree; the guard exists at the same boundary; the `json fix-evidence` block is valid; the card is archived with the right disposition. The method is complete when a reader can answer, from the card alone: which surface/boundary, what reproduces it, what confirmed the mechanism, which class and occurrence, what was fixed, what proves it, and what remains unproven.
