// run-fold 回归 — 观察面共享折算（keyless；含首场 run 真实 bundle 期望值断言）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveSteps, topicEvidenceMatrixCells } from '../packages/deep-research-pack/src/lib/run-fold.ts';
import { parseTopics, parseEvidenceDir } from '../scripts/run-dashboard.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUN = join(ROOT, 'research-workspace', 'drt_cn-us-cpu-gap');

test('步骤条：全空 → 首步 pending 全 pending', () => {
  const steps = deriveSteps({ question: false, topics: false, leads: false, evidence: 0, findings: false, review: false, final: false });
  assert.equal(steps.length, 7);
  assert.ok(steps.every((s) => s.state === 'pending'));
});

test('步骤条：question 在场 → 立项 current 其余 pending', () => {
  const steps = deriveSteps({ question: true, topics: false, leads: false, evidence: 0, findings: false, review: false, final: false });
  assert.deepEqual(steps.map((s) => s.state), ['current', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending']);
});

test('步骤条：全在场 → 前六 done 交付 current（最后在场的步是 current）', () => {
  const steps = deriveSteps({ question: true, topics: true, leads: true, evidence: 5, findings: true, review: true, final: true });
  assert.deepEqual(steps.map((s) => s.state), ['done', 'done', 'done', 'done', 'done', 'done', 'current']);
});

test('步骤条：中间断档（evidence 有 findings 无）→ 取证 current', () => {
  const steps = deriveSteps({ question: true, topics: true, leads: true, evidence: 3, findings: false, review: false, final: false });
  assert.equal(steps[3].state, 'current');
  assert.equal(steps[2].state, 'done');
  assert.equal(steps[4].state, 'pending');
});

test('矩阵：topic × evidence 计数折算', () => {
  const cells = topicEvidenceMatrixCells(
    [{ key: 'T1', mustAnswer: '问一' }, { key: 'T2', mustAnswer: '问二' }],
    [{ supports: 'T1' }, { supports: 'T1' }, { supports: 'T2' }, { supports: 'T9' }],
  );
  assert.deepEqual(cells.map((c) => c.evidenceCount), [2, 1]);
});

test('首场 run 真实 bundle 期望值（步骤条 = 交付 current；矩阵行数 = topics 数）', () => {
  if (!existsSync(RUN)) return; // bundle 是运行区（gitignored）——缺席时跳过不假绿
  const topics = parseTopics(readFileSync(join(RUN, 'topics.md'), 'utf8'));
  const ev = parseEvidenceDir(join(RUN, 'evidence'));
  const has = (f) => existsSync(join(RUN, f));
  const steps = deriveSteps({
    question: has('question.md'), topics: topics.length > 0, leads: has('leads.md'),
    evidence: ev.files.filter((e) => e.ok).length, findings: has('findings.md'),
    review: has('review.md'), final: has('final.md'),
  });
  // 首场 run 已交付：最后一步应为 current
  assert.equal(steps[6].state, 'current', '首场 run 已交付 → 交付步 current');
  assert.equal(steps[6].label, '交付');
  // 矩阵行数 = topics 数
  const cells = topicEvidenceMatrixCells(topics, ev.files.filter((e) => e.ok));
  assert.equal(cells.length, topics.length);
});
