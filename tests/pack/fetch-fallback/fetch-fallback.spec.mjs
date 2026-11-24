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
  fallbackNotice, fallbackStatusMatches, legBudget, remainingAfterLocal,
} from '../../../packages/deep-research-pack/src/fetch-fallback/policy.ts';
import { fetchWithFallback } from '../../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts';

test('回退判据：只救"本地取不到页面"的失败', () => {
  // 码表硬编码在测试侧（不遍历实现导出的集合）：新增可回退码必须显式评审并改这里，
  // 否则实现里多一个码会被自动放行（2026-11-03 审计 D5）。
  const expected = [
    'WEB_FETCH_TIMEOUT', 'WEB_FETCH_TOO_LARGE', 'WEB_UNSUPPORTED_CONTENT_TYPE',
    'WEB_REDIRECT_BLOCKED', 'WEB_PROVIDER_ERROR',
  ];
  assert.deepEqual([...FALLBACK_ERROR_CODES].sort(), [...expected].sort(),
    '可回退码表变了——新增/删除码必须显式评审并同步本表');
  for (const code of expected) {
    assert.equal(fallbackForError(code), true, `${code} 应可回退`);
  }
});

test('安全策略与取消绝不回退（内网 URL 不外送、用户取消不重发）', () => {
  const expected = ['WEB_ABORTED', 'WEB_BLOCKED_URL', 'WEB_INVALID_URL'];
  assert.deepEqual([...NEVER_FALLBACK_ERROR_CODES].sort(), [...expected].sort(),
    '绝不回退码表变了——新增/删除码必须显式评审并同步本表');
  for (const code of expected) {
    assert.equal(fallbackForError(code), false, `${code} 绝不回退`);
  }
  for (const code of expected) {
    assert.equal(FALLBACK_ERROR_CODES.has(code), false, `${code} 不能同时在可回退集合里`);
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
  assert.equal(remainingAfterLocal(28_000, 9_000), 19_000);
  assert.equal(remainingAfterLocal(28_000, 27_000), 1_000);
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

// 负例留证 2026-11-24：BUG-419——`legBudget` 把「本地已耗时」当「预留」再扣一次 localTimeout，
// API 腿拿到 remaining − localTimeout（本地越慢，回退预算越少——与正确语义相反）。
// 红配方：把 remainingAfterLocal 改回 `legBudget(..., elapsed).fallback`。
test('BUG-419：本地腿耗时后，API 腿拿到「总预算 − 已耗时」（只扣一次）', () => {
  assert.equal(remainingAfterLocal(28_000, 0), 28_000)
  assert.equal(remainingAfterLocal(28_000, 9_000), 19_000)
  assert.equal(remainingAfterLocal(28_000, 9_900), 18_100)
  assert.equal(remainingAfterLocal(28_000, 27_000), 1_000)
  assert.equal(remainingAfterLocal(28_000, 30_000), 0, '超支不得为负')
  // 初始两腿切分保持「各占一份」语义（本地腿未被消耗前的规划）。
  assert.deepEqual(legBudget(28_000, 10_000), { local: 10_000, fallback: 18_000 })
})

// 实跑：本地腿「耗时 9s 后超时」→ 注入的 api 腿实际收到的 deadline/预算 = 19000ms。
test('BUG-419 实跑：本地腿慢不等于回退预算少（orchestrate 传入的 api 预算只扣一次）', async () => {
  let clock = 0
  let apiBudget = null
  const result = await fetchWithFallback(
    {
      now: () => clock,
      local: async () => {
        clock += 9_000
        throw new Error('ETIMEDOUT: local timed out after 9s')
      },
      api: async (_request, _deadline, budget) => {
        apiBudget = budget
        return { url: 'https://example.com', statusCode: 200, body: { kind: 'text', content: 'ok' }, truncated: false }
      },
      deadline: (_signal, ms) => AbortSignal.timeout(ms),
      makeError: (message, code, cause) => Object.assign(new Error(message), { code, cause }),
    },
    { enabled: true, totalBudgetMs: 28_000, localTimeoutMs: 10_000, fallbackOnStatus: [500], apiKeyEnv: 'X', apiKeyPresent: true },
    { url: 'https://example.com' },
  )
  assert.equal(apiBudget, 19_000, `api 腿预算应为 19000，实际 ${String(apiBudget)}`)
  assert.ok(result.statusCode === 200)
})
