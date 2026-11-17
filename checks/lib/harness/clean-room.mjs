// clean-room.mjs — 干净室安装测试的唯一实现（BUG-233 / 234 / 235 类级）。
//
// 为什么：三个「安装测试」各缺一半——cold-start 在仓内 TEMP、走 run-driver 的源树；release.entry
// 只许 runtime/harness-home；lifecycle.entry 用 PATH 上的全局 dsh。三者都能被仓根 node_modules /
// 全局 DSH 的依赖兜底，于是缺失 peer 照样绿。本模块把「干净室」收成可执行的矩阵：
//
//   home  ∈ 仓外 mkdtemp（不在仓库祖先链上）       ← cleanHome
//   DSH   = vendor 钉版 wrapper（默认）或显式全局  ← pinnedDshBin / --global-dsh
//   pack  = _dist tarball 真实安装（plugin add）  ← installTarball
//   解析  不经过 ROOT/node_modules（否则 = 假绿）   ← moduleLeakOf
//   版本  dsh --version ∈ engines.dsh             ← engineIssues
//
// 消费方：checks/smoke/{cold-start,release,lifecycle}.entry.mjs。本文件含子进程 → 只能 smoke 档
// （tests/checks/test-infra/test-surface.test.mjs 的 SMOKE_ONLY 登记）；纯判据（engineIssues/moduleLeakOf 的
// 版本与祖先判定）由 pack-deps.test 间接覆盖，spawn 行为只在真入口跑。

import { spawn, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scrubbedEnv } from '../shared/env.mjs'
import { dshVersionOfOutput, engineVersionIssues, isOutsideRepo, repoLeaksOf } from './clean-room-policy.mjs'

export { isOutsideRepo }

/** 仓外 mkdtemp home（不在仓库祖先链上）。 */
export function cleanHome(root, prefix) {
  const home = mkdtempSync(join(tmpdir(), `${prefix}-`))
  if (!isOutsideRepo(root, home)) {
    rmSync(home, { recursive: true, force: true })
    throw new Error(`clean-room: 临时 home 落在仓库内（${home}）——干净室不成立`)
  }
  return home
}

/** vendor 钉版 dsh 的 wrapper（不经 PATH/全局安装）。缺席返回 null（调用方 exit 2）。 */
export function pinnedDshBin(root) {
  const bin = join(root, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
  if (!existsSync(bin)) return null
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pinned-'))
  const wrapper = join(dir, 'dsh')
  writeFileSync(wrapper, `#!/usr/bin/env bash\nexec env TSX_TSCONFIG_PATH="${root}/tsconfig.json" node --import tsx/esm "${bin}" "$@"\n`)
  chmodSync(wrapper, 0o755)
  return wrapper
}

/** `dsh --version` → { status, version }（版本行可能是多行，取最后一个 semver）。 */
export function versionOf(bin, { cwd } = {}) {
  const result = spawnSync(bin, ['--version'], { encoding: 'utf8', env: scrubbedEnv(), cwd })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  return { status: result.status, version: dshVersionOfOutput(output), output: output.slice(-400) }
}

/** 版本对账：dsh --version 必须落在 pkg.engines.dsh。返回问题数组（空 = 绿）。 */
export function engineIssues(root, bin, pkg, { cwd } = {}) {
  const { status, output } = versionOf(bin, { cwd })
  if (status !== 0) return [`dsh --version 不可用（exit ${String(status)}）：${output}`]
  return engineVersionIssues(dshVersionOfOutput(output), pkg?.engines?.dsh)
}

/**
 * 模块解析祖先检查：从 home 解析 names；若命中 ROOT 内的路径 = 仓内依赖泄漏（假绿）。
 * 解析不到 = 干净室（缺失 peer 应在这里暴露，而不是被仓根 node_modules 补齐）。
 */
export function moduleLeakOf({ home, root, names }) {
  const requireFromHome = createRequire(join(home, 'clean-room-probe.cjs'))
  const resolvedPaths = []
  for (const name of names) {
    try { resolvedPaths.push(requireFromHome.resolve(name)) } catch { /* 解析不到 = 干净室 */ }
  }
  return repoLeaksOf(root, resolvedPaths)
}

/** 建 web 模板 profile（自定义 profile 名默认只有 base，起不了 web——先补 web-app）。 */
export function initWebProfile({ bin, home, profile, cwd, timeoutMs = 180_000 }) {
  const result = spawnSync(bin, ['--profile', profile, '--from-default-profile', 'web', '--dump-config'], {
    encoding: 'utf8', cwd, timeout: timeoutMs,
    env: scrubbedEnv({ DSH_HOME: home, npm_config_cache: join(home, '.npm-cache') }),
  })
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.slice(-4000) }
}

/** 真实安装：`dsh plugin --profile <profile> add file:<tarball>`，home = 干净 home。 */
export function installTarball({ bin, home, profile, tarball, cwd, timeoutMs = 180_000 }) {
  const result = spawnSync(bin, ['plugin', '--profile', profile, 'add', `file:${tarball}`], {
    encoding: 'utf8', cwd, timeout: timeoutMs,
    env: scrubbedEnv({ DSH_HOME: home, npm_config_cache: join(home, '.npm-cache') }),
  })
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.slice(-4000) }
}

/**
 * 干净室起 web：`dsh --profile <profile> --no-open --port <port>`，等启动横幅里的 token URL。
 * 返回 { url, child, output }；超时/早退抛错（调用方判红并留现场）。
 */
export function startWeb({ bin, home, profile, port, cwd, timeoutMs = 120_000 }) {
  const child = spawn(bin, ['--profile', profile, '--no-open', '--port', String(port)], {
    cwd, stdio: ['ignore', 'pipe', 'pipe'],
    env: scrubbedEnv({ DSH_HOME: home, MCP_PLAYWRIGHT: '0' }),
  })
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  let output = ''
  const collect = (chunk) => { output = (output + chunk).slice(-64_000) }
  child.stdout.on('data', collect)
  child.stderr.on('data', collect)
  return new Promise((resolveStarted, rejectStarted) => {
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM') } catch { /* 已退出 */ }
      rejectStarted(new Error(`clean-room: web 启动超时（${timeoutMs}ms）\n${output.split('\n').slice(-15).join('\n')}`))
    }, timeoutMs)
    const tick = setInterval(() => {
      const m = /dsh web:\s*(http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/.exec(output)
      if (m === null) return
      clearInterval(tick)
      clearTimeout(timer)
      resolveStarted({ url: m[1], child, output: () => output })
    }, 100)
    child.once('error', (error) => { clearInterval(tick); clearTimeout(timer); rejectStarted(error) })
    child.once('exit', (code, signal) => {
      clearInterval(tick)
      clearTimeout(timer)
      rejectStarted(new Error(`clean-room: web 早退（code=${String(code)} signal=${String(signal)}）\n${output.split('\n').slice(-15).join('\n')}`))
    })
  })
}

/** 停止 web（SIGTERM → 有界等待 → SIGKILL），返回是否确认退出。 */
export async function stopWeb(child, { graceMs = 5000 } = {}) {
  if (child === null || child.exitCode !== null) return true
  return new Promise((resolveStopped) => {
    const killer = setTimeout(() => { try { child.kill('SIGKILL') } catch { /* 已退出 */ } }, graceMs)
    child.once('exit', () => { clearTimeout(killer); resolveStopped(true) })
    try { child.kill('SIGTERM') } catch { clearTimeout(killer); resolveStopped(true) }
  })
}
