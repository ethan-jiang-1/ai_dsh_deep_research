// d-vendor.mjs — 域 D · vendor 对齐：submodule 只读铁律、钉身份复述、纪律台账逐源对账。
//
// 从 2026-10-27 卫生轮前的单文件 verify.mjs 原样切出（判据与文案逐字未改）；共享助手住
// ../context.mjs。改本域门禁只需读本文件——域切分 = docs/evaluation.md §L0 表的 A–F 分组。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, gates, fail, note, allFiles, gitOnce, trackedFiles, matchSimpleGlob } from '../context.mjs';

export function runD() {
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
// 40 位 hex 必须是**独立**的 40 位串：sha256（种子清单/测试向量）是 64 位，取前 40 位当 commit
// 是误报；前后再接 hex 的串不参与 commit 对账（2026-10-25 workspace seed 清单实证）。
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
    // 枚举四件套收口（形态正本 = trackedFiles 助手头注——quotepath=false 的实证即 _dist/安装手册.md
    // 曾被引号转义输出而静默漏扫）；豁免面与钉身份防空下限是本门禁自己的。
    const files = trackedFiles({
      gate,
      // notes/ 整层豁免只对历史层（Note = 冻结快照，pin 复述是过去时，合法）；README.md 与
      // AGENTS.md 是活动指令层（目录地图 + 常设指令），捞回受检（2026-10-04 fresh-agent-doc-audit
      // 扩围：notes/README.md 曾携带 0.1.7 时代的过期 tag 而本门禁不咬——活动层复述面必须与
      // submodule 一致；扩围反证实录 = evaluation.md 本行）。
      // 录制会话流豁免（2026-09-27 立，2026-10-09 随夹具迁入 snapshots/replay/ 合并）：录制的
      // 会话流里含 harness 自身的版本戳（system-reminder 注入的构建身份）与录制时的本仓 commit
      // ——那是 vendor 规范化契约说的"挥发性身份"与历史证据身份，不是本仓的钉声明；钉死在
      // 录制流上会与每次重录打架。run-state 夹具（同为录制日志投影）与 snapshots/replay/ 场景
      // 声明（codeAnchor 记录制 git 身份）同由本条覆盖；snapshots/ 其余文件（如 README）仍受检。
      exclude: (f) => f.startsWith('vendor/') || f === 'pnpm-lock.yaml'
        || (f.startsWith('notes/') && f !== 'notes/README.md' && f !== 'notes/AGENTS.md')
        || f.startsWith('tests/fixtures/run-state/') || f.startsWith('snapshots/replay/'),
    });
    let hexes = 0, tags = 0, skipped = 0;
    if (files) for (const { rel, text } of files) {
      const lines = text.split('\n');
      for (const h of text.matchAll(/(?<![0-9a-f])[0-9a-f]{40}(?![0-9a-f])/g)) {
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
                const hit = allFiles().find((f) => matchSimpleGlob(relative(ROOT, f), pat));
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

// ── discipline-na-trigger（人读表「不适用」行的免检区闭合——docs/discipline-map.md）
//
//    病根实证（2026-10-19 全表逐条语义重读）：discipline-map §维护规则 白纸黑字承诺
//    「写 `不适用` 必须同时给出**可判定的失效条件**……由 `align-ledger` 门禁的活性断言
//    机械复核——理由变假即红」。但 `align-ledger` 只读 docs/alignment-ledger.json（108 条
//    文件级），**从不读人读表**——那句承诺对 discipline-map 的 16 条「不适用」行根本没兑现。
//    实测代价：源 10 有 2 行判「不适用」，而等价物早已在 scripts/lib/replay-scene.mjs 里
//    （14 条比较前守卫、sessionFormat 钉代），台账记成"没做"——依据静默腐烂。
//
//    判据：状态列（第 3 列）真值以「不适用」开头的每一行，必须含一个可判定的重估触发词
//    （重估 / 失效条件 / 复活条件 / 引入条件 / 触发条件）。**按状态列真值判，不做全文正则**
//    ——「带证据适配（……原判「不适用」与实况相反……）」这类行正文含"不适用"字样但判定不是
//    na，全文正则会把它们误红。剥 `**` 后取前缀，是唯一稳定形态。
//
//    范围与防空：只读 docs/discipline-map.md 这一个 tracked 文件；解析出 0 行或 na 行数
//    少于 MIN_NA_ROWS 即判红（表格改版/正则失效 → 门禁静默变空集，等于不存在）。
{
  const gate = 'discipline-na-trigger';
  const mapPath = join(ROOT, 'docs', 'discipline-map.md');
  // 当前实测 16 行；留余量到 10，防"重分类使行数合理下降"时假红，又能抓住解析失效。
  const MIN_NA_ROWS = 10;
  const TRIGGER = /重估|失效条件|复活条件|引入条件|触发条件/;
  if (!existsSync(mapPath)) fail(gate, 'docs/discipline-map.md 缺席——纪律全量枚举的人读正本');
  else {
    const lines = readFileSync(mapPath, 'utf8').split('\n');
    // 表格数据行：以 | 开头、非分隔行、非表头
    const rows = lines.filter((l) => /^\|/.test(l) && !/^\|[\s\-:|]+\|$/.test(l) && !/^\|\s*DSH 做法/.test(l));
    if (rows.length === 0) fail(gate, 'docs/discipline-map.md 未解析出任何表格数据行——表格改版或解析正则失效（防空语料）');
    let naCount = 0;
    const missing = [];
    for (const row of rows) {
      const cols = row.split('|').slice(1, -1).map((s) => s.trim());
      if (cols.length < 3) continue;
      const state = cols[2].replace(/\*\*/g, '').trim();
      if (!state.startsWith('不适用')) continue;
      naCount++;
      if (!TRIGGER.test(state)) {
        missing.push(`「${cols[0].replace(/\*\*/g, '').slice(0, 46)}」——状态列只写了理由（"${state.slice(0, 48)}"），没写什么情况下来重估`);
      }
    }
    if (naCount < MIN_NA_ROWS) {
      fail(gate, `只解析到 ${naCount} 条「不适用」行（下限 ${MIN_NA_ROWS}）——解析失效或整表被改窄（防空语料）`);
    }
    for (const m of missing) {
      fail(gate, `${m}；修正 = 在状态列补一个可判定的重估触发（重估/失效条件/复活条件/引入条件/触发条件之一）——见 docs/discipline-map.md §维护规则「不适用是当时不适用，不是豁免」`);
    }
  }
}

// ── discipline-state-vocab（状态列三态值域机检——docs/discipline-map.md）
//
//    病根实证（2026-10-19 全表逐条语义重读）：表头明写「每行三态」，值域 = 照搬 / 带证据适配 /
//    不适用。实测状态列出现值域外写法（`已具备`、`前两件已具备`）。这不是措辞洁癖：`已具备`
//    （"本来就有"）与 `带证据适配`（"改造过、带证据"）维护语义不同——前者暗示无需重校，后者要求
//    每次换 pin 重验。把后者写成前者 = 悄悄给该行签免检，而本表价值恰恰是"换 pin 后逐行重校"。
//    `discipline-na-trigger` 只管「不适用」行的触发条件，管不到值域越界。
//
//    判据：**按表头定位状态列**（表头单元格含「状态」的那一列），逐数据行取该列真值、剥 `**`，
//    首词必须属于闭集 THREE_STATES。不按固定列序猜——本文档并存 10 张「| DSH 做法 | 本仓落点 |
//    状态 |」表与 2 张两列处置表（`| vendor 文件/目录 | 本仓处置 |`），后者的第二列出现"已具备"
//    属正常记述，不是状态声称；按列序判会把它们误红。
//    **不做全文正则**（同 discipline-na-trigger：正文常引述别的状态词）。
//
//    范围与防空：只读 docs/discipline-map.md 一个 tracked 文件；解析出 0 张带状态列的表、
//    0 行状态数据行，或状态行数少于 MIN_ROWS 即判红（表格改版 → 门禁静默变空集，等于不存在）。
{
  const gate = 'discipline-state-vocab';
  const mapPath = join(ROOT, 'docs', 'discipline-map.md');
  // 当前实测 10 张状态表、80 行状态数据行；留余量到 60，防重分类合理减少时假红。
  const MIN_ROWS = 60;
  const THREE_STATES = ['照搬', '带证据适配', '不适用'];
  if (!existsSync(mapPath)) fail(gate, 'docs/discipline-map.md 缺席——纪律全量枚举的人读正本');
  else {
    const lines = readFileSync(mapPath, 'utf8').split('\n');
    let stateCount = 0;
    let tablesWithState = 0;
    const offenders = [];
    // 逐表扫描：遇表头行 + 下一行是分隔行 = 一张表
    for (let i = 0; i < lines.length - 1; i++) {
      const header = lines[i];
      if (!/^\|/.test(header) || !/^\|[\s\-:|]+\|$/.test(lines[i + 1])) continue;
      const headCols = header.split('|').slice(1, -1).map((c) => c.trim());
      const stateIdx = headCols.findIndex((c) => c.includes('状态'));
      if (stateIdx === -1) continue;
      tablesWithState++;
      // 走该表的数据行直到出表
      for (let j = i + 2; j < lines.length && /^\|/.test(lines[j]); j++) {
        const cols = lines[j].split('|').slice(1, -1).map((c) => c.trim());
        if (cols.length <= stateIdx) continue;
        const state = cols[stateIdx].replace(/\*\*/g, '').trim();
        if (state === '') continue;
        stateCount++;
        if (!THREE_STATES.some((t) => state.startsWith(t))) {
          const head = state.split(/[（(：:，,\s]/)[0];
          offenders.push(`「${cols[0].replace(/\*\*/g, '').slice(0, 46)}」——状态列写的是「${head}」，不在三态值域内（全值："${state.slice(0, 40)}"）`);
        }
      }
    }
    if (tablesWithState === 0) {
      fail(gate, 'docs/discipline-map.md 未解析出任何「状态」列表——表头改版或解析失效（防空语料）');
    } else if (stateCount < MIN_ROWS) {
      fail(gate, `只解析到 ${stateCount} 行状态列（下限 ${MIN_ROWS}，当前应约 80）——解析失效或整表被改窄（防空语料）`);
    }
    for (const m of offenders) {
      fail(gate, `${m}；修正 = 状态列首词改成 照搬 / 带证据适配 / 不适用 之一（语义差别见 docs/discipline-map.md 表头：已具备暗示免于重校，带证据适配要求每次换 pin 重验）`);
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
}
