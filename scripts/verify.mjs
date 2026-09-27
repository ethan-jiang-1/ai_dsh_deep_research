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
const gates = ['md-utf8-newline', 'md-links', 'md-anchors', 'preset-structure', 'claude-symlink', 'pack-bundle-compat', 'row-deps', 'workspace-contract', 'pack-contract-sync', 'note-format', 'note-status', 'note-graduation-rewrite', 'dev-skill-format', 'vendor-pin', 'vendor-clean', 'proposal-scheduled', 'secrets-untracked', 'role-list-sync', 'gate-ledger-sync', 'entry-chain', 'doc-budgets', 'align-ledger', 'repo-conventions', 'vendor-links', 'overlay-fresh', 'client-keys', 'pack-workspace-fresh', 'queue-pointer-live', 'proposed-pointer-live', 'pin-agreement', 'count-free', 'doc-now-only'];

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

// roadmap §搁置池 节切片（proposal-scheduled 的第二归宿面——防御性兼容：2026-09-27 起搁置
// 条目全文住 notes/rejected/（搁置即"决定不做"，池行直链 rejected 文件），proposed/ 只收
// 在飞队列条目；本分支保留，防语义误挂时静默。▶ 当前指针只认队列节）。

/** 队列 parked 标记（2026-09-28 首次清空起的一等状态）：队列空 = 全部条目毕业，待用户取题。
 *  parked 合法形态 = 标记行在场 + 零 ▶ + 零编号条目；标记与 ▶/编号条目并存 = 矛盾态，红。 */
