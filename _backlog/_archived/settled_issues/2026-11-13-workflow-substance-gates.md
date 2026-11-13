---
status: 已结
opened: 2026-11-13
---

# 推敲：把加工环路的「实体检查」显性化——判据形状字段 + 收口门

> 立卡：2026-11-13 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是
>
> **一句话**：本仓不缺「判据不猜」的原则，缺的是让原则落地的**字段和门**——设计期把判据的
> 权威输入/歧义行为写成必填格，收口期把「Note 早写 / 卡关而行为未停」变成机械红，bug 通道把
> 「同类第 N 次」变成必答。三次独立审计的证据 = [research](../../research/workflow-substance/README.md)。
>
> 结论：判据形状字段 + Note 同节 + 两道收口门（Note 早写、暂存区配对）+ 复发必答 + 判据测试负例 +
> 金标准理由全部落地；D52 入台账，gates-smoke 108 案例全绿。
> 去向：implemented — [Note](../../../notes/implemented/2026-11-13-workflow-substance-gates.md)
> 授权：用户 2026-11-13 直派「真正执行它」；业务验收 = 本轮 diff 与 Note 待用户复核。
> 审查：机械门禁全跑（verify/test/typecheck/gates-smoke + 新门一次性红录）；语义自审逐条对验收。

**问题与期望结果：** 最近两天 68 张 bug 卡里，大量是「同一判据的第 2–4 次修复」（readiness 4 轮、
HITL2 7 张、方法库 heading 一串）。三次独立审计（fresh-agent 冷启动 / D51 真实链路 / 五类失败对照）
给出同一结论：**五类失败都有成文规则，但机械门只查「非空 / 节名 / 标题 / 状态」，一句合格散文即可
满足**；fresh agent 在读到 `evaluation §判据形状` 之前，会自然地写出 §判据形状 明文禁止的 grep 门禁。
期望：把「判据形状」变成设计卡的必填格；把两处「收口自觉」变成机械红；把 bug 复发变成必答。

**当前情况：**

- 原则已在：`docs/evaluation.md` §判据形状、`writing-a-gate` 的「先想红」、`tests/AGENTS` 的反证义务、
  `notes/AGENTS` 的取代检查、`guides/60` 脚注①的「金标准只许重写」。
- 拦不住的原因：`backlog-liveness` 只查 `## 落地记录（2026-11-13）

- **F1**：`_backlog/methods/judgment-design.md`（四格 + 矩阵维度 + 三问 + 两例，入 methods 索引）；
  issue/RFC 模板 `## 判据形状`；`tests/AGENTS` 判据测试规则；bugs 复发必答；`guides/60 §2` 任务行；
  `writing-a-gate` 与 `evaluation §判据形状` 指针。
- **F2**：`backlog-liveness` 拦 Note 早写（2 例）；新门 `staged-change-pairing`（归档卡↔Note、
  expected↔lastRewrite；6 例 + 一次性真红录）；`--update-expected --why` + `snapshot.json.lastRewrite`。
- **F7**：`guard-red-record` 扩到 `*conformance*`（含 gates-smoke 新案例）。
- **D52** 入 decisions；evaluation §L0 台账 + gates 数组 + NO_CASE 登记；notes 层去除 backlog 状态机依赖。
- **证据**：`verify` 全绿、`test` 1400 / 0、`typecheck` 绿、`gates-smoke` 108 案例全绿。

## 判据形状

- **权威事实**：卡片/Note 的显式节（人写）+ git 暂存索引（机器）+ `snapshot.json.lastRewrite`。
- **读取方**：`backlog-liveness` / `staged-change-pairing` / `guard-red-record` / 评审。
- **坏输入**：缺节 → 评审退回；目标 Note 早存在 → 红；归档卡目标不在暂存集 → 红；
  `lastRewrite.why` 空/载体不存在 → 红；暂存区为空 → 无对象。
- **旧形态**：无（新规则；旧卡 grandfather，不追改）。
- **反证**：`backlog-liveness` 2 例、`staged-change-pairing` 6 例 + 真红录、`guard` 案例、`gates-smoke`。

## 验收标准/修复判据` 非空；`note-format` 只查骨架；
  `guard-red-record` 只由「标题带 BUG-nnn」触发。散文规则 → 形态门，中间没有字段。
- 实证（详见 research §2）：D51 这次真实链路有 **6 处违反自己的规则**而零门禁拦截——Note 在立项
  即写成 implemented、D51 禁兼容分支而代码保留散文回退、8 个冲突 bundle 未删未登 trigger、归档索引
  表被插坏、卡 II 未等用户验收、归档后仍改行为且基线三改。其中 3 处是形态/时机问题，可机械拦。
- 冷启动审计还抓到两个**实现层的 fail-open**（互斥散文 + 声明 PASS 仍放行；重复键 JSON 取末值），
  已修并留负例（`md-liveness` 之外的独立证据，记在 research §1.4）。

**未决问题：**

- F2 的两道收口门落 `backlog-liveness`（L0）还是 pre-commit（staged 集）？前者能查工作树形状，
  后者能查「同一次提交」，两者覆盖不同；建议：Note 早写 → L0；卡与 Note 同提交 → pre-commit。
