export type MethodLibraryCoachEvent =
  | { readonly kind: 'turn-start'; readonly turn: number }
  | { readonly kind: 'turn-end'; readonly turn: number }
  | { readonly kind: 'user-rpc'; readonly requestId: string }
  | { readonly kind: 'assistant-text'; readonly text: string }
  | { readonly kind: 'tool-call'; readonly callId: string; readonly turn: number; readonly name: string; readonly args: Record<string, unknown> | null }
  | { readonly kind: 'tool-result'; readonly callId: string; readonly failed: boolean; readonly result: unknown }

/** Decode the live Session events used by Method Library draft and operation watchers. */
export function methodLibraryCoachEventOf(candidate: unknown): MethodLibraryCoachEvent | null {
  if (!isRecord(candidate) || !isRecord(candidate['data']) || typeof candidate['type'] !== 'string') return null
  const data = candidate['data']
  if (candidate['type'] === 'turn/start') {
    return typeof data['turn'] === 'number' ? { kind: 'turn-start', turn: data['turn'] } : null
  }
  if (candidate['type'] === 'turn/end') {
    return typeof data['turn'] === 'number' ? { kind: 'turn-end', turn: data['turn'] } : null
  }
  if (candidate['type'] === 'user/message') {
    if (!isRecord(data['source'])) return null
    const source = data['source']
    return source['kind'] === 'user' && typeof source['rpcId'] === 'string'
      ? { kind: 'user-rpc', requestId: source['rpcId'] }
      : null
  }
  if (candidate['type'] === 'assistant/message') {
    const message = data['message']
    if (!isRecord(message) || !Array.isArray(message['content'])) return null
    const text = message['content']
      .filter((part): part is Record<string, unknown> => isRecord(part) && part['type'] === 'text')
      .map((part) => typeof part['text'] === 'string' ? part['text'] : '')
      .join('')
    return text === '' ? null : { kind: 'assistant-text', text }
  }
  if (candidate['type'] === 'tool/call') {
    if (typeof data['callId'] !== 'string' || typeof data['turn'] !== 'number' || typeof data['name'] !== 'string' || typeof data['arguments'] !== 'string') return null
    return { kind: 'tool-call', callId: data['callId'], turn: data['turn'], name: data['name'], args: objectOf(data['arguments']) }
  }
  if (candidate['type'] === 'tool/result') {
    const message = data['message']
    if (!isRecord(message) || !isRecord(message['source']) || typeof message['source']['callId'] !== 'string' || message['source']['callId'] === '') return null
    return {
      kind: 'tool-result',
      callId: message['source']['callId'],
      failed: message['isError'] === true || isRecord(data['error']),
      result: data['meta'],
    }
  }
  return null
}

function objectOf(text: string): Record<string, unknown> | null {
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