const QUEUE_PARKED = '（队列空——待用户取题）';
const queueParkedState = (queue) => queue.includes(QUEUE_PARKED) && !/^\d+\.\s/m.test(queue);
function roadmapParked() {
  const p = join(ROOT, 'roadmap.md');
  if (!existsSync(p)) return null;
  const lines = readFileSync(p, 'utf8').split('\n');
  const s = lines.findIndex((l) => /^## 搁置池/.test(l));
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

// ── 门禁 4：preset 结构（0.1.7 形态：presets/<role>.patch.yml 一条 @deepseek-ai/dsh-agent-preset
//    行，行内 config 带 id/name/description/order/plugins；角色技能仍在 presets/<role>/skills/，
//    ≥1 个且 frontmatter name = 目录名）──
{
  const gate = 'preset-structure';
  if (!existsSync(PRESETS)) fail(gate, `presets 目录不存在: ${relative(ROOT, PRESETS)}`);
  else {
    const patches = readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml'));
    if (patches.length === 0) fail(gate, 'presets/ 下没有任何 <role>.patch.yml（0.1.7 preset = 一条行）');
    for (const f of patches) {
      const id = f.replace(/\.patch\.yml$/, '');
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail(gate, `角色 id 不合规: ${id}（须 ^[a-z0-9][a-z0-9-]*$）`);
      const yml = readFileSync(join(PRESETS, f), 'utf8');
      if (!new RegExp(`^\\s*- id: preset-${id}\\s*$`, 'm').test(yml))
        fail(gate, `${f}: 缺 \`- id: preset-${id}\` 声明行`);
      if (!/^\s+name:\s*'@deepseek-ai\/dsh-agent-preset'\s*$/m.test(yml))
        fail(gate, `${f}: 声明行 name 须为 '@deepseek-ai/dsh-agent-preset'`);
      for (const field of ['id:', 'name:', 'description:', 'order:', 'plugins:']) {
        if (!new RegExp(`^\\s+${field}`, 'm').test(yml)) fail(gate, `${f}: config 缺字段 ${field}`);
      }
      const skillsDir = join(PRESETS, id, 'skills');
      if (!existsSync(skillsDir)) { fail(gate, `${id}: 缺 presets/${id}/skills/`); continue; }
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

// ── 门禁 5：claude-symlink（CLAUDE.md 必须是指向 AGENTS.md 的 symlink）──
{
  const gate = 'claude-symlink';
  // 两条 symlink（vendor 同构）：根 CLAUDE.md → AGENTS.md；.claude/skills → ../.agents/skills
  // （后者让 Claude 系 harness 发现与 DSH 同一批开发技能——上游 .claude/ 只此一件）。
  const pairs = [['CLAUDE.md', 'AGENTS.md'], [join('.claude', 'skills'), join('..', '.agents', 'skills')]];
  if (!existsSync(join(ROOT, 'AGENTS.md'))) fail(gate, 'AGENTS.md 不存在');
  for (const [rel, want] of pairs) {
    const p = join(ROOT, rel);
    if (!existsSync(p)) { fail(gate, `${rel} 不存在（应为 → ${want} 的 symlink）`); continue; }
    if (!lstatSync(p).isSymbolicLink()) { fail(gate, `${rel} 不是 symlink（应为 → ${want}）`); continue; }
    if (readlinkSync(p) !== want) fail(gate, `${rel} 指向 ${readlinkSync(p)}（应为 ${want}）`);
  }
}

// ── 门禁 6：pack-bundle / compat（dsh.bundle.patch 指向真实文件；dshReleases 非空）──
{
  const gate = 'pack-bundle-compat';
  const pkgPath = join(PACK, 'package.json');
  if (!existsSync(pkgPath)) { fail(gate, 'deep-research-pack/package.json 不存在'); }
  else {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const patch = pkg?.dsh?.bundle?.patch;
    if (!patch) fail(gate, 'dsh.bundle.patch 未声明');
    else {
      const list = Array.isArray(patch) ? patch : [patch];
      if (list.length === 0) fail(gate, 'dsh.bundle.patch 为空');
      for (const rel0 of list) {
        if (typeof rel0 !== 'string' || !existsSync(join(PACK, rel0))) fail(gate, `dsh.bundle.patch 指向的文件不存在: ${String(rel0)}`);
      }
      // 0.1.7：preset 即行，bundle 必须随包携带自己的 preset patch（否则角色根本没被声明）
      const presetPatches = list.filter((x) => typeof x === 'string' && /presets\/[a-z0-9-]+\.patch\.yml$/.test(x));
      if (presetPatches.length === 0) fail(gate, 'dsh.bundle.patch 未携带任何 presets/<role>.patch.yml（0.1.7 preset 行随 bundle 装载）');
      // 覆盖完整性（2026-09-26 复验发现：原判据只要"≥1 条"，新增角色忘登记第 5 条会**绿而坏**）：
      // 盘上每个 presets/<role>.patch.yml 都必须在数组里——事实源 = 盘上目录（同 role-list-sync）。
      if (existsSync(PRESETS)) {
        const onDisk = readdirSync(PRESETS).filter((f) => /\.patch\.yml$/.test(f)).map((f) => `./presets/${f}`);
        if (onDisk.length === 0) fail(gate, '防空语料：presets/ 下零个 .patch.yml');
        for (const rel1 of onDisk) {
          if (!list.includes(rel1)) fail(gate, `presets/${rel1.replace('./presets/', '')} 在盘上但未登记进 dsh.bundle.patch——新增角色漏登记 = 绿而坏`);
        }
      }
    }
    const rel = pkg?.dsh?.compatibility?.dshReleases;
    if (!Array.isArray(rel) || rel.length === 0) fail(gate, 'dsh.compatibility.dshReleases 为空');
  }
}

// ── 门禁 7：row-deps（preset 与 bundle 行引用的 @deepseek-ai/* 包必须在 peerDependencies）──
{
  const gate = 'row-deps';
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  const peers = new Set(Object.keys(pkg.peerDependencies ?? {}));
  const declFiles = [
    ...readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml')).map((f) => join(PRESETS, f)),
    join(PACK, 'cordis.patch.yml'),
  ];
  for (const f of declFiles.filter(existsSync)) {
    const yml = readFileSync(f, 'utf8');
    for (const m of yml.matchAll(/name:\s*['"](@deepseek-ai\/[^'"]+)['"]/g)) {
      if (!peers.has(m[1])) fail(gate, `${relative(ROOT, f)}: 行依赖 ${m[1]} 未声明进 peerDependencies`);
    }
  }
}

// ── 门禁 8：workspace-contract（研究手册 + 六件 run bundle 模板在位；bundle 目录
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

// ── 门禁 9：pack-contract-sync（pack 的 tracked yml/md 零 runs/ 旧契约路径——persona
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

// ── 门禁 10：note-format（notes/ 决定记录骨架与状态行——DSH SDLC reference 01
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
    if (!/^> 状态：\*{0,2}(proposed|approved|superseded)\*{0,2}\s*$/m.test(text))
      fail(gate, `notes/proposed/${ent}: 状态行须为裸值（> 状态：proposed|approved|superseded；不带日期/括号——上游 Status 行同构）`);
    if (!/输掉的方案/.test(text))
      fail(gate, `notes/proposed/${ent}: 缺"输掉的方案"——没记击败了什么的决定会重开讼`);
  });
  // implemented/：骨架在场（决定 + 输掉的方案）；grandfather 条款豁免门禁生效前的遗留形态
  each('implemented', (ent, text) => {
    const g = GRANDFATHER.test(text);
    if (!/^> 状态：\*{0,2}implemented\*{0,2}\s*$/m.test(text))
      fail(gate, `notes/implemented/${ent}: 缺裸状态行（> 状态：implemented——目录↔状态互验）`);
    if (!/^## 决定/m.test(text) && !g)
      fail(gate, `notes/implemented/${ent}: 缺"## 决定"节（遗留形态须标 grandfather 注释，见 notes/README.md）`);
    if (!/^## 输掉的方案/m.test(text) && !g)
      fail(gate, `notes/implemented/${ent}: 缺"## 输掉的方案"节（遗留形态须标 grandfather 注释，见 notes/README.md）`);
  });
  // rejected/：否决状态行（提案体保留，结论在状态行）
  each('rejected', (ent, text) => {
    if (!/^> 状态：\*{0,2}rejected\*{0,2}(\s*—\s*.+)?$/m.test(text))
      fail(gate, `notes/rejected/${ent}: 缺 rejected 状态行（裸值；一行理由用 —— 附在状态行后）`);
  });
}

// ── 门禁 13：vendor-pin（vendor/dsh submodule 在位且钉住 dsh-v0.1.7-rc.2 = 477b4f4205；
//    D10 销账的机械面——机制权威自持，队列「vendor-submodule-and-pnpm-dsh」）──
{
  const gate = 'vendor-pin';
  const PIN = '477b4f420553e8a52c2fbccc464d7561b239c443';
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
  else if (m[1] !== PIN) fail(gate, `vendor/dsh 钉在 ${m[1].slice(0, 8)}——应为 ${PIN.slice(0, 8)}（dsh-v0.1.7-rc.2）`);
}

// ── 门禁 14：vendor-clean（vendor/dsh 只读铁律：零未提交改动——机制权威不许就地改）──
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

// ── 门禁 15：proposal-scheduled（proposed/ 每提案必须在 roadmap §队列 **或 §搁置池** 有
//    归宿——两处都不是的 RFC = 孤儿提案，红灯。2026-09-27 起搁置池条目全文住 notes/rejected/
//    （带重启条件，池行直链），proposed/ 正常只收队列条目；§搁置池分支保留为防御性兼容。
//    收紧记录：review-driven-hardening Note。）──
{
  const gate = 'proposal-scheduled';
  const dir = join(ROOT, 'notes', 'proposed');
  if (existsSync(dir)) {
    const queue = roadmapQueue();
    const parked = roadmapParked() ?? '';
    if (queue === null) fail(gate, 'roadmap §队列 不可读——proposed 的归宿只能登记在队列/搁置池节');
    else {
      for (const ent of readdirSync(dir)) {
        if (ent === 'README.md' || !ent.endsWith('.md')) continue;
        const stem = ent.replace(/\.md$/, '');
        if (!queue.includes(stem) && !parked.includes(stem))
          fail(gate, `proposed/${ent} 在 roadmap §队列/§搁置池 均无归宿（孤儿提案——队列或池行须挂本 RFC 的链接）`);
      }
    }
  }
}

// ── 门禁 27：queue-pointer-live（队列 ▶ 行引用的 RFC 必须仍在 notes/proposed/）──
// 反证形态（2026-09-26 事故：毕业手续漏做 → ▶ 指向已完成条目，commit message 却声称已更新）：
// 把 ▶ 行的 RFC 链接改指 implemented/ 的文件 → 本门禁红 → 还原绿。
{
  const gate = 'queue-pointer-live';
  const queue = roadmapQueue();
  if (queue === null) {
    fail(gate, 'roadmap §队列 不可读——▶ 指针无处可查');
  } else {
    const qLines = queue.split('\n');
    const pointerIdx = qLines.map((l, i) => (l.includes('▶') ? i : -1)).filter((i) => i !== -1);
    // parked 态（2026-09-28）：零 ▶ 合法——"当前"停在待用户取题，无 RFC 可指；
    // 标记与 ▶/编号条目并存 = 矛盾态，红。
    if (pointerIdx.length === 0 && !queueParkedState(queue)) {
      fail(gate, `队列 ▶ 指针必须唯一（实测 0 处）——且非 parked 态（队列空须标 ${QUEUE_PARKED}，不得残留编号条目）`);
    } else if ((pointerIdx.length !== 1 && pointerIdx.length > 0) || (pointerIdx.length === 1 && queue.includes(QUEUE_PARKED))) {
      fail(gate, `队列 ▶ 指针必须唯一（实测 ${pointerIdx.length} 处${queue.includes(QUEUE_PARKED) ? '；且与 parked 标记并存=矛盾态' : ''}）`);
    } else if (pointerIdx.length === 1) {
      // 条目块 = ▶ 行起，到下一个编号条目 / 节标题 / 毕业注记为止（RFC 链接常在续行）
      let end = qLines.length;
      for (let i = pointerIdx[0] + 1; i < qLines.length; i++) {
        if (/^\d+\.\s/.test(qLines[i]) || /^##\s/.test(qLines[i]) || qLines[i].startsWith('（')) { end = i; break; }
      }
      const block = qLines.slice(pointerIdx[0], end).join('\n');
      const refs = [...block.matchAll(/\]\(notes\/proposed\/([^)]+?)\.md\)/g)].map((m) => m[1]);
      if (refs.length === 0) {
        fail(gate, '队列 ▶ 行未挂 RFC 链接——当前条目必须有 notes/proposed/ 的 RFC 全文');
      }
      for (const stem of refs) {
        if (!existsSync(join(ROOT, 'notes', 'proposed', `${stem}.md`))) {
          fail(gate, `▶ 行引用的 RFC 不在 notes/proposed/：${stem}——条目已完成？（毕业须同 diff：RFC 迁 implemented/ + 队列行删除 + ▶ 移交）`);
        }
      }
    }
  }
}
// ── 门禁 28：proposed-pointer-live（live 文件里指向 notes/proposed/<x>.md 的具体指针必须存在）──
// 为什么：md-links/md-anchors 只扫 tracked .md 的 Markdown 链接语法，**非 .md 文件里的指针逃检**
// ——2026-09-26 清扫实测 13 处已 404 的 notes/proposed/ 指针（presets 头注 ×4、dev ×3、scripts ×3、
// tests ×1、alignment-ledger ×1）全部从这条缝漏过；preset 头注还随包分发。
// 范围：tracked 且**排除 notes/ 历史层**（历史层保留过去时指针是合法的，如"原 RFC：…（已离场）"）
// 与 vendor/。防空语料：扫到 0 个 live 文件、或 0 个指针被检查 → 红（静默空集 = 门禁不存在）。
// 反证形态：把任一头注里的 notes/implemented/ 改回 notes/proposed/ → 本门禁红 → 还原绿。
{
  const gate = 'proposed-pointer-live';
  const r = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    fail(gate, `git ls-files 不可用（${String(r.stderr).slice(0, 120)}）——本门禁覆盖面依赖仓库态，fail-loud`);
  } else {
    const files = r.stdout.split('\n').filter(Boolean)
      .filter((f) => !f.startsWith('vendor/') && !f.startsWith('notes/') && f !== 'pnpm-lock.yaml');
    if (files.length === 0) {
      fail(gate, '防空语料：未扫到任何 live 文件——范围被收窄或 git ls-files 失效');
    } else {
      let checked = 0;
      for (const rel of files) {
        const f = join(ROOT, rel);
        if (!existsSync(f)) continue; // 稀疏态防御（同 md-links）
        let text;
        try { text = readFileSync(f, 'utf8'); } catch { continue; }
        for (const m of text.matchAll(/notes\/proposed\/[A-Za-z0-9._-]+\.md/g)) {
          checked++;
          if (!existsSync(join(ROOT, m[0]))) {
            const line = text.slice(0, m.index).split('\n').length;
            fail(gate, `${rel}:${line} 指向 ${m[0]}——该文件不在 notes/proposed/（已毕业？毕业须同 diff 改指 notes/implemented/）`);
          }
        }
      }
      if (checked === 0 && !queueParkedState(roadmapQueue() ?? '')) {
        fail(gate, '防空语料：零个 notes/proposed/ 指针被检查——指针全没了或正则失效（例外：队列空 parked 态——在飞条目为零，零指针合法）');
      } else if (checked === 0) note(gate, '零指针（队列空 parked 态——合法）');
      else note(gate, `${checked} 个 live 指针全部可解析`);
    }
  }
}

// ── 门禁 29：pin-agreement（live 文件里的钉身份必须与 submodule 实际状态一致）──
// 为什么：pin 在仓里有 14 个家，2026-09-26 清扫实测三处写错（dev/env.sh 的 tag 停在 0.1.5、
// design/10 的层版本停在 0.1.5、alignment-ledger 的 commit 写成 477b4f420505）——而 vendor-pin
// 只管 .gitmodules 一处，散文/机读面的复述无人对账。
// 规则：① live 文件里每个 40 位 hex 串必须等于 submodule HEAD；② 每个 `dsh-v*` tag 串必须等于
// submodule 的 tag——**唯一例外**：同一行带外部归属标记（语料/参考仓/company/外部材料）的，
// 那是别的仓的 pin，不是本仓的（现仅 00-index 的"语料自身钉 dsh-v0.1.7-rc.1"一处）。
// 防空语料：0 个 hex、或 0 个 tag 被检查 → 红。
{
  const gate = 'pin-agreement';
  const sub = spawnSync('git', ['submodule', 'status', 'vendor/dsh'], { cwd: ROOT, encoding: 'utf8' });
  const m = /^[\s+U-]*([0-9a-f]{40})/.exec(sub.stdout ?? '');
  const tagR = spawnSync('git', ['-C', join(ROOT, 'vendor', 'dsh'), 'describe', '--tags', '--exact-match'], { cwd: ROOT, encoding: 'utf8' });
  const TAG = (tagR.stdout ?? '').trim();
  if (!m || !TAG) {
    fail(gate, `读不到 submodule 钉身份（commit=${m ? m[1].slice(0, 8) : '?'} tag=${TAG || '?'}）——fail-loud`);
  } else {
    const PIN = m[1];
    const r = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
    const files = (r.stdout ?? '').split('\n').filter(Boolean)
      .filter((f) => !f.startsWith('vendor/') && !f.startsWith('notes/') && f !== 'pnpm-lock.yaml')
      // 快照 fixture 豁免（2026-09-27）：录制的会话流里含 harness 自身的版本戳（system-reminder
      // 注入的构建身份）——那是 vendor 规范化契约说的"挥发性身份"（fixture 定形时 tokenize），
      // 不是本仓的钉声明；钉死在 fixtures 录制流上会与每次重录打架。
      .filter((f) => !f.startsWith('tests/fixtures/snapshot-'))
      // run-state 夹具同款豁免（2026-09-27）：同为录制会话日志的投影——lead 的 grep 研究动作
      // 参数里出现 DSH 版本 tag 字样是实录数据（本次 pre-commit 咬住的实录即红证），不是钉声明。
      .filter((f) => !f.startsWith('tests/fixtures/run-state/'));
    let hexes = 0, tags = 0, skipped = 0;
    for (const rel of files) {
      const f = join(ROOT, rel);
      if (!existsSync(f)) continue;
      let text;
      try { text = readFileSync(f, 'utf8'); } catch { continue; }
      const lines = text.split('\n');
      for (const h of text.matchAll(/[0-9a-f]{40}/g)) {
        hexes++;
        if (h[0] !== PIN) {
          const line = text.slice(0, h.index).split('\n').length;
          fail(gate, `${rel}:${line} 的 commit ${h[0].slice(0, 12)}… ≠ submodule HEAD ${PIN.slice(0, 12)}…（散文/机读面的钉身份必须与 .gitmodules 一致）`);
        }
      }
      for (const t of text.matchAll(/dsh-v[0-9][0-9A-Za-z.-]*/g)) {
        const line = text.slice(0, t.index).split('\n').length;
        if (/(语料|参考仓|company|外部材料)/.test(lines[line - 1] ?? '')) { skipped++; continue; }
        tags++;
        if (t[0] !== TAG) fail(gate, `${rel}:${line} 的 tag ${t[0]} ≠ submodule tag ${TAG}（换 pin 后复述面未同步）`);
      }
    }
    if (hexes === 0 || tags === 0) fail(gate, `防空语料：检查到 ${hexes} 个 commit / ${tags} 个 tag——钉身份复述面消失或正则失效`);
    else note(gate, `${hexes} 个 commit + ${tags} 个 tag 与 submodule 一致（外部归属豁免 ${skipped} 处）`);
  }
}

// ── 门禁 30：count-free（live 文档不写硬编码计数）──
// 为什么：门禁数 / tests 数 / 断言数是最易腐的一类自指事实（2026-09-26 清扫实测 5 处写错：
// tests 数 ×2、note 篇数、源面条数、门禁数——本注释原先照抄这些数字，被本门禁自己咬红，
// 即为它有效的第一份证据）。计数有正本（gates 数组 / evaluation 台账 / ls），散文里的副本
// 只会腐烂——一律改成"查正本"。
// 范围：live 文件（排除 notes/ 历史层与 vendor/）。防空语料：0 个文件被检查 → 红。
{
  const gate = 'count-free';
  const r = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  const files = (r.stdout ?? '').split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('vendor/') && !f.startsWith('notes/') && f !== 'pnpm-lock.yaml');
  if (files.length === 0) fail(gate, '防空语料：未扫到任何 live 文件');
  else {
    for (const rel of files) {
      const f = join(ROOT, rel);
      if (!existsSync(f)) continue;
      let text;
      try { text = readFileSync(f, 'utf8'); } catch { continue; }
      for (const mm of text.matchAll(/(?<![A-Za-z0-9])[0-9]+ ?(门禁|tests|断言|条源面)/g)) {
        const line = text.slice(0, mm.index).split('\n').length;
        fail(gate, `${rel}:${line} 写死计数"${mm[0]}"——计数有正本（gates 数组 / evaluation §L0 / ls），散文改指正本`);
      }
    }
  }
}

// ── 门禁 31：doc-now-only（live 文档只写 now，不写变更史）──
// 为什么：docs/AGENTS.md §写作规则明令"写当前状态，不写变更史"，但 2026-09-26 清扫实测 live 文档
// 里成片出现"已销账 / 修订 → / 曾用 / 首版…已由…替换"——读者会据此以为旧结论仍有效。
// 范围：live 文档（排除 notes/ 历史层与 vendor/）。豁免两处——① `docs/AGENTS.md`（它是这条规则
// 的家，slop 清单必须能举例禁用词）；② **含本门禁名 `doc-now-only` 的行**（本门禁在
// evaluation.md §L0 的登记行与本节注释都要点名禁用词，否则规则无从表述）。
// 防空语料：0 个文件被检查 → 红。
{
  const gate = 'doc-now-only';
  const r = spawnSync('git', ['ls-files', '*.md'], { cwd: ROOT, encoding: 'utf8' });
  const files = (r.stdout ?? '').split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('vendor/') && !f.startsWith('notes/') && f !== 'docs/AGENTS.md');
  if (files.length === 0) fail(gate, '防空语料：未扫到任何 live 文档');
  else {
    for (const rel of files) {
      const f = join(ROOT, rel);
      if (!existsSync(f)) continue;
      const text = readFileSync(f, 'utf8');
      const lines = text.split('\n');
      for (const mm of text.matchAll(/已销账|修订 →|曾用|首版[^\n]{0,15}已由/g)) {
        const line = text.slice(0, mm.index).split('\n').length;
        if ((lines[line - 1] ?? '').includes('doc-now-only')) continue; // 规则自身的表述行
        fail(gate, `${rel}:${line} 含变更史措辞"${mm[0]}"——live 文档只写 now；历史归 notes/ 与 git`);
      }
    }
  }
}

