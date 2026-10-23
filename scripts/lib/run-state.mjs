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
// 消费方：scripts/run-ops/watch-run.mjs（盯场）、dev/hitl-answer.mjs（前置自拒）、
// tests/run-state.test.mjs（三态夹具与 native log reader，测试路径零子进程，layering 合规）。
// 运行需 `node --import tsx/esm`（直引 pack .ts 源）。
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { foldHitlPending } from '../../packages/deep-research-pack/src/lib/hitl-fold.ts'
import { sessionBindingOf } from '../../packages/deep-research-pack/src/lib/bundle-bind.ts'
import { bundleCandidates } from '../../packages/deep-research-pack/src/lib/run-context.ts'
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

/** Latest non-empty title assigned to a session; missing title remains unknown. */
export function sessionTitleOf(events) {
  let title = null
  for (const event of Array.isArray(events) ? events : []) {
    const value = event?.type === 'session/title' ? event?.data?.title : null
    if (typeof value === 'string' && value.trim() !== '') title = value.trim()
  }
  return title
}

/**
 * 工作区根的 run bundle 清单（**发现用**；D28 位置=操作桶，不代表在飞/已交付）。
 * **只列清单，不猜 active**：会话 → bundle 的归属必须走 `sessionBindingOf`（bundle-bind，
 * 写强读弱）。旧版按字典序取最后一个当 activeBundle，在多 run 并存时把会话绑到别的 bundle
 * （2026-10-20 审计 P0-5 实测：r1 会话被报成 semver）；同款启发式 2026-10-11 已在
 * HITL provenance 上误归过（BUG-020，见 hitl-provenance.mjs 注释）。
 * @param wsRoot 研究工作区根。
 */
export function bundleStateOf(wsRoot) {
  return {
    bundles: existsSync(wsRoot) ? readdirSync(wsRoot).filter((d) => d.startsWith('drt_')) : [],
  }
}

/**
 * 会话绑定的 bundle 目录（D28 三操作桶；根优先，其次 archive/、_abandoned/）。
 * 位置只用于发现，不参与状态判定；同名多处并存时根优先，不猜“哪个才对”。
 * @param wsRoot 研究工作区根。@param bundleName `drt_<slug>` 目录名。
 * @returns 绝对/相对路径 | null。
 */
export function bundleDirOf(wsRoot, bundleName) {
  if (!wsRoot || !bundleName) return null
  for (const rel of bundleCandidates(bundleName)) {
    const p = join(wsRoot, rel)
    if (existsSync(p)) return p
  }
  return null
}

/**
 * 会话 + 工作区组合快照（watcher 与前置自拒的判定输入；全字段可 JSON 序列化打日志）。
 * activeBundle / finalWritten / runSettled 只跟**本会话绑定**的 bundle 走；无绑定 = null
 * （不猜、不拿别的 bundle 的 final 冒充落定）。
 * @param params.logPath canonical 会话日志路径。
 * @param params.wsRoot 研究工作区根。
 * @param params.includeSessionIdentity 仅需按 UI 会话身份选路时设 true；默认日志快照不暴露标题与 id。
 */
export function runStateOf({ logPath, wsRoot, includeSessionIdentity = false }) {
  const { readable, events } = readSessionEvents(logPath)
  const bundle = bundleStateOf(wsRoot)
  const turnOpen = readable ? turnOpenOf(events) : null
  const identity = includeSessionIdentity === true
    ? {
      sessionId: readable && events[0]?.type === 'session' && typeof events[0].id === 'string' ? events[0].id : null,
      title: readable ? sessionTitleOf(events) : null,
    }
    : {}
  const binding = readable ? sessionBindingOf(events) : { slug: undefined, boundBy: undefined, kickoffSeen: false }
  const activeBundle = typeof binding.slug === 'string' ? `drt_${binding.slug}` : null
  const bundleDir = activeBundle === null ? null : bundleDirOf(wsRoot, activeBundle)
  // null = 无绑定/不可读，不能判；false = 绑定的 bundle 无 final；true = 有。
  // D28：final 判定跨三操作桶，不因归档/停放把已落 final 误报成未落。
  const finalWritten = bundleDir === null ? null : existsSync(join(bundleDir, 'final.md'))
  const bundleLocation = bundleDir === null ? null
    : bundleDir === join(wsRoot, 'archive', activeBundle) ? 'archive'
      : bundleDir === join(wsRoot, '_abandoned', activeBundle) ? 'abandoned' : 'root'
  return {
    readable,
    events: events.length,
    ...identity,
    preset: readable && events[0]?.type === 'session' ? (events[0].agentPreset ?? null) : null,
    // teammate 身份信号（加性字段）：teammate 会话的 agentPreset 继承父会话组合（实盘 =
    // 'lead'），preset 字段对它们不表身份；真信号 = 首事件 origin==='subagent'。无 origin
    // 的顶层会话（kickoff/GUI 建）→ false；不可读 → null（不猜）。
    teammate: readable && events[0]?.type === 'session' ? events[0].origin === 'subagent' : null,
    hitlPending: readable ? hitlPendingOf(events).pending : null,
    askCalls: readable ? toolCallCount(events, 'ask_user_question') : null,
    askIndefinite: readable ? askIndefiniteOf(events) : null,
    presentCalls: readable ? toolCallCount(events, 'present') : null,
    turnOpen,
    ...bundle,
    activeBundle,
    bundleLocation,
    bundleBinding: binding.boundBy ?? null,
    finalWritten,
    // runSettled = 回合已终 + **本会话绑定 bundle** 的 final 在场。无绑定 → false（未知不是落定）；
    // present 缺席不阻塞 settled（由 presentCalls 暴露偏差）。
    runSettled: readable === true && turnOpen === false && finalWritten === true,
  }
}

/**
 * 盘侧谓词选卡面（审计 P3 件⑨）：HITL 卡只由 lead 发起——挂起候选必须 preset === 'lead'。
 * 队友会话（preset 为非 lead 的角色，清单正本 = 盘上 presets/）与非 lead 会话的 pending
 * 不可选，防误答陈旧卡；未知 preset（日志残缺/格式漂移）同样不可选（缺失偏"不答"方向，
 * 不偏"误答"）。
 */
export function leadHitlCandidate(state) {
  return state?.preset === 'lead' && state?.hitlPending === true
}
