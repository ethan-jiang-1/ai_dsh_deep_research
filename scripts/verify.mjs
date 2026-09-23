#!/usr/bin/env node
// verify.mjs — L0 结构门禁（keyless，零依赖）。
// 门禁清单与判据定义：docs/evaluation.md §L0；每条门禁的反证记录：notes/implemented/。
// 移植自 ai_dsh_company/scripts/verify.mjs（按当前规模裁剪；vendor-pin/client-half/proposal
// 全量版随对应能力落地启用，见根 roadmap.md）。

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, lstatSync, readlinkSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const PRESETS = join(PACK, 'presets');

const failures = [];
const notes = [];
const fail = (gate, msg) => failures.push(`[${gate}] ${msg}`);
const note = (gate, msg) => notes.push(`[${gate}] ${msg}`);

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === '.DS_Store') continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const allFiles = walk(ROOT);
const mdFiles = allFiles.filter((f) => f.endsWith('.md'));

// ── 门禁 1：md-utf8 / newline（全仓 .md 严格 UTF-8、恰一个结尾换行）──
{
  const gate = 'md-utf8-newline';
  for (const f of mdFiles) {
    const raw = readFileSync(f);
    const text = raw.toString('utf8');
    if (raw.includes(Buffer.from([0xef, 0xbf, 0xbd]))) {
      // 逐字节比对：decode 后再 encode 不一致 = 有非法字节
      if (Buffer.from(text, 'utf8').equals(raw) === false) fail(gate, `${relative(ROOT, f)} 含非 UTF-8 字节`);
    }
    if (!text.endsWith('\n')) fail(gate, `${relative(ROOT, f)} 缺结尾换行`);
    else if (text.endsWith('\n\n')) fail(gate, `${relative(ROOT, f)} 结尾多于一个换行`);
  }
}

