// node-gate-leads —— 门L（leads.md 方向/分级/覆盖/断代）与 BUG-038 分级判据。
// 路径/断代助手 = node-gate-helpers.mjs。
import test from 'node:test'
import assert from 'node:assert/strict'
import { gateBundle } from '../../../checks/lib/gates/node-gate-core.mjs'
import { leadsGate } from '../../../checks/lib/gates/node-gate-run-gates.mjs'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bundle } from './node-gate-helpers.mjs'

const L = (name, date) => gateBundle(bundle(name), undefined, { leadsDate: date }).gates.leads
const L3 = (name, date) => gateBundle(bundle(name), undefined, { leadsDate: date }).gates.leads


test('门L 健康：字段齐 + 覆盖齐（2 挖深盖 T1/T2，1 排除带原因，T3 synthesis 免检）→ PASS', () => {
  const g = L('fixture-leads-healthy', '2026-10-04')
  assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
})

test('门L 反证：方向节缺 状态: 行 → RED', () => {
  const g = L('fixture-leads-missing-status', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /状态/)
})

test('门L 反证：状态值不在合法集（待定）→ RED', () => {
  const g = L('fixture-leads-bad-status', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /非法|合法/)
})

test('门L 反证：建议挖深缺支持来源（收集而不分级反模式）→ RED', () => {
  const g = L('fixture-leads-dig-missing-source', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /支持来源/)
})

test('门L 反证：已排除无原因（静默放弃反模式）→ RED', () => {
  const g = L('fixture-leads-excluded-no-reason', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /原因/)
})

test('门L 反证：primary topic 无任何建议挖深 lead 指向（覆盖缺口）→ RED', () => {
  const g = L('fixture-leads-coverage-gap', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /T1/)
})

test('门L 防空语料：leads.md 在场但 0 个方向节 → RED', () => {
  const g = L('fixture-leads-empty', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /0|零|空/)
})

test('门L 豁免：quick_factual（question.md 类型在场）→ N/A（条件件，不静默）', () => {
  const g = L('fixture-leads-quickfactual', '2026-10-04')
  assert.equal(g.status, 'N/A')
  assert.match(g.detail, /quick_factual|豁免/)
})

test('门L 在场级不越界：leads.md 缺席（非豁免型）→ N/A（schema-scan 领地）', () => {
  const g = L('fixture-leads-absent', '2026-10-04')
  assert.equal(g.status, 'N/A')
})

test('门L 断代：契约前交付日 → 违约如实报告计 PRE-CONTRACT 不计红', () => {
  const g = L('fixture-leads-bad-status', '2026-10-02')
  assert.equal(g.status, 'PRE-CONTRACT')
  const r = gateBundle(bundle('fixture-leads-bad-status'), undefined, { leadsDate: '2026-10-02' })
  assert.equal(r.red, false, '契约前不计红（run bundle 是交付记录，不改历史）')
})

test('门L 隔离性：leads RED 不连坐交付两门（各自 N/A 如实呈现）', () => {
  const r = gateBundle(bundle('fixture-leads-bad-status'), undefined, { leadsDate: '2026-10-04' })
  assert.equal(r.gates.leads.status, 'RED')
  assert.equal(r.gates.hitl2Row.status, 'N/A', 'final/ 不在场——门③无对象')
  assert.equal(r.gates.present.status, 'N/A', 'final.md 不在场——门②无对象')
})

// ── 门④（版本记账门，v2；RFC 2026-09-28-wave2-synthesis-polish）──────────────

test('门L 断代：0 节防空语料路径也走断代（契约前自由体 leads.md → PRE-CONTRACT 不计红）', () => {
  const g = L('fixture-leads-empty', '2026-10-02')
  assert.equal(g.status, 'PRE-CONTRACT', '0 节早退分支不得跳过断代（selfhosted/siliconflow 实测抓出）')
  const r = gateBundle(bundle('fixture-leads-empty'), undefined, { leadsDate: '2026-10-02' })
  assert.equal(r.red, false)
})

// ── 门L v3（不变量口径；RFC 2026-10-04-gate-l-invariant；leads-topic-shape 毕业判断落地）
// 三形态契约夹具 = 三场验收 run 实测形态的微缩：h3 方向轴（假阳性回归钉——旧判据把字段齐
// 的 h3 单元数成 0）/ 实体轴字段齐（轴自由钉）/ 实体轴·底稿零字段（真违约钉——字段缺失
// 必须被抓，轴自由 ≠ 免检）。判据：门守"字段齐方向单元 ≥1"不变量，组织轴不判。──

test('门L v3 假阳性回归：h3 层级的方向节（字段齐）→ PASS——旧判据数不出即假红', () => {
  const g = L3('fixture-leads-h3-directions', '2026-10-04')
  assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
  assert.match(g.detail, /字段齐方向单元/)
})

test('门L v3 轴自由：实体轴组织（字段齐）→ PASS——门不判组织轴', () => {
  const g = L3('fixture-leads-entity-axis', '2026-10-04')
  assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
})

test('门L v3 真违约钉：实体轴但零字段行 → RED（字段缺失必须被抓——轴自由 ≠ 免检）', () => {
  const g = L3('fixture-leads-entity-no-fields', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /字段齐的方向单元/)
})

test('门L v3 真违约钉：过程底稿组织（无任何字段行）→ RED——coding-agent 第五场形态', () => {
  const g = L3('fixture-leads-checklist', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /字段齐的方向单元/)
})

// ── 门①（HITL 锚点门，2026-10-05；BUG-006 实证反证）──
// 夹具留证 2026-10-09：BUG-006——永久负例 = fixtures/node-gate 的「question.md 在场而关联会话零
//   ask」场景组（`s-no-ask`；夹具语义由本测试钉住）；hitlAskGate 判据松化（零签名也判 PASS）→ 门①反证测红。

