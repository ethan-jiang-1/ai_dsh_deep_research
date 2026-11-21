---
status: 修复就绪
severity: P2
opened: 2026-11-19
---

# BUG-338：pickFreePort bind 0 后关闭再交给 dsh——检查与 bind 之间可被抢占

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（运行态/测试）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状

pickFreePort 取空闲端口后 close，后续 startWeb 再 bind；并发进程可在这窗口抢同一端口。

## 根因（已证）

端口分配不是原子持有（没有 fd 交接）。

## 复现

复现状态：未复现 — 抢占是时序窗口，稳定复现需并发进程；读法协议 = 在 `pickFreePort()` 返回后、`startWeb` bind 前由第二个进程占同一端口，观察失败是否被归成「端口不可用」并给出可行动诊断。

```sh
node --input-type=module -e "import { pickFreePort } from './checks/lib/harness/port-reclaim.mjs'; const p = await pickFreePort(); console.log('picked', p); const { createServer } = await import('node:net'); await new Promise((r) => { const s = createServer().listen(p, '127.0.0.1', () => { console.log('stolen', p); s.close(r) }) })"
```

## 修法

不做「预留」假承诺：bind 冲突 → 换端口有界重试（2–3 次），仍失败 exit 1 并打印实际端口与占用者；卡上写明「TOCTOU 未被消除，只被兜住」。

## 修复判据

- 抢占后下一次尝试换端口成功；重试耗尽 exit 1 且诊断含端口；
- 不无限重试；`pnpm verify` / `pnpm test` 绿。
