---
status: 修复就绪
severity: P1
opened: 2026-11-20
---

# BUG-347：review.md 尚未产生时，研究状态页把它显示成「审查未过 / 对抗审查发现问题」

> 严重级别：P1 ｜ 发现：2026-11-20 ｜ 状态：修复就绪（观测折算缺陷，修法明确）
>
> 现场 = `runtime/e2e-2026-11-20/run-b-status-w2.png`；run = `research-workspace/drt_sodium-ion-bess/`
> （当时只有 question/topics/plan/leads，无 review.md）。

## 症状

run 处于「侦察」阶段（steps: 立项确认 ✓ / 立项 ✓ / 组队 ✓ / 侦察 ●；证据 0 份），右栏顶部却显示：

```text
对抗审查发现问题——团队修复后复审（质量修复静默推进，不需要你操作）
审查未决项修复中
```

即：把"还没有审查"当成"审查失败"。用户会以为研究质量出了问题。

## 根因

1. `readinessOfSources`：无 `review/`、无 `review.md` 时，`terminal` 为 null，仍返回
   `{ pass: false, source: 'prose' }`——"缺席"与"FAIL"共用同一返回形。
2. `useStatusFeed` 把 `source === 'prose'` 一律折算成 `PASS|FAIL`：

```ts
const readiness = reading.source === 'declaration' || reading.source === 'prose'
  ? (reading.pass ? 'PASS' : 'FAIL')
  : null
```

于是 `reviewFail=true`，`deriveBusinessBrief` 输出 `briefStageReviewFail`。

## 复现

```sh
# 任一尚无 review.md 的活跃 bundle
node checks/run-gates/node-gate.mjs research-workspace/drt_sodium-ion-bess   # 门F/门R 均 N/A
# 浏览器打开该会话的研究状态页签 → 顶部出现「对抗审查发现问题」
node probes/browser/cdp-probe.mjs '<gui-url>' --open-session '2026 年钠离子电池储能商业化进展' --open-status
```

## 修法

- `readinessOfSources` 增三态：无 review 面 → `source:'absent'`（pass=null）；有 review.md 但无终局行
  仍是 FAIL/无法判定；有 review/ 无声明 → `missing`（现状）。
- `useStatusFeed` 只把 `declaration|prose` 的**有判定**结果折成 PASS/FAIL；`absent` → null。
- 同步检查 `deriveBusinessBrief` 的 `reviewFail` 输入类型（null 表示未知，不触发横幅）。

## 修复判据

- 无 review.md 的 run：状态页不出现「对抗审查发现问题」，步骤/证据照常。
- review.md 终局 FAIL：横幅出现（负控）；PASS：不出现。
- 有 review.md 但无终局判定：不冒充 PASS（维持 FAIL/未知，按既有判据）。
- `pnpm test` 的 review-readiness / brief-fold 矩阵同步更新并通过。

可关闭：否
