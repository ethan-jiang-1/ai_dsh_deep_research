// fetch-fallback orchestration — 两腿决策流的假腿回归（D31）。被测 = orchestrate.ts：
// 回退顺序、安全拒绝、取消、无凭据、两腿失败、状态码路径、预算耗尽、开关。
// 它不 import vendor（依赖注入），所以 keyless；真实接线（WebError/HttpFetchProvider/
// DeepSeekFetchApiProvider）在 src/fetch-fallback/index.ts，由 L1/L2 与 live 探针证明。
//
// 负例留证 2026-10-27：把 orchestrate.ts 里"!fallbackForError(code) throw"删掉 →
//   「安全拒绝绝不回退」测红；把 api 腿的 remaining 预算改成 totalBudgetMs →
//   「预算耗尽不回退」测红；把 makeError 的 code 改成写死 WEB_PROVIDER_ERROR →
//   「两腿失败保留本地码」测红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithFallback, markRescued, describeFailure, sanitizeUrlForLog } from '../../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts';
import { PROVIDER_ID } from '../../../packages/deep-research-pack/src/fetch-fallback/policy.ts';
import { researchRoles } from '../../../checks/lib/shared/roles.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');

const settings = (over = {}) => ({
  enabled: true,
  localTimeoutMs: 10_000,
  totalBudgetMs: 28_000,
  fallbackOnStatus: [500, 503],
  apiKeyEnv: 'REF',
  ...over,
});
const text = (content, statusCode = 200) => ({ url: 'https://example.com/', statusCode, body: { kind: 'text', content }, truncated: false });
const html = (content, statusCode = 200) => ({ url: 'https://example.com/', statusCode, body: { kind: 'html', content }, truncated: false });
const failure = (code, message = 'boom') => Object.assign(new Error(message), { code });
const makeError = (message, code, cause) => Object.assign(new Error(message), { code, cause });

/**
 * Build deps with automatic counters and a controllable clock.
 * `over.local` / `over.api` replace the leg implementation; counters still wrap them.
 */
function harness(over = {}) {
  const calls = { local: 0, api: 0 };
  let clock = 0;
  const deps = {
    local: async (req, sig) => { calls.local++; return over.local ? over.local(req, sig) : text('local body'); },
    api: async (req, sig, budget, detail) => { calls.api++; return over.api ? over.api(req, sig, budget, detail) : text('api body'); },
    deadline: (_signal, _ms) => new AbortController().signal,
    makeError,
    now: () => clock,
  };
  return { deps, calls, advance: (ms) => { clock += ms; } };
}

test('本地成功 → 原样返回，API 腿不启动', async () => {
  const h = harness();
  const out = await fetchWithFallback(h.deps, settings(), { url: 'https://example.com/' });
  assert.equal(out.body.content, 'local body');
  assert.deepEqual(h.calls, { local: 1, api: 0 });
});

test('本地取不到页面 + API 成功 → 带来源标记返回，状态沿用 API 的 200', async () => {
  const h = harness({ local: async () => { throw failure('WEB_REDIRECT_BLOCKED', 'cross-origin redirect'); } });
  const out = await fetchWithFallback(h.deps, settings(), { url: 'https://example.com/' });
  assert.match(out.body.content, /^> 回退：本地抓取失败（WEB_REDIRECT_BLOCKED/);
  assert.match(out.body.content, /api body$/);
  assert.equal(out.statusCode, 200);
  assert.deepEqual(h.calls, { local: 1, api: 1 });
});

test('安全策略拒绝（内网/非法 URL）绝不回退：原错抛出，API 腿不启动', async () => {
  for (const code of ['WEB_BLOCKED_URL', 'WEB_INVALID_URL']) {
    const original = failure(code);
    const h = harness({ local: async () => { throw original; } });
    await assert.rejects(
      () => fetchWithFallback(h.deps, settings(), { url: 'http://127.0.0.1/' }),
      (error) => error === original,
    );
    assert.deepEqual(h.calls, { local: 1, api: 0 }, `${code} 不应发 API 请求`);
  }
});

test('调用方取消绝不回退：原错抛出，API 腿不启动', async () => {
  const original = failure('WEB_ABORTED');
  const h = harness({ local: async () => { throw original; } });
  await assert.rejects(
    () => fetchWithFallback(h.deps, settings(), { url: 'https://example.com/' }),
    (error) => error === original,
  );
  assert.deepEqual(h.calls, { local: 1, api: 0 });
});

