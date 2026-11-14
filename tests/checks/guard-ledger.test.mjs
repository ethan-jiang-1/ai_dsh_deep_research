// 负例留证 2026-11-14：D55 守卫台账全量收口——覆盖 D-1（24）+ D-2（17）+ 批 A–D（31）共 72 张卡，
// 并与 asset-ledger 的 AST 推导 oracleType 及守卫文件内的 test('...BUG-nnn...') 标题做双向对账。
// 红配方：删任一条入账卡、篡改 oracleType 使其偏离 asset-ledger、或删守卫测试标题中的 BUG-nnn → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assetLedgerOf, listTestFiles } from '../../scripts/lib/asset-ledger.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LEDGER = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/guard-ledger/ledger.json'), 'utf8'))
const ASSET_BY_PATH = new Map(assetLedgerOf(ROOT, listTestFiles(ROOT)).map((a) => [a.path, a]))
const ORACLE_TYPES = new Set(['structured', 'external', 'canonical', 'self-referential', 'smoke-only', 'none'])
const STATUSES = new Set(['closed', 'partial', 'provisional', 'deferred'])

const D1 = ['003', '009', '010', '012', '013', '018', '022', '024', '026', '027', '028', '030', '033', '034', '036', '045', '051', '059', '061', '063', '079', '080', '095', '136']
const D2 = ['001', '011', '016', '023', '025', '031', '032', '037', '042', '047', '055', '072', '106', '108', '112', '113', '152']
const BATCH_AC = Array.from({ length: 24 }, (_, idx) => String(160 + idx))
const BATCH_D = Array.from({ length: 7 }, (_, idx) => String(184 + idx))
const SCOPED_IDS = [...D1, ...D2, ...BATCH_AC, ...BATCH_D].map((n) => `BUG-${n}`)

