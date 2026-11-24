// tool-card 回归 — 研究语义卡标题折算（keyless；wire 权威形状 = queries 数组，录制流实证）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardTitleOf, parseArgsObject, cardStateOf, stringFieldOfArgsRaw } from '../../../packages/deep-research-pack/src/lib/events/tool-card.ts';

test('web_search 卡标题：queries 数组 → 检索：词表（· 连接，60 字截断）', () => {
  const args = parseArgsObject('{"queries":["DSH harness","DeepSeek plugin"]}');
  assert.equal(cardTitleOf('web_search', args, '{"queries":[]}'), '检索：DSH harness · DeepSeek plugin');
});

test('web_search 卡标题：单词组 → 检索：词', () => {
  const args = parseArgsObject('{"queries":["国产CPU性能对比"]}');
  assert.equal(cardTitleOf('web_search', args, ''), '检索：国产CPU性能对比');
});

test('web_search 卡标题：空数组 / 非法成员 → 裸「检索」', () => {
  assert.equal(cardTitleOf('web_search', parseArgsObject('{"queries":[]}'), ''), '检索');
  assert.equal(cardTitleOf('web_search', parseArgsObject('{"queries":[42]}'), ''), '检索');
  assert.equal(cardTitleOf('web_search', parseArgsObject('{}'), ''), '检索');
});

test('web_search 卡标题：超长词表截断到 60 字', () => {
  const long = Array.from({ length: 12 }, (_, i) => `query-${i}-`.repeat(3)).join('x');
  const args = parseArgsObject(JSON.stringify({ queries: [long] }));
  assert.equal(cardTitleOf('web_search', args, '').length, '检索：'.length + 60);
});

test('spawn_teammate 卡标题：成员与职责', () => {
  const args = parseArgsObject('{"name":"probe-scout","description":"广度侦察"}');
  assert.equal(cardTitleOf('spawn_teammate', args, ''), '组队：probe-scout — 广度侦察');
  assert.equal(cardTitleOf('spawn_teammate', parseArgsObject('{}'), ''), '组队：(未具名)');
});

test('其他工具 → 工具名 + 原文前缀回退', () => {
  assert.equal(cardTitleOf('web_fetch', null, 'https://api-docs'), 'web_fetch https://api-docs');
});

test('cardStateOf：settled 形状推导（ok/error/stopped/running）', () => {
  assert.equal(cardStateOf({}), 'running');
  assert.equal(cardStateOf({ kind: 'x', isError: false }), 'ok');
  assert.equal(cardStateOf({ kind: 'x', isError: true }), 'error');
  assert.equal(cardStateOf({ kind: 'x', error: { code: 'interrupted' } }), 'stopped');
});

// 负例留证 2026-11-24：BUG-411——运行态入参是流式截断前缀（parseArgsObject 返回 null），
// 卡片需要「已到达的字段」；把「读不到」折成某个具体语义就是说谎。
test('stringFieldOfArgsRaw：截断前缀里已到达的字段可提取，转义按 JSON 解码', () => {
  assert.equal(stringFieldOfArgsRaw('{"action":"set","name":"名称B"', 'action'), 'set')
  assert.equal(stringFieldOfArgsRaw('{"action":"set","name":"名称B"', 'name'), '名称B')
  assert.equal(stringFieldOfArgsRaw('{"name":"a\\"b\\n c"}', 'name'), 'a"b\n c')
  // 未到达 / 值还没闭合 / 非字符串值 → null（未知，不猜）
  assert.equal(stringFieldOfArgsRaw('{"oper', 'action'), null)
  assert.equal(stringFieldOfArgsRaw('{"action":"se', 'action'), null)
  assert.equal(stringFieldOfArgsRaw('{"action":42}', 'action'), null)
  assert.equal(stringFieldOfArgsRaw('', 'action'), null)
  assert.equal(stringFieldOfArgsRaw('{"bad":"\\q"}', 'bad'), null)
})
