# Contributing

Thanks for helping improve the DSH Deep Research pack. This repository is both the
plugin source and the development environment used to verify it; the shipped package
is `packages/deep-research-pack`.

## Install form vs development

The package is a DSH bundle installed into a user-created custom profile (`deep-research`). Create
the profile from the shipped web template, then install the current local tarball plus the
experimental team layer with `dsh plugin --profile deep-research add …` (commands =
[`_dist/安装手册.md`](_dist/安装手册.md)); the Plugins page becomes the primary install path after
npm publication. There is no custom installer and no launcher. Development
in this repository uses the isolated `deep-research` profile, `research-workspace/` and
`dev/run-driver.mjs` — do not mix the two command sets or data roots.

## Development charter

Three principles govern product and mechanism choices (user-set 2026-09-27):

1. **Follow DSH, do not invent.** The pinned `vendor/dsh` source is the mechanism authority
   (read-only). Prefer an existing DSH carrier; a self-built mechanism needs evidence that no
   carrier fits. The per-source ledger is [`docs/discipline-map.md`](docs/discipline-map.md).
2. **Solve autonomously, borrow from mature work.** Check how established DSH plugins solve a
   problem first (adoption is a signal); resolve what can be resolved without asking. The author's
   local reference repos are not required for public contributors.
3. **Layered review.** Mechanical gates, provenance audits, predicate probes, and adversarial
   self-review are done autonomously; only non-delegable judgments (human experience, direction
   trade-offs) go to the user at stage boundaries. Review is the last resort, not a routine step.

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

## From source to first run

A clean clone has no `_dist/*.tgz`; build the release artifact before installing it. The
first block is setup, the second creates the profile and starts the Web surface:

```sh
git clone --recurse-submodules https://github.com/ethan-jiang-1/ai_dsh_deep_research.git
cd ai_dsh_deep_research
pnpm install
bash dev/vendor-build.sh          # pack's tsc reads vendor lib/types
node scripts/dist/export-dist.mjs # writes _dist/tarball + manual + market
```

```sh
dsh --profile deep-research --from-default-profile web --dump-default-config
TGZ="_dist/dsh-deep-research-pack-$(node -p "require('./packages/deep-research-pack/package.json').version").tgz"
dsh plugin --profile deep-research add "file:$PWD/$TGZ"
dsh plugin --profile deep-research add "@deepseek-ai/dsh-experimental-agent-team-profile@$(dsh --version)"
dsh --profile deep-research
```

`--from-default-profile` is destructive: use it only for a new profile. The team-layer
version must equal `dsh --version`. The install/upgrade/uninstall contract is owned by
[`_dist/安装手册.md`](_dist/安装手册.md).

## Handoff

Hand off a clean clone at the release tag plus the `_dist` artifact — never a copy of this
working tree (`runtime/harness-home` holds credentials/sessions; `research-workspace/drt_*`
holds run data). The source handoff exporter writes only HEAD's tracked source and a
`HANDOFF.md` with receiver commands; its smoke proves the archive has no runtime/credentials/
run data:

```sh
node scripts/dist/export-handoff.mjs --out /tmp/handoff
node scripts/smoke/handoff.e2e.mjs
```

Attach `_dist/dsh-deep-research-pack-<version>.tgz` and the installation manual from the
release tag.

## Verify your change

Keyless checks (no model key, no network calls):

```sh
source dev/env.sh   # fresh clone：激活 pre-commit；之后幂等
pnpm verify
pnpm test
```

`pnpm test:vendor` 是 vendor 源码契约的补充检查（fresh clone 可跑，不计入最小集）。`pnpm typecheck` 需要 vendor 构建产物（`bash dev/vendor-build.sh`，CI deploy job 跑），不属于 fresh clone 的 keyless 最小集。

Install/first-screen checks (real install / browser; no model calls):

```sh
node scripts/smoke/install-shape.entry.mjs
node scripts/smoke/product-boot.entry.mjs
```

They need pnpm, the team-layer registry/cache, and Playwright chromium (the repo's `.pnpm` store);
missing prerequisites exit 2, not green.

`pnpm verify` is the structural gate suite; `pnpm test` is the keyless regression
suite. When you change a gate, also run:

```sh
node scripts/smoke/gates.e2e.mjs
```

For the full development loop — including which evidence tier applies to a change —
read [`docs/guides/60-dev-loop.md`](docs/guides/60-dev-loop.md). The test-selection
map is [`docs/project-map.md`](docs/project-map.md), and the acceptance contract is
[`docs/evaluation.md`](docs/evaluation.md).

## Working with a running research channel

```sh
# optional: isolate DSH_HOME in this shell and install git hooks (boot-run sources it too)
source dev/env.sh
node dev/run-driver.mjs up # boots or reuses the research channel and prints the URL
```

A real-model run needs `DEEPSEEK_API_KEY` in `runtime/harness-home/.credentials.yaml`
or the environment. Never commit credentials, session logs, run bundles, or build
outputs; the ignored paths are documented in [`.gitignore`](.gitignore).

## Repository rules that matter for review

- Read [`AGENTS.md`](AGENTS.md) first; it routes to design docs, decisions, and skills.
- The pack is configuration-first: presets, skills, bundle rows, content injection, startup rows,
  and a read-only doctor. The only code surfaces are the research-cockpit client half, the
  fetch-fallback provider, and the startup/content rows; keep new behavior inside those boundaries
  or open a decision first.
- Evaluation has five faces (L0 structure / L1 mount / L2 install / L3 domain / L4 delivery) that do
  not substitute for each other; see [`docs/evaluation.md`](docs/evaluation.md).
- The iteration unit is a vertical round: thinnest end-to-end path first, then widen. Multi-step
  work is expressed in a plan and todos, not in a batch of unrelated edits.
- Tests use `node:test` + `node:assert`; there is no test framework.
- Changes that carry a durable decision also need a Note under `notes/` (see
  [`notes/AGENTS.md`](notes/AGENTS.md)).
- New gates and contract tests need a failing proof before they turn green; see
  [`docs/guides/60-dev-loop.md`](docs/guides/60-dev-loop.md) and
  [`.agents/skills/writing-a-gate`](.agents/skills/writing-a-gate/SKILL.md).
- Keep the shipped package self-contained. Do not add repo-only links, local absolute
  paths, test fixtures, or build intermediates to `packages/deep-research-pack`.
- Follow the git boundary and cross-environment rules in
  [`docs/guides/63-git-boundary.md`](docs/guides/63-git-boundary.md): source/contracts/seeds
  are tracked; runtime state, caches, generated outputs, and machine-specific files are not.
- Release version/tag/npm order is owned by
  [`docs/guides/64-release-versioning.md`](docs/guides/64-release-versioning.md); run
  `pnpm release:check` before tagging or publishing.
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
