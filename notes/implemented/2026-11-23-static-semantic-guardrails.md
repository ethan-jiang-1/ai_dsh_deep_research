> 状态：implemented

# 静态与语义防线补齐：checkJs · oxlint · TS TypeChecker 领域规则

> 2026-11-23 ｜ 决定载体：[tsconfig.scripts.json](../../tsconfig.scripts.json) · [.oxlintrc.json](../../.oxlintrc.json) · [pack-lint](../../checks/verify/gates/b-pack.mjs) · [scripts-typecheck](../../tests/checks/repo/scripts-typecheck.test.mjs) · [semantic-guardrails](../../tests/checks/repo/semantic-guardrails.test.mjs)

## 决定

在 L0 与 CI `keyless` 车道补齐三道低误报静态/语义防线，并同步修复干跑暴露的真实缺陷：

1. **脚本域 `.mjs` 全量 `checkJs` + `strictNullChecks`（`noImplicitAny: false`）**：
   - [tsconfig.scripts.json](../../tsconfig.scripts.json) 按停损边界纳管核心运行/门禁四域：`checks/lib/**/*.mjs`、`checks/run-gates/**/*.mjs`、`checks/verify/**/*.mjs`、`tools/channel/**/*.mjs`，并入根 `pnpm typecheck` 与 [scripts-typecheck.test.mjs](../../tests/checks/repo/scripts-typecheck.test.mjs)（`tsc.createProgram` 进程内检查，符合 `tests/` 零子进程分层约束）。
   - 修复实抓真实缺陷：
     - [protocol-audit.mjs](../../checks/run-gates/protocol-audit.mjs)：补回缺失的 `finalVersionsIn` 导入并将 `finalTextFromBundle` 下沉到 [final-version.mjs](../../checks/lib/shared/final-version.mjs) 配 `final/vN.md` 回归单测（修前遇仅有 `final/vN.md` 的 bundle 直接 `ReferenceError`）；
     - [web-banner.mjs](../../checks/lib/shared/web-banner.mjs)：消除无分号 `settle(...)` 紧接 `/** @type ... */ (child.stdout)` 引发的 ASI 双调用真实缺陷（早退 `onExit` 会被解析成对 `settle(...)` 返回值做函数调用而崩溃，且 `setEncoding('utf8')` 未在初始化期执行）；
     - 清零四域共 446 条 `TS2339`/`TS18047`/`TS18048`/`TS2365`/JSDoc 诊断至 **0**。
