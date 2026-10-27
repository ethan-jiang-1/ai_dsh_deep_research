#!/usr/bin/env node
// secret-scan-smoke — 交付物秘密扫描的**范围边界**证据（keyless；CLI 真入口）。
//
// 证明：默认只扫交付物（evidence 命中不红）；--all 才扫证据；--allow-legacy 只报告；
// 输出不回显命中原文。纯函数正例/负例归 tests/run/secret-scan.test.mjs。
// 退出码：0 全绿；失败时非零退出（无前置缺席面）。
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CLI = join(ROOT, 'scripts', 'run-gates', 'secret-scan.mjs')
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `secret-scan-smoke-${String(process.pid)}`)
const KEY = 'AKIA' + 'IOSFODNN7EXAMPLE'
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const bundle = join(TEMP, 'drt_x')

try {
  mkdirSync(join(bundle, 'final'), { recursive: true })
  mkdirSync(join(bundle, 'evidence'), { recursive: true })
  writeFileSync(join(bundle, 'final', 'v1.md'), '# v1\nclean\n')
  writeFileSync(join(bundle, 'evidence', 'leak.md'), `# E\n${KEY}\n`)
  const run = (...args) => spawnSync(process.execPath, [CLI, bundle, ...args], { encoding: 'utf8' })
  const delivered = run()
  check(delivered.status === 0, '默认只扫交付物：evidence 命中不红', delivered.stdout + delivered.stderr)
  const all = run('--all')
  check(all.status === 1, '--all 扫证据：命中红', all.stdout + all.stderr)
  check(!all.stdout.includes(KEY), '扫描输出不回显命中原文')
  const legacy = run('--all', '--allow-legacy')
  check(legacy.status === 0, '--allow-legacy 只报告（旧 bundle 豁免）', legacy.stdout + legacy.stderr)
} finally {
  rmSync(TEMP, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\nsecret-scan-smoke: ${String(failures.length)} 项失败`)
  process.exit(1)
}
console.log('\nsecret-scan-smoke: ALL PASS')
process.exit(0)
