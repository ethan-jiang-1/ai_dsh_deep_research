/**
 * 方法库写库工具卡：`method_library_upsert` 在对话流里显示成一句人话（"已写入库：name"），
 * 不暴露原始工具参数。纯展示；卡片状态来自 toolview 槽的 call/result 切片。
 */
import type { ReactNode } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { cardStateOf, parseArgsObject } from '../lib/tool-card.ts'
import { METHOD_LIBRARY_REMOVE } from './keys.ts'

/**
 * 方法库写库卡。
 * @param props - toolview 槽 props。
 * @returns 卡片。
 */
export function MethodLibraryToolCard(props: ToolCallViewProps): ReactNode {
  const state = cardStateOf(props.block)
  const settled = 'kind' in props.block
  const source = settled ? props.block.call : props.block
  const argsRaw = (source !== undefined && source !== null && 'argsRaw' in source ? source.argsRaw : undefined) ?? ''
  const args = parseArgsObject(argsRaw) as { entry?: unknown } | null
  const entry = typeof args?.entry === 'string' ? args.entry : ''
  const name = /^##\s+(.+?)(?:（|〔|\n|$)/m.exec(entry)?.[1]?.trim() ?? ''
  const removing = props.toolName === METHOD_LIBRARY_REMOVE
  const target = name === '' ? '方法条目' : name
  const label = state === 'running'
    ? (removing ? '正在删除…' : '正在写入方法库…')
    : state === 'ok' ? (removing ? `已删除库：${target}` : `已写入库：${target}`) : (removing ? '删除失败' : '写库失败')
  return (
    <div
      data-method-library-tool=""
      style={{ border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', margin: '4px 0', fontSize: 13 }}
    >
      <span style={{ color: state === 'ok' ? '#2a2' : state === 'error' ? '#b00' : '#888', fontWeight: 600 }}>
        {state === 'running' ? '…' : state === 'ok' ? '✓' : '✗'}
      </span>
      <span style={{ marginLeft: 6 }}>{label}</span>
    </div>
  )
}
