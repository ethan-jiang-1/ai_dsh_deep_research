// protocol-audit-core.mjs — Protocol 的**bundle 级判据**：effort 合同 / §Protocol 投影 / 批准链 /
// plan 引用 / audit hash / 版本快照 + 投影与卡文。无 IO；schema 半在 protocol-core.mjs。
//
// 为什么拆：schema 校验与 bundle 审计是两个消费面（校验器 vs gate），同文件会越过 scripts/lib 的
// 单文件行数上限；拆开后 protocol-core 只答「JSON 形状对不对」，本件只答「bundle 的设计合同齐不齐」。

import { planIndex, isActivePlanNode } from '../../packages/deep-research-pack/src/lib/plan-index.ts'
import { strategyOf } from './strategy-core.mjs'
import {
  BAND_LABELS,
  BAND_TABLE,
  DEPTHS,
  SHAPE_LABELS,
  auditHashOf,
  countCellsOf,
  decisionsProtocolVersionOf,
  designSha256,
  methodAdoptedOf,
  methodNameMatches,
  protocolVersionIn,
  sectionOf,
  validateProtocol,
  waveCountOf,
} from './protocol-core.mjs'

const red = (code, message) => ({ code, level: 'red', message })
const warn = (code, message) => ({ code, level: 'warning', message })
const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== ''
const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string')

/** bundle 级判据：schema + effort 合同 + 投影 + 批准链 + plan 引用 + audit/hash + 快照。 */
export function evaluateBundle(input) {
  const {
    protocol = null,
    questionText = '',
    planText = '',
    topicsText = '',
    auditText = '',
    hasSnapshot = false,
    legacy = false,
  } = input ?? {}
  if (legacy) return [warn('legacy-not-applicable', '契约日前 / 旧 bundle：不判 Protocol')]
  if (protocol === null || protocol === undefined) return [red('no-protocol', '契约日后缺 protocol.json')]
  const shape = validateProtocol(protocol)
  if (shape.some((item) => item.level === 'red')) return shape
  return [
    ...shape,
    ...checkEffortContract(protocol, planText, topicsText),
    ...checkProjection(protocol, questionText),
    ...checkStrategy(protocol, planText, topicsText),
    ...checkProtocolStatus(protocol, questionText),
    ...checkPlanRef(protocol, planText),
    ...checkAudit(protocol, auditText, hasSnapshot),
  ]
}

function checkEffortContract(protocol, planText, topicsText) {
  const out = []
  const index = planIndex(planText)
  const band = BAND_TABLE[protocol.effort.band]
  const top = index.topLevel.length
  const nodeCeiling = Math.min(protocol.effort.nodes_max, band?.nodes_max ?? protocol.effort.nodes_max)
  if (top > nodeCeiling) {
    out.push(red('effort-contract', `plan 顶层节点 ${top} > 上限 ${nodeCeiling}（protocol ${protocol.effort.nodes_max} / band ${band?.nodes_max ?? '—'}）`))
  }
  const badDepths = []
  for (const node of index.nodes.filter(isActivePlanNode)) {
    const depth = String(node.depth ?? '').trim().toUpperCase()
    if (depth === '') continue
    if (!DEPTHS.includes(depth) || !protocol.effort.allowed_depths.includes(depth)) badDepths.push(`${node.id}:${node.depth}`)
  }
  if (badDepths.length > 0) {
    out.push(red('effort-contract', `plan depth 越带（${protocol.effort.allowed_depths.join(',')}）：${badDepths.join(', ')}`))
  }
  const cells = countCellsOf(topicsText)
  const cellCeiling = Math.min(protocol.effort.cells_max, band?.cells_max ?? protocol.effort.cells_max)
  if (cells > cellCeiling) {
    out.push(red('effort-contract', `topics lens 总数 ${cells} > 上限 ${cellCeiling}（protocol ${protocol.effort.cells_max} / band ${band?.cells_max ?? '—'}）`))
  }
  const waves = waveCountOf(index)
  if (waves !== null && waves > protocol.effort.waves_max) {
    out.push(warn('effort-contract', `Wave 层数 ${waves} > waves_max ${protocol.effort.waves_max}（不拦交付）`))
  }
  return out
}

