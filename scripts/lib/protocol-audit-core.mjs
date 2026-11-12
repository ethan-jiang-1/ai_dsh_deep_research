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
  PROTOCOL_CONTRACT_DATE,
  SHAPE_LABELS,
  auditHashOf,
  decisionsProtocolVersionOf,
  depthsOfText,
  depthsTextOf,
  designSha256,
  headerBlockOf,
  lensScanOf,
  methodAdoptedOf,
  methodNameMatches,
  preContractByDelivery,
  protocolVersionIn,
  sectionOf,
  validateProtocol,
  waveCountOf,
} from './protocol-core.mjs'

const red = (code, message) => ({ code, level: 'red', message })
const warn = (code, message) => ({ code, level: 'warning', message })
const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== ''
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string')

/** 是否要求本 bundle 带 protocol.json（CLI 与测试共用这一份）：
 *  `forced` 强制；无 run.md = 旧 bundle；交付回执早于契约落地时刻 = legacy（同日早场，BUG-052）；
 *  其余按 epoch 日期；无 acceptedAt 可依 → 从严（不许同日全豁免）。 */
export function requiredByProtocolContract({ hasRunMd = true, epoch = null, acceptedAt = null, forced = false } = {}) {
  if (forced) return true
  if (!hasRunMd) return false
  if (preContractByDelivery({ acceptedAt }) === true) return false
  return typeof epoch === 'string' && epoch !== '' && epoch >= PROTOCOL_CONTRACT_DATE
}

