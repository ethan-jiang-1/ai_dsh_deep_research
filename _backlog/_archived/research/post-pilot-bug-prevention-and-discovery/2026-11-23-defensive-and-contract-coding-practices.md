---
topic: 代码实践层面的缺陷预防：类型约束、契约编程、防御式与保守式设计
intent: 回答“根本上在代码实践里还能做什么提早预防 bug”，对照本仓真实代码与 vendor 防御模式给出可落地的工程实践清单。
---

# 代码实践还能做什么提早预防 Bug

> 核心原则：**把“容易写错的地方”变成“编译器/类型系统/统一抽象不让你写错”**，而不是继续叠长 G1–G27 这种靠人工或代码审查记忆的清单。本仓 11-20～23 爆出的 44 张真 bug 中，绝大多数都可以通过以下 7 项代码实践在写代码当场预防。

## 一、用类型系统让「非法状态不可表示」（Make Illegal States Unrepresentable）

大量观察面 bug（BUG-347, 357, 358–360, 363, 369, 381–384）并不是算法写错，而是**数据结构允许表达矛盾或含糊的状态**。

### 1. 消除「松散布尔袋子」输入接口

- **现状反例**：[brief-fold.ts](../../../../packages/deep-research-pack/src/lib/run/brief-fold.ts) 的 `BriefInputs` 有 17 个互相独立的可选字段（`bundleBound?`, `bundleReadFailure?`, `questionIssue?`, `reviewUnconfirmed?`, `reviewConflict?`, `hasQuestion?`, `questionLine?`, `reviewFail?`, `delivered?`）。调用方 [ResearchStatusTab.tsx](../../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) 必须手动把强状态（`reads`、`reviewVerdict`）拆平塞进去——一旦漏传一个字段或把 `reviewVerdict='conflict'` 与 `reviewFail=false` 同时传进去，类型系统完全不报错。
- **反例二**：[run-fold.ts](../../../../packages/deep-research-pack/src/lib/run/run-fold.ts) 的 `deriveSteps(inputs)` 把「某步完成」(`question: boolean, leads: boolean, ...`) 与「某步未知」(`unknown?: readonly string[]`) 拆成两个正交字段。调用方稍有疏忽（例如 BUG-381/382 把 `leads: false` 但忘了把 `'leads'` 放进 `unknown`），线性推断就会静默把早步涂成 `done`。
- **改进实践**：
  1. 用**判别联合（Discriminated Union）**直接建模互斥事实：`StepInput = { kind: 'done' } | { kind: 'pending' } | { kind: 'unknown'; reason: ... }`，从类型上禁止「既是 pending 又算 unknown」或「字符串键拼错」；
  2. `deriveBusinessBrief` 直接吃结构化领域状态（`BundleReadState` × `QuestionState` × `ReviewVerdict` × `DeliveryState`），而不是由 UI 组件拆平后的 17 个散字段；
  3. 同一实体的状态（例如 `StatusFeed` 里的 `face`、`reads`、`reviewVerdict`、`scanSettled`）合并成一个**原子判别状态机**（如 `{ phase: 'unbound' } | { phase: 'loading' } | { phase: 'bundle-error'; reason } | { phase: 'ready'; reads; face; review }`），彻底杜绝「`reads.bundle === 'unreadable'` 但 `face` 还是上一轮残留对象」的中间态撕裂。

### 2. 强制穷举检查（Exhaustiveness Checking via `assertNever`）

