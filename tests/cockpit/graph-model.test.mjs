// tests/cockpit/graph-model.test.mjs —— 研究图谱 plan↔Team 映射的 keyless 契约（BUG-043）。
// 家 = packages/deep-research-pack/src/lib/graph-model.ts；夹具 = tests/fixtures/plan-mapping/。
// 钉住四件事：① 没有映射的 plan 节点显示“状态未知”，**绝不显示“未执行”**；② 覆盖率的分母是
// active plan 节点（含子节点、不含墓碑），Team 侧任务单列；③ 恢复会话后 task_id 失效是独立状态
// （stale），不与“未映射”混算；④ 显式 plan-only 不是缺口。判据来源 = 卡 §修复判据。
//
// 夹具留证 2026-10-23：BUG-043 —— tests/fixtures/plan-mapping/plan.md（3 节点 / Team 1 任务）
// 与 plan-mixed.md（stale / plan-only / 墓碑 / id 命中）就是负例配方：把 graph-model 的四态退回
// “没有 task 就落未执行”，本文件立刻变红。夹具语义由本文件钉住，改夹具应预期变红。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { planIndex } from '../../packages/deep-research-pack/src/lib/plan-index.ts'
import {
  coverageLineOf,
  coverageOf,
  coverageWarningOf,
  nodeStateOf,
  planMappingOf,
  planNodeStateOf,
  PROJECTION_PENDING_STATE,
} from '../../packages/deep-research-pack/src/lib/graph-model.ts'

const fixture = (name) => readFileSync(new URL(`../fixtures/plan-mapping/${name}`, import.meta.url), 'utf8')

/** 结构化 Team 任务（只取映射/状态需要的字段；TeamTaskView 结构上兼容）。 */
const task = (id, status = 'pending', extra = {}) => ({ id, status, blockedBy: [], ...extra })

test('BUG-043：3 节点只有 1 个 Team 任务 → 已映射 1 / 未映射 2，未映射节点显示状态未知', () => {
  const plan = planIndex(fixture('plan.md'))
  const tasks = [task('task-1', 'completed')]
  const index = planMappingOf(plan, tasks)
  const coverage = coverageOf(plan, tasks, index)

  assert.equal(coverage.planNodes, 3);
  assert.equal(coverage.mapped, 1);
  assert.equal(coverage.unmapped, 2);
  assert.equal(coverage.stale, 0);
  assert.equal(coverage.planOnly, 0);
  assert.equal(coverage.teamTasks, 1);
  assert.equal(coverage.tasksOutsidePlan, 0);
  assert.equal(coverage.mapped + coverage.unmapped + coverage.stale + coverage.planOnly, coverage.planNodes,
    '四态必须覆盖全部 active 节点，不许有节点落进无状态的缝');

  assert.match(coverageLineOf(coverage), /已映射 1/);
  assert.match(coverageLineOf(coverage), /未映射 2/);
  assert.match(coverageWarningOf(coverage) ?? '', /2 个 plan 节点/);

  const unmapped = planNodeStateOf(index.mapping.get('W2.1'));
  assert.equal(unmapped.text, '状态未知（未映射 task_id）');
  assert.equal(unmapped.icon, '?');
  assert.doesNotMatch(unmapped.text, /未执行/);

  // 整张图里都不许出现“未执行”——它把“数据缺失”说成“执行状态”。
  for (const id of ['W1.1', 'W2.1', 'W2.2']) {
    const state = planNodeStateOf(index.mapping.get(id));
    assert.doesNotMatch(`${state.icon} ${state.text}`, /未执行/, `${id} 不得回退未执行`);
  }
});

test('已映射节点沿用 Team 任务状态；无 task 的节点不伪造任务状态', () => {
  const plan = planIndex(fixture('plan.md'));
  const tasks = [task('task-1', 'completed')];
  const index = planMappingOf(plan, tasks);
  const done = planNodeStateOf(index.mapping.get('W1.1'));
  assert.deepEqual(done, { text: '完成', icon: '✓', color: '#16a34a' });

  const waiting = nodeStateOf(task('task-2', 'pending', { blockedBy: ['task-1'] }), undefined, undefined);
  assert.equal(waiting.text, '等 task-1');
  const running = nodeStateOf(task('task-3', 'in_progress'), true, undefined);
  assert.equal(running.text, '进行中');
});

test('task_id 有值但 Team 板没有该任务 → 映射失效（stale），独立于未映射', () => {
  const plan = planIndex(fixture('plan-mixed.md'));
  const tasks = [task('task-1', 'completed'), task('W4.1', 'pending')];
  const index = planMappingOf(plan, tasks);
  const coverage = coverageOf(plan, tasks, index);

  assert.equal(index.mapping.get('W2.1')?.state, 'stale');
  const state = planNodeStateOf(index.mapping.get('W2.1'));
  assert.match(state.text, /状态未知/);
  assert.match(state.text, /task-9/);
  assert.doesNotMatch(state.text, /未执行/);
  assert.equal(coverage.stale, 1);
  assert.match(coverageLineOf(coverage), /映射失效 1/);
});

