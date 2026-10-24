---
name: issue-to-note
description: Decide the durable carrier for a confirmed issue or bug conclusion (none, rejected, proposed, implemented, deferred), record one 去向 line with the quality sign-off owner, and close it when its backlog conditions are met.
whenToUse: An issue or bug has a confirmed conclusion and needs a durable home, or is ready to close. Not for unresolved deliberation; not a mandate that every issue becomes a note.
---

# Issue or bug conclusion: choose the durable carrier

**Input:** a confirmed conclusion on a scoped issue, or a bug at `修复落地` / `已修`, with its evidence and, for `proposed` / `implemented`, its quality contract (`## 验收标准` for issues, `## 修复判据` for bugs) and the quality sign-off.
**Output:** one `去向：<value> — <target>` line on the card, the target artifact (or an explicit no-note reason), and the quality sign-off owner recorded.

The card is the package; do not duplicate its problem, evidence or alternatives here. This method only decides where the conclusion's rationale lives and records that decision.

## 1. Which mode?

- **Decision-only:** the conclusion itself is the deliverable (a choice, a rejection, a deferral, a review result). Close at conclusion.
- **Implementation-bound:** the conclusion authorizes a change. Keep the issue active until the change lands; at delivery, write the note in the same change and close.

A final decision whose implementation is not authorized yet stays active; it is not `implemented` until the change lands.

Before choosing `proposed` or `implemented`, the card must carry a testable quality contract: `## 验收标准` for issues ([acceptance design](validation-design.md)) or `## 修复判据` for bugs. If it is missing or untestable, fix that first; `implemented` is not available.

## 2. What crosses, and who owns the quality bar

Only the durable decision and its evidence cross into notes. The card keeps the problem, discussion, options and the quality contract; the note gets the chosen decision, the alternatives actually rejected, the verification actually run, and residual risk. Link the card; do not copy it.

Quality ownership does not move with the disposition:

- **Issue business quality** — intended result, scope, acceptance criteria, taste/value/risk — belongs to the user. The agent drafts and evidences; it does not self-accept.
- **Bug business quality** — priority/product acceptability and P0/public-behavior sign-off belong to the user; severity triage, root cause, fix selection and fix evidence belong to the agent (P0 never self-authorized, D24).
- **Note quality** — decision rationale, rejected alternatives, verification against the bar — belongs to the note author (agent), reviewed by the user at the stage boundary.
- `none` / `deferred` / `rejected`: the business disposition is the user's; the card records it. `proposed`: the reviewer/user approves the RFC. `implemented`: the user accepts the business result; the note carries the technical evidence.

### Issue → note

The note's `决定` is the issue's conclusion; `输掉的方案` comes from the card's actual alternatives; `实际跑过的验证` is the evidence against `## 验收标准`. The card remains the problem/discussion record.

### Bug → note

The note's `决定` is the fix approach, only when the fix carries a persistent decision; `实际跑过的验证` is the evidence against `## 修复判据`. Mechanical/local fixes are `none`; the bug card remains the defect record.

## 3. Choose the disposition

| Disposition | Use when | Write now | Close when |
|---|---|---|---|
| `none` | An existing doc, code path, test or decision already owns the rationale. | Nothing; link the carrier. | The link is on the card; the carrier's owner owns the quality bar. |
| `rejected` | The conclusion is "do not do" and the negative knowledge can prevent a tempting recurrence. | `notes/rejected/<date>-<topic>.md` | The note exists and is linked; the user owns the decision. |
| `proposed` | The conclusion needs explicit review before implementation. | `notes/proposed/<date>-<topic>.md` RFC | The RFC exists and is linked; the reviewer/user owns approval. |
| `implemented` | The conclusion is final and its rationale should persist, delivered as a code/doc change or as the decision itself. | `notes/implemented/<date>-<topic>.md` in the same change | The note exists, links the card, its verification cites or lists the quality contract, and the quality owner in §2 has accepted. |
| `deferred` | The conclusion is "do later"; no note now. | Only the trigger owner. | The trigger owner is recorded; the user owns the deferral. |

Mapping from the card's `结论倾向`: `现在做` → `proposed` when review is needed, otherwise `implemented` at delivery; `以后做` → `deferred`; `不做` → `rejected` when the reason has future value, otherwise `none`; `并入已有` → `none`; `未定` is not closeable.

`deferred` trigger owner, in order: `triggers.md` when the condition is observable in normal work; the owning note when the deferral is part of a delivered decision; otherwise write `none` on the card, keep the reason there, and do not claim the condition is tracked.

## 4. Record it

Add one line under the status line when the card closes:

```
> 去向：implemented — `notes/implemented/<date>-<topic>.md`；业务验收：用户
> 去向：none — `docs/guides/60-dev-loop.md`
> 去向：deferred — `_backlog/triggers.md`
```

The value is the closed set above; the target is a relative Markdown link or an explicit `none`. The line records the quality sign-off owner when it is not the default. For bugs, add `技术验收：agent`; for issues, the business acceptance owner is enough. The `去向` line is the handoff record; no separate request, inbox or acknowledgment is needed.

## 5. Close

Follow the [backlog closure rules](../README.md) and the issue/bug card rules. A `proposed` card closes with the RFC link; the RFC owns the next stage. An `implemented` card closes only when the note, the delivered decision/change and the business acceptance exist; the note and the card link each other. A `none` or `deferred` card closes with the existing carrier or trigger owner recorded.

When a target moves later (`proposed` → `implemented`, `implemented` → `archived`), the move updates inbound `去向` links in the same change; `md-links` is the guard.

## 6. Boundaries

- This is not an inbox, a queue, or an approval step.
- Unresolved deliberation stays on the issue; do not open a note to park it.
- Not every issue becomes a note; `none` is a legitimate and common outcome.
- Quality ownership does not transfer: `none` / `deferred` / `rejected` still need the user's business disposition; the note carries technical evidence, not business acceptance.
- Bugs: apply the table at `修复落地` / `已修` and record the disposition in `修复关联`; mechanical or local fixes are `none`.
- Carrier admission rules are owned by [notes/AGENTS](../../notes/AGENTS.md); this method does not restate them.
