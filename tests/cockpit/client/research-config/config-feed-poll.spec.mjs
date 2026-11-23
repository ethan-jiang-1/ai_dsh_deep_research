// config feed 的「发送后对账轮询」会话代际回归（BUG-392）。
//
// 病症：`send(..., { expectsChange: true })` 起 20×3s 轮询；轮询里调用共享的 `reload(sid)`——
// 它会改写 `epochRef.current` 并 abort 全局 `reloadControllerRef`。于是切到新会话后，旧会话的
// 3s tick 把新会话的库读打断、把 epoch 改回旧会话，新会话页面停在旧会话条目上。
//
// 负例留证 2026-11-23：BUG-392——把 `send` 的会话守卫/中止接线删掉（回到只检查 aliveRef）
// → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { loadRtl, makeMaliciousRunSource, makeTranslator, flushUi } from '../../client-dom-helpers.mjs'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { useConfigFeed } from '../../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts'
import { toolCall } from '../../../fixtures/events.mjs'

const LIB_A = '## 方法A\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n'
const LIB_B = '## 方法B\n- 找来源: x\n- 怎么核实: y\n- 报告怎么写: z\n- 不承诺: w\n'

const SNAP = {
  phase: 'ready', value: {}, problems: [], warnings: [], methodDefault: null,
  methodConflict: false, methodRead: 'absent', revision: 0, pending: false, outcome: null,
}

function makeDefaults() {
  return {
    subscribe: () => () => {}, getSnapshot: () => SNAP, refresh: async () => {},
    setPatch: async () => {}, unset: async () => {}, clear: async () => {}, dispose: () => {},
  }
}

async function runScenario() {
  const rtl = await loadRtl()
  let feed = null
  const run = makeMaliciousRunSource({ tree: { drt_demo: { 'question.md': '# Q\n\nBody\n' } } })
  const base = {
    t: makeTranslator(zh),
    readFile: async () => null,
    runSource: () => run.source,
    listDir: async () => [],
    defaults: makeDefaults(),
    follow: (_t, signal) => ({
      async *[Symbol.asyncIterator]() {
        yield { kind: 'history', events: [toolCall({ name: 'write_file', arguments: { path: 'drt_demo/question.md' } })] }
        await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
      },
    }),
    sendInstruction: async () => ({ ok: true, detail: 'ok' }),
    readLibrary: async (sid) => (sid === 's-B'
      ? { kind: 'ok', text: LIB_B, path: 'method-library.md' }
      : { kind: 'ok', text: LIB_A, path: 'method-library.md' }),
  }
  function Harness(props) {
    feed = useConfigFeed(props)
    return createElement('div', null, JSON.stringify(feed.entries?.map((entry) => entry.name) ?? null))
  }
  const utils = rtl.render(createElement(Harness, { ...base, sessionId: 's-A' }))
  await flushUi(rtl.act)
  void feed.send('create', { target: '新建', expectsChange: true })
  await rtl.act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
  utils.rerender(createElement(Harness, { ...base, sessionId: 's-B' }))
  await flushUi(rtl.act)
  return { rtl, utils, currentFeed: () => feed }
}

test('BUG-392 切会话后旧对账轮询立即退出：不中止新会话读、新会话展示自己的库', async () => {
  const { rtl, utils, currentFeed } = await runScenario()
  try {
    // 切到 s-B 后等过一个 3s tick 的窗口：旧轮询若还活着会 reload('s-A') 并把条目写回方法A。
    await rtl.act(async () => { await new Promise((resolve) => setTimeout(resolve, 3200)) })
    await flushUi(rtl.act)
    assert.match(utils.container.textContent ?? '', /方法B/, '新会话不得被旧会话的轮询串染')
    assert.doesNotMatch(utils.container.textContent ?? '', /方法A/)
    assert.equal(currentFeed().entries?.map((entry) => entry.name).join(','), '方法B')
    assert.equal(currentFeed().sending, false, '切会话后不得残留 sending')
  } finally {
    rtl.cleanup()
  }
})

// 负控：同会话内不切会话时，send 的对账轮询必须照常跑完并落到「已落盘」。
test('BUG-392 负控：同会话内 expectsChange 轮询照常对账（不因新守卫而停摆）', async () => {
  const rtl = await loadRtl()
  let feed = null
  const run = makeMaliciousRunSource({ tree: { drt_demo: { 'question.md': '# Q\n\nBody\n' } } })
  let library = LIB_A
  const base = {
    t: makeTranslator(zh),
    readFile: async () => null,
    runSource: () => run.source,
    listDir: async () => [],
    defaults: makeDefaults(),
    follow: (_t, signal) => ({
      async *[Symbol.asyncIterator]() {
        yield { kind: 'history', events: [] }
        await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
      },
    }),
    sendInstruction: async () => ({ ok: true, detail: 'ok' }),
    readLibrary: async () => ({ kind: 'ok', text: library, path: 'method-library.md' }),
  }
  const Harness = (props) => {
    feed = useConfigFeed(props)
    return createElement('div', null, feed.sending ? 'sending' : 'idle')
  }
  const { container, cleanup, act } = rtl.render(createElement(Harness, { ...base, sessionId: 's-A' }))
  try {
    await flushUi(rtl.act)
    void feed.send('create', { target: '新方法', expectsChange: true })
    await flushUi(rtl.act)
    assert.equal(container.textContent, 'sending', '发送后应进入 sending')
    // 模拟 Lead 落笔：下一次 reload 读到新条目。
    library = `${LIB_A}\n## 新方法\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n`
    await rtl.act(async () => { await new Promise((resolve) => setTimeout(resolve, 3100)) })
    await flushUi(rtl.act)
    assert.equal(feed.entries?.some((entry) => entry.name === '新方法'), true, '同会话轮询必须看到落盘')
  } finally {
    rtl.cleanup()
  }
})
