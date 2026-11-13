// local-date.spec.mjs — 人读日期行的本地口径契约（BUG-017 正修的测试资产，先红后绿）。
// 纪律同源 = 研究手册「日期最小契约：先跑 bash date」：人读日期 = 系统本地日；
// UTC ISO slice 在本地 00:00–08:00 窗口差一天（mcp-hosts 归档实证：HITL2 代答行日期
// 早于 HITL1 定稿，append-only 次序破坏）。机器比较用的时间戳保持 UTC ISO，不走本 helper。
//
// 判据与宿主时区解耦（2026-11-03 卫生审计）：旧断言包在 `if (utc !== local)` 里，CI 是 UTC
// 时该分支永不进入——把实现改回 UTC slice 仍然绿。现在用 `localDateStr(at, timeZone)` 固定
// 两个时区断言，UTC 宿主也能咬人。
//
// 负例留证 2026-10-09：BUG-017——localDateStr 改回 UTC slice（正修前的原始红形态）→ 边界
//   时刻断言红（UTC 口径差一天）；还原 → 绿。红绿实录 = BUG-017 卡修复关联。
// 负例留证 2026-11-03：仍用 UTC slice 实现、`TZ=UTC` 跑本文件 → 上海时区断言必红（旧版此处
//   2/2 绿）；还原为 toLocaleDateString → 绿。是"守卫在 CI 时区失效"的直接反证。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDateStr } from '../../scripts/lib/local-date.mjs';

test('localDateStr：边界时刻按指定时区取日，UTC slice 实现在任何宿主时区都必红（BUG-017 形态判别）', () => {
  // mcp-hosts 事故同款窗口：UTC = 10-07 深夜，东八区本地 = 10-08 凌晨
  const at = new Date('2026-10-07T20:00:00Z');
  assert.match(localDateStr(at), /^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形态（sv locale 零填充）');
  assert.equal(localDateStr(at, 'Asia/Shanghai'), '2026-10-08', '东八区应给 10-08');
  assert.equal(localDateStr(at, 'UTC'), '2026-10-07', 'UTC 应给 10-07');
  // 两断言互为对照：UTC slice 实现只能满足后者，上海断言必红——与宿主时区无关。
});

test('localDateStr：缺省 = 当前时刻的本地日（与 bash date +%F 同源）', () => {
  assert.equal(localDateStr(), new Date().toLocaleDateString('sv'));
});
