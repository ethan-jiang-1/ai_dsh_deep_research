/**
 * 研究语义工具卡（S2）：把 `spawn_teammate`（组队动作）与 `web_search`（检索动作）在对话流里
 * 渲染成研究语义的卡——"不讲解也能看懂"最便宜的一招（company TeamToolCard 同款教义）。
 * 纯函数展示模型住 `src/lib/tool-card.ts`；组件薄渲染。
 *
 * ⚠ keyed 槽 key 域开放（拼错不报错、永不渲染）：key 必须与 wire 工具名逐字一致；
 * priority -1 压过 vendor 的通用明细行（rc.2 同键同优先级会 throw——company UX 实验实证）。
 */
import type { ReactNode } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { cardStateOf, cardTitleOf, parseArgsObject } from '../lib/tool-card.ts'

/** 官方工具名（wire 注册名）——tool.call.toolview 的 keyed key，逐字一致。 */
export const RESEARCH_TOOL_KEYS = ['spawn_teammate', 'web_search'] as const

/** 状态色（薄渲染：不引平台组件，纯 style——观察面用途，D18 边界内）。 */
const STATE_COLOR: Record<string, string> = { running: '#888', ok: '#2a2', error: '#b00', stopped: '#888' }

/**
 * 研究语义工具卡体。
 * @param props - toolview 槽 props（call/result 切片）。
 * @returns 卡片。
 */
export function ResearchToolCard(props: ToolCallViewProps): ReactNode {
  const state = cardStateOf(props.block)
  // rc.2：PreparingToolCall（参数未到）没有 argsRaw，只有 StartedToolCall 有 ⇒ 收窄后读；未到按空串。
  const settled = 'kind' in props.block
  const source = settled ? props.block.call : props.block
  const argsRaw = (source !== undefined && source !== null && 'argsRaw' in source ? source.argsRaw : undefined) ?? ''
  const title = cardTitleOf(props.toolName, parseArgsObject(argsRaw), argsRaw)
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', margin: '4px 0', fontSize: 13 }}>
      <span style={{ color: STATE_COLOR[state], fontWeight: 600 }}>{state === 'running' ? '…' : state === 'ok' ? '✓' : '✗'}</span>
      <span style={{ marginLeft: 6 }}>{title}</span>
    </div>
  )
}
