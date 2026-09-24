// run-dashboard 回归 — RFC notes/proposed/2026-09-24-m2-run-dashboard.md 的 keyless 验收：
// fixture run 目录 → 断言矩阵计数与分级统计精确；fail-soft（缺失/畸形不 throw）。
// 反证方法：改 fixture 数字（如 evidence quality A→B）本文件必须红——见 RFC 验收判据。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildModel,
  renderHtml,
  topicEvidenceMatrix,
  gapStats,
} from '../scripts/run-dashboard.mjs';

const RUN = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'run-dashboard', 'run');

test('run 头部：question 快照与 Decisions 计数', () => {
  const m = buildModel(RUN);
  assert.equal(m.question.profile, 'exploratory_map');
  assert.equal(m.question.depth, '标准报告');
  assert.equal(m.question.decisions, 1);
  assert.match(m.question.question, /Deep Research/);
});

test('topic × evidence 矩阵：计数与 A–D 分布精确', () => {
  const m = buildModel(RUN);
  assert.equal(m.topics.length, 2);
  assert.deepEqual(m.topics.map((t) => t.questions), [2, 2]);
  const rows = topicEvidenceMatrix(m.topics, m.evidence);
  const t1 = rows.find((r) => r.topic === 'T1');
  const t2 = rows.find((r) => r.topic === 'T2');
  assert.equal(t1.count, 1);
  assert.deepEqual(t1.dist, { A: 1, B: 0, C: 0, D: 0 });
  assert.equal(t2.count, 1);
  assert.deepEqual(t2.dist, { A: 0, B: 0, C: 0, D: 1 });
});

test('leads 概览：方向数 / 挖深 vs 排除 / 分级', () => {
  const m = buildModel(RUN);
  assert.equal(m.leads.length, 2);
  assert.equal(m.leads.filter((x) => x.status === 'dig').length, 1);
  const exc = m.leads.find((x) => x.status === 'excluded');
  assert.equal(exc.excludedReason, '样本偏 anecdotes、口径不明——交叉价值低');
  assert.deepEqual(m.leads[0].grades, ['A', 'B']);
});

test('findings：gap 四态统计与证据链接', () => {
  const m = buildModel(RUN);
  assert.equal(m.findings.length, 2);
  assert.deepEqual(gapStats(m.findings), { supported: 1, needs_search: 0, contradicted: 1, insufficient: 0 });
  const f1 = m.findings.find((f) => f.id === 'F1');
  assert.equal(f1.evidence.length, 2);
  assert.ok(f1.evidence.every((e) => e.startsWith('evidence/')));
});

test('review：readiness 与分级计数', () => {
  const m = buildModel(RUN);
  assert.equal(m.review.readiness, 'PASS');
  assert.equal(m.review.critical, 0);
  assert.equal(m.review.major, 1);
  assert.equal(m.review.minor, 1);
});

test('journal 尾部与文件统计', () => {
  const m = buildModel(RUN);
  assert.ok(m.journal.length >= 1 && m.journal.length <= 15);
  assert.equal(m.stats.evidence, 2);
  assert.ok(m.stats.lastModified);
});

test('fail-soft：缺席的 run 目录不 throw，渲染继续', () => {
  const m = buildModel(join(RUN, '..', 'no-such-run'));
  assert.ok(m.missing.includes('question.md'));
  assert.ok(m.missing.includes('evidence/'));
  assert.equal(m.review, null);
  const html = renderHtml(m);
  assert.match(html, /未开始/);
  assert.doesNotThrow(() => renderHtml(m));
});

test('渲染壳：关键区块与 meta refresh 在场', () => {
  const m = buildModel(RUN);
  const html = renderHtml(m);
  assert.match(html, /run dashboard — run/); // slug = run 目录名（basename）
  assert.match(html, /PASS/);
  assert.match(html, /A:1 B:0 C:0 D:0/); // T1 行
  assert.match(html, /A:0 B:0 C:0 D:1/); // T2 行
  assert.match(html, /http-equiv="refresh" content="5"/);
  assert.match(html, /只读投影/);
});
