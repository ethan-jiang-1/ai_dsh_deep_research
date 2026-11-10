// e-workspace.mjs — 域 E · 工作区生成物：手册/模板/种子/overlay 与版本单源。
//
// 从 2026-10-27 卫生轮前的单文件 verify.mjs 原样切出（判据与文案逐字未改）；共享助手住
// ../context.mjs。改本域门禁只需读本文件——域切分 = docs/evaluation.md §L0 表的 A–F 分组。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PACK, fail, note, walk } from '../context.mjs';

export function runE() {
// ── content-shape（D40：研究内容在包内，不在工作区）──
// 手册 = content/manual.md（src/content 以 runtime context 注入）；模板 = content/templates/run/ 八件；
// 包内不再有 workspace/ 种子、seed.json 或 scaffold；files 白名单必须含 content/**。
{
  const gate = 'content-shape';
  const manualPath = join(PACK, 'content', 'manual.md');
  if (!existsSync(manualPath)) fail(gate, 'packages/deep-research-pack/content/manual.md 缺席——研究手册必须随包');
  else {
    const manual = readFileSync(manualPath, 'utf8');
    if (manual.trim() === '') fail(gate, 'content/manual.md 为空');
    // 常驻面预算（2026-11-10 接手卫生）：manual 由 content 行注入每个 agent；旧 handbook-budget
    // 随 workspace 种子退役后没有替代守卫。上限 = 当前 11,227 字符 + ~9% 余量；超限先下放/压缩，
    // 不直接抬顶（抬顶须同变更登记理由）。
    const MANUAL_MAX_CHARS = 12_288;
    if (manual.length > MANUAL_MAX_CHARS)
      fail(gate, `content/manual.md ${manual.length} 字符 > ${MANUAL_MAX_CHARS} 预算——模型可见常驻面先下放/压缩，不扩顶`);
    const vars = [...manual.matchAll(/{{([^}]+)}}/g)].map((m) => m[1]);
    const unexpected = vars.filter((v) => v !== 'research_pack_root');
    if (unexpected.length > 0) fail(gate, `content/manual.md 出现未注册插值 {{${unexpected[0]}}}——只有 research_pack_root 由 src/content 注册`);
  }
  for (const t of ['run.md', 'question.md', 'topics.md', 'plan.md', 'leads.md', 'evidence-entry.md', 'findings.md', 'final.md']) {
    if (!existsSync(join(PACK, 'content', 'templates', 'run', t))) fail(gate, `content/templates/run/ 缺模板 ${t}`);
  }
  if (existsSync(join(PACK, 'workspace'))) fail(gate, 'packages/deep-research-pack/workspace/ 在场——D40 后内容只在 content/，不再有工作区种子');
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  if ((pkg.files ?? []).some((f) => f.startsWith('workspace/'))) fail(gate, 'package.json files 仍含 workspace/**——种子已退役');
  if (!(pkg.files ?? []).some((f) => f.startsWith('content/'))) fail(gate, 'package.json files 缺 content/**——手册/模板不会随包发布');
}

// ── dev-runtime-clean（dev/ 只住源码驱动；运行态必须住 runtime/ 或研究工作区）──
// 为什么：dev/ 是源码驱动目录，运行态住 runtime/（harness-home / smoke-workspace）或研究工作区。
// 2026-10-25 数据边界审计实测 dev/harness-home/ 里躺着 run bundle；.gitignore 能挡 git，挡不住
// cp -r/打包目录。本门禁把“dev/ 无运行态”变成机械事实（不扫 tracked，直接看盘）。
{
  const gate = 'dev-runtime-clean';
  const dev = join(ROOT, 'dev');
  const forbidden = [];
  const walk = (dir, rel = '') => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      const p = join(dir, ent.name);
      const r = rel === '' ? ent.name : `${rel}/${ent.name}`;
      if (ent.isDirectory()) {
        if (ent.name === 'harness-home' || ent.name === 'sessions' || /^drt_/.test(ent.name)) forbidden.push(`dev/${r}`);
        walk(p, r);
      } else if (ent.name === '.credentials' + '.yaml') forbidden.push(`dev/${r}`);
    }
  };
  if (!existsSync(dev)) fail(gate, 'dev/ 缺席——源码驱动目录不在位');
  else walk(dev);
  if (forbidden.length > 0)
    fail(gate, `dev/ 下出现运行态：${forbidden.slice(0, 5).join('、')}${forbidden.length > 5 ? '…' : ''}——运行态住 runtime/ 或研究工作区（迁移/清理后再提交；见 guides/63）`);
  else note(gate, 'dev/ 无运行态（harness-home / drt_* / sessions / 凭据）');
}

