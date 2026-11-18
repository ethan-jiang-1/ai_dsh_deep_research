---
status: 修复就绪
severity: P2
opened: 2026-11-19
---

# BUG-331：mkdir 成功但 owner.json 写失败时返回失败却留下锁目录

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（运行态/测试）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状

tryCreate 先 mkdir 再 writeFileSync；写入异常（磁盘满/权限）走 `error.code !== EEXIST` 返回 `{ok:false}`，但锁目录已创建，且没有 owner，后续 stale 依赖 catch 删除。

## 根因（已证）

创建不是原子的“目录+owner”两步。

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
