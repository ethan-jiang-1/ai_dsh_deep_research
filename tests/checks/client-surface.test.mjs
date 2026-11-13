// client 直测面契约（W0-4 / S1）——`src/client/**/*.ts` 每个纯逻辑件必须被至少一个
// `*.spec.mjs` 直接 import，或在 `CLIENT_SMOKE_ONLY` 登记「为什么只能 smoke / 为什么没有直测」。
//
// 为什么需要：`test-surface` 只覆盖 `scripts/lib` 与 pack `src/lib`；`src/client` 的 36/59
// 文件此前没有直测（S1 已补 6 个纯逻辑件）。没有这条契约时，新加一个纯客户端模块不会有人
// 发现它没测试——这正是 test-asset-fence 研究点名的「无直测区」。
//
// 边界：`.tsx` 组件按后缀整体归浏览器装配（`client-load.entry`），理由写在 `TSX_SMOKE_ONLY`；
// 本契约只扫 `.ts`。hook / entry / style / type-only 按键登记，不让「排除」变成静默。
// 反证：临时新增 `src/client/__probe-untested.ts` → 本文件红并点名；删除 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localImportPath, parseKeylessImports } from '../../scripts/lib/keyless-imports.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CLIENT = join(ROOT, 'packages', 'deep-research-pack', 'src', 'client')

/** 只能由真浏览器/真装配覆盖的 `.ts`（逐件理由；新增件不登记 = 红）。 */
const CLIENT_SMOKE_ONLY = {
  'index': 'client 半入口装配：只注册 slot/页签/活标题，行为归 client-load.entry 真浏览器',
  'styles': 'CSS 字符串与 DOM 注入，没有纯函数行为',
  'research-graph/styles': 'CSS 字符串与 DOM 注入，没有纯函数行为',
  'research-graph/types': 'type-only：只有类型声明，没有运行时行为',
  'research-status/types': 'type-only：只有类型声明，没有运行时行为',
  'locales/en': '字典内部件：经 locales.ts 间接覆盖，键集由 client-locale 契约对账',
  'locales/en-fold': '字典折算内部件：经 locales.ts 间接覆盖，键集由 client-locale 契约对账',
  'locales/zh-fold': '字典折算内部件：经 locales.ts 间接覆盖，键集由 client-locale 契约对账',
  'method-library/useDraftState': 'React hook：需要 DOM/React harness；当前由 client-load 真浏览器覆盖',
  'method-library/useLibraryData': 'React hook：需要 DOM/React harness；当前由 client-load 真浏览器覆盖',
  'method-library/useOperationQueue': 'React hook：需要 DOM/React harness；当前由 client-load 真浏览器覆盖',
  'method-library/useRunSourcePicker': 'React hook：需要 DOM/React harness；当前由 client-load 真浏览器覆盖',
  'research-graph/useGraphFeed': 'React hook：需要 DOM/React harness；当前由 client-load 真浏览器覆盖',
  'research-status/useMemberActivity': 'React hook：需要 DOM/React harness；当前由 client-load 真浏览器覆盖',
  'research-status/useStatusFeed': 'React hook：需要 DOM/React harness；当前由 client-load 真浏览器覆盖',
}

const TSX_SMOKE_ONLY = '所有 .tsx 组件归真浏览器装配面（client-load.entry）；组件逻辑抽到 src/lib 或 src/client 纯件后由本契约接管'

function walk(dir, suffix) {
  const out = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walk(p, suffix))
    else if (ent.name.endsWith(suffix)) out.push(p)
  }
  return out
}

function testFiles() {
  const out = []
  const walkTests = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) {
        if (['fixtures', '_tmp', 'node_modules'].includes(ent.name)) continue
        walkTests(p)
      } else if (ent.name.endsWith('.spec.mjs')) out.push(p)
    }
  }
  walkTests(join(ROOT, 'tests'))
  return out
}

function coveredByTests() {
  const covered = new Set()
  for (const file of testFiles()) {
    const { imports } = parseKeylessImports(readFileSync(file, 'utf8'), file)
    for (const { specifier } of imports) {
      const resolved = localImportPath(file, specifier)
      if (resolved === undefined) continue
      const rel = relative(CLIENT, resolved).split('\\').join('/')
      if (rel.startsWith('..') || !rel.endsWith('.ts')) continue
      covered.add(rel.replace(/\.ts$/, ''))
    }
  }
  return covered
}

test('client 直测面：每个 .ts 有直测，或 CLIENT_SMOKE_ONLY 有理由', () => {
  const modules = walk(CLIENT, '.ts').map((file) => relative(CLIENT, file).split('\\').join('/').replace(/\.ts$/, ''))
  const tsx = walk(CLIENT, '.tsx')
  const covered = coveredByTests()
  assert.ok(modules.length >= 30, `防空语料：src/client 的 .ts 模块过少（${modules.length}）`)
  assert.ok(covered.size >= 20, `防空语料：直测覆盖过少（${covered.size}）`)
  assert.ok(tsx.length > 0, '防空语料：src/client 下 0 个 .tsx（组件面消失？）')
  assert.ok(TSX_SMOKE_ONLY.length >= 10, '.tsx 的 smoke-only 理由太短')

  const uncovered = modules.filter((name) => !covered.has(name)).sort()
  const registered = Object.keys(CLIENT_SMOKE_ONLY).sort()
  assert.deepEqual(uncovered, registered,
    `client 无直测件与 CLIENT_SMOKE_ONLY 不一致——未登记：${uncovered.join(', ') || '（无）'}；`
    + '登记：' + (registered.join(', ') || '（无）')
    + '；新纯逻辑件要么补直测，要么登记「为什么只能 smoke / 为什么没有直测」')

  for (const name of registered) {
    assert.ok(existsSync(join(CLIENT, `${name}.ts`)), `CLIENT_SMOKE_ONLY 里的 ${name} 已不存在——退役时删登记`)
    const reason = CLIENT_SMOKE_ONLY[name]
    assert.ok(typeof reason === 'string' && reason.length >= 10, `${name} 的 smoke-only 理由太短`)
  }
})
