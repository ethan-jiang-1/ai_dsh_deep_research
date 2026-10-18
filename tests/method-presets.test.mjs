// 方法预设解析器合同回归（scripts/lib/method-presets.mjs）——内置名单/推荐映射/共同底线的
// **唯一解析入口**（tests/library-fold 与 client-load-smoke 共用）。
// 判读原则：解析器的形状违约必须 **fail-loud**——静默解析成空集 = 门禁不存在（防空语料纪律，
// scripts/AGENTS.md）；本文件逐条钉住 throw 分支，正是"解析器会咬人"的反证。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  baselineDisciplinesFromSkill, markdownTableCells, methodPresetsFromSkill,
  patternMethodMappingFromSkill, MAPPING_HEADERS, METHOD_PRESET_HEADERS,
} from '../scripts/lib/method-presets.mjs';

const row = (cells) => `| ${cells.join(' | ')} |`;
const PRESET_TABLE = [
  row(METHOD_PRESET_HEADERS),
  row(METHOD_PRESET_HEADERS.map(() => '---')),
  row(['甲法', '一句话', '源', '核', '综', '限']),
].join('\n');
const MAPPING_TABLE = [row(MAPPING_HEADERS), row(MAPPING_HEADERS.map(() => '---')), row(['P9 甲', '甲法'])].join('\n');

test('methodPresetsFromSkill：正常解析（含空单元格与转义竖线）', () => {
  const rows = methodPresetsFromSkill(PRESET_TABLE);
  assert.deepEqual(rows, [{ name: '甲法', summary: '一句话', sections: { source: '源', verify: '核', report: '综', limit: '限' } }]);
  const escaped = methodPresetsFromSkill(row(METHOD_PRESET_HEADERS) + '\n' + row(METHOD_PRESET_HEADERS.map(() => '---')) + '\n' + row(['乙法', '一`|`句', 'a\\|b', 'c', 'd', 'e']));
  assert.equal(escaped[0].summary, '一`|`句', '代码段内的竖线不切格');
  assert.equal(escaped[0].sections.source, 'a|b', '转义竖线还原为字面竖线');
});

test('methodPresetsFromSkill：形状违约一律 throw（表头缺席/分隔行非法/列数不符/零数据行）', () => {
  assert.throws(() => methodPresetsFromSkill('没有表的正文'), /表头缺席|表头缺席或发生变化/);
  const badSeparator = row(METHOD_PRESET_HEADERS) + '\n' + row(['---', '---']) + '\n' + row(['a', 'b', 'c', 'd', 'e', 'f']);
  assert.throws(() => methodPresetsFromSkill(badSeparator), /分隔行/);
  const wrongCells = row(METHOD_PRESET_HEADERS) + '\n' + row(METHOD_PRESET_HEADERS.map(() => '---')) + '\n' + row(['只有两格', 'x']);
  assert.throws(() => methodPresetsFromSkill(wrongCells), /列数变化/);
  const empty = row(METHOD_PRESET_HEADERS) + '\n' + row(METHOD_PRESET_HEADERS.map(() => '---')) + '\n';
  assert.throws(() => methodPresetsFromSkill(empty), /0 行/);
});

test('patternMethodMappingFromSkill：正常解析 + 空集 fail-loud', () => {
  assert.deepEqual(patternMethodMappingFromSkill(MAPPING_TABLE), [{ patterns: 'P9 甲', method: '甲法' }]);
  assert.throws(() => patternMethodMappingFromSkill(PRESET_TABLE), /映射表头缺席/);
  const emptyMapping = row(MAPPING_HEADERS) + '\n' + row(MAPPING_HEADERS.map(() => '---')) + '\n';
  assert.throws(() => patternMethodMappingFromSkill(emptyMapping), /0 行/);
});

test('baselineDisciplinesFromSkill：解析括注列表 + 缺席 fail-loud', () => {
  assert.deepEqual(baselineDisciplinesFromSkill('共同底线（甲、乙 、丙）不因方法降级'), ['甲', '乙', '丙']);
  assert.throws(() => baselineDisciplinesFromSkill('没有那句底线话'), /共同底线/);
});

test('markdownTableCells：转义竖线与代码段边界', () => {
  assert.deepEqual(markdownTableCells('| a | b |'), ['a', 'b']);
  assert.deepEqual(markdownTableCells('| `x|y` | z |'), ['`x|y`', 'z']);
  assert.deepEqual(markdownTableCells('| a\\|b | c |'), ['a|b', 'c']);
  // 边界注记：剥离的是**语法性**空首尾格（表格行的起止竖线），真空首格如实保留为 ''——
  // canonical 表不会有空方法名；真出现时下游同钉（客户端 ↔ skill 逐字段）会红，不在此静默纠正。
  assert.deepEqual(markdownTableCells('|  | b |'), ['', 'b']);
  assert.deepEqual(markdownTableCells('||'), [''], '仅剩语法空格的空行如实给一格空串（不抛、不造格）');
});
