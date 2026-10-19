#!/usr/bin/env node
// verify.mjs — L0 结构门禁（keyless，零依赖）。
// 门禁登记表（正本）：docs/evaluation.md §L0——与本脚本 gates 数组经门禁 gate-ledger-sync
// 机械对账（登记与实现漂移即红）；每条门禁的反证记录 = 表末列所指 notes/。
// 组织：门禁按域分组（A md 文档卫生 / B pack 驾驶舱 / C notes 技能 / D vendor 对齐 /
// E 工作区生成物 / F 仓规环境），gates 数组与文件块同序；块内头注 = 设计依据与实证出处。
// 移植自 ai_dsh_company/scripts/verify.mjs（按当前规模裁剪；vendor-pin/client-half/proposal
// 全量版随对应能力落地启用，见对应 owner 文档。

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, lstatSync, readlinkSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { backlogLivenessProblems } from '../lib/backlog-liveness.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** 极简 glob（align-ledger 的 na 活性检查用）：`**` 匹配任意层段，`*` 匹配段内任意字符。
 *  仓内路径统一按 `/` 规范化后再比——不引第三方 glob 依赖（stdlib-only 分层纪律）。 */
function matchSimpleGlob(pathStr, pattern) {
  const norm = pathStr.split('\\').join('/');
  const rx = pattern
    .split('\\').join('/')
    // `?` 必须转义（2026-10-08 二轮自审抓获）：漏了它会变成正则量词——`a?b` 匹配 `ab`、
    // 反而不匹配 `axb`，静默错误。**本匹配器不支持 `?` 单字符语义**（转义后按字面量处理，
    // 故 `a?b` 只匹配字面 `a?b`）——这是刻意的保守选择：宁可少匹配也不静默错配。
    // 当前所有 glob 全是 `*` 形态，未用到 `?`。
    .replace(/[.+^${}()|[\]\\?]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*');
  return new RegExp(`^${rx}$`).test(norm);
}
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const PRESETS = join(PACK, 'presets');

// 实际门禁名集合（gate-ledger-sync 与 docs/evaluation.md §L0 登记表对账——集合比对，不序；
// 新增门禁两处同步）。数组与文件块同按域分组（A–F）排序，域横幅见各节。
const gates = [
  'md-utf8-newline', 'md-links', 'md-anchors', 'archived-note-pointer', 'count-free', 'doc-now-only', 'doc-budgets',
  'preset-structure', 'pack-bundle-compat', 'client-half', 'row-deps', 'pack-contract-sync', 'role-list-sync', 'client-keys', 'client-effect-wrap', 'cockpit-doc-registry',
  'note-format', 'note-status', 'note-graduation-rewrite', 'dev-skill-format', 'proposed-pointer-live',
  'vendor-pin', 'vendor-clean', 'pin-agreement', 'align-ledger', 'repo-conventions', 'vendor-links',
  'workspace-contract', 'handbook-budget', 'workspace-versioning', 'overlay-fresh', 'pack-workspace-fresh', 'dist-manual-version',
  'claude-symlink', 'secrets-untracked', 'guard-red-record', 'gate-ledger-sync', 'entry-chain', 'backlog-liveness', 'port-exclusive', 'hooks-active',
];

// vendor/dsh 钉身份的 tag 面（commit 面 = vendor-pin 门禁的 PIN；pack-bundle-compat 消费它
// 断言 pack 兼容矩阵含当前 tag——升 pin 时两处同 diff 改；本文件里的 tag 复述受 pin-agreement 对账）
const VENDOR_TAG = 'dsh-v0.2.1-rc.2';

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

/** git 子进程缓存（gitOnce）：同参数只起一个进程——本脚本多处 git spawn 是五组完全相同的
 *  参数（ls-files 族 + submodule status），逐门禁各起一个纯属重复。**精确保形**：参数与
 *  选项原样（不注入 quotepath、不剥 env——需要特形 env 的 spawn 不走本助手），返回原始
 *  结果对象，各门禁保留自己的 fail-loud 判定与消息——本助手只去重子进程，不改任何语义。 */
const gitSpawnCache = new Map();
function gitOnce(args) {
  const key = args.join('\u0000');
  if (!gitSpawnCache.has(key)) gitSpawnCache.set(key, spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' }));
  return gitSpawnCache.get(key);
}


// ══ 域 A · md 文档卫生（tracked .md 的字节/链接/锚点/措辞合同） ══

// ── md-utf8 / newline（所有 tracked .md 严格 UTF-8、恰一个结尾换行；git
//    ls-files 驱动——运行区（gitignored bundle/profile 镜像）不扫，研究手册合同既有；
//    旧版全树 walk 曾被 live run 的 leads.md 双尾换行咬红，2026-09-24 修正范围）──
{
  const gate = 'md-utf8-newline';
  const r = gitOnce(['ls-files', '*.md']);
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

// ── md-links（所有 tracked .md 的相对链接必须可解析且目标被 git 跟踪；git ls-files 驱动——基础整治 C10）──
// 原版只扫具名目录（docs/notes/…），根目录其余 tracked .md 逃检——本单子文件初稿 31 条死链
// 同刻全绿即实证。覆盖面 = tracked 集合（新文件 git add 后纳入）；反引号裸路径不检（设计）。
// BUG-016 加宽（2026-10-07）：链接目标**盘上存在但未被 git 跟踪**同样红——旧判据查盘上
// 存在性，绿色依赖机器状态（本机有归档产物就绿，fresh clone 即红，_done/_reference 摘要
// 链接 research-workspace/archive/ 实证）。链接语法 = 仓内可解析承诺；引用运行区/本机数据
// 请用反引号散文路径。目录目标按"其下有 tracked 文件"判。
{
  const gate = 'md-links';
  // quotepath=false（2026-10-07 ls-files 族收口同款）：非 ASCII 路径（_dist/安装手册.md）的
  // 引号转义会让 tracked 集合查不到 → 假红；旧版未加此参时该文件被 existsSync 跳过 = 静默漏扫
  const r = gitOnce(['-c', 'core.quotepath=false', 'ls-files', '*.md']);
  if (r.status !== 0) {
    fail(gate, `git ls-files 不可用（${String(r.stderr).slice(0, 120)}）——本门禁覆盖面依赖仓库态，fail-loud`);
  } else {
    const lsAll = gitOnce(['-c', 'core.quotepath=false', 'ls-files']);
    if (lsAll.status !== 0) fail(gate, 'git ls-files（全量）不可用——tracked 目标判定失效，fail-loud');
    const trackedAll = new Set(lsAll.stdout.split('\n').filter(Boolean));
    const isTrackedTarget = (abs) => {
      const rel = relative(ROOT, abs);
      if (rel.startsWith('..')) return true; // 仓外绝对路径目标（罕见）不在此门禁判
      if (trackedAll.has(rel)) return true;
      try {
        if (statSync(abs).isDirectory()) {
          const prefix = rel.endsWith('/') ? rel : `${rel}/`;
          for (const t of trackedAll) if (t.startsWith(prefix)) return true;
        }
      } catch { /* 目标不存在由存在性断言管 */ }
      return false;
    };
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
          else if (!isTrackedTarget(abs)) fail(gate, `${rel}: 链接目标未被 git 跟踪 → ${target}（链接语法 = 仓内可解析承诺；运行区/本机数据引用请用反引号路径——BUG-016）`);
        }
      }
    }
  }
}

// ── md-anchors（相对链接的 #fragment 必须在目标文件里真的存在——
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
  const r = gitOnce(['ls-files', '*.md']);
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

