// backlog-liveness 回归 — 问题/缺陷/调研/方法/归档池结构合同的 keyless 断言；
// 判据核心 = scripts/lib/backlog-liveness.mjs（本测试即其反证记录）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { backlogLivenessProblems } from '../../scripts/lib/backlog-liveness.mjs';

const METHOD_NAMES = ['requirements-elicitation', 'requirements-probes', 'requirements-synthesis',
  'validation-design', 'validation-evidence', 'validation-judgment', 'issue-to-note'];
const ISSUE = '2026-10-08-sample.md';
const ISSUE_TEXT = '---\nstatus: 推敲中\nopened: 2026-10-08\n---\n\n# Sample\n> 状态：推敲中｜结论倾向：未定｜可关闭：否\n';
const BUG = 'BUG-018-sample.md';
const BUG_TEXT = '---\nstatus: 排查中\nseverity: P1\nopened: 2026-10-08\n---\n\n# Bug\n> 严重级别：P1（重要）｜发现：2026-10-08｜状态：排查中\n';
const RESEARCH_BANNER = '# Example\n> 问题：Why?\n> 消费者：none\n> 产出的卡：—\n\n## 材料\n'
  + '| [2026-10-08-evidence.md](2026-10-08-evidence.md) | evidence |\n';

function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'backlog-shape-'));
  t.after(() => {
    assert.equal(resolve(repo), repo);
    assert.ok(repo.startsWith(join(tmpdir(), 'backlog-shape-')));
    rmSync(repo, { recursive: true, force: true });
  });
  const root = join(repo, '_backlog');
  const files = [];
  const put = (rel, text = '# Shelf\n', tracked = true) => {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    if (tracked && !files.includes(`_backlog/${rel}`)) files.push(`_backlog/${rel}`);
  };
  put('README.md'); put('triggers.md'); put('_archived/README.md');
  for (const shelf of ['issues', 'bugs', 'research', 'methods', '_archived/settled_issues',
    '_archived/suspended_issues', '_archived/fixed_bugs', '_archived/suspended_bugs', '_archived/research']) put(`${shelf}/README.md`);
  for (const name of METHOD_NAMES) put(`methods/${name}.md`, `---\nname: ${name}\ndescription: Method\nwhenToUse: Need it\n---\n\n# Method\n`);
  put('methods/README.md', METHOD_NAMES.map((n) => `${n}.md`).join('\n'));
  return { repo, root, files, put, check: () => backlogLivenessProblems(root, files) };
}

function issue(f, text = ISSUE_TEXT, name = ISSUE) {
  f.put(`issues/${name}`, text);
  f.put('issues/README.md', `${name}\n`);
}

function bug(f, text = BUG_TEXT, name = BUG) {
  f.put(`bugs/${name}`, text);
  f.put('bugs/README.md', `${name}\n`);
}

test('empty shelves and indexed legacy archives remain valid', (t) => {
  const f = fixture(t);
  f.put('_archived/settled_issues/legacy.md', '# Frozen legacy decision\n');
  f.put('_archived/settled_issues/README.md', 'legacy.md\n');
  f.put('_archived/research/topic/README.md',
    '# Legacy\n> 问题：What?\n> 消费者：none\n> 产出的卡：—\n\n## 材料\n| [legacy.md](legacy.md) | evidence |\n');
  f.put('_archived/research/topic/legacy.md', '# Frozen evidence\n');
  f.put('_archived/research/README.md', 'topic/\n');
  assert.deepEqual(f.check(), []);
});

test('required tracked shelf cannot silently disappear', (t) => {
  const f = fixture(t);
  f.files.splice(f.files.indexOf('_backlog/issues/README.md'), 1);
  assert.ok(f.check().some((p) => p.includes('issues/README.md must be tracked')));
});

test('active issue validates date, status, metadata order, mirror and graduation head', (t) => {
  const f = fixture(t);
  issue(f);
  assert.deepEqual(f.check(), []);
  for (const [replacement, expected] of [
    [ISSUE_TEXT.replace('status: 推敲中', 'status: 已结'), 'invalid status'],
    [ISSUE_TEXT.replace('opened: 2026-10-08', 'opened: yesterday'), 'needs opened'],
    [ISSUE_TEXT.replace('status: 推敲中\nopened: 2026-10-08', 'opened: 2026-10-08\nstatus: 推敲中'), 'status as first'],
    [ISSUE_TEXT.replace('可关闭：否', '可关闭：是'), 'closeable but still active'],
    [ISSUE_TEXT.replace('可关闭：否', '可关闭：是否未定'), 'must declare'],
    [ISSUE_TEXT.replace('> 状态：推敲中｜结论倾向：未定｜可关闭：否', ''), 'must declare'],
    [ISSUE_TEXT.replace('状态：推敲中｜', '状态：等人拍板｜'), 'mirror'],
    [ISSUE_TEXT.replace('结论倾向：未定', '结论倾向：尽快给个说法'), '结论倾向'],
  ]) {
    issue(f, replacement);
    assert.ok(f.check().some((p) => p.includes(expected)), expected);
  }
});

