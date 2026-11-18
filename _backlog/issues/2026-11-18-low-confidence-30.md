---
status: 推敲中
opened: 2026-11-18
---

# 推敲：低置信区 20 卡（第 8 轮）——plan 门剩余/方法库 N/A/缓存身份/并发与端口

> 立卡：2026-11-18 ｜ 状态：推敲中（20 张卡 300–319） ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> **一句话**：280–299 修完后，这一轮专挑“实机才发虚”的：plan 门剩余漏项、方法库缺库 N/A、
> probe 缓存身份漏 MCP、并发启动无锁、固定端口、缓存写入原子性；另带 review/threshold/length 的浅检。
> 20 张卡，只报不修。

**当前情况：**

- `f2100ff1` 已修 280–299；active bugs 为空。
- `pnpm verify` / `pnpm test` 绿；cold-start/lifecycle/release/client-load 本机均 ALL PASS
  （client-load 194.5s；cold-start 9.3s；release 16.6s）。
- 仍发现：planGate 对 active 节点缺 owner/kind/task_id **不报**（只校验“有值时合法”）；
  剩余工作 `- 无` 与 active 节点共存；Wave 声明层无节点；前版快照只比版本。
- 方法库 `checkMethodLibrary` 在 `entry === undefined` 时返回 []（声明 library 但缺库按 N/A）。
- probe 缓存键含 profile/bootstrap/workspace，但**不含 MCP_PLAYWRIGHT**；`up`/`boot-run` 无锁；
  三个入口固定端口；pack 指纹跳过 symlink；probe 缓存直接写。
- review 覆盖表按 evidence 文件计数；threshold 对全部 evidence 逐卡比；output.length 用
  Segmenter/非空行估算。

**未决问题：**

- plan active 节点 owner/kind/task_id 是必填还是可空（nodes-contract vs planGate）。
- 剩余工作 `- 无` 与 active 节点共存：应红还是允许“计划已死但图未清理”。
- 方法库缺文件：N/A 还是红；声明 library 的“无对象”是否可接受。
- MCP_PLAYWRIGHT/并发/端口/缓存写入：哪些属于测试可靠性、哪些属于运行态合同。
- review 覆盖/证据 threshold 的对象粒度（critical/claim vs 全部）。

**下一步：** 300–313 触门禁/合同，`等人拍板`；314–319 测试/运行态，`修复就绪`。

## 执行记录（2026-11-18）

