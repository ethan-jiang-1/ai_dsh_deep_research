// 流畸形死亡折算回归（stream-failure）——BUG-023 修复①的判据面。
// 真实事件形状（session-e0408634 实录）：末位 turn/end error(MALFORMED) → dead；
// 其后新 turn/start → 不打扰；成功 turn/end / 其他错误码 / 空事件 → 不误报。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { streamFailureOf } from '../../packages/deep-research-pack/src/lib/stream-failure.ts';

const malformedTurnEnd = (seq, turn = 1) => ({
  type: 'turn/end', seq,
  data: { turn, reason: { kind: 'error', error: { message: 'DeepSeek Messages stream: event precedes message_start', code: 'MALFORMED_RESPONSE' } } },
});
const okTurnEnd = (seq, turn = 1) => ({ type: 'turn/end', seq, data: { turn, reason: { kind: 'stop' } } });

test('末位 turn/end 为 MALFORMED 且无新回合 → dead（真实死亡形态）', () => {
  const s = streamFailureOf([
    { type: 'turn/start', seq: 6, data: { turn: 1 } },
    { type: 'user/message', seq: 10, data: { content: [{ type: 'text', text: '研究一下' }] } },
    { type: 'assistant/attempt', seq: 17, data: { turn: 1, step: 1, stream: [{ type: 'chunk', chunk: { type: 'finish', reason: { kind: 'error', failure: { code: 'MALFORMED_RESPONSE', message: 'x' } } } }] } },
    malformedTurnEnd(20),
  ]);
  assert.equal(s.dead, true);
  assert.equal(s.code, 'MALFORMED_RESPONSE');
  assert.match(s.message, /event precedes message_start/);
});

test('死亡后有新 turn/start（重试回合在跑）→ 不打扰', () => {
  const s = streamFailureOf([malformedTurnEnd(20), { type: 'turn/start', seq: 30, data: { turn: 2 } }]);
  assert.equal(s.dead, false);
});

test('末位回合成功 / 其他错误码 / 空事件 / 无 turn/end → 不误报', () => {
  assert.equal(streamFailureOf([okTurnEnd(20)]).dead, false);
  assert.equal(streamFailureOf([{ type: 'turn/end', seq: 20, data: { turn: 1, reason: { kind: 'error', error: { code: 'TRANSPORT', message: 'x' } } } }]).dead, false);
  assert.equal(streamFailureOf([]).dead, false);
  assert.equal(streamFailureOf([{ type: 'user/message', seq: 1, data: {} }]).dead, false);
});

test('多回合：先成功后死亡 → dead；先死亡后成功 → 不 dead（时序取末位）', () => {
  assert.equal(streamFailureOf([okTurnEnd(10), malformedTurnEnd(20, 2)]).dead, true);
  assert.equal(streamFailureOf([malformedTurnEnd(10), okTurnEnd(20, 2)]).dead, false);
});
