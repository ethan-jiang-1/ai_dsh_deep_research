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
// 回归 spawn；静态契约钉子 = tests/verify-gates.test.mjs，经 scripts/lib/gates-cases.mjs
// 消费案例表——本脚本是纯 fs 案例的驱动壳 [2026-10-09 layering 二代拆分]）。
// verdict 契约（scripts/AGENTS.md）：exit 0 = 全绿 / 1 = 断言红 / 2 = 未跑（前置缺席）。
// 失败时保留临时目录并打印路径（语料 verify.test.mjs 先例）；全绿即清理。
// mutate 后统一 `git add -A`：tracked-only 门禁（git ls-files 驱动）要看见注入的新文件；
// gitignored 文件（runtime/ 探针）天然不入——md-links-untracked 案例正靠它恒 untracked。

import { spawnSync } from 'node:child_process';
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, CONTROLS } from '../lib/gates-cases.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const VERIFY_REL = join('scripts', 'verify', 'verify.mjs');

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

/** 判据行锚定：verify 每门禁恰打一行 `${verdict}  ${gate}`（scripts/verify/verify.mjs 末行循环）——
 *  ^…$m 行锚定判 PASS/FAIL，防后缀门禁名 substring 误配；首行（无前置换行）同样命中。 */
function gateVerdict(out, verdict, gate) {
  return new RegExp(`^${verdict}  ${gate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm').test(out);
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
      // 判据行锚定（gateVerdict 助手）：verify 每个门禁恰打一行 `${verdict}  ${gate}`（实测），
      // 行首行尾锚定防后缀门禁名误配；旧 `\n…\n` includes 形态对输出首行（md-utf8-newline——
      // 域 A 首个门禁）失明：首行无前置换行，2026-10-21 卫生轮首条靶向它的案例暴露此缺陷
      // （对照组假红 + 案例红永不转绿），故改 ^…$m 锚定。
      const controlPass = gateVerdict(control.out, 'PASS', gate);
      if (!controlPass && !expect) {
        // 副本基线非 PASS 且未给 expect → 案例组只查 `FAIL <gate>` 会被既有报因蒙混过关
        failures.push(`对照组：${gate} 在零注入副本非 PASS（${id}）——两种成因须分辨：`
          + `①该门禁属"副本基线非 PASS"类（断言对象含 submodule / 本机 git config 等副本不可造面）→ 案例必须给 expect 指名注入报因；`
          + `②工作树/索引中间态（典型 = 未 staged 的链接目标、未完成的 git 操作）→ 此时真仓 pnpm verify 同样会红，先 git add/commit 或还原再跑。`
          + `分辨法：先跑 pnpm verify——真仓绿 = 情形①。`);
      } else if (controlPass && expect) {
        failures.push(`对照组：${gate} 在零注入副本已 PASS 却给了 expect（${id}）——expect 多余，或案例基线判断有误`);
      }
    }

    for (const { id, gate, mutate } of CONTROLS) {
      const dir = cloneFixture(base, `control-${id}`);
      keep.push(dir);
      mutate(dir);
      git(dir, ['add', '-A']); // tracked-only 门禁要看见注入的新文件（gitignored 探针天然不入）
      const { status, out } = runVerify(dir);
      if (!/verify: 全绿|处失败/.test(out) || !gateVerdict(out, 'PASS', gate))
        failures.push(`${id}: valid shape did not pass ${gate} (status=${status})`);
    }

    // 案例组：注入 → 目标门禁点名红（带 expect 时须命中该报因）
    for (const { id, gate, mutate, expect } of CASES) {
      const dir = cloneFixture(base, `case-${id}`);
      keep.push(dir);
      mutate(dir);
      git(dir, ['add', '-A']); // 同上：mutate 的新文件统一入 tracked 集（案例 mutate 本身是纯 fs）
      const { status, out } = runVerify(dir);
      if (!/verify: 全绿|处失败/.test(out)) failures.push(`${id}：verify 未跑完（status=${status}）`);
      else if (!gateVerdict(out, 'FAIL', gate)) failures.push(`${id}：注入回归未被点名报红——对照组合格而此处不红 = 门禁钝化或注入未生效（案例侧；先确认 mutate 真的改了文件、且该文件在被扫面内）`);
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

// 直跑守卫：tests/verify-gates.test.mjs 经 lib/gates-cases.mjs 静态对账案例表，import 不触发执行
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
