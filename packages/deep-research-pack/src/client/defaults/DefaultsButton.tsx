/**
 * client/defaults/DefaultsButton — composer 左侧的「研究默认」状态按钮（D50）。
 *
 * 文案是当前状态（自动 / 方法 X / 已设 N 项 / 需检查），不是「设置」；点击打开现有
 * 「研究配置」页签的「项目默认」块。无 session 不渲染（槽本身 session scope）。
 */
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { defaultsButtonState } from '../../lib/research-defaults.ts'
import { AUTHORITY_LABEL, DEPTH_LABEL, FAMILY_LABEL, RECENCY_LABEL, SHAPE_LABEL } from './labels.ts'
import { useDefaults, type DefaultsSnapshot, type DefaultsStore } from './store.ts'

/** 注入面：会话 + 同一份 store + 打开配置页签的闭包。 */
export interface DefaultsButtonInjected {
  readonly sessionId: SessionId
  readonly store: DefaultsStore
  readonly openConfig: () => void
}

/** 按钮 props。 */
export type DefaultsButtonProps =
  PropsRuntime<'conversation.input.left'>
  & PropsLocale<'deepResearchPack'>
  & DefaultsButtonInjected

function tooltipOf(
  state: DefaultsSnapshot,
  t: DefaultsButtonProps['t'],
): string {
  const lines: string[] = []
  if (state.methodDefault !== null) lines.push(t('defaultsTooltipMethod', { name: state.methodDefault }))
  if (state.value.effort !== undefined) lines.push(t('defaultsTooltipEffort', { value: t(DEPTH_LABEL[state.value.effort]) }))
  const output = state.value.output
  if (output !== undefined) {
    const shape = output.shape === undefined ? t('defaultsShapeAuto') : t(SHAPE_LABEL[output.shape])
    const audience = output.audience === undefined ? '' : ` · ${output.audience}`
    lines.push(t('defaultsTooltipOutput', { value: `${shape}${audience}` }))
  }
  const source = state.value.source
  if (source !== undefined) {
    const parts: string[] = []
    if (source.families !== undefined) parts.push(source.families.map((family) => t(FAMILY_LABEL[family])).join(', '))
    if (source.authority !== undefined) parts.push(t(AUTHORITY_LABEL[source.authority]))
    if (source.recency !== undefined) parts.push(t(RECENCY_LABEL[source.recency]))
    if (parts.length > 0) lines.push(t('defaultsTooltipSource', { value: parts.join(' · ') }))
  }
  if (lines.length === 0) return t('defaultsTooltipAuto')
  lines.push(t('defaultsTooltipNotConstraint'))
  return lines.join('\n')
}

/**
 * 状态按钮。
 * @param props - slot props + locale + 注入面。
 * @returns 按钮或无（loading 也渲染 loading 态）。
 */
export function DefaultsButton(props: DefaultsButtonProps): ReactNode {
  const state = useDefaults(props.store, props.sessionId)
  const button = defaultsButtonState({
    value: state.value,
    methodDefault: state.methodDefault,
    problems: state.problems,
  })
  const loading = state.phase === 'loading'
  const invalid = state.phase === 'unreadable' || state.problems.length > 0
  const label = loading
    ? props.t('defaultsButtonLoading')
    : invalid
      ? props.t('defaultsButtonInvalid')
      : button.kind === 'method' && button.methodDefault !== null
        ? props.t('defaultsButtonMethod', { name: button.methodDefault })
        : button.kind === 'count'
          ? props.t('defaultsButtonCount', { count: button.count })
          : props.t('defaultsButtonAuto')
  const warn = state.warnings.map((item) => `${item.field}:${item.code}`).join('\n')
  const tooltip = loading
    ? props.t('defaultsTooltipAuto')
    : invalid
      ? state.problems.map((item) => `${item.field}:${item.code}`).join('\n')
      : (warn === '' ? tooltipOf(state, props.t) : `${tooltipOf(state, props.t)}\n${props.t('defaultsWarnings', { detail: warn })}`)
  const active = !loading && !invalid && (button.kind === 'method' || button.kind === 'count')
  return (
    <button
      type="button"
      data-testid="deep-research-defaults"
      data-defaults-state={loading ? 'loading' : invalid ? 'invalid' : button.kind}
      aria-label={tooltip === '' ? label : `${label} — ${tooltip}`}
      title={tooltip}
      onClick={props.openConfig}
      style={{
        height: 26,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 8px',
        borderRadius: 13,
        border: `1px solid ${active ? 'var(--dsh-accent, #93c5fd)' : 'var(--dsh-border, #d1d5db)'}`,
        background: active ? 'color-mix(in srgb, var(--dsh-accent, #2563eb) 10%, transparent)' : 'transparent',
        color: active ? 'var(--dsh-accent, #1d4ed8)' : 'var(--dsh-text-secondary, #374151)',
        fontSize: 12,
        lineHeight: 1,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        maxWidth: 220,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ flex: '0 0 auto' }}>
        <path d="M1 3h10M1 6h10M1 9h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="3.5" cy="3" r="1.4" fill="currentColor" />
        <circle cx="7" cy="6" r="1.4" fill="currentColor" />
        <circle cx="4.5" cy="9" r="1.4" fill="currentColor" />
      </svg>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  )
}
