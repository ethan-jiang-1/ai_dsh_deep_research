// findings-contract.spec.mjs — findings gap 四态 / lens_gaps 消费者 / scope_role 闭集（BUG-252 / 256 / 253）。
//
// 负例留证 2026-11-18：BUG-252 / BUG-253 / BUG-256——把 gap 改成 maybe → 红；删 lens_gaps → 红；lens_gaps 写 [] → 红；
// 把 scope_role 写成 Primary → 门 L 红；各自还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findingsContractIssues, parseFindingsOf, parseTopicsOf } from '../../../checks/lib/gates/findings-core.mjs'
import { leadsGate } from '../../../checks/lib/gates/node-gate-run-gates.mjs'

const makeBundle = () => mkdtempSync(join(tmpdir(), 'findings-contract-'))
const write = (dir, rel, text) => { writeFileSync(join(dir, rel), text) }

function fixture() {
  const dir = makeBundle()
  mkdirSync(join(dir, 'evidence'), { recursive: true })
  write(dir, 'topics.md', '# Topics\n\n## T1: x\n\n- scope_role: primary\n- lenses: [official, academic]\n')
  write(dir, 'evidence/ev-a.md', '---\nsource_url: https://example.com/a\nretrieved_at: 2026-11-18\nquality: A\nfound_by: scout\nsupports: T1\nlens: official\nsource_tier: primary\npublisher: example.com\n---\n\n# A\n')
  write(dir, 'findings.md', '# Findings\n\n## F1: x\n\n- 支撑证据: evidence/ev-a.md\n- lenses: [official]\n- lens_gaps: [academic]\n- gap: supported\n')
  return dir
}

