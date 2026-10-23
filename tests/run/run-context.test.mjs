// run-context 回归 —— run bundle 的读面（keyless）：三位置发现、同名优先级、分页到 eof、
// 按文件类型的读策略、missing/unreadable 区分、version 探针、listRuns 枚举。
// 先红后绿（2026-10-23）：本文件先落，lib 模块后写——首跑应红在模块缺席；实现后全绿。
// 反证口径：1448 行 review 的 FAIL@571 / PASS@1442 是真实 archive 文件的形态（见
// notes/implemented/2026-10-19-final-tab-round-close.md §4），不是合成怪例。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terminalReadiness } from '../../packages/deep-research-pack/src/lib/review-readiness.ts';
import { bundleCandidates, openRun, listRuns, readPolicyOf } from '../../packages/deep-research-pack/src/lib/run-context.ts';

const OUT = (value) => ({ ok: true, value });
const MISSING = { ok: false, reason: 'missing' };
const UNREADABLE = (detail = 'boom') => ({ ok: false, reason: 'unreadable', detail });

/** 树 → 假 source：`{ 'drt_x': { 'review.md': 'text', evidence: { 'e.md': '…' } } }`。
 *  errors 按目录或文件路径注入 unreadable；mtimes 按目录名注入 mtimeMs；stall 按文件路径注入。 */
function fakeSource(tree, { errors = {}, mtimes = {}, stall = new Set(), failRead = {} } = {}) {
  const calls = [];
  const nodeAt = (path) => {
    if (path === '' || path === '.') return tree;
    let node = tree;
    for (const part of path.split('/').filter(Boolean)) {
      if (node === null || typeof node !== 'object' || Array.isArray(node)) return undefined;
      node = node[part];
      if (node === undefined) return undefined;
    }
    return node;
  };
  const fileAt = (path) => {
    const node = nodeAt(path);
    return typeof node === 'string' ? node : null;
  };
  const linesOf = (text) => text.split('\n');
  return {
    calls,
    async list(dir) {
      calls.push(['list', dir]);
      if (errors[dir] === 'unreadable') return UNREADABLE(`list ${dir}`);
      const node = nodeAt(dir);
      if (node === undefined) return MISSING;
      if (typeof node === 'string') return UNREADABLE(`not a directory: ${dir}`);
      return OUT(Object.entries(node).map(([name, child]) => ({
        name,
        type: typeof child === 'string' ? 'file' : 'directory',
        ...(mtimes[dir] !== undefined ? { mtimeMs: mtimes[dir] } : {}),
      })));
    },
    async read(path, { offset, limit }) {
      calls.push(['read', path, offset, limit]);
      if (failRead[path] !== undefined) return failRead[path];
      if (stall.has(path)) return OUT({ text: '', lines: 0, eof: false });
      const node = nodeAt(path);
      if (node === undefined) return MISSING;
      if (typeof node !== 'string') return UNREADABLE(`not a file: ${path}`);
      const lines = linesOf(node);
      const slice = lines.slice(offset - 1, offset - 1 + limit);
      return OUT({
        text: slice.join('\n'),
        lines: slice.length,
        eof: offset - 1 + slice.length >= lines.length,
        version: 'v-test',
      });
    },
    async version(path) {
      calls.push(['version', path]);
      return fileAt(path) === null ? MISSING : OUT('v-test');
    },
  };
}

const reviewLines = (count = 1448) => Array.from({ length: count }, (_, index) => {
  if (index === 570) return 'readiness: FAIL';
  if (index === 1441) return 'readiness: PASS';
  return `line ${String(index + 1)}`;
});

test('openRun：根 / archive / _abandoned 三位置都认；结果带 bucket 与 names', async () => {
  const tree = {
    drt_root: { 'question.md': 'Q' },
    archive: { drt_arch: { 'final.md': 'F' } },
    _abandoned: { drt_park: {} },
  };
  const source = fakeSource(tree);

  const root = await openRun(source, 'drt_root');
  assert.equal(root.ok, true);
  assert.equal(root.value.dir, 'drt_root');
  assert.equal(root.value.bucket, 'root');
  assert.equal(root.value.slug, 'root');
  assert.ok(root.value.names.has('question.md'));

  const arch = await openRun(source, 'drt_arch');
  assert.equal(arch.ok, true);
  assert.equal(arch.value.dir, 'archive/drt_arch');
  assert.equal(arch.value.bucket, 'archive');

  const park = await openRun(source, 'drt_park');
  assert.equal(park.ok, true);
  assert.equal(park.value.dir, '_abandoned/drt_park');
  assert.equal(park.value.bucket, 'abandoned');
});

