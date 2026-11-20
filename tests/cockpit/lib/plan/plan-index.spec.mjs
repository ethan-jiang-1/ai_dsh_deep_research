// tests/cockpit/lib/plan/plan-index.spec.mjs —— `plan.md` 节点表的解析/查询/稳定性提示（keyless 契约）。
// 家 = packages/deep-research-pack/src/lib/plan/plan-index.ts（2026-10-28 从 plan-graph.ts 拆出：
// Team 任务图与文件解析两个变更面；图侧契约 = plan-graph.spec.mjs）。
// 钉住：节点表解析 / 版本声明 / task_id 映射 / 降级面 / 重号/悬空引用/wave 前缀等只读提示。
//
// 拆分说明：用例体逐字保留；只改 import 家与文件头。负例（wave-prefix 必须红）随本文件。
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  planIndex,
  planIssuesOf,
  planNodeOf,
  stageOfKind,
} from '../../../../packages/deep-research-pack/src/lib/plan/plan-index.ts';

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
  const fixture = readFileSync(new URL('../../../fixtures/plan-wave/plan.md', import.meta.url), 'utf8');
  const index = planIndex(fixture);
  assert.deepEqual(index.topLevel.map((node) => node.id), ['W1.1', 'W2.1', 'W2.2', 'W3.1', 'W4.1']);
  assert.equal(index.byId.get('W1.1')?.stage, 'scan');
  assert.equal(index.byId.get('W2.1')?.stage, 'dive');
  assert.equal(index.byId.get('W2.2')?.stage, 'dive');
  assert.equal(index.byId.get('W3.1')?.stage, 'synthesis');
  assert.deepEqual(planIssuesOf(index), [], '固定 Wave 资产不得有结构提示');
});

// 负例留证 2026-11-11：BUG-058——修复前 planIssuesOf 没有 cycle kind，有环只报误导性的
// wave-prefix（重编号不能解环）。还原法 = 删 cycle 检测与 wave-prefix 抑制。
test('BUG-058 有环 plan：planIssuesOf 报 cycle，且不再给误导性的 wave-prefix', () => {
  const index = planIndex([
    '# Plan — cycle',
    '',
    '> protocol: v1',
    '',
    '## 节点表',
    '',
    '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    '| W1.1 | — | active | deep-dive | q1 | analyst | W2.1 | evidence/t1.md | ok | 2 轮 | L1 | |',
    '| W2.1 | — | active | deep-dive | q2 | analyst | W1.1 | evidence/t2.md | ok | 2 轮 | L1 | |',
  ].join('\n'))
  const issues = planIssuesOf(index)
  assert.ok(issues.some((issue) => issue.kind === 'cycle'), `有环必须报 cycle：${JSON.stringify(issues)}`)
  assert.equal(issues.some((issue) => issue.kind === 'wave-prefix'), false, '有环时不得给重编号提示')
  assert.match(issues.find((issue) => issue.kind === 'cycle').message, /不可执行/)
})

// 负例留证 2026-11-12：BUG-102——正文「旧版图版本：v1」覆盖头部 v2。
// 还原法 = 版本声明回到全文本 matchAll 取最后一条。
test('BUG-102 版本声明只认首个 ## 之前的头部，正文引用不夺权', () => {
  const text = ['# Plan', '', '图版本：v2', '', '## 备注', '旧版图版本：v1 已废弃', ''].join('\n')
  assert.equal(planIndex(text).version, 'v2')
})

// 负例留证 2026-11-13：BUG-125——无 ## 时取 last，正文旧版覆盖头部。还原法 = 无 heading 也 at(-1)。
test('BUG-125 无 ## 的 plan 取首个声明（跳过模板 blockquote）', () => {
  const text = ['# Plan', '', '图版本：v2', '', '旧版图版本：v1 已废弃', ''].join('\n')
  assert.equal(planIndex(text).version, 'v2')
})

// 独立 expected 2026-11-20（未参与实现的审阅者按 issue 候选合同冻结，不由本实现生成）：
// 节点表解码事实与 gate verdict 分开；这些用例钉住缺席/坏表/占位/歧义/编码。
test('表事实：缺席与在场空白分开，占位符不折叠成缺失', () => {
  const absent = planIndex(null)
  assert.equal(absent.table.source, 'absent')
  assert.equal(absent.table.status, 'absent')
  assert.deepEqual(absent.nodes, [])

  const blank = planIndex('   \n')
  assert.equal(blank.table.source, 'present')
  assert.equal(blank.table.status, 'invalid')
  assert.deepEqual(blank.table.diagnostics.map((item) => item.code), ['empty-source'])

  const plan = planIndex('| id | budget | task_id |\n|---|---|---|\n| W1.1 | — | — |\n')
  assert.equal(plan.table.status, 'decoded')
  assert.deepEqual(plan.table.diagnostics, [])
  assert.equal(plan.nodes.length, 1)
  assert.equal(plan.nodes[0].cells.budget.state, 'explicit-placeholder')
  assert.equal(plan.nodes[0].cells.taskid.state, 'explicit-placeholder')
  assert.equal(plan.nodes[0].taskId, undefined, '占位符不是会话映射')
  assert.equal(planNodeOf(plan, 'task-1'), undefined)
})

