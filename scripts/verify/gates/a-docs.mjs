// a-docs.mjs — 域 A · md 文档卫生：tracked .md 的字节 / 链接 / 锚点 / 措辞合同（门禁列表 = context.gates 的前 7 项）。
//
// 从 2026-10-27 卫生轮前的单文件 verify.mjs 原样切出（判据与文案逐字未改）；共享助手住
// ../context.mjs。改本域门禁只需读本文件——域切分 = docs/evaluation.md §L0 表的 A–F 分组。

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, gates, fail, note, walk, gitOnce, trackedFiles } from '../context.mjs';

export function runA() {
// ── md-utf8-newline（所有 tracked .md 严格 UTF-8、恰一个结尾换行；git
//    ls-files 驱动——运行区（gitignored bundle/profile 镜像）不扫，研究手册合同既有；
//    旧版全树 walk 曾被 live run 的 leads.md 双尾换行咬红，2026-09-24 修正范围）──
{
  const gate = 'md-utf8-newline';
  // quotepath=false（2026-10-21 卫生轮补宽，md-links 同款先例）：非 ASCII tracked 路径
  //（_dist/安装手册.md）被引号转义后 existsSync miss → 稀疏态 continue 静默跳过 = 漏扫；
  // 反证 = gates-smoke 案例 md-utf8-newline-nonascii-path（先红后绿实录见案例注释）。
  const r = gitOnce(['-c', 'core.quotepath=false', 'ls-files', '*.md']);
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
// 同刻全绿即实证。覆盖面 = tracked 集合（未 staged 的新文件扫不到——pre-commit 在 staged 后兜住）；反引号裸路径不检（设计）。
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
  // quotepath=false（2026-10-21 卫生轮补宽，同 md-utf8-newline/md-links 先例）：非 ASCII tracked
  // 路径的引号转义会让 existsSync miss → 静默跳过；反证 = gates-smoke 案例 md-anchors-nonascii-path。
  const r = gitOnce(['-c', 'core.quotepath=false', 'ls-files', '*.md']);
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
//    的 Note 由此在对账面上现形，归档进门条件的语义判断（「不再可能指导未来变更」）保留给人）。红 = ①未登记的
//    活面→archived 链接；②登记条目失真（源文件已无此链接）；③登记条目失存（源/目标不在
//    盘上、未跟踪、目标不在 archived）；④archived 语料非空但活面扫描集为空（范围收窄
//    防空）。notes/archived/README.md 索引导航豁免。反引号裸路径不检（与 md-links 同边界
//    ——wide 盘点另行决定）。已知边界：参考式定义 / 跨行链接 / 代码围栏内 / HTML href
//    四形态逃逸（收窄 = 独立 writing-a-gate 轮，启动条件 = 出现真实的该形态引用）；带
//    title 链接本门禁可捕（正则容忍尾注 title）而 md-links 失明（其正则遇空格即弃）。──
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
// 已知边界：只检阿拉伯数字 + 四个名词（门禁/tests/断言/条源面），中文数字与枚举不检
// （2026-10-20 审计实证：十二件/9 环节/三条/六个 均曾漂移）；关键枚举改指正本，语义面
// 由 docs-consistency 契约承接。
{
  const gate = 'count-free';
  // 枚举四件套收口（形态正本 = trackedFiles 助手头注）；范围与防空语料措辞是本门禁自己的。
  const files = trackedFiles({
    gate,
    exclude: (f) => f.startsWith('vendor/') || f.startsWith('notes/') || f === 'pnpm-lock.yaml',
    emptyMsg: '防空语料：未扫到任何 live 文件',
  });
  if (files) for (const { rel, text } of files) {
    for (const mm of text.matchAll(/(?<![A-Za-z0-9])[0-9]+ ?(门禁|tests|断言|条源面)/g)) {
      const line = text.slice(0, mm.index).split('\n').length;
      fail(gate, `${rel}:${line} 写死计数"${mm[0]}"——计数有正本（gates 数组 / evaluation §L0 / ls），散文改指正本`);
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
  // 枚举四件套收口（形态正本 = trackedFiles 助手头注——quotepath=false 即非 ASCII 的 .md 不再被
  // 引号转义输出而静默漏扫，_dist/安装手册.md 实测；不可读改为报红而非裸读崩栈）；豁免与
  // 防空语料措辞是本门禁自己的。
  const files = trackedFiles({
    gate,
    glob: '*.md',
    exclude: (f) => f.startsWith('vendor/') || f.startsWith('notes/') || f === 'docs/AGENTS.md',
    emptyMsg: '防空语料：未扫到任何 live 文档',
  });
  if (files) for (const { rel, text } of files) {
    const lines = text.split('\n');
    for (const mm of text.matchAll(/已销账|修订 →|曾用|首版[^\n]{0,15}已由/g)) {
      const line = text.slice(0, mm.index).split('\n').length;
      if ((lines[line - 1] ?? '').includes('doc-now-only')) continue; // 规则自身的表述行
      fail(gate, `${rel}:${line} 含变更史措辞"${mm[0]}"——live 文档只写 now；历史归 notes/ 与 git`);
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
    // `_` 前缀默认是 manifest 元数据键（_note/_raises）；但 `_backlog/AGENTS.md` 是真实路径，
    // 也必须受预算（2026-10-20 审计 P1：旧过滤把它的 48 行预算静默跳过）。
    const budgeted = Object.keys(manifest).filter((k) => !k.startsWith('_') || k.endsWith('.md'));
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
}
