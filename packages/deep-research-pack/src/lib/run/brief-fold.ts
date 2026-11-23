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
import { assertNever } from './artifact-read.ts'

// 读取三态/工件五态的正本已收进 artifact-read（BUG-361…368：文本工件还需要 empty/invalid）；
// 旧 import 点（useStatusFeed/测试）仍可从本文件取到同名符号。
export type { ArtifactState, SourceRead, StatusReads } from './artifact-read.ts'
export { readStateOf } from './artifact-read.ts'

/** 问题正文状态（三态互斥：有正文 / 缺席 / 内容故障；绝不与 hasQuestion 并存）。 */
export type BriefQuestionState =
  | { readonly kind: 'ok'; readonly line: string }
  | { readonly kind: 'absent' }
  | { readonly kind: 'issue'; readonly reason: 'empty' | 'unreadable' | 'body-empty' }

/** 审查终局互斥态（与 ReviewVerdict 对齐；消灭 reviewFail × reviewUnconfirmed × reviewConflict 冲突）。 */
export type BriefReviewState =
  | { readonly kind: 'absent' }
  | { readonly kind: 'pass' }
  | { readonly kind: 'fail' }
  | { readonly kind: 'unconfirmed' }
  | { readonly kind: 'conflict' }

/** HITL 挂起态（仅在 pending 时携带目标锚点与问数；idle 时不携带 pendingKind）。 */
export type BriefHitlState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending'; readonly target: 'hitl1' | 'hitl2' | 'unknown'; readonly questions: number }

