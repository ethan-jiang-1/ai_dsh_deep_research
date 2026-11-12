// protocol-core —— Protocol 纯判据的 keyless 回归（契约 = 核验 §6 + 表达层补篇 §4–§7）。
//
// 覆盖形状：绿基线 + 每条红判据各一例（负例即反证：删掉对应判据/放宽枚举，这些用例会变绿）。
// 另外钉三件写者契约：protocol.json 模板可被 core 解析（占位符下只报 schema 红，不抛）、
// §Protocol 投影的四要素、卡文在真实题面上 ≤200 字。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  BAND_TABLE,
  PROTOCOL_SCHEMA,
  auditHashOf,
  canonicalize,
  countCellsOf,
  decisionsProtocolVersionOf,
  designSha256,
  lensScanOf,
  methodAdoptedOf,
  methodNameMatches,
  preContractByDelivery,
  validateProtocol,
} from '../../scripts/lib/protocol-core.mjs'
import { cardTextOf, evaluateBundle, projectionOf, requiredByProtocolContract } from '../../scripts/lib/protocol-audit-core.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const TEMPLATE = join(ROOT, 'packages', 'deep-research-pack', 'content', 'templates', 'run', 'protocol.json')

const clone = (value) => JSON.parse(JSON.stringify(value))

function baseProtocol(overrides = {}) {
  const protocol = {
    schema: PROTOCOL_SCHEMA,
    version: 1,
    status: 'approved',
    created: '2026-11-11T07:00:00+08:00',
    approved_at: '2026-11-11T07:10:00+08:00',
    approval_basis: 'card',
    method: {
      id: '方案比较',
      kind: 'preset',
      library_name: null,
      library_fields_sha256: null,
      fields: { source: '官方页优先', verify: '同维度对齐', report: '对比表+取舍', limit: '不替用户决定偏好' },
      adjustments: [],
    },
    source_scope: {
      families: ['official', 'web'],
      domains: [],
      exclude_domains: [],
      recency: '12m',
      language: ['zh', 'en'],
      authority: 'primary',
    },
    effort: {
      band: 'standard',
      band_v: BAND_TABLE.standard.band_v,
      nodes_max: BAND_TABLE.standard.nodes_max,
      cells_max: BAND_TABLE.standard.cells_max,
      waves_max: BAND_TABLE.standard.waves_max,
      allowed_depths: [...BAND_TABLE.standard.allowed_depths],
    },
    output: {
      shape: 'comparison_table',
      sections: ['decision', 'options', 'criteria', 'tradeoffs', 'risks'],
      length: { min: 1200, max: 1600, unit: 'words' },
      format: 'md',
      audience: 'CTO',
    },
    gates: {
      hitl1: 'protocol_projection',
      hitl2: 'review',
      evidence_threshold: 'B',
      critic: 'both',
      claim_verification: 'on',
    },
    deviations: [],
  }
  return { ...protocol, ...overrides }
}

const QUESTION_HEAD = `# Question — fixture

## 研究方法（本次实际采用）

- 采用: 方案比较（P5 分派）
- 来源: 推荐接受
- 本次视角: official + quant
- 调查要求: 同维度查证；口径对齐才可比
- 明确不承诺: 不替用户决定偏好
`

function questionOf(protocol, { methodLine = '- 方法: 方案比较（主）；四字段见 §研究方法', bandLine = '- 投入: 标准（≤12 节点 / ≤8 cells / L1–L2）', decisions = true, protocolSection = null } = {}) {
  const lines = [
    QUESTION_HEAD,
    protocolSection ?? `## Protocol（本次研究设计，v${protocol.version}）`,
    '',
  ]
  if (protocolSection === null) {
    lines.push(
      methodLine,
      '- 来源: official + web；近 12 月；zh/en；primary',
      bandLine,
      `- 输出: ${protocol.output.shape}；sections = ${protocol.output.sections.join(' / ')}；audience = ${protocol.output.audience}；md`,
      `- 版本: protocol: v${protocol.version}（approved 2026-11-11T07:10:00+08:00）；全文 = protocol.json / plan.md`,
    )
  }
  lines.push('', '## HITL1 Alignment Snapshot', '', '- 研究类型: exploratory_map')
  if (decisions) {
    lines.push('', '## Decisions（append-only，最新在上）', '', `- 2026-11-11 HITL1 定稿（protocol: v${protocol.version}；按计划开跑）`)
  }
  return lines.join('\n')
}

function planOf(count = 6, { version = 1, depth = 'L1' } = {}) {
  const rows = []
  for (let i = 1; i <= count; i += 1) {
    rows.push(`| W${i}.1 | — | active | deep-dive | q${i} | analyst | — | evidence/t${i}.md | ok | 2 轮 | ${depth} | |`)
  }
  return [
    '# Plan — fixture',
    '',
    `> protocol: v${version}`,
    '',
    '## 节点表',
    '',
    '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows,
  ].join('\n')
}

function topicsOf(cellCount) {
  const cells = Array.from({ length: cellCount }, (_, index) => `lens${index}`)
  return [
    '# Topics — fixture',
    '',
    '## T1: 主问题',
    '',
    '- must_answer:',
    '  - 答什么',
    '- scope_role: primary',
    `- lenses: [${cells.join(', ')}]`,
  ].join('\n')
}

