---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-286：claims 的 `critical_exemption` 任意非空字符串即可绕过零 critical 红

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：critical_exemption ≥20 字且说明无 critical 理由；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

`verdict-audit` 只校验 `critical_exemption` 是非空字符串；`no-critical` 红被降级为不报。写 `"x"` 即可让零 critical 表通过。

## 根因（已证）

豁免理由没有内容/审查/关联判据，等于第二个后门。

## 复现

复现状态：稳定（读码/临时 fixture/局部脚本）。

```sh
# 证据见本卡症状与当前源码；临时验证只读，不改仓库
```

## 修法

1. 为该字段/入口补判据或缓存身份；
2. 加正反控与旧场/迁移豁免；
3. 与同类字段共用单一正本。

## 修复判据

- 该缺口有正反控；旧场/合法路径不误伤；
- `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/verdict-audit-core.mjs",
    "tests/run/gates/verdict-audit.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/verdict-audit.spec.mjs",
    "exit": 1,
    "output": "not ok 37 - BUG-286：critical_exemption 太短/不提 critical → claims-invalid"
  },
  "green": {
    "command": "node --test tests/run/gates/verdict-audit.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/verdict-audit.spec.mjs"
  }
}
```