// ── archived-note-pointer（归档判定的可复核面——notes-stocktake 体检
//    （_backlog/_archived/research/2026-10-08-notes-stocktake.md）结论"归档判据在本仓不可靠"的机械
//    切片：活面（notes/archived/ 之外的 tracked .md）以 Markdown 链接引用
//    notes/archived/<具体 Note> 前，必须在 scripts/archived-note-pointers.json 登记
//    （历史指针类，逐条带理由——登记动作 = 活面显式承认"我在引用冻结件"；被引用还想归档
//    的 Note 由此在对账面上现形，进门条件 2 的语义判断保留给人）。红 = ①未登记的
//    活面→archived 链接；②登记条目失真（源文件已无此链接）；③登记条目失存（源/目标不在
//    盘上、未跟踪、目标不在 archived）；④archived 语料非空但活面扫描集为空（范围收窄
//    防空）。notes/archived/README.md 索引导航豁免。反引号裸路径不检（与 md-links 同边界
//    ——wide 盘点另行决定）。──
{
  const gate = 'archived-note-pointer';
  const regPath = join(ROOT, 'scripts', 'archived-note-pointers.json');
  const ls = gitOnce(['-c', 'core.quotepath=false', 'ls-files', '*.md']);
  if (ls.status !== 0) {
    fail(gate, `git ls-files 不可用（${String(ls.stderr).slice(0, 120)}）——本门禁覆盖面依赖仓库态，fail-loud`);
  } else if (!existsSync(regPath)) {
    fail(gate, 'scripts/archived-note-pointers.json 缺席——登记簿是本门禁的判定面，fail-loud');
  } else {
    const all = ls.stdout.split('\n').filter(Boolean);
    const archived = all.filter((p) => p.startsWith('notes/archived/') && p.endsWith('.md') && !p.endsWith('README.md'));
    const live = all.filter((p) => !p.startsWith('notes/archived/'));
    if (archived.length === 0) {
      fail(gate, 'notes/archived/ 零 Note——冻结语料为空，本门禁失去把守对象（真清空须同变更退役本门禁，不许静默空转）');
    } else if (live.length === 0) {
      fail(gate, '活面 .md 扫描集为空而 archived 语料非空——tracked 范围被收窄，fail-loud');
    }
    // 观测集：活面 Markdown 链接解析进 archived 的 (源, 目标) 对（代码围栏外；README 豁免）
    const observed = new Map();
    for (const rel of live) {
      const f = join(ROOT, rel);
      if (!existsSync(f)) continue; // 稀疏态防御
      const text = readFileSync(f, 'utf8');
      let inFence = false;
      for (const line of text.split('\n')) {
        if (line.trimStart().startsWith('```')) { inFence = !inFence; continue; }
        if (inFence) continue;
        for (const m of line.matchAll(/\[[^\]]*\]\(<?([^)\s]+?)>?(?:\s+"[^"]*")?\)/g)) {
          let t = m[1];
          if (/^[a-z]+:/i.test(t)) continue; // URL / mailto
          t = t.split('#')[0];
          if (!t) continue; // 纯锚
          const relTarget = relative(ROOT, resolve(dirname(f), t)).split(sep).join('/');
          if (relTarget.startsWith('..')) continue; // 仓外目标不判
          if (!relTarget.startsWith('notes/archived/') || !relTarget.endsWith('.md') || relTarget.endsWith('README.md')) continue;
          const key = `${rel}\u0000${relTarget}`;
          observed.set(key, (observed.get(key) ?? 0) + 1);
        }
      }
    }
    let entries;
    try { entries = JSON.parse(readFileSync(regPath, 'utf8')).pointers; } catch (e) {
      fail(gate, `登记簿不可解析（${String(e).slice(0, 80)}）`);
      entries = null;
    }
    if (entries !== null) {
      if (!Array.isArray(entries)) fail(gate, '登记簿 pointers 不是数组');
      const registered = new Set();
      for (const [i, e] of entries.entries()) {
        if (typeof e?.source !== 'string' || typeof e?.target !== 'string' || typeof e?.reason !== 'string' || !e.reason.trim()) {
          fail(gate, `登记簿第 ${i + 1} 条形状非法（需 source/target/reason 且 reason 非空）`);
          continue;
        }
        if (e.source.startsWith('notes/archived/')) fail(gate, `登记条目源在 archived 内（登记簿只收活面）：${e.source}`);
        const key = `${e.source}\u0000${e.target}`;
        registered.add(key);
        if (!all.includes(e.source)) fail(gate, `登记条目失存（源不在 tracked .md）：${e.source} → ${e.target}`);
        if (!archived.includes(e.target)) {
          fail(gate, `登记条目失存（目标不在 notes/archived/）：${e.source} → ${e.target}（Note 复活/移位时同步登记簿）`);
        }
      }
      for (const [key, count] of observed) {
        if (!registered.has(key)) {
          const [s, t] = key.split('\u0000');
          fail(gate, `${s}: 未登记的活面→archived 链接 → ${t}（×${count}）——归档前解除引用，或在 scripts/archived-note-pointers.json 登记为历史指针（带理由）`);
        }
      }
      for (const key of registered) {
        if (!observed.has(key)) {
          const [s, t] = key.split('\u0000');
          fail(gate, `登记条目失真（源文件已无此链接）：${s} → ${t}——更新或删除该条目`);
        }
      }
    }
  }
}

// ── count-free（live 文档不写硬编码计数）──
// 为什么：门禁数 / tests 数 / 断言数是最易腐的一类自指事实（2026-09-26 清扫实测 5 处写错：
// tests 数 ×2、note 篇数、源面条数、门禁数——本注释原先照抄这些数字，被本门禁自己咬红，
// 即为它有效的第一份证据）。计数有正本（gates 数组 / evaluation 台账 / ls），散文里的副本
// 只会腐烂——一律改成"查正本"。
// 范围：live 文件（排除 notes/ 历史层与 vendor/）。防空语料：0 个文件被检查 → 红。
{
  const gate = 'count-free';
  // 同族收口（2026-10-07 ls-files 清扫）：quotepath=false + 缺席/不可读 fail-loud + 目录型 symlink 放行
  const r = gitOnce(['-c', 'core.quotepath=false', 'ls-files']);
  const files = (r.stdout ?? '').split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('vendor/') && !f.startsWith('notes/') && f !== 'pnpm-lock.yaml');
  if (files.length === 0) fail(gate, '防空语料：未扫到任何 live 文件');
  else {
    for (const rel of files) {
      const f = join(ROOT, rel);
      if (!existsSync(f)) { fail(gate, `tracked 文件 ${rel} 盘上缺席——迁移/清扫残留态，fail-loud`); continue; }
      if (statSync(f).isDirectory()) continue; // 目录型 symlink（.claude/skills）非文本面
      let text;
      try { text = readFileSync(f, 'utf8'); } catch (e) { fail(gate, `tracked 文件 ${rel} 不可读（${e.code || e.message}）——fail-loud`); continue; }
      for (const mm of text.matchAll(/(?<![A-Za-z0-9])[0-9]+ ?(门禁|tests|断言|条源面)/g)) {
        const line = text.slice(0, mm.index).split('\n').length;
        fail(gate, `${rel}:${line} 写死计数"${mm[0]}"——计数有正本（gates 数组 / evaluation §L0 / ls），散文改指正本`);
      }
    }
  }
}

// ── doc-now-only（live 文档只写 now，不写变更史）──
// 为什么：docs/AGENTS.md §写作规则明令"写当前状态，不写变更史"，但 2026-09-26 清扫实测 live 文档
// 里成片出现"已销账 / 修订 → / 曾用 / 首版…已由…替换"——读者会据此以为旧结论仍有效。
// 范围：live 文档（排除 notes/ 历史层与 vendor/）。豁免两处——① `docs/AGENTS.md`（它是这条规则
// 的家，slop 清单必须能举例禁用词）；② **含本门禁名 `doc-now-only` 的行**（本门禁在
// evaluation.md §L0 的登记行与本节注释都要点名禁用词，否则规则无从表述）。
// 防空语料：0 个文件被检查 → 红。
{
  const gate = 'doc-now-only';
  // 同族收口（2026-10-07 ls-files 清扫）：quotepath=false（非 ASCII 的 .md 曾被整体跳过，
  // _dist/安装手册.md 实测）+ 缺席/不可读 fail-loud + 目录型 symlink 放行
  const r = gitOnce(['-c', 'core.quotepath=false', 'ls-files', '*.md']);
  const files = (r.stdout ?? '').split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('vendor/') && !f.startsWith('notes/') && f !== 'docs/AGENTS.md');
  if (files.length === 0) fail(gate, '防空语料：未扫到任何 live 文档');
  else {
    for (const rel of files) {
      const f = join(ROOT, rel);
      if (!existsSync(f)) { fail(gate, `tracked 文件 ${rel} 盘上缺席——迁移/清扫残留态，fail-loud`); continue; }
      if (statSync(f).isDirectory()) continue; // 目录型 symlink（.claude/skills）非文本面
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

// ── doc-budgets（常驻文档预算——上游 verify-doc-budgets 的等价物：预算由
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
    // AGENTS.md 枚举 = tracked-only（git ls-files；md-links 族同款 quotepath=false）。
    // 2026-10-08 收口（审计 P3 件④）：原 walk(ROOT) 无差别枚举把 gitignored 运行区卷进
    // 预算登记面——release-smoke probeWs 直接铺工作区（非 node_modules 层）的 AGENTS.md
    // 实测误红（runtime/smoke-workspace 探针复现）。范围纪律正解 = 覆盖面跟 tracked 走。
    const lsAgents = spawnSync('git', ['-c', 'core.quotepath=false', 'ls-files', '*AGENTS.md'], { cwd: ROOT, encoding: 'utf8' });
    if (lsAgents.status !== 0) fail(gate, `git ls-files 不可用（${String(lsAgents.stderr).slice(0, 120)}）——覆盖面依赖仓库态，fail-loud`);
    for (const rel of lsAgents.stdout.split('\n').filter(Boolean)) {
      if (rel.startsWith('dev/') || rel.startsWith('vendor/')) continue;
      if (!Object.hasOwn(manifest, rel)) fail(gate, `${rel}: 常驻指令文件未登记预算（scripts/doc-budgets.json）`);
    }
  }
}

