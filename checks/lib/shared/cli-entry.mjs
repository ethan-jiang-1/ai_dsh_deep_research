// cli-entry.mjs — 共享 CLI 入口判定（symlink-safe）。
//
// 为什么：macOS `/tmp` → `/private/tmp`；按字面路径或 `resolve()` 比较会让
// `main()` 在 symlink checkout 下静默不执行（bootstrap 误报、dev 工具假绿）。
// realpath 归一后比较同一文件；`argv1` 缺省取 `process.argv[1]`。
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** @param {string} metaUrl `import.meta.url` @param {string} [argv1] CLI 入口路径 */
export function isMain(metaUrl, argv1 = process.argv[1]) {
  if (argv1 === undefined) return false;
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}

/**
 * CLI 参数解析（共享正本）：把 `argv`（已去掉 node/script）拆成位置参数 + 带值选项。
 *
 * 为什么需要（BUG-406）：三个 run-gate 壳各自手写 `--sessions` 过滤——`argv.find((a) => !a.startsWith('--'))`
 * 会把选项的**值**当位置参数（`--sessions tmp/sess` 传相对路径时更明显：`resolve()` 后与 raw argv
 * 不相等，比较守卫放空），于是真 bundle 被忽略、门禁对会话目录全落 N/A 假绿；缺值时
 * `resolve(undefined)` 还会抛未捕获 TypeError 而不是 exit 2。
 *
 * 口径：`valueFlags` 里的选项消费下一个 token 作值（值缺失、或值本身以 `--` 开头 = 结构化错误，
 * fail-loud 优于猜）；其余 `--flag` 只作开关；剩下的是位置参数，保持原序。
 * @param {readonly string[]} argv - `process.argv.slice(2)`。
 * @param {{ readonly valueFlags?: readonly string[] }} [options] - 需要取值的选项（如 `['--sessions']`）。
 * @returns {{ positionals: string[], values: Map<string, string>, error: string | null }} 解析结果。
 */
export function cliArgsOf(argv, { valueFlags = [] } = {}) {
  const list = Array.isArray(argv) ? argv.filter((item) => typeof item === 'string') : []
  const positionals = []
  const values = new Map()
  for (let i = 0; i < list.length; i += 1) {
    const arg = list[i]
    if (valueFlags.includes(arg)) {
      const value = list[i + 1]
      if (value === undefined || value.startsWith('--')) {
        return { positionals: [], values, error: `${arg} 需要一个值（收到 ${value === undefined ? '空' : value}）` }
      }
      values.set(arg, value)
      i += 1
      continue
    }
    if (arg.startsWith('--')) continue
    positionals.push(arg)
  }
  return { positionals, values, error: null }
}
