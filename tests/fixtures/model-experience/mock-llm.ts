import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, type GenerateOptions, type LlmResolvedModelInfo, type StreamChunk } from '@deepseek-ai/dsh-llm'
import { estimateMessage, estimateToolsTokens } from '@deepseek-ai/dsh-token-meter/estimate'

// Deterministic mock LLM for Model Experience first-request pricing. It captures the
// real assembled GenerateOptions (messages + tools) of the first non-title request after
// each reset, then answers a plain research question with a stop (no tool call). Pricing
// uses DSH's fixed-density estimator on the captured request, not a hand-assembled fixture.

let messageTokens: number | null = null
let toolTokens: number | null = null

/** Drop the captured first request so the next role's first request is priced separately. */
export function resetCapture(): void {
  messageTokens = null
  toolTokens = null
}

/** The captured first-request estimate, or null when no request has been captured since reset. */
export function firstTurnInputEstimate(): { readonly messageTokens: number; readonly toolTokens: number } | null {
  return messageTokens === null || toolTokens === null ? null : { messageTokens, toolTokens }
}

class ModelExperienceMockAdapter extends LlmAdapter {
  override async resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return { provider, id: model, name: model }
  }

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    if (options.purpose === 'session-title') {
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: 'Model Experience smoke' }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Model Experience smoke' } }
      yield { type: 'finish', reason: { kind: 'stop' } }
      return
    }
    if (messageTokens === null) {
      messageTokens = options.messages.reduce((total, message) => total + estimateMessage(message), 0)
      toolTokens = estimateToolsTokens({ tools: options.tools })
    }
    const text = '已收到研究请求。'
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

export const name = 'model-experience-mock-llm'
export const inject = ['llm']

export function apply(ctx: Context): void {
  ctx.llm.registerAdapter(['model-experience-test'], new ModelExperienceMockAdapter())
}
