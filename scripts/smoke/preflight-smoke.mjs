#!/usr/bin/env node
// preflight-smoke.mjs — preflight 的解析锚与“安装形状”断言（keyless，无 dsh、无网络、无模型）。
//
// 为什么需要：preflight 曾在真用户 home 上误报 17 个 peer 缺失，而仓库内冒烟因为
// createRequire 从 profile 向上走进仓库 node_modules 而假绿。本冒烟把 home/profile/anchor
// 全放在系统临时目录（仓库外），用 fake anchor 精确控制“安装里有哪些行依赖”。
//
// 证明：
//   ① fake anchor 齐全 → preflight --install-only 绿；
//   ② 从 fake anchor 删一个行依赖 → 必须红并点名该包（不能从 profile/仓库泄漏满足）；
//   ③ 无 anchor 且 PATH 无 dsh → 行依赖/版本标“未验证”，不硬红；
//   ④ base-only profile（缺 web app）→ 红（后续切片）；
//   ⑤ 契约类种子被改 → 详情点名「与包版本不同源」，但不变硬红（D35）。
// 不证明：真实 DSH 安装的包布局（real-home-smoke 负责），模型就绪（--install-only 明确不宣称）。
//
// 用法：node scripts/smoke/preflight-smoke.mjs
// 退出码遵循 scripts/AGENTS 的 verdict contract：绿 / 断言红 / 前置缺席（未跑 ≠ 通过）。
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from '../lib/env.mjs'
import { rowPeerNames } from '../../packages/deep-research-pack/scripts/lib/pack-rows.mjs'
import { CREDENTIALS_FILENAME } from '../../packages/deep-research-pack/scripts/lib/credentials-status.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const PREFLIGHT = join(PACK, 'scripts', 'preflight.mjs')
const SCAFFOLD = join(PACK, 'scripts', 'scaffold.mjs')
const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'
const WEB = '@deepseek-ai/dsh-web-app'
const VERSION = '0.2.1-rc.3'

if (!existsSync(PREFLIGHT)) {
  console.error(`preflight-smoke: 前置缺席：${PREFLIGHT}`)
  process.exit(2)
}

const root = mkdtempSync(join(tmpdir(), 'dsh-preflight-smoke-'))
const home = join(root, 'home')
const dshHome = join(root, 'dshhome')
const anchor = join(root, 'anchor')
const profile = join(root, 'profiles', 'smoke')
const ws = join(root, 'ws')
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const env = (extra = {}) => scrubbedEnv({ HOME: home, DSH_HOME: dshHome, PATH: '/usr/bin:/bin', ...extra })

