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
const remainingOf = (rows) => {
  const id = rows.length > 0 ? (rows[0].split('|')[1] ?? '').trim() : '—'
  const state = id === '' || id === '—' ? '完成' : '待派发'
  return `## 剩余工作\n\n| task_id | state |\n|---|---|\n| ${id || '—'} | ${state} |\n`
}
const plan = (rows, extra = '') => `# Plan\n\n> 图版本：v1\n\n## 节点表\n\n${HEAD}${rows.join('\n')}\n\n${remainingOf(rows)}${extra}`
const row = (id, deps, { owner = 'scout', kind = 'broad-scan', lifecycle = 'active' } = {}) => `| ${id} | — | ${lifecycle} | ${kind} | q | ${owner} | ${deps} | out | ok | 1 | L1 | — |`
function dirOf(text) { const d = mkdtempSync(join(tmpdir(), 'plan-gate-')); writeFileSync(join(d, 'plan.md'), text); return d }

test('合法 plan：图无环/字段闭集/剩余工作在场 → PASS', () => {
  const d = dirOf(plan([row('W1.1', '—'), row('W2.1', 'W1.1', { owner: 'analyst', kind: 'deep-dive' })]))
  try { assert.equal(planGate(d).status, 'PASS') } finally { rmSync(d, { recursive: true, force: true }) }
})

// 负例留证 2026-11-20：统一节点表解释前，装饰 ID/表头被 raw 第二读误判缺 budget/task_id；本用例实红。
test('节点表的装饰等价形式不改变 active 字段裁决', () => {
  for (const decorate of [(value) => `**${value}**`, (value) => `\`${value}\``]) {
    const text = plan([row('W1.1', '—')])
      .replace('| id |', `| ${decorate('id')} |`)
      .replace('| task_id |', `| ${decorate('TASK-ID')} |`)
      .replace('| budget |', `| ${decorate('BUDGET')} |`)
      .replace('| W1.1 |', `| ${decorate('W1.1')} |`)
    const d = dirOf(text)
    try { assert.equal(planGate(d).status, 'PASS', text) } finally { rmSync(d, { recursive: true, force: true }) }
  }
})

test('active budget/task_id：空白红，显式占位合法（task_id 占位为既有缺口，不新增收紧）', () => {
  const budgetEmpty = dirOf(plan([row('W1.1', '—')]).replace('| out | ok | 1 | L1 |', '| out | ok |  | L1 |'))
  try { assert.match(planGate(budgetEmpty).detail, /缺 budget/) } finally { rmSync(budgetEmpty, { recursive: true, force: true }) }
  const budgetNone = dirOf(plan([row('W1.1', '—')]).replace('| out | ok | 1 | L1 |', '| out | ok | — | L1 |'))
  try { assert.equal(planGate(budgetNone).status, 'PASS') } finally { rmSync(budgetNone, { recursive: true, force: true }) }
  const taskEmpty = dirOf(plan([row('W1.1', '—')]).replace('| L1 | — |', '| L1 |  |'))
  try { assert.match(planGate(taskEmpty).detail, /缺 task_id/) } finally { rmSync(taskEmpty, { recursive: true, force: true }) }
  // planning §4 要求回填后 task-N / plan-only；gate 当前接受 —。本片只保真占位、记录缺口，不暗改派工门。
  const taskNone = dirOf(plan([row('W1.1', '—')]))
  try { assert.equal(planGate(taskNone).status, 'PASS') } finally { rmSync(taskNone, { recursive: true, force: true }) }
})

