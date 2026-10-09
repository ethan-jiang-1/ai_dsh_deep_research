#!/usr/bin/env node
// release-smoke.mjs — L2 安装面冒烟（keyless，起真 DSH 环境、无模型调用）：真实安装形状的完成定义。
// 定义：docs/evaluation.md §L2。裁剪自 ai_dsh_company docs/release.md §发布冒烟（钉版复核 2026-10-09
// 对照 company@59551f2 修订本头注；差异 = 有意裁剪，逐条如下）：
//   ① npm pack（npm cache 重定向进仓库 gitignored 区——纪律：工具态不越界）
//   ② 干净 profile（先删后建，从 web 模板）+ .npmrc（pnpm store/cache 钉 repo 内）
//   ③ dsh plugin --profile release-check add file:<tarball>（⚠ --profile 挂在 plugin 子命令上）
//   ④ manifest 断言：bundles reconcile / 安装副本带 presets / peers 在 manifest / 兼容矩阵含当前 tag
//   ⑤ boot + preset-smoke 断言（安装域通道：--profile release-check --no-patch）
// 与 company 当前版的差异（复核登记，待吸收项见钉版复核 Note）：
//   - 不显式重建产物：pack 的 prepack 跑 build（company 加 rm lib 防增量陈旧态——我们以
//     prepack 覆盖"构建发生"，rm-lib 防御未取）；
//   - CLI 走 tsx 源码基线（本仓 dsh 命令本身即源码——D10 销账；company 用 built bin）；
//   - 未断言安装副本 lib/client.js 在场与 dependencies 缺席（company 有，吸收候选）；
//   - 无安装域浏览器模块表断言（client 半在安装域的装配无人验——吸收候选）；
//   - run() 无超时/并发锁/进程组回收（company 有完整进程卫生——吸收候选）。
// peers 装不进 profile 无碍（声明语义；行解析安装锚先于 profile 目录——company release.md
// §依赖姿态，本仓源码基线 = company 工作区即安装锚）。
//
// 前置：DSH_HOME 已设（source dev/env.sh）；DSH_SRC 默认本仓根（vendor/dsh submodule）。
// 用法：source dev/env.sh && node scripts/smoke/release-smoke.mjs

import { spawnSync } from 'node:child_process';
import { scrubbedEnv } from '../lib/env.mjs';
import { existsSync, lstatSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles } from '../lib/roles.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const PROFILE = 'release-check';
const PORT = '3100';

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) {
  console.error('release-smoke: 需要 DSH_HOME（先 source dev/env.sh）');
  process.exit(2);
}
if (home !== join(ROOT, 'runtime', 'harness-home')) {
  console.error(`release-smoke: refusing non-development DSH_HOME: ${home} (source dev/env.sh)`);
  process.exit(2);
}
const dshSrc = process.env.DSH_SRC ?? ROOT; // 本仓根 = 安装锚（vendor/dsh submodule 在 workspace；原默认 company 借用已随 D10 销账）
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
const fixedCleanupTargets = new Map([
  ['tmp', tmp],
  ['profile', profileDir],
  ['probe', probeWs],
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
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...opts });
for (const [name, target] of fixedCleanupTargets) assertCleanupTarget(name, target);

// ① npm pack
clean('tmp', tmp);
mkdirSync(tmp, { recursive: true });
console.log('① npm pack …');
const pack = run('npm', ['pack', '--cache', npmCache, '--pack-destination', tmp], { cwd: PACK, env: scrubbedEnv() });
const tarball = pack.stdout.trim().split('\n').pop();
step(pack.status === 0 && typeof tarball === 'string' && tarball.endsWith('.tgz') && existsSync(join(tmp, tarball)),
  `pack 产出 tarball（${tarball ?? '无'}）`, pack.stderr.slice(-400));

// ② 干净 profile：先删后建（web 模板：自定义 profile 名走默认只有 dsh-base，起不了 web——
//    company release.md 实证；--from-default-profile web 补齐 dsh-web-app）
clean('profile', profileDir);
console.log('② 建 profile（web 模板）…');
const init = run(process.execPath, ['--import', 'tsx/esm', bin, '--profile', PROFILE, '--from-default-profile', 'web', '--dump-config'],
  { cwd: dshSrc, env: scrubbedEnv({ DSH_HOME: home }) });
step(init.status === 0 && existsSync(join(profileDir, 'cordis.yml')), 'profile 初始化（web 模板）', init.stderr.slice(-400));
// .npmrc：pnpm store/cache 钉 repo 内（工具态纪律）
writeFileSync(join(profileDir, '.npmrc'),
  `store-dir=${pnpmStore}\ncache-dir=${npmCache}\n`);

// ③ plugin add
console.log('③ plugin add file:tarball …');
const add = run(process.execPath, ['--import', 'tsx/esm', bin, 'plugin', '--profile', PROFILE, 'add', `file:${join(tmp, tarball)}`],
  { cwd: dshSrc, env: scrubbedEnv({ DSH_HOME: home }) });
step(add.status === 0, 'dsh plugin add 安装', (add.stderr || add.stdout).slice(-400));

