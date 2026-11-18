---
status: 等人拍板
severity: P2
opened: 2026-11-19
---

# BUG-329：claims 不可读/无 claims 时 criticalEvidence=null，threshold 退回全部 evidence

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：等人拍板（门禁/合同触面）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状

protocol-audit 只在 claims 解析成功时提供 criticalEvidence；解析失败/无 claims 时 null，checkEvidenceThreshold 对所有 evidence 逐卡比。背景低质卡会让关键阈值假红。

## 根因（已证）

“critical 范围”在缺 claims 时静默退化为全部。

## 复现

复现状态：稳定（读码/临时脚本/局部命令）。

```sh
# 证据见症状与当前源码；临时验证只读，不改仓库
```

## 修法

1. 为锁/端口/缓存/plan 字段补 owner token、校验或范围；
2. 加正反控与旧场/迁移豁免；
3. 两套入口共用同一实现。

## 修复判据

- 该缺口有正反控；旧场/合法路径不误伤；
- `pnpm verify` / `pnpm test` 绿。
