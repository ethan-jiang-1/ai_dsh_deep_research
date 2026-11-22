/**
 * brief-fold.ts —— 驾驶舱业务摘要折算（纯函数，keyless 单测面）。
 *
 * 问题（issue 2026-10-11-executive-research-ux-delivery）：现有页签回答"系统做了什么"，
 * 不回答高管等候时的五问——研究什么 / 已确认什么 / 未知什么 / 下一步 / 我是否要操作。
 * 本模块把**既有事实源**（bundle 文件在场性、question.md 首行、HITL 锚点、review 终局
 * readiness、final/ 版本记账）折算成业务语言的状态面；不改两点交互合同，不新增挂起点。
 *
 * 诚实纪律：
 * - 输入面**不含**证据计数/工具调用数——计数在类型层面进不了完成态文案（禁词单测钉）；
 * - 派生不出的状态（运行中补充的消费、§Decisions 末位拍板）走显式输入位，当前数据面
 *   为空时如实缺省，不虚构；
 * - fail-soft：畸形/缺席输入永不 throw，输出如实缺省（deriveAnchors 同款纪律）。
 */
import { translateZh, type PackTranslate } from '../shared/i18n.ts'

// 读取三态/工件五态的正本已收进 artifact-read（BUG-361…368：文本工件还需要 empty/invalid）；
// 旧 import 点（useStatusFeed/测试）仍可从本文件取到同名符号。
export type { ArtifactState, SourceRead, StatusReads } from './artifact-read.ts'
export { readStateOf } from './artifact-read.ts'


/** 业务摘要折算输入（全部为既有事实源的投影；调用方从 journal 流 + workspaceFiles 组装）。 */
interface BriefInputs {
  /** 本会话已绑定 run bundle（binding.slug 在场且未处于抑制窗）。 */
  readonly bundleBound?: boolean
  /** 绑定的 bundle 读取失败（missing / unreadable）；null = 已读或未绑定。 */
  readonly bundleReadFailure?: 'missing' | 'unreadable' | null
  /** question.md 为空/读失败（BUG-361/367）：目标行不得再显示「尚未确认」。 */
  readonly questionIssue?: 'empty' | 'unreadable' | null
  /** 结构化审查结论未定（readiness 声明缺失/坏、review 为空/读失败）；BUG-363/366。 */
  readonly reviewUnconfirmed?: boolean
  /** 立项预检窗口（读绑定 + kickoff 已见 + 无挂起——读到的是上一场上下文）。 */
  readonly kickoffHold?: boolean
  /** 末位 ask 仍开放（hitl-fold.foldHitlPending）。 */
  readonly hitlPending?: boolean
  /** 挂起种类（锚点 key 折算：anchor-1=hitl1 / anchor-2=hitl2 / 其余=契约外 unknown）。 */
  readonly pendingKind?: 'hitl1' | 'hitl2' | 'unknown' | null
  /** 该次挂起携带的问数（锚点 questions）。 */
  readonly pendingQuestions?: number
  /** question.md 在场（文件事实）。 */
  readonly hasQuestion?: boolean
  /** question.md 首行（研究问题定稿——当前目标的事实源）。 */
  readonly questionLine?: string | null
  /** 当前步骤的业务名（deriveSteps current 段标签；null = 步序未观测）。 */
  readonly currentStage?: string | null
  /** findings.md 在场（综合材料事实——不等于有结论）。 */
  readonly findingsPresent?: boolean
  /** review.md 终局 readiness（三态：true=FAIL / false=PASS / null=未观测；多轮取末位）。 */
  readonly reviewFail?: boolean | null
  /** final.md 当前版在场（已交付文件事实）。 */
  readonly delivered?: boolean
  /** final/ 中最高版本号（≥2 = 有证据扩张 rerun 记账）。 */
  readonly versions?: number
  /** §Decisions 末位拍板（approve/more/rewrite——当前数据面未读，null 如实缺省）。 */
  readonly lastDecisionKind?: 'approve' | 'more' | 'rewrite' | null
  /** 未确认业务口径/缺输入（当前数据面为空——诚实占位，不猜补）。 */
  readonly openItems?: readonly string[]
}

