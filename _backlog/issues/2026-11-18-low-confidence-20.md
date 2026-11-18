---
status: 推敲中
opened: 2026-11-18
---

# 推敲：低置信区 20 卡——run 合同的字段/值域/外键/浅检（2026-11-18 第 6 轮）

> 立卡：2026-11-18 ｜ 状态：推敲中（20 张卡 260–279） ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> **一句话**：路径/安装/语义字段的上一批修完后，这一轮专挖 **run 合同里“字段存在但判据浅”** 的剩余：
> 支撑证据、块级 lens、重复 ID、topic 图、plan 图、run 状态、protocol 预算/长度/threshold、claims/verdicts 冲突。
> 20 张卡，全部只报不修。
>
> 前序 = [命名空间搬家](../_archived/settled_issues/2026-11-17-exploratory-namespace-move.md) ·
> [运行时/开发边界](../_archived/settled_issues/2026-11-17-runtime-dev-boundary.md) ·
> [运行时依赖/安装](../_archived/settled_issues/2026-11-17-runtime-deps-install-boundary.md) ·
> [搬家残差 II](../_archived/settled_issues/2026-11-18-move-residuals.md) ·
> [模型可见语义](../_archived/settled_issues/2026-11-18-model-visible-semantics.md)（209–259 已修复归档）。

**问题与期望结果：** 上一轮把“模板字段有没有消费者”补了一批；这一轮往下挖一层：
**消费者存在，但只做了形状/非空/文件级检查**。典型：

- findings 的支撑证据存在性只在有 lens 时查；
- lens_gaps 的“有行/空列表”用整份文件正则，块级字段被文件级判据吞掉；
- F#/T# 重复被静默覆盖；
- topics 的 depends_on/lenses/must_answer 只有模板或 UI；
- plan 的图/字段只显示不拦；
- run.md 的 next/delivered 只浅检；
- protocol 的 threshold/length/gates 只存不消费；
- claims/verdicts 的 URL 只查字符串、冲突 only warn、zero critical only warn。

**当前情况：**

- 243c6644 修复 250–259；active bugs 为空。
- `pnpm verify` / `pnpm test` 绿；`pack.e2e` 86 条目；snapshot B/C 绿（前轮）。
- 本轮 20 张卡均为 P2、`等人拍板`（门禁/验收合同触面）；未改产品代码。
- 证据：临时 findings bundle（无 lens + missing evidence）`findingsContractIssues` 返回 `[]`；
  F1 有 lens_gaps、F2 缺行不报；F1 `[]` 误伤 F2 的「无」；重复 F#/T# 无 issue；
  `planIssuesOf` 只有 UI；`depends_on` 无代码消费者；`evidence_threshold` 无下游；等。

**未决问题：**

- 旧 bundle 断代：按 `run.md` 在场/契约日，还是按字段新增日？本批一律要求断代豁免。
- 块级字段（findings）统一改为块对象，不再用全文正则（260–262）。
- 图/状态/预算类判据进 node-gate 还是独立 plan-gate；`waves_max` 是否与 nodes/cells 同力度（267/268/278）。
- protocol 的 threshold/length/claim_verification 是执行合同还是只读展示（271–273）。

**下一步：** 20 张卡按门禁/合同修复；旧场断代 + 正反控。本卡结案后再看 B/C 侦察线是否补卡。

## 执行记录（2026-11-18）

