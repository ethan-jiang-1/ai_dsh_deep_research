/**
 * client/defaults/DefaultsPanel — 「研究配置」页签顶部的「项目默认」块（D50）。
 *
 * 方法行只读（默认住方法库）；深度/输出/来源可改；无保存按钮：select 变更即发 host command，
 * 文本框 blur/Enter 发送；按钮与面板共用 `DefaultsStore`。自动 = 字段省略 = Lead 判断。
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  AUTHORITIES, OUTPUT_SHAPES, RECENCIES, SOURCE_FAMILIES,
  type Authority, type DefaultsAxis, type DefaultsPatch, type EffortBand,
  type OutputShape, type Recency, type SourceFamily,
} from '../../lib/research-defaults.ts'
import type { PackTranslate } from '../../lib/i18n.ts'
import { useDefaults, type DefaultsSnapshot, type DefaultsStore } from './store.ts'
import { AUTHORITY_LABEL, FAMILY_LABEL, RECENCY_LABEL, SHAPE_LABEL } from './labels.ts'

/** 面板 props：由 ResearchConfigTab 注入。 */
export interface DefaultsPanelProps {
  readonly sessionId: SessionId
  readonly store: DefaultsStore
  readonly t: PackTranslate
}

const label: CSSProperties = { fontSize: 11.5, color: 'var(--dsh-text-secondary, #6b7280)' }
const control: CSSProperties = {
  height: 30,
  borderRadius: 6,
  border: '1px solid var(--dsh-border, #d1d5db)',
  background: 'var(--dsh-surface, #ffffff)',
  color: 'var(--dsh-text, #111827)',
  fontSize: 12.5,
  padding: '0 6px',
  minWidth: 0,
}
const row: CSSProperties = { display: 'grid', gridTemplateColumns: '52px 1fr', gap: 8, alignItems: 'center' }
const hint: CSSProperties = { fontSize: 10.5, color: 'var(--dsh-text-tertiary, #9ca3af)', marginTop: 2 }

function chipStyle(selected: boolean, disabled: boolean): CSSProperties {
  return {
    height: 26,
    padding: '0 9px',
    borderRadius: 13,
    border: `1px solid ${selected ? 'var(--dsh-accent, #93c5fd)' : 'var(--dsh-border, #d1d5db)'}`,
    background: selected ? 'color-mix(in srgb, var(--dsh-accent, #2563eb) 10%, transparent)' : 'transparent',
    color: selected ? 'var(--dsh-accent, #1d4ed8)' : 'var(--dsh-text-secondary, #4b5563)',
    fontSize: 11.5,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }
}

function sourcePatch(
  families: readonly SourceFamily[] | undefined,
  authority: Authority | undefined,
  recency: Recency | undefined,
): NonNullable<DefaultsPatch['source']> {
  return {
    ...families === undefined || families.length === 0 ? {} : { families },
    ...authority === undefined ? {} : { authority },
    ...recency === undefined ? {} : { recency },
  }
}

function hasSource(patch: NonNullable<DefaultsPatch['source']>): boolean {
  return patch.families !== undefined || patch.authority !== undefined || patch.recency !== undefined
}

function receiptOf(state: DefaultsSnapshot, t: PackTranslate): { tone: 'ok' | 'warn' | 'error'; text: string } | null {
  const outcome = state.outcome
  if (outcome === null) return null
  if (outcome.kind === 'ok') return { tone: 'ok', text: t('defaultsSaved', { revision: outcome.revision ?? state.revision }) }
  if (outcome.code === 'stale') return { tone: 'warn', text: t('defaultsStale') }
  if (outcome.code === 'io') return { tone: 'error', text: t('defaultsIoError', { detail: outcome.detail ?? '' }) }
  if (outcome.code === 'invalid') return { tone: 'error', text: t('defaultsInvalidField') }
  return { tone: 'error', text: outcome.detail ?? outcome.code ?? '' }
}

/**
 * 项目默认块。
 * @param props - session + store + t。
 * @returns 面板。
 */
