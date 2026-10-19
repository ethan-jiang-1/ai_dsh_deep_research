// scripts/lib/ask-drive.mjs — ask 卡代答驱动策略与裁决（纯函数：观察进、动作出）。
//
// 为什么存在（BUG-004/BUG-005 的机制落点）：真浏览器适配层无法进 keyless 回归——把
// 驱动决策与成功裁决抽成纯函数，行为契约由 tests/ask-drive.test.mjs 钉死；适配层
// （dev/hitl-answer.mjs）只做 IO 搬运。两条铁律：
//   ① UI 形状（卡头消失/题干更换）永不单独判"已提交"——盘侧 answer 落地才是唯一成功判据；
//   ② Submit 可用 = 唯一提交动作；无卡可读 = 交回盘侧裁决，不自行宣布完成。

/**
 * 解析 ask_user_question 调用参数 → 驱动前就知道的盘侧形态。
 * @param argumentsText tool/call 事件的 data.arguments 原始串（坏串不抛，按未知形态处理）。
 * @returns questionCount 题数；indefinite 是否无限期等待（wait:-1——timed 兜底与
 *   文本消息兜底对该形态均不可用，正本 = BUG-005 卡）。
 */
export function parseAskArgs(argumentsText) {
  let args = {}
  try { args = JSON.parse(argumentsText ?? '{}') } catch { args = {} }
  const questions = Array.isArray(args.questions) ? args.questions : []
  return { questionCount: questions.length, indefinite: args.wait === -1 }
}

/**
 * 解析 ask 的逐题选项面（BUG-015 意图解析的输入）：id / prompt / option 标签清单。
 * 坏串或形态不符 → 空数组（不猜——意图对账对不可解析输入一律响亮红）。
 * @param argumentsText tool/call 事件的 data.arguments 原始串。
 * @returns Array<{id: string, header: string, prompt: string, options: string[]}>
 *   header = 问句短标签（persona 硬格式要求每问带 header；provenance 题面富集源，BUG-017）。
 */
export function parseAskQuestions(argumentsText) {
  let args = {}
  try { args = JSON.parse(argumentsText ?? '{}') } catch { return [] }
  const questions = Array.isArray(args.questions) ? args.questions : []
  return questions
    .filter((q) => q && typeof q === 'object')
    .map((q) => ({
      id: String(q.id ?? q.question ?? ''),
      header: String(q.header ?? ''),
      prompt: String(q.question ?? ''),
      options: (Array.isArray(q.options) ? q.options : [])
        .filter((o) => o && typeof o === 'object' && typeof o.label === 'string')
        .map((o) => o.label),
    }))
}

function targetOptionIndex(labels, pick) {
  if (labels.length === 0) return null
  if (pick === 'recommended') {
    const index = labels.findIndex((label) => /Recommended/i.test(label))
    return index >= 0 ? index : 0
  }
  if (pick === 'first') return 0
  const n = Number(pick)
  return pick !== '' && Number.isInteger(n) && n >= 1 && n <= labels.length ? n - 1 : null
}

/**
 * pick 目标解析（BUG-015：pick 从装饰性参数变驱动决策输入）。
 * recommended → 带 Recommended 标签的首个（缺席 → 回退首项，resolved='fallback'——回退是
 * 确定性的，对账仍可判）；first → 首项；数字 N → 第 N 项；越界/空标签 → label=null（不可
 * 解析，不猜——对账据此红）。
 * @param optionLabels string[]；pick string（'recommended' | 'first' | '<1-based index>'）。
 * @returns {label: string|null, resolved: 'exact'|'fallback'|null}
 */
export function pickTargetLabel(optionLabels, pick) {
  const labels = Array.isArray(optionLabels) ? optionLabels.filter((l) => typeof l === 'string') : []
  const index = targetOptionIndex(labels, pick)
  if (index === null) return { label: null, resolved: null }
  const fallback = pick === 'recommended' && !labels.some((label) => /Recommended/i.test(label))
  return { label: labels[index], resolved: fallback ? 'fallback' : 'exact' }
}

