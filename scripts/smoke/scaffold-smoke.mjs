#!/usr/bin/env node
// scaffold-smoke.mjs — scaffold 的 CLI 行为证据（keyless，无 dsh/模型/网络）。
//
// 为什么需要：seed-core 单测只证分类纯函数；源码字符串断言挡不住“字面量还在、分支写坏”。
// 本 smoke 用临时 pack 副本 + 临时工作区真跑 CLI，覆盖：首次铺种、--force 保方法库、
// --check 的 missing/deleted/modified、--upgrade 只升级未改文件并写 .seed-new。
//
// 用法：node scripts/smoke/scaffold-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席（未跑 ≠ 通过）
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from '../../packages/deep-research-pack/scripts/lib/seed-core.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `scaffold-smoke-${process.pid}`)
const PACKCOPY = join(TEMP, 'pack')
const SCAFFOLD = join(PACKCOPY, 'scripts', 'scaffold.mjs')

const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const run = (args) => spawnSync(process.execPath, [SCAFFOLD, '--seed-only', ...args], { encoding: 'utf8' })
const read = (p) => readFileSync(p, 'utf8')

if (!existsSync(join(PACK, 'workspace', 'seed.json'))) {
  console.error('scaffold-smoke: pack workspace/seed.json 缺席——未跑 ≠ 通过')
  process.exit(2)
}

