// 负例留证 2026-11-14：BUG-136——探测脚本被历史宿主或异源进程占住默认端口后自锁，且部分探针收尾调了
// 不存在的 booted.stop() 留孤儿进程；修法 = resolveProbePort（预收割失败 → 临时空闲端口）+
// reapBootedWeb（进程组 -pid SIGKILL + child.kill + reclaimPort），全部起宿主的 behavior 探针统一接入。
// 红配方：任一探针漏接 prepareProbePort / cleanupBootedProbe 或调 .stop() → 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { reapBootedWeb, resolveProbePort } from '../../scripts/lib/port-reclaim-policy.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const BEHAVIOR_DIR = join(ROOT, 'probes', 'behavior')

test('resolveProbePort 与 reapBootedWeb 行为契约（BUG-136 纯核真跑）', async () => {
  // 1) 端口干净或已被本仓旧实例让出：沿用首选端口，不分配临时端口
  let allocated = 0
  const cleanPort = await resolveProbePort(3122, {
    reclaim: async (port) => {
      assert.equal(port, 3122)
      return null
    },
    allocateFreePort: async () => {
      allocated += 1
      return 45100
    },
  })
  assert.equal(cleanPort, 3122)
  assert.equal(allocated, 0)

  // 2) 首选端口被外部进程占住（reclaim 返回非空原因）：回落临时空闲端口并触发通知
  const fallbacks = []
  const nextPort = await resolveProbePort(3122, {
    reclaim: async () => '端口 3122 被非本仓进程 999（python3）占用',
    allocateFreePort: async () => 45123,
    onFallback: (from, to, why) => fallbacks.push({ from, to, why }),
  })
  assert.equal(nextPort, 45123)
  assert.equal(fallbacks.length, 1)
  assert.equal(fallbacks[0].from, 3122)
  assert.equal(fallbacks[0].to, 45123)

  // 3) reapBootedWeb：整组 -pid SIGKILL（容忍 ESRCH）+ child.kill + 端口复收割
  const actions = []
  await reapBootedWeb(
    {
      child: {
        pid: 4321,
        kill: (sig) => actions.push(`child:${sig}`),
      },
    },
    45123,
    {
      killProcess: (pid, sig) => {
        actions.push(`group:${pid}:${sig}`)
        const err = new Error('ESRCH')
        throw err
      },
      reclaim: async (port) => {
        actions.push(`reclaim:${port}`)
        return null
      },
    },
  )
  assert.deepEqual(actions, ['group:-4321:SIGKILL', 'child:SIGKILL', 'reclaim:45123'])
})

test('全部起宿主的 behavior 探针均接入 prepareProbePort + finally cleanupBootedProbe（BUG-136 全量门）', () => {
  const files = readdirSync(BEHAVIOR_DIR).filter((name) => name.endsWith('.mjs')).sort()
  assert.ok(files.length >= 6, '防空语料：behavior 探针少于 6 件')
  const problems = []
  let bootWebCallers = 0

  for (const file of files) {
    const src = readFileSync(join(BEHAVIOR_DIR, file), 'utf8')
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true)
    let callsBootWeb = false
    let callsPrepare = false
    let callsCleanupInFinally = false
    let callsPhantomStop = false

    const hasCallInSubtree = (root, fnName) => {
      let hit = false
      const walk = (n) => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === fnName) hit = true
        ts.forEachChild(n, walk)
      }
      walk(root)
      return hit
    }

    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression) && node.expression.text === 'bootWeb') callsBootWeb = true
        if (ts.isIdentifier(node.expression) && node.expression.text === 'prepareProbePort') callsPrepare = true
        if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'stop') {
          callsPhantomStop = true
        }
      }
      if (ts.isTryStatement(node) && node.finallyBlock && hasCallInSubtree(node.finallyBlock, 'cleanupBootedProbe')) {
        callsCleanupInFinally = true
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)

    if (!callsBootWeb) continue
    bootWebCallers += 1
    if (!callsPrepare) problems.push(`${file}: 调用了 bootWeb 但未调用 prepareProbePort（端口被占会自锁）`)
    if (!callsCleanupInFinally) problems.push(`${file}: 调用了 bootWeb 但 finally 块未调用 cleanupBootedProbe（漏整组收割）`)
    if (callsPhantomStop) problems.push(`${file}: 仍残留 .stop() 调用（bootWeb 返回值无 stop 方法）`)
  }

  assert.ok(bootWebCallers >= 6, `防空语料：bootWeb 探针数过少（实得 ${bootWebCallers}）`)
  assert.deepEqual(problems, [])
})
