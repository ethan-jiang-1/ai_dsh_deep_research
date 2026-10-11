---
topic: company 钉版漂移复核（59551f2→b19e9ed）
intent: 为 company 钉版行的再次前进提供逐提交判定与重钉依据（五簇全维持、证据锚零腐烂，重钉 b19e9ed）。
---

# company 钉版漂移复核（2026-10-10）

> 服务 = [2026-10-09 钉版复核 Note](../../../notes/implemented/2026-10-09-company-repin-review.md)
> 的下一轮（钉版纪律：不一致即"上游已前进、结论待复核"——本轮清偿）。
> 方法 = 只读（company 侧 log/diff/show，本仓侧 grep/read，双方零写入）；
> 漂移面 = `59551f2..b19e9ed`（7 提交 / 79 文件 / +2552 −298）。

## 逐提交归类

| 提交 | 归类 |
|---|---|
| 1e6ed05 docs(backlog) | backlog 收口（member-stale-write 验收留证 + FS_NOT_OBSERVED 归因校正，纯 _backlog/） |
| 67fc017 feat(probes) | 探针 + bug 收口（BUG-007 双成员同轮 read 屏障，证据带 harness spec） |
| bbda05f feat(probes) | 探针（认领让位对照：owner-bound 败者零写 + shared 正对照，真模型 8/8） |
| 74d43ba docs(backlog) | backlog 归档迁移（协作安全卡收口，15 文件移动 + 链接修正） |
| bfa893e docs(合同) | **合同类逐字读**：company-workspace/AGENTS.md 补「认领失败让位 + owner-bound 仅 owner/显式改派可覆盖」；docs/multi-human.md 同款两条 |
| 18f15c9 feat(pack) | 纯品牌更名（wochen→梦之队，29 文件；亲读 client/presets/presence 部分全为行数中性换字） |
| b19e9ed feat(手册+scan) | **手册 diff 逐字读**：company-workspace/AGENTS.md 新增「事实阻塞闸门（HITL）」⑤条 + 状态枚举扩「待补料」；其余 ~700 行为运行产物入库（非合同） |

## 三问结论

1. **五簇立论全维持**（D3/D16 维持且强化——新增三条协作边界事实均为补强；preset 教义/门禁范式/client-face 经亲读核实结构零变化，18f15c9 全部行数中性换字）；
2. **证据锚零腐烂**：本仓引用的 `checks/run-gates.mjs:99–117`（handbook-budget 形态出处）与 `docs/release.md §发布冒烟` 在整个区间**零 diff**，HEAD 实测锚逐字有效；连带核对 snapshots 分析的密集行号锚均不漂；
3. **吸收候选（登记不实施）**：① 事实阻塞闸门 HITL（高价值——「待补料」机器可查枚举 + 依赖链整链禁标完成，可入本仓 run 门禁面一张卡）；② 认领让位/owner-bound 覆盖权（中——多人共编面才兑现）；③ BUG-007 read 屏障（中低——作 team-preflight 探针判读注意项：stale 拒写后的 FS_NOT_OBSERVED 按归因校正表读）。

## 品牌更名核对

本仓全仓 grep 旧品牌字面仅 1 处（anatomy note:43 显名例）——已同 diff 加时点注记（保留当时实形态，不重写历史）。

## 重钉动作（已落地）

00-index company 行 `59551f2 → b19e9ed`（复核时点 HEAD；非 18f15c9——钉在复核时点，避免重钉即再落后）。

## 方法诚实边界

逐 diff 亲读 = bfa893e 全部、18f15c9 的 client/presets/presence 部分、b19e9ed 手册 diff、checks/README.md 索引行；归类推定 = 18f15c9 其余 ~20 文件（标题 + numstat 行数中性 + 抽查 3 处）、b19e9ed 运行产物、67fc017/74d43ba/1e6ed05 按标题归类；company 自述测试绿未复跑（纯只读复核）；「维持」= 未发现反证，非全量逐字复核。
