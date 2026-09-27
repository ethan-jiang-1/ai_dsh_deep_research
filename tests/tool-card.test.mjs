// tool-card 回归 — 研究语义卡标题折算（keyless；wire 权威形状 = queries 数组，录制流实证）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardTitleOf, parseArgsObject, cardStateOf } from '../packages/deep-research-pack/src/lib/tool-card.ts';

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
