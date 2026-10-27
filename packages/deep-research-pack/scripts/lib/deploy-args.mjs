/**
 * deploy-args — scaffold 的严格参数解析（纯函数，不读盘）。
 *
 * 旧实现用 `argv.indexOf('--x')` + 下一个值：`--chek` 被静默忽略，`--workspace --force`
 * 把 `--force` 当路径创建 `./--force`，都是“以为在检查、实际在写盘”。本件把未知参数、
 * 缺值、值被下一个 flag 吞掉、互斥模式全部变成显式错误。
 */

const FLAGS = new Map([
  ['check', 'check'],
  ['upgrade', 'upgrade'],
  ['force', 'force'],
  ['adopt', 'adopt'],
  ['clean', 'clean'],
  ['write', 'write'],
  ['discard-sidecars', 'discardSidecars'],
  ['dry-run', 'dryRun'],
  ['install-only', 'installOnly'],
  ['seed-only', 'seedOnly'],
  ['refresh-team', 'refreshTeam'],
  ['help', 'help'],
])

const VALUES = new Map([
  ['workspace', 'workspace'],
  ['profile', 'profile'],
  ['host', 'host'],
  ['install-anchor', 'installAnchor'],
])

/**
 * DSH 的 profile 名规则：不能是空、`.`、`..`、`node_modules`，不能含路径分隔符。
 * @param {unknown} name
 * @returns {boolean}
 */
export function validateProfileName(name) {
  if (typeof name !== 'string' || name === '') return false
  if (name === '.' || name === '..' || name === 'node_modules') return false
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) return false
  return true
}

/**
 * @param {string[]} argv - 不含 node/脚本名的参数。
 * @returns {{
 *   ok: boolean,
 *   flags: { check: boolean, upgrade: boolean, force: boolean, adopt: boolean, clean: boolean, write: boolean, discardSidecars: boolean, dryRun: boolean, installOnly: boolean, seedOnly: boolean, refreshTeam: boolean, help: boolean },
 *   values: { workspace: string | null, profile: string, host: string | null, installAnchor: string | null },
 *   errors: string[],
 * }}
 */
export function parseScaffoldArgs(argv) {
  const flags = { check: false, upgrade: false, force: false, adopt: false, clean: false, write: false, discardSidecars: false, dryRun: false, installOnly: false, seedOnly: false, refreshTeam: false, help: false }
  const values = { workspace: null, profile: 'research', host: null, installAnchor: null }
  const errors = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help') { flags.help = true; continue }
    if (arg.startsWith('--')) {
      const name = arg.slice(2)
      if (FLAGS.has(name)) { flags[FLAGS.get(name)] = true; continue }
      if (VALUES.has(name)) {
        const value = argv[i + 1]
        if (value === undefined || value === '' || value.startsWith('--') || value.startsWith('-')) {
          errors.push(`${arg} 需要一个值（下一个参数是 ${value ?? '(缺失)'}）`)
          continue
        }
        values[VALUES.get(name)] = value
        i += 1
        continue
      }
      errors.push(`未知参数：${arg}`)
      continue
    }
    if (arg.startsWith('-')) {
      errors.push(`不支持短选项：${arg}（请用长选项）`)
      continue
    }
    errors.push(`多余的位置参数：${arg}`)
  }
  if (flags.help) return { ok: true, flags, values, errors: [] }
  if (values.workspace === null) errors.push('缺少 --workspace <研究工作区目录>')
  if (!validateProfileName(values.profile)) errors.push(`--profile 名不合法：${JSON.stringify(values.profile)}（不能含路径分隔符，不能是 . / .. / node_modules）`)
  if (flags.check && (flags.upgrade || flags.force)) errors.push('--check 只读，不能与 --upgrade/--force 同用')
  if (flags.force && flags.upgrade) errors.push('--force 与 --upgrade 不能同用（选一个：覆盖或安全升级）')
  if (flags.adopt && (flags.check || flags.force || flags.upgrade)) errors.push('--adopt 是显式接受当前工作区，不能与 --check/--force/--upgrade 同用')
  if (flags.write && !flags.clean) errors.push('--write 只用于 --clean（--write 单独出现没有对象）')
  if (flags.discardSidecars && !flags.clean) errors.push('--discard-sidecars 只用于 --clean（它只丢弃未合并的种子更新）')
  if (flags.clean && flags.write && flags.dryRun) errors.push('--dry-run 与 --clean --write 不能同用（--dry-run 就是 --clean 的报告模式）')
  if (flags.clean && (flags.check || flags.force || flags.upgrade || flags.adopt)) errors.push('--clean 是独立维护模式，不能与 --check/--force/--upgrade/--adopt 同用')
  return { ok: errors.length === 0, flags, values, errors }
}
