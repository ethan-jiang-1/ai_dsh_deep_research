/**
 * run-version.ts —— rerun 版本面的纯折算（keyless 单测；页签只画）。
 *
 * 为什么要有它：rerun 在文件契约里存在（D17），但观察面只显示当前 plan，看不出
 * 「v1 已交付 / v2 还在跑 / final.md 是工作稿」。本文件把版本面折成**只用盘上事实**的一行：
 *
 *   plan 头 `图版本：vN` + 重写记录里的 `图版本 vM` + `plan/vN.md` 快照 + `final/vN.md` 版本账
 *   + present 见证（交付）+ HITL2 挂起（由调用方折好的 hitl-fold）+ question.md 的 `> rerun:` 行
 *
 * 三条诚实规则：
 *   ① 版本只从机器可读声明取（`图版本：vN` / `图版本 vN`），不从 H1 散文或快照反推；头与记录
 *      不一致时两个都报，不静默挑一个。
 *   ② `present` 事件**不携带版本号**（vendor `deliverables/presented` 只有 turn/callId/files），
 *      所以「已交付版本」只能按 `final/` 版本账推定；版本账 >1 时文案必须带「推定」。
 *   ③ `final.md` 是工作稿，`final/vN` 才是版本账；没有 present 就不说「已交付」。
 *
 * 边界：不改 D17 的三种 rerun 语义；polish 没有盘上版本痕迹，只能由 `> rerun:` 声明表达；
 * 结构性 rerun 另起 bundle，本文件只认声明，不画血缘。
 */
import { latestRunVersion } from './run-fold.ts'

/** rerun 三种语义（D17）。 */
export type RerunKind = 'evidence-expansion' | 'polish' | 'structural'

/** `question.md` 里的 rerun 声明（同 bundle rerun 才有）。 */
export interface RerunDeclaration {
  readonly version: number
  readonly kind: RerunKind
  /** ISO 日期（声明行里的 YYYY-MM-DD；缺省 = 未写）。 */
  readonly date?: string
}

/** 版本面的输入事实（全部由调用方读盘/读 journal 后传入；本文件不做 I/O）。 */
export interface RunVersionFacts {
  /** 当前 `plan.md` 全文。 */
  readonly planText?: string | null
  /** `plan/` 目录里的文件名（`v1.md` …）。 */
  readonly planSnapshotNames?: readonly string[] | null
  /** `final/` 目录里的文件名（`v1.md` …）。 */
  readonly finalFileNames?: readonly string[] | null
  /** `question.md` 全文（读 rerun 声明）。 */
  readonly questionText?: string | null
  /** journal 里有指向终稿的 present（调用方折好传入）。 */
  readonly delivered?: boolean
  /** HITL2 挂起（hitl-fold 的 pending + 锚点判型结果）。 */
  readonly hitlPending?: boolean
  /** run 根 `final.md` 在场（工作稿）。 */
  readonly draftPresent?: boolean
}

/** 版本面状态（页签按它决定说什么）。 */
export type RunVersionState = 'none' | 'drafting' | 'rerun-in-progress' | 'pending-hitl2' | 'delivered'

/** 版本面的一次折算结果。 */
export interface RunVersionFace {
  /** `plan.md` 头部声明的图版本（缺声明 → null）。 */
  readonly currentPlanVersion: number | null
  /** 重写记录里出现过的最高图版本（缺重写记录 → null）。 */
  readonly recordedPlanVersion: number | null
  /** 头与重写记录不一致。 */
  readonly versionConflicted: boolean
  /** `plan/vN.md` 快照版本（升序）。 */
  readonly planSnapshots: readonly number[]
  /** 编号 ≥ 当前图版本的快照（不是“旧图”，不能拿去 diff）。 */
  readonly snapshotAnomaly: readonly number[]
  /** `final/` 版本账最高版本（0 = 无）。 */
  readonly ledgerFinalVersion: number
  /** 已交付版本（按版本账推定；无 present → null）。 */
  readonly deliveredFinalVersion: number | null
  /** 已交付版本是推定的（版本账 >1，present 自身不带版本号）。 */
  readonly deliveredVersionInferred: boolean
  /** run 根 `final.md` 在场（工作稿）。 */
  readonly draftPresent: boolean
  /** question.md 的 rerun 声明；无 → null。 */
  readonly rerun: RerunDeclaration | null
  /** 一行状态。 */
  readonly state: RunVersionState
  /** 可显示的一句话（` · ` 分隔；空输入 → `未交付`）。 */
  readonly label: string
}

const KIND_LABEL: Readonly<Record<RerunKind, string>> = {
  'evidence-expansion': '证据扩张',
  polish: '表述修订',
  structural: '结构性',
}