/** Choose a radio to click: correct a mismatching preselection; otherwise retain UI re-click progression. */
export function optionIndexToClick({ optionLabels, checkedIndex, pick }) {
  const labels = Array.isArray(optionLabels) ? optionLabels.filter((label) => typeof label === 'string') : []
  if (labels.length === 0) return null
  const current = Number.isInteger(checkedIndex) && checkedIndex >= 0 && checkedIndex < labels.length ? checkedIndex : null
  const target = targetOptionIndex(labels, pick)
  if (target !== null && target !== current) return target
  if (current !== null) return current
  return target
}

/** Build the pinned Client card key for one Session and ask_user_question call. */
export function questionCardKeyOf(sessionId, callId) {
  if (typeof sessionId !== 'string' || sessionId.trim() === ''
    || typeof callId !== 'string' || callId.trim() === '') return null
  return `question:${sessionId}:${callId}`
}

/**
 * Check that the main conversation and selected sidebar row name one Session.
 *
 * 浏览器边界孪生：真判据在 dev/hitl-answer.mjs 的 page.evaluate 内（每次动作同轮复核，防竞态）；
 * page 边界无法共享闭包，故本函数 + 下方 hitlUiIdentityOf 是同一组规则的 keyless 可测正本
 * （tests/ask-drive.test.mjs 钉 mutation：会话不符/歧义/缺席、卡陈旧/歧义/缺身份）。两处规则
 * 改动必须同步——这是有意的重复，不是可删的死 API。
 */
export function hitlUiSessionOf({ targetSessionId, activeSessionIds = [], selectedSessionIds = [] } = {}) {
  if (typeof targetSessionId !== 'string' || targetSessionId.trim() === '') {
    return { ready: false, reason: 'target-session-unavailable' }
  }
  const active = Array.isArray(activeSessionIds) ? activeSessionIds : []
  if (active.length === 0) return { ready: false, reason: 'active-session-unavailable' }
  if (active.length !== 1) return { ready: false, reason: 'active-session-ambiguous' }
  if (typeof active[0] !== 'string' || active[0] === '') return { ready: false, reason: 'active-session-unavailable' }
  if (active[0] !== targetSessionId) return { ready: false, reason: 'active-session-mismatch' }
  const selected = Array.isArray(selectedSessionIds) ? selectedSessionIds : []
  if (selected.length === 0) return { ready: false, reason: 'session-row-not-selected' }
  if (selected.length !== 1) return { ready: false, reason: 'session-row-ambiguous' }
  if (typeof selected[0] !== 'string' || selected[0] === '') return { ready: false, reason: 'session-row-not-selected' }
  if (selected[0] !== targetSessionId) return { ready: false, reason: 'session-row-ambiguous' }
  return { ready: true, reason: null }
}

/**
 * Check that one visible ask card is the selected Session's exact tool call.
 * @param facts - Session identity, ask call ID, and visible ask-card keys.
 * @returns ready only for one selected Session with its one expected ask card.
 */
export function hitlUiIdentityOf(facts) {
  const { targetSessionId, callId, activeSessionIds = [], selectedSessionIds = [], cardKeys = [] } = facts ?? {}
  const session = hitlUiSessionOf({ targetSessionId, activeSessionIds, selectedSessionIds })
  if (!session.ready) return session
  const expectedCardKey = questionCardKeyOf(targetSessionId, callId)
  if (expectedCardKey === null) return { ready: false, reason: 'ask-call-id-unavailable' }
  const cards = Array.isArray(cardKeys) ? cardKeys : []
  if (cards.length === 0) return { ready: false, reason: 'ask-card-unavailable' }
  if (cards.length !== 1) return { ready: false, reason: 'ask-card-ambiguous' }
  if (typeof cards[0] !== 'string' || cards[0] === '') return { ready: false, reason: 'ask-card-identity-unavailable' }
  if (cards[0] !== expectedCardKey) return { ready: false, reason: 'ask-card-mismatch' }
  return { ready: true, reason: null, cardKey: expectedCardKey }
}
/**
 * Select one pending session: the newest pending candidate by default, or one unique title-substring match.
 * Both the directory ID (UI row) and canonical log-header ID must exist and agree.
 */
