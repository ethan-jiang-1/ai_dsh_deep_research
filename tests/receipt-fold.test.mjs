// 回执三态与落盘对账回归（receipt-fold）——子卡① ①-2（总卡发现 4：回执 ≠ 落地）。
// 判读原则：发送成功只证"话传出去了"；「已落盘」必须由回读对账的 diff 支撑——对账读不出变化
// 就退到「已回话」，绝不冒充落地。红证：把 landed 判据放宽（无 diff 也报落地）即红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assistantReplyAfter, libraryDiff, receiptOf } from '../packages/deep-research-pack/src/lib/receipt-fold.ts';
import { foldLibrary } from '../packages/deep-research-pack/src/lib/library-fold.ts';

const BEFORE = foldLibrary([
  '## 格局调研（2026-10-12，源自 drt_demo）',
  '- 找来源: 官方页与年报并重',
  '- 怎么核实: 独立重抓',
  '- 报告怎么写: 分节',
  '- 不承诺: 不做排名',
].join('\n'));

test('libraryDiff：字段改动 → 人读 diff（把「找来源」从 A 改成 B）', () => {
  const after = foldLibrary([
    '## 格局调研（2026-10-12，源自 drt_demo）',
    '- 找来源: 只钻一遍官方页',
    '- 怎么核实: 独立重抓',
    '- 报告怎么写: 分节',
    '- 不承诺: 不做排名',
  ].join('\n'));
  const diff = libraryDiff(BEFORE, after, '格局调研');
  assert.equal(diff.landed, true);
  assert.equal(diff.text, '把「找来源」从 官方页与年报并重 改成 只钻一遍官方页');
});

test('libraryDiff：多字段改动 → 首处 + 计数', () => {
  const after = foldLibrary([
    '## 格局调研（2026-10-12，源自 drt_demo）',
    '- 找来源: 只钻一遍官方页',
    '- 怎么核实: 独立重抓',
    '- 报告怎么写: 矩阵表',
    '- 不承诺: 不做排名',
  ].join('\n'));
  assert.equal(libraryDiff(BEFORE, after, '格局调研').text, '把「找来源」从 官方页与年报并重 改成 只钻一遍官方页（等 2 处）');
});

test('libraryDiff：补空字段 / 新建 / 删除 / 默认翻转 各有文案', () => {
  const filled = foldLibrary([
    '## 格局调研（2026-10-12，源自 drt_demo）',
    '- 找来源: 官方页与年报并重',
    '- 怎么核实: 独立重抓',
    '- 报告怎么写: 分节',
    '- 不承诺: 不做排名',
  ].join('\n').replace('- 怎么核实: 独立重抓\n', ''));
  assert.equal(libraryDiff(filled, BEFORE, '格局调研').landed, true);
  assert.match(libraryDiff(filled, BEFORE, '格局调研').text ?? '', /^补上「怎么核实」=/);

  const created = libraryDiff(BEFORE, foldLibrary(`${BEFORE.map(() => '').join('')}\n## 新条目（2026-10-18）\n- 找来源: X\n`), null);
  assert.deepEqual(created, { landed: true, text: '新增「新条目」' });

  const removed = libraryDiff(BEFORE, foldLibrary(''), '格局调研');
  assert.deepEqual(removed, { landed: true, text: '删掉「格局调研」' });

  const asDefault = foldLibrary([
    '## 格局调研〔默认偏好〕（2026-10-12，源自 drt_demo）',
    '- 找来源: 官方页与年报并重',
    '- 怎么核实: 独立重抓',
    '- 报告怎么写: 分节',
    '- 不承诺: 不做排名',
  ].join('\n'));
  assert.deepEqual(libraryDiff(BEFORE, asDefault, '格局调研'), { landed: true, text: '把「格局调研」设为默认' });
});

test('libraryDiff：无变化 → landed=false（不冒充落地）', () => {
  assert.deepEqual(libraryDiff(BEFORE, BEFORE, '格局调研'), { landed: false, text: null });
  assert.deepEqual(libraryDiff(BEFORE, BEFORE, null), { landed: false, text: null });
});

test('assistantReplyAfter：只看发送之后的窗口（发送前的回话不算）', () => {
  const events = [
    { type: 'user/message' },
    { type: 'assistant/message' },
    { type: 'turn/end' },
  ];
  assert.equal(assistantReplyAfter(events, 0), true);
  assert.equal(assistantReplyAfter(events, 2), false);
  assert.equal(assistantReplyAfter([], 0), false);
  assert.equal(assistantReplyAfter([null, 'x', { type: 'tool/call' }], 0), false);
});

test('receiptOf：三态优先级 = 失败 > 已落盘 > 已回话 > 已发送', () => {
  const landed = { landed: true, text: '把「找来源」从 A 改成 B' };
  assert.equal(receiptOf({ ok: false, detail: 'boom', replied: true, diff: landed }).state, 'failed');
  assert.deepEqual(receiptOf({ ok: true, detail: '', replied: false, diff: landed }),
    { state: 'landed', text: '已落盘：把「找来源」从 A 改成 B' });
  assert.deepEqual(receiptOf({ ok: true, detail: '', replied: true, diff: null }),
    { state: 'replied', text: 'Lead 已回话，但库里还没读到这次改动（回话 ≠ 落地）' });
  assert.deepEqual(receiptOf({ ok: true, detail: '', replied: false, diff: { landed: false, text: null } }),
    { state: 'sent', text: '已发送，等 Lead 回话' });
});
