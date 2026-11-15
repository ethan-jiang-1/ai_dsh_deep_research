// test-index — 测试 ↔ 源码 owner 索引的生成器（2026-11-15 test-source-mirror）。
// 索引是生成物（tests/INDEX.generated.md）：人类按主语检索走它，目录回答「谁在用」。
// 维度 = scripts/lib 模块 → owner → 直接 import 它的测试文件；不读运行区、零子进程。
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { localImportPath, parseKeylessImports } from './keyless-imports.mjs'

/** owner 目录闭集（与 scripts/lib/<owner>/ 和 tests/run/<owner>/ 同名）。 */
export const OWNERS = ['gates', 'ops', 'channel', 'harness', 'probes', 'repo', 'tools', 'shared', 'test-infra']

/** 盘上 lib 模块（递归；含 .cjs），module = owner/name。 */
export function libModulesOf(root) {
  const lib = join(root, 'scripts', 'lib')
  const out = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (/\.(mjs|cjs)$/.test(ent.name)) {
        const rel = relative(lib, p).split('\\').join('/')
        const [owner] = rel.split('/')
        out.push({ module: rel.replace(/\.(mjs|cjs)$/, ''), owner, file: p })
      }
    }
  }
  walk(lib)
  return out.sort((a, b) => a.module.localeCompare(b.module))
}

function testFilesOf(root) {
  const out = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) {
        if (['fixtures', '_tmp', 'node_modules'].includes(ent.name)) continue
        walk(p)
      } else if (ent.name.endsWith('.spec.mjs') || ent.name.endsWith('.test.mjs')) out.push(p)
    }
  }
  walk(join(root, 'tests'))
  return out.sort()
}

/** 直接 import 每个 lib 模块的测试文件（仓内相对路径，按路径排序）。 */
function testImportersOf(root) {
  const lib = join(root, 'scripts', 'lib')
  const importers = new Map()
  for (const file of testFilesOf(root)) {
    const { imports } = parseKeylessImports(readFileSync(file, 'utf8'), file)
    for (const { specifier } of imports) {
      const target = localImportPath(file, specifier)
      if (target === undefined) continue
      const rel = relative(lib, target).split('\\').join('/')
      if (rel.startsWith('..') || !/\.(mjs|cjs)$/.test(rel)) continue
      const key = rel.replace(/\.(mjs|cjs)$/, '')
      if (!importers.has(key)) importers.set(key, new Set())
      importers.get(key).add(relative(root, file).split('\\').join('/'))
    }
  }
  return importers
}

/** 渲染索引 Markdown（稳定排序、无日期——生成物对账要求逐字节一致）。 */
export function renderTestIndex(root) {
  const importers = testImportersOf(root)
  const lines = [
    '# tests/INDEX.generated.md — 测试 ↔ 源码 owner 索引（生成物，勿手改）',
    '',
    '> 生成器 = `node dev/render-test-index.mjs`；对账 = `tests/checks/test-index.test.mjs`。',
    '> 维度 = `scripts/lib/<owner>/<module>` → 直接 import 它的测试文件；目录回答「谁在用」，本索引回答「这概念在哪」。',
    '',
    '| owner | 模块 | 测试 |',
    '|---|---|---|',
  ]
  for (const { module, owner } of libModulesOf(root)) {
    const tests = [...(importers.get(module) ?? [])].sort()
    lines.push(`| ${owner} | \`${module}\` | ${tests.length === 0 ? '—' : tests.map((t) => `\`${t}\``).join('<br>')} |`)
  }
  lines.push('')
  return lines.join('\n')
}
