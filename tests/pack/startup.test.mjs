// startup — 产品 Host 启动行（D40）：env/设置 → 登记工作区 → best-effort Lead 会话。
// 反证：删掉"无配置短路" / 删掉工作区校验 / 删掉 registry 缺席分支 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { apply } from '../../packages/deep-research-pack/src/startup/index.ts'

const temp = () => mkdtempSync(join(tmpdir(), 'dr-startup-'))
const cleanup = (dir) => rmSync(dir, { recursive: true, force: true })

function fakeContext({ withRegistry = true, withSessions = false } = {}) {
  const calls = []
  const sessions = []
  const logs = []
  const ctx = {
    logger: { info: (line) => logs.push(['info', line]), warn: (line) => logs.push(['warn', line]) },
    // Cordis 的可选服务读取面（启动行用 ctx.get 而不是属性访问——属性会触发 inject 守卫）。
    get(name) { return ctx[name] },
  }
  if (withRegistry) {
    ctx.workspaceRegistry = {
      create: async (path, title) => {
        calls.push({ path, title })
        return { path, workspaceId: 'ws-test' }
      },
    }
  }
  if (withSessions) {
    ctx.sessionController = {
      create: async (input) => {
        sessions.push(input)
        return { sessionId: 'session-test' }
      },
    }
  }
  return { ctx, calls, sessions, logs }
}

const withEnv = async (vars, fn) => {
  const saved = {}
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = Object.hasOwn(process.env, key) ? process.env[key] : undefined
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return await fn()
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

const workspaceEnv = (dir, home) => ({
  DSH_HOME: home,
  DEEP_RESEARCH_WORKSPACE: dir,
})

test('无 env 且无设置：零行为、不调用 registry', async () => {
  const home = temp()
  try {
    const { ctx, calls } = fakeContext()
    await withEnv({ DSH_HOME: home, DEEP_RESEARCH_WORKSPACE: undefined }, () => apply(ctx))
    assert.deepEqual(calls, [])
  } finally { cleanup(home) }
})

test('env 在场：登记绝对路径 + 产品标题', async () => {
  const home = temp()
  const dir = temp()
  try {
    const { ctx, calls } = fakeContext()
    await withEnv(workspaceEnv(dir, home), () => apply(ctx))
    assert.equal(calls.length, 1)
    assert.equal(calls[0].path, dir)
    assert.equal(calls[0].title, `Deep Research — ${basename(dir)}`)
  } finally { cleanup(home); cleanup(dir) }
})

test('非目录：只 warn，不登记、不抛', async () => {
  const home = temp()
  const dir = temp()
  try {
    const file = join(dir, 'file.txt')
    writeFileSync(file, 'x')
    const { ctx, calls, logs } = fakeContext()
    await withEnv(workspaceEnv(file, home), () => apply(ctx))
    assert.deepEqual(calls, [])
    assert.ok(logs.some(([, line]) => line.includes('工作区不可用')))
  } finally { cleanup(home); cleanup(dir) }
})

test('registry 缺席：只 warn，不抛', async () => {
  const home = temp()
  const dir = temp()
  try {
    const { ctx, logs } = fakeContext({ withRegistry: false })
    await withEnv(workspaceEnv(dir, home), () => apply(ctx))
    assert.ok(logs.some(([, line]) => line.includes('workspaceRegistry')))
  } finally { cleanup(home); cleanup(dir) }
})

test('sessionController 在场：建 Lead 会话；env 来源不写设置', async () => {
  const home = temp()
  const dir = temp()
  try {
    const { ctx, sessions } = fakeContext({ withSessions: true })
    await withEnv(workspaceEnv(dir, home), () => apply(ctx))
    assert.deepEqual(sessions, [{ cwd: dir, agentPreset: 'lead' }])
    assert.equal(existsSync(join(home, 'deep-research', 'settings.json')), false)
  } finally { cleanup(home); cleanup(dir) }
})

test('设置文件来源：建会话并回写 sessionId', async () => {
  const home = temp()
  const dir = temp()
  try {
    mkdirSync(join(home, 'deep-research'), { recursive: true })
    writeFileSync(join(home, 'deep-research', 'settings.json'),
      JSON.stringify({ schemaVersion: 2, workspace: dir, updatedAt: '2026-11-01T00:00:00.000Z' }))
    const { ctx, calls, sessions } = fakeContext({ withSessions: true })
    await withEnv({ DSH_HOME: home, DEEP_RESEARCH_WORKSPACE: undefined }, () => apply(ctx))
    assert.equal(calls.length, 1)
    assert.deepEqual(sessions, [{ cwd: dir, agentPreset: 'lead' }])
    const saved = JSON.parse(readFileSync(join(home, 'deep-research', 'settings.json'), 'utf8'))
    assert.equal(saved.sessionId, 'session-test')
  } finally { cleanup(home); cleanup(dir) }
})

test('优先级：env 压过设置文件，且不覆盖设置（三入口的顺序有机械判据）', async () => {
  const home = temp()
  const outside = temp()
  const fromEnv = mkdirSync(join(outside, 'env-dir'), { recursive: true })
  const fromSettings = mkdirSync(join(outside, 'settings-dir'), { recursive: true })
  mkdirSync(join(home, 'deep-research'), { recursive: true })
  const settingsFile = join(home, 'deep-research', 'settings.json')
  const saved = `${JSON.stringify({ schemaVersion: 2, workspace: fromSettings }, null, 2)}\n`
  writeFileSync(settingsFile, saved)
  const { ctx, calls } = fakeContext()
  try {
    await withEnv({ DSH_HOME: home, DEEP_RESEARCH_WORKSPACE: fromEnv }, () => apply(ctx))
    assert.deepEqual(calls.map((call) => call.path), [fromEnv], 'env 在场时必须用 env 的工作区')
    assert.equal(readFileSync(settingsFile, 'utf8'), saved, 'env 来源不得回写设置文件')
  } finally {
    cleanup(home)
    cleanup(outside)
  }
})
