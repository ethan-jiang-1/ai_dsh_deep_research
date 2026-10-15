#!/usr/bin/env node
// scripts/run-ops/watch-run.mjs — run 盯场件（RFC run-ops-self-diagnosis）。谓词 =
// scripts/lib/run-state.mjs（事件形状，非字符串 grep）。
//
// 退出码：0 = HITL-PENDING 或 RUN-SETTLED（stdout `STATE:` 行自报是哪个）；1 = 超时；2 = 用法错。
// 用法：node --import tsx/esm scripts/run-ops/watch-run.mjs <session-id> [--interval 20] [--timeout-min 90]
//   （会话根 = $DSH_HOME，缺省回退本仓 runtime/harness-home；显式 source dev/env.sh 更稳）
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runStateOf, eventsRegressed, leadHitlCandidate } from '../lib/run-state.mjs'
import { researchWorkspaceGroup, resolveSessionLog } from '../lib/session-log.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SID = process.argv[2]
const num = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 ? Number(process.argv[i + 1]) : dflt
}
const INTERVAL_S = num('interval', 20)
const TIMEOUT_MIN = num('timeout-min', 90)

if (!SID || !/^[\w-]+$/.test(SID)) {
  console.error('watch-run: 用法 node --import tsx/esm scripts/run-ops/watch-run.mjs <session-id> [--interval 20] [--timeout-min 90]')
  process.exit(2)
}
const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(ROOT, 'runtime', 'harness-home')
const sessionsRoot = join(home, 'sessions')
const group = researchWorkspaceGroup(sessionsRoot)
const logPath = group !== undefined ? resolveSessionLog(join(sessionsRoot, group, SID)) : null
if (logPath === null) {
  console.error(`watch-run: 找不到会话日志（${logPath ?? 'sessions 根缺 research-workspace 组'}）——先 source dev/env.sh 并核对 session id`)
  process.exit(2)
}
const wsRoot = join(ROOT, 'research-workspace')

const deadline = Date.now() + TIMEOUT_MIN * 60 * 1000
let last = ''
let prevEvents = null
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, INTERVAL_S * 1000))
  const s = runStateOf({ logPath, wsRoot })
  // 日志回退检测（BUG-007 自救面）：同会话事件数变小 = 日志丢尾，此后一切盘侧谓词
  // （hitlPending/runSettled）都建立在残缺地基上——fail-loud 退出，不带着假象盯场。
  if (eventsRegressed(prevEvents, s.readable ? s.events : null)) {
    console.log(`STATE: LOG-REGRESSION（事件数 ${prevEvents} → ${s.events}——通道死亡丢尾，盘侧谓词失效；正本 = bugs/BUG-007 卡）`)
    process.exit(1)
  }
  if (s.readable) prevEvents = s.events
  const line = JSON.stringify(s)
  if (line !== last) {
    console.log(`${new Date().toISOString().slice(11, 19)} ${line}`)
    last = line
    // 选卡面纪律（审计 P3 件⑨）：HITL 挂起谓词只对 lead 有意义——盯到非 lead 会话
    // 显性提示一次（不硬退：观察面允许盯任意会话，但操作者必须知道谓词语义不同）。
    if (s.preset !== undefined && s.preset !== null && s.preset !== 'lead')
      console.error(`watch-run: ⚠ 盯的是 ${s.preset} 会话——hitlPending 对非 lead 会话不构成 HITL 停靠信号（lead 的卡才需要操作侧接手）`)
  }
  if (leadHitlCandidate(s)) { console.log('STATE: HITL-PENDING'); process.exit(0) }
  if (s.runSettled === true) {
    console.log(`STATE: RUN-SETTLED${s.presentCalls === 0 ? '（⚠ present 声明缺席——偏差，需记档）' : ''}`)
    process.exit(0)
  }
}
console.log('STATE: TIMEOUT')
process.exit(1)
