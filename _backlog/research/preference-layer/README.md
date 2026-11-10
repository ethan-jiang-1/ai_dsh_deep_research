---
status: 调研中
opened: 2026-11-10
---

# 偏好层：搜索倾向与偏好的数据结构

> 状态：调研中
> 问题：一次研究 run 的「搜索倾向 / 研究偏好」应该收束成哪些对象、字段、引用与不变量；怎样让同一套框架适配不同倾向，而不是每来一种倾向就加字段/加代码。
> 消费者：本轮 presets 设计推演（用户 2026-11-10 直派）；后续落地评审。
> 产出的卡：—
> 结论：—（设计提案见材料；待 §11 的六个结构选择拍板）

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
- **当前结论**：缺的不是更多字段，而是一个「解析后的研究设计」对象（Protocol）。模型 = Brief（用户意图）→ Protocol（解析设计）→ Plan（执行）→ Record（事实），外加 Library（跨 run 默认）与 Catalog（可枚举零件）。搜索倾向 = 命名 Protocol 模板；偏好 = 本次 run 对 Brief/Protocol 的覆盖；新倾向 = 新 catalog/library 条目。
- **第四遍补（style）**：style 不是新轴，是**命名 Protocol + 验收合同**（promise / means / acceptance / not_for）。对本模型的增量 = ① style catalog 条目（含 promise/not_for/failure_modes/search/evidence/synthesis policy）；② Protocol 可选 `style_ref`；③ `gates.profile` 按 style 选验收套件。v1 不改 schema；v2 先做 fact_check / literature_review 两个 profile。证据与六个原型 = [external-landscape 第四遍](../external-landscape/2026-11-10-landscape-style-space.md)；不是已拍板项。
- **落点（how 材料）**：v1 用 `protocol.json` canonical + `question.md` 5 行投影 + 纯判据 gate；不新增 host 工具、不改 session schema；旧 bundle 按 epoch 豁免。`question.md-only` 保留为备选。
- **口径**：`cell = {topic, lens}` 是覆盖单位；`node = {cell, depth, ...}` 是执行单位——这是对本仓现有「cell = topic × lens × depth」的**提议修正**，未改共享上下文。
- **材料**：[数据模型](2026-11-10-preference-protocol-data-model.md)（实体、字段、schema、不变量、解析规则、迁移路径、未决选择）；[怎么落](2026-11-10-preference-protocol-how.md)（落点对比、DSH 习惯用法、resolver、HITL1 投影、门与迁移、试点判据）。
- **上游**：[external-landscape 第三遍](../external-landscape/2026-11-10-landscape-preference-layer.md)（外部维度验证；不进 schema）；[第四遍·style 空间](../external-landscape/2026-11-10-landscape-style-space.md)（style = 命名 Protocol + 验收合同；`style_ref` + `gate_profile` 建议）。
- **完成判据**：六个结构选择有结论 + 数据字典与不变量稳定 + 至少一版 Protocol 投影能在纸面上跑通三个不同倾向 + 一条可执行的 v1 落点（`protocol.json` + gate + 5 行投影）与试点判据；不要求本轮实现。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-preference-protocol-data-model.md](2026-11-10-preference-protocol-data-model.md) | 数据模型：Brief / Protocol / Plan / Record / Library 的字段、引用、不变量、解析规则与迁移 | 2026-11-10 |
| [2026-11-10-preference-protocol-how.md](2026-11-10-preference-protocol-how.md) | 怎么落：protocol.json + 投影 + 纯判据 gate + DSH 习惯用法 + 试点判据 | 2026-11-10 |
