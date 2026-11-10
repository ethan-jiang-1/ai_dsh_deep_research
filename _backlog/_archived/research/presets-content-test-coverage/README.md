---
status: 已定性
opened: 2026-11-11
---

# presets/content 测试资产：借 company 仓的 coverage，不借它的目录形状

> 状态：已定性
> 归档：2026-11-11
> 问题：`packages/deep-research-pack/presets` 与 `content` 的测试资产是缺失、散落，还是已有但没被看见；`ai_dsh_company/tests` 里哪些组织方式可借、哪些不可借。
> 消费者：用户 2026-11-11 直派（“挖掘挖掘、实验实验，想明白再动手”）；测试裁决 = [已结卡](../../settled_issues/2026-11-11-presets-content-test-coverage.md)（不拆 presets.test，转 trigger）；测试资产收口 = [已结卡](../../settled_issues/2026-11-11-test-asset-coverage.md)；内容组织首刀 = [已结卡](../../settled_issues/2026-11-11-content-organization-t0.md)。
> 产出的卡：[测试组织已结卡](../../settled_issues/2026-11-11-presets-content-test-coverage.md) · [测试资产收口已结卡](../../settled_issues/2026-11-11-test-asset-coverage.md) · [内容组织 T0 首刀已结卡](../../settled_issues/2026-11-11-content-organization-t0.md)
> 结论：缺的不是目录名，是“盘上枚举资产 → 断言它被消费面点名”的 keyless 接线契约。第一刀已落：helper + 2 条 spec（11 例）+ 9 组红证；拆 323 行 `presets.test.mjs` 的提案经裁决**暂不拆**（trigger = 单文件 >500 行 / 第二个独立合同模型）；模板字段级契约与每类型 fixture 另议。内容本身的长期组织约定 = [design/70](../../../../docs/design/70-content-organization.md)。

## 上下文（fresh agent 先读）

按序读，不跳：

1. [参照仓阅读](2026-11-11-reference-reading.md)——company 仓的分区、coverage、解析式断言、独立事实源与证据边界；重点是它**不证明什么**。
2. [本仓实验](2026-11-11-our-experiment.md)——本仓测试上下文、现状盘点、九个候选不变量的实验结果、第一刀与红证、没有断言什么。
3. [已结卡](../../settled_issues/2026-11-11-presets-content-test-coverage.md)——裁决：不拆；剩余工作与 trigger 在卡上。

读完后应能回答：

- 本仓 `tests/pack/` 里哪些测试已经覆盖 presets/content，哪些没有；
- 新增的 11 条测试分别证明什么、**不证明**什么；
- 为什么不再造 `tests/presets` / `tests/content` 子域；
- 为什么没有断言“persona 提到工具 ⇒ preset 必须有行”、为什么没有断言对称 `pairs_with`；
- 下一步拆 `presets.test.mjs` 的边界与验收标准。

## 两个项目，两种性质

| 维度 | `ai_dsh_company` | 本仓 |
|---|---|---|
| 产品性质 | 多角色公司操作系统；内容本身是产品面 | 研究方法论 harness；内容 = 研究协议 |
| 内容轴 | 产品类型 × 交付模式 | 研究类型 × 题型 P1–P8 × lens × run 模板/节点 |
| 角色 | 6 经营 + 多个 support/worker | 4 研究 + 1 方法编辑 |
| 测试分区 | host / client / lib+content / presets / harness（按资产面） | run / cockpit / pack / contracts / vendor（按源面） |
| 主要失败模式 | 内容包漏件、轴漏接线、preset 挂载失败 | run 契约漂移、技能不可达、lens 不进题型、模板没人消费、模型不按纪律 |
| 证据层 | keyless tests → checks/smoke → replay → 真模型 | L0 tests → L1 挂载 → L2 安装 → L3 方法论 → L4 模型 |

结论：可借的是**“资产存在 ≠ 被消费”“解析运行时格式”“每层声明不证明什么”**；不可借的是业务轴、
目录名与测试侧角色字面量。

## 口径（本页用词）

- **接线契约（wiring contract）**：keyless 测试，断言某资产被另一个面枚举/引用/点名；它不证明运行时行为。
- **覆盖（coverage）**：从盘上枚举资产并检查消费面；不是行覆盖率，也不是“每个文件都有一条测试”的台账。
- **形状 vs 消费面**：形状 = 文件在场且自洽；消费面 = persona / 手册 / skill / 题型表 / 模板引用。
- **证据边界**：每条测试在头注写“不证明什么”，并指向 L1 挂载、L3 方法论或 L4 真模型。

## 抽象：资产图，不是资产清单

把 presets/content 看成一张有向图：

- **节点** = role / skill / lens / template / manual / 题型（P1–P8）；
- **边** = 加载、选择、引用（persona → skill、skill → skill、manual → skill、P1–P8 → lens、
  manual/persona/skill → template、research type → team-assembly / research-brief / question 模板）。

