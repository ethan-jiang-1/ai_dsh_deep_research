#!/usr/bin/env node
// scripts/test/run-lane.mjs — `pnpm test:e2e` / `pnpm test:entry` 的车道 runner。
//
// 读 `scripts/smoke/registry.json` 的 `lane`/`tier`，按文件名排序逐个跑：
//   0 = PASS；1 = FAIL；2 = SKIP（前置缺席/未 source，未跑 ≠ 通过）。
// 默认只跑 `tier: ci`；`--all` 带 dev-only；`--list` 只列不跑。
// 无匹配 = exit 2（未跑）。前置（`source dev/env.sh`、tarball、浏览器）由各脚本自检。
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { selectSmokeLane } from '../lib/smoke-lane.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const lane = process.argv[2]
const includeDevOnly = process.argv.includes('--all')
const listOnly = process.argv.includes('--list')
let entries
try { entries = selectSmokeLane(JSON.parse(readFileSync(join(ROOT, 'scripts', 'smoke', 'registry.json'), 'utf8')), { lane, includeDevOnly }) }
catch (error) { console.error(`run-lane: ${error.message}`); process.exit(2) }
if (entries.length === 0) { console.error(`run-lane: ${lane} 车道无匹配条目（tier: ci）`); process.exit(2) }
if (listOnly) { for (const entry of entries) console.log(entry.file); process.exit(0) }

let pass = 0; let fail = 0; let skip = 0
for (const entry of entries) {
  console.log(`\n── ${entry.file}（${entry.tier}）`)
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', entry.file], { cwd: ROOT, stdio: 'inherit', env: process.env })
  if (result.status === 0) pass += 1
  else if (result.status === 2) { skip += 1; console.log(`SKIP  ${entry.file}（exit 2：前置缺席/未跑）`) }
  else { fail += 1; console.log(`FAIL  ${entry.file}（exit ${String(result.status)}）`) }
}
console.log(`\nrun-lane ${lane}: PASS ${pass} / FAIL ${fail} / SKIP ${skip}`)
process.exit(fail > 0 ? 1 : 0)
