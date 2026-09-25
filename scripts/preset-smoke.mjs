#!/usr/bin/env node
// preset-smoke.mjs — L1 真挂载冒烟。
// keyless 预检档（默认）：环境/安装形状断言，不发任何请求。
// 真会话档（DSH_SMOKE_REAL=1）：boot 真 web（钉 tag 源码基线 + 源码域 overlay），
//   roster 断言 → 逐角色 session/create 真挂载 → skills 硬隔离断言。全程 keyless
//   （组合与冷读，无模型调用）——session/create 才会触发行 config 校验，roster/dump
//   看不见（company postmortem 0001：挂载失败只有真会话抓得到，UI 还吞错）。
//
// 前置：DSH_HOME 已设（source dev/env.sh）；DSH_SRC 默认本仓根（vendor/dsh submodule）。
//   钉 tag 源码基线 + tsx 解析树——D10 偏离下的机制权威）。
// 用法：source dev/env.sh && DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs [--port 3099]

import { spawn } from 'node:child_process';
import { withModelKey } from './lib/env.mjs';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles } from './lib/roles.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const PRESETS = join(PACK, 'presets');
// 角色清单事实源 = 盘上 presets/ 目录（§3.2；硬编码清单被 verify role-list-sync 咬）
const ROLES = presetRoles(ROOT);
const OVERLAY = join(ROOT, 'dev', 'research.overlay.yml');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3099'));
// 双通道：默认 = 源码域（web 出厂 profile + overlay 指向本仓 presets 源码）；
// --profile <name> --no-patch = 安装域（plugin add 过的 profile，走已装 pack 的正式路径）。
const PROFILE = arg('profile', 'web');
const NO_PATCH = process.argv.includes('--no-patch');
const BOOT_TIMEOUT_MS = 120_000;

let failed = false;
const step = (ok, label, hint) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) { failed = true; if (hint) console.log(`      → ${hint}`); }
};

// ── keyless 预检（两档共用）──
step(existsSync(join(PACK, 'cordis.patch.yml')), 'pack: cordis.patch.yml 存在');
for (const r of ROLES) {
  step(
    existsSync(join(PACK, 'presets', `${r}.patch.yml`)),
    `pack: presets/${r}.patch.yml（0.1.7 preset 行）`,
  );
  const skills = join(PACK, 'presets', r, 'skills');
  step(existsSync(skills) && readdirSync(skills).length > 0, `pack: presets/${r} skills 非空`);
}

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
step(!!home, 'env: DSH_HOME 已设置（先 source dev/env.sh）', '未设置则只能停在 keyless 预检');

const dshSrc = process.env.DSH_SRC ?? ROOT; // 本仓根 = 安装锚（vendor/dsh submodule 在 workspace；原默认 company 借用已随 D10 销账）
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');

if (process.env.DSH_SMOKE_REAL !== '1') {
  console.log(failed ? '\npreset-smoke: 预检未全绿（见上）' : '\npreset-smoke: 预检绿（真挂载档：DSH_SMOKE_REAL=1）');
  process.exit(failed ? 1 : 0);
}

// ══ 真会话档 ══
if (failed) {
  console.error('preset-smoke: 预检未过，真会话档不启动');
  process.exit(1);
}
step(existsSync(bin), `env: 机制基线源码在位（${bin}）`, '检查 DSH_SRC / company checkout');

const roleSkills = (role) => readdirSync(join(PRESETS, role, 'skills'), { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name).sort();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let rpcId = 0;
const rpc = async (base, cookie, endpoint, args) => {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `smoke-${++rpcId}`, method: endpoint, payload: { args } }),
  });
  const body = await response.json();
  if (body?.result?.ok !== true) {
    throw new Error(`${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`);
  }
  return body.result.value;
};

