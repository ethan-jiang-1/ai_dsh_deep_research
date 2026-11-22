/**
 * final-target.ts —— 「终稿」观察面的纯折算（keyless 单测；组件只画）。
 *
 * 三件事，全部 fail-soft（畸形输入 → null，永不 throw）：
 *   ① 交付信号：journal 事件流 → 最后一条**指向终稿**的 `present` 交付（`deliverables/presented`）；
 *   ② 地址判定：`dsh-resource://file/session/<sid>/<path>` → 会话与路径，且路径整段是
 *      run bundle 的终稿（根 / archive/ / _abandoned/ 三位置）；
 *   ③ 读面定表：终稿路径 → 页签体允许读的三个路径（final.md / review.md / final/ 目录）。
 *
 * 为什么"终稿"要有自己的判定（issue 2026-10-19-final-tab-in-sidebar）：
 *   - `final.md` 在**综合步**就落盘（先于审查与 HITL2），所以"文件在场"不是交付判据——
 *     拿它点灯就是把未审草案当终稿；
 *   - 交付的机械判据是 `present`（node-gate 门②），它成功时追加 durable 事件
 *     `deliverables/presented{turn, callId, files[]}`——本文件把它折成"时刻"。
 * 地址语法正本 = vendor `vendor 的 workspace-path 地址语法`
 * （逐段 component-encode，`:` 留字面给盘符）；本文件只做最小解析，不引 Node 侧依赖
 * （client 半会被内联进浏览器 bundle）。
 */
import type { ArtifactState } from './artifact-read.ts'

/** 交付事件：一条 `present` 声明里指向终稿的那一条。 */
interface FinalDelivery {
  /** 规范化的工作区相对路径（`drt_x/final.md` / `archive/drt_x/final.md` / `_abandoned/drt_x/final.md`）。 */
  readonly path: string
  /** 声明所在回合（事件字段，记账/说明用）。 */
  readonly turn: number
  /** present 调用的 callId——自动打开的去重键（同一次交付不重复开）。 */
  readonly callId: string
}

/**
 * 焦点所在的元素里是否**真有一份草稿**（决定自动打开要不要让路）。
 * 只看"焦点在输入框"不够：DSH 打开会话即自动聚焦 composer，空输入框也被判成"正在写"，
 * 自动打开会被永久压住（2026-10-20 真 run 实测：focused=true 把交付弹面吃掉）。
 * @param active - 当前焦点元素的形态（DOM 元素或其结构子集）。
 * @returns 是否有未发送的草稿。
 */
export function draftInProgress(active: {
  readonly tagName?: unknown
  readonly value?: unknown
  readonly isContentEditable?: unknown
  readonly textContent?: unknown
} | null | undefined): boolean {
  if (active === null || active === undefined) return false
  const tag = typeof active.tagName === 'string' ? active.tagName.toUpperCase() : ''
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  if (tag === 'TEXTAREA' || tag === 'INPUT') return text(active.value) !== ''
  return active.isContentEditable === true && text(active.textContent) !== ''
}

/**
 * 终稿自动打开的唯一判据（纯函数，观测面 index.ts 的交付监听只调用它）。
 * 三条同时成立才开：有交付 · 该次交付（sessionId + callId）没开过 · 焦点不在可编辑元素。
 * 第三条 = 不打断正在写下一条消息的人（回合尾卡与⑤的门仍在，人不会被挡在外面）。
 * @param delivery - 本次事件里的终稿交付（非终稿 → null）。
 * @param opened - 已自动打开过的键集合（`${sessionId}:${callId}`）。
 * @param sessionId - 交付所属会话。
 * @param focusedInEditor - 当前焦点是否在输入框/文本域/contenteditable。
 * @returns 是否应打开终稿页签。
 */
export function shouldOpenFinal(
  delivery: FinalDelivery | null,
  opened: ReadonlySet<string>,
  sessionId: string,
  focusedInEditor: boolean,
): boolean {
  if (delivery === null || focusedInEditor) return false
  return !opened.has(`${sessionId}:${delivery.callId}`)
}

