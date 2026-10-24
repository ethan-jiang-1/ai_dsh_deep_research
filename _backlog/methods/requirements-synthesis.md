---
name: requirements-synthesis
description: Organize confirmed requirements and evidence, compare approaches, and record a supported conclusion and closure criteria on the issue.
whenToUse: An issue has enough information to compare approaches or prepare a conclusion; an authorized planning scope may need independently verifiable steps. Not implementation or scheduling.
---

# Organize the approach and conclusion

**Input:** the scoped card, confirmed answers and terms, evidence, prototype findings, alternatives,
constraints and unresolved questions. Follow the [user-confirmation and skill-loading rules](requirements-elicitation.md).
A missing fact or uncertain choice remains explicit.

## 1. Organize confirmed requirements

When available and permitted, read the complete `to-spec` skill and its resources for this synthesis step; do not substitute a summary. Use existing owner vocabulary and decisions, and override tracker, setup, template, and publication defaults: write back to the existing issue. Source provenance and skill-loading fallback are in [the method index](README.md#外部技能的来源与读取).

Synthesize the answers already obtained. Cover the user's workflow, intended result, relevant failure and
recovery cases, scope and exclusions. For model-facing work include authority per action, correction, and
behavior when the model is wrong, uncertain, refuses or hallucinates. Retain alternatives actually considered,
their costs and supporting evidence.

Use `codebase-design` only when module interfaces or test seams need analysis. Verify existing capabilities
and prefer established seams. If a new requirements gap appears, return to that specific question rather
than restarting the entire discussion.

**Done:** another session can reconstruct the intended result, scope and reasons from the card without the
conversation. For a do-it conclusion, prepare [acceptance criteria](validation-design.md) now, before comparing
implementation steps or completing the conclusion below. Deferral, rejection and an existing conclusion do
not require hypothetical implementation criteria. This prepares the handoff; it does not require downstream
implementation or acceptance to have happened.

## 2. Compare approaches and steps where needed

Compare genuine candidates against the confirmed requirements, costs and evidence. Prefer behavior and
contract descriptions over brittle line-by-line implementation recipes. Keep source paths and assertion
targets where they make a fact or acceptance criterion checkable.

For a sufficiently large authorized planning scope that genuinely needs independently verifiable steps, read the complete `to-tickets` skill and its resources; do not substitute a summary. Keep candidate steps on the current issue, not in ticket files. Each step names the result delivered, acceptance criteria, and real prerequisites. A small problem needs no invented breakdown. Keep a coarse decision map until the next question is precise, and work one human decision branch per session; a candidate breakdown is not an execution queue or additional authorization. Skill provenance and fallback are in [the method index](README.md#外部技能的来源与读取).

Present unresolved choices with evidence and a recommendation when supported. Human approval of a breakdown
confirms that choice; it does not grant implementation authority beyond the user's actual request.

**Done:** the chosen approach and necessary steps are supported, or a precise fact/confirmation gap is recorded.

## 3. Record the conclusion and prepare the handoff

Use the [backlog closure criteria](../README.md). Answer whether to do it, when, in what order and what is
excluded, only to the detail needed for the conclusion. Record one of:

- **Do it:** confirmed result, scope, approach, reasons and executable acceptance criteria.
- **Do it later:** reason, observable reconsideration condition and its location; future design may remain open.
- **Do not do it:** reason and applicable scope.
- **An existing conclusion answers it:** destination link and the question it settles.

If facts or user confirmation still block the conclusion, keep the issue active and name the exact gap and
next step. A card status or an upstream ready label never grants authority.

Use [the issue-to-note method](issue-to-note.md) to choose the durable carrier when the conclusion is confirmed. The card records one `去向` line and the target; [notes](../../notes/README.md) admits the carrier under its own rules. Recording a disposition is not note creation, implementation or acceptance. Do not maintain those rules here.

Persist the confirmed answers, evidence and unresolved questions before a session boundary. On resume,
reread the card and linked artifacts; ask the user only where reconstruction leaves a dependent choice uncertain.

**Finish:** the card has a supported conclusion ready for handoff, or a concrete unresolved question. The
card's closure follows the backlog rules, independently of downstream completion.
