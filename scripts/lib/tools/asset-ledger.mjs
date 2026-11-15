// asset-ledger.mjs — 测试资产组合账（D55）：每个 spec/check 一条，
// 字段 = path / domain / lane / class / cost / uniqueClaim / oracleType / sunset。
//
// 为什么生成且禁止手写 OVERRIDES：手写账与硬编码覆盖字典必然随增删和重构腐烂。
// 本模块用 TypeScript AST（ts.createSourceFile + parseKeylessImports）自动推导每个测试资产的
// oracleType，由 dev/record-asset-ledger.mjs 写盘，tests/checks/asset-ledger.test.mjs 与
// tests/checks/guard-ledger.test.mjs 双向重算对账（漂移或矛盾 = 红）。
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { localImportPath, parseKeylessImports } from './keyless-imports.mjs'

export const ORACLE_TYPES = ['external', 'canonical', 'structured', 'self-referential']
export const ASSET_CLASSES = ['check-gate', 'vendor-compat', 'contract', 'unit-pure']
export const ASSET_COSTS = ['fast-inproc']

const EXTERNAL_PKGS = new Set(['typescript', 'mdast-util-from-markdown', 'yaml'])
const EXTERNAL_LIBS = new Set([
  'scripts/lib/tools/keyless-imports.mjs',
  'scripts/lib/tools/workspace-parsers.mjs',
  'scripts/lib/tools/ci-workflow.mjs',
])
const CANONICAL_LIBS = new Set([
  'scripts/lib/shared/roles.mjs',
  'scripts/lib/test-infra/method-presets.mjs',
  'scripts/lib/harness/gates-cases.mjs',
  'scripts/lib/harness/replay-scene.mjs',
  'scripts/lib/test-infra/smoke-assets.mjs',
  'tests/pack/handbook-surface.mjs',
  'tests/pack/preset-helpers.mjs',
  'tests/pack/template-files.mjs',
  'packages/deep-research-pack/src/client/locales.ts',
  'packages/deep-research-pack/src/client/research-graph/state-note.ts',
  'packages/deep-research-pack/src/lib/run/brief-fold.ts',
])
const STRUCTURED_PKGS = new Set([
  'node:vm', 'vm', 'node:events', 'events', 'node:crypto', 'crypto', 'react', 'react-dom/server',
])
const STRUCTURED_LIBS = new Set(['tests/fixtures/events.mjs'])
const FS_READ_NAMES = new Set(['readFileSync', 'readdirSync', 'existsSync', 'lstatSync', 'statSync'])
const STRUCTURED_CALL_NAMES = new Set(['mkdtempSync', 'structuredClone', 'querySelectorAll', 'dispatchEvent'])
const STRUCTURED_NEW_NAMES = new Set(['Function', 'AbortController', 'EventEmitter'])
const STRUCTURED_ENV_PROPS = new Set(['argv', 'staged', 'seq', 'freeMB', 'load1', 'cpuCount'])

/** 递归列出默认发现面的测试文件（tests 下的 *.spec.mjs + tests/checks/*.test.mjs；跳过 fixtures/_tmp）。 */
export function listTestFiles(root) {
  const out = []
  const walk = (dir, rel) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (entry.name === 'fixtures' || entry.name === '_tmp' || entry.name === 'node_modules') continue
      const nextRel = rel === '' ? entry.name : `${rel}/${entry.name}`
      const nextDir = join(dir, entry.name)
      if (entry.isDirectory()) walk(nextDir, nextRel)
      else if (entry.name.endsWith('.spec.mjs') || entry.name.endsWith('.test.mjs')) out.push(`tests/${nextRel}`)
    }
  }
  walk('tests', '')
  return out.sort()
}

