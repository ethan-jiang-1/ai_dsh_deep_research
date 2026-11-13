// node-gate-session —— 会话面门：门①（HITL1 签名/绑定/断代）与门R（标题重复退化）。
// 路径/断代助手 = node-gate-helpers.mjs。
import test from 'node:test'
import assert from 'node:assert/strict'
import { gateBundle } from '../../scripts/lib/node-gate-core.mjs'
import { headingGate } from '../../scripts/lib/node-gate-run-gates.mjs'
import { isHitl2Mention } from '../../scripts/lib/node-gate-session-gates.mjs'
import { bundle, sessions } from './node-gate-helpers.mjs'



// 负例留证 2026-10-09：BUG-006 删掉门①的 HITL1 签名判据（退回"只要有关联 ask 就算"）→
//   本文件「零 ask 的关联会话」会被放行 → 例红；还原 → 绿。
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

test('门①WARN：计划确认卡正文超 ≤200 字 → PASS 但 detail 记账（WARN 不拦交付）', () => {
  const r = gateBundle(bundle('fixture-complete'), sessions('s-plan-over'), { hitlDate: '2026-10-06' })
  assert.equal(r.gates.hitlAsk.status, 'PASS', '超限是 WARN 不是红——存量 2/2 超限下硬门会拦下每一场')
  assert.match(r.gates.hitlAsk.detail, /WARN 计划确认卡正文超 ≤200 字纪律：261 字/)
  assert.equal(r.red, false, 'WARN 不拦交付')
})

test('门①互补态：计划确认卡正文 ≤200 字 → 无 WARN，detail 记合规（条件判据的另一半）', () => {
  const r = gateBundle(bundle('fixture-complete'), sessions('s-plan-ok'), { hitlDate: '2026-10-06' })
  assert.equal(r.gates.hitlAsk.status, 'PASS')
  assert.doesNotMatch(r.gates.hitlAsk.detail, /WARN/)
  assert.match(r.gates.hitlAsk.detail, /计划确认卡正文合规（1 张 ≤200 字）/)
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

// ── 门R（标题重复退化门；oss-dr 候选 A1，LDR #6452 形态；契约日 2026-10-06）──
// 本节 = 门R 的永久反证记录：先红（夹具在、门未立时本文件导入即红）后绿。

test('门R反证：final.md 同一标题行重复 ≥4 次 → RED（LDR #6452 生成退化形态）', () => {
  const r = gateBundle(bundle('fixture-heading-degenerate'), sessions('s-complete'))
  assert.equal(r.gates.degeneration.status, 'RED', '同标题逐字 ×4 必须红——合法小节不会重发四遍')
  assert.match(r.gates.degeneration.detail, /×4/)
  assert.equal(r.red, true, '门R 红计入 bundle 红灯')
})

test('门R边界：同一标题 ×3 → PASS（判据 = ≥4；LDR："a legitimate subsection does not emit one identical heading four times"）', () => {
  const r = headingGate(bundle('fixture-heading-healthy'), '2026-10-06')
  assert.equal(r.status, 'PASS', '×3 是判据下界之外的合法形态')
})

test('门R合规：无重复标题的 final → PASS', () => {
  const r = gateBundle(bundle('fixture-complete'), sessions('s-complete'))
  assert.equal(r.gates.degeneration.status, 'PASS')
})

test('门R断代：交付日早于契约日 2026-10-06 → PRE-CONTRACT 不计红（历史交付不追溯）', () => {
  const r = headingGate(bundle('fixture-heading-degenerate'), '2026-10-01')
  assert.equal(r.status, 'PRE-CONTRACT', 'run bundle 是交付记录，不改历史')
})

test('门R N/A：final.md 缺席 → 无对象（在场级违约归 schema-scan，不越界双判）', () => {
  const r = headingGate(bundle('fixture-early'), '2026-10-06')
  assert.equal(r.status, 'N/A')
})

test('门R隔离：门R红不连坐其他门（其余门在本夹具全 N/A——红灯唯一来源可归因）', () => {
  const r = gateBundle(bundle('fixture-heading-degenerate'), sessions('s-complete'))
  assert.equal(r.gates.degeneration.status, 'RED')
  assert.equal(r.gates.version.status, 'N/A')
  assert.equal(r.gates.leads.status, 'N/A')
})

// ── 门A（交付完整性门；RFC 2026-10-07-delivery-criteria-mechanization；契约日 2026-10-08）──
// 本节 = 门A 的永久反证记录：先红（夹具在、门未立时 r.gates.delivery 缺席即红）后绿。
// 形态覆盖：audit.md 缺席（7 bundle 实测形态）/ final/v1.md 缺席（geometry-coaching 形态）/
// 记账在场 × readiness FAIL 交叉（交付越过审查前置）/ 附条件 PASS（WARN 注记不红）/
// 合规 / 断代 / N/A。日期注入（夹具 mtime 随检出时间漂——同门L/④ 成例）。

// 负例留证 2026-11-13：BUG-039——门③ 不认代理代答 provenance 行（记账白落）。
// 红配方：删掉 isHitl2Mention 的「代理模拟|hitl-answer」分支 → 下方代理行断言红。
test('isHitl2Mention：记录行只判在场；决策归门③ 的事件链（BUG-039）', () => {
  assert.equal(isHitl2Mention('- 2026-10-18 HITL2 定稿（用户原话: "可以"）'), true);
  assert.equal(isHitl2Mention('- 2026-10-18｜**HITL 交互 = 操作侧代理模拟（hitl-answer 驱动，pick=recommended）**：Q1「交付审阅」→「按现稿定稿（Recommended）」'), true);
  assert.equal(isHitl2Mention('- 2026-10-18 计划确认卡：「交付审阅」按推荐开跑'), false, '没有代理标记的普通提及不是记录行');
  assert.equal(isHitl2Mention('- 2026-10-18 用户要求修订表述'), false);
});
