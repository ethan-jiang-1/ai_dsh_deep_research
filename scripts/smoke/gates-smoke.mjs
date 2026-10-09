#!/usr/bin/env node
// gates-smoke.mjs — 门禁自测（guard the gates）
//
// 依据：「DSH 插件开发语料（二代）吸收审计」毕业 Note（notes/implemented/2026-10-07-dsh-plugin-corpus-absorption.md）
// 缺口 2。模式 = 语料 `_dsh_plugin_agent_ready_development/verify.test.mjs` 的本仓化：
// 把 tracked 文件复制进临时 git 仓，注入各门禁负责拦的真实回归，经**真实 verify 入口**
// 断言目标门禁点名报红；对照组（零注入）断言目标门禁全 PASS——断言空转即红（防空语料）。
// 门禁自身的反证是一次性人工实录（evaluation §L0 反证列），本 smoke 是它们的常驻回归。
//
// 档位：keyless（子进程 = git + node；无模型/浏览器/网络——故住 smoke 道，layering 禁默认
// 回归 spawn；静态契约钉子 = tests/verify-gates.test.mjs）。
// verdict 契约（scripts/AGENTS.md）：exit 0 = 全绿 / 1 = 断言红 / 2 = 未跑（前置缺席）。
// 失败时保留临时目录并打印路径（语料 verify.test.mjs 先例）；全绿即清理。

import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const VERIFY_REL = join('scripts', 'verify', 'verify.mjs');

// ── 注入手法（每条 = 该门禁负责拦的真实回归；静态契约测试对账 gate 名 ↔ verify gates 数组）──

const appendTo = (rel, text) => (dir) => appendFileSync(join(dir, rel), text);

const stripFirstStatusLine = (dirRel) => (dir) => {
  const d = join(dir, dirRel);
  const target = readdirSync(d).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()
    .find((f) => readFileSync(join(d, f), 'utf8').includes('> 状态：'));
  const p = join(d, target);
  writeFileSync(p, readFileSync(p, 'utf8').split('\n').filter((l) => !l.startsWith('> 状态：')).join('\n'));
};

/** 证据节缺席注入（2026-10-08 补宽 note-format 的"## 实际跑过的验证"断言）：
 *  取第一篇非 grandfather 的 implemented Note，把**所有**含证据词表关键词的二级标题
 *  改成中性词 `## 附注`——模拟"这篇 Note 根本没有验证节"。
 *  必须一次改全部：词表含 验证/检查/验收/实录/记录/实证/探针/全绿/复验/证据，只改一个标题
 *  若该文还有别的证据节则仍是绿的（实测教训：首版只改首个匹配 → 门禁照绿，案例空转）。 */
const stripVerificationSection = (dirRel) => (dir) => {
  const d = join(dir, dirRel);
  const WORD = /^##(?!#)\s*[^\n]*(验证|检查|验收|实录|记录|实证|探针|全绿|复验|证据)/m;
  const target = readdirSync(d).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()
    .find((f) => {
      const t = readFileSync(join(d, f), 'utf8');
      return !t.includes('<!-- grandfather:') && WORD.test(t);
    });
  if (!target) throw new Error('找不到可注入的 implemented Note（无含证据节的非 grandfather 篇）');
  const p = join(d, target);
  const out = readFileSync(p, 'utf8').split('\n')
    .map((l) => (WORD.test(l) ? '## 附注' : l)).join('\n');
  writeFileSync(p, out);
};

/** 证据节注入（**否定式标题**形态）：把真实证据节标题换成"## 未验证的猜测"
 *  ——文字游戏：标题里"验证"二字在场，但它声明的是**没有验证**。
 *  门禁须仍判红（语义倒置：明说缺席反而满足"要有证据节"，2026-10-08 二轮自审抓获）。 */
const negateVerificationSection = (dirRel) => (dir) => {
  const d = join(dir, dirRel);
  const WORD = /^##(?!#)\s*[^\n]*(验证|检查|验收|实录|记录|实证|探针|全绿|复验|证据)/m;
  const target = readdirSync(d).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()
    .find((f) => {
      const t = readFileSync(join(d, f), 'utf8');
      return !t.includes('<!-- grandfather:') && WORD.test(t);
    });
  if (!target) throw new Error('找不到可注入的 implemented Note（无含证据节的非 grandfather 篇）');
  const p = join(d, target);
  const out = readFileSync(p, 'utf8').split('\n')
    .map((l) => (WORD.test(l) ? '## 未验证的猜测' : l)).join('\n');
  writeFileSync(p, out);
};

