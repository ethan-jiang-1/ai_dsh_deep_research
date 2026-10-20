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

/** run bundle 终稿的规范相对路径（三位置；`drt_` 后允许字母数字下划线与 .-）。 */
const FINAL_RELATIVE = /^(?:archive\/|_abandoned\/)?drt_[\w.-]+\/final\.md$/
/** 从任意书写形态里抠出终稿后缀（绝对路径、`./` 前缀、反斜杠都收）。 */
const FINAL_SUFFIX = /((?:archive\/|_abandoned\/)?drt_[\w.-]+\/final\.md)$/
const FILE_ADDRESS_PREFIX = 'dsh-resource://file/'
const SESSION_ADDRESS_PREFIX = `${FILE_ADDRESS_PREFIX}session/`
/** vendor 同款：逐段 component-encode，`:` 留字面（盘符可读）。 */
const encodeSegment = (segment: string): string => encodeURIComponent(segment).replace(/%3A/gi, ':')

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
  const match = FINAL_SUFFIX.exec(normalized)
  if (match?.[1] === undefined) return null
  return FINAL_RELATIVE.test(match[1]) ? match[1] : null
}

/** 事件流 → 最后一条指向终稿的交付；无 / 畸形 → null。 */
export function latestFinalDelivery(events: readonly unknown[]): FinalDelivery | null {
  let latest: FinalDelivery | null = null
  for (const event of events) {
    if (typeof event !== 'object' || event === null) continue
    const record = event as { type?: unknown; data?: unknown }
    if (record.type !== 'deliverables/presented') continue
    const data = record.data as { turn?: unknown; callId?: unknown; files?: unknown } | null | undefined
    if (typeof data !== 'object' || data === null || !Array.isArray(data.files)) continue
    for (const file of data.files) {
      const path = finalPathOf((file as { path?: unknown } | null | undefined)?.path)
      if (path === null) continue
      latest = {
        path,
        turn: typeof data.turn === 'number' && Number.isSafeInteger(data.turn) ? data.turn : 0,
        callId: typeof data.callId === 'string' ? data.callId : '',
      }
      break
    }
  }
  return latest
}

/**
 * 终稿路径 → 页签体的读面定表；非法路径 → null。
 * @param path - 规范相对路径（`finalPathOf` 的产物）。
 * @returns 三个固定读路径，或 null。
 */
export function finalReadPlan(path: string): FinalReadPlan | null {
  if (!FINAL_RELATIVE.test(path)) return null
  const dir = path.slice(0, path.length - 'final.md'.length)
  return { final: path, review: `${dir}review.md`, versions: `${dir}final` }
}

/**
 * 终稿的三位置候选（按序：原位 → archive/ → _abandoned/）。
 * `present` 记录的是交付**当时**的位置；bundle 之后被归档/停放时，记录路径会失效——读面按
 * 三位置依次尝试，页签地址不变（地址 = 交付记录，内容 = 当前位置）。
 * @param path - 规范相对路径（`finalPathOf` 的产物）。
 * @returns 去重后的候选路径；非法输入 → 空数组。
 */
export function finalCandidates(path: string): readonly string[] {
  if (!FINAL_RELATIVE.test(path)) return []
  const bare = path.replace(/^(?:archive\/|_abandoned\/)/, '')
  if (!FINAL_RELATIVE.test(bare)) return []
  const out: string[] = []
  for (const candidate of [path, bare, `archive/${bare}`, `_abandoned/${bare}`]) {
    if (!out.includes(candidate) && FINAL_RELATIVE.test(candidate)) out.push(candidate)
  }
  return out
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
  return file !== null && FINAL_RELATIVE.test(file.path)
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
