#!/usr/bin/env node
// scaffold-smoke.mjs — scaffold 的 CLI 行为证据（keyless，无 dsh/模型/网络）。
//
// 为什么需要：seed-core 单测只证分类纯函数；源码字符串断言挡不住“字面量还在、分支写坏”。
// 本 smoke 用临时 pack 副本 + 临时工作区真跑 CLI，覆盖：首次铺种、--force 保方法库、
// --check 的 missing/deleted/modified 与所有权分型（contract/corpus）、--upgrade 只升级未改文件并写 .seed-new。
//
// 用法：node scripts/smoke/scaffold-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席（未跑 ≠ 通过）
import { spawnSync } from 'node:child_process'
import { chmodSync, cpSync, existsSync, linkSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
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
const rawRun = (args, options = {}) => spawnSync(process.execPath, [SCAFFOLD, ...args], { encoding: 'utf8', ...options })
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

  // 参数严格性：未知 flag / 缺值 / 吞下一个 flag / 非法 profile 都不能静默写盘
  const argsCwd = join(TEMP, 'args-cwd')
  mkdirSync(argsCwd, { recursive: true })
  const unknown = rawRun(['--workspace', join(TEMP, 'ws-arg-unknown'), '--chek'], { cwd: argsCwd })
  check(unknown.status === 2 && /--chek/.test(unknown.stderr), '未知 flag 被拒绝（exit 2）', unknown.stderr)
  check(!existsSync(join(TEMP, 'ws-arg-unknown')), '未知 flag 不创建 workspace')
  const missingValue = rawRun(['--workspace', '--force'], { cwd: argsCwd })
  check(missingValue.status === 2 && /--workspace/.test(missingValue.stderr), '缺值被拒绝（exit 2）', missingValue.stderr)
  check(!existsSync(join(argsCwd, '--force')), '缺值不把下一个 flag 当路径')
  const help = rawRun(['--help'], { cwd: argsCwd })
  check(help.status === 0 && /用法/.test(help.stdout), '--help 打印用法并 exit 0')
  const badProfile = rawRun(['--workspace', join(TEMP, 'ws-profile-bad'), '--profile', '../escape', '--seed-only'], { cwd: argsCwd })
  check(badProfile.status === 2 && /profile/.test(badProfile.stderr), '非法 profile 名被拒绝（exit 2）', badProfile.stderr)
  check(!existsSync(join(TEMP, 'ws-profile-bad')), '非法 profile 不创建 workspace')

  // 根守卫：HOME / DSH_HOME 本身拒绝；父目录 symlink 不写穿到工作区外。
  const fakeHome = join(TEMP, 'fake-home')
  const fakeDsh = join(fakeHome, '.dsh')
  mkdirSync(fakeDsh, { recursive: true })
  const guardEnv = { ...process.env, HOME: fakeHome, DSH_HOME: fakeDsh }
  const homeAsWs = rawRun(['--workspace', fakeHome, '--seed-only'], { cwd: argsCwd, env: guardEnv })
  check(homeAsWs.status === 2 && /HOME/.test(homeAsWs.stderr), 'workspace=HOME 被拒绝（exit 2）', homeAsWs.stderr)
  check(!existsSync(join(fakeHome, 'AGENTS.md')), 'workspace=HOME 不写 AGENTS')
  const dshAsWs = rawRun(['--workspace', fakeDsh, '--seed-only'], { cwd: argsCwd, env: guardEnv })
  check(dshAsWs.status === 2 && /DSH_HOME/.test(dshAsWs.stderr), 'workspace=DSH_HOME 被拒绝（exit 2）', dshAsWs.stderr)
  check(!existsSync(join(fakeDsh, 'AGENTS.md')), 'workspace=DSH_HOME 不写 AGENTS')

  const outsideVictim = join(TEMP, 'victim-outside')
  const hostMismatch = rawRun(['--workspace', join(TEMP, 'ws-host-mismatch'), '--host', join(TEMP, 'other-profile')], { cwd: argsCwd })
  check(hostMismatch.status === 2 && /--host/.test(hostMismatch.stderr), '--host 与 --profile 目录不一致被拒绝', hostMismatch.stderr)
  check(!existsSync(join(TEMP, 'ws-host-mismatch')), '--host 不一致不创建 workspace')

  const wsSymlinkParent = join(TEMP, 'ws-symlink-parent')
  mkdirSync(outsideVictim, { recursive: true })
  mkdirSync(wsSymlinkParent, { recursive: true })
  symlinkSync(outsideVictim, join(wsSymlinkParent, 'templates'))
  const symlinkRun = rawRun(['--workspace', wsSymlinkParent, '--seed-only'], { cwd: argsCwd })
  check(symlinkRun.status === 2 && /symlink|工作区外/.test(symlinkRun.stderr), '父目录 symlink 越界被拒绝（exit 2）', symlinkRun.stderr)
  check(readdirSync(outsideVictim).length === 0, '父目录 symlink 越界不写受害者目录')
  check(!existsSync(join(wsSymlinkParent, 'AGENTS.md')), '父目录 symlink 越界不半写工作区')

  // 发布物完整性：篡改包内种子源但不改 seed.json → scaffold 必须先红，不铺错内容
  const BAD = join(TEMP, 'pack-bad')
  cpSync(PACKCOPY, BAD, { recursive: true })
  writeFileSync(join(BAD, 'workspace', 'NODES.md'), `${read(join(BAD, 'workspace', 'NODES.md'))}\n<!-- tampered -->\n`)
  const badRun = spawnSync(process.execPath, [join(BAD, 'scripts', 'scaffold.mjs'), '--seed-only', '--workspace', join(TEMP, 'ws-bad')], { encoding: 'utf8' })
  check(badRun.status === 2 && /哈希不匹配/.test(badRun.stderr), '种子哈希不匹配时拒绝铺种', (badRun.stderr || '').slice(-300))

  // 种子清单路径穿越：key `../escaped` 不能写出工作区
  const TRAV = join(TEMP, 'pack-trav')
  cpSync(PACKCOPY, TRAV, { recursive: true })
  const escaped = join(TRAV, 'escaped.txt')
  writeFileSync(escaped, 'ESCAPED CONTENT\n')
  const travSeed = JSON.parse(read(join(TRAV, 'workspace', 'seed.json')))
  travSeed.files['../escaped.txt'] = sha256(read(escaped))
  writeFileSync(join(TRAV, 'workspace', 'seed.json'), `${JSON.stringify(travSeed, null, 2)}\n`)
  const travRun = spawnSync(process.execPath, [join(TRAV, 'scripts', 'scaffold.mjs'), '--seed-only', '--workspace', join(TEMP, 'ws-trav')], { encoding: 'utf8' })
  check(travRun.status === 2 && /非法种子路径/.test(travRun.stderr) && !existsSync(join(TEMP, 'escaped.txt')), 'seed 路径穿越被拒绝且未写出工作区', (travRun.stderr || '').slice(-300))

  const CASE = join(TEMP, 'pack-case')
  cpSync(PACKCOPY, CASE, { recursive: true })
  const caseSeed = JSON.parse(read(join(CASE, 'workspace', 'seed.json')))
  caseSeed.files['AGENTS.MD'] = caseSeed.files['AGENTS.md']
  writeFileSync(join(CASE, 'workspace', 'seed.json'), `${JSON.stringify(caseSeed, null, 2)}\n`)
  const caseRun = spawnSync(process.execPath, [join(CASE, 'scripts', 'scaffold.mjs'), '--seed-only', '--workspace', join(TEMP, 'ws-case')], { encoding: 'utf8' })
  check(caseRun.status === 2 && /大小写\/Unicode 冲突/.test(caseRun.stderr), 'seed 键大小写冲突被拒绝', (caseRun.stderr || '').slice(-300))

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

  // 种子所有权（D35）：--check 按 policy 分型——contract 漂移 vs corpus 生长
  const wsPolicy = join(TEMP, 'ws-policy')
  check(run(['--workspace', wsPolicy]).status === 0, '所有权场景：铺种')
  writeFileSync(join(wsPolicy, 'NODES.md'), `${read(join(wsPolicy, 'NODES.md'))}\n<!-- local drift -->\n`)
  writeFileSync(join(wsPolicy, 'question-patterns.md'), `${read(join(wsPolicy, 'question-patterns.md'))}\n<!-- grown -->\n`)
  const policyCheck = spawnSync(process.execPath, [SCAFFOLD, '--check', '--workspace', wsPolicy], { encoding: 'utf8' })
  check(/NODES\.md — modified（contract：与包版本不同源的契约）/.test(policyCheck.stdout), '--check 把 contract 漂移单列', policyCheck.stdout.split('\n').filter((l) => l.includes('NODES.md')).join(' | '))
  check(/question-patterns\.md — modified（corpus：底本已生长，正常）/.test(policyCheck.stdout), '--check 把 corpus 生长单列', policyCheck.stdout.split('\n').filter((l) => l.includes('question-patterns')).join(' | '))

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

  // 硬链接 / FIFO 也不能写穿到另一个 inode
  const hardVictim = join(TEMP, 'hard-victim.txt')
  writeFileSync(hardVictim, 'ORIGINAL HARD VICTIM\n')
  const wsHard = join(TEMP, 'ws-hard')
  check(run(['--workspace', wsHard]).status === 0, '硬链接场景铺种')
  unlinkSync(join(wsHard, 'AGENTS.md'))
  linkSync(hardVictim, join(wsHard, 'AGENTS.md'))
  check(run(['--force', '--workspace', wsHard]).status === 0, '--force 处理硬链接')
  check(read(hardVictim) === 'ORIGINAL HARD VICTIM\n', '--force 不写穿硬链接目标')
  const wsFifo = join(TEMP, 'ws-fifo')
  check(run(['--workspace', wsFifo]).status === 0, 'FIFO 场景铺种')
  unlinkSync(join(wsFifo, 'AGENTS.md'))
  const fifo = spawnSync('mkfifo', [join(wsFifo, 'AGENTS.md')])
  if (fifo.status === 0) {
    const fifoRun = run(['--force', '--workspace', wsFifo])
    check(fifoRun.status === 0 && lstatSync(join(wsFifo, 'AGENTS.md')).isFile(), '--force 不阻塞在 FIFO，替换为常规文件')
  }

  // ③e 初始化已有用户数据：AGENTS/.gitignore/方法库/run bundle 不被首装覆盖
  const ws5 = join(TEMP, 'ws5')
  mkdirSync(join(ws5, 'drt_keep'), { recursive: true })
  writeFileSync(join(ws5, 'AGENTS.md'), '# existing project instructions\n')
  writeFileSync(join(ws5, '.gitignore'), '# existing ignore\n')
  writeFileSync(join(ws5, 'method-library.md'), '# existing library\n')
  writeFileSync(join(ws5, 'drt_keep', 'keep.md'), '# existing run bundle\n')
  const firstExisting = run(['--workspace', ws5])
  check(firstExisting.status === 1, '已有关键种子 untracked 时首装拒绝（exit 1）', firstExisting.stderr)
  check(/AGENTS\.md/.test(firstExisting.stderr) && /--force|空目录|--upgrade/.test(firstExisting.stderr), '拒绝信息点名文件与补救方式')
  check(!existsSync(join(ws5, '.dsh-research-seed.json')), '拒绝首装不写 state（不把 untracked 冒充 baseline）')
  check(read(join(ws5, 'AGENTS.md')) === '# existing project instructions\n', '拒绝首装不覆盖已有 AGENTS')
  check(read(join(ws5, '.gitignore')) === '# existing ignore\n', '拒绝首装不覆盖已有 .gitignore')
  check(read(join(ws5, 'method-library.md')) === '# existing library\n', '拒绝首装不覆盖已有方法库')
  check(read(join(ws5, 'drt_keep', 'keep.md')) === '# existing run bundle\n', '拒绝首装不触碰已有 run bundle')
  check(run(['--upgrade', '--workspace', ws5]).status === 0, '已有用户数据 --upgrade')
  check(read(join(ws5, 'AGENTS.md')) === '# existing project instructions\n', '--upgrade 不覆盖已有 AGENTS')
  check(existsSync(join(ws5, 'AGENTS.md.seed-new')) && existsSync(join(ws5, '.gitignore.seed-new')), '--upgrade 为用户改过的种子写 sidecar')
  const stateExisting = JSON.parse(read(join(ws5, '.dsh-research-seed.json')))
  check(!Object.hasOwn(stateExisting.files, 'AGENTS.md') && !Object.hasOwn(stateExisting.files, '.gitignore'),
    '--upgrade 不把 untracked AGENTS/.gitignore 记成 baseline', JSON.stringify(stateExisting.files))
  check(Array.isArray(stateExisting.skipped) && stateExisting.skipped.includes('AGENTS.md'), '--upgrade 的 skipped 记录 AGENTS（preflight 可据此提示）')

  // 重复 --upgrade 不得覆盖用户已编辑的 .seed-new：保留原 sidecar，新种子写带版本后缀的副本。
  writeFileSync(join(ws5, 'AGENTS.md.seed-new'), '# my merged version — keep me\n')
  const rerun = run(['--upgrade', '--workspace', ws5])
  check(rerun.status === 0, '重复 --upgrade 可运行', rerun.stderr)
  check(read(join(ws5, 'AGENTS.md.seed-new')) === '# my merged version — keep me\n', '重复 --upgrade 保留用户编辑的 sidecar')
  const currentSeedVersion = JSON.parse(read(join(PACKCOPY, 'workspace', 'seed.json'))).version
  check(existsSync(join(ws5, `AGENTS.md.seed-new-${currentSeedVersion}`)), '重复 --upgrade 把新种子写成带版本 sidecar',
    `seed=${currentSeedVersion} files=${readdirSync(ws5).filter((n) => n.includes('seed-new')).join(',')}`)

  // --adopt：在用户合并/确认自定义手册后显式接受当前工作区；之后 --upgrade 只写 sidecar，不覆盖。
  const wsAdopt = join(TEMP, 'ws-adopt')
  mkdirSync(wsAdopt, { recursive: true })
  writeFileSync(join(wsAdopt, 'AGENTS.md'), '# my accepted manual\n')
  const adoptRun = run(['--workspace', wsAdopt, '--adopt'])
  check(adoptRun.status === 0, '--adopt 接受自定义 AGENTS', adoptRun.stderr)
  check(read(join(wsAdopt, 'AGENTS.md')) === '# my accepted manual\n', '--adopt 不修改文件内容')
  const adoptState = JSON.parse(read(join(wsAdopt, '.dsh-research-seed.json')))
  check(Array.isArray(adoptState.adopted) && adoptState.adopted.includes('AGENTS.md'), '--adopt 把 AGENTS 记入 adopted')
  check(adoptState.files['AGENTS.md'] === sha256('# my accepted manual\n'), '--adopt 记录当前内容哈希为 baseline')
  const adoptCheck = run(['--workspace', wsAdopt, '--check'])
  check(adoptCheck.status === 0 && /AGENTS\.md — modified/.test(adoptCheck.stdout), '--adopt 后 --check 只报 modified（不阻断）', adoptCheck.stdout.split('\n').slice(-2).join(' | '))
  const adoptUpgrade = run(['--workspace', wsAdopt, '--upgrade'])
  check(adoptUpgrade.status === 0 && read(join(wsAdopt, 'AGENTS.md')) === '# my accepted manual\n', '--adopt 后 --upgrade 不覆盖用户手册')
  check(run(['--workspace', wsAdopt, '--adopt', '--check']).status === 2, '--adopt 与 --check 互斥（exit 2）')

  // 只有 .gitignore 是用户自带的：不阻断（非研究契约），但也不能记成本包种子。
  const wsIgnore = join(TEMP, 'ws-gitignore-only')
  mkdirSync(wsIgnore, { recursive: true })
  writeFileSync(join(wsIgnore, '.gitignore'), '# my ignore\n')
  check(run(['--workspace', wsIgnore]).status === 0, '仅 .gitignore 已存在时不阻断首装')
  const stateIgnore = JSON.parse(read(join(wsIgnore, '.dsh-research-seed.json')))
  check(!Object.hasOwn(stateIgnore.files, '.gitignore'), '用户自带 .gitignore 不记成本包 baseline')
  check(read(join(wsIgnore, '.gitignore')) === '# my ignore\n', '用户自带 .gitignore 不被覆盖')

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
  const wsRo = join(TEMP, 'ws-ro')
  check(run(['--workspace', wsRo]).status === 0, '只读文件场景铺种')
  const roFile = join(wsRo, 'AGENTS.md')
  chmodSync(roFile, 0o444)
  const roRun = run(['--force', '--workspace', wsRo])
  check(roRun.status === 2 && /写入种子失败/.test(roRun.stderr), '只读种子文件写入失败给明确错误', (roRun.stderr || '').slice(-200))
  chmodSync(roFile, 0o644)
  writeFileSync(join(ws7, '.dsh-research-seed.json.tmp-99999'), 'stale temp\n')
  check(run(['--seed-only', '--workspace', ws7]).status === 0 && readdirSync(ws7).every((n) => !n.startsWith('.dsh-research-seed.json.tmp-')), '上次 SIGKILL 的 state 临时件被清理')

  // ④ --check 区分 deleted：用户删掉的种子不被 --upgrade 静默重铺，--force 才恢复
  const deletedRel = 'templates/run/topics.md'
  rmSync(join(ws2, deletedRel))
  const checkDeleted = run(['--check', '--workspace', ws2])
  check(checkDeleted.status === 1 && /deleted/.test(checkDeleted.stdout), '--check 报 deleted', checkDeleted.stdout.split('\n').slice(-3).join(' | '))
  check(run(['--upgrade', '--workspace', ws2]).status === 0, '--upgrade 在 deleted 后仍可运行')
  check(!existsSync(join(ws2, deletedRel)), '--upgrade 不静默重铺用户删除的种子')
  check(run(['--force', '--workspace', ws2]).status === 0, '--force 显式恢复')
  check(existsSync(join(ws2, deletedRel)), '--force 恢复用户删除的种子')

  // ④b 路径含空格/中文：argv 数组直传，不经过 shell
  const wsPath = join(TEMP, 'space 工作区')
  check(run(['--workspace', wsPath]).status === 0 && existsSync(join(wsPath, 'AGENTS.md')), '空格/中文 workspace 铺种')
  check(run(['--check', '--workspace', wsPath]).status === 0, '空格/中文 workspace --check')

  // ④c --clean：只报告（exit 1、零删除）→ --write 删未改孤儿/sidecar/陈旧锁，保留改过的孤儿
  const wsClean = join(TEMP, 'ws-clean')
  check(run(['--workspace', wsClean]).status === 0, 'clean 场景铺种')
  writeFileSync(join(wsClean, 'orphan.md'), 'orphan\n')
  writeFileSync(join(wsClean, 'user-orphan.md'), 'user changed\n')
  const cleanStatePath = join(wsClean, '.dsh-research-seed.json')
  const cleanState = JSON.parse(read(cleanStatePath))
  cleanState.files['orphan.md'] = sha256('orphan\n')
  cleanState.files['user-orphan.md'] = sha256('what we wrote\n')
  writeFileSync(cleanStatePath, `${JSON.stringify(cleanState, null, 2)}\n`)
  writeFileSync(join(wsClean, 'templates', 'run', 'plan.md.seed-new'), 'sidecar\n')
  mkdirSync(join(wsClean, 'drt_x'), { recursive: true })
  writeFileSync(join(wsClean, 'drt_x', 'keep.md'), 'research data\n')
  writeFileSync(join(wsClean, 'method-library.md'), '# my library\n')
  writeFileSync(join(wsClean, '.dsh-research-scaffold.lock'), '9999999')
  const cleanReport = run(['--clean', '--workspace', wsClean])
  check(cleanReport.status === 1 && /删除孤儿：orphan\.md/.test(cleanReport.stdout), '--clean 报告可清理项（exit 1）', cleanReport.stdout.split('\n').slice(-2).join(' | '))
  check(existsSync(join(wsClean, 'orphan.md')) && existsSync(join(wsClean, 'templates', 'run', 'plan.md.seed-new')), '--clean 报告模式零删除')
  check(run(['--clean', '--write', '--dry-run', '--workspace', wsClean]).status === 2, '--clean --write --dry-run 被拒绝（不是删除许可）')
  const cleanWrite = run(['--clean', '--write', '--workspace', wsClean])
  check(cleanWrite.status === 0, '--clean --write 成功', cleanWrite.stderr)
  check(!existsSync(join(wsClean, 'orphan.md')), '--clean --write 删除未改孤儿')
  check(existsSync(join(wsClean, 'templates', 'run', 'plan.md.seed-new')), '--clean --write 默认保留未合并 sidecar')
  check(existsSync(join(wsClean, 'user-orphan.md')), '--clean --write 保留改过的孤儿')
  const cleanSidecars = run(['--clean', '--write', '--discard-sidecars', '--workspace', wsClean])
  check(cleanSidecars.status === 0 && !existsSync(join(wsClean, 'templates', 'run', 'plan.md.seed-new')), '--discard-sidecars 才丢弃 sidecar')
  const cleanStateAfter = JSON.parse(read(cleanStatePath))
  check(!Object.hasOwn(cleanStateAfter.files, 'orphan.md'), 'clean 后状态账本清掉已删孤儿')
  check(Object.hasOwn(cleanStateAfter.files, 'user-orphan.md'), 'clean 后状态账本保留改过的孤儿')
  check(existsSync(join(wsClean, 'AGENTS.md')), 'clean 不删种子文件')
  check(existsSync(join(wsClean, 'drt_x', 'keep.md')), 'clean 不碰 run bundle')
  check(existsSync(join(wsClean, 'method-library.md')), 'clean 不碰用户方法库')
  check(run(['--clean', '--workspace', wsClean]).status === 0, 'clean 幂等（第二次无可清理项）')
  writeFileSync(join(wsClean, '.dsh-research-scaffold.lock'), String(process.pid))
  const cleanLocked = run(['--clean', '--write', '--workspace', wsClean])
  check(cleanLocked.status === 2 && existsSync(join(wsClean, '.dsh-research-scaffold.lock')), '活跃锁拒绝 clean（不误删他人锁）', (cleanLocked.stderr || '').slice(-200))
  unlinkSync(join(wsClean, '.dsh-research-scaffold.lock'))

  // ④c2 工作区记录比 pack 新：--clean 拒绝（不能把新版本的种子当孤儿删）
  const wsCleanAhead = join(TEMP, 'ws-clean-ahead')
  mkdirSync(wsCleanAhead, { recursive: true })
  writeFileSync(join(wsCleanAhead, 'newer.md'), 'newer\n')
  writeFileSync(join(wsCleanAhead, '.dsh-research-seed.json'), `${JSON.stringify({
    schemaVersion: 1, version: '99.9.9',
    files: { 'newer.md': sha256('newer\n') }, skipped: [], adopted: [],
  }, null, 2)}\n`)
  const aheadClean = run(['--clean', '--write', '--workspace', wsCleanAhead])
  check(aheadClean.status === 1 && /比 pack .* 新/.test(aheadClean.stderr), 'clean 拒绝删除新版本状态的孤儿', (aheadClean.stderr || '').slice(-200))
  check(existsSync(join(wsCleanAhead, 'newer.md')), 'clean 拒绝后不删文件')

  // ④d --force 不覆盖用户 .gitignore（与 preflight「保留用户规则」同一 owner 口径）
  const wsIgnoreForce = join(TEMP, 'ws-gitignore-force')
  mkdirSync(wsIgnoreForce, { recursive: true })
  writeFileSync(join(wsIgnoreForce, '.gitignore'), '# my rules\n')
  check(run(['--force', '--workspace', wsIgnoreForce]).status === 0, '--force 遇到用户 .gitignore 仍成功')
  check(read(join(wsIgnoreForce, '.gitignore')) === '# my rules\n', '--force 不覆盖用户 .gitignore')
  check(existsSync(join(wsIgnoreForce, '.gitignore.seed-new')), '--force 写 .gitignore.seed-new 供合并')
  const ignoreForceState = JSON.parse(read(join(wsIgnoreForce, '.dsh-research-seed.json')))
  check((ignoreForceState.skipped ?? []).includes('.gitignore'), '用户 .gitignore 记为 skipped（不冒充 baseline）')

  // ④d2 .gitignore 已有状态基线且被用户改过：--force 仍不覆盖
  const wsIgnoreState = join(TEMP, 'ws-gitignore-state')
  check(run(['--workspace', wsIgnoreState]).status === 0, '带状态 .gitignore 场景铺种')
  writeFileSync(join(wsIgnoreState, '.gitignore'), '# mine after seed\n')
  check(run(['--force', '--workspace', wsIgnoreState]).status === 0, '--force 遇到带状态用户 .gitignore 仍成功')
  check(read(join(wsIgnoreState, '.gitignore')) === '# mine after seed\n', '--force 不覆盖带状态的用户 .gitignore')
  check(existsSync(join(wsIgnoreState, '.gitignore.seed-new')), '带状态场景也写 sidecar 供合并')

  // ④e 状态 schema：更新的 scaffold 写的状态 fail loud，不静默当无状态
  const wsSchema = join(TEMP, 'ws-schema')
  check(run(['--workspace', wsSchema]).status === 0, 'schema 场景铺种')
  writeFileSync(join(wsSchema, '.dsh-research-seed.json'), '{"schemaVersion":2,"version":"9.0.0","files":{}}\n')
  const schemaAhead = run(['--check', '--workspace', wsSchema])
  check(schemaAhead.status === 1 && /更新的 scaffold/.test(schemaAhead.stderr), '新 schema 状态被拒绝（不猜、不覆盖）', (schemaAhead.stderr || '').slice(-200))

  // ④f 状态文件坏 JSON：fail loud（不当无状态），且不写盘
  const wsCorrupt = join(TEMP, 'ws-corrupt-state')
  check(run(['--workspace', wsCorrupt]).status === 0, '坏状态场景铺种')
  writeFileSync(join(wsCorrupt, '.dsh-research-seed.json'), '{broken\n')
  const corruptCheck = run(['--check', '--workspace', wsCorrupt])
  check(corruptCheck.status === 1 && /损坏/.test(corruptCheck.stderr), '坏 state fail loud（exit 1）', (corruptCheck.stderr || '').slice(-200))
  check(read(join(wsCorrupt, '.dsh-research-seed.json')) === '{broken\n', '坏 state 不被静默重写')

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