const ISSUE_NAME = '2099-01-01-probe.md';
const ISSUE_TEXT = '---\nstatus: 推敲中\nopened: 2099-01-01\n---\n\n# Probe\n> 状态：推敲中｜可关闭：否\n';

function fixtureFile(dir, rel, text, indexed = true) {
  const path = join(dir, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  if (indexed) appendFileSync(join(dirname(path), 'README.md'), `\n[${rel.split('/').at(-1)}](${rel.split('/').at(-1)})\n`);
  const result = git(dir, ['add', '--', rel]);
  if (result.status !== 0) throw new Error(`fixture git add failed: ${result.stderr}`);
}

const backlogIssue = (change = (text) => text, indexed = true) => (dir) =>
  fixtureFile(dir, `_backlog/issues/${ISSUE_NAME}`, change(ISSUE_TEXT), indexed);

const removeLedgerRow = (gateName) => (dir) => {
  const p = join(dir, 'docs', 'evaluation.md');
  writeFileSync(p, readFileSync(p, 'utf8').split('\n').filter((l) => !l.startsWith(`| \`${gateName}\``)).join('\n'));
};

/** na 活性注入：把某条 `verdict=na` 的 liveness 缺席前提"变成存在"——即造出它当初声称
 *  本仓没有的那个面。门禁须报红（"依据静默腐烂"的病根反证，2026-10-08 增设）。
 *  选 `website/AGENTS.md` 的 `absent: website`：该目录在真仓不存在，副本内可安全创造。 */
const naLivenessAppears = () => (dir) => {
  mkdirSync(join(dir, 'website'), { recursive: true });
  writeFileSync(join(dir, 'website', 'AGENTS.md'), '# 站点探针\n');
};

/** na 活性注入（装饰性断言形态）：把某条 na 的缺席断言改回 **vendor 源路径本身**
 *  ——这种断言看着在场、却永不会为真实失效而响（vendor doc 本来就不拷进本仓）。
 *  门禁须报"断言空转"红，否则免检区只是换了个写法（2026-10-08 自查抓获 7 处）。
 *  **本案例只锁"断言 = 源路径"这一退化形态**：能力面以换名形态落地（如
 *  `src/lib/session-v5.ts` 之于 session-format 行）仍不被捕捉——那是 `reReviewOn`
 *  声明层负责的语义面，无机械判据可锁。勿把本案例读成"能力级腐烂已被覆盖"。 */
const naLivenessDecorative = () => (dir) => {
  const p = join(dir, 'docs', 'alignment-ledger.json');
  const ledger = JSON.parse(readFileSync(p, 'utf8'));
  for (const s of ledger.sources) {
    if (s.verdict === 'na' && s.source === 'docs/api-gateway.md') {
      s.liveness = [{ absent: 'docs/api-gateway.md' }];
    }
  }
  writeFileSync(p, `${JSON.stringify(ledger, null, 2)}\n`);
};

/** na 活性注入（globAbsent 形态）：造一份命中 glob 的文件 → 门禁须报"glob 命中"红。
 *  **此前本分支零覆盖**（首版三个案例全走 absent，而 `matchSimpleGlob` 是新手写的正则
 *  路由——二轮自审点名"globAbsent 分支完全未被行使"）。 */
const naLivenessGlob = () => (dir) => {
  writeFileSync(join(dir, 'docs', 'architecture.zh.md'), '# 双语配对探针\n');
};

/** na 活性注入（能力面声明缺失形态）：把某条**能力行**的 reReviewOn 删掉且不给 liveness
 *  → 门禁须报"两者皆无"红。锁的是 2026-10-08 二轮修正后的诚实分层：能力面缺席不得靠
 *  猜路径冒充机械覆盖（对抗自审实证：造 `src/lib/session-v5.ts` 时首版门禁照旧全绿）。 */
const naCapabilityUndefended = () => (dir) => {
  const p = join(dir, 'docs', 'alignment-ledger.json');
  const ledger = JSON.parse(readFileSync(p, 'utf8'));
  for (const s of ledger.sources) {
    if (s.verdict === 'na' && s.source === 'docs/session-format-status.md') {
      delete s.liveness;
      delete s.reReviewOn;
    }
  }
  writeFileSync(p, `${JSON.stringify(ledger, null, 2)}\n`);
};

/** na 活性注入（缺字段形态）：删掉某条 na 的 liveness → 门禁须报"必须给 liveness"。
 *  防"新增 na 行时忘记登记缺席断言"重新变成永久免检区。 */
const naLivenessMissing = () => (dir) => {
  const p = join(dir, 'docs', 'alignment-ledger.json');
  const ledger = JSON.parse(readFileSync(p, 'utf8'));
  for (const s of ledger.sources) {
    if (s.verdict === 'na' && s.source === 'website/AGENTS.md') delete s.liveness;
  }
  writeFileSync(p, `${JSON.stringify(ledger, null, 2)}\n`);
};

const linkUntrackedTarget = () => (dir) => {
  // 目标在盘上存在但未被 git 跟踪（BUG-016 形态：tracked md 链接运行区文件——git 绿依赖机器
  // 状态而非仓库状态；runtime/ 在 .gitignore 内且 fixture 的 git add 已完成 → 恒 untracked）
  mkdirSync(join(dir, 'runtime'), { recursive: true });
  writeFileSync(join(dir, 'runtime', 'orphan-probe.md'), '# 孤儿目标\n');
  appendFileSync(join(dir, 'README.md'), '\n[孤儿探针](runtime/orphan-probe.md)\n');
};

/** 承重门禁抽样（增删同 diff：本表 + tests/verify-gates.test.mjs 无需改——它动态对账本表）。
 *  id = 案例唯一标识（同一门禁可有多个注入形态，id 防重复条目）；gate = 期望点名的门禁；
 *  mutate(dir) = 在 fixture 内注入该门禁负责拦的回归。
 *  expect（可选）= 断言红**必须含此子串**；用于"该门禁在副本基线本就非 PASS"的场景——
 *  此时只查 `FAIL  <gate>` 会因**别的**报因而假绿（断言空转）。凡 gate 在对照组非 PASS 者
 *  必须给 expect（主流程会强制检查这一点）。 */
export const CASES = [
  { id: 'md-links-dead', gate: 'md-links', mutate: appendTo('README.md', '\n[死链探针](./definitely-missing-file.md)\n') },
  { id: 'md-links-untracked', gate: 'md-links', mutate: linkUntrackedTarget() },
  { id: 'md-anchors-missing', gate: 'md-anchors', mutate: appendTo('README.md', '\n[坏锚探针](AGENTS.md#这个锚点肯定不存在xyz)\n') },
  { id: 'note-format-no-status', gate: 'note-format', mutate: stripFirstStatusLine(join('notes', 'implemented')) },
  { id: 'note-format-no-verification', gate: 'note-format', mutate: stripVerificationSection(join('notes', 'implemented')) },
  { id: 'note-format-negated-verification', gate: 'note-format', mutate: negateVerificationSection(join('notes', 'implemented')) },
  { id: 'entry-chain-no-title', gate: 'entry-chain', mutate: (dir) => {
    const p = join(dir, 'AGENTS.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/^## 入口链.*$/m, '## 探针替代标题'));
  } },
  { id: 'backlog-issue-no-frontmatter', gate: 'backlog-liveness', mutate: backlogIssue(() => '# Probe\n> 状态：推敲中｜可关闭：否\n') },
  { id: 'backlog-issue-closeable', gate: 'backlog-liveness', mutate: backlogIssue((text) => text.replace('可关闭：否', '可关闭：是')) },
  { id: 'backlog-issue-orphan', gate: 'backlog-liveness', mutate: backlogIssue((text) => text, false) },
  { id: 'backlog-bug-severity', gate: 'backlog-liveness', mutate: (dir) => fixtureFile(dir, '_backlog/bugs/BUG-999-probe.md', '---\nstatus: 活跃\nseverity: P3\nopened: 2099-01-01\n---\n\n# Probe\n') },
  { id: 'backlog-research-status', gate: 'backlog-liveness', mutate: (dir) => fixtureFile(dir, '_backlog/research/2099-01-01-probe.md', '---\ntopic: Probe\nintent: "Evidence"\nstatus: 活跃\n---\n\n# Probe\n') },
  { id: 'backlog-method-no-trigger', gate: 'backlog-liveness', mutate: (dir) => {
    const path = join(dir, '_backlog/methods/issue-to-note.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace(/^whenToUse:.*\n/m, ''));
  } },
  { id: 'gate-ledger-sync-row', gate: 'gate-ledger-sync', mutate: removeLedgerRow('dist-manual-version') },
  // handbook-budget 事故形态：四 preset 同降过限（手册字节 + 余量 > maxBytes）——company
  // 同构面出过真实事故（手册 17.4KB 超预算后注入静默截断，2026-10-09 钉版复核吸收）。
  { id: 'handbook-budget-truncated', gate: 'handbook-budget', mutate: (dir) => {
    for (const f of readdirSync(join(dir, 'packages/deep-research-pack/presets'))) {
      if (!f.endsWith('.patch.yml')) continue;
      const p = join(dir, 'packages/deep-research-pack/presets', f);
      // 不钉字面值：预算将来升到任何值，本注入都把四 preset 一致压到 8000（< 手册字节 + 余量）
      writeFileSync(p, readFileSync(p, 'utf8').replace(/maxBytes: \d+/g, 'maxBytes: 8000'));
    }
  } },
  { id: 'handbook-budget-mismatch', gate: 'handbook-budget', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/presets/lead.patch.yml');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/maxBytes: \d+/, 'maxBytes: 8192'));
  } },
  // S1 事故形态（对抗自审抓获）：单个 preset 丢 maxBytes 行——摊平收集会静默放行，逐文件收集必须红
  { id: 'handbook-budget-bare-preset', gate: 'handbook-budget', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/presets/lead.patch.yml');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/\n\s*maxBytes: \d+/, ''));
  } },
  // client-half 双方向（release-smoke-hardening 件⑤a）：exports ./client 与 dsh.client 声明
  // 任一脱钩都是静默失效（company postmortem 0002：vendor 门禁只 glob 树内包，仓外 pack 射程外）。
  { id: 'client-half-no-export', gate: 'client-half', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/package.json');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"./client": {', '"./client-probe": {'));
  } },
  { id: 'client-half-no-decl', gate: 'client-half', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/package.json');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"client": {', '"client-probe": {'));
  } },
  // pack-bundle-compat 含当前 tag（件⑤b）：升 pin 忘把新 tag 加进兼容矩阵——判据前移到 L0，
  // 别等 L2 安装冒烟才现形。探针值避开 `dsh-v<数字>` 形态（pin-agreement 会把形似 tag 的
  // 字面量当钉复述对账——探针不是钉声明）。
  { id: 'pack-bundle-compat-tag-missing', gate: 'pack-bundle-compat', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/package.json');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"dsh-v0.2.0-rc.2"', '"dsh-wrongtag"'));
  } },
  // align-ledger 在副本基线**非 PASS**（vendor/dsh 是 gitlink submodule，副本不拷其内容 →
  // "vendor 里不存在"是副本环境的固有报因）。故两案例必须带 expect 指名"na 活性"报因，
  // 否则注入未生效也会因既有的 vendor 报因看到 FAIL 而假绿。
  { id: 'align-ledger-na-liveness-appears', gate: 'align-ledger', mutate: naLivenessAppears(),
    expect: 'na 理由已失效——"website" 现在存在' },
  { id: 'align-ledger-na-liveness-decorative', gate: 'align-ledger', mutate: naLivenessDecorative(),
    expect: 'liveness 断言空转' },
  { id: 'align-ledger-na-liveness-glob', gate: 'align-ledger', mutate: naLivenessGlob(),
    expect: 'glob "docs/**/*.zh.md" 命中 docs/architecture.zh.md' },
  { id: 'align-ledger-na-capability-undefended', gate: 'align-ledger', mutate: naCapabilityUndefended(),
    expect: 'docs/session-format-status.md: verdict=na 必须给 liveness' },
  { id: 'align-ledger-na-liveness-missing', gate: 'align-ledger', mutate: naLivenessMissing(),
    expect: 'website/AGENTS.md: verdict=na 必须给 liveness' },
];

