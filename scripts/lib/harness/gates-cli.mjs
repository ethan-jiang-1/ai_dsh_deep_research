// gates-cli.mjs — gates.e2e 的数值型 CLI 输入归一与有界并发（BUG-195 类级）。
//
// 为什么抽出：`--jobs=abc` 曾得到 NaN → `{length: NaN}` 零 worker → 每个结果都是 undefined，
// 聚合层把 `undefined !== null` 当成失败，报出 N 条「- undefined」的假红；`--jobs=1e999`
// 得到 Infinity，有界并行退化为无界。两个判据（正整数解析、并发上限）因此独立于驱动壳，
// 由 keyless spec 常驻钉住；驱动壳只负责把错误转成 exit 2。

/** 解析 `--jobs=<n>`：缺省返回 fallback；非正整数（NaN/Infinity/小数/0/负数/非数字）抛错并点名原值。 */
export function parseJobsArg(argv, fallback) {
  const raw = argv.find((arg) => arg.startsWith('--jobs='))?.slice('--jobs='.length)
  if (raw === undefined) return fallback
  if (!/^\d+$/.test(raw)) throw new Error(`--jobs 需要正整数（收到 ${JSON.stringify(raw)}）`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`--jobs 需要正整数（收到 ${JSON.stringify(raw)}）`)
  }
  return value
}

/** 有界并发 map：保持结果顺序；非法 limit（NaN/Infinity/小数/0/负数）在起 worker 前 fail-loud。 */
export async function boundedMap(items, limit, fn) {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError(`并发上限必须是正整数（收到 ${String(limit)}）`)
  }
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++
      if (index >= items.length) return
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}
