#!/usr/bin/env node
// scripts/run-ops/watch-run.mjs — run 盯场件（RFC run-ops-self-diagnosis）。谓词 =
// scripts/lib/run-state.mjs（事件形状，非字符串 grep）。
//
// 退出码：0 = HITL-PENDING 或 RUN-SETTLED（stdout `STATE:` 行自报是哪个）；1 = 超时；2 = 用法错。
// 用法：node --import tsx/esm scripts/run-ops/watch-run.mjs <session-id> [--interval 20] [--timeout-min 90]
//         [--group <组名子串>]
//   --group 覆盖缺省 research-workspace 组（组过滤盲区逃生口：盯冒烟/自测会话组如
//   dev-smoke-workspace；无命中 fail-loud 列在场组）。
//   （会话根 = $DSH_HOME，缺省回退本仓 runtime/harness-home；显式 source dev/env.sh 更稳）
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runStateOf, eventsRegressed, leadHitlCandidate } from '../lib/run-state.mjs'
import { findGroup, resolveSessionLog } from '../lib/session-log.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SID = process.argv[2]
const num = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 ? Number(process.argv[i + 1]) : dflt
}
const INTERVAL_S = num('interval', 20)
const TIMEOUT_MIN = num('timeout-min', 90)
const GROUP_SUBSTR = (() => {
  const i = process.argv.indexOf('--group')
  return i !== -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : 'research-workspace'
})()

if (!SID || !/^[\w-]+$/.test(SID)) {
  console.error('watch-run: 用法 node --import tsx/esm scripts/run-ops/watch-run.mjs <session-id> [--interval 20] [--timeout-min 90] [--group <组名子串>]')
  process.exit(2)
}
const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(ROOT, 'runtime', 'harness-home')
const sessionsRoot = join(home, 'sessions')
const group = findGroup(sessionsRoot, GROUP_SUBSTR)
if (group === undefined) {
  const groups = existsSync(sessionsRoot) ? readdirSync(sessionsRoot) : []
  console.error(`watch-run: --group ${GROUP_SUBSTR} 无命中会话组（根 ${sessionsRoot}；在场组：${groups.join('、') || '（空）'}）——换子串（如 dev-smoke-workspace / runtime-smoke-workspace），或先 source dev/env.sh`)
  process.exit(2)
}
const logPath = resolveSessionLog(join(sessionsRoot, group, SID))
if (logPath === null) {
  console.error(`watch-run: 找不到会话日志（组 ${group} 下无 ${SID} 的 canonical 日志）——先 source dev/env.sh 并核对 session id`)
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
    // 选卡面纪律（审计 P3 件⑨ + 2026-10-21 维度6 件②）：HITL 挂起谓词只对 lead 有意义——
    // 盯到非 lead 会话或 teammate 会话显性提示一次（不硬退：观察面允许盯任意会话，但操作者
    // 必须知道谓词语义不同）。teammate 判据 = 首事件 origin=subagent（agentPreset 继承
    // "lead" 对 teammate 不表身份，只读 preset 时本提醒对 teammate 永不触发——恒假已修）。
    if (s.teammate === true) {
      console.error(`watch-run: ⚠ 盯的是 teammate 会话（首事件 origin=subagent）——agentPreset 继承 lead persona 不表身份，hitlPending 不构成停靠信号（lead 的卡才需要操作侧接手）`)
    } else if (s.preset !== undefined && s.preset !== null && s.preset !== 'lead') {
      console.error(`watch-run: ⚠ 盯的是 ${s.preset} 会话——hitlPending 对非 lead 会话不构成 HITL 停靠信号（lead 的卡才需要操作侧接手）`)
    }
  }
  if (leadHitlCandidate(s)) { console.log('STATE: HITL-PENDING'); process.exit(0) }
  if (s.runSettled === true) {
    console.log(`STATE: RUN-SETTLED${s.presentCalls === 0 ? '（⚠ present 声明缺席——偏差，需记档）' : ''}`)
    process.exit(0)
  }
}
// 超时不是"没跑完"的同义词：交付归档后 bundleStateOf 只扫工作区根 drt_*（位置=状态），
// finalWritten 恒 false → 盯旧会话永不落定。头注提示归档去向，防把归档读成未完成。
console.log('STATE: TIMEOUT（bundle 已归档？→ research-workspace/archive/ 下找——归档后工作区根无 drt_*，finalWritten 恒 false，盯旧会话不会落定）')
process.exit(1)
