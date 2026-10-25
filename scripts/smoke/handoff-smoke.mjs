#!/usr/bin/env node
// handoff-smoke.mjs — export-handoff 的产物边界证据（keyless，只读 HEAD）。
// 证明：源码移交包含 .gitmodules/AGENTS.md/seed.json，且不含 runtime/、research-workspace/drt_*、
// 凭据、node_modules、_dist/*.tgz；不是“脚本自己说干净”。
// 用法：node scripts/smoke/handoff-smoke.mjs
// 退出码：0 干净 / 1 边界红 / 2 前置缺席
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = mkdtempSync(join(tmpdir(), 'handoff-smoke-'))
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}

try {
  const run = spawnSync(process.execPath, [join(ROOT, 'scripts', 'dist', 'export-handoff.mjs'), '--out', OUT], { encoding: 'utf8' })
  check(run.status === 0, 'export-handoff 退出 0', (run.stderr || '').slice(-400))
  const tarballs = readdirSync(OUT).filter((n) => n.endsWith('.tar.gz'))
  check(tarballs.length === 1, '产出一个源码移交包', JSON.stringify(tarballs))
  const tgz = join(OUT, tarballs[0] ?? '')
  if (tgz !== '' && existsSync(tgz)) {
    const listed = spawnSync('tar', ['-tzf', tgz], { encoding: 'utf8' })
    const entries = (listed.stdout ?? '').split('\n').filter(Boolean)
    const has = (rel) => entries.includes(`ai_dsh_deep_research/${rel}`)
    check(has('.gitmodules') && has('AGENTS.md') && has('packages/deep-research-pack/workspace/seed.json'),
      '必备源在场（.gitmodules / AGENTS.md / seed.json）')
    const forbidden = entries.filter((rel) => (
      /(?:^|\/)node_modules(?:\/|$)/.test(rel)
      || /(?:^|\/)\.credentials\.yaml$/.test(rel)
      || /(?:^|\/)(?:runtime|research-workspace)\/.*(?:^|\/)(?:sessions|drt_[^/]+)(?:\/|$)/.test(rel)
      || /_dist\/.*\.tgz$/.test(rel)
    ))
    check(forbidden.length === 0, '无运行态/凭据/run 数据/依赖/导出包', forbidden.slice(0, 5).join('、'))
  }
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  rmSync(OUT, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`handoff-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('handoff-smoke: ALL PASS')
process.exit(0)
