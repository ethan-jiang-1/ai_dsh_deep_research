// run-dashboard 回归 — RFC notes/implemented/2026-09-24-m2-run-dashboard.md 的 keyless 验收：
// fixture run 目录 → 断言矩阵计数与分级统计精确；fail-soft（缺失/畸形不 throw）。
// 反证方法：改 fixture 数字（如 evidence quality A→B）本文件必须红——见 RFC 验收判据。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildModel,
  deriveStep,
  renderHtml,
  topicEvidenceMatrix,
  gapStats,
  parseReview,
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

test('review：两相 review.md 取终局判定（首审 FAIL → 复核 PASS）', () => {
  // 边界形态 = 真实形态（drt_cn-us-cpu-gap/review.md）：结论摘要里一处散文提及 + 首审
  // `# readiness: FAIL` + lead 改稿后文末复核 `## readiness: PASS`。取首个匹配会把已交付的
  // run 报成 FAIL（本轮修的真实缺陷）。
  const twoPhase = [
    '# Review — drt_demo（审查对象：final.md）',
    '- **结论摘要**：**readiness: FAIL**——三处口径没随结论走。',
    '## objection 1 — 下限无来源',
    '# readiness: FAIL',
    '# 复核（lead 改稿后）：终审',
    '## readiness: PASS',
  ].join('\n');
  assert.equal(parseReview(twoPhase).readiness, 'PASS');
  assert.equal(parseReview('## readiness: FAIL').readiness, 'FAIL'); // 单相仍取唯一判定
  assert.equal(parseReview('本文件没有判定行'), null); // fail-soft 不变
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

// ── debug-dashboard-plus（RFC notes/implemented/2026-09-24-debug-dashboard-plus.md）──────
// 多场扫描 / 场内进度 / 步骤推导 / final 与 review 双命名容纳 / HITL 等待检测（zstd 夹具
// 测试内生成——node:zlib 原生，无子进程，layering 纪律不破）。
import { mkdirSync, rmSync, writeFileSync, utimesSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { zstdCompressSync } from 'node:zlib';
import { listScenes, sceneState, detectHitlWait } from '../scripts/run-dashboard.mjs';

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

test('HITL 等待检测：v4 未答 ask 等待；匹配 callId 的 v3 答案/取消结果关闭', () => {
  const root = mktmp();
  try {
    const sess = join(root, 'sessions', 'grp');
    // 夹具对齐真实日志格式：逐次 append 的 zstd 多帧拼接（一次写入一帧；DSH 实测 357 帧/639 行）
    const mk = (id, lineGroups, generation = 'v4') => {
      const d = join(sess, id);
      mkdirSync(d, { recursive: true });
      const buf = Buffer.concat(
        lineGroups.map((g) => zstdCompressSync(Buffer.from(g.map((l) => JSON.stringify(l)).join('\n') + '\n'))),
      );
      writeFileSync(join(d, `session.${generation}.jsonl.zstd`), buf);
    };
    const t = Date.now();
    const ask = (id, time) => ({ type: 'tool/call', time, data: { callId: id, name: 'ask_user_question', arguments: '{}' } });
    mk('session-waiting', [
      [{ type: 'session', time: t - 60000 }, { type: 'turn/start', time: t - 50000 }],
      [ask('c1', t - 30000)], // 最后一帧 = 未答 ask → 等待
    ]);
    mk('session-answered', [
      [{ type: 'tool/call', time: t - 30000, data: { callId: 'c1', name: 'ask_user_question', arguments: '{}' } },
       { type: 'tool/result', time: t - 10000, data: { message: { role: 'user', source: { kind: 'tool', callId: 'c1' }, content: [{ type: 'tool-result', toolCallId: 'c1', content: 'answer' }] } } }],
    ], 'v3');
    mk('session-cancelled', [
      [{ type: 'tool/call', time: t - 30000, data: { callId: 'c2', name: 'ask_user_question', arguments: '{}' } },
       { type: 'tool/result', time: t - 5000, data: { message: { role: 'user', source: { kind: 'tool', callId: 'c2' }, content: [{ type: 'tool-result', toolCallId: 'c2', content: 'cancelled' }], isError: true } } }],
    ], 'v3');
    const waiting = detectHitlWait(join(root, 'sessions'), { maxAgeMs: 3600 * 1000 });
    assert.equal(waiting.length, 1);
    assert.equal(waiting[0].session, 'waiting');
    assert.equal(waiting[0].since, new Date(t - 30000).toISOString());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('HITL 公共投影：timed pending 与元数据/agent 后续事件不关闭；新代坏尾不回退旧代', () => {
  const root = mktmp();
  try {
    const t = Date.now();
    const ask = { type: 'tool/call', time: t, data: { callId: 'c', name: 'ask_user_question' } };
    const pending = (generation) => ({ type: 'tool/result', data: { message: generation === 'v3'
      ? { role: 'user', source: { kind: 'tool', callId: 'c' }, content: [{ type: 'tool-result', toolCallId: 'c', content: [{ type: 'text', text: '{"pending":true}' }] }] }
      : { role: 'tool', toolCallId: 'c', content: [{ type: 'text', text: '{"pending":true}' }] } } });
    const put = (id, generation, events) => {
      const dir = join(root, 'grp', `session-${id}`);
      mkdirSync(dir, { recursive: true });
      const file = join(dir, `session.${generation}.jsonl.zstd`);
      writeFileSync(file, zstdCompressSync(Buffer.from(events.map(JSON.stringify).join('\n') + '\n')));
      return file;
    };
    for (const generation of ['v3', 'v4']) {
      put(generation, generation, [ask, pending(generation), { type: 'assistant/message' }, { type: 'session/title' }, { type: 'turn/end' }]);
    }
    put('closed', 'v3', [ask]);
    put('closed', 'v4', [ask, pending('v4'), { type: 'user/message' }]);
    put('broken', 'v3', [ask]);
    const broken = put('broken', 'v4', [ask]);
    writeFileSync(broken, Buffer.concat([zstdCompressSync(Buffer.from(JSON.stringify(ask) + '\n')), Buffer.from([0x28, 0xb5])]));
    const linkedOld = put('linked', 'v3', [ask]);
    symlinkSync(join(root, 'missing-log-target'), linkedOld.replace('v3', 'v4'));
    put('cancel-only', 'v4', [ask, { type: 'session/cancel' }]);
    const waiting = detectHitlWait(root);
    assert.deepEqual(waiting.map((w) => w.session).sort(), ['cancel-o', 'v3', 'v4']);
    assert.ok(waiting.every((w) => w.since === new Date(t).toISOString()));
    assert.deepEqual(detectHitlWait(root, { maxAgeMs: -1000 }), [], '过期日志不投影');
    assert.deepEqual(detectHitlWait(join(root, 'missing')), [], '缺席日志 fail-soft');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('deriveStep 保留 dashboard 内容解析语义，sceneState.done 保留文件计数', () => {
  const empty = { question: null, leads: [], stats: { evidence: 0 }, findings: [], review: null, final: null };
  assert.deepEqual(deriveStep(empty).map((s) => [s.label, s.state]), [
    ['立项', 'pending'], ['组队', 'pending'], ['侦察', 'pending'], ['挖掘', 'pending'],
    ['综合', 'pending'], ['审查', 'pending'], ['交付', 'pending'],
  ]);
  assert.deepEqual(deriveStep({ ...empty, question: {} }).map((s) => s.state), ['done', 'current', 'pending', 'pending', 'pending', 'pending', 'pending']);
  assert.equal(deriveStep({ ...empty, final: {} }).at(-1).state, 'current');
  const root = mktmp();
  try {
    writeFileSync(join(root, 'final.md'), '# Final\n');
    assert.deepEqual(sceneState(root), { lastStep: 'final', done: 1 }, '仅 final 在场不能算前六步完成');
    rmSync(join(root, 'final.md'));
    writeFileSync(join(root, 'question.md'), '# Question\n');
    assert.deepEqual(sceneState(root), { lastStep: 'team', done: 2 }, '组队在场性随立项计数');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
