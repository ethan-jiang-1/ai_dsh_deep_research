// plan-gate.spec.mjs — plan 图硬结构/字段/剩余工作（BUG-267 / 268；keyless，tsx loader）。
//
// 负例留证 2026-11-18：BUG-267 / BUG-268——环/悬空 dep/重复 id/owner ghost/kind whatever/lifecycle dead/缺剩余工作
// → 各自用例红；合法模板 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { planGate } from '../../../checks/lib/gates/plan-gate.mjs'

const HEAD = '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n'
const plan = (rows, extra = '') => `# Plan\n\n> 图版本：v1\n\n## 节点表\n\n${HEAD}${rows.join('\n')}\n\n## 剩余工作\n\n- 无\n${extra}`
const row = (id, deps, { owner = 'scout', kind = 'broad-scan', lifecycle = 'active' } = {}) => `| ${id} | — | ${lifecycle} | ${kind} | q | ${owner} | ${deps} | out | ok | 1 | L1 | |`
function dirOf(text) { const d = mkdtempSync(join(tmpdir(), 'plan-gate-')); writeFileSync(join(d, 'plan.md'), text); return d }

test('合法 plan：图无环/字段闭集/剩余工作在场 → PASS', () => {
  const d = dirOf(plan([row('W1.1', '—'), row('W2.1', 'W1.1', { owner: 'analyst', kind: 'deep-dive' })]))
  try { assert.equal(planGate(d).status, 'PASS') } finally { rmSync(d, { recursive: true, force: true }) }
})

test('环/悬空/重号/自依赖 → RED（BUG-267）', () => {
  for (const text of [
    plan([row('W1.1', 'W2.1'), row('W2.1', 'W1.1')]),
    plan([row('W1.1', 'W9.9')]),
    plan([row('W1.1', '—'), row('W1.1', '—')]),
    plan([row('W1.1', 'W1.1')]),
  ]) {
    const d = dirOf(text)
    try { assert.equal(planGate(d).status, 'RED', text) } finally { rmSync(d, { recursive: true, force: true }) }
  }
})

test('owner/kind/lifecycle 非法、缺剩余工作、图版本缺快照 → RED（BUG-268）', () => {
  for (const [text, needle] of [
    [plan([row('W1.1', '—', { owner: 'ghost' })]), 'owner_role'],
    [plan([row('W1.1', '—', { kind: 'whatever' })]), 'kind'],
    [plan([row('W1.1', '—', { lifecycle: 'dead' })]), 'lifecycle'],
    [plan([row('W1.1', '—')]).replace('## 剩余工作\n\n- 无\n', ''), '剩余工作'],
    [plan([row('W1.1', '—')]).replace('图版本：v1', '图版本：v2'), 'plan/v1.md'],
  ]) {
    const d = dirOf(text)
    try {
      const r = planGate(d)
      assert.equal(r.status, 'RED', text)
      assert.match(r.detail, new RegExp(needle))
    } finally { rmSync(d, { recursive: true, force: true }) }
  }
})

// 负例留证 2026-11-18：BUG-280 / BUG-281 / BUG-282 / BUG-283 / BUG-284 / BUG-285——畸形表/缺版本/缺列/Wave task_id/剩余工作内容/空快照各自红。
// ── 280–285：plan-gate 加固 ───────────────────────────────────────────────────
test('BUG-280：plan.md 在场但节点表畸形/为空 → RED', () => {
  const d = dirOf('# Plan\n\n## 剩余工作\n\n- 无\n')
  try { assert.equal(planGate(d).status, 'RED') } finally { rmSync(d, { recursive: true, force: true }) }
})

test('BUG-281：缺图版本 → RED；版本快照空 → RED（BUG-285）', () => {
  const d = dirOf(plan([row('W1.1', '—')]).replace('> 图版本：v1\n\n', ''))
  try { assert.match(planGate(d).detail, /图版本/) } finally { rmSync(d, { recursive: true, force: true }) }
  const d2 = dirOf(plan([row('W1.1', '—')]).replace('图版本：v1', '图版本：v2'))
  try {
    mkdirSync(join(d2, 'plan'), { recursive: true })
    writeFileSync(join(d2, 'plan', 'v1.md'), '# Plan\n\n## 剩余工作\n- 无\n')
    assert.match(planGate(d2).detail, /快照为空/)
  } finally { rmSync(d2, { recursive: true, force: true }) }
})

test('BUG-282：active 节点缺 question/output/acceptance/budget/depth → RED', () => {
  const d = dirOf(plan([row('W1.1', '—')]).replace('| q | scout | — | out | ok | 1 | L1 | |', '|  | scout | — | out | ok | 1 | L1 | |'))
  try { assert.match(planGate(d).detail, /缺 question/) } finally { rmSync(d, { recursive: true, force: true }) }
  const d2 = dirOf(plan([row('W1.1', '—')]).replace('| 1 | L1 | |', '| 1 |  | |'))
  try { assert.match(planGate(d2).detail, /depth/) } finally { rmSync(d2, { recursive: true, force: true }) }
})

test('BUG-283：Wave 执行层节点 task_id 必须 plan-only；engine/channel 列红', () => {
  const text = plan([row('W1.1', '—'), row('W2.1', 'W1.1', { kind: 'deep-dive', owner: 'analyst' })]) + '\n## Wave 执行\n\n- W2：lens-fanout\n'
  const d = dirOf(text)
  try { assert.match(planGate(d).detail, /task_id 不是 plan-only/) } finally { rmSync(d, { recursive: true, force: true }) }
})

test('BUG-284：剩余工作空/条目缺 owner+next → RED；- 无 合法', () => {
  const d = dirOf(plan([row('W1.1', '—')]).replace('## 剩余工作\n\n- 无\n', '## 剩余工作\n\n- W2.1 还没做\n'))
  try { assert.match(planGate(d).detail, /剩余工作条目缺 owner\/next/) } finally { rmSync(d, { recursive: true, force: true }) }
})
