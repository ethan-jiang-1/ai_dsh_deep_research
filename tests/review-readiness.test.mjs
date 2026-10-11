// 终局 readiness 判定回归（review-readiness）——驾驶舱/仪表盘/冒烟的共用语义源。
//
// 为什么存在：同一概念在仓里有三版实现且语义分叉（node-gate-core 取首个 PASS 行；
// run-dashboard 取末位匹配；客户端与 client-load-smoke 各抄一版），2026-10-11 被
// ③-a 的新断言当场抓出真实后果——`drt_deepseek-default-upgrade` 已交付且终局 PASS，
// 但 review.md 文末附录按 critic skill 契约保留了首轮 `readiness: FAIL` 的血统记录，
// 未锚行首的"末位匹配"把它读成终局 → 仪表盘/镜像把已交付 run 报成「审查修复中」。
// 本模块把**终局**语义收成一处：只认**行首**判定行，取最后一条（历史行内引用不算）。
//
// 反证（同 diff 注入实测，红→还原→绿）：
//   ①改回未锚行首的末位匹配 `matchAll(/readiness:\s*(PASS|FAIL)/g)` → 用例 3 红（附录 FAIL 夺权）；
//   ②改成取首个匹配 → 用例 2 红（首审 FAIL 夺权）；
//   ③删空串守卫（`text === '' → null` 放行）→ 用例 7 红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terminalReadiness } from '../packages/deep-research-pack/src/lib/review-readiness.ts';

test('终局判定：首行 frontmatter 形态（readiness: PASS）→ PASS', () => {
  assert.equal(terminalReadiness('readiness: PASS\n\n## 定义\n...\n'), 'PASS');
});

test('终局判定：两相 review——中段首审 FAIL、文末复核 `## readiness: PASS` → PASS（末位为准）', () => {
  const text = ['## CRITICAL', '- C1: 引用链断裂', '', '## readiness: FAIL', '', '---', '', '## 复核（第 2 轮）', '未决项已闭环。', '', '## readiness: PASS', ''].join('\n');
  assert.equal(terminalReadiness(text), 'PASS');
});

test('终局判定：终局 PASS + 文末附录保留首轮 FAIL 血统（行内引用）→ 仍 PASS（真实形态回归）', () => {
  const text = [
    'readiness: PASS',
    '',
    '## 定义',
    '...',
    '**readiness: PASS**（零 CRITICAL；唯一 MAJOR 已处置）',
    '',
    '---',
    '',
    '## 附录 A：第 1 轮判级历史（血统，保留不改）',
    '',
    '- **第 1 轮（首次审查）**：`readiness: FAIL` —— **CRITICAL 1**（...）',
    '',
  ].join('\n');
  assert.equal(terminalReadiness(text), 'PASS', '附录里的行内历史引用不得夺权');
});

test('终局判定：只有 FAIL → FAIL', () => {
  const text = ['## CRITICAL', '- C1: x', '', '## readiness: FAIL', ''].join('\n');
  assert.equal(terminalReadiness(text), 'FAIL');
});

test('终局判定：中文冒号与 markdown 强调符形态都认', () => {
  assert.equal(terminalReadiness('## readiness：FAIL\n'), 'FAIL');
  assert.equal(terminalReadiness('- **readiness: PASS**（附条件）\n'), 'PASS');
});

test('终局判定：无判定行 → null（不猜）', () => {
  assert.equal(terminalReadiness('## 定义\n没有任何判定\n'), null);
});

test('终局判定：fail-soft（null / undefined / 空串 / 空白）→ null，不 throw', () => {
  assert.equal(terminalReadiness(null), null);
  assert.equal(terminalReadiness(undefined), null);
  assert.equal(terminalReadiness(''), null);
  assert.equal(terminalReadiness('   \n\n'), null);
});

test('终局判定：通篇只有行内引用（无行首判定行）→ null（防空语料，不把引用当判定）', () => {
  const text = ['## 说明', '上一场 review 的结论是（第 1 轮 readiness: FAIL），本场尚未审查。', ''].join('\n');
  assert.equal(terminalReadiness(text), null);
});

test('终局判定：空模板 `## readiness: PASS | FAIL` 两词并存 → null（未判定，不把模板当结论）', () => {
  assert.equal(terminalReadiness('## readiness: PASS | FAIL\n判据清单：\n'), null);
});