| 卡 | 组 | 严重级 | 状态 | 一句话 |
|---|---|---|---|---|
| [260](../bugs/BUG-260-findings-support-evidence-existence-skips-without-lens.md) | findings | P2 | 等人拍板 | 无 lens 时支撑证据存在性整段跳过 |
| [261](../bugs/BUG-261-findings-lens-gaps-presence-file-global.md) | findings | P2 | 等人拍板 | 一个块有 lens_gaps 替所有缺行块背书 |
| [262](../bugs/BUG-262-findings-lens-gaps-empty-file-global-false-red.md) | findings | P2 | 等人拍板 | 一个块 `[]` 误伤其它「无」块 |
| [263](../bugs/BUG-263-findings-duplicate-f-id.md) | findings | P2 | 等人拍板 | 重复 F# 不报 |
| [264](../bugs/BUG-264-topics-duplicate-t-id-overwrite.md) | topics | P2 | 等人拍板 | 重复 T# 被 Map 静默覆盖 |
| [265](../bugs/BUG-265-topics-depends-on-no-consumer.md) | topics | P2 | 等人拍板 | depends_on 无任何消费者 |
| [266](../bugs/BUG-266-topics-must-answer-count-ungated.md) | topics | P2 | 等人拍板 | must_answer 2–5 只被仪表盘计数 |
| [267](../bugs/BUG-267-plan-graph-issues-ui-only.md) | plan | P2 | 等人拍板 | plan 环/悬空/重号只 UI 提示 |
| [268](../bugs/BUG-268-plan-fields-owner-kind-lifecycle-ungated.md) | plan | P2 | 等人拍板 | owner/kind/lifecycle/剩余工作无门 |
| [269](../bugs/BUG-269-run-state-phase-field-cross-checks.md) | run | P2 | 等人拍板 | next/delivered/parked 只浅检 |
| [270](../bugs/BUG-270-claims-verdict-urls-not-validated.md) | claims | P2 | 等人拍板 | URL 字段只查字符串数组 |
| [271](../bugs/BUG-271-protocol-evidence-threshold-unenforced.md) | protocol | P2 | 等人拍板 | evidence_threshold 无下游 |
| [272](../bugs/BUG-272-protocol-output-length-unenforced.md) | protocol | P2 | 等人拍板 | output.length 无 final 字数检查 |
| [273](../bugs/BUG-273-protocol-gates-claim-verification-unused.md) | protocol | P2 | 等人拍板 | claim_verification/critic 声明不生效 |
| [274](../bugs/BUG-274-verdict-duplicate-conflict-warn-only.md) | verdicts | P2 | 等人拍板 | 同 claim 冲突裁决只 warn |
| [275](../bugs/BUG-275-claims-zero-critical-warn-only.md) | claims | P2 | 等人拍板 | 零 critical 只 warn，覆盖门空转 |
| [276](../bugs/BUG-276-method-library-sha-unverified.md) | protocol | P2 | 等人拍板 | library_fields_sha256 不自算 |
| [277](../bugs/BUG-277-topics-lenses-unknown-id.md) | lens | P2 | 等人拍板 | topics.lenses 不校验真实 lens id |
| [278](../bugs/BUG-278-protocol-waves-max-warn-only.md) | protocol | P2 | 等人拍板 | waves_max 只 warn |
| [279](../bugs/BUG-279-evidence-supports-unknown-topic.md) | evidence | P2 | 等人拍板 | supports 指向不存在的 T# 不报 |

## 基线与负对照

- `pnpm verify` / `pnpm test` 绿；`pack.e2e` 86；snapshot B/C 前轮全绿。
- 临时 findings bundle：无 lens + missing evidence → `findingsContractIssues` `[]`（260）；
  F1 有 lens_gaps、F2 缺行 → 不报 F2（261）；F1 `[]`、F2 无 → 两条空列表（262，F2 假红）；
  两个 F1 → `parseFindingsOf [F1,F1]`、issues `[]`（263）；两个 T1 → Map 只剩后者（264）。
- `grep depends_on` 无代码消费者（265）；`must_answer` 只有 dashboard（266）。
- `planIssuesOf` 只有 `ResearchGraphTab` + 测试（267）；plan 字段/剩余工作无门（268）。
- `schema-scan` 的 next 只非空、delivered 只 accepted（269）。
- claims/verdicts URL 只 `isStringArray`（270）；`verdict-duplicate`/`no-critical` 只 warn（274/275）。
- `evidence_threshold` 只有 protocol-core（271）；`output.length` 无 final 消费者（272）；
  claim_verification/critic 只有闭集（273）；`library_fields_sha256` 只 hex（276）；
  `waves_max` 只 warn（278）；`supports` 无 topics 存在性（279）。

## 覆盖地图

| 面 | 状态 | 判定 |
|---|---|---|
| findings 块级/证据/ID | 已探 → 4 卡 | 260–263 |
| topics ID/图/字段 | 已探 → 4 卡 | 264–266 / 277 / 279 |
| plan 图/字段 | 已探 → 2 卡 | 267 / 268 |
| run 状态 | 已探 → 1 卡 | 269 |
| claims/verdicts | 已探 → 3 卡 | 270 / 274 / 275 |
| protocol 预算/长度/配置 | 已探 → 5 卡 | 271–273 / 276 / 278 |
| runtime/client/ledger/gates 自测 | 侦察线待回（本轮 20 已足） | 下一轮继续 |

## 验收标准

1. 260–279 有复现/证据/修法；块级/值域/外键/浅检四类有判定。
2. 旧场断代与正反控写清；实例卡可逐条修。
3. `pnpm verify` / `pnpm test` 绿；本轮不改产品代码。

## 关闭条件

- 20 张卡有去向；findings 块级、topics 图、plan gate、protocol 合同、claims/verdicts 决策落定；
- 覆盖地图更新；审查记录 `审查：agent｜用户｜跳过 — 理由`。

## 范围与排除

**范围**：`content/templates/run/*`、`checks/lib/gates/findings-core|evidence-audit-core|verdict-audit-core|protocol-*|schema-scan-core|node-gate-*`、
`packages/deep-research-pack/src/lib/plan/*`、`content/lenses/*`。
**排除**：改产品代码/发布配置；真模型/完整 run；重跑 209–259 已闭面；把纯 UI 提示当 bug（除非合同声明）。

## 判据形状

不适用（本卡不改产品判据；四类判据 = 上表；各卡修复判据自理）。
