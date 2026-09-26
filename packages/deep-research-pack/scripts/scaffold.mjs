#!/usr/bin/env node
// scaffold.mjs — 一键部署准备（pack 自带）：把「装了 pack」变成「能跑研究」。
//
// 做三件事（幂等，可重复跑）：
//   ① 研究工作区：从本包 workspace/ 种子铺开（手册 AGENTS.md + templates/run/），
//      已存在则**不覆盖**（除非 --force）——部署方的工作区是活的，种子只管起步；
//   ② profile 组合：确保 agent-team-profile 层在目标 profile 里（本包故意不声明团队行；
//      缺它 → 没有 spawn_teammate/team_task）——调 dsh plugin add（幂等）；
//   ③ 收尾跑 preflight 报告状态。
//
// 用法：
//   node <pack>/scripts/scaffold.mjs --workspace <研究工作区> [--profile <名>] [--force] [--dry-run]
//   或经 bin：dsh-deep-research-scaffold --workspace <dir> [--profile research]
//
// 不做的事（有意）：不装 DSH 本体、不写密钥（安全边界：密钥永不落仓库/脚本）。
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SEED = join(PACK, 'workspace')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const argv = process.argv.slice(2)
const argOf = (name) => { const i = argv.indexOf(`--${name}`); return i === -1 ? null : argv[i + 1] }
const workspace = argOf('workspace') === null ? null : resolve(argOf('workspace'))
const profile = argOf('profile') ?? 'research'
const force = argv.includes('--force')
const dryRun = argv.includes('--dry-run')

const steps = []
const note = (ok, name, detail) => { steps.push({ ok, name, detail }); console.log(`  ${ok ? '✓' : '✗'} ${name}\n      ${detail}`) }

if (workspace === null) {
  console.error('scaffold: 需要 --workspace <研究工作区目录>（角色会话的 cwd；手册从这里注入）')
  process.exit(2)
}

// ① 工作区种子
{
  const files = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.name.endsWith('.md')) files.push(relative(SEED, p))
    }
  }
  walk(SEED)
  let written = 0
  let skipped = 0
  for (const rel of files) {
    const dst = join(workspace, rel)
    if (existsSync(dst) && !force) { skipped += 1; continue }
    if (!dryRun) {
      mkdirSync(dirname(dst), { recursive: true })
      copyFileSync(join(SEED, rel), dst)
    }
    written += 1
  }
  note(true, `研究工作区种子（${workspace}）`, `${dryRun ? '[dry-run] ' : ''}写入 ${written} 个、跳过已存在 ${skipped} 个（--force 覆盖）`)
}

// ② profile 组合（团队层）
{
  const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'
  const hasDsh = spawnSync('dsh', ['--version'], { encoding: 'utf8' }).status === 0
  if (!hasDsh) {
    note(false, `团队层加入 profile「${profile}」`, 'dsh CLI 不可用——装 DSH 后重跑，或手工在 profile 的 dsh.profile.bundles 加该层')
  } else if (dryRun) {
    note(true, `团队层加入 profile「${profile}」`, `[dry-run] 将执行：dsh plugin --profile ${profile} add ${TEAM}`)
  } else {
    const r = spawnSync('dsh', ['plugin', '--profile', profile, 'add', TEAM], { encoding: 'utf8' })
    const ok = r.status === 0
    note(ok, `团队层加入 profile「${profile}」`, ok ? `已确保 ${TEAM} 在场（幂等）` : `失败：${String(r.stderr ?? r.stdout).trim().split('\n').slice(-2).join(' ')}`)
  }
}

// ③ 收尾 preflight
console.log('\nscaffold: 跑 preflight 复核…\n')
const pf = spawnSync(process.execPath, [join(PACK, 'scripts', 'preflight.mjs'), '--workspace', workspace, ...(argOf('host') === null ? [] : ['--host', argOf('host')])], { stdio: 'inherit' })
const failed = steps.filter((s) => !s.ok).length
console.log(`\nscaffold: ${failed === 0 ? '准备完成' : `${failed} 步失败`}（工作区 = ${workspace}，profile = ${profile}）`)
if (failed === 0) {
  console.log(`下一步：cd ${workspace} && dsh --profile ${profile}   # 起研究会话；角色 = Deep Research Lead`)
}
process.exit(failed === 0 && pf.status === 0 ? 0 : 1)
