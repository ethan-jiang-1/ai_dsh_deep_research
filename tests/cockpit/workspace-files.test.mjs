// workspace-files.test.mjs — workspaceFiles 读闭包的降级合同（2026-11-03 P4 拆分）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceFiles } from '../../packages/deep-research-pack/src/client/workspace-files.ts';

const signal = new AbortController().signal;
const remoteOf = (list, read) => ({ list: async () => list, read: async (_id, _path, _opts) => read() });

test('listDir：not-found = 合法空态；其他错误 = null（打 console，不静默）', async () => {
  const missing = createWorkspaceFiles(remoteOf({ ok: false, error: { code: 'workspace-file/not-found' } }, null));
  assert.deepEqual(await missing.listDir('s', '.', signal), []);

  const broken = createWorkspaceFiles(remoteOf({ ok: false, error: { code: 'workspace-file/boom' } }, null));
  const original = console.error;
  let logged = 0;
  console.error = () => { logged += 1; };
  try {
    assert.equal(await broken.listDir('s', '.', signal), null);
  } finally {
    console.error = original;
  }
  assert.ok(logged >= 1, '真故障必须打日志');
});

test('readLibrary：分页拼到 eof；缺席 = absent；超过 20 页 = error', async () => {
  let call = 0;
  const paged = createWorkspaceFiles(remoteOf(null, () => {
    call += 1;
    return call === 1
      ? { ok: true, value: { text: 'line-1', lines: 1, eof: false } }
      : { ok: true, value: { text: 'line-2', lines: 1, eof: true } };
  }));
  assert.deepEqual(await paged.readLibrary('s', 'method-library.md', signal), { kind: 'ok', text: 'line-1\nline-2' });

  const absent = createWorkspaceFiles(remoteOf(null, () => ({ ok: false, error: { code: 'workspace-file/not-found' } })));
  assert.deepEqual(await absent.readLibrary('s', 'method-library.md', signal), { kind: 'absent' });

  const runaway = createWorkspaceFiles(remoteOf(null, () => ({ ok: true, value: { text: 'x', lines: 1, eof: false } })));
  assert.deepEqual(await runaway.readLibrary('s', 'method-library.md', signal), { kind: 'error', detail: 'method-library.md exceeds 20000 lines' });
});

test('readPreview：缺席/畸形/取消 三态如实', async () => {
  const absent = createWorkspaceFiles(remoteOf(null, () => ({ ok: false, error: { code: 'workspace-file/not-found' } })));
  assert.deepEqual(await absent.readPreview('s', 'review.md', signal), { kind: 'absent' });

  const malformed = createWorkspaceFiles(remoteOf(null, () => ({ ok: true, value: { text: 1, eof: 'no' } })));
  assert.equal((await malformed.readPreview('s', 'review.md', signal)).kind, 'error');

  const controller = new AbortController();
  controller.abort();
  const cancelled = createWorkspaceFiles({
    list: async () => ({ ok: false, error: {} }),
    read: async () => { throw new Error('aborted'); },
  });
  assert.deepEqual(await cancelled.readPreview('s', 'review.md', controller.signal), { kind: 'cancelled' });
});
