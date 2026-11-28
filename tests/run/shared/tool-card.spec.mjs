// tool-card 回归 — 研究语义卡标题折算（keyless；wire 权威形状 = queries 数组，录制流实证）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardTitleOf, parseArgsObject, cardStateOf, stringFieldOfArgsRaw, toolResultBodyOf, TOOL_NOT_STARTED, TOOL_OUTCOME_UNKNOWN } from '../../../packages/deep-research-pack/src/lib/events/tool-card.ts';

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

test('web_fetch / subagent 工具卡标题：URL / 子调研语义格式化', () => {
  assert.equal(cardTitleOf('web_fetch', parseArgsObject('{"url":"https://docs.example.com/spec"}'), ''), '抓取：docs.example.com/spec');
  assert.equal(cardTitleOf('web_fetch', parseArgsObject('{}'), ''), '抓取网页');
  assert.equal(cardTitleOf('subagent', parseArgsObject('{"subagent_type":"Scout","description":"检索公开年报"}'), ''), '子调研：Scout — 检索公开年报');
  assert.equal(cardTitleOf('subagent', parseArgsObject('{}'), ''), '委派子调研');
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

// 负例留证 2026-11-24：BUG-431——`stopped` 不可达：判据认 `error.code === 'interrupted'`，
// 但 vendor 的崩溃恢复码是 TOOL_OUTCOME_UNKNOWN / TOOL_NOT_STARTED（repair.ts），于是
// 「结果未知」被渲染成「失败」。红配方：把判据改回只认 'interrupted'。
test('BUG-431：vendor 的崩溃恢复码 → stopped（结果未知，不是失败）', async () => {
  // 漂移锁：评审基线（vendor 钉 tag）里的常量源码就是 wire 契约；pack 的字面量必须逐字相同。
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
  const repair = readFileSync(join(root, 'vendor', 'dsh', 'packages', 'core', 'session', 'src', 'repair.ts'), 'utf8')
  assert.match(repair, new RegExp(`export const TOOL_OUTCOME_UNKNOWN = '${TOOL_OUTCOME_UNKNOWN}'`), 'vendor 常量漂移')
  assert.match(repair, new RegExp(`export const TOOL_NOT_STARTED = '${TOOL_NOT_STARTED}'`), 'vendor 常量漂移')
  assert.equal(cardStateOf({ kind: 'tool-result', isError: true, error: { code: TOOL_OUTCOME_UNKNOWN } }), 'stopped')
  assert.equal(cardStateOf({ kind: 'tool-result', isError: true, error: { code: TOOL_NOT_STARTED } }), 'stopped')
  // 负控：普通工具失败仍是 error；成功仍是 ok；未结算仍是 running。
  assert.equal(cardStateOf({ kind: 'tool-result', isError: true, error: { code: 'FS_STALE_VERSION' } }), 'error')
  assert.equal(cardStateOf({ kind: 'tool-result', isError: false }), 'ok')
  assert.equal(cardStateOf({}), 'running')
  // 历史兼容：旧码 'interrupted' 仍判 stopped（不因换码丢历史）。
  assert.equal(cardStateOf({ kind: 'tool-result', isError: true, error: { code: 'interrupted' } }), 'stopped')
})

test('toolResultBodyOf：web_search / web_fetch 消费规范 block.meta 并优雅回退', () => {
  const searchMetaBlock = {
    kind: 'tool-result',
    isError: false,
    meta: {
      answer: 'P5 consists of China, France, Russia, UK, and US.',
      sources: [{ url: 'https://www.un.org/securitycouncil', title: 'UN Security Council', snippet: 'Permanent members' }],
      truncated: false,
    },
  }
  const searchBody = toolResultBodyOf('web_search', searchMetaBlock, parseArgsObject('{"queries":["UNSC P5"]}'), '')
  assert.equal(searchBody?.kind, 'web-search')
  assert.equal(searchBody.sources.length, 1)
  assert.equal(searchBody.sources[0]?.url, 'https://www.un.org/securitycouncil')

  const fallbackSearch = toolResultBodyOf('web_search', {
    kind: 'tool-result',
    isError: false,
    content: [{ text: 'Found [Official Charter](https://www.un.org/charter)' }],
  }, parseArgsObject('{"queries":["UN Charter"]}'), '')
  assert.equal(fallbackSearch?.kind, 'web-search')
  assert.equal(fallbackSearch.sources[0]?.title, 'Official Charter')

  const fetchBody = toolResultBodyOf('web_fetch', {
    kind: 'tool-result',
    isError: false,
    meta: { url: 'https://docs.example.com/spec', statusCode: 200, truncated: true },
  }, parseArgsObject('{"url":"https://docs.example.com/spec"}'), '')
  assert.deepEqual(fetchBody, {
    kind: 'web-fetch',
    url: 'https://docs.example.com/spec',
    statusCode: 200,
    truncated: true,
  })

  const errBody = toolResultBodyOf('web_fetch', {
    kind: 'tool-result',
    isError: true,
    error: { message: 'HTTP 503 upstream timeout' },
  }, parseArgsObject('{"url":"https://docs.example.com/spec"}'), '')
  assert.deepEqual(errBody, { kind: 'fallback', text: 'HTTP 503 upstream timeout' })
})

test('toolResultBodyOf：spawn_teammate / subagent 解析角色、波次标记与目标摘要', () => {
  const teamBody = toolResultBodyOf('spawn_teammate', { kind: 'tool-result', isError: false }, parseArgsObject(JSON.stringify({
    name: 'critic-1',
    description: '核查 W2.1 主张证据链',
  })), '')
  assert.equal(teamBody?.kind, 'delegation')
  assert.equal(teamBody.mode, 'teammate')
  assert.equal(teamBody.roleName, 'critic-1')
  assert.equal(teamBody.waveHint, 'W2.1')
  assert.match(teamBody.goalSummary, /核查 W2\.1/)

  const waveBody = toolResultBodyOf('subagent', { kind: 'tool-result', isError: false }, parseArgsObject(JSON.stringify({
    subagent_type: 'research-wave',
    prompt: 'Execute wave 2 fanout across 4 topics\nReturn JSON receipts',
  })), '')
  assert.equal(waveBody?.kind, 'delegation')
  assert.equal(waveBody.mode, 'worker')
  assert.equal(waveBody.waveHint, 'research-wave')
})
