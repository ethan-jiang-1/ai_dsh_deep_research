// tests/provider-errors.test.mjs —— 上游流错误抽取的 keyless 契约（唯一语义源）。
//
// 为什么存在：这类停摆的第一版判据用正则猜（把 JSON 键序写死 → 全库零命中，白查一轮）。改为**解析**
// 之后，判据的边界（只认 turn/end、不双算 attempt、key 顺序无关、畸形行容忍）必须常驻钉住。
//
// 反证（同 diff 注入实测，红→还原→绿）：
//   ①改回"正则猜键序"（只认 `"code"` 在前）→ 用例 1 红（真实形态 message 在前）；
//   ②把 `assistant/attempt` 的 stream 错误也扫进来（"善意增补"，同一事故双算）→ 用例 3 红。
//      ⚠ 实测教训：这条判据有**三层防护**（行级快筛 `turn/end` 子串 → 事件类型判据 → `data.reason` 路径判据），
//      只放宽一层或两层**都咬不住**（连试三次注入均绿 = 反证空转）；能咬的配方 = 三层一起放宽、
//      真去读 `stream[].chunk.reason`。写负例配方前先确认它真的会让测试红。
//   ③去掉 `kind === 'error'` 判据 → 用例 4 红（正常回合被算成错误）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { turnEndErrorsOf, tallyTurnEndErrors, retryEventsOf } from '../scripts/lib/provider-errors.mjs';

// 真实形态（2026-10-11 实测）：error 对象里 message 在前、code 在后
const turnEnd = (seq, reason) => JSON.stringify({ type: 'turn/end', seq, time: 1791720000000 + seq, data: { turn: 6, reason } });
const errReason = (message, code) => ({ kind: 'error', error: { message, code } });

test('命中：turn/end 且 reason.kind=error → 抽出 code 与 message（键序无关）', () => {
  const errors = turnEndErrorsOf(turnEnd(115, errReason('DeepSeek Messages stream: event precedes message_start', 'MALFORMED_RESPONSE')));
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 'MALFORMED_RESPONSE');
  assert.match(errors[0].message, /event precedes message_start/);
  assert.equal(errors[0].seq, 115);
});

test('TRANSPORT 同形态也认；缺 code 记 UNKNOWN（如实，不猜）', () => {
  const errors = turnEndErrorsOf([
    turnEnd(1, errReason('DeepSeek Messages transport failed', 'TRANSPORT')),
    turnEnd(2, { kind: 'error', error: { message: 'no code here' } }),
  ].join('\n'));
  assert.deepEqual(errors.map((e) => e.code), ['TRANSPORT', 'UNKNOWN']);
});

test('不双算：assistant/attempt 里的同一条错误不计（一个回合 = 一次事故）', () => {
  const attempt = JSON.stringify({
    type: 'assistant/attempt', seq: 10, time: 1,
    data: { turn: 6, step: 1, stream: [{ type: 'chunk', chunk: { type: 'finish', reason: { kind: 'error', failure: { message: 'DeepSeek Messages stream: event precedes message_start', code: 'MALFORMED_RESPONSE' } } } }] },
  });
  const errors = turnEndErrorsOf([attempt, turnEnd(11, errReason('DeepSeek Messages stream: event precedes message_start', 'MALFORMED_RESPONSE'))].join('\n'));
  assert.equal(errors.length, 1, '只认 turn/end——attempt 是同一事故的第二次露面');
  assert.equal(errors[0].seq, 11);
});

test('不误判：正常结束（reason.kind=completed / 无 reason）与其它事件类型不算错误', () => {
  const lines = [
    turnEnd(1, { kind: 'completed' }),
    JSON.stringify({ type: 'turn/end', seq: 2, data: { turn: 1 } }),
    JSON.stringify({ type: 'step/end', seq: 3, data: { turn: 1, step: 1, reason: { kind: 'error' } } }),
    JSON.stringify({ type: 'user/message', seq: 4, data: { content: [{ type: 'text', text: 'turn/end reason error' }] } }),
  ];
  assert.deepEqual(turnEndErrorsOf(lines.join('\n')), []);
});

