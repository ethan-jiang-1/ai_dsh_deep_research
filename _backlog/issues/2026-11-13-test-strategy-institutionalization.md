---
status: 待落地
opened: 2026-11-13
---

# 落地：测试策略制度化——从失败类账本到类级守卫、模型可见证据与资产治理

> 立卡：2026-11-13 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> 去向：implemented — `notes/implemented/2026-11-13-test-strategy-institutionalization.md`
> 授权：用户 2026-11-13 明确要求「长期正确、全面、代价不怕」；方向由 agent 定，不再逐项给选项；
> 阶段边界报告证据与未跑项。
> 研究：[_backlog/research/dsh-test-strategy](../research/dsh-test-strategy/README.md)（已定性）。
> 兄弟卡：[_backlog/issues/2026-11-13-test-asset-fence](2026-11-13-test-asset-fence.md)（S0–S2 的资产围栏；
> 本卡吸收其 S1/S2，并把「围栏」升级为「制度」）。

## 一页摘要

**一句话**：本卡不是「再补一轮测试」，而是把测试从「资产集合」升级为**自我纠错的制度**——
每个已发现的失败类有账本与类级守卫；模型可见变更在 CI 有强制 keyless 证据；客户端纯逻辑/
状态面有直测或登记理由；慢资产有成本/唯一证明面/判据核/退役条件；每次交付有证据账本；
P0/P1/复发有复盘；探索成为常驻实践。

**为什么现在**：五轮探索修了 79 张 BUG（全量 159 张），但同类以邻接变体复发；模型可见变更
唯一的 keyless 判据（snapshot B 层）仍是 dev-only；客户端 36/59 文件无直测；慢资产没有账本；
交付没有标准证据账本；159 张 BUG 没有一次「流程为什么放它过去」的复盘。再按「发现→修→忘」
走，下一轮还会重复。

**方向（已定，不再给选项）**：三环（回归/装配/发现）+ 四账（资产/失败类/证据/探索）+
五关（准入/变更类/必需/退役/复盘）。不照搬 DSH 的规模（vitest/coverage/七层/run-gates DAG/
多 OS），只借它的制度判据，落到本仓现有载体。

**首个可验收批次**：W0-1（全量失败类账本）+ W0-2（类级守卫方法）——它们是决策/方法载体，
不改产品代码；随后 W0-3..W0-10（资产账/客户端面/导出守卫/可见性/文档/命名）。
**本卡边界**：本卡只提出方案与验收，**不修改 repo**；下一阶段经用户批准后从 Wave 0 开工。
详细切片是候选，不是执行队列；每片开工前按 `## 判据形状` 细化，先立红再交付。

**问题与期望结果：** 本仓的测试资产已经不少（55 道 L0 门禁、176 个 keyless 测试文件 / 1409 例、
28 个 smoke、8 支探针、1 个快照族），但过去两周仍以五轮探索修了 79 张 BUG（全量 159 张）。
失败史显示：多数修复是**实例级**（为报出的输入加一条测试），同类以邻接变体复发（readiness
074→141→150、方法库 heading 081→085→093→123→124→127→128→138、HITL2 075→096→140→144→149→156、
锁/端口 073→104→113→114→126→130）；模型可见变更的唯一 keyless 判据（snapshot B 层）仍是
dev-only，靠人记得跑；客户端 36/59 文件无直测；慢资产没有成本/唯一证明面/判据核/退役条件；
交付没有标准证据账本；159 张 BUG 没有一次「流程为什么放它过去」的复盘。

期望结果：把测试从「资产集合」升级为**自我纠错的制度**——
① 每个已发现的失败类有账本、有类级守卫或有明确的不可机械化规则；
② 模型可见变更在 CI 里有强制 keyless 证据；
③ 客户端纯逻辑/状态面有直测或登记理由；
④ 每条慢资产有 cost / uniqueClaim / oracle / sunset；
⑤ 每次非平凡交付有证据账本与「显式未覆盖」；
⑥ P0/P1/复发有复盘与新增防线；
⑦ 探索协议成为可重复的常驻实践，而不是一张 1847 行的英雄卡。

**当前情况：**

- 研究正文（779 行）= [dsh-test-strategy-gap](../research/dsh-test-strategy/2026-11-13-dsh-test-strategy-gap.md)：
  DSH 16 篇 digest + `vendor/dsh` rc.5 一手源核验；本仓资产/失败史对照；差距矩阵；三环四账五关。
