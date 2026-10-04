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
 * 逐题驱动策略：一次 DOM 观察 → 一个动作。判据正本 = BUG-004 卡：
 * Submit 可用是唯一提交动作；radio 在场就继续点（已选中的复点即 auto-advance 翻页——
 * 2026-10-04 第三场实测定模型）；无卡可读交回盘侧裁决。**不存在"UI 形状判完成"的分支**。
 * @param obs radioCount 卡内 radio 数；checkedCount 已选中数；submitFound 卡容器内
 *   找到 Submit；submitDisabled 该按钮当前禁用。
 * @returns action = 'click-submit' | 'click-option' | 'abort'，reason 人话依据。
 */
export function nextDriveAction(obs) {
  const { radioCount, checkedCount, submitFound, submitDisabled } = obs ?? {}
  if (submitFound === true && submitDisabled === false) {
    return { action: 'click-submit', reason: 'Submit 可用（全部必答题已选中）' }
  }
  if ((radioCount ?? 0) > 0) {
    const picked = (checkedCount ?? 0) > 0 ? '复点已选中项推进（复点即翻页）' : '点推荐项'
    return { action: 'click-option', reason: `本题待答——${picked}` }
  }
  return { action: 'abort', reason: '无选项可读（卡被终局化或已答）——交盘侧裁决' }
}

/**
 * 盘侧裁决（BUG-004：盘侧复核从"警告"升格为 verdict）——代答是否成功的唯一判据是
 * 盘侧挂起是否清除，UI 侧一切自报（卡头消/提交完成）不构成证据。
 * @param s hitlPendingAfter 驱动后重读盘侧谓词；answeredCount 实际答完的题数；
 *   dryRun 只看不点（不构成提交，信息性通过）。
 * @returns exitCode 遵循冒烟 verdict 契约：0 = 绿，1 = 红（调用方以此退出）。
 */
export function driveVerdict(s) {
  const { hitlPendingAfter, answeredCount, dryRun } = s ?? {}
  if (dryRun === true) return { pass: true, exitCode: 0, reason: 'dry-run——未提交，盘侧不判' }
  if (!((answeredCount ?? 0) > 0)) {
    return { pass: false, exitCode: 1, reason: '一题未答——没有可提交的东西（如实红）' }
  }
  if (hitlPendingAfter === true) {
    return { pass: false, exitCode: 1, reason: '盘侧复核：会话仍挂起——answer 未落地，UI 自报无效（重跑本脚本或人工入 GUI 答）' }
  }
  return { pass: true, exitCode: 0, reason: '盘侧复核通过——挂起已清' }
}
