---
status: 已定性
opened: 2026-11-10
---

# 探针凸显化：本仓探针为何被埋没、怎么借鉴

> 状态：已定性
> 问题：本仓已有 `scripts/probe/` 与五支探针，但 fresh agent 与维护者想不起来用、也看不出覆盖与边界；如何借鉴 `ai_dsh_company` 的探针体系，把探针迁到根 `probes/`（用户 2026-11-10 定调），同时不引入 68 支探针 / 65 道门？
> 消费者：用户 2026-11-10 直派「把它凸显化」；产出卡 = [2026-11-10-probe-surfacing](../../issues/2026-11-10-probe-surfacing.md)。
> 产出的卡：[2026-11-10-probe-surfacing](../../issues/2026-11-10-probe-surfacing.md)（根 `probes/` + 生成索引 + 头注/索引门 + 技能）
> 结论：**有探针，没有「探针这件事」**——发现链只有根布局一个括号短语 + 手维护表；头注无 `状态`/`何时跑`，无索引、无门。借鉴 company 的四件组织机制（根 `probes/`、生成索引 + 字节级新鲜度门、`状态`/`何时跑` 头注门、失败面地图），再用任务路由 + 技能补 company 自己也没有的「想不起来用」。探针不是第六个评估面，是 L1/L4 的证据工具。**S1 已落地（2026-11-10）**：根 `probes/` 按 harness 分 behavior/browser/stream 三域，索引、`probe-registry` 门、guides/66 与 `using-a-probe` 技能已交付；实现记录 = [Note](../../../notes/implemented/2026-11-10-probe-surfacing.md)。
> 归档：—

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-external-probe-model.md](2026-11-10-external-probe-model.md) | ai_dsh_company 探针体系的机制审计：组织、索引、头注门、发现链、实际缺口与不可照抄项 | 2026-11-10 |
| [2026-11-10-probe-surfacing.md](2026-11-10-probe-surfacing.md) | 本仓现状、缺口 G1–G8、借鉴决策、根 `probes/` 迁移面、S1/S2/S3 方案、验收与风险 | 2026-11-10 |

## 证据评审

- 外部事实由第二个只读审计复核；纠正三处 playbook 式误读（索引落点、头注门强制字段、
  生命周期未行使）——详见材料 §8 与外部审计 §3。
- 本仓锚点逐条核过；未实跑探针、未实施、未做冷读测量，后者列为 S1 验收项。
- company 当前 HEAD `7326271d64` 与 [外部材料登记](../../../docs/external-materials.md) 钉的
  `bf76d36` 不一致：本轮按未重钉借鉴记录，实施前补身份。