/** 页签体允许读的三个路径——读面是一张定表，不是任意路径参数。 */
interface FinalReadPlan {
  readonly dir: string
  readonly final: string
  readonly review: string
  readonly versions: string
  /** 地址在 bundle 内的相对路径（`final.md` / `final/v1.md` / `final/readable-v1.md`），目标身份的正本。 */
  readonly target: string
}

/** 地址目标 → 正文/读者版/版本（BUG-356：地址目标优先，版本账最高号不得覆盖它）。 */
export interface FinalTargetPlan {
  /** 地址点名的版本；null = 通用地址（`final.md` / `readable.md`），允许回退最新。 */
  readonly version: number | null
  /** 审计版正文路径（`final/v1.md`；通用地址由版本账最高号决定）。 */
  readonly audit: string
  /** 同版本读者版路径；没有 → null。通用地址可回退 `readable.md`。 */
  readonly reader: string | null
  /** true = 通用地址（允许最新/工作稿回退）；false = 地址点名的版本，缺失即失败。 */
  readonly fallback: boolean
}

/** 读面定表的文件名（finalReadPlan 与页签共用，避免两处硬编码）。 */
export const FINAL_NAME = 'final.md'
export const FINAL_REVIEW_NAME = 'review.md'
export const FINAL_LEDGER_DIR = 'final'
/** 读者版工作件（HITL2 前）与同版交付件（`readable-vN.md`；N 与 final/vN 同号）。 */
export const FINAL_READER_NAME = 'readable.md'
const FINAL_READABLE_VERSION_RE = /^readable-v([1-9]\d{0,5})\.md$/
export const FINAL_VERSION_RE = /^v([1-9]\d{0,5})\.md$/

/**
 * 终稿版本文件名 → 版本号；不是版本账（`v0.md` / `v01.md` / 超长号 / 别的名字）→ null。
 * 单一正本：client 终稿面、run-fold 的 `latestRunVersion`、scripts 的 run 门都从这里取，
 * 不允许再写第二份 `vN` 正则（2026-11-03 七维卫生审计 D2-3：canonical 曾零消费者、scripts 8 处自写）。
 */
export function finalVersionOf(name: string): number | null {
  const match = FINAL_VERSION_RE.exec(name)
  return match?.[1] === undefined ? null : Number(match[1])
}

/** 读者版文件名 `readable-vN.md` → N；非读者版 → null。 */
export function readableVersionOf(name: string): number | null {
  const match = FINAL_READABLE_VERSION_RE.exec(name)
  return match?.[1] === undefined ? null : Number(match[1])
}

/** 版本目录的最高 vN 编号；稀疏记账按真实最高编号显示，不用文件数冒充版本。
 *  正本住本文件（final-target 拥有版本词法）；run-fold 只 re-export，避免两处解析分叉。 */
export function latestRunVersion(files: readonly string[]): number {
  let latest = 0
  for (const file of files) {
    const version = finalVersionOf(file)
    if (version !== null) latest = Math.max(latest, version)
  }
  return latest
}

/**
 * run bundle 终稿**地址族**：`final.md` / `final/vN.md` / `final/readable.md` /
 * `final/readable-vN.md`（三位置）。同族地址落到同一「终稿」页签，避免交付卡片点 reader
 * 落普通预览；`drafts/final.md`、`evidence/final.md`、任意别处 final.md 仍全拒。
 */
