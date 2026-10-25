#!/usr/bin/env node
// export-handoff.mjs — 干净源码移交：只打包 HEAD 的 tracked 源，绝不带运行态/凭据/run 数据。
//
// 为什么不是 `cp -r`：开发目录里同时住着 runtime/harness-home（凭据/会话）、
// research-workspace/drt_*（研究产物）、_dist/*.tgz 与 node_modules；gitignore 能挡 git，
// 挡不住目录复制。移交的单位是“源 + 说明”，不是某个人的工作树。
//
// 产物只含 tracked 文件（含 .gitmodules；vendor/dsh 是 submodule，gitlink 本身不会把
// vendor 内容装进 tar）——对方按包内 HANDOFF 提示先 `git submodule update --init`。
// 用法：node scripts/dist/export-handoff.mjs [--out <dir>]
// 退出码：0 产物可用 / 1 检查失败 / 2 前置缺席（未跑 ≠ 通过）。
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const argv = process.argv.slice(2)
const argOf = (name) => { const i = argv.indexOf(`--${name}`); return i === -1 ? null : argv[i + 1] }
const OUT = argOf('out') === null ? join(ROOT, '_dist') : resolve(argOf('out'))

const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const git = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: ROOT, encoding: 'utf8' })
if (git.status !== 0 || resolve(git.stdout.trim()) !== ROOT) {
  console.error('export-handoff: 需要在本仓 git 工作树内运行（HEAD 是移交基线）')
  process.exit(2)
}
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim()
mkdirSync(OUT, { recursive: true })
const name = `ai_dsh_deep_research-src-${pkg.version}-${head}.tar.gz`
const outPath = join(OUT, name)
const archive = spawnSync('git', ['archive', '--format=tar.gz', `--prefix=ai_dsh_deep_research/`, '-o', outPath, 'HEAD'], { cwd: ROOT, encoding: 'utf8' })
if (archive.status !== 0) {
  console.error(`export-handoff: git archive 失败：${(archive.stderr || archive.stdout || '').trim().slice(0, 400)}`)
  process.exit(1)
}

// 产物本体重申边界：必备源在场，运行态/依赖/凭据/构建产物/导出物一律不在。
const listed = spawnSync('tar', ['-tzf', outPath], { encoding: 'utf8' })
const entries = (listed.stdout ?? '').split('\n').filter(Boolean)
const must = ['.gitmodules', 'AGENTS.md', 'package.json', 'packages/deep-research-pack/package.json', 'packages/deep-research-pack/workspace/seed.json']
const missing = must.filter((rel) => !entries.includes(`ai_dsh_deep_research/${rel}`))
const forbidden = entries.filter((rel) => (
  /(?:^|\/)node_modules(?:\/|$)/.test(rel)
  || /(?:^|\/)\.credentials\.yaml$/.test(rel)
  || /(?:^|\/)(?:runtime|research-workspace)\/.*(?:^|\/)(?:sessions|drt_[^/]+)(?:\/|$)/.test(rel)
  || /_dist\/.*\.tgz$/.test(rel)
))
if (listed.status !== 0 || missing.length > 0 || forbidden.length > 0) {
  console.error(`export-handoff: 产物边界红${missing.length ? `；缺 ${missing.join('、')}` : ''}${forbidden.length ? `；禁入 ${forbidden.slice(0, 5).join('、')}` : ''}`)
  process.exit(1)
}

const bytes = statSync(outPath).size
const sha = createHash('sha256').update(readFileSync(outPath)).digest('hex')
console.log(`export-handoff: ${outPath}`)
console.log(`  ${entries.length} 条目，${(bytes / 1024).toFixed(1)} KiB，sha256 ${sha}`)
console.log('  对方：tar xzf → git submodule update --init → pnpm install → source dev/env.sh → pnpm verify')
console.log(`  边界：HEAD=${head}；不含 runtime/、research-workspace/drt_*、凭据、node_modules、_dist/`)