/** 资产的一句话 uniqueClaim：头注首个非「负例留证/夹具留证」的注释行；没有则取首个 test 标题。 */
export function claimOf(source) {
  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('//')) {
      const text = trimmed.replace(/^\/\/\s?/, '').trim()
      if (text === '' || /^负例留证|^夹具留证/.test(text)) continue
      return text
    }
    break
  }
  const title = /test\(\s*['"`]([^'"`]+)['"`]/.exec(source)?.[1]
  return title ?? ''
}

export function classOfPath(relPath) {
  if (relPath.startsWith('tests/vendor/') || relPath.endsWith('.vendor.spec.mjs')) return 'vendor-compat'
  if (relPath.startsWith('tests/checks/')) return 'check-gate'
  if (relPath.startsWith('tests/contracts/')) return 'contract'
  return 'unit-pure'
}

export function sunsetOfPath(relPath) {
  if (relPath.startsWith('tests/vendor/') || relPath.endsWith('.vendor.spec.mjs')) return '随 vendor 换 pin 重校'
  if (relPath.startsWith('tests/checks/')) return '随门禁/台账合同退役'
  return '随被测模块删除'
}

/**
 * 基于 AST import 图与语法节点推导测试资产的 oracleType（禁止手工覆盖字典）：
 * - external：直接引入外部语言/语法编译器或共享外部 AST 适配层（typescript / mdast / yaml）；
 * - canonical：核验盘上规范正本、契约层或跨模块双读者/编解码一致性；
 * - structured：经受控运行时/VM/DOM/临时文件系统/JSON 事件流/协议状态信封核验；
 * - self-referential：仅对单一被测模块喂入内联标量/字符串样例的测试（显式保留为迁移面）。
 */
export function oracleTypeOf(text, { relPath, root }) {
  const abs = join(root, relPath)
  const parsed = parseKeylessImports(text, abs)
  const pkgSpecs = []
  const localRels = []
  for (const imp of parsed.imports) {
    const loc = localImportPath(abs, imp.specifier)
    if (loc) localRels.push(relative(root, loc).replaceAll('\\', '/'))
    else pkgSpecs.push(imp.specifier)
  }
  if (pkgSpecs.some((s) => EXTERNAL_PKGS.has(s)) || localRels.some((r) => EXTERNAL_LIBS.has(r))) {
    return 'external'
  }

  const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true)
  let usesFsRead = false
  let usesTempDir = false
  let usesStructuredRuntime = false
  let structuredEnvProps = 0
  const walk = (node) => {
    if (ts.isCallExpression(node)) {
      const ex = node.expression
      if (ts.isIdentifier(ex)) {
        if (FS_READ_NAMES.has(ex.text)) usesFsRead = true
        if (ex.text === 'mkdtempSync') usesTempDir = true
        if (STRUCTURED_CALL_NAMES.has(ex.text)) usesStructuredRuntime = true
      } else if (ts.isPropertyAccessExpression(ex)) {
        if (ts.isIdentifier(ex.expression) && ex.expression.text === 'JSON'
          && (ex.name.text === 'parse' || ex.name.text === 'stringify')) {
          usesStructuredRuntime = true
        }
        if (STRUCTURED_CALL_NAMES.has(ex.name.text)) usesStructuredRuntime = true
      }
    } else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      if (STRUCTURED_NEW_NAMES.has(node.expression.text)) usesStructuredRuntime = true
    } else if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
      if (STRUCTURED_ENV_PROPS.has(node.name.text)) structuredEnvProps += 1
    }
    ts.forEachChild(node, walk)
  }
  walk(sf)

  const prodImports = [...new Set(localRels.filter((r) => r.startsWith('packages/') || r.startsWith('scripts/lib/')))]
  if (
    relPath.startsWith('tests/contracts/') ||
    relPath.startsWith('tests/vendor/') ||
    localRels.some((r) => CANONICAL_LIBS.has(r)) ||
    prodImports.length >= 2 ||
    (usesFsRead && !usesTempDir) ||
    (usesFsRead && /\bROOT\b|import\.meta\.url/.test(text) && /packages\/|docs\/|scripts\/|snapshots\/|_backlog\/|notes\/|vendor\//.test(text))
  ) {
    return 'canonical'
  }

  if (
    pkgSpecs.some((s) => STRUCTURED_PKGS.has(s)) ||
    localRels.some((r) => STRUCTURED_LIBS.has(r)) ||
    usesTempDir ||
    usesStructuredRuntime ||
    structuredEnvProps >= 2
  ) {
    return 'structured'
  }

  return 'self-referential'
}

export function assetLedgerOf(root, files = listTestFiles(root)) {
  return files.map((path) => {
    const source = readFileSync(join(root, path), 'utf8')
    return {
      path,
      domain: path.split('/')[1] ?? '',
      lane: path.includes('/checks/') ? 'checks' : path.endsWith('.vendor.spec.mjs') ? 'vendor' : 'spec',
      class: classOfPath(path),
      cost: 'fast-inproc',
      uniqueClaim: claimOf(source),
      oracleType: oracleTypeOf(source, { relPath: path, root }),
      sunset: sunsetOfPath(path),
    }
  })
}
