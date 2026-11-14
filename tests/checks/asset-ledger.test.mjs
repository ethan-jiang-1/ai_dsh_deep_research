// 负例留证 2026-11-14：S3 资产组合账——手写账会腐烂，故由生成器写、测试重算对账。
// 红配方：新增/删除任一 spec/check 不重跑生成器 → 本例红；把头注 claim 改空 → 生成器红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ORACLE_TYPES, OVERRIDES, assetLedgerOf, listTestFiles } from '../../scripts/lib/asset-ledger.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LEDGER = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/asset-ledger/ledger.json'), 'utf8'))

test('资产账与盘上测试逐一对应（生成物漂移 = 红）', () => {
  const computed = assetLedgerOf(ROOT, listTestFiles(ROOT))
  assert.deepEqual(LEDGER.assets, computed)
  const paths = LEDGER.assets.map((asset) => asset.path)
  assert.equal(new Set(paths).size, paths.length, '路径唯一')
  assert.ok(paths.length >= 150, `防空语料：资产过少（${paths.length}）`)
})

test('每项有 domain/claim/oracleType/sunset；验证层覆盖不为 self-referential', () => {
  for (const asset of LEDGER.assets) {
    assert.ok(asset.domain !== '', `${asset.path}: domain 空`)
    assert.ok(asset.claim.trim() !== '', `${asset.path}: claim 空`)
    assert.ok(ORACLE_TYPES.includes(asset.oracleType), `${asset.path}: oracleType 非法`)
    assert.ok(typeof asset.sunset === 'string' && asset.sunset !== '', `${asset.path}: sunset 空`)
  }
  for (const [path, type] of Object.entries(OVERRIDES)) {
    const asset = LEDGER.assets.find((entry) => entry.path === path)
    assert.ok(asset !== undefined, `显式 oracle 资产缺席：${path}`)
    assert.equal(asset.oracleType, type, `${path}: oracleType 应为 ${type}`)
    assert.notEqual(asset.oracleType, 'self-referential', `${path}: 验证层资产不得默认自指`)
  }
})

test('自指资产数显式可见（组合账的迁移面，不是隐藏项）', () => {
  const selfReferential = LEDGER.assets.filter((asset) => asset.oracleType === 'self-referential')
  const explicit = LEDGER.assets.filter((asset) => asset.oracleType !== 'self-referential')
  console.log('asset-ledger:', JSON.stringify({ total: LEDGER.assets.length, explicit: explicit.length, selfReferential: selfReferential.length }))
  assert.ok(selfReferential.length > 0, '若已清零，删掉本断言并在 Note 记录')
  assert.ok(explicit.length >= 10, '显式 oracle 资产过少——验证层覆盖退化了')
})
