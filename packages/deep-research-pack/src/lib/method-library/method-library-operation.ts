export type MethodLibraryAction = 'save' | 'save-and-set-default' | 'set-default' | 'clear-default' | 'remove'

export interface MethodLibraryOperationCommand {
  readonly operationId: string
  readonly action: MethodLibraryAction
  readonly name?: string | undefined
  readonly payloadHash?: string | undefined
}

const COMMAND_PREFIX = '【方法库操作】'
const COMMAND_ACTIONS: readonly MethodLibraryAction[] = ['save', 'save-and-set-default', 'set-default', 'clear-default', 'remove']

/** Format the UI-owned command marker carried by one Method Editor prompt. */
export function methodLibraryCommandText(command: MethodLibraryOperationCommand): string {
  return `${COMMAND_PREFIX}${JSON.stringify(command)}`
}

/** Parse one complete command marker from an accepted Method Editor prompt. */
export function parseMethodLibraryCommand(text: string): MethodLibraryOperationCommand | null {
  const line = text.split('\n').find((part) => part.startsWith(COMMAND_PREFIX))
  if (line === undefined) return null
  try {
    const value: unknown = JSON.parse(line.slice(COMMAND_PREFIX.length))
    if (!isRecord(value)
      || Object.keys(value).some((key) => !['operationId', 'action', 'name', 'payloadHash'].includes(key))
      || typeof value['operationId'] !== 'string'
      || value['operationId'].length < 16
      || typeof value['action'] !== 'string'
      || !COMMAND_ACTIONS.includes(value['action'] as MethodLibraryAction)) return null
    const action = value['action'] as MethodLibraryAction
    const savesContent = action === 'save' || action === 'save-and-set-default'
    if (action === 'clear-default') {
      if (value['name'] !== undefined || value['payloadHash'] !== undefined) return null
    } else if (typeof value['name'] !== 'string' || value['name'].trim() === '') return null
    const payloadHash = value['payloadHash']
    if (savesContent) {
      if (typeof payloadHash !== 'string' || !/^[0-9a-f]{64}$/.test(payloadHash)) return null
    } else if (payloadHash !== undefined) return null
    return {
      operationId: value['operationId'],
      action,
      ...(typeof value['name'] === 'string' ? { name: value['name'].trim() } : {}),
      ...(typeof payloadHash === 'string' ? { payloadHash } : {}),
    }
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