// ④ manifest 断言
const pkg = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
const installed = join(profileDir, 'node_modules', 'dsh-deep-research-pack');
step(Array.isArray(pkg?.dsh?.profile?.bundles) && pkg.dsh.profile.bundles.includes('dsh-deep-research-pack'),
  'bundles reconcile 进 dsh-deep-research-pack', JSON.stringify(pkg?.dsh?.profile?.bundles));
step(existsSync(join(installed, 'presets')) && existsSync(join(installed, 'cordis.patch.yml')),
  '安装副本带 presets/ + cordis.patch.yml');
for (const role of presetRoles(ROOT)) {
  step(existsSync(join(installed, 'presets', `${role}.patch.yml`)), `安装形状含 presets/${role}.patch.yml`);
}
const packPkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
step(Object.keys(packPkg.peerDependencies ?? {}).length > 0, 'peers 在 manifest（声明语义）');
step(Array.isArray(packPkg?.dsh?.compatibility?.dshReleases) && packPkg.dsh.compatibility.dshReleases.includes('dsh-v0.2.0-rc.2'),
  '兼容矩阵钉住当前 tag');

// ④b 安装形状证据（pack 自带 bin：真铺一个工作区 → 安装验收 preflight 验它）
console.log('④b 部署链（安装副本：scaffold 铺种子 + preflight 复检）…');
clean('probe', probeWs);
const scaffoldDry = run(process.execPath, [join(installed, 'scripts', 'scaffold.mjs'), '--install-only', '--workspace', probeWs, '--profile', PROFILE, '--host', profileDir, '--dry-run'],
  { env: scrubbedEnv({ DSH_HOME: home }) });
step(scaffoldDry.status === 0 && scaffoldDry.stdout.includes('dry-run') && !existsSync(probeWs),
  'scaffold --dry-run 可预演且未落盘', scaffoldDry.stdout.split('\n').filter((l) => l.includes('✗')).join(' | '));
const scaffoldReal = run(process.execPath, [join(installed, 'scripts', 'scaffold.mjs'), '--install-only', '--workspace', probeWs, '--profile', PROFILE, '--host', profileDir],
  { env: scrubbedEnv({ DSH_HOME: home }) });
console.log(scaffoldReal.stdout.split('\n').map((l) => `    ${l}`).join('\n'));
const seedTemplates = existsSync(join(probeWs, 'templates', 'run')) ? readdirSync(join(probeWs, 'templates', 'run')).filter((f) => f.endsWith('.md')).length : 0;
step(scaffoldReal.status === 0 && existsSync(join(probeWs, 'AGENTS.md')) && seedTemplates >= 6,
  'scaffold 真铺种子（手册 + ≥6 模板）', `AGENTS.md=${existsSync(join(probeWs, 'AGENTS.md'))} 模板=${seedTemplates}`);
const credentialHome = join(tmp, 'credential-home');
mkdirSync(credentialHome);
const preflight = run(process.execPath, [join(installed, 'scripts', 'preflight.mjs'), '--install-only', '--workspace', probeWs, '--host', profileDir],
  { env: scrubbedEnv({ DSH_HOME: credentialHome }) });
step(preflight.status === 0 && preflight.stdout.includes('安装验收通过（不代表研究就绪）'), 'preflight 安装验收通过（无凭据）',
  preflight.stdout.split('\n').filter((l) => l.includes('✗')).join(' | '));
const readiness = run(process.execPath, [join(installed, 'scripts', 'preflight.mjs'), '--workspace', probeWs, '--host', profileDir],
  { env: scrubbedEnv({ DSH_HOME: credentialHome }) });
const rejected = readiness.stdout.split('\n').filter((l) => l.includes('✗'));
step(readiness.status === 1 && rejected.length === 1 && rejected[0].includes('模型密钥 DEEPSEEK_API_KEY'),
  '默认 preflight 拒绝缺凭据（保留安装宿主解析锚）', `${readiness.stdout}\n${readiness.stderr}`);
clean('probe', probeWs);

// ⑤ boot + preset-smoke 断言（安装域通道：无 overlay，走已装 pack 的正式路径）
console.log('⑤ preset-smoke（安装域：--profile release-check --no-patch）…');
// 路径随 762eb6c 目录治理迁 scripts/smoke/——旧平铺路径是迁移漏网（与守卫前缀同族：L2 未跑掩护）
const smoke = run(process.execPath, [join(ROOT, 'scripts', 'smoke', 'preset-smoke.mjs'), '--profile', PROFILE, '--no-patch', '--port', PORT],
  { env: scrubbedEnv({ DSH_HOME: home, DSH_SMOKE_REAL: '1' }) });
console.log(smoke.stdout.split('\n').map((l) => `    ${l}`).join('\n'));
step(smoke.status === 0, 'preset-smoke 安装域全绿',
  [ ...(smoke.stdout || '').split('\n').filter((l) => l.includes('FAIL')),
    ...(smoke.status !== 0 && !(smoke.stdout || '').trim() ? [`stderr: ${(smoke.stderr || '').slice(-400)}`] : []) ].join(' | '));

console.log(failures.length === 0
  ? '\nrelease-smoke: ALL PASS（真实安装形状可用）'
  : `\nrelease-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`);
process.exit(failures.length === 0 ? 0 : 1);
