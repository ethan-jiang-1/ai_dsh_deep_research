# keyless 回归恢复 fresh-clone 契约；类型门归 deploy job

> 状态：implemented

## 决定

- **keyless 回归 = fresh clone 可跑**：`pnpm test` 不得依赖构建产物或开发机运行区。两条越界
  断言按“证据住到需要前置的那一层”归位：
  - client 模块表（`lib/client.js` 的 `@deepseek-ai` require ↔ `dsh.client.inject` ↔ peers）
    从 `tests/pack/package-contract.test.mjs` 迁入 `scripts/smoke/pack-smoke.mjs`——该冒烟本就
    要求 `lib/` 在位（缺席 exit 2），并已在 deploy job 的 `pnpm build` 之后执行。
  - `docs-consistency` 的工作区根实体断言改为常量契约（`method-library.md` / `drt_<slug>` /
    `archive/` / `_abandoned/` / `drafts/`），只对 tracked 的 `drafts/` 做存在性校验；不再
    `readdirSync(research-workspace)`（`drt_*`/`archive/` 是 gitignored 运行态，CI 只有 1 个实体）。
- **类型门归 deploy job**：`pnpm typecheck` 需要 vendor 构建产物（tsc 在 fresh clone 报 TS2307），
  keyless job 的契约是无构建。类型门移到 deploy job 的 `dev/vendor-build.sh` 之后执行——同一
  push/PR 触发，覆盖等价；keyless 不再装 vendor。
- **构建顺序与入口单一化**：CI 的 pack 构建统一走根 `pnpm build`（= `pnpm --filter
  dsh-deep-research-pack build`）；deploy/client-load 都先 `bash dev/vendor-build.sh` 再 build pack
  （client-load 原先 build 在 vendor 之前，必然 TS2307）。
- **vendor 构建自举依赖**：`dev/vendor-build.sh` 在 submodule 内缺 `node_modules/typescript` 时先
  `pnpm install --frozen-lockfile --ignore-scripts --pm-on-fail=ignore`。理由：CI 的根 install 不覆盖
  vendor 自己的 toolchain；`--ignore-scripts` 避开 vendor postinstall（lefthook 会改 submodule 的
  git config，在 submodule/worktree 布局下必败）且类型/构建面不需要它；`--pm-on-fail=ignore` 只跨
  vendor 自钉 pnpm 11.28 与本仓 11.7 的版本门（lockfile 9.0 兼容）。
- **`doc-paths` 不把构建产物当合同**：`packages/*/lib/` 是 gitignored 构建输出，fresh clone 不存在；
  文档描述它时放行（存在性由构建/pack-smoke 证明）。同轮修正 `terms.md` 的陈旧路径
  `packages/fs/tool-present` → `packages/deliverables/tool-present`（旧路径只是本机 node_modules
  残留，CI 因此红——本地全绿掩盖 fresh-clone 失败的另一实例）。
- **vendor 源码契约单列 `pnpm test:vendor`**：默认 `pnpm test` 用 client tsconfig（`paths: {}`），
  vendor 包解析到构建产物 `lib/`；两条契约（组合层 `bundle-composition`、设置 schema
  `config-volatile`）要 import vendor **源码**，在 fresh clone 上必然 `ERR_MODULE_NOT_FOUND`。
  处置：两条测试移入 `tests/vendor/*.vendor.mjs`（不在默认 glob），用根 `tsconfig.json` 的 vendor
  源映射跑 `pnpm test:vendor`——无 vendor 构建也可跑；`tests/AGENTS` 增 `vendor/` 域行。

## 输掉的方案

- **keyless job 里补 vendor 构建 + pack 构建**：让每次回归都付分钟级构建成本，且把“无构建也能跑”
  的契约悄悄删掉；类型门在 deploy 已覆盖同一事件。
- **产物缺席时 skip**：`skip` 在 CI 上仍是绿，违反“未跑 ≠ 通过”；且会让 fresh clone 的回归静默
  少一条断言。
- **继续扫本机 `research-workspace/` 并接受 CI 红**：把 keyless 回归绑到开发机现场，换机器/清理
  工作区即红——这正是 8 天 CI 全红的三个根因之一（run 41449963105）。
- **在 README/指南里写“测试需先 build”**：那只是把非 hermetic 变成文档债；CI 的 fresh clone 仍然红。

## 实际跑过的验证

- **红证**（CI run 41449963105）：keyless 三 ✖——`package-contract` 的 D40 产物断言与 client 模块表、
  `docs-consistency` 的“research-workspace 根实体过少（1）”；deploy ✖ 在 pack build 的 TS2307。
- **fresh worktree 红→绿**：`git worktree add` 出一个无 `lib/`、只有 tracked `drafts/` 的 HEAD 副本；
  修前两文件红，应用本变更后 `node --test tests/pack/package-contract.test.mjs
  tests/contracts/docs-consistency.test.mjs` 为 **13/13 绿**。
- 本仓 `pnpm test`：**1014/1014 绿**（少的一条即迁入 pack-smoke 的 client 模块表）；`pnpm verify` 全绿。
- 根 `pnpm build` 成功；`node scripts/smoke/pack-smoke.mjs` **ALL PASS**（含迁入的 client 模块表三条）。
- 文档同步：evaluation / guides/60 的 typecheck 执行面、scripts/README 的 pack-smoke 义务。
- **fresh-clone 回归三连红→绿**：run 41555173492 的 `doc-paths` 点名 `packages/deep-research-pack/lib/`
  与 `packages/fs/tool-present`；run 41556960178 的 keyless 再点名 `bundle-composition` 与
  `config-volatile` 的 vendor 构建依赖。修后本地 `pnpm test` 1011 + `pnpm test:vendor` 3 全绿，
  `pnpm verify` 全绿；两条测试在根 tsconfig 下实测通过（vendor 源解析，无 lib 依赖）。
- **vendor 构建面实测**：`pnpm --dir vendor/dsh install --frozen-lockfile --ignore-scripts
  --pm-on-fail=ignore` 成功（本机 store 热 3.9s）；`bash dev/vendor-build.sh` 的 tsc host / typert
  （30 件）已跑通，完整链路由脚本退出码与 CI 首跑收口。
