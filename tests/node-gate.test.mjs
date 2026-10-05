import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gateBundle, decisionsLines } from '../scripts/node-gate.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const FX = join(HERE, 'fixtures', 'node-gate')
const bundle = (name) => join(FX, 'bundles', name)
const sessions = (name) => join(FX, 'sessions', name)

// 反证先行（writing-a-gate）：先红后绿——本文件是 node-gate 两门的永久反证记录。
// 形态覆盖：门③缺拍板行 / 门②缺 present / 合规双绿 / 操作侧补齐（PASS-RELAY）/
// 未到交付段（双 N/A，显式不静默）/ question.md 失踪（fail-loud）。

test('门③反证：final/ 在场而 §Decisions 无 HITL2 拍板行 → RED（G8 形态）', () => {
  const r = gateBundle(bundle('fixture-hitl2-missing'), sessions('s-hitl2-missing'))
  assert.equal(r.gates.hitl2Row.status, 'RED', '版本记账在场却无拍板行，必须红')
  assert.equal(r.gates.present.status, 'PASS', '隔离性：门②不因门③红而连坐')
  assert.equal(r.red, true)
})

test('门②反证：final + readiness PASS 在场而日志无 present、无操作侧标注 → RED', () => {
  const r = gateBundle(bundle('fixture-present-missing'), sessions('s-present-missing'))
  assert.equal(r.gates.present.status, 'RED', '静默缺席必须红')
  assert.equal(r.gates.hitl2Row.status, 'PASS', '隔离性：门③不因门②红而连坐')
  assert.equal(r.red, true)
})

test('合规形态：拍板行 + present 日志 → 双绿', () => {
  const r = gateBundle(bundle('fixture-complete'), sessions('s-complete'))
  assert.equal(r.gates.hitl2Row.status, 'PASS')
  assert.equal(r.gates.present.status, 'PASS')
  assert.equal(r.red, false)
})

test('通道死恢复路径：操作侧补齐显式记账 → PASS-RELAY 放行带注（显性化不静默）', () => {
  const r = gateBundle(bundle('fixture-relay'), sessions('s-relay'))
  assert.equal(r.gates.present.status, 'PASS-RELAY', '显式记账的操作侧补齐不是违规')
  assert.equal(r.gates.hitl2Row.status, 'PASS')
  assert.equal(r.red, false)
})

test('未到交付段：无 final.md、无 final/ → 双 N/A（无对象显式标注，不静默跳过）', () => {
  const r = gateBundle(bundle('fixture-early'), sessions('s-relay'))
  assert.equal(r.gates.hitl2Row.status, 'N/A')
  assert.equal(r.gates.present.status, 'N/A')
  assert.equal(r.red, false)
})

test('question.md 失踪而 final/ 在场 → fail-loud RED（不静默跳过）', () => {
  const r = gateBundle(bundle('fixture-no-question'), sessions('s-relay'))
  assert.equal(r.gates.hitl2Row.status, 'RED')
  assert.equal(r.red, true)
})

test('decisionsLines：只取 §Decisions 节，遇下一个 ## 停', () => {
  const text = '# Q\n\n## Decisions（append-only，最新在上）\n\n- HITL2 定稿\n- HITL1 定稿\n\n## 背景与动机\n\n- 不该被算进来\n'
  const lines = decisionsLines(text)
  assert.equal(lines.length, 2)
  assert.ok(lines.every((l) => l.includes('HITL')))
})

// ── 门 L（leads 交接门，v2；RFC 2026-09-28-wave0-leads-polish）────────────────
// 断代判据随测试注入日期（夹具 mtime 随检出时间漂，不可作断代依据——同 schema-scan 成例）。
const L = (name, date) => gateBundle(bundle(name), undefined, { leadsDate: date }).gates.leads

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
const V = (name, date) => gateBundle(bundle(name), undefined, { versionDate: date }).gates.version

test('门④ 健康：v2 在场 + §Decisions v2 行 + v1.md 索引登记 → PASS', () => {
  const g = V('fixture-version-healthy', '2026-10-04')
  assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
})

test('门④ 反证：final/v2.md 在场而 §Decisions 无 v2 行（kimi 契约前形态）→ RED', () => {
  const g = V('fixture-version-missing-decision', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /§Decisions/)
})

test('门④ 反证：final/v2.md 在场而 v1.md 索引未登记 → RED', () => {
  const g = V('fixture-version-missing-index', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /登记|索引/)
})