// ── 门禁 16：secrets-untracked（tracked 清单零敏感/残留物；gitignore 不作用于已跟踪文件）──
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

// ── 门禁 17：role-list-sync（角色清单单一事实源 = 盘上 presets/；代码里出现角色清单字面量 → 红）──
// 检测名从盘上目录现取（门禁自身零硬编码，新角色入列即自动纳入检测）。典型咬合形态：
//   ① 单行 ≥3 个角色名 token（JS 数组 / bash for-in 列表）；② [...] 数组块内 ≥3 个角色名字符串。
// 合法的 ≤2 共现（探针成员名、prompt 覆盖对象逐行键）不触发。消费点应 import scripts/lib/roles.mjs。
{
  const gate = 'role-list-sync';
  const roleNames = readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml')).map((f) => f.replace(/\.patch\.yml$/, ''));
  if (roleNames.length === 0) fail(gate, 'presets/ 下没有任何 <role>.patch.yml（单一事实源为空）');
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

// ── 门禁 18：gate-ledger-sync（docs/evaluation.md §L0 门禁登记表 = 本脚本 gates 数组，不漂移）──
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

// ── 门禁 19：entry-chain（入口链存在性投影——正本 = 根 AGENTS.md §入口链）──
// md-links 已机械覆盖全部 tracked .md 的链接解析；本门禁补它的盲区：① 入口链中以反引号/
// 散文指针提到的成员文件（`docs/design/10-30` 等——md-links 不检非链接形态）必须在场；
// ② roadmap §队列 恰一个 ▶（全仓唯一"当前"指针的存在性与唯一性，D11）。
// 改入口链结构 = 同 diff 更新本清单（成员清单是入口链的存在性投影，非第二正本）。
{
  const gate = 'entry-chain';
  const members = ['AGENTS.md', 'docs/00-index.md', 'roadmap.md', 'notes/proposed',
    'docs/guides/60-dev-loop.md', 'docs/evaluation.md', 'docs/design/10-architecture.md',
    'docs/design/20-roles.md', 'docs/design/30-methodology-mapping.md', 'docs/guides/61-run-playbook.md',
    'docs/guides/62-plugin-authoring.md', 'docs/AGENTS.md', 'scripts/AGENTS.md', 'notes/AGENTS.md',
    'packages/deep-research-pack/AGENTS.md'];
  for (const rel of members) {
    if (!existsSync(join(ROOT, rel))) fail(gate, `入口链成员缺席：${rel}（正本 = AGENTS.md §入口链；改链须同 diff 更新本门禁清单）`);
  }
  if (existsSync(join(ROOT, 'AGENTS.md')) && !/^## 入口链/m.test(readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')))
    fail(gate, 'AGENTS.md 缺 §入口链 标题——入口链定义的家');
  const queue = roadmapQueue();
  if (queue === null) fail(gate, 'roadmap §队列 不可读——入口链第 3 步（唯一"当前"指针）断链');
  else {
    const marks = (queue.match(/▶/g) ?? []).length;
    // parked 态（2026-09-28 首次清空）：零 ▶ + 标记在场 + 无编号条目 = 合法——"当前"指针
    // 停在"待用户取题"；标记与 ▶ 条目并存 = 矛盾态，红。
    if (marks > 1) fail(gate, `roadmap §队列 有 ${marks} 个 ▶——"当前"指针必须唯一（D11）`);
    else if (marks >= 1 && queue.includes(QUEUE_PARKED)) fail(gate, `roadmap §队列 parked 标记与 ▶ 条目并存——矛盾态（队列要么空要么有当前条目）`);
    else if (marks === 0 && !queueParkedState(queue)) fail(gate, `roadmap §队列 无 ▶ 且非 parked 态——全仓唯一"当前"指针缺席（D11；队列空须以 ${QUEUE_PARKED} 行标注且不得残留编号条目）`);
  }
}

// ── 门禁 20：doc-budgets（常驻文档预算——上游 verify-doc-budgets 的等价物：预算由
//    scripts/doc-budgets.json 拥有（不硬编码），登记项必须存在且不超限，仓内新增
//    AGENTS.md 必须登记（缺登记即红）。台账（00-index）与 guides 是生长面，不设顶
//    （vendor "review governs unbudgeted tiers" 同款）。行数 = split('\n') - 1
//    （结尾恰一换行由 md-utf8-newline 保证）；运行区（dev/）与 vendor 不扫。──
{
  const gate = 'doc-budgets';
  const manifestPath = join(ROOT, 'scripts', 'doc-budgets.json');
  if (!existsSync(manifestPath)) fail(gate, 'scripts/doc-budgets.json 缺席——常驻文档预算的 owner');
  else {
    let manifest = {};
    try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
    catch (error) { fail(gate, `doc-budgets.json 不是合法 JSON：${String(error).slice(0, 80)}`); }
    const budgeted = Object.keys(manifest).filter((k) => !k.startsWith('_'));
    for (const rel of budgeted) {
      const f = join(ROOT, rel);
      if (!existsSync(f)) { fail(gate, `${rel}: 已登记预算但文件缺席`); continue; }
      const lines = readFileSync(f, 'utf8').split('\n').length - 1;
      if (lines > manifest[rel]) {
        fail(gate, `${rel} ${lines} 行 > 预算 ${manifest[rel]} 行——处置序：下放/压缩；升顶须改 manifest 并在同一变更登记理由`);
      }
    }
    for (const p of allFiles) {
      const rel = relative(ROOT, p);
      if (!rel.endsWith('AGENTS.md')) continue;
      if (rel.startsWith('dev/') || rel.startsWith('vendor/')) continue;
      if (!Object.hasOwn(manifest, rel)) fail(gate, `${rel}: 常驻指令文件未登记预算（scripts/doc-budgets.json）`);
    }
  }
}

// ── 门禁 3：md-anchors（相对链接的 #fragment 必须在目标文件里真的存在——
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

// ── 门禁 12：dev-skill-format（.agents/skills/ 开发技能的形状——vendor .agents/skills/
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

// ── 门禁 11：note-status（notes/ 的时态与状态面——2026-09-25 用户诉求落地：
//    人一眼看懂、Agent 一眼分辨当前/将来/过去。三条断言：
//    ① notes/ 每个子目录有 README.md（目录自述时态与状态标记方式）；
//    ②③ research/ 断言（状态行 + README 索引对账）条件化保留——research/ 已清并
//       （2026-09-27：目录名=状态，现读作"待研究课题"会误读；五篇报告并入 implemented/），
//       目录重现则断言复活。）──
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

// ── 门禁 11b：note-graduation-rewrite（implemented 活跃 Note 零计划体残留——"毕业 = 正文改写"
//    的机器面，2026-09-27 立项。此前只有 skill 散文约束无机械守卫；roadmap-graduation-drift
//    事故（postmortem 在案）是毕业时序纪律失守的近亲——队列指针半边已有 queue-pointer-live
//    把守，正文改写这半边由此补上。判据窄带（2026-09-27 探针：候选词表对活跃区 31 篇全量
//    零命中零误报——宁窄勿宽，漏报由 graduating-a-queue-item skill 语义兜底）：
//    ① RFC 专有**裸**节名 `## 验收`（implemented 骨架 = 决定/输掉的方案/实际跑过的验证/环境
//       状态；带后缀的历史变体 `## 验收判据`/`## 验收怎么闭的` 是既有事实体形态，不追改）；
//    ② 行内计划体标记：TODO/TBD/待办/待实施/下一步将/接下来将/将迁移/将新增。
//    **引文边界**（实测自指教训：记录本门禁红证的 Note 必然内嵌标记原文——不豁免则门禁咬
//    自己的毕业 Note）：fenced 代码块与反引号内联代码 = 引文非正文语态，剥离后再匹配；
//    裸文本中的标记才红。grandfather 注释件豁免（遗留形态允许骨架不齐）；archived/ 冻结层
//    不扫（快照不追改）；README.md 非毕业件不扫；扫描范围空集即红（防空语料）。──
{
  const gate = 'note-graduation-rewrite';
  const dir = join(ROOT, 'notes', 'implemented');
  if (!existsSync(dir)) {
    fail(gate, 'notes/implemented/ 目录缺席——扫描范围失效（防空语料）');
  } else {
    const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
    if (files.length === 0) {
      fail(gate, 'notes/implemented/ 扫描范围为空——门禁失去保护面（防空语料），检查目录是否被误清');
    }
    const markers = [
      ['RFC 裸节名 ## 验收', /^##\s*验收\s*$/],
      ['计划体标记 TODO', /TODO/],
      ['计划体标记 TBD', /TBD/],
      ['计划体标记 待办', /待办/],
      ['计划体标记 待实施', /待实施/],
      ['计划体标记 下一步将', /下一步将/],
      ['计划体标记 接下来将', /接下来将/],
      ['计划体标记 将迁移', /将迁移/],
      ['计划体标记 将新增', /将新增/],
    ];
    for (const f of files) {
      const text = readFileSync(join(dir, f), 'utf8');
      if (/<!--\s*grandfather:/.test(text)) continue;
      const lines = text.split('\n');
      let inFence = false;
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (raw.trimStart().startsWith('```')) { inFence = !inFence; continue }
        if (inFence) continue;
        // 剥离反引号内联代码（引文非正文）后再匹配；行号 = 原文真实行号。
        const bare = raw.replace(/`[^`]*`/g, '');
        for (const [label, re] of markers) {
          if (re.test(bare)) {
            fail(gate, `notes/implemented/${f}:${i + 1} 命中${label}——计划体残留。毕业 = 正文改写（计划体 → 已交付事实体，删未来时态/待办清单；见 .agents/skills/graduating-a-queue-item），只改路径不改正文 = 未来计划伪装成当前事实`);
          }
        }
      }
    }
  }
}

// ── 门禁 21：align-ledger（对齐台账机读对账——docs/alignment-ledger.json 与 vendor 本体、
//    与本仓落点三方核对：① 每条 source 在 vendor/dsh 真实存在（换 pin 后文件移位/删除即红
//    = 重审触发器）；② verdict=adopted/adapted 的每处 landing 在仓内存在；③ na 必须给理由。
//    人读视图 = docs/discipline-map.md 源 1–9；本门禁只判存在性，不判语义对错。）──
{
  const gate = 'align-ledger';
  const manifestPath = join(ROOT, 'docs', 'alignment-ledger.json');
  if (!existsSync(manifestPath)) fail(gate, 'docs/alignment-ledger.json 缺席——对齐台账的机读正本');
  else {
    let ledger = null;
    try { ledger = JSON.parse(readFileSync(manifestPath, 'utf8')); }
    catch (error) { fail(gate, `alignment-ledger.json 不是合法 JSON：${String(error).slice(0, 80)}`); }
    const sources = ledger?.sources;
    if (!Array.isArray(sources) || sources.length === 0) fail(gate, 'alignment-ledger.json 缺 sources 数组或为空');
    else {
      const seen = new Set();
      for (const entry of sources) {
        const src = entry?.source;
        if (typeof src !== 'string' || src.length === 0) { fail(gate, '条目缺 source 字符串'); continue; }
        if (seen.has(src)) fail(gate, `source 重复登记：${src}`);
        seen.add(src);
        if (!existsSync(join(ROOT, 'vendor', 'dsh', src))) {
          fail(gate, `${src}: vendor/dsh 里不存在（换 pin 后源文件移位/删除？重审触发——见 discipline-map §重审触发路径）`);
        }
        const verdict = entry.verdict;
        if (!['adopted', 'adapted', 'na'].includes(verdict)) { fail(gate, `${src}: verdict 值域外（adopted/adapted/na）`); continue; }
        if (verdict === 'na') {
          if (typeof entry.reason !== 'string' || entry.reason.trim() === '') fail(gate, `${src}: verdict=na 必须给 reason`);
          continue;
        }
        const landing = entry.landing;
        if (!Array.isArray(landing) || landing.length === 0) { fail(gate, `${src}: verdict=${verdict} 必须给 landing（落点路径）`); continue; }
        for (const rel of landing) {
          if (typeof rel !== 'string' || !existsSync(join(ROOT, rel))) fail(gate, `${src}: 落点不存在 → ${String(rel)}`);
        }
      }
      note(gate, `${sources.length} 条源面已对账（vendor 存在性 + 落点存在性 + na 理由）`);
      // 覆盖断言（防空集/防漏登记）：结构面必须逐条登记——vendor 的每个 AGENTS.md（不含
      // snapshots/session 夹具）与每个开发技能 SKILL.md、顶层 docs/*.md（非 .zh.md 副本）、
      // docs/cookbook/*.md（非副本）、以及若干根文件。双语副本按类登记（见台账 _note）。
      {
        const V = join(ROOT, 'vendor', 'dsh');
        const must = [];
        const walkV = (dir) => {
          for (const ent of readdirSync(dir, { withFileTypes: true })) {
            if (ent.name === 'node_modules' || ent.name === '.git') continue;
            const p = join(dir, ent.name);
            if (ent.isDirectory()) { if (p.includes(join('snapshots', 'session'))) continue; walkV(p); }
            else if (ent.name === 'AGENTS.md') must.push(relative(V, p));
          }
        };
        if (existsSync(V)) walkV(V);
        const skillsDir = join(V, '.agents', 'skills');
        if (existsSync(skillsDir)) {
          for (const d of readdirSync(skillsDir, { withFileTypes: true })) {
            if (d.isDirectory() && existsSync(join(skillsDir, d.name, 'SKILL.md'))) must.push(`.agents/skills/${d.name}/SKILL.md`);
          }
        }
        for (const sub of ['docs', join('docs', 'cookbook')]) {
          const dir = join(V, sub);
          if (!existsSync(dir)) continue;
          for (const f of readdirSync(dir)) {
            if (f.endsWith('.md') && !f.endsWith('.zh.md')) must.push(`${sub}/${f}`);
          }
        }
        for (const rel of ['package.json', '.editorconfig', '.gitattributes', 'lefthook.yml', 'vendor/README.md', 'snapshots/AGENTS.md', '.github/AGENTS.md', 'packages/README.md', 'scripts/run-gates.ts', 'scripts/doc-budgets.manifest.json']) {
          if (existsSync(join(V, rel))) must.push(rel);
        }
        const missing = [...new Set(must)].filter((m) => !seen.has(m));
        if (must.length < 20) fail(gate, `覆盖断言自检：待覆盖源只有 ${must.length} 条（防空集——vendor 树或扫描范围被改坏？）`);
        for (const m of missing.slice(0, 8)) fail(gate, `未登记：${m}（结构面须逐条进台账；新增上游子树/技能时同 diff 登记）`);
        if (missing.length > 8) fail(gate, `另有 ${missing.length - 8} 条未登记（见上）`);
      }
    }
  }
}

// ── 门禁 22：repo-conventions（与 vendor 本体的机械约定逐条对齐——vendor 树是唯一证据源，
//    故 engines 直接与 vendor/dsh/package.json 比较：换 pin 后不一致即红。文本形态两条
//    （.editorconfig / .gitattributes）与暂存面 whitespace 检查同属"仓库正本形态"约定。）──
{
  const gate = 'repo-conventions';
  const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : null);
  const editorconfig = read('.editorconfig');
  if (editorconfig === null) fail(gate, '.editorconfig 缺席（编辑器侧文本约定；vendor/dsh/.editorconfig 吸纳）');
  else {
    for (const needle of ['root = true', 'end_of_line = lf', 'insert_final_newline = true']) {
      if (!editorconfig.includes(needle)) fail(gate, `.editorconfig 缺 "${needle}"`);
    }
  }
  const gitattributes = read('.gitattributes');
  if (gitattributes === null) fail(gate, '.gitattributes 缺席（仓库正本形态 = LF；byte 级门禁的前提）');
  else if (!/^\* text=auto eol=lf$/m.test(gitattributes)) fail(gate, '.gitattributes 缺 "* text=auto eol=lf"');
  const vendorPkg = join(ROOT, 'vendor', 'dsh', 'package.json');
  if (!existsSync(vendorPkg)) fail(gate, 'vendor/dsh/package.json 缺席——engines 对齐无证据源');
  else {
    const want = JSON.parse(readFileSync(vendorPkg, 'utf8'))?.engines?.node;
    const got = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))?.engines?.node;
    if (typeof want !== 'string') fail(gate, 'vendor/dsh/package.json 无 engines.node——对齐基准缺失');
    else if (got !== want) fail(gate, `package.json engines.node = ${JSON.stringify(got)} ≠ vendor ${JSON.stringify(want)}（机制基线源码启动的 engines 区间必须与 vendor 一致）`);
  }
  // 子进程凭据卫生（vendor docs/defensive-patterns.md §27-29）：spawn 的 env 必须洗过，
  // 禁止整体透传 process.env；白名单条目只能在调用点显式写（scripts/lib/env.mjs）。
  if (!existsSync(join(ROOT, 'scripts', 'lib', 'env.mjs'))) fail(gate, 'scripts/lib/env.mjs 缺席（子进程 env 清洗助手）');
  for (const ent of readdirSync(join(ROOT, 'scripts'), { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.mjs')) continue;
    const text = readFileSync(join(ROOT, 'scripts', ent.name), 'utf8');
    if (/env:\s*\{\s*\.\.\.process\.env/.test(text)) {
      fail(gate, `scripts/${ent.name}: spawn env 整体透传 process.env——改用 scripts/lib/env.mjs 的 scrubbedEnv/withModelKey（凭据卫生）`);
    }
  }
  const hook = read('dev/hooks/pre-commit');
  if (hook === null) fail(gate, 'dev/hooks/pre-commit 缺席');
  else if (!hook.includes('git diff --cached --check')) fail(gate, 'pre-commit 缺 git diff --cached --check（暂存面空白/冲突标记检查，vendor lefthook whitespace 作业）');
}

// ── 门禁 23：vendor-links（vendored 解析的机械面——vendor/README.md 的 verify-vendored-links
//    等价物；E1 事故的教训：registry 副本一旦混进闭包，机制基线的行为就与本仓 vendor 树脱钩。
//    ① 根 package.json 的每个 @deepseek-ai/* devDependency 在 lockfile importer 里解析为
//       link:vendor/dsh/...；② overrides 三件套（cordis/cosmokit/schemastery）不得有 registry
//       包条目；③ 防空语料：link:vendor/dsh/ 出现 0 次即红。）──
{
  const gate = 'vendor-links';
  const lockPath = join(ROOT, 'pnpm-lock.yaml');
  const pkgPath = join(ROOT, 'package.json');
  if (!existsSync(lockPath)) fail(gate, 'pnpm-lock.yaml 缺席');
  else if (!existsSync(pkgPath)) fail(gate, 'package.json 缺席');
  else {
    const lock = readFileSync(lockPath, 'utf8');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const links = lock.match(/link:vendor\/dsh\//g) ?? [];
    if (links.length === 0) fail(gate, 'lockfile 里 link:vendor/dsh/ 出现 0 次——vendored 解析面为空（防空语料）');
    const lockLines = lock.split('\n');
    const deps = Object.keys(pkg.devDependencies ?? {}).filter((d) => d.startsWith('@deepseek-ai/'));
    for (const dep of deps) {
      const i = lockLines.findIndex((l) => l.trim() === `'${dep}':`);
      if (i === -1) {
        fail(gate, `${dep}: lockfile importer 无该 devDependency 条目（lock 与 package.json 不同步？跑 pnpm install）`);
        continue;
      }
      if (!/version: link:vendor\/dsh\//.test(lockLines.slice(i, i + 4).join('\n'))) {
        fail(gate, `${dep}: 未解析为 link:vendor/dsh/...（registry 副本混入闭包？E1 事故再现——见 vendor/README.md 的 vendored 链接规则）`);
      }
    }
    for (const name of ['cordis', 'cosmokit', 'schemastery']) {
      if (new RegExp(`^  /?@deepseek-ai/${name}@\\d`, 'm').test(lock)) {
        fail(gate, `lockfile 里有 @deepseek-ai/${name} 的 registry 版本条目——overrides 的 link: 钉法失效`);
      }
    }
  }
}

// ── 门禁 24：overlay-fresh（源码域 overlay 是**生成物**——由 dev/render-overlay.mjs 从 pack
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
// ── 门禁 26：pack 工作区种子新鲜度（sync-pack-workspace --check）：手册/模板是会话 cwd 的内容，
// pack 必须自带（否则部署方装了包也没有研究纪律）。正本 = research-workspace/，
// 种子 = pack workspace/（生成物，勿手改；漂移即红——与 overlay-fresh 同形态）。
{
  const gate = 'pack-workspace-fresh';
  const r = spawnSync(process.execPath, ['dev/sync-pack-workspace.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    const first = `${r.stderr ?? ''}${r.stdout ?? ''}`.trim().split('\n').filter(Boolean)[0];
    fail(gate, first ?? 'pack workspace/ 种子与 research-workspace/ 正本漂移——跑 `node dev/sync-pack-workspace.mjs` 重同步');
  }
}

// ── 门禁 25：client-keys（观察面 client 的 keyed 字面量单一正本——company 坑 1：
//    "a typo simply never renders"，key 拼错不报错永不渲染。规则：① key/槽名字面量只许住
//    src/client/keys.ts（别处出现即红——杜绝第二份会漂移的清单）；② slots.inject 的第一参、
//    register 描述符的 name/key/id 只许用标识符（引号字面量即红），且必须出自 keys.ts 的导出；
//    ③ keys.ts 至少一个导出、src/client 至少一个文件（防空集——D18 边界内 client 面常在）。）──
{
  const gate = 'client-keys';
  const clientDir = join(PACK, 'src', 'client');
  if (!existsSync(clientDir)) { fail(gate, 'packages/deep-research-pack/src/client/ 缺席（D18：观察面 client 面常在）'); }
  else {
    const files = readdirSync(clientDir).filter((f) => /\.(ts|tsx)$/.test(f));
    if (files.length === 0) fail(gate, 'src/client/ 无 .ts/.tsx（防空集：D18 边界内 client 面常在）');
    const keysFile = files.includes('keys.ts') ? readFileSync(join(clientDir, 'keys.ts'), 'utf8') : '';
    if (!files.includes('keys.ts')) fail(gate, 'src/client/ 缺 keys.ts（keyed 字面量的唯一正本）');
    else {
      const keyExports = new Set([...keysFile.matchAll(/export const (\w+) = '/g)].map((m) => m[1]));
      if (keyExports.size === 0) fail(gate, 'keys.ts 无 `export const X = \x27…\x27` 导出（防空集）');
      for (const f of files) {
        if (f === 'keys.ts') continue;
        const text = readFileSync(join(clientDir, f), 'utf8');
        // ① 槽名/包键字面量只许住 keys.ts。**类型位豁免**：PropsRuntime<'…'> 的泛型参数是
        //    编译期对 SlotMap 键检查的（拼错 = TS 红），不是本门禁要防的值位静默失效面——
        //    先抹掉类型位再扫（边界形态实证：Stage 2 的 PropsRuntime 用法被本门禁误咬，
        //    2026-09-25 收窄）。
        const valuePositionText = text.replace(/PropsRuntime<[^>]*>/g, '')
        for (const m of valuePositionText.matchAll(/['"](sidebar\.right\.[a-z.]+|dsh-deep-research-pack\/[a-z-]+)['"]/g))
          fail(gate, `src/client/${f}: keyed 字面量 ${m[1]} 出现在 keys.ts 之外（单一正本 = keys.ts，用导出的常量）`);
        // ② inject 首参与描述符 name/key/id 只许标识符，且出自 keys.ts
        for (const m of text.matchAll(/slots\.inject\(\s*(['"][^'"]+['"])/g))
          fail(gate, `src/client/${f}: slots.inject 首参是字面量 ${m[1]}——须用 keys.ts 导出的常量（拼错即永不渲染）`);
        for (const m of text.matchAll(/\b(name|key|id):\s*(['"][^'"]+['"])/g)) {
          if (/^(name|key|id)$/.test(m[1]) && /sidebar\.right\.|dsh-deep-research-pack\//.test(m[2]))
            fail(gate, `src/client/${f}: 描述符 ${m[1]}: 是 keyed 字面量 ${m[2]}——须用 keys.ts 导出的常量`);
        }
        for (const m of text.matchAll(/slots\.inject\(\s*(\w+)\s*[,)]/g))
          if (!keyExports.has(m[1])) fail(gate, `src/client/${f}: slots.inject(${m[1]}) 的标识符不在 keys.ts 导出里`);
        for (const m of text.matchAll(/\b(?:name|key|id):\s*(\w+)\s*[,}]/g)) {
          if (/^(RESEARCH|TAB|PANE|KEY|SLOT)/.test(m[1]) && !keyExports.has(m[1]))
            fail(gate, `src/client/${f}: 描述符用的 ${m[1]} 不在 keys.ts 导出里`);
        }
      }
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
