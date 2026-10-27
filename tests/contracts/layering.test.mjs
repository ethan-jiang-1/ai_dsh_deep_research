// 测试分层守卫 — 回归层（tests/）禁止真实模型/浏览器/网络/子进程/密钥依赖（layering 二代）。
// 定义：docs/evaluation.md §L0；语义移植自 ai_dsh_company tests/harness/layering.spec.ts 四件套
// （2026-10-09 探查实录与拍板 = _backlog/issues/2026-10-09-layering-v2.md）；解析器 =
// scripts/lib/keyless-imports.mjs（company tools/lib/keyless-imports.mjs@59551f2 移植，
// typescript 作纯函数解析器——typescript@6.0.3 是本仓既有 root devDep；keyless 判据 =
// 运行时禁子进程/网络/凭据，npm 解析库不在判例内，company 同款实践）。
//
// 判法两层（为什么两层：regex 便宜但分不清字符串与执行；解析贵但只认真调用）：
//   ① 提及级 regex（child_process import / playwright / 密钥名 + credentials.yaml——
//      字符串常量与注释里的间接引用也咬，company 同款任意提及语义）；
//   ② 解析级（spawn/exec/fetch 族**调用表达式**——夹具字符串不误咬；
//      tests 本地 import 闭包的**传递引入**——import 进来会把 spawn 整条带进回归层，
//      文本扫描看不见，company 点名风险形态）。
// ③ 驱动面禁令 + ④ test 命令钉 + ⑤ 纪律有家句。
// 反证（2026-10-09 实录，先红后绿——记于卡与毕业 Note）：动态 import playwright → ①红；
// 密钥名间接引用 → ①红；夹具字符串内 fetch( → ②不咬（反向）；tests import smoke 驱动 →
// ③红 + 闭包传递红；lib 传递 spawnSync（port-reclaim）→ ③闭包红；test 命令改宽 → ④红。
// ⚠ 教训（首版实证）：本文件的注释不要以"可匹配形态"引用违规示例——示例代码逐字
//   进注释会被自己的正则命中（守卫红是对的，命中的是文档不是代码）。描述违规用散文。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectKeylessGraph, parseKeylessImports } from '../../scripts/lib/keyless-imports.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TESTS = join(ROOT, 'tests');
const SELF = fileURLToPath(import.meta.url);
// 2026-10-20 用户指令：tests/ 按域分子目录（run/cockpit/pack/contracts），发现面 = 递归 glob；
// fixtures/ 与 _tmp/ 不在发现面内。
const walkTests = (dir, rel = '') => {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'fixtures' || ent.name === '_tmp' || ent.name === 'node_modules') continue;
    const r = rel === '' ? ent.name : `${rel}/${ent.name}`;
    if (ent.isDirectory()) out.push(...walkTests(join(dir, ent.name), r));
    else if (ent.name.endsWith('.test.mjs')) out.push(r);
  }
  return out;
};
const files = walkTests(TESTS);

// 提及级豁免（合法文本消费者，逐件带理由；②解析级与③闭包图**不豁免**——豁免的只是
// "文本里出现密钥名"，执行面零豁免：真去读密钥环境变量/文件照样红）。
const MENTION_EXEMPT = {
  'deploy-bin.test.mjs': '密钥名文本契约——钉部署脚本安全边界，判据本身含密钥名',
  'smoke-contract.test.mjs': '真模型档 closed set 契约——.credentials.yaml 是判据本身',
  'credentials-status.test.mjs': '凭据分层契约——判据本身含密钥名/文件名；用临时目录，不读真实凭据',
  'test-surface.test.mjs': '覆盖边界登记——SMOKE_ONLY 的键就是 lib 模块名（playwright/zstd-read 等），判据必须写出这些名字；本文件不 import 它们',
};

