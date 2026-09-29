// schema-scan 断代逻辑反证（RFC 2026-09-29-quality-evidence-loop 验收②）。
// 纯 fs 直调（layering：无子进程）；夹具 mtime 随检出时间漂——断代用 dates 注入，不碰盘上时间。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanAll, journalFutureDate } from '../scripts/schema-scan.mjs'

const F = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'schema-scan')
const DATES = {
  'drt-clean-post': '2026-09-29',
  'drt-violating-pre': '2026-09-20',
  'drt-violating-post': '2026-09-29',
  // drt-undated-drift 不注入 → 交付日 null → 从严
}

test('契约期合规 bundle：核心全齐不红', () => {
  const { rows, red } = scanAll([join(F, 'drt-clean-post')], { dates: DATES })
  assert.equal(rows[0].core.length, 0)
  assert.equal(rows[0].era, 'contract')
  assert.equal(red, false)
})

test('契约前违约：如实报告但不计红（交付记录不改历史）', () => {
  const { rows, red } = scanAll([join(F, 'drt-violating-pre')], { dates: DATES })
  assert.ok(rows[0].core.some((c) => c.includes('leads.md')))
  assert.equal(rows[0].era, 'pre-contract')
  assert.equal(rows[0].red, false)
  assert.equal(red, false)
})

test('契约期违约：RED（断代从严是逃逸口反面）', () => {
  const { rows, red } = scanAll([join(F, 'drt-violating-post')], { dates: DATES })
  assert.ok(rows[0].core.some((c) => c.includes('findings.md')))
  assert.equal(rows[0].red, true)
  assert.equal(red, true)
})

test('无日期可断：按契约期从严红 + 位置漂移形态被抓', () => {
  const { rows, red } = scanAll([join(F, 'drt-undated-drift')], { dates: DATES })
  assert.equal(rows[0].era, 'undated')
  assert.ok(rows[0].core.some((c) => c.includes('位置漂移')))
  assert.equal(rows[0].red, true)
  assert.equal(red, true)
})

test('断代翻转：同一违约形态，pre → 不红 / contract → 红（口径不是装饰）', () => {
  const pre = scanAll([join(F, 'drt-violating-post')], { dates: { 'drt-violating-post': '2026-09-20' } })
  const con = scanAll([join(F, 'drt-violating-post')], { dates: { 'drt-violating-post': '2026-09-29' } })
  assert.equal(pre.red, false)
  assert.equal(con.red, true)
})

test('journal 未来日期异常旗（模型时间感不可信——显性化不无视）', () => {
  const last = journalFutureDate(join(F, 'drt-future-journal'), '2026-09-29')
  assert.equal(last, '2026-10-20')
  const { rows } = scanAll([join(F, 'drt-future-journal')], { dates: { 'drt-future-journal': '2026-09-29' }, today: '2026-09-29' })
  assert.equal(rows[0].future, '2026-10-20')
  assert.equal(rows[0].core.length, 0) // 异常旗不计违约（INFO 级）
})

// ── 编制条件性（RFC 2026-09-29-schema-debt-clearance）──

test('quick_factual 编制豁免：条件件缺席不计违约，journal 记账在场则无 WARN', () => {
  const { rows, red } = scanAll([join(F, 'drt-quickfactual')], { dates: { 'drt-quickfactual': '2026-09-29' } })
  assert.equal(rows[0].core.length, 0)
  assert.equal(rows[0].exempt.length, 2) // leads.md + review.md 双豁免
  assert.equal(rows[0].warn.length, 0)
  assert.equal(red, false)
})

test('quick_factual 但 journal 无补偿把关记账 → WARN（不静默不红，人工核对入口）', () => {
  const { rows, red } = scanAll([join(F, 'drt-quickfactual-silent')], { dates: { 'drt-quickfactual-silent': '2026-09-29' } })
  assert.equal(rows[0].core.length, 0)
  assert.ok(rows[0].warn.length >= 1)
  assert.equal(red, false)
})

test('无类型标记而条件件缺席 → 维持违约（豁免依据必须是 bundle 自带事实，不是名单）', () => {
  const { rows, red } = scanAll([join(F, 'drt-notyped-missing-leads')], { dates: { 'drt-notyped-missing-leads': '2026-09-29' } })
  assert.ok(rows[0].core.some((c) => c.includes('leads.md')))
  assert.equal(rows[0].exempt.length, 0)
  assert.equal(red, true)
})