const noRed = (findings) => findings.filter((item) => item.level === 'red')
const codes = (findings) => findings.map((item) => item.code)
const has = (findings, code) => findings.some((item) => item.code === code && item.level === 'red')

test('绿基线：valid protocol + 投影 + plan 头 + Decisions + audit 行 → 无红', () => {
  const protocol = baseProtocol()
  const findings = evaluateBundle({
    protocol,
    questionText: questionOf(protocol),
    planText: planOf(6),
    topicsText: topicsOf(6),
    auditText: `# protocol-audit\n\nv1 design_sha256=${designSha256(protocol)}\n`,
    hasSnapshot: false,
  })
  assert.deepEqual(noRed(findings), [], codes(findings).join(','))
})


// 负例留证 2026-11-12：BUG-077——protocol-audit 的 renderReport 引用 PROTOCOL_CONTRACT_DATE，
// 但 CLI 的 import 被删 → --write 阶段 ReferenceError。还原法 = 删 import 里的该常量。
test('BUG-077 protocol-audit --write：renderReport 引用的契约日常量必须在 import 内', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const source = readFileSync(resolve(root, 'scripts/run-gates/protocol-audit.mjs'), 'utf8')
  assert.match(source, /PROTOCOL_CONTRACT_DATE/ , 'renderReport 仍引用契约日')
  assert.match(source, /import \{[^}]*PROTOCOL_CONTRACT_DATE[^}]*\} from '\.\.\/lib\/protocol-core\.mjs'/,
    'protocol-audit CLI 必须 import PROTOCOL_CONTRACT_DATE（否则 --write ReferenceError）')
})

test('schema：未知顶层字段 / 缺 output → 红', () => {
  const unknown = baseProtocol()
  unknown.extra = true
  assert.ok(has(validateProtocol(unknown), 'protocol-schema'))
  const missing = baseProtocol()
  delete missing.output
  assert.ok(has(validateProtocol(missing), 'protocol-schema'))
})

test('unknown-ref：未知 shape / preset 五条外的方法 → 红', () => {
  const badShape = baseProtocol()
  badShape.output.shape = 'pdf_report'
  assert.ok(has(validateProtocol(badShape), 'unknown-ref'))
  const badMethod = baseProtocol()
  badMethod.method.id = '神秘方法'
  assert.ok(has(validateProtocol(badMethod), 'unknown-ref'))
})

test('method-fields：四字段任一为空 → 红', () => {
  const protocol = baseProtocol()
  protocol.method.fields.verify = '   '
  assert.ok(has(validateProtocol(protocol), 'method-fields'))
})

test('effort-band：band_v 漂移 → 红；声明 cap 高于 band → warning（实际由 effort-contract 卡）', () => {
  const drift = baseProtocol()
  drift.effort.band_v = 99
  assert.ok(has(validateProtocol(drift), 'effort-band'))
  const cap = baseProtocol()
  cap.effort.nodes_max = 28
  const findings = validateProtocol(cap)
  assert.equal(has(findings, 'effort-band'), false, JSON.stringify(findings))
  assert.ok(findings.some((item) => item.code === 'effort-band' && item.level === 'warning'))
})

test('pilot 修订：effort 数字是上限（≤band）、depth 是子集；as-of-capture / adjustments 对象 / critic light 合法', () => {
  const protocol = baseProtocol()
  protocol.effort = { band: 'standard', band_v: 1, nodes_max: 6, cells_max: 4, waves_max: 3, allowed_depths: ['L1', 'L2', 'L3'] }
  protocol.source_scope.recency = 'as-of-capture'
  protocol.method.adjustments = [{ what: '官方域 403 时登记降级', owner: 'analyst' }]
  protocol.gates.critic = 'light'
  const findings = validateProtocol(protocol)
  assert.equal(has(findings, 'effort-band'), false, JSON.stringify(findings))
  assert.equal(has(findings, 'protocol-schema'), false, JSON.stringify(findings))
  assert.equal(has(findings, 'source-scope'), false, JSON.stringify(findings))
  const over = baseProtocol()
  over.effort.nodes_max = 13
  assert.ok(validateProtocol(over).some((item) => item.code === 'effort-band' && item.level === 'warning'))
  assert.ok(has(evaluateBundle({ protocol: over, questionText: questionOf(over), planText: planOf(13), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }), 'effort-contract'))
  const unknownDepth = baseProtocol()
  unknownDepth.effort.allowed_depths = ['L1', 'L9']
  assert.ok(has(validateProtocol(unknownDepth), 'effort-band'))
  const badAdjustment = baseProtocol()
  badAdjustment.method.adjustments = [{ what: '', owner: 'analyst' }]
  assert.ok(has(validateProtocol(badAdjustment), 'protocol-schema'))
})

test('pilot 2 修订：landscape_map / 日期区间 / 学术 family / waves warning', () => {
  const protocol = baseProtocol()
  protocol.effort = { band: 'deep', band_v: 1, nodes_max: 12, cells_max: 12, waves_max: 8, allowed_depths: ['L1', 'L2', 'L3'] }
  protocol.output.shape = 'landscape_map'
  protocol.source_scope.families = ['paper', 'conference', 'benchmark-official']
  protocol.source_scope.recency = '2024-01/2026-11'
  protocol.method.adjustments = [{ what: '条文级摘录', role: 'analyst', lens: 'regulatory' }]
  const findings = validateProtocol(protocol)
  assert.equal(has(findings, 'protocol-schema'), false, JSON.stringify(findings))
  assert.equal(has(findings, 'unknown-ref'), false, JSON.stringify(findings))
  assert.equal(has(findings, 'source-scope'), false, JSON.stringify(findings))
  assert.equal(has(findings, 'effort-band'), false, JSON.stringify(findings))
  assert.ok(findings.some((item) => item.code === 'source-family-unknown' && item.level === 'warning'))
  assert.ok(findings.some((item) => item.code === 'effort-band' && item.level === 'warning'))
})

