#!/usr/bin/env node
// run-inventory.mjs — run bundle 的只读保留期视图（数量/大小/最老日期；不删任何东西）。
//
// 为什么存在：run bundle/归档是用户数据，没有自动 GC。删除必须由用户显式决定，前提是
// 能看见「有几场、多大、最老多久」。本工具只读；`--json` 给脚本消费。
//
// 用法：node scripts/run-ops/run-inventory.mjs --workspace <研究工作区> [--json]
// 退出码：0 成功（含空工作区）；2 用法/前置缺失。
import { existsSync, lstatSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { formatAge, formatBytes, summarizeRuns } from '../lib/run-inventory-core.mjs'

const argv = process.argv.slice(2)
const value = (name, fallback = null) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const workspace = value('--workspace')
const asJson = argv.includes('--json')
if (workspace === null) {
  console.error('run-inventory: 用法 node scripts/run-ops/run-inventory.mjs --workspace <研究工作区> [--json]')
  process.exit(2)
}
const root = resolve(workspace)
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`run-inventory: 工作区不存在或不是目录：${root}`)
  process.exit(2)
}

/** 递归收集普通文件的 size/mtime；symlink 不跟随（避免把工作区外的大小算进来）。 */
function filesOf(dir) {
  const out = []
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (!entry.isFile()) continue
      try {
        const st = lstatSync(full)
        out.push({ size: st.size, mtimeMs: st.mtimeMs })
      } catch { /* 竞态删除：跳过，不猜大小 */ }
    }
  }
  walk(dir)
  return out
}

const buckets = [
  { prefix: '', name: 'root' },
  { prefix: 'archive', name: 'archive' },
  { prefix: '_abandoned', name: 'abandoned' },
]
const runs = []
for (const bucket of buckets) {
  const dir = join(root, bucket.prefix)
  if (!existsSync(dir) || !statSync(dir).isDirectory()) continue
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('drt_')) continue
    runs.push({ slug: entry.name, bucket: bucket.name, files: filesOf(join(dir, entry.name)) })
  }
}
const summary = summarizeRuns({ runs })
if (asJson) {
  console.log(JSON.stringify({ workspace: root, ...summary }, null, 2))
  process.exit(0)
}

console.log(`run-inventory: ${root}`)
console.log('')
console.log('  桶         run bundle                         文件     大小       最老')
for (const run of summary.runs) {
  console.log(`  ${run.bucket.padEnd(10)} ${run.slug.padEnd(34)} ${String(run.files).padStart(4)}  ${formatBytes(run.bytes).padStart(9)}  ${formatAge(run.ageDays).padStart(6)}`)
}
console.log('')
console.log(`  合计：${String(summary.totals.runs)} 场 / ${String(summary.totals.files)} 文件 / ${formatBytes(summary.totals.bytes)}${summary.oldestMtimeMs === null ? '' : `；最老 ${formatAge(Math.floor((Date.now() - summary.oldestMtimeMs) / 86_400_000))}`}`)
console.log('  只读：本工具不删除任何文件；删/归档由用户显式动作（archive/ 是操作桶，不是保留策略）。')
process.exit(0)
