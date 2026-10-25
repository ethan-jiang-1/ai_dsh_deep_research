// path-hygiene 纯函数回归 — run bundle 移交前的本机 home 路径检测。
// 反证：删 `/home/` 分支或把行号/上下文判断改坏 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findHomePaths, scanHomePaths } from '../../scripts/lib/path-hygiene.mjs'

test('findHomePaths：Unix / macOS / Windows home 前缀都命中，并给行号', () => {
  const text = [
    '相对路径 evidence/a.md 不命中',
    '抓取于 /Users/alice/tmp/page.html',
    '本地文件 /home/bob/data.csv',
    String.raw`Windows C:\Users\carol\file.txt`,
    'URL https://example.com/Users/not-a-path 不命中',
  ].join('\n')
  const findings = findHomePaths(text)
  assert.deepEqual(findings.map((f) => f.line), [2, 3, 4])
  assert.ok(findings[0].text.includes('/Users/alice'))
  assert.ok(findings[2].text.includes(String.raw`C:\Users\carol`))
})

test('scanHomePaths：逐文件带路径汇总；相对路径与普通 URL 零 finding', () => {
  const findings = scanHomePaths([
    { path: 'final/v1.md', text: '[来源: evidence/a.md]\n' },
    { path: 'provenance/x.json', text: '{"path":"/Users/dan/raw.html"}' },
    { path: 'final/readable-v1.md', text: '见 https://example.com/home/page 与 ./relative' },
  ])
  assert.equal(findings.length, 1)
  assert.equal(findings[0].path, 'provenance/x.json')
  assert.equal(findings[0].line, 1)
})
