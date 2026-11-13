// client 注册回收形状契约（W0-6 的可落地半）——`src/client/index.ts` 里每个
// `scoped.effect(callback, label)` 的 callback 必须**返回 disposer**（函数/数组），否则
// 注册贡献无法撤销，HMR/dispose 语义静默失效。
//
// 边界（诚实记账）：client 半在默认 `node:test` 里不能直接 import（`.css` + 浏览器 API）；
// 完整「调用 apply(fakeCtx) → dispose → 贡献消失」的行为测试需要 CSS/DOM harness，登记为
// Wave 3 L（`.agents/skills/` 的 hook harness）。本文件先用 TypeScript AST 钉住**形状**：
// callback 是 block body 时必须有 return；expression body 视为返回。形状挡不住「return 了
// 一个不撤销的假 disposer」，那部分归 `client-effect-wrap` 门禁 + `client-load` 真浏览器。
//
// 反证：把 `installQuestionCardNarrowFix` 那个 effect 的 `() => install...` 改成
// `() => { install... }`（丢掉 return）→ 本文件红；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = join(ROOT, 'packages', 'deep-research-pack', 'src', 'client', 'index.ts')
const text = readFileSync(FILE, 'utf8')
const source = ts.createSourceFile(FILE, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

test('client 注册：每个 scoped.effect 回调都返回 disposer（静态形状）', () => {
  const missing = []
  let effects = 0
  const visit = (node) => {
    if (ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'effect') {
      effects += 1
      const callback = node.arguments[0]
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
      if (callback === undefined || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
        missing.push(`line ${line}: effect 缺回调`)
      } else if (ts.isBlock(callback.body) && !callback.body.statements.some((statement) => ts.isReturnStatement(statement))) {
        missing.push(`line ${line}: effect 回调没有 return disposer`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.ok(effects >= 10, `防空语料：client/index.ts 的 effect 调用过少（${effects}）`)
  assert.deepEqual(missing, [], `client 注册无法回收：${missing.join('；')}`)
})
