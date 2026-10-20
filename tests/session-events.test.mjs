// session-events-core 回归 — 会话事件摘要/筛选/尾部（keyless 纯函数；CLI 壳 = session-events.mjs）。
// 反证口径：事件形状字段错位、时间缺失、空筛选、负数 tail 各有一条；不依赖真日志。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  eventSummary, eventClock, formatEventLine, filterEvents, tailEvents, textOfContent,
} from '../scripts/lib/session-events-core.mjs'

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
