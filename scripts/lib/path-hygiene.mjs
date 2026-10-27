/**
 * path-hygiene — run bundle 的本机 home 绝对路径检测与可移植路径归一（纯文本/纯路径，不读盘）。
 * 为什么：run bundle 会被移交/归档；`/Users/<name>`、`/home/<name>`、`C:\Users\<name>`
 * 会把作者机器路径带出去，或在另一台机器断链。旧 bundle 按 epoch 豁免，新 bundle 由
 * scripts/run-gates/path-hygiene.mjs 显式检查。
 */
import { realpathSync } from 'node:fs'
import { basename, isAbsolute, resolve, sep } from 'node:path'

const HOME_PATH = /(?:^|[\s"'(（:：])(?:\/Users\/|\/home\/|[A-Za-z]:\\Users\\)/

/** 返回 [{ line, text }]；行号 1-based。 */
export function findHomePaths(text) {
  return String(text).split('\n').flatMap((line, index) => (
    HOME_PATH.test(line) ? [{ line: index + 1, text: line.trim() }] : []
  ))
}

/** 扫描 { path, text } 列表，返回带路径的 findings。 */
export function scanHomePaths(entries) {
  return entries.flatMap(({ path, text }) => findHomePaths(text).map((finding) => ({ path, ...finding })))
}

/**
 * 把 present/回执里的路径归一成「bundle 内可移植标签」。
 * - 已是相对路径：原样返回（旧样本/手写回执的既有形态）。
 * - bundle 内的绝对路径：`drt_<slug>/<相对路径>`（vendor `present` 记录的是绝对路径，
 *   这是最常见的输入）。
 * - bundle 外的绝对路径：返回 null——不得把本机路径写进回执，调用方必须拒收。
 * @param {string} path 原始路径。
 * @param {string} bundleDir bundle 根（绝对或可解析）。
 * @returns {string|null} 可移植标签或 null。
 */
export function portableBundlePath(path, bundleDir) {
  const raw = String(path ?? '')
  if (raw === '') return ''
  if (!isAbsolute(raw)) return raw.replace(/\\/g, '/')
  // 同一目录可能经 symlink 访问：present 记的是 realpath，bundleDir 可能不是——两侧都先
  // realpath（不存在的目标回落 resolve），否则会把自己的交付判成「bundle 外」。
  const realOrResolve = (value) => { try { return realpathSync(value) } catch { return resolve(value) } }
  const bundle = realOrResolve(bundleDir)
  const target = realOrResolve(raw)
  const prefix = bundle.endsWith(sep) ? bundle : `${bundle}${sep}`
  if (!target.startsWith(prefix)) return null
  const rel = target.slice(prefix.length).split(sep).join('/')
  return `${basename(bundle)}/${rel}`
}