test('无凭据：API 腿返回 undefined → 抛本地码 + fallback unavailable，不假装救过', async () => {
  const h = harness({
    local: async () => { throw failure('WEB_FETCH_TIMEOUT', 'timed out'); },
    api: async () => undefined,
  });
  await assert.rejects(
    () => fetchWithFallback(h.deps, settings(), { url: 'https://example.com/' }),
    (error) => {
      assert.equal(error.code, 'WEB_FETCH_TIMEOUT');
      assert.match(error.message, /fallback unavailable: REF is not configured/);
      return true;
    },
  );
  assert.deepEqual(h.calls, { local: 1, api: 1 });
});

test('两腿都失败：保留本地码，错误里同时点名两条腿', async () => {
  const h = harness({
    local: async () => { throw failure('WEB_REDIRECT_BLOCKED', 'redirect'); },
    api: async () => { throw failure('WEB_PROVIDER_ERROR', 'api down'); },
  });
  await assert.rejects(
    () => fetchWithFallback(h.deps, settings(), { url: 'https://example.com/' }),
    (error) => {
      assert.equal(error.code, 'WEB_REDIRECT_BLOCKED');
      assert.match(error.message, /local retrieval failed \(WEB_REDIRECT_BLOCKED/);
      assert.match(error.message, /fallback also failed \(WEB_PROVIDER_ERROR/);
      return true;
    },
  );
  assert.deepEqual(h.calls, { local: 1, api: 1 });
});

test('状态码路径：5xx 且 API 成功 → 回退；API 无凭据 → 返回本地 5xx 结果', async () => {
  const withApi = harness({ local: async () => text('server error page', 503) });
  const rescued = await fetchWithFallback(withApi.deps, settings(), { url: 'https://example.com/' });
  assert.match(rescued.body.content, /^> 回退：本地抓取失败（HTTP 503）/);
  assert.deepEqual(withApi.calls, { local: 1, api: 1 });

  const noKey = harness({ local: async () => text('server error page', 503), api: async () => undefined });
  const kept = await fetchWithFallback(noKey.deps, settings(), { url: 'https://example.com/' });
  assert.equal(kept.statusCode, 503);
  assert.equal(kept.body.content, 'server error page');
  assert.deepEqual(noKey.calls, { local: 1, api: 1 });
});

test('4xx 不进回退：本地 404 原样返回，API 腿不启动', async () => {
  const h = harness({ local: async () => text('not found', 404) });
  const out = await fetchWithFallback(h.deps, settings(), { url: 'https://example.com/' });
  assert.equal(out.statusCode, 404);
  assert.deepEqual(h.calls, { local: 1, api: 0 });
});

test('预算耗尽：本地腿花光总预算 → 不做 API 请求，抛本地错', async () => {
  const h = harness({
    local: async () => { h.advance(28_000); throw failure('WEB_FETCH_TIMEOUT', 'slow'); },
  });
  await assert.rejects(
    () => fetchWithFallback(h.deps, settings(), { url: 'https://example.com/' }),
    (error) => error.code === 'WEB_FETCH_TIMEOUT',
  );
  assert.deepEqual(h.calls, { local: 1, api: 0 });
});

test('API 腿进行中调用方取消 → 抛取消，不吞成"回退成功"', async () => {
  const controller = new AbortController();
  const aborted = failure('WEB_ABORTED', 'caller cancelled');
  const h = harness({
    local: async () => { throw failure('WEB_REDIRECT_BLOCKED'); },
    api: async () => { controller.abort(); throw aborted; },
  });
  await assert.rejects(
    () => fetchWithFallback(h.deps, settings(), { url: 'https://example.com/' }, controller.signal),
    (error) => error === aborted,
  );
  assert.deepEqual(h.calls, { local: 1, api: 1 });
});

test('enabled: false = 只走本地（开关不需要改 provider 选择）', async () => {
  const h = harness({ local: async () => { throw failure('WEB_REDIRECT_BLOCKED'); } });
  await assert.rejects(
    () => fetchWithFallback(h.deps, settings({ enabled: false }), { url: 'https://example.com/' }),
    (error) => error.code === 'WEB_REDIRECT_BLOCKED',
  );
  assert.deepEqual(h.calls, { local: 1, api: 0 });
});

test('markRescued 只改 text 正文；HTML 结果不加标记（API 腿不会返回 html，防御性）', () => {
  assert.match(markRescued(text('body'), 'WEB_FETCH_TIMEOUT').body.content, /^> 回退：/);
  const kept = markRescued(html('<p>x</p>'), 'WEB_FETCH_TIMEOUT');
  assert.equal(kept.body.kind, 'html');
  assert.equal(kept.body.content, '<p>x</p>');
});

test('describeFailure 带码且截断，模型可读', () => {
  assert.match(describeFailure(failure('WEB_FETCH_TIMEOUT', 'x'.repeat(400))), /^WEB_FETCH_TIMEOUT: x{157}…$/);
  assert.match(describeFailure(new Error('plain')), /^plain$/);
});

test('单源对账：provider id / 行名 / 预算在 YAML 与代码间一致（D30/D31）', () => {
  const yml = readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8');
  assert.match(yml, new RegExp(`fetchProvider: ${PROVIDER_ID}$`, 'm'), 'web.fetchProvider 与 PROVIDER_ID 不一致');
  assert.match(yml, /^\s*- id: research-fetch-fallback$/m);
  assert.match(yml, /name:\s*['"]?dsh-deep-research-pack\/fetch-fallback['"]?/);

  const total = Number(/totalBudgetMs:\s*(\d+)/.exec(yml)?.[1]);
  const local = Number(/localTimeoutMs:\s*(\d+)/.exec(yml)?.[1]);
  assert.ok(Number.isFinite(total) && Number.isFinite(local), '回退行必须有可解析的两腿预算');
  assert.ok(local < total, '本地腿预算必须小于总预算');

  for (const role of researchRoles(ROOT)) {
    const preset = readFileSync(join(PACK, 'presets', `${role}.patch.yml`), 'utf8');
    const toolBudget = Number(/fetchTimeoutMs:\s*(\d+)/.exec(preset)?.[1]);
    assert.ok(Number.isFinite(toolBudget), `${role}: tool-web 缺 fetchTimeoutMs`);
    assert.ok(toolBudget > total, `${role}: 工具预算 ${toolBudget} 必须大于回退两腿总预算 ${total}`);
  }
});

test('原生运行留痕：剥除 URL query/userinfo，覆盖回退成功/跳过/双腿失败分支', async () => {
  assert.equal(sanitizeUrlForLog('https://user:secret@example.com/path/page?token=abc#sec'), 'https://example.com/path/page');
  assert.equal(sanitizeUrlForLog('not a url'), 'invalid-url');

  const logs = [];
  const log = { info: (m) => logs.push({ level: 'info', m }), warn: (m) => logs.push({ level: 'warn', m }) };

  // 1) 回退成功 → info，URL 已剥除 query token
  const hOk = harness({ local: async () => { throw failure('WEB_REDIRECT_BLOCKED', 'cross-origin'); } });
  hOk.deps.log = log;
  await fetchWithFallback(hOk.deps, settings(), { url: 'https://example.com/doc?token=topsecret' });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].level, 'info');
  assert.match(logs[0].m, /^\[deep-research:fetch-fallback\] event=fallback_ok url=https:\/\/example\.com\/doc localCode=WEB_REDIRECT_BLOCKED /);
  assert.doesNotMatch(logs[0].m, /topsecret/);

  // 2) 安全拒绝跳过回退 → warn + reason=policy
  logs.length = 0;
  const hSkip = harness({ local: async () => { throw failure('WEB_BLOCKED_URL'); } });
  hSkip.deps.log = log;
  await assert.rejects(() => fetchWithFallback(hSkip.deps, settings(), { url: 'http://127.0.0.1/secret?k=1' }));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].level, 'warn');
  assert.match(logs[0].m, /event=fallback_skipped reason=policy url=http:\/\/127\.0\.0\.1\/secret localCode=WEB_BLOCKED_URL/);
  assert.doesNotMatch(logs[0].m, /k=1/);

  // 3) 双腿失败 → warn + fallback_fail
  logs.length = 0;
  const hFail = harness({
    local: async () => { throw failure('WEB_FETCH_TIMEOUT'); },
    api: async () => { throw failure('WEB_PROVIDER_ERROR', 'HTTP 404'); },
  });
  hFail.deps.log = log;
  await assert.rejects(() => fetchWithFallback(hFail.deps, settings(), { url: 'https://bis.gov/media/1575?api_key=xyz' }));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].level, 'warn');
  assert.match(logs[0].m, /event=fallback_fail url=https:\/\/bis\.gov\/media\/1575 localCode=WEB_FETCH_TIMEOUT apiCode=WEB_PROVIDER_ERROR/);
  assert.doesNotMatch(logs[0].m, /xyz/);
});