test('显式 plan-only 不是缺口：状态是 plan-only，不算未映射', () => {
  const plan = planIndex(fixture('plan-mixed.md'));
  const tasks = [task('task-1', 'completed'), task('W4.1', 'pending')];
  const index = planMappingOf(plan, tasks);
  const coverage = coverageOf(plan, tasks, index);

  assert.equal(index.mapping.get('W2.2')?.state, 'plan-only');
  const state = planNodeStateOf(index.mapping.get('W2.2'));
  assert.match(state.text, /plan-only/);
  assert.doesNotMatch(state.text, /未执行/);
  assert.equal(coverage.planOnly, 1);
  assert.match(coverageLineOf(coverage), /plan-only 1/);
});

test('覆盖率只在 active 节点上算：墓碑不进分母', () => {
  const plan = planIndex(fixture('plan-mixed.md'));
  const index = planMappingOf(plan, [task('task-1'), task('W4.1')]);
  assert.equal(index.mapping.has('W2.3'), false, 'retired 墓碑不参与覆盖率');
  const coverage = coverageOf(plan, [task('task-1'), task('W4.1')], index);
  assert.equal(coverage.planNodes, 5, 'active = W1.1/W2.1/W2.2/W3.1/W4.1');
});

test('旧写法兼容：task id 恰好等于 plan 节点 id 时仍算已映射', () => {
  const plan = planIndex(fixture('plan-mixed.md'));
  const index = planMappingOf(plan, [task('task-1'), task('W4.1', 'completed')]);
  assert.equal(index.mapping.get('W4.1')?.state, 'mapped');
  assert.equal(planNodeStateOf(index.mapping.get('W4.1')).text, '完成');
});

test('Team 有任务但 plan 没写 → 单列“未进 plan 的 Team 任务”，不冒充 plan 节点', () => {
  const plan = planIndex(fixture('plan.md'));
  const tasks = [task('task-1', 'completed'), task('task-7', 'in_progress')];
  const index = planMappingOf(plan, tasks);
  const coverage = coverageOf(plan, tasks, index);
  assert.equal(coverage.tasksOutsidePlan, 1);
  assert.equal(coverage.mapped, 1);
  assert.deepEqual(index.tasksOutsidePlan.map((entry) => entry.id), ['task-7']);
  assert.match(coverageLineOf(coverage), /未进 plan 的 Team 任务 1/);
});

test('两个节点声明同一个 task_id → 后声明的报“task_id 重复”，不误报成失效', () => {
  const shared = [
    '# Plan — duplicate task_id',
    '',
    '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    '| W1.1 | — | active | broad-scan | 扫源 | scout | — | leads.md | 覆盖齐 | 1 | L1 | task-1 |',
    '| W2.1 | — | active | deep-dive | 深挖 | analyst | W1.1 | evidence/a.md | 七字段 | 1 | L1 | task-1 |',
  ].join('\n')
  const plan = planIndex(shared)
  const tasks = [task('task-1', 'completed')]
  const index = planMappingOf(plan, tasks)
  const coverage = coverageOf(plan, tasks, index)

  assert.equal(index.mapping.get('W1.1')?.state, 'mapped')
  assert.equal(index.mapping.get('W2.1')?.state, 'duplicate', '第二个声明者不能落入 stale（task-1 真实存在）')
  assert.equal(coverage.duplicate, 1)
  assert.equal(coverage.stale, 0)
  const state = planNodeStateOf(index.mapping.get('W2.1'))
  assert.match(state.text, /task_id 重复/)
  assert.match(state.text, /task-1/)
  assert.doesNotMatch(state.text, /未执行|失效/)
  assert.match(coverageLineOf(coverage), /task_id 重复 1/)
});

test('墓碑上的 task 不从观察面消失：作为未进 plan 的 Team 任务露出', () => {
  const plan = planIndex(fixture('plan-mixed.md'))
  const tasks = [task('task-1'), task('W4.1'), task('task-5')]
  const index = planMappingOf(plan, tasks)
  const coverage = coverageOf(plan, tasks, index)
  // W2.3 是 retired 且写了 task-5：墓碑不进覆盖率，但 task-5 不能既不在图上也不在“未进 plan”里。
  assert.equal(index.mapping.has('W2.3'), false)
  assert.deepEqual(index.tasksOutsidePlan.map((entry) => entry.id), ['task-5'])
  assert.equal(coverage.tasksOutsidePlan, 1)
});

test('投影未就绪的状态词不把“还没收到数据”说成映射缺口', () => {
  assert.equal(PROJECTION_PENDING_STATE.text, '等待团队投影')
  assert.doesNotMatch(PROJECTION_PENDING_STATE.text, /未执行|未映射|失效/)
});

test('fail-soft：plan 缺席 / 空任务表都不 throw，覆盖率如实为零', () => {
  const empty = planMappingOf(null, [])
  assert.equal(empty.mapping.size, 0)
  assert.equal(empty.tasksOutsidePlan.length, 0)
  assert.deepEqual(coverageOf(null, [], empty), {
    planNodes: 0, topNodes: 0, mapped: 0, unmapped: 0, stale: 0, planOnly: 0, duplicate: 0, teamTasks: 0, tasksOutsidePlan: 0,
  })
  assert.equal(coverageWarningOf(coverageOf(null, [], empty)), null)

  const orphan = planMappingOf(null, [task('task-1')])
  assert.equal(orphan.tasksOutsidePlan.length, 1, '没有 plan 时 Team 任务全部“未进 plan”')
});
