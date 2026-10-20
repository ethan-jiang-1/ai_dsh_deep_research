// session-events-core 回归 — 会话事件摘要/筛选/尾部（keyless 纯函数；CLI 壳 = session-events.mjs）。
// 反证口径：事件形状字段错位、时间缺失、空筛选、负数 tail 各有一条；不依赖真日志。
// teammate 标题反证（2026-10-21 卫生轮 维度6 件⑤，红先行）：readableTitle 未实现时本节
// import 即红；还原后绿。背景：teammate 会话标题 = harness 兜底截断的 system-reminder
// 原文（`<system-reminder> You are teammate "crit` 式），前缀噪声盖掉 teammate 名。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  eventSummary, eventClock, formatEventLine, filterEvents, tailEvents, textOfContent, readableTitle,
} from '../../scripts/lib/session-events-core.mjs'

test('eventSummary：tool/call 解析 JSON 字符串参数并截断；未知事件保留 type', () => {
  const call = { type: 'tool/call', data: { name: 'bash', arguments: JSON.stringify({ command: 'pwd' }) } }
  assert.match(eventSummary(call), /^tool bash \{.*"command":"pwd".*\}$/)
  const unknown = { type: 'future/event', data: { x: 1 } }
  assert.match(eventSummary(unknown), /^future\/event /)
})

test('eventSummary：assistant/user 只取 text content；turn/end 带 reason', () => {
  assert.equal(eventSummary({ type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'hi' }] } } }), 'assistant: hi')
  assert.equal(eventSummary({ type: 'user/message', data: { message: { content: [{ type: 'text', text: 'go' }] } } }), 'user: go')
  assert.equal(eventSummary({ type: 'turn/end', data: { turn: 2, reason: { kind: 'error' } } }), 'turn 2 end error')
})

test('eventClock/formatEventLine：epoch ms → HH:MM:SS；缺失时间不猜', () => {
  const e = { type: 'tool/call', time: new Date(2026, 9, 20, 12, 34, 56).getTime(), data: { name: 'x', arguments: '{}' } }
  assert.equal(eventClock(e), '12:34:56')
  assert.match(formatEventLine(e), /^\[12:34:56\] tool x /)
  assert.equal(eventClock({ type: 'x' }), '--:--:--')
})

test('filterEvents：type 子串 + grep 大小写不敏感；空筛选原样', () => {
  const events = [
    { type: 'tool/call', data: { name: 'bash', arguments: '{"command":"pwd"}' } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'Report READY' }] } } },
    { type: 'turn/end', data: { reason: { kind: 'error' } } },
  ]
  assert.equal(filterEvents(events).length, 3)
  assert.deepEqual(filterEvents(events, { type: 'tool' }).map((e) => e.type), ['tool/call'])
  assert.deepEqual(filterEvents(events, { grep: 'ready' }).map((e) => e.type), ['assistant/message'])
  assert.deepEqual(filterEvents(events, { type: 'turn', grep: 'error' }).map((e) => e.type), ['turn/end'])
})

test('tailEvents：N 条尾部、负数/非数原样；不修改入参', () => {
  const events = [{ n: 1 }, { n: 2 }, { n: 3 }]
  assert.deepEqual(tailEvents(events, 2), [{ n: 2 }, { n: 3 }])
  assert.equal(tailEvents(events, 0).length, 3)
  assert.equal(tailEvents(events, -1).length, 3)
  assert.equal(events.length, 3)
})

test('textOfContent：字符串/文本段/非文本段', () => {
  assert.equal(textOfContent('x'), 'x')
  assert.equal(textOfContent([{ type: 'text', text: 'a' }, { type: 'image' }, { type: 'text', text: 'b' }]), 'a b')
  assert.equal(textOfContent(null), '')
})

test('readableTitle：strip <system-reminder> 前缀，保留 teammate 名等有效信息', () => {
  assert.equal(readableTitle('<system-reminder> You are teammate "crit'), 'You are teammate "crit')
  assert.equal(readableTitle('<system-reminder>  You are teammate "anal'), 'You are teammate "anal', '多个空白一并剥')
  assert.equal(readableTitle('你是 Deep Research 团队的取证 wor'), '你是 Deep Research 团队的取证 wor', '无该前缀原样')
  assert.equal(readableTitle('<system-reminder>'), '', '只剩前缀 → 空（CLI 显示兜底标题）')
  assert.equal(readableTitle(null), '', '非字符串输入不炸（fail-soft）')
})

test('eventSummary：session/title 用 readableTitle 摘要（teammate 标题可读）', () => {
  const e = { type: 'session/title', data: { title: '<system-reminder> You are teammate "crit' } }
  assert.equal(eventSummary(e), 'title You are teammate "crit')
  assert.equal(eventSummary({ type: 'session/title', data: { title: '正常标题' } }), 'title 正常标题')
})