test('effort-contract：顶层节点超限 / cells 超限 / depth 越带 → 红', () => {
  const protocol = baseProtocol()
  assert.ok(has(evaluateBundle({ protocol, questionText: questionOf(protocol), planText: planOf(13), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }), 'effort-contract'))
  assert.ok(has(evaluateBundle({ protocol, questionText: questionOf(protocol), planText: planOf(6), topicsText: topicsOf(9), auditText: '', hasSnapshot: false }), 'effort-contract'))
  assert.ok(has(evaluateBundle({ protocol, questionText: questionOf(protocol), planText: planOf(6, { depth: 'L3' }), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }), 'effort-contract'))
})

test('output-shape：length 倒挂 / format 非 md → 红', () => {
  const inverted = baseProtocol()
  inverted.output.length = { min: 2000, max: 1000, unit: 'words' }
  assert.ok(has(validateProtocol(inverted), 'output-shape'))
  const pdf = baseProtocol()
  pdf.output.format = 'pdf'
  assert.ok(has(validateProtocol(pdf), 'output-shape'))
})

test('protocol-status：approved 缺 approved_at / Decisions 版本不一致 → 红', () => {
  const noApprovedAt = baseProtocol()
  noApprovedAt.approved_at = null
  assert.ok(has(validateProtocol(noApprovedAt), 'protocol-status'))
  const protocol = baseProtocol()
  assert.ok(has(evaluateBundle({
    protocol,
    questionText: questionOf(protocol, { decisions: false }),
    planText: planOf(6),
    topicsText: topicsOf(6),
    auditText: '',
    hasSnapshot: false,
  }), 'protocol-status'))
})

test('quick：basis=auto + hitl1=none + 无 Decisions → 绿；basis=card → 红', () => {
  const quick = baseProtocol({ effort: { band: 'quick', band_v: 1, nodes_max: 6, cells_max: 2, waves_max: 5, allowed_depths: ['L0', 'L1'] } })
  quick.gates.hitl1 = 'none'
  quick.output = { shape: 'quick_answer', sections: ['answer', 'basis', 'limits'], length: { min: 300, max: 600, unit: 'words' }, format: 'md', audience: '采购' }
  quick.approval_basis = 'auto'
  const ok = evaluateBundle({ protocol: quick, questionText: questionOf(quick, { bandLine: '- 投入: 快答（≤6 节点 / ≤2 cells / L0–L1）', decisions: false }), planText: planOf(2, { depth: 'L1' }), topicsText: topicsOf(2), auditText: '', hasSnapshot: false })
  assert.deepEqual(noRed(ok), [], codes(ok).join(','))
  const bad = clone(quick)
  bad.approval_basis = 'card'
  assert.ok(has(validateProtocol(bad), 'approval-basis'))
})

test('版本与快照：v2 无快照 → 红；audit 行不匹配 → 红', () => {
  const protocol = baseProtocol({ version: 2 })
  assert.ok(has(evaluateBundle({ protocol, questionText: questionOf(protocol), planText: planOf(6, { version: 2 }), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }), 'protocol-snapshot'))
  const changed = evaluateBundle({
    protocol,
    questionText: questionOf(protocol),
    planText: planOf(6, { version: 2 }),
    topicsText: topicsOf(6),
    auditText: 'v2 design_sha256=' + '0'.repeat(64),
    hasSnapshot: true,
  })
  assert.ok(has(changed, 'protocol-changed'))
})

test('projection：缺档位 / 缺 shape → 红', () => {
  const protocol = baseProtocol()
  assert.ok(has(evaluateBundle({ protocol, questionText: questionOf(protocol, { bandLine: '- 投入: 见 plan' }), planText: planOf(6), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }), 'projection'))
  const noShape = questionOf(protocol).replace(protocol.output.shape, 'full_report')
  assert.ok(has(evaluateBundle({ protocol, questionText: noShape, planText: planOf(6), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }), 'projection'))
})

test('projection-number / source / output：§Protocol 的数字与枚举必须与 JSON 一致', () => {
  const protocol = baseProtocol()
  const base = { planText: planOf(6), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }
  const nodes = evaluateBundle({ protocol, questionText: questionOf(protocol, { bandLine: '- 投入: 标准（≤18 节点 / ≤8 cells / L1–L2）' }), ...base })
  assert.ok(has(nodes, 'projection-number'), '节点数漂移（≤18 vs 12）必须红')
  const cells = evaluateBundle({ protocol, questionText: questionOf(protocol, { bandLine: '- 投入: 标准（≤12 节点 / ≤9 cells / L1–L2）' }), ...base })
  assert.ok(has(cells, 'projection-number'), 'cells 漂移必须红')
  const depth = evaluateBundle({ protocol, questionText: questionOf(protocol, { bandLine: '- 投入: 标准（≤12 节点 / ≤8 cells / L1–L3）' }), ...base })
  assert.ok(has(depth, 'projection-number'), '深度带漂移必须红')
  const source = evaluateBundle({ protocol, questionText: questionOf(protocol).replace('- 来源: official + web', '- 来源: official'), ...base })
  assert.ok(has(source, 'projection-source'), '缺 source family 必须红')
  const output = evaluateBundle({ protocol, questionText: questionOf(protocol).replace('sections = decision / options / criteria / tradeoffs / risks', 'sections = decision / options'), ...base })
  assert.ok(has(output, 'projection-output'), '缺 output section 必须红')
})

