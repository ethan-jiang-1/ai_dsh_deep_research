---
topic: 自研项目专属语义 Linter 与领域巡检器设计
intent: 针对本仓“TS 客户端/宿主 + .mjs 门禁脚本 + Markdown/YAML 提示契约”混合结构，设计通用 Linter 覆盖不了的 5 类自研语义检查与专用探测器。
---

# 自研项目专属语义 Linter 与领域巡检器

> 核心判断：通用 Linter（`oxlint`/`ESLint`）只认识语言语法，不认识本仓的业务边界。本仓已有用字符串正则写的守卫（如 `final-tab-patterns.spec.mjs` 查 `viewIo.read(`、`status-feed.spec.mjs` 查 `view.read(`），但**字符串正则挡不住改名或等价原语绕过**——实证：[useStatusFeed.ts](../../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 第 337/347/354 行仍在调用 `view.hasFile('final.md')`，正则守卫照样全绿。依托本仓 `package.json` 已经依赖的 **TypeScript Compiler API**（见 [smoke-identifiers.test.mjs](../../../../tests/checks/repo/smoke-identifiers.test.mjs) 与 [no-unused-code.test.mjs](../../../../tests/checks/repo/no-unused-code.test.mjs) 范例），可以低成本做出以下 5 类专用武器。

---

## 一、基于 TS `TypeChecker` 的「禁忌能力 / 安全绕过」Linter（取代脆弱正则）

- **做法**：用 `ts.createProgram` + `program.getTypeChecker()` 识别表达式的**真实静态类型**，而不是匹配变量名字符串：
  1. **封死 `RunView` 裸读与存在性假判**：在 `src/client/`（[artifact-read.ts](../../../../packages/deep-research-pack/src/lib/run/artifact-read.ts) 白名单除外）中，任何类型为 `RunView` 的表达式调用 `.read()` 或 `.hasFile()`——无论变量叫 `view`、`viewIo`、`opened.value` 还是别名——一律静态报红；
  2. **封死无校验的 `JSON.parse()` 消费**：检查 `JSON.parse(...)` 结果是否流入显式 decoder 函数，禁止直接做属性访问或 `as T` 强转；
  3. **封死不完整的 `AbortController` 生命周期**：在同一函数/effect 作用域内创建 `new AbortController()`，必须同时观测到 `.signal` 传入异步调用 **且** cleanup/`finally` 路径调用 `.abort()`（直接抓出 `useStatusFeed.ts:211` 只建不 abort 问题）；
  4. **封死静默吞错的 `catch`**：除白名单清理点（如 `closeSync`）外，非白名单 `catch` 块若为空或仅有 `console.*` 且未设置错误态/未返回失败值/未 `throw`，一律报红（实证扫描当前 `src/` 共有 **9 处空 `catch` + 6 处仅 `console` 的 `catch`**）。

## 二、「封闭状态穷举 & 有损折平」检查器

- **做法**：用 TS `TypeChecker` 定位所有涉及核心状态枚举（`ArtifactState`、`ReviewVerdict`、`SourceRead`、`BindingTrust`）的分支与返回位置：
  1. **强制 `never` 穷举**：凡对封闭联合做 `switch` 或 `if/else` 映射，若缺少 `default: assertNever(...)` 且存在未列举分支，静态报红——直接抓出 `useStatusFeed.ts:300` `bodyIssue` 对 `'invalid'` 静默返回 `null`；
  2. **有损状态折平告警**：若函数输入含 `ArtifactState` / `ReviewVerdict` 等 3–5 态联合，却压缩返回裸 `boolean` 或 `number` 且未同时传出错误/unknown 通道，标记告警。

## 三、「事实 → 消费端」跨文件闭合审计器

- **背景**：BUG-356…384 多次出现「某字段读了但页签没展示错误」或「状态页与终稿页各自派生同一份 `review.md`」。
- **做法**：利用 TS `LanguageService` 引用图做跨文件静态审计：
  1. **Policy ↔ UI 覆盖闭合**：读取 [artifact-read.ts](../../../../packages/deep-research-pack/src/lib/run/artifact-read.ts) 的 `ARTIFACT_POLICY` / `StatusReads` 键集合，追踪各键在 `ResearchStatusTab`、`ResearchFinalTab`、`ResearchGraphTab`、`ResearchConfigTab` 中的流向，列出「已采集但某消费页签未渲染对应失败态」的悬空轴；
  2. **防双派冲突**：检查同名工件字符串（`'review.md'`、`'question.md'`、`'plan.md'`、`'delivered.json'`）在 `src/client/` 与 `checks/` 里被哪些解析入口消费，同一工件出现两套独立解析器即告警。

## 四、自研「通用恶意 `RunSource` + Hook 无头巡检器」（最省 E2E 的领域武器）

- **架构契合点**：本仓 4 个驾驶舱页签全部通过极窄注入面（`RunSource` + `follow` + `t`）取数，天然适合写一个百行级的**通用恶意数据面巡检器**：
  - 自动向任意 Hook/Tab 连续注入标准故障矩阵：`missing` / `unreadable(EACCES)` / `truncated: true` / `0 字节` / `纯空白` / `仅 frontmatter` / `仅标题` / `坏 JSON` / `缺字段 JSON` / `冲突声明` / `切会话后旧请求延迟到达`；
  - 用通用产品公理自动断言：**任何读失败/空态不得渲染空白正文、不得标为步骤 `done`、不得输出矛盾的交付/不交付文案、切会话后绝不残留旧会话数据**。
  - **收益**：以后新增读取点或新页签，只需挂进这台巡检器，不必再为每个边界手写一套 Playwright 端到端。

## 五、「Skill / 模板 ↔ Parser」双向契约扫描器

- **背景**：本仓模型按 `presets/*/skills/*/SKILL.md` 和 `content/templates/run/*` 产出 Markdown/JSON，后验由 `checks/lib/gates/` 与 `src/lib/` 解析。
- **做法**：写一个全仓扫描脚本自动从所有 skill 与模板的 fenced 代码块中抽取样例（`plan` 表、`findings` 块、`claims.json`、`readiness.json`、`review.md`），批量送入对应的权威 parser 与门禁核心执行，同时对比“门禁校验的必填字段集合”与“模板/skill 样例给出的字段集合”，把原本靠人工维护的 `contract-fixture` 升级为自动双向对齐检查。
