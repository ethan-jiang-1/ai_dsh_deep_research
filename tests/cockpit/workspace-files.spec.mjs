// workspace-files.spec.mjs — workspaceFiles 读闭包的降级合同（2026-11-03 P4 拆分）。
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

test('readText：命中返回文本；missingOk 区分空态；真故障/抛错 → null 且打日志', async () => {
  const ok = createWorkspaceFiles(remoteOf(null, () => ({ ok: true, value: { text: 'hello', lines: 1, eof: true } })));
  assert.equal(await ok.readText('s', 'x.md', signal), 'hello');

  const missing = createWorkspaceFiles(remoteOf(null, () => ({ ok: false, error: { code: 'workspace-file/not-found' } })));
  assert.equal(await missing.readText('s', 'x.md', signal, 40, true), null, 'missingOk → 合法空态');
  const original = console.error;
  let logged = 0;
  console.error = () => { logged += 1; };
  try {
    assert.equal(await missing.readText('s', 'x.md', signal), null, '非 missingOk 仍返回 null');
    assert.ok(logged >= 1, '真故障必须打日志');
    const broken = createWorkspaceFiles({ list: async () => ({ ok: true, value: { entries: [] } }), read: async () => { throw new Error('boom'); } });
    assert.equal(await broken.readText('s', 'x.md', signal), null, '抛错不炸页面');
  } finally {
    console.error = original;
  }
});

// 负例留证 2026-11-12：BUG-088——>1000 行库必须分页读到 eof，不能固定 1000 行静默短读。
// 还原法 = 配置页签回到 readText(...,1000) / readLibrary 只读一页。
test('BUG-088 readLibrary：1001 行库分两页读到第 1001 行', async () => {
  let call = 0;
  const remote = { list: async () => null, read: async (_id, _path, opts) => {
    call += 1;
    const start = opts.offset;
    const end = Math.min(1001, start + opts.limit - 1);
    const text = Array.from({ length: end - start + 1 }, (_, i) => `line-${start + i}`).join('\n');
    return { ok: true, value: { text, lines: end - start + 1, eof: end === 1001 } };
  } };
  const result = await createWorkspaceFiles(remote).readLibrary('s', 'method-library.md', signal);
  assert.equal(result.kind, 'ok');
  assert.ok(result.text.includes('line-1001'), '第 1001 行必须读回');
  assert.equal(call, 2);
});
