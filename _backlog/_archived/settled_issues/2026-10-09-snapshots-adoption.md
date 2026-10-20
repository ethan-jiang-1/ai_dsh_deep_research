---
status: 已结
opened: 2026-10-09
---

# 推敲：为插件研发确定 snapshots 的首批落点

> 立卡：2026-10-09 ｜ 状态：已结（实施与验收见 §结论；去向 = [snapshots 采纳 Note](../../../notes/implemented/2026-10-09-snapshots-adoption.md)） ｜ 类型：Task ｜ 可关闭：是

**问题与期望结果：** 已研究 company/DSH snapshots 机制，但本仓还没有确定要把哪些插件研发证据资产化、如何让场景声明由实际 consumer 验证，以及首批回放的验收范围。期望形成一个最小、可执行的落地切片，避免只增加目录或流程。

**当前情况：** [来源分析与本仓建议](../research/2026-10-09-company-snapshots-analysis.md)已对照五类证据、场景完整保存、实际运行与独立期望、consumer 与 replay eligibility，并建议迁入现有四角色 research-face 回放资产及修 BUG-018。报告不是实施授权。立卡时 fixture 在 `tests/fixtures/snapshot-research-face/`，其 `snapshot.yml` 尚未被 replay smoke 消费；BUG-018 记录了 system/message 注入漏比较。

**未决问题：** 首批是否只限 replay 场景和四角色 fixture？是否把 BUG-018 修复纳入同一切片？场景 manifest 最小字段应有哪些，如何从声明直接驱动 replay？探针证据先不迁入是否符合预期？

**下一步：** 按报告建议，由用户确认切片范围；范围明确后定义迁移前后的入口、实际 consumer 和通过判据，再实施并运行回放验证。

## 已知与未决

来源仓 snapshots 是完整场景证据库；固定模型流回放不证明真实模型行为。`workspace.expected` 只有在独立编写且被判据消费时才是 oracle。结构/资格声明本身不能证明场景当前运行通过。

本仓现有四角色 smoke 未读取场景 manifest，当前 B 层比较也漏掉 user/message 注入。改目录名不会自动修复这些覆盖问题。

## 方案与取舍

- **推荐候选：** 根 `snapshots/replay/research-face/` 承载整组四角色回放证据，manifest 由 smoke 读取；普通单元测试夹具和研究 run archive 留在现有 owner。探针证据只在存在持久消费者时精选收录。
- **不采纳：** 先建五类空目录或复制 company 全套归档流程。当前没有对应消费者，增加结构会形成第二份状态或治理负担。

## 关闭条件

- 用户确认首批范围和 BUG-018 是否纳入。
- 对选定范围列明每个资产的 owner、消费者、manifest 字段和可证明边界。
- 实施后从默认入口执行真实四角色回放并通过；manifest 缺失/误配的反例能被 consumer 或结构检查拒绝。
- 不将 canned replay 描述为真实模型行为证明；未运行的层次明确标为未验证。

## 结论（2026-10-09 实施）

用户确认首批 = 四角色 replay 切片，含 BUG-018 修复与 manifest 实际消费；探针、其他证据分类与
CI/pre-commit 接入不在范围内。落点与验收记录 = [snapshots 采纳 Note](../../../notes/implemented/2026-10-09-snapshots-adoption.md)：

- **owner / 消费者 / 字段 / 边界**：场景证据层 owner = [snapshots/README.md](../../../snapshots/README.md)；声明字段与
  消费者 = `snapshot.json` → [replay-scene](../../../scripts/lib/replay-scene.mjs) → [snapshot-replay-smoke](../../../scripts/smoke/snapshot-replay-smoke.mjs)；
  可证明边界 = 固定转录下的装配/循环/日志与已声明效果，不含真实模型行为。
- **反例**：manifest 缺字段、串角色、缺件、越界/symlink 路径、重复 fixture、缩减判据集均在加载期被拒
  （案例 = [replay-scene.test.mjs](../../../tests/run/replay-scene.test.mjs)）；比对面单测与"基线外注入种类即红"守卫见
  [replay-request.test.mjs](../../../tests/run/replay-request.test.mjs)。
- **默认入口真实回放**：`source dev/env.sh && node scripts/smoke/snapshot-replay-smoke.mjs` 四角色
  A + B 判据 + coverage 自守 + lead 渲染金标准通过（`pnpm verify` / `pnpm test` 同轮绿）。
- **BUG-018** 已修复并归档（[fixed_bugs 卡](../fixed_bugs/BUG-018-snapshot-replay-advertised-coverage.md)）；
  未跑层次（真实模型行为、探针/视觉证据）在 Note 中明确标为未验证/未建立。