try {
  mkdirSync(PACKCOPY, { recursive: true })
  cpSync(join(PACK, 'package.json'), join(PACKCOPY, 'package.json'))
  cpSync(join(PACK, 'scripts', 'scaffold.mjs'), join(PACKCOPY, 'scripts', 'scaffold.mjs'))
  cpSync(join(PACK, 'scripts', 'lib'), join(PACKCOPY, 'scripts', 'lib'), { recursive: true })
  cpSync(join(PACK, 'workspace'), join(PACKCOPY, 'workspace'), { recursive: true })
  const seed = JSON.parse(read(join(PACKCOPY, 'workspace', 'seed.json')))

  // ① 首次铺种 + 状态文件
  const ws = join(TEMP, 'ws')
  const install = run(['--workspace', ws])
  check(install.status === 0, '首次 --seed-only 铺种', install.stderr)
  check(existsSync(join(ws, 'AGENTS.md')) && existsSync(join(ws, '.gitignore')), '种子文件落地（AGENTS/.gitignore）')
  check(existsSync(join(ws, '.dsh-research-seed.json')), '状态文件落地')
  const state = JSON.parse(read(join(ws, '.dsh-research-seed.json')))
  check(state.version === seed.version && Object.keys(state.files ?? {}).length === Object.keys(seed.files).length,
    '状态版本/文件数与 seed.json 一致')

  // ② --force 覆盖版本化种子，但保用户方法库
  writeFileSync(join(ws, 'AGENTS.md'), '# user manual\n')
  writeFileSync(join(ws, 'method-library.md'), '# user library\n## 我的偏好\n- 找来源: custom\n')
  const force = run(['--force', '--workspace', ws])
  check(force.status === 0, '--force 执行')
  check(read(join(ws, 'AGENTS.md')).startsWith('# research-workspace'), '--force 覆盖用户改过的 AGENTS')
  check(read(join(ws, 'method-library.md')).startsWith('# user library'), '--force 不覆盖 method-library.md（用户数据）')

  // ③ 模拟新种子：改 NODES + seed.json 版本/哈希，--upgrade 只动未改文件
  const ws2 = join(TEMP, 'ws2')
  check(run(['--workspace', ws2]).status === 0, '第二工作区铺种')
  writeFileSync(join(ws2, 'AGENTS.md'), '# user manual 2\n')
  writeFileSync(join(ws2, 'method-library.md'), '# user library 2\n')
  writeFileSync(join(PACKCOPY, 'workspace', 'NODES.md'), `${read(join(PACKCOPY, 'workspace', 'NODES.md'))}\n<!-- seed v2 marker -->\n`)
  const nextSeed = JSON.parse(read(join(PACKCOPY, 'workspace', 'seed.json')))
  nextSeed.version = '9.9.9'
  nextSeed.files['NODES.md'] = sha256(read(join(PACKCOPY, 'workspace', 'NODES.md')))
  writeFileSync(join(PACKCOPY, 'workspace', 'seed.json'), `${JSON.stringify(nextSeed, null, 2)}\n`)
  const upgrade = run(['--upgrade', '--workspace', ws2])
  check(upgrade.status === 0, '--upgrade 执行', upgrade.stderr)
  check(read(join(ws2, 'NODES.md')).includes('seed v2 marker'), '未改文件 NODES 被安全升级')
  check(read(join(ws2, 'AGENTS.md')) === '# user manual 2\n', '用户改过的 AGENTS 不被 --upgrade 覆盖')
  check(existsSync(join(ws2, 'AGENTS.md.seed-new')), '用户改过的文件写 .seed-new')
  check(read(join(ws2, 'method-library.md')) === '# user library 2\n', '--upgrade 不覆盖方法库')

  // ③b 回滚保护：工作区记录比 pack 种子新时，--upgrade 拒绝降级覆盖新种子
  const aheadState = JSON.parse(read(join(ws2, '.dsh-research-seed.json')))
  aheadState.version = '99.9.9'
  writeFileSync(join(ws2, '.dsh-research-seed.json'), `${JSON.stringify(aheadState, null, 2)}\n`)
  const aheadCheck = run(['--check', '--workspace', ws2])
  check(aheadCheck.status === 1 && /拒绝自动降级/.test(aheadCheck.stdout), '--check 报工作区记录较新', aheadCheck.stdout.split('\n').slice(-3).join(' | '))
  const aheadUpgrade = run(['--upgrade', '--workspace', ws2])
  check(aheadUpgrade.status === 1 && /拒绝降级/.test(aheadUpgrade.stdout), '--upgrade 拒绝降级')
  check(read(join(ws2, 'NODES.md')).includes('seed v2 marker'), '拒绝降级后新种子 NODES 保留')
  const resetState = JSON.parse(read(join(ws2, '.dsh-research-seed.json')))
  resetState.version = nextSeed.version
  writeFileSync(join(ws2, '.dsh-research-seed.json'), `${JSON.stringify(resetState, null, 2)}\n`)

  // ③c 无状态文件：--check 报“无记录”而不是假装版本一致；--upgrade 建基线
  const ws3 = join(TEMP, 'ws3')
  check(run(['--workspace', ws3]).status === 0, '第三工作区铺种')
  rmSync(join(ws3, '.dsh-research-seed.json'))
  const noState = run(['--check', '--workspace', ws3])
  check(noState.status === 1 && /无记录/.test(noState.stdout), '--check 报无状态记录', noState.stdout.split('\n').slice(-2).join(' | '))
  check(run(['--upgrade', '--workspace', ws3]).status === 0 && existsSync(join(ws3, '.dsh-research-seed.json')), '--upgrade 为无状态工作区建基线')

  // ④ --check 区分 deleted：用户删掉的种子不被 --upgrade 静默重铺，--force 才恢复
  const deletedRel = 'templates/run/topics.md'
  rmSync(join(ws2, deletedRel))
  const checkDeleted = run(['--check', '--workspace', ws2])
  check(checkDeleted.status === 1 && /deleted/.test(checkDeleted.stdout), '--check 报 deleted', checkDeleted.stdout.split('\n').slice(-3).join(' | '))
  check(run(['--upgrade', '--workspace', ws2]).status === 0, '--upgrade 在 deleted 后仍可运行')
  check(!existsSync(join(ws2, deletedRel)), '--upgrade 不静默重铺用户删除的种子')
  check(run(['--force', '--workspace', ws2]).status === 0, '--force 显式恢复')
  check(existsSync(join(ws2, deletedRel)), '--force 恢复用户删除的种子')
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  rmSync(TEMP, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\nscaffold-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('\nscaffold-smoke: ALL PASS')
process.exit(0)