export function selectPendingSession(candidates, requestedTitle = null) {
  const sessions = Array.isArray(candidates) ? candidates.filter((candidate) => candidate && typeof candidate === 'object') : []
  const query = typeof requestedTitle === 'string' ? requestedTitle.trim() : ''
  const pending = sessions.filter((candidate) => candidate.pending === true)
  const identityError = (candidate) => {
    if (typeof candidate.sessionId !== 'string' || candidate.sessionId.trim() === ''
      || typeof candidate.canonicalSessionId !== 'string' || candidate.canonicalSessionId.trim() === '') {
      return 'session-id-unavailable'
    }
    return candidate.sessionId === candidate.canonicalSessionId ? null : 'session-id-mismatch'
  }
  if (query === '') {
    if (pending.length === 0) return { candidate: null, reason: 'no-pending-session' }
    const candidate = pending[0]
    const reason = identityError(candidate)
    return reason === null ? { candidate, reason: null } : { candidate: null, reason }
  }
  const matches = sessions.filter((candidate) => typeof candidate.title === 'string' && candidate.title.includes(query))
  if (matches.length === 0) return { candidate: null, reason: 'session-not-found' }
  if (matches.length !== 1) return { candidate: null, reason: 'session-title-ambiguous' }
  const candidate = matches[0]
  const identityReason = identityError(candidate)
  if (identityReason !== null) return { candidate: null, reason: identityReason }
  if (candidate.pending !== true) return { candidate: null, reason: 'session-not-pending' }
  return { candidate, reason: null }
}

/**
 * 逐题驱动策略：一次 DOM 观察 → 一个动作。判据正本 = BUG-004 卡 + BUG-015 决策层补钉：
 * Submit 可用是唯一提交动作，**但可用 ≠ 意图达成**——UI 预选推荐项时 Submit 立即可用，
 * 若预选与 pick 意图不符，必须先改选目标项（license run 劫持实录：命令 pick=2 被预选项
 * 静默顶替）。radio 在场就继续点；无卡可读交回盘侧裁决。不存在"UI 形状判完成"的分支。
 * @param obs radioCount / checkedCount / submitFound / submitDisabled；selectionMatchesIntent
 *   （可选）当前预选项是否符合 pick 意图——缺席 = 视为相符（旧调用方兼容）；
 *   **纯文本题面**（2026-10-16 新增，触发 = nvidia HITL2 实卡）：textFieldAvailable
 *   （本卡唯一可填文本域在场）/ textValue（其现值）/ textAnswer（命令给的作答文本）。
 * @returns action = 'click-submit' | 'click-advance' | 'click-option' | 'fill-text' | 'abort'，reason 人话依据。
 *   （`click-advance` = 点推进钮翻页，**不代表提交成功**；终局判据仍只看盘侧 answer 批。）
 */
