/**
 * run-context.ts —— run bundle 的读面（D28：位置只用于发现，不是状态）。
 *
 * 为什么有它：四个驾驶舱页签与四个 Node 工具曾各自实现「slug → 根 / archive/ / _abandoned/
 * → 列目录 → 读文件（限行 / 翻页到 eof）」；同一条位置规则复制 8 处，读策略还漂移（review.md
 * 在状态页翻到 eof、在终稿页只读 600 行）。本模块把位置、同名优先级、在场、分页、按文件类型的
 * 读策略、missing/unreadable 区分收进一个接口；I/O 由 `RunSource` 注入，浏览器与 Node 各一适配器。
 *
 * 纪律：
 *   - 不做 I/O（无 node:*、无 React）——可被 client 与 scripts 同时导入；
 *   - 永不 throw：每个结果都是 `Outcome`；missing 不是 empty，也不是 unreadable；
 *   - 空目录 / 空文件是合法值（`ok` + 空值）；`unreadable` 只表示通道/权限/畸形；
 *   - 读策略是一张表：review.md / final.md / final/vN.md 读到 eof，其余按行数上限；
 *   - 到 eof 的翻页有页数上限；触顶返回 `truncated: true`，绝不静默短读。
 *
 * 当前读策略（与 design/40 的驾驶舱边界同步）：
 *   review.md / final.md / final/vN.md → eof（500 行/页，最多 64 页）
 *   question.md → 80 行；plan.md → 800 行；其余 → 40 行
 */

/** D28 的三种操作桶；发现顺序 = 根 → archive → _abandoned。 */
export type Bucket = 'root' | 'archive' | 'abandoned'

/** 读面的统一结果：missing（不在场）/ unreadable（通道或权限失败）/ ok（含空值）。 */
export type Outcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: 'missing' | 'unreadable'; readonly detail?: string }

/** 目录项（结构性子集；不依赖 vendor 类型）。 */
export interface Entry {
  readonly name: string
  readonly type: 'file' | 'directory' | 'other'
  /** Node list 适配器提供；浏览器 workspaceFiles 不暴露文件 mtime。 */
  readonly mtimeMs?: number
}

/** 一页文本（offset 从 1 起；lines = 本页行数；eof = 已到文末）。 */
export interface Page {
  readonly text: string
  readonly lines: number
  readonly eof: boolean
  readonly version?: string
}

/** 读面返回的文本文件。truncated = 未读到 eof（固定行窗触顶或翻页触顶）。 */
export interface TextFile {
  readonly path: string
  readonly text: string
  readonly lines: number
  readonly eof: boolean
  readonly truncated: boolean
  readonly version?: string
}

/** 注入的 I/O 接缝；路径 = 工作区相对路径（浏览器适配器负责其通道的绝对/相对差异）。 */
export interface RunSource {
  list(dir: string, opts?: { readonly signal?: AbortSignal }): Promise<Outcome<readonly Entry[]>>
  read(path: string, opts: { readonly offset: number; readonly limit: number; readonly signal?: AbortSignal }): Promise<Outcome<Page>>
  version(path: string, opts?: { readonly signal?: AbortSignal }): Promise<Outcome<string>>
}

/** 一个已定位的 run bundle；`dir` 是已解析的相对基址（drt_x / archive/drt_x / _abandoned/drt_x）。 */
export interface RunView {
  readonly slug: string
  readonly dir: string
  readonly bucket: Bucket
  /** openRun 时的根目录快照（在场判定用；实时刷新走 list()）。 */
  readonly entries: readonly Entry[]
  readonly names: ReadonlySet<string>
  list(dir?: string, opts?: { readonly signal?: AbortSignal }): Promise<Outcome<readonly Entry[]>>
  read(name: string, opts?: { readonly signal?: AbortSignal }): Promise<Outcome<TextFile>>
  version(name: string, opts?: { readonly signal?: AbortSignal }): Promise<Outcome<string>>
}

/** listRuns 的枚举项（发现元数据；bucket 只是操作桶标签，不参与状态判定）。 */
export interface RunRef {
  readonly slug: string
  readonly dir: string
  readonly bucket: Bucket
  /** 仅 Node 适配器提供；浏览器源没有 mtime（排序退回桶序 + slug）。 */
  readonly mtimeMs?: number
}

const BUCKETS: readonly Bucket[] = ['root', 'archive', 'abandoned']
const SEGMENT: Readonly<Record<Bucket, string>> = { root: '', archive: 'archive', abandoned: '_abandoned' }
const RANK: Readonly<Record<Bucket, number>> = { root: 0, archive: 1, abandoned: 2 }

