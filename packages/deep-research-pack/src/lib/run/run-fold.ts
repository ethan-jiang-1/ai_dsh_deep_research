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
import { assertNever } from './artifact-read.ts'

/** 步骤条闭集键名（编译期阻止未知键名进入 unknown 集合）。 */
export type StepKey = 'question' | 'team' | 'leads' | 'evidence' | 'findings' | 'review' | 'final'

/** 单步证据信号：在场 / 缺席 / 无法确认——'unknown' 与 'present' 编译期互斥。 */
export type StepSignal = 'unknown' | 'absent' | 'present'

/** 证据卡信号：'unknown'（目录/卡片读失败）或非负整数卡数（>0 视为在场）。 */
export type EvidenceSignal = 'unknown' | number

/** 一个 run 的强类型步骤输入（非法双态组合在类型层面不可构造）。 */
export interface RunStepInputs {
  readonly question: StepSignal
  readonly team: StepSignal
  readonly leads: StepSignal
  readonly evidence: EvidenceSignal
  readonly findings: StepSignal
  readonly review: StepSignal
  readonly final: StepSignal
}

/** 步骤条的一步。unknown = 读取失败/无法确认（不是 pending，也不是 done）。 */
export interface RunStep {
  readonly key: StepKey
  readonly label: string
  readonly state: 'done' | 'current' | 'pending' | 'unknown'
}

// 版本号词法正本已收进 final-target（BUG-356：地址目标与版本账共用一套 vN 解析）；
// 旧 import 点（useStatusFeed/ResearchFinalTab/tests）仍可从本文件取到同名符号。
export { latestRunVersion } from './final-target.ts'

const STEP_ORDER: readonly StepKey[] = ['question', 'team', 'leads', 'evidence', 'findings', 'review', 'final'] as const
const STEP_LABEL_KEYS = {
  question: 'stepQuestion',
  team: 'stepTeam',
  leads: 'stepLeads',
  evidence: 'stepEvidence',
  findings: 'stepFindings',
  review: 'stepReview',
  final: 'stepFinal',
} as const

function resolveStepSignal(k: StepKey, inputs: RunStepInputs): StepSignal {
  if (k === 'evidence') {
    if (inputs.evidence === 'unknown') return 'unknown'
    return typeof inputs.evidence === 'number' && Number.isFinite(inputs.evidence) && inputs.evidence > 0 ? 'present' : 'absent'
  }
  return inputs[k]
}

/**
 * 步骤条推导：每步三态互斥信号 → 七步四态（最后在场的已知步 = current，之前已知未到或已过 = done/pending，unknown 绝不回填）。
 * @param inputs - 各步闭合三态信号。
 * @param t - UI 翻译器（缺省 = 中文；组件必须传 `props.t`）。
 * @returns 步骤条。
 */
export function deriveSteps(inputs: RunStepInputs, t: PackTranslate = translateZh): readonly RunStep[] {
  const signals = STEP_ORDER.map((k) => ({ key: k, signal: resolveStepSignal(k, inputs) }))
  let lastDone = -1
  for (const [i, item] of signals.entries()) {
    switch (item.signal) {
      case 'present':
        lastDone = i
        break
      case 'absent':
      case 'unknown':
        break
      default:
        return assertNever(item.signal)
    }
  }
  return signals.map(({ key, signal }, i) => {
    switch (signal) {
      case 'unknown':
        return { key, label: t(STEP_LABEL_KEYS[key]), state: 'unknown' }
      case 'present':
      case 'absent':
        return {
          key,
          label: t(STEP_LABEL_KEYS[key]),
          state: i < lastDone ? 'done' : i === lastDone ? 'current' : 'pending',
        }
      default:
        return assertNever(signal)
    }
  })
}