const FINAL_FAMILY_RELATIVE = /^(?:archive\/|_abandoned\/)?drt_[\w.-]+\/(?:final\.md|final\/(?:v[1-9]\d{0,5}\.md|readable(?:-v[1-9]\d{0,5})?\.md))$/
/** 从任意书写形态里抠出终稿族后缀（绝对路径、`./` 前缀、反斜杠都收）。 */
const FINAL_FAMILY_SUFFIX = /((?:archive\/|_abandoned\/)?drt_[\w.-]+\/(?:final\.md|final\/(?:v[1-9]\d{0,5}\.md|readable(?:-v[1-9]\d{0,5})?\.md)))$/
const FILE_ADDRESS_PREFIX = 'dsh-resource://file/'
const SESSION_ADDRESS_PREFIX = `${FILE_ADDRESS_PREFIX}session/`
/** vendor 同款：逐段 component-encode，`:` 留字面（盘符可读）。 */
const encodeSegment = (segment: string): string => encodeURIComponent(segment).replace(/%3A/gi, ':')

/**
 * 终稿族路径 → run bundle 目录（带尾 `/`）；非族路径 → null。
 * `drt_x/final.md` → `drt_x/`；`drt_x/final/v1.md` / `drt_x/final/readable-v1.md` → `drt_x/`。
 * @param path - 规范相对路径。
 * @returns bundle 目录或 null。
 */
export function bundleDirOf(path: string): string | null {
  if (!FINAL_FAMILY_RELATIVE.test(path)) return null
  return path.endsWith(`/${FINAL_NAME}`)
    ? path.slice(0, path.length - FINAL_NAME.length)
    : path.slice(0, path.lastIndexOf(`/${FINAL_LEDGER_DIR}/`) + 1)
}

/**
 * 把 `present` 声明的原始路径折成终稿的规范相对路径；不是终稿 → null。
 * 绝对路径按后缀取（客户端拿不到会话 cwd，不猜相对基准——地址由调用方按会话拼）。
 * @param raw - 事件里的路径字段（任意类型，非法即 null）。
 * @returns 规范相对路径或 null。
 */
export function finalPathOf(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const normalized = raw.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '').replace(/\/+$/, '')
  if (normalized === '') return null
  const absolute = normalized.startsWith('/')
  if (!absolute) {
    // 相对路径必须以根/archive/_abandoned 的 drt_ 开头；notes/drafts 嵌套不冒充（BUG-122）。
    if (!/^(?:archive\/|_abandoned\/)?drt_[^/]+\//.test(normalized)) return null
    return FINAL_FAMILY_RELATIVE.test(normalized) ? normalized : null
  }
  // 绝对路径：拒绝明显非 bundle 容器下的嵌套；其余按终稿族后缀提取（调用方按会话 cwd 解读）。
  if (/(?:^|\/)(?:notes|drafts|src|tests)\/drt_/.test(normalized)) return null
  const match = FINAL_FAMILY_SUFFIX.exec(normalized)
  if (match?.[1] === undefined) return null
  return FINAL_FAMILY_RELATIVE.test(match[1]) ? match[1] : null
}

/** POSIX 绝对路径归一（client 不能 import node:path）：折叠 `.`/`..`，保留根。 */
function normalizeAbsolute(path: string): string {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') { parts.pop(); continue }
    parts.push(part)
  }
  return `/${parts.join('/')}`
}

/**
 * 带工作区根的终稿路径判定：绝对路径必须 resolve 后落在 cwd（含 archive/_abandoned）内，
 * 否则 null——跨 workspace 的同 slug 不得别名成当前 cwd 的 bundle（BUG-129）。
 * 相对路径沿用 `finalPathOf` 语义（由调用方按 cwd 解读）。
 */
export function finalPathOfWithin(raw: unknown, cwd: string | undefined): string | null {
  const relative = finalPathOf(raw)
  if (relative === null) return null
  if (typeof raw !== 'string' || !raw.replace(/\\/g, '/').startsWith('/')) return relative
  if (typeof cwd !== 'string' || cwd.trim() === '') return null
  const base = normalizeAbsolute(cwd.replace(/\\/g, '/'))
  const target = normalizeAbsolute(raw.replace(/\\/g, '/'))
  if (target !== base && !target.startsWith(`${base}/`)) return null
  return relative
}

