// tests/cockpit/plan-graph.test.mjs —— 「研究图谱」纯折算的 keyless 契约（W2 / F3）。
// 家 = packages/deep-research-pack/src/lib/plan-graph.ts；设计 = docs/design/40-research-cockpit.md §2 +
// _backlog/research/dynamic-research-dag/2026-10-21-cockpit-plan-graph.md §3–§5。
// 钉住五件事：最长路径分层（缺 blocker/环/自环 fail-soft）、wave 稳定序、attention 的
// 四条判据（不发明 failed 任务状态、不猜年龄）、worker chips 的降级面、plan.md 节点表解析。

import { test } from 'node:test'
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  DEFAULT_ATTENTION_THRESHOLDS,
  attentionOf,
  countsOf,
  levelsOf,
  planIndex,
  planIssuesOf,
  planNodeOf,
  stageOfKind,
  wavesOf,
  workerChipsOf,
} from '../../packages/deep-research-pack/src/lib/plan-graph.ts';

const MINUTE = 60_000;

test('levelsOf：最长路径分层（根 0，多前置取最大）', () => {
  const tasks = [
    { id: 'task-1', status: 'completed', blockedBy: [] },
    { id: 'task-2', status: 'in_progress', blockedBy: [] },
    { id: 'task-3', status: 'pending', blockedBy: ['task-1'] },
    { id: 'task-4', status: 'pending', blockedBy: ['task-1', 'task-3'] },
  ];
  const levels = levelsOf(tasks);
  assert.equal(levels.get('task-1'), 0);
  assert.equal(levels.get('task-2'), 0);
  assert.equal(levels.get('task-3'), 1);
  assert.equal(levels.get('task-4'), 2, '多前置取最长路径：task-1 直连不把它留在第 1 层');
});

test('levelsOf：缺失 blocker 忽略、自环忽略、成环钳在节点数 - 1（不 throw）', () => {
  const missing = levelsOf([{ id: 'X', blockedBy: ['ghost'] }]);
  assert.equal(missing.get('X'), 0);

  const selfLoop = levelsOf([{ id: 'S', blockedBy: ['S'] }]);
  assert.equal(selfLoop.get('S'), 0);

  const cyclic = [
    { id: 'A', blockedBy: ['C'] },
    { id: 'B', blockedBy: ['A'] },
    { id: 'C', blockedBy: ['B'] },
    { id: 'D', blockedBy: ['C'] },
  ];
  const levels = levelsOf(cyclic);
  assert.equal(levels.size, 4);
  for (const level of levels.values()) {
    assert.ok(Number.isInteger(level) && level >= 0 && level <= cyclic.length - 1, `环钳在有限层：${level}`);
  }
});

test('levelsOf：空 / 畸形输入退化为空结果（fail-soft）', () => {
  assert.equal(levelsOf([]).size, 0);
  assert.equal(levelsOf(undefined).size, 0);
  assert.equal(levelsOf(null).size, 0);
  assert.equal(levelsOf([null, 'text', 42, {}, { id: '' }, { id: 'ok' }]).size, 1);
});

test('wavesOf：按 level 分组；组内数字 id 升序（2 在 10 前），非数字按输入序兜底', () => {
  const tasks = [
    { id: 'task-10' },
    { id: 'task-2' },
    { id: 'alpha' },
    { id: 'task-1', blockedBy: ['task-2'] },
    { id: 'beta' },
  ];
  const waves = wavesOf(tasks);
  assert.deepEqual(waves.map((wave) => wave.level), [0, 1]);
  assert.deepEqual(waves[0].tasks.map((task) => task.id), ['task-2', 'task-10', 'alpha', 'beta']);
  assert.deepEqual(waves[1].tasks.map((task) => task.id), ['task-1']);
  assert.deepEqual(wavesOf([]), []);
});

