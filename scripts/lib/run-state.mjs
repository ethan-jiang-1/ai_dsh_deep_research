// scripts/lib/run-state.mjs — run 操作面状态谓词模块（RFC run-ops-self-diagnosis 的核心件）。
//
// 为什么存在（2026-09-27 第 12 场实录两类真故障，全部有红绿证据）：
//   ① grep 假阳性——'ask_user_question' 字符串在 request/header 的工具 schema 里必有
//     （每个会话的请求头都带工具目录），grep 判"卡挂起"在 prompt 送出 10s 内必然误报；
//     真谓词 = 事件形状，语义正本 = pack hitl-fold（本模块 import 它，不写第二份——
//     role-list-sync 同款"事实源唯一"教训）；
//   ② 判定过急——final.md 存在 ≠ run 完成（第 12 场实录：final 落盘后回合仍在跑、present
//     未声明、HITL2 未发）。本模块拆两粒度：finalWritten（文件在场）与 runSettled
//     （回合已终 + final 在场；present 缺席由 presentCalls 单独暴露，不并入 settled——
//     偏差要显性，不能静默放行）。
//
// 消费方：scripts/watch-run.mjs（盯场）、dev/hitl-answer.mjs（前置自拒）、
// tests/run-state.test.mjs（三态夹具与 native log reader，测试路径零子进程，layering 合规）。
// 运行需 `node --import tsx/esm`（直引 pack .ts 源）。
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { foldHitlPending } from '../../packages/deep-research-pack/src/lib/hitl-fold.ts'
import { readSessionEvents } from './session-log.mjs'

export { readSessionEvents }

/**
 * 形状化工具调用计数——grep 假阳性的反义：只认 `tool/call` 事件的 `data.name`，
 * request/header 里的 schema 字符串天然不计入。
 * @param events 已解析事件数组。@param name wire 工具名。
 */
export function toolCallCount(events, name) {
  return events.filter((j) => j?.type === 'tool/call' && j?.data?.name === name).length
}

/** HITL 挂起态（谓词正本 = pack hitl-fold：尾部回合事件形状，session/* 元数据跳过）。 */
export function hitlPendingOf(events) {
  return foldHitlPending(events)
}

/** 回合是否仍开着（turn/start 多于 turn/end——run 还在跑）。 */
export function turnOpenOf(events) {
  const starts = events.filter((j) => j?.type === 'turn/start').length
  const ends = events.filter((j) => j?.type === 'turn/end').length
  return starts > ends
}

/**
 * 同会话事件数回退检测（BUG-007 自救面：通道死亡丢日志尾部后，hitl-fold 等盘侧谓词
 * 会把 settled run 折叠成"挂起未答"假态——日志单调是所有盘侧判据的地基，回退即损坏）。
 * @param prevCount 上一轮读到的事件数（null = 无前值）。@param curCount 本轮事件数
 *   （null = 本轮不可读——由 readable 单独暴露，不在此误报）。
 * @returns true 仅当两个确凿数字存在且 cur < prev。
 */
export function eventsRegressed(prevCount, curCount) {
  if (typeof prevCount !== 'number' || typeof curCount !== 'number') return false
  return curCount < prevCount
}

/**
 * 最后一条 ask_user_question 的等待形态（BUG-005：活等待的兜底语义不同——
 * wait:-1 无限期下 timed 600s 放行与文本消息兜底均不可用，只有真浏览器作答一条路）。
 * @returns true = 无限期；false = timed/默认；null = 无 ask 或参数读不出（形态未知不猜测）。
 */
export function askIndefiniteOf(events) {
  const last = [...events].reverse().find((j) => j?.type === 'tool/call' && j?.data?.name === 'ask_user_question')
  if (last === undefined) return null
  let args = {}
  try { args = JSON.parse(last?.data?.arguments ?? '{}') } catch { return null }
  if (!Array.isArray(args.questions)) return null
  return args.wait === -1
}

/**
 * 工作区 run bundle 状态（位置=状态：工作区根 drt_* = 在飞；已交付归 archive/ 不在此列）。
 * @param wsRoot 研究工作区根。
 */
export function bundleStateOf(wsRoot) {
  const bundles = existsSync(wsRoot) ? readdirSync(wsRoot).filter((d) => d.startsWith('drt_')) : []
  const active = bundles.sort().at(-1) ?? null
  return {
    bundles,
    activeBundle: active,
    finalWritten: active !== null && existsSync(join(wsRoot, active, 'final.md')),
  }
}

/**
 * 会话 + 工作区组合快照（watcher 与前置自拒的判定输入；全字段可 JSON 序列化打日志）。
 * @param params logPath 会话日志路径；wsRoot 研究工作区根。
 */
export function runStateOf({ logPath, wsRoot }) {
  const { readable, events } = readSessionEvents(logPath)
  const bundle = bundleStateOf(wsRoot)
  const turnOpen = readable ? turnOpenOf(events) : null
  return {
    readable,
    events: events.length,
    hitlPending: readable ? hitlPendingOf(events).pending : null,
    askCalls: readable ? toolCallCount(events, 'ask_user_question') : null,
    askIndefinite: readable ? askIndefiniteOf(events) : null,
    presentCalls: readable ? toolCallCount(events, 'present') : null,
    turnOpen,
    ...bundle,
    // runSettled = 回合已终 + final 在场。present 缺席不阻塞 settled（由 presentCalls 暴露偏差）。
    runSettled: readable === true && turnOpen === false && bundle.finalWritten,
  }
}
