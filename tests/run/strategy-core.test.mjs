// strategy-core.test.mjs — Strategy 投影（K/O/G/B）的纯派生回归。
// 反证：把通道/角色/重写判据放宽或删掉任一断言 → 本例红；不依赖真 run / 模型 / 浏览器。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { strategyOf } from '../../scripts/lib/strategy-core.mjs'
import { researchRoles } from '../../scripts/lib/roles.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ROLES = researchRoles(ROOT)
const LEAD = ROLES.find((role) => role === 'lead')
const NON_LEAD = ROLES.filter((role) => role !== LEAD)

function protocolOf(overrides = {}) {
  return {
    schema: 1,
    version: 1,
    status: 'approved',
    method: {
      id: '事实核查',
      kind: 'preset',
      fields: { source: '官方优先', verify: '逐字', report: '快答', limit: '不覆盖' },
      adjustments: [],
    },
    source_scope: { families: ['official', 'web'], recency: '12m', language: ['zh'], authority: 'primary' },
    effort: { band: 'quick', nodes_max: 3, cells_max: 2, waves_max: 5, allowed_depths: ['L1', 'L2'] },
    output: { shape: 'quick_answer', sections: ['answer', 'basis', 'limits'], format: 'md', audience: '采购' },
    gates: { hitl1: 'none', hitl2: 'review', evidence_threshold: 'B', critic: 'light', claim_verification: 'off' },
    deviations: [],
    ...overrides,
  }
}

function planOf({ count = 3, version = 1, team = false, wave = false, roles = [ROLES[0]] } = {}) {
  const rows = []
  for (let i = 1; i <= count; i += 1) {
    const role = roles[(i - 1) % roles.length]
    rows.push(`| W${i}.1 | — | active | deep-dive | q${i} | ${role} | — | evidence/t${i}.md | ok | 2 轮 | L2 | |`)
  }
  return [
    '# Plan — fixture',
    '',
    `> protocol: v1`,
    ...(version > 1 ? [`> 图版本：v${version}`] : []),
    ...(team ? ['> Team task 是当前会话的执行镜像。'] : ['- 通道: **不组队**']),
    '',
    '## 节点表',
    '',
    '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows,
    ...(wave ? ['', '## Wave 执行', '', 'W2：lens-fanout ×2；executor = research-wave。'] : []),
  ].join('\n')
}

function topicsOf(lenses) {
  return ['# Topics — fixture', '', '- lenses: [' + lenses.join(', ') + ']'].join('\n')
}

test('strategyOf：protocol 缺席 → null', () => {
  assert.equal(strategyOf(null), null)
  assert.equal(strategyOf({}), null)
})

test('strategyOf：quick 不组队 → spawn；K/O/G/B 从协议与 plan 派生', () => {
  const protocol = protocolOf()
  const strategy = strategyOf({ protocol, planText: planOf({ count: 3 }), topicsText: topicsOf(['official']) })
  assert.equal(strategy.orchestration.channel, 'spawn')
  assert.equal(strategy.orchestration.workers.oneShot, 'research-worker')
  assert.equal(strategy.orchestration.workers.wave, null)
  assert.equal(strategy.orchestration.topology.nodes, 3)
  assert.equal(strategy.orchestration.topology.cells, 1)
  assert.deepEqual(strategy.orchestration.roles, [ROLES[0]])
  assert.equal(strategy.orchestration.replan, 'fixed')
  assert.equal(strategy.knowledge.method, '事实核查')
  assert.equal(strategy.knowledge.output, 'quick_answer')
  assert.deepEqual(strategy.knowledge.lenses, ['official'])
  assert.equal(strategy.budget.nodesMax, 3)
  assert.deepEqual(strategy.gates, protocol.gates)
})

test('strategyOf：Team plan → team；角色去重且排除 lead', () => {
  const protocol = protocolOf({ effort: { band: 'deep', nodes_max: 12, cells_max: 12, waves_max: 8, allowed_depths: ['L1', 'L2', 'L3'] } })
  const plan = planOf({ count: 6, team: true, roles: [NON_LEAD[0], NON_LEAD[1], NON_LEAD[2], LEAD, NON_LEAD[1]] })
  const strategy = strategyOf({ protocol, planText: plan, topicsText: topicsOf(['academic', 'adversarial']) })
  assert.equal(strategy.orchestration.channel, 'team')
  assert.deepEqual(strategy.orchestration.roles.sort(), [NON_LEAD[0], NON_LEAD[1], NON_LEAD[2]].sort())
  assert.deepEqual(strategy.knowledge.lenses, ['academic', 'adversarial'])
})

test('strategyOf：显式策略行的 spawn 覆盖 Team 样板句（真实 pilot 回归）', () => {
  const protocol = protocolOf()
  const plan = planOf({ count: 3, team: true }).replace('> protocol: v1', '> protocol: v1\n> - 策略: 通道=spawn')
  const strategy = strategyOf({ protocol, planText: plan, topicsText: topicsOf(['official']) })
  assert.equal(strategy.orchestration.channel, 'spawn', 'Team task 样板句不能把显式 spawn 判成 team')
})

test('strategyOf：图版本 v2 → back-edge；Wave 执行 → workflow / research-wave', () => {
  const protocol = protocolOf()
  const back = strategyOf({ protocol, planText: planOf({ count: 3, version: 2 }), topicsText: topicsOf(['official']) })
  assert.equal(back.orchestration.replan, 'back-edge')
  const wave = strategyOf({ protocol, planText: planOf({ count: 3, wave: true }), topicsText: topicsOf(['official']) })
  assert.equal(wave.orchestration.channel, 'workflow')
  assert.equal(wave.orchestration.workers.wave, 'research-wave')
})