/** 终稿族内的显示优先级：读者版 > 版本副本 > 工作稿（自动打开先开人读的那份）。 */
function familyRank(path: string): number {
  if (path.includes('/final/readable')) return 3
  if (finalVersionOf(path.slice(path.lastIndexOf('/') + 1)) !== null) return 2
  return 1
}

/** 事件流 → 最后一条指向终稿族的交付；同一声明多份时取读者版优先。无 / 畸形 → null。 */
export function latestFinalDelivery(events: readonly unknown[], cwd?: string): FinalDelivery | null {
  let latest: FinalDelivery | null = null
  for (const event of events) {
    if (typeof event !== 'object' || event === null) continue
    const record = event as { type?: unknown; data?: unknown }
    if (record.type !== 'deliverables/presented') continue
    const data = record.data as { turn?: unknown; callId?: unknown; files?: unknown } | null | undefined
    if (typeof data !== 'object' || data === null || !Array.isArray(data.files)) continue
    let best: { path: string; rank: number } | null = null
    for (const file of data.files) {
      const path = finalPathOfWithin((file as { path?: unknown } | null | undefined)?.path, cwd)
      if (path === null) continue
      const rank = familyRank(path)
      if (best === null || rank > best.rank) best = { path, rank }
    }
    if (best === null) continue
    latest = {
      path: best.path,
      turn: typeof data.turn === 'number' && Number.isSafeInteger(data.turn) ? data.turn : 0,
      callId: typeof data.callId === 'string' ? data.callId : '',
    }
  }
  return latest
}

/**
 * 最后一条 present 声明里点名的**版本化终稿**（`final/vN.md`）；没有 → null。
 *
 * 为什么单独折：`present` 事件不带版本号，只能从它点名的文件反推。交付时若点名
 * `final/v2.md`，版本面就能说准；只点名可变的 `final.md` 时版本未知（调用方据此
 * 说「版本未记载」，而不是按版本账猜一个）。
 * @param events - 会话事件流。
 * @returns 最高版本号或 null。
 */
export function latestPresentedFinalVersion(events: readonly unknown[], cwd?: string): number | null {
  let latest: number | null = null
  for (const event of events) {
    if (typeof event !== 'object' || event === null) continue
    const record = event as { type?: unknown; data?: unknown }
    if (record.type !== 'deliverables/presented') continue
    const data = record.data as { files?: unknown } | null | undefined
    if (typeof data !== 'object' || data === null || !Array.isArray(data.files)) continue
    const versions: number[] = []
    let finalFamily = false
    for (const file of data.files) {
      const path = finalPathOfWithin((file as { path?: unknown } | null | undefined)?.path, cwd)
      if (path === null) continue // 非终稿族（notes/final/v9.md 等）不算交付版本（BUG-101）
      finalFamily = true
      const version = /(?:^|\/)final\/(?:v|readable-v)([1-9]\d{0,5})\.md$/.exec(path)?.[1]
      if (version !== undefined) versions.push(Number(version))
    }
    // 最后一条**含终稿族**的 present 胜出；该条无版本 → null（与 latestFinalDelivery 同步，BUG-116）；
    // 同一事件多份取最高（BUG-103：不是全历史 max）。
    if (finalFamily) latest = versions.length > 0 ? Math.max(...versions) : null
  }
  return latest
}

/**
 * 交付回执（`delivered.json`）→ 交付见证（D51）：回执是 ops 写的**持久结构化事实**，
 * 会话日志窗口可能不含旧的 `deliverables/presented` 事件（驾驶舱只折窗口）。门禁仍以
 * present 事件 + 回执哈希为准；这里只给观察面一个不随窗口丢失的交付态。
 *
 * @param receipt - 解析后的 delivered.json；畸形 → null。
 * @param slug - bundle slug（回执缺 present.path 时用于合成 `drt_<slug>/final/vN.md`）。
 * @returns 规范化交付见证或 null。
 */
