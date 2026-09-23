// 评估合同在位性 — docs/evaluation.md 是本仓验收合同（先于框架定案），
// 回归层断言它存在且五个评估面齐全，防止评估标准被静默删改。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVAL = join(ROOT, 'docs', 'evaluation.md');

test('评估合同存在且五面齐全', () => {
  assert.ok(existsSync(EVAL), 'docs/evaluation.md 不存在');
  const text = readFileSync(EVAL, 'utf8');
  for (const face of ['L0 结构面', 'L1 挂载面', 'L2 安装面', 'L3 领域面', 'L4 交付面']) {
    assert.ok(text.includes(face), `评估面缺失: ${face}`);
  }
  // 负面判据与判定程序——ongoing goal 可判定的机制锚点
  assert.ok(text.includes('负面判据'), '负面判据节缺失');
  assert.ok(text.includes('goal 标 `complete` 的唯一条件'), 'goal 判定程序缺失');
});

test('角色职责 owner 表存在（L3 判据 2 的载体）', () => {
  const ws = readFileSync(join(ROOT, 'research-workspace', 'AGENTS.md'), 'utf8');
  assert.ok(ws.includes('事实的 owner'), '研究手册缺 owner 表');
  for (const doc of ['question.md', 'leads.md', 'evidence/', 'findings.md', 'review.md', 'final.md']) {
    assert.ok(ws.includes(doc), `owner 表缺 ${doc} 行`);
  }
});

test('证据身份链契约存在（L3 判据 3 的载体）', () => {
  const ws = readFileSync(join(ROOT, 'research-workspace', 'AGENTS.md'), 'utf8');
  for (const field of ['source_url', 'retrieved_at', 'quality', 'found_by', 'supports']) {
    assert.ok(ws.includes(field), `证据 frontmatter 契约缺 ${field}`);
  }
});