- 已测事实：`pnpm verify` 3.9s（L0 门禁全绿；计数正本 = `scripts/verify/context.mjs` 的 `gates` 数组）；
  `pnpm test` 4.6s / 全绿 / 0 skipped（用例计数正本 = `pnpm test` 汇总）；`gates.e2e` 202s（CI）；
  `snapshot-replay` 162s（dev-only）；真模型档零 CI（名单正本 = `smoke-contract` 的 `REAL_MODEL`）；
  `test-surface` 只覆盖 `scripts/lib` 与 pack `src/lib`，`src/client` 有直测缺口；`smoke-registry`
  只有 `ci/dev-only` + 理由；CI 各 job 无 `needs`/聚合；`guard-red-record` 只证留证文本在场。
- 已落地 S0（test-asset-fence）：`scripts/lib/run-accept-fixture.mjs` + 直测，`run-accept.e2e` ⑦ 绿。
- 未落地：S1（客户端直测面 + `client-surface`）、S2（smoke 台账 + `smoke-oracle-surface`）、
  快照只读/CI、CI 聚合、运行时导出守卫、客户端 dispose、证据账本、文档纠偏、复盘、探索毕业。
- 未跑：本轮未复跑 `gates.e2e` / `snapshot-replay` / L1/L2/L4 / 真模型；慢档数字引用
  test-asset-fence 的实测（HEAD `ec652a30`）。

## 这件事的意义（为什么不是普通测试卡）

它改变的是**默认轨迹**，不是「测试数量」：从「发现 → 修 → 忘」变成「发现 → 归类 → 类级守卫 →
必需/账本 → 复盘」。具体说：

- **测试资产变成可治理的资产**：每条慢资产有唯一证明面、判据核、成本、退役条件；慢不再等于重要。
- **模型可见证据从「人记得跑」变成「CI 必须跑」**：这是产品风险最高的一面，不能再靠路由表上的
  一行字。
- **客户端从「只在浏览器慢档里间接覆盖」变成「纯逻辑/状态有快测，装配留给真浏览器」**：快环仍然
  是秒级，慢档只证装配。
- **探索从「英雄卡」变成「常驻技能 + 账本」**：发现不再依赖某个 agent 的记忆；下一轮探索知道
  上一轮探过什么、哪些是空假设。
- **「未覆盖」变成显式、可评审、可追踪的交付字段**：不是作者脑子里的空白，也不是一句「应该没问题」。
- **最终判据不是「测试更多」**，而是「同类缺陷不再以邻接变体复发；新变更能按失败类选到对的
  最小证据」。这比任何单条测试都更接近「长期正确」。

这也是为什么它值得一张程序卡而不是十张零散卡：零散卡只能修实例；程序卡才能把「类级、必需、
账本、复盘」这四个制度面同时立起来。

**未决问题（不阻塞开工，按证据决定）：**

1. 快照 CI 的形态：安装域（faithful，需 temp profile + tarball + team layer）vs 源码域（快，
   但 B 层基线是安装域录的，可能需第二套基线）。先用 spike 测安装域 profile 预备的成本；
   在证据出来前不预设。
2. 客户端 hook 测试的 DOM 依赖：`happy-dom` devDep（探索脚本已用它跑通）vs vendor `jsdom`
   （根不可直接 import）。先用一个薄 harness spike 验证；不接受新依赖就把 hook 面登记为
   smoke-only 并写理由。
3. 政策载体：`docs/testing.md` / `evaluation.md` 一节 / `guides/67`。先做 `guides/67`（程序）+
   `evaluation` 指针；若规则继续膨胀再升合同。
4. 是否升 D 号：本卡交付时把「三环四账五关」升为 D54；不在开工前预支。

**下一步：** 按 §方案 的 Wave 0 → 1 → 2 → 3 推进；每片先立红、再交付、同 diff 记账；
每波结束报告已跑绿 / 已跑红 / 未跑。

## 方案与取舍

### 方向：不是「再补测试」，是「让测试自我纠错」

本卡拒绝「为 159 张 BUG 逐张补测试」的短视做法；也拒绝照搬 DSH 的规模（vitest / per-file
100% / 七层 / run-gates DAG / 多 OS 矩阵）。采纳的是 DSH 的**制度判据**，落到本仓现有载体：

- **三环**：回归环（快、keyless）、装配环（真入口）、发现环（探索/变异/复盘）。
- **四账**：资产账（smoke registry 扩字段）、失败类账（本卡 Wave 0 的全量普查）、证据账
  （交付模板）、探索账（research 题 + 技能）。
