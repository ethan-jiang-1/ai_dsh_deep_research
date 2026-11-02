// model.ts — 方法库工作台的纯模型：状态枚举、操作记录形状与无 UI 判据。
//
// 从 MethodLibraryView.tsx 拆出（2026-11-03 审计 P4）。这里只放**无 React**的类型与小函数，
// 组件负责读盘/会话/布局；纯判据可 keyless 单测（operationMetadataMatches / draftOf 等）。
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { MethodLibraryAction } from '../../lib/method-library-operation.ts'
import type { LibrarySections } from '../../lib/library-fold.ts'
import type { LibraryEntry } from '../../lib/library-fold.ts'
import type { MethodLibrarySnapshot } from '../../lib/method-library-operation-state.ts'
import type { BUILTIN_PREFERENCES } from '../../lib/config-tables.ts'
import type { Draft } from './views.tsx'

export const LIBRARY_PATH = 'method-library.md'

export type Mode = 'read' | 'edit' | 'new'
export type Segment = 'mine' | 'builtin'
export type LoadState = 'loading' | 'ok' | 'absent' | 'error'

export interface Receipt {
  readonly ok: boolean
  readonly detail: string
}

export interface MethodLibraryOperationRequest {
  readonly action: MethodLibraryAction
  readonly name?: string
  readonly entryText?: string
  readonly confirmOverwrite?: boolean
  readonly instruction: string
}

export interface PendingMethodOperation {
  readonly operationId: string
  readonly sourceSessionId: SessionId
  readonly requestId: string
  turn: number | null
  readonly action: MethodLibraryAction
  readonly name?: string
  readonly entryText?: string
  readonly payloadHash?: string
  readonly expected: MethodLibrarySnapshot
  readonly priorText: string | null
  callId?: string
  timeout: ReturnType<typeof setTimeout>
}

export type OperationOutcome =
  | { readonly kind: 'tool-result'; readonly failed: boolean; readonly result: unknown }
  | { readonly kind: 'turn-end' | 'refresh' }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function expectedDefaults(operation: PendingMethodOperation): string[] {
  return operation.expected.filter((entry) => entry.isDefault).map((entry) => entry.name)
}

/** 写后回读的元数据是否对得上本次操作（operationId/默认集合/动作专属字段）。 */
export function operationMetadataMatches(operation: PendingMethodOperation, value: unknown): boolean {
  if (!isRecord(value) || value['operationId'] !== operation.operationId) return false
  const defaults = expectedDefaults(operation)
  if (!Array.isArray(value['defaults']) || JSON.stringify(value['defaults']) !== JSON.stringify(defaults)) return false
  switch (operation.action) {
    case 'save':
    case 'save-and-set-default':
      return value['name'] === operation.name
        && (value['action'] === 'created' || value['action'] === 'updated')
        && value['isDefault'] === (operation.expected.find((entry) => entry.name === operation.name)?.isDefault === true)
    case 'set-default':
      return value['action'] === 'set' && value['name'] === operation.name
    case 'clear-default':
      return value['action'] === 'clear'
    case 'remove':
      return value['name'] === operation.name && value['removed'] === true
  }
}

/** 空四字段草稿。 */
export function emptySections(): LibrarySections {
  return { source: null, verify: null, report: null, limit: null }
}

/** Built-in read-only preference projected as a user-library source. */
export function builtinLibraryEntry(entry: (typeof BUILTIN_PREFERENCES)[number]): LibraryEntry {
  return { name: entry.name, provenance: '内置只读', sections: entry.sections, legacyText: null, isDefault: false }
}

/** 草稿是否与源条目一致（粗糙但够用的 dirty 判据：用于离开确认，不用于保存）。 */
export function draftOf(entry: LibraryEntry): Draft {
  return {
    name: entry.name,
    sections: entry.sections,
    currentName: entry.name,
    provenance: entry.provenance,
    legacyText: entry.legacyText,
  }
}
