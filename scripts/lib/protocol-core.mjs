// protocol-core.mjs — Protocol（一次 run 的研究设计）的**schema 半**：枚举 / canonical / hash /
// validateProtocol / §研究方法 与 §Decisions 的解析。无 IO、无会话、无 gate 副作用。
// bundle 级判据（effort 合同 / 投影 / 批准链 / audit / 版本）在 protocol-audit-core.mjs。
//
// 为什么单独成模块：同一份合同有多个消费面（CLI gate、keyless 测试、以后驾驶舱/导出工具）——口径只能
// 有一份。纯函数 = keyless 可测；bundle 读取与 legacy 判定归 protocol-audit.mjs。
//
// 口径正本 = _backlog/_archived/research/preference-layer/2026-11-11-preference-protocol-verification.md §6
// + 2026-11-11-preference-protocol-expression.md §4–§7（approval_basis / 复合方法 / 投影与卡）。
//
// 边界：
// - 不写 hash、不写 audit 文件；hash 只在这里算，audit 由 CLI 落。
// - 不核 quote/claim/coverage/output 终稿语义（v2；critic 审）。
// - 不改 plan 形状：effort 只读 plan/topics 的既有字段，不要求 cell 列。

import { createHash } from 'node:crypto'
import { isActivePlanNode } from '../../packages/deep-research-pack/src/lib/plan-index.ts'

/** 本工具的 Protocol schema 版本（整数契约）。 */
export const PROTOCOL_SCHEMA = 1

/** 契约日：此日及以后的 bundle 必须带 protocol.json；之前按 epoch 豁免。 */
export const PROTOCOL_CONTRACT_DATE = '2026-11-11'

/** 契约落地时刻（D46 提交 17e866d，2026-11-11T10:01:02+08:00）：同日早于此时刻交付的 bundle
 *  仍是旧 bundle——日期串 `>=` 分不出同日早场/晚场（BUG-052）。 */
export const PROTOCOL_CONTRACT_AT = '2026-11-11T10:01:02+08:00'

/** 交付回执时间是否早于契约落地时刻；返回 true/false，无可用证据 → null（调用方回退日期口径）。 */
export function preContractByDelivery({ acceptedAt = null, contractAt = PROTOCOL_CONTRACT_AT } = {}) {
  if (typeof acceptedAt !== 'string' || acceptedAt.trim() === '') return null
  const delivered = Date.parse(acceptedAt)
  const contract = Date.parse(contractAt)
  if (!Number.isFinite(delivered) || !Number.isFinite(contract)) return null
  return delivered < contract
}

/** 方法预设闭集（D25/D37 的五条；自定义/库条目走 kind=custom|library）。 */
export const METHOD_PRESETS = ['事实核查', '领域地图', '主张核查', '方案比较', '时间线与信号']

/** 方法来源：内置预设 / 用户方法库 / 用户自定义。 */
export const METHOD_KINDS = ['preset', 'library', 'custom']

/** 输出形状闭集（不是文件模板目录）。 */
export const OUTPUT_SHAPES = ['quick_answer', 'full_report', 'one_page_memo', 'comparison_table', 'timeline', 'literature_review', 'landscape_map']

/** 来源家族闭集；新增 family = 改本表 + 测试（值级增长，不是 schema 版本）。 */
export const SOURCE_FAMILIES = ['official', 'web', 'academic', 'regulatory', 'practitioner', 'local']

/** 权威度偏好；`primary` = 一手优先，`secondary` = 权威二手可接受，`any` = 不设门槛。 */
export const AUTHORITIES = ['primary', 'secondary', 'any']

/** Protocol 生命周期。 */
export const STATUSES = ['draft', 'approved', 'superseded']

/** 批准类型：卡上开跑 / 用户修订后直接开工 / quick 自动采用；draft 时为 null。 */
export const APPROVAL_BASES = ['card', 'revision', 'auto']