const PAGE_LINES = 500
const MAX_PAGES = 64
const DEFAULT_LINES = 40
const FIXED_LINES: Readonly<Record<string, number>> = { 'question.md': 80 }
/** plan.md 与其版本快照 plan/vN.md 共用 800 行上限（旧实现分别 800/240）。 */
const PLAN_NAME = /^(?:plan\.md|plan\/v[1-9]\d*\.md)$/
/** 这些文件必须读到 eof：终局判定在文末，固定行窗会读到中段的旧判定。 */
const EOF_NAME = /^(?:review\.md|final\.md|final\/v[1-9]\d*\.md)$/
/** run bundle slug 形态（与 bundle-bind 的 `drt_<slug>/` 词法一致）。 */
const SLUG = /^[a-z0-9][a-z0-9-]*$/

type Failure = { readonly ok: false; readonly reason: 'missing' | 'unreadable'; readonly detail?: string }

/** 文件 → 读策略（eof 或行数上限）。 */
export function readPolicyOf(name: string): 'eof' | number {
  if (EOF_NAME.test(name)) return 'eof'
  if (PLAN_NAME.test(name)) return 800
  return FIXED_LINES[name] ?? DEFAULT_LINES
}

/** 目录相对路径：允许空（bundle 根），拒绝对路径、`..`、空段。 */
function safeDir(raw: string): string | null {
  const normalized = raw.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/')
  if (normalized === '' || normalized === '.') return ''
  if (normalized.startsWith('/')) return null
  const parts = normalized.split('/')
  if (parts.some((part) => part === '' || part === '.' || part === '..')) return null
  return normalized
}

/** 文件相对路径：非空，拒绝对路径、`..`、空段。 */
function safeFile(raw: string): string | null {
  const normalized = safeDir(raw)
  return normalized === null || normalized === '' ? null : normalized
}