- **五关**：准入（新资产有唯一证明面 + 负控 + owner + 成本）、变更类（模型可见→快照；新纯件→
  直测；新实体→消费者清单；新判据→变异矩阵）、必需（产品面证据在 CI/收尾；skip 可见）、
  退役（无消费者/无 oracle/成本不划算 → sunset）、复盘（P0/P1/复发 → 五节 + 新守卫）。

### 决策依赖图（粗粒度）

```text
W0-1 失败类账本 ─┬─> W2-1..6 类级守卫（top 5）
W0-2 类级方法  ──┘
W0-3 资产账 ──> W3-5 退役
W0-4 客户端直测 ─┐
W0-5 导出守卫  ─┼─> W2-6 假绿 oracle（client 面）
W0-6 dispose  ─┘
W0-7 证据账 ──> W3-4 政策收口
W0-8 可见性 ──> W3-7 CI 聚合 / with-key
W1-1 快照只读 ──> W1-2 快照 A/B CI ──> W1-3 角色面 / W1-6 世界树
W3-1 探索技能 ──> W3-2 复盘
W3-6 D54 + Note（全卡收口）
```

这不是执行队列；是「谁先落地、谁等谁」的依赖图。W0-1/W0-2 是唯一无代码依赖、且其他片都要
消费的基础，所以先做；W1/W2 可并行；W3 是收口与制度化，最后做。

### Wave 0：先把「看不见」变成「看得见」（基础，先做）

| 片 | 交付 | 验收（先红后绿） | 依赖 |
|---|---|---|---|
| W0-1 失败类账本 | 全量 159 张 BUG 的失败类普查（`runtime/` 材料 → 最终落 `docs/evaluation.md` 或 `guides/67` 的表） | 每张有主类/发现层/守卫/红录状态；不可归类有原因；Top 5 有类级守卫建议 | 无 |
| W0-2 类级守卫方法 | `_backlog/methods/class-level-guards.md`：6 种形态 + 毕业模板 + 反模式 + 成本控制 | 用 readiness 与 method-library 两个真实族写出完整示例；模板可被下一位 agent 直接照做 | 无 |
| W0-3 资产账（S2） | `scripts/smoke/registry.json` 每条加 `cost/uniqueClaim/oracle/sunset`；`smoke-oracle-surface` 契约 | 删一条 oracle / 填不存在路径 / 新增 smoke 不登记 → 红 | 无 |
| W0-4 客户端直测面（S1） | 4 个零路径纯逻辑 + 2 个无直测件；`client-surface` 契约 | 注入未测试纯件 → 契约点名红；6 测绿 | 无 |
| W0-5 运行时导出守卫 | `tests/pack/export-shape` 宿主半改真 Loader `unwrapExports` round-trip；client 半保留静态 | 注入 `export default` / re-export default → 红；还原绿 | 无 |
| W0-6 客户端 dispose | 假 ctx 的 effect/dispose 测试 | 注入不 dispose 的注册 → 红；dispose 后贡献消失 | 无 |
| W0-7 证据账本 | `reviewing-a-delivery` 加「证据账本」节 + issue 模板 | 一次真实交付按模板填写；评审能指出未覆盖行 | 无 |
| W0-8 可见性契约 | lane-membership（测试文件空间穷尽）、`pnpm test` 零 skip、spoiler 失败分列 | 错后缀/`test.skip`/新增 lane 不登记 → 红 | 无 |
| W0-9 文档纠偏 | external-materials 16 篇/rc.5；evaluation 5→6；probes 4→6；scripts 25→28；guides/66；JUDGES 5 vs six | `pnpm verify` 绿；不吹「全部对齐」 | 无 |
| W0-10 命名系统 | 四车道：`*.spec.mjs`（进程内）/ `*.e2e.mjs`（真进程）/ `*.entry.mjs`（真浏览器·profile·tarball）/ `tests/checks/*.test.mjs`（门禁自身）；smoke 加 `lane`/`support`；`test:spec/checks/e2e/entry` | 命令可跑；错后缀/错 lane/孤儿支援件 → 红；`pnpm test` 聚合 spec+checks | W1-2 后 |

### Wave 1：模型可见证据与真实入口（最高产品风险）

