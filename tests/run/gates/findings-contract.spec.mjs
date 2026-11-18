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
