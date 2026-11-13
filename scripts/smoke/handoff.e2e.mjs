#!/usr/bin/env node
// handoff.e2e.mjs — export-handoff 的产物边界与接收指令证据（keyless，只读 HEAD）。
// 证明：源码移交包含 .gitmodules/AGENTS.md/pnpm-lock.yaml/HANDOFF.md/包合同，且不含 runtime/、
// research-workspace/drt_*、凭据、node_modules、.git、_dist/*.tgz；HANDOFF 的接收命令含
// git init → fetch → reset → submodule update。不是“脚本自己说干净”。
// 用法：node scripts/smoke/handoff.e2e.mjs
// 退出码：0 干净 / 1 边界红 / 2 前置缺席
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ARCHIVE_PREFIX,
  FORBIDDEN_ENTRY_PATTERNS,
  HANDOFF_FILENAME,
  REQUIRED_ENTRIES,
  SUBMODULE_PATH,
} from '../dist/export-handoff.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = mkdtempSync(join(tmpdir(), 'handoff.e2e-'))
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}

try {
  // 边界判据的两向自检：运行态要红，fixtures / runtime 骨架要放行。
  const patternCases = [
    { path: `${ARCHIVE_PREFIX}runtime/harness-home/sessions/x`, forbidden: true },
    { path: `${ARCHIVE_PREFIX}research-workspace/archive/drt_x/run.md`, forbidden: true },
    { path: `${ARCHIVE_PREFIX}tests/fixtures/client-load-home/workspace/research-workspace/archive/drt_x/run.md`, forbidden: false },
    { path: `${ARCHIVE_PREFIX}runtime/README.md`, forbidden: false },
  ]
  for (const item of patternCases) {
    const hit = FORBIDDEN_ENTRY_PATTERNS.some((rx) => rx.test(item.path))
    check(hit === item.forbidden, `边界判据：${item.path}`, `期望 ${item.forbidden ? '禁入' : '放行'}，实际 ${hit ? '禁入' : '放行'}`)
  }

  const run = spawnSync(process.execPath, [join(ROOT, 'scripts', 'dist', 'export-handoff.mjs'), '--out', OUT], { encoding: 'utf8' })
  check(run.status === 0, 'export-handoff 退出 0', (run.stderr || '').slice(-400))
  const tarballs = readdirSync(OUT).filter((n) => n.endsWith('.tar.gz'))
  check(tarballs.length === 1, '产出一个源码移交包', JSON.stringify(tarballs))
  const tgz = join(OUT, tarballs[0] ?? '')
  if (tgz !== '' && existsSync(tgz)) {
    const listed = spawnSync('tar', ['-tzf', tgz], { encoding: 'utf8' })
    const entries = (listed.stdout ?? '').split('\n').filter(Boolean)
    const has = (rel) => entries.includes(`${ARCHIVE_PREFIX}${rel}`)
    const missing = REQUIRED_ENTRIES.filter((rel) => !has(rel))
    check(missing.length === 0, '必备源在场（当前合同件 + HANDOFF）', missing.join('、'))
    const forbidden = entries.filter((rel) => FORBIDDEN_ENTRY_PATTERNS.some((rx) => rx.test(rel)))
    check(forbidden.length === 0, '无运行态/凭据/run 数据/依赖/.git/导出包', forbidden.slice(0, 5).join('、'))
    const handoff = spawnSync('tar', ['-xzOf', tgz, `${ARCHIVE_PREFIX}${HANDOFF_FILENAME}`], { encoding: 'utf8' })
    check(handoff.status === 0, 'HANDOFF.md 可读', (handoff.stderr || '').slice(-300))
    for (const needle of [
      'git init',
      'git update-index --add --cacheinfo 160000,',
      'git submodule update --init --recursive',
      'pnpm install --frozen-lockfile',
    ]) {
      check((handoff.stdout ?? '').includes(needle), `HANDOFF 含接收命令：${needle}`)
    }
    const gitlink = new RegExp(
      `git update-index --add --cacheinfo 160000,[0-9a-f]{40},${SUBMODULE_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    )
    check(gitlink.test(handoff.stdout ?? ''), 'HANDOFF 的 gitlink 含 40 位 submodule SHA + 路径')
  }
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  rmSync(OUT, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`handoff.e2e: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('handoff.e2e: ALL PASS')
process.exit(0)