/** 终稿族路径 → 版本号（`final/vN.md` / `readable-vN.md`）；非版本族 → null。 */
export function finalVersionOfPath(path: string | null | undefined): number | null {
  if (typeof path !== 'string') return null
  const match = /(?:^|\/)final\/(?:v|readable-v)([1-9]\d{0,5})\.md$/.exec(path)
  return match === null ? null : Number(match[1])
}

/** 回执身份 = bundle 目录名（`drt_<slug>`）；驾驶舱传裸 slug。比较前只在一处剥前缀（BUG-352）。 */
const bareBundleSlugOf = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const bare = value.trim().replace(/^drt_/, '')
  return bare === '' ? null : bare
}

export function deliveryFromReceipt(receipt: unknown, slug?: string): FinalDelivery | null {
  if (typeof receipt !== 'object' || receipt === null) return null
  const record = receipt as { version?: unknown; slug?: unknown; acceptedAt?: unknown; gate?: unknown; present?: unknown; final?: unknown }
  // BUG-345：只认工具写的回执（run-accept 的 buildDelivered：version 1 + slug + acceptedAt + gate.PASS）。
  // 手写的 install-only 形状（final_copy/presented）或缺 gate 的仿制品不是回执——不做旧形兼容。
  if (record.version !== 1 || typeof record.slug !== 'string' || record.slug === '') return null
  const receiptSlug = bareBundleSlugOf(record.slug)
  if (receiptSlug === null) return null
  if (typeof record.acceptedAt !== 'string' || record.acceptedAt.trim() === '') return null
  if (slug !== undefined && bareBundleSlugOf(slug) !== receiptSlug) return null
  const gate = typeof record.gate === 'object' && record.gate !== null ? record.gate as { status?: unknown } : null
  if (gate?.status !== 'PASS') return null
  const present = typeof record.present === 'object' && record.present !== null
    ? record.present as { path?: unknown; callId?: unknown; version?: unknown }
    : null
  const final = typeof record.final === 'object' && record.final !== null
    ? record.final as { version?: unknown }
    : null
  const version = typeof present?.version === 'number' ? present.version : (typeof final?.version === 'number' ? final.version : null)
  const declared = typeof present?.path === 'string' && present.path.trim() !== '' ? present.path : null
  const path = declared ?? (version !== null ? `drt_${receiptSlug}/final/v${version}.md` : null)
  if (path === null) return null
  return { path, turn: 0, callId: typeof present?.callId === 'string' ? present.callId : '' }
}

/**
 * 终稿族路径 → 页签体的读面定表；非法路径 → null。
 * 不论地址是 final.md、final/vN.md 还是 readable(-vN).md，页签都从同一 bundle 读
 * final.md / review.md / final/；地址只决定「打开哪个页签」，不决定读哪份正文。
 * @param path - 规范相对路径（`finalPathOf` 的产物）。
 * @returns 三个固定读路径，或 null。
 */
export function finalReadPlan(path: string): FinalReadPlan | null {
  const dir = bundleDirOf(path)
  if (dir === null) return null
  return {
    dir,
    final: `${dir}${FINAL_NAME}`,
    review: `${dir}${FINAL_REVIEW_NAME}`,
    versions: `${dir}${FINAL_LEDGER_DIR}`,
    target: path.slice(dir.length),
  }
}

/**
 * 地址目标 → 读哪一版（BUG-356）。规则：
 *   - `final/vN.md` / `final/readable-vN.md`：地址点名的版本是权威；同版本读者版存在才展示；
 *   - `final.md` / `final/readable.md`：通用地址，才允许回退版本账最高号 / 当前工作稿；
 *   - 地址目标缺失时调用方必须走失败态，不得拿别的版本/工作稿冒充。
 * @param plan - `finalReadPlan` 的产物。
 * @param versionNames - `final/` 目录内的文件名（`vN.md` / `readable-vN.md` / `readable.md`）。
 * @returns 目标计划；非终稿地址 → null。
 */