test('attentionOf：ready + pending + 无 owner = 待派（warning）', () => {
  const items = attentionOf([{ id: 'N3', status: 'pending', ready: true, blockedBy: [] }], {}, 1_000);
  assert.equal(items.length, 1);
  assert.equal(items[0].taskId, 'N3');
  assert.equal(items[0].reason, 'unassigned');
  assert.equal(items[0].severity, 'warning');
  assert.equal(items[0].overdue, false, '没有 since 就不标超时');
});

test('attentionOf：in_progress + owner inactive = 可能卡住（文案不冒充事实、不发明 failed 状态）', () => {
  const tasks = [{ id: 'N3', status: 'in_progress', ownerName: 'scout', since: 0 }];
  const memberStatus = { scout: { phase: 'active', running: false } };
  const items = attentionOf(tasks, memberStatus, 10 * MINUTE);
  assert.equal(items.length, 1);
  assert.equal(items[0].reason, 'stalled');
  assert.match(items[0].message, /可能卡住/);
  assert.match(items[0].message, /10 分钟/);
  assert.equal(items[0].ageMs, 10 * MINUTE);
  assert.equal(items[0].overdue, true);
  assert.doesNotMatch(items[0].message, /任务失败|failed/);

  // 未观测到 running（undefined）= 不知道，不判卡住。
  assert.deepEqual(attentionOf(tasks, { scout: { phase: 'active' } }, 10 * MINUTE), []);
  // owner 在跑 = 正常。
  assert.deepEqual(attentionOf(tasks, { scout: { phase: 'active', running: true } }, 10 * MINUTE), []);
});

test('attentionOf：owner phase failed = critical（失败只在 owner 侧，任务状态不伪造）', () => {
  const tasks = [
    { id: 'N1', status: 'in_progress', ownerName: 'scout' },
    { id: 'N2', status: 'pending', ready: true, ownerName: 'analyst' },
    { id: 'N9', status: 'completed', ownerName: 'scout' },
  ];
  const items = attentionOf(tasks, { scout: { phase: 'failed' }, analyst: { phase: 'failed' } }, 0);
  assert.deepEqual(items.map((item) => [item.taskId, item.reason, item.severity]), [
    ['N1', 'owner-failed', 'critical'],
    ['N2', 'owner-failed', 'critical'],
  ], 'completed 任务不再报，ready 但 owner 失败时只报 owner 失败（不叠待派）');
  assert.match(items[0].message, /owner「scout」会话失败/);
});

test('attentionOf：blocked-too-long 只在年龄已知且超阈值时出现（不猜年龄）', () => {
  const blocked = { id: 'N3', status: 'pending', ready: false, blockedBy: ['N1'], since: 0 };
  const long = attentionOf([blocked], {}, 20 * MINUTE);
  assert.equal(long.length, 1);
  assert.equal(long[0].reason, 'blocked-too-long');
  assert.equal(long[0].severity, 'info');
  assert.match(long[0].message, /N1/);

  assert.deepEqual(attentionOf([blocked], {}, 5 * MINUTE), [], '未超阈值不报');
  const noSince = attentionOf([{ ...blocked, since: undefined }], {}, 20 * MINUTE);
  assert.deepEqual(noSince, [], '不知道年龄就不报「超久」');
});

test('attentionOf：阈值可覆盖（overdue 标注与 blocked 入场门），Map 形态可用', () => {
  const tasks = [{ id: 'N3', status: 'in_progress', ownerName: 'scout', since: 0 }];
  const memberStatus = new Map([['scout', { phase: 'active', running: false }]]);
  const items = attentionOf(tasks, memberStatus, 30_000, { stalledMs: MINUTE });
  assert.equal(items.length, 1);
  assert.equal(items[0].overdue, false, '30s < 1m 阈值：仍提示可能卡住，但不标超时');

  const over = attentionOf(tasks, memberStatus, 2 * MINUTE, { stalledMs: MINUTE });
  assert.equal(over[0].overdue, true);
  assert.equal(DEFAULT_ATTENTION_THRESHOLDS.blockedMs, 15 * MINUTE);
});

