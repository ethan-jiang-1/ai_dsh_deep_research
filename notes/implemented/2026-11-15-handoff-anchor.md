# 2026-11-15 · handoff 锚：0.3.4 tag 与 `_dist` 身份分裂收口

> 状态：implemented

## 决定

- 0.3.4 的 annotated tag（`ec652a30`，manual sha `f41a6b…`）保持不动；HEAD 上由 2026-11-14 重建的 0.3.4 `_dist`（manual sha `eed98…`）不再作为 handoff 制品。两者同版本号但不同 commit，旧 tag 不与新 `_dist` 配对。
- 发布 0.3.5：root 与 pack 两处 `version` 同改，`node scripts/dist/export-dist.mjs` 重出 tarball/manual/market/build-manifest，commit 后打 annotated `0.3.5`。handoff 的单位 = 「annotated tag = HEAD + 同 commit 的 `_dist` 三件（tarball/手册/build-manifest）」，不是版本号。
- `release-check` 增加 `--handoff`：tag 名/类型/commit、工作树干净、manual sha = tarball sha、build-manifest sha 同源、artifact freshness 全部配对。纯判据 = [`scripts/lib/release-anchor.mjs`](../../scripts/lib/release-anchor.mjs)，变异矩阵 = [`tests/checks/release-anchor.test.mjs`](../../tests/checks/release-anchor.test.mjs)；CLI 仍只读、不联网、不写盘。
- clean clone 补依赖：0.3.5 tag 的 clean clone 首跑 `pnpm test` 时 7 个 pack/contract 测试报 `Cannot find module 'js-yaml'`——[`tests/pack/preset-helpers.mjs`](../../tests/pack/preset-helpers.mjs) 从 `vendor/dsh` 的 `createRequire` 依赖 hoisting；root `devDependencies` 声明 `js-yaml@4.3.2`，clean clone 的 frozen install 可解析。
- `release-check` 增加 `--receiver`：clean clone 无 `lib/`，只查 tag=HEAD、manual/tarball/manifest 对齐，跳过源指纹；发送方仍用 `--handoff` 查 freshness。
- 移交/发布文档同步：[`docs/guides/64-release-versioning.md`](../../docs/guides/64-release-versioning.md) 的 handoff 锚与发布顺序、[`docs/guides/65-run-forms.md`](../../docs/guides/65-run-forms.md) §8、[`CONTRIBUTING.md`](../../CONTRIBUTING.md) §Handoff、[`scripts/README.md`](../../scripts/README.md)、[`docs/evaluation.md`](../../docs/evaluation.md)。
- [`docs/00-index.md`](../../docs/00-index.md) 的 “pack README 不复制用户步骤” 改为 “包级安装摘要与首装顺序（`readme-shape` + `install-copies` 校验）”：两道门禁本就要求这些步骤，原措辞把 owner 写反了。
- 版本副本仍由既有 `release-copies` 守（live 安装文档只写当前版本）；pack README 的版本字面量是当前版本信号，不是本次要删除的缺陷。本次把 live 文档的 0.3.4 全部升到 0.3.5。

## 输掉的方案

- **移动/重打 0.3.4**：它是 annotated tag，且可能已随本地 tarball 交付；guides/64 禁止移动已发布 tag。放弃。
- **保留 0.3.4 并附 HEAD 的 `_dist`**：即原事故；在 `git checkout 0.3.4` 上 manual sha（`f41a6b…`）与新 tarball（`eed98…`）对不上，`dist-tarball`/`dist-manual-fresh` 会红。放弃。
- **把 `--handoff` 做成常驻 L0 门禁**：发布后的开发树天然是「旧 tag + 新 HEAD」，每次都红；它属于发布/移交步骤，不是每轮 `verify`。放弃。
- **删掉 pack README 的版本字面量**：会让 `release-copies` 对该文件变空转，也丢掉“当前版本”信号；`install-copies` 与 `readme-shape` 仍要求安装步骤。放弃。
- **只改测试 helper 的 require 路径 / 往 vendor 树补 `node_modules`**：前者绕开“与 Loader 同源解析器”的意图，后者改只读 vendor 且不可复现；root `devDependencies` 声明 `js-yaml@4.3.2` 是唯一可复现的修法。
- **让 receiver 也跑 `--handoff`**：clean clone 没有 `lib/`，源指纹必然不匹配（假红）；`--receiver` 把“接收物对齐”和“发送方源指纹”分家。放弃让一个模式兼做两件事。

## 实际跑过的验证

- **红（真实事故形态）**：0.3.4 树上 `node scripts/dist/release-check.mjs --handoff` → FAIL `[handoff-tag-not-head]`（tag `ec652a30` vs HEAD `3bc5b715`）+ `[handoff-worktree-dirty]`；默认 `release-check` 仍 OK（HEAD 未打 tag）。这正是“两个绿各自绿、配对红”的形态。
- `node --test tests/checks/release-anchor.test.mjs` → 变异矩阵全绿。
- `node scripts/verify/verify.mjs` → 全绿（`md-links` 首跑因新测试未跟踪红，`git add` 后绿；这是跟踪面真实红，不是放水）。
- `pnpm test` → 全绿（含 `release-copies`、`install-copies`、`readme-manual-commands`、`asset-ledger`、`navigability-contract`；新测试已进 asset ledger）。
- `node scripts/dist/export-dist.mjs` → 全绿（tarball/manual/market/build-manifest 同版本，manual 0.3.5）。
- `node scripts/smoke/lifecycle.entry.mjs` → ALL PASS（干净 profile 装 tarball、10 行 dump、真启动 token URL、content/startup/defaults 真注册并返回 disposer、remove 后回落 base + web-app）。
- `node scripts/smoke/install-shape.entry.mjs` → ALL PASS（profile init → pack add → 团队层 add → 真启动无 `did not activate`）。
- `install-shape` 冷 registry：fresh pnpm store（8.5M）+ 团队层从 registry → ALL PASS。
- `node scripts/smoke/product-boot.entry.mjs` → GREEN（真 Web + 浏览器：首屏 Orca/工作区/起步卡/Lead preset，Host 登记工作区，session cwd = 工作区，无 pageerror）。
- `pnpm typecheck` → 0（pack 双半；vendor 构建产物在场）。
- clean clone（tag 0.3.5）：`git clone --branch 0.3.5` + local submodule + `pnpm install --frozen-lockfile` → `source dev/env.sh` → `pnpm verify` 全绿；首跑 `pnpm test` 红 7 个 `Cannot find module 'js-yaml'`，root 声明 `js-yaml@4.3.2` 后重跑 clean clone → `pnpm verify && pnpm test` 全绿。
- clean clone（最终 tag）用发送方 `_dist` 三件跑 `node scripts/dist/release-check.mjs --receiver` → OK（tag=HEAD、manual/tarball/manifest 对齐；无 `lib/` 不误报）。
- `client-load`：host load 23.39 两次 NOT-RUN；健康窗口（load 9.45）重跑 → ALL PASS（exit 0）。
- tag 0.3.5 后 `node scripts/dist/release-check.mjs --handoff` → OK（tag=HEAD、工作树干净、manual sha = tarball sha、artifact fresh）。
- **未跑**：full workspace cold-store `pnpm install`（clean clone 用 warm store；cold `install-shape` 已 O）、DSH rc.4 / Linux / Windows / Desktop / 实际 CI；记 U，不写成绿。
- 0.3.5 tag 在交付前重指向含本条 post-tag 证据的 commit（未 push；0.3.4 未动）。
