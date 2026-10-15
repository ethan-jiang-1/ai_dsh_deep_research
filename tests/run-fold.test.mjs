// run-fold 回归 — 观察面共享步骤条与回边版本折算（keyless 纯函数）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSteps, latestRunVersion } from '../packages/deep-research-pack/src/lib/run-fold.ts';

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
