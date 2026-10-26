#!/usr/bin/env node
// interrupt-smoke.mjs — SIGKILL 中断 scaffold：验证 stale lock + state 临时件清理 + 重跑幂等。
// 用大量小种子文件拉长写入窗；锁定后 SIGKILL，模拟真实崩溃。成功才清理，失败保留现场。
// 用法：node scripts/smoke/interrupt-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from '../../packages/deep-research-pack/scripts/lib/seed-core.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `interrupt-${process.pid}`)
const PACKCOPY = join(TEMP, 'pack')
const WS = join(TEMP, 'ws')
const BULK = 3000
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}

rmSync(TEMP, { recursive: true, force: true })
mkdirSync(TEMP, { recursive: true })
try {
  cpSync(PACK, PACKCOPY, { recursive: true })
  const seedPath = join(PACKCOPY, 'workspace', 'seed.json')
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'))
  seed.version = '9.9.9'
  mkdirSync(join(PACKCOPY, 'workspace', 'bulk'), { recursive: true })
  for (let i = 0; i < BULK; i++) {
    const rel = `bulk/f-${String(i).padStart(4, '0')}.txt`
    const content = `${'x'.repeat(1024)}${i}\n`
    writeFileSync(join(PACKCOPY, 'workspace', rel), content)
    seed.files[rel] = sha256(content)
  }
  writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`)

  const child = spawn(process.execPath, [join(PACKCOPY, 'scripts', 'scaffold.mjs'), '--seed-only', '--workspace', WS], { stdio: 'ignore' })
  const lock = join(WS, '.dsh-research-scaffold.lock')
  const deadline = Date.now() + 10_000
  while (!existsSync(lock) && Date.now() < deadline && child.exitCode === null) await new Promise((r) => setTimeout(r, 5))
  check(existsSync(lock), 'SIGKILL 前锁已建立（写入窗已打开）')
  child.kill('SIGKILL')
  await new Promise((r) => child.once('close', r))
  check(existsSync(lock), 'SIGKILL 后锁仍在（预期 stale）')

  const rerun = spawn(process.execPath, [join(PACKCOPY, 'scripts', 'scaffold.mjs'), '--seed-only', '--workspace', WS], { stdio: 'ignore' })
  const code = await new Promise((r) => rerun.once('close', r))
  check(code === 0, '崩溃后重跑成功', `exit=${code}`)
  check(!existsSync(lock), '重跑接管并释放 stale lock')
  const files = readdirSync(join(WS, 'bulk')).filter((n) => n.endsWith('.txt'))
  check(files.length === BULK, '重跑补齐全部种子', `${files.length}/${BULK}`)
  const state = JSON.parse(readFileSync(join(WS, '.dsh-research-seed.json'), 'utf8'))
  check(state.version === '9.9.9', '重跑后 state 版本正确')
  check(readdirSync(WS).every((n) => !n.startsWith('.dsh-research-seed.json.tmp-')), '崩溃临时 state 已清理')

  // 真并发：第一个持锁跑 --force 时，第二个必须 exit 2；第一个完成后锁释放
  const first = spawn(process.execPath, [join(PACKCOPY, 'scripts', 'scaffold.mjs'), '--force', '--seed-only', '--workspace', WS], { stdio: 'ignore' })
  const lock2 = join(WS, '.dsh-research-scaffold.lock')
  for (let i = 0; i < 2000 && !existsSync(lock2); i++) await new Promise((r) => setTimeout(r, 5))
  check(existsSync(lock2), '并发：第一个进程已持锁')
  const second = spawnSync(process.execPath, [join(PACKCOPY, 'scripts', 'scaffold.mjs'), '--force', '--seed-only', '--workspace', WS], { encoding: 'utf8', timeout: 30_000 })
  check(second.status === 2 && /锁定/.test(second.stderr), '并发：第二个进程 exit 2 且点名锁', (second.stderr || '').slice(-200))
  const firstCode = await new Promise((r) => first.once('close', r))
  check(firstCode === 0 && !existsSync(lock2), '并发：第一个完成并释放锁')
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
}

if (failures.length > 0) {
  console.error(`\ninterrupt-smoke: ${failures.length} 项失败；现场保留：${TEMP}`)
  process.exit(1)
}
rmSync(TEMP, { recursive: true, force: true })
console.log('interrupt-smoke: ALL PASS（SIGKILL → stale lock → 重跑补齐）')
process.exit(0)