test('缺 budget/task_id 列 → RED（缺列与空值分开）', () => {
  const build = (header, rowLine) => `# Plan\n\n> 图版本：v1\n\n## 节点表\n\n${header}\n|---\n${rowLine}\n\n## 剩余工作\n\n| task_id | state |\n|---|---|\n| W1.1 | 待派发 |\n`
  const noBudget = dirOf(build(
    '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | depth | task_id |',
    '| W1.1 | — | active | broad-scan | q | scout | — | out | ok | L1 | — |',
  ))
  try { assert.match(planGate(noBudget).detail, /缺 budget/) } finally { rmSync(noBudget, { recursive: true, force: true }) }
  const noTask = dirOf(build(
    '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth |',
    '| W1.1 | — | active | broad-scan | q | scout | — | out | ok | 1 | L1 |',
  ))
  try { assert.match(planGate(noTask).detail, /缺 task_id/) } finally { rmSync(noTask, { recursive: true, force: true }) }
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
    [plan([row('W1.1', '—')]).replace(/## 剩余工作[\s\S]*$/, ''), '剩余工作'],
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

// 负例留证 2026-11-19：BUG-300 / BUG-301 / BUG-302 / BUG-303 / BUG-304 / BUG-305 / BUG-306——owner/kind/task_id 缺、- 无 与 active、Wave 空层、plan-only 越界、同文快照各自红。
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
  const d = dirOf(plan([row('W1.1', '—')]).replace('| q | scout | — | out | ok | 1 | L1 | — |', '|  | scout | — | out | ok | 1 | L1 | — |'))
  try { assert.match(planGate(d).detail, /缺 question/) } finally { rmSync(d, { recursive: true, force: true }) }
  const d2 = dirOf(plan([row('W1.1', '—')]).replace('| 1 | L1 | — |', '| 1 |  | — |'))
  try { assert.match(planGate(d2).detail, /depth/) } finally { rmSync(d2, { recursive: true, force: true }) }
})

test('BUG-283：Wave 执行层节点 task_id 必须 plan-only；engine/channel 列红', () => {
  const text = plan([row('W1.1', '—'), row('W2.1', 'W1.1', { kind: 'deep-dive', owner: 'analyst' })]) + '\n## Wave 执行\n\n- W2：lens-fanout\n'
  const d = dirOf(text)
  try { assert.match(planGate(d).detail, /task_id 不是 plan-only/) } finally { rmSync(d, { recursive: true, force: true }) }
})

test('BUG-342（取代 BUG-284 的 owner/next 判据）：剩余工作必须是两列表格；未知 task_id / 非法 state / 散文 → RED', () => {
  const base = plan([row('W1.1', '—')])
  const d = dirOf(base.replace(/## 剩余工作[\s\S]*$/, '## 剩余工作\n\n- W2.1 还没做\n'))
  try { assert.match(planGate(d).detail, /两列表格/) } finally { rmSync(d, { recursive: true, force: true }) }
  const d2 = dirOf(base.replace('| W1.1 | 待派发 |', '| W9.9 | 待派发 |'))
  try { assert.match(planGate(d2).detail, /不在节点表/) } finally { rmSync(d2, { recursive: true, force: true }) }
  const d3 = dirOf(base.replace('| W1.1 | 待派发 |', '| W1.1 | 快了 |'))
  try { assert.match(planGate(d3).detail, /state/) } finally { rmSync(d3, { recursive: true, force: true }) }
})

test('BUG-303：剩余工作 | — | 完成 | 与 active 节点共存 → RED', () => {
  const d = dirOf(plan([row('W1.1', '—')]).replace(/## 剩余工作[\s\S]*$/, '## 剩余工作\n\n| task_id | state |\n|---|---|\n| — | 完成 |\n'))
  try { assert.match(planGate(d).detail, /仍有 active 节点/) } finally { rmSync(d, { recursive: true, force: true }) }
})

test('BUG-304 / BUG-305 / BUG-306：Wave 层无节点、快照与当前相同、非 Wave plan-only → RED', () => {
  const d = dirOf(plan([row('W1.1', '—')]) + '\n## Wave 执行\n\n- W9：空层\n')
  try { assert.match(planGate(d).detail, /没有 W9\.x 节点/) } finally { rmSync(d, { recursive: true, force: true }) }
  const d2 = dirOf(plan([row('W1.1', '—')]).replace('图版本：v1', '图版本：v2').replace('## 剩余工作', '## 重写记录\n\n## 剩余工作'))
  try {
    mkdirSync(join(d2, 'plan'), { recursive: true })
    writeFileSync(join(d2, 'plan', 'v1.md'), plan([row('W1.1', '—')]).replace('图版本：v1', '图版本：v1'))
    // 快照与当前正文不同（版本不同）→ 不触发 305；这里只验证不误红
    assert.ok(!planGate(d2).detail.includes('完全相同'))
  } finally { rmSync(d2, { recursive: true, force: true }) }
  const d3 = dirOf(plan([row('W1.1', '—', { kind: 'deep-dive' })]) + '')
  try {
    writeFileSync(join(d3, 'plan.md'), plan([row('W1.1', '—')]).replace('| W1.1 | — | active | broad-scan | q | scout | — | out | ok | 1 | L1 | — |', '| W1.1 | — | active | broad-scan | q | scout | — | out | ok | 1 | L1 | plan-only |'))
    assert.match(planGate(d3).detail, /无 Wave 执行层却写 plan-only/)
  } finally { rmSync(d3, { recursive: true, force: true }) }
})

test('BUG-300 / BUG-301 / BUG-302：active 缺 owner_role/kind/task_id → RED', () => {
  for (const [text, needle] of [
    [plan([row('W1.1', '—')]).replace('| q | scout |', '| q |  |'), 'owner_role'],
    [plan([row('W1.1', '—')]).replace('| active | broad-scan |', '| active |  |'), 'kind'],
    [plan([row('W1.1', '—')]).replace('| 1 | L1 | — |', '| 1 | L1 |  |'), 'task_id'],
  ]) {
    const d = dirOf(text)
    try { assert.match(planGate(d).detail, new RegExp(needle)) } finally { rmSync(d, { recursive: true, force: true }) }
  }
})

test('BUG-305：快照与当前 plan.md 完全相同 → RED', () => {
  const d = dirOf(plan([row('W1.1', '—')]).replace('图版本：v1', '图版本：v2'))
  try {
    mkdirSync(join(d, 'plan'), { recursive: true })
    writeFileSync(join(d, 'plan', 'v1.md'), plan([row('W1.1', '—')]).replace('图版本：v1', '图版本：v2'))
    assert.match(planGate(d).detail, /完全相同/)
  } finally { rmSync(d, { recursive: true, force: true }) }
})


// 负例留证 2026-11-21：BUG-342 / BUG-328——快照文本不同但解码事实相同（节点/验收/预算）→ 快照不是旧图。
test('BUG-328：同事实异措辞快照 → RED；事实有差异 → PASS', () => {
  const current = plan([row('W1.1', '—')]).replace('图版本：v1', '图版本：v2')
  const sameFacts = current.replace('# Plan', '# Plan（旧版措辞不同）').replace('> 图版本：v2', '> 图版本：v1')
  const older = sameFacts.replace('| out | ok |', '| out | 旧验收 |')
  for (const [snapshot, needle] of [[sameFacts, /无差异/], [older, null]]) {
    const d = dirOf(current)
    try {
      mkdirSync(join(d, 'plan'), { recursive: true })
      writeFileSync(join(d, 'plan', 'v1.md'), snapshot)
      const r = planGate(d)
      if (needle === null) assert.equal(r.status, 'PASS', r.detail)
      else assert.match(r.detail, needle)
    } finally { rmSync(d, { recursive: true, force: true }) }
  }
})

test('多节点 Wave 执行层共用 task_id = plan-only 不误触发 BUG-283 重复报错', () => {
  const wavePlan = `${plan([
    row('W1.1', '—'),
    row('W2.1', 'W1.1', { owner: 'analyst', kind: 'deep-dive' }).replace('| L1 | — |', '| L1 | plan-only |'),
    row('W2.2', 'W1.1', { owner: 'analyst', kind: 'deep-dive' }).replace('| L1 | — |', '| L1 | plan-only |'),
  ])}\n\n## Wave 执行\n\n- W2：\`lens-fanout\` ×2；executor = analyst（spawn）\n`
  const d = dirOf(wavePlan)
  try {
    const res = planGate(d)
    assert.equal(res.status, 'PASS', res.detail)
  } finally {
    rmSync(d, { recursive: true, force: true })
  }
})

// 负例留证 2026-11-24：BUG-405——快照事实比对读了不存在的 `node.budget`（PlanNode 上是
// `node.cells.budget.value`），预算维度恒为空 → 只调 budget 的合法重写被判「无差异」RED。
// 红配方：把 factsOf 的预算项改回 `node.budget`。
test('BUG-405：只改 budget 的快照差异 → PASS（预算维度必须真的参与比对）', () => {
  const current = plan([row('W1.1', '—')]).replace('图版本：v1', '图版本：v2').replace('| out | ok | 1 | L1 |', '| out | ok | 3 | L1 |')
  const snapshot = plan([row('W1.1', '—')]).replace('# Plan', '# Plan（旧版）')
  const d = dirOf(current)
  try {
    mkdirSync(join(d, 'plan'), { recursive: true })
    writeFileSync(join(d, 'plan', 'v1.md'), snapshot)
    const r = planGate(d)
    assert.doesNotMatch(r.detail, /无差异/, '只调预算的旧图必须被承认是旧图')
    assert.equal(r.status, 'PASS', r.detail)
  } finally { rmSync(d, { recursive: true, force: true }) }
})

// 负例留证 2026-11-24：BUG-423——节点表少一列 `deps`/`parent` 时，所有节点变成「无依赖/顶层」，
// planGate 仍报「图无环/无悬空」PASS、零诊断——门在说一件它没验证过的事。
// 红配方：从必填列判据里删掉 deps/parent（缺列不再红）。
test('BUG-423：缺 deps 列 / 缺 parent 列 → RED（缺列不得等价于「全空」）', () => {
  const row12 = '| W1.1 | — | active | broad-scan | q | scout | — | out | ok | 1 | L1 | — |'
  const build = (header, rowLine) => `# Plan\n\n> 图版本：v1\n\n## 节点表\n\n${header}\n|---|---|---|---|---|---|---|---|---|---|---|\n${rowLine}\n\n## 剩余工作\n\n| task_id | state |\n|---|---|\n| W1.1 | 待派发 |\n`
  const noDeps = dirOf(build(
    '| id | parent | lifecycle | kind | question | owner_role | output | acceptance | budget | depth | task_id |',
    row12.replace('| — | out |', '| out |'),
  ))
  try { assert.match(planGate(noDeps).detail, /缺 deps 列/) } finally { rmSync(noDeps, { recursive: true, force: true }) }
  const noParent = dirOf(build(
    '| id | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |',
    row12.replace('| W1.1 | — |', '| W1.1 |'),
  ))
  try { assert.match(planGate(noParent).detail, /缺 parent 列/) } finally { rmSync(noParent, { recursive: true, force: true }) }
})
