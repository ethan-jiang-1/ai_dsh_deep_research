#!/usr/bin/env node
// scripts/test/run-lane.mjs — `pnpm test:e2e` / `pnpm test:entry` 的车道 runner。
//
// 读 `scripts/smoke/registry.json` 的 `lane`/`tier`，按文件名排序逐个跑：
//   0 = PASS；1 = FAIL；2 = SKIP（前置缺席/未 source，未跑 ≠ 通过）。
// 默认只跑 `tier: ci`；`--all` 带 dev-only；`--only <substr>` 定向子集；`--list` 只列不跑（带 tier/cost）。
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
const onlyIndex = process.argv.indexOf('--only')
const only = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1]
if (onlyIndex !== -1 && (only === undefined || only.startsWith('--'))) { console.error('run-lane: --only 需要 <substr>'); process.exit(2) }
let entries
try { entries = selectSmokeLane(JSON.parse(readFileSync(join(ROOT, 'scripts', 'smoke', 'registry.json'), 'utf8')), { lane, includeDevOnly, only }) }
catch (error) { console.error(`run-lane: ${error.message}`); process.exit(2) }
if (entries.length === 0) { console.error(`run-lane: ${lane} 车道无匹配条目（tier: ci${only === undefined ? '' : `; --only ${only}`}）`); process.exit(2) }
if (listOnly) { for (const entry of entries) console.log(`${entry.file}\t${entry.tier}\t${entry.cost}`); process.exit(0) }

let pass = 0; let fail = 0; let skip = 0; const laneStart = Date.now()
for (const entry of entries) {
  console.log(`\n── ${entry.file}（${entry.tier}/${entry.cost}）`)
  const started = Date.now()
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', entry.file], { cwd: ROOT, stdio: 'inherit', env: process.env })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  if (result.status === 0) { pass += 1; console.log(`PASS  ${entry.file}（${seconds}s）`) }
  else if (result.status === 2) { skip += 1; console.log(`SKIP  ${entry.file}（exit 2：前置缺席/未跑；${seconds}s）`) }
  else { fail += 1; console.log(`FAIL  ${entry.file}（exit ${String(result.status)}；${seconds}s）`) }
}
console.log(`\nrun-lane ${lane}: PASS ${pass} / FAIL ${fail} / SKIP ${skip}（${((Date.now() - laneStart) / 1000).toFixed(1)}s）`)
process.exit(fail > 0 ? 1 : 0)
