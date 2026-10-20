// tests/hitl1-intake-samples.test.mjs —— HITL1 四类输入样例集的**形状契约**（keyless）。
//
// 为什么存在：①-a 的判据是「四类齐 + 每类问/不问清单齐」，材料住
// `research-workspace/drafts/2026-10-11-hitl1-intake-samples.md`。人工走查（①-b）照单核对的
// 前提是清单本身不烂——缺一类、某类少了「期望不问」块、块下空无一物（防空语料），走查就会
// 静默空转。本测试只钉形状，不判断内容对错（那是人工判据 ①-b 与本卡的事）。
//
// 反证（同 diff 注入实测，红→还原→绿）：
//   ①删掉整个 C 类节 → 用例 1/2 红；②挖空某类「期望不问」块的条目 → 用例 3 红；
//   ③把「## 走查记录表」节删掉 → 用例 4 红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MATERIAL = fileURLToPath(new URL('../../research-workspace/drafts/2026-10-11-hitl1-intake-samples.md', import.meta.url));
const CLASS_NAMES = ['信息充分', '缺项但不改变研究范围', '缺项会改变研究范围', '命中困惑信号', '快速事实豁免态'];

assert.ok(existsSync(MATERIAL), `材料不在：${MATERIAL}（①-a：四类输入样例材料是人工走查的前置）`);
const text = readFileSync(MATERIAL, 'utf8');
const sections = text.split(/^## /m).slice(1).map((s) => ({ title: s.split('\n')[0], body: s }));
const classSections = sections.filter((s) => /^[A-E] 类/.test(s.title));
const bulletsUnder = (body, marker, nextMarkers) => {
  const at = body.indexOf(marker);
  if (at < 0) return null;
  const rest = body.slice(at + marker.length);
  const stops = nextMarkers.map((m) => rest.indexOf(m)).filter((n) => n >= 0).sort((a, b) => a - b);
  return (stops.length > 0 ? rest.slice(0, stops[0]) : rest).split('\n').filter((l) => /^\s*-\s+\S/.test(l));
};

test('①-a 材料形状：五类齐（四类输入 + 快速事实豁免态互补面）', () => {
  assert.equal(classSections.length, CLASS_NAMES.length,
    `类节数不符：期望 ${CLASS_NAMES.length}，实得 ${classSections.length}（${classSections.map((s) => s.title).join(' ｜ ')}）`);
  for (const name of CLASS_NAMES) {
    assert.ok(classSections.some((s) => s.title.includes(name)), `缺类节：${name}`);
  }
});

test('①-a 材料形状：每类三块齐（期望问 / 期望不问 / 负例）', () => {
  for (const s of classSections) {
    for (const marker of ['**期望问**', '**期望不问**', '**负例**']) {
      assert.ok(s.body.includes(marker), `${s.title} 缺块：${marker}`);
    }
  }
});

test('①-a 材料形状：每块至少一条条目（防空语料——空块等于走查空转）', () => {
  for (const s of classSections) {
    for (const [marker, next] of [['**期望问**', ['**期望不问**', '**负例**']], ['**期望不问**', ['**负例**']], ['**负例**', []]]) {
      const items = bulletsUnder(s.body, marker, next);
      assert.ok(items !== null && items.length >= 1, `${s.title} 的 ${marker} 块下无条目（防空语料）`);
    }
  }
});

test('①-a 材料形状：走查记录表在场（人工判据 ①-b 的填写位）', () => {
  const table = sections.find((s) => s.title.startsWith('走查记录表'));
  assert.ok(table !== undefined, '缺「## 走查记录表」节——人工走查无处记结果');
  const rows = table.body.split('\n').filter((l) => /^\|\s*[A-E]\s/.test(l));
  assert.equal(rows.length, CLASS_NAMES.length, `走查表应有 ${CLASS_NAMES.length} 行（每类一行），实得 ${rows.length}`);
});

test('①-a 材料形状：判据来源可核（点名 persona 与模式库）', () => {
  assert.ok(text.includes('research-brief'), '材料未点名 research-brief（判据来源应可回溯）');
  assert.ok(text.includes('question-patterns.md'), '材料未点名 question-patterns.md（判型/困惑信号的来源）');
});