| 片 | 交付 | 验收 | 依赖 |
|---|---|---|---|
| W1-1 快照只读 | `--read-only` 与 `--update-expected` 互斥；默认只读 | 双 flag → exit 2；只读跑不改期望文件 | 无 |
| W1-2 快照 A/B CI | `--layers a,b`（砍 C）+ profile 预备 spike + CI 独立 job；路由表把 B 列入模型可见变更必跑面 | CI 基线绿；改 persona/手册 → B 红；≤5 min；skip 可见 | W1-1 |
| W1-3 场景角色面 | `roleFace: research \| method-editor \| worker`；按声明取 roster | 新族 keyless 回放绿；未录 → 加载期 fail-fast | W1-2 |
| W1-4 装起 + 效果 | lifecycle/release 增正向断言：内容注入/startup/defaults 真发生 | 删一个 apply 效果 → 红；装起 + 效果同链 | 无 |
| W1-5 可选依赖 | `PATH=''` 等价：团队层/experimental 行缺席时不探测/不启动 | 注入探测 → 红；可选项缺席仍可启动 | 无 |
| W1-6 快照世界树（设计） | 场景声明 `workspaceFinal` + `workspace.expected/`，record/refresh 不碰；先设计，后实施 | 设计评审通过；改一个 bundle 文件 → 红（实施时） | W1-2 |

### Wave 2：类级守卫（治复发，核心）

| 片 | 交付 | 验收 | 依赖 |
|---|---|---|---|
| W2-1 语法/解析矩阵 | 以 method-library heading + readiness 为样板，落地表驱动矩阵 | 报出的输入 + N 个邻接变体全红/全绿符合期望；非矩阵例子测试降级 | W0-2 |
| W2-2 同源 codec | 方法库 heading / readiness / plan 版本 / present 版本的「单一 codec + 双入口同判」 | 注入第二份实现 → 同源契约红；round-trip 过 | W0-2 |
| W2-3 消费者清单 | 工件/角色/文案键/profile 四张清单；新增实体先红 | 删一个消费者 → 红；新实体不登记 → 红 | W0-2 |
| W2-4 状态/交错矩阵 | 锁/端口/feed 三族的创建窗口/接管/释放/pid 复用/跨会话晚到 | 注入一个交错 → 红；负控仍绿 | W0-2 |
| W2-5 路径/形态矩阵 | 绝对/相对/`..`/symlink/hardlink/目录当文件/空格/unicode | 注入逃逸形态 → 红 | W0-2 |
| W2-6 假绿 oracle | 盘侧真值、计数≥1、明细行对账、在场≠内容；把慢壳判据抽纯 | 注入 0 题/空 JSON/伪造 session → 红 | W0-2 |
| W2-7 变异证明 | 关键守卫的「邻接变异注入 → 必须红」小 harness（只对 top 5，不铺全量） | 每个 top 5 类至少一条变异红录 | W2-1..6 |

### Wave 3：学习与治理（让制度活下去）

| 片 | 交付 | 验收 | 依赖 |
|---|---|---|---|
| W3-1 探索毕业 | `.agents/skills/exploratory-verification/SKILL.md` + `guides/67` 一节；charter/预算/毕业判据 | 新 agent 可按 description 加载；一轮探索产出 charter/结果/毕业卡 | 无 |
| W3-2 复盘 | BUG-081..159 一次五节复盘（症状/为什么没早发现/根因/修复/新增防线） | 至少一条新守卫进 Wave 0/2；P0/P1/复发触发写进 rules | W0-1 |
| W3-3 失败类→层表 | `guides/67` 一张 12 行表：失败类 → 最低可见层 → 反例 → 证据 | 被 guides/60 与 reviewing-a-delivery 引用；真实变更能按表选层 | W0-2 |
| W3-4 政策收口 | `guides/67` + `evaluation` 指针；必要时升 `docs/testing.md` | 一个入口能回答「绿为什么有意义/怎么选层/怎么记账」 | W3-3 |
| W3-5 资产退役 | `e2e-021rc2.entry` 补 picker 断言后退役；安装档合并评估 | 退役有替代证据；无消费者资产清零 | W0-3 |
| W3-6 D54 + Note | 把三环四账五关升 D54；写 implemented Note | D 号台账/Note/研究题互链；`pnpm verify` 绿 | Wave 0–3 |
| W3-7 CI 聚合 + with-key | `needs` 聚合裁决（含 skipped）+ job 清单契约；`workflow_dispatch` l4-lite + preflight | 删 needs/新增 job 不登记 → 红；with-key 可触发且缺 key 硬失败 | 无 |

### 取舍

- **不做**：为 159 张 BUG 逐张补测试；新增慢 E2E 换覆盖；vitest/coverage gate/七层/run-gates DAG/
  多 OS/Wine/benchmark/Python SDK；把探针做第六评估面；建第二份索引；为凑绿放宽判据。
- **先做 Wave 0 的理由**：它是所有后续的「账本/方法/可见性」基础；不先把失败类、资产、客户端
  面和 skip 可见做出来，Wave 1/2 会继续在沙上盖楼。
