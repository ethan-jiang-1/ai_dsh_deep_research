// node-gate-leads —— 门L（leads.md 方向/分级/覆盖/断代）与 BUG-038 分级判据。
// 路径/断代助手 = node-gate-helpers.mjs。
import test from 'node:test'
import assert from 'node:assert/strict'
import { basename, dirname, join } from 'node:path'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { gateBundle } from '../../scripts/lib/node-gate-core.mjs'
import { decisionsLines } from '../../scripts/lib/node-gate-contracts.mjs'
import { headingGate, leadsGate } from '../../scripts/lib/node-gate-run-gates.mjs'
import { hitl2RowGate, isHitl2Row } from '../../scripts/lib/node-gate-session-gates.mjs'
import { bundle, sessions, PRE_CONTRACT_DATES, structuredAudit, withCompleteBundle } from './node-gate-helpers.mjs'

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