// ══ 域 B · pack 与驾驶舱（preset 形状/pack 声明/client 半/槽与登记合同） ══

// ── preset 结构（0.1.7 形态：presets/<role>.patch.yml 一条 @deepseek-ai/dsh-agent-preset
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

// ── pack-bundle / compat（dsh.bundle.patch 指向真实文件；dshReleases 非空）──
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
    // 含当前 tag（release-smoke-hardening 件⑤b）：升 pin 忘把新 tag 加进兼容矩阵，原本要到
    // L2 安装冒烟才现形——提前到 L0 秒级红（判据同 release-smoke ④，事实源前移到 verify）。
    else if (!rel.includes(VENDOR_TAG))
      fail(gate, `compatibility.dshReleases 不含当前 vendor tag ${VENDOR_TAG}——升 pin 忘加列（补 packages/deep-research-pack/package.json 的 dsh.compatibility.dshReleases）`);
  }
}

// ── client-half（pack 的 client 半声明闭环——release-smoke-hardening 件⑤a）──
// 为什么：vendor 的 validateClientHalvesDeclared() 只 glob vendor 树内 packages/client/*，仓外
// pack 的 client 半在它射程外（company postmortem 0002 §Why every safety net missed it：上游
// 门禁有 scope，out-of-tree pack 落在外面——本地镜像同款规则）。任一方向脱钩都是静默失效：
// 有 exports 无声明 = 浏览器模块表永不枚举（client 半等于不存在）；有声明无 exports = 装载
// 入口缺席。本门禁守声明面；真实安装形状（lib/client.js 在场）归 L2 release-smoke。
{
  const gate = 'client-half';
  const pkgPath = join(PACK, 'package.json');
  if (!existsSync(pkgPath)) fail(gate, 'deep-research-pack/package.json 不存在');
  else {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const exportsClient = pkg?.exports?.['./client'] !== undefined;
    const declaresClient = pkg?.dsh?.client !== undefined;
    if (exportsClient && !declaresClient)
      fail(gate, 'exports ./client 但未声明 dsh.client——浏览器模块表永不枚举本包 client 半（补 package.json 的 dsh.client 声明；company postmortem 0002 同款）');
    else if (declaresClient && !exportsClient)
      fail(gate, '声明 dsh.client 但 exports 无 ./client——client 半无装载入口（补 exports 的 "./client" 行）');
  }
}

// ── row-deps（preset 与 bundle 行引用的 @deepseek-ai/* 包必须在 peerDependencies）──
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

// ── pack-contract-sync（pack 的 tracked yml/md 零 runs/ 旧契约路径——persona
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

// ── role-list-sync（角色清单单一事实源 = 盘上 presets/；代码里出现角色清单字面量 → 红）──
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

