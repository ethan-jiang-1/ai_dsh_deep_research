// gates-cli.mjs — gates.e2e 的 CLI 输入归一与有界并发（BUG-195 / BUG-203 类级）。
//
// 为什么抽出：`--jobs=abc` 曾得到 NaN → `{length: NaN}` 零 worker → 每个结果都是 undefined，
// 聚合层把 `undefined !== null` 当成失败，报出 N 条「- undefined」的假红；`--jobs=1e999`
// 得到 Infinity，有界并行退化为无界。`--case=` 空值又曾静默退化为「没有过滤器」而跑全量。
// 判据（两种 flag 形状、空值/未知参数 fail-loud、并发上限）因此独立于驱动壳，由 keyless spec
// 常驻钉住；驱动壳只负责把错误转成 exit 2。

/** `--jobs` 值：必须是正整数字面量（NaN/Infinity/小数/0/负数/非数字一律点名原值）。 */
function positiveInt(raw) {
  if (!/^\d+$/.test(raw)) throw new Error(`--jobs 需要正整数（收到 ${JSON.stringify(raw)}）`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`--jobs 需要正整数（收到 ${JSON.stringify(raw)}）`)
  }
  return value
}

/** `--case` / `--gate` 共用的逗号列表取值：空值/缺值/下一参数是 flag 一律点名原值。 */
function csvValue(flag, raw) {
  if (raw === undefined || raw.trim() === '' || raw.startsWith('-')) {
    throw new Error(`${flag} 需要非空列表（收到 ${raw === undefined ? '缺值' : JSON.stringify(raw)}）`)
  }
  const items = raw.split(',').map((item) => item.trim())
  if (items.some((item) => item === '')) throw new Error(`${flag} 含空项（收到 ${JSON.stringify(raw)}）`)
  return items
}

/**
 * 解析 gates.e2e 的 argv（调用方传 `process.argv.slice(2)`）。
 * 支持 `--name=value` 与 `--name value` 两种形状；`--case` / `--gate` 可重复、逗号分隔。
 * 空值/缺值/未知 flag/位置参数一律抛错（调用方转 exit 2）。
 *
 * `--gate`（2026-11-18）是**选择面**：按案例表每行已有的 `gate` 字段过滤，零新映射；
 * 改哪道门禁就只跑哪道门禁的案例（日常迭代口），全量只在发布/夜间跑。
 * 两个 flag 同时给时由驱动壳取交集；选择不改任何案例的断言。
 */
export function parseE2eArgs(argv, fallbackJobs) {
  const cases = []
  const gates = []
  let jobs = fallbackJobs
  let help = false
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      help = true
      continue
    }
    if (arg === '--case' || arg.startsWith('--case=')) {
      cases.push(...csvValue('--case', arg === '--case' ? argv[++i] : arg.slice('--case='.length)))
      continue
    }
    if (arg === '--gate' || arg.startsWith('--gate=')) {
      gates.push(...csvValue('--gate', arg === '--gate' ? argv[++i] : arg.slice('--gate='.length)))
      continue
    }
    if (arg === '--jobs' || arg.startsWith('--jobs=')) {
      const raw = arg === '--jobs' ? argv[++i] : arg.slice('--jobs='.length)
      if (raw === undefined || raw.trim() === '' || raw.startsWith('-')) {
        throw new Error(`--jobs 需要正整数（收到 ${raw === undefined ? '缺值' : JSON.stringify(raw)}）`)
      }
      jobs = positiveInt(raw)
      continue
    }
    if (arg.startsWith('-')) throw new Error(`未知参数 ${arg}（白名单：--case / --gate / --jobs / --help）`)
    throw new Error(`不接受位置参数 ${JSON.stringify(arg)}（白名单：--case / --gate / --jobs / --help）`)
  }
  return { cases, gates, jobs, help }
}

/** 兼容单值消费者：只取 `--jobs`，其余 flag 也按 parseE2eArgs 的同一剖格拒收。 */
export function parseJobsArg(argv, fallback) {
  return parseE2eArgs(argv, fallback).jobs
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