test('every closed-set graduation value passes with free prose; archived cards skip the lifecycle checks', (t) => {
  const f = fixture(t);
  for (const head of ['未定', '现在做', '以后做', '不做', '并入已有']) {
    issue(f, ISSUE_TEXT.replace('结论倾向：未定', `结论倾向：${head}——附一句说明`));
    assert.deepEqual(f.check(), [], head);
  }
  // 归档卡豁免：退出值只查 CARD_STATES；状态行历史形态（原值 + 追加结论）不参与镜像互查。
  f.put('_archived/settled_issues/2026-10-08-done.md',
    '---\nstatus: 已结\nopened: 2026-10-08\n---\n\n# Done\n> 状态：推敲中 — 已结 2026-10-08：结论落地下文。\n');
  f.put('_archived/settled_issues/README.md', '2026-10-08-done.md\n');
  assert.deepEqual(f.check(), []);
});

test('closure quoted later in discussion does not close an issue', (t) => {
  const f = fixture(t);
  issue(f, `${ISSUE_TEXT}${'\n'.repeat(15)}> 状态：过去｜可关闭：是\n`);
  assert.deepEqual(f.check(), []);
});

test('bugs preserve BUG numbers and enforce severity; archive status metadata is checked when present', (t) => {
  const f = fixture(t);
  bug(f);
  assert.deepEqual(f.check(), []);
  bug(f, BUG_TEXT.replace('severity: P1', 'severity: P3').replace('严重级别：P1（重要）', '严重级别：P3'));
  assert.ok(f.check().some((p) => p.includes('needs severity')));
  f.put('_archived/fixed_bugs/BUG-001-legacy.md', '---\nstatus: 排查中\nseverity: P1\nopened: 2026-10-08\n---\n');
  f.put('_archived/fixed_bugs/README.md', 'BUG-001-legacy.md\n');
  assert.ok(f.check().some((p) => p.includes('invalid status for shelf')));
});

test('bug lifecycle enums and status-line mirror are enforced on active cards', (t) => {
  const f = fixture(t);
  for (const phase of ['排查中', '修复就绪', '修复落地', '等人拍板']) {
    bug(f, BUG_TEXT.replace('status: 排查中', `status: ${phase}`).replace('状态：排查中', `状态：${phase}`));
    assert.deepEqual(f.check(), [], phase);
  }
  bug(f, BUG_TEXT.replace('status: 排查中', 'status: 修复中').replace('状态：排查中', '状态：修复中'));
  assert.ok(f.check().some((p) => p.includes('invalid status')));
  bug(f, BUG_TEXT.replace('状态：排查中', '状态：修复就绪'));
  assert.ok(f.check().some((p) => p.includes('mirror')));
  bug(f, '---\nstatus: 排查中\nseverity: P1\nopened: 2026-10-08\n---\n\n# Bug\n');
  assert.ok(f.check().some((p) => p.includes('needs a status line')));
  // 🔒 跟在记号后不破坏镜像（owner-only 触发标记的位置约定）。
  bug(f, BUG_TEXT.replace('status: 排查中', 'status: 等人拍板').replace('状态：排查中', '状态：等人拍板🔒'));
  assert.deepEqual(f.check(), []);
});

test('research lives in a thread with a banner; topic/intent stay one-line and status-free', (t) => {
  const f = fixture(t);
  f.put('research/topic/README.md', RESEARCH_BANNER);
  f.put('research/topic/2026-10-08-evidence.md', '---\ntopic: Example\nintent: "Support decision"\n---\n\n# Evidence\n');
  f.put('research/README.md', 'topic/\n');
  assert.deepEqual(f.check(), []);
  f.put('research/topic/2026-10-08-evidence.md', '---\ntopic: Example\nintent: "Support decision"\nstatus: active\n---\n');
  assert.ok(f.check().some((p) => p.includes('must not contain status')));
  f.put('research/topic/2026-10-08-evidence.md', '---\ntopic: Example\nintent: |\n  multiple lines\n---\n');
  assert.ok(f.check().some((p) => p.includes('flat scalar mapping')));
});

test('research materials cannot sit flat at the shelf root', (t) => {
  const f = fixture(t);
  f.put('research/2026-10-08-flat.md', '---\ntopic: Example\nintent: "Support"\n---\n\n# Flat\n');
  f.put('research/README.md', '2026-10-08-flat.md\n');
  assert.ok(f.check().some((p) => p.includes('平铺在 shelf 根')));
});