// ── 门禁 2：md-links（docs/notes/研究工作区/包文档/根 README/AGENTS 的相对链接必须可解析）──
{
  const gate = 'md-links';
  const scopes = ['docs', 'notes', 'research-workspace', 'packages', 'roadmap.md', 'README.md', 'AGENTS.md']
    .map((s) => join(ROOT, s))
    .filter((p) => existsSync(p));
  const inScope = (f) => scopes.some((s) => f === s || f.startsWith(s + '/'));
  for (const f of mdFiles.filter(inScope)) {
    const text = readFileSync(f, 'utf8');
    const lines = text.split('\n');
    let inFence = false;
    for (const line of lines) {
      if (line.trimStart().startsWith('```')) inFence = !inFence;
      if (inFence) continue;
      for (const m of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
        const target = m[1].split('#')[0];
        if (!target || /^[a-z]+:\/\//i.test(target) || target.startsWith('mailto:')) continue;
        const abs = resolve(dirname(f), target);
        if (!existsSync(abs)) fail(gate, `${relative(ROOT, f)}: 链接不可解析 → ${target}`);
      }
    }
  }
}

// ── 门禁 3：preset 结构（id 规范 / preset.yml 三字段 / agent.cordis.yml / ≥1 SKILL.md 且 frontmatter name=目录名）──
{
  const gate = 'preset-structure';
  if (!existsSync(PRESETS)) fail(gate, `presets 目录不存在: ${relative(ROOT, PRESETS)}`);
  else {
    const roles = readdirSync(PRESETS, { withFileTypes: true }).filter((d) => d.isDirectory());
    if (roles.length === 0) fail(gate, 'presets/ 下没有任何角色目录');
    for (const r of roles) {
      const id = r.name;
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail(gate, `角色 id 不合规: ${id}（须 ^[a-z0-9][a-z0-9-]*$）`);
      const dir = join(PRESETS, id);
      const presetYml = join(dir, 'preset.yml');
      if (!existsSync(presetYml)) { fail(gate, `${id}: 缺 preset.yml`); continue; }
      const yml = readFileSync(presetYml, 'utf8');
      for (const field of ['name:', 'description:', 'order:']) {
        if (!new RegExp(`^${field}`, 'm').test(yml)) fail(gate, `${id}/preset.yml: 缺字段 ${field}`);
      }
      if (!existsSync(join(dir, 'agent.cordis.yml'))) fail(gate, `${id}: 缺 agent.cordis.yml`);
      const skillsDir = join(dir, 'skills');
      if (!existsSync(skillsDir)) { fail(gate, `${id}: 缺 skills/`); continue; }
      const skills = readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
      if (skills.length === 0) fail(gate, `${id}: skills/ 下没有任何技能目录`);
      for (const s of skills) {
        const skillMd = join(skillsDir, s.name, 'SKILL.md');
        if (!existsSync(skillMd)) { fail(gate, `${id}: skills/${s.name}/ 缺 SKILL.md`); continue; }
        const fm = readFileSync(skillMd, 'utf8').split('---');
        if (fm.length < 3) { fail(gate, `${id}/skills/${s.name}/SKILL.md: 缺 frontmatter`); continue; }
        if (!new RegExp(`^name:\\s*${s.name}\\s*$`, 'm').test(fm[1]))
          fail(gate, `${id}/skills/${s.name}/SKILL.md: frontmatter name ≠ 目录名`);
      }
    }
  }
}

// ── 门禁 4：claude-symlink（CLAUDE.md 必须是指向 AGENTS.md 的 symlink）──
{
  const gate = 'claude-symlink';
  const p = join(ROOT, 'CLAUDE.md');
  const a = join(ROOT, 'AGENTS.md');
  if (!existsSync(a)) fail(gate, 'AGENTS.md 不存在');
  if (!existsSync(p)) fail(gate, 'CLAUDE.md 不存在（应为 → AGENTS.md 的 symlink）');
  else if (!lstatSync(p).isSymbolicLink()) fail(gate, 'CLAUDE.md 不是 symlink（应为 → AGENTS.md）');
  else if (readlinkSync(p) !== 'AGENTS.md') fail(gate, `CLAUDE.md 指向 ${readlinkSync(p)}（应为 AGENTS.md）`);
}

// ── 门禁 5：pack-bundle / compat（dsh.bundle.patch 指向真实文件；dshReleases 非空）──
{
  const gate = 'pack-bundle-compat';
  const pkgPath = join(PACK, 'package.json');
  if (!existsSync(pkgPath)) { fail(gate, 'deep-research-pack/package.json 不存在'); }
  else {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const patch = pkg?.dsh?.bundle?.patch;
    if (!patch) fail(gate, 'dsh.bundle.patch 未声明');
    else if (!existsSync(join(PACK, patch))) fail(gate, `dsh.bundle.patch 指向的文件不存在: ${patch}`);
    const rel = pkg?.dsh?.compatibility?.dshReleases;
    if (!Array.isArray(rel) || rel.length === 0) fail(gate, 'dsh.compatibility.dshReleases 为空');
  }
}

// ── 门禁 6：row-deps（preset 与 bundle 行引用的 @deepseek-ai/* 包必须在 peerDependencies）──
{
  const gate = 'row-deps';
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  const peers = new Set(Object.keys(pkg.peerDependencies ?? {}));
  const declFiles = [
    ...readdirSync(PRESETS, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(PRESETS, d.name, 'agent.cordis.yml')),
    join(PACK, 'cordis.patch.yml'),
  ];
  for (const f of declFiles.filter(existsSync)) {
    const yml = readFileSync(f, 'utf8');
    for (const m of yml.matchAll(/name:\s*['"](@deepseek-ai\/[^'"]+)['"]/g)) {
      if (!peers.has(m[1])) fail(gate, `${relative(ROOT, f)}: 行依赖 ${m[1]} 未声明进 peerDependencies`);
    }
  }
}

// ── 门禁 7：workspace-contract（研究手册 + 六件 run 模板 + runs/ 目录在位）──
{
  const gate = 'workspace-contract';
  if (!existsSync(join(ROOT, 'research-workspace', 'AGENTS.md'))) fail(gate, 'research-workspace/AGENTS.md 不存在');
  for (const t of ['question.md', 'topics.md', 'leads.md', 'evidence-entry.md', 'findings.md', 'final.md']) {
    if (!existsSync(join(ROOT, 'research-workspace', 'templates', 'run', t)))
      fail(gate, `templates/run/ 缺模板 ${t}`);
  }
  if (!statSync(join(ROOT, 'research-workspace', 'runs')).isDirectory())
    fail(gate, 'research-workspace/runs/ 目录不存在');
}

// ── 门禁 8：proposal-scheduled（proposed/ 每提案必须在 roadmap 有归宿）──
{
  const gate = 'proposal-scheduled';
  const dir = join(ROOT, 'notes', 'proposed');
  if (existsSync(dir)) {
    const roadmapPath = join(ROOT, 'roadmap.md');
    const roadmap = existsSync(roadmapPath) ? readFileSync(roadmapPath, 'utf8') : '';
    for (const ent of readdirSync(dir)) {
      if (ent === 'README.md' || !ent.endsWith('.md')) continue;
      const stem = ent.replace(/\.md$/, '');
      if (!roadmap.includes(stem)) fail(gate, `proposed/${ent} 在 roadmap 无归宿（proposed 不是停车场）`);
    }
  }
}

// ── 门禁 9：secrets-untracked（tracked 清单零敏感/残留物；gitignore 不作用于已跟踪文件）──
{
  const gate = 'secrets-untracked';
  const r = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    fail(gate, `git ls-files 不可用（${String(r.stderr).slice(0, 120)}）——本门禁依赖仓库态，fail-loud`);
  } else {
    const bad = r.stdout.split('\n').filter(Boolean).filter((f) =>
      /\.credentials\.ya?ml$/i.test(f)
      || (/(^|\/)\.env(\..+)?$/.test(f) && !/(^|\/)\.env\.example$/.test(f))
      || /(^|\/)\.envrc$/.test(f)
      || /\.pem$/i.test(f)
      || /\.key$/i.test(f)
      || /(^|\/)node_modules\//.test(f)
      || /(^|\/)\.pnpm-store\//.test(f)
      || /\.tgz$/.test(f)
      || /\.log$/i.test(f)
      || /\.DS_Store$/.test(f));
    for (const f of bad) fail(gate, `敏感/残留物已被 tracked：${f}（gitignore 管不住已跟踪文件，须 git rm --cached）`);
  }
}

// ── 汇报 ──
const gates = ['md-utf8-newline', 'md-links', 'preset-structure', 'claude-symlink', 'pack-bundle-compat', 'row-deps', 'workspace-contract', 'proposal-scheduled', 'secrets-untracked'];
const failed = new Set(failures.map((f) => f.match(/^\[(.+)\]/)[1]));
for (const g of gates) console.log(`${failed.has(g) ? 'FAIL' : 'PASS'}  ${g}`);
for (const n of notes) console.log(`note  ${n}`);
if (failures.length > 0) {
  console.log(`\n${failures.length} 处失败：`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log('\nverify: 全绿');
