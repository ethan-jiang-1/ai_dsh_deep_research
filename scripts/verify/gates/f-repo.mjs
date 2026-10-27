// f-repo.mjs — 域 F · 仓规环境：symlink、秘密、路径卫生、反证记录、门禁台账、入口链、backlog、端口、hooks。
//
// 从 2026-10-27 卫生轮前的单文件 verify.mjs 原样切出（判据与文案逐字未改）；共享助手住
// ../context.mjs。改本域门禁只需读本文件——域切分 = docs/evaluation.md §L0 表的 A–F 分组。

import { readFileSync, readdirSync, existsSync, lstatSync, readlinkSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { backlogLivenessProblems } from '../../lib/backlog-liveness.mjs';
import { ROOT, gates, fail, walk, gitOnce, trackedFiles } from '../context.mjs';

export function runF() {
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
      || /(^|\/)\.(vscode|idea|cursor)\//.test(f)
      || /(^|\/)\.claude\/settings\.local\.json$/.test(f)
      || /(^|\/)\.tmp[^/]*\//.test(f)
      || /(^|\/)_tmp\//.test(f)
      || /(^|\/)coverage\//.test(f)
      || /(^|\/)\.cache\//.test(f)
      || /(^|\/)(Thumbs\.db|Desktop\.ini)$/.test(f)
      || /\.(swp|swo)$/.test(f)
      || /\.local$/.test(f)
      || /^packages\/deep-research-pack\/lib\//.test(f)
      || /\.tgz$/.test(f)
      || /\.log$/i.test(f)
      || /\.DS_Store$/.test(f));
    for (const f of bad) fail(gate, `敏感/残留物已被 tracked：${f}（gitignore 管不住已跟踪文件，须 git rm --cached）`);
  }
}

// ── host-paths（live 面零本机绝对 home 路径——跨环境纪律）──
// 病根：公开仓库里出现 /Users/<name>/... 这类路径，换机器/换用户就不可解析；历史 notes、
// _backlog、snapshots、tests/fixtures 是冻结证据，允许保留旧路径。live 面 = 随包内容、当前
// 文档、脚本、CI、工作区种子——新内容必须环境无关（相对路径 / 环境变量 / 占位符）。
{
  const gate = 'host-paths';
  const LIVE_PREFIXES = ['packages/deep-research-pack/', 'docs/', 'scripts/', 'dev/', '.github/', '_dist/'];
  const LIVE_ROOT = new Set(['README.md', 'AGENTS.md', 'CONTRIBUTING.md', 'SECURITY.md', 'LICENSE', 'runtime/README.md']);
  const LIVE_WORKSPACE = new Set(['research-workspace/AGENTS.md', 'research-workspace/NODES.md', 'research-workspace/question-patterns.md', 'research-workspace/.gitignore.example']);
  const isLive = (f) => LIVE_ROOT.has(f) || LIVE_PREFIXES.some((p) => f.startsWith(p))
    || LIVE_WORKSPACE.has(f) || f.startsWith('research-workspace/templates/');
  const files = trackedFiles({
    gate,
    exclude: (f) => !isLive(f),
    emptyMsg: '防空语料：live 面零文件被扫到——范围被收窄，fail-loud',
  });
  // 只认“真实用户名形态”的绝对 home 路径；本页自己的示例用 <name>/...，不会命中。
  const HOST = /(?:^|[^A-Za-z0-9_])\/(?:Users|home)\/[A-Za-z0-9._-]+\/|[A-Za-z]:[\\/]Users[\\/][A-Za-z0-9._-]+|\/private\/var\/folders\//;
  if (files) for (const { rel, text } of files) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = HOST.exec(lines[i]);
      if (m) {
        fail(gate, `${rel}:${i + 1} 出现本机绝对路径「${m[0]}」——live 内容必须环境无关（改相对路径/环境变量/占位符；历史证据留 notes/_backlog/snapshots/tests/fixtures）`);
        break;
      }
    }
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
  // 2026-10-20 起 tests/ 按域分子目录（run/cockpit/pack/contracts）：递归扫描，fixtures/_tmp 除外。
  const testFiles = walk(join(ROOT, 'tests')).filter((f) => f.endsWith('.test.mjs')
    && !f.includes(`${sep}fixtures${sep}`) && !f.includes(`${sep}_tmp${sep}`));
  if (testFiles.length === 0) fail(gate, '防空语料：tests/ 下零个 *.test.mjs——扫描面失效');
  for (const file of testFiles.sort()) {
    const f = relative(ROOT, file);
    const text = readFileSync(file, 'utf8');
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
    'docs/design/50-agent-loop-and-state.md', 'docs/design/60-intent-carriers.md',
    'docs/guides/61-run-playbook.md',
    'docs/guides/62-plugin-authoring.md', 'docs/AGENTS.md', 'scripts/AGENTS.md', 'notes/AGENTS.md',
    'packages/deep-research-pack/AGENTS.md', 'tests/AGENTS.md', '_backlog/AGENTS.md'];
  for (const rel of members) {
    if (!existsSync(join(ROOT, rel))) fail(gate, `入口链成员缺席：${rel}（正本 = AGENTS.md §入口链；改链须同 diff 更新本门禁清单）`);
  }
  if (existsSync(join(ROOT, 'AGENTS.md')) && !/^## 入口链/m.test(readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')))
    fail(gate, 'AGENTS.md 缺 §入口链 标题——入口链定义的家');
}

// ── backlog-liveness（backlog 各池的结构与生命周期合同——规则正本 = _backlog/README.md，
//    实现 = scripts/lib/backlog-liveness.mjs）。只证结构：不证明结论、证据质量或实施授权；
//    活跃卡带当前 metadata，归档正文保留不追补；空池合法，制度文件缺席/未跟踪即红（防空）。
//    已知边界：acceptance-presence 族（修复就绪缺 `## 修复判据`、结论倾向「现在做」缺
//    `## 验收标准`）under-pressure 未落地——补齐时同 diff 扩 backlog-liveness.mjs。──
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
}
