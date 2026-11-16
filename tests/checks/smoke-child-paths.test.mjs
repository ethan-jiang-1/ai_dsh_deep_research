// 子进程/前置路径的分段字面量守卫（BUG-192 / BUG-193 类级，M3 非 JS 字面量）。
//
// 为什么需要：`join(ROOT, 'checks', 'lib', 'x.cjs')` 这类路径不在 import 图上——搬家后
// `smoke-imports` 不跟子进程 argv、`repo-conventions` 只扫 dev shell，断链只能等真跑时以
// `MODULE_NOT_FOUND` / banner 超时收场（BUG-192 离线预载、BUG-193 cdp-probe）。本守卫直接解析
// 全树源码里的 `join(ROOT, <全字符串字面量>)`，要求目标文件在场；运行前置（entry 的 existsSync
// + exit 2）负责把「未跑」显式化，本测试负责在搬家当刻咬住。
//
// 范围纪律：只查有文件扩展名的目标（目录/运行期 workspace 路径按需创建，不是资产）；
// `runtime/`、`_dist/`、`node_modules/`、pack 构建产物 `lib/` 与 vendor 构建产物 `lib/`
// （vendor/dsh/**/lib/，vendor-build 后才在场）是运行/生成区，跳过——keyless 合同 = fresh
// clone 无 vendor 构建也能跑，要求构建产物在场会把 clean clone / CI keyless 判红（暖树绿掩盖）。
// 防空语料：扫到的源码文件与路径字面量都设下限——扫描面被收窄成空集时红。
//
// 负例留证 2026-11-16：BUG-192 / BUG-193——把 snapshot-replay 的 OFFLINE_PRELOAD 或 cdp-ask
// 的 PROBE 指回搬家前路径（或任一源码里写一个不存在的 `join(ROOT, '…')`）→ 本测试点名红；
// 还原 → 绿。下条 synthetic 用例常驻复证同一判据。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCAN_ROOTS = ['checks', 'tools', 'probes']
const SOURCE = /\.(mjs|cjs|js|ts|tsx)$/
const GENERATED = /^(?:runtime|_dist|node_modules)\/|^packages\/deep-research-pack\/lib\/|^vendor\/dsh\/.+\/lib\//

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'harness-home'].includes(ent.name)) continue
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (SOURCE.test(ent.name)) out.push(p)
  }
  return out
}

/** 源码里的 `join(ROOT, '<全字面量参数>')` 目标（仓根相对，`/` 分隔）。 */
function literalJoinPaths(source, filePath) {
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true)
  const paths = []
  const visit = (node) => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'join'
      && node.arguments.length >= 2
      && ts.isIdentifier(node.arguments[0])
      && node.arguments[0].text === 'ROOT'
      && node.arguments.slice(1).every((arg) => ts.isStringLiteralLike(arg))
    ) {
      paths.push(node.arguments.slice(1).map((arg) => arg.text).join('/'))
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return paths
}

/** 扫一组 [仓根相对路径, 源码]；返回检查过的目标与缺席清单（可注入 fileExists 做负控）。 */
function scanChildPaths(sources, fileExists) {
  const checked = []
  const missing = []
  for (const [rel, source] of sources) {
    for (const target of literalJoinPaths(source, join(ROOT, rel))) {
      if (GENERATED.test(target)) continue
      if (!/\.[A-Za-z0-9]+$/.test(target)) continue // 目录/运行期路径不是资产
      checked.push(target)
      if (!fileExists(join(ROOT, target))) {
        missing.push(`${rel}: join(ROOT, ${target.split('/').map((part) => `'${part}'`).join(', ')}) -> ${target} 不存在——分段字面量未跟搬家（运行期 MODULE_NOT_FOUND / 子进程死）`)
      }
    }
  }
  return { checked, missing }
}

test('子进程/前置的分段路径字面量全部可解析（BUG-192 / BUG-193 类级守卫）', () => {
  const files = SCAN_ROOTS.flatMap((root) => walk(join(ROOT, root)))
  assert.ok(files.length >= 50, `防空语料：扫描源码过少（${files.length}）——范围被收窄`)
  const sources = files.map((file) => [relative(ROOT, file).split('\\').join('/'), readFileSync(file, 'utf8')])
  const { checked, missing } = scanChildPaths(sources, existsSync)
  assert.ok(checked.length >= 50, `防空语料：扫到的分段路径过少（${checked.length}）——解析器或扫描面失效`)
  assert.deepEqual(missing, [], `分段路径字面量指向不存在的文件（先修路径，再跑本测试）：\n${missing.join('\n')}`)
})

test('负控：分段路径指向不存在文件必红，运行期/生成区路径不误伤（BUG-192 / BUG-193 反证）', () => {
  const stale = "const p = join(ROOT, 'checks', 'lib', '__moved-probe__.cjs')\n"
  const bad = scanChildPaths([['synthetic.mjs', stale]], () => false)
  assert.deepEqual(bad.checked, ['checks/lib/__moved-probe__.cjs'])
  assert.equal(bad.missing.length, 1)
  assert.match(bad.missing[0], /__moved-probe__/)

  const good = scanChildPaths([['synthetic.mjs', stale]], (p) => p.endsWith('__moved-probe__.cjs'))
  assert.deepEqual(good.missing, [])

  const runtime = scanChildPaths([['synthetic.mjs', "const p = join(ROOT, 'runtime', 'smoke-workspace', 'x.lock')\n"]], () => false)
  assert.deepEqual(runtime.checked, [])

  const dirOnly = scanChildPaths([['synthetic.mjs', "const p = join(ROOT, 'research-workspace')\n"]], () => false)
  assert.deepEqual(dirOnly.checked, [])

  const vendorLib = scanChildPaths([['synthetic.mjs', "const p = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'lib', 'bin.js')\n"]], () => false)
  assert.deepEqual(vendorLib.checked, [], 'vendor 构建产物 lib/ 须豁免（fresh clone 无 vendor 构建）')
})
