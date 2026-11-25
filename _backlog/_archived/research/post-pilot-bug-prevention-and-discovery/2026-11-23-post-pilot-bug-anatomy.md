---
topic: 11-20 预防试点后 45 张缺陷（BUG-340…384）的实证解剖
intent: 盘点 11-20 试点后爆发并归档的 45 张缺陷分布，解释为什么旧试点没拦住它们，并指出代码里仍在运行的同族结构性盲区。
---

# 实证解剖：为什么 11-20 试点落地后仍爆出 45 张缺陷（BUG-340…384）

> 采样基线：当前工作树（2026-11-23）；统计对象为 `_backlog/_archived/fixed_bugs/` 中 `opened >= 2026-11-20` 的 45 张卡（[BUG-340](../../../_archived/fixed_bugs/BUG-340-protocol-audit-cli-missing-readdir-import.md)…[BUG-384](../../../_archived/fixed_bugs/BUG-384-empty-plan-status-silent.md)，其中 [BUG-376](../../../_archived/fixed_bugs/BUG-376-defaults-valid-field-lost-on-unknown-key.md) 经三方复核定性为 E2E 断言假阳性 / not-a-bug，其余 44 张为真实缺陷）。

## 一、11-20 试点到底保了什么，漏了什么

2026-11-20 落地的两项前置工作各有明确窄边界：

1. [预防性质量试点卡](../../../_archived/settled_issues/2026-11-20-preventive-quality-pilot.md)（A+B）：只解决了「启动互斥锁收归 `start-lock` + `run-driver`/`boot-run` 双入口委托」，以及在开发环文档/技能中追加「实施前查旧性质与受影响入口」的软准入规则——且该规则的 A4 盲评在当时即记录未通过（效力未证）。
2. [Pack 生产源头预防卡](../../../_archived/settled_issues/2026-11-20-pack-production-prevention.md)（D 切片）：只统一了 `plan.md` 节点表的单次解码（`plan-index` 与 `plan-gate` 共用），生产写入强制（P 分支）延后。

也就是说，**11-20 的防线集中在「启动锁」和「plan 节点表解析」两个点上**，而 11-20～11-23 期间真正在批量生产 bug 的，是另外三块完全没被覆盖的工程面。

## 二、BUG-340…384 的真实机制分布（45 张）

对照五张批修复程序卡（[缺陷积压修复](../../../_archived/settled_issues/2026-11-21-bug-stack-repair-program.md)、[观察面真实性](../../../_archived/settled_issues/2026-11-22-observation-truthfulness-program.md)、[观察面工件真实性](../../../_archived/settled_issues/2026-11-22-observation-artifact-truth-program.md)、[观察面残余](../../../_archived/settled_issues/2026-11-23-observation-residuals-program.md)、[观察面内容实质](../../../_archived/settled_issues/2026-11-23-observation-substance-program.md)）及各卡正文，45 张卡可归入四大类：

| 机制簇 | 涉及 BUG（数） | 代表症状 | 为什么没在写代码时或 L0 被拦住 |
|---|---|---|---|
| **① 观察面/驾驶舱状态折叠、异步装配与展示盲区** | 344, 345, 347, 348, 351–360, 361–375, 377–378, 381–384（**32 张**，占 71%） | 读失败折成「推进中/未见证/✓审查/0 份」；0 字节/仅标题文件算 valid；`_failed.md` 算证据；watcher 盯错文件；`delivered × reviewFail` 文案互打；两个页面对同一 `review` 事实各派一套结论 | **最大工程盲区**：1) `src/client/` 的 React Hooks（如 [useStatusFeed](../../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts)、[useGraphFeed](../../../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts)、[useConfigFeed](../../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts)）在 L0 几乎**没有运行时测试**（`tests/cockpit/client/` 只做 `renderToStaticMarkup` 静态 HTML 渲染，不挂 `useEffect`/定时器/异步读竞态）；2) 状态模型允许非法组合与有损折叠（`null`/`0`/`false` 兼任多种语义） |
| **② 生产者 ↔ 门禁契约漂移与脆弱文本解析** | 341, 342, 343, 350（**4 张**，另 377/378/381–383 交叉） | 模型按技能或直觉写出合法异形（一行式 findings、无字面 owner/next、extra count keys、rich claims），与门禁正则/手写校验打架 | 产物的模板、模型样例与校验 parser 长期不同源；手写正则/行扫代替统一 Schema 或 Markdown AST |
| **③ 无静态类型保护的 `.mjs` 脚本与运行环境边界** | 340, 346, 349（**3 张**） | `protocol-audit.mjs` 缺 `readdirSync`/`splitFrontmatter` import 且无 `null` 守卫（Run 时必崩）；`ps` 沙箱 EPERM；嵌套沙箱探测缺失 | `checks/` 与 `tools/` 共 **180 个 `.mjs` 文件**不在 `pnpm typecheck` 范围内；[smoke-identifiers](../../../../tests/checks/repo/smoke-identifiers.test.mjs) 只扫描 `checks/smoke/*.mjs` 的 `TS2304/TS2552`，未覆盖 `checks/run-gates/`、`checks/lib/`、`tools/`，也不查空值解引用 |
| **④ 英文 locale/排版面 & E2E 假阳性** | 379, 380, 376（**3 张**） | 英文计数固定复数、tab 被容器宽度截断；376 则是 E2E 只读 `paneText` 未读 `select.value` 制造的假阳性 | 英文 UI 装配测试缺口 + E2E 断言只扫整块文本导致假阳 |