export const CONTROLS = [
  { id: 'backlog-active-issue', gate: 'backlog-liveness', mutate: backlogIssue() },
];

// ── fixture：tracked 文件副本 + git init/add（git ls-files 驱动的门禁在副本内可用）──

function git(dir, args) {
  return spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
}

function buildFixture() {
  const tmp = mkdtempSync(join(tmpdir(), 'gates-smoke-'));
  const ls = git(ROOT, ['ls-files', '-z']);
  if (ls.status !== 0) throw new Error(`git ls-files 失败：${String(ls.stderr).slice(0, 200)}`);
  const files = [...new Set([...ls.stdout.split('\0').filter(Boolean), 'scripts/lib/backlog-liveness.mjs'])];
  if (files.length < 50) throw new Error(`tracked 清单异常少（${files.length}）——fixture 建立中止`);
  for (const f of files) {
    const src = join(ROOT, f);
    const st = lstatSync(src);
    if (st.isDirectory()) continue; // submodule gitlink（vendor/dsh）——副本不需要其内容，vendor 类门禁在 fixture 内按缺席处理
    const dst = join(tmp, f);
    mkdirSync(dirname(dst), { recursive: true });
    if (st.isSymbolicLink()) symlinkSync(readlinkSync(src), dst); // symlink 原样保真（CLAUDE.md → AGENTS.md 等）
    else cpSync(src, dst);
  }
  // 副本 = tracked 全量，等价 fresh clone（BUG-016 修复后 tracked md 零运行区链接——曾有的
  // 18 条 digest 链接已转反引号路径，md-links 加宽断言把守该类不再回来；旧版在此处的
  // "运行区链接目标补拷"临时对冲随之移除）。
  const r1 = git(tmp, ['init', '-q']);
  const r2 = git(tmp, ['add', '-A']);
  if (r1.status !== 0 || r2.status !== 0) throw new Error(`fixture git init/add 失败：${r1.stderr || r2.stderr}`);
  return tmp;
}