/** §Protocol 里可核的数字/枚举：投入节点/cells/深度、来源 families、输出 sections。 */
function checkProjectionDetails(protocol, section) {
  const out = []
  const bandLine = /^-\s*投入\s*[:：]\s*(.+)$/m.exec(section)?.[1] ?? ''
  if (bandLine !== '') {
    const nodes = /≤\s*(\d+)\s*节点/.exec(bandLine)
    if (nodes !== null && Number(nodes[1]) !== protocol.effort.nodes_max) {
      out.push(red('projection-number', `§Protocol 投入节点 ≤${nodes[1]} ≠ JSON nodes_max ${protocol.effort.nodes_max}`))
    }
    const cells = /≤\s*(\d+)\s*cells/i.exec(bandLine)
    if (cells !== null && Number(cells[1]) !== protocol.effort.cells_max) {
      out.push(red('projection-number', `§Protocol 投入 cells ≤${cells[1]} ≠ JSON cells_max ${protocol.effort.cells_max}`))
    }
    const range = /L([0-3])\s*[–-]\s*L([0-3])/.exec(bandLine)
    if (range !== null) {
      const expected = new Set(protocol.effort.allowed_depths)
      const actual = new Set(Array.from(
        { length: Number(range[2]) - Number(range[1]) + 1 },
        (_, index) => `L${Number(range[1]) + index}`,
      ))
      const mismatch = [...actual].some((depth) => !expected.has(depth))
        || [...expected].some((depth) => !actual.has(depth))
      if (mismatch) {
        out.push(red('projection-number', `§Protocol 投入深度 ${range[0]} ≠ JSON allowed_depths ${protocol.effort.allowed_depths.join(',')}`))
      }
    }
  }
  const sourceLine = /^-\s*来源\s*[:：]\s*(.+)$/m.exec(section)?.[1] ?? ''
  if (sourceLine !== '') {
    const lower = sourceLine.toLowerCase()
    for (const family of protocol.source_scope.families) {
      if (!lower.includes(String(family).toLowerCase())) out.push(red('projection-source', `§Protocol 来源缺 family ${family}`))
    }
  }
  const outputLine = /^-\s*输出\s*[:：]\s*(.+)$/m.exec(section)?.[1] ?? ''
  const sectionList = /sections\s*=\s*([^；;\n]+)/i.exec(outputLine)?.[1]
  if (sectionList !== undefined) {
    const lower = sectionList.toLowerCase()
    for (const name of protocol.output.sections) {
      if (!lower.includes(String(name).toLowerCase())) out.push(red('projection-output', `§Protocol 输出缺 section ${name}`))
    }
  }
  return out
}

