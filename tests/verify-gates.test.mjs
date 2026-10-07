// verify-gates.test.mjs — 门禁自测面的静态契约
//
// 真执行体 = scripts/smoke/gates-smoke.mjs（语料 verify.test.mjs 模式：临时副本 + 注入回归 +
// 真实 verify 入口判红；子进程归 smoke 道——layering 禁默认回归 spawn）。本测试钉住它俩的
// 接口不漂移：gates-smoke 的案例门禁名必须真实存在于 verify.mjs 的 gates 数组——门禁改名或
// 退役而案例表没跟 = 本测试红（此时 smoke 的案例会在对照组就红，这里更早、keyless 秒级报因）。
// 依据 = RFC「DSH 插件开发语料（二代）吸收审计」缺口 2（2026-10-07）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CASES } from '../scripts/smoke/gates-smoke.mjs';

const here = (p) => new URL(p, import.meta.url);
const verifySrc = readFileSync(here('../scripts/verify/verify.mjs'), 'utf8');
const gatesMatch = verifySrc.match(/const gates = \[([^\]]+)\]/);
assert.ok(gatesMatch, 'verify.mjs 的 gates 数组不可解析——本契约测试的前提失效');
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

test('每个案例门禁都真实存在于 verify.mjs gates 数组（改名/退役未跟案例 = 红）', () => {
  for (const c of CASES) {
    assert.ok(
      gatesArray.includes(c.gate),
      `案例门禁 ${c.gate} 不在 verify.mjs gates 数组——门禁已改名或退役，gates-smoke 案例表须同 diff 更新`,
    );
  }
});