test('strategy：缺派生行 → warning；在场但与派生值不一致 → 红', () => {
  const protocol = baseProtocol()
  const base = { protocol, questionText: questionOf(protocol), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }
  const missing = evaluateBundle({ ...base, planText: planOf(6) })
  assert.ok(missing.some((item) => item.code === 'strategy-missing'), '旧 plan 缺策略行应只 warning')
  const okLine = planOf(6).replace('> protocol: v1', '> protocol: v1\n> - 策略: 通道=spawn；worker=research-worker；预算=12/8')
  assert.deepEqual(noRed(evaluateBundle({ ...base, planText: okLine })), [])
  const roleLine = planOf(6).replace('> protocol: v1', '> protocol: v1\n> - 策略: 通道=spawn；worker=analyst；预算=12/8')
  assert.deepEqual(noRed(evaluateBundle({ ...base, planText: roleLine })), [], '角色 worker 是合法显式选择')
  const badWorker = planOf(6).replace('> protocol: v1', '> protocol: v1\n> - 策略: 通道=spawn；worker=research-wave；预算=12/8')
  assert.ok(has(evaluateBundle({ ...base, planText: badWorker }), 'strategy-mismatch'), 'spawn 写 research-wave 必须红')
  const badBudget = planOf(6).replace('> protocol: v1', '> protocol: v1\n> - 策略: 通道=spawn；worker=research-worker；预算=18/8')
  assert.ok(has(evaluateBundle({ ...base, planText: badBudget }), 'strategy-mismatch'), '预算漂移必须红')
  const badChannel = planOf(6).replace('> protocol: v1', '> protocol: v1\n> - 策略: 通道=bogus；worker=research-worker；预算=12/8')
  assert.ok(has(evaluateBundle({ ...base, planText: badChannel }), 'strategy-mismatch'), '非法通道必须红')
  const proseBudget = planOf(6).replace('> protocol: v1', '> protocol: v1\n> - 策略: 通道=spawn；worker=research-worker；预算=6 节点 / 11 cells / L1–L2')
  assert.ok(has(evaluateBundle({ ...base, planText: proseBudget }), 'strategy-mismatch'), '带单位的散文预算须解析后对账（6/11 ≠ 12/8）')
  const unreadableBudget = planOf(6).replace('> protocol: v1', '> protocol: v1\n> - 策略: 通道=spawn；worker=research-worker；预算=很多/很少')
  assert.ok(has(evaluateBundle({ ...base, planText: unreadableBudget }), 'strategy-budget-unparseable'), '读不出的预算必须红（不可静默跳过）')
})

// 负例留证 2026-11-11：BUG-048——修复前 deep 档 + projectionOf() 只解析首对（L1–L2）→ 假红；
// allowed_depths 单值 / 非连续时正则不命中 → 深度段整段跳过（写错也绿）。还原法 = 把
// depthsOfText 去掉、投影检查换回 `/L([0-3])\s*[–-]\s*L([0-3])/` 单捕获对。
test('BUG-048 深度投影：生成器写法 / 端点写法 / 单深度 / 非连续都要真正对账', () => {
  const deep = baseProtocol()
  deep.effort = { band: 'deep', band_v: 1, nodes_max: 12, cells_max: 12, waves_max: 7, allowed_depths: ['L1', 'L2', 'L3'] }
  const base = { protocol: deep, planText: planOf(6), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }
  const generated = evaluateBundle({ ...base, questionText: questionOf(deep, { protocolSection: projectionOf(deep) }) })
  assert.equal(has(generated, 'projection-number'), false, `生成器投影应绿：${JSON.stringify(generated)}`)
  const endpoint = evaluateBundle({ ...base, questionText: questionOf(deep, { bandLine: '- 投入: 深度（≤12 节点 / ≤12 cells / L1–L3）' }) })
  assert.equal(has(endpoint, 'projection-number'), false, '端点写法必须继续绿')

  // 单深度 = 生产 archive 两个 bundle 的真实形状（quick / L0 或 L1）
  const quick = baseProtocol({ effort: { band: 'quick', band_v: 1, nodes_max: 4, cells_max: 2, waves_max: 5, allowed_depths: ['L0'] } })
  quick.gates.hitl1 = 'none'
  quick.approval_basis = 'auto'
  quick.output = { shape: 'quick_answer', sections: ['answer', 'basis', 'limits'], length: { min: 300, max: 600, unit: 'words' }, format: 'md', audience: '采购' }
  const quickBase = { protocol: quick, planText: planOf(2, { depth: 'L0' }), topicsText: topicsOf(2), auditText: '', hasSnapshot: false }
  const singleGreen = evaluateBundle({ ...quickBase, questionText: questionOf(quick, { protocolSection: projectionOf(quick), decisions: false }) })
  assert.equal(has(singleGreen, 'projection-number'), false, `单深度 L0 生成器投影应绿：${JSON.stringify(singleGreen)}`)
  const singleRed = evaluateBundle({ ...quickBase, questionText: questionOf(quick, { bandLine: '- 投入: 快答（≤4 节点 / ≤2 cells / L1）', decisions: false }) })
  assert.ok(has(singleRed, 'projection-number'), '单深度 L0 写成 L1 必须红（旧实现整段跳过）')

  // 非连续：L0 + L2 生成器写法绿；写成区间 L0–L2（= L0/L1/L2）必须红
  const nonContig = baseProtocol({ effort: { band: 'deep', band_v: 1, nodes_max: 12, cells_max: 12, waves_max: 7, allowed_depths: ['L0', 'L2'] } })
  const nonBase = { protocol: nonContig, planText: planOf(6, { depth: 'L0' }), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }
  const nonGreen = evaluateBundle({ ...nonBase, questionText: questionOf(nonContig, { protocolSection: projectionOf(nonContig) }) })
  assert.equal(has(nonGreen, 'projection-number'), false, `非连续生成器投影应绿：${JSON.stringify(nonGreen)}`)
  const nonRed = evaluateBundle({ ...nonBase, questionText: questionOf(nonContig, { bandLine: '- 投入: 深度（≤12 节点 / ≤12 cells / L0–L2）' }) })
  assert.ok(has(nonRed, 'projection-number'), '非连续写区间（含未允许的 L1）必须红')
})