/** 引用 → slug + 可选显式桶；接受 `drt_x` / `x` / `archive/drt_x` / `drt_x/final.md` 等写法。 */
function parseRef(raw: string): { slug: string; preferred?: Bucket } | null {
  if (typeof raw !== 'string') return null
  const normalized = raw.replace(/\\/g, '/').trim().replace(/^\.\//, '').replace(/\/+/g, '/')
  if (normalized === '' || normalized.startsWith('/')) return null
  const parts = normalized.split('/').filter((part) => part !== '' && part !== '.')
  if (parts.length === 0 || parts.includes('..')) return null
  let preferred: Bucket | undefined
  if (parts[0] === 'archive' || parts[0] === '_abandoned') {
    preferred = parts[0] === 'archive' ? 'archive' : 'abandoned'
    parts.shift()
  }
  const drtAt = parts.findIndex((part) => part.startsWith('drt_'))
  const rawSlug = drtAt >= 0 ? (parts[drtAt] ?? '').slice(4) : (parts[0] ?? '')
  if (!SLUG.test(rawSlug)) return null
  return preferred === undefined ? { slug: rawSlug } : { slug: rawSlug, preferred }
}

function bundleDir(bucket: Bucket, slug: string): string {
  const name = `drt_${slug}`
  return bucket === 'root' ? name : `${SEGMENT[bucket]}/${name}`
}

/**
 * 一个 ref 的三位置候选目录（纯函数；同步消费者用：run-state 的盘侧定位）。
 * 显式桶路径先给该桶，再回退其余桶；非法 ref → 空数组。
 * @param ref - `drt_x` / `x` / `archive/drt_x` / `archive/drt_x/final.md` 等写法。
 * @returns 候选相对目录（按发现序）。
 */
export function bundleCandidates(ref: string): readonly string[] {
  const parsed = parseRef(ref)
  if (parsed === null) return []
  const order: readonly Bucket[] = parsed.preferred === undefined
    ? BUCKETS
    : [parsed.preferred, ...BUCKETS.filter((bucket) => bucket !== parsed.preferred)]
  return order.map((bucket) => bundleDir(bucket, parsed.slug))
}

/**
 * 打开一个 run bundle：按根 → archive → _abandoned 找第一个存在的目录。
 * 显式桶路径（archive/… / _abandoned/…）先查该桶，再回退其余桶（present 记录的旧位置）。
 * 空目录是合法 run（不让位给 archive 同名副本）；三处皆无 → missing；有 unreadable 且无命中 → unreadable。
 */
export async function openRun(source: RunSource, ref: string, opts?: { readonly signal?: AbortSignal }): Promise<Outcome<RunView>> {
  const parsed = parseRef(ref)
  if (parsed === null) return { ok: false, reason: 'unreadable', detail: `invalid run ref: ${String(ref)}` }
  const order: readonly Bucket[] = parsed.preferred === undefined
    ? BUCKETS
    : [parsed.preferred, ...BUCKETS.filter((bucket) => bucket !== parsed.preferred)]
  let firstError: Failure | null = null
  for (const bucket of order) {
    const dir = bundleDir(bucket, parsed.slug)
    const listed = await source.list(dir, opts)
    if (!listed.ok) {
      if (listed.reason === 'unreadable' && firstError === null) firstError = listed
      continue
    }
    const entries = listed.value
    const names = new Set(entries.map((entry) => entry.name))
    const view: RunView = {
      slug: parsed.slug,
      dir,
      bucket,
      entries,
      names,
      list: async (sub = '', listOpts) => {
        const rel = safeDir(sub)
        if (rel === null) return { ok: false, reason: 'unreadable', detail: `invalid directory: ${String(sub)}` }
        return source.list(rel === '' ? dir : `${dir}/${rel}`, listOpts)
      },
      read: async (name, readOpts) => {
        const rel = safeFile(name)
        if (rel === null) return { ok: false, reason: 'unreadable', detail: `invalid path: ${String(name)}` }
        const path = `${dir}/${rel}`
        const policy = readPolicyOf(rel)
        if (policy !== 'eof') {
          const page = await source.read(path, { offset: 1, limit: policy, ...(readOpts?.signal !== undefined ? { signal: readOpts.signal } : {}) })
          if (!page.ok) return page
          const chunk = page.value
          return {
            ok: true,
            value: {
              path,
              text: chunk.text,
              lines: chunk.lines,
              eof: chunk.eof,
              truncated: !chunk.eof,
              ...(chunk.version !== undefined ? { version: chunk.version } : {}),
            },
          }
        }
        const chunks: string[] = []
        let offset = 1
        let lines = 0
        let eof = false
        let version: string | undefined
        for (let pageNo = 0; pageNo < MAX_PAGES; pageNo += 1) {
          const page = await source.read(path, { offset, limit: PAGE_LINES, ...(readOpts?.signal !== undefined ? { signal: readOpts.signal } : {}) })
          if (!page.ok) return page
          const chunk = page.value
          if (version === undefined && chunk.version !== undefined) version = chunk.version
          if (chunk.lines === 0 && !chunk.eof) {
            return { ok: false, reason: 'unreadable', detail: `stalled page: ${path} (offset ${String(offset)})` }
          }
          if (chunk.text !== '') chunks.push(chunk.text)
          lines += chunk.lines
          if (chunk.eof) {
            eof = true
            break
          }
          offset += Math.max(chunk.lines, 1)
        }
        return {
          ok: true,
          value: {
            path,
            text: chunks.join('\n'),
            lines,
            eof,
            truncated: !eof,
            ...(version !== undefined ? { version } : {}),
          },
        }
      },
      version: async (name, versionOpts) => {
        const rel = safeFile(name)
        if (rel === null) return { ok: false, reason: 'unreadable', detail: `invalid path: ${String(name)}` }
        return source.version(`${dir}/${rel}`, versionOpts)
      },
    }
    return { ok: true, value: view }
  }
  return firstError ?? { ok: false, reason: 'missing', detail: `run bundle not found: ${parsed.slug}` }
}

/**
 * 枚举 run bundle：按桶序扫描，同 slug 根优先（不合并），mtime 全在场时按 mtime 降序，
 * 否则按桶序 + slug（确定性；没有 mtime 的源不静默声称"最近"）。
 * mtime 仅 Node 适配器提供；浏览器 workspaceFiles 不暴露文件 mtime → 桶序 + slug。
 */
export async function listRuns(source: RunSource, opts?: { readonly buckets?: readonly Bucket[]; readonly signal?: AbortSignal }): Promise<Outcome<readonly RunRef[]>> {
  const requested = opts?.buckets ?? BUCKETS
  const buckets = requested.filter((bucket): bucket is Bucket => bucket === 'root' || bucket === 'archive' || bucket === 'abandoned')
  if (buckets.length === 0 || buckets.length !== requested.length) {
    return { ok: false, reason: 'unreadable', detail: 'invalid bucket filter' }
  }
  const seen = new Map<string, RunRef>()
  let firstError: Failure | null = null
  for (const bucket of buckets) {
    const listed = await source.list(SEGMENT[bucket], opts?.signal !== undefined ? { signal: opts.signal } : undefined)
    if (!listed.ok) {
      if (listed.reason === 'unreadable' && firstError === null) firstError = listed
      continue
    }
    for (const entry of listed.value) {
      if (entry.type !== 'directory' && entry.type !== 'other') continue
      if (!entry.name.startsWith('drt_')) continue
      const slug = entry.name.slice(4)
      if (!SLUG.test(slug) || seen.has(slug)) continue
      seen.set(slug, {
        slug,
        dir: bucket === 'root' ? entry.name : `${SEGMENT[bucket]}/${entry.name}`,
        bucket,
        ...(entry.mtimeMs !== undefined ? { mtimeMs: entry.mtimeMs } : {}),
      })
    }
  }
  const refs = [...seen.values()]
  if (refs.length === 0) return firstError ?? { ok: false, reason: 'missing', detail: 'no run bundles' }
  const allTimed = refs.every((ref) => typeof ref.mtimeMs === 'number')
  if (allTimed) {
    refs.sort((left, right) => ((right.mtimeMs ?? 0) - (left.mtimeMs ?? 0)) || left.slug.localeCompare(right.slug))
  } else {
    refs.sort((left, right) => (RANK[left.bucket] - RANK[right.bucket]) || left.slug.localeCompare(right.slug))
  }
  return { ok: true, value: refs }
}