export function nextDriveAction(obs) {
  const { radioCount, checkedCount, submitFound, submitDisabled, advanceFound, advanceDisabled, selectionMatchesIntent, textFieldAvailable, textValue, textAnswer } = obs ?? {}
  const intentOk = selectionMatchesIntent !== false
  // 纯文本题面（无选项 + 有文本域）：**先填后交**，且按"现值 ≠ 作答文本"幂等——填完复观察即走
  // 提交分支，不会回环。没给作答文本时不猜：落到末尾 abort（与旧行为一致，fail-loud）。
  if ((radioCount ?? 0) === 0 && textFieldAvailable === true
    && typeof textAnswer === 'string' && textAnswer !== '' && textValue !== textAnswer) {
    return { action: 'fill-text', reason: '本题为纯文本题——先填入作答文本再推进' }
  }
  if (submitFound === true && submitDisabled === false && intentOk) {
    return { action: 'click-submit', reason: 'Submit 可用（全部必答题已选中）' }
  }
  if (submitFound === true && submitDisabled === false && !intentOk) {
    return { action: 'click-option', reason: '本题待答——预选项与 pick 意图不符，先改选目标项再提交（Submit 可用 ≠ 意图达成，BUG-015）' }
  }
  // 推进钮（Next/继续/Skip/跳过）≠ 终局提交（2026-10-16 实卡：HITL2 第二题是可选题，
  // Skip 可用而 Submit 禁用——旧判据把两者混作一个集合，既误报 submitDisabled，又让点击面
  // 因"两个匹配"静默空转）。允许时机：本题无选项（纯文本/可选题），或选项题**已选**（选择已登记）。
  // ⚠ **只在零选项题面**（纯文本题 / 可选题）生效：选项题上"已预选"≠"已登记"——UI 的推荐项是**预选**，
  // 只有点它才进 answer 批；此时按推进钮会交**空批**（2026-10-16 实测：盘侧以"空批等于把沉默当拍板"拒绝）。
  // 所以选项题一律走 click-option（点已选项 = 登记 + 前进，旧行为正确）。
  if (advanceFound === true && advanceDisabled === false && (radioCount ?? 0) === 0) {
    return { action: 'click-advance', reason: '本题无可提交态——点推进钮（Skip/Next）继续' }
  }
  if ((radioCount ?? 0) > 0) {
    const picked = (checkedCount ?? 0) > 0 ? '复点已选中项推进（复点即翻页）' : '点推荐项'
    return { action: 'click-option', reason: `本题待答——${picked}` }
  }
  return { action: 'abort', reason: '无选项可读（卡被终局化或已答）——交盘侧裁决' }
}

/**
 * 意图对账（BUG-015 裁决后半）：盘侧 answer 批已落地 ≠ 命令的答案已落地——落地的选择
 * 逐题对 pick 目标解析结果，不符即红（答案内容仍如实记录，但意图未达成必须响亮）。
 * @param batch answerBatchOf 的批（逐题 selected）；questions parseAskQuestions 的选项面；
 *   pick 驱动收到的 pick 参数。
 * @returns {ok: boolean, mismatches: Array<{id, expected, landed}>}——expected 为
 *   '(pick 目标不可解析)' 时表示解析失败（不猜，直接红）。
 */
export function intentReconcile({ batch, questions, pick }) {
  const mismatches = []
  const qById = new Map((Array.isArray(questions) ? questions : []).map((q) => [q.id, q]))
  for (const item of (Array.isArray(batch) ? batch : [])) {
    const q = qById.get(String(item?.id ?? ''))
    if (q === undefined || q.options.length === 0) continue // 批缺席/无选项面的题不进对账（跳过由 driveVerdict 显性报告）
    const target = pickTargetLabel(q.options, pick)
    const landed = String((item?.selected ?? [])[0] ?? '')
    const expected = target.label ?? '(pick 目标不可解析)'
    if (landed !== expected) mismatches.push({ id: String(item?.id ?? ''), expected, landed })
  }
  return { ok: mismatches.length === 0, mismatches }
}

/**
 * 从盘侧事件抠一次 ask 的 answer 批（tool/result 的 text 载荷）。
 * @param events 已解析会话事件。@param callId ask 的 tool/call id。
 * @returns answers 数组；result 未落地 → 空数组（调用方以 settled=false 表达）。
 */
export function answerBatchOf(events, callId) {
  const res = [...events].reverse().find((j) => j?.type === 'tool/result'
    && (j?.data?.message?.source?.callId === callId || j?.data?.callId === callId))
  if (res === undefined) return []
  const text = (res?.data?.message?.content ?? []).find((c) => c.type === 'text')?.text
  try {
    const answers = JSON.parse(text ?? '{}')?.answers
    return Array.isArray(answers) ? answers : []
  } catch { return [] }
}

/**
 * 盘侧裁决（BUG-004：盘侧复核从"警告"升格为 verdict）。成功判据 = 盘侧 answer 批的
 * **内容**，不是点击计数——UI 会预选/自动推进选中态，活体验证实测点击数 0 而批全
 * Recommended（假红形态）；反过来，全空批 = 把沉默当拍板，必须红。
 * @param s dryRun 只看不点（信息性通过）；settled 盘侧 ask 已落地（result 在场且挂起
 *   清除）；batch answerBatchOf 的批（逐题 selected）；clickCount 点击数（仅入理由行）。
 * @returns exitCode 遵循冒烟 verdict 契约：0 = 绿，1 = 红（调用方以此退出）。
 */
