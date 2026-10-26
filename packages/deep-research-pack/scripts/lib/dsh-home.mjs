/**
 * dsh-home — 把 `$DSH_HOME` 解析成与 DSH 本体相同的绝对路径。
 *
 * 为什么单独成件：scaffold 要写 profile、preflight 要读凭据/profile；两者都必须与
 * `dsh` 解析到同一个 home。DSH 的规则见 vendor/dsh/packages/util/home-paths/src/index.ts：
 * 全空白 = 未设置；`~` / `~/` / `~\` 展开；其余原样 `resolve`。自己写一份 `resolve(env)`
 * 会在 `~/.dsh-custom`、空白值、相对路径上悄悄分叉（实测：凭据在 DSH 解析的 home 里，
 * preflight 却报“两者皆无”）。
 *
 * 只依赖 node:path / node:os，不读盘；tests/pack/dsh-home.test.mjs 直接断言。
 */
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * 展开 DSH 支持的 home 前缀。
 * @param {string} value - 可能以 `~` 开头的路径。
 * @param {string} [home] - 当前用户 home（测试注入）。
 * @returns {string} 展开后的路径；不支持的形态原样返回。
 */
export function expandHomePath(value, home = homedir()) {
  const text = String(value)
  if (text === '~') return home
  if (text.startsWith('~/') || text.startsWith('~\\')) return join(home, text.slice(2))
  return text
}

/**
 * 解析 DSH home：非空白 `$DSH_HOME` 优先，否则 `<home>/.dsh`；结果按 cwd 绝对化。
 * 注意：只把“全空白”视为未设置；非空值的首尾空格是路径的一部分（与 DSH 一致）。
 * @param {Record<string, string | undefined>} [env] - 环境映射。
 * @param {string} [home] - 当前用户 home（测试注入）。
 * @returns {string} 绝对路径。
 */
export function resolveDshHome(env = process.env, home = homedir()) {
  const configured = env?.DSH_HOME
  const selected = typeof configured === 'string' && configured.trim().length > 0
    ? expandHomePath(configured, home)
    : join(home, '.dsh')
  return resolve(selected)
}

/**
 * 解析一个用户输入的路径参数（`--workspace` / `--host` / `--install-anchor`）：
 * 支持 `~` 展开，再按 cwd 绝对化。
 * @param {string} value - 用户输入。
 * @param {string} [home] - 当前用户 home（测试注入）。
 * @returns {string} 绝对路径。
 */
export function resolvePathInput(value, home = homedir()) {
  return resolve(expandHomePath(String(value), home))
}
