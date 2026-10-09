---
status: 已结
opened: 2026-10-09
---

# 推敲：guard-red-record 本仓化——把 tests 面的反证义务机械化

> 立卡：2026-10-09 ｜ 状态：已结——门禁落地（双址 + 负例/夹具留证二选一 + 防空语料），存量盘点 = 7 文件 14 条标题声明**全部逐件补真留证、零豁免**（清单：ask-drive〔004/005/015/017〕· hitl-fold〔002〕· hitl-provenance〔014/017〕· local-date〔017〕· node-gate〔006 夹具形态〕· presets〔008/006/005〕· run-state〔005/007〕）；证据与去向 = [guard-red-record Note](../../../notes/implemented/2026-10-09-guard-red-record.md) ｜ 类型：Task ｜ 可关闭：是

**问题与期望结果：** 本仓"新契约测试带反证"是散文义务（[tests/AGENTS](../../../tests/AGENTS.md)「同 diff 注入回归看红……只交付绿 = 不知道测试会不会咬人」），verify 门禁面已被 gates-smoke 机械化到超出 company 水平，但 **tests 面无任何机械**——[ask-drive.test.mjs](../../../tests/ask-drive.test.mjs) 标题已带 BUG-004/005/015/017 守卫声明，红配方只在头注散文与夹具里，走没走没人拦。期望：标题声称守卫具体事故（BUG-nnn）的测试必须交出**可复核的红配方**，散文义务变机械面。

**当前情况：** 出处 = [company 钉版复核 Note](../../../notes/implemented/2026-10-09-company-repin-review.md)（候选①，三路复核一致排最高价值）。company 原版（`checks/run-gates.mjs` guard-red-record，commit 5c050ea）：spec 标题带 BUG-nnn ⇒ ①事故卡路径可解析（悬空编号红）②文件内有「负例留证」块逐编号对齐；其自认边界 = 只证明红法写在旁边，不证明留证是真的。本仓 verify 面的 gates-smoke 是**真注入真红**，更强；本卡要把同等强度带到 tests 面。

**未决问题：**
1. **BUG 卡双址**：本仓活跃卡住 `_backlog/bugs/`、已修卡住 `_backlog/_archived/fixed_bugs/`——解析时两址并查（company 只认归档址）；
2. **判据源**：node:test 的 `test('...')` 标题串（对应 company 的 spec 标题）；
3. **留证形态**：负例留证块（散文）**或** 永久夹具案例在场，二选一即可——本仓已有「夹具语义由消费它的契约测试钉住」惯例（node-gate/schema-scan 即永久反证记录），不必逼所有测试养散文留证；
4. **存量处置**：先盘点哪些 `tests/*.test.mjs` 标题带 BUG 声明（已知 ≥ ask-drive 四处）——逐个补留证，还是 grandfather 豁免存量只管增量？（倾向：盘点后按件决，豁免要留理由。）

**下一步：** 用户确认范围后按验收标准实施（改动面 = verify.mjs 新门禁 + evaluation.md 台账 + gates-smoke 案例 + 存量盘点处置）。

## 方案与取舍

- **推荐候选**：新 L0 门禁 `guard-red-record`（扫描 tests/*.test.mjs 标题串 → BUG-nnn 声明 → 双址解析 + 留证/夹具二选一在场断言）+ gates-smoke 常驻反证案例。
- **不采纳**：照搬 company 单址解析与纯散文留证（对齐本仓双址现实与夹具惯例）；把红证做成"真注入"级（对每条历史 BUG 真注入一次成本过高——留证块/夹具的静态对账够用，真注入义务留给新门禁自身的反证）。

## 关闭条件

- 门禁落地且反证实录（注入"带声明无留证"→ 红 → 还原 → 绿），登记 [evaluation.md §L0](../../../docs/evaluation.md) 台账 + gates-smoke 案例；
- 存量盘点结论落卡（补齐/豁免逐件带理由）；
- `pnpm verify` / `pnpm test` / `gates-smoke` 全绿。

## 验收标准

| 判据 | 检查方式 |
|---|---|
| 带 BUG-nnn 声明却无留证/夹具 → 红 | 新门禁注入回归（先红后绿实录） |
| 悬空 BUG 编号 → 红 | 同上 |
| 双址（活跃/归档）都能解析 | 契约用例各一 |
| 存量声明全有着落 | 盘点清单 + 逐件处置记录 |