test('countsOf：头部三数（running / ready / stalled）+ done / total', () => {
  const tasks = [
    { id: 'N1', status: 'pending', ready: true },
    { id: 'N2', status: 'in_progress', ownerName: 'scout' },
    { id: 'N3', status: 'in_progress', ownerName: 'analyst' },
    { id: 'N4', status: 'completed' },
    { id: 'N5', status: 'deleted' },
  ];
  const counts = countsOf(tasks, {
    scout: { phase: 'active', running: true },
    analyst: { phase: 'active', running: false },
  });
  assert.deepEqual(counts, { total: 4, running: 1, ready: 1, stalled: 1, done: 1 });
});

test('workerChipsOf：按队员摊平 catalog（mode / label / status），空 label = worker 不编名', () => {
  const catalogs = {
    'member-1': [
      { id: 'w1', mode: 'one-shot', label: 'scout', createdAt: 1 },
      { id: 'w2', mode: 'continuable', label: 'analyst' },
      { id: 'w3', mode: 'weird-mode' },
      null,
      { id: '' },
    ],
    'member-2': [],
    'member-3': null,
  };
  const statusOf = (sessionId) => sessionId === 'w1' ? true : sessionId === 'w2' ? false : undefined;
  const chips = workerChipsOf(catalogs, statusOf);
  assert.equal(chips.length, 3, '畸形条目被跳过');
  assert.deepEqual(chips.map((chip) => [chip.memberId, chip.id, chip.mode, chip.label, chip.named, chip.status]), [
    ['member-1', 'w1', 'one-shot', 'scout', true, 'running'],
    ['member-1', 'w2', 'continuable', 'analyst', true, 'inactive'],
    ['member-1', 'w3', 'unknown', 'worker', false, 'unknown'],
  ]);
});

test('workerChipsOf：缺失/空输入与状态查询抛错全部降级（不 throw）', () => {
  assert.deepEqual(workerChipsOf({}, undefined), []);
  assert.deepEqual(workerChipsOf(null, () => true), []);
  assert.deepEqual(workerChipsOf(undefined, () => true), []);
  const chips = workerChipsOf({ m: [{ id: 'x' }] }, () => { throw new Error('boom') });
  assert.equal(chips.length, 1);
  assert.equal(chips[0].status, 'unknown');
});

test('planIndex：解析 plan.md 节点表（N-id / kind / depth / acceptance / task_id / deps）', () => {
  const text = [
    '# Plan — demo',
    '',
    '| id | kind | question | owner_role | deps | output | acceptance | depth | task_id |',
    '|---|---|---|---|---|---|---|---|---|',
    '| N1 | broad-scan | where | scout | — | leads.md §T1 | coverage | L1 | task-1 |',
    '| N2 | deep-dive | claim | analyst | N1,N3 | evidence/t1.md | ≥2 independent | L2 | |',
    '',
    '## 重写记录',
    '- 2026-10-21 / 加节点 / N2 / 原因 / journal',
  ].join('\n');
  const index = planIndex(text);
  assert.equal(index.nodes.length, 2);
  assert.equal(index.nodes[0].id, 'N1');
  assert.equal(index.nodes[0].kind, 'broad-scan');
  assert.equal(index.nodes[0].depth, 'L1');
  assert.equal(index.nodes[0].acceptance, 'coverage');
  assert.equal(index.nodes[0].taskId, 'task-1');
  assert.deepEqual(index.nodes[0].deps, [], '占位符 — = 无依赖');
  assert.deepEqual(index.nodes[1].deps, ['N1', 'N3']);
  assert.equal(index.nodes[1].taskId, undefined);

  assert.equal(planNodeOf(index, 'task-1')?.id, 'N1', 'task_id 是 Team 任务 → N 节点的权威映射');
  assert.equal(planNodeOf(index, 'N2')?.id, 'N2', 'plan id 精确命中兜底');
  assert.equal(planNodeOf(index, 'task-2'), undefined, '不按数字后缀猜映射');
});

