// 负例留证 2026-11-23：TypeScript TypeChecker 领域语义守卫（RunView.read/hasFile 边界、闭集联合穷举、静默 catch、未 abort 的 AbortController）。
// 红证配方：修复前实跑捕获 useStatusFeed.ts:337/347/354 与 useConfigFeed.ts:163 的 RunView.hasFile、useStatusFeed.ts:293/300 与 ResearchStatusTab.tsx:120 的闭集遗漏、
// 未标注静默 catch、useStatusFeed.ts:211 & useOperationQueue.ts:417 & ResearchFinalTab.tsx 的未 abort AbortController；并由虚拟程序变异测试常驻自证。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const CANONICAL_RUNVIEW_READER = 'src/lib/run/artifact-read.ts'
// G21 已知遗留：useGraphFeed.ts:136 的 1 处 view.read('plan.md')；超过 1 处或新文件出现立即红。
const LEGACY_RUNVIEW_CALLS = new Map([['src/client/research-graph/useGraphFeed.ts', 1]])

const CLOSED_UNION_LITERALS = {
  ArtifactState: new Set(['ok', 'absent', 'unreadable', 'empty', 'invalid']),
  SourceRead: new Set(['ok', 'absent', 'unreadable']),
  ReviewVerdict: new Set(['pass', 'fail', 'conflict', 'unconfirmed', 'absent']),
}
const CLOSED_TAGGED_KINDS = {
  BindingTrust: new Set(['unbound', 'suppressed', 'bound']),
}

function unionLiteralSet(type) {
  if (!type || !type.isUnion()) return null
  const set = new Set()
  for (const part of type.types) {
    if (!part.isStringLiteral()) return null
    set.add(part.value)
  }
  return set
}

function matchClosedUnion(checker, type) {
  const literals = unionLiteralSet(type)
  if (literals !== null) {
    for (const [name, expected] of Object.entries(CLOSED_UNION_LITERALS)) {
      if (literals.size === expected.size && [...expected].every((v) => literals.has(v))) {
        return { name, expected }
      }
    }
  }
  if (type && type.isUnion()) {
    const kinds = new Set()
    let allHaveLiteralKind = true
    for (const part of type.types) {
      const kindType = checker.getTypeOfPropertyOfType(part, 'kind')
      if (!kindType || !kindType.isStringLiteral()) {
        allHaveLiteralKind = false
        break
      }
      kinds.add(kindType.value)
    }
    if (allHaveLiteralKind) {
      for (const [name, expected] of Object.entries(CLOSED_TAGGED_KINDS)) {
        if (kinds.size === expected.size && [...expected].every((v) => kinds.has(v))) {
          return { name, expected }
        }
      }
    }
  }
  return null
}

function isRunViewType(type) {
  if (!type) return false
  if (type.symbol?.name === 'RunView' || type.aliasSymbol?.name === 'RunView') return true
  const hasFile = type.getProperty('hasFile')
  const read = type.getProperty('read')
  const slug = type.getProperty('slug')
  const bucket = type.getProperty('bucket')
  if (hasFile && read && slug && bucket) return true
  if (type.isUnion()) return type.types.some((t) => isRunViewType(t))
  return false
}

function hasSilentWaiver(sourceFile, node) {
  const fullText = sourceFile.getFullText()
  const lead = ts.getLeadingCommentRanges(fullText, node.getFullStart()) ?? []
  const body = node.block ? node.block.getText(sourceFile) : node.getText(sourceFile)
  const leadText = lead.map((r) => fullText.slice(r.pos, r.end)).join('\n')
  return /@silent-catch:\s*\S/.test(leadText) || /@silent-catch:\s*\S/.test(body)
}

