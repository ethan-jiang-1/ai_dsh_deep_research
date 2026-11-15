---
status: 待落地
opened: 2026-11-15
---

# 推敲：测试子目录按「消费者接口」分层（测试 ↔ 源码对应）

> 立卡：2026-11-15 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：proposed（先落 RFC；本卡交付后随 Note 关闭，D52）
>
> **一句话**：把 `tests/` 内部的子目录从「平铺 + 文件名约定」改成「镜像消费者接口」——研发面镜像
> 命令家族（`run-gates`/`run-ops`/`dev`/`smoke`/`verify`/`probes` + 显式 `shared`），产品面镜像 DSH
> 组合面（preset / content / startup / defaults / fetch-fallback / client 页签）。
>
> **当前**：研究已定性，证据 = [研究题名页](../research/test-source-mirror/README.md) +
> [研究正文](../research/test-source-mirror/2026-11-15-test-source-mirror.md)。今天 `tests/run` 77 个
> spec 平铺、`tests/cockpit` 40 个平铺；86 个 lib 模块里 19% 按名字找不到测试，11 个模块的测试跨
> 2–3 个域。搬运成本已实测（22 条链接 / 16 冻结层；19 guard；77 资产账）。
>
> **下一步**：等用户拍 §未决问题 第 1 条（owner 轴 vs 主语轴）；拍板后按 Step 0 → 1 → 2 → 3 落地，
> 每步独立可回退。

**问题与期望结果：** 用户要求「测试底下要拆分出的子目录，最好跟源码能对应起来，今后找东西容易」。
本仓不是普通 JS 仓库：产品面是 DSH 组合（bundle 行 / preset / content / 插件半），研发面是 agent
按**命令**调用的工具带。今天测试家由「证据种类」决定、源码位置不参与，所以改名、搬家后测试与源码
的关系只能靠记忆。期望结果 = 从任一源码位置能按路径推出测试在哪，反之亦然；新测试有唯一落家规则；
这套对应由门禁维持，不靠约定。

**当前情况（研究结论，均已实测）：**

1. 只有三棵模块树被测试 import：`scripts/lib`（86）、`pack src/lib`（38）、`pack src/client`（38 纯件）。
   八个入口目录（verify / smoke / run-gates / run-ops / dist / test / dev / probes）**零 import 边**，
   其证据由车道、`gates.e2e`、探针索引承担——**不按路径镜像**。
2. `tests/` 六域已按「面」切开；缺的是面内子目录轴。
3. owner（命令家族）归属：单一 owner 46 / 共享 37 / 无入口 3；`session-log` 27 个消费者。
4. `tests/cockpit` = 20 client + 20 pack-lib 混居；`tests/pack` 已按组合面组织（17 个不 import 源码）。
5. 旧决定（[triggers.md](../triggers.md) tests/ 分域行，2026-10-28）的前提已变：当时 56 个文件、
   「118 处历史链接」；今天 77 个、链接 22 条、19% 名字不可达。
6. 基线复核（2026-11-15 08:10，HEAD `7421dc17`）：其间只动 `_backlog`/`notes`/指针登记，源码、
   测试、门禁零变化；盘上计数与上列一致，`pnpm verify` / `pnpm test` 全绿（checks 188/188）。

**未决问题：**

1. 第一层轴 = **owner（研究推荐）** 还是 主语（gate / session / audit…）。
2. `shared` 是否拆二级桶，还是单层 + 索引。
3. 产品面是否本期一起动（`tests/cockpit` 切 `client/` + `lib/`；`tests/pack` 保持）。
4. 「文件名 = 被测模块名」旧约定：保留为索引别名，还是正式退役。

**下一步：** 用户拍第 1 条；agent 随后建 RFC（`notes/proposed/`，见 `> 去向`），RFC 通过后按
Step 0（使能）→ Step 1（cockpit 试点）→ Step 2（scripts/lib + tests/run）→ Step 3（pack 收尾）落地。

## 已知与未决