/** 业务摘要折算输入（四态判别联合：未绑定 / 立项预检 / 绑定读失败 / 已绑定完整态）。 */
export type BriefInputs =
  | { readonly kind: 'unbound'; readonly hitl: BriefHitlState; readonly question: BriefQuestionState }
  | { readonly kind: 'kickoff-hold'; readonly hitl: BriefHitlState; readonly question: BriefQuestionState }
  | { readonly kind: 'bundle-error'; readonly failure: 'missing' | 'unreadable'; readonly hitl: BriefHitlState; readonly question: BriefQuestionState }
  | {
      readonly kind: 'bound'
      readonly hitl: BriefHitlState
      readonly question: BriefQuestionState
      readonly review: BriefReviewState
      readonly currentStage: string | null
      readonly findingsPresent: boolean
      readonly delivered: boolean
      readonly versions: number
      readonly lastDecisionKind: 'approve' | 'more' | 'rewrite' | null
      readonly openItems: readonly string[]
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

function goalFromQuestion(question: BriefQuestionState, t: PackTranslate): { readonly goal: string; readonly goalKnown: boolean } {
  switch (question.kind) {
    case 'issue': {
      const key = question.reason === 'unreadable'
        ? 'briefGoalQuestionUnreadable'
        : question.reason === 'empty'
          ? 'briefGoalQuestionEmpty'
          : 'briefGoalQuestionBodyEmpty'
      return { goal: t(key), goalKnown: false }
    }
    case 'ok': {
      const trimmed = question.line.trim()
      if (trimmed !== '') return { goal: question.line, goalKnown: true }
      return { goal: t('briefGoalUnknownPending'), goalKnown: false }
    }
    case 'absent':
      return { goal: t('briefGoalUnknownPending'), goalKnown: false }
    default:
      return assertNever(question)
  }
}

/**
 * 业务摘要折算：四态判别联合 → 五问输出（末位优先级 = 挂起 > 预检窗 > 未绑定 > 读失败 > 审查 > 已交付 > 推进中）。
 * @param inputs - 互斥事实源判别联合。
 * @param t - UI 翻译器（缺省 = 中文；组件必须传 `props.t`）。
 * @returns 业务摘要。
 */
export function deriveBusinessBrief(inputs: BriefInputs, t: PackTranslate = translateZh): BusinessBrief {
  const { goal, goalKnown } = goalFromQuestion(inputs.question, t)
  const needless = t('briefActionNone')
  const reviewIsFail = inputs.kind === 'bound' && inputs.review.kind === 'fail'

  switch (inputs.hitl.kind) {
    case 'pending': {
      const { target, questions } = inputs.hitl
      const pendingQuestions = Number.isInteger(questions) && questions > 0 ? questions : 0
      if (target === 'hitl2') {
        return {
          goal, goalKnown,
          stageLine: t('briefStageHitl2'),
          knownLine: t('briefKnownHitl2'),
          unknownLine: reviewIsFail ? t('briefUnknownHitl2') : null,
          actionLine: t('briefActionHitl2'),
          userActionNeeded: true,
        }
      }
      if (target === 'unknown' && inputs.question.kind === 'ok' && goalKnown) {
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
        stageLine: pendingQuestions > 0 ? t('briefStageHitl1Count', { count: pendingQuestions }) : t('briefStageHitl1'),
        knownLine: t('briefKnownHitl1'),
        unknownLine: null,
        actionLine: t('briefActionHitl1'),
        userActionNeeded: true,
      }
    }
    case 'idle':
      break
    default:
      return assertNever(inputs.hitl)
  }

  switch (inputs.kind) {
    case 'kickoff-hold':
      return {
        goal: t('briefGoalUnknownKickoff'),
        goalKnown: false,
        stageLine: t('briefStageKickoff'),
        knownLine: t('briefKnownKickoff'),
        unknownLine: null,
        actionLine: needless,
        userActionNeeded: false,
      }
    case 'unbound':
      return {
        goal: t('briefGoalUnknown'),
        goalKnown: false,
        stageLine: t('briefStageUnbound'),
        knownLine: t('briefKnownUnbound'),
        unknownLine: null,
        actionLine: needless,
        userActionNeeded: false,
      }
    case 'bundle-error':
      return {
        goal: t('briefGoalUnknown'),
        goalKnown: false,
        stageLine: t('briefStageReadFailed'),
        knownLine: t('briefKnownReadFailed'),
        unknownLine: t('briefUnknownReadFailed'),
        actionLine: t('briefActionReadFailed'),
        userActionNeeded: false,
      }
    case 'bound': {
      const openItems = inputs.openItems.filter((x) => x.trim() !== '')
      const pendingItems = openItems.length > 0 ? t('briefPendingItems', { items: openItems.join(t('briefItemsSeparator')) }) : null
      const currentStage = inputs.currentStage !== null && inputs.currentStage.trim() !== '' ? inputs.currentStage : null
      const versions = Number.isInteger(inputs.versions) ? inputs.versions : 0

      switch (inputs.review.kind) {
        case 'fail':
          return inputs.delivered
            ? {
                goal, goalKnown,
                stageLine: t('briefStageDeliveredReviewFail'),
                knownLine: t('briefKnownDeliveredReviewFail'),
                unknownLine: t('briefUnknownDeliveredReviewFail'),
                actionLine: t('briefActionDeliveredReviewFail'),
                userActionNeeded: false,
              }
            : {
                goal, goalKnown,
                stageLine: t('briefStageReviewFail'),
                knownLine: t('briefKnownReviewFail'),
                unknownLine: t('briefUnknownReviewFail'),
                actionLine: needless,
                userActionNeeded: false,
              }
        case 'conflict':
          return inputs.delivered
            ? {
                goal, goalKnown,
                stageLine: t('briefStageDeliveredReviewConflict'),
                knownLine: t('briefKnownDeliveredReviewConflict'),
                unknownLine: t('briefUnknownDeliveredReviewConflict'),
                actionLine: t('briefActionDeliveredReviewConflict'),
                userActionNeeded: false,
              }
            : {
                goal, goalKnown,
                stageLine: t('briefStageReviewConflict'),
                knownLine: t('briefKnownReviewConflict'),
                unknownLine: t('briefUnknownReviewConflict'),
                actionLine: t('briefActionReviewConflict'),
                userActionNeeded: false,
              }
        case 'unconfirmed':
          return inputs.delivered
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
        case 'pass':
        case 'absent':
          break
        default:
          return assertNever(inputs.review)
      }

      if (inputs.delivered) {
        const stageLine = inputs.lastDecisionKind === 'more'
          ? t('briefStageDeliveredMore')
          : inputs.lastDecisionKind === 'rewrite'
            ? t('briefStageDeliveredRewrite')
            : inputs.lastDecisionKind === 'approve'
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

      return {
        goal, goalKnown,
        stageLine: currentStage !== null ? t('briefStageProgress', { stage: currentStage }) : t('briefStageProgressAuto'),
        knownLine: inputs.findingsPresent ? t('briefKnownFindings') : t('briefKnownNoFindings'),
        unknownLine: pendingItems,
        actionLine: needless,
        userActionNeeded: false,
      }
    }
    default:
      return assertNever(inputs)
  }
}