// 负例留证 2026-10-18：BUG-038 把门L 的分级判据改回 `/[(（]\s*[ABCD]\b/`（不剥加粗强调）→
//   本文件「加粗/逗号分隔的分级算已分级」例红；还原 → 绿。
test('门L分级判据：加粗/逗号分隔的分级算已分级；真无分级仍判红（BUG-038）', () => {
  const r = leadsGate(bundle('fixture-leads-bold-grade'), '2026-10-09');
  const flat = JSON.stringify(r);
  assert.doesNotMatch(flat, /A1[^"]*无 A–D 分级|A1｜加粗分级[^"]*无 A–D 分级/, '加粗分级不得被判"未分级"');
  assert.match(flat, /A2｜真无分级[\s\S]{0,80}无 A–D 分级/, '真无分级的条目必须仍判红（红灯形态保住）');
});

// 负例留证 2026-11-24：BUG-421——覆盖判据的前提是 topic 声明 `scope_role`；删掉这一行后
// requiredCount 变成 0，门从 RED 退化成 PASS（「覆盖 0/0」），等于一个字段就能关掉覆盖门。
// 红配方：把 scope_role 的必填判据删掉（allow 缺省 = 免检）。
test('BUG-421：topics 缺 scope_role → RED（判据前提不得为空）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'leads-421-'))
  try {
    writeFileSync(join(dir, 'topics.md'), [
      '## T1: 通道', '', '- must_answer:', '  - 当前版本号', '  - 上一修订', '- depends_on: 无', '',
      '## T2: 口径', '', '- must_answer:', '  - 总量', '  - 分页', '- depends_on: T1', '',
    ].join('\n'), 'utf8')
    writeFileSync(join(dir, 'leads.md'), [
      '## 方向: T1 官方定价', '', '- 状态: 建议挖深', '- 支持来源: 官方页（A）', '',
      '## 方向: T2 第三方口径', '', '- 状态: 建议挖深', '- 支持来源: 第三方（B）', '',
    ].join('\n'), 'utf8')
    const gate = leadsGate(dir)
    assert.equal(gate.status, 'RED', `缺 scope_role 必须红（实际 ${gate.status}：${gate.detail}）`)
    assert.match(gate.detail, /scope_role/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// 负控：显式 `synthesis` 的 topic 不要求覆盖（合法的「无需侦察对应」），覆盖判据只对
// primary/comparison 生效——放宽不得变成「任何 topic 都要求覆盖」。
test('BUG-421 负控：显式 synthesis 角色不进入覆盖要求（0/0 合法但仍 PASS）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'leads-421b-'))
  try {
    writeFileSync(join(dir, 'topics.md'), [
      '## T1: 综述', '', '- must_answer:', '  - 结论一', '  - 结论二', '- scope_role: synthesis', '- depends_on: 无', '',
    ].join('\n'), 'utf8')
    writeFileSync(join(dir, 'leads.md'), [
      '## 方向: 综述素材', '', '- 状态: 已排除（无需独立侦察）', '',
    ].join('\n'), 'utf8')
    const gate = leadsGate(dir)
    assert.equal(gate.status, 'PASS', `synthesis 免检：${gate.detail}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// 负例留证 2026-11-28：BUG-467——leadsGate 只读 `- 支持来源:` 单行，来源写成缩进多行子列表时
// 冒号同行为空、子列表里的 (A)/(B) 未扫到导致误红。红配方：把多行采集退回单行 match → 正例红。
test('BUG-467：leadsGate 支持多行缩进子列表 `- 支持来源:` 的 A–D 分级，无分级多行仍判 RED', () => {
  const dir = mkdtempSync(join(tmpdir(), 'leads-467-'))
  try {
    writeFileSync(join(dir, 'topics.md'), [
      '## T1: 监管面',
      '',
      '- must_answer:',
      '  - 管制清单',
      '  - 适用范围',
      '- scope_role: primary',
      '- depends_on: 无',
    ].join('\n'), 'utf8')
    writeFileSync(join(dir, 'leads.md'), [
      '### 0.2 主体状态：实体清单',
      '- 状态: 建议挖深（T1 起点）',
      '- 支持来源:',
      '  - [BIS 指南](https://www.bis.gov/doc.pdf)（B；PDF）[tier: primary]',
      '  - [Federal Register](https://www.federalregister.gov/doc)（A）[tier: primary]',
      '- 关键线索: 监管原文点名范围',
      '- 建议 owner: analyst（对应 topic: T1）',
    ].join('\n'), 'utf8')
    const pass = leadsGate(dir, '2026-11-28')
    assert.equal(pass.status, 'PASS', `多行缩进子列表含 (A)/(B) 必须 PASS：${pass.detail}`)

    // 负控：多行缩进子列表确实无 A–D 分级（就算后面别的字段里出现 (A) 也不得串行凑绿）
    writeFileSync(join(dir, 'leads.md'), [
      '### 0.2 主体状态：无分级多行',
      '- 状态: 建议挖深（T1 起点）',
      '- 支持来源:',
      '  - [某网页](https://example.com/1) [tier: primary]',
      '  - [另一页](https://example.com/2)',
      '- 关键线索: 仅列链接无分级（A 类场景讨论）',
      '- 建议 owner: analyst（对应 topic: T1）',
    ].join('\n'), 'utf8')
    const red = leadsGate(dir, '2026-11-28')
    assert.equal(red.status, 'RED', `无分级多行支持来源仍必须 RED：${red.detail}`)
    assert.match(red.detail, /无 A–D 分级/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
