---
status: 已结
opened: 2026-11-18
---

# 推敲：低置信区 20 卡（第 7 轮）——plan 门/覆盖金标准/缓存身份

> 立卡：2026-11-18 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是｜ 结论：20 卡（280–299）全部修复归档；plan 门/覆盖金标准/缓存身份落地 ｜ 审查：agent — 红证回放 + 全量 verify/test/pack.e2e ｜ 可关闭：是（2026-11-18）
>
> **一句话**：上一批修完 run 合同的字段/外键后，这一轮专挖三类“看起来已经接上、实际仍浅”的：
> **plan-gate 的结构/列/版本/剩余工作**、**review/claims 的残留豁免**、**skill/渲染金标准与 probe 缓存身份**。
> 20 张卡，只报不修。
>
> 前序 = [低置信区 260–279](2026-11-18-low-confidence-20.md)（已修复归档）。

**当前情况：**

- `b0021fe0` 已修 260–279；active bugs 为空。
- `pnpm verify` / `pnpm test` 绿；plan-gate/skill-golden/snapshot 的现有测试绿。
- 发现：plan.md 畸形表 → `planGate` PASS 0 节点；缺图版本直接跳过；表中 question/output/
  acceptance/budget/depth/task_id 不校验；`## 剩余工作` 只查标题；v>1 快照只查在场。
- claims 的 `critical_exemption` 任意非空字符串即可绕零 critical；`critic: light` 与 report 同判；
  review 覆盖表仍是结构判据；方法库从 bundle 父目录找，缺库即假红。
- skill-golden 只覆盖随包 15 份 `SKILL.md`，`.agents/skills` 无金标准；snapshot C 只有 lead
  有 renderExpected；client-load 只验四个研究角色选择器，不含 method-editor/逐角色渲染。
- probe 缓存键不含 profile/bootstrap/workspace；channel-cache 的 pack 指纹只含 size/mtime。

**未决问题：**

- plan.md 在场但表畸形：应红还是 N/A？执行图正本畸形式 0 节点不应 PASS。
- 图版本缺省：nodes-contract 要求 vN；旧 plan 断代与新 plan 从严的边界。
- `## 剩余工作` 的内容判据（owner/next/tombstone）能否机械核到最小集。
- `critical_exemption` 是否要求 review 引用/理由格式；`critic: light` 的轻量映射。
- `.agents/skills` 与随包 skill 金标准是否合并；snapshot C 是否必须每角色声明。
- probe 缓存身份是否应包含 profile/bootstrap/workspace；pack 指纹是否升级为内容哈希。

**下一步：** 280–289 触门禁/合同，`等人拍板`；290–299 测试/缓存，`修复就绪`。本卡结案后再看是否补 runtime/install 面。

## 执行记录（2026-11-18）

| 卡 | 组 | 严重级 | 状态 | 一句话 |
|---|---|---|---|---|
| [BUG-280](../fixed_bugs/BUG-280-plan-gate-malformed-table-pass.md) | plan/语义 | P2 | 等人拍板 | plan 表畸形/缺席时 planGate PASS 0 节点 |
| [BUG-281](../fixed_bugs/BUG-281-plan-gate-version-absent.md) | plan/语义 | P2 | 等人拍板 | plan 缺图版本时版本链整段跳过 |
| [BUG-282](../fixed_bugs/BUG-282-plan-gate-columns-unchecked.md) | plan/语义 | P2 | 等人拍板 | plan 表 question/output/acceptance/budget/depth/task_id 可空 |
| [BUG-283](../fixed_bugs/BUG-283-plan-gate-wave-task-unchecked.md) | plan/语义 | P2 | 等人拍板 | Wave 执行/task_id/plan-only 无门 |
| [BUG-284](../fixed_bugs/BUG-284-plan-gate-remaining-content-shallow.md) | plan/语义 | P2 | 等人拍板 | 剩余工作只查标题 |
| [BUG-285](../fixed_bugs/BUG-285-plan-gate-snapshot-content-unchecked.md) | plan/语义 | P2 | 等人拍板 | 图版本快照只查在场 |
| [BUG-286](../fixed_bugs/BUG-286-claims-critical-exemption-any-string.md) | plan/语义 | P2 | 等人拍板 | critical_exemption 任意非空字符串 |
| [BUG-287](../fixed_bugs/BUG-287-protocol-critic-light-no-behavior.md) | plan/语义 | P2 | 等人拍板 | critic light 与 report 同判 |
| [BUG-288](../fixed_bugs/BUG-288-review-coverage-structural-only.md) | plan/语义 | P2 | 等人拍板 | review 覆盖表仍结构判据 |
| [BUG-289](../fixed_bugs/BUG-289-method-library-path-bundle-parent.md) | plan/语义 | P2 | 等人拍板 | 方法库按 bundle 父目录定位，假红 |
| [BUG-290](../fixed_bugs/BUG-290-skill-golden-pack-only.md) | 覆盖/缓存 | P2 | 修复就绪 | skill 金标准只覆盖随包 15 份 |
| [BUG-291](../fixed_bugs/BUG-291-snapshot-c-only-lead.md) | 覆盖/缓存 | P2 | 修复就绪 | snapshot C 只有 lead |
| [BUG-292](../fixed_bugs/BUG-292-client-load-role-picker-only.md) | 覆盖/缓存 | P2 | 修复就绪 | client-load 只验角色选择器 |
| [BUG-293](../fixed_bugs/BUG-293-agents-skill-golden-missing.md) | 覆盖/缓存 | P2 | 修复就绪 | .agents/skills 无 skill 金标准 |
| [BUG-294](../fixed_bugs/BUG-294-snapshot-render-cases-only-lead.md) | 覆盖/缓存 | P2 | 修复就绪 | renderExpected 只有 lead |
| [BUG-295](../fixed_bugs/BUG-295-client-load-method-editor-missing.md) | 覆盖/缓存 | P2 | 修复就绪 | client-load 不含 method-editor |
| [BUG-296](../fixed_bugs/BUG-296-probe-cache-profile-omitted.md) | 覆盖/缓存 | P2 | 修复就绪 | probe 缓存键不含 profile |
| [BUG-297](../fixed_bugs/BUG-297-probe-cache-bootstrap-omitted.md) | 覆盖/缓存 | P2 | 修复就绪 | probe 缓存键不含 bootstrap |
| [BUG-298](../fixed_bugs/BUG-298-channel-cache-mtime-size-only.md) | 覆盖/缓存 | P2 | 修复就绪 | pack 指纹只含 size/mtime |
| [BUG-299](../fixed_bugs/BUG-299-probe-cache-workspace-omitted.md) | 覆盖/缓存 | P2 | 修复就绪 | probe 缓存键不含 workspace |

