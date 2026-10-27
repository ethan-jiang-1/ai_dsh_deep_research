// fetch-fallback credentials — 回退腿凭据解析的 keyless 回归（D31）。
// 被测 = src/fetch-fallback/credentials.ts：credentials 服务优先、环境变量兜底、都没有 = 不回退。
//
// 负例留证 2026-10-27：把 resolveCredential 的 credentials 分支删掉 → 「服务优先」测红；
//   把 env 兜底删掉 → 「服务空值回落环境」测红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveCredential } from '../../packages/deep-research-pack/src/fetch-fallback/credentials.ts';

const service = (value) => ({ resolve: async () => value === undefined ? undefined : { value } });

test('credentials 服务有值 → 用它（Models 页写入的 ref 优先）', async () => {
  assert.equal(await resolveCredential(service('from-service'), { REF: 'from-env' }, 'REF'), 'from-service');
});

test('credentials 服务返回空 → 回落启动环境变量（headless/dev 形态）', async () => {
  assert.equal(await resolveCredential(service(''), { REF: 'from-env' }, 'REF'), 'from-env');
  assert.equal(await resolveCredential(service(undefined), { REF: 'from-env' }, 'REF'), 'from-env');
});

test('没有 credentials 服务 → 只读环境变量', async () => {
  assert.equal(await resolveCredential(undefined, { REF: 'from-env' }, 'REF'), 'from-env');
});

test('两处都没有 / 空串 → undefined（调用方据此不回退并如实报错）', async () => {
  assert.equal(await resolveCredential(undefined, {}, 'REF'), undefined);
  assert.equal(await resolveCredential(service(''), { REF: '' }, 'REF'), undefined);
  assert.equal(await resolveCredential(undefined, { OTHER: 'x' }, 'REF'), undefined);
});

test('Config 不提供字面量 apiKey（秘密只走 apiKeyEnv 引用，不进 profile patch）', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'deep-research-pack', 'src', 'fetch-fallback', 'index.ts'), 'utf8');
  assert.equal(/\bapiKey\s*\?:/.test(src), false, 'Config 仍暴露 apiKey 字面量字段');
  assert.equal(/apiKey:\s*z\.string\(\)/.test(src), false, 'Config schema 仍接受 apiKey 字面量');
  assert.ok(src.includes("apiKeyEnv: z.string().role('credential-ref')"), 'apiKeyEnv 引用字段必须在场');
});