// 负例留证 2026-11-11：BUG-049——修复前把「- 来源 / - 投入 / - 输出」任一行删掉，审计零 finding
// （`?? ''` + `if (line !== '')` 把缺席折叠成通过）。还原法 = 删掉投影缺失 warn 三支。
test('BUG-049 §Protocol 的 来源/投入/输出 行缺席 → 至少 warn（不得静默通过）', () => {
  const protocol = baseProtocol()
  const base = { protocol, planText: planOf(6), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }
  const projectionMissing = (findings) => findings.filter((item) => [
    'projection-source-missing', 'projection-effort-missing', 'projection-output-missing',
  ].includes(item.code))
  const full = evaluateBundle({ ...base, questionText: questionOf(protocol) })
  assert.deepEqual(projectionMissing(full), [], `完整投影不应报缺席：${JSON.stringify(full)}`)
  const lines = questionOf(protocol).split('\n')
  const omit = (label) => lines.filter((line) => !new RegExp(`^-\\s*${label}\\s*[:：]`).test(line)).join('\n')
  const cases = [
    ['来源', 'projection-source-missing'],
    ['投入', 'projection-effort-missing'],
    ['输出', 'projection-output-missing'],
  ]
  for (const [label, code] of cases) {
    const findings = evaluateBundle({ ...base, questionText: omit(label) })
    assert.ok(findings.some((item) => item.code === code && item.level === 'warning'), `${label} 行缺席必须 warn：${JSON.stringify(findings)}`)
  }
})

// 负例留证 2026-11-11：BUG-050——修复前策略行缺「通道=」零 finding；声明 workflow 但 plan 无
// Wave 拓扑时派生 workers.wave=null，被当作「无需对账」哨兵 → worker 写什么都绿。还原法 = 删掉
// 通道缺席支与 strategy-workflow-without-wave 支，并把 expectedWorker 改回 null 即跳过。
test('BUG-050 策略行：通道缺席 warn；声明 workflow 但无 Wave 拓扑 red', () => {
  const protocol = baseProtocol()
  const base = { protocol, questionText: questionOf(protocol), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }
  const withLine = (line) => planOf(6).replace('> protocol: v1', `> protocol: v1\n> - 策略: ${line}`)
  const noChannel = evaluateBundle({ ...base, planText: withLine('worker=research-worker；预算=12/8') })
  assert.ok(noChannel.some((item) => item.code === 'strategy-channel-missing' && item.level === 'warning'),
    `通道缺席必须 warn（与 worker/预算缺席对称）：${JSON.stringify(noChannel)}`)
  for (const worker of ['research-worker', 'research-wave']) {
    const findings = evaluateBundle({ ...base, planText: withLine(`通道=workflow；worker=${worker}；预算=12/8`) })
    assert.ok(has(findings, 'strategy-workflow-without-wave'), `workflow 无 Wave（worker=${worker}）必须红：${JSON.stringify(findings)}`)
  }
  // 负对照：有 Wave 拓扑时 research-wave 绿、research-worker 仍红（既有判据不许被新分支绕过）
  const wave = '\n\n## Wave 执行\n\nW2：lens-fanout ×2；executor = research-wave。'
  const waveReady = withLine('通道=workflow；worker=research-wave；预算=12/8') + wave
  assert.deepEqual(noRed(evaluateBundle({ ...base, planText: waveReady })), [], '有 Wave 拓扑 + research-wave 应绿')
  const waveWrongWorker = withLine('通道=workflow；worker=research-worker；预算=12/8') + wave
  assert.ok(has(evaluateBundle({ ...base, planText: waveWrongWorker }), 'strategy-mismatch'), '既有负对照仍须咬人')
})

