// plan-gate.spec.mjs — plan 图硬结构/字段/剩余工作（BUG-267 / 268；keyless，tsx loader）。
//
// 负例留证 2026-11-18：BUG-267 / BUG-268——环/悬空 dep/重复 id/owner ghost/kind whatever/lifecycle dead/缺剩余工作
// → 各自用例红；合法模板 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
