import type { MethodLibraryReadResult } from './method-library-read.ts'

export type SourcePreview =
  | { readonly kind: 'ok'; readonly text: string; readonly eof: boolean }
  | { readonly kind: 'absent' }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'error'; readonly detail: string }

interface RunCompletionEvidence {
  readonly hasFinalVersion: boolean
  readonly hasDeliverableContent: boolean
  readonly runHeader: SourcePreview
  readonly hasDeliveredRecord: boolean
  readonly hasLegacyAcceptance: boolean
  readonly question: MethodLibraryReadResult
}

/** Choose the highest numeric immutable final version from a directory listing. */
export function latestFinalVersion(files: readonly { readonly name: string; readonly type?: string }[]): string | null {
  const versions = files
    .filter((file) => file.type === undefined || file.type === 'file')
    .map((file) => /^v([1-9][0-9]*)\.md$/.exec(file.name))
    .filter((match) => match !== null)
    .map((match) => ({ version: Number(match[1]), name: match[0] }))
    .sort((left, right) => right.version - left.version)
  return versions[0]?.name ?? null
}

/** A run is selectable only when its output and acceptance are both discoverable. */
export function isCompletedMethodSourceRun(evidence: RunCompletionEvidence): boolean {
  if (!evidence.hasFinalVersion || !evidence.hasDeliverableContent
    || evidence.question.kind !== 'ok' || evidence.question.text.trim() === '') return false
  // run.md 的 phase 在**头部**（首个 `##` 之前）；模板写 `- phase:`，旧场写裸 `phase:`（BUG-084）。
  // 正文/代码块里的裸 `phase: accepted` 不得冒充完成凭据。
  const headerText = evidence.runHeader.kind === 'ok'
    ? evidence.runHeader.text.split(/^##\s/m)[0] ?? ''
    : ''
  const acceptedHeader = evidence.runHeader.kind === 'ok' && /^(?:-\s*)?phase:\s*accepted\s*$/m.test(headerText)
  return (acceptedHeader && evidence.hasDeliveredRecord) || evidence.hasLegacyAcceptance
}
