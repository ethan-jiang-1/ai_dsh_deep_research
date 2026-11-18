// topics-contract.spec.mjs — topics 的 ID/图/数量/lens 闭集（BUG-264 / 265 / 266 / 277；keyless）。
//
// 负例留证 2026-11-18：BUG-264 / BUG-265 / BUG-266 / BUG-277——重复 T1、must_answer 0/6、depends_on 未知/自依赖/环、lenses bogus
// → 各自用例红；合法图 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LENS_IDS, parseTopicsReport, topicsContractIssues } from '../../../checks/lib/gates/findings-core.mjs'

function dirOf(text) {
  const dir = mkdtempSync(join(tmpdir(), 'topics-contract-'))
  writeFileSync(join(dir, 'topics.md'), text)
  return dir
}
const topic = (id, { role = 'primary', lenses = ['official'], must = ['q1', 'q2'], deps } = {}) => [
  `## ${id}: x`, '', '- must_answer:', ...must.map((q) => `  - ${q}`), `- scope_role: ${role}`,
  ...(deps === undefined ? [] : [`- depends_on: ${deps}`]), `- lenses: [${lenses.join(', ')}]`, '',
].join('\n')

test('合法 topics：T# 唯一、must_answer 2–5、depends_on 无环、lens id 真实', () => {
  const dir = dirOf(`# Topics\n\n${topic('T1')}${topic('T2', { deps: 'T1', lenses: ['quant'] })}`)
  try { assert.deepEqual(topicsContractIssues(dir), []) } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('重复 T# 红；must_answer 0/6 红；lens bogus 红（BUG-264 / BUG-266 / BUG-277）', () => {
  let dir = dirOf(`# Topics\n\n${topic('T1')}${topic('T1', { role: 'comparison' })}`)
  try { assert.ok(topicsContractIssues(dir).some((i) => i.includes('重复 T#'))) } finally { rmSync(dir, { recursive: true, force: true }) }
  for (const must of [[], ['q1'], ['q1','q2','q3','q4','q5','q6']]) {
    dir = dirOf(`# Topics\n\n${topic('T1', { must })}`)
    try { assert.ok(topicsContractIssues(dir).some((i) => i.includes('must_answer 数量'))) } finally { rmSync(dir, { recursive: true, force: true }) }
  }
  dir = dirOf(`# Topics\n\n${topic('T1', { lenses: ['bogus'] })}`)
  try {
    assert.ok(topicsContractIssues(dir).some((i) => i.includes('不是真实 lens id')))
    assert.deepEqual(LENS_IDS, ['academic', 'adversarial', 'historical', 'official', 'practitioner', 'quant', 'regulatory', 'structural'])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('depends_on 未知/自依赖/环 → 红（BUG-265）', () => {
  for (const text of [
    `# Topics\n\n${topic('T1', { deps: 'T9' })}`,
    `# Topics\n\n${topic('T1', { deps: 'T1' })}`,
    `# Topics\n\n${topic('T1', { deps: 'T2' })}${topic('T2', { deps: 'T1' })}`,
  ]) {
    const dir = dirOf(text)
    try {
      const issues = topicsContractIssues(dir)
      assert.ok(issues.some((i) => /不存在|指向自身|成环/.test(i)), JSON.stringify(issues))
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }
})

test('parseTopicsReport 保留 depends_on/must_answer，供图/数量消费', () => {
  const report = parseTopicsReport(`# Topics\n\n${topic('T1', { deps: '无' })}`)
  assert.deepEqual(report.topics.get('T1').dependsOn, [])
  assert.equal(report.topics.get('T1').mustAnswer.length, 2)
})