test('合法 findings：gap 四态 + lens_gaps 差集一致（BUG-252 / BUG-256）', () => {
  const dir = fixture()
  try {
    assert.deepEqual(findingsContractIssues(dir), [])
    assert.deepEqual(parseFindingsOf('# F\n## F1: x\n- gap: supported\n').map((f) => f.gap), ['supported'])
    assert.equal(parseTopicsOf('## T1: x\n- scope_role: primary\n- lenses: [a]\n').get('T1').lenses[0], 'a')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('gap: maybe / 缺 lens_gaps / lens_gaps: [] / 假 gap id 都红', () => {
  const dir = fixture()
  try {
    write(dir, 'findings.md', '# Findings\n\n## F1: x\n\n- 支撑证据: evidence/ev-a.md\n- lenses: [official]\n- lens_gaps: [academic]\n- gap: maybe\n')
    assert.ok(findingsContractIssues(dir).some((i) => i.includes('gap「maybe」')))

    write(dir, 'findings.md', '# Findings\n\n## F1: x\n\n- 支撑证据: evidence/ev-a.md\n- lenses: [official]\n- gap: supported\n')
    assert.ok(findingsContractIssues(dir).some((i) => i.includes('缺 lens_gaps')))

    write(dir, 'findings.md', '# Findings\n\n## F1: x\n\n- 支撑证据: evidence/ev-a.md\n- lenses: [official]\n- lens_gaps: []\n- gap: supported\n')
    assert.ok(findingsContractIssues(dir).some((i) => i.includes('空列表')))

    write(dir, 'findings.md', '# Findings\n\n## F1: x\n\n- 支撑证据: evidence/ev-a.md\n- lenses: [official]\n- lens_gaps: [bogus]\n- gap: supported\n')
    assert.ok(findingsContractIssues(dir).some((i) => i.includes('不在 topics.lenses')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('lens_gaps 与 topics − evidence 差集不一致 → 红（256 的差集对账）', () => {
  const dir = fixture()
  try {
    write(dir, 'findings.md', '# Findings\n\n## F1: x\n\n- 支撑证据: evidence/ev-a.md\n- lenses: [official]\n- lens_gaps: 无\n- gap: supported\n')
    assert.ok(findingsContractIssues(dir).some((i) => i.includes('差集不一致') && i.includes('academic')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('scope_role 非法/大小写错 → 门 L 红；合法四值放行（BUG-253）', () => {
  const dir = makeBundle()
  try {
    write(dir, 'topics.md', '# Topics\n\n## T1: x\n\n- scope_role: Primary\n- lenses: [official]\n')
    write(dir, 'leads.md', '# Leads\n\n## 方向: x\n\n- 状态: 建议挖深\n- 支持来源: （A）\n- 关键线索: y\n- 建议 owner: T1\n')
    const red = leadsGate(dir)
    assert.equal(red.status, 'RED')
    assert.match(red.detail, /scope_role「Primary」非法/)
    for (const role of ['primary', 'synthesis', 'comparison', 'supporting']) {
      write(dir, 'topics.md', `# Topics\n\n## T1: x\n\n- scope_role: ${role}\n- lenses: [official]\n`)
      assert.notEqual(leadsGate(dir).status, 'RED', `${role} 是合法值，不得红`)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// 负例留证 2026-11-18：BUG-260 / BUG-261 / BUG-262 / BUG-263——无 lens+missing evidence、F2 缺 lens_gaps、[] 误伤、重复 F1 各自红。
// ── 260–266 / 277 / 279：块级 / ID / 图 / 外键（2026-11-18）────────────────────
function writeTopic(dir, id, role = 'primary', lenses = ['official'], must = ['q1', 'q2'], deps = []) {
  const lines = [`## ${id}: x`, '', '- must_answer:', ...must.map((q) => `  - ${q}`), `- scope_role: ${role}`]
  if (deps.length > 0) lines.push(`- depends_on: ${deps.join(', ')}`)
  lines.push(`- lenses: [${lenses.join(', ')}]`, '')
  return lines.join('\n')
}
function writeFindings(dir, blocks) {
  const text = ['# Findings', '']
  for (const b of blocks) {
    text.push(`## ${b.id}: x`, '', `- 支撑证据: ${b.evidence ?? 'evidence/ev-a.md'}`)
    if (b.lenses !== undefined) text.push(`- lenses: [${b.lenses.join(', ')}]`)
    if (b.lensGaps !== undefined) text.push(`- lens_gaps: ${b.lensGaps}`)
    text.push(`- gap: ${b.gap ?? 'supported'}`, '')
  }
  writeFileSync(join(dir, 'findings.md'), text.join('\n'))
}

test('BUG-260：无 lens 时支撑证据不存在也红（存在性不再被 lens 条件吞掉）', () => {
  const dir = makeBundle()
  try {
    mkdirSync(join(dir, 'evidence'), { recursive: true })
    write(dir, 'topics.md', `# Topics\n\n${writeTopic(dir, 'T1', 'primary', [])}`)
    write(dir, 'evidence/ev-a.md', '---\nsource_url: https://example.com/a\nretrieved_at: 2026-11-18\nquality: A\nfound_by: scout\nsupports: T1\nlens: official\nsource_tier: primary\npublisher: example.com\n---\n')
    writeFindings(dir, [{ id: 'F1', evidence: 'evidence/missing.md' }])
    assert.ok(findingsContractIssues(dir).some((i) => i.includes('支撑证据 evidence/missing.md 不存在')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('BUG-261 / BUG-262：lens_gaps 按块——缺行只报该块；[] 不误伤「无」块', () => {
  const dir = fixture()
  try {
    writeFindings(dir, [
      { id: 'F1', evidence: 'evidence/ev-a.md', lenses: ['official'], lensGaps: '无' },
      { id: 'F2', evidence: 'evidence/ev-a.md', lenses: ['official'] },
    ])
    let issues = findingsContractIssues(dir)
    assert.ok(issues.some((i) => i.includes('F2 有 lenses 但缺 lens_gaps')), 'F2 缺行必须报')
    assert.ok(!issues.some((i) => i.includes('F1 有 lenses 但缺 lens_gaps')), 'F1 有行不得被报')

    writeFindings(dir, [
      { id: 'F1', evidence: 'evidence/ev-a.md', lenses: ['official'], lensGaps: '[]' },
      { id: 'F2', evidence: 'evidence/ev-a.md', lenses: ['official'], lensGaps: '无' },
    ])
    issues = findingsContractIssues(dir)
    assert.equal(issues.filter((i) => i.includes('空列表')).length, 1, '只有 F1 的 [] 该报')
    assert.match(issues.find((i) => i.includes('空列表')), /F1/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('BUG-263：重复 F# 红（引用主键唯一）', () => {
  const dir = fixture()
  try {
    writeFindings(dir, [
      { id: 'F1', evidence: 'evidence/ev-a.md', lenses: ['official'], lensGaps: '无' },
      { id: 'F1', evidence: 'evidence/ev-a.md', lenses: ['official'], lensGaps: '无' },
    ])
    assert.ok(findingsContractIssues(dir).some((i) => i.includes('重复 F#')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