/** bundle 级判据：schema + effort 合同 + 投影 + 批准链 + plan 引用 + audit/hash + 快照。 */
export function evaluateBundle(input) {
  const {
    protocol = null,
    questionText = '',
    planText = '',
    topicsText = '',
    auditText = '',
    hasSnapshot = false,
    snapshot = null,
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
    ...checkAudit(protocol, auditText, hasSnapshot, snapshot),
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
  const lensScan = lensScanOf(topicsText)
  for (const line of lensScan.unparsable) {
    out.push(red('cells-unparseable', `topics lens 行读不出 [ids]：${line.slice(0, 120)}`))
  }
  const cells = lensScan.cells
  const cellCeiling = Math.min(protocol.effort.cells_max, band?.cells_max ?? protocol.effort.cells_max)
  if (cells > cellCeiling) {
    out.push(red('effort-contract', `topics lens 总数 ${cells} > 上限 ${cellCeiling}（protocol ${protocol.effort.cells_max} / band ${band?.cells_max ?? '—'}）`))
  }
  const waves = waveCountOf(index)
  if (waves === null) {
    out.push(red('plan-cycle', 'plan 依赖图有环，不可执行——审查回边用版本化节点（repair-rN / review-rN），重编号不能解环'))
  } else if (waves > protocol.effort.waves_max) {
    out.push(warn('effort-contract', `Wave 层数 ${waves} > waves_max ${protocol.effort.waves_max}（不拦交付）`))
  }
  return out
}

/** §Protocol 一行字段的值；行缺席或只有空白 → null（「没有」与「为空」同一判定，不折叠成通过）。 */
function projectionLineOf(section, label) {
  const value = new RegExp(`^-\\s*${label}\\s*[:：]\\s*(.*)$`, 'm').exec(section)?.[1]?.trim() ?? ''
  return value === '' ? null : value
}

/** §Protocol 里可核的数字/枚举：投入节点/cells/深度、来源 families、输出 sections。
 *  行缺席 = warning（v1 兼容；旧 bundle 不整片变红），行在但值漂移 = red——缺席不再被
 *  `?? ''` + `if (line !== '')` 静默折叠（BUG-049 的失败类）。 */
function checkProjectionDetails(protocol, section) {
  const out = []
  const bandLine = projectionLineOf(section, '投入')
  if (bandLine === null) {
    out.push(warn('projection-effort-missing', '§Protocol 缺「- 投入：」行——节点 / cells / 深度无从对账（v1 兼容：warning）'))
  } else {
    // 单位写法宽容（`≤10 顶层节点`、`12 nodes`、`8 cells`），但行在场却读不出 = 红：
    // 解析失败不得退化成「跳过」（BUG-056；与 depthsOfText === null → 红同档）。
    const nodes = /(?:≤\s*)?(\d+)\s*(?:顶层\s*)?(?:节点|nodes?)/i.exec(bandLine)
    const cells = /(?:≤\s*)?(\d+)\s*(?:cells?|格)/i.exec(bandLine)
    if (nodes === null || cells === null) {
      out.push(red('projection-number-unparseable', `§Protocol 投入行读不出节点/cells 上限（行在但不可机检）：${bandLine.slice(0, 80)}`))
    } else {
      // 投入是声明上限：投影低于 JSON = 更紧的承诺，允许；高于 JSON = 假声明，红。
      if (Number(nodes[1]) > protocol.effort.nodes_max) {
        out.push(red('projection-number', `§Protocol 投入节点 ${nodes[1]} > JSON nodes_max ${protocol.effort.nodes_max}`))
      }
      if (Number(cells[1]) > protocol.effort.cells_max) {
        out.push(red('projection-number', `§Protocol 投入 cells ${cells[1]} > JSON cells_max ${protocol.effort.cells_max}`))
      }
    }
    const depths = depthsOfText(bandLine)
    if (depths === null) {
      out.push(red('projection-number', '§Protocol 投入行读不出深度集合（模板要求 Lx–Ly；单值 / 非连续写 Lx / Ly）'))
    } else {
      const expected = new Set(protocol.effort.allowed_depths)
      const mismatch = [...depths].some((depth) => !expected.has(depth))
        || [...expected].some((depth) => !depths.has(depth))
      if (mismatch) {
        out.push(red('projection-number', `§Protocol 投入深度 ${[...depths].join(',')} ≠ JSON allowed_depths ${protocol.effort.allowed_depths.join(',')}`))
      }
    }
  }
  const sourceLine = projectionLineOf(section, '来源')
  if (sourceLine === null) {
    out.push(warn('projection-source-missing', '§Protocol 缺「- 来源：」行——source families 无从对账（v1 兼容：warning）'))
  } else {
    const lower = sourceLine.toLowerCase()
    for (const family of protocol.source_scope.families) {
      if (!lower.includes(String(family).toLowerCase())) out.push(red('projection-source', `§Protocol 来源缺 family ${family}`))
    }
  }
  const outputLine = projectionLineOf(section, '输出')
  if (outputLine === null) {
    out.push(warn('projection-output-missing', '§Protocol 缺「- 输出：」行——output.sections 无从对账（v1 兼容：warning）'))
  } else {
    // `sections = …` 与 `sections: …` 都接受；行在场却读不出 sections = 红（BUG-056）。
    const sectionList = /sections\s*[=:：]\s*([^；;\n]+)/i.exec(outputLine)?.[1]
    if (sectionList === undefined) {
      out.push(red('projection-output-unparseable', `§Protocol 输出行读不出 sections（行在但不可机检）：${outputLine.slice(0, 80)}`))
    } else {
      const lower = sectionList.toLowerCase()
      for (const name of protocol.output.sections) {
        if (!lower.includes(String(name).toLowerCase())) out.push(red('projection-output', `§Protocol 输出缺 section ${name}`))
      }
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
 *  预算字段存在但不可机检 = red（fail-loud：散文预算不得静默跳过）。
 *  通道缺席 = warning（与 worker/预算缺席对称）；声明 workflow 但 plan 无 Wave 拓扑 = red
 *  （null 不得同时被当作「没有拓扑」与「无需对账」，BUG-050 的失败类）。 */
function checkStrategy(protocol, planText, topicsText) {
  // 「头」= 首个 `##` 之前；正文 `## 备注` 里的同形列表项不能冒充派生行（BUG-053）。
  const line = /^>?\s*-\s*策略\s*[:：]\s*(.+)$/m.exec(headerBlockOf(planText))?.[1]
  if (line === undefined) return [warn('strategy-missing', 'plan 头缺「- 策略:」派生行（v1 只警告）')]
  const expected = strategyOf({ protocol, planText, topicsText })
  if (expected === null) return []
  const out = []
  const channelRaw = /通道\s*=\s*([a-z]+)/i.exec(line)?.[1]?.toLowerCase()
  if (channelRaw === undefined) {
    out.push(warn('strategy-channel-missing', '策略行缺 通道=（team/spawn/workflow；缺席时按 plan 文本猜派生值，读者无从复核）'))
  } else if (!['team', 'spawn', 'workflow'].includes(channelRaw)) {
    out.push(red('strategy-mismatch', `策略行通道 ${channelRaw} 不在 team/spawn/workflow`))
  }
  // 对账用「声明优先、缺席用派生」的通道；派生值仅作缺席时的兜底，且上面已告警。
  const channel = channelRaw ?? expected.orchestration.channel
  if (channel === 'workflow' && expected.orchestration.workers.wave === null) {
    out.push(red('strategy-workflow-without-wave', '策略行声明 workflow 但 plan 无「## Wave 执行」拓扑（不可执行；worker 无从落实）'))
  }
  const workerRaw = /worker\s*=\s*([^；;\n]+)/.exec(line)?.[1]?.trim()
  // workflow 分支的期望值是 research-wave 而不是 workers.wave：拓扑缺席已由上一支判红，
  // 这里不能再用 null 当「跳过对账」的哨兵（否则 worker 写什么都绿）。
  const expectedWorker = channel === 'workflow' ? 'research-wave' : expected.orchestration.workers.oneShot
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
  // plan.md 缺席不在这里判：交付件在场门归 schema-scan（必备件清单含 plan.md）——本函数只对
  // 「在场 plan 的版本头」对账；缺席静默是分工，不是漏洞（BUG-049 顺带核对结论）。
  if (String(planText ?? '').trim() === '') return []
  // 「头」= 首个 `##` 之前：正文提及 `protocol: vN` 不能冒充头版本行（BUG-053）。
  const version = protocolVersionIn(headerBlockOf(planText))
  if (version === null) return [red('plan-ref', 'plan.md 缺 protocol: vN 头')]
  if (version !== protocol.version) return [red('plan-ref', `plan.md 的 protocol: v${version} 与 JSON v${protocol.version} 不一致`)]
  return []
}

function checkAudit(protocol, auditText, hasSnapshot, snapshot) {
  const out = []
  if (protocol.version > 1) {
    if (!hasSnapshot) {
      out.push(red('protocol-snapshot', `version=${protocol.version} 但缺 protocol/v${protocol.version - 1}.json 快照`))
    } else if (!isObject(snapshot)) {
      out.push(red('protocol-snapshot', `protocol/v${protocol.version - 1}.json 不可解析或不是对象`))
    } else {
      // 历史快照的 deviations 等字段可能按旧 schema 自由书写——不套当前严格校验；
      // 只校验「是完整协议文档」的最小结构（BUG-153：{} / 缺字段仍红）。
      const missing = ['schema', 'version', 'status', 'created', 'method', 'source_scope', 'effort', 'output', 'gates', 'deviations']
        .filter((key) => snapshot[key] === undefined || snapshot[key] === null)
      if (missing.length > 0) {
        out.push(red('protocol-snapshot', `protocol/v${protocol.version - 1}.json 缺协议字段：${missing.join(',')}`))
      }
      if (snapshot.version !== protocol.version - 1) {
        out.push(red('protocol-snapshot', `快照 version=${String(snapshot.version)}，期望 ${protocol.version - 1}`))
      }
      const priorHash = auditHashOf(auditText, protocol.version - 1)
      if (priorHash !== null && priorHash !== designSha256(snapshot)) {
        out.push(red('protocol-snapshot', `v${protocol.version - 1} 的 design_sha256 与快照内容不一致`))
      }
    }
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
  const band = `${BAND_LABELS[protocol.effort.band]}（≤${protocol.effort.nodes_max} 节点 / ≤${protocol.effort.cells_max} cells / ${depthsTextOf(protocol.effort.allowed_depths)}）`
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