// ── client-keys（观察面 client 的 keyed 字面量单一正本——company 坑 1：
//    "a typo simply never renders"，key 拼错不报错永不渲染。规则：① src/client/ 下任意层级的
//    key/槽名字面量只许住 src/client/keys.ts（别处出现即红——杜绝第二份会漂移的清单）；② slots.inject 的第一参，
//    register 描述符的 name/key/id 只许用标识符（引号字面量即红），且必须出自 keys.ts 的导出；
//    ③ keys.ts 至少一个导出、src/client 至少一个文件（防空集——D18 边界内 client 面常在）。）──
{
  const gate = 'client-keys';
  const clientDir = join(PACK, 'src', 'client');
  if (!existsSync(clientDir)) { fail(gate, 'packages/deep-research-pack/src/client/ 缺席（D18：观察面 client 面常在）'); }
  else {
    const files = walk(clientDir).filter((abs) => /\.(ts|tsx)$/.test(abs)).map((abs) => relative(clientDir, abs));
    if (files.length === 0) fail(gate, 'src/client/ 无 .ts/.tsx（防空集：D18 边界内 client 面常在）');
    const keysPath = join(clientDir, 'keys.ts');
    const keysFile = existsSync(keysPath) ? readFileSync(keysPath, 'utf8') : '';
    if (!existsSync(keysPath)) fail(gate, 'src/client/ 缺 keys.ts（keyed 字面量的唯一正本）');
    else {
      const keyExports = new Set([...keysFile.matchAll(/export const (\w+) = '/g)].map((m) => m[1]));
      if (keyExports.size === 0) fail(gate, 'keys.ts 无 `export const X = \x27…\x27` 导出（防空集）');
      // keyed 数组族（工具名族）也以 keys.ts 为唯一正本（审计 P3 件①）：族导出只许住
      // keys.ts，族值（wire 工具名等）在别处以引号字面量出现即红——值位拼错同样永不渲染。
      const familyExports = new Map(
        [...keysFile.matchAll(/export const (\w+) = \[([^\]]*)\]/g)].map((m) => [m[1], [...m[2].matchAll(/'([^']+)'/g)].map((q) => q[1])]),
      );
      const familyValues = new Map();
      for (const [name, vals] of familyExports) for (const v of vals) familyValues.set(v, name);
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
        // ③ keyed 数组族导出只许住 keys.ts（件①反证：RESEARCH_TOOL_KEYS 曾住 ResearchToolCard.tsx——
        //    族清单的第二份家 = 漂移面）。豁免 `inject`：Cordis 函数式插件的具名依赖声明
        //    （宿主合同，非 keyed 槽族——DSH 插件术语页的 name/inject/Config/apply 形态）。
        for (const m of text.matchAll(/export const (\w+)\s*=\s*\[/g))
          if (m[1] !== 'inject')
            fail(gate, `src/client/${f}: keyed 数组族导出 ${m[1]} 出现在 keys.ts 之外（单一正本 = keys.ts）`);
        // ④ 族值字面量（wire 工具名等）在 keys.ts 之外以引号出现即红——用 keys.ts 的族导出
        for (const m of text.matchAll(/['"]([^'"]+)['"]/g))
          if (familyValues.has(m[1]))
            fail(gate, `src/client/${f}: 工具名族值 "${m[1]}" 字面量出现在 keys.ts 之外（用 ${familyValues.get(m[1])} 导出）`);
        // ⑤ register 描述符的 shorthand `key,` 形态（无冒号——②的盲区）：取值来源必须可溯到
        //    keys.ts 导出（for-of 迭代或赋值右值 ∈ keyExports/familyExports）
        for (const m of text.matchAll(/slots\.register\(\s*\{([^}]*)\}/g)) {
          for (const s of m[1].matchAll(/\b(key|name|id)\s*[,}]/g)) {
            const ident = s[1];
            const bound = new RegExp(`(?:for\\s*\\(\\s*const\\s+${ident}\\s+of\\s+(\\w+)|const\\s+${ident}\\s*=\\s*(\\w+))`).exec(text);
            const src = bound ? (bound[1] ?? bound[2]) : null;
            if (!src || (!keyExports.has(src) && !familyExports.has(src)))
              fail(gate, `src/client/${f}: 描述符 shorthand ${ident}, 的取值来源不可溯到 keys.ts 导出（拼错即永不渲染）`);
          }
        }
      }
    }
  }
}

// ── client-effect-wrap（驾驶舱 slot/页签/活标题注册全量包 scoped.effect——
//    registrations are effects 的 dispose 即撤销贡献（test-strategy 语料台阶③；裸注册在
//    重应用/卸载语义下无撤销边界）。防空语料：src/client/index.ts 零注册调用即红——驾驶舱
//    必须注册。层边界：只查 index.ts（唯一登记装配位），组件文件不管。）──
//    反证：把工具卡循环的 effect 包裹还原成裸 scoped.slots.inject 语句 → 红；复包 → 绿。
{
  const gate = 'client-effect-wrap';
  const entry = join(PACK, 'src', 'client', 'index.ts');
  if (!existsSync(entry)) {
    fail(gate, 'packages/deep-research-pack/src/client/index.ts 缺席（驾驶舱唯一登记装配位）');
  } else {
    const lines = readFileSync(entry, 'utf8').split('\n');
    const registration = /\b(?:slots\.inject|sidebarRightTabs\.register)\(/;
    if (!lines.some((l) => registration.test(l)))
      fail(gate, 'src/client/index.ts 无任何 slots.inject / sidebarRightTabs.register（防空语料：驾驶舱必须注册）');
    lines.forEach((l, i) => {
      if (registration.test(l) && !/\bscoped\.effect\(/.test(l))
        fail(gate, `src/client/index.ts:${i + 1}: 注册调用不在 scoped.effect 包裹内——registrations are effects（dispose 即撤销贡献），包 effect 或并入既有 effect`);
    });
  }
}

// ── cockpit-doc-registry（驾驶舱构成正本 ↔ 盘上模块登记；issue ③-b 用户拍板
//    「补一条窄 verify 门」）。规则：`packages/deep-research-pack/src/client/` 任意层级与 `src/lib/`
//    下每个 .ts/.tsx 的 pack-root-relative path（src/client/... 或 src/lib/...）必须出现在构成正本
//    `docs/design/40-research-cockpit.md` 里——只比 basename 会让同名模块互相遮盖。
//    正本是驾驶舱构成的唯一说明，模块上了盘而正本没跟上 = 文档说谎（2026-10-11 实测形态：
//    业务摘要层 brief-fold 与 review-readiness 上线后，正本仍写「七区」「六件」）。
//    防空集：两目录合计 0 个模块 / 正本缺席 → 红（静默变空集的门禁等于不存在）。──
{
  const gate = 'cockpit-doc-registry';
  const docPath = join(ROOT, 'docs', 'design', '40-research-cockpit.md');
  const moduleDirs = [join(PACK, 'src', 'client'), join(PACK, 'src', 'lib')];
  if (!existsSync(docPath)) fail(gate, 'docs/design/40-research-cockpit.md 缺席（驾驶舱构成正本）');
  else {
    const doc = readFileSync(docPath, 'utf8');
    const modules = moduleDirs.flatMap((dir) => (existsSync(dir) ? walk(dir).filter((f) => /\.(ts|tsx)$/.test(f)) : []));
    const registeredModulePath = (modulePath) => doc.includes(`\`${modulePath}\``) || doc.includes(`/${modulePath})`);
    if (modules.length === 0) fail(gate, 'src/client 与 src/lib 下 0 个 .ts/.tsx（防空集：驾驶舱 client 面与折算层常在）');
    else for (const abs of modules) {
      const modulePath = relative(PACK, abs).split(sep).join('/');
      if (!registeredModulePath(modulePath))
        fail(gate, `${relative(ROOT, abs)} 未在构成正本登记（修正 = 在 docs/design/40-research-cockpit.md §2 的件表或折算层表加一行：pack-root-relative 路径 + 职责）`);
    }
  }
}

// ══ 域 C · notes 与开发技能（开发记忆骨架与时态/技能形状/RFC 指针） ══

// ── note-format（notes/ 决定记录骨架与状态行——DSH SDLC reference 01
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
  // 2026-10-08 补宽：加"实际跑过的验证"节断言。动因 = 复核实测该节零校验，而 notes/README.md
  // 与 evaluation.md 都宣称它是骨架四节之一（文档声明严于门禁 = 缺口）。实测 70 篇里有 25 篇
  // 的验证内容存在但落在**自造标题**下（## 实际跑过的检查 / ## 验收怎么闭的（逐条）/
  // ## L1 挂载面（…）…）——正是"当前事实 vs 变更史"漂移的入口。词表取实测变体 + 日期后缀容忍，
  // 既咬住"根本没有验证节"，又不为格式洁癖逼人重命名历史标题。
  // 注意：**不能用 `\b` 收尾**——CJK 不是 \w，`验证\b` 在"## 验证"行尾无边界可依，恒不匹配
  // （实测教训：首版带 \b 导致 40 篇误红，其中 39 篇其实有 `## 验证`）。
  // 词表按**实测全量标题**归纳（`grep '^## ' notes/implemented/*.md`），不按想象列举：
  // 本仓证据节的真实命名族 = 验证/检查/验收/实录/记录/实证/探针/全绿/结果/复验…
  // （如 `## 验收判据` `## 阶段一实录` `## 构建打通 + 双通道全绿` `## 证据（fresh-agent 探针…）`）。
  // 判定语义 = 该节标题**声称此处有证据**，而非强求统一命名——苛求命名会制造格式洁癖式假红。
  // 证据节判定词表（2026-10-08 增设）。
  // `^##(?!#)`：**必须恰好是 h2**——`^##` 在 /m 下也会匹配 `###`/`####`（二轮自审抓获，
  // 当前潜伏：71 篇命中者全走真 `##`，唯一无 h2 的那篇带 grandfather 注释）。
  // 词表按**实测标题族**归纳，容忍历史命名变体（验证/检查/验收/实录/记录/实证/探针/
  // 全绿/复验/证据）——不逼统一命名，否则 25 篇有效历史命名被误杀。
  // 否定式标题必须排除（2026-10-08 二轮自审抓获）：`## 未验证的猜测` / `## 无验证` /
  // `## 待验证` 原先**因为"验证"二字出现而通过**——即"明说没有证据"反而满足"要有证据节"，
  // 语义倒置。紧邻否定词 + 证据词 = 该标题在声明缺席，不算证据节。
  const VERIFY_SECTION = /^##(?!#)\s*[^\n]*(验证|检查|验收|实录|记录|实证|探针|全绿|复验|证据)/m;
  const VERIFY_NEGATED = /^##(?!#)[^\n]*(未|无|待|免|非|不|尚未)(验证|检查|验收|实录|记录|实证|探针|复验|证据)/m;
  each('implemented', (ent, text) => {
    const g = GRANDFATHER.test(text);
    if (!/^> 状态：\*{0,2}implemented\*{0,2}\s*$/m.test(text))
      fail(gate, `notes/implemented/${ent}: 缺裸状态行（> 状态：implemented——目录↔状态互验）`);
    if (!/^## 决定/m.test(text) && !g)
      fail(gate, `notes/implemented/${ent}: 缺"## 决定"节（遗留形态须标 grandfather 注释，见 notes/README.md）`);
    if (!/^## 输掉的方案/m.test(text) && !g)
      fail(gate, `notes/implemented/${ent}: 缺"## 输掉的方案"节（遗留形态须标 grandfather 注释，见 notes/README.md）`);
    if ((!VERIFY_SECTION.test(text) || VERIFY_NEGATED.test(text)) && !g)
      fail(gate, `notes/implemented/${ent}: 缺"实际跑过的验证"节——无证据的"完成"不算完成（否定式标题如"## 未验证的猜测"不算证据节；词表见 note-format 实现注释；遗留形态标 grandfather）`);
    // ── 本断言的**已知边界**（如实登记，不假装它更强）──────────────────────────────
    // 这是**在场检查**，不是**内容检查**：`## 证据待补` / `## 验证计划（未执行）` 这类空洞
    // 或自认未执行的标题同样会通过（对抗测试实证）。机械面在这里能保证的只有"作者被逼到
    // 必须为此开一节"——**证据是否真实充分仍是语义判断**，归 `reviewing-a-delivery` 与
    // L4 人工判据，不归本门禁。收紧到关键词须出现"跑/测/通过"等执行动词会引入另一类假阳
    // （合法历史命名被误杀），收益不抵代价（同 §词表按实测标题族归纳 的取舍）。
    // 与上游对齐：DSH testing policy 明确不声称一切语义规则都可机械化。
  });
  // rejected/：否决状态行（提案体保留，结论在状态行）
  each('rejected', (ent, text) => {
    if (!/^> 状态：\*{0,2}rejected\*{0,2}(\s*—\s*.+)?$/m.test(text))
      fail(gate, `notes/rejected/${ent}: 缺 rejected 状态行（裸值；一行理由用 —— 附在状态行后）`);
  });
}

// ── note-status（notes/ 的时态与状态面——2026-09-25 用户诉求落地：
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

// ── note-graduation-rewrite（implemented 活跃 Note 零计划体残留——"毕业 = 正文改写"
//    的机器面，2026-09-27 立项。此前只有 skill 散文约束无机械守卫；roadmap-graduation-drift
//    事故（postmortem 在案）是毕业时序纪律失守的近亲。判据窄带（2026-09-27 探针：候选词表对
//    活跃区 31 篇全量零命中零误报——宁窄勿宽，语义边界由 delivered Note 与自审确认）：
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
            fail(gate, `notes/implemented/${f}:${i + 1} 命中${label}——计划体残留。毕业 = 正文改写（计划体 → 已交付事实体，删未来时态/待办清单；见 notes/AGENTS.md），只改路径不改正文 = 未来计划伪装成当前事实`);
          }
        }
      }
    }
  }
}

// ── dev-skill-format（.agents/skills/ 开发技能的形状——vendor .agents/skills/
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

