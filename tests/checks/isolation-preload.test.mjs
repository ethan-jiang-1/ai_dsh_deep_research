// 负例留证 2026-11-14：BUG-024 / BUG-028——隔离预载此前只有 soak/日志，无 keyless 行为测试。
// 本测试在 node:vm 沙箱里执行 tools/llm-socket-isolation.cjs，注入假 fetch/假 undici：
//   ① DeepSeek POST 必开一次性 Agent + dispatcher，走 undici 而非共享池（024）；
//   ② undici 不可用时逐次计数并 console.warn，不静默（028）；
//   ③ 一旦一次性请求已发出，失败原样抛，绝不回落共享池（028）。
// 红配方：删掉 dispatcher/Agent → ①红；删 unisolatedCount/警告 → ②红；把 issued 分支改成回落 → ③红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOURCE = readFileSync(join(ROOT, 'tools/llm-socket-isolation.cjs'), 'utf8')

const emptyBody = () => new ReadableStream({ start(controller) { controller.close() } })

function load({ undici = null } = {}) {
  const logs = []
  const state = { origCalls: 0, agentInstances: 0, undiciCalls: 0, dispatcher: null }
  const fakeUndici = {
    Agent: class { constructor(options) { state.agentInstances += 1; state.dispatcher = options; } close() { return Promise.resolve() } },
    fetch: async (url, options) => {
      state.undiciCalls += 1
      state.undiciOptions = options
      return { status: 200, statusText: 'OK', headers: {}, body: { tee: () => [emptyBody(), emptyBody()] } }
    },
  }
  const origin = async (input, init) => { state.origCalls += 1; return { status: 299, statusText: 'ORIG', headers: {}, body: null } }
  const context = {
    __dirname: join(ROOT, 'tools'),
    module: { exports: {} },
    exports: {},
    process: { env: { DSH_ISOLATION_ANNOUNCE: '1' }, pid: 4242 },
    console: { warn: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) },
    setTimeout: () => ({ unref() {} }),
    Headers,
    Response,
    fetch: origin,
    require: (name) => {
      if (name === 'node:path') return { join: () => '/fake/undici' }
      if (name === 'node:child_process') return { execSync: () => '/fake/undici\n' }
      if (name === 'node:module') return { createRequire: () => () => undici ?? fakeUndici }
      if (undici === 'throw') throw new Error('no undici')
      return undici ?? fakeUndici
    },
  }
  context.globalThis = context
  vm.runInNewContext(SOURCE, context, { filename: 'llm-socket-isolation.cjs' })
  return { context, logs, state }
}

test('DeepSeek POST 必开一次性 Agent + dispatcher（BUG-024）', async () => {
  const { context, logs, state } = load()
  const call = context.fetch // 别名：静态 layering 扫描不把假 fetch 当真网络调用
  assert.ok(logs.some((line) => /预载已生效 pid=4242/.test(line)), '预载自证行')
  const res = await call('https://api.deepseek.com/messages', { method: 'POST', headers: {}, body: '{}' })
  assert.equal(state.undiciCalls, 1, '走 undici 一次性连接')
  assert.equal(state.origCalls, 0, '不得走共享池')
  assert.equal(state.agentInstances, 1, '每请求一个 Agent')
  assert.equal(state.dispatcher.connections, 1)
  assert.equal(state.undiciOptions.dispatcher instanceof Object, true, 'dispatcher 已传给 undici.fetch')
  assert.equal(res.status, 200)
  const pass = await call('https://api.deepseek.com/other', { method: 'POST' })
  assert.equal(state.origCalls, 1, '非 /messages 透传')
  assert.equal(pass.status, 299)
})

test('undici 不可用：逐次计数 + 警告，不静默（BUG-028）', async () => {
  const { context, logs, state } = load({ undici: 'throw' })
  const call = context.fetch
  const a = await call('https://api.deepseek.com/messages', { method: 'POST' })
  const b = await call('https://api.deepseek.com/messages', { method: 'POST' })
  assert.equal(a.status, 299)
  assert.equal(b.status, 299)
  assert.equal(state.origCalls, 2, '回落全局池仍只发一次')
  assert.ok(logs.some((line) => /未隔离请求 #1/.test(line)), '第一次回退计数 #1')
  assert.ok(logs.some((line) => /未隔离请求 #2/.test(line)), '第二次回退计数 #2')
})

test('一次性请求已发出后失败：原样抛，不回落共享池（BUG-028）', async () => {
  const { context, state } = load()
  const call = context.fetch
  // 覆盖 fake undici.fetch：第一次抛错；orig 计数应保持 0。
  const fake = context.require('/fake/undici')
  fake.fetch = async () => { throw new Error('socket boom') }
  await assert.rejects(() => call('https://api.deepseek.com/messages', { method: 'POST' }), /socket boom/)
  assert.equal(state.origCalls, 0, '已发出后绝不回落共享池（不双发）')
})
