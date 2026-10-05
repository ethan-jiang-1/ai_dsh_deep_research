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
 * @returns Array<{id: string, prompt: string, options: string[]}>
 */
export function parseAskQuestions(argumentsText) {
  let args = {}
  try { args = JSON.parse(argumentsText ?? '{}') } catch { return [] }
  const questions = Array.isArray(args.questions) ? args.questions : []
  return questions
    .filter((q) => q && typeof q === 'object')
    .map((q) => ({
      id: String(q.id ?? q.question ?? ''),
      prompt: String(q.question ?? ''),
      options: (Array.isArray(q.options) ? q.options : [])
        .filter((o) => o && typeof o === 'object' && typeof o.label === 'string')
        .map((o) => o.label),
    }))
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
  if (labels.length === 0) return { label: null, resolved: null }
  if (pick === 'recommended') {
    const hit = labels.find((l) => /Recommended/i.test(l))
    return hit !== undefined ? { label: hit, resolved: 'exact' } : { label: labels[0], resolved: 'fallback' }
  }
  if (pick === 'first') return { label: labels[0], resolved: 'exact' }
  const n = Number(pick)
  if (pick !== '' && Number.isFinite(n) && n >= 1 && n <= labels.length) {
    return { label: labels[n - 1], resolved: 'exact' }
  }
  return { label: null, resolved: null }
}

/**
 * 逐题驱动策略：一次 DOM 观察 → 一个动作。判据正本 = BUG-004 卡 + BUG-015 决策层补钉：
 * Submit 可用是唯一提交动作，**但可用 ≠ 意图达成**——UI 预选推荐项时 Submit 立即可用，
 * 若预选与 pick 意图不符，必须先改选目标项（license run 劫持实录：命令 pick=2 被预选项
 * 静默顶替）。radio 在场就继续点；无卡可读交回盘侧裁决。不存在"UI 形状判完成"的分支。
 * @param obs radioCount / checkedCount / submitFound / submitDisabled；selectionMatchesIntent
 *   （可选）当前预选项是否符合 pick 意图——缺席 = 视为相符（旧调用方兼容）。
 * @returns action = 'click-submit' | 'click-option' | 'abort'，reason 人话依据。
 */
export function nextDriveAction(obs) {
  const { radioCount, checkedCount, submitFound, submitDisabled, selectionMatchesIntent } = obs ?? {}
  const intentOk = selectionMatchesIntent !== false
  if (submitFound === true && submitDisabled === false && intentOk) {
    return { action: 'click-submit', reason: 'Submit 可用（全部必答题已选中）' }
  }
  if (submitFound === true && submitDisabled === false && !intentOk) {
    return { action: 'click-option', reason: '本题待答——预选项与 pick 意图不符，先改选目标项再提交（Submit 可用 ≠ 意图达成，BUG-015）' }
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