function isConsoleOnlyStatement(stmt, sf) {
  if (!ts.isExpressionStatement(stmt)) return false
  const text = stmt.expression.getText(sf).trim()
  return /^console\.(?:log|warn|error|info|debug)\(/.test(text)
}

function isTopLevelConst(node) {
  let cur = node.parent
  while (cur && !ts.isSourceFile(cur)) {
    if (ts.isFunctionLike(cur) || ts.isMethodDeclaration(cur) || ts.isBlock(cur)) return false
    cur = cur.parent
  }
  return true
}

function scopeTextOfAbortController(decl, sf) {
  let cur = decl.parent
  while (cur && !ts.isFunctionLike(cur) && !ts.isSourceFile(cur)) cur = cur.parent
  // Hook/component body or helper (e.g. delivery-watch's watch -> stop) may hold abort in its enclosing function.
  if (cur && ts.isFunctionLike(cur)) {
    let outer = cur.parent
    while (outer && !ts.isFunctionLike(outer) && !ts.isSourceFile(outer)) outer = outer.parent
    if (outer && ts.isFunctionLike(outer)) return outer.getText(sf)
    return cur.getText(sf)
  }
  return sf.getText()
}

export function scanPrograms(programs, packRoot = PACK) {
  const seenFiles = new Set()
  const issues = {
    runViewBoundary: [],
    exhaustiveness: [],
    silentCatch: [],
    unabortedController: [],
  }
  const legacyCounts = new Map()

  for (const program of programs) {
    const checker = program.getTypeChecker()
    for (const sf of program.getSourceFiles()) {
      const normalized = sf.fileName.replace(/\\/g, '/')
      if (!normalized.includes('/packages/deep-research-pack/src/') && !normalized.startsWith('virtual/src/')) continue
      if (seenFiles.has(normalized)) continue
      seenFiles.add(normalized)
      const rel = normalized.startsWith('virtual/')
        ? normalized.slice('virtual/'.length)
        : relative(packRoot, sf.fileName).replace(/\\/g, '/')

      const visit = (node) => {
        // 1. RunView.read / RunView.hasFile boundary
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
          const method = node.expression.name.text
          if (method === 'read' || method === 'hasFile') {
            const recvType = checker.getTypeAtLocation(node.expression.expression)
            if (isRunViewType(recvType) && rel !== CANONICAL_RUNVIEW_READER) {
              if (LEGACY_RUNVIEW_CALLS.has(rel) && method === 'read') {
                legacyCounts.set(rel, (legacyCounts.get(rel) ?? 0) + 1)
              } else {
                const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf))
                issues.runViewBoundary.push(`${rel}:${lc.line + 1} 禁止在 ${CANONICAL_RUNVIEW_READER} 外直接调用 RunView.${method}()`)
              }
            }
          }
        }

        // 2a. SwitchStatement exhaustiveness on closed unions
        if (ts.isSwitchStatement(node)) {
          const exprType = checker.getTypeAtLocation(node.expression)
          const match = matchClosedUnion(checker, exprType)
          if (match !== null) {
            const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf))
            const isTagged = match.name in CLOSED_TAGGED_KINDS
            if (!isTagged) {
              const cases = new Set()
              let hasDefault = false
              let defaultAssertsNever = false
              for (const clause of node.caseBlock.clauses) {
                if (ts.isCaseClause(clause) && ts.isStringLiteral(clause.expression)) {
                  cases.add(clause.expression.text)
                } else if (ts.isDefaultClause(clause)) {
                  hasDefault = true
                  const defaultText = clause.getText(sf)
                  if (/assertNever\(/.test(defaultText)) {
                    // Check if TS narrowed the switch expression at default to never.
                    let callsAssertNever = false
                    const checkCall = (n) => {
                      if (ts.isCallExpression(n) && n.arguments.length >= 1) {
                        const fnName = n.expression.getText(sf)
                        if (fnName === 'assertNever') {
                          const argType = checker.getTypeAtLocation(n.arguments[0])
                          if ((argType.flags & ts.TypeFlags.Never) !== 0) callsAssertNever = true
                        }
                      }
                      ts.forEachChild(n, checkCall)
                    }
                    checkCall(clause)
                    defaultAssertsNever = callsAssertNever
                  }
                }
              }
              const missing = [...match.expected].filter((v) => !cases.has(v))
              if (missing.length > 0 && !(hasDefault && defaultAssertsNever)) {
                issues.exhaustiveness.push(`${rel}:${lc.line + 1} switch(${match.name}) 未穷举分支 [${missing.join(', ')}]，且缺 assertNever(x) never 守卫`)
              }
            }
          }
        }

        // 2b. Single-variable ternary chains on closed string unions
        if (ts.isConditionalExpression(node) && !ts.isConditionalExpression(node.parent)) {
          let cur = node
          let targetSym = null
          let match = null
          const seen = new Set()
          let chain = 0
          while (ts.isConditionalExpression(cur)) {
            const cond = cur.condition
            if (ts.isBinaryExpression(cond) && cond.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
              let lhs = cond.left
              let rhs = cond.right
              if (ts.isStringLiteral(lhs) && !ts.isStringLiteral(rhs)) [lhs, rhs] = [rhs, lhs]
              const sym = checker.getSymbolAtLocation(lhs)
              const declNode = sym?.valueDeclaration ?? sym?.declarations?.[0] ?? lhs
              const declType = sym ? checker.getTypeOfSymbolAtLocation(sym, declNode) : null
              const m = declType ? matchClosedUnion(checker, declType) : null
              if (ts.isStringLiteral(rhs) && sym && m !== null && (targetSym === null || targetSym === sym)) {
                targetSym = sym
                match = m
                seen.add(rhs.text)
                chain++
                cur = cur.whenFalse
                continue
              }
            }
            break
          }
          if (chain >= 2 && match !== null) {
            const missing = [...match.expected].filter((v) => !seen.has(v))
            // Allowing a 1-tail fallback (e.g. checking 4 of 5) is okay only when <=1 remainder,
            // whereas collapsing >=2 states (like 'absent' + 'invalid' -> null) hides distinct states.
            if (missing.length >= 2) {
              const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf))
              issues.exhaustiveness.push(`${rel}:${lc.line + 1} 三元链(${match.name}) 只判了 [${[...seen].join(', ')}]，把 [${missing.join(', ')}] 合并折进尾支`)
            }
          }
        }

        // 3. Silent or console-only catch / .catch(...)
        if (ts.isCatchClause(node)) {
          const stmts = node.block.statements
          const emptyOrConsole = stmts.length === 0 || stmts.every((s) => isConsoleOnlyStatement(s, sf))
          if (emptyOrConsole && !hasSilentWaiver(sf, node)) {
            const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf))
            issues.silentCatch.push(`${rel}:${lc.line + 1} 静默/仅 console 的 catch 块缺少 /* @silent-catch: <理由> */ 显式豁免或状态错误传递`)
          }
        }
        if (ts.isCallExpression(node)
          && ts.isPropertyAccessExpression(node.expression)
          && node.expression.name.text === 'catch'
          && node.arguments.length >= 1
          && ts.isFunctionLike(node.arguments[0])) {
          const cb = node.arguments[0]
          const body = cb.body
          let emptyOrConsole = false
          if (ts.isBlock(body)) {
            emptyOrConsole = body.statements.length === 0 || body.statements.every((s) => isConsoleOnlyStatement(s, sf))
          } else {
            emptyOrConsole = /^console\.(?:log|warn|error|info|debug)\(/.test(body.getText(sf).trim())
          }
          if (emptyOrConsole && !hasSilentWaiver(sf, cb) && !hasSilentWaiver(sf, node)) {
            const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf))
            issues.silentCatch.push(`${rel}:${lc.line + 1} 静默/仅 console 的 .catch() 缺少 /* @silent-catch: <理由> */ 显式豁免或状态错误传递`)
          }
        }

        // 4. Un-aborted AbortController
        if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'AbortController') {
          const parent = node.parent
          const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf))
          if (ts.isPropertyAccessExpression(parent) && parent.name.text === 'signal') {
            const decl = parent.parent
            const allowTopLevel = ts.isVariableDeclaration(decl) && isTopLevelConst(decl) && ts.isIdentifier(decl.name) && decl.name.text === 'NEVER_ABORTED'
            if (!allowTopLevel) {
              issues.unabortedController.push(`${rel}:${lc.line + 1} 裸 new AbortController().signal 永远无法 abort（仅顶层 NEVER_ABORTED 豁免）`)
            }
          } else if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
            const scopeText = scopeTextOfAbortController(parent, sf)
            if (!scopeText.includes('.abort(')) {
              issues.unabortedController.push(`${rel}:${lc.line + 1} ${parent.name.text} = new AbortController() 作用域内未调用 .abort()`)
            }
          } else if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
            const scopeText = scopeTextOfAbortController(parent, sf)
            if (!scopeText.includes('.abort(')) {
              issues.unabortedController.push(`${rel}:${lc.line + 1} new AbortController() 赋值作用域内未调用 .abort()`)
            }
          }
        }

        ts.forEachChild(node, visit)
      }
      visit(sf)
    }
  }

  for (const [file, max] of LEGACY_RUNVIEW_CALLS) {
    const count = legacyCounts.get(file) ?? 0
    if (count > max) {
      issues.runViewBoundary.push(`${file}: legacy RunView.read 计数 ${count} > 上限 ${max}`)
    }
  }

  return { fileCount: seenFiles.size, issues }
}

