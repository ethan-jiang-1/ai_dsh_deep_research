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

// ── debug-dashboard-plus（RFC notes/proposed/2026-09-24-debug-dashboard-plus.md）──────
// 多场扫描 / 场内进度 / 步骤推导 / final 与 review 双命名容纳 / HITL 等待检测（zstd 夹具
// 测试内生成——node:zlib 原生，无子进程，layering 纪律不破）。
import { mkdirSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { zstdCompressSync } from 'node:zlib';
import { listScenes, sceneState, deriveStep, detectHitlWait } from '../scripts/run-dashboard.mjs';

const mktmp = () => mkdirSync(join(tmpdir(), `dash-${Math.random().toString(36).slice(2)}`), { recursive: true });

test('多场扫描：drt_ 前缀过滤 + ad-hoc 全收 + mtime 降序', () => {
  const root = mktmp();
  try {
    const rw = join(root, 'rw');
    const ah = join(root, 'ah');
    mkdirSync(join(rw, 'drt_b'), { recursive: true });
    mkdirSync(join(rw, 'drt_a'), { recursive: true });
    writeFileSync(join(rw, 'README.md'), 'x'); // 文件非 run 场，排除
    mkdirSync(join(ah, 'adhoc-x'), { recursive: true });
    const t = Date.now() / 1000;
    utimesSync(join(rw, 'drt_a'), t - 100, t - 100);
    utimesSync(join(rw, 'drt_b'), t - 10, t - 10);
    utimesSync(join(ah, 'adhoc-x'), t - 50, t - 50);
    const scenes = listScenes([
      { dir: rw, kind: 'drt', label: 'drt' },
      { dir: ah, kind: 'ad-hoc', label: 'ad-hoc·无契约' },
    ]);
    assert.deepEqual(scenes.map((s) => s.slug), ['drt_b', 'adhoc-x', 'drt_a']);
    assert.deepEqual(scenes.map((s) => s.kind), ['drt', 'ad-hoc', 'drt']);
    assert.equal(listScenes([{ dir: join(root, 'nope'), kind: 'drt', label: 'drt' }]).length, 0); // 根缺席 fail-soft
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('场内进度与步骤推导：final/review 双命名容纳 + 流程语义', () => {
  const root = mktmp();
  try {
    const run = join(root, 'drt_x');
    mkdirSync(run, { recursive: true });
    for (const f of ['question.md', 'topics.md', 'leads.md', 'findings.md']) writeFileSync(join(run, f), 'x');
    mkdirSync(join(run, 'evidence'));
    writeFileSync(join(run, 'evidence', 'a.md'), 'x');
    writeFileSync(join(run, 'review-critic.md'), 'readiness: PASS'); // 化石命名
    mkdirSync(join(run, 'final'));
    writeFileSync(join(run, 'final', 'v1.md'), 'x');
    writeFileSync(join(run, 'final', 'v2.md'), 'x');
    const st = sceneState(run);
    assert.equal(st.lastStep, 'final');
    assert.equal(st.done, 7);
    const m = buildModel(run);
    assert.deepEqual(m.final, { file: 'final/v2.md', versioned: true }); // 最大版号 = 当前版
    assert.equal(m.review.readiness, 'PASS');
    const steps = deriveStep(m);
    assert.equal(steps.find((s) => s.key === 'final').state, 'current');
    assert.equal(steps.find((s) => s.key === 'question').state, 'done');
    // final.md 化石命名同样容纳
    const run2 = join(root, 'drt_y');
    mkdirSync(run2, { recursive: true });
    writeFileSync(join(run2, 'final.md'), 'x');
    assert.equal(buildModel(run2).final.versioned, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('HITL 等待检测：末事件为未答 ask = 等待；已答/取消 = 不等待', () => {
  const root = mktmp();
  try {
    const sess = join(root, 'sessions', 'grp');
    // 夹具对齐真实日志格式：逐次 append 的 zstd 多帧拼接（一次写入一帧；DSH 实测 357 帧/639 行）
    const mk = (id, lineGroups) => {
      const d = join(sess, id);
      mkdirSync(d, { recursive: true });
      const buf = Buffer.concat(
        lineGroups.map((g) => zstdCompressSync(Buffer.from(g.map((l) => JSON.stringify(l)).join('\n') + '\n'))),
      );
      writeFileSync(join(d, 'session.v3.jsonl.zstd'), buf);
    };
    const t = Date.now();
    const ask = (id, time) => ({ type: 'tool/call', time, data: { callId: id, name: 'ask_user_question', arguments: '{}' } });
    mk('session-waiting', [
      [{ type: 'session', time: t - 60000 }, { type: 'turn/start', time: t - 50000 }],
      [ask('c1', t - 30000)], // 最后一帧 = 未答 ask → 等待
    ]);
    mk('session-answered', [
      [{ type: 'tool/call', time: t - 30000, data: { callId: 'c1', name: 'ask_user_question', arguments: '{}' } },
       { type: 'tool/result', time: t - 10000, data: { message: { source: { callId: 'c1' } } } }],
    ]);
    mk('session-cancelled', [
      [{ type: 'tool/call', time: t - 30000, data: { callId: 'c2', name: 'ask_user_question', arguments: '{}' } },
       { type: 'session/cancel', time: t - 5000 }],
    ]);
    const waiting = detectHitlWait(join(root, 'sessions'), { maxAgeMs: 3600 * 1000 });
    assert.equal(waiting.length, 1);
    assert.equal(waiting[0].session, 'waiting');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
