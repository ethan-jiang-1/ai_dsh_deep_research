#!/usr/bin/env node
// release-smoke.mjs — L2 安装面冒烟（keyless，起真 DSH 环境、无模型调用）：真实安装形状的完成定义。
// 定义：docs/evaluation.md §L2。形态裁剪自 ai_dsh_company docs/release.md §发布冒烟（钉版复核
// 2026-10-09 对照 company@59551f2；对照后五处吸收缺口已补齐 = _backlog/_archived/settled_issues/
// 2026-10-09-release-smoke-hardening.md）：
//   ① npm pack（npm cache 重定向进仓库 gitignored 区——纪律：工具态不越界）
//   ② 干净 profile（先删后建，从 web 模板）+ .npmrc（pnpm store/cache 钉 repo 内）
//   ③ dsh plugin --profile release-check add file:<tarball>（⚠ --profile 挂在 plugin 子命令上）
//   ④ manifest 断言：bundles reconcile / 安装副本带 presets + lib/client.js / peers 在 manifest
//      且 dependencies 缺席（peers-only 发布形状）/ 兼容矩阵含当前 tag
//   ④b 部署链（安装副本 scaffold 铺种子 + preflight 复检）
//   ⑤ preset-smoke 断言（安装域通道：--profile release-check --no-patch，含 boot 页模块表行断言）
//      → 端口释放验证（释放到静默）
// 进程卫生（company tools/drivers/release-process.mjs 的移植收窄）：run() 有界进程组（超时 →
//   SIGTERM → 宽限 → SIGKILL → 确认退出；退出不确认 = fail-loud 保留现场）+ mkdir 原子并发锁
//   （并发实例互撞 profile/tarball/端口）；超时预算 = company 实证值（install 180s / 其余默认
//   120s / preset-smoke 外层 300s 兜底——它内部自持 boot 120s 与端口收割）。
// 与 company 当前版的差异（有意裁剪，勿"补齐"）：
//   - 不显式重建产物：pack 的 prepack 跑 build（company 加 rm lib 防增量陈旧态——我们以
//     prepack 覆盖"构建发生"，rm-lib 防御未取）；
//   - CLI 走 tsx 源码基线（本仓 dsh 命令本身即源码——D10；company 用 built bin）。
// peers 装不进 profile 无碍（声明语义；行解析安装锚先于 profile 目录——company release.md
// §依赖姿态，本仓源码基线 = company 工作区即安装锚）。
//
// 前置：DSH_HOME 已设（source dev/env.sh）；DSH_SRC 默认本仓根（vendor/dsh submodule）。
// 用法：source dev/env.sh && node scripts/smoke/release-smoke.mjs

import { spawn } from 'node:child_process';
import { scrubbedEnv } from '../lib/env.mjs';
import { existsSync, lstatSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles } from '../lib/roles.mjs';
import { reclaimPort } from '../lib/port-reclaim.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const PROFILE = 'release-check';
const PORT = '3100';
// 超时预算（company@59551f2 checks/smoke/release-smoke.mjs 实证值）：install 180s / 默认 120s。
// preset-smoke 内部自带 boot 120s + 会话断言，外层给 300s 兜底——只防挂死，不催正常跑。
const T_INSTALL = 180_000;
const T_DEFAULT = 120_000;
const T_SMOKE = 300_000;

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) {
  console.error('release-smoke: 需要 DSH_HOME（先 source dev/env.sh）');
  process.exit(2);
}
if (home !== join(ROOT, 'runtime', 'harness-home')) {
  console.error(`release-smoke: refusing non-development DSH_HOME: ${home} (source dev/env.sh)`);
  process.exit(2);
}
const dshSrc = process.env.DSH_SRC ?? ROOT; // 本仓根 = 安装锚（vendor/dsh submodule 在 workspace）
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) {
  console.error(`release-smoke: 机制基线源码不在位（${bin}）——检查 DSH_SRC`);
  process.exit(2);
}

const tmp = join(ROOT, 'runtime', 'smoke-workspace', 'release-pack');
const npmCache = join(ROOT, 'runtime', 'smoke-workspace', 'npm-cache');
const pnpmStore = join(ROOT, 'runtime', 'smoke-workspace', 'pnpm-store');
const profileDir = join(home, 'profiles', PROFILE);
const probeWs = join(home, 'smoke-scaffold-probe');
const lockDir = join(ROOT, 'runtime', 'smoke-workspace', 'release-smoke.lock');
const fixedCleanupTargets = new Map([
  ['tmp', tmp],
  ['profile', profileDir],
  ['probe', probeWs],
  ['lock', lockDir],
]);
const assertCleanupTarget = (name, target) => {
  const expected = fixedCleanupTargets.get(name);
  // 清理白名单前缀 = runtime/ 工具态区（2026-10-07 运行态区外移：tmp/npm 缓存迁 runtime/smoke-workspace，
  // home 本体钉在 runtime/harness-home——dev/ 前缀是迁移漏改的断链，实测 L2 通道第一步 clean 即崩）
  if (!expected || resolve(target) !== expected || !expected.startsWith(`${ROOT}/runtime/`)) {
    throw new Error(`release-smoke: refusing to clean unexpected ${name} path: ${target}`);
  }
  for (let current = target; current !== ROOT; current = dirname(current)) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`release-smoke: refusing symlink cleanup path: ${current}`);
    }
  }
};
const clean = (name, target) => {
  assertCleanupTarget(name, target);
  rmSync(target, { recursive: true, force: true });
};

