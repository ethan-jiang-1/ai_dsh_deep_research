// fetch-fallback policy — 本地抓取失败 → DeepSeek Fetch API 回退的纯判据（D31）。
// 判据对象 = packages/deep-research-pack/src/fetch-fallback/policy.ts（零 vendor 运行时依赖，
// keyless）；真实两腿编排在 src/fetch-fallback/index.ts，由 L1 + live headless 档证明。
//
// 负例留证 2026-10-27：把 NEVER_FALLBACK_ERROR_CODES 里的 WEB_BLOCKED_URL 删掉 →
//   「安全策略拒绝绝不回退」测红；把 legBudget 的 local 改成 total → 「预算两腿」测红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FALLBACK_ERROR_CODES, NEVER_FALLBACK_ERROR_CODES, errorCodeOf, fallbackForError,
  fallbackNotice, fallbackStatusMatches, legBudget,
} from '../../packages/deep-research-pack/src/fetch-fallback/policy.ts';

test('回退判据：只救"本地取不到页面"的失败', () => {
  for (const code of FALLBACK_ERROR_CODES) {
    assert.equal(fallbackForError(code), true, `${code} 应可回退`);
  }
});

test('安全策略与取消绝不回退（内网 URL 不外送、用户取消不重发）', () => {
  for (const code of NEVER_FALLBACK_ERROR_CODES) {
    assert.equal(fallbackForError(code), false, `${code} 绝不回退`);
  }
});

test('未知码保守不回退；无码（非结构化传输错）按可回退处理', () => {
  assert.equal(fallbackForError('SOME_FUTURE_CODE'), false);
  assert.equal(fallbackForError(undefined), true);
});

test('状态码回退默认只救 5xx：4xx 换路径通常也取不到，白花一次 API', () => {
  const defaults = [500, 502, 503, 504];
  for (const status of defaults) assert.equal(fallbackStatusMatches(status, defaults), true, `${status} 应回退`);
  for (const status of [200, 301, 403, 404, 429]) {
    assert.equal(fallbackStatusMatches(status, defaults), false, `${status} 不应回退`);
  }
  assert.equal(fallbackStatusMatches(500, []), false, '空配置 = 关掉状态码回退');
});

test('预算两腿：本地腿封顶 localTimeoutMs，剩余给 API 腿，总量不超', () => {
  assert.deepEqual(legBudget(28_000, 10_000), { local: 10_000, fallback: 18_000 });
  assert.deepEqual(legBudget(28_000, 10_000, 9_000), { local: 10_000, fallback: 9_000 });
  assert.deepEqual(legBudget(28_000, 10_000, 27_000), { local: 1_000, fallback: 0 });
  assert.deepEqual(legBudget(5_000, 10_000), { local: 5_000, fallback: 0 });
  for (const elapsed of [0, 5_000, 20_000, 28_000, 40_000]) {
    const { local, fallback } = legBudget(28_000, 10_000, elapsed);
    assert.ok(local + fallback <= 28_000, `elapsed=${elapsed} 两腿预算超总量（${local}+${fallback}）`);
  }
});

test('errorCodeOf：结构化错误取 code，非结构化返回 undefined', () => {
  assert.equal(errorCodeOf({ code: 'WEB_FETCH_TIMEOUT' }), 'WEB_FETCH_TIMEOUT');
  assert.equal(errorCodeOf(new Error('boom')), undefined);
  assert.equal(errorCodeOf(null), undefined);
  assert.equal(errorCodeOf({ code: '' }), undefined);
});

test('回退正文标记：说明本地失败原因，模型能分辨内容不是本地取的', () => {
  const notice = fallbackNotice('WEB_REDIRECT_BLOCKED: cross-origin redirect');
  assert.match(notice, /^> 回退：本地抓取失败/);
  assert.match(notice, /WEB_REDIRECT_BLOCKED/);
  assert.match(notice, /DeepSeek Fetch API/);
  assert.ok(notice.endsWith('\n\n'), '标记后留空行，正文从新段开始');
});
