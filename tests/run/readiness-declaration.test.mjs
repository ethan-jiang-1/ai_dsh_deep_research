// readiness-declaration.test.mjs — 结构化审查声明（D51）：门禁以 review/readiness.json 为准。
//
// 为什么存在：review.md 的判定行是散文，措辞变体修不完（BUG-046/074/141/150）。声明件由 critic
// 写入，门禁读结构；散文只做交叉核对（不一致 = 红）。要求条件 = review/ 目录在场（D44 结构化审查面）；
// 无 review/ 的旧场回退散文判据。
//
// 负例留证 2026-11-13：BUG-150——「用有限词表/启发式在散文里猜判定」的类。
// 红配方：把 readinessOfBundle 的声明读取删掉、退回 readinessOf(review.md) → 「散文 PASS + 声明 FAIL」
// 与「review/ 在场但声明缺席」两例都不会红。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { readinessOfBundle } from '../../scripts/lib/node-gate-contracts.mjs'
import { parseReadinessDeclaration, readinessOfSources } from '../../packages/deep-research-pack/src/lib/review-readiness.ts'
import { deliveryGate } from '../../scripts/lib/node-gate-delivery-gate.mjs'
import { withCompleteBundle } from './node-gate-helpers.mjs'

const makeBundle = (reviewText, declaration = undefined) => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'dsh-readiness-'))
  writeFileSync(join(dir, 'review.md'), reviewText)
  if (declaration !== undefined) {
    mkdirSync(join(dir, 'review'), { recursive: true })
    writeFileSync(join(dir, 'review', 'readiness.json'), typeof declaration === 'string' ? declaration : JSON.stringify(declaration))
  } else {
    mkdirSync(join(dir, 'review'), { recursive: true })
  }
  return { dir, cleanup: () => {
    if (dirname(dir) !== base || !basename(dir).startsWith('dsh-readiness-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  } }
}

test('声明 PASS + 散文无判定 → PASS（声明是权威，散文缺席不否决）', () => {
  const { dir, cleanup } = makeBundle('## 审查\n\n（散文没有判定行）\n', { version: 1, readiness: 'PASS' })
  try {
    const r = readinessOfBundle(dir)
    assert.equal(r.pass, true)
    assert.equal(r.source, 'declaration')
  } finally { cleanup() }
})

test('声明 PASS + 散文 PASS → PASS；conditional 从声明读', () => {
  const { dir, cleanup } = makeBundle('## readiness（终局）: PASS\n', { version: 1, readiness: 'PASS', conditional: true })
  try {
    const r = readinessOfBundle(dir)
    assert.equal(r.pass, true)
    assert.equal(r.conditional, true)
  } finally { cleanup() }
})

test('声明 PASS + 散文 FAIL → 不一致，fail-closed', () => {
  const { dir, cleanup } = makeBundle('## readiness（终局）: FAIL\n', { version: 1, readiness: 'PASS' })
  try {
    const r = readinessOfBundle(dir)
    assert.equal(r.pass, false)
    assert.equal(r.source, 'mismatch')
    assert.match(r.detail, /不一致/)
  } finally { cleanup() }
})

test('review/ 在场但声明缺席 → fail-closed（不退回散文）', () => {
  const { dir, cleanup } = makeBundle('## readiness（终局）: PASS\n')
  try {
    const r = readinessOfBundle(dir)
    assert.equal(r.pass, false)
    assert.equal(r.source, 'missing')
  } finally { cleanup() }
})

test('无 review/ 的旧场 → 散文回退（迁移期路径）', () => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'dsh-readiness-legacy-'))
  writeFileSync(join(dir, 'review.md'), '## readiness（终局）: PASS\n')
  try {
    const r = readinessOfBundle(dir)
    assert.equal(r.pass, true)
    assert.equal(r.source, 'prose')
  } finally {
    if (dirname(dir) !== base || !basename(dir).startsWith('dsh-readiness-legacy-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  }
})

test('非法声明：坏 JSON / 未知键 / 错版本 / 错值 → fail-closed', () => {
  for (const declaration of [
    '{not json',
    { version: 1, readiness: 'PASS', extra: 1 },
    { version: 2, readiness: 'PASS' },
    { version: 1, readiness: 'pending' },
    { version: 1, readiness: 'PASS', conditional: 'yes' },
  ]) {
    const { dir, cleanup } = makeBundle('## readiness（终局）: PASS\n', declaration)
    try {
      const r = readinessOfBundle(dir)
      assert.equal(r.pass, false, JSON.stringify(declaration))
      assert.equal(r.source, 'invalid', JSON.stringify(declaration))
    } finally { cleanup() }
  }
})

test('共享判据：驾驶舱与门禁同一函数——声明 PASS + 无散文判定 → PASS', () => {
  const r = readinessOfSources({ reviewText: '## 审查\n无判定行\n', declarationText: JSON.stringify({ version: 1, readiness: 'PASS', conditional: true }), hasReviewDir: true })
  assert.equal(r.pass, true)
  assert.equal(r.source, 'declaration')
  assert.equal(r.conditional, true)
})

test('门A 集成：散文 PASS + 声明 FAIL 的 bundle 不得判绿（mismatch 传导）', () => {
  withCompleteBundle((dir) => {
    // fixture-complete 的 review.md 为 PASS；声明写 FAIL → 不一致
    mkdirSync(join(dir, 'review'), { recursive: true })
    writeFileSync(join(dir, 'review', 'readiness.json'), JSON.stringify({ version: 1, readiness: 'FAIL' }))
    const g = deliveryGate(dir, '2026-10-08')
    assert.equal(g.status, 'RED', JSON.stringify(g))
  })
})

// 负例留证 2026-11-13：fresh-agent 审计抓到——「散文互斥」被当成「散文缺席」，声明 PASS 直接放行。
// 红配方：readinessOfSources 不区分 ambiguous / null（退回 terminalVerdictLine 单值）→ 本组第一例变绿。
test('D51 负例：散文互斥 + 声明 PASS → 仍红（互斥不是缺席）', () => {
  const r = readinessOfSources({
    reviewText: 'readiness: PASS；readiness: FAIL',
    declarationText: JSON.stringify({ version: 1, readiness: 'PASS' }),
    hasReviewDir: true,
  })
  assert.equal(r.pass, false)
  assert.equal(r.source, 'ambiguous')
})

// 负例留证 2026-11-13：JSON.parse 对重复键静默取末值（FAIL→PASS 的假绿）。
// 红配方：删掉 parseReadinessDeclaration 的重复键检测 → 本例如期 PASS。
test('D51 负例：声明重复键 → fail-closed（不取末值）', () => {
  const parsed = parseReadinessDeclaration('{"version":1,"readiness":"FAIL","readiness":"PASS"}')
  assert.equal(parsed.ok, false)
  assert.match(parsed.detail, /重复键/)
})