// 负例留证 2026-11-11：BUG-052——修复前协议审计只看 run.md 的日粒度 created，同日 01:10 交付的
// bundle 被按 10:01 才落地的 D46 契约判红。还原法 = requiredByProtocolContract 去掉 acceptedAt 分支。
test('BUG-052 同日早场：交付回执早于契约落地时刻 → 不判 Protocol；无回执仍从严', () => {
  assert.equal(preContractByDelivery({ acceptedAt: '2026-11-10T17:10:51.321Z' }), true, '01:10 +08 早于 10:01 +08')
  assert.equal(preContractByDelivery({ acceptedAt: '2026-11-11T03:00:00.000Z' }), false, '11:00 +08 晚于契约时刻')
  assert.equal(preContractByDelivery({ acceptedAt: null }), null, '无交付证据 = 不可判定')
  assert.equal(preContractByDelivery({ acceptedAt: 'not-a-date' }), null, '坏时间不猜')
  assert.equal(requiredByProtocolContract({ hasRunMd: true, epoch: '2026-11-11', acceptedAt: '2026-11-10T17:10:51.321Z' }), false,
    '同日早场交付按 legacy：不要求 protocol.json')
  assert.equal(requiredByProtocolContract({ hasRunMd: true, epoch: '2026-11-11', acceptedAt: '2026-11-11T03:00:00.000Z' }), true,
    '契约时刻之后交付仍须 protocol.json')
  assert.equal(requiredByProtocolContract({ hasRunMd: true, epoch: '2026-11-11', acceptedAt: null }), true,
    '无 acceptedAt 可依 → 从严（不许同日全豁免）')
  assert.equal(requiredByProtocolContract({ hasRunMd: false, epoch: null, acceptedAt: null }), false, '旧 bundle 无 run.md 仍豁免')
})

// 负例留证 2026-11-11：BUG-053——修复前 protocolVersionIn / 策略行正则扫全文，正文提及可冒充 plan 头
// （缺头 protocol 判绿、正文策略行让审计零 finding）。还原法 = 两处改回全文匹配。
test('BUG-053 plan 头：正文提及不能冒充头部 protocol 版本行 / 策略行', () => {
  const protocol = baseProtocol()
  const base = { protocol, questionText: questionOf(protocol), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }
  const bodyVersion = `${planOf(6).replace('> protocol: v1\n', '')}\n\n## 备注\n\n- 修订记录：protocol: v1 仍适用\n`
  assert.ok(has(evaluateBundle({ ...base, planText: bodyVersion }), 'plan-ref'),
    '头部缺 protocol 版本行、正文提及 → 必须 red（旧实现绿）')
  const bodyStrategy = `${planOf(6)}\n\n## 备注\n\n- 策略: 通道=spawn；worker=research-worker；预算=12/8\n`
  const bodyFindings = evaluateBundle({ ...base, planText: bodyStrategy })
  assert.ok(bodyFindings.some((item) => item.code === 'strategy-missing'),
    `正文策略行不能冒充头部（至少 warn）：${JSON.stringify(bodyFindings)}`)
  const bareHeader = planOf(6).replace('> protocol: v1', 'protocol: v1')
  assert.deepEqual(noRed(evaluateBundle({ ...base, planText: bareHeader })), [], '头部无 > 前缀的旧写法仍兼容')
})

// 负例留证 2026-11-11：BUG-054——修复前 cells 计数只认行首小写 `- lenses:`；`*`/`+`/缩进/大写均计 0，
// 超 cap 静默通过，且没有「读不出」的红。还原法 = countCellsOf 改回单条 `^-` 正则且删 cells-unparseable。
test('BUG-054 cells：lens 行变体计数一致；读不出 → red（不得计 0 静默放行）', () => {
  const quick = baseProtocol({ effort: { band: 'quick', band_v: 1, nodes_max: 6, cells_max: 2, waves_max: 5, allowed_depths: ['L0', 'L1'] } })
  quick.gates.hitl1 = 'none'
  quick.approval_basis = 'auto'
  quick.output = { shape: 'quick_answer', sections: ['answer', 'basis', 'limits'], length: { min: 300, max: 600, unit: 'words' }, format: 'md', audience: '采购' }
  const base = {
    protocol: quick,
    questionText: questionOf(quick, { protocolSection: projectionOf(quick), decisions: false }),
    planText: planOf(2, { depth: 'L0' }),
    auditText: '',
    hasSnapshot: false,
  }
  const topics = (line) => ['# Topics — fixture', '', '## T1: 主问题', '', line].join('\n')
  for (const [label, line] of [
    ['模板写法', '- lenses: [a, b, c, d]'],
    ['星号清单', '* lenses: [a, b, c, d]'],
    ['加号清单', '+ lenses: [a, b, c, d]'],
    ['缩进清单', '  - lenses: [a, b, c, d]'],
    ['大写字段', '- Lenses: [a, b, c, d]'],
    ['无括号逗号', '- lenses: a, b, c, d'],
  ]) {
    const findings = evaluateBundle({ ...base, topicsText: topics(line) })
    assert.ok(has(findings, 'effort-contract'), `${label} 的 4 lens 超过 quick cap 2 必须红：${JSON.stringify(findings)}`)
  }
  const unparseable = evaluateBundle({ ...base, topicsText: topics('- lenses: [a, b, c, d') })
  assert.ok(has(unparseable, 'cells-unparseable'), `括号不成对的 lens 行必须红（不可计 0）：${JSON.stringify(unparseable)}`)
  assert.deepEqual(lensScanOf('* lenses: [a, b, a]').ids, ['a', 'b'], 'lensIds 与 countCells 同源解析')
})

