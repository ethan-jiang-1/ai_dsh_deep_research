---
status: 已定性
opened: 2026-11-10
---

# 偏好层：搜索倾向与偏好的数据结构

> 状态：已定性
> 问题：一次研究 run 的「搜索倾向 / 研究偏好」应该收束成哪些对象、字段、引用与不变量；怎样让同一套框架适配不同倾向，而不是每来一种倾向就加字段/加代码。
> 消费者：本轮 presets 设计推演（用户 2026-11-10 直派）；落地 = [issue 2026-11-11-preference-protocol-layer](../../settled_issues/2026-11-11-preference-protocol-layer.md)。
> 产出的卡：[推敲：偏好层落成 Protocol（研究设计）数据层 + 表达层](../../settled_issues/2026-11-11-preference-protocol-layer.md)
> 结论：v1 = `protocol.json`（method / source_scope / effort / output / gates / deviations）+ `question.md` 5 行投影 + 纯判据 gate + `run-accept` 第四道；**lens 留在 topics.md（D43）、plan 不加 cell 列、method-library 不动 schema、Brief 不独立成对象、style 留 v2**。6/12/12 节点带按盘上实测收口；六项原始 + 五项新增结构选择 + 三条边界修正逐项有结论（见核验材料 §5/§10）。
> **表达层补篇（2026-11-11）**：数据层之外还缺「设计被读出来」的四个时刻——HITL1 卡 / 派发 / critic / HITL2+final。v1 追加五个派生投影 + 四条规则；并反推两条数据层澄清（复合方法 = 主方法 + adjustments、`approval_basis`）。详见[表达层补篇](2026-11-11-preference-protocol-expression.md)。
> 归档：2026-11-11（落地卡已结、D46 + implemented Note 成立，无活跃消费者）

## 研究问题

1. 现在的偏好/搜索配置散在哪些文件，各自实际回答什么，冲突时谁说了算？
2. 一个「解析后的研究设计」最少需要哪些对象与字段，才能同时表达方法、来源、证据面、投入、输出与门？
3. 哪些数据该 typed、哪些该留 prose；哪些可机检、哪些只能人审？
4. 新搜索倾向（官方核查 / 学术综述 / 一线全景 / 监管对比 / 时间线）如何只加条目、不改 schema？
5. 版本、哈希、批准与执行记录如何保证「用户批的设计」没有被静默改掉？

## 边界

- 这是设计提案，不是已落地合同；不改手册、preset、模板或门禁。
- 不讨论角色 persona、run 执行细节、报告内容质量；只讨论偏好/搜索配置层的数据结构。
- 外部产品名不进入 schema；外部证据只用于验证「这个维度真实存在」。
- 不新增角色，不新增调度器；Protocol 吸收的是已有字段，不是新轴。

## 本方向上下文

- **问题**：搜索倾向/偏好如何从「散落字段 + 散文」变成「可解析、可审、可扩的数据模型」。
- **当前结论（2026-11-11 收口）**：方向仍是「一个解析后的研究设计」（Protocol），但 v1 只拥有
  **method / source_scope / effort / output / gates / deviations** 六个 typed 面；lens 留在
  `topics.md`（D43）、plan 不加 cell 列、method-library 不动 schema、Brief 不独立成对象、style 留 v2。
  理由与实测 = [核验与收口](2026-11-11-preference-protocol-verification.md) §3–§5。
- **长期模型（不是 v1 实现）**：Brief（用户意图）→ Protocol（解析设计）→ Plan（执行）→ Record（事实），
  外加 Library（跨 run 默认）与 Catalog（可枚举零件）。v1 先落 Protocol + Record 的引用；Brief 继续住
  `question.md` 三节；Library 继续四字段；Catalog 先为闭集，不建目录。
- **第四遍补（style）**：style 不是新轴，是**命名 Protocol + 验收合同**（promise / means / acceptance /
  not_for）；增量 = style catalog + `style_ref` + `gates.profile`。**本卡不做，v2 独立卡**；证据与六个原型 =
  [external-landscape 第四遍](../../../research/external-landscape/2026-11-10-landscape-style-space.md)。
