#!/usr/bin/env node
// bundle-sessions.mjs — run bundle → 见证会话清单（诊断入口的第一步）。
//
// 用法：source dev/env.sh && node scripts/run-ops/bundle-sessions.mjs <bundle|slug> [--sessions <dir>] [--json]
// 退出码：0 = 找到见证会话 / 1 = 语料在场但零绑定会话 / 2 = 用法或前置缺席（未跑 ≠ 通过）。
//
// 为什么要它：诊断一律从会话起手（`stream-diagnostics --session <标题|id>`），而 bundle 里
// 不记会话 id——这一步此前只能按 mtime 猜或手写解压脚本（见 lib/bundle-sessions.mjs 头注）。
// 输出 = 会话 id + 组 + present 条数，并给出可直接复制的下一步命令。
import { existsSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sessionsOfBundle } from '../lib/bundle-sessions.mjs'
import { readZstdText } from '../lib/zstd-read.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const argv = process.argv.slice(2)
const opt = (name, fallback = undefined) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(name)
const target = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--sessions')

if (target === undefined || flag('--help')) {
  console.error('bundle-sessions: 用法 node scripts/run-ops/bundle-sessions.mjs <bundle|drt_<slug>|slug> [--sessions <dir>] [--json]')
  process.exit(2)
}

// 入参三形态：bundle 目录 / drt_<slug> / 裸 slug
const asDir = resolve(target)
const slug = existsSync(asDir) && statSync(asDir).isDirectory() ? basename(asDir) : basename(target.replace(/\/$/, ''))
if (!/^drt_[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(`bundle-sessions: 认不出 bundle 名（期望 drt_<slug>）：${slug}`)
  process.exit(2)
}

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
const sessionsRoot = resolve(opt('--sessions', home === null ? join(ROOT, 'runtime', 'harness-home', 'sessions') : join(home, 'sessions')))
if (!existsSync(sessionsRoot)) {
  console.error(`bundle-sessions: 会话根不在场：${sessionsRoot}（先 source dev/env.sh 或给 --sessions）`)
  process.exit(2)
}

const result = sessionsOfBundle(sessionsRoot, slug, { readLog: (p) => { const r = readZstdText(p); return r.ok ? r.text : '' } })
if (flag('--json')) {
  console.log(JSON.stringify({ ...result, sessionsRoot }, null, 2))
  process.exit(result.sessions.length === 0 ? 1 : 0)
}

console.log(`bundle-sessions: ${slug}（扫 ${result.logs} 个会话日志，根 = ${sessionsRoot}）`)
if (result.sessions.length === 0) {
  console.error('  零绑定会话——语料在场但没有任何会话写过/读过该 bundle（换了 home？或 bundle 名不对）')
  process.exit(1)
}
for (const s of result.sessions) {
  const tag = s.presented > 0 ? `present×${s.presented}` : '提及'
  console.log(`  ${s.sessionId}  [${s.group ?? '?'}]  ${tag}`)
}
const top = result.sessions[0]
console.log('')
console.log('下一步（诊断）：')
console.log(`  node scripts/run-ops/stream-diagnostics.mjs --session ${top.sessionId}`)
console.log(`  node scripts/run-ops/watch-run.mjs ${slug}`)
process.exit(0)
