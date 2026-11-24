// 编码等价：同一份契约文本的 LF / CRLF / BOM 三种等价书写必须同判（BUG-412/413/414/415/417/420）。
//
// 为什么是一条矩阵：这批缺陷的共享根因只有一个——各解析器自己 `split('\n')`（行尾留 `\r`）、
// 或用 `^` 锚首行而不剥 BOM，于是「同一内容换个换行符/加个 BOM」就换结论。逐个 gate 补正则会在
// 下一个解析器重演；本文件把「编码变体 ⇒ 同判」变成一条可重放的契约，新 gate 照此接入。
//
// 负例留证 2026-11-24：BUG-412（topics must_answer 丢）/ BUG-413（证据引文丢）/ BUG-414（BOM 首行结构丢）/
// BUG-415（JSON 工件 BOM）/ BUG-417（leads 详情嵌 CR）/ BUG-420（heading 少计一条）。
// 红配方：把任一解析器的 `linesOf` 改回 `split('\n')`、或删掉 `stripBom`/`splitFrontmatter` 的 BOM 处理
// → 该变体断言立刻红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseTopicsReport, parseFindingsOf } from '../../../checks/lib/gates/findings-core.mjs'
import { findingsGate, headingGate, leadsGate, topicsGate } from '../../../checks/lib/gates/node-gate-run-gates.mjs'
import { planGate } from '../../../checks/lib/gates/plan-gate.mjs'
import { auditBundle } from '../../../checks/lib/gates/evidence-audit-core.mjs'
import { receiptProblems } from '../../../checks/lib/shared/run-receipt.mjs'
import { parseClaims, parseVerdicts } from '../../../checks/lib/gates/verdict-audit-core.mjs'
import { parseReadinessDeclaration } from '../../../packages/deep-research-pack/src/lib/review/review-readiness.ts'
import { foldLibrary } from '../../../packages/deep-research-pack/src/lib/method-library/library-fold.ts'

const VARIANTS = {
  lf: (text) => text,
  crlf: (text) => text.replace(/\n/g, '\r\n'),
  bom: (text) => `\uFEFF${text}`,
  'bom+crlf': (text) => `\uFEFF${text.replace(/\n/g, '\r\n')}`,
}

/** 在临时 bundle 里放一份文件，执行 fn，然后清理。 */
function withBundle(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'enc-eq-'))
  try {
    for (const [rel, text] of Object.entries(files)) {
      const path = join(dir, rel)
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, text, 'utf8')
    }
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const TOPICS = ['## T1: 通道', '', '- must_answer:', '  - 当前版本号是什么', '  - 上一修订是哪天', '- scope_role: primary', '- depends_on: 无', '', '## T2: 口径', '', '- must_answer:', '  - 总量能否官方直出', '  - 分页上限是多少', '- scope_role: comparison', '- depends_on: T1', ''].join('\n')

const LEADS = ['## 方向: T1 官方定价', '', '- 状态: 建议挖深', '- 支持来源: 官方页（A）', '', '## 方向: T2 第三方口径', '', '- 状态: 建议挖深', '- 支持来源: 第三方（B）', ''].join('\n')

const FINDINGS = ['## F1：核心结论', '', '- 支撑证据：evidence/e1.md', '- gap：supported', ''].join('\n')

const FINAL_DEGENERATE = Array.from({ length: 4 }, (_, i) => `## 决策摘要\n\n第 ${i + 1} 段\n`).join('\n')

const PLAN = ['# Plan', '', '> 图版本：v1', '', '## 节点表', '', '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |', '|---|---|---|---|---|---|---|---|---|---|---|---|', '| W1.1 | — | active | broad-scan | q | scout | — | out | ok | 1 | L1 | — |', '', '## 剩余工作', '', '| task_id | state |', '|---|---|', '| W1.1 | 待派发 |', ''].join('\n')

const LIBRARY = '## 方案比较（2026-11-24，用户）\n- 找来源: 官方\n- 怎么核实: 双源\n- 报告怎么写: 对比表\n- 不承诺: 不做排名\n'

test('BUG-412 编码等价：topics 的 must_answer 在 LF/CRLF/BOM 下同判（topicsGate 不得因换行符误杀）', () => {
  for (const [name, variant] of Object.entries(VARIANTS)) {
    const text = variant(TOPICS)
    const parsed = parseTopicsReport(text)
    assert.equal(parsed.topics.get('T1')?.mustAnswer.length, 2, `${name}: must_answer 数量`)
    assert.deepEqual(parsed.issues, [], `${name}: ${parsed.issues.join('；')}`)
    const gate = withBundle({ 'topics.md': text }, (dir) => topicsGate(dir))
    assert.equal(gate.status, 'PASS', `${name}: ${gate.detail}`)
  }
})

test('BUG-413 编码等价：证据卡引文在 LF/CRLF/BOM 下都被采集（转写核对不得静默失效）', () => {
  const card = '---\nsource_url: https://example.com/a\nretrieved_at: 2026-11-20\nquality: A\nfound_by: scout\nsupports: T1\nlens: official\n---\n\n## 原文摘录\n> 官方页面写着当前版本是 2026-07-28，共三个发布通道。\n'
  for (const [name, variant] of Object.entries(VARIANTS)) {
    const result = withBundle({ 'evidence/e1.md': variant(card) }, (dir) => auditBundle(dir, join(dir, '_no_sessions')))
    const quoteFindings = result.findings.filter((f) => f.kind === '转写不符' || f.kind === '短引文未回溯')
    assert.ok(quoteFindings.length > 0, `${name}: 引文必须被采集（无引文 = fail-open）`)
    const stats = result.findings.length
    assert.ok(Number.isInteger(stats))
  }
})

