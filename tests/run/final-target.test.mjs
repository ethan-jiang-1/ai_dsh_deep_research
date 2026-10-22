// final-target 回归 —— 终稿页签的纯折算（keyless）：交付事件折叠 + 地址认领 + 读面定表。
// 反证口径：门的形态只认三个终稿位置（根 / archive / _abandoned），其余路径全拒——
// 认宽了就是把 question/evidence/drafts 漏进终稿面。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  draftInProgress, finalAddressOf, finalCandidates, finalPathOf, finalReadPlan, isFinalAddress, latestFinalDelivery, latestPresentedFinalVersion,
  sessionFileOf, shouldOpenFinal,
} from '../../packages/deep-research-pack/src/lib/final-target.ts';

const presented = (files, extra = {}) => ({
  type: 'deliverables/presented',
  data: { turn: 7, callId: 'call-1', files, ...extra },
});

test('finalPathOf：相对/archive/_abandoned 三位置与绝对路径都折成规范相对路径', () => {
  assert.equal(finalPathOf('drt_x/final.md'), 'drt_x/final.md');
  assert.equal(finalPathOf('archive/drt_x/final.md'), 'archive/drt_x/final.md');
  assert.equal(finalPathOf('_abandoned/drt_x/final.md'), '_abandoned/drt_x/final.md');
  assert.equal(finalPathOf('/Users/me/research-workspace/drt_x/final.md'), 'drt_x/final.md');
  assert.equal(finalPathOf('/Users/me/research-workspace/archive/drt_2026-ai-browser/final.md'), 'archive/drt_2026-ai-browser/final.md');
  assert.equal(finalPathOf('./drt_x/final.md'), 'drt_x/final.md');
  assert.equal(finalPathOf('drt_x\\final.md'), 'drt_x/final.md');
});

test('finalPathOf：非终稿路径一律 null（中间过程不因后缀巧合漏进来）', () => {
  assert.equal(finalPathOf('drt_x/question.md'), null);
  assert.equal(finalPathOf('drt_x/evidence/final.md'), null);
  assert.equal(finalPathOf('drt_x/drafts/final.md'), null);
  assert.equal(finalPathOf('notes/final.md'), null);
  assert.equal(finalPathOf('drt_x/final.md.bak'), null);
  assert.equal(finalPathOf('drt_x/final.md/junk'), null);
  assert.equal(finalPathOf(42), null);
  assert.equal(finalPathOf(undefined), null);
  assert.equal(finalPathOf(''), null);
});

test('latestFinalDelivery：取最后一条终稿交付；同一声明里的非终稿文件被跳过', () => {
  const events = [
    presented([{ path: 'drt_a/audit.md' }, { path: 'drt_a/final.md' }], { callId: 'call-a', turn: 3 }),
    presented([{ path: 'drt_b/final.md' }], { callId: 'call-b', turn: 5 }),
  ];
  assert.deepEqual(latestFinalDelivery(events), { path: 'drt_b/final.md', turn: 5, callId: 'call-b' });
});

test('latestPresentedFinalVersion：认 present 点名里的 final/vN.md，最高版；普通 final.md → null', () => {
  assert.equal(latestPresentedFinalVersion([presented([{ path: 'drt_a/final.md' }])]), null)
  assert.equal(latestPresentedFinalVersion([presented([{ path: 'drt_a/final/v2.md' }, { path: 'drt_a/audit.md' }])]), 2)
  assert.equal(
    latestPresentedFinalVersion([presented([{ path: 'drt_a/final/v1.md' }]), presented([{ path: 'archive/drt_a/final/v3.md' }])]),
    3,
  )
});

test('latestFinalDelivery：只有非终稿 present → null（别的交付不点亮终稿）', () => {
  assert.equal(latestFinalDelivery([presented([{ path: 'drt_a/audit.md' }])]), null);
});

test('latestFinalDelivery：畸形 data / 缺 callId / 非 present 事件 fail-soft', () => {
  assert.equal(latestFinalDelivery([{ type: 'deliverables/presented', data: null }]), null);
  assert.equal(latestFinalDelivery([{ type: 'deliverables/presented', data: { files: 'x' } }]), null);
  assert.equal(latestFinalDelivery([{ type: 'tool/call', data: {} }, 'junk', null]), null);
  assert.deepEqual(
    latestFinalDelivery([presented([{ path: 'drt_a/final.md' }], { turn: 'x', callId: 9 })]),
    { path: 'drt_a/final.md', turn: 0, callId: '' },
  );
});

