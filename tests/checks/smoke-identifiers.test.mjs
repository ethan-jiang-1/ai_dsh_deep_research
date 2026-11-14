// 负例留证 2026-11-14：BUG-051——`node --check` 只查语法，不查未声明标识符（paneRows 曾漏）；
// 本测试用 TypeScript 的 allowJs/checkJs 语义诊断，TS2304/TS2552（找不到名字）即红。
// 红配方：在任一 smoke 里写 `undeclaredSmokeProbe = 1` → 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SMOKE = join(ROOT, 'scripts', 'smoke')

test('smoke 及其消费的 lib 无未声明标识符（TS2304/TS2552；BUG-051）', () => {
  const files = readdirSync(SMOKE).filter((file) => file.endsWith('.mjs')).map((file) => join(SMOKE, file))
  assert.ok(files.length >= 10, '防空语料：smoke 入口过少')
  const program = ts.createProgram(files, {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    types: ['node'],
    skipLibCheck: true,
  })
  const diagnostics = ts.getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.code === 2304 || diagnostic.code === 2552)
    .map((diagnostic) => {
      const position = diagnostic.file === undefined || diagnostic.start === undefined
        ? null
        : diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
      const where = diagnostic.file === undefined ? '<unknown>' : `${diagnostic.file.fileName}${position === null ? '' : `:${position.line + 1}`}`
      return `${where} TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`
    })
  assert.deepEqual(diagnostics, [])
})
