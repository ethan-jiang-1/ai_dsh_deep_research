// 负例留证 2026-11-23：把 checks/lib、checks/run-gates、checks/verify、tools/channel 的 .mjs 纳入 TS checkJs；
// 修复前 protocol-audit.mjs:210 (missing finalVersionsIn)、run-driver.mjs:453 (v.dataFace undefined) 等 367 条诊断直接判红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const TSCONFIG = join(ROOT, 'tsconfig.scripts.json')
const MIN_SCRIPT_FILES = 100

test('scripts-typecheck：checks/lib|run-gates|verify + tools/channel 的 .mjs 全量 checkJs + strictNullChecks 零诊断', () => {
  const configFile = ts.readConfigFile(TSCONFIG, ts.sys.readFile)
  assert.equal(configFile.error, undefined, `读取 tsconfig.scripts.json 失败: ${configFile.error?.messageText ?? ''}`)
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT)
  assert.equal(parsed.errors.length, 0, `解析 tsconfig.scripts.json 失败: ${parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('; ')}`)
  assert.ok(parsed.fileNames.length >= MIN_SCRIPT_FILES, `防空语料：tsconfig.scripts.json 只匹配到 ${parsed.fileNames.length} 个文件（预期 >= ${MIN_SCRIPT_FILES}）`)

  const program = ts.createProgram(parsed.fileNames, parsed.options)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  const formatted = diagnostics.map((d) => {
    if (!d.file || d.start === undefined) return `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`
    const lc = d.file.getLineAndCharacterOfPosition(d.start)
    const rel = relative(ROOT, d.file.fileName).replace(/\\/g, '/')
    return `${rel}:${lc.line + 1}:${lc.character + 1} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`
  })
  assert.equal(formatted.length, 0, `checkJs 发现 ${formatted.length} 处脚本类型/空值缺陷：\n${formatted.slice(0, 40).join('\n')}`)
})