export function DefaultsPanel({ sessionId, store, t }: DefaultsPanelProps): ReactNode {
  const state = useDefaults(store, sessionId)
  const [audience, setAudience] = useState(state.value.output?.audience ?? '')
  const [confirmClear, setConfirmClear] = useState(false)
  useEffect(() => {
    setAudience(state.value.output?.audience ?? '')
  }, [state.value.output?.audience])
  const busy = state.pending || state.phase === 'loading'
  const output = state.value.output
  const shape = output?.shape
  const source = state.value.source
  const families = source?.families ?? []
  const authority = source?.authority
  const recency = source?.recency
  const problems = state.problems
  const warnings = state.warnings
  const receipt = receiptOf(state, t)

  const apply = (patch: DefaultsPatch): void => { void store.setPatch(sessionId, patch) }
  const unset = (fields: readonly DefaultsAxis[]): void => { void store.unset(sessionId, fields) }
  const applySource = (nextFamilies: readonly SourceFamily[] | undefined, nextAuthority: Authority | undefined, nextRecency: Recency | undefined): void => {
    const patch = sourcePatch(nextFamilies, nextAuthority, nextRecency)
    if (!hasSource(patch)) unset(['source'])
    else apply({ source: patch })
  }
  const commitAudience = (): void => {
    const next = audience.trim()
    if (next === '') {
      if (shape === undefined) unset(['output'])
      else apply({ output: { shape } })
      return
    }
    apply({ output: { ...shape === undefined ? {} : { shape }, audience: next } })
  }
  const changeFamilies = (family: SourceFamily): void => {
    const next = families.includes(family) ? families.filter((item) => item !== family) : [...families, family]
    applySource(next.length === 0 ? undefined : next, authority, recency)
  }
  const methodText = state.methodConflict
    ? t('defaultsMethodConflict')
    : state.methodRead === 'error'
      ? t('defaultsMethodUnreadable')
      : state.methodDefault === null
        ? t('defaultsMethodAuto')
        : t('defaultsMethodFollow', { name: state.methodDefault })

  return (
    <section data-testid="defaults-panel" data-defaults-revision={state.revision} data-defaults-pending={busy} style={{ display: 'grid', gap: 9, padding: '10px 0 12px', borderBottom: '1px solid var(--dsh-border, #eef0f3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <strong style={{ fontSize: 13 }}>{t('defaultsTitle')}</strong>
        <span style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 9, background: 'color-mix(in srgb, var(--dsh-accent, #2563eb) 10%, transparent)', color: 'var(--dsh-accent, #1d4ed8)' }}>{t('defaultsBadge')}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--dsh-text-tertiary, #9ca3af)' }}>v{state.revision}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--dsh-text-tertiary, #9ca3af)' }}>{t('defaultsSubtitle')}</div>

      {problems.length > 0 ? (
        <div role="alert" style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
          {t('defaultsInvalidBanner', { detail: problems.map((item) => `${item.field}:${item.code}`).join('; ') })}
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div role="status" data-testid="defaults-warnings" style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
          {t('defaultsWarnings', { detail: warnings.map((item) => `${item.field}:${item.code}`).join('; ') })}
        </div>
      ) : null}

      <div style={row}>
        <span style={label}>{t('defaultsMethod')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span data-testid="defaults-method" style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{methodText}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--dsh-accent, #2563eb)', whiteSpace: 'nowrap' }} title={t('defaultsMethodHint')}>{t('defaultsMethodLibraryLink')}</span>
        </div>
        <span /><span style={hint}>{t('defaultsMethodHint')}</span>
      </div>

      <div style={row}>
        <span style={label}>{t('defaultsDepth')}</span>
        <select
          data-testid="defaults-depth"
          aria-label={t('defaultsDepth')}
          value={state.value.effort ?? 'auto'}
          disabled={busy}
          onChange={(event) => {
            const value = event.currentTarget.value
            if (value === 'auto') unset(['effort'])
            else apply({ effort: value as EffortBand })
          }}
          style={control}
        >
          <option value="auto">{t('defaultsDepthAuto')}</option>
          <option value="quick">{t('defaultsDepthQuick')}</option>
          <option value="standard">{t('defaultsDepthStandard')}</option>
          <option value="deep">{t('defaultsDepthDeep')}</option>
        </select>
        <span /><span style={hint}>{t('defaultsDepthHint')}</span>
      </div>

      <div style={row}>
        <span style={label}>{t('defaultsOutput')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <select
            data-testid="defaults-output-shape"
            aria-label={t('defaultsOutput')}
            value={shape ?? 'auto'}
            disabled={busy}
            onChange={(event) => {
              const value = event.currentTarget.value
              if (value === 'auto') {
                if (output?.audience === undefined) unset(['output'])
                else apply({ output: { audience: output.audience } })
                return
              }
              apply({ output: { shape: value as OutputShape, ...output?.audience === undefined ? {} : { audience: output.audience } } })
            }}
            style={{ ...control, flex: '0 0 150px' }}
          >
            <option value="auto">{t('defaultsShapeAuto')}</option>
            {OUTPUT_SHAPES.map((item) => <option key={item} value={item}>{t(SHAPE_LABEL[item])}</option>)}
          </select>
          <span style={{ ...label, whiteSpace: 'nowrap' }}>{t('defaultsAudience')}</span>
          <input
            data-testid="defaults-audience"
            aria-label={t('defaultsAudience')}
            placeholder={t('defaultsAudiencePlaceholder')}
            value={audience}
            disabled={busy}
            maxLength={200}
            onChange={(event) => setAudience(event.currentTarget.value)}
            onBlur={commitAudience}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              event.currentTarget.blur()
            }}
            style={{ ...control, flex: '1 1 auto', minWidth: 0 }}
          />
        </div>
      </div>

      <div style={row}>
        <span style={label}>{t('defaultsSource')}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          {SOURCE_FAMILIES.map((family) => (
            <button
              key={family}
              type="button"
              data-testid={`defaults-source-${family}`}
              aria-pressed={families.includes(family)}
              aria-label={t(FAMILY_LABEL[family])}
              disabled={busy}
              onClick={() => changeFamilies(family)}
              style={chipStyle(families.includes(family), busy)}
            >
              {t(FAMILY_LABEL[family])}
            </button>
          ))}
          <button
            type="button"
            data-testid="defaults-source-auto"
            disabled={busy}
            onClick={() => unset(['source'])}
            style={{ border: 'none', background: 'transparent', color: 'var(--dsh-text-tertiary, #9ca3af)', fontSize: 10.5, cursor: busy ? 'not-allowed' : 'pointer', padding: '0 2px' }}
          >
            {t('defaultsSourceAuto')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingLeft: 60 }}>
        <span style={label}>{t('defaultsAuthority')}</span>
        <select
          data-testid="defaults-authority"
          aria-label={t('defaultsAuthority')}
          value={authority ?? 'auto'}
          disabled={busy}
          onChange={(event) => {
            const value = event.currentTarget.value
            applySource(families.length === 0 ? undefined : families, value === 'auto' ? undefined : value as Authority, recency)
          }}
          style={{ ...control, flex: '0 0 128px' }}
        >
          <option value="auto">{t('defaultsAuthorityAuto')}</option>
          {AUTHORITIES.map((item) => <option key={item} value={item}>{t(AUTHORITY_LABEL[item])}</option>)}
        </select>
        <span style={{ ...label, marginLeft: 4 }}>{t('defaultsRecency')}</span>
        <select
          data-testid="defaults-recency"
          aria-label={t('defaultsRecency')}
          value={recency ?? 'auto'}
          disabled={busy}
          onChange={(event) => {
            const value = event.currentTarget.value
            applySource(families.length === 0 ? undefined : families, authority, value === 'auto' ? undefined : value as Recency)
          }}
          style={{ ...control, flex: '1 1 auto', minWidth: 0 }}
        >
          <option value="auto">{t('defaultsRecencyAuto')}</option>
          {RECENCIES.map((item) => <option key={item} value={item}>{t(RECENCY_LABEL[item])}</option>)}
        </select>
      </div>

      {receipt !== null ? (
        <div
          role="status"
          data-testid="defaults-receipt"
          style={{
            fontSize: 11,
            padding: '5px 8px',
            borderRadius: 6,
            background: receipt.tone === 'ok' ? '#ecfdf5' : receipt.tone === 'warn' ? '#fffbeb' : '#fef2f2',
            border: `1px solid ${receipt.tone === 'ok' ? '#bbf7d0' : receipt.tone === 'warn' ? '#fde68a' : '#fecaca'}`,
            color: receipt.tone === 'ok' ? '#15803d' : receipt.tone === 'warn' ? '#b45309' : '#b91c1c',
          }}
        >
          {receipt.text}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          data-testid="defaults-clear"
          disabled={busy}
          onClick={() => {
            if (!confirmClear) { setConfirmClear(true); return }
            setConfirmClear(false)
            void store.clear(sessionId)
          }}
          style={{ border: 'none', background: 'transparent', color: '#b91c1c', fontSize: 11, cursor: busy ? 'not-allowed' : 'pointer', padding: 0 }}
        >
          {t(confirmClear ? 'defaultsClearConfirm' : 'defaultsClear')}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--dsh-text-tertiary, #9ca3af)' }}>{t('defaultsFooterSave')}</span>
      </div>
      <div style={{ display: 'grid', gap: 1, fontSize: 10.5, color: 'var(--dsh-text-tertiary, #9ca3af)', paddingTop: 2 }}>
        <span>{t('defaultsFooterAuto')}</span>
        <span>{t('defaultsFooterScope')}</span>
      </div>
    </section>
  )
}
