// bundle-date-sanity 回归 — run bundle 未来日期检查（keyless 纯函数；CLI 壳 = run-accept.mjs）。
// 反证：evidence retrieved_at 未来 / journal 行首未来 / question 行首未来各一条；正文未来年份不误报。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { futureDateFindings } from '../scripts/lib/bundle-date-sanity.mjs'

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0) // 2026-10-20T12:00Z

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-date-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  mkdirSync(join(dir, 'evidence'), { recursive: true })
  return dir
}

test('futureDateFindings：evidence retrieved_at 未来 → 红；过去/无日期 → 绿', (t) => {
  const dir = fixture(t)
  writeFileSync(join(dir, 'evidence', 'past.md'), '---\nretrieved_at: 2026-10-19\n---\n\n# past\n')
  assert.deepEqual(futureDateFindings(dir, { now: NOW }), [])
  writeFileSync(join(dir, 'evidence', 'future.md'), '---\nretrieved_at: 2026-11-02\n---\n\n# future\n')
  const findings = futureDateFindings(dir, { now: NOW })
  assert.equal(findings.length, 1)
  assert.equal(findings[0].field, 'retrieved_at')
  assert.match(findings[0].file, /evidence\/future\.md$/)
})

test('futureDateFindings：journal/question 行首日期未来 → 红；正文未来年份不误报', (t) => {
  const dir = fixture(t)
  writeFileSync(join(dir, 'journal.md'), '## 2026-10-20 立项\n\n- 2026-10-20 记账\n\n预测 2027 年市场会增长。\n')
  writeFileSync(join(dir, 'question.md'), '- 2026-10-20 HITL1\n\n时间线到 2027-12-31。\n')
  assert.deepEqual(futureDateFindings(dir, { now: NOW }), [])
  writeFileSync(join(dir, 'journal.md'), '## 2026-11-02 立项\n')
  writeFileSync(join(dir, 'question.md'), '- 2026-11-02 HITL2 拍板\n')
  const findings = futureDateFindings(dir, { now: NOW })
  assert.equal(findings.length, 2)
  assert.deepEqual(findings.map((f) => f.file).sort(), ['journal.md', 'question.md'])
})

test('futureDateFindings：容忍 1 天（跨时区/跨午夜），13 天仍红', (t) => {
  const dir = fixture(t)
  writeFileSync(join(dir, 'evidence', 'next-day.md'), '---\nretrieved_at: 2026-10-21\n---\n')
  assert.deepEqual(futureDateFindings(dir, { now: NOW }), [])
  writeFileSync(join(dir, 'evidence', 'far.md'), '---\nretrieved_at: 2026-11-02\n---\n')
  assert.equal(futureDateFindings(dir, { now: NOW }).length, 1)
})