test('planIndex：版本声明取最后一条（模板样板不夺权）', () => {
  const text = [
    '# Plan — x',
    '',
    '> 供 byId 解析但不画图；图版本：v1（每次重写递增）。',
    '',
    '**图版本：v2**（2026-10-23 重写）',
    '',
    '<!-- 模板示例：图版本：v9 / 不该被读到 -->',
    '',
    '| id | deps |',
    '|---|---|',
    '| W1.1 | — |',
  ].join('\n')
  assert.equal(planIndex(text).version, 'v2')
});

test('planIndex：缺文件 / 无表 / 畸形文本 = 空索引（合法退化，不 throw）', () => {
  assert.deepEqual(planIndex(null).nodes, []);
  assert.deepEqual(planIndex(undefined).nodes, []);
  assert.deepEqual(planIndex('').nodes, []);
  assert.deepEqual(planIndex('只有正文，没有表格').nodes, []);
  assert.deepEqual(planIndex('| nope | nope |\n|---|---|').nodes, []);
  assert.equal(planNodeOf(null, 'x'), undefined);
  assert.equal(planNodeOf(planIndex(''), ''), undefined);
});

test('planIndex：parent 复合节点 / 图版本 / 顶层过滤', () => {
  const text = [
    '# Plan — demo',
    '',
    '> 图版本：v3',
    '',
    '| id | parent | kind | deps | task_id |',
    '|---|---|---|---|---|',
    '| N3 | — | deep-dive | — | task-3 |',
    '| N3.1 | N3 | search | — | |',
    '| N3.1.1 | N3.1 | fetch | N3.1 | |',
    '| N4 | — | synthesis | N3 | task-4 |',
    '',
    '## 重写记录',
    '- 2026-10-21 / v3 / 扩复合子图 / N3 / 原因 / journal',
  ].join('\n');
  const index = planIndex(text);
  assert.equal(index.version, 'v3');
  assert.deepEqual(index.topLevel.map((node) => node.id), ['N3', 'N4']);
  assert.equal(index.byId.get('N3.1')?.parent, 'N3');
  assert.equal(index.byId.get('N3.1.1')?.parent, 'N3.1');
  assert.deepEqual(index.childrenByParent.get('N3')?.map((node) => node.id), ['N3.1']);
  assert.deepEqual(index.childrenByParent.get('N3.1')?.map((node) => node.id), ['N3.1.1']);
  assert.equal(planNodeOf(index, 'task-3')?.id, 'N3');
  assert.equal(planNodeOf(index, 'task-4')?.id, 'N4');
  assert.deepEqual(planIssuesOf(index), []);
});

test('planIssuesOf：重号 / 悬空 parent / 悬空 dep / 自依赖（只读提示，不 throw）', () => {
  const text = [
    '| id | parent | deps |',
    '|---|---|---|',
    '| N3 | — | — |',
    '| N3 | — | — |',
    '| N9.1 | N9 | — |',
    '| N4 | — | N2 |',
    '| N5 | — | N5 |',
  ].join('\n');
  const kinds = planIssuesOf(planIndex(text)).map((issue) => issue.kind).sort();
  assert.deepEqual(kinds, ['dangling-dep', 'duplicate-id', 'missing-parent', 'self-dependency']);
  assert.deepEqual(planIssuesOf(null), []);
  assert.deepEqual(planIssuesOf(undefined), []);
});