const boot = async () => {
  const argv = ['--import', 'tsx/esm', bin, '--profile', PROFILE];
  if (!NO_PATCH) argv.push('--patch', OVERLAY);
  argv.push('--', '--port', String(PORT), '--no-open');
  const child = spawn(process.execPath, argv, { cwd: dshSrc, env: withModelKey({ DSH_HOME: home }), stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const banner = new Promise((resolveBanner, rejectBanner) => {
    const onData = (chunk) => {
      output += String(chunk);
      const m = new RegExp(`http://127\\.0\\.0\\.1:${PORT}/\\?token=(\\S+)`).exec(output);
      if (m !== null) resolveBanner({ token: m[1] });
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => rejectBanner(new Error(`web 进程提前退出（code ${String(code)}）\n${output.slice(-800)}`)));
    setTimeout(() => rejectBanner(new Error(`等待启动横幅超时\n${output.slice(-800)}`)), BOOT_TIMEOUT_MS);
  });
  const { token } = await banner;
  return { child, token };
};

const authenticate = async (port, token) => {
  const response = await fetch(`http://127.0.0.1:${String(port)}/?token=${token}`, { redirect: 'manual' });
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length === 0) throw new Error('token 交换没有拿到 cookie');
  return cookies.map((c) => c.split(';')[0]).join('; ');
};

const failures = [];
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  (error) => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`); },
);

const SMOKE_CWD = join(ROOT, 'dev', 'smoke-workspace');
const { child, token } = await boot();
try {
  const base = `http://127.0.0.1:${String(PORT)}`;
  const cookie = await authenticate(PORT, token);

  // ① roster：四角色都在且零 broken
  const roster = await rpc(base, cookie, 'agentPresets/list', {});
  const presets = roster.presets ?? [];
  for (const role of ROLES) {
    await check(`roster 含 ${role}`, async () => {
      const row = presets.find((p) => p.id === role);
      if (row === undefined) throw new Error(`roster 里没有 ${role}（共 ${presets.length} 条）`);
      if (row.broken !== undefined) throw new Error(`preset 被标 broken：${String(row.broken).slice(0, 160)}`);
    });
  }

  // ② 真入口：逐角色建会话——这一步才触发行 config 校验
  const sessionIds = new Map();
  for (const role of ROLES) {
    await check(`session/create 挂上 ${role}`, async () => {
      const created = await rpc(base, cookie, 'session/create', { request: { cwd: SMOKE_CWD, agentPreset: role } });
      if (created?.agentPreset !== role) throw new Error(`返回的 preset 不是 ${role}：${JSON.stringify(created).slice(0, 200)}`);
      const id = created?.id ?? created?.sessionId;
      if (typeof id !== 'string') throw new Error(`session/create 没返回会话 id：${JSON.stringify(created).slice(0, 200)}`);
      sessionIds.set(role, id);
    });
  }

  // ③ skills 硬隔离：每角色只看见自己的 skills（includeDefaultRoots: false 的真入口断言）
  for (const role of ROLES) {
    await check(`${role} 只看见自己的 skills`, async () => {
      const sessionId = sessionIds.get(role);
      if (sessionId === undefined) throw new Error('没有会话 id（上一步未通过）');
      const value = await rpc(base, cookie, 'skills/list', { request: { sessionId } });
      const actual = (value.skills ?? []).map((s) => s.name).sort();
      const expected = roleSkills(role);
      const extra = actual.filter((n) => !expected.includes(n));
      const missing = expected.filter((n) => !actual.includes(n));
      if (extra.length > 0) throw new Error(`看见了非本角色的 skill：${extra.join(', ')}`);
      if (missing.length > 0) throw new Error(`本角色 skill 缺席：${missing.join(', ')}`);
    });
  }
} finally {
  child.kill('SIGTERM');
  await sleep(300);
}

console.log(failures.length === 0
  ? `\npreset-smoke: ALL PASS（${ROLES.length} 个 preset 全部真挂载绿）`
  : `\npreset-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`);
process.exit(failures.length === 0 ? 0 : 1);
