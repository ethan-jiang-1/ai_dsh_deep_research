// 负例留证 2026-11-14：BUG-059 / BUG-061——chrome 定位器曾单语（中文或英文字面量，切语言即假红），且旧版
// 只按单行正则扫主件 getByRole(/regex/)，漏掉 client-load-*.support.mjs、字符串字面量与 getByText/getByLabel。
// 修法 = TypeScript AST 全扫主件与全部 support 件的 getByRole / getByText / getByLabel。
// 红配方：删 TAB_TEXT 任一语种，或在主件/support 件写单语 chrome 定位器（如 '取消' / 'Open right sidebar'）→ 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { SHOW_MORE_SESSIONS_PATTERN, TAB_TEXT } from '../../scripts/lib/shared/web-ui-nav.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SMOKE_DIR = join(ROOT, 'scripts', 'smoke')
const hasCjk = (text) => /[\u4e00-\u9fff]/.test(text)
const hasEnglishWord = (text) => /[A-Za-z]{3,}/.test(text.replace(/\\[dwsbDWSB]/g, ''))

// 工作区方法库种子里的用户条目名属于 canonical 内容，不随 UI 语言切换
const CONTENT_ALLOW = new Set(['格局调研'])

function collectMonolingualLocators(fileName, sourceText) {
  const sf = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true)
  const bad = []

  const checkPatternText = (rawText, kind, node) => {
    if (CONTENT_ALLOW.has(rawText)) return
    const cjk = hasCjk(rawText)
    const latin = hasEnglishWord(rawText)
    if (!cjk && !latin) return
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
    if (kind === 'string') {
      bad.push(`${fileName}:${line} 单语字符串定位器 ${JSON.stringify(rawText)}（须改双语正则 zh|en）`)
      return
    }
    if (!cjk || !latin || !rawText.includes('|')) {
      bad.push(`${fileName}:${line} 单语正则定位器 /${rawText}/（须同时含中英文分支并以 | 交替）`)
    }
  }

  const inspectTargetNode = (target, callNode) => {
    if (!target) return
    if (ts.isStringLiteralLike(target)) {
      checkPatternText(target.text, 'string', callNode)
    } else if (ts.isRegularExpressionLiteral(target)) {
      const body = target.text.slice(1, target.text.lastIndexOf('/'))
      checkPatternText(body, 'regex', callNode)
    }
  }

  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text
      if (method === 'getByText' || method === 'getByLabel') {
        inspectTargetNode(node.arguments[0], node)
      } else if (method === 'getByRole') {
        const opts = node.arguments[1]
        if (opts && ts.isObjectLiteralExpression(opts)) {
          for (const prop of opts.properties) {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'name') {
              inspectTargetNode(prop.initializer, node)
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return bad
}

test('TAB_TEXT / 侧栏 pattern 每项双语且带 alternation（BUG-059 / BUG-061）', () => {
  const entries = [
    ...Object.entries(TAB_TEXT).map(([key, value]) => [key, value.source]),
    ['SHOW_MORE_SESSIONS_PATTERN', SHOW_MORE_SESSIONS_PATTERN],
  ]
  assert.ok(entries.length >= 6, '防空语料：TAB_TEXT 过少')
  for (const [key, text] of entries) {
    assert.ok(hasCjk(text) && hasEnglishWord(text), `${key} 不是双语：${text}`)
    if (TAB_TEXT[key] !== undefined) assert.ok(text.includes('|'), `${key} 缺 alternation：${text}`)
  }
})

test('client-load 主件与全部 support 件的 chrome locator 不得单语（BUG-059 / BUG-061 AST 门）', () => {
  const files = readdirSync(SMOKE_DIR)
    .filter((name) => /^client-load(?:\.entry|-.*\.support)\.mjs$/.test(name))
    .sort()
  assert.ok(files.length >= 5, '防空语料：client-load 主件+support 件少于 5 个')
  const offenders = []
  for (const file of files) {
    offenders.push(...collectMonolingualLocators(file, readFileSync(join(SMOKE_DIR, file), 'utf8')))
  }
  assert.deepEqual(offenders, [])

  // 自检反证：字符串单语（中文/英文）与正则单语都必须抓出，canonical 内容豁免词放行
  const synthetic = [
    "page.getByRole('button', { name: 'Open right sidebar' })",
    "page.getByRole('button', { name: '取消' })",
    "page.getByRole('button', { name: /读终稿/ })",
    "page.getByText('还不满意？三种改法')",
    "page.getByRole('button', { name: /格局调研/ })",
  ].join('\n')
  assert.equal(collectMonolingualLocators('synthetic.mjs', synthetic).length, 4)
})