- **现状反例**：[useStatusFeed.ts](../../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 第 299–302 行用嵌套三元表达式处理 `ArtifactState`，结果对 `'invalid'` 静默滑落成 `null`；[ResearchStatusTab.tsx](../../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) 第 94–123 行用 7 组嵌套三元表达式映射错误文案。
- **改进实践**：
  - 引入全局唯一 `assertNever(value: never, msg?: string): never` 助手，配合 `switch (state)` 处理所有封闭枚举（`ArtifactState`、`ReviewVerdict`、`SourceRead`、`BindingTrust`）。
  - 以后只要给 `ArtifactState` 新增第 6 个状态（如 `'corrupted'`），**全仓所有未处理的 `switch` 会在 `tsc` 编译期直接报红**，不需要等到 E2E 才发现某页签把新状态折成了 `null`。

## 二、边界贯彻「Parse, Don't Validate」（解析即升格，下游零猜测）

BUG-341..343、350、362、376 等反复说明：把 `unknown` / `string` / `Record<string, unknown>` 往深处传递，然后靠下游各处写 `typeof x === 'string'` 或 `?. ?? fallback` 兜底，是 bug 的温床。

- **边界即解码器**：
  - **JSON 工件边界**（`review/readiness.json`、`delivered.json`、`claims.json`、`research-defaults.json`）：不要在 `readArtifact` 里只做 `JSON.parse` 然后返回 `json: unknown`（现状 [artifact-read.ts](../../../../packages/deep-research-pack/src/lib/run/artifact-read.ts) 第 140 行），让每个消费方自己猜字段。应当让 `readArtifact` 支持**传入 Schema 解码器**（或分类型解码器 `readTypedArtifact(view, 'delivered.json', decodeReceipt)`），在边界一次性返回 `{ state: 'ok', value: DeliveredReceipt }` 或 `{ state: 'invalid', issues }`。
  - **CLI 与环境边界**（`checks/` 与 `tools/` 共 180 个 `.mjs` 文件）：效仿 BUG-333..336 后收口的 [port.mjs](../../../../checks/lib/shared/port.mjs) `parsePort`，所有 CLI 参数、环境变量、JSON 配置文件在入口前 20 行完成严格解析与值域校验；解析失败直接 `exit 2` 并点名参数（Fail-Loud），下游函数不再接收未校验原始字符串。
  - **文档/Markdown 边界**：减少手写行正则（如多处手写 `split('\n')`、加粗剥离、frontmatter 切割），对复杂 Markdown 块统一使用标准 AST 解析器（`vendor/dsh` 已引入 `mdast-util-from-markdown`）或在单一权威 codec 中解码成强类型结构。

## 三、把「保守式 / Fail-Closed」写进语言原语和默认分支

观察面连续三批 bug（355, 358–368, 372–375, 377–384）本质上都在踩同一个哲学错误：**Fail-Open（默认乐观）**——"拿不到数据时猜它没有、拿不到正文时猜它正常、遇到不认识的分支时返回 `null`/`0`/`true`"。

### 1. 默认拒绝（Fail-Closed）五条编码铁律

1. **禁止「在场性代替有效性」**：对所有业务判断面**禁用 `view.hasFile()`**。在状态页和配置页，只存在「已读到且通过内容谓词」「为空/无正文」「读失败」「真正缺席」四者之一；[useStatusFeed.ts](../../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 残留的 3 处 `view.hasFile('final.md')` 与 [useConfigFeed.ts](../../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts) 的 `view.hasFile('question.md')` 应彻底迁走，并加静态规则禁用。
2. **禁止吞错的 `try / catch`**：目前 `packages/deep-research-pack/src/` 存在大量仅 `console.error` 或 `catch { /* non-fatal */ }` 甚至静默返回 `[]`/`null` 的 `catch` 块。保守式写法要求：每一个 `catch` 必须把异常**显式转为失败状态值**（如 `{ ok: false, reason: 'unreadable', detail }`）或向上抛出；只有明确批准的清理（如 `closeSync`）允许忽略且须附注释。
3. **禁止用 `null` / `undefined` 兼任多种语义**：这正是 `vendor/dsh` `vendor/dsh/docs/defensive-patterns/general.md` 的铁律 *「One value states one fact」*。例如 `reviewFail: boolean | null` 把「未审查」「读取失败」「冲突未定」全塞进 `null`，必然导致下游误判。
4. **对未知与歧义一律取保守分支**：遇到冲突（`mismatch`）、截断（`truncated`）、未知枚举值、无法解析的非空内容，默认状态必须是 `'unconfirmed' | 'conflict' | 'invalid' | 'unknown'`，绝不能回落到 `'absent'` 或 `'ok'`。
5. **非平凡默认值必须显式声明（消灭隐形 `??` 兜底链）**：借鉴 `vendor/dsh` *「Optional inputs state both behaviors」*——禁止 `a?.b?.c ?? fallback` 掩盖中间层为何缺失；每一层缺失要有独立理由，否则直接要求非可选入参。

## 四、吸收并本地化 `vendor/dsh/docs/defensive-patterns/`

[纪律全量表](../../../../docs/discipline-map.md)第 189 行曾以「TS 面较小」暂缓引入 `vendor/dsh` 的五卷《防御性编码模式》，并明确写下重估触发：*「本仓 TS 面扩大到需独立缺陷模式清单时」*。

现在 `packages/deep-research-pack/src/` 已经膨胀到 **114 个 `.ts/.tsx` 文件**，而 11-22～23 连续四批 bug 几乎一字不差地命中了 vendor 已经总结好的防御模式：

| vendor 防御模式（已成文） | 对应本仓 11-20～23 真实踩坑 |
|---|---|
| `One value states one fact`（`general.md`） | BUG-358/359/360/361/362/364/365/366/367/370/372/373/375：`null`/`0`/空全混为一谈 |
| `Report orthogonal outcomes independently`（`general.md`） | BUG-357：`delivered` 与 `reviewFail` 混在一条单轴 `if` 链里互相否定；BUG-369：`readiness` 与 `review` 冲突未独立成态 |
| `Timing does not carry correctness` & `Dispose reaches quiescence`（`general.md`） | BUG-344/351/371 & `useStatusFeed.ts:211` 未在 cleanup 里 `abort()` 的 `AbortController`、`useEffect` 缺依赖 |
| `Shared state has one owner`（`general.md`） | BUG-327（cache key 两处自造）、369/374（review 两处派生）、356（final 版本重算） |
| `Optional inputs state both behaviors`（`general.md`） | BUG-329（`null` scope 静默退化为全量）、340（`protocol === null` 未检查崩溃） |
| `Client component rules`（`client-components.md`） | `useStatusFeed` / `useGraphFeed` / `useConfigFeed` 在组件 hook 里混入订阅、定时器、竞态控制与状态翻译 |

建议直接将其中适用于本仓插件/client 面的条款本地化为本仓 TS/React 编码评审清单（或通过 ESLint/oxlint + AST 检查自动落地，不增加纯靠人记的文档负担）。

## 五、把 React Hook「抽干」：Humble Object + 纯 Reducer 状态机

11-22～23 的 30 多张 bug 集中爆发在 `useStatusFeed.ts`（414 行）、`useGraphFeed.ts`（220 行）、`useConfigFeed.ts`（224 行）、`ResearchFinalTab.tsx`（383 行）。根本架构病因是：**把复杂异步状态机直接写进了 React `useEffect` + 十几个分散的 `useState` 里**。

- **问题表现**：
  - `useStatusFeed` 同时维护 13 个独立的 `useState`（`rows`, `hitl`, `journalEvents`, `face`, `unbound`, `trust`, `journalSeen`, `receiptDelivery`, `nowTick`, `kickoffHold`, `error`, `reads`, `reviewVerdict`, `reviewDetail`, `scanSettled`, `retryNonce`），任何一条路径漏更新其中 1 个 state（如异常分支忘了重设 `reviewDetail` 或 `receiptDelivery`），就会产生跨轮污染或矛盾画面；
  - `AbortController` 与 `stopped` 手工散落在 12 个 `await` 之后，极易遗漏；
  - 由于逻辑锁在 React Hook 生命周期里，L0 单测几乎测不到它，只能靠慢而重的 Playwright E2E。
- **架构解法（Humble Object 模式）**：
  1. **纯 TS 状态机（Reducer）**：把会话切换、journal 首帧/增量、bundle 扫描开始/成功/失败、重试触发、timer tick 全部写成纯函数 `reduceStatusState(state, action)` 与纯投影 `selectStatusView(state)`；一次状态跃迁保证原子一致，**单个字段不可能和其它字段撕裂**；
  2. **薄 React 适配层（<80 行）**：Hook 只负责挂 `follow` 异步迭代器、挂 `setInterval`、管理唯一 `AbortController` 并在 cleanup 时真正 `abort()`，收到结果后 `dispatch(action)`。
  3. **UI 数据驱动渲染（消灭复制粘贴分支）**：像 `ResearchStatusTab.tsx:172-219` 连续手写 7 遍同类告警条与 `retry` 按钮，改为由纯函数 `collectStatusNotices(state)` 产出一个有序列表，组件只做 `.map()` 渲染——既消除重复，又让所有告警条的逻辑全部进入 L0 纯单测。

## 六、把 `.mjs` 运维/门禁脚本也纳入类型与严格编译防线

- **现状缺口**：[package.json](../../../../package.json) 的 `typecheck` 只检查 `packages/deep-research-pack`（114 个 `.ts/.tsx` 文件），而 `checks/` 与 `tools/` 下 **180 个 `.mjs` 脚本**几乎裸奔：
  - `checks/run-gates/protocol-audit.mjs`（BUG-340）因为漏了 `import` 和 `null` 检查在真实 run 崩溃；
  - [smoke-identifiers.test.mjs](../../../../tests/checks/repo/smoke-identifiers.test.mjs) 只对 `checks/smoke/*.mjs` 跑 `TS2304/TS2552`，既不管 `checks/run-gates/` / `checks/lib/` / `tools/`，也不管空值解引用、参数类型错误、错误返回形状。
- **改进实践**：
  1. 新增 `tsconfig.scripts.json`（`allowJs: true, checkJs: true, strictNullChecks: true, noEmit: true`）覆盖 `checks/**/*.mjs` 和 `tools/**/*.mjs` 并并入 `pnpm typecheck`（对高价值纯核也可逐步迁移为 `.ts` 或补 JSDoc 类型标注）；
  2. 在 `packages/deep-research-pack/src/` 清理现有 **14 处** `as never` / `as unknown as` 类型逃逸——每一处类型逃逸都是关闭编译器眼睛的缝隙（例如 `plan-index.ts:207` 的 `as unknown as Readonly<Record<PlanColumn, PlanCell>>` 如果漏填列编译器无法感知）；
  3. 开启更严的静态约束（如禁止未检查的 `JSON.parse` 直接属性访问、`noUncheckedSideEffectImports` 等）。

## 七、单一权威规范（Single Source of Truth）：从「文档与测试对账」升级为「代码/Schema 生成模板与契约」

- BUG-341..343、350 证明：只要允许模型文档/skill 样例、模板文件、门禁代码各自维护一套格式说明，漂移只是时间问题。虽然 P3 已落地 `contract-fixture`（测试直接读模板或 skill fenced 块喂给 parser），但还可以更进一步：
  - **生产者优先走工具写机器事实**（延续 11-21 决定 T2）：凡是确定性结构（`delivered.json`、`review/readiness.json`、`claims.json`、`plan.md` 任务回填），能由工具生成的绝不靠 LLM 拼写；
  - **同源校验器暴露给运行时和打包面**：校验逻辑不应只活在仓外 `checks/run-gates/`，而应作为纯校验器住在 `packages/deep-research-pack` 内（既供 `checks/` 门禁调用，也供 `doctor` / host 工具在写入前/交付前自检），消除「开发仓门禁和安装态插件各长一套」的缝隙。
