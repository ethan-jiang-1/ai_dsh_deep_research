/**
 * run-fold.ts —— 观察面共享折算（run-dashboard 的纯折算移植为共享 TS，单一正本）。
 *
 * 数据/展示分层（RFC observability-completion）：折算住本文件（keyless 单测直接断言，
 * 含首场 run 真实 bundle 期望值）；run-dashboard.mjs（HTML 投影）与「研究状态」页签
 * （client 面）都消费这一份——防两处漂移。
 *
 * 移植面：步骤条推导（deriveStep）与矩阵折算（topicEvidenceMatrix）——页签需要的两个；
 * parse*（文件 → 模型）留在 run-dashboard（它直接读盘，client 走 workspaceFiles 数据面
 * 自行取文件内容后喂这里的折算）。
 */

/** 一个 run 的文件在场性（步骤条输入——由调用方从文件内容/在场性构造）。
 *  步序正本 = m2-run-mechanics「运行流程总览」：立项（question+topics 一体）→ 组队 →
 *  侦察 → 挖掘 → 综合 → 审查 → 交付；组队无独立文件，在场性随立项（cursor 停靠语义，
 *  见 deriveSteps）。 */
export interface RunStepInputs {
  readonly question: boolean
  readonly team: boolean
  readonly leads: boolean
  readonly evidence: number
  readonly findings: boolean
  readonly review: boolean
  readonly final: boolean
}

/** 步骤条的一步。 */
export interface RunStep {
  readonly key: string
  readonly label: string
  readonly state: 'done' | 'current' | 'pending'
}

const STEP_ORDER = ['question', 'team', 'leads', 'evidence', 'findings', 'review', 'final'] as const
const STEP_LABELS = { question: '立项', team: '组队', leads: '侦察', evidence: '挖掘', findings: '综合', review: '审查', final: '交付' }

/**
 * 步骤条推导：在场性 → 七步三态（最后在场的步 = current，之前 done，之后 pending）。
 * 组队的输入随立项（question 在场即 team 在场）——组队无独立文件，cursor 在"立项完成 →
 * 侦察交付"的窗口内停靠在组队（该窗口即组队+侦察进行段，正本图同序）。
 * @param inputs - 文件在场性（evidence 为计数 >0 判定）。
 * @returns 步骤条。
 */
export function deriveSteps(inputs: RunStepInputs): readonly RunStep[] {
  const has: Record<string, boolean> = {
    question: inputs.question,
    team: inputs.team,
    leads: inputs.leads,
    evidence: inputs.evidence > 0,
    findings: inputs.findings,
    review: inputs.review,
    final: inputs.final,
  }
  let lastDone = -1
  for (const [i, k] of STEP_ORDER.entries()) if (has[k]) lastDone = i
  return STEP_ORDER.map((k, i) => ({
    key: k,
    label: STEP_LABELS[k],
    state: i < lastDone ? 'done' : i === lastDone ? 'current' : 'pending',
  }))
}

/** 矩阵的一格输入（topic × evidence 计数）。 */
export interface MatrixCell {
  readonly topicKey: string
  readonly mustAnswer: string
  readonly evidenceCount: number
}

/**
 * topic × evidence 矩阵折算：每个 topic 的有效证据计数。
 * @param topics - [{ key, mustAnswer }]（来自 topics.md 折算）。
 * @param evidence - [{ supports }]（有效证据——硬五字段全齐的）。
 * @returns 矩阵行。
 */
export function topicEvidenceMatrixCells(
  topics: readonly { key: string; mustAnswer: string }[],
  evidence: readonly { supports: string }[],
): readonly MatrixCell[] {
  return topics.map((t) => ({
    topicKey: t.key,
    mustAnswer: t.mustAnswer,
    evidenceCount: evidence.filter((e) => e.supports === t.key).length,
  }))
}