test('表事实：空表/错列/重复语义列/多表/转义管道 → invalid 且不投影节点', () => {
  const empty = planIndex('| id | budget | task_id |\n|---|---|---|\n')
  assert.equal(empty.table.status, 'invalid')
  assert.ok(empty.table.diagnostics.some((item) => item.code === 'empty-table'))
  assert.deepEqual(empty.nodes, [])

  const short = planIndex('| id | budget | task_id |\n|---|---|---|\n| W1.1 | — |\n')
  assert.equal(short.table.status, 'invalid')
  assert.ok(short.table.diagnostics.some((item) => item.code === 'row-arity'))
  assert.equal(short.table.rows[0].taskid.state, 'missing-cell', '审计事实保留')
  assert.deepEqual(short.nodes, [])

  const duplicate = planIndex('| id | id | budget | task_id |\n|---|---|---|---|\n| W1.1 | W1.2 | — | — |\n')
  assert.equal(duplicate.table.status, 'invalid')
  assert.ok(duplicate.table.diagnostics.some((item) => item.code === 'duplicate-column'))
  assert.deepEqual(duplicate.nodes, [])

  const twoTables = planIndex('| id | budget | task_id |\n|---|---|---|\n| W1.1 | — | — |\n\n| id | budget | task_id |\n|---|---|---|\n| W2.1 | — | — |\n')
  assert.equal(twoTables.table.status, 'invalid')
  assert.ok(twoTables.table.diagnostics.some((item) => item.code === 'ambiguous-table'))
  assert.deepEqual(twoTables.nodes, [])

  const escaped = planIndex('| id | budget | task_id |\n|---|---|---|\n| W1.1 | — | task\\|x |\n')
  assert.equal(escaped.table.status, 'invalid')
  assert.ok(escaped.table.diagnostics.some((item) => item.code === 'unsupported-escaped-pipe'))
  assert.deepEqual(escaped.nodes, [])
})

test('表事实：数据行丢失行首管道 → row-arity，不静默截断', () => {
  const index = planIndex('| id | budget | task_id |\n|---|---|---|\n| W1.1 | — | — |\nW2.1 | — | — |\n')
  assert.equal(index.table.status, 'invalid')
  assert.ok(index.table.diagnostics.some((item) => item.code === 'row-arity' && item.line === 4))
  assert.deepEqual(index.nodes, [])
})

test('表事实：无空行紧邻的第二张表不被当成数据行', () => {
  const index = planIndex('| id | budget | task_id |\n|---|---|---|\n| W1.1 | — | — |\n| id | budget | task_id |\n|---|---|---|\n| W2.1 | — | — |\n')
  assert.equal(index.table.status, 'invalid')
  assert.ok(index.table.diagnostics.some((item) => item.code === 'ambiguous-table'))
  assert.deepEqual(index.nodes, [])
})

test('表事实：数据行缺 id → invalid，不静默跳过', () => {
  const index = planIndex('| id | budget | task_id |\n|---|---|---|\n|  | — | — |\n')
  assert.equal(index.table.status, 'invalid')
  assert.ok(index.table.diagnostics.some((item) => item.code === 'missing-id'))
  assert.deepEqual(index.nodes, [])
})

test('表事实：未知扩展列忽略；装饰与 BOM/CRLF 得到同一 id', () => {
  const unknown = planIndex('| id | note | note | budget | task_id |\n|---|---|---|---|---|\n| W1.1 | a | b | — | — |\n')
  assert.equal(unknown.table.status, 'decoded')
  assert.equal(unknown.nodes[0].id, 'W1.1')

  const decorated = planIndex('| **id** | `budget` | TASK-ID |\n|---|---|---|\n| **W1.1** | — | — |\n')
  assert.equal(decorated.table.status, 'decoded')
  assert.equal(decorated.nodes[0].id, 'W1.1')

  const crlf = planIndex('\uFEFF# Plan\r\n\r\n| id | budget | task_id |\r\n|---|---|---|\r\n| W1.1 | — | — |\r\n')
  assert.equal(crlf.table.status, 'decoded')
  assert.equal(crlf.nodes[0].id, 'W1.1')
})

test('观察提示：坏表给出可定位诊断，缺席不误报', () => {
  const bad = planIndex('| id | budget | task_id |\n|---|---|---|\n| W1.1 | — |\n')
  const issues = planIssuesOf(bad)
  assert.equal(issues.length, 1)
  assert.equal(issues[0].kind, 'table-invalid')
  assert.match(issues[0].message, /row-arity@3/)
  assert.deepEqual(planIssuesOf(planIndex(null)), [], '缺席是合法路径，不产生坏表提示')
})

test('表事实：注释/围栏内的伪表不夺权，真表仍 decoded', () => {
  const text = [
    '<!-- | id | budget | task_id |',
    '|---|---|---|',
    '| W9.9 | 1 | task-9 |',
    '-->',
    '',
    '| id | budget | task_id |',
    '|---|---|---|',
    '| W1.1 | — | — |',
    '',
    '```md',
    '| id | budget | task_id |',
    '|---|---|---|',
    '| W8.8 | 1 | task-8 |',
    '```',
  ].join('\n')
  const index = planIndex(text)
  assert.equal(index.table.status, 'decoded')
  assert.deepEqual(index.nodes.map((node) => node.id), ['W1.1'])
})