- **已知**：搬运成本、owner 分布、两账行数、门禁假设四处、冻结层 16 条链接。
- **已知不会做**：合并模块（删除测试跑过：27 个 ≤60 行模块多为纯判据，合并会撞 550 行上限并拆掉
  2026-10-27 建立的「一域一文件可独立 review」）；搬 8 个入口目录；改 `tests/checks` 平铺。
- **未决**：上列四条；另加「Step 0 的重定向登记簿放在 `scripts/` 还是 `tests/`」——按现有先例
  （[archived-note-pointers.json](../../scripts/archived-note-pointers.json)）放 `scripts/` 更像家。

## 方案与取舍

| 方案 | 形态 | 取舍 |
|---|---|---|
| **owner 轴（采纳）** | `tests/run/<owner>/` ↔ `scripts/lib/<owner>/`；产品面 `tests/cockpit/<tab>/` | 与消费者一致；`shared` 显式；需要生成索引承载主语检索 |
| 主语轴 | `tests/run/{gate,deliver,session,audit,observe,channel,replay}` | 人读顺；但不是「谁在用」，跨域模块仍要猜 |
| 源根轴 | `tests/scripts-lib/`、`tests/pack-lib/` | 字面镜像；破六域语义与 D53 命名，链接 churn 最大 |
| import 轴 | `tests/<模块名>` | 只证依赖不证消费者；入口目录零边 |

## 判据形状

- **权威事实**：owner 归属 = 入口目录 → lib 的反向 import 闭包（脚本可复算）；测试落家 = 生成索引
  `tests/INDEX.generated.md`；旧路径解析 = 重定向登记簿 JSON。
- **读取方**：owner 门禁、`navigability-contract`、`md-links`（经登记簿）、`tests/AGENTS` 域表。
- **坏输入**：spec 放错 owner → 红；空 owner 目录 → 红（防空语料）；`shared` 里放单消费者模块 → 红；
  索引与盘不一致 → 红；重定向条目失真/目标不存在 → 红。
- **旧形态**：冻结层（`notes/archived`、`_backlog/_archived`）正文不重写，旧链接经登记簿解析；
  未登记的旧路径一律红。
- **反证**：五条注入（研究正文 §8）——错位 spec / 空目录 / shared 错放 / 删索引行 / 撤登记后链接红。

## 验收标准

1. **Step 0 三件套在场且先红后绿**：路径重定向登记簿、`tests/INDEX.generated.md`、owner 门禁；
   每条注入反证在测试或 `gates.e2e` 案例中有记录。
2. **研发面**：`scripts/lib` 按 owner 分组（含 `shared/`、`test-infra/`）；`tests/run` 同名目录；
   77 个 spec 全部归位，`tests/run` 根不再有平铺 `*.spec.mjs`。
3. **产品面**：`tests/cockpit` 至少切成 `client/` 与 `lib/`（页签二级可选）；`tests/pack` 与组合面
   对应关系写进 `tests/AGENTS`。
4. **机械面同步**：`tests/checks/test-surface.test.mjs` 支持子目录且防空语料不空转；`navigability-contract`
   递归 + 行表；`scripts/README.md` 每个 lib 文件一行；`d-vendor` 的硬路径；`tests/AGENTS` 域表；
   `docs/evaluation.md` 登记。
5. **两账与链接**：guard-ledger 19 条、asset-ledger 77 行重生成后与盘对账绿；22 条历史链接（含
   16 条冻结层）全部可解析，归档正文零改写。
6. **默认回归**：`pnpm verify` 与 `pnpm test` 全绿，零新增 skip；smoke 车道路径未变（`registry.json` 不动）。
7. **文档**：落家规则写进 `tests/AGENTS`；`docs/project-map.md` 测试词汇表补「owner 轴」；
   `triggers.md` 对应行更新为「已重开，见本卡」。
8. **可回滚**：每步 `git mv` 反向 + 索引/两账重生成即可回退；Step 0 不改变任何现有路径。

## 关闭条件

- 上列 8 条全部满足，且语义自审（或用户验收）已记录；
- RFC 与实现同变更链回本卡；`pnpm verify`/`pnpm test` 绿作为交付证据；
- 交付后按 `> 去向` 落 Note 并与本卡归档同变更（D52）。
