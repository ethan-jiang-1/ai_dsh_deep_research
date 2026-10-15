// 终局 readiness 判定回归（review-readiness）——驾驶舱/仪表盘/冒烟的共用语义源。
//
// 为什么存在：终局 readiness 的读法曾在 node-gate、run-dashboard、客户端与浏览器冒烟间分叉。
// 2026-10-11 的真实后果是 `drt_deepseek-default-upgrade` 已交付且终局 PASS，但 review.md
// 文末附录按 critic skill 契约保留首轮 `readiness: FAIL` 血统记录，未锚行首的末位匹配把历史 FAIL
// 读成终局。本模块拥有 canonical 规则：只认行首判定行，取最后一条（历史行内引用不算）；
// node-gate 在 .mjs 纯判据边界本地镜像此规则。
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

test('终局判定：PASS 注记引用已修复的历史 FAIL 仍为有效终局 → PASS', () => {
  const text = '## readiness: FAIL\n\n## readiness: PASS (prior FAIL fixed)\n'
  assert.equal(terminalReadiness(text), 'PASS')
})

test('终局判定：空模板 `## readiness: PASS | FAIL` 两词并存 → null（未判定，不把模板当结论）', () => {
  assert.equal(terminalReadiness('## readiness: PASS | FAIL\n判据清单：\n'), null);
});
