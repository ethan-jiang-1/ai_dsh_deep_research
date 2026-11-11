# 源码移交（M3）修到当前合同：HANDOFF + 归档根边界 + CI 消费者

> 状态：implemented

## 决定

`scripts/dist/export-handoff.mjs` 的产物合同 = `git archive` 的 tracked 源 + 包内 `HANDOFF.md`。
`HANDOFF.md` 给两条接收路径：origin 已有该 HEAD 时 `git clone --recurse-submodules`；只有 tar 时
`git init` → `git update-index --add --cacheinfo 160000,<submodule-sha>,vendor/dsh` →
`git submodule update --init --recursive`（不依赖 origin 上有该 HEAD）。
`REQUIRED_ENTRIES` 只列当前合同件（`.gitmodules`、`AGENTS.md`、`package.json`、`pnpm-lock.yaml`、
包 `package.json` / `AGENTS.md` / `cordis.patch.yml` / `content/manual.md`、`HANDOFF.md`）；
D40 已退役的 `workspace/seed.json` 不再出现。

产物边界改为归档根锚定：`runtime/` 与 `research-workspace/` 只禁 `sessions` / `drt_*` 形态，
`tests/fixtures` 里的同名样本与 `runtime` 的 tracked 骨架（README / `.gitkeep`）不再被误判为运行数据。
`handoff-smoke` 改为 import 同一组常量，断言 HANDOFF 命令与边界；registry 从 `dev-only` 升为
`ci/keyless`，`.github/workflows/ci.yml` 的 keyless job 真跑它。

## 输掉的方案

- **恢复 `workspace/seed.json`**：违反 D40 与 `content-shape`，并把已退役内容种子带回模型可见面。
- **只改 must 字面量、保留 `git submodule update --init`**：tar 里没有 `.git`，接收方第一步就失败。
- **只修脚本、不接消费者**：`handoff-smoke` 上次就是这样腐的（脚本与 smoke 互相确认旧契约，CI 从不执行）。
- **换成 `git bundle`**：能得 `.git`，但 M3 的既有产物与文档是 tar，接收方也未必有 git；
  HANDOFF 的两条路径同时覆盖有/无 git。

## 实际跑过的验证

- `node scripts/smoke/handoff-smoke.mjs` → `ALL PASS`（产物边界、边界判据两向自检、HANDOFF 可读、
  `git init` / `git fetch origin` / `git reset --hard` / `git submodule update --init --recursive` /
  `pnpm install --frozen-lockfile` 命令在场）。
- `node scripts/dist/export-handoff.mjs --out /tmp/dsh-handoff-check` → exit 0；产物含
  `.gitmodules` / `pnpm-lock.yaml` / `HANDOFF.md` 与包合同件。
- 本地复跑 HANDOFF 路径 B（不 fetch origin）：tar 解包 → `git init` → cacheinfo 写 gitlink →
  `git submodule update --init --recursive`（本地 file URL 覆盖 submodule，需 `protocol.file.allow=always`），
  `vendor/dsh` 到 `b830ec95`，`HANDOFF.md` 保留。
- `node scripts/dist/export-dist.mjs` → 全绿（build / pack / 手册 / 市场）。
- `node scripts/verify/verify.mjs` → 全绿。
- `pnpm test` → 全绿（含 navigability 的 lib 表消费列对账）。

## 环境状态

macOS；Node 22.23.1；pnpm 11.7.0；全局 DSH 0.2.1-rc.5。工作树改动未提交、未 push。