function writePackage(dir, name, version = VERSION) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ name, version, main: 'index.js' }, null, 2)}\n`)
  writeFileSync(join(dir, 'index.js'), 'export {}\n')
}

function writeAnchor(names) {
  mkdirSync(anchor, { recursive: true })
  writeFileSync(join(anchor, 'package.json'), `${JSON.stringify({
    name: '@deepseek-ai/dsh', version: VERSION, bin: { dsh: 'lib/bin.js' },
  }, null, 2)}\n`)
  for (const name of names) writePackage(join(anchor, 'node_modules', name.split('/')[0], name.split('/')[1]), name)
}

function writeProfile({ web = true } = {}) {
  mkdirSync(profile, { recursive: true })
  const bundles = ['@deepseek-ai/dsh-base', ...(web ? [WEB] : []), 'dsh-deep-research-pack', TEAM]
  writeFileSync(join(profile, 'package.json'), `${JSON.stringify({
    name: 'dsh-profile-smoke', private: true,
    dependencies: { [TEAM]: VERSION },
    dsh: { profile: { bundles } },
  }, null, 2)}\n`)
  writePackage(join(profile, 'node_modules', ...TEAM.split('/')), TEAM)
}

function run(extraArgs = [], { workspacePath = ws, extraEnv = {}, installOnly = true } = {}) {
  const args = [PREFLIGHT, ...(installOnly ? ['--install-only'] : []), '--workspace', workspacePath, '--host', profile, ...extraArgs]
  return spawnSync(process.execPath, args, { encoding: 'utf8', env: env(extraEnv) })
}

function seedInto(dir) {
  const seeded = spawnSync(process.execPath, [SCAFFOLD, '--seed-only', '--workspace', dir], { encoding: 'utf8', env: env() })
  return seeded
}

try {
  mkdirSync(home, { recursive: true })
  mkdirSync(dshHome, { recursive: true })
  writeProfile()
  const rows = rowPeerNames(PACK)
  check(rows.length > 0, '从 pack 抽到行依赖', `rows=${rows.length}`)
  writeAnchor(rows)
  const seeded = seedInto(ws)
  check(seeded.status === 0, 'fixture 工作区铺种（scaffold --seed-only）', (seeded.stderr || seeded.stdout || '').slice(-300))

  const missingValue = spawnSync(process.execPath, [PREFLIGHT, '--install-only', '--workspace', '--force', '--host', profile], { encoding: 'utf8', env: env() })
  check(missingValue.status === 2 && /--workspace/.test(missingValue.stderr), 'preflight 缺值被拒绝（exit 2）', missingValue.stderr)

  const good = run(['--install-anchor', anchor]);
  check(good.status === 0, 'fake anchor 齐全 → preflight --install-only 绿',
    `${good.status}\n${(good.stdout || '').split('\n').filter((line) => line.includes('✗')).join(' | ')}`)
  check(!/平台行依赖[\s\S]{0,200}缺/.test(good.stdout || ''), '齐全 anchor 不报 peer 缺失')

  // 工作区已有别人的 AGENTS.md，且 state 没把它记成我们的种子：不能只看“文件在场”。
  const wsBad = join(root, 'ws-bad-agents')
  check(seedInto(wsBad).status === 0, 'fixture 工作区（bad AGENTS）铺种')
  writeFileSync(join(wsBad, 'AGENTS.md'), '# existing project instructions — NOT the research manual\n')
  const badStatePath = join(wsBad, '.dsh-research-seed.json')
  const badState = JSON.parse(readFileSync(badStatePath, 'utf8'))
  delete badState.files['AGENTS.md']
  writeFileSync(badStatePath, `${JSON.stringify(badState, null, 2)}\n`)
  const badAgents = run(['--install-anchor', anchor], { workspacePath: wsBad })
  check(badAgents.status === 1, 'untracked AGENTS → preflight 红', `exit=${badAgents.status}`)
  check(/untracked/.test(badAgents.stdout || ''), '红项说明 untracked（不是我们的种子）', (badAgents.stdout || '').split('\n').filter((line) => line.includes('✗')).join(' | '))

  // 不可读的手册：必须给可读失败，而不是 Node 栈。
  const wsUnreadable = join(root, 'ws-unreadable')
  check(seedInto(wsUnreadable).status === 0, 'fixture 工作区（unreadable）铺种')
  chmodSync(join(wsUnreadable, 'AGENTS.md'), 0o000)
  const unreadable = run(['--install-anchor', anchor], { workspacePath: wsUnreadable })
  check(unreadable.status === 1, '不可读 AGENTS → preflight 红', `exit=${unreadable.status}`)
  check(/unreadable|不可读/.test(unreadable.stdout || ''), '红项说明 unreadable/不可读')
  check(!/node:fs:|readFileSync/.test(`${unreadable.stdout ?? ''}${unreadable.stderr ?? ''}`), '不可读不抛 Node 栈')
  chmodSync(join(wsUnreadable, 'AGENTS.md'), 0o644)

  // 方法库缺席是警告（不是研究纪律的硬阻断）：必须显式出现，不能静默绿。
  const wsNoMethod = join(root, 'ws-no-method')
  check(seedInto(wsNoMethod).status === 0, 'fixture 工作区（no method）铺种')
  rmSync(join(wsNoMethod, 'method-library.md'), { force: true })
  const noMethod = run(['--install-anchor', anchor], { workspacePath: wsNoMethod })
  check(noMethod.status === 0, '方法库缺席 → 不硬红', `exit=${noMethod.status}`)
  check(/方法库/.test(noMethod.stdout || ''), '方法库缺席在输出里显式列出')

  // 契约类种子漂移（D35）：详情点名，但不改阻塞判据（用户可能有意定制）
  const wsDrift = join(root, 'ws-contract-drift')
  check(seedInto(wsDrift).status === 0, 'fixture 工作区（contract drift）铺种')
  writeFileSync(join(wsDrift, 'NODES.md'), `${readFileSync(join(wsDrift, 'NODES.md'), 'utf8')}\n<!-- local node contract edit -->\n`)
  const drift = run(['--install-anchor', anchor], { workspacePath: wsDrift })
  check(drift.status === 0, '契约类漂移只提示，不硬红', `exit=${drift.status}`)
  check(/契约类种子（policy=contract）与包版本不同源/.test(drift.stdout || ''), '契约类漂移在详情里点名', (drift.stdout || '').split('\n').filter((l) => l.includes('NODES.md')).join(' | '))

  // 空凭据文件不是“有 key”；workspace/.env 才是 DSH 支持的来源之一。
  writeFileSync(join(dshHome, CREDENTIALS_FILENAME), '')
  const emptyCred = run(['--install-anchor', anchor], { installOnly: false })
  check(emptyCred.status === 1, '空凭据文件 → 默认 preflight 红', `exit=${emptyCred.status}`)
  check(/模型密钥[\s\S]{0,200}(没有非空|未找到|DEEPSEEK_API_KEY)/.test(emptyCred.stdout || ''), '空凭据文件不说“在场即已配置”')
  rmSync(join(dshHome, CREDENTIALS_FILENAME), { force: true })
  writeFileSync(join(ws, '.env'), 'DEEPSEEK_API_KEY=sk-workspace-fixture\n')
  const envCred = run(['--install-anchor', anchor], { installOnly: false })
  check(envCred.status === 0, 'workspace/.env 的 key → 默认 preflight 绿', `exit=${envCred.status}\n${(envCred.stdout || '').split('\n').filter((line) => line.includes('✗')).join(' | ')}`)
  rmSync(join(ws, '.env'), { force: true })

  // base-only profile：缺 web app 时不可能有 GUI，preflight 不能宣称安装验收通过。
  writeProfile({ web: false })
  const baseOnly = run(['--install-anchor', anchor])
  check(baseOnly.status === 1, 'base-only profile → preflight 红', `exit=${baseOnly.status}`)
  check(/profile 组成/.test(baseOnly.stdout || ''), '红项点名 profile 组成（web）', (baseOnly.stdout || '').split('\n').filter((line) => line.includes('✗')).join(' | '))
  writeProfile()

  // 删一个真实行依赖：preflight 必须从 anchor 解析失败，不能从 profile/仓库向上走找到。
  const missingName = rows[0]
  const encoded = missingName.startsWith('@') ? missingName.split('/') : [missingName]
  rmSync(join(anchor, 'node_modules', ...encoded), { recursive: true, force: true })
  const missing = run(['--install-anchor', anchor]);
  check(missing.status === 1, 'anchor 缺行依赖 → preflight 红', `exit=${missing.status}`)
  check((missing.stdout || '').includes(missingName), '红项点名缺失包', missingName)

  // 无显式 anchor 且 PATH 无 dsh：不硬红，标未验证（exit 0 但汇总含未验证项）。
  const unknown = run([]);
  check(unknown.status === 0, '无 anchor 且 PATH 无 dsh → 不硬红', `exit=${unknown.status}\n${(unknown.stdout || '').split('\n').filter((line) => line.includes('✗')).join(' | ')}`)
  check(/未验证|无法判定/.test(unknown.stdout || ''), '无 anchor 时汇总显式标未验证')
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  rmSync(root, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\npreflight-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('preflight-smoke: ALL PASS（fake anchor 的 peer/未验证面）')
process.exit(0)
