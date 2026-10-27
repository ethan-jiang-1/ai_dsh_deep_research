// path-hygiene 纯函数回归 — run bundle 移交前的本机 home 路径检测。
// 反证：删 `/home/` 分支或把行号/上下文判断改坏 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findHomePaths, portableBundlePath, scanHomePaths } from '../../scripts/lib/path-hygiene.mjs'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BUNDLE = join('/ws', 'research-workspace', 'drt_x')

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

test('交付门覆盖面：run/question/plan/findings/review/journal/evidence 都在扫描入口', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'scripts', 'run-gates', 'path-hygiene.mjs'), 'utf8')
  for (const name of ['run.md', 'question.md', 'topics.md', 'plan.md', 'findings.md', 'review.md', 'journal.md', 'leads.md', 'evidence']) {
    assert.ok(src.includes(name), `path-hygiene 未覆盖 ${name}`)
  }
})

test('portableBundlePath：bundle 内绝对路径 → drt_<slug>/ 相对标签（回执/门禁的可移植形态）', () => {
  assert.equal(portableBundlePath(join(BUNDLE, 'final', 'v1.md'), BUNDLE), 'drt_x/final/v1.md')
  assert.equal(portableBundlePath(join(BUNDLE, 'final', 'readable-v1.md'), BUNDLE), 'drt_x/final/readable-v1.md')
})

test('portableBundlePath：已是相对路径 → 原样保留（旧样本/手写回执）', () => {
  assert.equal(portableBundlePath('drt_x/final/v1.md', BUNDLE), 'drt_x/final/v1.md')
  assert.equal(portableBundlePath('final/v1.md', BUNDLE), 'final/v1.md')
})

test('portableBundlePath：bundle 外绝对路径 → null（不得把本机路径写进回执）', () => {
  assert.equal(portableBundlePath('/tmp/report.md', BUNDLE), null)
  assert.equal(portableBundlePath(join(BUNDLE, '..', 'drt_y', 'final', 'v1.md'), BUNDLE), null)
  assert.equal(portableBundlePath(join(BUNDLE, '..', 'drt_x-extra', 'final', 'v1.md'), BUNDLE), null)
})

test('portableBundlePath：bundleDir 经 symlink、present 是 realpath → 仍归一化（不假红）', () => {
  const base = realpathSync(mkdtempSync(`${tmpdir()}/dsh-link-`))
  const real = `${base}/drt_x`
  mkdirSync(`${real}/final`, { recursive: true })
  writeFileSync(`${real}/final/v1.md`, '# v1\n')
  const link = `${base}/link-x`
  symlinkSync(real, link)
  try {
    assert.equal(portableBundlePath(`${real}/final/v1.md`, link), 'drt_x/final/v1.md')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})
