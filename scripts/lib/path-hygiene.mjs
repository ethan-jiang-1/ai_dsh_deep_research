/**
 * path-hygiene — run bundle 的本机 home 绝对路径检测（纯文本，不读盘）。
 * 为什么：run bundle 会被移交/归档；`/Users/<name>`、`/home/<name>`、`C:\Users\<name>`
 * 会把作者机器路径带出去，或在另一台机器断链。旧 bundle 按 epoch 豁免，新 bundle 由
 * scripts/run-gates/path-hygiene.mjs 显式检查。
 */
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