- **Wave 1 先于 Wave 2 的理由**：模型可见证据是最高产品风险，且它决定 Wave 2 的 B 层矩阵是否有
  地方跑；但 Wave 2 的「同源 codec/消费者清单」不依赖 Wave 1，可并行。
- **每片独立可验收**：不把 Wave 当成一个大爆炸；每片有红录、有证据、有未跑分列。

## 判据形状

本卡是程序卡，不新增单一判据；每个切片各自填 `## 判据形状`，共同约束：

- **权威事实**：失败类账本 = 全量 BUG 卡（结构化表格）；资产账 = `smoke/registry.json`；证据账 =
  交付模板；探索账 = research 题目录。散文只做副本，不一致 = 红。
- **读取方**：`smoke-oracle-surface` / `client-surface` / `lane-membership` / `skip-visible` /
  `class-level-guard` 契约；`reviewing-a-delivery`；CI 聚合。
- **坏输入**：缺账本/缺字段/缺 oracle/缺负控/缺显式未覆盖 → 红或 `unknown`；不静默放行。
- **旧形态**：`smoke-registry` 只有 tier/reason 的旧条目一次性补齐，不设 grandfather；
  旧测试文件不因 lane 契约被误杀（登记例外 + 理由）。
- **反证**：每片先注入回归看红，再交付绿；Top 5 类各留一条「邻接变异」红录。

## 验收标准

| # | 行为 | 类 | 判据 | 证据 owner |
|---|---|---|---|---|
| 1 | 全量 159 张 BUG 有失败类账本 | 确定性/文档 | 每张有主类/发现层/守卫/红录状态；不可归类有原因；Top 5 有类级守卫建议 | `runtime/` 普查 → `guides/67` 表 |
| 2 | 6 种类级守卫形态 + 2 个真实族示例 | 确定性/文档 | 模板可照做；示例矩阵能咬住邻接变体 | `_backlog/methods/class-level-guards.md` |
| 3 | smoke 资产账 28 条 | 确定性 | `cost/uniqueClaim/oracle/sunset` 齐；新增 smoke 不登记 = 红 | `scripts/smoke/registry.json` + `tests/checks/smoke-oracle-surface.test.mjs` |
| 4 | 客户端 6 件直测 + `client-surface` | 确定性 | 注入未测试纯件 → 红；6 测绿 | `tests/cockpit/*` + `tests/checks/client-surface.test.mjs` |
| 5 | 运行时导出守卫 + client dispose | 确定性 | 注入 default/re-export/不 dispose → 红 | `tests/pack/export-shape.spec.mjs` + `tests/cockpit/client-effect-dispose.spec.mjs` |
| 6 | 快照只读 + A/B CI | 确定性/装配 | 双 flag → exit 2；CI 基线绿；改 persona → B 红；≤5 min | `snapshot-replay.entry` + `.github/workflows/ci.yml` |
| 7 | 装起 + 效果 / 可选依赖 | 装配 | 删 apply 效果 → 红；可选缺席仍启动 | `lifecycle/release.entry` + 新断言 |
| 8 | 类级守卫 top 5 | 确定性 | 每类至少一条邻接变异红录；矩阵/同源/消费者/状态/路径/假绿至少覆盖四类 | `tests/` + `scripts/lib/gates-cases.mjs` |
| 9 | 探索技能 + 复盘 + 失败类→层表 | 文档/流程 | 技能可加载；复盘有「为什么没早发现」；表被引用 | `.agents/skills/` + `guides/67` + `notes/archived/` |
| 10 | 资产退役 + D54 + Note | 文档/治理 | 退役有替代证据；D54/Note/研究题互链；verify 绿 | `docs/decisions.md` + `notes/implemented/` |
| 11 | CI 聚合 + with-key 通道 | 装配/CI | 删 needs/新增 job 不登记 → 红；缺 key 硬失败 | `.github/workflows/ci.yml` + 契约 |
| 12 | 收尾不回归 | 全面 | `pnpm verify` / `pnpm test` / `pnpm typecheck`（触 pack 时）/ 对应慢档绿；未跑分列 | 命令输出 + Note |

**排除项**：不新增慢 E2E 换覆盖；不搬 vitest/coverage/七层/run-gates DAG/多 OS/benchmark/Python SDK；
不把探针做第六评估面；不建第二份索引；不为凑绿放宽判据。

## 执行记录

