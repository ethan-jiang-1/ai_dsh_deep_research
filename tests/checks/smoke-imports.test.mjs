// 负例留证 2026-11-14：BUG-079——冒烟层死模块引用（引用的 seed-core 已删）只在真跑时炸，且旧版按行正则
// 漏多行静态引用、动态字面量引用与支援件传递闭包。修法 = 用 TypeScript AST（parseKeylessImports）
// 遍历全部冒烟入口及其本地相对依赖闭包。红配方：任一多行/动态相对引用指向不存在路径 → 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localImportPath, parseKeylessImports } from '../../scripts/lib/tools/keyless-imports.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SMOKE_DIR = join(ROOT, 'scripts', 'smoke')

function resolveOnDisk(target, fileExists = existsSync) {
  const candidates = [
    target,
    `${target}.mjs`,
    `${target}.ts`,
    `${target}.tsx`,
    `${target}.cjs`,
    `${target}.json`,
    join(target, 'index.mjs'),
    join(target, 'index.ts'),
  ]
  return candidates.find((candidate) => fileExists(candidate)) ?? null
}

function collectBrokenLocalImports(entryFiles, { readSource = (p) => readFileSync(p, 'utf8'), fileExists = existsSync } = {}) {
  const visited = new Set()
  const missing = []
  const syntaxIssues = []

  const visit = (filePath) => {
    if (visited.has(filePath)) return
    visited.add(filePath)
    const parsed = parseKeylessImports(readSource(filePath), filePath)
    for (const err of parsed.syntaxErrors) {
      syntaxIssues.push(`${relative(ROOT, filePath)}: ${err}`)
    }
    for (const { specifier, kind } of parsed.imports) {
      const target = localImportPath(filePath, specifier)
      if (target === undefined) continue
      const resolved = resolveOnDisk(target, fileExists)
      if (resolved === null) {
        missing.push(`${relative(ROOT, filePath)} (${kind}) -> ${specifier}`)
      } else if (/\.(?:mjs|ts|tsx)$/.test(resolved)) {
        visit(resolved)
      }
    }
  }

  for (const entry of entryFiles) visit(entry)
  return { visitedCount: visited.size, missing, syntaxIssues }
}

test('冒烟目录全部入口及本地传递闭包的静态/动态模块引用均可解析（BUG-079 AST 门）', () => {
  const entries = readdirSync(SMOKE_DIR)
    .filter((file) => file.endsWith('.mjs'))
    .sort()
    .map((file) => join(SMOKE_DIR, file))
  assert.ok(entries.length >= 10, '防空语料：smoke 文件过少')
  const report = collectBrokenLocalImports(entries)
  assert.ok(report.visitedCount > entries.length, '传递闭包应覆盖 scripts/lib 与 packages 下被引用模块')
  assert.deepEqual(report.syntaxIssues, [])
  assert.deepEqual(report.missing, [])
})

test('多行解构与动态字面量死引用均被 AST 解析器抓红（BUG-079 反证）', () => {
  const fakeEntry = join(SMOKE_DIR, 'synthetic-entry.mjs')
  const fakeSupport = join(SMOKE_DIR, 'synthetic-support.mjs')
  const sources = new Map([
    [
      fakeEntry,
      [
        'import {',
        '  missingHelper,',
        "} from '../lib/non-existent-seed-core.mjs'",
        "import './synthetic-support.mjs'",
      ].join('\n'),
    ],
    [
      fakeSupport,
      "export const load = () => import('../lib/also-missing-dynamic.mjs')\n",
    ],
  ])
  const report = collectBrokenLocalImports([fakeEntry], {
    readSource: (p) => sources.get(p) ?? '',
    fileExists: (p) => sources.has(p),
  })
  assert.equal(report.missing.length, 2)
  assert.match(report.missing[0], /non-existent-seed-core\.mjs/)
  assert.match(report.missing[1], /also-missing-dynamic\.mjs/)
})