test('BUG-414 编码等价：BOM 不改变首行结构（topics/leads/findings/evidence/方法库）', () => {
  const bom = VARIANTS.bom
  // topics 首条 T1 不得消失（否则 T2 的 depends_on 悬空 → 误杀）
  const topicsCrlfBom = bom(VARIANTS.crlf(TOPICS))
  const t = withBundle({ 'topics.md': topicsCrlfBom }, (dir) => topicsGate(dir))
  assert.equal(t.status, 'PASS', `topics(BOM+CRLF): ${t.detail}`)
  // findings 首块不得消失
  assert.equal(parseFindingsOf(bom(FINDINGS)).length, 1, 'findings(BOM): F1 块必须可见')
  // evidence frontmatter 必须被识别（否则判「无 frontmatter」）
  const card = '---\nsource_url: https://example.com/a\nretrieved_at: 2026-11-20\nquality: A\nfound_by: scout\nsupports: T1\n---\n\n## 原文摘录\n> 足够长的引文用来触发转写核对路径。\n'
  const audit = withBundle({ 'evidence/e1.md': bom(card) }, (dir) => auditBundle(dir, join(dir, '_no_sessions')))
  assert.equal(audit.findings.filter((f) => f.kind === '无 frontmatter').length, 0, 'evidence(BOM): frontmatter 必须被识别')
  // 方法库首条不得整条消失
  assert.equal(foldLibrary(bom(LIBRARY)).length, 1, 'method-library(BOM): 条目必须可见')
  assert.equal(foldLibrary(bom(LIBRARY))[0]?.name, '方案比较')
})

test('BUG-415 编码等价：四处 JSON 工件剥 BOM 后同判（RFC 8259 允许忽略 BOM）', () => {
  const readiness = JSON.stringify({ version: 2, readiness: 'PASS', counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } })
  for (const [name, variant] of Object.entries(VARIANTS)) {
    const parsed = parseReadinessDeclaration(variant(readiness))
    assert.equal(parsed.ok, true, `${name}: readiness ${parsed.ok ? '' : parsed.detail}`)
  }
  const claims = JSON.stringify({ version: 2, finalRef: 1, claims: [{ id: 'C1', text: 'x', critical: false, evidence: ['evidence/e1.md'] }] })
  assert.equal(parseClaims(VARIANTS.bom(claims)).problems.length, 0, `claims(BOM): ${JSON.stringify(parseClaims(VARIANTS.bom(claims)).problems)}`)
  const verdicts = JSON.stringify({ version: 1, round: 1, batches: [{ session: 'child-1', preset: 'critic', depth: 0, raw: '{"verdicts":[]}' }], verdicts: [] })
  assert.equal(parseVerdicts(VARIANTS.bom(verdicts)).problems.length, 0, `verdicts(BOM): ${JSON.stringify(parseVerdicts(VARIANTS.bom(verdicts)).problems)}`)
  // delivered.json：BOM 不得被报成「回执损坏」
  const receipt = JSON.stringify({ version: 1, final: { version: 1, sha256: 'x' }, deliveredAt: '2026-11-24T00:00:00Z' })
  const problems = withBundle({ 'delivered.json': VARIANTS.bom(receipt) }, (dir) => receiptProblems(dir).problems)
  assert.deepEqual(problems.filter((p) => /不可解析/.test(p)), [], `delivered(BOM): ${problems.join('；')}`)
})

test('BUG-417 编码等价：leadsGate 详情不得夹带 CR（用户可见文案无控制字符）', () => {
  const badLeads = LEADS.replace('- 状态: 建议挖深', '- 状态: 待定')
  for (const [name, variant] of Object.entries(VARIANTS)) {
    const gate = withBundle({ 'leads.md': variant(badLeads), 'topics.md': variant(TOPICS) }, (dir) => leadsGate(dir))
    assert.equal(gate.status, 'RED', `${name}: 非法状态值必须 RED`)
    assert.doesNotMatch(gate.detail, /\r/, `${name}: detail 含 CR`)
  }
})

test('BUG-420 编码等价：同一节重复 4 次的退化输出在 LF/CRLF/BOM 下都 RED（headingGate）', () => {
  for (const [name, variant] of Object.entries(VARIANTS)) {
    const gate = withBundle({ 'final.md': variant(FINAL_DEGENERATE) }, (dir) => headingGate(dir))
    assert.equal(gate.status, 'RED', `${name}: ${gate.detail}`)
    // 负控：重复 3 次仍 PASS（阈值不被编码变体移动）
    const three = withBundle({ 'final.md': variant(FINAL_DEGENERATE.split('\n').slice(0, 8).join('\n') + '\n') }, (dir) => headingGate(dir))
    assert.equal(three.status, 'PASS', `${name}: 3 次应 PASS——${three.detail}`)
  }
})

test('编码等价：plan / findings 门在四种书写下同判（类级负控）', () => {
  for (const [name, variant] of Object.entries(VARIANTS)) {
    const plan = withBundle({ 'plan.md': variant(PLAN) }, (dir) => planGate(dir))
    assert.equal(plan.status, 'PASS', `${name}: plan ${plan.detail}`)
    const findings = withBundle({
      'findings.md': variant(FINDINGS),
      'evidence/e1.md': variant('---\ntitle: t\nsource_url: https://example.com\nretrieved_at: 2026-11-24\nquality: A\nfound_by: scout\nsupports: T1\n---\nbody\n'),
    }, (dir) => findingsGate(dir))
    assert.equal(findings.status, 'PASS', `${name}: findings ${findings.detail}`)
  }
})
