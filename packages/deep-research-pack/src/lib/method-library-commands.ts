import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { z } from 'zod'
import { foldLibrary } from './library-fold.ts'
import type {} from '@deepseek-ai/dsh-api-session-controller/types'

import { parseMethodLibraryCommand } from './method-library-operation.ts'
import type { MethodLibraryAction, MethodLibraryOperationCommand } from './method-library-operation.ts'

export type { MethodLibraryAction, MethodLibraryOperationCommand } from './method-library-operation.ts'

export interface MethodLibraryOperationClaim extends MethodLibraryOperationCommand {
  readonly requestId: string
  readonly turn: number
  readonly callId: string
}

export interface MethodLibraryOperationState {
  readonly methodEditor: boolean
  readonly activeTurn: number | null
  readonly pending: (MethodLibraryOperationCommand & { readonly requestId: string; readonly turn: number }) | null
  readonly claims: readonly MethodLibraryOperationClaim[]
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    'method-library-operation': MethodLibraryOperationState
  }
}

export const initialMethodLibraryOperationState: MethodLibraryOperationState = { methodEditor: false, activeTurn: null, pending: null, claims: [] }

export function applyMethodLibraryOperationEvent(
  state: MethodLibraryOperationState,
  event: SessionEvent,
): MethodLibraryOperationState {
  if (event.type === 'turn/start') {
    return { methodEditor: state.methodEditor, activeTurn: event.data.turn, pending: null, claims: [] }
  }

  if (event.type === 'turn/end') {
    return { ...state, activeTurn: null, pending: null, claims: [] }
  }

  if (event.type === 'user/message') {
    const source = event.data.source as { readonly kind: string; readonly rpcId?: string; readonly principal?: unknown }
    if (source.kind !== 'user') return state
    const text = event.data.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
    const requestId = source.principal === undefined && typeof source.rpcId === 'string' && source.rpcId !== ''
      ? source.rpcId
      : undefined
    const command = state.methodEditor && requestId !== undefined && state.activeTurn !== null
      ? parseMethodLibraryCommand(text)
      : null
    return {
      ...state,
      pending: command !== null && state.activeTurn !== null && requestId !== undefined
        ? { ...command, requestId, turn: state.activeTurn }
        : null,
      claims: [],
    }
  }

  if (event.type === 'tool/call' && isMethodLibraryTool(event.data.name)) {
    const pending = state.pending
    if (pending === null || pending.turn !== event.data.turn || event.data.name !== toolNameFor(pending.action)) {
      return { ...state, pending: null }
    }
    const args = parseObject(event.data.arguments)
    if (args === null || args['operationId'] !== pending.operationId || !argumentsMatch(pending, args)) {
      return { ...state, pending: null }
    }
    const claim: MethodLibraryOperationClaim = {
      ...pending,
      callId: event.data.callId,
    }
    return {
      ...state,
      pending: null,
      claims: [...state.claims.filter((item) => item.requestId !== pending.requestId), claim],
    }
  }

  if (event.type === 'tool/result' && state.claims.length > 0) {
    const callId = event.data.message.source.callId
    const claims = state.claims.filter((claim) => claim.callId !== callId)
    return claims.length === state.claims.length ? state : { ...state, claims }
  }

  return state
}

export function hasMethodLibraryClaim(
  state: MethodLibraryOperationState,
  input: { readonly operationId: string; readonly action: MethodLibraryAction; readonly name: string | undefined; readonly callId: string; readonly payloadHash?: string | undefined },
): boolean {
  return state.claims.some((claim) => claim.callId === input.callId
    && claim.operationId === input.operationId
    && claim.action === input.action
    && claim.name === input.name
    && claim.payloadHash === input.payloadHash)
}

export const methodLibraryOperationProjection: ProjectionDefinition<'method-library-operation', MethodLibraryOperationState> = {
  key: 'method-library-operation',
  stateSchema: z.object({
    methodEditor: z.boolean(),
    activeTurn: z.number().int().nonnegative().nullable(),
    pending: z.object({
      operationId: z.string().min(16),
      action: z.enum(['save', 'save-and-set-default', 'set-default', 'clear-default', 'remove']),
      requestId: z.string().min(1),
      turn: z.number().int().nonnegative(),
      payloadHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
      name: z.string().optional(),
    }).strict().nullable(),
    claims: z.array(z.object({
      operationId: z.string().min(16),
      action: z.enum(['save', 'save-and-set-default', 'set-default', 'clear-default', 'remove']),
      requestId: z.string().min(1),
      turn: z.number().int().nonnegative(),
      payloadHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
      name: z.string().optional(),
      callId: z.string().min(1),
    }).strict()),
  }).strict(),
  init: (header) => ({ ...initialMethodLibraryOperationState, methodEditor: header.agentPreset === 'method-editor' }),
  apply: applyMethodLibraryOperationEvent,
  stateVersion: 1,
}

function isMethodLibraryTool(name: string): boolean {
  return name === 'method_library_upsert' || name === 'method_library_set_default' || name === 'method_library_remove'
}

function toolNameFor(action: MethodLibraryAction): string {
  return action === 'set-default' || action === 'clear-default' ? 'method_library_set_default' :
    action === 'remove' ? 'method_library_remove' : 'method_library_upsert'
}

function argumentsMatch(command: MethodLibraryOperationCommand, args: Record<string, unknown>): boolean {
  switch (command.action) {
    case 'save': return args['defaultAction'] === 'preserve' && args['operationHash'] === command.payloadHash && entryName(args['entry']) === command.name
    case 'save-and-set-default': return args['defaultAction'] === 'set' && args['operationHash'] === command.payloadHash && entryName(args['entry']) === command.name
    case 'set-default': return args['action'] === 'set' && args['name'] === command.name
    case 'clear-default': return args['action'] === 'clear' && args['name'] === undefined
    case 'remove': return args['name'] === command.name
    default: return false
  }
}

function entryName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const entries = foldLibrary(value)
  return entries.length === 1 ? entries[0]?.name : undefined
}

function parseObject(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text)
    return isRecord(value) ? value : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
