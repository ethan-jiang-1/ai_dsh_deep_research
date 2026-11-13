// session-follow.spec.mjs — journal 流装配的纯函数契约（2026-11-03 P4 拆分）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFollow, hasUserMessage, watchCoach } from '../../packages/deep-research-pack/src/client/session-follow.ts';

const signal = new AbortController().signal;
const fakeRemote = (frames) => ({
  session: {
    async *follow() {
      for (const frame of frames) yield frame;
    },
  },
});

test('createFollow：snapshot → history、event → event，未知帧忽略', async () => {
  const follow = createFollow(fakeRemote([
    { type: 'snapshot', records: [{ event: { type: 'user/message' } }, { event: { type: 'assistant/message' } }] },
    { type: 'event', event: { type: 'turn/end' } },
    { type: 'future-frame' },
  ]));
  const out = [];
  for await (const frame of follow('session-1', signal)) out.push(frame);
  assert.deepEqual(out, [
    { kind: 'history', events: [{ type: 'user/message' }, { type: 'assistant/message' }] },
    { kind: 'event', event: { type: 'turn/end' } },
  ]);
});

test('hasUserMessage：首帧含 user/message → true；不含/异常 → false', async () => {
  const withUser = createFollow(fakeRemote([{ type: 'snapshot', records: [{ event: { type: 'user/message' } }] }]));
  assert.equal(await hasUserMessage(withUser, 's'), true);
  const withoutUser = createFollow(fakeRemote([{ type: 'snapshot', records: [{ event: { type: 'turn/end' } }] }]));
  assert.equal(await hasUserMessage(withoutUser, 's'), false);
  const broken = async function* () { throw new Error('boom'); };
  assert.equal(await hasUserMessage(broken, 's'), false);
});

test('watchCoach：history 首帧 ready 一次，未知事件不进 onEvent', async () => {
  const follow = createFollow(fakeRemote([
    { type: 'snapshot', records: [{ event: { type: 'session' } }] },
    { type: 'event', event: { type: 'assistant/message', data: { message: { content: [] } } } },
  ]));
  let ready = 0;
  const events = [];
  await watchCoach(follow, 's', signal, (e) => events.push(e), () => { ready += 1; });
  assert.equal(ready, 1, 'ready 应恰好一次');
  assert.equal(events.length, 0, '未知形态事件应被忽略');
});
