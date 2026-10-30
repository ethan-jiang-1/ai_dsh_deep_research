import { foldLibrary } from './library-fold.ts'
import type { LibraryEntry } from './library-fold.ts'
import type { MethodLibraryAction } from './method-library-operation.ts'

/** A resumed queued operation must reuse its read-mode context instead of creating another one. */
export function shouldStartFreshDraftContext(input: {
  readonly mode: 'read' | 'edit' | 'new'
  readonly draftKey: string | null
  readonly resume: boolean
}): boolean {
  return !input.resume && (input.mode === 'read' || input.draftKey === null)
}

/** Parsed library value with stable fields for operation verification. */
export type MethodLibrarySnapshot = readonly Pick<LibraryEntry, 'name' | 'provenance' | 'isDefault' | 'sections' | 'legacyText'>[]

/** Return the semantic library contents without Markdown whitespace differences. */
export function methodLibrarySnapshot(text: string | null): MethodLibrarySnapshot {
  return foldLibrary(text).map((entry) => ({
    name: entry.name,
    provenance: entry.provenance,
    isDefault: entry.isDefault,
    sections: { ...entry.sections },
    legacyText: entry.legacyText,
  }))
}

/** Compute the complete library state an accepted operation requests. */
export function expectedMethodLibrarySnapshot(input: {
  readonly before: string | null
  readonly action: MethodLibraryAction
  readonly name?: string
  readonly entryText?: string
}): MethodLibrarySnapshot | null {
  const before = [...methodLibrarySnapshot(input.before)]
  const name = input.name
  if (input.action === 'save' || input.action === 'save-and-set-default') {
    if (input.entryText === undefined) return null
    const incoming = foldLibrary(input.entryText)
    if (incoming.length !== 1 || name === undefined || incoming[0]?.name !== name) return null
    const matches = before.flatMap((entry, index) => entry.name === name ? [index] : [])
    if (matches.length > 1) return null
    const parsed = incoming[0]
    if (parsed === undefined) return null
    const existingIndex = matches[0]
    const isDefault = input.action === 'save-and-set-default' || (existingIndex !== undefined && before[existingIndex]?.isDefault === true)
    const nextEntry: MethodLibrarySnapshot[number] = { ...parsed, isDefault }
    if (input.action === 'save-and-set-default') {
      for (let index = 0; index < before.length; index += 1) {
        const entry = before[index]
        if (entry !== undefined) before[index] = { ...entry, isDefault: false }
      }
    }
    const targetIndex = matches[0]
    if (targetIndex === undefined) before.push(nextEntry)
    else before[targetIndex] = nextEntry
    return before
  }
  if (input.action === 'set-default') {
    if (name === undefined) return null
    const matches = before.flatMap((entry, index) => entry.name === name ? [index] : [])
    if (matches.length !== 1) return null
    return before.map((entry) => ({ ...entry, isDefault: entry.name === name }))
  }
  if (input.action === 'clear-default') return before.map((entry) => ({ ...entry, isDefault: false }))
  if (name === undefined) return null
  const matches = before.flatMap((entry, index) => entry.name === name ? [index] : [])
  if (matches.length !== 1) return null
  return before.filter((entry) => entry.name !== name)
}

/** Durable evidence that can settle the UI's currently pending operation. */
export type MethodLibrarySettlement = 'verified' | 'rejected' | 'unknown'

/** Decide whether correlated tool evidence and a complete readback settle an operation. */
export function methodLibrarySettlement(input: {
  readonly outcome: 'tool-success' | 'tool-error' | 'turn-end' | 'refresh'
  readonly targetReached: boolean
  readonly unchanged: boolean
  readonly metadataMatches: boolean
  readonly callIdObserved: boolean
}): MethodLibrarySettlement {
  if (input.outcome === 'refresh') return 'unknown'
  if (input.outcome === 'turn-end') return !input.callIdObserved && input.unchanged ? 'rejected' : 'unknown'
  if (!input.callIdObserved) return 'unknown'
  if (input.outcome === 'tool-success') {
    return input.targetReached && input.metadataMatches ? 'verified' : 'unknown'
  }
  return input.unchanged ? 'rejected' : 'unknown'
}

/** Compare one complete workspace read with an operation's expected state. */
export function methodLibraryMatchesSnapshot(text: string | null, expected: MethodLibrarySnapshot): boolean {
  return JSON.stringify(methodLibrarySnapshot(text)) === JSON.stringify(expected)
}
