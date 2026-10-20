// tests/inject-reconcile.test.mjs —— 注入消息「落盘对账」判据的 keyless 契约测试。
//
// 为什么存在：BUG-021 的根因之一是**判据本身弱**——`cdp-probe --ask` 旧版只看 UI 文本增长与
// 固定串，发送是否真落进会话日志无人对账；于是"没发出去"与"发出去了没等到回复"共用同一句
// 失败信息，把真因盖住。本测试钉住对账判据的核心行为（纯函数，无浏览器/无 fs）。
//
// 负例留证 2026-10-11：BUG-021——判据弱化三条路各留一法：①`reconcileInjectedMessage` 恒返回
//   `landed:true`（不看事件内容）→ 用例 2/3/4 红；②丢掉 `sinceMs` 时间下界（同文旧事件也算命中）
//   → 用例 3 红；③只扫最后一条事件（不扫全量）→ 用例 1 红（命中事件在其之前）。另：空 `text`
//   若放行（`text === ''` 时 `includes('')` 恒真）→ 用例 6 红（防空语料）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileInjectedMessage } from '../../scripts/lib/inject-reconcile.mjs'

const T0 = 1_791_700_000_000

const userMsg = (seq, time, ...parts) => ({
  type: 'user/message',
  seq,
  time,
  data: { content: parts.map((text) => ({ type: 'text', text })) },
})

test('BUG-021：命中本时刻之后的 user/message（多段 content 拼接匹配）→ landed 且回报 seq', () => {
  const events = [
    { type: 'step/start', seq: 1, time: T0, data: {} },
    userMsg(2, T0 + 1000, '探针连通性测试：', '请只回复「探针收到」'),
    { type: 'assistant/attempt', seq: 3, time: T0 + 2000, data: {} },
  ]
  const r = reconcileInjectedMessage({ events, text: '请只回复「探针收到」', sinceMs: T0 })
  assert.equal(r.landed, true)
  assert.equal(r.seq, 2)
  assert.equal(r.at, T0 + 1000)
})

test('BUG-021：文本不在日志里 → landed:false（不得恒真）', () => {
  const events = [userMsg(1, T0 + 1000, '另一条完全不同的消息')]
  const r = reconcileInjectedMessage({ events, text: '请只回复「探针收到」', sinceMs: T0 })
  assert.equal(r.landed, false)
  assert.equal(r.seq, null)
})

test('BUG-021：同文旧事件早于 sinceMs 不算命中（时间下界必须咬）', () => {
  const events = [userMsg(1, T0 - 60_000, '请只回复「探针收到」'), userMsg(2, T0 + 5000, '别的')]
  const r = reconcileInjectedMessage({ events, text: '请只回复「探针收到」', sinceMs: T0 })
  assert.equal(r.landed, false)
})

test('BUG-021：只认 user/message——assistant 或其他类型含同文不算落盘', () => {
  const events = [
    { type: 'assistant/message', seq: 1, time: T0 + 1000, data: { content: [{ type: 'text', text: '请只回复「探针收到」' }] } },
    { type: 'system/message', seq: 2, time: T0 + 2000, data: { content: [{ type: 'text', text: '请只回复「探针收到」' }] } },
  ]
  const r = reconcileInjectedMessage({ events, text: '请只回复「探针收到」', sinceMs: T0 })
  assert.equal(r.landed, false)
})

test('BUG-021：畸形事件容忍（null / 缺 data / content 非数组 / 段非文本）不抛且不误判', () => {
  const events = [
    null,
    { type: 'user/message', seq: 1, time: T0 + 1000 },
    { type: 'user/message', seq: 2, time: T0 + 2000, data: { content: 'not-an-array' } },
    { type: 'user/message', seq: 3, time: T0 + 3000, data: { content: [{ type: 'image', url: 'x' }] } },
    { type: 'user/message', seq: 4, time: T0 + 4000, data: { text: '请只回复「探针收到」' } },
  ]
  const r = reconcileInjectedMessage({ events, text: '请只回复「探针收到」', sinceMs: T0 })
  assert.equal(r.landed, true, 'data.text 形态（无 content 数组）应被认出')
  assert.equal(r.seq, 4)
})

test('BUG-021：空 text 不放行（防空语料——includes("") 恒真的坑）', () => {
  const events = [userMsg(1, T0 + 1000, '任何内容')]
  assert.equal(reconcileInjectedMessage({ events, text: '', sinceMs: T0 }).landed, false)
  assert.equal(reconcileInjectedMessage({ events, text: '   ', sinceMs: T0 }).landed, false)
  assert.equal(reconcileInjectedMessage({ events: [], text: 'x', sinceMs: T0 }).landed, false)
})

test('BUG-021：多条命中时回报**最后一条**（最新）的 seq —— 可定位本次注入', () => {
  const events = [userMsg(1, T0 + 1000, '同文'), userMsg(2, T0 + 2000, '同文')]
  const r = reconcileInjectedMessage({ events, text: '同文', sinceMs: T0 })
  assert.equal(r.landed, true)
  assert.equal(r.seq, 2)
})