export function driveVerdict(s) {
  const { dryRun, settled, batch, clickCount } = s ?? {}
  if (dryRun === true) return { pass: true, exitCode: 0, reason: 'dry-run——未提交，盘侧不判' }
  const items = Array.isArray(batch) ? batch : []
  const skipped = items.filter((a) => (a?.selected ?? []).length === 0).length
  const nonEmpty = items.length - skipped
  const clicks = `（点击 ${clickCount ?? 0} 次）`
  if (settled !== true) {
    return { pass: false, exitCode: 1, reason: `盘侧复核：ask 未落地（仍挂起或 result 缺席）——UI 自报无效${clicks}；重跑本脚本或人工入 GUI 答` }
  }
  if (items.length === 0) {
    return { pass: false, exitCode: 1, reason: `盘侧复核：ask 已落地但读不到 answer 批——无法证明实质作答${clicks}` }
  }
  if (nonEmpty === 0) {
    return { pass: false, exitCode: 1, reason: `盘侧复核：answer 批全空——空批提交等于把沉默当拍板，不放行${clicks}` }
  }
  return { pass: true, exitCode: 0, reason: `盘侧复核通过——answer 批 ${nonEmpty}/${items.length} 题实质作答${skipped > 0 ? `（跳过 ${skipped} 题，显性记账）` : ''}${clicks}` }
}

/**
 * 侧栏找不到目标行时的**错因判据**（BUG-031，2026-10-16 实卡暴露）：把"目标不在侧栏"与
 * **通道实例老化**（UI 渲染不出会话行）分开——旧文案在老化现场是误导的（它让操作者去查归档/终局化，
 * 而两条都不成立；实测恢复路径 = 重启通道 + 新会话）。
 * @param obs renderedSessionRows（UI 里 `session:` 行条数）/ collapsedGroups（仍折叠的
 *   workspace·overflow 组数——>0 说明还没展开完，不能断言老化）/ capHit（是否有行扫命中上限）/
 *   diskPending（盘侧是否确有该会话的挂起问询——去答的前提；facts: 盘侧为准）/
 *   triedSearch·searchHit（**兜底尝试史**：是否已走搜索、搜索是否命中——BUG-037 加）。
 * @returns {kind: 'cap'|'aging'|'not-in-scope'|'absent', message}——kind 决定处置，message 人话依据。
 */
export function sidebarMissVerdict(obs) {
  const { renderedSessionRows, collapsedGroups, capHit, diskPending, triedSearch, searchHit } = obs ?? {}
  if (capHit === true) {
    return { kind: 'cap', message: '行数超扫描上限——目标可能在**未扫描区间**（别按"已归档/被终局化"处置）' }
  }
  // 兜底已试过搜索仍没命中（BUG-037）：此时"零会话行"不是实例老化的证据——搜索是权威路径，
  // 它也没命中就说明目标不在可达范围/标题不匹配。**重启实测无效**，不再作为处置。
  if (triedSearch === true && searchHit !== true) {
    return {
      kind: 'not-in-scope',
      message: '扫行与逐组展开都没命中，**搜索兜底也已试过且未命中**——目标可能不属于侧栏可见范围'
        + '（例如 --cwd 形态的会话不进侧栏），或盘侧标题与 UI 显示的标题不一致。'
        + '处置 = 核对 `--session` 子串与盘侧 `title` 是否一致；必要时用 run-kickoff 续跑该会话。'
        + '（本情形与通道实例无关，别再按"实例故障"处理。）',
    }
  }
  if ((renderedSessionRows ?? 0) === 0 && (collapsedGroups ?? 0) === 0 && diskPending === true) {
    return {
      kind: 'aging',
      message: 'UI 侧栏**零会话行**且组已全展开，而盘侧确有该会话的挂起问询——疑渲染/懒加载未解析。'
        + '处置 = 先让工具走搜索兜底（本仓已内置）；仍不命中则按 `not-in-scope` 核对标题，'
        + '**不要**以"重启通道"为第一处置（实测无效）。',
    }
  }
  return {
    kind: 'absent',
    message: '可能：① 该会话已归档或不在侧栏可见范围；② 挂起回合被 web 重启终局化'
      + '（需向会话发恢复 prompt 让 lead 原样重发问询）。',
  }
}

