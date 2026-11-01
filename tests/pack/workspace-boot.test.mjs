// workspace-boot — 产品 Host 半：env 缺席零行为；env 在场登记工作区（带产品标题）；
// 非目录失败；registry 缺席只告警。真实 Web 首屏由 product-boot-smoke 证明。
// 反证：删掉 env 缺席短路 / 删掉 isDirectory 守卫 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { apply } from '../../packages/deep-research-pack/src/workspace-boot/index.ts'

const temp = () => mkdtempSync(join(tmpdir(), 'dr-boot-'))
const cleanup = (dir) => rmSync(dir, { recursive: true, force: true })

function fakeContext({ withRegistry = true } = {}) {
  const calls = []
  const logs = []
  const ctx = {
    logger: { info: (line) => logs.push(['info', line]), warn: (line) => logs.push(['warn', line]) },
  }
  if (withRegistry) {
    ctx.workspaceRegistry = {
      create: async (path, title) => {
        calls.push({ path, title })
        return { path, workspaceId: 'ws-test' }
      },
    }
  }
  return { ctx, calls, logs }
}

const withEnv = async (value, fn) => {
  const had = Object.hasOwn(process.env, 'DEEP_RESEARCH_WORKSPACE')
  const previous = process.env.DEEP_RESEARCH_WORKSPACE
  if (value === undefined) delete process.env.DEEP_RESEARCH_WORKSPACE
  else process.env.DEEP_RESEARCH_WORKSPACE = value
  try {
    return await fn()
  } finally {
    if (had) process.env.DEEP_RESEARCH_WORKSPACE = previous
    else delete process.env.DEEP_RESEARCH_WORKSPACE
  }
}

test('env 缺席：零行为、不调用 registry', async () => {
  const { ctx, calls } = fakeContext()
  await withEnv(undefined, () => apply(ctx))
  assert.deepEqual(calls, [])
})

test('env 在场：登记绝对路径 + 产品标题', async () => {
  const dir = temp()
  try {
    const { ctx, calls } = fakeContext()
    await withEnv(dir, () => apply(ctx))
    assert.equal(calls.length, 1)
    assert.equal(calls[0].path, dir)
    assert.equal(calls[0].title, `Deep Research — ${basename(dir)}`)
  } finally {
    cleanup(dir)
  }
})

test('非目录：拒绝（不静默登记文件）', async () => {
  const dir = temp()
  try {
    const file = join(dir, 'file.txt')
    const { writeFileSync } = await import('node:fs')
    writeFileSync(file, 'x')
    const { ctx, calls } = fakeContext()
    await assert.rejects(() => withEnv(file, () => apply(ctx)), /not a directory/)
    assert.deepEqual(calls, [])
  } finally {
    cleanup(dir)
  }
})

test('registry 缺席：只 warn，不抛', async () => {
  const dir = temp()
  try {
    const { ctx, logs } = fakeContext({ withRegistry: false })
    await withEnv(dir, () => apply(ctx))
    assert.ok(logs.some(([, line]) => line.includes('workspaceRegistry')))
  } finally {
    cleanup(dir)
  }
})
