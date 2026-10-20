// text-fold 回归 — pack 折算文本口径的共享缝直接钉（keyless 纯函数）。
// 被测面 = packages/deep-research-pack/src/lib/text-fold.ts（method-of-question 与
// library-fold 两消费方共用的剥标记/截断口径——此前仅经消费方传递覆盖，无直接测试）。
// 共享缝直接钉——收敛后此缝成为单点，口径变形时红的第一个地方应是这里
// （参照 tests/run/journal-wire.test.mjs 头注精神）。
// 负例留证 2026-10-21：把 truncateWithEllipsis 改为原样返回 → 「截断」用例红；
// 把 flattenMarkdownInline 的 `**` 剥除去掉 → 「行内强调」用例红；还原（edit 改回）→ 全绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenMarkdownInline, truncateWithEllipsis } from '../../packages/deep-research-pack/src/lib/text-fold.ts';

test('flattenMarkdownInline：剥行内强调与代码标记 / 压空白 / 去首尾空白 / 空串', () => {
  assert.equal(flattenMarkdownInline('**重点**结论'), '重点结论');
  assert.equal(flattenMarkdownInline('`code` 与 **加粗**'), 'code 与 加粗');
  assert.equal(flattenMarkdownInline('混合 **a`b`** 形态'), '混合 ab 形态');
  assert.equal(flattenMarkdownInline('多  个\t空\n白   行'), '多 个 空 白 行');
  assert.equal(flattenMarkdownInline('  前后空白  '), '前后空白');
  assert.equal(flattenMarkdownInline(''), '');
});

test('truncateWithEllipsis：未超原样 / 恰等上限原样 / 超出截断且省略号落在末位', () => {
  assert.equal(truncateWithEllipsis('短文本', 10), '短文本');
  assert.equal(truncateWithEllipsis('12345', 5), '12345'); // 恰等于上限：不截断（> 才截）
  assert.equal(truncateWithEllipsis('123456', 5), '12345…'); // 超 1 即截到上限 + 省略号
  assert.equal(truncateWithEllipsis('abcdefghij', 4), 'abcd…'); // 落点 = 第 maxLength 字后，不在字中间装完整句
  assert.equal(truncateWithEllipsis('', 3), '');
});

test('口径组合（消费方形态）：先剥标记压平，再截断补省略号', () => {
  const raw = '**策略一**：先广度后深度——`Scout` 先行';
  assert.equal(truncateWithEllipsis(flattenMarkdownInline(raw), 8), '策略一：先广度后…');
});