test('openRun：同名根优先；显式 archive 路径优先 archive；过期 archive 路径回退根', async () => {
  const tree = {
    drt_same: { 'question.md': 'root' },
    archive: { drt_same: { 'final.md': 'arch' } },
  };
  const source = fakeSource(tree);

  const bySlug = await openRun(source, 'drt_same');
  assert.equal(bySlug.ok, true);
  assert.equal(bySlug.value.dir, 'drt_same');

  const byArchivedPath = await openRun(source, 'archive/drt_same/final.md');
  assert.equal(byArchivedPath.ok, true);
  assert.equal(byArchivedPath.value.dir, 'archive/drt_same');

  const staleArchived = await openRun(source, 'archive/drt_missing/final.md');
  assert.equal(staleArchived.ok, false);
  assert.equal(staleArchived.reason, 'missing');
});

test('openRun：空根目录是合法 run，不让位给 archive 同名副本（D28：位置只用于发现）', async () => {
  const tree = {
    drt_empty: {},
    archive: { drt_empty: { 'final.md': 'F' } },
  };
  const source = fakeSource(tree);
  const found = await openRun(source, 'drt_empty');
  assert.equal(found.ok, true);
  assert.equal(found.value.dir, 'drt_empty');
  assert.equal(found.value.entries.length, 0);
});

test('openRun：三处皆无 → missing；根不可读且 archive 可用 → archive；全不可读 → unreadable', async () => {
  const tree = { archive: { drt_ok: { 'final.md': 'F' } } };
  const ghost = await openRun(fakeSource(tree), 'drt_ghost');
  assert.equal(ghost.ok, false);
  assert.equal(ghost.reason, 'missing');

  const fallback = await openRun(fakeSource(tree, { errors: { drt_ok: 'unreadable' } }), 'drt_ok');
  assert.equal(fallback.ok, true);
  assert.equal(fallback.value.dir, 'archive/drt_ok');

  const red = await openRun(fakeSource(tree, { errors: { drt_ok: 'unreadable', 'archive/drt_ok': 'unreadable' } }), 'drt_ok');
  assert.equal(red.ok, false);
  assert.equal(red.reason, 'unreadable');
});

test('review.md：读到 eof，长文件终局 PASS 不被 600 行窗内的旧 FAIL 夺权', async () => {
  const lines = reviewLines();
  const source = fakeSource({ drt_a: { 'review.md': lines.join('\n') } });
  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);
  const review = await opened.value.read('review.md');
  assert.equal(review.ok, true);
  assert.equal(review.value.lines, 1448);
  assert.equal(review.value.truncated, false);
  assert.equal(terminalReadiness(review.value.text), 'PASS');
  // 反事实：陈旧读法（600 行窗）读到的是中段旧 FAIL。
  assert.equal(terminalReadiness(lines.slice(0, 600).join('\n')), 'FAIL');
  // 分页而不是一把梭：至少两次 read 调用。
  assert.ok(source.calls.filter(([kind, path]) => kind === 'read' && path === 'drt_a/review.md').length >= 2);
});

test('读策略：plan.md 800、question.md 80、其它 40；截断如实标记', async () => {
  const long = (n) => Array.from({ length: n }, (_, i) => `l${String(i + 1)}`).join('\n');
  const source = fakeSource({
    drt_a: {
      'plan.md': long(1000),
      plan: { 'v1.md': long(1000) },
      'question.md': long(120),
      evidence: { 'e.md': long(100) },
      final: { 'v2.md': long(1200) },
    },
  });
  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);
  const view = opened.value;

  const plan = await view.read('plan.md');
  assert.equal(plan.ok, true);
  assert.equal(plan.value.lines, 800);
  assert.equal(plan.value.truncated, true);

  const snapshot = await view.read('plan/v1.md');
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.value.lines, 800);
  assert.equal(snapshot.value.truncated, true);

  const question = await view.read('question.md');
  assert.equal(question.ok, true);
  assert.equal(question.value.lines, 80);
  assert.equal(question.value.truncated, true);

  const evidence = await view.read('evidence/e.md');
  assert.equal(evidence.ok, true);
  assert.equal(evidence.value.lines, 40);
  assert.equal(evidence.value.truncated, true);

  const finalV2 = await view.read('final/v2.md');
  assert.equal(finalV2.ok, true);
  assert.equal(finalV2.value.lines, 1200);
  assert.equal(finalV2.value.truncated, false);
});

