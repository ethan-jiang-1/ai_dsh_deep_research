// client 注册回收形状契约（W0-6 的可落地半）——`src/client/index.ts` 里每个
// `scoped.effect(callback, label)`（点号或字面量方括号 `scoped['effect']`）的 callback 必须
// **返回 disposer**（函数/数组），否则注册贡献无法撤销，HMR/dispose 语义静默失效。
//
// 边界（诚实记账）：client 半在默认 `node:test` 里不能直接 import（`.css` + 浏览器 API）；
// 完整「调用 apply(fakeCtx) → dispose → 贡献消失」的行为测试需要 CSS/DOM harness，登记为
// Wave 3 L（`.agents/skills/` 的 hook harness）。本文件先用 TypeScript AST 钉住**形状**：
// callback 是 block body 时必须有 return；expression body 视为返回。形状挡不住「return 了
// 一个不撤销的假 disposer」，那部分归 `client-effect-wrap` 门禁 + `client-load` 真浏览器。
//
// 负例留证 2026-11-14：BUG-173——旧 predicate 只认 PropertyAccessExpression，
// `scoped['effect'](() => { void 0 })` 整条旁路。红配方：把 isEffectCall 的 ElementAccess
// 分支删掉 → 合成源里的方括号红例被漏掉（missing 为空）→ 本文件红；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = join(ROOT, 'packages', 'deep-research-pack', 'src', 'client', 'index.ts')

/** API 面：点号 `scoped.effect` 与字面量方括号 `scoped['effect']` 是同一个调用（BUG-173）。 */
function isEffectCall(node) {
  if (!ts.isCallExpression(node)) return false
  const callee = node.expression
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text === 'effect'
  if (ts.isElementAccessExpression(callee)) {
    const argument = callee.argumentExpression
    return argument !== undefined
      && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
      && argument.text === 'effect'
  }
  return false
}

function missingDisposers(sourceFile) {
  const missing = []
  let effects = 0
  const visit = (node) => {
    if (isEffectCall(node)) {
      effects += 1
      const callback = node.arguments[0]
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
      if (callback === undefined || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
        missing.push(`line ${line}: effect 缺回调`)
      } else if (ts.isBlock(callback.body) && !callback.body.statements.some((statement) => ts.isReturnStatement(statement))) {
        missing.push(`line ${line}: effect 回调没有 return disposer`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return { effects, missing }
}

const parse = (name, text) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

test('client 注册：每个 effect 回调都返回 disposer（点号 + 字面量方括号）', () => {
  const source = parse(FILE, readFileSync(FILE, 'utf8'))
  const { effects, missing } = missingDisposers(source)
  assert.ok(effects >= 10, `防空语料：client/index.ts 的 effect 调用过少（${effects}）`)
  assert.deepEqual(missing, [], `client 注册无法回收：${missing.join('；')}`)
})

test('client 注册：方括号 effect 与点号同判（形状矩阵）', () => {
  const source = parse('probe.ts', [
    'declare const scoped: any',
    "scoped['effect'](() => { void 0 })",
    'scoped["effect"](() => () => cleanup())',
    'scoped.effect(() => () => cleanup())',
    "scoped['other'](() => { void 0 })",
  ].join('\n'))
  const { effects, missing } = missingDisposers(source)
  assert.equal(effects, 3, '只計 effect（方括号双引号/单引号 + 点号）；other 不算')
  assert.equal(missing.length, 1, '方括号无返回回调必须红')
  assert.match(missing[0], /line 2: effect 回调没有 return disposer/)
})