test('planIndex：Wave 分组 / W2.1 节点 / stage 派生 / lifecycle 过滤', () => {
  const text = [
    '| id | parent | lifecycle | kind | deps |',
    '|---|---|---|---|---|',
    '| W1.1 | — | active | broad-scan | — |',
    '| W2.1 | — | active | deep-dive | W1.1 |',
    '| W2.1.1 | W2.1 | active | fetch | — |',
    '| W2.2 | — | active | deep-dive | W1.1 |',
    '| W2.3 | — | merged_into:W3.1 | review | — |',
    '| W3.1 | — | active | synthesis | W2.1,W2.2 |',
  ].join('\n');
  const index = planIndex(text);
  assert.deepEqual(index.topLevel.map((node) => node.id), ['W1.1', 'W2.1', 'W2.2', 'W3.1']);
  assert.deepEqual(index.childrenByParent.get('W2.1')?.map((node) => node.id), ['W2.1.1']);
  assert.equal(index.byId.get('W2.3')?.lifecycle, 'merged_into:W3.1');
  assert.equal(index.byId.get('W1.1')?.stage, 'scan');
  assert.equal(index.byId.get('W2.1')?.stage, 'dive');
  assert.equal(index.byId.get('W2.1.1')?.stage, 'dive');
  assert.equal(index.byId.get('W3.1')?.stage, 'synthesis');
  assert.equal(stageOfKind('gate'), 'gate');
  assert.equal(stageOfKind('nope'), 'unknown');
  assert.deepEqual(planIssuesOf(index), []);
});

test('planIssuesOf：wave-prefix / 领域错误 / 前缀/深度/跨组/墓碑/retired dep/legacy flat W', () => {
  const text = [
    '| id | parent | lifecycle | deps |',
    '|---|---|---|---|',
    '| W1.1 | — | active | — |',
    '| W2.1 | — | merged_into:W9 | — |',
    '| W2.1.1 | W2.1 | active | W1.1 |',
    '| W2.1.1.1 | W2.1.1 | active | — |',
    '| W2.3 | — | retired | — |',
    '| W2.4 | — | active | W2.1 |',
    '| W3.1 | — | active | W1.1 |',
    '| W3.2 | W3.9 | active | — |',
    '| W9.1 | W2.1 | active | — |',
    '| W8 | — | active | — |',
    '| N1 | — | active | — |',
  ].join('\n');
  const kinds = planIssuesOf(planIndex(text)).map((issue) => issue.kind).sort();
  for (const expected of ['child-prefix', 'cross-group-child-dep', 'legacy-flat-w', 'missing-parent', 'mixed-family', 'retired-dep', 'tombstone-without-successor', 'too-deep', 'wave-prefix']) {
    assert.ok(kinds.includes(expected), `缺 ${expected}: ${kinds.join(',')}`);
  }
  assert.deepEqual(planIssuesOf(null), []);
});

test('Wave 重编号：W3.1 依赖 W1.1 时 wave-prefix 必须红，而不是静默画在 Wave 2', () => {
  const index = planIndex([
    '| id | parent | lifecycle | deps |',
    '|---|---|---|---|',
    '| W1.1 | — | active | — |',
    '| W3.1 | — | active | W1.1 |',
  ].join('\n'));
  const issue = planIssuesOf(index).find((item) => item.kind === 'wave-prefix');
  assert.ok(issue);
  assert.match(issue.message, /实际在 Wave 2/);
});

test('Wave 固定测试资产：W1.1/W2.1/W2.2 并行、W3.1 汇合、无 legacy flat W', () => {
  const fixture = readFileSync(new URL('../fixtures/plan-wave/plan.md', import.meta.url), 'utf8');
  const index = planIndex(fixture);
  assert.deepEqual(index.topLevel.map((node) => node.id), ['W1.1', 'W2.1', 'W2.2', 'W3.1', 'W4.1']);
  assert.equal(index.byId.get('W1.1')?.stage, 'scan');
  assert.equal(index.byId.get('W2.1')?.stage, 'dive');
  assert.equal(index.byId.get('W2.2')?.stage, 'dive');
  assert.equal(index.byId.get('W3.1')?.stage, 'synthesis');
  assert.deepEqual(planIssuesOf(index), [], '固定 Wave 资产不得有结构提示');
});
