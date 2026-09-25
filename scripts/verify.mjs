#!/usr/bin/env node
// verify.mjs — L0 结构门禁（keyless，零依赖）。
// 门禁登记表（正本）：docs/evaluation.md §L0——与本脚本 gates 数组经门禁 gate-ledger-sync
// 机械对账（登记与实现漂移即红）；每条门禁的反证记录 = 表末列所指 notes/。
// 移植自 ai_dsh_company/scripts/verify.mjs（按当前规模裁剪；vendor-pin/client-half/proposal
// 全量版随对应能力落地启用，见根 roadmap.md）。

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, lstatSync, readlinkSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const PRESETS = join(PACK, 'presets');

// 实际门禁名集合（gate-ledger-sync 与 docs/evaluation.md §L0 登记表对账；新增门禁两处同步）
const gates = ['md-utf8-newline', 'md-links', 'md-anchors', 'preset-structure', 'claude-symlink', 'pack-bundle-compat', 'row-deps', 'workspace-contract', 'pack-contract-sync', 'note-format', 'note-status', 'dev-skill-format', 'vendor-pin', 'vendor-clean', 'proposal-scheduled', 'secrets-untracked', 'role-list-sync', 'gate-ledger-sync', 'entry-chain', 'entry-budget'];

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

// roadmap §队列 节切片（proposal-scheduled 与 entry-chain 共用：归宿/当前指针只认队列节，
// 搁置池与头注不算）。文件缺席或节缺席 → null（fail 由调用侧出，报因按语境）。
function roadmapQueue() {
  const p = join(ROOT, 'roadmap.md');
  if (!existsSync(p)) return null;
  const lines = readFileSync(p, 'utf8').split('\n');
  const s = lines.findIndex((l) => /^## 队列/.test(l));
  if (s === -1) return null;
  const out = [];
  for (let i = s + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

// ── 门禁 1：md-utf8 / newline（所有 tracked .md 严格 UTF-8、恰一个结尾换行；git
//    ls-files 驱动——运行区（gitignored bundle/profile 镜像）不扫，研究手册合同既有；
//    旧版全树 walk 曾被 live run 的 leads.md 双尾换行咬红，2026-09-24 修正范围）──
{
  const gate = 'md-utf8-newline';
  const r = spawnSync('git', ['ls-files', '*.md'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) fail(gate, `git ls-files 不可用（${String(r.stderr).slice(0, 120)}）——fail-loud`);
  else {
    for (const rel of r.stdout.split('\n').filter(Boolean)) {
      const f = join(ROOT, rel);
      if (!existsSync(f)) continue; // 稀疏态防御（同 md-links）
      const raw = readFileSync(f);
      const text = raw.toString('utf8');
      if (raw.includes(Buffer.from([0xef, 0xbf, 0xbd]))) {
        // 逐字节比对：decode 后再 encode 不一致 = 有非法字节
        if (Buffer.from(text, 'utf8').equals(raw) === false) fail(gate, `${rel} 含非 UTF-8 字节`);
      }
      if (!text.endsWith('\n')) fail(gate, `${rel} 缺结尾换行`);
      else if (text.endsWith('\n\n')) fail(gate, `${rel} 结尾多于一个换行`);
    }
  }
}

// ── 门禁 2：md-links（所有 tracked .md 的相对链接必须可解析；git ls-files 驱动——基础整治 C10）──
// 原版只扫具名目录（docs/notes/…），根目录其余 tracked .md 逃检——本单子文件初稿 31 条死链
// 同刻全绿即实证。覆盖面 = tracked 集合（新文件 git add 后纳入）；反引号裸路径不检（设计）。
{
  const gate = 'md-links';
  const r = spawnSync('git', ['ls-files', '*.md'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    fail(gate, `git ls-files 不可用（${String(r.stderr).slice(0, 120)}）——本门禁覆盖面依赖仓库态，fail-loud`);
  } else {
    for (const rel of r.stdout.split('\n').filter(Boolean)) {
      const f = join(ROOT, rel);
      if (!existsSync(f)) continue; // 稀疏态防御
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
          if (!existsSync(abs)) fail(gate, `${rel}: 链接不可解析 → ${target}`);
        }
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

// ── 门禁 7：workspace-contract（研究手册 + 六件 run bundle 模板在位；bundle 目录
//    drt_<slug>/ 运行时由 lead 创建，无静态目录可查——D17 目录契约）──
{
  const gate = 'workspace-contract';
  if (!existsSync(join(ROOT, 'research-workspace', 'AGENTS.md'))) fail(gate, 'research-workspace/AGENTS.md 不存在');
  for (const t of ['question.md', 'topics.md', 'leads.md', 'evidence-entry.md', 'findings.md', 'final.md']) {
    if (!existsSync(join(ROOT, 'research-workspace', 'templates', 'run', t)))
      fail(gate, `templates/run/ 缺模板 ${t}`);
  }
  // 手册唯一定居点 = research-workspace/AGENTS.md（agent-instructions 经会话 cwd projectRoot
  // 注入）；$DSH_HOME/AGENTS.md 是 DSH 全局注入第二通道，一旦存在必与手册漂移（事故实证：
  // 旧契约化石镜像让 lead 按 runs/<slug> 行动）——存在即红。
  if (existsSync(join(ROOT, 'dev', 'harness-home', 'AGENTS.md')))
    fail(gate, 'dev/harness-home/AGENTS.md 化石镜像在场（手册唯一注入通道 = cwd projectRoot）——删除它');
}

// ── 门禁 8：pack-contract-sync（pack 的 tracked yml/md 零 runs/ 旧契约路径——persona
//    经系统提示注入、skill 经加载注入，携带已废目录契约即污染 run；D17 事故 2：pack
//    不在首轮 sweep 清单，13 处残留漏网被用户实测抓到）──
{
  const gate = 'pack-contract-sync';
  const r = spawnSync('git', ['ls-files', '--', 'packages/deep-research-pack'], { cwd: ROOT, encoding: 'utf8' });
  const files = (r.stdout || '').split('\n').filter((f) => /\.(yml|md)$/.test(f));
  if (files.length === 0) fail(gate, 'packages/deep-research-pack 下无 tracked yml/md（ls-files 空）');
  for (const f of files) {
    const text = readFileSync(join(ROOT, f), 'utf8');
    const m = text.match(/runs\//g);
    if (m) fail(gate, `${f}: 携带已废目录契约 runs/（×${m.length}）——D17 后 run bundle = drt_<slug>/`);
  }
}

// ── 门禁 9：note-format（notes/ 决定记录骨架与状态行——DSH SDLC reference 01
//    点状吸纳："没记击败了什么的决定会重开讼"；遗留形态走 grandfather 条款不追改）──
{
  const gate = 'note-format';
  const GRANDFATHER = /<!-- grandfather:/;
  const each = (sub, fn) => {
    const dir = join(ROOT, 'notes', sub);
    if (!existsSync(dir)) return; // 空层不检（如 postmortem 尚无事故）
    for (const ent of readdirSync(dir)) {
      if (ent === 'README.md' || !ent.endsWith('.md')) continue;
      fn(ent, readFileSync(join(dir, ent), 'utf8'));
    }
  };
  // proposed/：RFC 状态行（与目录互验）+ 输掉的方案在场
  each('proposed', (ent, text) => {
    if (!/^> 状态：\*{0,2}(proposed|approved|superseded)/m.test(text))
      fail(gate, `notes/proposed/${ent}: 状态行缺席或值域外（proposed/approved/superseded）`);
    if (!/输掉的方案/.test(text))
      fail(gate, `notes/proposed/${ent}: 缺"输掉的方案"——没记击败了什么的决定会重开讼`);
  });
  // implemented/：骨架在场（决定 + 输掉的方案）；grandfather 条款豁免门禁生效前的遗留形态
  each('implemented', (ent, text) => {
    const g = GRANDFATHER.test(text);
    if (!/^## 决定/m.test(text) && !g)
      fail(gate, `notes/implemented/${ent}: 缺"## 决定"节（遗留形态须标 grandfather 注释，见 notes/README.md）`);
    if (!/^## 输掉的方案/m.test(text) && !g)
      fail(gate, `notes/implemented/${ent}: 缺"## 输掉的方案"节（遗留形态须标 grandfather 注释，见 notes/README.md）`);
  });
  // rejected/：否决状态行（提案体保留，结论在状态行）
  each('rejected', (ent, text) => {
    if (!/^> 状态：\*{0,2}rejected/m.test(text))
      fail(gate, `notes/rejected/${ent}: 缺 rejected 状态行`);
  });
}

// ── 门禁 10：vendor-pin（vendor/dsh submodule 在位且钉住 dsh-v0.1.5-rc.2 = fb2c4b9e；
//    D10 销账的机械面——机制权威自持，队列「vendor-submodule-and-pnpm-dsh」）──
{
  const gate = 'vendor-pin';
  const PIN = 'fb2c4b9e698e30edb738bca4cf0618587db7d203';
  if (!existsSync(join(ROOT, '.gitmodules'))) fail(gate, '.gitmodules 缺席');
  else {
    const gm = readFileSync(join(ROOT, '.gitmodules'), 'utf8');
    if (!/path = vendor\/dsh/.test(gm)) fail(gate, '.gitmodules 缺 vendor/dsh 条目');
    if (!/url = https:\/\/github\.com\/deepseek-ai\/deepseek-harness\.git/.test(gm))
      fail(gate, '.gitmodules URL 非 deepseek-harness 正源');
  }
  const r = spawnSync('git', ['submodule', 'status', 'vendor/dsh'], { cwd: ROOT, encoding: 'utf8' });
  const m = r.stdout ? /^[-+ ]?([0-9a-f]{40})/.exec(r.stdout.trim()) : null;
  if (!m) fail(gate, 'submodule status 不可读——检查 git submodule init/update');
  else if (m[1] !== PIN) fail(gate, `vendor/dsh 钉在 ${m[1].slice(0, 8)}——应为 ${PIN.slice(0, 8)}（dsh-v0.1.5-rc.2）`);
}

// ── 门禁 11：vendor-clean（vendor/dsh 只读铁律：零未提交改动——机制权威不许就地改）──
// ⚠ 子模块 git 调用必须剥掉继承的 GIT_* 环境变量：pre-commit 语境里 git 注入 GIT_DIR=
//    父仓 .git，会覆盖 -C vendor/dsh 的仓库发现 → status 不可用（红）——两次 pre-commit
//    拦截实证，非瞬态。
{
  const gate = 'vendor-clean';
  const cleanEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^GIT_(DIR|INDEX_FILE|WORK_TREE|NAMESPACE)/.test(k)),
  );
  const r = spawnSync('git', ['-C', 'vendor/dsh', 'status', '--porcelain'], { cwd: ROOT, encoding: 'utf8', env: cleanEnv });
  if (r.status !== 0) fail(gate, 'vendor/dsh git status 不可用——submodule 未初始化？（或 git 环境变量污染，见上方注释）');
  else if (r.stdout.trim()) fail(gate, `vendor/dsh 有未提交改动（只读铁律）：${r.stdout.trim().split('\n')[0]}…`);
}

// ── 门禁 8：proposal-scheduled（proposed/ 每提案必须在 roadmap §队列 有归宿；搁置池/头注不算）──
// 收紧记录：review-driven-hardening Note（原版全文件子串匹配——stem 出现在任何位置都算归宿）。
{
  const gate = 'proposal-scheduled';
  const dir = join(ROOT, 'notes', 'proposed');
  if (existsSync(dir)) {
    const queue = roadmapQueue();
    if (queue === null) fail(gate, 'roadmap §队列 不可读——proposed 的归宿只能登记在队列节');
    else {
      for (const ent of readdirSync(dir)) {
        if (ent === 'README.md' || !ent.endsWith('.md')) continue;
        const stem = ent.replace(/\.md$/, '');
        if (!queue.includes(stem)) fail(gate, `proposed/${ent} 在 roadmap §队列 无归宿（proposed 不是停车场；搁置池/头注不算归宿）`);
      }
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

// ── 门禁 10：role-list-sync（角色清单单一事实源 = 盘上 presets/；代码里出现角色清单字面量 → 红）──
// 检测名从盘上目录现取（门禁自身零硬编码，新角色入列即自动纳入检测）。典型咬合形态：
//   ① 单行 ≥3 个角色名 token（JS 数组 / bash for-in 列表）；② [...] 数组块内 ≥3 个角色名字符串。
// 合法的 ≤2 共现（探针成员名、prompt 覆盖对象逐行键）不触发。消费点应 import scripts/lib/roles.mjs。
{
  const gate = 'role-list-sync';
  const roleNames = readdirSync(PRESETS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  if (roleNames.length === 0) fail(gate, 'presets/ 下没有任何角色目录（单一事实源为空）');
  else {
    const tokenOf = (n) => new RegExp(`(^|[^a-z0-9-])${n}([^a-z0-9-]|$)`);
    const codeFiles = allFiles.filter((f) => /\.(mjs|sh)$/.test(f)
      && (f.startsWith(join(ROOT, 'scripts') + '/') || f.startsWith(join(ROOT, 'tests') + '/') || f.startsWith(join(ROOT, 'dev') + '/'))
      && !f.includes('smoke-workspace') && !f.includes('node_modules'));
    for (const f of codeFiles) {
      const text = readFileSync(f, 'utf8');
      for (const line of text.split('\n')) {
        const hits = roleNames.filter((n) => tokenOf(n).test(line));
        if (hits.length >= 3) fail(gate, `${relative(ROOT, f)}: 角色清单硬编码（单行 ${hits.length} 个角色名：${hits.join(', ')}）——清单事实源 = 盘上 presets/，JS 用 scripts/lib/roles.mjs、bash 用目录枚举`);
      }
      for (const m of text.matchAll(/\[[^\[\]]*\]/gs)) {
        const hits = roleNames.filter((n) => new RegExp(`['"\`]${n}['"\`]`).test(m[0]));
        if (hits.length >= 3) fail(gate, `${relative(ROOT, f)}: 角色清单硬编码（[...] 数组块含 ${hits.length} 个角色名：${hits.join(', ')}）——清单事实源 = 盘上 presets/，JS 用 scripts/lib/roles.mjs`);
      }
    }
  }
}

// ── 门禁 11：gate-ledger-sync（docs/evaluation.md §L0 门禁登记表 = 本脚本 gates 数组，不漂移）──
// 抓取形状：表格行首列为 code span（`| `gate-name` |`）——evaluation.md 其他表首列非此形状，不误抓。
{
  const gate = 'gate-ledger-sync';
  const evalPath = join(ROOT, 'docs', 'evaluation.md');
  if (!existsSync(evalPath)) fail(gate, 'docs/evaluation.md 不存在');
  else {
    const ledger = new Set();
    for (const line of readFileSync(evalPath, 'utf8').split('\n')) {
      const m = /^\| `([a-z0-9-]+)` \|/.exec(line);
      if (m) ledger.add(m[1]);
    }
    for (const g of gates) {
      if (!ledger.has(g)) fail(gate, `evaluation.md §L0 登记表缺门禁：${g}——登记表与脚本必须同步`);
    }
    for (const l of ledger) {
      if (!gates.includes(l)) fail(gate, `evaluation.md §L0 登记表多出门禁（脚本 gates 数组无此名）：${l}`);
    }
  }
}

// ── 门禁 12：entry-chain（入口链存在性投影——正本 = 根 AGENTS.md §入口链）──
// md-links 已机械覆盖全部 tracked .md 的链接解析；本门禁补它的盲区：① 入口链中以反引号/
// 散文指针提到的成员文件（`docs/design/10-30` 等——md-links 不检非链接形态）必须在场；
// ② roadmap §队列 恰一个 ▶（全仓唯一"当前"指针的存在性与唯一性，D11）。
// 改入口链结构 = 同 diff 更新本清单（成员清单是入口链的存在性投影，非第二正本）。
{
  const gate = 'entry-chain';
  const members = ['AGENTS.md', 'docs/00-index.md', 'roadmap.md', 'notes/proposed',
    'docs/guides/60-dev-loop.md', 'docs/evaluation.md', 'docs/design/10-architecture.md',
    'docs/design/20-roles.md', 'docs/design/30-methodology-mapping.md', 'docs/guides/61-run-playbook.md'];
  for (const rel of members) {
    if (!existsSync(join(ROOT, rel))) fail(gate, `入口链成员缺席：${rel}（正本 = AGENTS.md §入口链；改链须同 diff 更新本门禁清单）`);
  }
  if (existsSync(join(ROOT, 'AGENTS.md')) && !/^## 入口链/m.test(readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')))
    fail(gate, 'AGENTS.md 缺 §入口链 标题——入口链定义的家');
  const queue = roadmapQueue();
  if (queue === null) fail(gate, 'roadmap §队列 不可读——入口链第 3 步（唯一"当前"指针）断链');
  else {
    const marks = (queue.match(/▶/g) ?? []).length;
    if (marks === 0) fail(gate, 'roadmap §队列 无 ▶——全仓唯一"当前"指针缺席（D11）');
    else if (marks > 1) fail(gate, `roadmap §队列 有 ${marks} 个 ▶——"当前"指针必须唯一（D11）`);
  }
}

// ── 门禁 13：entry-budget（常设入口防膨胀——vendor verify-doc-budgets 的裁剪版）──
// 预算只防"常驻入口"膨胀：AGENTS.md（纪律表全量枚举替换在即，膨胀风险最高点）与
// README.md（门面）。台账（00-index）与指南（guides/）是生长面，不设顶（vendor
// "review governs unbudgeted tiers" 同款）。超顶处置序 = 下放（指针化）> 压缩 >
// 升顶（升顶须 D 号 + Note 依据——a too-low ceiling is a budget bug）。
// 行数 = split('\n') - 1（结尾恰一换行由 md-utf8-newline 门禁保证）。
{
  const gate = 'entry-budget';
  for (const [rel, cap] of [['AGENTS.md', 145], ['README.md', 30]]) {
    const lines = readFileSync(join(ROOT, rel), 'utf8').split('\n').length - 1;
    if (lines > cap) fail(gate, `${rel} ${lines} 行 > 预算 ${cap} 行——处置序：下放/压缩；升顶须 D 号登记（evaluation.md §L0 登记表同 diff 更新上限值）`);
  }
}

// ── 门禁 14：md-anchors（相对链接的 #fragment 必须在目标文件里真的存在——
//    《_agent_ready_development》语料 verify.mjs 吸纳：它校验"内部链接与锚点"，
//    本仓 md-links 只管文件存在，锚点漂移（标题改名后片段失效）是它的盲区。
//    slug 规则照抄 GitHub：小写、去非 [字母/数字/_/空格/-]、空格→'-'、重复加 -N；
//    另认手写 <a id="...">。外链与 mailto 不检（同 md-links）。）──
{
  const gate = 'md-anchors';
  const slug = (h) => h
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // 链接 → 其文字
    .replace(/[*`]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_ -]/gu, '')
    .replaceAll(' ', '-');
  const anchorsOf = (f) => {
    const out = new Set();
    const seen = new Map();
    const text = readFileSync(f, 'utf8');
    let inFence = false;
    for (const line of text.split('\n')) {
      if (line.trimStart().startsWith('```')) { inFence = !inFence; continue; }
      if (inFence) continue;
      const m = /^ {0,3}#{1,6}\s+(.+?)\s*$/.exec(line);
      if (m) {
        const base = slug(m[1]);
        let a = base;
        let n = seen.get(base) ?? 0;
        while (out.has(a)) { n += 1; a = `${base}-${n}`; }
        seen.set(base, n);
        out.add(a);
      }
      for (const id of line.matchAll(/<a\s+[^>]*\bid="([^"]+)"[^>]*>/g)) out.add(id[1]);
    }
    return out;
  };
  const cache = new Map();
  const anchorsFor = (f) => {
    if (!cache.has(f)) cache.set(f, existsSync(f) ? anchorsOf(f) : new Set());
    return cache.get(f);
  };
  const r = spawnSync('git', ['ls-files', '*.md'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) fail(gate, 'git ls-files 不可用——覆盖面依赖仓库态，fail-loud');
  else {
    for (const rel of r.stdout.split('\n').filter(Boolean)) {
      const f = join(ROOT, rel);
      if (!existsSync(f)) continue;
      const text = readFileSync(f, 'utf8');
      let inFence = false;
      for (const line of text.split('\n')) {
        if (line.trimStart().startsWith('```')) inFence = !inFence;
        if (inFence) continue;
        for (const m of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
          const [target, frag] = m[1].split('#');
          if (!frag || /^[a-z]+:\/\//i.test(m[1]) || m[1].startsWith('mailto:')) continue;
          const abs = target === '' ? f : resolve(dirname(f), target);
          if (!existsSync(abs)) continue; // 文件缺席归 md-links（单一失败源）
          if (!anchorsFor(abs).has(decodeURIComponent(frag))) {
            fail(gate, `${rel}: 锚点不可解析 → ${m[1]}（目标文件无此标题或 a-id）`);
          }
        }
      }
    }
  }
}

// ── 门禁 15：dev-skill-format（.agents/skills/ 开发技能的形状——vendor .agents/skills/
//    吸纳：repository development Skills 的 frontmatter 用 name/description，
//    description 以 "Use " 开头携带触发条件（匹配即加载；摘要不携带指令）；
//    形状坏了 = 技能静默不触发，比写错正文更难发现。）──
{
  const gate = 'dev-skill-format';
  const dir = join(ROOT, '.agents', 'skills');
  if (!existsSync(dir)) fail(gate, '.agents/skills/ 缺席——开发技能层是入口链的一部分');
  else {
    const skills = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
    if (skills.length === 0) fail(gate, '.agents/skills/ 下没有任何技能');
    for (const s of skills) {
      const file = join(dir, s.name, 'SKILL.md');
      if (!existsSync(file)) { fail(gate, `.agents/skills/${s.name}: 缺 SKILL.md`); continue; }
      const text = readFileSync(file, 'utf8');
      const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
      if (fm === null) { fail(gate, `.agents/skills/${s.name}: 缺 frontmatter`); continue; }
      const name = /^name:\s*(\S+)\s*$/m.exec(fm[1])?.[1];
      const desc = /^description:\s*(.+)$/m.exec(fm[1])?.[1];
      if (name !== s.name) fail(gate, `.agents/skills/${s.name}: frontmatter name=${String(name)} ≠ 目录名`);
      if (desc === undefined || !desc.startsWith('Use ')) {
        fail(gate, `.agents/skills/${s.name}: description 须以 "Use " 开头（携带触发分支；摘要不携带指令）`);
      }
    }
  }
}

// ── 门禁 16：note-status（notes/ 的时态与状态面——2026-09-25 用户诉求落地：
//    人一眼看懂、Agent 一眼分辨当前/将来/过去。三条断言：
//    ① notes/ 每个子目录有 README.md（目录自述时态与状态标记方式）；
//    ② research/ 的非 README 文件带状态行 `> 状态：已完成|进行中`（报告层不是生命周期
//       目录，状态必须写在文件里）；
//    ③ research/README.md 登记 research/ 的每个文件（人工索引的新鲜度对账——登记漏项
//       即红；这是本仓对 vendor"不建索引"的登记偏离，人读场景优先）。）──
{
  const gate = 'note-status';
  const notesDir = join(ROOT, 'notes');
  for (const ent of readdirSync(notesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (!existsSync(join(notesDir, ent.name, 'README.md'))) {
      fail(gate, `notes/${ent.name}/: 缺 README.md（子目录须自述时态与状态标记方式）`);
    }
  }
  const research = join(notesDir, 'research');
  if (existsSync(research)) {
    const files = readdirSync(research).filter((f) => f.endsWith('.md') && f !== 'README.md');
    const index = existsSync(join(research, 'README.md')) ? readFileSync(join(research, 'README.md'), 'utf8') : '';
    for (const f of files) {
      const text = readFileSync(join(research, f), 'utf8');
      if (!/^> 状态：\*{0,2}(已完成|进行中)/m.test(text)) {
        fail(gate, `notes/research/${f}: 缺状态行（> 状态：已完成 | 进行中 · 日期）`);
      }
      if (!index.includes(f)) fail(gate, `notes/research/README.md: 未登记 ${f}（索引新鲜度）`);
    }
  }
}

// ── 汇报 ──
const failed = new Set(failures.map((f) => f.match(/^\[(.+)\]/)[1]));
for (const g of gates) console.log(`${failed.has(g) ? 'FAIL' : 'PASS'}  ${g}`);
for (const n of notes) console.log(`note  ${n}`);
if (failures.length > 0) {
  console.log(`\n${failures.length} 处失败：`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log('\nverify: 全绿');
