// defaults-effect.spec.mjs — host 行注册合同：context 名/order/插值 + 命令名/描述 + effect 回收。
//
// 判据（issue A3/A6）：`research:defaults` 在 order 206、interpolate false；`/research-defaults`
// 的 handler 从 agent.session.header.cwd 取 workspace；两个注册都走 ctx.effect，可回收。
//
// 红证：把 context 名改成 research:manual、order 改回 500、去掉 interpolate:false、或把命令
// 注册移出 effect → 红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../../packages/deep-research-pack/src/defaults/index.ts'
import { resetDefaultsSectionCache } from '../../packages/deep-research-pack/src/defaults/context.ts'
import { DEFAULTS_FILE } from '../../packages/deep-research-pack/src/lib/research-defaults.ts'

const dirs = []
test.after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'research-defaults-effect-'))
  dirs.push(dir)
  return dir
}

function mount({ commands = true, defer = false } = {}) {
  const contexts = []
  const commandsRegistered = []
  const disposers = []
  let pendingInject = null
  const ctx = {
    effect(fn) {
      const dispose = fn()
      if (typeof dispose === 'function') disposers.push(dispose)
      return dispose
    },
    logger: { warn() {}, info() {} },
    systemPrompt: {
      context(input) {
        contexts.push(input)
        return () => {}
      },
    },
    get(name) {
      if (name === 'commands') throw new Error('apply must use ctx.inject, not ctx.get(commands)')
      return undefined
    },
    inject(names, callback) {
      if (!commands || !names.includes('commands')) return
      const scopedCommands = {
        register(definition) {
          commandsRegistered.push(definition)
          return () => {}
        },
      }
      const invoke = () => callback({
        commands: scopedCommands,
        effect(fn) {
          const dispose = fn()
          if (typeof dispose === 'function') disposers.push(dispose)
          return dispose
        },
      })
      if (defer) { pendingInject = invoke; return }
      invoke()
    },
  }
  return { ctx, contexts, commandsRegistered, disposers, flushCommands: () => pendingInject?.() }
}

test('context 注册：research:defaults / order 206 / interpolate false；text 从 agent cwd 读文件', () => {
  const cwd = workspace()
  writeFileSync(join(cwd, DEFAULTS_FILE), JSON.stringify({ schema: 1, revision: 1, effort: 'deep' }))
  writeFileSync(join(cwd, 'method-library.md'), '## 格局调研（2026-11-12，源自 对话）〔默认偏好〕\n- 找来源: a\n')
  resetDefaultsSectionCache()
  const { ctx, contexts } = mount()
  apply(ctx)
  assert.equal(contexts.length, 1)
  const context = contexts[0]
  assert.equal(context.name, 'research:defaults')
  assert.equal(context.order, 206)
  assert.equal(context.interpolate, false)
  const text = context.text({ agent: { session: { header: { cwd } } } })
  assert.match(text, /格局调研/)
  assert.match(text, /effort|deep/)
  assert.match(text, /未列出的维度.*= 自动/)
  // 无 agent/cwd 不贡献
  assert.equal(context.text({}), '')
  assert.equal(context.text({ agent: {} }), '')
})

test('无文件：context 返回空串；方法默认单独存在时仍有段', () => {
  const empty = workspace()
  resetDefaultsSectionCache()
  const first = mount()
  apply(first.ctx)
  assert.equal(first.contexts[0].text({ agent: { session: { header: { cwd: empty } } } }), '')

  const methodOnly = workspace()
  writeFileSync(join(methodOnly, 'method-library.md'), '## 格局调研〔默认偏好〕\n- 找来源: a\n')
  resetDefaultsSectionCache()
  const second = mount()
  apply(second.ctx)
  const text = second.contexts[0].text({ agent: { session: { header: { cwd: methodOnly } } } })
  assert.match(text, /格局调研/)
  assert.match(text, /未列出的维度.*= 自动/)
})

test('命令注册：/research-defaults；handler 从 agent cwd 写文件；effect disposer 可回收', async () => {
  const cwd = workspace()
  const { ctx, commandsRegistered, disposers } = mount()
  apply(ctx)
  assert.equal(commandsRegistered.length, 1)
  const command = commandsRegistered[0]
  assert.equal(command.name, 'research-defaults')
  assert.match(command.description, /项目研究默认/)
  assert.match(command.description, /Project research defaults/)
  const result = await command.handler({
    rawInput: 'set {"patch":{"effort":"deep"}}',
    agent: { session: { header: { cwd } } },
  })
  assert.equal(result.kind, 'success', result.text)
  assert.equal(existsSync(join(cwd, DEFAULTS_FILE)), true)

  const noCwd = await command.handler({ rawInput: 'show', agent: {} })
  assert.equal(noCwd.kind, 'error')
  assert.equal(noCwd.text, 'error no-workspace')

  for (const dispose of disposers) dispose()
})

test('commands 缺席：只注册 context，不注册命令，不 fail', () => {
  const { ctx, contexts, commandsRegistered } = mount({ commands: false })
  apply(ctx)
  assert.equal(contexts.length, 1)
  assert.equal(commandsRegistered.length, 0)
})

test('两个 workspace 不串：context 段按 cwd 隔离（cache 键含 cwd）', () => {
  const first = workspace()
  const second = workspace()
  // 同字节长度的两份文件 + 同一 mtime/size：只靠 stamp 的 cache 会把第二份读成第一份。
  const one = JSON.stringify({ schema: 1, revision: 1, source: { families: ['official'] } })
  const two = JSON.stringify({ schema: 1, revision: 1, source: { families: ['academic'] } })
  assert.equal(one.length, two.length, '夹具必须同长，cache 才可能误命中')
  const firstFile = join(first, DEFAULTS_FILE)
  const secondFile = join(second, DEFAULTS_FILE)
  writeFileSync(firstFile, one)
  writeFileSync(secondFile, two)
  const stamp = new Date('2026-11-12T21:00:00.000Z')
  utimesSync(firstFile, stamp, stamp)
  utimesSync(secondFile, stamp, stamp)
  resetDefaultsSectionCache()
  const { ctx, contexts } = mount()
  apply(ctx)
  const textOf = (cwd) => contexts[0].text({ agent: { session: { header: { cwd } } } })
  const a = textOf(first)
  const b = textOf(second)
  assert.match(a, /official/)
  assert.match(b, /academic/)
  assert.doesNotMatch(a, /academic/)
  assert.doesNotMatch(b, /official/)
})

test('commands 晚到：ctx.inject 等待 service 出现后再注册（禁止 ctx.get）', () => {
  const { ctx, contexts, commandsRegistered, flushCommands } = mount({ defer: true })
  apply(ctx)
  assert.equal(contexts.length, 1)
  assert.equal(commandsRegistered.length, 0, 'commands 未出现前不应注册')
  flushCommands()
  assert.equal(commandsRegistered.length, 1)
  assert.equal(commandsRegistered[0].name, 'research-defaults')
})
