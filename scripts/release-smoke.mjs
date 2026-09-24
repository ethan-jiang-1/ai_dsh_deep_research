#!/usr/bin/env node
// release-smoke.mjs — L2 安装面冒烟（keyless，起真 DSH 环境、无模型调用）：真实安装形状的完成定义。
// 定义：docs/evaluation.md §L2。程序照搬 ai_dsh_company docs/release.md §发布冒烟（按本仓裁剪）：
//   ① npm pack（npm cache 重定向进仓库 gitignored 区——纪律：工具态不越界）
//   ② 干净 profile（先删后建，从 web 模板）+ .npmrc（pnpm store/cache 钉 repo 内）
//   ③ dsh plugin --profile release-check add file:<tarball>（⚠ --profile 挂在 plugin 子命令上）
//   ④ manifest 断言：bundles reconcile / 安装副本带 presets / peers 在 manifest / 兼容矩阵在场
//   ⑤ boot + preset-smoke 断言（安装域通道：--profile release-check --no-patch）
// peers 装不进 profile 无碍（声明语义；行解析安装锚先于 profile 目录——company release.md
// §依赖姿态，本仓源码基线 = company 工作区即安装锚）。
//
// 前置：DSH_HOME 已设（source dev/env.sh）；DSH_SRC（默认 /Users/bowhead/ai_dsh_company）。
// 用法：source dev/env.sh && node scripts/release-smoke.mjs

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles } from './lib/roles.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const PROFILE = 'release-check';
const PORT = '3100';

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) {
  console.error('release-smoke: 需要 DSH_HOME（先 source dev/env.sh）');
  process.exit(2);
}
const dshSrc = process.env.DSH_SRC ?? '/Users/bowhead/ai_dsh_company';
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) {
  console.error(`release-smoke: 机制基线源码不在位（${bin}）——检查 DSH_SRC`);
  process.exit(2);
}

const tmp = join(ROOT, 'dev', 'smoke-workspace', 'release-pack');
const npmCache = join(ROOT, 'dev', 'smoke-workspace', 'npm-cache');
const pnpmStore = join(ROOT, 'dev', 'smoke-workspace', 'pnpm-store');
const profileDir = join(home, 'profiles', PROFILE);

const failures = [];
const step = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `\n      → ${detail}`}`);
  if (!ok) failures.push(label);
};
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...opts });

// ① npm pack
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
console.log('① npm pack …');
const pack = run('npm', ['pack', '--cache', npmCache, '--pack-destination', tmp], { cwd: PACK });
const tarball = pack.stdout.trim().split('\n').pop();
step(pack.status === 0 && typeof tarball === 'string' && tarball.endsWith('.tgz') && existsSync(join(tmp, tarball)),
  `pack 产出 tarball（${tarball ?? '无'}）`, pack.stderr.slice(-400));

// ② 干净 profile：先删后建（web 模板：自定义 profile 名走默认只有 dsh-base，起不了 web——
//    company release.md 实证；--from-default-profile web 补齐 dsh-web-app）
rmSync(profileDir, { recursive: true, force: true });
console.log('② 建 profile（web 模板）…');
const init = run(process.execPath, ['--import', 'tsx/esm', bin, '--profile', PROFILE, '--from-default-profile', 'web', '--dump-config'],
  { cwd: dshSrc, env: { ...process.env, DSH_HOME: home } });
step(init.status === 0 && existsSync(join(profileDir, 'cordis.yml')), 'profile 初始化（web 模板）', init.stderr.slice(-400));
// .npmrc：pnpm store/cache 钉 repo 内（工具态纪律）
writeFileSync(join(profileDir, '.npmrc'),
  `store-dir=${pnpmStore}\ncache-dir=${npmCache}\n`);

// ③ plugin add
console.log('③ plugin add file:tarball …');
const add = run(process.execPath, ['--import', 'tsx/esm', bin, 'plugin', '--profile', PROFILE, 'add', `file:${join(tmp, tarball)}`],
  { cwd: dshSrc, env: { ...process.env, DSH_HOME: home } });
step(add.status === 0, 'dsh plugin add 安装', (add.stderr || add.stdout).slice(-400));

// ④ manifest 断言
const pkg = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
const installed = join(profileDir, 'node_modules', 'dsh-deep-research-pack');
step(Array.isArray(pkg?.dsh?.profile?.bundles) && pkg.dsh.profile.bundles.includes('dsh-deep-research-pack'),
  'bundles reconcile 进 dsh-deep-research-pack', JSON.stringify(pkg?.dsh?.profile?.bundles));
step(existsSync(join(installed, 'presets')) && existsSync(join(installed, 'cordis.patch.yml')),
  '安装副本带 presets/ + cordis.patch.yml');
for (const role of presetRoles(ROOT)) {
  step(existsSync(join(installed, 'presets', role, 'agent.cordis.yml')), `安装形状含 presets/${role}`);
}
const packPkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
step(Object.keys(packPkg.peerDependencies ?? {}).length > 0, 'peers 在 manifest（声明语义）');
step(Array.isArray(packPkg?.dsh?.compatibility?.dshReleases) && packPkg.dsh.compatibility.dshReleases.includes('dsh-v0.1.5-rc.2'),
  '兼容矩阵钉住当前 tag');

// ⑤ boot + preset-smoke 断言（安装域通道：无 overlay，走已装 pack 的正式路径）
console.log('⑤ preset-smoke（安装域：--profile release-check --no-patch）…');
const smoke = run(process.execPath, [join(ROOT, 'scripts', 'preset-smoke.mjs'), '--profile', PROFILE, '--no-patch', '--port', PORT],
  { env: { ...process.env, DSH_HOME: home, DSH_SMOKE_REAL: '1' } });
console.log(smoke.stdout.split('\n').map((l) => `    ${l}`).join('\n'));
step(smoke.status === 0, 'preset-smoke 安装域全绿', smoke.stdout.split('\n').filter((l) => l.includes('FAIL')).join(' | '));

console.log(failures.length === 0
  ? '\nrelease-smoke: ALL PASS（真实安装形状可用）'
  : `\nrelease-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`);
process.exit(failures.length === 0 ? 0 : 1);
