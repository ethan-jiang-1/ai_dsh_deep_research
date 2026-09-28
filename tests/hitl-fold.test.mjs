// hitl-fold 回归 — HITL 挂起折算（keyless；谓词移植自 run-dashboard detectHitlWait，
// 首场 run 实证过）。「等待」= 末位事件恰是 ask_user_question 的 tool/call。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveAnchors, foldHitlPending } from '../packages/deep-research-pack/src/lib/hitl-fold.ts';

const ask = (time) => ({ type: 'tool/call', data: { name: 'ask_user_question' }, time });
const other = (name) => ({ type: 'tool/call', data: { name }, time: '2026-09-25T10:00:00Z' });
const askWithQs = (n, time) => ({
  type: 'tool/call',
  data: { name: 'ask_user_question', arguments: JSON.stringify({ questions: Array.from({ length: n }, () => ({})) }) },
  time,
});

test('末位是未答的 ask_user_question → 挂起', () => {
  const r = foldHitlPending([other('web_search'), ask('2026-09-25T12:00:00Z')]);
  assert.deepEqual(r, { pending: true, since: '2026-09-25T12:00:00Z' });
});

test('ask 之后有任何后续事件（已答/取消）→ 不挂起（陈旧挂起天然排除）', () => {
  assert.equal(foldHitlPending([ask('t'), other('todo_write')]).pending, false);
  assert.equal(foldHitlPending([ask('t'), { type: 'tool/result' }]).pending, false);
});

test('末位是其他工具调用 / assistant 消息 → 不挂起', () => {
  assert.equal(foldHitlPending([other('spawn_teammate')]).pending, false);
  assert.equal(foldHitlPending([{ type: 'assistant/message' }]).pending, false);
});

test('空事件 / 畸形输入 → fail-soft 不挂起不崩', () => {
  assert.equal(foldHitlPending([]).pending, false);
  assert.equal(foldHitlPending([null, undefined, 'x', 42]).pending, false);
  assert.equal(foldHitlPending([{ type: 'tool/call' }]).pending, false);
  assert.equal(foldHitlPending([{ data: { name: 'ask_user_question' } }]).pending, false);
});

test('挂起事件缺 time 字段 → pending 仍真、since 为 undefined', () => {
  assert.deepEqual(foldHitlPending([ask(undefined)]), { pending: true, since: undefined });
});

test('v4 形态：ask 之后落了 session/title 元数据事件 → 仍挂起（从尾扫跳过 session/*）', () => {
  const r = foldHitlPending([other('todo_write'), ask('2026-09-25T12:00:00Z'), { type: 'session/title' }]);
  assert.deepEqual(r, { pending: true, since: '2026-09-25T12:00:00Z' });
});

test('尾部全是 session/* 元数据 → 一路向前找到回合事件判定', () => {
  assert.equal(foldHitlPending([{ type: 'session/title' }, { type: 'session/x' }, other('web_search')]).pending, false);
  assert.equal(foldHitlPending([{ type: 'session/title' }, ask('t')]).pending, true);
});

// ── deriveAnchors（锚点入轨，RFC cockpit-flow-face；混合折算——passed 走文件事实、pending 走尾窗）──

test('无 ask 无文件事实 → 双 upcoming（不虚构 passed）', () => {
  const anchors = deriveAnchors([other('web_search')]);
  assert.deepEqual(anchors.map((a) => [a.label, a.state]), [['立项确认', 'upcoming'], ['交付审阅', 'upcoming']]);
});

test('尾位未答 ask（bundle 未建）→ 立项确认 pending 带问数、交付审阅 upcoming', () => {
  const anchors = deriveAnchors([other('web_search'), askWithQs(3, 't')]);
  assert.equal(anchors[0].state, 'pending');
  assert.equal(anchors[0].questions, 3);
  assert.equal(anchors[1].state, 'upcoming');
});

test('passed 由文件事实承载（尾窗里没有 ask 也能正确显示——快照 DEFAULT_MAX_MESSAGES=50）', () => {
  assert.deepEqual(deriveAnchors([other('web_search')], { question: true, delivered: true }).map((a) => a.state), ['passed', 'passed']);
  assert.deepEqual(deriveAnchors([other('web_search')], { question: true, delivered: false }).map((a) => a.state), ['passed', 'upcoming']);
});

test('立项已落盘 + 尾位未答 ask → 交付审阅 pending（带问数）', () => {
  const anchors = deriveAnchors([askWithQs(1, 't')], { question: true, delivered: false });
  assert.deepEqual(anchors.map((a) => a.state), ['passed', 'pending']);
  assert.equal(anchors[1].questions, 1);
});

test('交付后再来的挂起 ask（契约外）→ 如实缀第三锚 中途确认', () => {
  const anchors = deriveAnchors([askWithQs(2, 't')], { question: true, delivered: true });
  assert.equal(anchors.length, 3);
  assert.equal(anchors[2].label, '中途确认');
  assert.equal(anchors[2].state, 'pending');
  assert.equal(anchors[2].questions, 2);
});

test('deriveAnchors 畸形输入 fail-soft（截断 JSON 问数 = 0、永不 throw）', () => {
  assert.equal(deriveAnchors([]).length, 2);
  assert.equal(deriveAnchors([null, 42, { type: 'tool/call' }]).length, 2);
  assert.equal(deriveAnchors([{ type: 'tool/call', data: { name: 'ask_user_question', arguments: '{"questions": [截断' } }])[0].state, 'pending');
});