// ── proposed-pointer-live（live 文件里指向 notes/proposed/<x>.md 的具体指针必须存在）──
// 为什么：md-links/md-anchors 只扫 tracked .md 的 Markdown 链接语法，**非 .md 文件里的指针逃检**
// ——2026-09-26 清扫实测 13 处已 404 的 notes/proposed/ 指针（presets 头注 ×4、dev ×3、scripts ×3、
// tests ×1、alignment-ledger ×1）全部从这条缝漏过；preset 头注还随包分发。
// 范围：tracked 且**排除 notes/ 历史层**（历史层保留过去时指针是合法的，如"原 RFC：…（已离场）"）
// 与 vendor/。扫描集合空即红；当前没有 proposed 指针是合法的，若有指针则每个必须解析。
// 反证形态：把任一头注里的 notes/implemented/ 改回 notes/proposed/ → 本门禁红 → 还原绿。
{
  const gate = 'proposed-pointer-live';
  // 同族收口（2026-10-07 ls-files 清扫）：quotepath=false + 缺席/不可读 fail-loud + 目录型 symlink 放行
  const r = gitOnce(['-c', 'core.quotepath=false', 'ls-files']);
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
        if (!existsSync(f)) { fail(gate, `tracked 文件 ${rel} 盘上缺席——迁移/清扫残留态，fail-loud`); continue; }
        if (statSync(f).isDirectory()) continue; // 目录型 symlink（.claude/skills）非文本面
        let text;
        try { text = readFileSync(f, 'utf8'); } catch (e) { fail(gate, `tracked 文件 ${rel} 不可读（${e.code || e.message}）——fail-loud`); continue; }
        for (const m of text.matchAll(/notes\/proposed\/[A-Za-z0-9._-]+\.md/g)) {
          checked++;
          if (!existsSync(join(ROOT, m[0]))) {
            const line = text.slice(0, m.index).split('\n').length;
            fail(gate, `${rel}:${line} 指向 ${m[0]}——该文件不在 notes/proposed/（已毕业？毕业须同 diff 改指 notes/implemented/）`);
          }
        }
      }
      if (checked === 0) note(gate, '零个 live proposed 指针（合法：RFC 仅在持久决定需要显式评审时使用）');
      else note(gate, `${checked} 个 live 指针全部可解析`);
    }
  }
}

// ══ 域 D · vendor 对齐（钉身份/对齐台账/仓规约定/vendored 解析） ══

// ── vendor-pin（vendor/dsh submodule 在位且钉住 dsh-v0.2.1-rc.2 = 687f282e86；
//    D10 销账的机械面——机制权威自持）──
{
  const gate = 'vendor-pin';
  const PIN = '687f282e8625c6b8d11ff58211a90524be2e4317';
  if (!existsSync(join(ROOT, '.gitmodules'))) fail(gate, '.gitmodules 缺席');
  else {
    const gm = readFileSync(join(ROOT, '.gitmodules'), 'utf8');
    if (!/path = vendor\/dsh/.test(gm)) fail(gate, '.gitmodules 缺 vendor/dsh 条目');
    if (!/url = https:\/\/github\.com\/deepseek-ai\/deepseek-harness\.git/.test(gm))
      fail(gate, '.gitmodules URL 非 deepseek-harness 正源');
  }
  const r = gitOnce(['submodule', 'status', 'vendor/dsh']);
  const m = r.stdout ? /^[-+ ]?([0-9a-f]{40})/.exec(r.stdout.trim()) : null;
  if (!m) fail(gate, 'submodule status 不可读——检查 git submodule init/update');
  else if (m[1] !== PIN) fail(gate, `vendor/dsh 钉在 ${m[1].slice(0, 8)}——应为 ${PIN.slice(0, 8)}（dsh-v0.2.1-rc.2）`);
}

// ── vendor-clean（vendor/dsh 只读铁律：零未提交改动——机制权威不许就地改）──
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

