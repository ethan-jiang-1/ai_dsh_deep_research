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

test('终局判定：终局=「第 2 轮」标题行 PASS、附录=「第 1 轮」标题行 FAIL → PASS（轮次高者胜，独立成行形态）', () => {
  const text = [
    '# 第 2 轮（复审）—— readiness: **PASS**',
    '',
    '> 本 PASS 即为终局 readiness。',
    '',
    '---',
    '',
    '# 附：第 1 轮审查记录（原文保留，当时 readiness = FAIL）',
    '',
    '## 第 1 轮 readiness: FAIL',
    '',
  ].join('\n');
  assert.equal(terminalReadiness(text), 'PASS', '带轮次标注时轮次高者才是终局；附录旧轮不得夺权');
});

test('终局判定：无轮次标注的判定行仍是终局（不被带轮次的附录盖过）', () => {
  const text = ['## readiness: PASS', '', '## 第 1 轮 readiness: FAIL', ''].join('\n');
  assert.equal(terminalReadiness(text), 'PASS', '无标注 = 终局形态，优先于带轮次的历史记录');
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

// ── 2026-10-16 窄放宽 (A)：行首判定行的**装饰形态**（13 场真实 review.md 逐字语料）──────────
// 动因：13 场已交付 bundle 的终局判定带装饰（加粗/反引号/块引用/标题标记/短标签/箭头/值后缀），
// 旧规则读不出 → 3 场被更早的历史 FAIL 夺权（假 FAIL）、4 场"未判定"（假 unknown）。
// 边界未动：行内提及、表格单元、长前缀历史标题仍不得夺权。
test('终局判定（窄放宽）：装饰形态真实语料逐条读得出', () => {
  const cases = [
    ['## 终验 readiness: **PASS**', 'PASS'],                                   // drt_agent-memory-landscape
    ['**`readiness: PASS` 维持不变，且效力范围已按 `final/final.md` 实体复核完毕。**', 'PASS'], // drt_cn-agentic-parity
    ['**⇒ 复核结论：`readiness: PASS`**（零 CRITICAL；五条判据全勾）', 'PASS'],      // drt_cn-us-open-source
    ['→ **`readiness: PASS`**（放行至 HITL2；MAJOR-1 建议在定稿前补 2 句）', 'PASS'], // drt_deepseek-chat-price-check
    ['> **## readiness: PASS（最终）**', 'PASS'],                                // drt_kimi-api-pricing
    ['**`readiness: PASS`** —— 无 CRITICAL 未修复；价格主体经独立重抓逐格复核', 'PASS'], // drt_zhipu-api-pricing
    ['**第 2 轮结论**：**`readiness: PASS`（维持）**。**MAJOR 0（全部关单）**', 'PASS'], // drt_open-llm-inference-engine-landscape
    ['## 结论先行：**readiness: PASS**（第四轮复核收口）', 'PASS'],                  // drt_geometry-coaching
    ['**结论行：`readiness: PASS`**', 'PASS'],                                   // 同场文首形态
  ];
  for (const [line, want] of cases) assert.equal(terminalReadiness(`${line}\n`), want, line);
});

test('终局判定（窄放宽）：不夺权负例逐条钉住（真实语料 + 边界形态）', () => {
  // 承诺句（drt_mcp-server-ecosystem 末条）：真判定 = 更早的 FAIL + veto，承诺不得夺权
  const promise = ['**readiness: FAIL**（首轮）', '', '**复评判据**：第 1、2 项落地后（第 3 项选定一种并落地），我将重新抓取受影响 URL 复核并给出 `readiness: PASS`。**在第 1、2 项修复前，本 critic 明确行使 veto：证据尚不足以按现稿交付。**'].join('\n');
  assert.equal(terminalReadiness(promise), 'FAIL', '承诺句不得夺权');
  // 表格单元：即使写 PASS 也不夺权（该形态要行内匹配才能读到）
  assert.equal(terminalReadiness('## readiness: FAIL\n\n| —— **结论** —— | **readiness: PASS** |\n'), 'FAIL', '表格单元不得夺权');
  // 长前缀历史标题（散文前缀）不得夺权
  assert.equal(terminalReadiness('## readiness: FAIL\n\n# 复核轮（Round 2，2026-09-27）——**readiness: PASS**\n'), 'FAIL', '长前缀历史标题不得夺权');
  // 装饰前缀的形状上限：标题散文 >1 段 / 标签 >1 枚都过不去（否则"标题里提过 readiness"会整体夺权）
  assert.equal(terminalReadiness('## 第二轮 复审 结论 说明 readiness: PASS\n'), null, '标题散文堆叠不构成判定行');
  assert.equal(terminalReadiness('## 一审：二审：readiness: PASS\n'), null, '标签链不构成判定行');
  // 行内提及（prose 中段）：不构成判定行
  assert.equal(terminalReadiness('findings.md 已一致）**够得上交付**；`readiness: PASS` 是我基于文件事实的判定。\n'), null, 'prose 行内提及不构成判定行');
  // 旧负例在放宽后仍成立：附录里的轮次血统引用
  assert.equal(terminalReadiness(['readiness: PASS', '', '## 附录 A：第 1 轮判级历史', '', '- **第 1 轮（首次审查）**：`readiness: FAIL` —— **CRITICAL 1**（…）'].join('\n')), 'PASS', '轮次血统引用不得夺权');
  // 空模板的装饰形态同样不算判定
  assert.equal(terminalReadiness('> **`readiness: PASS | FAIL`**\n'), null, '装饰后的空模板仍是空模板');
});
