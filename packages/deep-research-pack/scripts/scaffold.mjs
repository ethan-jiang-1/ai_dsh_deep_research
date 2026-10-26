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
import { accessSync, constants as fsConstants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { sha256, classifySeedEntry, seedSourceRel } from './lib/seed-core.mjs'
import { satisfiesVersion } from './lib/version-range.mjs'

const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SEED = join(PACK, 'workspace')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const argv = process.argv.slice(2)
const argOf = (name) => { const i = argv.indexOf(`--${name}`); return i === -1 ? null : argv[i + 1] }
const workspace = argOf('workspace') === null ? null : resolve(argOf('workspace'))
const profile = argOf('profile') ?? 'research'
const explicitHost = argOf('host')
const force = argv.includes('--force')
const dryRun = argv.includes('--dry-run')
const installOnly = argv.includes('--install-only')
const seedOnly = argv.includes('--seed-only')
const checkMode = argv.includes('--check')
const upgrade = argv.includes('--upgrade')

const steps = []
const note = (ok, name, detail) => { steps.push({ ok, name, detail }); console.log(`  ${ok ? '✓' : '✗'} ${name}\n      ${detail}`) }

if (workspace === null) {
  console.error('scaffold: 需要 --workspace <研究工作区目录>（角色会话的 cwd；手册从这里注入）')
  process.exit(2)
}
if (existsSync(workspace) && !statSync(workspace).isDirectory()) {
  console.error(`scaffold: --workspace 必须是目录，当前是文件：${workspace}`)
  process.exit(2)
}
if (!checkMode && existsSync(workspace)) {
  try { accessSync(workspace, fsConstants.W_OK) } catch {
    console.error(`scaffold: --workspace 不可写：${workspace}（--check 可只读；写入请先修权限）`)
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

const statePath = join(workspace, '.dsh-research-seed.json')
let state = null
if (existsSync(statePath)) {
  try { state = JSON.parse(readFileSync(statePath, 'utf8')) } catch { state = null }
}
const stateFiles = state?.files ?? {}
const seedRels = Object.keys(seed.files).sort()
// 回滚保护：工作区记录比 pack 种子新时，--upgrade 不得把新种子降级覆盖（真实迁移的反向路径）。
const versionAhead = state?.version !== undefined && state.version !== seed.version && satisfiesVersion(state.version, `>${seed.version}`)
const sourceOf = (rel) => join(SEED, seedSourceRel(rel))
const destOf = (rel) => join(workspace, rel)
const lstatOf = (path) => { try { return lstatSync(path) } catch { return null } }
// 不跟随 symlink 读哈希：工作区里的链接可能指向用户/系统敏感文件。
const hashOf = (path, st = lstatOf(path)) => (st?.isFile() ? sha256(readFileSync(path, 'utf8')) : null)
const writeSeedFile = (src, dst) => {
  const st = lstatOf(dst)
  if (st?.isSymbolicLink()) unlinkSync(dst) // 替换链接本身，绝不写穿到目标
  else if (st?.isDirectory()) {
    console.error(`scaffold: 种子目标不是普通文件：${dst}（先移走目录再重跑）`)
    process.exit(2)
  }
  copyFileSync(src, dst)
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

if (checkMode) {
  const count = (status) => plan.filter((p) => p.status === status).length
  const blocking = plan.filter((p) => ['missing', 'stale', 'untracked', 'deleted'].includes(p.status))
  const versionUnknown = state?.version === undefined
  const versionStale = !versionUnknown && !versionAhead && state.version !== seed.version
  const needsAttention = blocking.length > 0 || versionUnknown || versionAhead || versionStale
  const mark = { current: '✓', missing: '✗', stale: '!', modified: '~', untracked: '?', deleted: '✕' }
  console.log(`scaffold --check（工作区 = ${workspace}；pack 种子 v${seed.version}${state?.version === undefined ? '；无状态文件' : `；工作区记录 v${state.version}`}）`)
  for (const p of plan) console.log(`  ${mark[p.status]} ${p.rel} — ${p.status}`)
  const versionLabel = versionUnknown ? '无记录' : versionAhead ? `较新（记录 v${state.version} > pack v${seed.version}）` : versionStale ? '落后' : '一致'
  console.log(`\nscaffold --check: ${needsAttention ? (versionAhead ? '工作区记录比 pack 新——拒绝自动降级' : '工作区种子需要 --upgrade') : '工作区种子当前'}（missing ${count('missing')} / deleted ${count('deleted')} / stale ${count('stale')} / untracked ${count('untracked')} / modified ${count('modified')}；版本${versionLabel}）`)
  if (versionAhead) console.log(`  不要用 --upgrade 降级；确需回滚工作区种子用 --force（显式覆盖，新种子会丢失）`)
  else if (needsAttention) console.log(`  修复：node ${join(PACK, 'scripts', 'scaffold.mjs')} --workspace ${workspace} --upgrade`)
  process.exit(needsAttention ? 1 : 0)
}

// ① 工作区种子（按分类写入；method-library 永不覆盖）
if (versionAhead && upgrade && !force) {
  note(false, '研究工作区种子（拒绝降级）', `工作区记录 v${state.version} 比 pack 种子 v${seed.version} 新；--upgrade 不覆盖新种子（确需回滚用 --force）`)
  process.exit(1)
}
{
  let written = 0
  let skipped = 0
  let sidecars = 0
  const skippedRels = []
  for (const p of plan) {
    const shouldWrite = force || p.status === 'missing' || (upgrade && p.status === 'stale')
    if (shouldWrite) {
      if (!dryRun) {
        mkdirSync(dirname(p.destPath), { recursive: true })
        writeSeedFile(sourceOf(p.rel), p.destPath)
      }
      written += 1
      continue
    }
    if (p.status === 'deleted') { skippedRels.push(p.rel); skipped += 1; continue }
    if (p.status !== 'current' && upgrade && (p.status === 'modified' || p.status === 'untracked')) {
      if (!dryRun) {
        const sidecar = `${p.destPath}.seed-new`
        writeSeedFile(sourceOf(p.rel), sidecar)
        sidecars += 1
      }
      skippedRels.push(p.rel)
    }
    skipped += 1
  }

  const methodRel = 'method-library.md'
  const methodSrc = join(SEED, methodRel)
  const methodDst = join(workspace, methodRel)
  if (existsSync(methodSrc) && !existsSync(methodDst)) {
    if (!dryRun) {
      mkdirSync(workspace, { recursive: true })
      writeSeedFile(methodSrc, methodDst)
    }
    written += 1
  } else if (existsSync(methodDst)) {
    skipped += 1
  }

  // 状态文件：force/upgrade 总是刷新；首次安装写基线；默认模式在已有状态时不动（让 --check 如实报旧版本）。
  if (!dryRun && (force || upgrade || state === null)) {
    if (lstatOf(statePath)?.isSymbolicLink()) {
      note(false, '研究工作区种子（状态文件是 symlink）', `${statePath} 是符号链接；拒绝写穿（先删链接再跑）`)
      process.exit(2)
    }
    if (lstatOf(statePath)?.isDirectory()) {
      note(false, '研究工作区种子（状态文件是目录）', `${statePath} 是目录；先移走再重跑`)
      process.exit(2)
    }
    const next = {
      version: seed.version,
      files: Object.fromEntries(seedRels.map((rel) => [rel, seed.files[rel]])),
      skipped: [...new Set(skippedRels)].sort(),
    }
    writeFileSync(statePath, `${JSON.stringify(next, null, 2)}\n`)
  }

  note(true, `研究工作区种子（${workspace}）`, `${dryRun ? '[dry-run] ' : ''}写入 ${written} 个、跳过 ${skipped} 个（--force 覆盖；--upgrade 安全升级；method-library 不覆盖）${sidecars > 0 ? `；${sidecars} 个用户改过的文件写成 .seed-new` : ''}`)
}

if (seedOnly) {
  console.log('\nscaffold: --seed-only 跳过团队层与 preflight（只处理工作区种子）')
  process.exit(steps.some((s) => !s.ok) ? 1 : 0)
}

// ② profile 组合（团队层；版本与 engines.dsh 同源——不再装未钉版的最新层）
{
  const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'
  // 团队层必须匹配“实际运行中的 DSH”，不是 engines.dsh 范围：先读 profile 的 app-boot，
  // 再回退到 PATH dsh，最后才用兼容矩阵的已测基线。
  const hostForTeam = explicitHost ?? (process.env.DSH_HOME ? join(process.env.DSH_HOME, 'profiles', profile) : null)
  let TEAM_VERSION = null
  if (hostForTeam !== null && existsSync(join(hostForTeam, 'package.json'))) {
    try {
      const requireFromHost = createRequire(join(hostForTeam, 'package.json'))
      TEAM_VERSION = JSON.parse(readFileSync(requireFromHost.resolve('@deepseek-ai/dsh-app-boot/package.json'), 'utf8')).version ?? null
    } catch { TEAM_VERSION = null }
  }
  if (TEAM_VERSION === null) {
    const r = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
    if (r.status === 0) TEAM_VERSION = String(r.stdout).match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)?.[0] ?? null
  }
  if (TEAM_VERSION === null) TEAM_VERSION = pkg.dsh?.compatibility?.dshReleases?.[0]?.replace(/^dsh-v/, '') ?? null
  const TEAM_SPEC = TEAM_VERSION === null ? TEAM : `${TEAM}@${TEAM_VERSION}`
  const hasDsh = spawnSync('dsh', ['--version'], { encoding: 'utf8' }).status === 0
  if (TEAM_VERSION === null) {
    note(false, `团队层加入 profile「${profile}」`, '无法派生团队层版本——package.json 的 engines.dsh 与 dsh.compatibility.dshReleases 都不可用')
  } else if (!hasDsh) {
    note(false, `团队层加入 profile「${profile}」`, 'dsh CLI 不可用——装 DSH 后重跑，或手工在 profile 的 dsh.profile.bundles 加该层')
  } else if (dryRun) {
    note(true, `团队层加入 profile「${profile}」`, `[dry-run] 将执行：dsh plugin --profile ${profile} add ${TEAM_SPEC}`)
  } else {
    const r = spawnSync('dsh', ['plugin', '--profile', profile, 'add', TEAM_SPEC], { encoding: 'utf8' })
    const ok = r.status === 0
    note(ok, `团队层加入 profile「${profile}」`, ok ? `已确保 ${TEAM_SPEC} 在场（幂等）` : `失败：${String(r.stderr ?? r.stdout).trim().split('\n').slice(-2).join(' ')}`)
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
const dshHome = resolve(process.env.DSH_HOME ?? join(process.env.HOME ?? '', '.dsh'))
const targetHost = join(dshHome, 'profiles', profile)
const preflightHost = explicitHost ?? (existsSync(join(targetHost, 'package.json')) ? targetHost : null)
const preflightHostArgs = preflightHost === null ? ['--no-host-inference'] : ['--host', preflightHost]
const pf = spawnSync(process.execPath, [join(PACK, 'scripts', 'preflight.mjs'), '--workspace', workspace, ...preflightHostArgs, ...(installOnly ? ['--install-only'] : [])], { stdio: 'inherit' })
const ok = failed === 0 && pf.status === 0
console.log(`\nscaffold: ${ok ? installOnly ? '安装准备完成（不代表研究就绪）' : '准备完成' : '准备未完成（检查失败）'}（工作区 = ${workspace}，profile = ${profile}）`)
if (ok && !installOnly) {
  console.log(`下一步：cd ${workspace} && dsh --profile ${profile}   # 起研究会话；角色 = Deep Research Lead`)
}
process.exit(ok ? 0 : 1)
