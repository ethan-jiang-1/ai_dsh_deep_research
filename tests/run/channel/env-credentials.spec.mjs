// env-credentials 回归 —— 子进程环境清洗与真模型档前置（keyless）。
// 8 个真模型档脚本共用 scrubbedEnv/withModelKey/requireCredentials；本文件钉两条安全谓词
// （密钥清洗、白名单透传）与 credentialsPresent 的文件在场语义（requireCredentials 的
// exit(2) 由 smoke-contract 与子进程实跑钉）。
// 2026-11-03 卫生审计补：清洗谓词此前零直测（env.mjs funcs 25%），只因模块被 import 就
// 算"已覆盖"；越权导出的密钥 = 安全面，必须有直测。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { credentialsPresent, isDevHome, scrubbedEnv, withModelKey } from '../../../checks/lib/shared/env.mjs';

const CREDENTIAL_FILE = ['.credentials', 'yaml'].join('.');

test('credentialsPresent：只有凭据文件是常规文件才 true', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'env-credentials-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  assert.equal(credentialsPresent(home), false);
  writeFileSync(join(home, CREDENTIAL_FILE), 'key: test\n');
  assert.equal(credentialsPresent(home), true);
  assert.equal(credentialsPresent(null), false);
  assert.equal(credentialsPresent(''), false);
});

test('scrubbedEnv：密钥类变量一律丢掉，普通变量保留', () => {
  const out = scrubbedEnv({}, {
    PATH: '/bin',
    HOME: '/home/x',
    DEEPSEEK_API_KEY: 'sk-secret',
    GITHUB_TOKEN: 'tok-secret',
    DB_PASSWORD: 'pw-secret',
    APP_SECRET: 's-secret',
  });
  assert.deepEqual(out, { PATH: '/bin', HOME: '/home/x' });
});

test('scrubbedEnv：调用点显式白名单覆盖清洗结果（先洗再加白）', () => {
  const out = scrubbedEnv({ DEEPSEEK_API_KEY: 'sk-explicit', PATH: '/x' }, {
    PATH: '/bin',
    DEEPSEEK_API_KEY: 'sk-ambient',
  });
  assert.equal(out.DEEPSEEK_API_KEY, 'sk-explicit');
  assert.equal(out.PATH, '/x');
});

test('withModelKey：只把那把 DEEPSEEK_API_KEY 加回，其它密钥不复活', () => {
  const out = withModelKey({}, {
    PATH: '/bin',
    DEEPSEEK_API_KEY: 'sk-model',
    GITHUB_TOKEN: 'tok-secret',
  });
  assert.equal(out.DEEPSEEK_API_KEY, 'sk-model');
  assert.equal(out.PATH, '/bin');
  assert.equal('GITHUB_TOKEN' in out, false);
});

test('withModelKey：空/缺省 key 不注入；源 env 注入位生效（不读 process.env）', () => {
  assert.equal('DEEPSEEK_API_KEY' in withModelKey({}, {}), false);
  assert.equal('DEEPSEEK_API_KEY' in withModelKey({}, { DEEPSEEK_API_KEY: '' }), false);
  // 注入的 env 之外的环境变量不得混入（旧实现 scrubbedEnv 读 process.env，会漏进宿主环境）
  const out = withModelKey({}, { ONLY: 'this' });
  assert.deepEqual(Object.keys(out).sort(), ['ONLY']);
});

test('credentialsPresent：同名目录不算凭据文件', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'env-credentials-dir-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(join(home, ['.credentials', 'yaml'].join('.')));
  assert.equal(credentialsPresent(home), false);
});

test('isDevHome：默认 dev home 或 DSH_DEV_HOME 才认，ambient 平台 home 拒绝', () => {
  const root = join(tmpdir(), 'repo-root');
  const defaultHome = join(root, 'runtime', 'harness-home');
  assert.equal(isDevHome(defaultHome, { root, customHome: '' }), true);
  assert.equal(isDevHome(defaultHome, { root, customHome: undefined }), true);
  assert.equal(isDevHome(join(tmpdir(), 'custom-dev'), { root, customHome: join(tmpdir(), 'custom-dev') }), true);
  assert.equal(isDevHome(join(tmpdir(), 'platform-home'), { root, customHome: '' }), false);
  assert.equal(isDevHome('', { root }), false);
  assert.equal(isDevHome(defaultHome, { root: '' }), false);
});

// 负例留证 2026-11-27：BUG-450——tools/env.sh 仅用 BASH_SOURCE[0] 取根路径，zsh 下 source 会把
// _repo_root 解析到仓库父目录；红证 = `zsh -c 'source tools/env.sh && test "$DSH_HOME" = "$PWD/runtime/harness-home"'` exit 1。
test('BUG-450 tools/env.sh：同时兼容 bash 与 zsh 取仓库根路径并校验根标志', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const text = readFileSync(join(root, 'tools', 'env.sh'), 'utf8');
  assert.match(text, /BASH_SOURCE\[0\]/, '需保留 bash 分支');
  assert.match(text, /ZSH_VERSION/, '需显式兼容 zsh');
  assert.match(text, /\$\{\(%\):-%x\}/, '需使用 zsh source 路径语法');
  assert.match(text, /package\.json/, '需校验解析出的 _repo_root 为真实仓库根');
  assert.doesNotMatch(text, /git -C "\$\(cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)/, 'hooks 设置必须复用已解析的 _repo_root');
});