const failures = [];
const step = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `\n      → ${detail}`}`);
  if (!ok) failures.push(label);
};

// ── 有界进程组驱动（company tools/drivers/release-process.mjs 移植收窄：start/result/stop；
//    company 的 waitFor 长命 boot 等待不需要——本脚本无自有 boot，preset-smoke 内部自持）。
//    result 不抛异常（step 判据要 status/stdout/stderr 原值）；超时被杀 = status null + timedOut。──
const activeJobs = new Set();
const startJob = (cmd, args, { timeoutMs = T_DEFAULT, killGraceMs = 1_000, ...opts } = {}) => {
  const child = spawn(cmd, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  let output = '';
  let stdout = '';
  let stderr = '';
  let outcome;
  let timedOut = false;
  let killTimer;
  const signalGroup = (signal) => {
    if (!child.pid) return;
    try { process.kill(-child.pid, signal) } catch (error) { if (error.code !== 'ESRCH') throw error }
  };
  const groupAlive = () => {
    if (!child.pid) return false;
    try { process.kill(-child.pid, 0); return true } catch (error) {
      if (error.code === 'ESRCH') return false;
      throw new Error(`${cmd}: cannot confirm process group ${child.pid} exit (${error.code}); leave runtime files intact`, { cause: error });
    }
  };
  const terminate = () => {
    signalGroup('SIGTERM');
    killTimer ??= setTimeout(() => signalGroup('SIGKILL'), killGraceMs);
  };
  const append = (chunk) => { output = (output + String(chunk)).slice(-64_000) };
  child.stdout.on('data', (chunk) => { stdout = (stdout + String(chunk)).slice(-64_000); append(chunk) });
  child.stderr.on('data', (chunk) => { stderr = (stderr + String(chunk)).slice(-64_000); append(chunk) });
  const done = new Promise((resolveDone) => {
    child.once('error', (error) => { outcome = { error }; resolveDone(outcome) });
    child.once('exit', (code, signal) => { outcome = { code, signal } });
    child.once('close', (code, signal) => { outcome ??= { code, signal }; resolveDone(outcome) });
  });
  const timer = setTimeout(() => { timedOut = true; terminate() }, timeoutMs);
  const job = {
    done,
    async result() {
      const r = await done;
      clearTimeout(timer);
      return { status: r.code ?? null, error: r.error, signal: r.signal, timedOut, stdout, stderr, output };
    },
    async stop() {
      clearTimeout(timer);
      terminate();
      const deadline = Date.now() + killGraceMs + 2_500;
      while (groupAlive() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 40));
      clearTimeout(killTimer);
      if (groupAlive()) throw new Error(`${cmd}: child group ${child.pid} did not stop; leave runtime files intact`);
      await done; // close 事件 = stdio 一并收口（退出确认，孤儿进程 = 脚本缺陷）
      activeJobs.delete(job);
    },
  };
  activeJobs.add(job);
  return job;
};
const run = async (cmd, args, opts = {}) => {
  const job = startJob(cmd, args, opts);
  try { return await job.result() } finally { await job.stop() }
};
const tail = (r, n = 400) => [
  r.timedOut ? '⏱ 超时被杀（预算耗尽）' : '',
  (r.stderr || '').slice(-n),
].filter(Boolean).join('\n');

for (const [name, target] of fixedCleanupTargets) assertCleanupTarget(name, target);

// 并发锁（company 形态：mkdir 原子占位）：两个 release-smoke 并发会互撞 profile/tarball/端口。
// 锁在场 = 另一实例在跑 → exit 2（verdict 契约：未跑 ≠ 通过）。
try {
  mkdirSync(lockDir);
} catch (e) {
  if (e.code === 'EEXIST') {
    console.error(`release-smoke: 已有实例在跑（${lockDir} 在场）——并发互撞 profile/tarball/端口，拒绝启动`);
    process.exit(2);
  }
  throw e;
}

let exitCode = 1;
try {
  // ① npm pack
  clean('tmp', tmp);
  mkdirSync(tmp, { recursive: true });
  console.log('① npm pack …');
  const pack = await run('npm', ['pack', '--cache', npmCache, '--pack-destination', tmp], { cwd: PACK, env: scrubbedEnv(), timeoutMs: T_INSTALL });
  const tarball = (pack.stdout ?? '').trim().split('\n').pop();
  step(pack.status === 0 && typeof tarball === 'string' && tarball.endsWith('.tgz') && existsSync(join(tmp, tarball)),
    `pack 产出 tarball（${tarball ?? '无'}）`, tail(pack));

  // ② 干净 profile：先删后建（web 模板：自定义 profile 名走默认只有 dsh-base，起不了 web——
  //    company release.md 实证；--from-default-profile web 补齐 dsh-web-app）
  clean('profile', profileDir);
  console.log('② 建 profile（web 模板）…');
  const init = await run(process.execPath, ['--import', 'tsx/esm', bin, '--profile', PROFILE, '--from-default-profile', 'web', '--dump-config'],
    { cwd: dshSrc, env: scrubbedEnv({ DSH_HOME: home }) });
  step(init.status === 0 && existsSync(join(profileDir, 'cordis.yml')), 'profile 初始化（web 模板）', tail(init));
  // .npmrc：pnpm store/cache 钉 repo 内（工具态纪律）
  writeFileSync(join(profileDir, '.npmrc'),
    `store-dir=${pnpmStore}\ncache-dir=${npmCache}\n`);

  // ③ plugin add
  console.log('③ plugin add file:tarball …');
  const add = await run(process.execPath, ['--import', 'tsx/esm', bin, 'plugin', '--profile', PROFILE, 'add', `file:${join(tmp, tarball)}`],
    { cwd: dshSrc, env: scrubbedEnv({ DSH_HOME: home }), timeoutMs: T_INSTALL });
  step(add.status === 0, 'dsh plugin add 安装', tail(add));

  // ④ manifest 断言（安装副本 = 真实安装形状的 manifest 事实源——npm pack 原样带入）
  const pkg = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
  const installed = join(profileDir, 'node_modules', 'dsh-deep-research-pack');
  step(Array.isArray(pkg?.dsh?.profile?.bundles) && pkg.dsh.profile.bundles.includes('dsh-deep-research-pack'),
    'bundles reconcile 进 dsh-deep-research-pack', JSON.stringify(pkg?.dsh?.profile?.bundles));
  step(existsSync(join(installed, 'presets')) && existsSync(join(installed, 'cordis.patch.yml')),
    '安装副本带 presets/ + cordis.patch.yml');
  for (const role of presetRoles(ROOT)) {
    step(existsSync(join(installed, 'presets', `${role}.patch.yml`)), `安装形状含 presets/${role}.patch.yml`);
  }
  const installedManifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
  // client 半在场（company postmortem 0002 层）：pack 带观察面 client 半（exports ./client →
  // lib/client.js），安装副本缺它 = 装配坏了整 UI 砖。声明面（exports ⟺ dsh.client）由 L0
  // 门禁 client-half 守，此处守真实安装形状。
  step(existsSync(join(installed, 'lib', 'client.js')), '安装副本带 client 产物（lib/client.js）');
  // peers-only 发布形状：dependencies 一旦回潮，安装锚会拖进嵌套依赖闭包（company 同款断言）
  step(Object.keys(installedManifest.peerDependencies ?? {}).length > 0 && installedManifest.dependencies === undefined,
    'manifest peers-only（peers 在场、dependencies 缺席）',
    installedManifest.dependencies ? `dependencies=${Object.keys(installedManifest.dependencies).join(',')}` : undefined);
  step(Array.isArray(installedManifest?.dsh?.compatibility?.dshReleases) && installedManifest.dsh.compatibility.dshReleases.includes('dsh-v0.2.0-rc.2'),
    '兼容矩阵钉住当前 tag');

  // ④b 安装形状证据（pack 自带 bin：真铺一个工作区 → 安装验收 preflight 验它）
  console.log('④b 部署链（安装副本：scaffold 铺种子 + preflight 复检）…');
  clean('probe', probeWs);
  const scaffoldDry = await run(process.execPath, [join(installed, 'scripts', 'scaffold.mjs'), '--install-only', '--workspace', probeWs, '--profile', PROFILE, '--host', profileDir, '--dry-run'],
    { env: scrubbedEnv({ DSH_HOME: home }) });
  step(scaffoldDry.status === 0 && scaffoldDry.stdout.includes('dry-run') && !existsSync(probeWs),
    'scaffold --dry-run 可预演且未落盘', scaffoldDry.stdout.split('\n').filter((l) => l.includes('✗')).join(' | '));
  const scaffoldReal = await run(process.execPath, [join(installed, 'scripts', 'scaffold.mjs'), '--install-only', '--workspace', probeWs, '--profile', PROFILE, '--host', profileDir],
    { env: scrubbedEnv({ DSH_HOME: home }) });
  console.log((scaffoldReal.stdout ?? '').split('\n').map((l) => `    ${l}`).join('\n'));
  const seedTemplates = existsSync(join(probeWs, 'templates', 'run')) ? readdirSync(join(probeWs, 'templates', 'run')).filter((f) => f.endsWith('.md')).length : 0;
  step(scaffoldReal.status === 0 && existsSync(join(probeWs, 'AGENTS.md')) && seedTemplates >= 6,
    'scaffold 真铺种子（手册 + ≥6 模板）', `AGENTS.md=${existsSync(join(probeWs, 'AGENTS.md'))} 模板=${seedTemplates}`);
  const credentialHome = join(tmp, 'credential-home');
  mkdirSync(credentialHome);
  const preflight = await run(process.execPath, [join(installed, 'scripts', 'preflight.mjs'), '--install-only', '--workspace', probeWs, '--host', profileDir],
    { env: scrubbedEnv({ DSH_HOME: credentialHome }) });
  step(preflight.status === 0 && preflight.stdout.includes('安装验收通过（不代表研究就绪）'), 'preflight 安装验收通过（无凭据）',
    preflight.stdout.split('\n').filter((l) => l.includes('✗')).join(' | '));
  const readiness = await run(process.execPath, [join(installed, 'scripts', 'preflight.mjs'), '--workspace', probeWs, '--host', profileDir],
    { env: scrubbedEnv({ DSH_HOME: credentialHome }) });
  const rejected = (readiness.stdout ?? '').split('\n').filter((l) => l.includes('✗'));
  step(readiness.status === 1 && rejected.length === 1 && rejected[0].includes('模型密钥 DEEPSEEK_API_KEY'),
    '默认 preflight 拒绝缺凭据（保留安装宿主解析锚）', `${readiness.stdout}\n${readiness.stderr}`);
  clean('probe', probeWs);

  // ⑤ boot + preset-smoke 断言（安装域通道：无 overlay，走已装 pack 的正式路径）
  console.log('⑤ preset-smoke（安装域：--profile release-check --no-patch）…');
  // 路径随 762eb6c 目录治理迁 scripts/smoke/——旧平铺路径是迁移漏网（与守卫前缀同族：L2 未跑掩护）
  const smoke = await run(process.execPath, [join(ROOT, 'scripts', 'smoke', 'preset-smoke.mjs'), '--profile', PROFILE, '--no-patch', '--port', PORT],
    { env: scrubbedEnv({ DSH_HOME: home, DSH_SMOKE_REAL: '1' }), timeoutMs: T_SMOKE });
  console.log((smoke.stdout ?? '').split('\n').map((l) => `    ${l}`).join('\n'));
  step(smoke.status === 0, 'preset-smoke 安装域全绿',
    [ ...(smoke.stdout || '').split('\n').filter((l) => l.includes('FAIL')),
      ...(smoke.timedOut ? ['⏱ preset-smoke 外层预算耗尽被杀（T_SMOKE）'] : []),
      ...(smoke.status !== 0 && !(smoke.stdout || '').trim() ? [`stderr: ${(smoke.stderr || '').slice(-400)}`] : []) ].join(' | '));
  // 释放到静默（scripts/AGENTS.md）：preset-smoke 正常路径自收割；若它被外层超时击杀（finally
  // 不及跑），web 孙进程（独立进程组）会漏占端口——按端口收割兜底并验证释放。
  const leak = await reclaimPort(Number(PORT));
  step(leak === null, '端口释放验证（3100 用后无监听残留）', leak ?? undefined);

  exitCode = failures.length === 0 ? 0 : 1;
  console.log(failures.length === 0
    ? '\nrelease-smoke: ALL PASS（真实安装形状可用）'
    : `\nrelease-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`);
} finally {
  // 进程卫生收尾：所有 job 确认退出后才释放锁（退出不确认 = fail-loud 保留现场，含锁——
  // 下次跑会看到锁在场并拿到退出不确认的线索，而非静默以为干净）
  const stopResults = await Promise.allSettled([...activeJobs].map((job) => job.stop()));
  const stuck = stopResults.filter((r) => r.status === 'rejected').map((r) => String(r.reason?.message ?? r.reason));
  if (stuck.length > 0) {
    console.error(`release-smoke: 子进程退出不确认——保留现场（锁与 runtime/ 不清理）：${stuck.join(' | ')}`);
    exitCode = 1;
  } else {
    clean('lock', lockDir);
  }
}
process.exitCode = exitCode;