/** effort band 表（v1 写死；`band_v` pin 住这张表）。 */
export const BAND_TABLE = Object.freeze({
  quick: Object.freeze({ band_v: 1, nodes_max: 6, cells_max: 2, waves_max: 5, allowed_depths: Object.freeze(['L0', 'L1']) }),
  standard: Object.freeze({ band_v: 1, nodes_max: 12, cells_max: 8, waves_max: 6, allowed_depths: Object.freeze(['L1', 'L2']) }),
  deep: Object.freeze({ band_v: 1, nodes_max: 12, cells_max: 12, waves_max: 7, allowed_depths: Object.freeze(['L1', 'L2', 'L3']) }),
})

/** 档位的中文投影（卡 / §Protocol 用；gate 做字符串包含判断）。 */
export const BAND_LABELS = Object.freeze({ quick: '快答', standard: '标准', deep: '深度' })

/** 输出形状的中文短标签（卡用；§Protocol 仍写枚举值）。 */
export const SHAPE_LABELS = Object.freeze({
  quick_answer: '快答',
  full_report: '完整报告',
  one_page_memo: '一页备忘',
  comparison_table: '对比表',
  timeline: '时间线',
  literature_review: '文献综述',
  landscape_map: '全景地图',
})

/** 门的 policy 枚举（不作为用户偏好开放）。 */
export const GATE_ENUMS = Object.freeze({
  hitl1: Object.freeze(['protocol_projection', 'none']),
  hitl2: Object.freeze(['review', 'none']),
  evidence_threshold: Object.freeze(['A', 'B', 'C']),
  critic: Object.freeze(['report', 'claim', 'both', 'none', 'light']),
  claim_verification: Object.freeze(['on', 'off']),
})

/** 偏离维度与 authority。 */
export const DEVIATION_DIMENSIONS = ['method', 'source_scope', 'effort', 'output', 'gates']
export const DEVIATION_DIMENSION_PATTERN = /^(?:method|source_scope|effort|output|gates)(?:\.[a-z_]+)?$/
export const DEVIATION_AUTHORITIES = ['user', 'library', 'method', 'type_default', 'system', 'lead']

const TOP_KEYS = ['schema', 'version', 'status', 'created', 'approved_at', 'approval_basis', 'method', 'source_scope', 'effort', 'output', 'gates', 'deviations']
const METHOD_KEYS = ['id', 'kind', 'library_name', 'library_fields_sha256', 'fields', 'adjustments']
const METHOD_FIELDS = ['source', 'verify', 'report', 'limit']
const SOURCE_KEYS = ['families', 'domains', 'exclude_domains', 'recency', 'language', 'authority']
const EFFORT_KEYS = ['band', 'band_v', 'nodes_max', 'cells_max', 'waves_max', 'allowed_depths']
const OUTPUT_KEYS = ['shape', 'sections', 'length', 'format', 'audience']
const LENGTH_KEYS = ['min', 'max', 'unit']
const DEVIATION_KEYS = ['dimension', 'from', 'to', 'why', 'authority']
export const DEPTHS = ['L0', 'L1', 'L2', 'L3']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i
const RECENCY = /^\d+(?:d|w|m|y)$/
const RECENCY_RANGE = /^\d{4}-\d{2}(?:-\d{2})?\/\d{4}-\d{2}(?:-\d{2})?$/
const LANGUAGE = /^[a-z]{2}(?:-[A-Za-z]{2,})?$/
const SHA256 = /^[0-9a-f]{64}$/

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isString = (value) => typeof value === 'string'
const isNonEmptyString = (value) => isString(value) && value.trim() !== ''
const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string')

const red = (code, message) => ({ code, level: 'red', message })
const warn = (code, message) => ({ code, level: 'warning', message })

/** 深排序：key 递归字典序（数组保序）。canonical JSON 的唯一定义。 */
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted)
  if (isObject(value)) {
    const out = {}
    for (const key of Object.keys(value).sort()) out[key] = sorted(value[key])
    return out
  }
  return value
}

/** canonical JSON：key 递归排序、2 空格缩进、UTF-8、结尾一个换行、无尾随空白。 */
export function canonicalize(value) {
  return `${JSON.stringify(sorted(value), null, 2)}\n`
}

/** design body = 设计内容（不含 status/approved_at/approval_basis/created 等元数据）。 */
export function designBodyOf(protocol) {
  if (!isObject(protocol)) return null
  return {
    schema: protocol.schema,
    version: protocol.version,
    method: protocol.method,
    source_scope: protocol.source_scope,
    effort: protocol.effort,
    output: protocol.output,
    gates: protocol.gates,
    deviations: protocol.deviations,
  }
}