- **2026-11-13 Wave 2 先行片（W2-2 同源 codec）**：新增
  `tests/cockpit/library-heading-consistency.spec.mjs`——40 格矩阵（2 括号宽 × 2 段序 × 5 空白类 ×
  2 后缀），断言 `foldLibrary` 与 `upsertMethodEntry` 对同一标题变体的「同名」判断一致；未识别
  后缀 fail-loud。红证① = 去掉 `parseMethodHeading` 的半角括号分支 → 红（`## 方法(来源)〔默认偏好〕`
  名称错）；红证② = 去掉 `matchingHeadingLines` 的 `wellFormed` 过滤 → 两条红；各自还原 → 绿。
  登记 = `docs/evaluation.md` §L0 契约回归。实跑：单测 2/2 绿；`pnpm test` 1411/0；
  `pnpm verify` 全绿。未跑：慢档/真模型（非本片面）。
- **2026-11-13 Wave 0 W0-5（运行时导出守卫）**：`tests/pack/export-shape.spec.mjs` 宿主半
  import 后断言模块形状（`default` 不在、`apply`/`inject`/`name` 在场），静态面补
  `export default` / `as default` / `{ default } from` 三种写法；`tests/vendor/export-shape.vendor.spec.mjs`
  用真 Loader `unwrapExports` 往返（`pnpm test:vendor`，root tsconfig 的 vendor 源映射）。红证① =
  给 `src/index.ts` 加 `export default` → 静态 + 模块形状红；红证② = 给 client 加
  `export { apply as default }` → 静态红（补 `as default` 正则前实测漏过）；还原 → 绿。
  边界：client 半 `.css` 不可 import、fetch-fallback 的 `fetch` 被 `layering` 闭包图禁入，两者保留
  静态 + `client-load`/L1/L2。实跑：`pnpm test` 1412/0、`pnpm test:vendor` 4/0、`pnpm verify` 全绿。
  未跑：慢档/真模型。
- **2026-11-13 Wave 0 W0-4（客户端直测面 S1）**：新增 `tests/cockpit/client-pure-logic.spec.mjs`
  （6 个无直测/无路径件：lead-prompt、research-graph/format、coach-prompts、operation-prompts、
  section-labels、defaults/labels；8 例）与 `tests/checks/client-surface.test.mjs`
  （`src/client/**/*.ts` 每个有直测或 `CLIENT_SMOKE_ONLY` 理由；`.tsx` 整体归 client-load；
  15 个登记件逐条写理由；`scripts/README` 的 `keyless-imports` 消费列同步加 `client-surface.test`）。
  红证 = 临时新增 `src/client/__probe-untested.ts` → 契约点名红；删除 → 绿。实跑：
  `pnpm test` 1421/0、`pnpm verify` 全绿。未跑：慢档/真模型/hook DOM 环境（hook 仍登记为
  smoke-only，待 Wave 3 L）。
- **2026-11-13 Wave 0 W0-8（车道/可见性）**：新增 `tests/checks/test-lanes.test.mjs`——①
  `*.spec.mjs` 必须住 `run/cockpit/pack/contracts` 四域；② `tests/` 下不得有
  `*.spec.mjs`/`*.e2e.mjs`，非测试 `.mjs` 必须是 fixture/vendor/被测试 import 的支援件；③ 默认
  回归零 skip（`test.skip`/`skipIf`/`{ skip: }` 全红）。红证：新建 `tests/root-lane.spec.mjs`、
  `tests/cockpit/x.spec.mjs`、给测试加 `test.skip` 各红；删除/还原 → 绿。
  `scripts/README` 的 `keyless-imports` 消费列同步加 `test-lanes.test`。实跑：`pnpm test`
  1424/0、`pnpm verify` 全绿。未跑：慢档/真模型。
- **2026-11-13 Wave 0 W0-7/W0-9（证据账本 + 文档纠偏）**：`reviewing-a-delivery` 加
  「证据账本」节（证据/层/失败类/负控/CI/显式未覆盖 + 七问 + 未跑分列），指向
  `docs/evaluation.md` 完成判断四分离与 `_backlog/methods/class-level-guards.md`；
  `external-materials` 的 digest 行改 16 篇 / rc.5 / 7 reverified + 9 carried；`discipline-map`
  源 10 同步；`evaluation` 结构性例外补 `staged-change-pairing`；`probes/README` behavior
  列补 defaults/wave；`scripts/README` smoke 表说明 client-load 支援件在行内点名、不单列；
  `guides/66` 补 defaults/wave 探针并注明「暂无专用探针 ≠ 没有证据」；`replay-scene` 注释改为
  「五个声明 judge + time-context 另并」。实跑：`pnpm verify` 全绿、`pnpm test` 1424/0。