const cloneFixture = (base, name) => {
  const dir = join(dirname(base), `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  cpSync(base, dir, { recursive: true, verbatimSymlinks: true });
  return dir;
};

function runVerify(dir) {
  const r = spawnSync(process.execPath, [join(dir, VERIFY_REL)], { cwd: dir, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout || ''}\n${r.stderr || ''}` };
}

// ── 主流程 ──

function main() {
  const keep = [];
  try {
    const base = buildFixture();
    keep.push(base);
    const failures = [];

    // 对照组：零注入 → 案例门禁全 PASS（防断言空转：副本基线本身红 = 断言无效）
    const controlDir = cloneFixture(base, 'control');
    keep.push(controlDir);
    const control = runVerify(controlDir);
    if (!/verify: 全绿|处失败/.test(control.out)) failures.push(`对照组：verify 未跑完（status=${control.status}）`);
    for (const { id, gate, expect } of CASES) {
      // 判据行锚定：verify 每个门禁恰打一行 `${verdict}  ${gate}`（实测），故用带换行边界的
      // 精确形态而非裸 substring——若 `PASS  <gate>` 与 `FAIL  <gate>` 同时出现，裸
      // `includes` 会读成"基线 PASS"从而**禁止**本案例需要的 expect（二轮自审点名的脆弱原语）。
      const controlPass = control.out.includes(`\nPASS  ${gate}\n`);
      if (!controlPass && !expect) {
        // 副本基线非 PASS 且未给 expect → 案例组只查 `FAIL <gate>` 会被既有报因蒙混过关
        failures.push(`对照组：${gate} 在零注入副本非 PASS（${id}）——该门禁属"副本基线非 PASS"类，案例必须给 expect 指名注入报因，否则断言空转`);
      } else if (controlPass && expect) {
        failures.push(`对照组：${gate} 在零注入副本已 PASS 却给了 expect（${id}）——expect 多余，或案例基线判断有误`);
      }
    }

    for (const { id, gate, mutate } of CONTROLS) {
      const dir = cloneFixture(base, `control-${id}`);
      keep.push(dir);
      mutate(dir);
      const { status, out } = runVerify(dir);
      if (!/verify: 全绿|处失败/.test(out) || !out.includes(`\nPASS  ${gate}\n`))
        failures.push(`${id}: valid shape did not pass ${gate} (status=${status})`);
    }

    // 案例组：注入 → 目标门禁点名红（带 expect 时须命中该报因）
    for (const { id, gate, mutate, expect } of CASES) {
      const dir = cloneFixture(base, `case-${id}`);
      keep.push(dir);
      mutate(dir);
      const { status, out } = runVerify(dir);
      if (!/verify: 全绿|处失败/.test(out)) failures.push(`${id}：verify 未跑完（status=${status}）`);
      else if (!out.includes(`\nFAIL  ${gate}\n`)) failures.push(`${id}：注入回归未被点名报红——门禁钝化或案例失效`);
      else if (expect && !out.includes(expect)) failures.push(`${id}：${gate} 报了红但**非本案例的报因**（期望含 ${JSON.stringify(expect)}）——注入未生效或断言被旁路`);
    }

    if (failures.length > 0) {
      console.error(`gates-smoke: ${failures.length} 处失败：`);
      for (const f of failures) console.error(`  - ${f}`);
      console.error(`\n临时目录保留复查：${keep.join('\n')}`);
      process.exit(1);
    }
    console.log(`gates-smoke: 全绿（对照组零注入全 PASS + ${CASES.length} 个注入案例均被点名报红）`);
    for (const d of keep) rmSync(d, { recursive: true, force: true });
    process.exit(0);
  } catch (e) {
    console.error(`gates-smoke: 未跑（前置缺席）——${e.message}\n临时目录保留复查：${keep.join('\n') || '（无）'}`);
    process.exit(2);
  }
}

// 直跑守卫：tests/verify-gates.test.mjs import CASES 做静态对账，import 不触发执行
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
