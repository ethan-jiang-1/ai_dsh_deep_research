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
  const WORD = /^##\s*[^\n]*(验证|检查|验收|实录|记录|实证|探针|全绿|复验|证据)/m;
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

const breakQueuePointer = () => (dir) => {
  const p = join(dir, '_backlog', 'queue.md');
  const lines = readFileSync(p, 'utf8').split('\n');
  let inQueue = false;
  let mutated = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^## /.test(lines[i])) { inQueue = /^## 队列/.test(lines[i]); continue; }
    if (!inQueue) continue;
    if (/^\s*▶/.test(lines[i])) { lines[i] = lines[i].replace('▶', ''); mutated = true; break; } // 有条目态：剥 ▶（零 ▶ + 无空态标记 = 红）
  }
  if (!mutated) lines.splice(lines.findIndex((l) => /^## 队列/.test(l)) + 1, 0, '1. ▶ **探针条目**（矛盾态：空态标记与 ▶ 并存 = 红）'); // parked 态：制造矛盾
  writeFileSync(p, lines.join('\n'));
};

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
 *  门禁须报"断言空转"红，否则免检区只是换了个写法（2026-10-08 自查抓获 7 处）。 */
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

const bareQueuePointer = () => (dir) => {
  const p = join(dir, '_backlog', 'queue.md');
  const lines = readFileSync(p, 'utf8').split('\n');
  let inQueue = false;
  let hit = false;
  let sectionEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      if (inQueue) { sectionEnd = i; break; } // 队列节结束（下一节标题）
      inQueue = /^## 队列/.test(lines[i]);
      continue;
    }
    if (inQueue && /^\d+\.\s+▶/.test(lines[i])) { lines[i] = lines[i].replace(/^\d+\.\s+/, ''); hit = true; break; } // 有条目态：剥编号 → 裸 ▶（门禁 2026-10-07 补宽的形态）
  }
  if (!hit && inQueue) {
    // parked 态（零条目、队列空标记在场）：注入裸 ▶ 行——标记与 ▶ 并存 = 矛盾红（entry-chain
    // parked 语义）。双态感知（2026-10-08）：单态"剥编号"注入在 parked 队列下是 no-op，
    // 案例静默失效（实例：P3 毕业后队列恢复 parked，gates-smoke 首次实咬此漂移）。
    lines.splice(sectionEnd === -1 ? lines.length : sectionEnd, 0, '▶ 裸指针注入（gates-smoke 反证——parked 态形态）', '');
  }
  writeFileSync(p, lines.join('\n'));
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
  { id: 'entry-chain-pointer', gate: 'entry-chain', mutate: breakQueuePointer() },
  { id: 'entry-chain-bare', gate: 'entry-chain', mutate: bareQueuePointer() },
  { id: 'gate-ledger-sync-row', gate: 'gate-ledger-sync', mutate: removeLedgerRow('dist-manual-version') },
  // align-ledger 在副本基线**非 PASS**（vendor/dsh 是 gitlink submodule，副本不拷其内容 →
  // "vendor 里不存在"是副本环境的固有报因）。故两案例必须带 expect 指名"na 活性"报因，
  // 否则注入未生效也会因既有的 vendor 报因看到 FAIL 而假绿。
  { id: 'align-ledger-na-liveness-appears', gate: 'align-ledger', mutate: naLivenessAppears(),
    expect: 'na 理由已失效——"website" 现在存在' },
  { id: 'align-ledger-na-liveness-decorative', gate: 'align-ledger', mutate: naLivenessDecorative(),
    expect: 'liveness 断言空转' },
  { id: 'align-ledger-na-liveness-missing', gate: 'align-ledger', mutate: naLivenessMissing(),
    expect: 'website/AGENTS.md: verdict=na 必须给 liveness' },
];

// ── fixture：tracked 文件副本 + git init/add（git ls-files 驱动的门禁在副本内可用）──

function git(dir, args) {
  return spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
}

function buildFixture() {
  const tmp = mkdtempSync(join(tmpdir(), 'gates-smoke-'));
  const ls = git(ROOT, ['ls-files', '-z']);
  if (ls.status !== 0) throw new Error(`git ls-files 失败：${String(ls.stderr).slice(0, 200)}`);
  const files = ls.stdout.split('\0').filter(Boolean);
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
      const controlPass = control.out.includes(`PASS  ${gate}`);
      if (!controlPass && !expect) {
        // 副本基线非 PASS 且未给 expect → 案例组只查 `FAIL <gate>` 会被既有报因蒙混过关
        failures.push(`对照组：${gate} 在零注入副本非 PASS（${id}）——该门禁属"副本基线非 PASS"类，案例必须给 expect 指名注入报因，否则断言空转`);
      } else if (controlPass && expect) {
        failures.push(`对照组：${gate} 在零注入副本已 PASS 却给了 expect（${id}）——expect 多余，或案例基线判断有误`);
      }
    }

    // 案例组：注入 → 目标门禁点名红（带 expect 时须命中该报因）
    for (const { id, gate, mutate, expect } of CASES) {
      const dir = cloneFixture(base, `case-${id}`);
      keep.push(dir);
      mutate(dir);
      const { status, out } = runVerify(dir);
      if (!/verify: 全绿|处失败/.test(out)) failures.push(`${id}：verify 未跑完（status=${status}）`);
      else if (!out.includes(`FAIL  ${gate}`)) failures.push(`${id}：注入回归未被点名报红——门禁钝化或案例失效`);
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