function claimedBugIdsInTestSource(text) {
  const claimed = new Set()
  for (const m of text.matchAll(/^\s*(?:await\s+)?(?:t\.)?(?:test|it)\(\s*(['"`])((?:\\.|(?!\1)[^\n])*)\1/gm)) {
    for (const idMatch of m[2].matchAll(/BUG-\d{3}/g)) claimed.add(idMatch[0])
  }
  return claimed
}

function validateGuardLedger(ledger, { assetByPath, readText, fileExists, requiredIds }) {
  const problems = []
  const bugs = Array.isArray(ledger?.bugs) ? ledger.bugs : []
  const byId = new Map()
  for (const bug of bugs) {
    if (byId.has(bug.id)) problems.push(`${bug.id}: 重复条目`)
    byId.set(bug.id, bug)
    if (!/^BUG-\d{3}$/.test(String(bug.id))) problems.push(`${bug.id}: id 形状非法`)
    if (typeof bug.mechanism !== 'string' || bug.mechanism.trim() === '') problems.push(`${bug.id}: mechanism 为空`)
    if (!ORACLE_TYPES.has(bug.oracleType)) problems.push(`${bug.id}: oracleType 非法 (${bug.oracleType})`)
    if (!STATUSES.has(bug.status)) problems.push(`${bug.id}: status 非法 (${bug.status})`)
    if (bug.status === 'deferred') {
      if (bug.guard !== null) problems.push(`${bug.id}: deferred 不得声明 guard`)
      if (!bug.reason || !bug.trigger) problems.push(`${bug.id}: deferred 缺 reason/trigger`)
      continue
    }
    if (typeof bug.guard !== 'string' || bug.guard === '') {
      problems.push(`${bug.id}: 非 deferred 缺 guard`)
      continue
    }
    if (!fileExists(bug.guard)) {
      problems.push(`${bug.id}: guard 路径不存在 (${bug.guard})`)
      continue
    }
    if (typeof bug.redRecipe !== 'string' || bug.redRecipe.trim() === '') {
      problems.push(`${bug.id}: 缺 redRecipe`)
    }
    if (bug.status === 'partial' && (!bug.reason || !bug.trigger)) {
      problems.push(`${bug.id}: partial 缺 reason/trigger`)
    }
    if (bug.oracleType === 'self-referential') {
      if (bug.status !== 'provisional') problems.push(`${bug.id}: self-referential 守卫只能标 provisional`)
      if (!bug.trigger) problems.push(`${bug.id}: self-referential 守卫缺 trigger`)
    }
    if (bug.guard.startsWith('tests/')) {
      const asset = assetByPath.get(bug.guard)
      if (!asset) {
        problems.push(`${bug.id}: guard 未登记在 asset-ledger (${bug.guard})`)
      } else if (bug.oracleType !== asset.oracleType) {
        problems.push(`${bug.id}: oracleType 失配——guard-ledger=${bug.oracleType} vs asset-ledger=${asset.oracleType} (${bug.guard})`)
      }
      const claimed = claimedBugIdsInTestSource(readText(bug.guard))
      if (!claimed.has(bug.id)) {
        problems.push(`${bug.id}: 守卫文件 ${bug.guard} 的 test() 标题未声称 ${bug.id}`)
      }
    }
  }
  for (const id of requiredIds) {
    if (!byId.has(id)) problems.push(`缺账：${id}`)
  }
  return problems
}

test('guard ledger 全量对账：72 张卡齐全、与 asset-ledger 零 oracleType 冲突、测试标题逐卡绑定', () => {
  assert.equal(LEDGER.version, 1, 'ledger version 必须是 1')
  assert.ok(typeof LEDGER.scope === 'string' && LEDGER.scope !== '', 'scope 必须写清覆盖范围')
  assert.equal(SCOPED_IDS.length, 72, '目标闭集应为 72 张卡')
  const sourceCache = new Map()
  const readText = (rel) => {
    if (!sourceCache.has(rel)) sourceCache.set(rel, readFileSync(join(ROOT, rel), 'utf8'))
    return sourceCache.get(rel)
  }
  const problems = validateGuardLedger(LEDGER, {
    assetByPath: ASSET_BY_PATH,
    readText,
    fileExists: (rel) => existsSync(join(ROOT, rel)),
    requiredIds: SCOPED_IDS,
  })
  assert.deepEqual(problems, [], `guard-ledger 对账失败：\n${problems.join('\n')}`)
})

test('负控：漏卡、与 asset-ledger 的 oracleType 矛盾、守卫标题未声明 BUG-nnn 均必红', () => {
  const sampleGuard = 'tests/checks/fake.test.mjs'
  const assetByPath = new Map([[sampleGuard, { path: sampleGuard, oracleType: 'canonical' }]])
  const baseBug = {
    id: 'BUG-001',
    mechanism: 'probe',
    guard: sampleGuard,
    oracleType: 'canonical',
    status: 'closed',
    redRecipe: 'mutate',
  }

  const missingCard = validateGuardLedger({ bugs: [baseBug] }, {
    assetByPath,
    readText: () => "test('probe（BUG-001）', () => {})\n",
    fileExists: () => true,
    requiredIds: ['BUG-001', 'BUG-002'],
  })
  assert.ok(missingCard.some((p) => p.includes('缺账：BUG-002')))

  const mismatchedOracle = validateGuardLedger({ bugs: [{ ...baseBug, oracleType: 'external' }] }, {
    assetByPath,
    readText: () => "test('probe（BUG-001）', () => {})\n",
    fileExists: () => true,
    requiredIds: ['BUG-001'],
  })
  assert.ok(mismatchedOracle.some((p) => p.includes('oracleType 失配')))

  const unboundTitle = validateGuardLedger({ bugs: [baseBug] }, {
    assetByPath,
    readText: () => "test('unrelated title without id', () => {})\n",
    fileExists: () => true,
    requiredIds: ['BUG-001'],
  })
  assert.ok(unboundTitle.some((p) => p.includes('test() 标题未声称 BUG-001')))
})

test('台账可度量：按 oracleType / status 汇总可见且外部与规范形守卫在位', () => {
  const bugs = LEDGER.bugs
  const count = (key) => bugs.reduce((acc, bug) => ((acc[bug[key]] = (acc[bug[key]] || 0) + 1), acc), {})
  const types = count('oracleType')
  const statuses = count('status')
  assert.equal(bugs.length, 72)
  assert.ok((types.external || 0) >= 20, `external 守卫过少：${JSON.stringify(types)}`)
  assert.ok((types.canonical || 0) >= 20, `canonical 守卫过少：${JSON.stringify(types)}`)
  assert.equal(statuses.closed, 72, `72 张范围内卡应全部闭环：${JSON.stringify(statuses)}`)
})
