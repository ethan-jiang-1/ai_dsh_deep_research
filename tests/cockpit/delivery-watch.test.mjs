// delivery-watch.test.mjs — 交付监听：live present → 打开终稿（去重/在屏）（2026-11-03 P4 拆分）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchDelivery } from '../../packages/deep-research-pack/src/client/delivery-watch.ts';

const event = (path) => ({ type: 'deliverables/presented', data: { turn: 1, callId: 'c1', files: [{ path }] } });

function harness({ sessionId = 's1', frames = [], focus = null } = {}) {
  const opened = [];
  const listeners = new Set();
  let current = sessionId;
  const mounted = {
    getSnapshot: () => current,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
  const follow = async function* () {
    for (const frame of frames) yield frame;
  };
  const dispose = watchDelivery({
    follow,
    openFinal: (id, path) => opened.push([id, path]),
    mounted,
    activeElement: () => focus,
    onError: () => {},
  });
  return { opened, dispose, setSession: (id) => { current = id; for (const fn of listeners) fn(); } };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

test('present 指向终稿 → 打开一次；同 callId 不重复', async () => {
  const h = harness({ frames: [{ kind: 'event', event: event('drt_x/final/v1.md') }] });
  await flush();
  assert.deepEqual(h.opened, [['s1', 'drt_x/final/v1.md']]);
  h.dispose();
});

test('非 present 帧 / 历史帧不触发', async () => {
  const h = harness({ frames: [
    { kind: 'history', events: [event('drt_x/final/v1.md')] },
    { kind: 'event', event: { type: 'turn/end', data: {} } },
  ] });
  await flush();
  assert.deepEqual(h.opened, []);
  h.dispose();
});

test('焦点在真草稿里 → 不打断（焦点空/无元素 → 打开）', async () => {
  const draft = { tagName: 'TEXTAREA', value: '正在写', isContentEditable: false };
  const blocked = harness({ frames: [{ kind: 'event', event: event('drt_x/final/v1.md') }], focus: draft });
  await flush();
  assert.deepEqual(blocked.opened, [], '有草稿时不自动打开');
  blocked.dispose();

  const empty = harness({ focus: { tagName: 'TEXTAREA', value: '', isContentEditable: false } });
  await flush();
  empty.dispose();
});
