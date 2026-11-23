// run-fold 回归 — 观察面共享步骤条与回边版本折算（keyless 纯函数）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSteps, latestRunVersion } from '../../../packages/deep-research-pack/src/lib/run/run-fold.ts';

test('回边版本投影：稀疏 v1 + v3 文件显示最高真实版本 v3', () => {
  assert.equal(latestRunVersion(['v1.md', 'v3.md', 'notes.md', 'v03.md', 'V4.md']), 3);
});

test('步骤条：全空 → 首步 pending 全 pending', () => {
  const steps = deriveSteps({ question: false, team: false, leads: false, evidence: 0, findings: false, review: false, final: false });
  assert.equal(steps.length, 7);
  assert.ok(steps.every((s) => s.state === 'pending'));
});

test('步骤条：question 在场 → 立项 current 其余 pending', () => {
  const steps = deriveSteps({ question: true, team: false, leads: false, evidence: 0, findings: false, review: false, final: false });
  assert.deepEqual(steps.map((s) => s.state), ['current', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending']);
});

test('步骤条：步序 = 定义流程（立项→组队→侦察→挖掘→综合→审查→交付，m2-run-mechanics 正本）', () => {
  const steps = deriveSteps({ question: true, team: true, leads: true, evidence: 5, findings: true, review: true, final: true });
  assert.deepEqual(steps.map((s) => s.label), ['立项', '组队', '侦察', '挖掘', '综合', '审查', '交付']);
});

test('步骤条：组队随立项在场 → cursor 停靠组队（组队+侦察进行段）', () => {
  const steps = deriveSteps({ question: true, team: true, leads: false, evidence: 0, findings: false, review: false, final: false });
  assert.deepEqual(steps.map((s) => s.state), ['done', 'current', 'pending', 'pending', 'pending', 'pending', 'pending']);
});

test('步骤条：全在场 → 前六 done 交付 current（最后在场的步是 current）', () => {
  const steps = deriveSteps({ question: true, team: true, leads: true, evidence: 5, findings: true, review: true, final: true });
  assert.deepEqual(steps.map((s) => s.state), ['done', 'done', 'done', 'done', 'done', 'done', 'current']);
});

test('步骤条：中间断档（evidence 有 findings 无）→ 挖掘 current', () => {
  const steps = deriveSteps({ question: true, team: true, leads: true, evidence: 3, findings: false, review: false, final: false });
  assert.equal(steps[3].state, 'current');
  assert.equal(steps[2].state, 'done');
  assert.equal(steps[4].state, 'pending');
});

// 负例留证 2026-11-22：BUG-359/360——读失败的 evidence/review 仍被 hasFile/计数推断成 ✓。
// 红配方：deriveSteps 忽略 unknown（或把 unknown 当 false）→ 本组断言红。
test('BUG-359/360 读失败步：unknown 不被线性推断抹成 done', () => {
  const steps = deriveSteps({
    question: true, team: true, leads: true, evidence: 5, findings: true, review: true, final: true,
    unknown: ['evidence', 'review'],
  });
  assert.deepEqual(steps.map((s) => s.state), ['done', 'done', 'done', 'unknown', 'done', 'unknown', 'current']);
});

test('unknown 优先于待定/在场：只有点名步变 unknown，其余步态不变', () => {
  const steps = deriveSteps({ question: true, team: true, leads: false, evidence: 0, findings: false, review: false, final: false, unknown: ['evidence'] });
  assert.equal(steps[3].state, 'unknown');
  assert.equal(steps[1].state, 'current');
});

// 负例留证 2026-11-22：BUG-361/367——question 读失败/为空仍按 hasFile 判 ✓ 立项。
// 红配方：deriveSteps 忽略 unknown（把 question 当 false/在场）→ 本组断言红。
test('BUG-361/367 立项步：question 读失败/为空 → unknown，不给 ✓', () => {
  const steps = deriveSteps({ question: false, team: false, leads: true, evidence: 5, findings: true, review: true, final: true, unknown: ['question'] });
  assert.equal(steps[0].state, 'unknown');
  assert.notEqual(steps[0].state, 'done');
});


// 负例留证 2026-11-23：BUG-381/382——早步内容空但后续 final 在场，线性推断会把早步补成 done。
// 红配方：把 leads/findings/evidence 的 unknown 去掉，只留 has=false → 本组红。
test('BUG-381/382 空内容步骤进 unknown，不被后续 final 补成 done', () => {
  const steps = deriveSteps({ question: true, team: true, leads: false, evidence: 0, findings: false, review: true, final: true, unknown: ['leads', 'evidence', 'findings'] });
  const state = Object.fromEntries(steps.map((s) => [s.key, s.state]));
  assert.equal(state.leads, 'unknown');
  assert.equal(state.evidence, 'unknown');
  assert.equal(state.findings, 'unknown');
  assert.notEqual(state.findings, 'done');
});