// ── pin-agreement（live 文件里的钉身份必须与 submodule 实际状态一致）──
// 为什么：pin 在仓里有 14 个家，2026-09-26 清扫实测三处写错（dev/env.sh 的 tag 停在 0.1.5、
// design/10 的层版本停在 0.1.5、alignment-ledger 的 commit 写成 639ed0153905）——而 vendor-pin
// 只管 .gitmodules 一处，散文/机读面的复述无人对账。
// 规则：① live 文件里每个 40 位 hex 串必须等于 submodule HEAD；② 每个 `dsh-v*` tag 串必须等于
// submodule 的 tag——**唯一例外**：同一行带外部归属标记（语料/参考仓/company/外部材料）的，
// 那是别的仓的 pin，不是本仓的（现仅 00-index 的"语料自身钉 dsh-v0.1.7-rc.1"一处）。
// 防空语料：0 个 hex、或 0 个 tag 被检查 → 红。
{
  const gate = 'pin-agreement';
  const sub = gitOnce(['submodule', 'status', 'vendor/dsh']);
  const m = /^[\s+U-]*([0-9a-f]{40})/.exec(sub.stdout ?? '');
  const tagR = spawnSync('git', ['-C', join(ROOT, 'vendor', 'dsh'), 'describe', '--tags', '--exact-match'], { cwd: ROOT, encoding: 'utf8' });
  const TAG = (tagR.stdout ?? '').trim();
  if (!m || !TAG) {
    fail(gate, `读不到 submodule 钉身份（commit=${m ? m[1].slice(0, 8) : '?'} tag=${TAG || '?'}）——fail-loud`);
  } else {
    const PIN = m[1];
    // quotepath=false：git 默认把非 ASCII 路径转义输出，join 后 existsSync 永远 miss
    // （2026-10-07 实测 _dist/安装手册.md 因此被静默跳过）——本门禁要真实逐文件读盘，必须拿原文名。
    const r = gitOnce(['-c', 'core.quotepath=false', 'ls-files']);
    const files = (r.stdout ?? '').split('\n').filter(Boolean)
      // notes/ 整层豁免只对历史层（Note = 冻结快照，pin 复述是过去时，合法）；README.md 与
      // AGENTS.md 是活动指令层（目录地图 + 常设指令），捞回受检（2026-10-04 fresh-agent-doc-audit
      // 扩围：notes/README.md 曾携带 0.1.7 时代的过期 tag 而本门禁不咬——活动层复述面必须与
      // submodule 一致；扩围反证实录 = evaluation.md 本行）。
      .filter((f) => !f.startsWith('vendor/') && f !== 'pnpm-lock.yaml'
        && !(f.startsWith('notes/') && f !== 'notes/README.md' && f !== 'notes/AGENTS.md'))
      // 录制会话流豁免（2026-09-27 立，2026-10-09 随夹具迁入 snapshots/replay/ 合并）：录制的
      // 会话流里含 harness 自身的版本戳（system-reminder 注入的构建身份）与录制时的本仓 commit
      // ——那是 vendor 规范化契约说的"挥发性身份"与历史证据身份，不是本仓的钉声明；钉死在
      // 录制流上会与每次重录打架。run-state 夹具（同为录制日志投影）与 snapshots/replay/ 场景
      // 声明（codeAnchor 记录制 git 身份）同由本条覆盖；snapshots/ 其余文件（如 README）仍受检。
      .filter((f) => !f.startsWith('tests/fixtures/run-state/') && !f.startsWith('snapshots/replay/'));
    let hexes = 0, tags = 0, skipped = 0;
    for (const rel of files) {
      const f = join(ROOT, rel);
      // fail-loud（2026-10-07 目录治理第二轮实证）：tracked 但盘上缺席 = 迁移/清扫残留态，
      // 静默跳过曾让 npm 缓存件的误入库漏检到迁移才现形——缺席与不可读都红。
      if (!existsSync(f)) { fail(gate, `tracked 文件 ${rel} 盘上缺席——迁移/清扫残留态（git rm --cached 或恢复文件）`); continue; }
      if (statSync(f).isDirectory()) continue; // tracked 目录型 symlink（.claude/skills→.agents/skills）——结构面归 claude-symlink 门禁，非文本复述面
      let text;
      try { text = readFileSync(f, 'utf8'); } catch (e) { fail(gate, `tracked 文件 ${rel} 不可读（${e.code || e.message}）——fail-loud`); continue; }
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

// ── align-ledger（对齐台账机读对账——docs/alignment-ledger.json 与 vendor 本体、
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
        // 台账不收 node_modules 第三方依赖文件（2026-10-07 fresh clone 终验抓获：cytoscape 的
        // AGENTS.md 被枚举误收——本机装了 vendor 依赖才存在，fresh clone 的 submodule 只有
        // tracked 文件 → 源缺席假红。台账的合同对象 = harness 源面，不是装出来的依赖树）
        if (src.includes('node_modules/')) {
          fail(gate, `${src}: 台账不收 node_modules 第三方依赖文件（source 合同对象 = harness 源面；本机依赖树才存在的路径会让 fresh clone 断链——BUG-016 同族）`);
          continue;
        }
        if (!existsSync(join(ROOT, 'vendor', 'dsh', src))) {
          fail(gate, `${src}: vendor/dsh 里不存在（换 pin 后源文件移位/删除？重审触发——见 discipline-map §重审触发路径）`);
        }
        const verdict = entry.verdict;
        if (!['adopted', 'adapted', 'na'].includes(verdict)) { fail(gate, `${src}: verdict 值域外（adopted/adapted/na）`); continue; }
        if (verdict === 'na') {
          if (typeof entry.reason !== 'string' || entry.reason.trim() === '') fail(gate, `${src}: verdict=na 必须给 reason`);
          // ── na 活性检查（2026-10-08 增设；同日二轮修正）──────────────────────────────
          // 病根实证：本门禁原注释自认"只判存在性，不判语义对错"，而 na 的 reason 一旦写下
          // 即永久免检——复核实测 10 处 reason 已变假（archived/ 已启用、snapshot 录制夹具已
          // 在场、client 插件代码已自写、UI 样式面已存在），本门禁全绿。依据静默腐烂比任何
          // 单条 gap 都危险（本表是"什么该做什么不该做"的判断依据本身）。
          //
          // **二轮修正的教训（对抗自审实证，务必保留）**：首版要求每条 na 都给机械缺席断言，
          // 结果是把"免检区"**换了个写法**而非关掉——断言写的是**猜出来的路径形状**，而 reason
          // 声称缺席的是**一个能力**，两者只是碰巧相关。实证：造 `src/lib/session-v5.ts`
          // （session-format 行的自然落点）或 `src/lib/lifecycle.ts`，本门禁照旧全绿。
          // 一条 glob 无法表达"没有模块实现能力 X"——所以这里**如实分层**，不假装统一覆盖：
          //   · `liveness`：仅在**目录/文件树的缺席本身就是真实信号**时使用（如 `website/`、
          //     `.github/`、`packages/client/`）——这些真的有效，断言即为判据；
          //   · `reReviewOn`：能力面缺席（"本仓无 X 子系统/实现面"）用**声明式人工重估触发
          //     条件**，写清"X 以什么形态出现时回来重估"。这是诚实的做法：能力级腐烂仍是
          //     语义判断，归 §维护规则 的三类触发事件与人工重估，不归机械面。
          // 两者必居其一——都缺才是真的免检区（该判红）。
          const live = entry.liveness;
          const reReview = entry.reReviewOn;
          const hasLive = Array.isArray(live) && live.length > 0;
          const hasReReview = typeof reReview === 'string' && reReview.trim().length > 0;
          if (!hasLive && !hasReReview) {
            fail(gate, `${src}: verdict=na 必须给 liveness（机械缺席断言——仅限"目录/文件树缺席即信号"形态）或 reReviewOn（能力面缺席的声明式人工重估触发条件）；两者皆无 = 永久免检区，见 discipline-map §维护规则`);
          }
          if (hasLive) {
            for (const item of live) {
              if (typeof item?.absent === 'string' && item.absent.length > 0) {
                // 防空转（自查抓获 7 处）：断言对象若**就是 vendor 源路径本身**，则它永远成立
                // （vendor doc 本来就不会被拷贝进本仓）——看着在场、永不为真实失效而响。
                if (item.absent === src || src.endsWith(`/${item.absent}`) || item.absent.endsWith(`/${src}`)) {
                  fail(gate, `${src}: liveness 断言空转——"${item.absent}" 就是 vendor 源路径本身，永不会为真实失效而响；请改指本仓侧能力载体，或改用 reReviewOn——见 discipline-map §维护规则`);
                } else if (existsSync(join(ROOT, item.absent))) {
                  fail(gate, `${src}: na 理由已失效——"${item.absent}" 现在存在（当初登记"本仓无此面"）→ 重估该行 verdict，见 discipline-map §维护规则`);
                }
              } else if (typeof item?.globAbsent === 'string' && item.globAbsent.length > 0) {
                const pat = item.globAbsent;
                const hit = allFiles.find((f) => matchSimpleGlob(relative(ROOT, f), pat));
                if (hit) {
                  fail(gate, `${src}: na 理由已失效——glob "${pat}" 命中 ${relative(ROOT, hit)}（当初登记"本仓无此面"）→ 重估该行 verdict，见 discipline-map §维护规则`);
                }
              } else {
                fail(gate, `${src}: liveness 项须给 absent（路径）或 globAbsent（glob）`);
              }
            }
          }
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

// ── repo-conventions（与 vendor 本体的机械约定逐条对齐——vendor 树是唯一证据源，
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
  const scriptsDir = join(ROOT, 'scripts');
  const scanTargets = [];
  for (const ent of readdirSync(scriptsDir, { withFileTypes: true })) {
    if (ent.name === 'lib' || ent.name === 'node_modules') continue;
    if (ent.isFile() && ent.name.endsWith('.mjs')) scanTargets.push(scriptsDir + '/' + ent.name);
    else if (ent.isDirectory()) {
      for (const sub of readdirSync(join(scriptsDir, ent.name), { withFileTypes: true })) {
        if (sub.isFile() && sub.name.endsWith('.mjs')) scanTargets.push(join(scriptsDir, ent.name, sub.name));
      }
    }
  }
  if (scanTargets.length === 0) fail(gate, `scripts/ 扫描到 0 个 .mjs 入口——分组结构变了而扫描未跟进（防空语料）`);
  for (const p of scanTargets) {
    const text = readFileSync(p, 'utf8');
    if (/env:\s*\{\s*\.\.\.process\.env/.test(text)) {
      fail(gate, `${relative(ROOT, p)}: spawn env 整体透传 process.env——改用 scripts/lib/env.mjs 的 scrubbedEnv/withModelKey（凭据卫生）`);
    }
  }
  const hook = read('dev/hooks/pre-commit');
  if (hook === null) fail(gate, 'dev/hooks/pre-commit 缺席');
  else if (!hook.includes('git diff --cached --check')) fail(gate, 'pre-commit 缺 git diff --cached --check（暂存面空白/冲突标记检查，vendor lefthook whitespace 作业）');
}

// ── vendor-links（vendored 解析的机械面——vendor/README.md 的 verify-vendored-links
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

// ══ 域 E · 工作区与生成物（运行场合同/手册预算/种子新鲜度/分发导出） ══

// ── workspace-contract（研究手册 + 六件 run bundle 模板在位；bundle 目录
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
  if (existsSync(join(ROOT, 'runtime', 'harness-home', 'AGENTS.md')))
    fail(gate, 'runtime/harness-home/AGENTS.md 化石镜像在场（手册唯一注入通道 = cwd projectRoot）——删除它');
}

// ── handbook-budget（手册注入字节预算，2026-10-09 钉版复核吸收）──
// 为什么：agent-instructions 的 maxBytes 超限时**静默截断**（vendor render 先丢更宽的指令文件、
// 再截最具体的文件）——company 实测事故：preset 钉 16384 时手册 1.2KB，手册长到 17.4KB 后
// 成员会话从某节中句起整段丢失、"工作纪律"节从未注入（company handbook-budget 门禁出生现场，
// 2026-10-02；源 = company@59551f2 checks/run-gates.mjs:99–117）。本仓同构风险：手册是四角色
// 会话的注入正本，doc-budgets 的**行数**栅栏管不到**字节**截断。正本 = research-workspace/AGENTS.md
// （pack 种子由 pack-workspace-fresh 保证同步，不重复查）。
{
  const gate = 'handbook-budget';
  const handbookPath = join(ROOT, 'research-workspace', 'AGENTS.md');
  if (!existsSync(handbookPath)) fail(gate, 'research-workspace/AGENTS.md 不存在（workspace-contract 同报）');
  else {
    const handbookBytes = readFileSync(handbookPath).length;
    // 逐文件收集（不摊平）：单个 preset 丢 maxBytes 行时，摊平数组只剩三个一致值会静默放行——
    // 该角色手册失去截断防线而门禁绿（钉版复核对抗自审 S1；company 原版同款洞，此处收紧）。
    const perPreset = readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml')).map((f) => ({
      role: f.replace(/\.patch\.yml$/, ''),
      budgets: [...readFileSync(join(PRESETS, f), 'utf8').matchAll(/maxBytes:\s*(\d+)/g)].map((m) => Number(m[1])),
    }));
    if (perPreset.length === 0) fail(gate, 'presets 下零个 *.patch.yml——防空语料');
    const bare = perPreset.filter((e) => e.budgets.length === 0);
    if (bare.length > 0)
      fail(gate, `preset ${bare.map((e) => e.role).join(', ')} 缺 maxBytes 声明——该角色的 agent-instructions 无字节预算，手册超限即静默截断（补 packages/deep-research-pack/presets/<role>.patch.yml 的 maxBytes 行）`);
    else {
      const budgets = perPreset.flatMap((e) => e.budgets);
      if (new Set(budgets).size !== 1)
        fail(gate, `各 preset 的 maxBytes 不一致：${budgets.join(', ')}——预算应同值（改 packages/deep-research-pack/presets/<role>.patch.yml）`);
      else {
        const maxBytes = budgets[0];
        const margin = 1024; // render 包装开销余量（intro/省略注记——company 同款）
        if (handbookBytes + margin > maxBytes)
          fail(gate, `手册 ${handbookBytes}B + ${margin}B 余量 > maxBytes ${maxBytes}——agent-instructions 正在静默截断手册尾部（升 preset maxBytes 或先瘦身 research-workspace/AGENTS.md）`);
      }
    }
  }
}

