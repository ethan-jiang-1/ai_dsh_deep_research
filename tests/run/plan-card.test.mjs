// tests/plan-card.test.mjs —— HITL1 计划确认卡识别与字数口径的 keyless 契约（唯一语义源）。
//
// 为什么存在：同一判据曾有**两版实现**（node-gate 门① 的 WARN 记账与运行态标定扫描器）——各写
// 一份"哪张 ask 是计划卡、正文多长"。收成 `scripts/lib/plan-card.mjs` 后由本测试钉住口径与边界，
// 免得两处再漂（同族事故 = readiness 终局判定的三版分叉）。
//
// 反证（同 diff 注入实测，红→还原→绿）：
//   ①删掉标签判据（`isPlanCardQuestion` 恒真）→ 用例 2 红（普通问卡被当计划卡）；
//   ②阈值改成 `>=` → 用例 5 红（200 字边界被误判超限）；
//   ③不逐问过滤（对 payload.questions 直接 push）→ 用例 3 红（同一次调用里的普通问被计入）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planCardsOf, PLAN_CARD_MARK, PLAN_CARD_LIMIT } from '../../scripts/lib/plan-card.mjs';

const call = (seq, questions) => JSON.stringify({
  type: 'tool/call',
  seq,
  time: 1790600000000 + seq,
  data: { turn: 1, step: seq, callId: `c${seq}`, name: 'ask_user_question', arguments: JSON.stringify({ questions }) },
});
const planQ = (body, extra = {}) => ({
  id: 'plan_confirm', header: '计划确认', question: body,
  options: [{ label: `${PLAN_CARD_MARK} (Recommended)` }, { label: '修订计划' }, { label: '放弃' }],
  ...extra,
});
const plainQ = { id: 'research_type', header: '研究类型', question: '这次研究属于哪一类？', options: [{ label: '对比评估 (Recommended)' }] };

test('命中：options 含「按计划开跑」的那一问被认出，字数 = question 字段全长', () => {
  const body = '计划要点：维持 flash；比较 flash / v4-pro；输出标准报告。全文见 question.md。';
  const cards = planCardsOf([call(1, [plainQ]), call(2, [planQ(body)])].join('\n'));
  assert.equal(cards.length, 1, '恰一张计划卡');
  assert.equal(cards[0].questionChars, body.length);
  assert.equal(cards[0].header, '计划确认');
  assert.equal(cards[0].seq, 2);
  assert.equal(cards[0].overLimit, false);
});

test('不误判：普通问卡（无该选项）不算计划卡——防空转', () => {
  const cards = planCardsOf(call(1, [plainQ]));
  assert.deepEqual(cards, []);
});

test('逐问过滤：同一次 ask 里混着普通问与计划卡时只计计划卡', () => {
  const cards = planCardsOf(call(7, [plainQ, planQ('短计划'), { id: 'depth', header: '深度', options: [{ label: '标准报告 (Recommended)' }] }]));
  assert.equal(cards.length, 1);
  assert.equal(cards[0].questionChars, 3);
});

test('多卡与出现序：同一日志两张计划卡按出现序返回', () => {
  const cards = planCardsOf([call(1, [planQ('第一张')]), call(2, [planQ('第二张更长一点')])].join('\n'));
  assert.deepEqual(cards.map((c) => c.seq), [1, 2]);
  assert.deepEqual(cards.map((c) => c.questionChars), [3, 7]);
});

test('阈值边界：恰好 200 字不超限、201 字超限（口径咬在 `>` 上）', () => {
  const at = planCardsOf(call(1, [planQ('字'.repeat(PLAN_CARD_LIMIT))]))[0];
  const over = planCardsOf(call(1, [planQ('字'.repeat(PLAN_CARD_LIMIT + 1))]))[0];
  assert.equal(at.overLimit, false, '200 字 = 合规（≤200）');
  assert.equal(over.overLimit, true);
  assert.equal(over.questionChars, PLAN_CARD_LIMIT + 1);
});

test('畸形容忍：非 JSON 行 / arguments 非 JSON / questions 非数组 / question 缺席 → 不 throw、按 0 字或跳过', () => {
  const lines = [
    'not json at all 按计划开跑',
    JSON.stringify({ type: 'tool/call', seq: 1, data: { name: 'ask_user_question', arguments: '{bad json 按计划开跑' } }),
    JSON.stringify({ type: 'tool/call', seq: 2, data: { name: 'ask_user_question', arguments: JSON.stringify({ questions: 'nope' }) } }),
    call(3, [{ id: 'plan_confirm', options: [{ label: PLAN_CARD_MARK }] }]),
  ];
  const cards = planCardsOf(lines.join('\n'));
  assert.equal(cards.length, 1, '只有第 4 条是真计划卡（question 缺席 → 0 字仍算卡：口径是字数不是在场）');
  assert.equal(cards[0].questionChars, 0);
});

test('防空语料：空串 / null / 无 ask 行 → 空数组', () => {
  assert.deepEqual(planCardsOf(''), []);
  assert.deepEqual(planCardsOf(null), []);
  assert.deepEqual(planCardsOf('{"type":"tool/call","data":{"name":"read"}}'), []);
});

test('口径与标签是唯一正本：常量在场（阈值 200 / 标签「按计划开跑」）', () => {
  assert.equal(PLAN_CARD_LIMIT, 200);
  assert.equal(PLAN_CARD_MARK, '按计划开跑');
});
