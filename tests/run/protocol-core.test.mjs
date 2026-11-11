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
  methodAdoptedOf,
  methodNameMatches,
  validateProtocol,
} from '../../scripts/lib/protocol-core.mjs'
import { cardTextOf, evaluateBundle, projectionOf } from '../../scripts/lib/protocol-audit-core.mjs'

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

function questionOf(protocol, { methodLine = '- 方法: 方案比较（主）；四字段见 §研究方法', bandLine = '- 投入: 标准（≤12 节点 / ≤8 cells / L1–L2）', decisions = true } = {}) {
  const lines = [
    QUESTION_HEAD,
    `## Protocol（本次研究设计，v${protocol.version}）`,
    '',
    methodLine,
    '- 来源: official + web；近 12 月；zh/en；primary',
    bandLine,
    `- 输出: ${protocol.output.shape}；sections = ${protocol.output.sections.join(' / ')}；audience = ${protocol.output.audience}；md`,
    `- 版本: protocol: v${protocol.version}（approved 2026-11-11T07:10:00+08:00）；全文 = protocol.json / plan.md`,
    '',
    '## HITL1 Alignment Snapshot',
    '',
    '- 研究类型: exploratory_map',
  ]
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
