/**
 * run-fold.ts —— 观察面共享折算（run-dashboard 的纯折算移植为共享 TS，单一正本）。
 *
 * 数据/展示分层：七步折算住本文件（keyless 单测直接断言）；run-dashboard.mjs（HTML 投影）
 * 与「研究状态」页签（client 面）都消费这一份，保持步骤语义一致。
 *
 * 移植面：步骤条推导（deriveSteps）——页签与 HTML 仪表盘共用；
 * parse*（文件 → 模型）留在 run-dashboard（它直接读盘，client 走 workspaceFiles 数据面
 * 自行取文件内容后喂这里的折算）。
 */
import { translateZh, type PackTranslate } from '../shared/i18n.ts'

/** 一个 run 的文件在场性（步骤条输入——由调用方从文件内容/在场性构造）。
 *  步序正本 = m2-run-mechanics「运行流程总览」：立项（question+topics 一体）→ 组队 →
 *  侦察 → 挖掘 → 综合 → 审查 → 交付；组队无独立文件，在场性随立项（cursor 停靠语义，
 *  见 deriveSteps）。 */
interface RunStepInputs {
  readonly question: boolean
  readonly team: boolean
  readonly leads: boolean
  readonly evidence: number
  readonly findings: boolean
  readonly review: boolean
  readonly final: boolean
  /** 明确读不到的步骤键（BUG-359/360）：标 unknown，不让线性推断抹成 done。 */
  readonly unknown?: readonly string[]
}

/** 步骤条的一步。unknown = 读取失败/无法确认（不是 pending，也不是 done）。 */
export interface RunStep {
  readonly key: string
  readonly label: string
  readonly state: 'done' | 'current' | 'pending' | 'unknown'
}

// 版本号词法正本已收进 final-target（BUG-356：地址目标与版本账共用一套 vN 解析）；
// 旧 import 点（useStatusFeed/ResearchFinalTab/tests）仍可从本文件取到同名符号。
export { latestRunVersion } from './final-target.ts'

const STEP_ORDER = ['question', 'team', 'leads', 'evidence', 'findings', 'review', 'final'] as const
const STEP_LABEL_KEYS = {
  question: 'stepQuestion',
  team: 'stepTeam',
  leads: 'stepLeads',
  evidence: 'stepEvidence',
  findings: 'stepFindings',
  review: 'stepReview',
  final: 'stepFinal',
} as const

/**
 * 步骤条推导：在场性 → 七步三态（最后在场的步 = current，之前 done，之后 pending）。
 * 组队的输入随立项（question 在场即 team 在场）——组队无独立文件，cursor 在"立项完成 →
 * 侦察交付"的窗口内停靠在组队（该窗口即组队+侦察进行段，正本图同序）。
 * @param inputs - 文件在场性（evidence 为计数 >0 判定）。
 * @param t - UI 翻译器（缺省 = 中文；组件必须传 `props.t`）。
 * @returns 步骤条。
 */
export function deriveSteps(inputs: RunStepInputs, t: PackTranslate = translateZh): readonly RunStep[] {
  const has: Record<string, boolean> = {
    question: inputs.question,
    team: inputs.team,
    leads: inputs.leads,
    evidence: inputs.evidence > 0,
    findings: inputs.findings,
    review: inputs.review,
    final: inputs.final,
  }
  const unknown = new Set(inputs.unknown ?? [])
  let lastDone = -1
  for (const [i, k] of STEP_ORDER.entries()) if (has[k] && !unknown.has(k)) lastDone = i
  return STEP_ORDER.map((k, i) => ({
    key: k,
    label: t(STEP_LABEL_KEYS[k]),
    // unknown 优先：读失败不参与「最后在场步」线性推断，也不被后续步的存在抹成 done。
    state: unknown.has(k) ? 'unknown' : i < lastDone ? 'done' : i === lastDone ? 'current' : 'pending',
  }))
}