- **落点（how 材料 + 核验修正）**：v1 = `protocol.json` canonical + `question.md` 5 行投影 + 纯判据 gate +
  `run-accept` 第四道；不新增 host 工具、不改 session schema；旧 bundle 按 epoch 豁免。HITL1 卡是 5 维度压缩
  （问题 / 方法+来源 / 投入+输出 / 决定 / 授权；见表达层补篇），不是 5 行整张卡（5 行本身 138 字，加问题/业务简报/指针会破 200）。
- **口径（2026-11-11 校正）**：`cell = {topic, lens}` 是覆盖单位；`node = {cell, depth, ...}` 是执行单位。
  这不是「提议修正」，而是 D43 / `design/30:20` / `research-planning:54,63` 已落地的事实；旧共享上下文的
  `topic × lens × depth` 是陈旧句（已在 [research/README](../../../research/README.md) §5 校正）。
- **表达层补篇（2026-11-11）**：数据层只解决「有没有可审对象」；对象还要在四个时刻被读出来
  （HITL1 卡 / 派发 / critic / HITL2+final）。实测缺口：卡上来源类型仅 1/6、派发方法名 0/53、
  HITL2 引用设计 0/6、final 写方法名 17/59、写偏离 0/59。v1 增五个派生投影 + 四条规则；
  并反推两条数据层澄清（复合方法 = 主方法 + adjustments、`approval_basis`）；cockpit 与 output 机检留 v2。
  见[表达层补篇](2026-11-11-preference-protocol-expression.md)。
- **lens / plan 边界**：lens 的家 = `question.md - 本次视角:` + `topics.md lenses:`（D43）；Protocol v1
  不写 `lens_plan`，gate 从 topics 汇总 cells。`plan.md` 保持「lens 不写 plan 列」+ `## lens 与 activation`。
- **材料**：[数据模型](2026-11-10-preference-protocol-data-model.md)（实体、字段、schema、不变量、解析规则、
  迁移路径、未决选择；**含已被核验修正的提案**）；[怎么落](2026-11-10-preference-protocol-how.md)（落点对比、
  DSH 习惯用法、resolver、HITL1 投影、门与迁移、试点判据）；[核验与收口](2026-11-11-preference-protocol-verification.md)
  （盘上实测、17 条事实核验、结构选择结论 11 项 + 3 条边界、v1 合同、三个倾向纸面跑、未决 3 项）；
  [表达层补篇](2026-11-11-preference-protocol-expression.md)（7 个表达面的实测、5 个缺口、v1 表达合同 = 5 投影 +
  4 规则、两条数据层澄清；**v1 合同修订提案**，未改 pack/门禁）。
- **上游**：[external-landscape 第三遍](../../../research/external-landscape/2026-11-10-landscape-preference-layer.md)（外部维度验证；
  不进 schema）；[第四遍·style 空间](../../../research/external-landscape/2026-11-10-landscape-style-space.md)（style = 命名 Protocol +
  验收合同；`style_ref` + `gate_profile` 建议）。
- **完成判据**：已满足——原始六项 + 新增五项 + 三条边界有结论（核验 §5）、数据字典与 v1 不变量稳定（§6）、三个倾向在
  v1 字段上纸面跑通（§7）、v1 落点与试点判据可执行（§6/§9）；表达层五个投影与四条规则有落点与 issue delta
  （补篇 §5/§9）。不要求本轮实现。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-preference-protocol-data-model.md](2026-11-10-preference-protocol-data-model.md) | 数据模型：Brief / Protocol / Plan / Record / Library 的字段、引用、不变量、解析规则与迁移（提案，部分被核验修正） | 2026-11-10 |
| [2026-11-10-preference-protocol-how.md](2026-11-10-preference-protocol-how.md) | 怎么落：protocol.json + 投影 + 纯判据 gate + DSH 习惯用法 + 试点判据（提案，部分被核验修正） | 2026-11-10 |
| [2026-11-11-preference-protocol-verification.md](2026-11-11-preference-protocol-verification.md) | 核验与收口：盘上实测、17 条事实核验、结构选择结论 11 项 + 3 条边界、v1 合同、三个倾向纸面跑、试点判据 | 2026-11-11 |
| [2026-11-11-preference-protocol-expression.md](2026-11-11-preference-protocol-expression.md) | 表达层补篇：卡 / 派发 / review / HITL2 / final 头的实测与缺口、v1 表达合同（5 投影 + 4 规则）、复合方法与 `approval_basis` 两条数据层澄清、对 issue 的 delta | 2026-11-11 |
