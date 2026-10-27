#!/usr/bin/env node
// scaffold.mjs — 一键部署准备（pack 自带）：把「装了 pack」变成「能跑研究」。
//
// 做四件事（幂等，可重复跑）：
//   ① 研究工作区种子：按 `workspace/seed.json` 铺开（手册 + NODES + 判型库 + 模板 + .gitignore）；
//      `--check` 只读报告分类，`--upgrade` 只更新未被用户改过的文件，`--force` 才全量覆盖；
//      `method-library.md` 是用户数据，任何模式都不覆盖已存在的文件；
//   ② 写/更新工作区种子状态（`.dsh-research-seed.json`，版本 + 哈希 + 跳过清单）；
//   ③ profile 组合：确保 agent-team-profile 层在目标 profile 里（版本从 profile 的 app-boot 解析）；
//   ④ 收尾跑 preflight 报告状态。
//
// 用法：
//   node <pack>/scripts/scaffold.mjs --workspace <研究工作区> [--profile <名>] [--host <dir>]
//     [--check | --upgrade | --force] [--dry-run] [--install-only] [--seed-only]
//   或经 bin：dsh-deep-research-scaffold --workspace <dir> [--profile research]（registry 安装形态；tarball 装法无 PATH bin，用本文件全路径）
//
// 不做的事（有意）：不装 DSH 本体、不写密钥（安全边界：密钥永不落仓库/脚本）。
import { accessSync, closeSync, constants as fsConstants, copyFileSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { SEED_STATE_SCHEMA, sha256, classifySeedEntry, nextSeedState, parseSeedState, planSeedCleanup, seedSourceRel } from './lib/seed-core.mjs'
import { satisfiesVersion } from './lib/version-range.mjs'
import { parseScaffoldArgs } from './lib/deploy-args.mjs'
import { resolveDshHome, resolvePathInput } from './lib/dsh-home.mjs'
import { inferInstallAnchor } from './lib/install-anchor.mjs'
import { assertSafeWorkspace, assertSeedTargetInsideWorkspace } from './lib/workspace-guard.mjs'

const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SEED = join(PACK, 'workspace')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const USAGE = `用法：node <pack>/scripts/scaffold.mjs --workspace <研究工作区> [options]

  --profile <名>        目标 profile（默认 research）
  --host <目录>         profile 目录（默认 $DSH_HOME/profiles/<profile>）
  --install-anchor <路径> @deepseek-ai/dsh 安装目录或 package.json（默认从 PATH 的 dsh 推断）
  --check               只读分类，不写盘
  --upgrade             只更新未被用户改过的旧种子；改过的写 .seed-new
  --force               覆盖版本化种子（method-library 仍不覆盖）
  --adopt               显式接受当前工作区的 AGENTS/NODES/模板（写 baseline；--upgrade 仍不覆盖）
  --clean               只报告 scaffold 自己的残留（state/lock/sidecar/孤儿），不删任何东西
  --clean --write       执行清理：删未改过的孤儿种子、陈旧锁、临时状态；改过的一律保留
  --discard-sidecars    配合 --clean --write 才丢弃未合并的 .seed-new（默认只报告、不删）
  --dry-run             预演写模式（不落盘、不跑 preflight）
  --install-only        安装验收（跳模型密钥检查；不代表研究就绪）
  --seed-only           只处理工作区种子（不碰 profile、不跑 preflight）
  --refresh-team        显式更新已存在但版本不符的团队层（默认不静默改用户 pin）
  --help                打印本帮助

例：node scaffold.mjs --workspace ~/research-workspace --profile research
`
const parsed = parseScaffoldArgs(process.argv.slice(2))
if (parsed.flags.help) {
  console.log(USAGE)
  process.exit(0)
}
if (!parsed.ok) {
  console.error('scaffold: 参数错误')
  for (const line of parsed.errors) console.error(`  - ${line}`)
  console.error(`\n${USAGE}`)
  process.exit(2)
}
const { flags, values } = parsed
const workspace = resolvePathInput(values.workspace)
const profile = values.profile
const explicitHost = values.host === null ? null : resolvePathInput(values.host)
const explicitAnchor = values.installAnchor === null ? null : resolvePathInput(values.installAnchor)
const force = flags.force
const adopt = flags.adopt
const dryRun = flags.dryRun
const installOnly = flags.installOnly
const seedOnly = flags.seedOnly
const checkMode = flags.check
const cleanMode = flags.clean
const cleanWrite = flags.write
const discardSidecars = flags.discardSidecars
const upgrade = flags.upgrade
// 写模式 = 会落盘的模式。--check 与 --clean（不带 --write）都只读，不建目录、不持锁。
const writeMode = !checkMode && !(cleanMode && !cleanWrite)
const refreshTeam = flags.refreshTeam
let installAnchor = null
try {
  installAnchor = inferInstallAnchor({ explicit: explicitAnchor })
} catch (error) {
  console.error(`scaffold: 安装锚不可用：${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
}

const steps = []
const note = (ok, name, detail) => { steps.push({ ok, name, detail }); console.log(`  ${ok ? '✓' : '✗'} ${name}\n      ${detail}`) }

const dshHome = resolveDshHome(process.env)
const targetHost = join(dshHome, 'profiles', profile)

if (workspace === null) {
  console.error('scaffold: 需要 --workspace <研究工作区目录>（角色会话的 cwd；手册从这里注入）')
  process.exit(2)
}
if (existsSync(workspace) && !statSync(workspace).isDirectory()) {
  console.error(`scaffold: --workspace 必须是目录，当前是文件：${workspace}`)
  process.exit(2)
}
if (cleanMode && !existsSync(workspace)) {
  console.error(`scaffold: --clean 需要一个已存在的 workspace：${workspace}`)
  process.exit(2)
}
if (writeMode && existsSync(workspace)) {
  try { accessSync(workspace, fsConstants.W_OK) } catch {
    console.error(`scaffold: --workspace 不可写：${workspace}（--check 可只读；写入请先修权限）`)
    process.exit(2)
  }
}

// 根守卫：工作区不能是 HOME/DSH_HOME/pack/profile 的本身、祖先或内部（写模式）。
if (writeMode) {
  try {
    const guard = assertSafeWorkspace({
      workspace,
      home: homedir(),
      dshHome,
      packDir: PACK,
      profileDir: explicitHost ?? targetHost,
    })
    for (const warning of guard.warnings) console.warn(`scaffold: ⚠ ${warning}`)
  } catch (error) {
    console.error(`scaffold: 工作区不安全：${error instanceof Error ? error.message : String(error)}`)
    process.exit(2)
  }
}

// dsh plugin 只能按 $DSH_HOME/profiles/<name> 定位：--host 指向别的目录时，团队层会加到
// 另一个 profile。要么把 DSH_HOME 指对，要么不要传 --host。
if (!seedOnly && explicitHost !== null && resolve(explicitHost) !== resolve(targetHost)) {
  console.error(`scaffold: --host ${explicitHost} 与 --profile ${profile} 的默认目录不一致（${targetHost}）；dsh plugin 只能写 $DSH_HOME/profiles/<name>，请改 DSH_HOME 或删掉 --host`)
  process.exit(2)
}

// 写模式互斥：两个 scaffold 同时写同一工作区会把 state/sidecar 交叉覆盖。--check/--dry-run 不持锁。
if (writeMode && !cleanMode && !dryRun && !existsSync(workspace)) mkdirSync(workspace, { recursive: true })
const lockPath = join(workspace, '.dsh-research-scaffold.lock')
let lockHeld = false
const releaseLock = () => { if (lockHeld) { try { unlinkSync(lockPath) } catch {} lockHeld = false } }
if (writeMode && !dryRun) {
  if (existsSync(lockPath)) {
    let holder = null
    try { holder = Number(readFileSync(lockPath, 'utf8').trim()) } catch {}
    if (Number.isInteger(holder) && holder > 0) {
      try {
        process.kill(holder, 0)
        console.error(`scaffold: 工作区被 pid ${holder} 的 scaffold 锁定：${lockPath}（等它结束或确认陈旧后删锁）`)
        process.exit(2)
      } catch (error) {
        if (error.code === 'EPERM') {
          console.error(`scaffold: 工作区锁属于活跃 pid ${holder}（EPERM）：${lockPath}`)
          process.exit(2)
        }
        // ESRCH = 陈旧锁，继续接管
      }
    }
    try { unlinkSync(lockPath) } catch {}
  }
  try {
    const fd = openSync(lockPath, 'wx')
    writeFileSync(fd, String(process.pid))
    closeSync(fd)
    lockHeld = true
    process.on('exit', releaseLock)
    // 上次 SIGKILL 可能留下 state 临时件；持锁后清理，避免无界堆积。
    for (const name of readdirSync(workspace)) {
      if (name.startsWith('.dsh-research-seed.json.tmp-')) { try { unlinkSync(join(workspace, name)) } catch {} }
    }
  } catch {
    console.error(`scaffold: 无法获取工作区锁：${lockPath}（另一个 scaffold 正在写？）`)
    process.exit(2)
  }
}
if (checkMode && (upgrade || force)) {
  console.error('scaffold: --check 只读，不能与 --upgrade/--force 同用')
  process.exit(2)
}

const seedPath = join(SEED, 'seed.json')
if (!existsSync(seedPath)) {
  console.error('scaffold: 种子清单缺席（workspace/seed.json）——重装/重建 pack，或运行 node dev/sync-pack-workspace.mjs')
  process.exit(2)
}
const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
if (typeof seed.version !== 'string' || typeof seed.files !== 'object' || seed.files === null || Array.isArray(seed.files)) {
  console.error('scaffold: 种子清单形态非法（需要 version + files 映射）')
  process.exit(2)
}
// 种子键必须是工作区内相对路径；拒绝 `..`、绝对路径、反斜杠，防止篡改 seed.json 写出工作区。
const safeSeedRel = (rel) => {
  if (typeof rel !== 'string' || rel === '' || rel.includes('\\') || isAbsolute(rel)) return false
  const relToWorkspace = relative(workspace, resolve(workspace, rel))
  return relToWorkspace !== '' && !relToWorkspace.startsWith('..') && !isAbsolute(relToWorkspace)
}
const foldedSeedKeys = new Map()
for (const rel of Object.keys(seed.files)) {
  if (!safeSeedRel(rel)) {
    console.error(`scaffold: 非法种子路径：${rel}（必须是工作区内相对路径；拒绝 .. / 绝对路径 / 反斜杠）`)
    process.exit(2)
  }
  const folded = rel.normalize('NFC').toLowerCase()
  if (foldedSeedKeys.has(folded)) {
    console.error(`scaffold: 种子键大小写/Unicode 冲突：${foldedSeedKeys.get(folded)} vs ${rel}（跨 FS 不可移植）`)
    process.exit(2)
  }
  foldedSeedKeys.set(folded, rel)
  const sourceRel = seedSourceRel(rel)
  const relToSeed = relative(SEED, resolve(SEED, sourceRel))
  if (relToSeed === '' || relToSeed.startsWith('..') || isAbsolute(relToSeed)) {
    console.error(`scaffold: 非法种子源路径：${rel}（源必须留在包内 workspace/）`)
    process.exit(2)
  }
}
// 发布物完整性：seed.json 的哈希必须匹配包内源文件；tarball 被截断/篡改时先红，不静默铺错内容。
for (const rel of Object.keys(seed.files)) {
  const src = join(SEED, seedSourceRel(rel))
  if (!existsSync(src)) {
    console.error(`scaffold: 种子源缺席：${rel}（重装 pack 或更新 seed.json）`)
    process.exit(2)
  }
  const actual = sha256(readFileSync(src, 'utf8'))
  if (actual !== seed.files[rel]) {
    console.error(`scaffold: 种子哈希不匹配：${rel}（seed.json=${String(seed.files[rel]).slice(0, 12)}… actual=${actual.slice(0, 12)}…；tarball/种子清单损坏）`)
    process.exit(2)
  }
}

const statePath = join(workspace, '.dsh-research-seed.json')
let state = null
let stateSchemaVersion = 0
if (existsSync(statePath)) {
  const parsedState = parseSeedState(readFileSync(statePath, 'utf8'))
  if (!parsedState.ok) {
    if (parsedState.reason === 'newer-schema') {
      console.error(`scaffold: 工作区种子状态由更新的 scaffold 写（schema v${parsedState.schemaVersion} > v${SEED_STATE_SCHEMA}）——先升级本工具，不覆盖、不猜`)
    } else {
      console.error(`scaffold: 工作区种子状态损坏：${statePath}——人工确认后删除该文件再跑（不会静默当无状态）`)
    }
    process.exit(checkMode || cleanMode ? 1 : 2)
  }
  state = parsedState.state
  stateSchemaVersion = parsedState.schemaVersion
  if (parsedState.upgraded) console.log(`  note 工作区种子状态 schema v${parsedState.schemaVersion} → v${SEED_STATE_SCHEMA}（同形前移，下次写入落新口径）`)
}
const stateFiles = state?.files ?? {}
const stateAdopted = new Set(Array.isArray(state?.adopted) ? state.adopted : [])
const seedRels = Object.keys(seed.files).sort()
// 回滚保护：工作区记录比 pack 种子新时，--upgrade 不得把新种子降级覆盖（真实迁移的反向路径）。
const versionAhead = state?.version !== undefined && state.version !== seed.version && satisfiesVersion(state.version, `>${seed.version}`)
const sourceOf = (rel) => join(SEED, seedSourceRel(rel))
const destOf = (rel) => join(workspace, rel)
// 新版本删掉/改名种子：旧文件不自动删（用户数据优先），但必须让 --check 看见。
const orphanRels = state === null ? [] : Object.keys(stateFiles).filter((rel) => safeSeedRel(rel) && seed.files[rel] === undefined && existsSync(destOf(rel))).sort()
const lstatOf = (path) => { try { return lstatSync(path) } catch { return null } }
// 不跟随 symlink 读哈希：工作区里的链接可能指向用户/系统敏感文件。
const hashOf = (path, st = lstatOf(path)) => (st?.isFile() ? sha256(readFileSync(path, 'utf8')) : null)
const writeSeedFile = (src, dst) => {
  const st = lstatOf(dst)
  // symlink / hardlink / FIFO / device：先替换入口本身，绝不写穿到另一个 inode。
  if (st?.isDirectory()) {
    console.error(`scaffold: 种子目标不是普通文件：${dst}（先移走目录再重跑）`)
    process.exit(2)
  }
  if (st !== null && (!st.isFile() || st.nlink > 1 || st.isSymbolicLink())) unlinkSync(dst)
  try { copyFileSync(src, dst) } catch (error) {
    console.error(`scaffold: 写入种子失败：${dst}（${error.code ?? error.message}；先修权限/移走只读文件）`)
    process.exit(2)
  }
}

// --clean：只处理 scaffold 自己产生的东西。默认报告；--write 才删。
// 删除判据（长生命周期）：孤儿种子只在「盘上哈希 = 我们记录的基线」时删；改过的一律保留。
// sidecar = 未合并的种子更新，--write 视为显式丢弃；种子文件、run bundle、方法库永不在此删除。
if (cleanMode) {
  if (versionAhead) {
    console.error(`scaffold: --clean 拒绝：工作区记录 v${state.version} 比 pack v${seed.version} 新——当前工具不认识这些"孤儿"，删除可能是删新版本种子。先升级本工具。`)
    process.exit(1)
  }
  const tracked = new Set([...Object.keys(stateFiles), ...(Array.isArray(state?.adopted) ? state.adopted : [])])
  const entries = {}
  for (const rel of tracked) {
    if (!safeSeedRel(rel)) continue
    const st = lstatOf(destOf(rel))
    entries[rel] = { exists: st !== null, hash: hashOf(destOf(rel), st) }
  }
  const cleanup = planSeedCleanup({ seed, state, entries })
  const sidecars = new Set()
  for (const rel of new Set([...seedRels, ...tracked])) {
    if (!safeSeedRel(rel)) continue
    const dir = dirname(destOf(rel))
    if (!existsSync(dir)) continue
    const base = basename(rel)
    for (const name of readdirSync(dir)) {
      if (name === `${base}.seed-new` || name.startsWith(`${base}.seed-new-`)) sidecars.add(join(dir, name))
    }
  }
  const tmps = existsSync(workspace)
    ? readdirSync(workspace).filter((name) => name.startsWith('.dsh-research-seed.json.tmp-')).map((name) => join(workspace, name))
    : []
  let staleLock = null
  let liveLock = null
  if (!lockHeld && existsSync(lockPath)) {
    let holder = null
    try { holder = Number(readFileSync(lockPath, 'utf8').trim()) } catch {}
    let alive = false
    if (Number.isInteger(holder) && holder > 0) {
      try { process.kill(holder, 0); alive = true } catch (error) { if (error.code === 'EPERM') alive = true }
    }
    if (alive) liveLock = { holder }
    else staleLock = { holder }
  }
  console.log(`scaffold --clean（工作区 = ${workspace}；模式 = ${cleanWrite ? '执行' : '报告'}）`)
  for (const item of cleanup.remove) console.log(`  - 删除孤儿：${item.rel}（未改过，新种子已移除）`)
  for (const item of cleanup.keep) console.log(`  ~ 保留孤儿：${item.rel}（被改过——用户资产，不删）`)
  for (const rel of cleanup.dropFromState) console.log(`  · 清账：${rel}（文件已不在，状态记录失效）`)
  for (const file of [...sidecars].sort()) {
    console.log(discardSidecars
      ? `  - 丢弃 sidecar：${relative(workspace, file)}（未合并的种子更新）`
      : `  ~ 保留 sidecar：${relative(workspace, file)}（未合并；要丢弃加 --discard-sidecars）`)
  }
  for (const file of tmps) console.log(`  - 删除临时状态：${relative(workspace, file)}`)
  if (staleLock !== null) console.log(`  - 删除陈旧锁：${relative(workspace, lockPath)}（pid ${staleLock.holder ?? '未知'} 已不在）`)
  if (liveLock !== null) console.log(`  ~ 保留锁：${relative(workspace, lockPath)}（pid ${liveLock.holder} 仍活跃）`)
  const removable = cleanup.remove.length + cleanup.dropFromState.length + (discardSidecars ? sidecars.size : 0) + tmps.length + (staleLock === null ? 0 : 1)
  if (!cleanWrite) {
    console.log(`\nscaffold --clean: ${removable === 0 ? '无可清理项' : `发现 ${removable} 项可清理（未删；加 --write 执行）`}${cleanup.keep.length > 0 ? `；${cleanup.keep.length} 个改过的孤儿保留` : ''}`)
    process.exit(removable === 0 ? 0 : 1)
  }
  let failed = 0
  const removeFile = (target) => {
    try { unlinkSync(target) } catch (error) {
      console.error(`scaffold: 删除失败：${target}（${error.code ?? error.message}）`)
      failed += 1
    }
  }
  for (const item of cleanup.remove) removeFile(destOf(item.rel))
  if (discardSidecars) for (const file of sidecars) removeFile(file)
  for (const file of tmps) removeFile(file)
  if (staleLock !== null) removeFile(lockPath)
  if (state !== null && cleanup.remove.length + cleanup.dropFromState.length > 0) {
    const files = { ...stateFiles }
    for (const item of cleanup.remove) delete files[item.rel]
    for (const rel of cleanup.dropFromState) delete files[rel]
    const adopted = (Array.isArray(state.adopted) ? state.adopted : []).filter((rel) => existsSync(destOf(rel)))
    const skipped = (Array.isArray(state.skipped) ? state.skipped : []).filter((rel) => Object.hasOwn(files, rel) || existsSync(destOf(rel)))
    const nextState = { schemaVersion: SEED_STATE_SCHEMA, version: state.version, files, skipped, adopted }
    if (JSON.stringify(nextState) !== JSON.stringify({ schemaVersion: stateSchemaVersion, version: state.version, files: stateFiles, skipped: state.skipped ?? [], adopted: Array.isArray(state.adopted) ? state.adopted : [] })) {
      const tmpState = `${statePath}.tmp-${process.pid}`
      try {
        writeFileSync(tmpState, `${JSON.stringify(nextState, null, 2)}\n`)
        renameSync(tmpState, statePath)
      } catch (error) {
        try { unlinkSync(tmpState) } catch {}
        console.error(`scaffold: 状态文件写入失败：${statePath}（${error.code ?? error.message}）`)
        failed += 1
      }
    }
  }
  console.log(`\nscaffold --clean: ${failed === 0 ? '完成' : `${failed} 项失败`}（删除 ${cleanup.remove.length} 个孤儿 / ${discardSidecars ? sidecars.size : 0} 个 sidecar / ${tmps.length} 个临时件${staleLock === null ? '' : ' / 1 个陈旧锁'}；保留 ${cleanup.keep.length} 个改过的孤儿${discardSidecars ? '' : ` + ${sidecars.size} 个未合并 sidecar`}）`)
  process.exit(failed === 0 ? 0 : 1)
}

const plan = seedRels.map((rel) => {
  const destPath = destOf(rel)
  const destStat = lstatOf(destPath)
  const destHash = hashOf(destPath, destStat)
  const stateHash = stateFiles[rel] ?? null
  return {
    rel, destPath, destHash, stateHash, seedHash: seed.files[rel],
    status: classifySeedEntry({ destExists: destStat !== null, destHash, stateHash, seedHash: seed.files[rel] }),
  }
})
// 已显式 adopt 的文件：即使 seed 后来变了，也按 modified 处理（--upgrade 写 sidecar，绝不覆盖）。
for (const p of plan) {
  if (stateAdopted.has(p.rel) && p.destHash !== null && p.status !== 'current') p.status = 'modified'
}
// `.gitignore` 的 owner 是用户：preflight 对 untracked 的措辞就是「保留用户规则」。因此 --force
// 也不覆盖用户改过的 .gitignore，只写 sidecar 供合并（同文件的 owner 说法必须一致）。
const gitignoreEntry = plan.find((p) => p.rel === '.gitignore')
const gitignoreProtected = force && gitignoreEntry !== undefined && gitignoreEntry.destHash !== null
  && (gitignoreEntry.status === 'modified' || gitignoreEntry.status === 'untracked')

if (checkMode) {
  const count = (status) => plan.filter((p) => p.status === status).length
  const blocking = plan.filter((p) => ['missing', 'stale', 'untracked', 'deleted'].includes(p.status))
  const versionUnknown = state?.version === undefined
  const versionStale = !versionUnknown && !versionAhead && state.version !== seed.version
  const needsAttention = blocking.length > 0 || versionUnknown || versionAhead || versionStale || orphanRels.length > 0
  const mark = { current: '✓', missing: '✗', stale: '!', modified: '~', untracked: '?', deleted: '✕' }
  console.log(`scaffold --check（工作区 = ${workspace}；pack 种子 v${seed.version}${state?.version === undefined ? '；无状态文件' : `；工作区记录 v${state.version}`}）`)
  for (const p of plan) console.log(`  ${mark[p.status]} ${p.rel} — ${p.status}`)
  for (const rel of orphanRels) console.log(`  ? ${rel} — orphan（新种子已移除；不会自动删）`)
  const versionLabel = versionUnknown ? '无记录' : versionAhead ? `较新（记录 v${state.version} > pack v${seed.version}）` : versionStale ? '落后' : '一致'
  console.log(`\nscaffold --check: ${needsAttention ? (versionAhead ? '工作区记录比 pack 新——拒绝自动降级' : '工作区种子需要 --upgrade') : '工作区种子当前'}（missing ${count('missing')} / deleted ${count('deleted')} / stale ${count('stale')} / untracked ${count('untracked')} / modified ${count('modified')} / orphan ${orphanRels.length}；版本${versionLabel}）`)
  if (versionAhead) console.log(`  不要用 --upgrade 降级；确需回滚工作区种子用 --force（显式覆盖，新种子会丢失）`)
  else if (orphanRels.length > 0) console.log(`  orphan 需手动决定删除/迁移；--upgrade 不会自动删`)
  else if (needsAttention) console.log(`  修复：node ${join(PACK, 'scripts', 'scaffold.mjs')} --workspace ${workspace} --upgrade`)
  process.exit(needsAttention ? 1 : 0)
}

// --adopt：把当前已存在的、与种子不同的文件显式记成用户基线；不改文件内容。
// 之后 --check 显示 modified（不阻断）、--upgrade 只写 sidecar，绝不覆盖。
const adoptedNow = []
if (adopt) {
  for (const p of plan) {
    if (p.destHash !== null && p.status !== 'current') {
      adoptedNow.push(p.rel)
      p.status = 'modified'
    }
  }
}

// ① 工作区种子（按分类写入；method-library 永不覆盖）
if (versionAhead && upgrade && !force) {
  note(false, '研究工作区种子（拒绝降级）', `工作区记录 v${state.version} 比 pack 种子 v${seed.version} 新；--upgrade 不覆盖新种子（确需回滚用 --force）`)
  process.exit(1)
}
{
  // 首装发现“工作区里已有、又不是我们铺的”关键种子：先拒绝，不写任何种子/状态。
  // 研究手册/节点契约/模板是角色实际读到的纪律；静默跳过会让角色拿别的项目的指令。
  const untrackedCritical = plan.filter((p) => p.status === 'untracked' && p.rel !== '.gitignore')
  if (!force && !upgrade && !adopt && untrackedCritical.length > 0) {
    console.error('scaffold: 工作区里已有不是本包铺的关键种子，拒绝首装（避免角色拿错手册）：')
    for (const p of untrackedCritical) console.error(`  - ${p.rel}（与种子不同，且没有安装记录）`)
    console.error('  处理：换一个空目录；或 --force 显式覆盖；或 --upgrade 生成 .seed-new 后手动合并（合并后需显式接受，preflight 会保持未跟踪提示）')
    process.exit(1)
  }
  let written = 0
  let skipped = 0
  let sidecars = 0
  const writtenRels = new Set()
  // 先验证所有会写的父目录，再落盘：避免 templates 父 symlink 越界时前几个种子已经写了一半。
  for (const p of plan) {
    const forceWrites = force && !(p.rel === '.gitignore' && gitignoreProtected)
    const willWrite = forceWrites || p.status === 'missing' || (upgrade && p.status === 'stale')
    const willSidecar = !willWrite && p.status !== 'current'
      && ((upgrade && (p.status === 'modified' || p.status === 'untracked'))
        || (force && p.rel === '.gitignore' && gitignoreProtected))
    if (!willWrite && !willSidecar) continue
    try {
      assertSeedTargetInsideWorkspace({ workspace, rel: p.rel })
    } catch (error) {
      console.error(`scaffold: 研究工作区种子父目录越界：${p.rel}（${error instanceof Error ? error.message : String(error)}）`)
      process.exit(2)
    }
  }
  for (const p of plan) {
    const shouldWrite = (force && !(p.rel === '.gitignore' && gitignoreProtected)) || p.status === 'missing' || (upgrade && p.status === 'stale')
    if (shouldWrite) {
      if (!dryRun) {
        mkdirSync(dirname(p.destPath), { recursive: true })
        writeSeedFile(sourceOf(p.rel), p.destPath)
      }
      writtenRels.add(p.rel)
      written += 1
      continue
    }
    if (p.status === 'deleted') { skipped += 1; continue }
    if (p.status !== 'current' && ((upgrade && (p.status === 'modified' || p.status === 'untracked')) || (force && p.rel === '.gitignore' && gitignoreProtected))) {
      if (!dryRun) {
        const sidecar = `${p.destPath}.seed-new`
        if (existsSync(sidecar)) {
          const existing = (() => { try { return readFileSync(sidecar, 'utf8') } catch { return null } })()
          const nextSeed = readFileSync(sourceOf(p.rel), 'utf8')
          if (existing !== nextSeed) {
            const versioned = `${sidecar}-${seed.version}`
            if (!existsSync(versioned)) writeSeedFile(sourceOf(p.rel), versioned)
          }
        } else {
          writeSeedFile(sourceOf(p.rel), sidecar)
        }
        sidecars += 1
      }
    }
    skipped += 1
  }

  const methodRel = 'method-library.md'
  const methodSrc = join(SEED, methodRel)
  const methodDst = join(workspace, methodRel)
  if (existsSync(methodSrc) && !existsSync(methodDst)) {
    try {
      assertSeedTargetInsideWorkspace({ workspace, rel: methodRel })
    } catch (error) {
      console.error(`scaffold: 方法库父目录越界：${methodRel}（${error instanceof Error ? error.message : String(error)}）`)
      process.exit(2)
    }
    if (!dryRun) {
      mkdirSync(workspace, { recursive: true })
      writeSeedFile(methodSrc, methodDst)
    }
    written += 1
  } else if (existsSync(methodDst)) {
    skipped += 1
  }

  // 状态文件：只记录真正落地/已 current 的种子；untracked 不冒充 baseline。
  // 默认模式保留旧版本号（让 --check 继续报旧种子），但把本轮补写的缺失文件记进基线。
  if (!dryRun) {
    if (lstatOf(statePath)?.isSymbolicLink()) {
      note(false, '研究工作区种子（状态文件是 symlink）', `${statePath} 是符号链接；拒绝写穿（先删链接再跑）`)
      process.exit(2)
    }
    if (lstatOf(statePath)?.isDirectory()) {
      note(false, '研究工作区种子（状态文件是目录）', `${statePath} 是目录；先移走再重跑`)
      process.exit(2)
    }
    const stateFiles = state?.files ?? {}
    const seedHashByName = seed.files
    const next = nextSeedState({
      seed: { version: seed.version, files: seedHashByName },
      previousFiles: stateFiles,
      classifications: Object.fromEntries(plan.map((p) => [p.rel, p.status])),
      written: writtenRels,
      force,
    })
    const nextFiles = { ...next.files }
    // --force 不覆盖用户 .gitignore：基线保持用户改前的记录（或干脆不记 untracked），
    // 让 --check/preflight 继续看见「用户规则未被接管」。
    if (gitignoreProtected && gitignoreEntry !== undefined) {
      if (gitignoreEntry.stateHash !== null) nextFiles['.gitignore'] = gitignoreEntry.stateHash
      else {
        delete nextFiles['.gitignore']
        if (!next.skipped.includes('.gitignore')) { next.skipped.push('.gitignore'); next.skipped.sort() }
      }
    }
    for (const rel of adoptedNow) {
      const entry = plan.find((p) => p.rel === rel)
      if (entry !== undefined && entry.destHash !== null) nextFiles[rel] = entry.destHash
    }
    const adoptedSet = new Set(stateAdopted)
    for (const rel of adoptedNow) adoptedSet.add(rel)
    if (force) for (const rel of writtenRels) adoptedSet.delete(rel)
    const adopted = [...adoptedSet].filter((rel) => existsSync(destOf(rel))).sort()
    const version = (adopt || force || upgrade || state === null) ? seed.version : state.version
    const nextState = { schemaVersion: SEED_STATE_SCHEMA, version, files: nextFiles, skipped: next.skipped, adopted }
    const previousState = state === null ? null : { schemaVersion: stateSchemaVersion, version: state.version, files: stateFiles, skipped: state.skipped ?? [], adopted: Array.isArray(state.adopted) ? state.adopted : [] }
    if (force || upgrade || state === null || JSON.stringify(nextState) !== JSON.stringify(previousState)) {
      const tmpState = `${statePath}.tmp-${process.pid}`
      try {
        writeFileSync(tmpState, `${JSON.stringify(nextState, null, 2)}\n`)
        renameSync(tmpState, statePath)
      } catch (error) {
        try { unlinkSync(tmpState) } catch {}
        note(false, '研究工作区种子（状态文件写入失败）', `${statePath}（${error.code ?? error.message}；检查工作区权限后重跑）`)
        process.exit(2)
      }
    }
  }

  note(true, `研究工作区种子（${workspace}）`, `${dryRun ? '[dry-run] ' : ''}写入 ${written} 个、跳过 ${skipped} 个（--force 覆盖；--upgrade 安全升级；--adopt 显式接受当前；method-library 不覆盖）${sidecars > 0 ? `；${sidecars} 个用户改过的文件写成 .seed-new` : ''}${adoptedNow.length > 0 ? `；${adoptedNow.length} 个文件记为 adopt` : ''}${orphanRels.length > 0 ? `；${orphanRels.length} 个孤儿种子未删` : ''}`)
}

if (seedOnly) {
  console.log('\nscaffold: --seed-only 跳过团队层与 preflight（只处理工作区种子）')
  process.exit(steps.some((s) => !s.ok) ? 1 : 0)
}

// ② profile 组合（团队层；版本与 engines.dsh 同源——不再装未钉版的最新层）
{
  const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'
  // 团队层必须匹配“实际运行中的 DSH”，不是 engines.dsh 范围：安装锚优先，其次 profile 的
  // app-boot，最后才是 PATH dsh；兼容矩阵只作诊断线索，不冒充运行版本。
  const hostForTeam = explicitHost ?? join(resolveDshHome(process.env), 'profiles', profile)
  const teamLabel = `团队层 profile「${profile}」`
  let TEAM_VERSION = installAnchor?.version ?? null
  if (TEAM_VERSION === null && existsSync(join(hostForTeam, 'package.json'))) {
    try {
      const requireFromHost = createRequire(join(hostForTeam, 'package.json'))
      TEAM_VERSION = JSON.parse(readFileSync(requireFromHost.resolve('@deepseek-ai/dsh-app-boot/package.json'), 'utf8')).version ?? null
    } catch { TEAM_VERSION = null }
  }
  const dshVersionRun = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
  if (TEAM_VERSION === null && dshVersionRun.status === 0) {
    TEAM_VERSION = String(dshVersionRun.stdout).match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)?.[0] ?? null
  }
  const installedTeamVersion = (() => {
    try {
      return JSON.parse(readFileSync(join(hostForTeam, 'node_modules', ...TEAM.split('/'), 'package.json'), 'utf8')).version ?? null
    } catch { return null }
  })()
  const TEAM_SPEC = TEAM_VERSION === null ? TEAM : `${TEAM}@${TEAM_VERSION}`
  const hasDsh = dshVersionRun.status === 0
  if (TEAM_VERSION === null) {
    note(false, teamLabel, '无法派生团队层版本——安装锚、profile app-boot、PATH dsh 都不可用（团队层是 N2 experimental；先确认 dsh 在 PATH 或给 --install-anchor）')
  } else if (installedTeamVersion === TEAM_VERSION && !refreshTeam) {
    note(true, teamLabel, `已在场：${TEAM}@${installedTeamVersion}（不改写依赖来源；需要刷新用 --refresh-team）`)
  } else if (installedTeamVersion !== null && !refreshTeam) {
    note(false, teamLabel, `已在场但版本是 ${installedTeamVersion}，运行版本期望 ${TEAM_VERSION}；确认后用 --refresh-team 更新（默认不改用户 pin；N2 experimental 随 DSH 版本走）`)
  } else if (!hasDsh) {
    note(false, teamLabel, 'dsh CLI 不可用——装 DSH 后重跑，或手工在 profile 的 dsh.profile.bundles 加该层（N2 experimental：缺层时四角色协作主通道不可用）')
  } else if (dryRun) {
    note(true, teamLabel, `[dry-run] 将执行：dsh plugin --profile ${profile} add ${TEAM_SPEC}`)
  } else {
    const r = spawnSync('dsh', ['plugin', '--profile', profile, 'add', TEAM_SPEC], { encoding: 'utf8' })
    const ok = r.status === 0
    const reason = r.error?.code === 'ENOENT' ? 'dsh CLI 不在 PATH' : String(r.stderr ?? r.stdout).trim().split('\n').slice(-2).join(' ')
    note(ok, teamLabel, ok ? `已确保 ${TEAM_SPEC} 在场` : `失败：${reason || '未知错误'}`)
  }
}

// ③ 收尾 preflight（dry-run 跳过：未落盘，工作区检查必然报缺——预演退出码只看前两步）
const failed = steps.filter((s) => !s.ok).length
if (dryRun) {
  console.log('\nscaffold: [dry-run] 跳过收尾 preflight（未落盘，工作区检查预期报缺）')
  console.log(`scaffold: ${failed === 0 ? '预演通过' : `${failed} 步失败`}（工作区 = ${workspace}，profile = ${profile}）`)
  process.exit(failed === 0 ? 0 : 1)
}
console.log('\nscaffold: 跑 preflight 复核…\n')
const preflightHost = explicitHost ?? (existsSync(join(targetHost, 'package.json')) ? targetHost : null)
const preflightHostArgs = preflightHost === null ? ['--no-host-inference'] : ['--host', preflightHost]
const preflightAnchorArgs = installAnchor === null ? [] : ['--install-anchor', installAnchor.path]
const pf = spawnSync(process.execPath, [join(PACK, 'scripts', 'preflight.mjs'), '--workspace', workspace, ...preflightHostArgs, ...preflightAnchorArgs, ...(installOnly ? ['--install-only'] : [])], { stdio: 'inherit' })
const ok = failed === 0 && pf.status === 0
console.log(`\nscaffold: ${ok ? installOnly ? '安装准备完成（不代表研究就绪）' : '准备完成' : '准备未完成（检查失败）'}（工作区 = ${workspace}，profile = ${profile}）`)
if (ok && !installOnly) {
  console.log(`下一步：cd ${workspace} && dsh --profile ${profile}   # 起研究会话；角色 = Deep Research Lead`)
}
process.exit(ok ? 0 : 1)
