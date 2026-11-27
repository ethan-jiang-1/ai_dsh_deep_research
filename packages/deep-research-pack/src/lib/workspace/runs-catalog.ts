/**
 * runs-catalog.ts —— 工作区 Research Hub 的纯折算（run 档案三位置扫描 + 内置 8 透镜表）。
 *
 * 纪律：
 * - 零 Node built-ins / 零 React；通过 `RunSource` + `readArtifact` 读文件，浏览器与 Node 都能测；
 * - 复用 `questionBodyLineOf` / `isEvidenceCardName` / `finalVersionOf` / `readableVersionOf` /
 *   `readinessOfSources` / `reviewVerdictOf` / `readArtifact`，不复制第二份语义；
 * - 可选目录（`archive/` / `_abandoned/`）`missing` 不计目录错误；任何桶/bundle 读失败 =
 *   诚实标记 `dirErrors` 或 `status: 'unreadable'` + `evidenceCount: null`。
 */
import { questionBodyLineOf, isEvidenceCardName } from '../run/artifact-content.ts'
import { readArtifact, type JsonDecoder } from '../run/artifact-read.ts'
import { finalVersionOf, readableVersionOf } from '../run/final-target.ts'
import { openRun, type RunSource, type RunView } from '../run/run-context.ts'
import { readinessOfSources, reviewVerdictOf, type ReviewVerdict } from '../review/review-readiness.ts'

export type RunLocation = 'active' | 'archive' | 'abandoned'

export type RunCatalogStatus =
  | 'delivered'
  | 'reviewed_pass'
  | 'reviewed_fail'
  | 'reviewed_conflict'
  | 'in_progress'
  | 'archived'
  | 'abandoned'
  | 'unreadable'

export interface RunCatalogEntry {
  readonly slug: string
  readonly dirName: string
  readonly rootPath: string
  readonly location: RunLocation
  readonly title: string
  readonly status: RunCatalogStatus
  readonly delivered: boolean
  readonly hasFinalMd: boolean
  readonly latestFinalVersion: number | null
  readonly latestReaderVersion: number | null
  readonly evidenceCount: number | null
  readonly reviewVerdict: ReviewVerdict
  readonly error?: string
}

export interface RunCatalogDirError {
  readonly location: RunLocation
  readonly path: string
  readonly error: string
}

export interface RunCatalogResult {
  readonly runs: readonly RunCatalogEntry[]
  readonly dirErrors: readonly RunCatalogDirError[]
}

export interface LensSpec {
  readonly id: string
  readonly pairsWith: readonly string[]
}

/** 内置 8 个研究透镜标识（正本 = content/lenses/*.md；显示文案归 locales）。 */
export const BUILT_IN_LENSES: readonly LensSpec[] = [
  { id: 'official', pairsWith: ['practitioner', 'quant'] },
  { id: 'academic', pairsWith: ['practitioner', 'quant'] },
  { id: 'adversarial', pairsWith: ['official', 'quant'] },
  { id: 'quant', pairsWith: ['adversarial', 'practitioner'] },
  { id: 'practitioner', pairsWith: ['official', 'quant'] },
  { id: 'historical', pairsWith: ['official', 'structural'] },
  { id: 'structural', pairsWith: ['historical', 'practitioner'] },
  { id: 'regulatory', pairsWith: ['official', 'practitioner'] },
] as const

const BUCKETS: readonly { readonly location: RunLocation; readonly path: string }[] = [
  { location: 'active', path: '.' },
  { location: 'archive', path: 'archive' },
  { location: 'abandoned', path: '_abandoned' },
]

const DRT_DIR_RE = /^drt_([A-Za-z0-9][A-Za-z0-9._-]*)$/

const rawJsonTextDecoder: JsonDecoder<string> = (_raw, text) => ({ ok: true, value: text })

function hasFileEntry(view: RunView, name: string): boolean {
  return view.entries.some((entry) => entry.name === name && entry.type === 'file')
}

