---
status: 已修
severity: P1
opened: 2026-11-21
---

# BUG-350：P5 run 的 claims.json 形态与 verdict-audit schema 不符，验收预检 49 项红

> 严重级别：P1 ｜ 发现：2026-11-21 ｜ 状态：已修（2026-11-21）— 结论：claims v2 = 模板形状（version 2 + critical 必填）；rich ledger/must_answer/verdict 一律红，裁决只住 verdicts-rN.json；审查：agent — 注入红回归；去向：none — 合同收紧
>
> 现场 = `research-workspace/drt_sodium-ion-bess/review/claims.json`；run =
> `drt_sodium-ion-bess`（P5 多维对比，claim_verification=on）。

## 症状

`node checks/run-gates/verdict-audit.mjs research-workspace/drt_sodium-ion-bess` → RED（49 项）：

```text
[claims-invalid] 未知字段 source / created / bundle / verdict_files / note
[claims-invalid] version 必须是 1（实际 "v3"）
[claims-invalid] finalRef 必须是 final/v<N> 的正整数 N
[claims-invalid] claims[0..12] 未知字段 must_answer / verdict / verdict_file
```

run-accept 的 verdict-audit 预检因此红，交付无法 accepted。

## 根因

- 唯一机器形状 = `packages/deep-research-pack/content/templates/run/claims.json`：
  `{ version: 1, finalRef: N, critical_exemption: null, claims: [{ id, text, critical, topics, evidence, urls }] }`。
- 该 run 的 lead 写成了 richer ledger：`version: "v3"`、顶层 `source/created/bundle/verdict_files/note`、
  每条 claim 带 `must_answer/verdict/verdict_file`（裁决其实在 `review/verdicts-r*.json`）。
- 模型可见面（模板）没被复制；技能正文也没有 claims.json 的形状样例，lead 自创了字段。

## 复现

```sh
node checks/run-gates/verdict-audit.mjs research-workspace/drt_sodium-ion-bess
# verdict-audit: RED（49 项）
node checks/run-gates/run-accept.mjs research-workspace/drt_sodium-ion-bess --no-write
# verdict-audit 预检 FAIL
```

## 修法（需拍板）

1. 保持严格 schema；lead 侧按模板生成（在 research-planning / team-assembly skill 给形状样例），
   `must_answer` 等改放 journal 或 findings；
2. 官方扩展 schema，接纳 `must_answer/verdict/verdict_file`（与 verdicts 文件的关系要定义清楚，避免双份事实）；
3. 双轨：模板 + lead 写盘前自检命令。

## 修复判据

- 本卡现场 verdict-audit 绿（或按选定 schema 合法）；
- version 非 1、finalRef 缺失、claim 缺 text/critical 仍红（负控保留）；
- `pnpm test` 的 verdict-audit 矩阵同步更新并通过。


## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/verdict-audit-core.mjs",
    "packages/deep-research-pack/content/templates/run/claims.json",
    "packages/deep-research-pack/content/manual.md",
    "packages/deep-research-pack/content/generic/state-and-recovery.md",
    "tests/run/gates/verdict-audit.spec.mjs",
    "tests/fixtures/verdict-audit/pilot-a/bundle/review/claims.json",
    "checks/smoke/run-accept.e2e.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/verdict-audit.spec.mjs",
    "exit": 1,
    "output": "回退到旧 v1 解析：31 例红——模板 v2 被拒、rich ledger 字段未被判红"
  },
  "green": {
    "command": "node --test tests/run/gates/verdict-audit.spec.mjs",
    "exit": 0,
    "output": "37 tests 全过：模板 v2 可直接 parseClaims；must_answer/verdict/verdict_file/缺 critical/v1 均红"
  },
  "guard": {
    "path": "tests/run/gates/verdict-audit.spec.mjs"
  }
}
```

可关闭：是
