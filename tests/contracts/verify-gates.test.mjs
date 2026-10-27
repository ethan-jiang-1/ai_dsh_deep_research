// verify-gates.test.mjs — 门禁自测面的静态契约
//
// 真执行体 = scripts/smoke/gates-smoke.mjs（语料 verify.test.mjs 模式：临时副本 + 注入回归 +
// 真实 verify 入口判红；子进程归 smoke 道——layering 禁默认回归 spawn）。案例表住
// scripts/lib/gates-cases.mjs（纯 fs——layering 二代后 tests 只消费 lib，不 import 驱动壳）。
// 本测试钉住它俩的接口不漂移：gates-smoke 的案例门禁名必须真实存在于 context.mjs 的 gates
// 数组——门禁改名或退役而案例表没跟 = 本测试红（此时 smoke 的案例会在对照组就红，这里更早、
// keyless 秒级报因）。依据 = RFC「DSH 插件开发语料（二代）吸收审计」缺口 2（2026-10-07）。
// 负例留证 2026-10-28：删掉 gates-cases 里 count-free 的唯一案例 → 反向覆盖断言红
//   （`覆盖缺口与 NO_CASE_GATES 不一致`，`# fail 1`）；还原 → 绿。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CASES, CONTROLS, NO_CASE_GATES } from '../../scripts/lib/gates-cases.mjs';

const here = (p) => new URL(p, import.meta.url);
// 门禁名单正本 = context.mjs（2026-10-27 拆域：verify.mjs 只留入口，gates 数组搬进 context）；
// 本测试是 keyless 纯 fs，不 import context（其闭包含 child_process）——按源码文本解析。
const verifySrc = readFileSync(here('../../scripts/verify/context.mjs'), 'utf8');
const gatesMatch = verifySrc.match(/const gates = \[([^\]]+)\]/);
assert.ok(gatesMatch, 'context.mjs 的 gates 数组不可解析——本契约测试的前提失效');
const gatesArray = gatesMatch[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);

test('gates-smoke 案例表非空且形状完整（id 唯一 + gate 字符串 + mutate 函数）', () => {
  assert.ok(CASES.length > 0, '案例表为空——门禁自测面失效（防空语料）');
  for (const c of CASES) {
    assert.equal(typeof c.id, 'string', `案例缺 id：${JSON.stringify(c).slice(0, 80)}`);
    assert.ok(c.id.length > 0, '案例 id 为空串');
    assert.equal(typeof c.gate, 'string', `案例 ${c.id} 缺 gate 名`);
    assert.equal(typeof c.mutate, 'function', `案例 ${c.id} 缺 mutate 注入函数`);
  }
  assert.equal(new Set(CASES.map((c) => c.id)).size, CASES.length,
    '案例 id 重复（同一门禁可有多个注入形态——id 防整条目重复）');
});

test('current backlog gate is registered and proposal scheduling is retired', () => {
  assert.ok(gatesArray.includes('backlog-liveness'), 'backlog-liveness 缺少门禁登记');
  assert.ok(!gatesArray.includes('plans-liveness'), 'plans-liveness 已被新目录合同取代');
  assert.ok(!gatesArray.includes('proposal-scheduled'), 'proposed RFC 不要求 queue 行');
  assert.ok(!gatesArray.includes('queue-pointer-live'), '仓级 queue 门禁已退役');
  assert.ok(!verifySrc.includes('queueSection'), '入口链不得读取仓级 queue');
  assert.ok(CONTROLS.some((c) => c.id === 'backlog-active-issue'));
  assert.ok(CASES.some((c) => c.id === 'entry-chain-no-title'));
});

test('每个案例门禁都真实存在于 verify.mjs gates 数组（改名/退役未跟案例 = 红）', () => {
  for (const c of CASES) {
    assert.ok(
      gatesArray.includes(c.gate),
      `案例门禁 ${c.gate} 不在 context.mjs gates 数组——门禁已改名或退役，gates-smoke 案例表须同 diff 更新`,
    );
  }
});

// 反向覆盖：gates 数组里没有常驻案例的门禁，必须恰为 NO_CASE_GATES 登记的名单。
// 2026-10-27 卫生轮立红：此前只做单向对账（案例 → gates），新增门禁不带案例、案例退役后
// 遗留缺口都不会红，账本因此漂到 39/43（真值 43/47）。分子分母改由代码维护，散文只指这里。
test('覆盖缺口恰为登记的 4 道结构性例外（新增门禁不带案例 = 红）', () => {
  const covered = new Set(CASES.map((c) => c.gate));
  const uncovered = gatesArray.filter((g) => !covered.has(g)).sort();
  const registered = NO_CASE_GATES.map((e) => e.gate).sort();
  assert.deepEqual(uncovered, registered,
    `覆盖缺口与 NO_CASE_GATES 不一致——未覆盖：${uncovered.join(', ')}；登记：${registered.join(', ')}`);
  // 登记项必须仍存在于 gates 数组（门禁退役而登记遗留 = 红）
  for (const entry of NO_CASE_GATES) {
    assert.ok(gatesArray.includes(entry.gate), `NO_CASE_GATES 里的 ${entry.gate} 已不在 gates 数组——退役时删登记`);
    assert.ok(entry.reason.length >= 10, `${entry.gate} 缺结构性例外理由`);
  }
  // 防空语料：两侧都非空，避免"全对上但都是空集"
  assert.ok(gatesArray.length > 0 && CASES.length > 0, '防空语料：gates 数组或案例表为空');
});
