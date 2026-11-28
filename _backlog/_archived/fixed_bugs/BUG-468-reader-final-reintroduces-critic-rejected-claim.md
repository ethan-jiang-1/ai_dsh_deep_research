---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-468：`reader-final` 处于 `critic` 终局 PASS 之后且无事实一致性校验，已被驳回的禁用全称断言在读者版死灰复燃

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

在 `drt_huawei-ascend-dd` 第 1 轮审查时，`critic-1` 以 CRITICAL C1 明确打回了 `final.md` 首屏的「昇腾是唯一能规模交付的全国产 AI 算力选项」这一无证据全称断言；Lead 随后在 `final.md:8` 改写为「昇腾是国产阵营里出货规模最大的一家（IDC 2026H1 出货量口径 28%，仅次于 NVIDIA 的 34%）」，并通过第 2 轮 Critic PASS。
但紧接着在 `step 94`（`critic` 已退出、进入 HITL2 前），Lead 执行 `reader-final` 生成 `final/readable.md` 时，在第 7 行再次写出：**「如果买不到 NVIDIA 的合规版，昇腾是国产阵营里唯一已经形成规模交付的 AI 算力体系」**，直接把 Critic 刚杀掉的幻觉全称断言重新塞入呈现给用户的读者版首句。

## 分诊与授权

- 严重级：P1 — 读者版是 HITL2 用户先读的决策面，在 `review` PASS 之后派生却没有任何回查门，使已被 Critic 拦截的 CRITICAL 级别过界断言绕过审查直接交付。
- 表面 / 边界：`packages/deep-research-pack/presets/lead/skills/reader-final/SKILL.md`、`checks/lib/gates/node-gate-reader-gate.mjs` / pack content + workflow 时序
- DSH 不变量：verify the world（以 canonical 为准不得停留在口头自检）
- 触及面：pack 公共行为 / 门禁与验收合同
- 授权：等人拍板（触及 pack 公共行为与门禁合同）
- 批：2026-11-28-run-fidelity-and-gate-accuracy

## 复现

复现状态：稳定 — 直接比对 `drt_huawei-ascend-dd` 现场文件：
- `review.md` CRITICAL C1（已闭合）记录原错句为全称断言；
- `final.md:8` 已收口为「出货规模最大的一家（28%）」；
- `final/readable.md:7` 仍出现「唯一已经形成规模交付的 AI 算力体系」。

## 根因（假设 → 已证）

[reader-final/SKILL.md](../../../packages/deep-research-pack/presets/lead/skills/reader-final/SKILL.md)（`L8-L53`）规定在 `critic` 终局 PASS 之后才生成 `final/readable.md`，而 [node-gate-reader-gate.mjs](../../../checks/lib/gates/node-gate-reader-gate.mjs)（`L5-L6`）门 C 只检六节结构、字数、链接和数字子集，不核查「读者版是否与 canonical 或 `review.md` 已闭合 CRITICAL 矛盾」；Lead 也未在生成 `readable.md` 后交 Critic 复核「结论句不越过 canonical 边界」。
- 根因证据：`review.md` 第 13 行 / 第 119+ 行 C1、`final.md:8`、`final/readable.md:7` 与 `session-156a6ddc` `step 94–95`。
- DSH 不变量：不适用。

## 牵出的失败类

- 同机制第 1 次｜处置：类修

## 修法

1. 在 `reader-final/SKILL.md` 的自检与 `lead` HITL2 前动作中增加显式比对：若 `review.md` 存在已闭合的 CRITICAL/MAJOR 边界收口（如删去「唯一/全部」等全称断言），`readable.md` 结论段必须逐字对齐 canonical 首屏核心限定语，禁止退回被驳回的旧措辞；
2. 评估是否让 `critic`（或轻量子代理校验）在 HITL2 前对 `final/readable.md` 首屏 `## 结论` 与 `final.md` 做一次单步对照，或在 `readerGate` 中对已知限定语/越界词做轻量提示。

## 修复判据

1. 明确 `reader-final` 对 `review` 收口结论的保真机制/校验流程；
2. 形成回归测试或检查项：当 `readable.md` 引入 canonical 未出现的限定突破（或与 Critic C# 收口冲突）时能被拦截/标警。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/node-gate-reader-gate.mjs",
    "packages/deep-research-pack/presets/lead/skills/reader-final/SKILL.md",
    "tests/run/gates/node-gate-reader.spec.mjs",
    "tests/fixtures/skill-golden/manifest.json",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/run/gates/node-gate-reader.spec.mjs",
    "exit": 1,
    "output": "BUG-468 readerGate: reintroduced CRITICAL-rejected claim passed with status=PASS instead of FAIL"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/node-gate-reader.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/node-gate-reader.spec.mjs"
  }
}
```