test('① 回归层禁物：任意提及级（子进程 import / 浏览器 / 密钥名）', () => {
  const forbidden = [
    { pattern: /from ['"]node:child_process['"]/, why: '起进程 = 真服务/真浏览器 → 独立 smoke 档' },
    { pattern: /\bplaywright\b/i, why: '真浏览器 → client-load-smoke 档' },
    { pattern: /DEEPSEEK_API_KEY|credentials\.yaml/, why: '回归必须 keyless' },
  ];
  const offenders = [];
  for (const f of files) {
    if (resolve(join(TESTS, f)) === SELF) continue; // 本文件必然点名禁物
    if (MENTION_EXEMPT[f.split('/').at(-1)]) continue; // 合法文本消费者（见上表）；执行面归②③
    const src = readFileSync(join(TESTS, f), 'utf8');
    for (const { pattern, why } of forbidden) {
      if (pattern.test(src)) offenders.push(`${f} → ${why}`);
    }
  }
  assert.deepEqual(offenders, [], '回归层要秒级 keyless：真入口的检查写 scripts/ 的 smoke/probe（子进程归 smoke 道），密钥名文本契约走 MENTION_EXEMPT 登记');
});

test('② 回归层禁物：解析级调用表达式（spawn/exec/fetch——夹具字符串不咬）', () => {
  const offenders = [];
  for (const f of files) {
    if (resolve(join(TESTS, f)) === SELF) continue;
    const parsed = parseKeylessImports(readFileSync(join(TESTS, f), 'utf8'), f);
    for (const err of parsed.syntaxErrors) offenders.push(`${f}: 语法不可解析——fail-loud（${err}）`);
    for (const name of parsed.forbiddenCalls) offenders.push(`${f} → 运行时调用 ${name}`);
  }
  assert.deepEqual(offenders, [], 'spawn/exec/fetch 族只认解析后的调用位置——字符串夹具与注释不算执行');
});

test('③ import 图：tests 禁 import 驱动面 + 本地闭包零禁物（传递引入可见）', () => {
  // 双道：regex 驱动面禁令（报因明确——smoke/probe/dist/verify 设计上就要起进程/浏览器/
  // 真模型相邻）+ 闭包图（本质守卫：跟随本地字面量 import 含再导出与动态字面量，禁物
  // 零容忍——run-gates/run-ops 的纯件靠它持续背书，混住驱动目录不再是豁免口）。
  const importers = [];
  for (const f of files) {
    if (resolve(join(TESTS, f)) === SELF) continue;
    const src = readFileSync(join(TESTS, f), 'utf8');
    if (/(?:from|import)\s*\(?['"][^'"]*scripts\/(?:smoke|probe|dist|verify)\//.test(src))
      importers.push(`${f} → scripts/(smoke|probe|dist|verify) 是驱动面——tests 的本地 import 走 scripts/lib/（run-gates/run-ops 纯件由闭包图背书）`);
  }
  assert.deepEqual(importers, [], '驱动面不得被 tests/ import（import 进来会把 spawn/fetch 整条带进回归层）');

  // 闭包图：从全部 test 文件出发跟随本地 import，违禁模块/运行时调用零容忍
  // （真实活暴露面实录：verify-gates 曾 import gates-smoke、node-gate/evidence-audit
  //  顶层 spawnSync——判据核心已迁 lib，本图守"不再回来"）。
  const entries = files.map((f) => join(TESTS, f));
  const report = inspectKeylessGraph(entries, { libRoot: ROOT });
  const offenders = report.violations.map(({ file, reason, chain }) =>
    `${relative(ROOT, file)} → ${reason} [${chain.map((p) => relative(ROOT, p)).join(' → ')}]`);
  assert.deepEqual(offenders, [], 'tests 的本地 import 闭包必须零禁物（child_process/http/net 内置 + spawn/exec/fetch 运行时调用——传递引入也算）');
});

test('④ test 命令钉：node --test glob 即测试发现配置，改宽/改坏即红', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts?.test,
    "node --import tsx/esm --test --test-reporter=spec 'tests/**/*.test.mjs'",
    'pnpm test 的发现面被改动——test 命令形状由本守卫钉住（唯一登记的测试命令，docs/evaluation.md §L0；递归 glob，fixtures/ 与 _tmp/ 在发现面外；2026-10-21 加 --test-reporter=spec：非 TTY 默认 TAP 全量 3592 行，spec 605 行且失败行可读）',
  );
});

test('⑤ 纪律有家：tests/AGENTS 的分层句在场（散文会被忘，这里变成断言）', () => {
  const ag = readFileSync(join(ROOT, 'tests', 'AGENTS.md'), 'utf8');
  assert.ok(ag.includes('真模型/浏览器/网络/子进程检查走独立 smoke'), 'tests/AGENTS 缺分层句——纪律的家丢了');
  assert.ok(ag.includes('默认回归无凭据可跑'), 'tests/AGENTS 缺 keyless 句');
});
