---
topic: 实证基线测量、方案取舍决策表与三卡立项拆分方案（v2 挖透）
intent: 基于在当前代码树上的只读实测数据（checkJs、oxlint、test:coverage、AST 扫描），给出淘汰项、决策表和可拆分为 3 张独立 issue 的落地路线。
---

# 实证基线与立项拆分方案（v2 挖透）

> 本文在 2026-11-23 对当前工作树执行**只读实证干跑**，用真实测量数据校准前文候选清单的命中率、噪音与成本，形成可直接拆分为 3 张 `_backlog/issues/` 卡片的立项蓝图。

---

## 一、当前工作树只读实测基线（2026-11-23）

### 1. `tsc --checkJs --strictNullChecks` 干跑 `checks/` + `tools/`（179 个 `.mjs`）

- **真实命中（当场抓出 1 个未发现的实时崩溃 bug + 多处高危隐患）**：
  - `TS2304`（未声明标识符）4 处，其中 **[protocol-audit.mjs](../../../checks/run-gates/protocol-audit.mjs) 第 210 行调用 `finalVersionsIn(dir)` 但顶部未 `import`**——只要在无根 `final.md` 且存在 `final/` 目录的 bundle 上运行 `protocol-audit.mjs`，当场 `ReferenceError` 崩溃（与已归档的 BUG-340 出在同一文件、同一种缺口，因 [smoke-identifiers.test.mjs](../../../tests/checks/repo/smoke-identifiers.test.mjs) 只扫 `checks/smoke/*.mjs` 而逃逸）；
  - `TS2339`（属性不存在）：337 处；`TS18048`（可能为 `undefined`）：46 处（如 `verdict-audit-core.mjs:463`）；`TS18047`（可能为 `null`）：39 处（如 `node-gate-run-gates.mjs:92`）；`TS2532`（对象可能为 `undefined`）：6 处；`TS2365`（`never` 与 `string` 比较）：4 处（如 [protocol-audit-core.mjs](../../../checks/lib/gates/protocol-audit-core.mjs) 第 55 行、[node-gate-session-gates.mjs](../../../checks/lib/shared/node-gate-session-gates.mjs) 第 210 行）；
- **实测噪音与配置约束（关键发现）**：
  - 若开启 `noImplicitAny: true`，会一次性报出 **2,145 条隐式 `any` 形参/变量噪音**（`TS7006`: 1695、`TS7005`: 287、`TS7031`: 163、`TS7034`: 95），另加 `TS5097`（56 处 `.ts` 扩展名导入）；
  - **结论**：`.mjs` 纳管配置**必须设 `noImplicitAny: false`、`strictNullChecks: true`、`allowImportingTsExtensions: true`**（或先按高信号错误码门控），才能做到零 JSDoc 改造噪音、100% 抓真实错误。

### 2. `oxlint` 干跑 `packages/deep-research-pack/src/`（114 个 `.ts/.tsx`）

