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
 * 地址语法正本 = vendor `packages/util/workspace-path/src/file-address.ts`
 * （逐段 component-encode，`:` 留字面给盘符）；本文件只做最小解析，不引 Node 侧依赖
 * （client 半会被内联进浏览器 bundle）。
 */

/** 交付事件：一条 `present` 声明里指向终稿的那一条。 */
export interface FinalDelivery {
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
export interface FinalReadPlan {
  readonly final: string
  readonly review: string
  readonly versions: string
}

/** 读面定表的文件名（finalReadPlan 与页签共用，避免两处硬编码）。 */
export const FINAL_NAME = 'final.md'
export const FINAL_REVIEW_NAME = 'review.md'
export const FINAL_LEDGER_DIR = 'final'
/** 读者版工作件（HITL2 前）与同版交付件（`readable-vN.md`；N 与 final/vN 同号）。 */
export const FINAL_READER_NAME = 'readable.md'
export const FINAL_READABLE_VERSION_RE = /^readable-v[1-9]\d{0,5}\.md$/
export const FINAL_VERSION_RE = /^v[1-9]\d{0,5}\.md$/

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
  const match = FINAL_FAMILY_SUFFIX.exec(normalized)
  if (match?.[1] === undefined) return null
  return FINAL_FAMILY_RELATIVE.test(match[1]) ? match[1] : null
}

/** 终稿族内的显示优先级：读者版 > 版本副本 > 工作稿（自动打开先开人读的那份）。 */
function familyRank(path: string): number {
  if (path.includes('/final/readable')) return 3
  if (/\/final\/v[1-9]\d{0,5}\.md$/.test(path)) return 2
  return 1
}

/** 事件流 → 最后一条指向终稿族的交付；同一声明多份时取读者版优先。无 / 畸形 → null。 */
export function latestFinalDelivery(events: readonly unknown[]): FinalDelivery | null {
  let latest: FinalDelivery | null = null
  for (const event of events) {
    if (typeof event !== 'object' || event === null) continue
    const record = event as { type?: unknown; data?: unknown }
    if (record.type !== 'deliverables/presented') continue
    const data = record.data as { turn?: unknown; callId?: unknown; files?: unknown } | null | undefined
    if (typeof data !== 'object' || data === null || !Array.isArray(data.files)) continue
    let best: { path: string; rank: number } | null = null
    for (const file of data.files) {
      const path = finalPathOf((file as { path?: unknown } | null | undefined)?.path)
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
export function latestPresentedFinalVersion(events: readonly unknown[]): number | null {
  let latest: number | null = null
  for (const event of events) {
    if (typeof event !== 'object' || event === null) continue
    const record = event as { type?: unknown; data?: unknown }
    if (record.type !== 'deliverables/presented') continue
    const data = record.data as { files?: unknown } | null | undefined
    if (typeof data !== 'object' || data === null || !Array.isArray(data.files)) continue
    for (const file of data.files) {
      const raw = (file as { path?: unknown } | null | undefined)?.path
      if (typeof raw !== 'string') continue
      const normalized = raw.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
      const version = /(?:^|\/)final\/(?:v|readable-v)([1-9]\d{0,5})\.md$/.exec(normalized)?.[1]
      if (version === undefined) continue
      const value = Number(version)
      if (Number.isSafeInteger(value) && (latest === null || value > latest)) latest = value
    }
  }
  return latest
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
  return { final: `${dir}${FINAL_NAME}`, review: `${dir}${FINAL_REVIEW_NAME}`, versions: `${dir}${FINAL_LEDGER_DIR}` }
}

/** 会话域文件地址的解析结果。 */
export interface SessionFile {
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
