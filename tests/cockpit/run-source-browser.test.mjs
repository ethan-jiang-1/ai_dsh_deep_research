// run-source-browser 回归 —— `remote.workspaceFiles` → RunSource 的 wire 映射（keyless）。
// 断言：not-found → missing（不是空目录）、空目录 → ok 空值、read 页字段透传、stat → version、
// malformed wire → unreadable；位置/读策略本身由 tests/run/run-context.test.mjs 钉。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openRun } from '../../packages/deep-research-pack/src/lib/run-context.ts';
import { browserRunSource } from '../../packages/deep-research-pack/src/client/run-source-browser.ts';

const ok = (value) => ({ ok: true, value });
const notFound = () => ({ ok: false, error: { code: 'workspace-file/not-found' } });
const failure = (code = 'workspace-file/not-a-directory') => ({ ok: false, error: { code } });

/** 最小 wire 假件：目录 → 条目；文件 → 行数组；stat → version。 */
function wire(tree, { errors = {}, version = 'v-1', malformed = null } = {}) {
  const calls = [];
  const nodeAt = (path) => {
    if (path === '') return tree;
    let node = tree;
    for (const part of path.split('/').filter(Boolean)) {
      if (node === null || typeof node !== 'object') return undefined;
      node = node[part];
    }
    return node;
  };
  return {
    calls,
    async list(_sessionId, path) {
      calls.push(['list', path]);
      if (errors[path] !== undefined) return failure(errors[path]);
      if (malformed === 'list') return ok({ noEntries: true });
      const node = nodeAt(path);
      if (node === undefined) return notFound();
      if (typeof node === 'string') return failure();
      return ok({ entries: Object.entries(node).map(([name, child]) => ({ name, type: typeof child === 'string' ? 'file' : 'directory' })) });
    },
    async read(_sessionId, path, opts) {
      calls.push(['read', path, opts]);
      if (errors[path] !== undefined) return failure(errors[path]);
      if (malformed === 'read') return ok({ text: 1, lines: 'x', eof: null });
      const node = nodeAt(path);
      if (node === undefined) return notFound();
      if (typeof node !== 'string') return failure();
      const lines = node === '' ? [] : node.split('\n');
      if (node.endsWith('\n')) lines.pop();
      const offset = opts.offset ?? 1;
      const limit = opts.limit ?? 40;
      const slice = lines.slice(offset - 1, offset - 1 + limit);
      return ok({ text: slice.join('\n'), lines: slice.length, eof: offset - 1 + slice.length >= lines.length, version });
    },
    async stat(_sessionId, path) {
      calls.push(['stat', path]);
      if (errors[path] !== undefined) return failure(errors[path]);
      if (malformed === 'stat') return ok({ noVersion: true });
      return nodeAt(path) === undefined ? notFound() : ok({ version });
    },
  };
}

test('browserRunSource：openRun 根/archive；空根目录不让位；read/stat 透传', async () => {
  const tree = {
    drt_a: { 'review.md': 'readiness: PASS\n', final: { 'v2.md': 'body v2\n' } },
    archive: { drt_b: { 'final.md': 'archived\n' } },
    drt_empty: {},
  };
  const source = browserRunSource(wire(tree), 'sess-1');

  const root = await openRun(source, 'drt_a');
  assert.equal(root.ok, true);
  assert.equal(root.value.bucket, 'root');
  assert.ok(root.value.names.has('final'));

  const review = await root.value.read('review.md');
  assert.equal(review.ok, true);
  assert.equal(review.value.text, 'readiness: PASS');
  assert.equal(review.value.version, 'v-1');

  const version = await root.value.version('review.md');
  assert.equal(version.ok, true);
  assert.equal(version.value, 'v-1');

  const empty = await openRun(source, 'drt_empty');
  assert.equal(empty.ok, true);
  assert.equal(empty.value.dir, 'drt_empty');
  assert.equal(empty.value.entries.length, 0);

  const arch = await openRun(source, 'drt_b');
  assert.equal(arch.ok, true);
  assert.equal(arch.value.bucket, 'archive');
});

test('browserRunSource：not-found → missing；其它错误 → unreadable', async () => {
  const source = browserRunSource(wire({ drt_a: {} }, { errors: { 'drt_a/blocked.md': 'workspace-file/outside-workspace' } }), 'sess-1');
  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);

  const missing = await opened.value.read('nope.md');
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'missing');

  const blocked = await opened.value.read('blocked.md');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'unreadable');
  assert.match(blocked.detail ?? '', /outside-workspace/);

  const ghost = await openRun(source, 'drt_ghost');
  assert.equal(ghost.ok, false);
  assert.equal(ghost.reason, 'missing');
});

test('browserRunSource：malformed wire 一律 unreadable（不猜）', async () => {
  const listBad = browserRunSource(wire({ drt_a: {} }, { malformed: 'list' }), 'sess-1');
  const opened = await openRun(listBad, 'drt_a');
  assert.equal(opened.ok, false);
  assert.equal(opened.reason, 'unreadable');

  const readBad = browserRunSource(wire({ drt_a: { 'x.md': 'x' } }, { malformed: 'read' }), 'sess-1');
  const view = await openRun(readBad, 'drt_a');
  assert.equal(view.ok, true);
  const read = await view.value.read('x.md');
  assert.equal(read.ok, false);
  assert.equal(read.reason, 'unreadable');

  const statBad = browserRunSource(wire({ drt_a: { 'x.md': 'x' } }, { malformed: 'stat' }), 'sess-1');
  const statView = await openRun(statBad, 'drt_a');
  assert.equal(statView.ok, true);
  const version = await statView.value.version('x.md');
  assert.equal(version.ok, false);
  assert.equal(version.reason, 'unreadable');
});