> 注：其余如 352（`drt_` 前缀归一）、369/374（review 跨页签派生分裂）等，实质也属于簇①「同一事实没有唯一领域模型与唯一派生入口」。

## 三、为什么「靠 E2E 找一轮、修一批」越来越慢且总会漏

11-22～11-23 连续跑了四轮观察面 E2E（J1–J53），修完一批（351–355）又撞出下一批（356–360 → 361–368 → 369–376 → 377–384）。这不是因为团队不认真，而是因为**用黑盒 E2E 充当了单元测试、静态分析与架构约束的替代品**：

1. **状态空间爆炸 vs E2E 采样稀疏**：仅状态页一个页面就有 10 个读写源（`bundle/question/review/readiness/evidence/plan/leads/findings/final/receipt`）× 5 种工件态（`ok/absent/unreadable/empty/invalid`）× 内容实质态（`body-empty`/sentinel）× `delivered` × `hitlPending` × `unbound/kickoffHold`。手写 E2E 场景每次只能点亮几十个格子中的十来个，必然「按读取点打地鼠」，按页面打完状态页又在配置页（372）、图谱页（370）、终稿页（371/374）漏出来。
2. **修法靠「流程清单 G1–G27」而不是「编译器和架构堵死通道」**：每轮程序卡都在追加规则（G1 到 G27），但只要语言和框架层面**仍然允许**写裸 `view.hasFile()`、允许绕过 `readArtifact`、允许手写松散布尔对象、允许不穷举 `switch` 分支、允许无测试的 `useEffect` 合入主干，下一次新增一个轴就必然再漏一次。
3. **现代码里仍可立即指出的未爆/半爆隐患（实证抽样）**：
   - [useStatusFeed.ts](../../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts)：
     - 第 337、347、354 行**仍在直接调用 `view.hasFile('final.md')`** 判断 `steps.final`、`delivered`、`hasFinal`，未经过 `readArtifact` 与 `hasBodyText`（即刚刚在 381–384 踩过的「0 字节/仅标题/不可读也算完成」同款隐患）；
     - 第 299–302 行 `bodyIssue` 显式列举 `'ok' | 'absent' | 'unreadable' | 'empty' | 'invalid'`，但对 `'invalid'` 静默返回 `null`（未用 `never` 穷举）；
     - 第 211 行在 `scan()` 内 `new AbortController().signal` 却**从未保存或 `abort()`** 该 controller，仅靠 `stopped` 布尔标记挡回调，组件卸载或重扫时底层 RPC 不会被真正取消；
     - 第 219–221 行存在缩进错乱且连续重复 3 次的 `setReviewDetail(null)`（无 formatter / linter 拦截）；
     - 第 176 行 `useEffect` 依赖数组漏掉 `props.revealStatusTab`（无 React hooks lint 规则）。
   - [useConfigFeed.ts](../../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts)：
     - 第 163 行**仍保留 `view.hasFile('question.md')`** 前置守卫，绕过了 `readArtifact` 对「在场性缓存与读取状态不一致」的统一处理。
   - [useGraphFeed.ts](../../../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts)：
     - 第 136 行**仍在裸调 `view.read('plan.md')`**（虽然文档已登记为遗留，但说明读取收口尚未闭合）。
   - **类型逃逸与 `vendor/dsh` 现成防线缺位**：
     - `packages/deep-research-pack/src/` 目前有 **14 处** `as never` / `as unknown as` 强制类型转换（例如 `client/index.ts`、`plan-index.ts:207`、`review-readiness.ts:257`）；
     - [纪律全量表](../../../../docs/discipline-map.md)第 189、202 行将 `vendor/dsh` 已验证落地的 `docs/defensive-patterns/`（五卷防御模式）、`oxlint` + `oxlint-tsgolint`（type-aware lint）、`jscpd`（重复代码检测）、`publint` 均标为「未引入/不适用」，但当时设定的重估触发条件（*「本仓 TS 面扩大到需独立缺陷模式清单时」*）在 `src/` 扩张到 **114 个 `.ts/.tsx` 文件**后其实早已触发。

## 四、接下来两份调研材料回答什么

- **问题一（[代码实践与架构预防](2026-11-23-defensive-and-contract-coding-practices.md)）**：如何在编码阶段用类型、契约、状态机、Fail-Closed 与编译/Lint 护栏从根本上减少 bug 的生成空间，把规则从「人肉记忆 G1–G27」变成「写错了编译/静态分析就过不去」。
- **问题二（[非端到端寻虫手段](2026-11-23-non-e2e-bug-discovery-methods.md)）**：除了跑重型浏览器/真模型端到端，还能用哪些更快、覆盖面大几个数量级的手段（静态分析、Hook+jsdom、Property-Based Testing、状态机序列测试、差分测试、变异测试、故障注入矩阵、覆盖率盲区分析）系统性地把 bug 提前找出来。
