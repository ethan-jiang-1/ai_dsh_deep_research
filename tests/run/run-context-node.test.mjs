// run-context-node 回归 —— `node:fs` 的 RunSource 适配器（keyless，临时目录）。
// 断言对齐 vendor workspaceFiles 的分页语义（offset 1 起、末尾 \n 不额外算行、eof 才停），
// 以及 missing / unreadable 的区分；位置与读策略本身由 run-context.test.mjs 钉。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openRun, listRuns } from '../../packages/deep-research-pack/src/lib/run-context.ts';
import { nodeRunSource } from '../../scripts/lib/run-source-node.mjs';

const reviewLines = (count = 1448) => Array.from({ length: count }, (_, index) => {
  if (index === 570) return 'readiness: FAIL';
  if (index === 1441) return 'readiness: PASS';
  return `line ${String(index + 1)}`;
});

function workspace(t) {
  const root = mkdtempSync(join(tmpdir(), 'run-context-node-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'drt_a'), { recursive: true });
  mkdirSync(join(root, 'drt_a', 'final'), { recursive: true });
  mkdirSync(join(root, 'archive', 'drt_b'), { recursive: true });
  mkdirSync(join(root, '_abandoned', 'drt_c'), { recursive: true });
  writeFileSync(join(root, 'drt_a', 'review.md'), `${reviewLines().join('\n')}\n`);
  writeFileSync(join(root, 'drt_a', 'final', 'v1.md'), 'draft v1\n');
  writeFileSync(join(root, 'archive', 'drt_b', 'final.md'), 'archived final\n');
  return root;
}

test('nodeRunSource：openRun 根/archive；review 读到 eof；version 是稳定字符串', async (t) => {
  const root = workspace(t);
  const source = nodeRunSource(root);
  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);
  assert.equal(opened.value.bucket, 'root');
  assert.ok(opened.value.names.has('review.md'));

  const review = await opened.value.read('review.md');
  assert.equal(review.ok, true);
  assert.equal(review.value.lines, 1448);
  assert.equal(review.value.truncated, false);
  assert.equal(review.value.text.endsWith('\n'), false);

  const first = await opened.value.version('review.md');
  const second = await opened.value.version('review.md');
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.value, second.value);

  const archived = await openRun(source, 'drt_b');
  assert.equal(archived.ok, true);
  assert.equal(archived.value.bucket, 'archive');
});

test('nodeRunSource：缺目录/缺文件 → missing；文件当目录 → unreadable', async (t) => {
  const root = workspace(t);
  const source = nodeRunSource(root);

  const ghost = await openRun(source, 'drt_ghost');
  assert.equal(ghost.ok, false);
  assert.equal(ghost.reason, 'missing');

  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);
  const missingFile = await opened.value.read('nope.md');
  assert.equal(missingFile.ok, false);
  assert.equal(missingFile.reason, 'missing');

  const asDir = await opened.value.list('review.md');
  assert.equal(asDir.ok, false);
  assert.equal(asDir.reason, 'unreadable');
});

test('nodeRunSource：空文件是 ok 空值，不是 missing；listRuns 三桶按 mtime 降序', async (t) => {
  const root = workspace(t);
  writeFileSync(join(root, 'drt_a', 'empty.md'), '');
  const source = nodeRunSource(root);
  const opened = await openRun(source, 'drt_a');
  assert.equal(opened.ok, true);
  const empty = await opened.value.read('empty.md');
  assert.equal(empty.ok, true);
  assert.equal(empty.value.lines, 0);
  assert.equal(empty.value.text, '');
  assert.equal(empty.value.eof, true);
  assert.equal(empty.value.truncated, false);

  // 固定 mtime，断言真实排序（root a 最新；archive b 次之；abandoned c 最旧）。
  utimesSync(join(root, 'drt_a'), new Date('2026-10-23T00:00:03Z'), new Date('2026-10-23T00:00:03Z'));
  utimesSync(join(root, 'archive', 'drt_b'), new Date('2026-10-23T00:00:02Z'), new Date('2026-10-23T00:00:02Z'));
  utimesSync(join(root, '_abandoned', 'drt_c'), new Date('2026-10-23T00:00:01Z'), new Date('2026-10-23T00:00:01Z'));
  const runs = await listRuns(source);
  assert.equal(runs.ok, true);
  assert.deepEqual(runs.value.map((run) => run.slug), ['a', 'b', 'c']);
  assert.deepEqual(runs.value.map((run) => run.bucket), ['root', 'archive', 'abandoned']);
});