2. **`oxlint@1.81.0` 接入 `pack` 源码与 `pack-lint` 门禁**：
   - 根包安装 `oxlint@1.81.0`，配置 [.oxlintrc.json](../../.oxlintrc.json)（插件 `react` / `typescript` / `unicorn` / `oxc`；重点规则 `react-hooks/rules-of-hooks`、`react-hooks/exhaustive-deps`、`no-shadow`、`eqeqeq`、`correctness`；`ignorePatterns` 收窄为 `packages/*/lib/**` 以确保 `src/lib/**` 被扫）。
   - 新增 `pnpm lint`、verify 门禁 `pack-lint`（`node_modules` 缺席时退化为 `note`，不误红 `gates.e2e` 隔离副本）及 CI `keyless` 的 `Lint (oxlint)` 步。
   - **关于 `oxlint-tsgolint` 的 CI 权衡结论**：`.oxlintrc.json` 显式保持 `"typeAware": false` 不引入 `oxlint-tsgolint`。原因：`ci.yml` 的 `keyless` 作业不执行 `vendor-build.sh`，缺少 `vendor/dsh` 编译态 `.d.ts`（`lib/types`）；`tsgolint` 在 fresh clone 下会因宿主包类型未生成而报错或拖慢日常 ~15s 环；需要 TS `TypeChecker` 语义判断的规则改由下方第 3 项（在 `src/client`/`src/lib` 自持源码程序上跑）承担。
   - 修清 [useStatusFeed.ts](../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 等处 31 条 lint 报错：补齐 `anchors` `useMemo` 缺失的 `delivery` 依赖、修复无条件调用 `useSessions`（`rules-of-hooks`）、清理 `setReviewDetail(null)` 三连重复、消除变量遮蔽与跨文件 `exhaustive-deps` 缺口（全 `src/` 仅在跨 sibling-hook ref/setter 边界保留 2 条带原因的窄 `oxlint-disable-next-line` 注释）。
3. **基于 TS `TypeChecker` 的领域语义 Linter**：
   - 落盘 [semantic-guardrails.test.mjs](../../tests/checks/repo/semantic-guardrails.test.mjs)，强制 4 类类型级不变量：
     1. `RunView.read`/`hasFile` 禁区（仅 `packages/deep-research-pack/src/lib/run/artifact-read.ts` 可直接调用，经真实 `Symbol` 身份与别名追踪拦截改名/解构绕过）；
     2. `ArtifactState` / `SourceRead` / `ReviewVerdict` / `BindingTrust` 封闭联合在 `switch` / 映射表上的 `assertNever` 穷举；
     3. 禁止未带 `/* @silent-catch: <理由> */` 注释的空 `catch` 或仅 `console.*` `catch`；
     4. 非安全边界的 `AbortController` 不得零 `.abort()` / 零生命周期配对。
   - 迁移 [useStatusFeed.ts](../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 3 处 `view.hasFile('final.md')` 与 [useConfigFeed.ts](../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts) `view.hasFile('question.md')` 至 `readArtifact` + 正文谓词；为 `bodyIssue` / `reviewFail` / [ResearchStatusTab.tsx](../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) / [ResearchFinalTab.tsx](../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) 补齐 [artifactReadIssueOf / artifactBodyIssueOf / assertNever](../../packages/deep-research-pack/src/lib/run/artifact-read.ts)；为 `useStatusFeed.ts`、`ResearchFinalTab.tsx`、`useOperationQueue.ts` 补齐 `AbortController` 重叠取消与 unmount 清理。

## 判据形状

- **权威事实**：`.mjs` 类型诊断 = `tsconfig.scripts.json` + TS Compiler API；pack 规范 lint = `.oxlintrc.json` + `oxlint`；领域语义禁忌与穷举 = [semantic-guardrails.test.mjs](../../tests/checks/repo/semantic-guardrails.test.mjs) 的 TS `TypeChecker` 符号/类型表（白名单唯一落点）。
- **读取方**：`pnpm typecheck`、`pnpm lint`、`pnpm verify`（`pack-lint`）、`pnpm test`（`scripts-typecheck.test.mjs`、`semantic-guardrails.test.mjs`）、`tools/hooks/pre-commit`、`.github/workflows/ci.yml`。
- **坏输入**：未导入符号/空值解引用/ASI 错误 → `scripts-typecheck` + `pnpm typecheck` 红；Hook 漏依赖/遮蔽/violation → `pack-lint` + `pnpm lint` 红；白名单外 `RunView.hasFile/read`（含别名）/ 封闭联合缺分支 / 未标注 `catch` / 未 `abort` 的 `AbortController` → `semantic-guardrails` 红。
- **旧形态**：`smoke-identifiers.test.mjs` 只查 `checks/smoke/` 的 TS2304/2552 保留；`useStatusFeed` / `final-tab-patterns` 等散文/字符串正由类型检查接管结构约束，同时保留业务行为回归。
- **反证**：4 类真实基线红证 + 4 组虚拟 TypeChecker 源码变异子测 + `gates.e2e --gate=pack-lint` 配置缺失注入案例。

## 输掉的方案

- **对 `.mjs` 开启 `noImplicitAny: true`**：全量产生 2,145 条形参隐式 `any` 噪音，迫使非核心脚本补写海量 JSDoc 注释且掩盖真实缺陷；采用 `strictNullChecks: true + noImplicitAny: false` 专打真 bug。
- **一步扫全仓所有 `tests/` + 全部 `checks/smoke/*.mjs`**：停损先锁定高价值执行/门禁 4 域（`checks/lib|run-gates|verify` + `tools/channel`），避免无关测试辅助脚本存量改造淹没主防线；后续扩域只需增补 `tsconfig.scripts.json` `include`。
- **在 CI `keyless` 引入 `oxlint-tsgolint`**：`keyless` 不编 `vendor/dsh`，开启 `typeAware` 在 fresh clone 会因缺失 `lib/types` 失真或需拉长 CI 链路；`oxlint` 专注无类型快速语法/Hook 规则（~100–200ms），类型语义交给 `semantic-guardrails.test.mjs`。

## 实际跑过的验证

- **修复前基线红证**：
  - `./node_modules/.bin/tsc -p tsconfig.scripts.json --pretty false` → exit `2`，报 **446 条诊断**（含 `checks/run-gates/protocol-audit.mjs` 缺 `finalVersionsIn` 与 `checks/lib/shared/web-banner.mjs` ASI 缺陷）。
  - `./node_modules/.bin/oxlint packages/deep-research-pack/src` → exit `1`，报 **31 errors**（含 `useStatusFeed.ts` `useMemo` 漏 `delivery`、无条件调用 `useSessions`、`no-shadow` 等）。
  - `node --test tests/checks/repo/semantic-guardrails.test.mjs` → **FAIL**（实代码 **37 处违规**：`hasFile` 4 处、非穷举 3 处、无理由 `catch` 15 处、未配对 `AbortController` 15 处；4 个虚拟变异子测全 PASS）。
- **修复后验证**：
  - `pnpm build` → exit `0`（client 668.31 kB / host 14 files）+ `node tools/release/export-dist.mjs` → 全绿（418 files manifest）。
  - `pnpm lint` → **0 warnings / 0 errors**（114 files，125 rules，~79–215ms）。
  - `pnpm typecheck`（`tsc -b packages/deep-research-pack --pretty false && tsc -p tsconfig.scripts.json --pretty false`）→ exit `0`（`.mjs` 四域 **0 诊断**）。
  - `node --test tests/checks/repo/semantic-guardrails.test.mjs` → **2/2 PASS**（含 4 组虚拟变异自证）。
  - `node --import tsx/esm --test tests/run/gates/final-version.spec.mjs` → **PASS**（覆盖 `finalTextFromBundle` 对 `final/vN.md` 与 `final.md` 优先级）。
  - `node checks/smoke/gates.e2e.mjs --gate=pack-lint` → exit `0`（`pack-lint-missing-config` 注入红→绿）。
  - `pnpm test` → `test:spec` **1497/1497 PASS** + `test:checks` **269/269 PASS**（含 `scripts-typecheck.test.mjs` 与 `semantic-guardrails.test.mjs`）。
  - **未完成项（环境依赖）**：`source tools/env.sh && node --import tsx/esm checks/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home` → exit `1`（本机未编出 `node-addon-require-builtin/.../require_builtin.node`，触发 `web-banner.mjs:52` 干净报出启动退出；真浏览器装配待 `vendor-build` / CI `nightly` 执行）。
