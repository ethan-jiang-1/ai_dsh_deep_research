import type { MethodLibraryReadResult } from './method-library-read.ts'

export type SourcePreview =
  | { readonly kind: 'ok'; readonly text: string; readonly eof: boolean }
  | { readonly kind: 'absent' }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'error'; readonly detail: string }

export interface RunCompletionEvidence {
  readonly hasFinalVersion: boolean
  readonly hasDeliverableContent: boolean
  readonly runHeader: SourcePreview
  readonly hasDeliveredRecord: boolean
  readonly hasLegacyAcceptance: boolean
  readonly question: MethodLibraryReadResult
}

/** Choose the highest numeric immutable final version from a directory listing. */
export function latestFinalVersion(files: readonly { readonly name: string }[]): string | null {
  const versions = files
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
  const acceptedHeader = evidence.runHeader.kind === 'ok' && /^phase:\s*accepted\s*$/m.test(evidence.runHeader.text)
  return (acceptedHeader && evidence.hasDeliveredRecord) || evidence.hasLegacyAcceptance
}