/**
 * `--custom` 的文本**是否真进了答复批**（BUG-032：UI 的自定义是"替换选择"语义——同一问题上
 * 选择与自定义只能留一个；驱动自报成功 ≠ lead 收得到那段说明）。
 * 进批形态（实测）= `{id, selected: [], custom: "<文本>"}`；静默丢失形态 = `{id, selected: ["<label>"]}`。
 * @param obs batch（answerBatchOf 的批）/ custom（命令给的文本）
 * @returns boolean——custom 为空/全空白时不判"在场"（false），缺省不制造假绿。
 */
export function customLandedInBatch(obs) {
  const { batch, custom } = obs ?? {}
  const needle = typeof custom === 'string' ? custom.trim() : ''
  if (needle === '') return false
  return (Array.isArray(batch) ? batch : []).some((a) => typeof a?.custom === 'string' && a.custom.includes(needle))
}

/**
 * 交付审阅卡识别（HITL2）：选项集含 定稿/补研究/修订表述 三族即认定（手册 HITL2 选项正本 =
 * research-workspace/AGENTS.md §交互纪律——不抄死文案，按族匹配）。
 * @param questions parseAskQuestions 的产物。
 * @returns 是否交付审阅卡。
 */
export function isDeliveryReviewCard(questions, askText = '') {
  const labels = (Array.isArray(questions) ? questions : []).flatMap((q) => (Array.isArray(q?.options) ? q.options.map((o) => String(o?.label ?? o ?? '')) : []))
  if (labels.some((l) => /定稿/.test(l)) && labels.some((l) => /补研究|修订/.test(l))) return true
  // 文本级兜底（BUG-041 缺陷⑧，2026-10-19 实测）：真交付卡的选项集不一定同时含"补研究/修订"族
  // （当日那张只有「按现稿定稿」+「继续打磨」形态）→ 仅按选项标签会把交付卡误判成计划卡，记账行卡名写错。
  // 故接受调用方传入的 ask 参数原文，命中「交付审阅/定稿」即认（与驱动器/探针判据同钉）。
  return /交付审阅|定稿/.test(String(askText))
}

/**
 * 交付代答闸（2026-10-18 端到端实测的**运行纪律**）：交付审阅卡在场而 review readiness 非 PASS 时，
 * **默认推荐档**会把「定稿」投给一份未过审的报告 = 交付越过前置（NODES 第 6 行「PASS = HITL2 前置」）。
 * 故默认档自拒；操作者**显式**指定（--pick/--custom）视为有意为之，放行并留痕。
 * @param obs isDeliveryCard（isDeliveryReviewCard）/ readiness（'PASS'|'FAIL'|null）/ pick（默认档名）。
 * @returns {allow, reason}——allow=false 时 reason 给人话出路。
 */
export function deliveryAnswerGuard(obs) {
  const { isDeliveryCard = false, readiness = null, pick = 'recommended' } = obs ?? {}
  if (!isDeliveryCard) return { allow: true, reason: '' }
  if (readiness === 'PASS') return { allow: true, reason: '' }
  if (pick !== 'recommended') return { allow: true, reason: '操作者显式指定作答（非默认推荐档）——按显式意图执行并留痕' }
  return {
    allow: false,
    reason: `交付审阅卡在场而 review readiness 非 PASS（${readiness ?? '无判定行'}）——默认推荐档会把「定稿」`
      + '投给一份未过审的报告（交付越过前置，NODES 第 6 行）。出路：① 人工在 GUI 里裁决；'
      + '② 显式 --pick <非定稿项序号>（如补研究）或 --custom "<意见>"；③ 先补审查轮使 readiness 判 PASS。',
  }
}
