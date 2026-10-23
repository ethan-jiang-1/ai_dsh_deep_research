// env-credentials 回归 —— 真模型档前置的纯判定（keyless）。
// 8 个真模型档脚本共用 requireCredentials；本文件只钉 credentialsPresent 的文件在场语义
// （requireCredentials 的 exit(2) 由 smoke-contract 与子进程实跑钉）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { credentialsPresent } from '../../scripts/lib/env.mjs';

const CREDENTIAL_FILE = ['.credentials', 'yaml'].join('.');

test('credentialsPresent：只有凭据文件是常规文件才 true', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'env-credentials-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  assert.equal(credentialsPresent(home), false);
  writeFileSync(join(home, CREDENTIAL_FILE), 'key: test\n');
  assert.equal(credentialsPresent(home), true);
  assert.equal(credentialsPresent(home), true);
  assert.equal(credentialsPresent(null), false);
  assert.equal(credentialsPresent(''), false);
});

test('credentialsPresent：同名目录不算凭据文件', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'env-credentials-dir-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(join(home, ['.credentials', 'yaml'].join('.')));
  assert.equal(credentialsPresent(home), false);
});
