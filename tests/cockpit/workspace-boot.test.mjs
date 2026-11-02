// workspace-boot.test.mjs — 启动期工作区选择/恢复的纯逻辑契约（2026-11-03 P4 拆分）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceBoot, waitReady } from '../../packages/deep-research-pack/src/client/workspace-boot.ts';
import { CURRENT_SESSION_KEY, PRODUCT_WORKSPACE_KEY } from '../../packages/deep-research-pack/src/client/startup.ts';

const memoryStorage = (init = {}) => {
  const map = new Map(Object.entries(init));
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, map };
};

test('waitReady：pending → ready；超时返回当前快照', async () => {
  const list = { n: 0, getSnapshot() { this.n += 1; return { phase: this.n >= 2 ? 'ready' : 'pending' }; } };
  assert.equal((await waitReady(list, 500)).phase, 'ready');
  const stuck = { getSnapshot: () => ({ phase: 'pending' }) };
  const started = Date.now();
  assert.equal((await waitReady(stuck, 50)).phase, 'pending');
  assert.ok(Date.now() - started >= 40, '超时应等满预算');
});

test('chooseWorkspace：选目录 → 登记 → 记 id → 开 Lead 会话', async () => {
  const calls = [];
  const storage = memoryStorage();
  const boot = createWorkspaceBoot({
    workspaces: { list: { getSnapshot: () => ({ phase: 'ready', items: [] }) }, create: async ({ path }) => ({ workspaceId: 'w-' + path }) },
    sessions: { list: { getSnapshot: () => ({ phase: 'ready', byId: {} }) } },
    uiWorkspace: {
      pickDirectory: async () => '/proj',
      startSession: (id, opts) => calls.push(['start', id, opts]),
      openSession: () => calls.push(['open']),
    },
    storage,
  });
  await boot.chooseWorkspace();
  assert.deepEqual(calls, [['start', 'w-/proj', { agentPreset: 'lead' }]]);
  assert.equal(storage.getItem(PRODUCT_WORKSPACE_KEY), 'w-/proj');

  const cancel = createWorkspaceBoot({
    workspaces: { list: { getSnapshot: () => ({ phase: 'ready', items: [] }) }, create: async () => ({ workspaceId: 'x' }) },
    sessions: { list: { getSnapshot: () => ({ phase: 'ready', byId: {} }) } },
    uiWorkspace: { pickDirectory: async () => null, startSession: () => calls.push(['should-not']), openSession: () => {} },
    storage,
  });
  await cancel.chooseWorkspace();
  assert.equal(calls.length, 1, '取消选目录不产生会话');
});

test('ensureProductWorkspace：当前会话不在产品工作区才切换；同区不切', async () => {
  const items = [{ workspaceId: 'w1', title: 'Deep Research — proj', path: '/proj', sessionIds: [] }];
  const make = (cwd, saved = 'w1') => {
    const calls = [];
    const storage = memoryStorage({ [PRODUCT_WORKSPACE_KEY]: saved, [CURRENT_SESSION_KEY]: JSON.stringify('s1') });
    const boot = createWorkspaceBoot({
      workspaces: { list: { getSnapshot: () => ({ phase: 'ready', items }) }, create: async () => ({ workspaceId: 'x' }) },
      sessions: { list: { getSnapshot: () => ({ phase: 'ready', byId: { s1: { cwd } } }) } },
      uiWorkspace: { pickDirectory: async () => null, startSession: (id) => calls.push(id), openSession: () => {} },
      storage,
    });
    return { boot, calls };
  };
  const switched = make('/other');
  await switched.boot.ensureProductWorkspace();
  assert.deepEqual(switched.calls, ['w1'], 'cwd 不在产品工作区 → 切过去');
  const kept = make('/proj');
  await kept.boot.ensureProductWorkspace();
  assert.deepEqual(kept.calls, [], 'cwd 已在产品工作区 → 不切');
});

test('ensureProductWorkspace：effect teardown（signal abort）后不再启动会话', async () => {
  const items = [{ workspaceId: 'w1', title: 'Deep Research — proj', path: '/proj', sessionIds: [] }];
  const calls = [];
  const controller = new AbortController();
  // abort 发生在第一个 cancelled() 检查之后（读 saved 时）——只有 startSession 前的第二次检查能拦住。
  const storage = {
    getItem: (key) => {
      if (key === PRODUCT_WORKSPACE_KEY) { controller.abort(); return 'w1'; }
      if (key === CURRENT_SESSION_KEY) return JSON.stringify('s1');
      return null;
    },
    setItem: () => {},
  };
  const boot = createWorkspaceBoot({
    workspaces: { list: { getSnapshot: () => ({ phase: 'ready', items }) }, create: async () => ({ workspaceId: 'x' }) },
    sessions: { list: { getSnapshot: () => ({ phase: 'ready', byId: { s1: { cwd: '/other' } } }) } },
    uiWorkspace: { pickDirectory: async () => null, startSession: (id) => calls.push(id), openSession: () => {} },
    storage,
  });
  await boot.ensureProductWorkspace(controller.signal);
  assert.deepEqual(calls, [], '已 dispose 的 effect 不应再开会话');
});
