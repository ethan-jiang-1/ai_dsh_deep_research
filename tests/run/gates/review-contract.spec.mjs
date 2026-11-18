// review-contract.spec.mjs — review 覆盖表与 severity 交叉（BUG-254 / 257）。
//
// 负例留证 2026-11-19：BUG-311——A/B 分档与盘上 quality 不符红。
// 负例留证 2026-11-18：BUG-254 / BUG-257 / BUG-288——删覆盖表 → 红；表里引用不存在/不匹配的 evidence → 红；— 格无 gap/n-a → 红；
// review 有 C1 且 readiness PASS → 红；加 `resolved-critical: C1` → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { coverageIssues, severityIssues } from '../../../checks/lib/gates/review-contract.mjs'

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'review-contract-'))
  mkdirSync(join(dir, 'evidence'), { recursive: true })
  writeFileSync(join(dir, 'topics.md'), '# Topics\n\n## T1: x\n\n- scope_role: primary\n- lenses: [official, academic]\n')
  writeFileSync(join(dir, 'evidence/ev-a.md'), '---\nsource_url: https://example.com/a\nretrieved_at: 2026-11-18\nquality: A\nfound_by: scout\nsupports: T1\nlens: official\nsource_tier: primary\npublisher: example.com\n---\n')
  writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | 1 卡（A1/B0） evidence/ev-a.md | —（gap: 无社区源） |\n\n## readiness\n\nPASS\n')
  return dir
}

test('合法覆盖表：每 topic 行 + evidence 引用匹配 lens + — 有 gap 解释（BUG-254）', () => {
  const dir = fixture()
  try { assert.deepEqual(coverageIssues(dir), []) } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('缺表 / 假引用 / lens 不匹配 / 空—格无解释 → 红（BUG-254）', () => {
  const dir = fixture()
  try {
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## readiness\n\nPASS\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('缺 topic × lens 覆盖表')))

    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | evidence/missing.md | —（gap: x） |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('不存在')))

    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | evidence/ev-a.md | — |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('没有 gap/n-a')))

    writeFileSync(join(dir, 'evidence/ev-a.md'), '---\nsource_url: https://example.com/a\nretrieved_at: 2026-11-18\nquality: A\nfound_by: scout\nsupports: T1\nlens: academic\nsource_tier: primary\npublisher: example.com\n---\n')
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | evidence/ev-a.md | —（gap: x） |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('与该列')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('readiness PASS 且有未解释 C1 → 红；resolved-critical 或 readiness FAIL 放行（BUG-257）', () => {
  const dir = fixture()
  try {
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 2. CRITICAL\n\n- **C1（x）** — 说明\n\n## readiness\n\nPASS\n')
    const red = severityIssues(dir, { readinessPass: true })
    assert.equal(red.length, 1)
    assert.match(red[0], /C1/)
    assert.deepEqual(severityIssues(dir, { readinessPass: false }), [], 'readiness 非 PASS 时不交叉（本来就未交付）')
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 2. CRITICAL\n\n- **C1（x）** — 说明\n\nresolved-critical: C1\n\n## readiness\n\nPASS\n')
    assert.deepEqual(severityIssues(dir, { readinessPass: true }), [])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('BUG-288：格内声明卡数与盘上 evidence 数不一致 → 红；无计数/引用 → 红', () => {
  const dir = fixture()
  try {
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | 2 卡（A2/B0） evidence/ev-a.md | —（gap: x） |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('声明 2 卡') && i.includes('实际 1 卡')))
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | 有卡 | —（gap: x） |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('既无「N 卡」计数也无 evidence 引用')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('BUG-311：格内 A/B 分档与盘上 quality 不符 → 红', () => {
  const dir = fixture()
  try {
    writeFileSync(join(dir, 'review.md'), '# Review\n\n## 覆盖表（topic × lens）\n\n| topic | official | academic |\n|---|---|---|\n| T1 | 1 卡（A0/B1） evidence/ev-a.md | —（gap: x） |\n')
    assert.ok(coverageIssues(dir).some((i) => i.includes('声明 A0/B1') && i.includes('实际 A1/B0')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
