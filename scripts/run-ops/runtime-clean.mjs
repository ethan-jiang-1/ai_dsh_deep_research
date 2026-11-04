#!/usr/bin/env node
// runtime-clean.mjs — 运行区清理 CLI：默认 dry-run，只有显式 --yes 才删除。
//
// 为什么有它：runtime/ 是 gitignored 运行态，smoke/probe 产物长期累积（2026-11-04 盘点 697M）。
// 清理判据是纯函数（lib/runtime-clean-core.mjs）；本壳只做两件事：
//   ① 白名单范围内递归收集子树最新 mtime / 大小（不跟随 symlink；遇到 symlink 整项保留）；
//   ② 打印计划；--yes 时逐条复核路径仍在 runtime 内再删。
//
// 永不候选：harness-home（活跃 dev home/凭据）、research-workspace（run bundle）、_dist、vendor、
// packages/*/lib、runtime 根散件、未知名、scenes（场景包是运行证据，人工处理）。
//
// 用法：node scripts/run-ops/runtime-clean.mjs [--older-than <days>] [--yes]
// 退出码：0 = 成功（含无事可做 / dry-run）；1 = 删除失败；2 = 用法/前置错。
import { existsSync, lstatSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyRuntimePath, planRuntimeCleanup } from '../lib/runtime-clean-core.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const RUNTIME = join(ROOT, 'runtime')

function usage() {
  console.log(`用法：node scripts/run-ops/runtime-clean.mjs [--older-than <days>] [--yes]

默认 dry-run，只列运行区白名单内、整棵子树都早于保留期的条目。
  --older-than <days>   保留期，缺省 14 天
  --yes                 真正删除；没有它只打印计划
  --help                本说明

永不触碰：runtime/harness-home（会话/凭据）、research-workspace/drt_*、_dist、vendor、
packages/*/lib、runtime 根散件、未知顶层名、symlink、scenes（证据，人工处理）。`)
}

function fail(message) {
  console.error(`runtime-clean: ${message}`)
  process.exit(2)
}

function parseArgs(argv) {
  const options = { yes: false, olderThanDays: 14 }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help') { usage(); process.exit(0) }
    else if (arg === '--yes') options.yes = true
    else if (arg === '--older-than') {
      const raw = argv[++i]
      const days = Number(raw)
      if (raw === undefined || !Number.isFinite(days) || days < 0) fail(`--older-than 需要非负天数，收到 ${raw ?? '<缺失>'}`)
      options.olderThanDays = days
    } else if (arg.startsWith('--older-than=')) {
      const days = Number(arg.slice('--older-than='.length))
      if (!Number.isFinite(days) || days < 0) fail(`--older-than 需要非负天数，收到 ${arg}`)
      options.olderThanDays = days
    } else fail(`未知参数 ${arg}（--help 看用法）`)
  }
  return options
}

/** 递归求子树最新 mtime + 大小；任何 symlink 都让整项保留（不跟随、不删链接指向）。 */
function scanTree(path) {
  let stat
  try { stat = lstatSync(path) } catch { return { newestMtimeMs: Number.NaN, sizeBytes: 0, symlink: false } }
  if (stat.isSymbolicLink()) return { newestMtimeMs: stat.mtimeMs, sizeBytes: 0, symlink: true }
  const out = { newestMtimeMs: stat.mtimeMs, sizeBytes: stat.isFile() ? stat.size : 0, symlink: false }
  if (stat.isDirectory()) {
    let children
    try { children = readdirSync(path) } catch { out.newestMtimeMs = Number.NaN; return out }
    for (const name of children) {
      const child = scanTree(join(path, name))
      if (child.symlink) out.symlink = true
      if (Number.isFinite(child.newestMtimeMs)) out.newestMtimeMs = Math.max(out.newestMtimeMs, child.newestMtimeMs)
      out.sizeBytes += child.sizeBytes
    }
  }
  return out
}

/** 只枚举白名单根；不遍历未知目录，避免把活跃数据卷进扫描。 */
function collectEntries() {
  if (!existsSync(RUNTIME)) return []
  const entries = []
  for (const top of readdirSync(RUNTIME, { withFileTypes: true })) {
    const kind = classifyRuntimePath(top.name)
    if (kind === 'standalone') {
      entries.push({ relPath: top.name, ...scanTree(join(RUNTIME, top.name)) })
      continue
    }
    if (top.name === 'smoke-workspace' && top.isDirectory()) {
      let children
      try { children = readdirSync(join(RUNTIME, top.name)) } catch { continue }
      for (const child of children) {
        const relPath = `${top.name}/${child}`
        if (classifyRuntimePath(relPath) !== 'container-child') continue
        entries.push({ relPath, ...scanTree(join(RUNTIME, top.name, child)) })
      }
    }
  }
  return entries
}

function mb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function localDate(ms) {
  if (!Number.isFinite(ms)) return 'unknown   '
  return new Date(ms).toISOString().slice(0, 10)
}

function insideRuntime(path) {
  const rel = relative(RUNTIME, path)
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith('/')
}

const options = parseArgs(process.argv.slice(2))
const entries = collectEntries()
const plan = planRuntimeCleanup(entries, { olderThanDays: options.olderThanDays })
const cutoff = new Date(plan.cutoff).toISOString()

function printPlan() {
  console.log(`runtime-clean: ${options.yes ? '执行' : 'dry-run'}（保留期 ${options.olderThanDays} 天；cutoff ${cutoff}）`)
  for (const entry of plan.remove) {
    console.log(`REMOVE  ${mb(entry.sizeBytes).padStart(9)}  ${localDate(entry.newestMtimeMs)}  ${entry.relPath}`)
  }
  for (const entry of plan.keep) {
    console.log(`KEEP    ${mb(entry.sizeBytes).padStart(9)}  ${localDate(entry.newestMtimeMs)}  ${entry.relPath}  (${entry.reason})`)
  }
  console.log(`合计：remove ${plan.remove.length} 项 / ${mb(plan.removeBytes)}；keep ${plan.keep.length} 项`)
  if (!options.yes) console.log('dry-run：没有删除任何文件。确认后加 --yes 执行（仍只限上方 REMOVE 清单）。')
}

printPlan()
if (!options.yes) process.exit(0)

let failed = 0
let removed = 0
for (const entry of plan.remove) {
  const path = join(RUNTIME, ...entry.relPath.split('/'))
  if (!insideRuntime(path)) {
    console.error(`runtime-clean: 拒绝越界路径 ${entry.relPath}`)
    failed++
    continue
  }
  try {
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) {
      console.error(`runtime-clean: 拒绝删除 symlink ${entry.relPath}`)
      failed++
      continue
    }
    rmSync(path, { recursive: true, force: true })
    removed++
    console.log(`DELETED ${entry.relPath}`)
  } catch (error) {
    console.error(`runtime-clean: 删除失败 ${entry.relPath}：${error.message}`)
    failed++
  }
}
console.log(`完成：删除 ${removed} 项；失败 ${failed} 项。`)
process.exit(failed === 0 ? 0 : 1)
