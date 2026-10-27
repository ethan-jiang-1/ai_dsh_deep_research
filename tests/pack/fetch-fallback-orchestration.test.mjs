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
import { fetchWithFallback, markRescued, describeFailure } from '../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts';
import { PROVIDER_ID } from '../../packages/deep-research-pack/src/fetch-fallback/policy.ts';
import { presetRoles } from '../../scripts/lib/roles.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
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

  for (const role of presetRoles(ROOT)) {
    const preset = readFileSync(join(PACK, 'presets', `${role}.patch.yml`), 'utf8');
    const toolBudget = Number(/fetchTimeoutMs:\s*(\d+)/.exec(preset)?.[1]);
    assert.ok(Number.isFinite(toolBudget), `${role}: tool-web 缺 fetchTimeoutMs`);
    assert.ok(toolBudget > total, `${role}: 工具预算 ${toolBudget} 必须大于回退两腿总预算 ${total}`);
  }
});