| 卡 | 组 | 严重级 | 状态 | 一句话 |
|---|---|---|---|---|
| [BUG-300](../bugs/BUG-300-plan-owner-role-missing.md) | plan/语义 | P2 | 等人拍板 | plan active 节点缺 owner_role 不报 |
| [BUG-301](../bugs/BUG-301-plan-kind-missing.md) | plan/语义 | P2 | 等人拍板 | plan active 节点缺 kind 不报 |
| [BUG-302](../bugs/BUG-302-plan-task-id-missing.md) | plan/语义 | P2 | 等人拍板 | plan active 节点缺 task_id 不报 |
| [BUG-303](../bugs/BUG-303-plan-remaining-none-with-active.md) | plan/语义 | P2 | 等人拍板 | 剩余工作 - 无 与 active 节点共存 |
| [BUG-304](../bugs/BUG-304-plan-wave-section-nodes-unchecked.md) | plan/语义 | P2 | 等人拍板 | Wave 执行声明层无节点也 PASS |
| [BUG-305](../bugs/BUG-305-plan-snapshot-content-version-only.md) | plan/语义 | P2 | 等人拍板 | 前版快照只比图版本 |
| [BUG-306](../bugs/BUG-306-plan-plan-only-outside-wave.md) | plan/语义 | P2 | 等人拍板 | 非 Wave 节点可写 plan-only |
| [BUG-307](../bugs/BUG-307-method-library-entry-undefined-na.md) | plan/语义 | P2 | 等人拍板 | 声明 library 但缺库文件按 N/A |
| [BUG-308](../bugs/BUG-308-probe-cache-mcp-omitted.md) | plan/语义 | P2 | 等人拍板 | probe 缓存键不含 MCP_PLAYWRIGHT |
| [BUG-309](../bugs/BUG-309-run-driver-no-up-lock.md) | plan/语义 | P2 | 等人拍板 | run-driver up 无互斥 |
| [BUG-310](../bugs/BUG-310-boot-run-no-start-lock.md) | plan/语义 | P2 | 等人拍板 | boot-run 端口检查/启动非原子 |
| [BUG-311](../bugs/BUG-311-review-coverage-count-evidence-only.md) | plan/语义 | P2 | 等人拍板 | 覆盖表 N 卡只按 evidence 文件数 |
| [BUG-312](../bugs/BUG-312-evidence-threshold-all-evidence.md) | plan/语义 | P2 | 等人拍板 | threshold 对全部 evidence 逐卡比 |
| [BUG-313](../bugs/BUG-313-output-length-heuristic.md) | plan/语义 | P2 | 等人拍板 | output.length 用 Segmenter/非空行估算 |
| [BUG-314](../bugs/BUG-314-cold-start-not-nightly.md) | 运行态/覆盖 | P2 | 修复就绪 | cold-start 干净室仅 dev-only 手动 |
| [BUG-315](../bugs/BUG-315-cold-start-fixed-port.md) | 运行态/覆盖 | P2 | 修复就绪 | cold-start 固定 3129 |
| [BUG-316](../bugs/BUG-316-snapshot-fixed-port.md) | 运行态/覆盖 | P2 | 修复就绪 | snapshot 默认 3103 |
| [BUG-317](../bugs/BUG-317-client-load-fixed-port.md) | 运行态/覆盖 | P2 | 修复就绪 | client-load 默认 3109 |
| [BUG-318](../bugs/BUG-318-channel-cache-symlink-ignored.md) | 运行态/覆盖 | P2 | 修复就绪 | pack 指纹跳过 symlink |
| [BUG-319](../bugs/BUG-319-probe-cache-write-nonatomic.md) | 运行态/覆盖 | P2 | 修复就绪 | probe 缓存直接覆盖写 |

## 基线与负对照

- `pnpm verify` / `pnpm test` 绿；cold-start/lifecycle/release/client-load 全 PASS。
- planGate：active 节点缺 owner/kind/task_id 只在校验“有值时合法”；`- 无` 直接跳过条目检查。
- `checkMethodLibrary`：`entry === undefined` → `[]`；`entry === null` 才红。
- `probeIdentityOf` 只含 profile/bootstrap/workspace；`run-driver`/`boot-run` 无 lock；
  cold-start 3129 / snapshot 3103 / client-load 3109 固定；`collectPackEntries` 跳过 symlink；
  `writeFileSync(PROBE_CACHE, …)` 非原子。
- review 覆盖表按 evidence 文件数；threshold 遍历全部 evidence；length 用 Segmenter/非空行。

## 覆盖地图

| 面 | 状态 | 判定 |
|---|---|---|
| plan 门剩余 | 已探 → 7 卡 | 300–306 |
| 方法库 N/A | 已探 → 1 卡 | 307 |
| 缓存身份/并发/端口/原子性 | 已探 → 6 卡 | 308–310 / 315–319 |
| review/threshold/length | 已探 → 3 卡 | 311–313 |
| 干净室 nightly 覆盖 | 已探 → 1 卡 | 314 |

## 验收标准

1. 300–319 有复现/证据/修法；plan/运行态/缓存/覆盖四类有判定。
2. 旧场/合法路径豁免写清；实例卡可逐条修。
3. `pnpm verify` / `pnpm test` 绿；本轮不改产品代码。

## 关闭条件

- 20 张卡有去向；plan 字段、方法库 N/A、缓存身份、并发/端口决策落定；
- 覆盖地图更新；审查记录 `审查：agent｜用户｜跳过 — 理由`。

## 范围与排除

**范围**：`checks/lib/gates/plan-gate.mjs`、`protocol-audit-core.mjs`、`tools/channel/{run-driver,boot-run}`、
`checks/lib/channel/channel-cache.mjs`、`checks/smoke/{cold-start,snapshot-replay,client-load}.entry.mjs`、
`checks/smoke/registry.json`。
**排除**：改产品代码/发布配置；真模型/完整 run；重跑 209–299 已闭面；把纯设计边界当 bug（除非合同声明）。

## 判据形状

不适用（本卡不改产品判据；四类判据 = 上表；各卡修复判据自理）。
