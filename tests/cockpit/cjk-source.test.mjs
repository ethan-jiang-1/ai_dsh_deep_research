// cjk-source.test.mjs — client/lib 源码里的「UI 中文硬编码」扫描守卫（BUG-055 的失败类）。
//
// 为什么存在：字典与 `t()` 在位，不等于覆盖——任何组件都能绕过字典写死中文；渲染断言只覆盖
// 能静态渲染的视图，配置/终稿页签因 primitives 的 CSS 模块无法直渲。本文件用 TS AST 扫
// **所有** client/lib 源码（注释不算），把中文字面量当红，除非它住已登记的模型面/数据面/格式面
// 文件，或所在行显式标了 `i18n-ignore: <理由>`（用于数据键等孤立值）。
//
// 允许清单（逐件理由）：这些文件的 CJK 不渲染成 UI——
//   · coach-prompts / operation-prompts：发给模型的内部指令（保持原文）；
//   · config-tables：内置打法内容、领域示范、两个模型入口指令（产品数据/模型面）；
//   · library-fold / method-draft / method-of-question / method-library-operation：
//     磁盘格式的字段标签、解析/序列化正本、wire 命令标记；
//   · method-library-write：Host 工具回执/校验消息（模型面；Client 只读）；
//   · hitl-fold：ask_user_question 的签名匹配串（数据谓词）。
// 反证：给任一组件加一句中文字面量（不标 ignore）→ 本文件红；加回 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(ROOT, 'packages', 'deep-research-pack', 'src')
const CJK = /[\u4e00-\u9fff]/

/** 允许清单（相对 src/；见文件头理由）。 */
const ALLOWED = new Map([
  ['client/method-library/coach-prompts.ts', '发给方法编辑模型的内部指令（非 UI）'],
  ['client/method-library/operation-prompts.ts', '发给方法编辑模型的工具指令（非 UI）'],
  ['lib/config-tables.ts', '内置打法内容/领域示范/模型入口指令（产品数据 + 模型面）'],
  ['lib/library-fold.ts', 'method-library.md 磁盘格式与发给 Lead 的指令（非 UI）'],
  ['lib/method-draft.ts', 'method-draft 磁盘格式的解析/序列化正本（非 UI）'],
  ['lib/method-of-question.ts', 'question.md 方法节的解析标签（磁盘格式）'],
  ['lib/method-library-operation.ts', 'wire 命令标记（非 UI）'],
  ['lib/method-library-write.ts', 'Host 工具回执/校验消息（模型面）'],
  ['lib/hitl-fold.ts', 'ask_user_question 签名匹配串（数据谓词，非 UI）'],
  ['client/delivery-watch.ts', '交付监听失败的 console 诊断（运行日志，非 UI）'],
  ['content/index.ts', 'systemPrompt 注入的研究手册正文（模型面）'],
  ['fetch-fallback/policy.ts', '抓取回退正文的来源标记与失败说明（模型面）'],
  ['method-library-tool.ts', 'Host 方法库工具的 description/校验消息（模型面）'],
  ['startup/index.ts', 'Host 启动期工作区登记/会话创建的诊断（运行日志）'],
  ['startup/settings.ts', 'Host 工作区校验的失败消息（CLI/日志面）'],
])

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'locales' ? [] : walk(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })
}

function insideConsoleCall(node) {
  for (let parent = node.parent; parent !== undefined; parent = parent.parent) {
    if (!ts.isCallExpression(parent)) continue
    let hasConsole = false
    const scan = (n) => {
      if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'console') hasConsole = true
      ts.forEachChild(n, scan)
    }
    scan(parent.expression)
    if (hasConsole) return true
  }
  return false
}

/** 扫描一段源码；返回 `{line, text}` 命中（line 从 1 起）。 */
function cjkLiteralsOf(fileName, text) {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const lines = text.split(/\r?\n/)
  const hits = []
  const visit = (node) => {
    let value = null
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) value = node.text
    else if (ts.isJsxText(node)) value = node.text
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) value = node.text
    if (value !== null && CJK.test(value) && !insideConsoleCall(node)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
      if (!(lines[line] ?? '').includes('i18n-ignore')) hits.push({ line: line + 1, text: value.trim() })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return hits
}

test('CJK 扫描器自检：组件字面量红、i18n-ignore 豁免、console 日志不咬', () => {
  const bad = cjkLiteralsOf('probe.tsx', 'export const A = () => <div>中文</div>\nexport const B = \'中文\'\n')
  assert.equal(bad.length, 2, '组件 JSX 文本与字符串字面量都应命中')
  const ignored = cjkLiteralsOf('probe.ts', "const B = '中文' // i18n-ignore: data key\n")
  assert.deepEqual(ignored, [], 'i18n-ignore 行应豁免')
  const logged = cjkLiteralsOf('probe.ts', 'console.error(\'中文\', String(cause))\n')
  assert.deepEqual(logged, [], 'console 日志不是 UI 文案，不应命中')
})

test('client/lib 源码：除已登记的模型面/数据面/格式面外，不得出现中文字面量', () => {
  const offenders = []
  for (const root of [join(SRC, 'client'), join(SRC, 'lib')]) {
    for (const full of walk(root)) {
      const rel = relative(SRC, full).split('\\').join('/')
      if (rel === 'client/locales.ts' || ALLOWED.has(rel)) continue
      for (const hit of cjkLiteralsOf(full, readFileSync(full, 'utf8'))) {
        offenders.push(`${rel}:${hit.line} ${JSON.stringify(hit.text)}`)
      }
    }
  }
  assert.deepEqual(offenders, [], `以下源码在 UI 面写死中文（改用字典 key；模型面请移入允许清单并写理由）：\n${offenders.join('\n')}`)
})

test('允许清单：每件都存在（防清单腐烂）', () => {
  const missing = [...ALLOWED.keys()].filter((rel) => !existsSync(join(SRC, rel)))
  assert.deepEqual(missing, [], `允许清单条目已不存在：${missing.join(', ')}`)
})
