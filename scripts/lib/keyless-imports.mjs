// keyless-imports.mjs — 只读 import 检查（解析器 = typescript 包的 createSourceFile，纯函数
// 不执行任何东西）。移植自 ai_dsh_company tools/lib/keyless-imports.mjs@59551f2（2026-10-09
// layering 二代，用户拍板解析器路径 A）；typescript@6.0.3 是本仓既有 root devDep——keyless
// 判据 = 运行时禁子进程/网络/凭据（company 同款实践：npm 解析库在其 keyless 缝隙合法存活）。
//
// 能证明什么 / 不证明什么（company 原文边界照搬）：包内幕与 computed module name 不被证明
// （unresolvedImports 是观测不是认证）。返回的 unresolvedImports 只如实记录，白名单裁决归
// 消费方（tests/layering.test.mjs）。
// 消费方：tests/layering.test.mjs（解析级禁物 + import 闭包图）。
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const FORBIDDEN_MODULES = new Set(['child_process', 'http', 'https', 'net', 'dgram'])
const FORBIDDEN_CALLS = new Set(['spawn', 'spawnSync', 'execSync', 'execFile', 'execFileSync', 'fork', 'fetch'])
const FORBIDDEN_DIRECT_CALLS = new Set(['exec'])

/** 解析源文本但不执行；字符串夹具与注释不算可执行 import/调用。 */
export function parseKeylessImports(text, fileName = 'module.mjs') {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true)
  const imports = []
  const forbiddenCalls = []
  const unresolvedImports = []
  const add = (argument, kind) => {
    if (argument && ts.isStringLiteralLike(argument)) imports.push({ specifier: argument.text, kind })
    else unresolvedImports.push(argument?.getText(source) ?? '<missing>')
  }
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) add(node.moduleSpecifier, 'static')
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression
      if (callee.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0], 'dynamic')
      else if (ts.isIdentifier(callee) && callee.text === 'require') add(node.arguments[0], 'require')
      const name = ts.isIdentifier(callee) ? callee.text
        : ts.isPropertyAccessExpression(callee) ? callee.name.text
          : ts.isElementAccessExpression(callee) && callee.argumentExpression && ts.isStringLiteralLike(callee.argumentExpression)
            ? callee.argumentExpression.text : undefined
      const forbidden = ts.isIdentifier(callee)
        ? FORBIDDEN_DIRECT_CALLS.has(name) || FORBIDDEN_CALLS.has(name)
        : FORBIDDEN_CALLS.has(name)
      if (forbidden) forbiddenCalls.push(name)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return {
    imports, forbiddenCalls, unresolvedImports,
    syntaxErrors: source.parseDiagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
  }
}

/** 拒进程/网络内置 import（含 Node 无前缀写法）。 */
export function isForbiddenKeylessModule(specifier) {
  return FORBIDDEN_MODULES.has(specifier.replace(/^node:/, '').split('/')[0])
}

const inside = (root, path) => {
  const part = relative(root, path)
  return part !== '..' && !part.startsWith(`..${sep}`) && !isAbsolute(part)
}

/** 只解析本地字面量模块引用；包名留在这张有界图之外。 */
export function localImportPath(file, specifier) {
  if (specifier.startsWith('file:')) return fileURLToPath(specifier)
  if (!specifier.startsWith('.') && !isAbsolute(specifier)) return undefined
  return resolve(dirname(file), specifier.replace(/[?#].*$/, ''))
}

/**
 * 逐个访问可达的本地文件一次（跟随静态/动态字面量与再导出）。默认只读字节与真实路径；
 * 注入 reader 可跑纯夹具图。返回的 unresolved 表达式是观测，不是已证明安全的依赖。
 */
export function inspectKeylessGraph(entries, {
  libRoot,
  readSource = file => readFileSync(file, 'utf8'),
  canonicalPath = file => realpathSync(file),
}) {
  const root = canonicalPath(resolve(libRoot))
  const visited = new Set()
  const violations = []
  const unresolvedImports = []
  const visit = (candidate, chain) => {
    let file
    try {
      file = canonicalPath(candidate)
    } catch (error) {
      violations.push({ file: candidate, reason: `unreadable local dependency: ${error.message}`, chain: [...chain, candidate] })
      return
    }
    const report = reason => violations.push({ file, reason, chain: [...chain, file] })
    /* canonicalPath 先于 containment 应用：文件系统别名不能让外部依赖看起来像图内文件。 */
    if (!inside(root, file)) { report('local dependency leaves the graph root'); return }
    if (visited.has(file)) return
    visited.add(file)
    let text
    try {
      text = readSource(file)
    } catch (error) {
      report(`unreadable local dependency: ${error.message}`)
      return
    }
    const parsed = parseKeylessImports(text, file)
    for (const error of parsed.syntaxErrors) report(`syntax error: ${error}`)
    for (const name of parsed.forbiddenCalls) report(`forbidden runtime call: ${name}`)
    for (const expression of parsed.unresolvedImports) unresolvedImports.push({ file, expression })
    for (const { specifier } of parsed.imports) {
      if (isForbiddenKeylessModule(specifier)) report(`forbidden builtin: ${specifier}`)
      const target = localImportPath(file, specifier)
      if (target !== undefined) visit(target, [...chain, file])
    }
  }
  for (const entry of entries) visit(resolve(entry), [])
  return { files: [...visited], violations, unresolvedImports }
}
