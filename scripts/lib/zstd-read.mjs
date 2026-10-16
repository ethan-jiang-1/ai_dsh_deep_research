// zstd-read.mjs — 会话日志 zstd 文本解压的**唯一调用段**（keyless；子进程，故只许 shells 用）。
//
// 为什么收敛（2026-10-16 结构收敛 round3 §A）：node-gate 与 evidence-audit 两壳各有一段
// **逐字相同**的 `spawnSync('zstd', ['-dc', p], { maxBuffer: 64MB })`。多帧拼接日志靠 CLI 解全帧
// （node zlib 不自带多帧拼接，2026-09-26 实测）。
//
// ⚠ **失败契约不收敛**（两壳各自的判据载重墙，刻意保留在消费方）：node-gate 解压失败按**空语料继续**
// （`''`——缺失偏假红方向），evidence-audit 返回 `null` **跳过该文件**（语料缺失同样偏红，但不得
// 把半份语料当全份）。本件只回答"解压成功与否"，不替消费方决定失败语义，也不吞 stderr——
// 报线索是各壳的 fail-loud 义务。
//
// 消费方：scripts/run-gates/node-gate.mjs、scripts/run-gates/evidence-audit.mjs。

import { spawnSync } from 'node:child_process'

/** zstd CLI 文本解压：成功 → `{ ok: true, text }`；失败 → `{ ok: false, text: null }`（不抛、不猜）。 */
export function readZstdText(path) {
  const r = spawnSync('zstd', ['-dc', path], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) return { ok: false, text: null }
  return { ok: true, text: r.stdout }
}