function hasDirEntry(view: RunView, name: string): boolean {
  return view.entries.some((entry) => entry.name === name && entry.type === 'directory')
}

function deriveStatus(args: {
  readonly location: RunLocation
  readonly unreadable: boolean
  readonly delivered: boolean
  readonly verdict: ReviewVerdict
}): RunCatalogStatus {
  if (args.unreadable) return 'unreadable'
  if (args.location === 'abandoned') return 'abandoned'
  if (args.delivered) return 'delivered'
  if (args.verdict === 'pass') return 'reviewed_pass'
  if (args.verdict === 'fail') return 'reviewed_fail'
  if (args.verdict === 'conflict') return 'reviewed_conflict'
  if (args.location === 'archive') return 'archived'
  return 'in_progress'
}

/**
 * 扫描当前工作区 `.`、`archive/`、`_abandoned/` 下的全部 `drt_*` 研究档案。
 * 不因 `archive/` / `_abandoned/` 缺席报错；任何可读性异常诚实记录到 `dirErrors` 或单条 `unreadable`。
 */
export async function scanRunsCatalog(source: RunSource, signal?: AbortSignal): Promise<RunCatalogResult> {
  const dirErrors: RunCatalogDirError[] = []
  const runs: RunCatalogEntry[] = []
  const listOpts = signal !== undefined ? { signal } : undefined

  for (const bucket of BUCKETS) {
    const listed = await source.list(bucket.path, listOpts)
    if (!listed.ok) {
      if (listed.reason === 'unreadable') {
        dirErrors.push({
          location: bucket.location,
          path: bucket.path,
          error: listed.detail ?? 'unreadable',
        })
      }
      continue
    }

    const dirs = listed.value
      .filter((entry) => (entry.type === 'directory' || entry.type === 'other') && DRT_DIR_RE.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const dir of dirs) {
      const slug = dir.name.slice(4)
      const rootPath = bucket.path === '.' ? dir.name : `${bucket.path}/${dir.name}`
      const opened = await openRun(source, rootPath, listOpts)
      if (!opened.ok) {
        runs.push({
          slug,
          dirName: dir.name,
          rootPath,
          location: bucket.location,
          title: slug,
          status: 'unreadable',
          delivered: false,
          hasFinalMd: false,
          latestFinalVersion: null,
          latestReaderVersion: null,
          evidenceCount: null,
          reviewVerdict: 'absent',
          error: opened.detail ?? opened.reason,
        })
        continue
      }

      const view = opened.value
      const delivered = hasFileEntry(view, 'delivered.json')
      const hasFinalMd = hasFileEntry(view, 'final.md')

      let title = slug
      let unreadableError: string | undefined

      if (hasFileEntry(view, 'question.md')) {
        const qRead = await readArtifact(view, 'question.md', listOpts)
        if (qRead.state === 'ok') {
          title = questionBodyLineOf(qRead.text) ?? slug
        } else if (qRead.state === 'unreadable') {
          unreadableError = 'question.md unreadable'
        }
      }

      let evidenceCount: number | null = 0
      if (hasDirEntry(view, 'evidence')) {
        const evList = await view.list('evidence', listOpts)
        if (!evList.ok) {
          if (evList.reason === 'unreadable') {
            evidenceCount = null
            unreadableError ??= evList.detail ?? 'evidence/ unreadable'
          }
        } else {
          evidenceCount = evList.value.filter((e) => e.type === 'file' && isEvidenceCardName(e.name)).length
        }
      }

      let latestFinalVersion: number | null = null
      let latestReaderVersion: number | null = null
      if (hasDirEntry(view, 'final')) {
        const finList = await view.list('final', listOpts)
        if (finList.ok) {
          for (const entry of finList.value) {
            if (entry.type !== 'file') continue
            const fv = finalVersionOf(entry.name)
            if (fv !== null) latestFinalVersion = Math.max(latestFinalVersion ?? 0, fv)
            const rv = readableVersionOf(entry.name)
            if (rv !== null) latestReaderVersion = Math.max(latestReaderVersion ?? 0, rv)
          }
        } else if (finList.reason === 'unreadable') {
          unreadableError ??= finList.detail ?? 'final/ unreadable'
        }
      }

      let verdict: ReviewVerdict = 'absent'
      const hasReviewDir = hasDirEntry(view, 'review')
      if (hasFileEntry(view, 'review.md') || hasReviewDir) {
        const revRead = hasFileEntry(view, 'review.md')
          ? await readArtifact(view, 'review.md', listOpts)
          : null
        const declRead = hasReviewDir
          ? await readArtifact(view, 'review/readiness.json', { ...listOpts, decoder: rawJsonTextDecoder })
          : null
        if (revRead?.state === 'unreadable') {
          verdict = 'unconfirmed'
          unreadableError ??= 'review.md unreadable'
        } else if (declRead?.state === 'unreadable') {
          verdict = 'unconfirmed'
          unreadableError ??= 'review/readiness.json unreadable'
        } else {
          const reading = readinessOfSources({
            reviewText: revRead?.state === 'ok' && revRead.text !== null ? revRead.text : undefined,
            declarationText: declRead?.state === 'ok' && declRead.text !== null ? declRead.text : undefined,
            hasReviewDir,
          })
          verdict = reviewVerdictOf(reading, {
            ...(revRead ? { review: revRead.state } : {}),
            ...(declRead ? { readiness: declRead.state } : {}),
          })
        }
      }

      runs.push({
        slug,
        dirName: dir.name,
        rootPath,
        location: bucket.location,
        title,
        status: deriveStatus({
          location: bucket.location,
          unreadable: unreadableError !== undefined,
          delivered,
          verdict,
        }),
        delivered,
        hasFinalMd,
        latestFinalVersion,
        latestReaderVersion,
        evidenceCount,
        reviewVerdict: verdict,
        ...(unreadableError !== undefined ? { error: unreadableError } : {}),
      })
    }
  }

  return { runs, dirErrors }
}

