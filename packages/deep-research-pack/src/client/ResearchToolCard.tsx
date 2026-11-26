/**
 * 研究语义工具卡（S2）：把 `spawn_teammate`（组队动作）、`web_search`（检索动作）、
 * `web_fetch`（抓取动作）与 `subagent`（子代理委派）在对话流里渲染为 DSH 原生 DisclosureRow + StateDot 卡。
 *
 * 纯函数展示模型住 `tool-card 折算件`；组件薄渲染。
 * ⚠ keyed 槽 key 域开放（拼错不报错、永不渲染）：key 必须与 wire 工具名逐字一致；
 * priority -1 压过 vendor 的通用明细行（rc.2 同键同优先级会 throw）。
 */
import { useState, type ReactNode } from 'react'
import { DisclosureRow, StateDot, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { cardStateOf, cardTitleOf, parseArgsObject } from '../lib/events/tool-card.ts'
import css from './ResearchToolCard.module.css'

/** 槽标准 props + 本包 locale 座（工具卡标题走字典）。 */
type ResearchToolCardProps = ToolCallViewProps & PropsLocale<'deepResearchPack'>

const DOT_STATE: Record<string, StateDotState | undefined> = {
  running: 'ongoing',
  ok: 'done',
  error: 'error',
  stopped: 'warning',
}

/**
 * 研究语义工具卡体。
 * @param props - toolview 槽 props（call/result 切片）。
 * @returns 卡片。
 */
export function ResearchToolCard(props: ResearchToolCardProps): ReactNode {
  const [open, setOpen] = useState(false)
  const state = cardStateOf(props.block)
  const unknown = state === 'stopped'
  // rc.2：PreparingToolCall（参数未到）没有 argsRaw，只有 StartedToolCall 有 ⇒ 收窄后读；未到按空串。
  const settled = 'kind' in props.block
  const source = settled ? props.block.call : props.block
  const argsRaw = (source !== undefined && source !== null && 'argsRaw' in source ? source.argsRaw : undefined) ?? ''
  const title = unknown
    ? props.t('toolOutcomeUnknown')
    : cardTitleOf(props.toolName, parseArgsObject(argsRaw), argsRaw, props.t)
  const previewDetail = argsRaw.trim()
  const expandable = previewDetail !== ''
  return (
    <div className={css.card} data-tool-name={props.toolName} data-tool-state={state}>
      <DisclosureRow
        icon={<StateDot state={DOT_STATE[state] ?? 'warning'} />}
        title={title}
        open={open}
        expandable={expandable}
        running={state === 'running'}
        expandOnRowClick={expandable}
        onToggle={() => setOpen((current) => !current)}
      >
        {expandable ? <pre className={css.argsPre}>{previewDetail.slice(0, 600)}</pre> : null}
      </DisclosureRow>
    </div>
  )
}
