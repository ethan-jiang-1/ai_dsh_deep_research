// startup-effect.test.mjs — Host 启动行的 effect 生命周期（2026-11-03 审计 P2/⑦）。
//
// 合同：`apply` 只能通过 `ctx.effect` 注册（dispose 即取消在途登记/建会话）；取消后不得再产生
// 新副作用（尤其 sessionController.create —— 重复 apply 不能多开 Lead 会话）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../../packages/deep-research-pack/src/startup/index.ts'

const makeCtx = () => {
  const disposers = []
  const registryPaths = []
  const sessionCreates = []
  const ctx = {
    effect(fn) { const dispose = fn(); disposers.push(dispose); return dispose },
    logger: { info() {}, warn() {} },
    workspaceRegistry: { create: async (path) => { registryPaths.push(path); return { path, workspaceId: 'w1' } } },
    get(name) {
      return name === 'sessionController'
        ? { create: async (input) => { sessionCreates.push(input); return { sessionId: 'session-x' } } }
        : undefined
    },
  }
  return { ctx, disposers, registryPaths, sessionCreates }
}

test('apply 走 ctx.effect；dispose 后不再建会话（登记已发生，会话未发生）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'drs-startup-'))
  const previous = process.env.DEEP_RESEARCH_WORKSPACE
  process.env.DEEP_RESEARCH_WORKSPACE = dir
  try {
    const { ctx, disposers, registryPaths, sessionCreates } = makeCtx()
    apply(ctx)
    assert.equal(disposers.length, 1, 'apply 必须只注册一个 effect')
    assert.equal(typeof disposers[0], 'function', 'effect 必须返回 disposer')
    disposers[0]() // 模拟 HMR/dispose：abort 在途动作
    await new Promise((resolve) => setTimeout(resolve, 50))
    assert.equal(registryPaths.length, 1, '工作区登记可以已发生（它先于取消点）')
    assert.deepEqual(sessionCreates, [], '取消后不得再建会话——重复 apply 不能多开')
  } finally {
    if (previous === undefined) delete process.env.DEEP_RESEARCH_WORKSPACE
    else process.env.DEEP_RESEARCH_WORKSPACE = previous
    rmSync(dir, { recursive: true, force: true })
  }
})
