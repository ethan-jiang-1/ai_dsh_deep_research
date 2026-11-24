/**
 * 方法库写库工具卡：`method_library_upsert` 在对话流里显示成一句人话（"已写入库：name"），
 * 不暴露原始工具参数。纯展示；卡片状态来自 toolview 槽的 call/result 切片。
 */
import type { ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { cardStateOf, parseArgsObject, stringFieldOfArgsRaw } from '../lib/events/tool-card.ts'
import { METHOD_LIBRARY_DEFAULT, METHOD_LIBRARY_REMOVE } from './keys.ts'

type MethodLibraryToolCardProps = ToolCallViewProps & PropsLocale<'deepResearchPack'>

/**
 * 方法库写库卡。
 * @param props - toolview 槽 props。
 * @returns 卡片。
 */
export function MethodLibraryToolCard(props: MethodLibraryToolCardProps): ReactNode {
  const state = cardStateOf(props.block)
  const settled = 'kind' in props.block
  const source = settled ? props.block.call : props.block
  const argsRaw = (source !== undefined && source !== null && 'argsRaw' in source ? source.argsRaw : undefined) ?? ''
  const args = parseArgsObject(argsRaw) as { entry?: unknown; action?: unknown; name?: unknown } | null
  const entry = typeof args?.entry === 'string' ? args.entry : ''
  const removing = props.toolName === METHOD_LIBRARY_REMOVE
  const defaulting = props.toolName === METHOD_LIBRARY_DEFAULT
  // 名称来源按工具契约取：remove/set_default 的入参是 `{ name }`（没有 entry 正文），
  // 只有 upsert 的 entry 才带 `## 标题`——用 entry 取 remove 名会恒空退化成「方法条目」（BUG-400）。
  // 运行态入参是流式前缀（parseArgsObject 返回 null），字段从原文尽力提取（BUG-411）。
  const nameField = typeof args?.name === 'string' ? args.name.trim() : (stringFieldOfArgsRaw(argsRaw, 'name') ?? '')
  const name = removing
    ? nameField
    : (/^##\s+(.+?)(?:（|〔|\n|$)/m.exec(entry)?.[1]?.trim() ?? '')
  // 动作三态：只有真读到 set/clear 才指方向；读不到 = 未知（中性文案），绝不冒充一个方向。
  const rawAction = args?.action === 'set' || args?.action === 'clear' ? args.action : stringFieldOfArgsRaw(argsRaw, 'action')
  const defaultAction: 'set' | 'clear' | null = rawAction === 'set' ? 'set' : rawAction === 'clear' ? 'clear' : null
  const target = name === '' ? props.t('methodEntries') : name
  const label = state === 'running'
    ? removing ? props.t('toolRemoveRunning') : defaulting
      ? props.t(defaultAction === 'set' ? 'toolDefaultSetRunning' : defaultAction === 'clear' ? 'toolDefaultClearRunning' : 'toolDefaultRunning')
      : props.t('toolSaveRunning')
    : state === 'ok' ? removing ? props.t('toolRemoveDone', { name: target }) : defaulting
      ? props.t(defaultAction === 'set' ? 'toolDefaultSetDone' : 'toolDefaultClearDone', { name: nameField })
      : props.t('toolSaveDone', { name: target })
    : removing ? props.t('toolRemoveFailed') : defaulting ? props.t('toolDefaultFailed') : props.t('toolSaveFailed')
  return (
    <div
      data-method-library-tool=""
      style={{ border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 6, padding: '6px 10px', margin: '4px 0', fontSize: 13, background: 'var(--dsw-alias-bg-layer-1)' }}
    >
      <span style={{ color: state === 'ok' ? 'var(--dsw-alias-brand-primary)' : state === 'error' ? 'var(--dsw-alias-label-error)' : 'var(--dsw-alias-label-secondary)', fontWeight: 600 }}>
        {state === 'running' ? '…' : state === 'ok' ? '✓' : '✗'}
      </span>
      <span style={{ marginLeft: 6 }}>{label}</span>
    </div>
  )
}
