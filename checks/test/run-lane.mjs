#!/usr/bin/env node
// checks/test/run-lane.mjs — `pnpm test:e2e` / `pnpm test:entry` 的车道 runner。
//
// 读 `checks/smoke/registry.json` 的 `lane`/`tier`，按文件名排序逐个跑：
//   0 = PASS；1 = FAIL；2 = SKIP（前置缺席/未 source，未跑 ≠ 通过）。
// 汇总退出码（契约 = checks/lib/shared/cli-exit.mjs）：有 FAIL = 1；一条都没跑（PASS 0 / SKIP>0）= 2；
// 混合 PASS+SKIP = 0（有证据）。默认跑自动挂载面（`tier: ci` ∪ `nightly`）；`--all` 带 dev-only；`--only <substr>` 定向子集；
// `--list` 只列不跑（带 tier/cost）。无匹配 = exit 2（未跑）。前置（`source tools/env.sh`、tarball、浏览器）由各脚本自检。
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { noMatchMessage, selectSmokeLane } from '../lib/repo/smoke-lane.mjs'
import { EXIT, verdictOf } from '../lib/shared/cli-exit.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const lane = process.argv[2]
const includeDevOnly = process.argv.includes('--all')
const listOnly = process.argv.includes('--list')
const onlyIndex = process.argv.indexOf('--only')
const only = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1]
if (onlyIndex !== -1 && (only === undefined || only.startsWith('--'))) { console.error('run-lane: --only 需要 <substr>'); process.exit(EXIT.NOT_RUN) }
let entries
try { entries = selectSmokeLane(JSON.parse(readFileSync(join(ROOT, 'checks', 'smoke', 'registry.json'), 'utf8')), { lane, includeDevOnly, only }) }
catch (error) { console.error(`run-lane: ${error.message}`); process.exit(EXIT.NOT_RUN) }
if (entries.length === 0) { console.error(noMatchMessage({ lane, only })); process.exit(EXIT.NOT_RUN) }
if (listOnly) { for (const entry of entries) console.log(`${entry.file}\t${entry.tier}\t${entry.cost}`); process.exit(EXIT.PASS) }

let pass = 0; let fail = 0; let skip = 0; const laneStart = Date.now()
for (const entry of entries) {
  console.log(`\n── ${entry.file}（${entry.tier}/${entry.cost}）`)
  const started = Date.now()
  const args = Array.isArray(entry.args) ? entry.args : []
  const result = spawnSync(process.execPath, ['--import', 'tsx/esm', entry.file, ...args], { cwd: ROOT, stdio: 'inherit', env: process.env })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  if (result.status === 0) { pass += 1; console.log(`PASS  ${entry.file}（${seconds}s）`) }
  else if (result.status === 2) { skip += 1; console.log(`SKIP  ${entry.file}（exit 2：前置缺席/未跑；${seconds}s）`) }
  else { fail += 1; console.log(`FAIL  ${entry.file}（exit ${String(result.status)}；${seconds}s）`) }
}
console.log(`\nrun-lane ${lane}: PASS ${pass} / FAIL ${fail} / SKIP ${skip}（${((Date.now() - laneStart) / 1000).toFixed(1)}s）`)
process.exit(verdictOf({ pass, fail, skip }))