/** 按位置桶优先级挑选该研究档案最合适的可读终稿路径（读者版 > 审计版 > 根 final.md）。 */
export function preferredFinalPathOf(
  run: Pick<RunCatalogEntry, 'rootPath' | 'hasFinalMd' | 'latestFinalVersion' | 'latestReaderVersion'>,
): string | null {
  if (run.latestReaderVersion !== null) return `${run.rootPath}/final/readable-v${run.latestReaderVersion}.md`
  if (run.latestFinalVersion !== null) return `${run.rootPath}/final/v${run.latestFinalVersion}.md`
  if (run.hasFinalMd) return `${run.rootPath}/final.md`
  return null
}

/** 按关键词与位置桶筛选 run 档案。 */
export function filterRunsCatalog(
  runs: readonly RunCatalogEntry[],
  query: string,
  locationFilter: 'all' | RunLocation = 'all',
): readonly RunCatalogEntry[] {
  const q = query.trim().toLowerCase()
  return runs.filter((run) => {
    if (locationFilter !== 'all' && run.location !== locationFilter) return false
    if (q === '') return true
    return (
      run.slug.toLowerCase().includes(q)
      || run.title.toLowerCase().includes(q)
      || run.rootPath.toLowerCase().includes(q)
    )
  })
}

/** 按关键词筛选内置研究透镜。 */
export function filterLenses(
  lenses: readonly LensSpec[],
  query: string,
  searchableTextOf: (lens: LensSpec) => string = (lens) => `${lens.id} ${lens.pairsWith.join(' ')}`,
): readonly LensSpec[] {
  const q = query.trim().toLowerCase()
  if (q === '') return lenses
  return lenses.filter((lens) => (
    lens.id.toLowerCase().includes(q)
    || lens.pairsWith.some((pair) => pair.toLowerCase().includes(q))
    || searchableTextOf(lens).toLowerCase().includes(q)
  ))
}
