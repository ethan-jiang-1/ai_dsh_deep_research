---
status: 已结
opened: 2026-11-23
---

# 实施计划：静态与语义防线补齐（checkJs · oxlint · TS TypeChecker 领域规则）

> 立卡：2026-11-23 ｜ 状态：已结（2026-11-23）— 结论：checkJs · oxlint · TS TypeChecker 领域防线落地且实抓隐患清零；审查：agent — reviewing-a-delivery 对抗自审无 blocker；可关闭：是 ｜ 类型：Task ｜ 结论倾向：现在做
> 归档：2026-11-23 ｜ 去向：implemented — [静态语义防线 Note](../../../notes/implemented/2026-11-23-static-semantic-guardrails.md)；业务验收：用户 `/goal` 授权实施与收尾归档（本地缺 native addon，真浏览器装配留 CI nightly）
> 研究依据：[预防试点后缺陷复盘调研](../../research/post-pilot-bug-prevention-and-discovery/README.md) · [实证基线](../../research/post-pilot-bug-prevention-and-discovery/2026-11-23-empirical-baseline-and-issue-plan.md) · [自研语义 Linter](../../research/post-pilot-bug-prevention-and-discovery/2026-11-23-custom-semantic-linters-and-probes.md)

**问题与期望结果：** 当前 `pnpm typecheck` 只覆盖 `packages/deep-research-pack`（114 个 `.ts/.tsx`），`checks/` 与 `tools/` 共 179 个 `.mjs` 脚本几乎裸奔（`smoke-identifiers` 只扫 `checks/smoke/*.mjs`）；TS 源码也缺少 React Hooks/async lint，且现有的“禁裸读”测试仅用字符串正则匹配变量名，挡不住改名或 `view.hasFile()` 绕过。期望把这三层静态防线补齐到日常 `verify`/`test`/`typecheck` 链路中，并在立防线时先抓红并修掉干跑已发现的真实隐患。

**当前情况：** 2026-11-23 只读干跑已确认 4 类可立即拦截的真实问题：
1. `checks/run-gates/protocol-audit.mjs` 第 210 行调用 `finalVersionsIn(dir)` 但顶部未 `import`（与 BUG-340 同文件同族崩溃）；
2. `packages/deep-research-pack/src/client/research-status/useStatusFeed.ts` 第 386–388 行 `anchors` 的 `useMemo` 依赖数组漏掉 `delivery`；
3. `useStatusFeed.ts` 第 337/347/354 行仍在直接调用 `view.hasFile('final.md')`，`useConfigFeed.ts` 第 163 行仍调用 `view.hasFile('question.md')`；
4. `useStatusFeed.ts` 第 299–302 行 `bodyIssue` 对 `'invalid'` 静默返回 `null`（缺 `never` 穷举），第 211 行 `new AbortController()` 未保存调用 `.abort()`，第 219–221 行重复三行 `setReviewDetail(null)`；全 `src/` 另有 15 处吞错 `catch`、19 处 `as any`/`as never`/`as unknown as`。

**未决问题：** `oxlint-tsgolint` 需确认根工作树是否新增 devDependency（或评估成本后先启用无 tsgolint 的 correctness + react-hooks 规则，把 `tsgolint` 作为可选增量）；`checkJs` 对 `TS2339`/`TS18048` 存量若过多，需核定先覆盖 `checks/lib/`、`checks/run-gates/`、`checks/verify/`、`tools/channel/` 还是全量 179 个文件一次性清理。

**下一步：** 用户授权/启动 `/goal` 后按 §实施顺序 先取各门禁红证，再修绿并落地门禁。

## 已知与未决

- **已证噪音边界**：`.mjs` `checkJs` 若开 `noImplicitAny: true` 会产生 2,145 条形参/变量隐式 `any` 噪音；配置必须设为 `noImplicitAny: false` + `strictNullChecks: true` + `allowImportingTsExtensions: true`。
- **已证性能边界**：`oxlint` 跑全 `src/`（114 文件）仅 ~35ms；不得在日常热路径引入耗时 >2s 的重工具，守住 `verify + test ≈ 15s` 纪律。
- **关联后续卡**：[L0 客户端测试与高密度寻虫底座](2026-11-23-l0-client-and-property-testing.md)（Issue 2）、[Hook 状态机与契约/防御模式内化](2026-11-23-state-machine-and-contract-architecture.md)（Issue 3）。

## 方案与取舍

| 候选 | 取舍 | 理由 |
|---|---|---|
| `tsconfig.scripts.json`（`allowJs` + `checkJs` + `strictNullChecks` + `noImplicitAny: false`）并入 `pnpm typecheck` | **选** | 零改写 `.mjs` 为 `.ts` 成本，直接拦截缺 import（如 `protocol-audit.mjs:210`）与空值解引用 |
| 对 `.mjs` 开 `noImplicitAny: true` | **不选** | 2,145 条噪音淹没真实缺陷，强制给 179 个脚本手写 JSDoc 性价比过低 |
| 复用 `vendor/dsh` `oxlint` 思路引入 `oxlint`（correctness + react-hooks + 评估 tsgolint） | **选** | Rust 速度 ~35ms，直接拦截 `useMemo`/`useEffect` 漏依赖、变量遮蔽、冗余表达式 |
| 基于 TS `TypeChecker` 的领域语义检查（进 `tests/checks/repo/` 或 `verify`） | **选** | 取代脆弱的 `viewIo.read(` 字符串正则，按真实类型封死 `RunView.read`/`hasFile`、`never` 穷举、未处理 `catch`、未配对 `AbortController` |
| 立即清理全仓所有 19 处 `as unknown as` | **不选** | `client/index.ts` 与 Cordis 注入适配层有少量宿主类型桥接，盲删会波及宿主契约；改为“存量显式登记 + 禁新增 + 业务层清理” |

