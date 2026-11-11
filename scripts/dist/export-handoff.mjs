#!/usr/bin/env node
// export-handoff.mjs — 干净源码移交：只打包 HEAD 的 tracked 源，绝不带运行态/凭据/run 数据。
//
// 为什么不是 `cp -r`：开发目录里同时住着 runtime/harness-home（凭据/会话）、
// research-workspace/drt_*（研究产物）、_dist/*.tgz 与 node_modules；gitignore 能挡 git，
// 挡不住目录复制。移交的单位是“源 + 说明”，不是某个人的工作树。
//
// 产物 = git archive 的 tracked 源 + 包内 HANDOFF.md。tar 不含 .git，所以 HANDOFF 给两条接收
// 路径：有 git 的 clone；只有 tar 的 git init → fetch → reset → submodule update。
// vendor/dsh 是 submodule，内容不在 tar 里，两条路径都需要网络取它。
// 用法：node scripts/dist/export-handoff.mjs [--out <dir>]
// 退出码：0 产物可用 / 1 检查失败 / 2 前置缺席（未跑 ≠ 通过）。
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isMain } from '../lib/cli-entry.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const ARCHIVE_DIR = 'ai_dsh_deep_research'
export const ARCHIVE_PREFIX = `${ARCHIVE_DIR}/`
export const HANDOFF_FILENAME = 'HANDOFF.md'
export const SUBMODULE_PATH = 'vendor/dsh'

/** 移交包必须带上的当前合同件；D40 后不再有 workspace/seed.json。 */
export const REQUIRED_ENTRIES = [
  '.gitmodules',
  'AGENTS.md',
  'package.json',
  'pnpm-lock.yaml',
  HANDOFF_FILENAME,
  'packages/deep-research-pack/package.json',
  'packages/deep-research-pack/AGENTS.md',
  'packages/deep-research-pack/cordis.patch.yml',
  'packages/deep-research-pack/content/manual.md',
]

/** 产物边界：运行态、凭据、依赖、构建/导出物、.git 目录一律不进。 */
export const FORBIDDEN_ENTRY_PATTERNS = [
  /(?:^|\/)node_modules(?:\/|$)/,
  /(?:^|\/)\.credentials\.yaml$/,
  /(?:^|\/)\.git(?:\/|$)/,
  // 只禁归档根下的运行态；tests/fixtures 里同名的 workspace 样本与 runtime 的 tracked 骨架
  //（README/.gitkeep）是合法源，不是 handoff 的运行数据。
  new RegExp(`^${ARCHIVE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}runtime/.*(?:^|/)(?:sessions|drt_[^/]+)(?:/|$)`),
  new RegExp(`^${ARCHIVE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}research-workspace/.*(?:^|/)(?:sessions|drt_[^/]+)(?:/|$)`),
  /_dist\/.*\.tgz$/,
]

/**
 * 包内 HANDOFF 正文：两条接收路径都写出，接收方照抄即可。
 * @param {{ version: string, head: string, tarball: string, repoUrl: string, submoduleSha: string }} input
 * @returns {string}
 */
export function handoffInstructions({ version, head, tarball, repoUrl, submoduleSha }) {
  return `# 源码移交 — dsh-deep-research-pack ${version} @ ${head.slice(0, 7)}

本包 = HEAD 的 tracked 源（git archive），不含 .git、node_modules、运行态（runtime/ 的会话/run 产物）、
research-workspace/drt_*、凭据、_dist/*.tgz。
vendor/dsh 是 submodule，内容不在本包；无论走哪条路径，都需要网络取它。

## 路径 A（该 HEAD 已在 origin；有网络与 git）

\`\`\`bash
git clone --recurse-submodules ${repoUrl} ai_dsh_deep_research
cd ai_dsh_deep_research
git checkout ${head}
pnpm install --frozen-lockfile
bash dev/vendor-build.sh
source dev/env.sh
pnpm verify && pnpm test
\`\`\`

## 路径 B（只有本 tar；未 push 也成立）

\`\`\`bash
tar xzf ${tarball}
cd ai_dsh_deep_research
git init
git update-index --add --cacheinfo 160000,${submoduleSha},${SUBMODULE_PATH}
git submodule update --init --recursive
pnpm install --frozen-lockfile
bash dev/vendor-build.sh
source dev/env.sh
pnpm verify && pnpm test
\`\`\`

路径 B 不要求 origin 上有这个 HEAD：\`.gitmodules\` 已在 tar 内，gitlink 由上面那条 cacheinfo
直接写进索引，只从 \`.gitmodules\` 的 URL 取 vendor/dsh（需要网络）。路径 A 才要求该 commit 已 push。
`
}

