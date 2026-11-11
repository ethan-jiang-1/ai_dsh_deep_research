// strategy-core.mjs — Strategy（行动配置）的纯派生：Protocol + plan + topics → K/O/G/B。
// 不是 canonical 存储；gate/HITL1 卡只读它，不写第二份真相。
// 边界：不读会话/驾驶舱，不调用模型，不判断策略好坏；解析失败退化为空值，不 throw。

import { planIndex, isActivePlanNode } from '../../packages/deep-research-pack/src/lib/plan-index.ts'
import { countCellsOf, waveCountOf } from './protocol-core.mjs'

const unique = (values) => [...new Set(values.filter((value) => value !== ''))]

/** 从 topics.md 的 `- lenses: [a, b]` 行取证据面 id（去重、保序）。 */
function lensIdsOf(topicsText) {
  const ids = []
  for (const line of String(topicsText ?? '').split(/\r?\n/)) {
    const match = /^\s*-\s*lenses\s*:\s*\[(.*?)\]\s*$/i.exec(line)
    if (match === null) continue
    for (const raw of match[1].split(/[,，]/)) {
      const id = raw.trim()
      if (id !== '') ids.push(id)
    }
  }
  return unique(ids)
}

/** plan 的通道形态：显式策略行 > 显式脚本层 > Team 协作 > 一次性 spawn。 */
function channelOf(planText, hasWave) {
  const declared = /^>?\s*-\s*策略\s*[:：][^\n]*?通道\s*=\s*([a-z]+)/m.exec(planText)?.[1]
  if (declared === 'team' || declared === 'spawn' || declared === 'workflow') return declared
  if (hasWave) return 'workflow'
  return /spawn_teammate|team_task_|Team 任务|Team task|teammate/i.test(planText) ? 'team' : 'spawn'
}

/**
 * 派生一次 run 的 Strategy 投影。
 * @param {{protocol?: object|null, planText?: string, topicsText?: string}} input
 * @returns {object|null} K/O/G/B；protocol 缺席时 null。
 */
export function strategyOf(input) {
  const { protocol = null, planText = '', topicsText = '' } = input ?? {}
  if (protocol === null || typeof protocol !== 'object') return null
  const index = planIndex(planText)
  const active = index.nodes.filter(isActivePlanNode)
  const hasWave = /^##\s*Wave 执行/m.test(planText) && /research-wave|wave-executor|lens-fanout/i.test(planText)
  const roles = unique(active
    .map((node) => String(node.ownerRole ?? '').trim().toLowerCase())
    .filter((role) => role !== '' && role !== 'lead'))
  const version = Number(String(index.version ?? '1').replace(/^v/i, '')) || 1
  return {
    schema: 1,
    knowledge: {
      method: protocol.method?.id ?? null,
      methodKind: protocol.method?.kind ?? null,
      source: protocol.source_scope ?? null,
      output: protocol.output?.shape ?? null,
      lenses: lensIdsOf(topicsText),
    },
    orchestration: {
      channel: channelOf(planText, hasWave),
      workers: { oneShot: 'research-worker', wave: hasWave ? 'research-wave' : null },
      roles,
      topology: {
        nodes: index.topLevel.length,
        cells: countCellsOf(topicsText),
        waves: waveCountOf(index),
        depths: protocol.effort?.allowed_depths ?? [],
      },
      replan: version > 1 ? 'back-edge' : 'fixed',
    },
    gates: { ...(protocol.gates ?? {}) },
    budget: {
      nodesMax: protocol.effort?.nodes_max ?? null,
      cellsMax: protocol.effort?.cells_max ?? null,
      wavesMax: protocol.effort?.waves_max ?? null,
      allowedDepths: protocol.effort?.allowed_depths ?? [],
    },
  }
}
