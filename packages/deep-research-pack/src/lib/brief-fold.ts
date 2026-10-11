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

/** 业务摘要折算输入（全部为既有事实源的投影；调用方从 journal 流 + workspaceFiles 组装）。 */
export interface BriefInputs {
  /** 本会话已绑定 run bundle（binding.slug 在场且未处于抑制窗）。 */
  readonly bundleBound?: boolean
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
  /** final/ 版本记账数（≥2 = 发生过证据扩张 rerun）。 */
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

const NEEDLESS = '你现在无需操作——只有需要你补充业务事实、确认方向或审阅交付时才会在这里标出'

/**
 * 业务摘要折算：九态输入 → 五问输出（末位优先级 = 挂起 > 预检窗 > 未绑定 > 审查 FAIL >
 * 已交付 > 推进中；fail-soft 永不 throw）。
 * @param inputs 事实源投影（全字段可选）。
 * @returns 业务摘要。
 */
export function deriveBusinessBrief(inputs: BriefInputs): BusinessBrief {
  const bundleBound = inputs.bundleBound === true
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

  const goalKnown = hasQuestion && questionLine !== null
  const goal = goalKnown ? questionLine : '尚未确认——问题定稿写盘后在这里显示'

  // 挂起分支（hitl1 / 交付审阅 / 契约外中途确认）：kind unknown + 无 question 文件 =
  // 立项窗口（deriveAnchors a1Pending 同款判定），如实并档。
  if (hitlPending) {
    if (pendingKind === 'hitl2') {
      return {
        goal, goalKnown,
        stageLine: '交付审阅——报告已成稿，等你拍板',
        knownLine: '报告当前版已就绪；你的选择会写入 question.md §Decisions',
        unknownLine: reviewFail === true ? '审查未决项已按上限升级到本次审阅——由你裁决' : null,
        actionLine: '需要你操作：定稿 / 补研究（记 final/ 下一版本）/ 修订表述（原位改、版本不变）',
        userActionNeeded: true,
      }
    }
    if (pendingKind === 'unknown' && hasQuestion) {
      return {
        goal, goalKnown,
        stageLine: '中途确认——研究过程中出现了问题卡',
        knownLine: '研究按既定方向推进中；此次确认不改既定方向',
        unknownLine: null,
        actionLine: '需要你操作：在会话里的问题卡上回答（推荐项已置首）',
        userActionNeeded: true,
      }
    }
    return {
      goal, goalKnown,
      stageLine: `立项确认——等你回答问题卡${pendingQuestions > 0 ? `（${pendingQuestions} 问）` : ''}`,
      knownLine: '问题定稿、计划确认后团队才会开工；推荐项已置首',
      unknownLine: null,
      actionLine: '需要你操作：在会话里的问题卡上点选项（一次问全，不挤牙膏）',
      userActionNeeded: true,
    }
  }

  // 立项预检窗（读绑定 + kickoff 已见 + 无挂起）：如实显示"还没开始"。
  if (kickoffHold) {
    return {
      goal: '尚未确认——本场研究的立项对齐中',
      goalKnown: false,
      stageLine: '这场研究还没开始——立项对齐中，当前读到的是上一场 run 的上下文',
      knownLine: '落笔开跑后这里显示本场状态',
      unknownLine: null,
      actionLine: NEEDLESS,
      userActionNeeded: false,
    }
  }

  // 未绑定：不显示别家数据（bundle-bind 纪律）。
  if (!bundleBound) {
    return {
      goal: '尚未确认',
      goalKnown: false,
      stageLine: '本会话尚未绑定研究 run',
      knownLine: '研究状态只跟本会话自己的 run；绑定后这里显示本场进度',
      unknownLine: null,
      actionLine: NEEDLESS,
      userActionNeeded: false,
    }
  }

  // 审查 FAIL：质量修复静默推进（两点交互之间的自主区），用户无需介入。
  if (reviewFail === true) {
    return {
      goal, goalKnown,
      stageLine: '对抗审查发现问题——团队修复后复审（质量修复静默推进，不需要你操作）',
      knownLine: '审查未决项修复中；复审轮次记账见 review.md',
      unknownLine: '审查未决项存在——修复完成并通过复审前报告不交付',
      actionLine: NEEDLESS,
      userActionNeeded: false,
    }
  }

  // 已交付（final.md 在场；lastDecision 为 §Decisions 末位拍板的语义投影——当前数据面
  // 未读时 null，如实落通用文案）。
  if (delivered) {
    const stageLine = lastDecisionKind === 'more'
      ? '补研究已按你的拍板启动——重入挖掘，新增证据记 final/ 下一版本'
      : lastDecisionKind === 'rewrite'
        ? '表述修订已按你的拍板执行——原位修改，不产生新版本'
        : lastDecisionKind === 'approve'
          ? '报告已按你的拍板定稿交付'
          : versions >= 2
            ? '报告已交付（含补研究版本记账）'
            : '报告已交付'
    return {
      goal, goalKnown,
      stageLine,
      knownLine: '当前版已交付；历史拍板见 question.md §Decisions',
      unknownLine: openItems.length > 0 ? `待确认：${openItems.join('；')}` : null,
      actionLine: '你现在无需操作；需要继续研究时在会话里提出（补研究/修订表述走交付审阅语义）',
      userActionNeeded: false,
    }
  }

  // 研究推进中（默认态）：阶段 + 诚实的能力边界。
  return {
    goal, goalKnown,
    stageLine: currentStage !== null ? `研究推进中——${currentStage}` : '研究推进中——按既定问题自主研究',
    knownLine: findingsPresent ? '综合材料已在场——结论以交付报告为准，当前不冒充完成' : '来源核对推进中，尚未形成结论',
    unknownLine: openItems.length > 0 ? `待确认：${openItems.join('；')}` : null,
    actionLine: NEEDLESS,
    userActionNeeded: false,
  }
}
