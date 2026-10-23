---
status: 推敲中
opened: 2026-10-23
---

# 推敲：run 终稿缺面向人的可读层

> 立卡：2026-10-23 ｜ 状态：推敲中 ｜ 类型：Task ｜ 结论倾向：未定 ｜ 可关闭：否

**问题与期望结果：** `final.md` 现在是 **Agent/审计面**的 canonical：来源链、`as-of`、证据等级、
判定表、版本账、内部知识地图、修复记录都在正文里。对复核是必要的，但普通读者读不懂——用户
2026-10-23 直接反馈“这是一团糟”。期望：交付里有一份**面向人的可读终稿**，让非专家能直接读懂
结论、理由、影响和不确定性；同时不牺牲 `final.md`/`final/vN` 的可追溯性。

**当前情况：** 以
`research-workspace/drt_cn-us-ai-models-hardware/final.md`
为证据：§0 决策摘要已经比正文易读，但仍带 `[来源:]`、as-of/等级、判定表、版本与内部地图；全文
427 行，读者需要先懂这套研究结构。bundle 里没有任何 reader-facing 产物；HITL2 和交付都只看
`final.md`/`final/vN`。

**未决问题：** 可读终稿是独立文件，还是 `final/vN` 的第一节？名字是什么（`readable-final.md` /
`final/readable-vN.md` / 其他）？由 lead 写、从 `final.md` 派生，还是 ops/编辑层生成？一份还是
每个版本一份？读者结构是“结论→为什么→对我意味着什么→不确定性→下一步”，还是更短的一页？
哪些内容必须留在正文（反证、未取得、适用范围），哪些可以放到附录/链接？如何保证它不是第二份
事实？

**下一步：** 先按普通读者视角完整读一遍 `final.md`，列出具体不适读的段落与噪声类型；再与本卡
的流程卡（[可读终稿流程位](2026-10-23-readable-final-process.md)）一起定合同。不改 `final.md`。

## 已知与未决

- 已知：`final.md` 的引用/等级/版本对 Agent 和审计有用，不能为了“好读”删除。
- 已知：用户要的是“人能读懂”，不是“把报告缩短”。
- 未决：独立产物 vs canonical 的 reader-first 结构；交付/呈现/HITL2 的关系。

## 方案与取舍

- **A. 独立派生文件**（推荐方向）：`final.md` 保持 canonical；新增 reader-facing 副本，从
  `final.md` 派生，附录链回 canonical。优点是审计面不变；缺点是两份可能漂移，需要一致性断言。
- **B. 把 `final/vN` 改成 reader-first**：交付副本先写人话，引用/版本进附录。优点是交付物就是
  人读的；缺点是 `final/vN` 的 canonical 角色被削弱，审计要读附录。
- **C. 只改 `final.md` 的写法**：把正文写浅。缺点：审计信息被压缩，critic/审计无法复核——不做。

## 验收标准

- 一个非专家只读 reader-facing 终稿，能答出：结论是什么 / 为什么 / 什么会改变结论。
- 不新增 `final.md` 没有的事实、数字或来源；关键结论与 canonical 一致。
- canonical 仍是 `final.md`/`final/vN`；reader-facing 有版本链接和“以 canonical 为准”的说明。
- HITL2 与交付能同时看到两份，且知道哪份是审计源。

## 关闭条件

- reader-facing 的合同、位置、owner、验收在流程卡落地，并在一场真实 run 上产出；用户认可可读性。
- 或经用户拍板并入已有决定（关闭时在状态行记去向）。