export function finalTargetOf(plan: FinalReadPlan, versionNames: readonly string[]): FinalTargetPlan | null {
  const relative = plan.target.startsWith(`${FINAL_LEDGER_DIR}/`) ? plan.target.slice(FINAL_LEDGER_DIR.length + 1) : plan.target
  if (relative === FINAL_NAME || relative === FINAL_READER_NAME) {
    const latest = latestRunVersion(versionNames)
    const version = latest >= 1 ? latest : null
    const audit = version !== null && versionNames.includes(`v${String(version)}.md`)
      ? `${FINAL_LEDGER_DIR}/v${String(version)}.md`
      : FINAL_NAME
    const versionedReader = version !== null && versionNames.includes(`readable-v${String(version)}.md`)
      ? `${FINAL_LEDGER_DIR}/readable-v${String(version)}.md`
      : null
    const reader = versionedReader ?? (versionNames.includes(FINAL_READER_NAME) ? `${FINAL_LEDGER_DIR}/${FINAL_READER_NAME}` : null)
    return { version, audit, reader, fallback: true }
  }
  const version = finalVersionOf(relative)
  if (version !== null) {
    return {
      version,
      audit: `${FINAL_LEDGER_DIR}/${relative}`,
      reader: versionNames.includes(`readable-v${String(version)}.md`) ? `${FINAL_LEDGER_DIR}/readable-v${String(version)}.md` : null,
      fallback: false,
    }
  }
  const readerVersion = readableVersionOf(relative)
  if (readerVersion !== null) {
    return {
      version: readerVersion,
      audit: `${FINAL_LEDGER_DIR}/v${String(readerVersion)}.md`,
      reader: `${FINAL_LEDGER_DIR}/${relative}`,
      fallback: false,
    }
  }
  return null
}

/** 会话域文件地址的解析结果。 */
interface SessionFile {
  readonly sessionId: string
  /** 解码后的路径（相对工作区根或绝对）。 */
  readonly path: string
}

/**
 * 解析 `dsh-resource://file/session/<sid>/<path>`；绝对域、其他协议、编码畸形 → null。
 * `absolute` 域故意不认：页签体只能经会话文件面读，绝对地址留给 vendor 预览兜底。
 * @param address - 候选地址。
 * @returns 会话与路径，或 null。
 */
