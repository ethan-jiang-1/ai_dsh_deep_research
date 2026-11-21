// readiness-declaration.spec.mjs — 结构化审查声明（D51）：门禁以 review/readiness.json 为准。
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
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
import { readinessOfBundle } from '../../../checks/lib/shared/node-gate-contracts.mjs'
import { parseReadinessDeclaration, readinessOfSources } from '../../../packages/deep-research-pack/src/lib/review/review-readiness.ts'
import { deliveryGate } from '../../../checks/lib/gates/node-gate-delivery-gate.mjs'
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
  const { dir, cleanup } = makeBundle('## 审查\n\n（散文没有判定行）\n', { version: 2, readiness: 'PASS', counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } })
  try {
    const r = readinessOfBundle(dir)
    assert.equal(r.pass, true)
    assert.equal(r.source, 'declaration')
  } finally { cleanup() }
})

test('声明 PASS + 散文 PASS → PASS；conditional 从声明读', () => {
  const { dir, cleanup } = makeBundle('## readiness（终局）: PASS\n', { version: 2, readiness: 'PASS', conditional: true, counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } })
  try {
    const r = readinessOfBundle(dir)
    assert.equal(r.pass, true)
    assert.equal(r.conditional, true)
  } finally { cleanup() }
})

test('声明 PASS + 散文 FAIL → 不一致，fail-closed', () => {
  const { dir, cleanup } = makeBundle('## readiness（终局）: FAIL\n', { version: 2, readiness: 'PASS', counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } })
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
    { version: 2, readiness: 'PASS', counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 }, extra: 1 },
    { version: 2, readiness: 'PASS' },  // 缺 counts
    { version: 2, readiness: 'pending', counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } },
    { version: 2, readiness: 'PASS', conditional: 'yes', counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } },
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
  const r = readinessOfSources({ reviewText: '## 审查\n无判定行\n', declarationText: JSON.stringify({ version: 2, readiness: 'PASS', conditional: true, counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } }), hasReviewDir: true })
  assert.equal(r.pass, true)
  assert.equal(r.source, 'declaration')
  assert.equal(r.conditional, true)
})

test('门A 集成：散文 PASS + 声明 FAIL 的 bundle 不得判绿（mismatch 传导）', () => {
  withCompleteBundle((dir) => {
    // fixture-complete 的 review.md 为 PASS；声明写 FAIL → 不一致
    mkdirSync(join(dir, 'review'), { recursive: true })
    writeFileSync(join(dir, 'review', 'readiness.json'), JSON.stringify({ version: 2, readiness: 'FAIL', counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } }))
    const g = deliveryGate(dir, '2026-10-08')
    assert.equal(g.status, 'RED', JSON.stringify(g))
  })
})

// 负例留证 2026-11-13：fresh-agent 审计抓到——「散文互斥」被当成「散文缺席」，声明 PASS 直接放行。
// 红配方：readinessOfSources 不区分 ambiguous / null（退回 terminalVerdictLine 单值）→ 本组第一例变绿。
test('D51 负例：散文互斥 + 声明 PASS → 仍红（互斥不是缺席）', () => {
  const r = readinessOfSources({
    reviewText: 'readiness: PASS；readiness: FAIL',
    declarationText: JSON.stringify({ version: 2, readiness: 'PASS', counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } }),
    hasReviewDir: true,
  })
  assert.equal(r.pass, false)
  assert.equal(r.source, 'ambiguous')
})

// 契约夹具：critic skill 里的 readiness 样例就是 parser 的测试输入（改一侧不改另一侧 → 红）。
test('critic skill 的 readiness 样例可直接解析（样例 = 正本）', () => {
  const skill = readFileSync(join(ROOT, 'packages', 'deep-research-pack', 'presets', 'critic', 'skills', 'adversarial-review', 'SKILL.md'), 'utf8')
  const block = /```json\n([\s\S]*?)```/.exec(skill)?.[1] ?? ''
  assert.ok(block.includes('"version": 2'), 'skill 样例未升到 v2')
  const parsed = parseReadinessDeclaration(block)
  assert.equal(parsed.ok, true, parsed.ok ? '' : parsed.detail)
})
// 负例留证 2026-11-13：JSON.parse 对重复键静默取末值（FAIL→PASS 的假绿）。
// 红配方：删掉 parseReadinessDeclaration 的重复键检测 → 本例如期 PASS。
test('D51 负例：声明重复键 → fail-closed（不取末值）', () => {
  const parsed = parseReadinessDeclaration('{"version":2,"readiness":"FAIL","readiness":"PASS","counts":{"critical":0,"major":0,"minor":0,"unverified":0,"rechecked_urls":0}}')
  assert.equal(parsed.ok, false)
  assert.match(parsed.detail, /重复键/)
})

// 负例留证 2026-11-21：BUG-347——无 review 面（无目录、无 review.md）时 readinessOfSources 曾折成
// prose/FAIL，驾驶舱因此对活跃 run 显示「审查未过」；absent 必须是 pass=null。
test('BUG-347：无 review 面 = absent（pass=null）；review.md 无终局行仍 FAIL', () => {
  const absent = readinessOfSources({ reviewText: null, declarationText: null, hasReviewDir: false })
  assert.equal(absent.pass, null)
  assert.equal(absent.source, 'absent')
  const broken = readinessOfSources({ reviewText: '# Review\n\n没有判定\n', declarationText: null, hasReviewDir: false })
  assert.equal(broken.pass, false)
  assert.equal(broken.source, 'prose')
})