test('畸形容忍与防空语料：非 JSON 行 / 空串 / null → 空数组，不 throw', () => {
  assert.deepEqual(turnEndErrorsOf('{"type":"turn/end" broken'), []);
  assert.deepEqual(turnEndErrorsOf(''), []);
  assert.deepEqual(turnEndErrorsOf(null), []);
});

test('聚合：同 code+message 计数，按次数降序（不同措辞分开计，不归一化猜测）', () => {
  const errors = turnEndErrorsOf([
    turnEnd(1, errReason('A', 'MALFORMED_RESPONSE')),
    turnEnd(2, errReason('A', 'MALFORMED_RESPONSE')),
    turnEnd(3, errReason('B', 'TRANSPORT')),
  ].join('\n'));
  const tally = tallyTurnEndErrors(errors);
  assert.deepEqual(tally, [
    { key: 'MALFORMED_RESPONSE: A', count: 2 },
    { key: 'TRANSPORT: B', count: 1 },
  ]);
});

// ── 重试事件（llm/retry）：缓解是否真在拦截的直接证据 ──

const retryEvent = (seq, failure, extra = {}) => JSON.stringify({
  type: 'llm/retry', seq, time: 1791720000000 + seq,
  data: { retryId: `r${seq}`, turn: 1, step: 2, provider: 'deepseek-official', mode: 'normal', retry: 1, delayMs: 468.6, failure, ...extra },
});

test('重试抽取：取 `data.failure.code`，并带上 retry / delayMs / provider', () => {
  const retries = retryEventsOf(retryEvent(516, { message: 'DeepSeek Messages transport failed', code: 'TRANSPORT' }));
  assert.equal(retries.length, 1);
  assert.equal(retries[0].code, 'TRANSPORT');
  assert.equal(retries[0].retry, 1);
  assert.equal(retries[0].provider, 'deepseek-official');
  assert.ok(retries[0].delayMs > 0);
});

test('陷阱钉住：`policyKey` 里列着整个可重试码表，**不得**被当成本次失败码（按行文本计数会全错）', () => {
  const policyKey = JSON.stringify(['normal', 5, ['EMPTY_RESPONSE', 'RATE_LIMIT', 'SERVER', 'TIMEOUT', 'TRANSPORT', 'MALFORMED_RESPONSE']]);
  const line = retryEvent(1, { message: 'DeepSeek Messages transport failed', code: 'TRANSPORT' }, { policyKey });
  assert.ok(line.includes('MALFORMED_RESPONSE'), '前提：该行文本里确实含 MALFORMED_RESPONSE 字样');
  const retries = retryEventsOf(line);
  assert.equal(retries[0].code, 'TRANSPORT', '判据必须是 failure.code——行文本含该码 ≠ 本次因该码重试');
});

test('重试抽取：`llm/retry-started`（无 failure）与畸形行不计入、不 throw', () => {
  const started = JSON.stringify({ type: 'llm/retry-started', seq: 9, data: { retryId: 'r', turn: 1, step: 2, retry: 1 } });
  assert.deepEqual(retryEventsOf([started, '{"type":"llm/retry" broken', ''].join('\n')), []);
  assert.deepEqual(retryEventsOf(null), []);
});

test('重试聚合：按 `failure.code: message` 计数（可与终局计数并列判读）', () => {
  const retries = retryEventsOf([
    retryEvent(1, { message: 'M', code: 'TRANSPORT' }),
    retryEvent(2, { message: 'M', code: 'TRANSPORT' }),
    retryEvent(3, { message: 'X', code: 'MALFORMED_RESPONSE' }),
  ].join('\n'));
  assert.deepEqual(tallyTurnEndErrors(retries), [
    { key: 'TRANSPORT: M', count: 2 },
    { key: 'MALFORMED_RESPONSE: X', count: 1 },
  ]);
});
