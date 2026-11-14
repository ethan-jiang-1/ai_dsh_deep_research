// 负例留证 2026-11-14：测试资产组合账——禁止手写账与硬编码 OVERRIDES，由 AST 自动推导 oracleType。
// 红配方：新增/删除任一 spec/check 不重跑生成器 → 重算对账红；无外部语法解析 import 的测试被伪标为 external → AST 负例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as assetLedgerMod from '../../scripts/lib/asset-ledger.mjs'
import { ASSET_CLASSES, ASSET_COSTS, ORACLE_TYPES, assetLedgerOf, listTestFiles, oracleTypeOf } from '../../scripts/lib/asset-ledger.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LEDGER = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/asset-ledger/ledger.json'), 'utf8'))

test('资产账与盘上测试逐一对应且禁止手写 OVERRIDES（生成物漂移 = 红）', () => {
  assert.equal('OVERRIDES' in assetLedgerMod, false, '禁止硬编码 OVERRIDES 覆盖字典')
  const computed = assetLedgerOf(ROOT, listTestFiles(ROOT))
  assert.deepEqual(LEDGER.assets, computed)
  const paths = LEDGER.assets.map((asset) => asset.path)
  assert.equal(new Set(paths).size, paths.length, '路径唯一')
  assert.ok(paths.length >= 150, `防空语料：资产过少（${paths.length}）`)
})

test('每项具备完整六属性（lane/class/cost/uniqueClaim/oracleType/sunset）', () => {
  for (const asset of LEDGER.assets) {
    assert.ok(asset.domain !== '', `${asset.path}: domain 空`)
    assert.ok(['checks', 'vendor', 'spec'].includes(asset.lane), `${asset.path}: lane 非法`)
    assert.ok(ASSET_CLASSES.includes(asset.class), `${asset.path}: class 非法`)
    assert.ok(ASSET_COSTS.includes(asset.cost), `${asset.path}: cost 非法`)
    assert.ok(typeof asset.uniqueClaim === 'string' && asset.uniqueClaim.trim() !== '', `${asset.path}: uniqueClaim 空`)
    assert.ok(ORACLE_TYPES.includes(asset.oracleType), `${asset.path}: oracleType 非法`)
    assert.ok(typeof asset.sunset === 'string' && asset.sunset.trim() !== '', `${asset.path}: sunset 空`)
  }
})

test('AST 推导负控：无外部解析器 import 不得归为 external；单模块内联样例归为 self-referential', () => {
  const inlineOnly = [
    "import { test } from 'node:test'",
    "import assert from 'node:assert/strict'",
    "import { trimLabel } from '../../packages/deep-research-pack/src/lib/x.ts'",
    "test('example only', () => { assert.equal(trimLabel(' a '), 'a') })",
  ].join('\n')
  assert.equal(oracleTypeOf(inlineOnly, { relPath: 'tests/pack/fake.spec.mjs', root: ROOT }), 'self-referential')

  const fakeStringCommentExternal = [
    "// typescript mdast-util-from-markdown yaml",
    "import { test } from 'node:test'",
    "import assert from 'node:assert/strict'",
    "const s = 'mdast-util-from-markdown'",
    "test('string mention is not import', () => { assert.ok(s.length > 0) })",
  ].join('\n')
  assert.notEqual(oracleTypeOf(fakeStringCommentExternal, { relPath: 'tests/checks/fake.test.mjs', root: ROOT }), 'external')

  const realExternal = [
    "import { test } from 'node:test'",
    "import { fromMarkdown } from 'mdast-util-from-markdown'",
    "test('real ast', () => { fromMarkdown('# h') })",
  ].join('\n')
  assert.equal(oracleTypeOf(realExternal, { relPath: 'tests/checks/fake.test.mjs', root: ROOT }), 'external')
})

test('自指资产与显式 oracle 资产双侧可见（迁移面不隐藏）', () => {
  const selfReferential = LEDGER.assets.filter((asset) => asset.oracleType === 'self-referential')
  const external = LEDGER.assets.filter((asset) => asset.oracleType === 'external')
  assert.ok(selfReferential.length > 0, '若已清零，删掉本断言并在 Note 记录')
  assert.ok(external.length >= 15, `外部 AST/规范解析资产过少（${external.length}）——验证层覆盖退化`)
})