// 负例留证 2026-11-28：BUG-488——本地 deadline signal 先于 HttpFetchProvider 内部 timer 触发时，
// provider 把外层 signal abort 归类成 WEB_ABORTED，orchestrate 直接按调用方取消拒回退并裸抛 `web fetch aborted`。
// 红配方：去掉 orchestrate.ts 里 `localSignal.aborted && !callerAborted()` 的 WEB_FETCH_TIMEOUT 归一化 → 本例红。
test('BUG-488：本地 deadline 超时被底层判成 WEB_ABORTED 时按 WEB_FETCH_TIMEOUT 回退 API，保留 URL 且调用方取消绝不回退', async () => {
  const url = 'https://www.reuters.com/technology/example-article';
  const logs = [];
  const log = { info: (m) => logs.push({ level: 'info', m }), warn: (m) => logs.push({ level: 'warn', m }) };

  // 1) 外层本地 deadline 已中止（调用方未取消），底层抛 WEB_ABORTED → 必须归一为 WEB_FETCH_TIMEOUT 并走 API 腿
  const localTimeoutCtrl = new AbortController();
  const hRescued = harness({
    local: async (_req, sig) => {
      localTimeoutCtrl.abort(new DOMException('timed out', 'TimeoutError'));
      assert.equal(sig.aborted, true);
      throw failure('WEB_ABORTED', 'web fetch aborted');
    },
  });
  hRescued.deps.deadline = () => localTimeoutCtrl.signal;
  hRescued.deps.log = log;
  const rescued = await fetchWithFallback(hRescued.deps, settings(), { url });
  assert.deepEqual(hRescued.calls, { local: 1, api: 1 }, '本地 deadline 超时必须触发 API 回退');
  assert.match(rescued.body.content, /^> 回退：本地抓取失败（WEB_FETCH_TIMEOUT:/);
  assert.match(rescued.body.content, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(logs[0].m, /event=fallback_ok .*localCode=WEB_FETCH_TIMEOUT/);

  // 2) 预算已耗尽且本地 deadline 触发 → 抛 WEB_FETCH_TIMEOUT 并含 URL，而非裸 WEB_ABORTED
  const budgetCtrl = new AbortController();
  const hExhausted = harness({
    local: async () => {
      hExhausted.advance(28_000);
      budgetCtrl.abort(new DOMException('timed out', 'TimeoutError'));
      throw failure('WEB_ABORTED', 'web fetch aborted');
    },
  });
  hExhausted.deps.deadline = () => budgetCtrl.signal;
  await assert.rejects(
    () => fetchWithFallback(hExhausted.deps, settings(), { url }),
    (error) => {
      assert.equal(error.code, 'WEB_FETCH_TIMEOUT');
      assert.match(error.message, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      return true;
    },
  );
  assert.deepEqual(hExhausted.calls, { local: 1, api: 0 });

  // 3) API 腿 deadline 触发（调用方未取消）且两腿都失败 → 报错准确点名 API 超时与 URL
  const legSignals = [new AbortController(), new AbortController()];
  let legIdx = 0;
  const hDualTimeout = harness({
    local: async () => {
      legSignals[0].abort(new DOMException('local timeout', 'TimeoutError'));
      throw failure('WEB_ABORTED', 'web fetch aborted');
    },
    api: async () => {
      legSignals[1].abort(new DOMException('api timeout', 'TimeoutError'));
      throw failure('WEB_ABORTED', 'web fetch aborted');
    },
  });
  hDualTimeout.deps.deadline = () => legSignals[legIdx++].signal;
  await assert.rejects(
    () => fetchWithFallback(hDualTimeout.deps, settings(), { url }),
    (error) => {
      assert.equal(error.code, 'WEB_FETCH_TIMEOUT');
      assert.match(error.message, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.match(error.message, /DeepSeek Fetch API fallback also failed \(WEB_FETCH_TIMEOUT:/);
      return true;
    },
  );
  assert.deepEqual(hDualTimeout.calls, { local: 1, api: 1 });

  // 4) 状态码回退腿上遇到真正的调用方取消 → 错误包含 URL
  const callerCtrl = new AbortController();
  const hStatusAbort = harness({
    local: async () => text('server error', 503),
    api: async () => { callerCtrl.abort(); throw failure('WEB_ABORTED', 'cancelled'); },
  });
  await assert.rejects(
    () => fetchWithFallback(hStatusAbort.deps, settings(), { url }, callerCtrl.signal),
    (error) => {
      assert.equal(error.code, 'WEB_ABORTED');
      assert.match(error.message, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      return true;
    },
  );

  // 5) 负控：真正的调用方取消（callerSignal.aborted === true）仍绝不回退
  const trueCancel = new AbortController();
  const originalAbort = failure('WEB_ABORTED', 'web fetch aborted');
  const hCancel = harness({
    local: async () => {
      trueCancel.abort();
      throw originalAbort;
    },
  });
  hCancel.deps.deadline = (sig) => sig ?? new AbortController().signal;
  await assert.rejects(
    () => fetchWithFallback(hCancel.deps, settings(), { url }, trueCancel.signal),
    (error) => error === originalAbort,
  );
  assert.deepEqual(hCancel.calls, { local: 1, api: 0 });
});