- **2026-11-13 Wave 0 W0-3（smoke 资产账 S2）**：`scripts/smoke/registry.json` 28 条各加
  `cost` / `uniqueClaim` / `oracle` / `sunset`；新增 `tests/checks/smoke-oracle-surface.test.mjs`
  （字段齐、cost 闭集、oracle 路径存在或 `none:` 有理由、真实 oracle ≥10、防空语料）；
  `scripts/README` smoke 表加字段说明；`evaluation` §L0 登记。红证：删一条 oracle → 红；
  oracle 改不存在路径 → 红；`none` 理由太短 → 红；还原 → 绿。实跑：`pnpm test` 1425/0、
  `pnpm verify` 全绿。未跑：慢档/真模型。
- **2026-11-13 Wave 0 W0-6（client dispose，形状半 + 行为面阻断）**：新增
  `tests/checks/client-effect-return.test.mjs`——用 TypeScript AST 断言 `src/client/index.ts`
  每个 `scoped.effect(callback)` 的 block body 都有 `return`（expression body 视为返回），
  防空语料 ≥10 个 effect。红证 = 把 `installQuestionCardNarrowFix` 的 effect 改成
  `() => { install... }`（丢 return）→ 红；还原 → 绿。**行为面（apply(fakeCtx) → dispose →
  贡献消失）未落地**：client 半在默认 `node:test` 里不能直接 import（`.css` + 浏览器 API）；
  已 spike 出 CSS stub 可 import，但 fake ctx 需覆盖 locale/remote/slots/sidebarRight/
  localStorage 等整条装配面，成本 > 本轮。**触发 = W3 L 的 hook/DOM harness**；当前覆盖 =
  本形状契约 + `client-effect-wrap` 门禁 + `client-load` 真浏览器。实跑：`pnpm test` 1426/0、
  `pnpm verify` 全绿。
- **2026-11-13 Wave 1 W1-1（快照只读）**：抽出 `scripts/lib/snapshot-mode.mjs`（纯判据核）：
  默认回放；`--read-only` / `DSH_SNAPSHOT=replay` → 只读；`--update-expected` 必带非空
  `--why`；只读与刷新互斥；`DSH_SNAPSHOT` 只认 `replay`（record/refresh 不走本脚本）。
  smoke 壳改为消费该纯函数（脚本从 559 行降到 544 行，过 `script-file-size`）；新增
  `tests/checks/snapshot-readonly.test.mjs` 直测判据核。红证 = 去掉互斥分支 → 红；还原 → 绿。
  CLI 实测：双 flag / `DSH_SNAPSHOT=record` / `replay + --update-expected` 均 exit 2。
  实跑：`pnpm test` 1427/0、`pnpm verify` 全绿。未跑：真回放（W1-2 的 CI job）。

- **2026-11-13 Wave 1 W1-2（快照 A/B 进 CI）**：`snapshot-replay.entry` 加 `--layers a,b,c`（CI 用
  `a,b` 砍掉 chromium 渲染层）；`dev/boot-run.sh --prepare-profile` 只装/校验 profile、不起 web；
  `snapshots/replay/research-face` 四角色按当前 pack 重录（source 身份更新到 `da4eed05` / vendor
  `b830ec950f`）——重录前 dev home 的 profile 内容陈旧，B 层在 fresh profile 下红，正是本次
  要抓的漂移。CI 新增 `snapshot-replay` job（vendor build + pack build + temp home profile +
  `zstd` + `--read-only --layers a,b`），`smoke/registry.json` 的 snapshot 条目改 `ci`/`snapshot-replay`。
  `replay-request` 的 runtime-context 归一化补「profile 安装根」（dev home vs CI temp home 是
  位置身份；包内 content 后缀仍逐字比较），直测在 `tests/run/replay-request.spec.mjs`。
  实测：`DSH_HOME=runtime/record-home ... --layers a,b` 四角色 A+B 全绿；`tests/run/replay-fixtures`
  按新 fixture 重算 `ui.expected.md` 后 `pnpm test` 1428/0。**未验证**：C 层 UI 捕获在 temp home
  被侧栏同名探针会话干扰（C0 失败），`ui.expected.md` 的卡片/活动行由 `cardTitleOf`/
  `foldActivityRows` 纯函数重算，C UI 重跑待后续；CI 不跑 C（只 A/B）。
