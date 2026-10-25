# Contributing

Thanks for helping improve the DSH Deep Research pack. This repository is both the
plugin source and the development environment used to verify it; the shipped package
is `packages/deep-research-pack`.

## Prerequisites

- Node.js `^22.19.0 || >=24.0.0` (the range is pinned in `package.json`)
- pnpm `11.7.0` (`corepack enable` is the simplest way to get it)
- Git, with submodule support

## Set up

```sh
git clone --recurse-submodules https://github.com/ethan-jiang-1/ai_dsh_deep_research.git
cd ai_dsh_deep_research
pnpm install
```

If you already cloned without submodules:

```sh
git submodule update --init
pnpm install
```

The pinned DSH source lives in `vendor/dsh` (read-only; do not edit it). It is the
mechanism baseline for this repository — start there when checking harness behavior.

## Verify your change

Keyless checks (no model key, no network calls):

```sh
pnpm verify
pnpm test
pnpm typecheck
```

`pnpm verify` is the structural gate suite; `pnpm test` is the keyless regression
suite. When you change a gate, also run:

```sh
node scripts/smoke/gates-smoke.mjs
```

For the full development loop — including which evidence tier applies to a change —
read [`docs/guides/60-dev-loop.md`](docs/guides/60-dev-loop.md). The test-selection
map is [`docs/project-map.md`](docs/project-map.md), and the acceptance contract is
[`docs/evaluation.md`](docs/evaluation.md).

## Working with a running research channel

```sh
source dev/env.sh          # isolates DSH_HOME to runtime/harness-home, installs hooks
node dev/run-driver.mjs up # boots or reuses the research channel and prints the URL
```

A real-model run needs `DEEPSEEK_API_KEY` in `runtime/harness-home/.credentials.yaml`
or the environment. Never commit credentials, session logs, run bundles, or build
outputs; the ignored paths are documented in [`.gitignore`](.gitignore).

## Repository rules that matter for review

- Read [`AGENTS.md`](AGENTS.md) first; it routes to design docs, decisions, and skills.
- Changes that carry a durable decision also need a Note under `notes/` (see
  [`notes/AGENTS.md`](notes/AGENTS.md)).
- New gates and contract tests need a failing proof before they turn green; see
  [`docs/guides/60-dev-loop.md`](docs/guides/60-dev-loop.md) and
  [`.agents/skills/writing-a-gate`](.agents/skills/writing-a-gate/SKILL.md).
- Keep the shipped package self-contained. Do not add repo-only links, local absolute
  paths, test fixtures, or build intermediates to `packages/deep-research-pack`.
- The pre-commit hook runs `pnpm verify` and `pnpm test`; enable it with
  `source dev/env.sh` (or set `core.hooksPath=dev/hooks`).

## Pull requests

Small, focused PRs are easiest to review. Include:

- what changed and why;
- which checks you ran (`pnpm verify`, `pnpm test`, and any smoke tier);
- any unverified or environment-dependent item, stated explicitly;
- a Note when the change records a durable design decision.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).

## Security

Please do not open a public issue for a vulnerability. See [`SECURITY.md`](SECURITY.md).