三层证据正好对应图的三个问题：

| 层 | 问题 | 本仓落点 |
|---|---|---|
| 形状 | 节点在场且自洽吗 | `preset-structure`、`content-shape`、`lenses`、`content-injection` |
| 接线 | 入边存在且目标可解析吗 | 第一刀 11 例（`presets-wiring` + `content-coverage`） |
| 行为 | 模型真的沿边走吗 | L1 真挂载、L3 方法论审查、L4 真模型 |

“覆盖”不是节点数，而是**每个节点至少有一条入边、每条边的目标存在**；孤儿 = 没有入边的节点。
第一刀主要查**入边**（资产被谁点名）与少量出边（`agentPreset` 引用）；**出边**（模板被 node-gate/verdict-audit 解析、skill 真的操作模板）目前散在现有 run 门
测试里，尚未统一成矩阵——这是[本仓实验](2026-11-11-our-experiment.md) §7 的边界，不要在 keyless 层假装它已经被完整证明。

## 已定事实（不重新论证）

1. 本仓 `tests/` 的组织轴是**档位 / 验收面 / 命名即层**（2026-10-05/2026-10-20 裁决）；不按
   unit / integration / e2e 分目录，也不按测试类型再分 `tests/presets` / `tests/content`。
2. `tests/pack/` 是 presets/content 的 owner；新增接线契约住这里，登记在 `docs/evaluation.md` L0。
3. 这 11 条是**行为命题**（资产被接线/引用可解析），不是“全量覆盖台账/百分比”；2026-10-05 已判
   覆盖账不做，本卡不推翻。
4. keyless 只证文件与引用；真挂载归 L1 `preset-smoke`，行为归 L3/L4。绿不能解释为“presets/content
   已经行为正确”。
5. 不照搬参照仓的 `ROLES` 字面量：本仓 `role-list-sync` 禁止第二份角色清单；用盘上枚举 + 既有
   5 角色哨兵。lens 的 8 条字面量是另一回事（没有对应门禁，且是出厂闭集）。
6. 不照搬 product-type / delivery-mode 两轴；本仓的轴是研究类型、P1–P8 × lens、run 模板。

## 当前状态

- **已落**：`tests/pack/preset-helpers.mjs`（YAML 读取缝）、`tests/pack/presets-wiring.test.mjs`（6 例）、
  `tests/pack/content-coverage.test.mjs`（5 例）、`docs/evaluation.md` L0 登记。红证 9 组，全部先红后绿。
- **未动**：`tests/pack/presets.test.mjs`（19 个 test、323 行）、pack 的 persona/skill/content 文案、
  门禁与测试发现命令。
- **已裁决**：暂不拆（323 行、19 个 test；按源面/模型，不按主题）；trigger = [triggers](../../../triggers.md)「presets.test.mjs 拆分」。
- **测试资产收口**：清单/模板契约/类型 fixture 已落并归档 = [2026-11-11-test-asset-coverage](../../settled_issues/2026-11-11-test-asset-coverage.md)；[Note](../../../../notes/implemented/2026-11-11-test-asset-coverage.md)。
- **内容组织首刀**：manual T0 缝已落并归档 = [2026-11-11-content-organization-t0](../../settled_issues/2026-11-11-content-organization-t0.md)；T0 9,995、generic + content-disclosure 守卫、L1/L4-lite 绿；[Note](../../../../notes/implemented/2026-11-11-content-organization-t0.md)。

## 验证命令

```sh
pnpm test     # 1122/1122（含新增 11 例）
pnpm verify   # L0 全绿
node --test tests/pack/presets-wiring.test.mjs tests/pack/content-coverage.test.mjs
```

## 什么会改变结论

- `tests/pack` 文件数显著上升，或按改动面检索开始靠猜 → 重新评估是否分 `tests/pack/presets/` /
  `tests/pack/content/` 子域；
- coverage 测试开始维护手写资产清单（而不是盘上枚举）→ 已越过 2026-10-05 的“覆盖账不做”裁决；
- 真实回归漏过：某个 skill/lens/template 断线但 11 条没有咬住 → 先补行为命题，再谈扩大覆盖；
- L1/L4 证明模型并不按这些内容执行 → 问题不在接线层，转到内容语义/真模型证据；
- 生产内容本身的组织方式（manual T0、generic 缝、presets 边界）见 [design/70](../../../../docs/design/70-content-organization.md)。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-11-reference-reading.md](2026-11-11-reference-reading.md) | company 仓的分区与证明边界、四个可迁移机制、为什么形状不能照搬、它自己也没证明什么 | 2026-11-11 |
| [2026-11-11-our-experiment.md](2026-11-11-our-experiment.md) | 本仓测试上下文、现状盘点、九个候选不变量的实验、第一刀与红证、没有断言什么、剩余工作 | 2026-11-11 |
