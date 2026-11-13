---
name: judgment-design
description: Design a machine judgment that reads prose or free-form input — name the authoritative structured fact, define what happens on missing/invalid/contradictory input, and prove it with invariants instead of examples.
whenToUse: A change adds or modifies something a machine decides from input that can be phrased in more than one way — a gate, audit, delivery decision, status derivation, or artifact parser. Not for pure arithmetic or closed enums with a fixed writer.
---

# Design a judgment before implementing it

Use this when the thing you are adding makes a **decision** (pass/fail, delivered/not, which version,
which row) from input that a human or a model writes freely. If a keyword list, a regex over prose, or
"take the last / most likely one" is the plan, this method applies.

**Input:** a scoped change that introduces or modifies a judgment, with its issue/RFC.
**Output:** a filled `## 判据形状` section on the card/RFC, a mutation matrix, and a decision on the
legacy form. The implementation starts only after the four cells are answerable.

## 1. Fill four cells (and one proof)

Write these on the issue/RFC under `## 判据形状`:

| Cell | Question | Bad answer |
|---|---|---|
| **Authority** | Who writes this fact, and in what **structured** form (JSON field / session event / file field)? | "the model writes it in review.md" — prose is not a fact source |
| **Readers** | Which gate / UI / audit reads it, and what do they decide? | "everyone reads the markdown" — no single reader |
| **Bad inputs** | What happens when it is **missing / invalid / contradictory**? | "fall back to the most plausible" — that is the bug |
| **Legacy exit** | How does the old form leave? What is the deletion condition? | "keep the old path forever" — the old semantics never die |
| **Proof** | Where is the mutation matrix / invariant test? | "there is a test for this example" |

Rules:

- **Missing / invalid / contradictory → red or explicit unknown.** Never a plausible default.
- **One authority.** If two writers can produce the same fact, the design is not ready.
- Prose (review.md, question.md, leads.md) is a **human copy**; the judgment may cross-check it, but a
  disagreement is red, not a tie-break.
- A legacy path needs a **deletion condition**, not an epoch exemption forever.

## 2. Write the mutation matrix before the parser

The matrix is the test input space, not a list of examples. Cover at least:

- missing / empty / whitespace-only;
- malformed (wrong type, bad JSON, truncated);
- contradictory (two readings that cannot both be true);
- duplicate (same field twice, duplicate rows);
- legacy form (the old shape, with the old writer);
- encoding (full-width/half-width, U+3000, BOM, CRLF);
- concurrency / ordering (two writers, last-write vs first-write).

Assert **invariants**, not examples:

- "If two contradictory bare readings exist, the result is `null`/red — never one of them."
- "If a fact exists in structured form, free-form prose cannot override it."
- "A missing declaration is red; an unreadable declaration is red; only a valid one is a value."

A hand-written example test proves the example; it is regression, not a judgment test.

## 3. Review with three questions

1. Does it **pass by default** when it cannot tell? (If yes, stop.)
2. Does it read the **first-hand** fact or a second-hand copy?
3. Phrase it differently — is the result **red**, or a guess?

## 4. Two worked examples (this repo)

- **Terminal readiness**: old route = keyword tables over `review.md` + "last match wins" (BUG-046/074/
  141/150). New route = `review/readiness.json` written by the critic, gate/UI share
  `readinessOfSources`, prose is a cross-check, ambiguity and duplicate keys are red.
- **HITL2 approval**: old route = pending/decision word lists over `§Decisions` rows (BUG-075/140/149/
  156). New route = the session event chain (`user-question-reply` bound to the latest ask); the prose
  row is a human record, not the decision.

## 5. Done

- The four cells are on the card/RFC and the Note.
- The mutation matrix exists and passes; ambiguity cases are red.
- The legacy path has a deletion condition (or is already gone).
- A reviewer can answer the three questions from the artifacts, without reading the implementation.