function loadPackPrograms() {
  const parsedClient = ts.parseJsonConfigFileContent(
    ts.readConfigFile(join(PACK, 'tsconfig.client.json'), ts.sys.readFile).config,
    ts.sys,
    PACK,
  )
  const parsedHost = ts.parseJsonConfigFileContent(
    ts.readConfigFile(join(PACK, 'tsconfig.host.json'), ts.sys.readFile).config,
    ts.sys,
    PACK,
  )
  return [
    ts.createProgram(parsedClient.fileNames, { ...parsedClient.options, noEmit: true }),
    ts.createProgram(parsedHost.fileNames, { ...parsedHost.options, noEmit: true }),
  ]
}

function scanVirtualSource(relPath, code) {
  const fileName = `virtual/${relPath}`
  const opts = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    noEmit: true,
  }
  const baseHost = ts.createCompilerHost(opts)
  const stubPrelude = [
    'export interface RunView { slug: string; dir: string; bucket: string; hasFile(name: string): boolean; read(name: string): Promise<unknown> }',
    "export type ArtifactState = 'ok' | 'absent' | 'unreadable' | 'empty' | 'invalid'",
    'export function assertNever(x: never): never { throw new Error(String(x)) }',
  ].join('\n')
  const sources = new Map([
    [fileName, `${stubPrelude}\n${code}`],
  ])
  const host = {
    ...baseHost,
    fileExists: (f) => sources.has(f) || baseHost.fileExists(f),
    readFile: (f) => sources.get(f) ?? baseHost.readFile(f),
    getSourceFile: (f, lv, onErr, create) => sources.has(f)
      ? ts.createSourceFile(f, sources.get(f), lv)
      : baseHost.getSourceFile(f, lv, onErr, create),
  }
  const program = ts.createProgram([fileName], opts, host)
  return scanPrograms([program], 'virtual')
}