// 负例留证 2026-11-11：BUG-056——修复前 nodes/cells 正则把 `≤` 写成必要条件、sections 只认
// `sections =`；行在场但读不出时静默跳过。还原法 = 恢复旧正则与 `!== undefined` 守卫。
test('BUG-056 §Protocol 行在场但数值 / 分节读不出 → red（不得跳过）', () => {
  const protocol = baseProtocol()
  const base = { protocol, planText: planOf(6), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }
  const over = evaluateBundle({ ...base, questionText: questionOf(protocol, { bandLine: '- 投入: 18 节点 / 18 cells / L1–L2' }) })
  assert.ok(has(over, 'projection-number'), `无 ≤ 的上限也要解析并对账：${JSON.stringify(over)}`)
  const english = evaluateBundle({ ...base, questionText: questionOf(protocol, { bandLine: '- 投入: 12 nodes / 8 cells / L1–L2' }) })
  assert.equal(has(english, 'projection-number'), false, '英文单位 + 等值上限应绿')
  const bare = evaluateBundle({ ...base, questionText: questionOf(protocol, { bandLine: '- 投入: 12 / 8 / L1–L2' }) })
  assert.ok(has(bare, 'projection-number-unparseable'), `读不出节点/cells 必须红：${JSON.stringify(bare)}`)
  const colon = evaluateBundle({
    ...base,
    questionText: questionOf(protocol).replace('sections = decision / options / criteria / tradeoffs / risks', 'sections: decision'),
  })
  assert.ok(has(colon, 'projection-output'), `sections: 写法要解析并比对（缺 risks）必须红：${JSON.stringify(colon)}`)
  const alias = evaluateBundle({
    ...base,
    questionText: questionOf(protocol).replace('sections = decision / options / criteria / tradeoffs / risks', '分节 = decision'),
  })
  assert.ok(has(alias, 'projection-output-unparseable'), `读不出 sections 必须红：${JSON.stringify(alias)}`)
})

// 负例留证 2026-11-11：BUG-058——修复前 waveCountOf 返回 null（有环）被 checkEffortContract 当作
// 「无需检查」，有环 plan 零 finding。还原法 = 把 waves === null 分支改回 `waves !== null && …`。
test('BUG-058 有环 plan：交付审计 red plan-cycle（不可执行图不得给绿）', () => {
  const protocol = baseProtocol()
  const cyclic = [
    '# Plan — fixture', '', '> protocol: v1', '',
    '## 节点表', '',
    '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    '| W1.1 | — | active | deep-dive | q1 | analyst | W2.1 | evidence/t1.md | ok | 2 轮 | L1 | |',
    '| W2.1 | — | active | deep-dive | q2 | analyst | W1.1 | evidence/t2.md | ok | 2 轮 | L1 | |',
  ].join('\n')
  const base = { protocol, questionText: questionOf(protocol), topicsText: topicsOf(6), auditText: '', hasSnapshot: false }
  assert.ok(has(evaluateBundle({ ...base, planText: cyclic }), 'plan-cycle'), '有环 plan 必须 red')
  assert.equal(has(evaluateBundle({ ...base, planText: planOf(6) }), 'plan-cycle'), false, '无环对照不得误报')
})

test('复合方法：method.id = 主方法，§研究方法 原文包含即通过', () => {
  const protocol = baseProtocol()
  protocol.method.id = '方案比较'
  protocol.method.adjustments = ['领域地图：铺底']
  const question = questionOf(protocol, { methodLine: '- 方法: 方案比较（主）+ 领域地图（铺底）；四字段见 §研究方法' })
    .replace('- 采用: 方案比较（P5 分派）', '- 采用: **方案比较 + 领域地图（维度化对比）合并**')
  const findings = evaluateBundle({ protocol, questionText: question, planText: planOf(6), topicsText: topicsOf(6), auditText: '', hasSnapshot: false })
  assert.deepEqual(noRed(findings), [], codes(findings).join(','))
  assert.equal(methodNameMatches('**方案比较 + 领域地图（维度化对比）合并**', '方案比较'), true)
  assert.equal(methodNameMatches('领域地图 + 方案比较', '方案比较'), true)
  assert.equal(methodNameMatches('领域地图', '方案比较'), false)
  // 盘上 4 个真实复合方法（表达层补篇 §4.1）：主方法 + 补法 → id 用主方法，原文包含即通过。
  const real = [
    ['领域地图 + 方案比较（维度化对比）合并', '领域地图'],
    ['方案比较（P5 分派）为主 + 领域地图铺底', '方案比较'],
    ['方案比较（主）+ 领域地图 + 主张核查', '方案比较'],
    ['领域地图（主）+ 方案比较 + 时间线与信号', '领域地图'],
  ]
  for (const [raw, id] of real) assert.equal(methodNameMatches(raw, id), true, `${raw} → ${id}`)
})