const INT = (raw: string | undefined): number | null => {
  if (raw === undefined) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

/**
 * 从 plan 全文拆两个版本来源（头声明 / 重写记录最高）。
 * @param planText - `plan.md` 全文。
 * @returns 两个版本号与是否冲突（缺声明 → null）。
 */
export function planVersionsOf(planText: string | null | undefined): {
  readonly header: number | null
  readonly recorded: number | null
  readonly conflicted: boolean
} {
  if (typeof planText !== 'string' || planText === '') return { header: null, recorded: null, conflicted: false }
  const header = INT(/图版本\s*[：:]\s*v?(\d+)/.exec(planText)?.[1])
  let recorded: number | null = null
  for (const match of planText.matchAll(/^[ \t]*[-*][^\n]*?图版本\s*v?(\d+)/gm)) {
    const version = INT(match[1])
    if (version !== null && (recorded === null || version > recorded)) recorded = version
  }
  return { header, recorded, conflicted: header !== null && recorded !== null && header !== recorded }
}

/**
 * 从 `question.md` 读 rerun 声明（只认标题级引用行 `> rerun: vN · kind · …`）。
 * @param questionText - `question.md` 全文。
 * @returns 声明或 null（不解析散文）。
 */
export function rerunDeclarationOf(questionText: string | null | undefined): RerunDeclaration | null {
  if (typeof questionText !== 'string' || questionText === '') return null
  const match = /^[ \t]*>[ \t]*rerun[ \t]*[：:][ \t]*v?(\d+)[ \t]*·[ \t]*(evidence-expansion|polish|structural)\b([^\n]*)/mi.exec(questionText)
  if (match === null) return null
  const version = INT(match[1])
  const kind = match[2] as RerunKind | undefined
  if (version === null || kind === undefined) return null
  const date = /(\d{4}-\d{2}-\d{2})/.exec(match[3] ?? '')?.[1]
  return { version, kind, ...(date !== undefined ? { date } : {}) }
}

/** 目录文件名 → vN 版本号（升序去重）。 */
function versionsOf(names: readonly string[] | null | undefined): number[] {
  const out = new Set<number>()
  for (const name of Array.isArray(names) ? names : []) {
    const version = INT(/^v([1-9]\d*)\.md$/.exec(name)?.[1])
    if (version !== null) out.add(version)
  }
  return [...out].sort((a, b) => a - b)
}

/**
 * 版本面折算（fail-soft：缺什么就说什么，不抛）。
 * @param facts - 读盘/读 journal 后的事实。
 * @returns {@link RunVersionFace}。
 */
export function runVersionFaceOf(facts: RunVersionFacts): RunVersionFace {
  const { header, recorded, conflicted } = planVersionsOf(facts.planText)
  const planSnapshots = versionsOf(facts.planSnapshotNames)
  const effectivePlanVersion = recorded ?? header
  const snapshotAnomaly = effectivePlanVersion === null
    ? []
    : planSnapshots.filter((version) => version >= effectivePlanVersion)
  const ledgerFinalVersion = latestRunVersion(Array.isArray(facts.finalFileNames) ? facts.finalFileNames : [])
  const delivered = facts.delivered === true
  const deliveredFinalVersion = delivered && ledgerFinalVersion > 0 ? ledgerFinalVersion : null
  const deliveredVersionInferred = deliveredFinalVersion !== null && deliveredFinalVersion > 1
  const draftPresent = facts.draftPresent === true
  const rerun = rerunDeclarationOf(facts.questionText)
  const hitlPending = facts.hitlPending === true

  const state: RunVersionState = hitlPending
    ? 'pending-hitl2'
    : delivered && (rerun === null || deliveredFinalVersion === null || rerun.version <= deliveredFinalVersion)
      ? 'delivered'
      : rerun !== null
        ? 'rerun-in-progress'
        : draftPresent
          ? 'drafting'
          : 'none'

  const parts: string[] = []
  if (conflicted) parts.push(`版本声明不一致（头 v${String(header)} / 记录 v${String(recorded)}）`)
  else if (typeof facts.planText === 'string' && facts.planText !== '' && header === null && recorded === null) {
    parts.push('plan 版本未声明')
  }
  if (snapshotAnomaly.length > 0) parts.push(`plan/${snapshotAnomaly.map((v) => `v${String(v)}`).join('、')} 快照编号异常`)
  parts.push(
    deliveredFinalVersion !== null
      ? `v${String(deliveredFinalVersion)} 已交付${deliveredVersionInferred ? '（按版本账推定）' : ''}`
      : delivered
        ? '已交付（版本未记账）'
        : ledgerFinalVersion > 0
          // 版本账在、但 present 不在本会话的 journal 窗口里：只说“没见证”，不说“没交付”。
          ? `v${String(ledgerFinalVersion)} 版本账 · 交付未见证`
          : '未交付',
  )
  if (rerun !== null) parts.push(`v${String(rerun.version)} ${KIND_LABEL[rerun.kind]} rerun`)
  if (draftPresent && (deliveredFinalVersion !== null || rerun !== null)) parts.push('当前工作稿')
  if (hitlPending) parts.push('HITL2 待审')

  return {
    currentPlanVersion: header,
    recordedPlanVersion: recorded,
    versionConflicted: conflicted,
    planSnapshots,
    snapshotAnomaly,
    ledgerFinalVersion,
    deliveredFinalVersion,
    deliveredVersionInferred,
    draftPresent,
    rerun,
    state,
    label: parts.join(' · '),
  }
}
