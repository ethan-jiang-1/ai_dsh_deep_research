// 负例留证 2026-11-14：BUG-095——bootWeb 成功路径曾不清 banner timeout；修法 =
// waitForWebBanner 纯状态机统一经 settle 清理 timer 并摘除 stdout/stderr/exit 监听。
// 红配方：删 clearTimeout 或 off 摘监听 → activeResources / listenerCount 断言真跑红；
// 让 web-harness 绕开 waitForWebBanner → AST 委托守卫红。
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { waitForWebBanner } from '../../checks/lib/shared/web-banner.mjs'
import { parseKeylessImports } from '../../checks/lib/test-infra/keyless-imports.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function makeMockChild() {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  // 契约（2026-11-16）：waitForWebBanner 先 setEncoding('utf8')，避免多字节 chunk 边界被撕成
  // U+FFFD；假流提供同名 no-op 即可（行为判据仍看 timer 清理与监听摘除）。
  child.stdout.setEncoding = () => {}
  child.stderr.setEncoding = () => {}
  return child
}

const activeTimeoutCount = () => process.getActiveResourcesInfo().filter((item) => item === 'Timeout').length

test('waitForWebBanner 三条结算路径均清零 timer 句柄与流监听（BUG-095 行为真跑）', async () => {
  // 1) 横幅到达成功路径：60s 超时定在远期，resolve 后不得残留悬挂 Timeout
  {
    const child = makeMockChild()
    const before = activeTimeoutCount()
    const pending = waitForWebBanner(child, { port: 3199, profile: 'deep-research', timeoutMs: 60_000, tailChars: 400 })
    assert.equal(activeTimeoutCount(), before + 1, '等待期间应挂起 1 个 banner timer')
    child.stdout.emit('data', Buffer.from('ready at http://127.0.0.1:3199/?token=tok-abc123\n'))
    const result = await pending
    assert.equal(result.token, 'tok-abc123')
    assert.match(result.output(), /tok-abc123/)
    assert.equal(activeTimeoutCount(), before, '横幅命中后必须立即 clearTimeout，不留悬挂句柄')
    assert.equal(child.stdout.listenerCount('data'), 0)
    assert.equal(child.stderr.listenerCount('data'), 0)
    assert.equal(child.listenerCount('exit'), 0)
  }

  // 2) 子进程提前退出路径
  {
    const child = makeMockChild()
    const before = activeTimeoutCount()
    const pending = waitForWebBanner(child, { port: 3199, profile: 'deep-research', timeoutMs: 60_000, tailChars: 400 })
    child.stderr.emit('data', Buffer.from('EADDRINUSE: address already in use'))
    child.emit('exit', 1)
    await assert.rejects(pending, /web 进程提前退出（code 1）[\s\S]*EADDRINUSE/)
    assert.equal(activeTimeoutCount(), before, '提前退出后必须立即 clearTimeout')
    assert.equal(child.stdout.listenerCount('data'), 0)
    assert.equal(child.stderr.listenerCount('data'), 0)
    assert.equal(child.listenerCount('exit'), 0)
  }

  // 3) 超时路径
  {
    const child = makeMockChild()
    const before = activeTimeoutCount()
    const pending = waitForWebBanner(child, { port: 3199, profile: 'deep-research', timeoutMs: 20, tailChars: 400 })
    child.stdout.emit('data', Buffer.from('booting slowly...'))
    await assert.rejects(pending, /等待启动横幅超时[\s\S]*booting slowly/)
    assert.equal(activeTimeoutCount(), before, '超时结算后不得残留 timer')
    assert.equal(child.stdout.listenerCount('data'), 0)
    assert.equal(child.stderr.listenerCount('data'), 0)
    assert.equal(child.listenerCount('exit'), 0)
  }
})

test('web-harness.bootWeb 委托 waitForWebBanner 而非内联分叉副本（BUG-095 同源守卫）', () => {
  const src = readFileSync(join(ROOT, 'checks/lib/shared/web-harness.mjs'), 'utf8')
  const parsed = parseKeylessImports(src, 'web-harness.mjs')
  assert.ok(
    parsed.imports.some((item) => item.specifier === './web-banner.mjs'),
    'web-harness.mjs 必须引入 ./web-banner.mjs',
  )
  const sf = ts.createSourceFile('web-harness.mjs', src, ts.ScriptTarget.Latest, true)
  let callsWait = false
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'waitForWebBanner') {
      callsWait = true
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  assert.equal(callsWait, true, 'bootWeb 必须调用 waitForWebBanner')
})