test('门④ 无对象：final/ 仅 v1 记账（无扩张 rerun）→ N/A 显式', () => {
  const g = V('fixture-version-v1only', '2026-10-04')
  assert.equal(g.status, 'N/A')
  assert.match(g.detail, /v1|无扩张/)
})

test('门④ 断代：契约前交付日 → PRE-CONTRACT 不计红（kimi 09-26 形态）', () => {
  const g = V('fixture-version-missing-decision', '2026-10-02')
  assert.equal(g.status, 'PRE-CONTRACT')
  const r = gateBundle(bundle('fixture-version-missing-decision'), undefined, { versionDate: '2026-10-02' })
  assert.equal(r.red, false, '契约前不计红（run bundle 是交付记录，不改历史）')
})

test('门④ 隔离性：门④ RED 不连坐门③（HITL2 行在场 → 门③ PASS）', () => {
  const r = gateBundle(bundle('fixture-version-missing-decision'), undefined, { versionDate: '2026-10-04' })
  assert.equal(r.gates.version.status, 'RED')
  assert.equal(r.gates.hitl2Row.status, 'PASS', '门③不因门④红而连坐')
})

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
const L3 = (name, date) => gateBundle(bundle(name), undefined, { leadsDate: date }).gates.leads

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

test('门①反证：question.md 在场而关联会话零 ask → RED（BUG-006 形态：HITL1 自我豁免不可见即违法）', () => {
  const r = gateBundle(bundle('fixture-complete'), sessions('s-no-ask'), { hitlDate: '2026-10-06' })
  assert.equal(r.gates.hitlAsk.status, 'RED', '零 ask 的 run 必须红——快路径豁免无合同授权')
  assert.equal(r.red, true)
})

test('门①合规：关联会话含 HITL1 签名 ask（研究类型问）→ PASS', () => {
  const r = gateBundle(bundle('fixture-complete'), sessions('s-complete'), { hitlDate: '2026-10-06' })
  assert.equal(r.gates.hitlAsk.status, 'PASS', 'HITL1 锚点在场')
  assert.match(r.gates.hitlAsk.detail, /HITL1 签名 ask 1 次/)
})

test('门①N/A：question.md 缺席 → 无对象（方向契约未立，不越界）', () => {
  const r = gateBundle(bundle('fixture-no-question'), sessions('s-complete'))
  assert.equal(r.gates.hitlAsk.status, 'N/A')
})

test('门①断代：零 ask 而交付日早于契约日 → PRE-CONTRACT 不计红（历史交付不追溯）', () => {
  const r = gateBundle(bundle('fixture-early'), sessions('s-no-ask'), { hitlDate: '2026-10-01' })
  assert.equal(r.gates.hitlAsk.status, 'PRE-CONTRACT')
  assert.equal(r.red, false, 'PRE-CONTRACT 不计入红灯')
})

test('门①签名区分：只有 HITL2 签名 ask（无研究类型问）→ 仍 RED（HITL1 锚点缺失）', () => {
  // HITL2 问卡被答过但 HITL1 从未发起 = 锚点缺失的残余形态；门①认 HITL1 签名，不认 ask 总数
  const r = gateBundle(bundle('fixture-complete'), sessions('s-no-ask'), { hitlDate: '2026-10-06' })
  assert.equal(r.gates.hitlAsk.status, 'RED')
})

test('门①绑定反证：邻场会话（无 write、只有 ask）的 HITL1 ask 不串场 → 仍 RED（真 bundle 两轮实拍串场形态）', () => {
  // 实拍两轮：宽松绑定（路径提及/时间窗）把邻场与历史场次的 ask 串进本门①——
  // 绑定语义 = HITL1 与立项同场（写过 question.md 的会话）。
  const r = gateBundle(bundle('fixture-complete'), sessions('s-time-anchor'), { hitlDate: '2026-10-06' })
  assert.equal(r.gates.hitlAsk.status, 'RED', '邻场 ask 串场 = 门①假绿（写会话绑定反证）')
})

test('门①合规：写过 question.md 的会话里 HITL1 签名 ask 在场（先问后立）→ PASS', () => {
  const r = gateBundle(bundle('fixture-complete'), sessions('s-complete'), { hitlDate: '2026-10-06' })
  assert.equal(r.gates.hitlAsk.status, 'PASS', 'HITL1 锚点在场')
  assert.match(r.gates.hitlAsk.detail, /写过 question.md 的会话 1 个：HITL1 签名 ask 1 次/)
})