test('semantic-guardrails：packages/deep-research-pack/src 领域语义门禁全绿', () => {
  const result = scanPrograms(loadPackPrograms())
  assert.ok(result.fileCount >= 90, `防空语料：只扫描到 ${result.fileCount} 个源文件（预期 >= 90）`)
  const all = [
    ...result.issues.runViewBoundary,
    ...result.issues.exhaustiveness,
    ...result.issues.silentCatch,
    ...result.issues.unabortedController,
  ]
  assert.equal(all.length, 0, `领域语义守卫发现 ${all.length} 处违约：\n${all.join('\n')}`)
})

test('semantic-guardrails 反证：四类变异注入必须各自转红（虚拟 TypeChecker 程序，不依赖正则）', () => {
  // 1. 变量改名绕过正则的 RunView.hasFile / RunView.read
  const v1 = scanVirtualSource('src/client/mutated.ts', 'function f(renamed: RunView) { return renamed.hasFile("final.md") }')
  assert.equal(v1.issues.runViewBoundary.length, 1, '改名 RunView.hasFile 必须被 TypeChecker 捕获')

  // 2. ArtifactState 未穷举（漏 invalid 且无 assertNever never 检查）
  const v2a = scanVirtualSource('src/client/mutated.ts', 'function g(s: ArtifactState) { switch (s) { case "ok": case "empty": return 1; default: return 0 } }')
  assert.equal(v2a.issues.exhaustiveness.length, 1, 'switch 缺 invalid 且无 assertNever 必须红')
  const v2b = scanVirtualSource('src/client/mutated.ts', 'function g(s: ArtifactState) { return s === "empty" ? 1 : s === "unreadable" ? 2 : s === "ok" ? 3 : null }')
  assert.equal(v2b.issues.exhaustiveness.length, 1, '三元链折平 absent+invalid 必须红')

  // 3. 未标注的空 catch / 仅 console.error catch
  const v3 = scanVirtualSource('src/client/mutated.ts', 'function h() { try { return 1 } catch (e) { console.error(e) } }')
  assert.equal(v3.issues.silentCatch.length, 1, '未带 @silent-catch 理由的 console-only catch 必须红')

  // 4. 裸 new AbortController().signal 与未 abort controller
  const v4a = scanVirtualSource('src/client/mutated.ts', 'function k() { return new AbortController().signal }')
  const v4b = scanVirtualSource('src/client/mutated.ts', 'function k() { const c = new AbortController(); return c.signal }')
  assert.equal(v4a.issues.unabortedController.length, 1, '函数内裸 AbortController().signal 必须红')
  assert.equal(v4b.issues.unabortedController.length, 1, '函数内未调用 .abort() 的 controller 必须红')
})