// ── workspace-versioning（工作区版本控制边界）。规则：工作区跟踪面的规则住在
//    两个**必须被跟踪**的规则文件里——`research-workspace/.gitignore.example`（运行区拒收名单，
//    同时是随 pack 分发的种子正本；包内名带 `.example` 因为 npm pack 永不打包 `.gitignore`
//    文件名，scaffold 落地时改回本名）与 `research-workspace/drafts/.gitignore`（开发证据
//    白名单：探针稿与 dry-run 输出默认拒收）。为什么机械化：本仓根 .gitignore 对工作区不生效，
//    `git add -A` 又只加已跟踪文件——**"规则文件在库"本身就是边界存在的唯一形式**：正本一丢，
//    pack 照旧发布、本仓静默失去边界。覆盖面的重点在**内容与形态**：裸 `*` 拒收全部会把被
//    跨目录引用的材料一起拒收（fixture 实测全新 clone 后 drafts 全丢、md-links 红），故门禁
//    同时钉"显式列名单"（出现裸 `*` 即红）与三条运行区拒收行的在场。防空语料：正本/种子/
//    drafts 任一缺席、正本与种子不逐字节相等、缺任一拒收行 → 红（拒收行丢了，安装方一次
//    `git add -A` 就把整个 run 历史提交进他自己的库）。──
{
  const gate = 'workspace-versioning';
  const seed = join(PACK, 'workspace', '.gitignore.example');
  const scaffoldPath = join(PACK, 'scripts', 'scaffold.mjs');
  const rootRules = join(ROOT, 'research-workspace', '.gitignore.example');
  const draftsRules = join(ROOT, 'research-workspace', 'drafts', '.gitignore');
  const seedText = existsSync(seed) ? readFileSync(seed, 'utf8') : null;
  if (seedText === null) fail(gate, 'packages/deep-research-pack/workspace/.gitignore.example 缺席——安装方将拿不到工作区忽略规则（修正 = 补正本后跑 `node dev/sync-pack-workspace.mjs`）');
  else {
    // 种子名 = `.gitignore.example` 而非 `.gitignore`：npm pack 永不打包名为 .gitignore 的文件
    // （`files: ["workspace/**"]` 也照删，实测）——种子若叫 .gitignore，安装方永远收不到它。
    // 故这里同时钉"包内没有 .gitignore（那意味着选了随包会被丢的名字）"与"scaffold 会改名落地"。
    if (existsSync(join(PACK, 'workspace', '.gitignore')))
      fail(gate, 'packages/deep-research-pack/workspace/.gitignore 在场——npm pack 永不打包该文件名，种子会从 tarball 里静默消失（修正 = 用 .gitignore.example 形态）');
    const scaffoldSrc = existsSync(scaffoldPath) ? readFileSync(scaffoldPath, 'utf8') : '';
    if (!/ent\.name === '\.gitignore\.example'/.test(scaffoldSrc))
      fail(gate, 'scaffold.mjs 的种子收集器不认 .gitignore.example——规则不会铺到安装方工作区');
    if (!/'\.gitignore\.example'\s*\?\s*'\.gitignore'/.test(scaffoldSrc))
      fail(gate, 'scaffold.mjs 未把 .gitignore.example 落地成工作区根 .gitignore——铺开的是个不会生效的名字');
    if (!existsSync(rootRules)) fail(gate, 'research-workspace/.gitignore.example 不在位——工作区跟踪面的规则正本（修正 = 重建后跑 `node dev/sync-pack-workspace.mjs`）');
    else if (readFileSync(rootRules, 'utf8') !== seedText) fail(gate, 'research-workspace/.gitignore.example 与 pack 种子 workspace/.gitignore.example 不一致——正本与分发件漂移（修正 = `node dev/sync-pack-workspace.mjs`）');
    if (!existsSync(draftsRules)) fail(gate, 'research-workspace/drafts/.gitignore 不在位——开发证据白名单（新探针稿会默认可被 git add）');
    // 拒收清单 = 三个运行区名字。形态是**显式列名单**而非裸 `*` 拒收全部：工作区里还有被
    // 文档与测试跨目录引用的材料（本仓 drafts/ 开发证据），裸 `*` 会连它们一起拒收——fixture
    // 实测全新 clone 后 drafts 全丢、md-links 红（见 Note §实际跑过的验证）。名单少一项
    // 就等于该类运行区重新可提交，故逐项钉。
    const denies = ['drt_*/', 'archive/', 'method-library.md'];
    for (const deny of denies) {
      const escaped = deny.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`^\\s*${escaped}\\s*$`, 'm').test(seedText))
        fail(gate, `种子 workspace/.gitignore.example 缺拒收行 \`${deny}\`——安装方该类运行区重新可被 git add（修正 = 改正本 research-workspace/.gitignore.example 后跑 \`node dev/sync-pack-workspace.mjs\`）`);
    }
    if (/^\s*\*\s*$/m.test(seedText))
      fail(gate, '种子 workspace/.gitignore.example 出现裸 `*` 整目录拒收——它会连工作区里被跨目录引用的材料（如 drafts/ 开发证据）一起拒收，全新 clone 后链接与测试同时失效（修正 = 改回显式列名单）');
  }
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

// ── pack 工作区种子新鲜度（sync-pack-workspace --check）：手册/模板是会话 cwd 的内容，
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

// ── claude-symlink（CLAUDE.md 必须是指向 AGENTS.md 的 symlink）──
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

