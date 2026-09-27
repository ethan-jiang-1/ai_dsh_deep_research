#!/usr/bin/env node
// scripts/watch-run.mjs — run 盯场件（RFC run-ops-self-diagnosis；dev/smoke-workspace/watch-run.mjs
// 原型转正）。谓词 = scripts/lib/run-state.mjs（事件形状，非字符串 grep）。
//
// 退出码：0 = HITL-PENDING 或 RUN-SETTLED（stdout `STATE:` 行自报是哪个）；1 = 超时；2 = 用法错。
// 用法：node --import tsx/esm scripts/watch-run.mjs <session-id> [--interval 20] [--timeout-min 90]
//   （须先 source dev/env.sh——DSH_HOME 定位会话根）
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runStateOf } from './lib/run-state.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SID = process.argv[2]
const num = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 ? Number(process.argv[i + 1]) : dflt
}
const INTERVAL_S = num('interval', 20)
const TIMEOUT_MIN = num('timeout-min', 90)

if (!SID || !/^[\w-]+$/.test(SID)) {
  console.error('watch-run: 用法 node --import tsx/esm scripts/watch-run.mjs <session-id> [--interval 20] [--timeout-min 90]')
  process.exit(2)
}
const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(ROOT, 'dev', 'harness-home')
const sessionsRoot = join(home, 'sessions')
const group = existsSync(sessionsRoot)
  ? readdirSync(sessionsRoot).find((d) => d.includes('research-workspace'))
  : undefined
const logPath = group !== undefined ? join(sessionsRoot, group, SID, 'session.v4.jsonl.zstd') : null
if (logPath === null || !existsSync(logPath)) {
  console.error(`watch-run: 找不到会话日志（${logPath ?? 'sessions 根缺 research-workspace 组'}）——先 source dev/env.sh 并核对 session id`)
  process.exit(2)
}
const wsRoot = join(ROOT, 'research-workspace')

const deadline = Date.now() + TIMEOUT_MIN * 60 * 1000
let last = ''
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, INTERVAL_S * 1000))
  const s = runStateOf({ logPath, wsRoot })
  const line = JSON.stringify(s)
  if (line !== last) {
    console.log(`${new Date().toISOString().slice(11, 19)} ${line}`)
    last = line
  }
  if (s.hitlPending === true) { console.log('STATE: HITL-PENDING'); process.exit(0) }
  if (s.runSettled === true) {
    console.log(`STATE: RUN-SETTLED${s.presentCalls === 0 ? '（⚠ present 声明缺席——偏差，需记档）' : ''}`)
    process.exit(0)
  }
}
console.log('STATE: TIMEOUT')
process.exit(1)