- **速度**：复用 `vendor/dsh/node_modules/.bin/oxlint`，全量 114 个文件仅 **22–35ms**；
- **真实命中（当场抓出 1 个隐蔽 React 运行时 bug）**：
  - 启用 `--react-plugin` 后，当场抓出 **[useStatusFeed.ts](../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 第 386–388 行 `anchors` 的 `useMemo` 依赖数组漏掉 `delivery`**——当 `receiptDelivery` 异步更新时 `anchors` 不会重算；
  - 还抓出 `client/index.ts:227` 变量遮蔽（`no-shadow`）、`useConfigFeed.ts:112` cleanup 中直接读取可变 ref `.current` 等问题；
- **环境边界**：根 `node_modules` 未安装 `oxlint-tsgolint`，所以 `vendor/dsh/.oxlintrc.json` 的 type-aware 规则（如 `no-floating-promises`）在根工作树未直接跑通，立项时须补 devDependency 或按无 tsgolint / 有 tsgolint 两档决定。

### 3. `pnpm test:coverage` 测量 L0 覆盖率盲区

- **高覆盖区**：`src/lib/`、`src/defaults/`、`src/fetch-fallback/` 纯函数普遍 **95–100%** 行覆盖、**80–100%** 分支覆盖；
- **最大盲区集中在 `src/client/`（与 BUG-351…384 高度重合）**：
  - [ResearchStatusTab.tsx](../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx)：分支覆盖仅 **8.00%**（函数 **41.67%**）；
  - [ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)：分支覆盖仅 **10.34%**（函数 **9.52%**）；
  - [DefaultsPanel.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx)：函数覆盖 **29.63%**；
  - `method-library/views.tsx`：分支覆盖 **38.46%**；
  - [useStatusFeed.ts](../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts)：行 **56.28%**（第 86–228 行扫描主体零覆盖）；
  - [useGraphFeed.ts](../../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts)：行 **63.18%**、函数 **33.33%**；
  - [useConfigFeed.ts](../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts)：行 **58.04%**；
  - `ResearchFinalTab.tsx`、`ResearchConfigTab.tsx`：在 [tests/INDEX.generated.md](../../../tests/INDEX.generated.md)（第 219–220 行）的测试覆盖列均为空（`—`），L0 零运行时测试。

### 4. AST 扫描 `packages/deep-research-pack/src/` 潜伏坏味道

- **`view.hasFile()` 残留 4 处**：`useStatusFeed.ts` 第 337、347、354 行（`final.md`）与 `useConfigFeed.ts` 第 163 行（`question.md`）；
- **吞错 `catch` 共 15 处**：空 `catch` 9 处 + 仅 `console.*` 且未转错误态/未 `throw` 6 处；
- **类型逃逸与未封装解析**：`as any`/`as never`/`as unknown as` 共 **19 处**、`!` 非空断言 **15 处**、直接调用 `JSON.parse` **11 处**。

---

## 二、备选方案与明确否决/延后项

| 候选做法 | 判定 | 理由与重议条件 |
|---|---|---|
| 在 `checks/`/`.mjs` 上直接开完整严格 `checkJs`（含 `noImplicitAny`） | **否决** | 实测爆出 2,145 条 `TS7006/7005/7031` 噪音，会迫使为 179 个脚本手写大量 JSDoc 类型注释，性价比极低；改为 `noImplicitAny: false` + `strictNullChecks: true` |
| 立即把所有 Hook（`useStatusFeed`/`useGraphFeed`/`useConfigFeed`）大改写为 Reducer | **先延后到第 3 张卡** | 在 L0 零运行时 Hook 测试的情况下先做大重构风险极高（违反“先有护栏再重构”）；先在第 2 张卡把 Hook+jsdom 测试和故障矩阵建起来，再安全抽干状态机 |
| 立即引入 StrykerJS / `knip` / `publint` / `jscpd` 全套外部重工具进日常 pre-commit | **否决进日常热路径** | 会拖慢 `pnpm verify` + `pnpm test`（≈15s 纪律）并增加依赖复杂度；Stryker 与重复扫描只作按需/周期性离线体检，先复用已有 TS Compiler API 与轻量 `oxlint` |
| 先修完所有 19 处类型逃逸与 15 处 catch | **不一次性全清** | `index.ts` 与 Cordis 注入适配层的少数 `as unknown as` 属宿主边界适配；先封新增、先清业务折叠与异步错误路径 |

---

## 三、综合决策表（ROI × 落地顺序）

| 能力/手段 | 目标缺陷簇 | 日常耗时增量 | 当前已实测抓到真问题？ | 归属卡 |
|---|---|---|---|---|
| `checkJs`（`strictNullChecks`）纳管 `checks/`+`tools/` | `.mjs` 缺 import / 空值解引用（340/327） | <2s（进 `typecheck`） | **是**（实抓 `protocol-audit.mjs:210` 未导入 `finalVersionsIn`） | **Issue 1** |
| `oxlint`（correctness + react-hooks + sonarjs/tsgolint 评估） | 浮空 Promise、Hook 漏依赖、死分支 | ~35ms（进 `verify`/脚本） | **是**（实抓 `useStatusFeed.ts:388` `useMemo` 漏 `delivery`） | **Issue 1** |
| TS `TypeChecker` 领域 Linter（禁 `hasFile`/裸 `view.read`/`never` 穷举/吞错 `catch`/未 abort） | 绕过安全封装、漏状态分支（356–384） | <1s（进 `test:checks`） | **是**（实抓 `useStatusFeed.ts` ×3 `hasFile` + `bodyIssue` 漏 `'invalid'`） | **Issue 1** |
| `jsdom` + `@testing-library/react` + `mock.timers` Hook/Tab L0 测试 | 客户端状态、竞态、轮询、定时器（344–384） | 1–3s（进 `test:spec`） | **是**（实测 StatusTab/GraphTab 分支覆盖仅 8–10%，FinalTab 0%） | **Issue 2** |
| 通用恶意 `RunSource` 故障注入矩阵 + `fast-check` PBT + `mdast` 差分 | 工件×故障遗漏、矛盾文案、正则解析差异 | 1–2s（进 `test:spec`） | 待 Issue 2 执行时收割全矩阵红例 | **Issue 2** |
| Hook 纯 Reducer 抽干 + `BriefInputs`/`deriveSteps` 判别联合收紧 + Skill↔Parser 双向扫描 + 本地化防御模式 | 架构级防再发（非法状态不可表示、契约同源） | 零增量 | 依赖 Issue 1/2 护栏就绪后安全推进 | **Issue 3** |

---

## 四、推荐的三张 Issue 立项拆解

### Issue 1：`static-guardrails` — 静态与语义防线补齐（`.mjs` `checkJs`、`oxlint` 与 TS `TypeChecker` 领域规则）

- **解决什么**：填补 `checks/`+`tools/` 179 个 `.mjs` 脚本零类型检查、客户端缺 React Hooks/async lint、以及字符串正则守卫易被绕过的缺口；顺带修掉干跑中已经抓到的真实隐患（`protocol-audit.mjs:210`、`useStatusFeed.ts:388`、4 处 `hasFile`、`bodyIssue` 漏 `'invalid'`）。
- **先红后绿验收**：`protocol-audit.mjs` 缺导入与 `useStatusFeed.ts` 漏依赖 / `hasFile` 残留必须先由新门禁稳定抓红，再修绿；`pnpm verify` + `pnpm test` + `pnpm typecheck` 全绿且新增耗时可控。

### Issue 2：`l0-client-and-property-testing` — 填补 L0 客户端测试盲区与高密度寻虫底座

- **解决什么**：把原先必须靠 Playwright 端到端才能发现的 Hook 竞态、状态撕裂、文件故障处理全部前移到 L0 毫秒级测试：接入 `jsdom` + `@testing-library/react` + `mock.timers` 覆盖 4 个研究页签与 3 个核心 Hook；落地**通用恶意 `RunSource` 故障注入矩阵**；在 `src/lib/` 引入 `fast-check` PBT 与 `mdast` 差分测试。
- **验收**：`ResearchStatusTab`/`ResearchFinalTab`/`ResearchGraphTab`/`ResearchConfigTab` 及 `use*Feed` 脱离“L0 零覆盖/个位数分支覆盖”；故障矩阵与 PBT 实跑稳定（如发现现存代码新 bug，转独立缺陷修复或同批收口）。

### Issue 3：`state-machine-and-contract-architecture` — Hook 状态机抽干、判别联合收紧与防御模式内化

- **解决什么**：在 Issue 1/2 护栏到位后，从根本数据结构上消除“非法状态可表示”和“异步多 `useState` 撕裂”：`useStatusFeed`/`useGraphFeed`/`useConfigFeed` 抽为纯 Reducer 状态机 + 薄 React 绑定；`BriefInputs`/`deriveSteps` 改为判别联合；`readArtifact` 接入 Schema 解码器；落地 Skill/模板↔Parser 双向扫描；按 [discipline-map.md](../../../docs/discipline-map.md) 第 189 行触发将 `vendor/dsh` 防御模式关键条款本地化。
- **验收**：原 Issue 1/2 全部测试与浏览器真入口回归零退化；`useStatusFeed` 等 Hook 行数与状态分支复杂度显著下降；新增状态轴漏接线由编译器或闭合审计直接报错。

---

## 五、什么会改变上述结论

1. 若 Issue 1 干跑清理 `strictNullChecks` 真实错误时发现超过半数 `TS2339`/`TS18048` 来自测试辅助脚本的刻意宽松用法，则只把 `checkJs` 强约束限定在 `checks/lib/`、`checks/run-gates/`、`checks/verify/` 与 `tools/channel/`（产品执行面），不强卡一次性脚本。
2. 若 Issue 2 的 Hook+jsdom 测试与恶意 `RunSource` 矩阵就已经暴露出 `useStatusFeed`/`useGraphFeed` 大量不可控的竞态耦合，则 Issue 3 的纯 Reducer 抽干提前升格为高优先级；反之若 Issue 1+2 后连续真实研究 run 的观察面缺陷已收敛，Issue 3 可拆窄为仅做 `BriefInputs` 类型收紧与防御清单本地化。
3. 若后续在模型真实 run 中再次爆发类似 BUG-341…343/350 的格式漂移，需单独重议 [pack-production-prevention](../../_archived/settled_issues/2026-11-20-pack-production-prevention.md) 延后的 **P（生产写入强制）** 分支，不再指望后验门补洞。
