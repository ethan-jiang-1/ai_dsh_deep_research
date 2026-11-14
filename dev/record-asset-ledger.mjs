// record-asset-ledger.mjs — 生成测试资产组合账（S3）。用法：
//   node dev/record-asset-ledger.mjs [--check]
// --check：重算并与 tests/fixtures/asset-ledger/ledger.json 比对；漂移 exit 1，不写盘。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ORACLE_TYPES, assetLedgerOf, listTestFiles } from '../scripts/lib/asset-ledger.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'tests/fixtures/asset-ledger/ledger.json')
const assets = assetLedgerOf(ROOT, listTestFiles(ROOT))
const counts = assets.reduce((acc, asset) => ((acc[asset.oracleType] = (acc[asset.oracleType] || 0) + 1), acc), {})
console.log(`asset-ledger: ${assets.length} assets`, JSON.stringify(counts))
const missingType = assets.filter((asset) => !ORACLE_TYPES.includes(asset.oracleType))
const missingClaim = assets.filter((asset) => asset.claim.trim() === '')
if (missingType.length > 0 || missingClaim.length > 0) {
  console.error('asset-ledger: 非法 oracleType/空 claim:', [...missingType, ...missingClaim].map((a) => a.path).slice(0, 5))
  process.exit(1)
}
const payload = {
  generatedBy: 'dev/record-asset-ledger.mjs',
  note: '组合账：domain/claim/oracleType/sunset；self-referential = 下一轮迁移面；覆盖由 tests/checks/asset-ledger.test 重算对账。',
  assets,
}

if (process.argv.includes('--check')) {
  const current = JSON.parse(readFileSync(OUT, 'utf8'))
  if (JSON.stringify(current.assets) !== JSON.stringify(assets)) {
    console.error('asset-ledger: 漂移——重跑 node dev/record-asset-ledger.mjs')
    process.exit(1)
  }
  console.log('asset-ledger: up to date')
} else {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`wrote ${OUT}`)
}
