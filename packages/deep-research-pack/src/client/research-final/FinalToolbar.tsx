/**
 * FinalToolbar.tsx —— 终稿页签合一单条工具栏（左：视图分段 + 版本状态；右：目录 / 分屏 / 全屏 / 过程）。
 */
import { useId, type ReactNode } from 'react'
import {
  Button,
  IconCompareSplitOutlineRegular,
  IconFlatListOutlineRegular,
  IconFullscreenOutlineRegular,
  SegmentedControl,
  Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import css from '../ResearchFinalTab.module.css'

export interface FinalToolbarProps {
  readonly displayedPath: string
  readonly view: 'reader' | 'audit' | 'draft' | 'claims'
  readonly showingReader: boolean
  readonly hasReader: boolean
  readonly hasAudit: boolean
  readonly claimsCount: number
  readonly stateText: string
  readonly stateWarn: boolean
  readonly draftToggleLabel: string | null
  readonly isFullscreen: boolean
  readonly showTocToggle?: boolean
  readonly onChangeView: (next: 'reader' | 'audit' | 'draft' | 'claims') => void
  readonly onToggleDraft: () => void
  readonly onToggleToc: () => void
  readonly onOpenSplitStatus: () => void
  readonly onOpenProcess: () => void
  readonly onToggleFullscreen?: () => void
  readonly t: TranslateNS<'deepResearchPack'>
}

export function FinalToolbar(props: FinalToolbarProps): ReactNode {
  const {
    displayedPath, view, showingReader, hasReader, hasAudit, claimsCount,
    stateText, stateWarn, draftToggleLabel, isFullscreen, showTocToggle,
    onChangeView, onToggleDraft, onToggleToc, onOpenSplitStatus, onOpenProcess, onToggleFullscreen, t,
  } = props
  const controlId = useId()
  const tocToggleVisible = showTocToggle ?? (!isFullscreen && view !== 'claims')
  const segmentedValue: 'reader' | 'audit' | 'claims' = view === 'claims'
    ? 'claims'
    : view === 'draft'
      ? ('draft' as unknown as 'audit')
      : showingReader
        ? 'reader'
        : 'audit'
  return (
    <div className={css.toolbar} title={displayedPath} data-testid="final-toolbar">
      <div className={css.segmentedWrap}>
        <SegmentedControl<'reader' | 'audit' | 'claims'>
          id={`research-final-view-${controlId}`}
          label={t('tabFinal')}
          className={css.segmentedControl ?? ''}
          value={segmentedValue}
          options={[
            { value: 'reader', label: t('finalTabReader'), disabled: !hasReader },
            { value: 'audit', label: t('finalTabAudit'), disabled: !hasAudit },
            { value: 'claims', label: t('finalTabClaims', { count: String(claimsCount) }) },
          ]}
          onChange={(next) => { onChangeView(next) }}
        />
      </div>
      <span className={stateWarn ? css.stateWarn : css.stateLabel}>{stateText}</span>
      {draftToggleLabel !== null && (
        <button
          type="button"
          className={css.linkButton}
          title={t('ledgerNote')}
          onClick={onToggleDraft}
        >
          {draftToggleLabel}
        </button>
      )}
      <span className={css.stripSpacer} />
      {tocToggleVisible && (
        <Tooltip label={t('finalTocToggle')} side="bottom">
          <Button
            variant="ghost"
            size="sm"
            data-testid="final-toc-toggle"
            onClick={onToggleToc}
            aria-label={t('finalTocToggle')}
          >
            <IconFlatListOutlineRegular size={14} />
          </Button>
        </Tooltip>
      )}
      <Tooltip label={t('finalSplitReview')} side="bottom">
        <Button
          variant="ghost"
          size="sm"
          className={css.splitReviewBtn ?? ''}
          aria-label={t('finalSplitReview')}
          onClick={onOpenSplitStatus}
        >
          <IconCompareSplitOutlineRegular size={14} />
          <span className={css.splitReviewLabel}>{t('finalSplitReview')}</span>
        </Button>
      </Tooltip>
      {onToggleFullscreen !== undefined && (
        <Tooltip label={isFullscreen ? t('finalExitFullscreen') : t('finalEnterFullscreen')} side="bottom">
          <Button
            variant="ghost"
            size="sm"
            data-testid="final-fullscreen-toggle"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? t('finalExitFullscreen') : t('finalEnterFullscreen')}
          >
            <IconFullscreenOutlineRegular size={14} />
          </Button>
        </Tooltip>
      )}
      <button type="button" className={css.linkButton} onClick={onOpenProcess}>
        {t('finalProcess')}
      </button>
    </div>
  )
}
