/**
 * args — 产品启动器自己的 flag 解析；遇到第一个非产品 token 后，剩余原样交给 dsh。
 *
 * 为什么不是 commander：产品 flag 与 Web flag 共享 `--port`/`--no-open` 等命名，且必须
 * 保证"未知 token 原样转发"（不是报错）；一个 60 行的线性扫描比引依赖更可控。`--workspace`
 * 等值 flag 的缺值/吞 flag 必须 fail-loud（scaffold 的 deploy-args 同款教训）。
 */

/** 值 flag → 结果字段。 */
const VALUE_FLAGS = new Map([
  ['--workspace', 'workspace'],
  ['--root', 'root'],
  ['--profile', 'profile'],
  ['--home', 'home'],
])

/** 布尔 flag → 结果字段。 */
const BOOLEAN_FLAGS = new Map([
  ['--check', 'check'],
  ['--setup-only', 'setupOnly'],
  ['--no-seed', 'noSeed'],
  ['--in-place', 'inPlace'],
  ['--gitignore-append', 'gitignoreAppend'],
  ['--refresh-team', 'refreshTeam'],
  ['--help', 'help'],
  ['-h', 'help'],
  ['--version', 'version'],
  ['-V', 'version'],
])

/**
 * 解析启动器参数。
 * @param {readonly string[]} argv - process.argv.slice(2)。
 * @returns {{ ok: boolean, errors: string[], values: Record<string, string>, flags: Record<string, boolean>, forwarded: string[] }}
 */
export function parseLauncherArgs(argv) {
  const errors = []
  const values = {}
  const flags = { check: false, setupOnly: false, noSeed: false, inPlace: false, gitignoreAppend: false, refreshTeam: false, help: false, version: false }
  const forwarded = []
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--') {
      forwarded.push(...argv.slice(i + 1))
      break
    }
    if (token.startsWith('--') && token.includes('=')) {
      const [name, ...rest] = token.split('=')
      const value = rest.join('=')
      if (VALUE_FLAGS.has(name)) {
        if (value === '') errors.push(`${name} 需要一个值（当前为空）`)
        else values[VALUE_FLAGS.get(name)] = value
        continue
      }
      if (BOOLEAN_FLAGS.has(name)) {
        errors.push(`${name} 不接受值（布尔 flag）`)
        continue
      }
      forwarded.push(token, ...argv.slice(i + 1))
      break
    }
    if (VALUE_FLAGS.has(token)) {
      const next = argv[i + 1]
      if (next === undefined || next === '' || next.startsWith('-')) {
        errors.push(`${token} 需要一个值（下一个参数是 ${next ?? '(缺失)'}）`)
        continue
      }
      values[VALUE_FLAGS.get(token)] = next
      i++
      continue
    }
    if (BOOLEAN_FLAGS.has(token)) {
      flags[BOOLEAN_FLAGS.get(token)] = true
      continue
    }
    // 第一个非产品 token = dsh 参数的起点；后面全部原样转发（含 --workspace 之类的
    // 字符串值，避免把 Web 参数里的同名 token 误当产品 flag）。
    forwarded.push(token, ...argv.slice(i + 1))
    break
  }
  return { ok: errors.length === 0, errors, values, flags, forwarded }
}

/**
 * 启动器帮助文本。
 * @param {string} version
 * @returns {string}
 */
export function helpText(version) {
  return `dsh-deep-research ${version} — Deep Research 产品启动器

用法:
  dsh-deep-research [产品 flag] [dsh/web flag...]

产品 flag（本进程消费，不转发）:
  --workspace <dir>   研究工作区/项目锚（相对路径按 cwd）
  --root <dir>        研究根（默认 <workspace> 或 <workspace>/research）
  --profile <name>    产品 profile（默认 deep-research）
  --home <dir>        本次使用该 DSH_HOME（默认继承环境/~/.dsh）
  --check             只读检查，不安装、不起 Web
  --setup-only        装配 profile/铺种子/写设置后退出（不起 Web）
  --no-seed           跳过种子铺开
  --in-place          用 <workspace> 本身作为研究根（不建子目录）
  --gitignore-append  用户确认后向已有 .gitignore 追加研究数据拒绝规则
  --refresh-team      显式更新版本不符的团队机制层
  -h, --help          显示本帮助
  -V, --version       显示启动器版本

其余参数原样交给 dsh，例如:
  dsh-deep-research --workspace ~/research --port 3080 --no-open

环境:
  DEEP_RESEARCH_WORKSPACE   工作区（--workspace 优先）
  DSH_HOME                  DSH home（--home 优先）
`
}