## 判据形状

- **权威事实**：`.mjs` 类型诊断由 `tsconfig.scripts.json` + `tsc` 裁决；Client/Host 代码规范由 `.oxlintrc.json` 裁决；领域禁忌调用与穷举由 TS `TypeChecker` 静态扫描器裁决（白名单登记在扫描器配置内）。
- **读取方**：`pnpm typecheck`、`pnpm verify`、`pnpm test:checks`、pre-commit 钩子。
- **坏输入**：未导入符号 / 错属性 / 未守卫 `null`/`undefined` → `typecheck` 红；Hook 漏依赖 / 浮空语义违规 → `oxlint` 红；在白名单外调用 `RunView.hasFile`/`read`、封闭联合缺 `never` 穷举、吞错 `catch`、未 `abort` 的 `AbortController` → 语义检查红。
- **旧形态**：`smoke-identifiers.test.mjs` 仅覆盖 `checks/smoke/*.mjs` 的窄扫描被全量 `checkJs` 覆盖或升级取代；`final-tab-patterns` / `status-feed` 中的脆弱正则守卫由类型级检查接管主要能力（保留文本业务断言）。
- **反证**：在临时副本或还原旧缺陷上验证“新防线能稳定抓红”：1) 还原 `protocol-audit.mjs:210` 缺 import；2) 还原 `useStatusFeed.ts:388` 漏 `delivery`；3) 在任意 `src/client/` 文件改名别名后调用 `runView.hasFile()`；4) 在 `switch (artifactState)` 漏掉 `'invalid'`。

## 验收标准

| 行为 | 类 | 输入/状态 | 通过/失败信号与独立期望 | 负控/恢复 | 证据 owner | 人工判断 |
|---|---|---|---|---|---|---|
| 1. `.mjs` `checkJs` 纳管并修复实抓缺陷 | 确定性 | `checks/` + `tools/` 全量 `.mjs`（或已划定执行域） | `pnpm typecheck` 对 `.ts` + `.mjs` 均 exit 0；`protocol-audit.mjs:210` 等实抓隐患已修并有单测覆盖 `final/` 路径 | 临时去掉 `finalVersionsIn` 导入或注入空值解引用 → `typecheck` 必红 | `package.json` `typecheck`、`tsconfig.scripts.json`、`protocol-audit` 单测 | 无 |
| 2. `oxlint` 接入并修复实抓 Hook 缺陷 | 确定性 | `packages/deep-research-pack/src/` | lint 命令 exit 0（含 `react-hooks/exhaustive-deps` 等规则）；`useStatusFeed.ts:388` `delivery` 依赖已补全且有行为回归 | 临时移除 `delivery` 依赖或写 `no-shadow` → lint 必红；已有故意省略 ref 的点须有窄理由注释 | `.oxlintrc.json`、`verify`/`package.json` 门禁、`useStatusFeed` 测试 | 确认允许的窄豁免边界 |
| 3. TS `TypeChecker` 领域 Linter 与 `hasFile`/穷举收口 | 确定性 | `packages/deep-research-pack/src/` | `useStatusFeed.ts` 3 处 `hasFile('final.md')` 迁至 `readArtifact`+内容谓词、`bodyIssue` 补全 `'invalid'`+`never` 穷举、`AbortController` cleanup 调用 `.abort()`；语义扫描 exit 0 | 分别注入“别名调用 `RunView.hasFile`”“封闭联合漏分支”“空 `catch`”“未 `abort` 控制器”四类变异 → 扫描必红 | `tests/checks/repo/` 新/扩门禁测试、`artifact-read` 相关回归 | 无 |
| 4. 全仓回归与耗时预算 | 编排 | 完整工作树 | `pnpm verify`、`pnpm test`、`pnpm build` 全绿；新增静态检查总耗时不影响日常开发环（目标增量 ≤3s） | 若超预算或误报阻塞，记录实际耗时并调窄白名单，不静默关规则 | `checks/verify/verify.mjs`、`pnpm test`、`docs/evaluation.md` | 用户接受新增日常耗时与规则边界 |

## 实施顺序与停损边界

1. **P0 红证基线**：先落 `tsconfig.scripts.json` 草案、`.oxlintrc.json` 草案与 TS `TypeChecker` 扫描测试草案，跑出对当前工作树的真实红清单并分类存量（真 bug vs 合法适配）。
2. **P1 修真虫**：先修 `protocol-audit.mjs:210`、`useStatusFeed.ts`（`delivery` 依赖、`hasFile('final.md')`、`bodyIssue` `'invalid'`、`AbortController.abort()`、重复行）、`useConfigFeed.ts` `hasFile('question.md')`、以及 `checkJs` 扫出的高危 `TS2339`/`TS18047`/`TS18048`/`TS2365` 真缺陷。
3. **P2 落门禁与反证**：四类变异注入分别看红再还原；登记 [docs/evaluation.md](../../../docs/evaluation.md)、[checks/README.md](../../../checks/README.md)、[tests/AGENTS.md](../../../tests/AGENTS.md) 与 [docs/discipline-map.md](../../../docs/discipline-map.md)（若引入 `oxlint`）。
4. **停损**：若 `checks/` 非产品测试辅助脚本的 `TS2339` 存量改造量远超收益，按决策表先将强阻断收窄到 `checks/lib/`、`checks/run-gates/`、`checks/verify/`、`tools/channel/`，并在卡内记录。

## 关闭条件

全部 4 条验收标准有实际命令输出与反证证据，[notes/implemented](../../../notes/implemented/README.md) 落地对应 Note，用户完成业务验收，且本卡与交付物同变更归档至 `_archived/settled_issues/`。
