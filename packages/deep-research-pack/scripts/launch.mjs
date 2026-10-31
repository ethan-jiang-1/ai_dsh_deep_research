#!/usr/bin/env node
/**
 * dsh-deep-research — Deep Research 产品启动器（D38）。
 *
 * 只做四件事：解析工作区 → 装配产品 profile → 铺/检查工作区种子 → spawn `dsh --profile`。
 * 运行时仍是 DSH；不新增应用进程，不手写 profile，不把工作区塞给 Web 命令行。
 *
 * 退出码：0 成功；1 运行时/检查失败；2 用法或前置缺失。
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { parseLauncherArgs, helpText } from './lib/launcher/args.mjs'
import {
  appendGitignoreBlock, assertWorkspaceSafety, defaultHome, ensureDirectory, hasGitignoreBlock,
  isDirectory, promptWorkspace, resolveResearchRoot, resolveWorkspaceSource, GITIGNORE_RULES, WORKSPACE_ENV,
} from './lib/launcher/workspace.mjs'
import { readLauncherSettings, writeLauncherSettings } from './lib/launcher/settings.mjs'
import { ensureProfile, packManifest, profileDirectory } from './lib/launcher/profile.mjs'
import { resolveDshHome, resolvePathInput } from './lib/dsh-home.mjs'

const PACK_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACK_PKG = JSON.parse(readFileSync(join(PACK_DIR, 'package.json'), 'utf8'))
const USAGE_EXIT = 2
const FAIL_EXIT = 1

const out = (message) => process.stdout.write(`${message}\n`)
const err = (message) => process.stderr.write(`deep-research: ${message}\n`)

function fail(message, code = FAIL_EXIT) {
  err(message)
  process.exit(code)
}

function parseOrExit(argv) {
  const parsed = parseLauncherArgs(argv)
  if (!parsed.ok) {
    for (const line of parsed.errors) err(line)
    err('用 --help 查看用法')
    process.exit(USAGE_EXIT)
  }
  if (parsed.flags.help) {
    out(helpText(PACK_PKG.version))
    process.exit(0)
  }
  if (parsed.flags.version) {
    out(PACK_PKG.version)
    process.exit(0)
  }
  return parsed
}

async function main() {
  const parsed = parseOrExit(process.argv.slice(2))
  const { values, flags, forwarded } = parsed
  const homeFlag = values.home
  const dshHome = homeFlag === undefined ? resolveDshHome(process.env) : resolvePathInput(homeFlag)
  const env = { ...process.env, DSH_HOME: dshHome }
  const profile = values.profile ?? 'deep-research'
  const pack = packManifest(PACK_DIR)
  const dshBin = process.env.DSH_BIN ?? 'dsh'

  // 1) 工作区解析（不写盘）
  const saved = readLauncherSettings({ home: dshHome, profile })
  const source = resolveWorkspaceSource({ explicit: values.workspace ?? null, env: process.env, saved: saved.settings?.workspace ?? null })
  let rawWorkspace = source.raw
  if (rawWorkspace === null) {
    if (process.stdin.isTTY) {
      rawWorkspace = await promptWorkspace({ cwd: process.cwd() })
    } else {
      fail(`未指定工作区。用 --workspace <dir>、${WORKSPACE_ENV}，或先运行一次交互式启动来保存设置`, USAGE_EXIT)
    }
  }
  const workspace = resolvePathInput(rawWorkspace, homeFlag === undefined ? homedir() : homedir())
  const profileDir = profileDirectory(dshHome, profile)
  const safety = assertWorkspaceSafety({
    workspace,
    root: values.root ?? null,
    home: defaultHome(),
    dshHome,
    packDir: PACK_DIR,
    profileDir,
  })
  const mode = resolveResearchRoot({ workspaceDir: safety.workspace, root: safety.root === safety.workspace ? null : safety.root, inPlace: flags.inPlace })
  const root = mode.root
  if (mode.note !== null) out(`deep-research: ${mode.note}`)

  // 2) 目录创建与 gitignore 提示（--check 不写）
  if (!flags.check) {
    ensureDirectory(safety.workspace)
    ensureDirectory(root)
    const gitignore = join(root, '.gitignore')
    if (flags.gitignoreAppend) {
      const appended = appendGitignoreBlock(root)
      if (!appended.ok) fail(`追加 .gitignore 失败：${appended.error}`)
      out(`deep-research: .gitignore ${appended.appended ? '已追加' : '已有'}研究数据规则（${appended.path}）`)
    } else if (existsSync(gitignore) && !hasGitignoreBlock(root) && !existsSync(join(root, '.dsh-research-seed.json'))) {
      out('deep-research: 该工作区已有 .gitignore；未自动改写。建议加入：')
      out(`  ${GITIGNORE_RULES.join('  ')}`)
      out('  想自动追加（带标记块）用 --gitignore-append')
    }
  } else if (!isDirectory(root)) {
    out(`deep-research: [check] 研究根不存在（首次启动会创建）：${root}`)
  }

  // 3) profile 装配/检查
  const profileResult = ensureProfile({
    home: dshHome,
    profile,
    packDir: PACK_DIR,
    packVersion: pack.version,
    enginesDsh: pack.enginesDsh,
    dshBin,
    env,
    cwd: flags.check ? process.cwd() : root,
    checkOnly: flags.check,
    refreshTeam: flags.refreshTeam,
    log: (message) => out(`deep-research: ${message}`),
  })
  for (const warning of profileResult.warnings) err(warning)

  // 4) 种子/检查
  let seedStatus = 'skipped'
  if (!flags.noSeed) {
    const scaffoldArgs = flags.check
      ? ['--workspace', root, '--profile', profile, '--check']
      : ['--workspace', root, '--profile', profile, '--install-only']
    const scaffold = spawnSync(process.execPath, [join(PACK_DIR, 'scripts', 'scaffold.mjs'), ...scaffoldArgs], {
      encoding: 'utf8',
      env,
      cwd: root,
    })
    seedStatus = scaffold.status === 0 ? 'ok' : 'failed'
    if (!scaffold.stdout) {
      // 保持安静；失败时只给尾部，避免把 preflight 全表刷两遍。
    }
    if (scaffold.status !== 0) {
      const text = `${scaffold.stdout ?? ''}${scaffold.stderr ?? ''}`.trim()
      if (text !== '') err(text.split('\n').slice(-12).join('\n'))
    }
  }

  const ready = profileResult.ok && seedStatus !== 'failed'
  if (flags.check) {
    out(`deep-research: [check] profile=${profile} workspace=${safety.workspace} root=${root} mode=${mode.mode}`)
    out(`  profile: ${profileResult.ok ? 'ready' : `${profileResult.status} — ${profileResult.detail}`}`)
    out(`  pack: ${profileResult.packVersion ?? '未安装'}`)
    out(`  team: ${profileResult.teamVersion ?? '未安装'}`)
    out(`  seed: ${seedStatus}`)
    process.exit(ready ? 0 : FAIL_EXIT)
  }
  if (!profileResult.ok) fail(profileResult.detail)
  if (seedStatus === 'failed') fail('工作区种子/预检未通过（见上方输出）')

  // 5) 保存设置（只在成功装配/播种后）
  const savedResult = writeLauncherSettings({ home: dshHome, profile }, { workspace: root })
  if (!savedResult.ok) err(`设置保存失败（不阻断启动）：${savedResult.error}`)

  if (flags.setupOnly) {
    out(`deep-research: setup 完成  profile=${profile}  workspace=${root}`)
    out('deep-research: 用 `dsh --profile ' + profile + '` 或再跑一次本命令起 Web')
    process.exit(0)
  }

  // 6) spawn dsh
  const childArgs = ['--profile', profile, ...forwarded]
  out(`deep-research: profile=${profile}  workspace=${root}`)
  out('deep-research: starting dsh ...')
  const child = spawn(dshBin, childArgs, {
    cwd: root,
    env: { ...env, [WORKSPACE_ENV]: root },
    stdio: 'inherit',
  })
  child.on('error', (error) => {
    if (error.code === 'ENOENT') fail('找不到 dsh（PATH）；先安装 DSH 或设置 DSH_BIN', USAGE_EXIT)
    fail(`启动 dsh 失败：${error.message}`)
  })
  child.on('exit', (code, signal) => {
    if (signal !== null) process.exit(1)
    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  err(String(error?.stack ?? error))
  process.exit(FAIL_EXIT)
})
