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
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
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

  // 发布物完整性：篡改包内种子源但不改 seed.json → scaffold 必须先红，不铺错内容
  const BAD = join(TEMP, 'pack-bad')
  cpSync(PACKCOPY, BAD, { recursive: true })
  writeFileSync(join(BAD, 'workspace', 'NODES.md'), `${read(join(BAD, 'workspace', 'NODES.md'))}\n<!-- tampered -->\n`)
  const badRun = spawnSync(process.execPath, [join(BAD, 'scripts', 'scaffold.mjs'), '--seed-only', '--workspace', join(TEMP, 'ws-bad')], { encoding: 'utf8' })
  check(badRun.status === 2 && /哈希不匹配/.test(badRun.stderr), '种子哈希不匹配时拒绝铺种', (badRun.stderr || '').slice(-300))

  // 种子改名：旧名 orphan + 新名 missing 同时可见，不自动删旧文件
  const RENAME = join(TEMP, 'pack-rename')
  cpSync(PACKCOPY, RENAME, { recursive: true })
  renameSync(join(RENAME, 'workspace', 'NODES.md'), join(RENAME, 'workspace', 'NOTES.md'))
  const rnSeed = JSON.parse(read(join(RENAME, 'workspace', 'seed.json')))
  rnSeed.version = '9.9.9'
  delete rnSeed.files['NODES.md']
  rnSeed.files['NOTES.md'] = sha256(read(join(RENAME, 'workspace', 'NOTES.md')))
  writeFileSync(join(RENAME, 'workspace', 'seed.json'), `${JSON.stringify(rnSeed, null, 2)}\n`)
  const rnWs = join(TEMP, 'ws-rename')
  check(run(['--workspace', rnWs]).status === 0, '改名场景：旧版工作区铺种')
  const rnCheck = spawnSync(process.execPath, [join(RENAME, 'scripts', 'scaffold.mjs'), '--check', '--workspace', rnWs], { encoding: 'utf8' })
  check(rnCheck.status === 1 && /NODES\.md — orphan/.test(rnCheck.stdout) && /NOTES\.md — missing/.test(rnCheck.stdout), 'seed 改名同时报 orphan + missing', rnCheck.stdout.split('\n').slice(-4).join(' | '))

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

  // ③d symlink：--force 替换链接本身，绝不写穿到目标；state 链接直接拒绝
  const ws4 = join(TEMP, 'ws4')
  check(run(['--workspace', ws4]).status === 0, '第四工作区铺种')
  const victim = join(TEMP, 'victim.txt')
  writeFileSync(victim, 'ORIGINAL VICTIM\n')
  unlinkSync(join(ws4, 'AGENTS.md'))
  symlinkSync(victim, join(ws4, 'AGENTS.md'))
  check(run(['--force', '--workspace', ws4]).status === 0, '--force 处理种子 symlink')
  check(read(victim) === 'ORIGINAL VICTIM\n', '--force 不写穿 symlink 目标')
  check(!lstatSync(join(ws4, 'AGENTS.md')).isSymbolicLink(), '--force 把 symlink 替换为常规种子文件')
  const stateVictim = join(TEMP, 'state-victim.json')
  writeFileSync(stateVictim, '{"keep":"me"}\n')
  unlinkSync(join(ws4, '.dsh-research-seed.json'))
  symlinkSync(stateVictim, join(ws4, '.dsh-research-seed.json'))
  const stateLink = run(['--force', '--workspace', ws4])
  check(stateLink.status === 2 && read(stateVictim) === '{"keep":"me"}\n', 'state symlink 被拒绝且不写穿', stateLink.stdout)

  // ③e 初始化已有用户数据：AGENTS/.gitignore/方法库/run bundle 不被首装覆盖
  const ws5 = join(TEMP, 'ws5')
  mkdirSync(join(ws5, 'drt_keep'), { recursive: true })
  writeFileSync(join(ws5, 'AGENTS.md'), '# existing project instructions\n')
  writeFileSync(join(ws5, '.gitignore'), '# existing ignore\n')
  writeFileSync(join(ws5, 'method-library.md'), '# existing library\n')
  writeFileSync(join(ws5, 'drt_keep', 'keep.md'), '# existing run bundle\n')
  check(run(['--workspace', ws5]).status === 0, '已有用户数据的工作区首装')
  check(read(join(ws5, 'AGENTS.md')) === '# existing project instructions\n', '首装不覆盖已有 AGENTS')
  check(read(join(ws5, '.gitignore')) === '# existing ignore\n', '首装不覆盖已有 .gitignore')
  check(read(join(ws5, 'method-library.md')) === '# existing library\n', '首装不覆盖已有方法库')
  check(read(join(ws5, 'drt_keep', 'keep.md')) === '# existing run bundle\n', '首装不触碰已有 run bundle')
  check(run(['--upgrade', '--workspace', ws5]).status === 0, '已有用户数据 --upgrade')
  check(read(join(ws5, 'AGENTS.md')) === '# existing project instructions\n', '--upgrade 不覆盖已有 AGENTS')
  check(existsSync(join(ws5, 'AGENTS.md.seed-new')) && existsSync(join(ws5, '.gitignore.seed-new')), '--upgrade 为用户改过的种子写 sidecar')

  // ③f 种子目标是目录：--force 不能把目录当文件写，exit 2 并保留目录
  const ws6 = join(TEMP, 'ws6')
  check(run(['--workspace', ws6]).status === 0, '第六工作区铺种')
  rmSync(join(ws6, 'AGENTS.md'))
  mkdirSync(join(ws6, 'AGENTS.md'))
  check(run(['--force', '--workspace', ws6]).status === 2 && lstatSync(join(ws6, 'AGENTS.md')).isDirectory(), '种子目标是目录时拒绝写入')

  // ③g 工作区锁：活跃 pid 拒绝；陈旧 pid 接管；成功后锁与 state 临时件都不残留
  const ws7 = join(TEMP, 'ws7')
  check(run(['--workspace', ws7]).status === 0, '第七工作区铺种')
  const lock = join(ws7, '.dsh-research-scaffold.lock')
  writeFileSync(lock, String(process.pid))
  const locked = run(['--seed-only', '--workspace', ws7])
  check(locked.status === 2 && /锁定/.test(locked.stderr), '活跃锁拒绝并发 scaffold', (locked.stderr || '').slice(-200))
  check(existsSync(lock), '拒绝后不误删他人锁')
  unlinkSync(lock)
  writeFileSync(lock, '9999999')
  const stale = run(['--seed-only', '--workspace', ws7])
  check(stale.status === 0 && !existsSync(lock), '陈旧锁被接管并释放')
  check(readdirSync(ws7).every((n) => !n.startsWith('.dsh-research-seed.json.tmp-')), 'state 原子写无临时件残留')

  // ④ --check 区分 deleted：用户删掉的种子不被 --upgrade 静默重铺，--force 才恢复
  const deletedRel = 'templates/run/topics.md'
  rmSync(join(ws2, deletedRel))
  const checkDeleted = run(['--check', '--workspace', ws2])
  check(checkDeleted.status === 1 && /deleted/.test(checkDeleted.stdout), '--check 报 deleted', checkDeleted.stdout.split('\n').slice(-3).join(' | '))
  check(run(['--upgrade', '--workspace', ws2]).status === 0, '--upgrade 在 deleted 后仍可运行')
  check(!existsSync(join(ws2, deletedRel)), '--upgrade 不静默重铺用户删除的种子')
  check(run(['--force', '--workspace', ws2]).status === 0, '--force 显式恢复')
  check(existsSync(join(ws2, deletedRel)), '--force 恢复用户删除的种子')

  // ⑤ 新版移除种子：旧文件保留但 --check 必须报 orphan，不静默假装 current
  const orphanSeed = JSON.parse(read(join(PACKCOPY, 'workspace', 'seed.json')))
  delete orphanSeed.files['NODES.md']
  writeFileSync(join(PACKCOPY, 'workspace', 'seed.json'), `${JSON.stringify(orphanSeed, null, 2)}\n`)
  rmSync(join(PACKCOPY, 'workspace', 'NODES.md'))
  const orphanCheck = run(['--check', '--workspace', ws2])
  check(orphanCheck.status === 1 && /orphan/.test(orphanCheck.stdout), '--check 报新种子移除后的 orphan', orphanCheck.stdout.split('\n').slice(-3).join(' | '))
  check(existsSync(join(ws2, 'NODES.md')), 'orphan 文件不被自动删')
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
