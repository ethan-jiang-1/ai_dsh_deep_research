// record-asset-ledger.mjs — 生成测试资产组合账（D55）。用法：
//   node dev/record-asset-ledger.mjs [--check]
// --check：重算并与 tests/fixtures/asset-ledger/ledger.json 比对；漂移 exit 1，不写盘。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSET_CLASSES, ASSET_COSTS, ORACLE_TYPES, assetLedgerOf, listTestFiles } from '../scripts/lib/tools/asset-ledger.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'tests/fixtures/asset-ledger/ledger.json')
const assets = assetLedgerOf(ROOT, listTestFiles(ROOT))
const counts = assets.reduce((acc, asset) => ((acc[asset.oracleType] = (acc[asset.oracleType] || 0) + 1), acc), {})
console.log(`asset-ledger: ${assets.length} assets`, JSON.stringify(counts))
const invalid = assets.filter((asset) =>
  !ORACLE_TYPES.includes(asset.oracleType)
  || !ASSET_CLASSES.includes(asset.class)
  || !ASSET_COSTS.includes(asset.cost)
  || asset.uniqueClaim.trim() === ''
  || asset.sunset.trim() === '')
if (invalid.length > 0) {
  console.error('asset-ledger: 非法字段或空 uniqueClaim:', invalid.map((a) => a.path).slice(0, 5))
  process.exit(1)
}
const payload = {
  generatedBy: 'dev/record-asset-ledger.mjs',
  note: '组合账：lane/class/cost/uniqueClaim/oracleType/sunset；oracleType 由 AST 推导（禁手写 OVERRIDES）；self-referential = 下一轮迁移面；覆盖由 tests/checks/asset-ledger.test 重算对账。',
  assets,
}

if (process.argv.includes('--check')) {
  const current = JSON.parse(readFileSync(OUT, 'utf8'))
  if (JSON.stringify(current.assets) !== JSON.stringify(assets) || current.note !== payload.note) {
    console.error('asset-ledger: 漂移——重跑 node dev/record-asset-ledger.mjs')
    process.exit(1)
  }
  console.log('asset-ledger: up to date')
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`wrote ${OUT}`)
}