function checkProjection(protocol, questionText) {
  const out = []
  const section = sectionOf(questionText, /^##\s*Protocol/m)
  if (section === null) return [red('projection', 'question.md 缺 §Protocol 投影')]
  if (protocolVersionIn(section) !== protocol.version) out.push(red('projection', '§Protocol 的 protocol: vN 与 JSON 不一致'))
  if (!section.includes(protocol.method.id)) out.push(red('projection', '§Protocol 缺方法名（method.id）'))
  if (!section.includes(BAND_LABELS[protocol.effort.band])) out.push(red('projection', '§Protocol 缺档位（band 中文标签）'))
  if (!section.includes(protocol.output.shape)) out.push(red('projection', '§Protocol 缺 output.shape'))
  if (!section.includes('protocol.json')) out.push(red('projection', '§Protocol 缺 protocol.json 指针'))
  out.push(...checkProjectionDetails(protocol, section))
  const adopted = methodAdoptedOf(questionText)
  if (adopted === null) out.push(red('method-consistency', 'question.md §研究方法 缺「- 采用:」行'))
  else if (!methodNameMatches(adopted, protocol.method.id)) {
    out.push(red('method-consistency', `§研究方法「采用」与 method.id 不一致：${adopted}`))
  }
  return out
}

/** plan 头的派生策略行：v1 缺 = warning（旧 bundle 兼容），在场但与派生值不一致 = red；
 * 预算字段存在但不可机检 = red（fail-loud：散文预算不得静默跳过）。 */
function checkStrategy(protocol, planText, topicsText) {
  const line = /^>?\s*-\s*策略\s*[:：]\s*(.+)$/m.exec(planText)?.[1]
  if (line === undefined) return [warn('strategy-missing', 'plan 头缺「- 策略:」派生行（v1 只警告）')]
  const expected = strategyOf({ protocol, planText, topicsText })
  if (expected === null) return []
  const out = []
  const channel = /通道\s*=\s*([a-z]+)/i.exec(line)?.[1]
  if (channel !== undefined && !['team', 'spawn', 'workflow'].includes(channel)) {
    out.push(red('strategy-mismatch', `策略行通道 ${channel} 不在 team/spawn/workflow`))
  }
  const workerRaw = /worker\s*=\s*([^；;\n]+)/.exec(line)?.[1]?.trim()
  const expectedWorker = expected.orchestration.channel === 'workflow'
    ? expected.orchestration.workers.wave
    : expected.orchestration.workers.oneShot
  // 角色名由 plan 拥有（事实源 = presets/），这里只比较 research-* profile id；非 research-*
  // 视为显式角色选择（策略行模板允许 `<research-worker|research-wave|角色>`）。
  const workerToken = workerRaw === undefined ? undefined : /^([a-z][a-z-]*)/i.exec(workerRaw)?.[1]
  if (workerRaw === undefined) {
    out.push(warn('strategy-worker-missing', '策略行缺 worker=（research-worker / research-wave / 角色）'))
  } else if (workerToken !== undefined && workerToken.toLowerCase().startsWith('research-')
    && expectedWorker !== null && workerToken.toLowerCase() !== expectedWorker) {
    out.push(red('strategy-mismatch', `策略行 worker ${workerToken} ≠ 派生 ${expectedWorker}`))
  }
  const budgetRaw = /预算\s*=\s*([^；;\n]+)/.exec(line)?.[1]?.trim()
  if (budgetRaw === undefined) {
    out.push(warn('strategy-budget-missing', '策略行缺 预算=<nodes_max>/<cells_max>/<depths>（投影不完整）'))
  } else {
    // 宽容读取模型常见写法（`≤4 节点 / ≤2 cells`、`nodes 12/cells 12`），但解析不了必须红：
    // 静默跳过 = 投影不可机检（2026-11-11 pilot 实测的 fail-open）。
    const budget = /^\s*(?:≤\s*)?(?:(?:nodes?|节点)\s*)?(\d+)\s*(?:节点|nodes?)?\s*\/\s*(?:≤\s*)?(?:(?:cells?|格)\s*)?(\d+)/.exec(budgetRaw)
    if (budget === null) {
      out.push(red('strategy-budget-unparseable', `策略行预算「${budgetRaw}」读不出 <nodes_max>/<cells_max>（不可静默跳过）`))
    } else if (Number(budget[1]) !== protocol.effort.nodes_max || Number(budget[2]) !== protocol.effort.cells_max) {
      out.push(red('strategy-mismatch', `策略行预算 ${budget[1]}/${budget[2]} ≠ JSON ${protocol.effort.nodes_max}/${protocol.effort.cells_max}`))
    }
  }
  return out
}

function checkProtocolStatus(protocol, questionText) {
  const out = []
  const quick = protocol.gates.hitl1 === 'none'
  if (protocol.status !== 'approved') {
    out.push(red('protocol-status', `status 必须是 approved（当前 ${protocol.status}）`))
    return out
  }
  if (quick) {
    if (protocol.approval_basis !== 'auto') out.push(red('approval-basis', 'quick 必须 approval_basis=auto'))
    return out
  }
  if (protocol.approval_basis !== 'card' && protocol.approval_basis !== 'revision') {
    out.push(red('approval-basis', '非 quick 的 approval_basis 必须是 card 或 revision'))
  }
  const decided = decisionsProtocolVersionOf(questionText)
  if (decided !== protocol.version) {
    out.push(red('protocol-status', `§Decisions 的 protocol: vN 与 JSON 不一致（Decisions=${decided ?? '缺'}）`))
  }
  return out
}

function checkPlanRef(protocol, planText) {
  if (String(planText ?? '').trim() === '') return []
  const version = protocolVersionIn(planText)
  if (version === null) return [red('plan-ref', 'plan.md 缺 protocol: vN 头')]
  if (version !== protocol.version) return [red('plan-ref', `plan.md 的 protocol: v${version} 与 JSON v${protocol.version} 不一致`)]
  return []
}

function checkAudit(protocol, auditText, hasSnapshot) {
  const out = []
  if (protocol.version > 1 && !hasSnapshot) {
    out.push(red('protocol-snapshot', `version=${protocol.version} 但缺 protocol/v${protocol.version - 1}.json 快照`))
  }
  const hash = auditHashOf(auditText, protocol.version)
  if (hash === null) {
    out.push(warn('audit-missing', `protocol-audit.md 无 v${protocol.version} 行（首次 --write 可补）`))
  } else if (hash !== designSha256(protocol)) {
    out.push(red('protocol-changed', `v${protocol.version} 的 design_sha256 与当前 body 不一致`))
  }
  return out
}

const adjustmentText = (item) => (isNonEmptyString(item) ? item : `${item.what}${item.owner ? `（${item.owner}）` : ''}`)

/** §Protocol 投影（question.md）：4 字段行 + 版本 + 指针。 */
export function projectionOf(protocol) {
  const method = isStringArray(protocol.method.adjustments) && protocol.method.adjustments.length > 0
    ? `${protocol.method.id}（主）+ ${protocol.method.adjustments.map(adjustmentText).join('；')}`
    : protocol.method.id
  const families = protocol.source_scope.families.join(' + ')
  const recency = protocol.source_scope.recency ?? '不限'
  const language = protocol.source_scope.language.join('/')
  const band = `${BAND_LABELS[protocol.effort.band]}（≤${protocol.effort.nodes_max} 节点 / ≤${protocol.effort.cells_max} cells / ${protocol.effort.allowed_depths.join('–')}）`
  const output = `${protocol.output.shape}；sections = ${protocol.output.sections.join(' / ')}；audience = ${protocol.output.audience}；${protocol.output.format}`
  const when = protocol.approved_at ?? protocol.created
  return [
    `## Protocol（本次研究设计，v${protocol.version}）`,
    '',
    `- 方法：${method}；四字段见 §研究方法`,
    `- 来源：${families}；${recency}；${language}；${protocol.source_scope.authority}`,
    `- 投入：${band}`,
    `- 输出：${output}`,
    `- 版本：protocol: v${protocol.version}（${protocol.status} ${when}）；全文 = protocol.json / plan.md`,
  ].join('\n')
}

/**
 * 卡文（HITL1，既有文本面；≤200 字的模板证明用）。Lead 按 skill 手写，本函数只供测试/以后投影消费；
 * `question`/`decision` 是 run 语境的自由文本，`authorizedWave` 仅脚本层时传。
 */
export function cardLinesOf({ protocol, question, decision, authorizedWave = null }) {
  const method = isStringArray(protocol.method.adjustments) && protocol.method.adjustments.length > 0
    ? `${protocol.method.id}+${protocol.method.adjustments.map((item) => (isNonEmptyString(item) ? item : item.what).split(/[：:]/)[0]).join('+')}`
    : protocol.method.id
  const recency = protocol.source_scope.recency ?? '不限'
  const lines = [
    `问题：${question}`,
    `方法/来源：${method}；${protocol.source_scope.families.join('+')}，${recency}，${protocol.source_scope.language.join('/')}`,
    `投入/输出：${BAND_LABELS[protocol.effort.band]} ≤${protocol.effort.nodes_max} 节点；${SHAPE_LABELS[protocol.output.shape]}（${protocol.output.audience}）`,
    `决定：${decision}`,
  ]
  if (authorizedWave !== null) lines.push(`授权：${authorizedWave}`)
  lines.push('全文=protocol.json/plan.md（改哪项在修订里说）')
  return lines
}

/** 卡文全文（\n 连接）。 */
export function cardTextOf(options) {
  return cardLinesOf(options).join('\n')
}
