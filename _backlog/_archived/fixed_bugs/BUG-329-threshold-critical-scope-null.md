---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-329：claims 不可读/无 claims 时 criticalEvidence=null，threshold 退回全部 evidence

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：已修（2026-11-21）— 结论：critical 范围未知不再退全部 evidence；给 unscoped warning，失败由 claims 判据承担；审查：agent — 注入红回归；去向：none — 合同收紧
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../../issues/2026-11-19-low-confidence-40.md)。

## 症状

protocol-audit 只在 claims 解析成功时提供 criticalEvidence；解析失败/无 claims 时 null，checkEvidenceThreshold 对所有 evidence 逐卡比。背景低质卡会让关键阈值假红。

## 根因（已证）

“critical 范围”在缺 claims 时静默退化为全部。

## 复现

复现状态：稳定 — 直接调判据函数，`criticalEvidence=null` 时背景卡被当作关键范围：

```sh
node --input-type=module -e "import { checkEvidenceThreshold } from './checks/lib/gates/protocol-audit-core.mjs'; console.log(checkEvidenceThreshold({ gates: { evidence_threshold: 'A' } }, [{ file: 'background.md', quality: 'C' }], 'deep', null))"
# 当前输出 red：background.md 被逐卡比；critical 范围未知时应为「无法确定」而非「低质关键证据」
```

## 修法

`criticalEvidence=null` 不再退全部：阈值判据给出显式 `unverifiable`（notice，不冒充通过也不假装红）；claims 不可读的失败由 claims 判据承担，避免同一个原因报两次。

## 修复判据

- null + 背景低质卡 → 无 `evidence-threshold` 红；有 critical 集时仍按集判且低质关键卡红；
- claims 不可读时只有 claims 判据红；`pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/protocol-audit-core.mjs",
    "tests/run/gates/protocol-core.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 1,
    "output": "回退旧 threshold：2 例红——null 时把背景低质卡当关键证据逐卡比"
  },
  "green": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 0,
    "output": "61 tests 全过：null → 1 条 unscoped warning；有 critical 集仍按集判"
  },
  "guard": {
    "path": "tests/run/gates/protocol-core.spec.mjs"
  }
}
```

可关闭：是
