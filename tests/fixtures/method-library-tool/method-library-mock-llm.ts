import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, ToolCallId, type GenerateOptions, type LlmResolvedModelInfo, type StreamChunk } from '@deepseek-ai/dsh-llm'
import { estimateMessage, estimateToolsTokens } from '@deepseek-ai/dsh-token-meter/estimate'

let callNumber = 0
let firstTurnMessageTokens: number | null = null
let firstTurnToolTokens: number | null = null

export function firstTurnInputEstimate(): { readonly messageTokens: number; readonly toolTokens: number } | null {
  return firstTurnMessageTokens === null || firstTurnToolTokens === null
    ? null
    : { messageTokens: firstTurnMessageTokens, toolTokens: firstTurnToolTokens }
}

function textOf(message: GenerateOptions['messages'][number]): string {
  if (message.role !== 'user') return ''
  return message.content.filter((part) => part.type === 'text').map((part) => part.text).join('')
}

class MethodLibraryMockAdapter extends LlmAdapter {
  override async resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return { provider, id: model, name: model }
  }

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    if (options.purpose === 'session-title') {
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: 'Method Library smoke' }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Method Library smoke' } }
      yield { type: 'finish', reason: { kind: 'stop' } }
      return
    }
    if (firstTurnMessageTokens === null) {
      firstTurnMessageTokens = options.messages.reduce((total, message) => total + estimateMessage(message), 0)
      firstTurnToolTokens = estimateToolsTokens({ tools: options.tools })
    }
    const last = options.messages.at(-1)
    if (last?.role === 'tool') {
      const text = 'Tool operation completed.'
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text }
      yield { type: 'block-end', index: 0, block: { type: 'text', text } }
      yield { type: 'finish', reason: { kind: 'stop' } }
      return
    }
    const prompt = options.messages.map(textOf).join('\n')
    const marker = prompt.split('\n').find((line) => line.startsWith('【方法库操作】'))
    if (marker === undefined) throw new Error('smoke mock received no operation marker')
    const operation: { operationId: string; action: string; name?: string; payloadHash?: string } = JSON.parse(marker.slice('【方法库操作】'.length))
    let name: string
    let args: Record<string, unknown>
    if (operation.action === 'save' || operation.action === 'save-and-set-default') {
      const entry = /```method-draft\n([\s\S]*?)\n```/.exec(prompt)?.[1]
      if (entry === undefined) throw new Error('smoke mock received no method-draft entry')
      const actualEntry = prompt.includes('【smoke-case】mutate-entry') ? `${entry}\n- 被修改: yes` : entry
      name = 'method_library_upsert'
      args = {
        operationId: operation.operationId,
        operationHash: operation.payloadHash,
        defaultAction: operation.action === 'save-and-set-default' ? 'set' : 'preserve',
        entry: actualEntry,
      }
    } else if (operation.action === 'set-default' || operation.action === 'clear-default') {
      name = 'method_library_set_default'
      args = {
        operationId: operation.operationId,
        action: operation.action === 'set-default' ? 'set' : 'clear',
        ...(operation.action === 'set-default' ? { name: operation.name } : {}),
      }
    } else if (operation.action === 'remove') {
      name = 'method_library_remove'
      args = { operationId: operation.operationId, name: operation.name }
    } else {
      throw new Error(`smoke mock does not support ${operation.action}`)
    }
    const argumentText = JSON.stringify(args)
    const callId = ToolCallId(`method-library-${String(++callNumber)}`)
    yield { type: 'block-start', index: 0, blockType: 'tool-call' }
    yield { type: 'tool-call-delta', index: 0, id: callId, name, argumentsDelta: argumentText }
    yield { type: 'block-end', index: 0, block: { type: 'tool-call', id: callId, name, arguments: argumentText } }
    yield { type: 'finish', reason: { kind: 'tool-calls' } }
  }
}

export const name = 'method-library-mock-llm'
export const inject = ['llm']

export function apply(ctx: Context): void {
  ctx.llm.registerAdapter(['method-library-test'], new MethodLibraryMockAdapter())
}