export function sessionFileOf(address: string): SessionFile | null {
  if (!address.startsWith(SESSION_ADDRESS_PREFIX)) return null
  const end = address.search(/[?#]/)
  const body = address.slice(SESSION_ADDRESS_PREFIX.length, end === -1 ? undefined : end)
  const [rawId, ...segments] = body.split('/')
  if (rawId === undefined || rawId === '' || segments.length === 0) return null
  try {
    return { sessionId: decodeURIComponent(rawId), path: segments.map((segment) => decodeURIComponent(segment)).join('/') }
  } catch {
    return null
  }
}

/**
 * 该地址是否是终稿页签认领的文件（会话域 + 路径整段匹配）。
 * 门的形态：只认三个位置，`drt_x/drafts/final.md`、`drt_x/evidence/x.md`、任意别处 `final.md` 全拒。
 * @param address - 候选地址。
 * @returns 是否认领。
 */
export function isFinalAddress(address: string): boolean {
  const file = sessionFileOf(address)
  return file !== null && FINAL_FAMILY_RELATIVE.test(file.path)
}

/**
 * 由会话与规范相对路径拼文件地址（与 vendor `sessionFileAddress` 同形）。
 * @param sessionId - 会话 id。
 * @param path - 规范相对路径。
 * @returns `dsh-resource://file/session/<sid>/<path>`。
 */
export function finalAddressOf(sessionId: string, path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '')
  return `${SESSION_ADDRESS_PREFIX}${encodeSegment(sessionId)}/${normalized.split('/').map(encodeSegment).join('/')}`
}

/** 终稿视图的提示：互补版本回退（reader↔audit）必须可见（BUG-364/368）。 */
export type FinalNotice =
  | 'readerEmpty'
  | 'readerUnreadable'
  | 'auditEmpty'
  | 'auditUnreadable'
  | 'auditMissing'
  | null

/** 终稿视图判定：展示哪一版、是否有回退提示、失败时是哪一态。 */
export interface FinalViewDecision {
  readonly view: 'reader' | 'audit' | 'empty' | 'unreadable'
  readonly notice: FinalNotice
  readonly failure: 'empty' | 'unreadable' | 'missing' | null
}

/**
 * 终稿正文/读者版状态 × 请求视图 → 展示决策（BUG-364/365/368）。
 *
 * 规则：请求的那一版 ok 就展示它；请求版空/读失败时，若另一版 ok 则回退并给可见提示；
 * 两版都不可用 → empty/unreadable/missing 失败态；跨版本绝不回退（地址目标已由 finalTargetOf 定）。
 * 审计版空/坏而读者版 ok 时也提示，不把审计问题藏起来。
 * @param input - 正文/读者版状态与请求视图（reader/audit）。
 * @returns 展示决策。
 */
export function finalViewOf(input: {
  readonly body: ArtifactState
  readonly reader: ArtifactState
  readonly requested: 'reader' | 'audit'
}): FinalViewDecision {
  const bodyOk = input.body === 'ok'
  const readerOk = input.reader === 'ok'
  const readerNotice: FinalNotice = input.reader === 'empty'
    ? 'readerEmpty'
    : input.reader === 'unreadable' || input.reader === 'invalid' ? 'readerUnreadable' : null
  const auditNotice: FinalNotice = input.body === 'empty'
    ? 'auditEmpty'
    : input.body === 'unreadable' || input.body === 'invalid' ? 'auditUnreadable' : input.body === 'absent' ? 'auditMissing' : null
  if (input.requested === 'reader') {
    if (readerOk) {
      // 读者版可读；审计版空/坏仍提示（不把审计问题藏起来）。
      return { view: 'reader', notice: bodyOk ? null : auditNotice, failure: null }
    }
    if (bodyOk) {
      return { view: 'audit', notice: readerNotice, failure: null }
    }
    const failure = failureOf(input.body)
    return { view: failure === 'empty' ? 'empty' : 'unreadable', notice: null, failure }
  }
  if (bodyOk) {
    // 审计版可读；请求审计版时读者版的问题不打扰。
    return { view: 'audit', notice: null, failure: null }
  }
  if (readerOk) {
    return { view: 'reader', notice: auditNotice, failure: null }
  }
  const failure = failureOf(input.body)
  return { view: failure === 'empty' ? 'empty' : 'unreadable', notice: null, failure }
}

/** 两版都不可用时，按正文状态给最具体的失败态（缺席优先于读失败，空单独成态）。 */
function failureOf(body: ArtifactState): 'empty' | 'unreadable' | 'missing' {
  if (body === 'absent') return 'missing'
  if (body === 'empty') return 'empty'
  return 'unreadable'
}

/**
 * 终稿 stale watcher 应盯的文件（BUG-371）：盯**当前显示件**，不是固定 audit。
 *
 * reader 视图且 reader 可读 → reader；draft 视图 → draft（final.md）；其余 → audit；
 * 正文不可读但 reader 可读 → reader；两版都不可用 → audit（终稿页签已进入失败态）。
 * @param input - 当前视图、body/reader 状态与三个候选文件名。
 * @returns 相对 bundle 的文件名。
 */
export function watchTargetOf(input: {
  readonly view: 'reader' | 'audit' | 'draft'
  readonly body: ArtifactState
  readonly reader: ArtifactState
  readonly audit: string
  readonly readerName: string | null
  readonly draft: string
}): string {
  if (input.view === 'draft') return input.draft
  if (input.view === 'reader' && input.reader === 'ok' && input.readerName !== null) return input.readerName
  if (input.body === 'ok') return input.audit
  if (input.reader === 'ok' && input.readerName !== null) return input.readerName
  return input.audit
}
