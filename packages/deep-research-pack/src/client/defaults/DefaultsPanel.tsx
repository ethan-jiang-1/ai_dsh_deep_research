/**
 * client/defaults/DefaultsPanel — 「研究配置」页签顶部的「项目默认」块（D50）。
 *
 * 方法行只读（默认住方法库）；深度/输出/来源可改；无保存按钮：select 变更即发 host command，
 * 文本框 blur/Enter 发送；按钮与面板共用 `DefaultsStore`。自动 = 字段省略 = Lead 判断。
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Button, Input, Pill, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  AUTHORITIES, OUTPUT_SHAPES, RECENCIES, SOURCE_FAMILIES,
  type Authority, type DefaultsAxis, type DefaultsPatch, type EffortBand,
  type OutputShape, type Recency, type SourceFamily,
} from '../../lib/workspace/research-defaults.ts'
import type { PackTranslate } from '../../lib/shared/i18n.ts'
import { useDefaults, type DefaultsSnapshot, type DefaultsStore } from './store.ts'
import { AUTHORITY_LABEL, FAMILY_LABEL, RECENCY_LABEL, SHAPE_LABEL } from './labels.ts'
import { SelectMenu } from './SelectMenu.tsx'
import css from './defaults.module.css'

/** 面板 props：由 ResearchConfigTab 或 ResearchHubPanel 注入。 */
export interface DefaultsPanelProps {
  readonly sessionId: SessionId
  readonly store: DefaultsStore
  readonly t: PackTranslate
  /** 点击「方法库 ›」跳转到研究工作台方法库页签；缺席时不渲染可点入口（BUG-452）。 */
  readonly onOpenMethodLibrary?: () => void
  /** 宽屏双列紧凑排版（供全局研究工作台顶部使用）。 */
  readonly layout?: 'vertical' | 'compact'
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
export function DefaultsPanel({ sessionId, store, t, onOpenMethodLibrary, layout = 'vertical' }: DefaultsPanelProps): ReactNode {
  const compact = layout === 'compact'
  const state = useDefaults(store, sessionId)
  const [audience, setAudience] = useState(state.value.output?.audience ?? '')
  const [confirmClear, setConfirmClear] = useState(false)
  useEffect(() => {
    setAudience(state.value.output?.audience ?? '')
  }, [sessionId, state.value.output?.audience])
  // 二次确认是**本会话的**瞬态：切 sessionId 必须复位，否则 B 会话首点即清空 B 的研究默认（BUG-399）。
  useEffect(() => {
    setConfirmClear(false)
  }, [sessionId])
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
    if (next === (state.value.output?.audience ?? '')) {
      if (audience !== next) setAudience(next)
      return
    }
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
    <section
      data-testid="defaults-panel"
      data-defaults-revision={state.revision}
      data-defaults-pending={busy}
      className={`${css.panel}${compact ? ` ${css.panelCompact}` : ''}`}
    >
      <div className={css.headerRow}>
        <strong className={css.title}>{t('defaultsTitle')}</strong>
        <Tag tone="info">{t('defaultsBadge')}</Tag>
        {compact && <span className={css.subtitleInline}>{t('defaultsSubtitle')}</span>}
        <span className={css.revision}>v{state.revision}</span>
      </div>
      {!compact && <div className={css.subtitle}>{t('defaultsSubtitle')}</div>}

      {problems.length > 0 ? (
        <div role="alert" className={css.bannerError}>
          {t('defaultsInvalidBanner', { detail: problems.map((item) => `${item.field}:${item.code}`).join('; ') })}
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div role="status" data-testid="defaults-warnings" className={css.bannerWarn}>
          {t('defaultsWarnings', { detail: warnings.map((item) => `${item.field}:${item.code}`).join('; ') })}
        </div>
      ) : null}

      <div className={compact ? css.compactGrid : css.verticalStack}>
        <div className={css.row}>
          <span className={css.label}>{t('defaultsMethod')}</span>
          <div className={css.rowFlex}>
            <span data-testid="defaults-method" className={css.methodText}>{methodText}</span>
            {onOpenMethodLibrary !== undefined && (
              <button
                type="button"
                data-testid="defaults-method-library-link"
                className={css.methodLink}
                title={t('defaultsMethodHint')}
                onClick={onOpenMethodLibrary}
              >
                {t('defaultsMethodLibraryLink')}
              </button>
            )}
          </div>
          {!compact && <><span /><span className={css.hint}>{t('defaultsMethodHint')}</span></>}
        </div>

        <div className={css.row}>
          <span className={css.label}>{t('defaultsDepth')}</span>
          <SelectMenu
            testId="defaults-depth"
            ariaLabel={t('defaultsDepth')}
            value={state.value.effort ?? 'auto'}
            disabled={busy}
            options={[
              { value: 'auto', label: t('defaultsDepthAuto') },
              { value: 'quick', label: t('defaultsDepthQuick') },
              { value: 'standard', label: t('defaultsDepthStandard') },
              { value: 'deep', label: t('defaultsDepthDeep') },
            ]}
            onChange={(value) => {
              if (value === 'auto') unset(['effort'])
              else apply({ effort: value as EffortBand })
            }}
          />
          {!compact && <><span /><span className={css.hint}>{t('defaultsDepthHint')}</span></>}
        </div>

        <div className={css.row}>
          <span className={css.label}>{t('defaultsOutput')}</span>
          <div className={css.rowFlex}>
            <SelectMenu
              testId="defaults-output-shape"
              ariaLabel={t('defaultsOutput')}
              value={shape ?? 'auto'}
              disabled={busy}
              className={css.controlFixed}
              options={[
                { value: 'auto', label: t('defaultsShapeAuto') },
                ...OUTPUT_SHAPES.map((item) => ({ value: item, label: t(SHAPE_LABEL[item]) })),
              ]}
              onChange={(value) => {
                if (value === 'auto') {
                  if (output?.audience === undefined) unset(['output'])
                  else apply({ output: { audience: output.audience } })
                  return
                }
                apply({ output: { shape: value as OutputShape, ...output?.audience === undefined ? {} : { audience: output.audience } } })
              }}
            />
            <span className={css.labelNowrap}>{t('defaultsAudience')}</span>
            <Input
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
              className={css.controlGrow ?? ''}
            />
          </div>
        </div>

        <div className={css.row}>
          <span className={css.label}>{t('defaultsSource')}</span>
          <div className={css.rowWrap}>
            {SOURCE_FAMILIES.map((family) => {
              const selected = families.includes(family)
              return (
                <Pill
                  key={family}
                  active={selected}
                  data-testid={`defaults-source-${family}`}
                  aria-pressed={selected}
                  aria-label={t(FAMILY_LABEL[family])}
                  disabled={busy}
                  onClick={() => changeFamilies(family)}
                >
                  {t(FAMILY_LABEL[family])}
                </Pill>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              data-testid="defaults-source-auto"
              disabled={busy}
              onClick={() => applySource(undefined, authority, recency)}
            >
              {t('defaultsSourceAuto')}
            </Button>
          </div>
        </div>

        <div className={compact ? css.subRowCompact : css.subRow}>
          <span className={css.label}>{t('defaultsAuthority')}</span>
          <SelectMenu
            testId="defaults-authority"
            ariaLabel={t('defaultsAuthority')}
            value={authority ?? 'auto'}
            disabled={busy}
            className={css.controlAuthority}
            options={[
              { value: 'auto', label: t('defaultsAuthorityAuto') },
              ...AUTHORITIES.map((item) => ({ value: item, label: t(AUTHORITY_LABEL[item]) })),
            ]}
            onChange={(value) => {
              applySource(families.length === 0 ? undefined : families, value === 'auto' ? undefined : value as Authority, recency)
            }}
          />
          <span className={css.labelSpaced}>{t('defaultsRecency')}</span>
          <SelectMenu
            testId="defaults-recency"
            ariaLabel={t('defaultsRecency')}
            value={recency ?? 'auto'}
            disabled={busy}
            className={css.controlGrow}
            options={[
              { value: 'auto', label: t('defaultsRecencyAuto') },
              ...RECENCIES.map((item) => ({ value: item, label: t(RECENCY_LABEL[item]) })),
            ]}
            onChange={(value) => {
              applySource(families.length === 0 ? undefined : families, authority, value === 'auto' ? undefined : value as Recency)
            }}
          />
        </div>
      </div>

      {receipt !== null ? (
        <div
          role="status"
          data-testid="defaults-receipt"
          className={receipt.tone === 'ok' ? css.bannerOk : receipt.tone === 'warn' ? css.bannerWarn : css.bannerError}
        >
          {receipt.text}
        </div>
      ) : null}

      <div className={css.footerActions}>
        <Button
          variant={confirmClear ? 'primary' : 'outline'}
          size="sm"
          data-testid="defaults-clear"
          disabled={busy}
          onClick={() => {
            if (!confirmClear) { setConfirmClear(true); return }
            setConfirmClear(false)
            void store.clear(sessionId)
          }}
          className={confirmClear ? undefined : css.clearButton}
        >
          {t(confirmClear ? 'defaultsClearConfirm' : 'defaultsClear')}
        </Button>
        <span className={css.footerSave}>{t('defaultsFooterSave')}</span>
      </div>
      {!compact && (
        <div className={css.footerNotes}>
          <span>{t('defaultsFooterAuto')}</span>
          <span>{t('defaultsFooterScope')}</span>
        </div>
      )}
    </section>
  )
}