test('read：缺文件 → missing；绝对/上跳/空名 → unreadable；目录 → unreadable', async () => {
  const source = fakeSource({ drt_a: { evidence: { 'e.md': 'x' } } });
  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);
  const view = opened.value;
  const missing = await view.read('missing.md');
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'missing');
  for (const bad of ['../x.md', '/abs.md', '', 'evidence/../../x.md']) {
    const r = await view.read(bad);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'unreadable');
  }
  const dir = await view.read('evidence');
  assert.equal(dir.ok, false);
  assert.equal(dir.reason, 'unreadable');
});

test('list：根与子目录；缺目录 → missing；上跳 → unreadable', async () => {
  const source = fakeSource({ drt_a: { 'question.md': 'Q', evidence: { 'e.md': 'x' } } });
  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);
  const view = opened.value;
  const root = await view.list('');
  assert.equal(root.ok, true);
  assert.deepEqual(root.value.map((e) => e.name).sort(), ['evidence', 'question.md']);
  const ev = await view.list('evidence');
  assert.equal(ev.ok, true);
  assert.deepEqual(ev.value.map((e) => e.name), ['e.md']);
  const noDir = await view.list('nope');
  assert.equal(noDir.ok, false);
  assert.equal(noDir.reason, 'missing');
  const bad = await view.list('../x');
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'unreadable');
});

test('read：零行且非 eof 的页 = stalled → unreadable（不无限翻页）', async () => {
  const source = fakeSource({ drt_a: { 'review.md': 'x' } }, { stall: new Set(['drt_a/review.md']) });
  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);
  const r = await opened.value.read('review.md');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'unreadable');
  assert.match(r.detail ?? '', /stalled/);
});

test('read：eof 页数上限 → truncated（不静默短读）', async () => {
  const lines = Array.from({ length: 64 * 500 + 1 }, (_, i) => `l${String(i + 1)}`);
  const source = fakeSource({ drt_a: { 'review.md': lines.join('\n') } });
  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);
  const r = await opened.value.read('review.md');
  assert.equal(r.ok, true);
  assert.equal(r.value.truncated, true);
  assert.equal(r.value.eof, false);
  assert.equal(source.calls.filter(([kind]) => kind === 'read').length, 64);
});

test('listRuns：三桶枚举、同 slug 根优先、mtime 降序、buckets 过滤', async () => {
  const tree = {
    drt_a: {},
    drt_b: {},
    archive: { drt_a: {}, drt_c: {} },
  };
  const source = fakeSource(tree, { mtimes: { '': 300, archive: 200 } });
  const all = await listRuns(source);
  assert.equal(all.ok, true);
  assert.deepEqual(all.value.map((r) => r.slug).sort(), ['a', 'b', 'c']);
  assert.deepEqual(all.value.find((r) => r.slug === 'a').bucket, 'root');
  assert.deepEqual(all.value.map((r) => r.bucket), ['root', 'root', 'archive']); // mtime 同桶内 slug 序

  const onlyArchive = await listRuns(source, { buckets: ['archive'] });
  assert.equal(onlyArchive.ok, true);
  assert.deepEqual(onlyArchive.value.map((r) => r.slug).sort(), ['a', 'c']);
});

test('listRuns：全无 → missing；有目录但全不可读 → unreadable', async () => {
  const empty = await listRuns(fakeSource({}));
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, 'missing');
  const red = await listRuns(fakeSource({}, { errors: { '': 'unreadable', archive: 'unreadable', _abandoned: 'unreadable' } }));
  assert.equal(red.ok, false);
  assert.equal(red.reason, 'unreadable');
});

test('version：按 view 基址解析，委托 source.version', async () => {
  const source = fakeSource({ archive: { drt_a: { 'final.md': 'F' } } });
  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);
  const v = await opened.value.version('final.md');
  assert.equal(v.ok, true);
  assert.equal(v.value, 'v-test');
  assert.deepEqual(source.calls.at(-1), ['version', 'archive/drt_a/final.md']);
});

test('bundleCandidates / readPolicyOf：候选顺序与读策略表是纯函数', () => {
  assert.deepEqual(bundleCandidates('drt_x'), ['drt_x', 'archive/drt_x', '_abandoned/drt_x']);
  assert.deepEqual(bundleCandidates('archive/drt_x/final.md'), ['archive/drt_x', 'drt_x', '_abandoned/drt_x']);
  assert.deepEqual(bundleCandidates('../evil'), []);
  assert.equal(readPolicyOf('review.md'), 'eof');
  assert.equal(readPolicyOf('final/v3.md'), 'eof');
  assert.equal(readPolicyOf('plan.md'), 800);
  assert.equal(readPolicyOf('plan/v1.md'), 800);
  assert.equal(readPolicyOf('question.md'), 80);
  assert.equal(readPolicyOf('evidence/e.md'), 40);
});