- 这些改动触及门禁与验收合同，落地时是否登记 D52（`docs/decisions.md`）并在 `evaluation §L0`
  台账登记？建议登记，否则下一次「加门禁」又会找不到 Java。
- `## 判据形状` 的触发条件：按 `类型`（Feature/Task）分不干净（近期 19 张 Task 里也有判据改动）；
  建议作者自声明「本卡引入/修改判据」才必填，并在评审时核对。

## 方案与取舍

| 方案 | 做法 | 判定 |
|---|---|---|
| A 字段 + 收口门 | 设计卡加 `## 判据形状`；两道既有门加判法；bug 卡加复发必答 | **选**：最小、落在既有载体，不新建体系 |
| B 只写一份「判据设计」文档 | 新 guide/method，无字段无门 | 不选：fresh agent 已实证「读不到/读到了也会晚」；文档只会变成作文 |
| C 改动面 → 必跑面对账门 | 把任务路由表变成机读，自动查「该跑的面跑没跑」 | 暂缓：方向对，但要把路由表变成 manifest，成本高；先做 A，C 单独立项 |

**输掉的细节**：把所有 Note 写长（噪声，不解决问题）；给「判据」加新状态/新队列（D20 禁）；
用 grep 门禁禁止关键词表（`evaluation` 明文「不另造 grep 门禁」——判不出「有没有在猜」）。

## 分片

- **F1 文档/模板（keyless，无门）**：`_backlog/methods/judgment-design.md`（一页：四格 + 矩阵维度 +
  三问 + 两例）；issue 模板与 `validation-design` 加 `## 判据形状`；`notes/AGENTS` 的 implemented/RFC
  骨架加同名节（仅判据类）；`tests/AGENTS` 加「判据测试 = 不变量 + 变异矩阵」；bugs 模板的
  `## 牵出的失败类` 加复发必答；`writing-a-gate`、`guides/60 §2` 门禁行、`evaluation §判据形状`
  各加一行指针到 method。
- **F2 收口门（机械，需 D52）**：
  1. `待落地` 且 `去向：implemented` 的 inline 路径文件已存在 → `backlog-liveness` 红（拦 Note 早写）；
  2. 卡 `git mv` 进归档池而 `去向` 指向的 Note 不在同一 staged 集 → pre-commit 红（拦「卡关而行为未停」）；
  3. `--update-expected` 必带 `--why <载体>`，写入 `snapshot.json` 的 `lastRewrite`；expected/snapshot
     变更而理由空/载体不存在 → 红。
- **F3 暂缓**：改动面 → 必跑面对账门（research §3 的 B）；登记 trigger，不本轮做。

## 验收标准

| # | 行为 | 类 | 判据 | 证据 owner |
|---|---|---|---|---|
| 1 | 判据设计有必填四格 | 确定性逻辑 | `judgment-design.md` 在 methods 索引；issue 骨架与 RFC 进门条件含 `## 判据形状`；guides/60 §2 任务行与 `writing-a-gate` 各有一行指针 | `tests/contracts/navigability` 或文档门 + 人审 |
| 2 | 判据类 Note 毕业须有 `## 判据形状` | 确定性逻辑 | `notes/AGENTS` 规则 + 模板；缺节 = 不毕业（评审判据，或 `judgment: true` 时 `note-format` 红） | `note-format` / 评审 |
| 3 | Note 不许早写 | 确定性逻辑 | 合成卡：`待落地` + `去向：implemented` + 目标文件在场 → `backlog-liveness` 红；真卡绿 | `gates-smoke` 注入案例 |
| 4 | 卡关与 Note 同提交 | 编排 | 只暂存卡移动、Note 未暂存 → pre-commit 红；同暂存 → 绿 | pre-commit 测试 / 一次性注入红录 |
| 5 | bug 复发必答 | 确定性逻辑 | 第 2 次同机制：`## 牵出的失败类` 必含「类修 / 实例修 + 理由」；缺 = 红或评审退回 | `backlog-liveness` 或评审 |
| 6 | 金标准重录带理由 | 确定性逻辑 | `--update-expected` 无 `--why` → 退出 2；`snapshot.json.lastRewrite` 在场；expected 变更无理由 → 红 | `replay-scene` 测试 + `gates-smoke` |
| 7 | 判据测试形状 | 确定性逻辑 | `tests/AGENTS` 规则；新判据测试带不变量+矩阵与负例（`guard-red-record` 扩到显式声明） | `tests/contracts` |

**排除项**：不改 vendor；不新建队列/状态；不给所有 Note 强制加节；不做 F3；不造 grep 门禁。

## 关闭条件

- F1 全部落地、F2 三道门有红先绿后的实录并登记 D52 + evaluation §L0；F3 登 trigger。
- Note 与卡同变更；用户验收（门禁/验收合同 = 触面）。
- `pnpm verify` + `pnpm test` 绿；归档同变更。

## 与已有载体的关系

- 原则 = [D51](../../../docs/decisions.md#d51) + [evaluation §判据形状](../../../docs/evaluation.md#verdict-shape)；
  本卡只做「让原则有字段和门」，不改原则。
- 证据 = [research](../../research/workflow-substance/README.md)；
- 已两处修复（互斥散文 / 重复键）= `b64d170b`，负例在 `tests/run/readiness-declaration.test.mjs`。