/**
 * 生成源码移交包；返回 CLI 退出码（0 成功 / 1 边界红 / 2 前置缺席）。
 * @param {readonly string[]} [argv]
 * @returns {number}
 */
export function runExportHandoff(argv = process.argv.slice(2)) {
  const outIndex = argv.indexOf('--out')
  const outArg = outIndex === -1 ? null : argv[outIndex + 1]
  const outDir = outArg === null || outArg === undefined ? join(ROOT, '_dist') : resolve(outArg)

  const git = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: ROOT, encoding: 'utf8' })
  if (git.status !== 0 || resolve(git.stdout.trim()) !== ROOT) {
    console.error('export-handoff: 需要在本仓 git 工作树内运行（HEAD 是移交基线）')
    return 2
  }
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim()
  const submodule = spawnSync('git', ['rev-parse', `HEAD:${SUBMODULE_PATH}`], { cwd: ROOT, encoding: 'utf8' })
  const submoduleSha = submodule.stdout.trim()
  if (submodule.status !== 0 || submoduleSha === '') {
    console.error(`export-handoff: 读不到 submodule ${SUBMODULE_PATH} 的 gitlink（HEAD:${SUBMODULE_PATH}）`)
    return 2
  }
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
  const origin = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT, encoding: 'utf8' })
  const packageUrl = String(pkg.repository?.url ?? '').replace(/^git\+/, '')
  const repoUrl = packageUrl || (origin.status === 0 ? origin.stdout.trim() : '')
  if (repoUrl === '') {
    console.error('export-handoff: 找不到仓库 URL（git remote origin / package.json repository.url）')
    return 2
  }

  mkdirSync(outDir, { recursive: true })
  const name = `ai_dsh_deep_research-src-${pkg.version}-${head.slice(0, 7)}.tar.gz`
  const outPath = join(outDir, name)
  const staging = mkdtempSync(join(tmpdir(), 'export-handoff-'))
  try {
    const srcTar = join(staging, 'src.tar')
    const archive = spawnSync('git', ['archive', '--format=tar', `--prefix=${ARCHIVE_PREFIX}`, '-o', srcTar, 'HEAD'], { cwd: ROOT, encoding: 'utf8' })
    if (archive.status !== 0) {
      console.error(`export-handoff: git archive 失败：${(archive.stderr || archive.stdout || '').trim().slice(0, 400)}`)
      return 1
    }
    const extract = spawnSync('tar', ['-xf', srcTar, '-C', staging], { encoding: 'utf8' })
    if (extract.status !== 0) {
      console.error(`export-handoff: 解包失败：${(extract.stderr || extract.stdout || '').trim().slice(0, 400)}`)
      return 1
    }
    writeFileSync(
      join(staging, ARCHIVE_DIR, HANDOFF_FILENAME),
      handoffInstructions({ version: pkg.version, head, tarball: name, repoUrl, submoduleSha }),
    )
    const pack = spawnSync('tar', ['-czf', outPath, '-C', staging, ARCHIVE_DIR], { encoding: 'utf8' })
    if (pack.status !== 0) {
      console.error(`export-handoff: 打包失败：${(pack.stderr || pack.stdout || '').trim().slice(0, 400)}`)
      return 1
    }
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }

  // 产物本体重申边界：必备源在场，运行态/依赖/凭据/构建产物/导出物一律不在。
  const listed = spawnSync('tar', ['-tzf', outPath], { encoding: 'utf8' })
  const entries = (listed.stdout ?? '').split('\n').filter(Boolean)
  const missing = REQUIRED_ENTRIES.filter((rel) => !entries.includes(`${ARCHIVE_PREFIX}${rel}`))
  const forbidden = entries.filter((rel) => FORBIDDEN_ENTRY_PATTERNS.some((rx) => rx.test(rel)))
  if (listed.status !== 0 || missing.length > 0 || forbidden.length > 0) {
    rmSync(outPath, { force: true })
    console.error(`export-handoff: 产物边界红${missing.length ? `；缺 ${missing.join('、')}` : ''}${forbidden.length ? `；禁入 ${forbidden.slice(0, 5).join('、')}` : ''}`)
    return 1
  }

  const bytes = statSync(outPath).size
  const sha = createHash('sha256').update(readFileSync(outPath)).digest('hex')
  console.log(`export-handoff: ${outPath}`)
  console.log(`  ${entries.length} 条目，${(bytes / 1024).toFixed(1)} KiB，sha256 ${sha}`)
  console.log('  接收：包内 HANDOFF.md 给两条路径（git clone / 只有 tar 时 git init → fetch → reset → submodule update）。')
  console.log(`  边界：HEAD=${head}；不含运行态、research-workspace/drt_*、凭据、node_modules、_dist/*.tgz`)
  return 0
}

if (isMain(import.meta.url)) process.exit(runExportHandoff())
