#!/usr/bin/env node
// preset-smoke.mjs — L1 真挂载冒烟。
// keyless 预检档（默认）：环境/安装形状断言，不发任何请求。
// 真会话档（DSH_SMOKE_REAL=1）：boot 真 web（钉 tag 源码基线 + 源码域 overlay），
//   boot 页模块表行断言 → roster 断言 → 逐角色 session/create 真挂载 → skills 硬隔离断言。
//   全程 keyless（组合与冷读，无模型调用）——session/create 才会触发行 config 校验，roster/dump
//   看不见（company postmortem 0001：挂载失败只有真会话抓得到，UI 还吞错）。
//   模块表行断言（company postmortem 0002 guardrail 的移植）：fetch boot 页断言本包 client 行
//   在场（served）——行没编进模块表 = client 半静默不存在。served ≠ loadable，真装载归
//   client-load-smoke（源码域真浏览器）；安装域经 release-smoke ⑤ 委托本脚本覆盖。
//
// 前置：DSH_HOME 已设（source dev/env.sh）；DSH_SRC 默认本仓根（vendor/dsh submodule）。
//   钉 tag 源码基线 + tsx 解析树——机制权威）。
// 用法：source dev/env.sh && DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs [--port 3099]

import { withModelKey } from '../lib/env.mjs';
import { authenticate, bootWeb, makeRpc } from '../lib/web-harness.mjs';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles } from '../lib/roles.mjs';
import { reclaimPort } from '../lib/port-reclaim.mjs';
import { assertVendorArtifacts, ARTIFACT_REMEDY } from '../lib/vendor-artifacts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
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
// 请求预算（company@59551f2 release-smoke 实证值）：RPC/boot 页 fetch 挂死不拖垮整个冒烟。
// 值级不可证（构造"接受连接但不响应"的服务才能触发 AbortSignal——证的是 Node 语义非本仓逻辑），
// 申报见 notes/implemented/2026-10-09-release-smoke-hardening.md 件④。
const REQUEST_TIMEOUT_MS = 15_000;

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
// 前置缺席 = 未跑（verdict 契约 exit 2），不是断言红——旧版先跑完 keyless 预检再 exit 1，
// 把"没 source"读成"L1 失败"（2026-10-20 审计 P1-5）。
if (!home) {
  console.error('preset-smoke: 需要 DSH_HOME（先 source dev/env.sh）——按 verdict 契约 exit 2（未跑，不是断言红）');
  process.exit(2);
}

const dshSrc = process.env.DSH_SRC ?? ROOT; // 本仓根 = 安装锚（vendor/dsh submodule 在 workspace）
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');

if (process.env.DSH_SMOKE_REAL !== '1') {
  console.log(failed ? '\npreset-smoke: 预检未全绿（见上）' : '\npreset-smoke: 预检绿（真挂载档：DSH_SMOKE_REAL=1）');
  process.exit(failed ? 1 : 0);
}

// boot 前自检（RFC vendor-build-guard）：0.1.7 起启动依赖构建产物，缺失时报错隐晦——
// 提前拦成一行 remedy。exit 2 = 环境前置缺失（与"未 source env"同档）。
{
  const va = assertVendorArtifacts(dshSrc);
  if (!va.ok) {
    console.error(`boot 前自检红：vendor 构建产物缺失（${va.missing.join('、')}）`);
    console.error(ARTIFACT_REMEDY);
    process.exit(2);
  }
}
// ══ 真会话档 ══
if (failed) {
  console.error('preset-smoke: 预检未过，真会话档不启动');
  process.exit(1);
}
step(existsSync(bin), `env: 机制基线源码在位（${bin}）`, '检查 DSH_SRC / vendor/dsh submodule（基线 = 本仓 vendor 钉 tag）');

const roleSkills = (role) => readdirSync(join(PRESETS, role, 'skills'), { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name).sort();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// RPC 正本 = lib/web-harness.makeRpc（原值逐字参数化：前缀 `smoke-`、AbortSignal 预算 15s、
// 失败文案与 200 字符截断）
const rpc = makeRpc({
  prefix: 'smoke-',
  timeoutMs: REQUEST_TIMEOUT_MS,
  errorOf: (endpoint, body) => `${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`,
});

// 端口自持有纪律（scripts/AGENTS.md「用完释放」）的执行器住 scripts/lib/port-reclaim.mjs
// （实测依据与收割策略的正本在该文件头注；本脚本消费它做 boot 失败兜底与收尾双保险）。

// boot 正本 = lib/web-harness.bootWeb（端口、boot 环境、超时、失败尾部字符都留本站点）；
// **失败收割留本站点**（组杀 + 端口回收——各站点判据不同，不进共享件）。
const boot = async () => {
  let child = null;
  try {
    const booted = await bootWeb({
      bin, cwd: dshSrc, profile: PROFILE, patchPath: NO_PATCH ? null : OVERLAY, port: PORT,
      env: withModelKey({ DSH_HOME: home }), timeoutMs: BOOT_TIMEOUT_MS, tailChars: 800,
    });
    child = booted.child;
    return { child: booted.child, token: booted.token };
  } catch (e) {
    // 启动失败（横幅超时 / web 早退）也不能留活口——原版直接 throw，child 成孤儿
    if (child !== null) {
      try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
    }
    const leak = await reclaimPort(PORT);
    if (leak !== null) console.error(`[preset-smoke] ${leak}`);
    throw e;
  }
};

const failures = [];
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  (error) => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`); },
);

const SMOKE_CWD = join(ROOT, 'runtime', 'smoke-workspace');
const { child, token } = await boot();
try {
  const base = `http://127.0.0.1:${String(PORT)}`;
  const cookie = await authenticate(base, token);

  // ⓪ boot 页模块表行断言（company postmortem 0002 guardrail 的移植，形态 B——用户
  //    2026-10-09 拍板）：浏览器模块表 = boot 页内嵌的 dsh.client 行表；本包行缺席 =
  //    client 半静默不存在（宿主侧 roster 照常绿——"host healthy, UI empty"）。行在场
  //    证明 served；真装载（loadable）归 client-load-smoke 真浏览器断言。
  //    用 check()（进 failures）而非 step()——真会话档退出码只认 failures。
  await check('boot 页模块表含本包 client 行（served）', async () => {
    const bootPage = await fetch(base, { headers: { cookie }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!bootPage.ok) throw new Error(`boot 页 HTTP ${bootPage.status}`);
    const bootHtml = await bootPage.text();
    if (!(bootHtml.includes('dsh-deep-research-pack/client.js') || bootHtml.includes('"dsh-deep-research-pack"')))
      throw new Error('模块表未枚举本包 client 半（served 缺席——host healthy, UI empty 的装配面形态）');
  });

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
  // 双保险：先按进程拓扑杀（组杀），再按**端口**收割并验证——后者才是本修复的判据
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  await sleep(300);
  try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
  const leak = await reclaimPort(PORT);
  if (leak !== null) { failures.push(leak); console.log(`  FAIL ${leak}`); }
}

console.log(failures.length === 0
  ? `\npreset-smoke: ALL PASS（${ROLES.length} 个 preset 全部真挂载绿）`
  : `\npreset-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`);
process.exit(failures.length === 0 ? 0 : 1);