/** 业务摘要（首屏五问的折算输出；组件薄渲染）。 */
export interface BusinessBrief {
  /** 当前目标（研究问题定稿；未知如实「尚未确认」）。 */
  readonly goal: string
  readonly goalKnown: boolean
  /** 当前阶段 + 为什么（业务语言，非系统事件名）。 */
  readonly stageLine: string
  /** 已经确认什么（有事实支撑的短摘要；无结论时如实「尚未形成结论」）。 */
  readonly knownLine: string
  /** 最大未知/阻塞（null = 暂无可观测未知——如实省略，不编造）。 */
  readonly unknownLine: string | null
  /** 你现在要不要做什么（含合法纠偏路径的语义）。 */
  readonly actionLine: string
  readonly userActionNeeded: boolean
}

/**
 * 业务摘要折算：九态输入 → 五问输出（末位优先级 = 挂起 > 预检窗 > 未绑定 > 审查 FAIL >
 * 已交付 > 推进中；fail-soft 永不 throw）。
 * @param inputs 事实源投影（全字段可选）。
 * @param t UI 翻译器（缺省 = 中文；组件必须传 `props.t`）。
 * @returns 业务摘要。
 */
export function deriveBusinessBrief(inputs: BriefInputs, t: PackTranslate = translateZh): BusinessBrief {
  const bundleBound = inputs.bundleBound === true
  const bundleReadFailure = inputs.bundleReadFailure === 'missing' || inputs.bundleReadFailure === 'unreadable' ? inputs.bundleReadFailure : null
  const questionIssue = inputs.questionIssue === 'empty' || inputs.questionIssue === 'unreadable' ? inputs.questionIssue : null
  const reviewUnconfirmed = inputs.reviewUnconfirmed === true
  const kickoffHold = inputs.kickoffHold === true
  const hitlPending = inputs.hitlPending === true
  const pendingKind = inputs.pendingKind ?? null
  const pendingQuestions = typeof inputs.pendingQuestions === 'number' && Number.isInteger(inputs.pendingQuestions) && inputs.pendingQuestions > 0 ? inputs.pendingQuestions : 0
  const hasQuestion = inputs.hasQuestion === true
  const questionLine = typeof inputs.questionLine === 'string' && inputs.questionLine.trim() !== '' ? inputs.questionLine : null
  const currentStage = typeof inputs.currentStage === 'string' && inputs.currentStage.trim() !== '' ? inputs.currentStage : null
  const findingsPresent = inputs.findingsPresent === true
  const reviewFail = inputs.reviewFail === true ? true : inputs.reviewFail === false ? false : null
  const delivered = inputs.delivered === true
  const versions = typeof inputs.versions === 'number' && Number.isInteger(inputs.versions) ? inputs.versions : 0
  const lastDecisionKind = inputs.lastDecisionKind ?? null
  const openItems = Array.isArray(inputs.openItems) ? inputs.openItems.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []

  const goalKnown = questionIssue === null && hasQuestion && questionLine !== null
  const goal = questionIssue === 'unreadable'
    ? t('briefGoalQuestionUnreadable')
    : questionIssue === 'empty'
      ? t('briefGoalQuestionEmpty')
      : goalKnown ? questionLine : t('briefGoalUnknownPending')
  const needless = t('briefActionNone')
  const pendingItems = openItems.length > 0
    ? t('briefPendingItems', { items: openItems.join(t('briefItemsSeparator')) })
    : null

  // 挂起分支（hitl1 / 交付审阅 / 契约外中途确认）：kind unknown + 无 question 文件 =
  // 立项窗口（deriveAnchors a1Pending 同款判定），如实并档。
  if (hitlPending) {
    if (pendingKind === 'hitl2') {
      return {
        goal, goalKnown,
        stageLine: t('briefStageHitl2'),
        knownLine: t('briefKnownHitl2'),
        unknownLine: reviewFail === true ? t('briefUnknownHitl2') : null,
        actionLine: t('briefActionHitl2'),
        userActionNeeded: true,
      }
    }
    if (pendingKind === 'unknown' && hasQuestion) {
      return {
        goal, goalKnown,
        stageLine: t('briefStageMidway'),
        knownLine: t('briefKnownMidway'),
        unknownLine: null,
        actionLine: t('briefActionMidway'),
        userActionNeeded: true,
      }
    }
    return {
      goal, goalKnown,
      stageLine: pendingQuestions > 0
        ? t('briefStageHitl1Count', { count: pendingQuestions })
        : t('briefStageHitl1'),
      knownLine: t('briefKnownHitl1'),
      unknownLine: null,
      actionLine: t('briefActionHitl1'),
      userActionNeeded: true,
    }
  }

  // 立项预检窗（读绑定 + kickoff 已见 + 无挂起）：如实显示"还没开始"。
  if (kickoffHold) {
    return {
      goal: t('briefGoalUnknownKickoff'),
      goalKnown: false,
      stageLine: t('briefStageKickoff'),
      knownLine: t('briefKnownKickoff'),
      unknownLine: null,
      actionLine: needless,
      userActionNeeded: false,
    }
  }

  // 未绑定：不显示别家数据（bundle-bind 纪律）。
  if (!bundleBound) {
    return {
      goal: t('briefGoalUnknown'),
      goalKnown: false,
      stageLine: t('briefStageUnbound'),
      knownLine: t('briefKnownUnbound'),
      unknownLine: null,
      actionLine: needless,
      userActionNeeded: false,
    }
  }

  // 绑定可读性失败（BUG-358）：读不到 bundle 不是「研究推进中」；显式失败 + 重试。
  if (bundleReadFailure !== null) {
    return {
      goal: t('briefGoalUnknown'),
      goalKnown: false,
      stageLine: t('briefStageReadFailed'),
      knownLine: t('briefKnownReadFailed'),
      unknownLine: t('briefUnknownReadFailed'),
      actionLine: t('briefActionReadFailed'),
      userActionNeeded: false,
    }
  }

  // 已交付 + 审查 FAIL（BUG-357）：交付是历史事实、复审失败是新增事实；两者合法共存。
  // 这句话必须说「已交付版本仍可用 + 新审查发现问题」，不能复用交付前的「报告不交付」政策。
  if (reviewFail === true && delivered) {
    return {
      goal, goalKnown,
      stageLine: t('briefStageDeliveredReviewFail'),
      knownLine: t('briefKnownDeliveredReviewFail'),
      unknownLine: t('briefUnknownDeliveredReviewFail'),
      actionLine: t('briefActionDeliveredReviewFail'),
      userActionNeeded: false,
    }
  }

  // 审查结论未定（BUG-363/366）：结构化声明缺失/坏、review 空/读失败；不得当审查通过。
  if (reviewUnconfirmed && reviewFail !== true) {
    return delivered
      ? {
          goal, goalKnown,
          stageLine: t('briefStageDeliveredReviewUnconfirmed'),
          knownLine: t('briefKnownDeliveredReviewUnconfirmed'),
          unknownLine: t('briefUnknownDeliveredReviewUnconfirmed'),
          actionLine: t('briefActionDeliveredReviewUnconfirmed'),
          userActionNeeded: false,
        }
      : {
          goal, goalKnown,
          stageLine: t('briefStageReviewUnconfirmed'),
          knownLine: t('briefKnownReviewUnconfirmed'),
          unknownLine: t('briefUnknownReviewUnconfirmed'),
          actionLine: t('briefActionReviewUnconfirmed'),
          userActionNeeded: false,
        }
  }

  // 审查 FAIL（未交付）：质量修复静默推进（两点交互之间的自主区），用户无需介入。
  if (reviewFail === true) {
    return {
      goal, goalKnown,
      stageLine: t('briefStageReviewFail'),
      knownLine: t('briefKnownReviewFail'),
      unknownLine: t('briefUnknownReviewFail'),
      actionLine: needless,
      userActionNeeded: false,
    }
  }

  // 已交付（final.md 在场；lastDecision 为 §Decisions 末位拍板的语义投影——当前数据面
  // 未读时 null，如实落通用文案）。
  if (delivered) {
    const stageLine = lastDecisionKind === 'more'
      ? t('briefStageDeliveredMore')
      : lastDecisionKind === 'rewrite'
        ? t('briefStageDeliveredRewrite')
        : lastDecisionKind === 'approve'
          ? t('briefStageDeliveredApprove')
          : versions >= 2
            ? t('briefStageDeliveredVersions')
            : t('briefStageDelivered')
    return {
      goal, goalKnown,
      stageLine,
      knownLine: t('briefKnownDelivered'),
      unknownLine: pendingItems,
      actionLine: t('briefActionDelivered'),
      userActionNeeded: false,
    }
  }

  // 研究推进中（默认态）：阶段 + 诚实的能力边界。
  return {
    goal, goalKnown,
    stageLine: currentStage !== null ? t('briefStageProgress', { stage: currentStage }) : t('briefStageProgressAuto'),
    knownLine: findingsPresent ? t('briefKnownFindings') : t('briefKnownNoFindings'),
    unknownLine: pendingItems,
    actionLine: needless,
    userActionNeeded: false,
  }
}