test('finalReadPlan：读面定表恰三条（终稿 / 审查 / 版本目录）', () => {
  assert.deepEqual(finalReadPlan('drt_x/final.md'), {
    final: 'drt_x/final.md', review: 'drt_x/review.md', versions: 'drt_x/final',
  });
  assert.deepEqual(finalReadPlan('archive/drt_x/final.md'), {
    final: 'archive/drt_x/final.md', review: 'archive/drt_x/review.md', versions: 'archive/drt_x/final',
  });
  assert.equal(finalReadPlan('drt_x/question.md'), null);
});

test('地址：会话域解析 + 认领范围（extension 带只接管终稿）', () => {
  const address = finalAddressOf('sess-1', 'archive/drt_x/final.md');
  assert.ok(address.startsWith('dsh-resource://file/session/'));
  assert.deepEqual(sessionFileOf(address), { sessionId: 'sess-1', path: 'archive/drt_x/final.md' });
  assert.equal(isFinalAddress(address), true);
  assert.equal(isFinalAddress(finalAddressOf('sess-1', 'drt_x/final.md')), true);
  assert.equal(isFinalAddress(finalAddressOf('sess-1', '_abandoned/drt_x/final.md')), true);
  assert.equal(isFinalAddress(finalAddressOf('sess-1', 'drt_x/question.md')), false);
  assert.equal(isFinalAddress(finalAddressOf('sess-1', 'drt_x/drafts/final.md')), false);
  assert.equal(isFinalAddress(finalAddressOf('sess-1', 'notes/final.md')), false);
  // 绝对域不认（页签体只经会话文件面读）
  assert.equal(isFinalAddress('dsh-resource://file/absolute/home/me/drt_x/final.md'), false);
  assert.equal(sessionFileOf('dsh-resource://file/absolute/home/me/x.md'), null);
});

test('地址：编码段往返 + 查询串忽略 + 畸形编码 fail-soft', () => {
  const address = finalAddressOf('sess 1', 'drt_x y/final.md');
  assert.deepEqual(sessionFileOf(address), { sessionId: 'sess 1', path: 'drt_x y/final.md' });
  assert.deepEqual(sessionFileOf(`${address}?line=3`), { sessionId: 'sess 1', path: 'drt_x y/final.md' });
  assert.equal(sessionFileOf('dsh-resource://file/session/sess-1/%E0%A4%A'), null);
  assert.equal(sessionFileOf('dsh-resource://file/session/sess-1'), null);
  assert.equal(sessionFileOf('https://example.com/x.md'), null);
});

test('finalCandidates：交付记录的位置失效后按三位置回退（原位 → archive → _abandoned）', () => {
  assert.deepEqual(finalCandidates('drt_x/final.md'), ['drt_x/final.md', 'archive/drt_x/final.md', '_abandoned/drt_x/final.md']);
  assert.deepEqual(finalCandidates('archive/drt_x/final.md'), ['archive/drt_x/final.md', 'drt_x/final.md', '_abandoned/drt_x/final.md']);
  assert.deepEqual(finalCandidates('_abandoned/drt_x/final.md'), ['_abandoned/drt_x/final.md', 'drt_x/final.md', 'archive/drt_x/final.md']);
  assert.deepEqual(finalCandidates('drt_x/question.md'), []);
  assert.deepEqual(finalCandidates(''), []);
});

test('shouldOpenFinal：有交付 + 未开过 + 焦点不在输入框 → 才开（三条缺一不开）', () => {
  const delivery = { path: 'drt_x/final.md', turn: 3, callId: 'call-1' };
  assert.equal(shouldOpenFinal(delivery, new Set(), 's1', false), true);
  assert.equal(shouldOpenFinal(null, new Set(), 's1', false), false);
  assert.equal(shouldOpenFinal(delivery, new Set(), 's1', true), false);
  assert.equal(shouldOpenFinal(delivery, new Set(['s1:call-1']), 's1', false), false);
  // 去重键吃会话：同一 callId 在别的会话里不冲突
  assert.equal(shouldOpenFinal(delivery, new Set(['s2:call-1']), 's1', false), true);
});

test('draftInProgress：空输入框不算在写（会话打开即聚焦 composer 的实测形态）', () => {
  assert.equal(draftInProgress({ tagName: 'TEXTAREA', value: '' }), false);
  assert.equal(draftInProgress({ tagName: 'TEXTAREA', value: '   ' }), false);
  assert.equal(draftInProgress({ tagName: 'TEXTAREA', value: '写到一半的话' }), true);
  assert.equal(draftInProgress({ tagName: 'INPUT', value: 'x' }), true);
  assert.equal(draftInProgress({ tagName: 'BODY' }), false);
  assert.equal(draftInProgress({ tagName: 'DIV', isContentEditable: true, textContent: '' }), false);
  assert.equal(draftInProgress({ tagName: 'DIV', isContentEditable: true, textContent: '草稿' }), true);
  assert.equal(draftInProgress(null), false);
});