test('canonical / hash：稳定且改一字节即变；元数据不进 design body', () => {
  const protocol = baseProtocol()
  assert.equal(canonicalize({ b: 1, a: 2 }), '{\n  "a": 2,\n  "b": 1\n}\n')
  assert.equal(designSha256(protocol), designSha256({ ...protocol, status: 'draft', approved_at: null, approval_basis: null }))
  assert.equal(designSha256(protocol), designSha256({ ...protocol, created: '2026-01-01T00:00:00+08:00' }))
  assert.notEqual(designSha256(protocol), designSha256({ ...protocol, output: { ...protocol.output, audience: 'CFO' } }))
  assert.equal(typeof designSha256(protocol), 'string')
})

test('卡文：三场真实题面 ≤200 字（含脚本层授权时不删授权）', () => {
  const cases = [
    {
      protocol: baseProtocol(),
      question: 'DeepSeek vs OpenAI API 选型：上下文窗口、价格、限流',
      decision: '主调用供应商；预算未定',
      authorizedWave: 'W2 扇出 ×4',
    },
    {
      protocol: baseProtocol({ effort: { band: 'deep', band_v: 1, nodes_max: 12, cells_max: 12, waves_max: 7, allowed_depths: ['L1', 'L2', 'L3'] }, output: { shape: 'literature_review', sections: ['scope', 'corpus', 'threads', 'gaps', 'refs'], length: { min: 6000, max: 12000, unit: 'words' }, format: 'md', audience: '研究者' } }),
      question: 'LLM 长期记忆的学术图景（2024–2026）',
      decision: '是否立项；语料边界未定',
      authorizedWave: null,
    },
    {
      protocol: baseProtocol({ effort: { band: 'deep', band_v: 1, nodes_max: 12, cells_max: 12, waves_max: 7, allowed_depths: ['L1', 'L2', 'L3'] }, source_scope: { families: ['regulatory', 'official'], domains: ['eur-lex.europa.eu'], exclude_domains: [], recency: '18m', language: ['zh', 'en'], authority: 'primary' } }),
      question: '中欧美 AI 监管对模型提供者的义务对比',
      decision: '合规选型；法域范围待定',
      authorizedWave: 'W3 扇出 ×6',
    },
  ]
  for (const item of cases) {
    const text = cardTextOf(item)
    assert.ok(text.length <= 200, `${item.question} → ${text.length} 字\n${text}`)
  }
})

test('模板：protocol.json 可解析；占位符只报 schema 红、不抛', () => {
  const text = readFileSync(TEMPLATE, 'utf8')
  let parsed
  assert.doesNotThrow(() => { parsed = JSON.parse(text) })
  assert.equal(parsed.schema, PROTOCOL_SCHEMA)
  const findings = validateProtocol(parsed)
  assert.ok(findings.length > 0, '模板占位符应至少报一条 schema 红（提醒填写）')
  assert.equal(typeof parsed.method.fields.source, 'string')
})

test('§Protocol 投影：projectionOf 含 gate 要查的四要素', () => {
  const protocol = baseProtocol()
  const text = projectionOf(protocol)
  assert.ok(text.includes(`protocol: v${protocol.version}`))
  assert.ok(text.includes(protocol.method.id))
  assert.ok(text.includes('标准'))
  assert.ok(text.includes(protocol.output.shape))
  assert.ok(text.includes('protocol.json'))
})

test('辅助解析：methodAdoptedOf / decisionsProtocolVersionOf / countCellsOf / auditHashOf', () => {
  const protocol = baseProtocol()
  assert.equal(methodAdoptedOf(questionOf(protocol)), '方案比较（P5 分派）')
  assert.equal(decisionsProtocolVersionOf(questionOf(protocol)), 1)
  assert.equal(countCellsOf(topicsOf(6)), 6)
  assert.equal(countCellsOf('## T1\n- lenses: [a, b, a]\n## T2\n- lenses: []'), 2)
  assert.equal(auditHashOf('v1 design_sha256=' + 'a'.repeat(64), 1), 'a'.repeat(64))
})

test('legacy / no-protocol：旧 bundle warning 退出，新 bundle 红', () => {
  const legacy = evaluateBundle({ protocol: null, legacy: true })
  assert.deepEqual(legacy.map((item) => item.code), ['legacy-not-applicable'])
  assert.equal(legacy[0].level, 'warning')
  assert.ok(has(evaluateBundle({ protocol: null }), 'no-protocol'))
})

test('deviations：未知维度 / 空 why → 红', () => {
  const protocol = baseProtocol()
  protocol.deviations = [{ dimension: 'style', from: 'a', to: 'b', why: '', authority: 'user' }]
  assert.ok(has(validateProtocol(protocol), 'deviation-shape'))
})

// 负例留证 2026-11-13：BUG-153——protocol/v1.json = {} 也 PASS；历史快照需合法 schema/version/指纹。
test('BUG-153 协议快照内容：空对象/错版 RED，合法 v1 快照 PASS', () => {
  const protocol = baseProtocol({ version: 2 })
  const base = { protocol, questionText: questionOf(protocol), planText: planOf(6, { version: 2 }), topicsText: topicsOf(6), auditText: '', hasSnapshot: true }
  assert.ok(has(evaluateBundle({ ...base, snapshot: {} }), 'protocol-snapshot'))
  const wrong = baseProtocol({ version: 99 })
  assert.ok(has(evaluateBundle({ ...base, snapshot: wrong }), 'protocol-snapshot'))
  const good = evaluateBundle({ ...base, snapshot: baseProtocol() })
  assert.equal(has(good, 'protocol-snapshot'), false, JSON.stringify(good.filter((f) => f.level === 'red')))
})
