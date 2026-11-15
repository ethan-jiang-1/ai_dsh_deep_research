// test-index — 测试 ↔ 源码 owner/domain 索引的生成器（2026-11-15 test-source-mirror）。
// 索引是生成物（tests/INDEX.generated.md）：人类按主语检索走它，目录回答「谁在用」。
// 两棵模块树：scripts/lib/<owner>/（研发面）与 pack src/lib/<domain>/（产品面）；
// 只读、零子进程。pack src/client 在 Step 2 接入。
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { localImportPath, parseKeylessImports } from './keyless-imports.mjs'

/** scripts/lib 的 owner 闭集（与 tests/run/<owner>/ 同名）。 */
export const OWNERS = ['gates', 'ops', 'channel', 'harness', 'probes', 'repo', 'tools', 'shared', 'test-infra']

/** pack src/lib 的 domain 闭集（与 tests/cockpit/lib/<domain>/ 同名）。 */
export const DOMAINS = ['run', 'plan', 'events', 'method-library', 'review', 'workspace', 'shared']

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

/** 直接 import baseDir 下文件的测试（相对 baseDir 的 key → 仓内测试路径集合）。 */
function importersUnder(root, baseDir) {
  const out = new Map()
  for (const file of testFilesOf(root)) {
    const { imports } = parseKeylessImports(readFileSync(file, 'utf8'), file)
    for (const { specifier } of imports) {
      const target = localImportPath(file, specifier)
      if (target === undefined) continue
      const rel = relative(baseDir, target).split('\\').join('/')
      if (rel.startsWith('..') || !/\.(mjs|cjs|ts|tsx)$/.test(rel)) continue
      const key = rel.replace(/\.(mjs|cjs|ts|tsx)$/, '')
      if (!out.has(key)) out.set(key, new Set())
      out.get(key).add(relative(root, file).split('\\').join('/'))
    }
  }
  return out
}

/** 盘上 scripts/lib/<owner>/<module>（递归；含 .cjs）。 */
export function libModulesOf(root) {
  const base = join(root, 'scripts', 'lib')
  const out = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (/\.(mjs|cjs)$/.test(ent.name)) {
        const rel = relative(base, p).split('\\').join('/')
        out.push({ module: rel.replace(/\.(mjs|cjs)$/, ''), owner: rel.split('/')[0] })
      }
    }
  }
  walk(base)
  return out.sort((a, b) => a.module.localeCompare(b.module))
}

/** 盘上 pack src/lib/<domain>/<module>.ts。 */
export function packLibModulesOf(root) {
  const base = join(root, 'packages', 'deep-research-pack', 'src', 'lib')
  const out = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.name.endsWith('.ts')) {
        const rel = relative(base, p).split('\\').join('/')
        out.push({ module: rel.replace(/\.ts$/, ''), domain: rel.split('/')[0] })
      }
    }
  }
  walk(base)
  return out.sort((a, b) => a.module.localeCompare(b.module))
}

/** 盘上 pack src/client/<sub>/<module>.ts(x)（根文件 key 不带子目录）。 */
export function packClientModulesOf(root) {
  const base = join(root, 'packages', 'deep-research-pack', 'src', 'client')
  const out = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(ent.name)) {
        const rel = relative(base, p).split('\\').join('/')
        out.push({ module: rel.replace(/\.(ts|tsx)$/, ''), area: rel.includes('/') ? rel.split('/')[0] : '(root)' })
      }
    }
  }
  walk(base)
  return out.sort((a, b) => a.module.localeCompare(b.module))
}

/** 渲染索引 Markdown（稳定排序、无日期——生成物对账要求逐字节一致）。 */
export function renderTestIndex(root) {
  const libImporters = importersUnder(root, join(root, 'scripts', 'lib'))
  const packImporters = importersUnder(root, join(root, 'packages', 'deep-research-pack', 'src', 'lib'))
  const lines = [
    '# tests/INDEX.generated.md — 测试 ↔ 源码 owner/domain 索引（生成物，勿手改）',
    '',
    '> 生成器 = `node dev/render-test-index.mjs`；对账 = `tests/checks/test-index.test.mjs`。',
    '> 维度 = 模块 → owner/domain → 直接 import 它的测试；目录回答「谁在用」，本索引回答「这概念在哪」。',
    '',
    '## scripts/lib（研发面）',
    '',
    '| owner | 模块 | 测试 |',
    '|---|---|---|',
  ]
  for (const { module, owner } of libModulesOf(root)) {
    const tests = [...(libImporters.get(module) ?? [])].sort()
    lines.push(`| ${owner} | \`${module}\` | ${tests.length === 0 ? '—' : tests.map((t) => `\`${t}\``).join('<br>')} |`)
  }
  lines.push('', '## pack src/lib（产品面）', '', '| domain | 模块 | 测试 |', '|---|---|---|')
  for (const { module, domain } of packLibModulesOf(root)) {
    const tests = [...(packImporters.get(module) ?? [])].sort()
    lines.push(`| ${domain} | \`${module}\` | ${tests.length === 0 ? '—' : tests.map((t) => `\`${t}\``).join('<br>')} |`)
  }
  const clientImporters = importersUnder(root, join(root, 'packages', 'deep-research-pack', 'src', 'client'))
  lines.push('', '## pack src/client（观察面）', '', '| 区 | 文件 | 测试 |', '|---|---|---|')
  for (const { module, area } of packClientModulesOf(root)) {
    const tests = [...(clientImporters.get(module) ?? [])].sort()
    lines.push(`| ${area} | \`${module}\` | ${tests.length === 0 ? '—' : tests.map((t) => `\`${t}\``).join('<br>')} |`)
  }
  lines.push('')
  return lines.join('\n')
}