// ── secrets-untracked（tracked 清单零敏感/残留物；gitignore 不作用于已跟踪文件）──
{
  const gate = 'secrets-untracked';
  const r = gitOnce(['ls-files']);
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

// ── guard-red-record（tests 面反证义务机械化——2026-10-09 卡收官）──
// 为什么：「新契约测试带反证」此前是 tests/AGENTS 的散文义务（「只交付绿 = 不知道测试会不会
// 咬人」）——verify 门禁面有 gates-smoke（真注入真红），tests 面零机械：标题声称守卫具体事故
// （BUG-nnn）的测试，红配方只在头注散文里，走没走没人拦。判法（company checks/run-gates.mjs
// guard-red-record@5c050ea 移植 + 本仓适配：双址解析 + 夹具留证第二形态 + 防空语料）：
//   ① 守卫声明 = test/it 标题串带 BUG-nnn——标题是"我在守一条具体不变量"的正式声明，
//      注释提 BUG 号只是解释（不算声明）；
//   ② 事故卡双址可解析：_backlog/bugs/（活跃）∪ _backlog/_archived/fixed_bugs/（已修）——
//      悬空编号 = 声称守一个不存在的过去 → 红；
//   ③ 逐编号留证：文件里有「// 负例留证 YYYY-MM-DD：…BUG-nnn…」块（散文红配方）或
//      「// 夹具留证 YYYY-MM-DD：…BUG-nnn…」（指名永久负例夹具——本仓「夹具语义由消费它的
//      契约测试钉住」惯例），一篇声明 N 个事故就要 N 条，不许一条笼统行糊过去。
// ⚠ 本门禁不证明的：它不制造回归不跑测试，故不证明留证是真的（留证写了但假，本门禁看不出
//   ——那靠人复现）；它证明"声称守卫具体事故的测试必须交出红法写在旁边的配方"。
{
  const gate = 'guard-red-record';
  const bugDirs = [join(ROOT, '_backlog', 'bugs'), join(ROOT, '_backlog', '_archived', 'fixed_bugs')];
  const bugCardExists = (n) => bugDirs.some((d) => existsSync(d) && readdirSync(d).some((f) => f.startsWith(`BUG-${n}-`)));
  const problems = [];
  let claims = 0;
  const testFiles = readdirSync(join(ROOT, 'tests')).filter((f) => f.endsWith('.test.mjs'));
  if (testFiles.length === 0) fail(gate, '防空语料：tests/ 下零个 *.test.mjs——扫描面失效');
  for (const f of testFiles.sort()) {
    const text = readFileSync(join(ROOT, 'tests', f), 'utf8');
    // ① 标题里的 BUG 号 = 守卫声明（node:test 的 test('…')；含 await t.test 子测形态）
    const claimed = new Set();
    for (const m of text.matchAll(/^\s*(?:await\s+)?(?:t\.)?(?:test|it)\(\s*['"`][^'"`]*?(BUG-\d{3})/gm)) claimed.add(m[1]);
    if (claimed.size === 0) continue;
    for (const id of [...claimed].sort()) {
      claims++;
      const num = id.slice(4);
      // ② 双址解析
      if (!bugCardExists(num)) {
        problems.push(`${f}：标题声称守卫 ${id}，但 _backlog/bugs/ 与 _backlog/_archived/fixed_bugs/ 都没有 ${id}-* 卡（悬空事故号）`);
        continue;
      }
      // ③ 留证块（首行带标签+日期，续行 //；ID 在块内任意位置即可）——负例/夹具二选一形态
      const record = new RegExp(`^\\s*//\\s*(?:负例留证|夹具留证)\\s+\\d{4}-\\d{2}-\\d{2}：(?:[^\\n]*\\n(?:\\s*//[^\\n]*\\n)*)?[^\\n]*${id}`, 'm');
      if (!record.test(text)) {
        problems.push(`${f}：标题声称守卫 ${id}，但文件里没有「// 负例留证/夹具留证 YYYY-MM-DD：…${id}…」块（这条守卫没人知道能不能红——tests/AGENTS「只交付绿 = 不知道测试会不会咬人」）`);
      }
    }
  }
  if (claims === 0) fail(gate, '防空语料：tests 标题零个 BUG-nnn 守卫声明被扫到——判据源失效（已知 ask-drive 等多处带声明）');
  else if (problems.length > 0) fail(gate, `这些测试声称守卫具体事故却没交出可复核的红配方：${problems.join('；')}`);
}

// ── gate-ledger-sync（docs/evaluation.md §L0 门禁登记表 = 本脚本 gates 数组，不漂移）──
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

// ── entry-chain（文档链骨干存在性——正本 = 根 AGENTS.md §入口链与 §布局）──
// md-links 已机械覆盖全部 tracked .md 的链接解析；本门禁补它的盲区：文档链骨干成员
// （根/子树 AGENTS.md、00-index、design、guides、evaluation——含仅以反引号/散文指针
// 提到的，md-links 不检非链接形态）必须在场。成员清单是链的存在性投影，非第二正本；
// 改链结构时同 diff 更新本清单。
{
  const gate = 'entry-chain';
  const members = ['AGENTS.md', 'docs/00-index.md', '_backlog/issues', 'notes/proposed',
    'docs/guides/60-dev-loop.md', 'docs/evaluation.md', 'docs/design/10-architecture.md',
    'docs/design/20-roles.md', 'docs/design/30-methodology-mapping.md', 'docs/design/40-research-cockpit.md',
    'docs/design/50-agent-loop-and-state.md',
    'docs/guides/61-run-playbook.md',
    'docs/guides/62-plugin-authoring.md', 'docs/AGENTS.md', 'scripts/AGENTS.md', 'notes/AGENTS.md',
    'packages/deep-research-pack/AGENTS.md', 'tests/AGENTS.md', '_backlog/AGENTS.md'];
  for (const rel of members) {
    if (!existsSync(join(ROOT, rel))) fail(gate, `入口链成员缺席：${rel}（正本 = AGENTS.md §入口链；改链须同 diff 更新本门禁清单）`);
  }
  if (existsSync(join(ROOT, 'AGENTS.md')) && !/^## 入口链/m.test(readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')))
    fail(gate, 'AGENTS.md 缺 §入口链 标题——入口链定义的家');
}

// ── backlog-liveness (required shelves, metadata, and indexes). ──
// Structural contract only; it does not judge issue quality or decision correctness. Active records
// carry current metadata; archived legacy evidence bodies stay untouched. Empty shelves are legal,
// while missing/untracked institutional files fail loudly instead of silently shrinking the scope.
{
  const gate = 'backlog-liveness';
  const r = spawnSync('git', ['ls-files', '-z', '_backlog/'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) fail(gate, 'git ls-files failed for backlog; cannot establish tracked scope');
  else for (const problem of backlogLivenessProblems(join(ROOT, '_backlog'), r.stdout.split('\0').filter(Boolean))) fail(gate, problem);


}

// ── port-exclusive（冒烟/探针端口独占——scripts/AGENTS「端口与临时路径自持有」
//    承诺的机械面；审计 P3 件⑤）。判据：tracked scripts/ 与 dev/ 的 .mjs/.sh 中，端口
//    缺省声明（`port =` / `PORT=` 赋值行）同一端口号至多一个文件认领；取值引用
//    DSH_RUN_PORT（run 通道覆写变量）的声明是通道连接方或通道本身（hitl-answer /
//    run-kickoff / boot-run——连接方跟着通道走不是独占认领），豁免；注释行的用法示例
//    （`// 用法：… [--port 3101]`）不是声明，不认领。防空语料：0 个声明被检查即红
//    （检测回归 = 门禁静默空转）。──
{
  const gate = 'port-exclusive';
  const ls = spawnSync('git', ['-c', 'core.quotepath=false', 'ls-files', 'scripts', 'dev'], { cwd: ROOT, encoding: 'utf8' });
  if (ls.status !== 0) fail(gate, `git ls-files 不可用（${String(ls.stderr).slice(0, 120)}）——覆盖面依赖仓库态，fail-loud`);
  const claims = new Map();
  let checked = 0;
  for (const rel of ls.stdout.split('\n').filter(Boolean)) {
    if (!/\.(mjs|sh)$/.test(rel)) continue;
    let text;
    try { text = readFileSync(join(ROOT, rel), 'utf8'); }
    catch { fail(gate, `${rel}: tracked 文件不可读——fail-loud`); continue; }
    text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|#)/.test(line)) return;
      if (!/\bport\b\s*[:=]/i.test(line)) return;
      if (/DSH_RUN_PORT/.test(line)) return;
      const m = line.match(/(\d{4,5})\b/);
      if (!m) return;
      checked++;
      if (!claims.has(m[1])) claims.set(m[1], []);
      claims.get(m[1]).push(`${rel}:${i + 1}`);
    });
  }
  if (checked === 0) fail(gate, '0 个端口声明被检查（检测回归 = 门禁空转）——fail-loud');
  for (const [port, at] of claims) {
    const files = [...new Set(at.map((s) => s.split(':')[0]))];
    if (files.length > 1)
      fail(gate, `端口 ${port} 被 ${files.length} 个文件同时认领（${at.join('、')}）——scripts/AGENTS「端口独占」承诺（并发跑各自起 dsh 实例即撞号）；修正 = 改其一缺省端口，或确属通道连接方时显式改走 DSH_RUN_PORT`);
  }
}

// ── hooks-active（pre-commit 激活态；审计 P3 件⑥）。判据：git config
//    core.hooksPath 指向 dev/hooks（dev/env.sh 幂等设置，相对/绝对路径都认）。为什么在
//    L0：fresh clone 未 source env.sh = 提交零门禁，红 commit 溜进历史有 postmortem 前科
//    （毕业漂移复盘）——verify 是收尾必跑命令，在此 fail-loud 让"门禁没激活"在第一次
//    手跑 verify 时就现形，修正入口直接给出。GIT_* 剥离（scripts/AGENTS 子进程纪律）。──
{
  const gate = 'hooks-active';
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  const r = spawnSync('git', ['config', 'core.hooksPath'], { cwd: ROOT, encoding: 'utf8', env });
  const v = (r.stdout || '').trim().replace(/\/+$/, '');
  if (r.status !== 0 || !v || !/dev\/hooks$/.test(v.replace(/\\/g, '/')))
    fail(gate, `pre-commit 门禁未激活（core.hooksPath = ${v || '未设置'}）——本仓提交纪律 = 红灯拦 commit，未激活 = 裸奔；修正 = source dev/env.sh（幂等 git config core.hooksPath dev/hooks）`);
}

// ── 汇报 ──
// 归因正则钉 [^\]]+（到首个 ] 为止）：贪婪 (.+)\] 会被消息内嵌的 ]（如队列行的 [RFC] 链接）
// 污染，抓到最后一个 ] ——失败详情在场、门禁行却打 PASS（2026-10-07 gates-smoke 实证抓获）。
const failed = new Set(failures.map((f) => f.match(/^\[([^\]]+)\]/)[1]));
for (const g of gates) console.log(`${failed.has(g) ? 'FAIL' : 'PASS'}  ${g}`);
for (const n of notes) console.log(`note  ${n}`);
if (failures.length > 0) {
  console.log(`\n${failures.length} 处失败：`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log('\nverify: 全绿');
