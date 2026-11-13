// e-workspace.mjs — 域 E · 工作区生成物：手册/模板/种子/overlay 与版本单源。
//
// 从 2026-10-27 卫生轮前的单文件 verify.mjs 原样切出（判据与文案逐字未改）；共享助手住
// ../context.mjs。改本域门禁只需读本文件——域切分 = docs/evaluation.md §L0 表的 A–F 分组。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ROOT, PACK, fail, note, walk } from '../context.mjs';
import { T0_HARD_MAX_CHARS } from '../../lib/content-budget.mjs';

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
    // 常驻面预算（2026-11-11 两级）：12,288 = 失控硬顶（历史值 11,227 + ~9% 余量）；
    // 10,000 = 首刀后的下放触发，由 tests/pack/content-disclosure.spec.mjs 把守。两个数只住
    // scripts/lib/content-budget.mjs。超硬顶先下放/压缩，不直接抬顶（抬顶须同变更登记理由）。
    // 准入规则（2026-11-10，claim-verdict 落地时定）：manual 只收**每个角色不加载任何 skill 也必须
    // 知道**的不变量与索引；**程序住 skill、结构住 template**。撞顶时处置序 = 下放 > 压缩 > 升顶；
    // 实例 = plan.md 的 W 语法搬模板+research-planning skill、claim 细则搬 claim-verdict skill。
    if (manual.length > T0_HARD_MAX_CHARS)
      fail(gate, `content/manual.md ${manual.length} 字符 > ${T0_HARD_MAX_CHARS} 硬顶——模型可见常驻面先下放/压缩，不扩顶`);
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

// ── dist-tarball（发布制品与 tracked 手册/源包同源；tarball gitignored，缺席时明确 note）──
// 依据：2026-11-11 接手诊断——_dist tgz 与 HEAD 源漂移（旧 0.3.0 无 protocol.json）却全绿；
// dist-manual-version 只查手册表头，不查制品本体。存在 _dist/dsh-deep-research-pack-<version>.tgz 时：
//   ① 手册 sha256 = 制品 sha256；② 制品 package.json version = pack version；
//   ③ dsh.bundle.patch 每个目标在包内；④ content/templates/run/ 源文件逐件在包内。
// 缺席（clean clone / 源码 handoff）→ note，不静默；发布前跑 export-dist。
// 反证：临时改手册 sha 行 → 本门禁红；还原 → 绿（一次性红录住 Note）。
{
  const gate = 'dist-tarball';
  const pack = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  const tarball = join(ROOT, '_dist', `dsh-deep-research-pack-${pack.version}.tgz`);
  if (!existsSync(tarball)) {
    note(gate, `_dist/dsh-deep-research-pack-${pack.version}.tgz 缺席（源码 handoff）——制品 sha/内容检查跳过；发布前跑 node scripts/dist/export-dist.mjs`);
  } else {
    const manualPath = join(ROOT, '_dist', '安装手册.md');
    if (!existsSync(manualPath)) {
      fail(gate, '_dist/安装手册.md 缺席——跑 node scripts/dist/export-dist.mjs');
    } else {
      const manual = readFileSync(manualPath, 'utf8');
      const m = manual.match(/\|\s*sha256\s*\|\s*`([0-9a-f]{64})`\s*\|/);
      const actual = createHash('sha256').update(readFileSync(tarball)).digest('hex');
      if (!m) fail(gate, '_dist/安装手册.md 表头缺 sha256 行——手册是生成物，跑 node scripts/dist/export-dist.mjs');
      else if (m[1] !== actual) fail(gate, `_dist/安装手册.md 的 sha256 ${m[1]} ≠ 制品 ${actual}——手册与 tarball 漂移，重导出`);
    }
    const listed = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' });
    if (listed.status !== 0) {
      fail(gate, `_dist/dsh-deep-research-pack-${pack.version}.tgz 不可读（tar exit ${listed.status}）——重导出`);
    } else {
      const entries = new Set((listed.stdout ?? '').split('\n').filter(Boolean));
      const packedPkg = spawnSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' });
      let packedVersion = null;
      try { packedVersion = JSON.parse(packedPkg.stdout ?? '{}').version; } catch { /* 下面统一报红 */ }
      if (packedVersion !== pack.version) {
        fail(gate, `tarball 内 package.json version = ${String(packedVersion)} ≠ pack ${pack.version}——重导出`);
      }
      const targets = (pack.dsh?.bundle?.patch ?? []).map((p) => `package/${String(p).replace(/^\.\//, '')}`);
      const templatesDir = join(PACK, 'content', 'templates', 'run');
      const templates = existsSync(templatesDir)
        ? readdirSync(templatesDir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => `package/content/templates/run/${e.name}`)
        : [];
      if (templates.length === 0) fail(gate, '源 content/templates/run/ 为空——制品内容检查失去语料（防空）');
      const missing = [...targets, ...templates].filter((p) => !entries.has(p));
      if (missing.length > 0) fail(gate, `tarball 缺源包条目：${missing.slice(0, 6).join('、')}${missing.length > 6 ? '…' : ''}——重导出（制品与 HEAD 源漂移）`);
    }
  }
}

// ══ 域 F · 仓规与开发环境（symlink/敏感物/门禁自反/入口链/端口/提交纪律） ══
}
