// 减法契约：scripts / dev / pack src 里不得留下未使用的 import binding 或未导出的顶层声明。
//
// 为什么需要（2026-11-04）：本仓把“加法/验证”机械化了（门禁、契约测试、覆盖边界），
// 但“减法”只有人眼。实证：scripts/verify/context.mjs 等 20+ 处未使用 import、entry-chain-probe
// 的重构残留 decompressLog 都逃过了所有门禁；jscpd 一次性扫出 3% 重复面但没人消费。
// 本测试只做最窄的一刀：import 绑定与顶层声明必须有引用——不判导出 API、不判复杂度、不判重复。
//
// 反证（红先行）：在 scripts/verify/context.mjs 临时加 `import { tmpdir } from 'node:os'`，
// 本测试点名该文件与 tmpdir 后红；还原后绿。实现前本文件本身即红（债务 20+ 处）。
//
// 边界：
// - 范围用目录遍历（不子进程；layering 禁止 tests spawn）；跳过 node_modules/.git/
//   fixtures/_tmp，其它 scripts/lib 一律在范围内；
// - 只报“零引用”，注释/字符串里的同名文本不计（AST 标识符才算）；
// - 导出声明不在此列（公共面可能被未来消费者使用，是否死导出归 review）；
// - 有副作用的未使用初始化（如 `const x = sideEffect()`）会先被点名，清理时必须人工确认，
//   不能盲删——本测试证明“没被引用”，不证明“删了无行为变化”。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCOPES = [
  join(ROOT, 'scripts'),
  join(ROOT, 'dev'),
  join(ROOT, 'packages', 'deep-research-pack', 'src'),
]
const SKIP_DIRS = new Set(['node_modules', '.git', 'fixtures', '_tmp'])

function sourceFiles(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue
    const path = join(dir, ent.name)
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) sourceFiles(path, out)
    } else if (/\.(mjs|ts|tsx)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
      out.push(path)
    }
  }
  return out
}

function kindOf(file) {
  return file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS
}

/** @returns {{imports: string[], declarations: string[]}} names with zero references */
function unusedIn(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kindOf(file))
  const importNames = new Set()
  const localDeclarations = new Set()
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause) {
      const clause = statement.importClause
      if (clause.name) importNames.add(clause.name.text)
      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) importNames.add(clause.namedBindings.name.text)
        else for (const element of clause.namedBindings.elements) importNames.add(element.name.text)
      }
    }
    const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true
    if (exported) continue
    if (ts.isFunctionDeclaration(statement) && statement.name) localDeclarations.add(statement.name.text)
    if ((ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement)
      || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) && statement.name) {
      localDeclarations.add(statement.name.text)
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) localDeclarations.add(declaration.name.text)
      }
    }
  }
  const counts = new Map()
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) return
    if (ts.isIdentifier(node)) counts.set(node.text, (counts.get(node.text) ?? 0) + 1)
    ts.forEachChild(node, visit)
  }
  visit(source)
  const imports = [...importNames].filter((name) => (counts.get(name) ?? 0) === 0).sort()
  const declarations = [...localDeclarations]
    .filter((name) => (counts.get(name) ?? 0) <= 1)
    .sort()
  return { imports, declarations }
}

test('减法契约：未使用 import / 未导出顶层声明的引用数为零', () => {
  const files = SCOPES.flatMap((scope) => sourceFiles(scope))
  assert.ok(files.length >= 80, `防空语料：只扫到 ${files.length} 个源文件（范围收窄了？）`)
  const problems = []
  for (const file of files) {
    const { imports, declarations } = unusedIn(file, readFileSync(file, 'utf8'))
    for (const name of imports) problems.push(`${relative(ROOT, file)}: import ${name}`)
    for (const name of declarations) problems.push(`${relative(ROOT, file)}: declaration ${name}`)
  }
  assert.deepEqual(problems, [],
    `发现未使用的 import/顶层声明（清理后重跑；有副作用的初始化先人工确认）：\n${problems.join('\n')}`)
})