## 基线与负对照

- `pnpm verify` / `pnpm test` 绿；plan-gate/skill-golden/snapshot 测试绿。
- 临时 plan：`# Plan` + `## 剩余工作`（无表）→ `planGate` `PASS 节点 0`；去掉 `图版本` → 不报（280/281）。
- `skillBodyManifest` 只遍历 `packages/deep-research-pack/presets`；manifest 15 条（290/293）。
- `snapshot.json` cases：lead 有 renderExpected，scout/analyst/critic/method-editor 无（291/294）。
- `client-load` 角色断言是四个研究 preset；method-editor 不在（295/292）。
- `run-driver` probe key = pack + runtime + devShell + probe source + expectFace + requireData；
  不含 profile/bootstrap/workspace（296/297/299）。
- `packFingerprint` = rel + size + trunc(mtimeMs)（298）。
- `critical_exemption` 只校验非空字符串（286）；`critic: light` 只进闭集（287）。

## 覆盖地图

| 面 | 状态 | 判定 |
|---|---|---|
| plan 表结构/列/版本/剩余工作/Wave | 已探 → 6 卡 | 280–285 |
| claims/review/protocol 残留 | 已探 → 4 卡 | 286–289 |
| skill/渲染金标准 | 已探 → 5 卡 | 290–295 |
| probe/channel 缓存身份 | 已探 → 4 卡 | 296–299 |
| runtime/install（profile/clean-room） | 前轮已修，未新开 | 240–249 |

## 批修复（2026-11-18 用户放行 20 张）

默认按机械契约：plan 正本从严、exemption 有理由格式、critic light 有独立语义、覆盖表逐格可核、
方法库多候选、skill 金标准含 .agents、C 按场景、role picker 含 method-editor、缓存键含身份、
pack 指纹内容哈希；旧场只严新交付。

| 阶段 | 内容 | 卡 |
|---|---|---|
| P1 | plan-gate：畸形表/图版本/列/Wave/task_id/剩余工作/快照 | 280–285 |
| P2 | critical_exemption 格式、critic light、覆盖表卡数、方法库多路径 | 286–289 |
| P3 | skill 金标准含 .agents、C 场景级边界、role picker 含 method-editor | 290–295 |
| P4 | probe 键 profile/bootstrap/workspace、pack 内容哈希 | 296–299 |

## 收口（2026-11-18）

20 张卡全部 `已修` 并归档到 [fixed 池](../fixed_bugs/README.md)；批 Note =
[2026-11-18-low-confidence-20-round2](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)。
plan 门加固、critical_exemption/critic light/覆盖表卡数/方法库路径、skill 金标准含 .agents、
C 场景级边界、role picker 含 method-editor、probe 键身份与 pack 内容哈希全部落地。
`pnpm verify` / `pnpm test` / `pack.e2e` 绿；红证回放见各卡 `fix-evidence`。

## 验收标准

1. 280–299 有复现/证据/修法；plan/覆盖/缓存三类有判定。
2. 旧场/合法路径豁免写清；实例卡可逐条修。
3. `pnpm verify` / `pnpm test` 绿；本轮不改产品代码。

## 关闭条件

- 20 张卡有去向；plan-gate、critical_exemption、金标准覆盖、缓存键决策落定；
- 覆盖地图更新；审查记录 `审查：agent｜用户｜跳过 — 理由`。

## 范围与排除

**范围**：`checks/lib/gates/plan-gate.mjs`、`verdict-audit-core.mjs`、`protocol-audit-core.mjs`、
`checks/lib/shared/skill-golden.mjs`、`snapshots/replay/*`、`checks/smoke/client-load.entry.mjs`、
`tools/channel/run-driver.mjs`、`checks/lib/channel/channel-cache.mjs`。
**排除**：改产品代码/发布配置；真模型/完整 run；重跑 209–279 已闭面；把纯 UI 提示当 bug（除非合同声明）。

## 判据形状

不适用（本卡不改产品判据；三类判据 = 上表；各卡修复判据自理）。
