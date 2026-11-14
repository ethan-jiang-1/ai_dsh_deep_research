// 负例留证 2026-11-14：S1/S3 的上升闸——守卫不再只问「有没有测试」，而是问「它的 oracle 是
// 外部/结构化/规范形，还是自指」。红配方：删 ledger 任一条 → 覆盖红；把某条 closed 的 guard
// 改成不存在路径 → 路径红；把 self-referential 的 trigger 删掉 → 红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LEDGER = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/guard-ledger/ledger.json'), 'utf8'))
const ORACLE_TYPES = new Set(['structured', 'external', 'canonical', 'self-referential', 'smoke-only', 'none'])
const STATUSES = new Set(['closed', 'partial', 'provisional', 'deferred'])
// v1 覆盖范围：普查 D-1 的 24 张 + 批次 D（184–190）。
const D1 = ['003', '009', '010', '012', '013', '018', '022', '024', '026', '027', '028', '030', '033', '034', '036', '045', '051', '059', '061', '063', '079', '080', '095', '136']
const BATCH_D = ['184', '185', '186', '187', '188', '189', '190']

const bugs = Array.isArray(LEDGER.bugs) ? LEDGER.bugs : []
const byId = new Map(bugs.map((bug) => [bug.id, bug]))

test('guard ledger 形状：id 唯一、枚举合法、字段齐全', () => {
  assert.equal(LEDGER.version, 1, 'ledger version 必须是 1')
  assert.ok(typeof LEDGER.scope === 'string' && LEDGER.scope !== '', 'scope 必须写清覆盖范围')
  assert.ok(bugs.length >= 30, '防空语料：ledger 条目过少')
  assert.equal(byId.size, bugs.length, 'BUG id 必须唯一')
  for (const bug of bugs) {
    assert.match(bug.id, /^BUG-\d{3}$/, `${bug.id}: id 形状`)
    assert.ok(typeof bug.mechanism === 'string' && bug.mechanism !== '', `${bug.id}: mechanism 必填`)
    assert.ok(ORACLE_TYPES.has(bug.oracleType), `${bug.id}: oracleType 非法（${bug.oracleType}）`)
    assert.ok(STATUSES.has(bug.status), `${bug.id}: status 非法（${bug.status}）`)
    if (bug.status === 'deferred') {
      assert.equal(bug.guard, null, `${bug.id}: deferred 不得声称有 guard`)
      assert.ok(bug.reason && bug.trigger, `${bug.id}: deferred 必须有 reason + trigger`)
    } else {
      assert.ok(typeof bug.guard === 'string' && bug.guard !== '', `${bug.id}: 非 deferred 必须有 guard`)
      assert.ok(existsSync(join(ROOT, bug.guard)), `${bug.id}: guard 路径不存在（${bug.guard}）`)
      assert.ok(bug.redRecipe && bug.redRecipe !== '', `${bug.id}: 非 deferred 必须有 redRecipe`)
    }
    if (bug.status === 'partial') assert.ok(bug.reason && bug.trigger, `${bug.id}: partial 必须有 reason + trigger`)
    if (bug.oracleType === 'self-referential') assert.ok(bug.trigger && bug.trigger !== '', `${bug.id}: 自指守卫必须带 trigger`)
  }
})

test('覆盖：D-1 二十四张 + 批次 D 七张，一条不缺', () => {
  for (const id of D1) assert.ok(byId.has(`BUG-${id}`), `D-1 缺账：BUG-${id}`)
  for (const id of BATCH_D) assert.ok(byId.has(`BUG-${id}`), `批次 D 缺账：BUG-${id}`)
})

test('自指守卫是显式的临时态，不是「已关闭」', () => {
  const selfReferential = bugs.filter((bug) => bug.oracleType === 'self-referential')
  assert.ok(selfReferential.length > 0, '当前 CI 判据仍是自指；若已换 external，删掉本断言并更新台账')
  for (const bug of selfReferential) assert.equal(bug.status, 'provisional', `${bug.id}: 自指守卫只能是 provisional`)
})

test('台账可度量：按 oracleType / status 计数（防空 + 可见）', () => {
  const count = (key) => bugs.reduce((acc, bug) => ((acc[bug[key]] = (acc[bug[key]] || 0) + 1), acc), {})
  const types = count('oracleType')
  const statuses = count('status')
  console.log('guard-ledger:', JSON.stringify({ total: bugs.length, types, statuses }))
  assert.ok((types.external || 0) >= 1, '至少一条外部 oracle（S2a Markdown）')
  assert.ok((types.structured || 0) >= 1, '至少一条结构化 oracle（S2c）')
  assert.ok((statuses.closed || 0) >= 10, 'closed 过少——台账退化成待办清单')
})
