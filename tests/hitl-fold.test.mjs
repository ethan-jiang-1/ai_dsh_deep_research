// hitl-fold 回归 — HITL 挂起折算（keyless；谓词移植自 run-dashboard detectHitlWait，
// 首场 run 实证过）。「等待」= 末位事件恰是 ask_user_question 的 tool/call。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldHitlPending } from '../packages/deep-research-pack/src/lib/hitl-fold.ts';

const ask = (time) => ({ type: 'tool/call', data: { name: 'ask_user_question' }, time });
const other = (name) => ({ type: 'tool/call', data: { name }, time: '2026-09-25T10:00:00Z' });

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
