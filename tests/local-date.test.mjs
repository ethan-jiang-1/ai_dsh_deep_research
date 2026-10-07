// local-date.test.mjs — 人读日期行的本地口径契约（BUG-017 正修的测试资产，先红后绿）。
// 纪律同源 = 研究手册「日期最小契约：先跑 bash date」：人读日期 = 系统本地日；
// UTC ISO slice 在本地 00:00–08:00 窗口差一天（mcp-hosts 归档实证：HITL2 代答行日期
// 早于 HITL1 定稿，append-only 次序破坏）。机器比较用的时间戳保持 UTC ISO，不走本 helper。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDateStr } from '../scripts/lib/local-date.mjs';

test('localDateStr：边界时刻取本地日，不是 UTC slice（BUG-017 形态判别）', () => {
  // mcp-hosts 事故同款窗口：UTC = 10-07 深夜，东八区本地 = 10-08 凌晨
  const at = new Date('2026-10-07T20:00:00Z');
  const utc = at.toISOString().slice(0, 10);
  const local = at.toLocaleDateString('sv');
  assert.match(localDateStr(at), /^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形态（sv locale 零填充）');
  // 本机时区使两口径可分时（东八区恒可），UTC slice 实现（旧 hitl-answer:351 形态）在此必红
  if (utc !== local) {
    assert.equal(localDateStr(at), local, `UTC 口径会给 ${utc}（差一天）——正是 BUG-017 的 provenance 错位形态`);
  }
});

test('localDateStr：缺省 = 当前时刻的本地日（与 bash date +%F 同源）', () => {
  assert.equal(localDateStr(), new Date().toLocaleDateString('sv'));
});