/** design_sha256 = sha256(canonical(design body))。 */
export function designSha256(protocol) {
  const body = designBodyOf(protocol)
  if (body === null) return null
  return createHash('sha256').update(canonicalize(body), 'utf8').digest('hex')
}

/** 方法名一致性：§研究方法 的「采用」原文包含 method.id（复合方法 = 主方法 + 补法）。 */
export function methodNameMatches(adoptedRaw, methodId) {
  if (!isNonEmptyString(adoptedRaw) || !isNonEmptyString(methodId)) return false
  const flat = adoptedRaw.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim()
  return flat.includes(methodId.trim())
}

/** 从 question.md 抽「§研究方法」的「采用」行原文；缺席 → null。 */
export function methodAdoptedOf(questionText) {
  const section = sectionOf(questionText, /^##\s*研究方法/m)
  if (section === null) return null
  const line = /^-\s*采用\s*[:：]\s*(.+)$/m.exec(section)
  return line?.[1]?.trim() ?? null
}

/** 从 question.md 抽「§Decisions」里的 protocol 版本号；缺席 → null。 */
export function decisionsProtocolVersionOf(questionText) {
  const section = sectionOf(questionText, /^##\s*Decisions/m)
  if (section === null) return null
  return protocolVersionIn(section)
}

/** 文本中第一个 `protocol: vN` 的 N；缺席 → null。 */
export function protocolVersionIn(text) {
  const match = /protocol\s*[:：]\s*v(\d+)/i.exec(String(text ?? ''))
  return match === null ? null : Number(match[1])
}

/** 取一个 markdown 二级节（从标题行到下一个 `## `）；缺席 → null。 */
export function sectionOf(text, heading) {
  const source = String(text ?? '')
  const lines = source.split(/\r?\n/)
  const start = lines.findIndex((line) => heading.test(line))
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^##\s/.test(line))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n')
}

/** plan 的「头」= 首个 `## ` 之前的文本（标题/引用块/头部列表项）；无 `##` → 全文。
 *  「头字段」判据必须走这里：全文搜索会让正文提及冒充头部（BUG-053）。 */
export function headerBlockOf(text) {
  const lines = String(text ?? '').split(/\r?\n/)
  const end = lines.findIndex((line) => /^##\s/.test(line))
  return (end === -1 ? lines : lines.slice(0, end)).join('\n')
}

/** 深度集合 → 投影文本（编码唯一正本；检查器用 depthsOfText 反解）：连续集合写端点区间
 *  `L1–L3`（模板与手写习惯），非连续写显式集合 `L0 / L2`（不能写区间——L0–L2 会读成含 L1），
 *  单值原样。生成器与检查器共用本函数，不再各自拼串/拆串。 */
export function depthsTextOf(depths) {
  const values = new Set((Array.isArray(depths) ? depths : [])
    .map((depth) => String(depth).trim().toUpperCase()))
  const ordered = DEPTHS.filter((depth) => values.has(depth))
  if (ordered.length === 0) return ''
  if (ordered.length === 1) return ordered[0]
  const indices = ordered.map((depth) => DEPTHS.indexOf(depth))
  const contiguous = indices.every((value, index) => index === 0 || value === indices[index - 1] + 1)
  return contiguous ? `${ordered[0]}–${ordered.at(-1)}` : ordered.join(' / ')
}

/** 投影深度段 → 深度集合；读不出 → null。与 depthsTextOf 对称：
 *  单 token = 单值；恰两个 token 以 –/- 连接 = 闭区间（模板端点写法 Lx–Ly）；
 *  其余形态（三 token 生成器写法 L1–L2–L3、显式集合 `L0 / L2`）= token 集合。
 *  非连续集合必须写显式集合；把 L0 / L2 写成 L0–L2 会按区间读成 {L0,L1,L2} → 判红（fail-loud）。 */
export function depthsOfText(text) {
  const span = /L[0-3](?:\s*(?:[–-]|\/|、|,|，)\s*L[0-3])*/i.exec(String(text ?? ''))?.[0]
  if (span === undefined) return null
  const tokens = [...new Set([...span.matchAll(/L[0-3]/gi)].map((match) => match[0].toUpperCase()))]
  if (tokens.length === 0) return null
  if (tokens.length === 1) return new Set(tokens)
  if (tokens.length === 2 && !/[\/、,，]/.test(span) && /[–-]/.test(span)) {
    const [start, end] = tokens.map((token) => DEPTHS.indexOf(token)).sort((a, b) => a - b)
    return new Set(DEPTHS.slice(start, end + 1))
  }
  return new Set(tokens)
}

/** topics.md 的 lens 行扫描（**单一解析正本**，countCellsOf 与 strategyOf 共用）：
 *  - ids：全局去重保序（投影的 knowledge.lenses）；
 *  - cells：逐行去重后求和（同模板口径：同一 section 内重复不重复计）；
 *  - unparsable：看起来像 lens 声明（列表符 + lenses + 冒号）但读不出 `[...]` 的行。
 *  列表符接受 `-` / `*` / `+`、前导缩进、大小写 `Lenses`——Markdown 变体不得静默计 0。 */
export function lensScanOf(topicsText) {
  const text = String(topicsText ?? '').replace(/<!--[\s\S]*?-->/g, '')
  const ids = []
  const unparsable = []
  let cells = 0
  for (const line of text.split(/\r?\n/)) {
    const declaration = /^\s*[-*+]\s+lenses\s*[:：]\s*(.*)$/i.exec(line)
    if (declaration === null) {
      if (/^\s*[-*+]\s+lenses\b/i.test(line)) unparsable.push(line.trim())
      continue
    }
    const raw = declaration[1].trim()
    const bracket = /^\[(.*)\]$/.exec(raw)
    // 括号形态必须成对：`[a, b` / `[a, b]]` 读不出 → unparsable，不猜。
    if (bracket === null && /[[\]]/.test(raw)) {
      unparsable.push(line.trim())
      continue
    }
    // 无括号是历史简写（真实场 `- lenses: official`）与逗号列表；空值才是读不出。
    // 括号形态的 `[]` 是合法的零 lens 行（不参与计数，但不是解析失败）。
    const payload = bracket === null ? raw : bracket[1]
    if (payload === '' && bracket === null) {
      unparsable.push(line.trim())
      continue
    }
    const lineIds = [...new Set(payload.split(/[,，]/).map((id) => id.trim()).filter(Boolean))]
    for (const id of lineIds) if (!ids.includes(id)) ids.push(id)
    cells += lineIds.length
  }
  return { cells, ids, unparsable }
}

/** topics.md 的 lens 总数（`- lenses: [a, b]` 逐行去重后求和；无该行 = 0）。
 *  读不出的 lens 行不是 0：由 protocol-audit 的 `cells-unparseable` 判红（见 lensScanOf.unparsable）。 */
export function countCellsOf(topicsText) {
  return lensScanOf(topicsText).cells
}

/** 由 deps 算 Wave 层数（只用于 waves_max warning）；有环 → null。 */
export function waveCountOf(index) {
  const nodes = (index?.nodes ?? []).filter(isActivePlanNode)
  if (nodes.length === 0) return 0
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const memo = new Map()
  const visiting = new Set()
  const layerOf = (id) => {
    if (memo.has(id)) return memo.get(id)
    if (visiting.has(id)) return null
    visiting.add(id)
    const node = byId.get(id)
    const deps = (node?.deps ?? []).filter((dep) => byId.has(dep))
    let layer = 0
    for (const dep of deps) {
      const value = layerOf(dep)
      if (value === null) { visiting.delete(id); return null }
      layer = Math.max(layer, value + 1)
    }
    visiting.delete(id)
    memo.set(id, layer)
    return layer
  }
  let max = 0
  for (const node of nodes) {
    const layer = layerOf(node.id)
    if (layer === null) return null
    max = Math.max(max, layer)
  }
  return max + 1
}

/** audit 文本中当前版本行的 design_sha256；缺席 → null。 */
export function auditHashOf(auditText, version) {
  const match = new RegExp(`v${Number(version)}\\s+design_sha256=([0-9a-f]{64})`, 'i').exec(String(auditText ?? ''))
  return match?.[1] ?? null
}

/** 严格 schema 校验（纯形状；返回 findings，不抛）。 */
export function validateProtocol(protocol) {
  const out = []
  if (!isObject(protocol)) return [red('protocol-schema', 'protocol.json 不是对象')]
  checkKeys(out, protocol, TOP_KEYS, 'protocol-schema', '顶层')
  if (protocol.schema !== PROTOCOL_SCHEMA) out.push(red('protocol-schema', `schema 必须是 ${PROTOCOL_SCHEMA}`))
  if (!Number.isInteger(protocol.version) || protocol.version < 1) out.push(red('protocol-schema', 'version 必须是正整数'))
  if (!STATUSES.includes(protocol.status)) out.push(red('protocol-schema', `status 不在闭集：${protocol.status}`))
  if (!isString(protocol.created) || !ISO_DATE.test(protocol.created)) out.push(red('protocol-schema', 'created 必须是 ISO 时间'))
  if (protocol.approved_at !== null && (!isString(protocol.approved_at) || !ISO_DATE.test(protocol.approved_at))) {
    out.push(red('protocol-schema', 'approved_at 必须是 null 或 ISO 时间'))
  }
  if (protocol.approval_basis !== null && !APPROVAL_BASES.includes(protocol.approval_basis)) {
    out.push(red('protocol-schema', `approval_basis 不在闭集：${protocol.approval_basis}`))
  }
  validateMethod(out, protocol.method)
  validateSourceScope(out, protocol.source_scope)
  validateEffort(out, protocol.effort)
  validateOutput(out, protocol.output)
  validateGates(out, protocol.gates)
  validateDeviations(out, protocol.deviations)
  validateApproval(out, protocol)
  return out
}

function checkKeys(out, value, keys, code, label) {
  if (!isObject(value)) { out.push(red(code, `${label}不是对象`)); return false }
  const unknown = Object.keys(value).filter((key) => !keys.includes(key))
  const missing = keys.filter((key) => !(key in value))
  if (unknown.length > 0) out.push(red(code, `${label}有未知字段：${unknown.join(', ')}`))
  if (missing.length > 0) out.push(red(code, `${label}缺字段：${missing.join(', ')}`))
  return unknown.length === 0 && missing.length === 0
}

function validateMethod(out, method) {
  if (!checkKeys(out, method, METHOD_KEYS, 'protocol-schema', 'method ')) return
  if (!isNonEmptyString(method.id)) out.push(red('protocol-schema', 'method.id 不能为空'))
  if (!METHOD_KINDS.includes(method.kind)) out.push(red('protocol-schema', `method.kind 不在闭集：${method.kind}`))
  if (method.kind === 'preset' && !METHOD_PRESETS.includes(method.id)) {
    out.push(red('unknown-ref', `method.id 不是内置五条：${method.id}`))
  }
  if (method.kind === 'library' && !isNonEmptyString(method.library_name)) {
    out.push(red('method-fields', 'kind=library 时必须写 library_name'))
  }
  if (method.library_name !== null && !isNonEmptyString(method.library_name)) {
    out.push(red('protocol-schema', 'library_name 必须是 null 或非空字符串'))
  }
  if (method.library_fields_sha256 !== null && !SHA256.test(String(method.library_fields_sha256))) {
    out.push(red('protocol-schema', 'library_fields_sha256 必须是 null 或 64 位 hex'))
  }
  if (!checkKeys(out, method.fields, METHOD_FIELDS, 'method-fields', 'method.fields ')) {
    // 缺字段已记红；仍尽量核非空
  }
  for (const key of METHOD_FIELDS) {
    if (!isNonEmptyString(method.fields?.[key])) out.push(red('method-fields', `method.fields.${key} 不能为空`))
  }
  if (!Array.isArray(method.adjustments)) {
    out.push(red('protocol-schema', 'method.adjustments 必须是数组'))
  } else {
    for (const [index, item] of method.adjustments.entries()) {
      if (isNonEmptyString(item)) continue
      if (isObject(item) && isNonEmptyString(item.what)
        && [item.owner, item.role, item.lens].every((value) => value === undefined || isNonEmptyString(value))) {
        const unknown = Object.keys(item).filter((key) => !['what', 'owner', 'role', 'lens'].includes(key))
        if (unknown.length > 0) out.push(red('protocol-schema', `adjustments[${index}] 有未知字段：${unknown.join(', ')}`))
        continue
      }
      out.push(red('protocol-schema', `adjustments[${index}] 必须是字符串或 {what, owner?}`))
    }
  }
}

function validateSourceScope(out, scope) {
  if (!checkKeys(out, scope, SOURCE_KEYS, 'protocol-schema', 'source_scope ')) return
  if (!Array.isArray(scope.families) || scope.families.length === 0) {
    out.push(red('source-scope', 'source_scope.families 至少一个'))
  } else {
    for (const family of scope.families) {
      if (!/^[a-z][a-z0-9-]*$/.test(family)) out.push(red('source-scope', `source family 必须是 slug：${family}`))
      else if (!SOURCE_FAMILIES.includes(family)) out.push(warn('source-family-unknown', `source family 不在推荐集（可接受，提示）：${family}`))
    }
    if (new Set(scope.families).size !== scope.families.length) out.push(red('source-scope', 'families 有重复'))
  }
  for (const key of ['domains', 'exclude_domains']) {
    const list = scope[key]
    if (!isStringArray(list)) { out.push(red('source-scope', `${key} 必须是字符串数组`)); continue }
    for (const host of list) if (!HOST.test(host)) out.push(red('source-scope', `${key} 只收 host（不带 scheme/path）：${host}`))
  }
  if (scope.recency !== null && scope.recency !== 'as-of-capture' && !RECENCY.test(String(scope.recency)) && !RECENCY_RANGE.test(String(scope.recency))) {
    out.push(red('source-scope', 'recency 必须是 null / as-of-capture / \\d+(d|w|m|y) / YYYY-MM/YYYY-MM'))
  }
  if (!isStringArray(scope.language) || scope.language.length === 0) {
    out.push(red('source-scope', 'language 至少一个'))
  } else {
    for (const language of scope.language) if (!LANGUAGE.test(language)) out.push(red('source-scope', `语言代码不合法：${language}`))
  }
  if (!AUTHORITIES.includes(scope.authority)) out.push(red('source-scope', `authority 不在闭集：${scope.authority}`))
}

function validateEffort(out, effort) {
  if (!checkKeys(out, effort, EFFORT_KEYS, 'protocol-schema', 'effort ')) return
  const band = BAND_TABLE[effort.band]
  if (band === undefined) { out.push(red('effort-band', `未知 band：${effort.band}`)); return }
  if (effort.band_v !== band.band_v) out.push(red('effort-band', `band_v 与 band 表不一致（期望 ${band.band_v}）`))
  // 数字是**声明上限**（字段名即 *_max）：可以比 band 更紧，也可以留更高 headroom；真正的
  // 执行面由 effort-contract 按 min(声明 cap, band 上限) 卡 plan 顶层 / topics cells 实际值。
  // 超过 band 的声明只 warning（pilot 2：deep 声明 16、实际 plan 12 仍守 band 12）。
  for (const key of ['nodes_max', 'cells_max']) {
    const value = effort[key]
    if (!Number.isInteger(value) || value < 0) out.push(red('effort-band', `${key} 必须是非负整数`))
    else if (value > band[key]) out.push(warn('effort-band', `${key} 声明高于 band（${band[key]}）——实际 plan/topics 仍按 band 校验`))
  }
  if (!Number.isInteger(effort.waves_max) || effort.waves_max < 0) out.push(red('effort-band', 'waves_max 必须是非负整数'))
  else if (effort.waves_max > band.waves_max) out.push(warn('effort-band', `waves_max 超过 band 参考（${band.waves_max}）——warning，不拦`))
  if (!Number.isInteger(effort.nodes_max) || effort.nodes_max < 1) out.push(red('effort-band', 'nodes_max 至少 1'))
  // depth 是设计轴，不是 band 的克隆：非空子集 ⊆ L0–L3；band 表的值是默认/参考。
  if (!Array.isArray(effort.allowed_depths) || effort.allowed_depths.length === 0) {
    out.push(red('effort-band', 'allowed_depths 非空'))
  } else {
    if (new Set(effort.allowed_depths).size !== effort.allowed_depths.length) out.push(red('effort-band', 'allowed_depths 有重复'))
    for (const depth of effort.allowed_depths) if (!DEPTHS.includes(depth)) out.push(red('effort-band', `未知 depth：${depth}`))
  }
}

function validateOutput(out, output) {
  if (!checkKeys(out, output, OUTPUT_KEYS, 'protocol-schema', 'output ')) return
  if (!OUTPUT_SHAPES.includes(output.shape)) out.push(red('unknown-ref', `未知 output.shape：${output.shape}`))
  if (!isStringArray(output.sections) || output.sections.length === 0) {
    out.push(red('output-shape', 'output.sections 至少一个'))
  } else {
    if (new Set(output.sections).size !== output.sections.length) out.push(red('output-shape', 'sections 有重复'))
    if (output.sections.some((section) => section.trim() === '')) out.push(red('output-shape', 'sections 不能含空串'))
  }
  if (output.length !== null) {
    if (!checkKeys(out, output.length, LENGTH_KEYS, 'output-shape', 'output.length ')) {
      // 缺字段已记红
    } else {
      const { min, max, unit } = output.length
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < 0) out.push(red('output-shape', 'length.min/max 必须是非负整数'))
      else if (min > max) out.push(red('output-shape', 'length.min 不能大于 max'))
      if (!['words', 'pages'].includes(unit)) out.push(red('output-shape', `length.unit 不在闭集：${unit}`))
    }
  }
  if (output.format !== 'md') out.push(red('output-shape', 'v1 output.format 只允许 md'))
  if (!isNonEmptyString(output.audience)) out.push(red('output-shape', 'output.audience 不能为空'))
}

function validateGates(out, gates) {
  if (!checkKeys(out, gates, Object.keys(GATE_ENUMS), 'protocol-schema', 'gates ')) return
  for (const [key, values] of Object.entries(GATE_ENUMS)) {
    if (!values.includes(gates[key])) out.push(red('protocol-schema', `gates.${key} 不在闭集：${gates[key]}`))
  }
}

function validateDeviations(out, deviations) {
  if (!Array.isArray(deviations)) { out.push(red('protocol-schema', 'deviations 必须是数组')); return }
  for (const [index, item] of deviations.entries()) {
    if (!checkKeys(out, item, DEVIATION_KEYS, 'deviation-shape', `deviations[${index}] `)) continue
    if (!DEVIATION_DIMENSION_PATTERN.test(String(item.dimension))) out.push(red('deviation-shape', `deviations[${index}].dimension 必须是 method/source_scope/effort/output/gates 或其子路径`))
    for (const key of ['from', 'to', 'why']) {
      if (!isNonEmptyString(item[key])) out.push(red('deviation-shape', `deviations[${index}].${key} 不能为空`))
    }
    if (!DEVIATION_AUTHORITIES.includes(item.authority)) out.push(red('deviation-shape', `deviations[${index}].authority 不在闭集`))
  }
}

function validateApproval(out, protocol) {
  const approved = protocol.status === 'approved' || protocol.status === 'superseded'
  if (protocol.status === 'draft') {
    if (protocol.approved_at !== null) out.push(red('approval-basis', 'draft 的 approved_at 必须是 null'))
    if (protocol.approval_basis !== null) out.push(red('approval-basis', 'draft 的 approval_basis 必须是 null'))
    return
  }
  if (!approved) return
  if (protocol.approved_at === null) out.push(red('protocol-status', 'approved 必须有 approved_at'))
  if (protocol.approval_basis === null) out.push(red('approval-basis', 'approved 必须有 approval_basis'))
  const quick = protocol.gates?.hitl1 === 'none'
  if (quick && protocol.approval_basis !== 'auto') out.push(red('approval-basis', 'quick（hitl1=none）必须 approval_basis=auto'))
  if (!quick && protocol.approval_basis === 'auto') out.push(red('approval-basis', '非 quick 不能 approval_basis=auto'))
}