test('research threads need a banner, an index row and a material list', (t) => {
  const f = fixture(t);
  f.put('research/topic/2026-10-08-evidence.md', '---\ntopic: Example\nintent: "Support"\n---\n\n# Evidence\n');
  f.put('research/README.md', 'topic/\n');
  assert.ok(f.check().some((p) => p.includes('README.md missing')), 'missing banner');
  f.put('research/topic/README.md', '# Example\n> 问题：Why?\n> 消费者：none\n> 产出的卡：—\n');
  assert.ok(f.check().some((p) => p.includes('未在题名页')), 'material not listed');
  f.put('research/topic/README.md', RESEARCH_BANNER);
  assert.deepEqual(f.check(), []);
  f.put('research/README.md', '# Empty\n');
  assert.ok(f.check().some((p) => p.includes('未登记研究题')), 'thread not indexed');
});

test('research banner must name the question, consumer and spawned cards', (t) => {
  const f = fixture(t);
  f.put('research/topic/README.md', '# Example\n\n## 材料\n| [a.md](a.md) |\n');
  f.put('research/topic/a.md', '---\ntopic: Example\nintent: "Support"\n---\n\n# A\n');
  f.put('research/README.md', 'topic/\n');
  const problems = f.check();
  for (const field of ['问题', '消费者', '产出的卡']) assert.ok(problems.some((p) => p.includes(field)), field);
});

test('archived research also lives in threads, not flat at the shelf root', (t) => {
  const f = fixture(t);
  f.put('_archived/research/2026-10-08-flat.md', '# Frozen\n');
  f.put('_archived/research/README.md', '2026-10-08-flat.md\n');
  assert.ok(f.check().some((p) => p.includes('平铺在 shelf 根')));
});

test('duplicate or malformed metadata and orphan indexes fail', (t) => {
  const f = fixture(t);
  issue(f, ISSUE_TEXT.replace('opened:', 'status: 推敲中\nopened:'));
  assert.ok(f.check().some((p) => p.includes('unique flat scalar')));
  issue(f);
  f.put('issues/README.md', '# Empty index\n');
  assert.ok(f.check().some((p) => p.includes('missing from issues/README.md index')));
});

test('methods require names and whenToUse, with actual fixed method files', (t) => {
  const f = fixture(t);
  f.put('methods/issue-to-note.md', '---\nname: other\ndescription: Method\n---\n');
  assert.ok(f.check().some((p) => p.includes('name must match')));
  assert.ok(f.check().some((p) => p.includes('needs whenToUse')));
});

test('tracked space-name file is checked; symlinks fail; untracked and runtime files are excluded', (t) => {
  const f = fixture(t);
  f.put('issues/invalid draft.md', ISSUE_TEXT);
  f.put('issues/README.md', 'invalid draft.md\n');
  assert.ok(f.check().some((p) => p.includes('filename must be')));
  f.files.splice(f.files.indexOf('_backlog/issues/invalid draft.md'), 1);
  f.put('issues/untracked.md', '# Invalid\n', false);
  f.put('issues/runtime/ignored.md', '# Invalid\n', false);
  assert.deepEqual(f.check(), []);
  f.put('issues/link.md', '', false);
  const link = join(f.root, 'issues/link.md');
  assert.equal(resolve(link), link);
  rmSync(link);
  symlinkSync('../README.md', link);
  f.files.push('_backlog/issues/link.md');
  assert.ok(f.check().some((p) => p.includes('must be a regular file')));
});

test('活跃清单不得指向已归档卡（2026-10-20 P0-3 反证）', (t) => {
  const f = fixture(t);
  f.put('_archived/settled_issues/legacy.md', '# Frozen legacy\n');
  f.put('_archived/settled_issues/README.md', 'legacy.md\n');
  f.put('issues/README.md', '## 活跃清单\n\n（当前无在办。）\n');
  assert.deepEqual(f.check(), []);
  f.put('issues/README.md', '## 活跃清单\n\n| 卡 |\n|---|\n| [legacy](../_archived/settled_issues/legacy.md) | 已归档 |\n');
  assert.ok(f.check().some((p) => p.includes('活跃清单指向已归档卡')), '归档卡出现在活跃清单必须红');
});

test('已结/已修归档卡不得保留可关闭：否（2026-10-20 P0-3 反证）', (t) => {
  const f = fixture(t);
  f.put('_archived/settled_issues/legacy.md',
    '---\nstatus: 已结\nopened: 2026-10-08\n---\n\n# Frozen legacy\n> 状态：已结｜可关闭：否\n');
  f.put('_archived/settled_issues/README.md', 'legacy.md\n');
  assert.ok(f.check().some((p) => p.includes('已归档（已结）仍写可关闭：否')), '归档后仍写否必须红');
  f.put('_archived/settled_issues/legacy.md',
    '---\nstatus: 已结\nopened: 2026-10-08\n---\n\n# Frozen legacy\n> 状态：已结｜可关闭：是\n');
  assert.deepEqual(f.check(), []);
});