// ── overlay-fresh（源码域 overlay 是**生成物**——由 dev/render-overlay.mjs 从 pack
//    渲染；改 pack 后不重渲染即红。0.1.7 preset 重设计后 overlay 必须携带 preset 行，两处手写
//    必然漂移，故改成生成 + 新鲜度门禁（vendor 的"生成 + freshness"形态；本仓首个 tracked
//    生成物，登记在 discipline-map 源 7）。）──
{
  const gate = 'overlay-fresh';
  const r = spawnSync(process.execPath, ['dev/render-overlay.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    const first = `${r.stderr ?? ''}${r.stdout ?? ''}`.trim().split('\n').filter(Boolean)[0];
    fail(gate, first ?? 'dev/research.overlay.yml 与 pack 渲染结果不一致——跑 `node dev/render-overlay.mjs` 重生成');
  }
}

// ── release-version（发布版本单一源：root 镜像 pack；tag 一致性由 release-check 在发布前查）──
// 病根：仓库出现过 root 0.1.0 / pack 0.1.1 / tag 0.1.2 三套版本，发布时无法判断 tag 该对谁。
// 规则正本 = docs/guides/64-release-versioning.md：发布版本 = pack version；root 必须镜像；
// tag = 同版本 annotated。CI 不假定 tag 在场，故 tag 检查归 scripts/dist/release-check.mjs。
{
  const gate = 'release-version';
  const readVersion = (rel) => {
    try { return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')).version; }
    catch (e) { fail(gate, `${rel} 不可读/不是合法 JSON（${e.code || e.message}）——发布版本源不可判`); return null; }
  };
  const rootVersion = readVersion('package.json');
  const packVersion = readVersion('packages/deep-research-pack/package.json');
  const semver = /^\d+\.\d+\.\d+$/;
  for (const [label, version] of [['root package.json', rootVersion], ['pack package.json', packVersion]]) {
    if (version !== null && (typeof version !== 'string' || !semver.test(version))) {
      fail(gate, `${label} version = ${JSON.stringify(version)}——必须是三段 semver（X.Y.Z）`);
    }
  }
  if (rootVersion !== null && packVersion !== null && rootVersion !== packVersion) {
    fail(gate, `版本漂移：root ${rootVersion} ≠ pack ${packVersion}——发布版本以 pack 为准，root 必须镜像（规则 = docs/guides/64-release-versioning.md）`);
  }
}

// ── dist-manual-version（dist 导出合同——精神移植 ai_dsh_architect docs/distribution.md：
//    _dist/安装手册.md 是 tracked 生成物（生成器 = scripts/dist/export-dist.mjs），表头版本必须等于
//    pack 的 package.json 版本，且指名同目录 tarball 的文件名——版本动而手册不重导出即红，
//    迫使版本 bump 与重导出同 diff。导出目的地 = _dist/（tarball gitignored）。）──
{
  const gate = 'dist-manual-version';
  const manualPath = join(ROOT, '_dist', '安装手册.md');
  if (!existsSync(manualPath)) {
    fail(gate, '_dist/安装手册.md 缺席——tracked 生成物必须在库（跑 `node scripts/dist/export-dist.mjs` 导出）');
  } else {
    const manual = readFileSync(manualPath, 'utf8');
    const packVersion = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')).version;
    const head = manual.split('\n').slice(0, 10).join('\n');
    const m = head.match(/\|\s*版本\s*\|\s*(\S+)\s*\|/);
    if (!m) {
      fail(gate, '_dist/安装手册.md: 表头 10 行内无「| 版本 | … |」行——手册是 scripts/dist/export-dist.mjs 的生成物，勿手写；跑 `node scripts/dist/export-dist.mjs` 重生成');
    } else if (m[1] !== packVersion) {
      fail(gate, `_dist/安装手册.md: 表头版本 ${m[1]} ≠ pack package.json 的 ${packVersion}——版本 bump 必须同 diff 重导出（跑 \`node scripts/dist/export-dist.mjs\` 后提交）`);
    }
    const t = head.match(/\|\s*安装包\s*\|\s*`([^`]+)`/);
    if (!t || t[1] !== `dsh-deep-research-pack-${packVersion}.tgz`) {
      fail(gate, `_dist/安装手册.md: 表头未指名当前 tarball dsh-deep-research-pack-${packVersion}.tgz——手册与旁边的产物漂移，重导出`);
    }
  }
}

// ══ 域 F · 仓规与开发环境（symlink/敏感物/门禁自反/入口链/端口/提交纪律） ══
}