- **2026-11-13 Wave 0 W0-10（命名对齐）**：按用户 2026-11-13 的四车道方案全仓迁移——
  `tests/{run,cockpit,pack,contracts}/**/*.test.mjs` → `*.spec.mjs`；门禁自身 → `tests/checks/*.test.mjs`；
  `tests/vendor/*.vendor.mjs` → `*.vendor.spec.mjs`；28 个 smoke → `<target>.e2e.mjs`（真进程，10）/
  `<target>.entry.mjs`（真浏览器·profile·tarball，14）/ `<target>.support.mjs`（支援件，4）；
  `package.json` 新 `test:spec` / `test:checks` / `test:e2e` / `test:entry`，`test` = spec+checks；
  `scripts/test/run-lane.mjs` + `scripts/lib/smoke-lane.mjs` 按 registry `lane`/`tier` 选跑；
  `test-lanes` / `smoke-registry` / `smoke-oracle` 契约钉后缀与 lane。红证：根目录 spec、checks 嵌套、
  旧 `.test.mjs`、`*.e2e.mjs` 进 tests、错 lane、孤儿支援件各红。实跑：`pnpm test` spec+checks、
  `pnpm test:vendor`、lane `--list` 全绿；详见 [命名 Note](../../notes/implemented/2026-11-13-test-naming-lanes.md)。
- **2026-11-13 Wave 2 W2-4 先行片（run lock 状态矩阵）**：`tests/run/run-lock.spec.mjs` 加 3 例——坏 owner 形态（空/坏 JSON/0/负/非整数）、存活外部属主（拿锁拒绝 + onBusy 给 pid + 不覆盖 owner）、释放不存在锁幂等；单文件 7/7 绿。
- **2026-11-13 Wave 2 W2-5 先行片（方法库路径形态矩阵）**：`tests/pack/method-library-io.spec.mjs` 加 1 例——空格/CJK/多层缺席目录/空库/目录当文件；与既有 symlink/hardlink 组成 8 例路径矩阵。实跑 8/8 绿。
- **2026-11-13 Wave 3 先行片（探索技能 + 政策收口）**：新增 `.agents/skills/exploratory-verification/SKILL.md`（E1–E6、charter 七件、四态分诊、毕业判据、预算/反模式）与 `docs/guides/67-test-strategy.md`（三环/四账/五关、失败类→最低可见层、决策程序、命名命令、反模式）；`00-index` / `guides/60` / `evaluation` 接线，`docs-consistency` 技能路由补 `exploratory-verification`。实跑：`pnpm test` 97/0、`pnpm verify` 全绿。
- **2026-11-13 Wave 3 W3-2（复盘）**：新增 [探索 BUG 波复盘](../../notes/archived/2026-11-13-exploratory-bug-wave-postmortem.md)——五节（现象/为什么没早发现/根因/修复与防线/未完成），把「发现→修→忘」换成「发现→归类→类级守卫→账本→复盘」；明确 159 普查是 60 全文 + 99 关键节、C UI 未复验、hook 面未建、全量 e2e/entry 未跑。
- **2026-11-13 Wave 3 W3-7 先行片（CI 聚合）**：`.github/workflows/ci.yml` 新增书签式 `all-checks-passed`（`needs` 四 job：keyless/client-load/snapshot-replay/deploy；failure/cancelled/skipped 判红）；新增 `tests/checks/ci-jobs.test.mjs` 静态契约（needs 覆盖全 job、skip 判红、snapshot job 真跑 A/B）。红证：删一个 need → 红；还原 → 绿。with-key 可触发通道 = `.github/workflows/model-smoke.yml`（只 `workflow_dispatch`；secret 注入；`l4-lite.e2e`；缺 key preflight exit 2），契约 = [model-workflow](../../tests/checks/model-workflow.test.mjs)；本机未实跑（需凭据）。
- **2026-11-13 Wave 1 W1-5（可选层缺席）**：`lifecycle.entry` 新增断言——未装团队层的干净 profile，dump 无 `ui-agent-team`，但本包 10 行/真启动/显示面/remove 全过；实跑 `DSH_BIN=/tmp/dsh-vendor lifecycle.entry` ALL PASS（22 项）。

## 关闭条件

- Wave 0–3 的验收项全部有真实红绿证据；Top 5 类各有至少一条邻接变异红录。
- `pnpm verify` / `pnpm test` / `pnpm typecheck`（触 pack 时）/ 快照 CI 基线 / 对应慢档绿；
  未跑项分列。
- 失败类账本、资产账、证据账、探索账四份账本在场且被消费；D54 + implemented Note 与卡同变更；
  研究题与卡互链。
- 用户验收（测试/CI/验收合同触面）；审查记录（机械不跳 + 语义自审）。
