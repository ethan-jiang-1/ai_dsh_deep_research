// method-library/views.tsx — 方法库的详情、来源选择、摘要、访谈/表单表面。
//
// 本层是纯展示：草稿、发送态与操作回执归父级。保存与删除走 Method Editor Host tools，
// 本层只转发动作，不新增写权限、不直写文件。
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import {
  SECTION_LABELS, methodNameIssueKind, renderLibraryEntry,
  type LibraryEntry, type LibrarySections, type MethodNameIssueKind,
} from '../../lib/method-library/library-fold.ts'
import type { DraftField } from '../../lib/method-library/method-draft.ts'
import type { SourcePreview } from '../../lib/method-library/method-library-source.ts'
import { libraryRowStyle } from './styles.ts'
import { displayBuiltinOf, displayNameOf } from '../builtin-display.ts'
import type { DeepResearchPackLocaleKey } from '../locales.ts'
import css from './library.module.css'

/** 编辑态草稿（父级持有；`currentName` = 编辑目标原名，新建时省略）。 */
export interface Draft {
  readonly name: string
  readonly sections: LibrarySections
  readonly currentName?: string
  readonly provenance: string | null
  readonly legacyText: string | null
}

export type WorkbenchStage = 'source' | 'interview' | 'form-check'

export interface RunSourceCandidate {
  readonly name: string
  readonly finalPath: string
  readonly question: SourcePreview
  readonly deliverable: SourcePreview
  readonly eligible: boolean
  readonly status: string
}

/** 方法库左栏的条目行。选中态只用 `aria-current` 表达（视觉锚点 = BUG-047 的修复面：
 *  `libraryRowStyle` 的 tint/边线/accent bar + 名字加重；hover/焦点环住注入样式表）。 */
export function LibraryRow(props: {
  readonly name: string
  readonly summary: string | null
  readonly isDefault?: boolean
  readonly selected: boolean
  readonly t: TranslateNS<'deepResearchPack'>
  readonly onSelect: () => void
}): ReactNode {
  const { name, summary, isDefault = false, selected, t, onSelect } = props
  return (
    <button
      type="button"
      data-method-library-row=""
      aria-current={selected ? 'true' : undefined}
      className={css.rowBtn}
      style={libraryRowStyle(selected)}
      onClick={onSelect}
    >
      <div className={css.rowHead}>
        <span data-method-row-name="" className={`${css.rowName}${selected ? ` ${css.rowNameSelected}` : ''}`} style={selected ? { fontWeight: 600 } : undefined}>{name}</span>
        {isDefault && <span className={css.badgeBrand}>{t('defaultBadge')}</span>}
      </div>
      {summary !== null && <div className={css.rowSummary}>{summary}</div>}
    </button>
  )
}

export function SourceSelectionView(props: {
  readonly builtinChoices: readonly LibraryEntry[]
  readonly runNames: readonly string[]
  readonly runState: 'idle' | 'loading' | 'ready' | 'error' | 'cancelled'
  readonly selectedRunLoading: boolean
  readonly onCancelRunRead: () => void
  readonly selectedBuiltin: LibraryEntry | null
  readonly selectedRun: RunSourceCandidate | null
  readonly onSelectBuiltin: (entry: LibraryEntry) => void
  readonly onSelectRun: (name: string) => void
  readonly onLoadRuns: () => void
  readonly onStartBlank: () => void
  readonly onStartBuiltin: (entry: LibraryEntry) => void
  readonly onStartRun: (run: RunSourceCandidate) => void
  readonly onCancel: () => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { builtinChoices, runNames, runState, selectedRunLoading, onCancelRunRead, selectedBuiltin, selectedRun, onSelectBuiltin, onSelectRun, onLoadRuns, onStartBlank, onStartBuiltin, onStartRun, onCancel, t } = props
  // 内置条目在 UI 只走显示投影（canonical 名称仍是选择/动作的键；BUG-069）。未登记名称回退原值。
  const selectedBuiltinDisplay = selectedBuiltin === null ? null : displayBuiltinOf(selectedBuiltin, t)
  const previewText = (preview: SourcePreview): ReactNode => preview.kind === 'ok'
    ? <><pre className={css.previewPre}>{preview.text}</pre>{preview.eof === false && <span className={css.muted}>{t('previewPartial')}</span>}</>
    : <span className={preview.kind === 'error' ? css.textError : css.textMuted}>{preview.kind === 'error' ? `${t('sourceReadFailure')}: ${preview.detail}` : preview.kind === 'cancelled' ? t('sourceCancelled') : t('sourceMissing')}</span>
  return (
    <section data-method-source-selection="" className={css.sourceCol}>
      <header>
        <strong>{t('chooseSource')}</strong>
        <div className={css.muted}>{t('sourceSelectionRequired')}</div>
      </header>
      <section className={css.sourceSectionBorder}>
        <h3 className={css.sourceHeading}>{t('startFromScratch')}</h3>
        <div className={css.rowFlexGap8}>
          <button type="button" className={css.primaryButton} onClick={onStartBlank}>{t('startFromScratch')}</button>
          <button type="button" data-method-source-cancel="" className={css.button} onClick={onCancel}>{t('cancel')}</button>
        </div>
      </section>
      <section className={`${css.sourceSectionGrid} ${css.sourceSectionBorder}`}>
        <div>
          <h3 className={css.sourceHeading}>{t('builtinSources')}</h3>
          {builtinChoices.map((entry) => {
            const active = selectedBuiltin?.name === entry.name
            return <button key={entry.name} type="button" data-method-source-builtin="" aria-pressed={active} className={`${css.button} ${css.sourceChoiceBtn}${active ? ` ${css.buttonActive}` : ''}`} onClick={() => { onSelectBuiltin(entry) }}>{displayNameOf(entry.name, t)}</button>
          })}
        </div>
        <div aria-live="polite" data-method-source-preview="">
          {selectedBuiltinDisplay === null ? <span className={css.muted}>{t('chooseBuiltin')}</span> : <>
            <strong>{selectedBuiltinDisplay.name}</strong>
            {SECTION_LABELS.map(({ key }) => <div key={key} className={css.mt6}><span className={css.muted}>{sectionLabel(t, key)}</span><div className={css.previewText}>{selectedBuiltinDisplay.sections[key] ?? '—'}</div></div>)}
            <button type="button" data-method-source-use-builtin="" className={`${css.primaryButton} ${css.mt8}`} onClick={() => { if (selectedBuiltin !== null) onStartBuiltin(selectedBuiltin) }}>{t('useBuiltin')}</button>
          </>}
        </div>
      </section>
      <section className={css.sourceSectionGrid}>
        <div>
          <div className={css.rowFlexCenterGap8}><h3 className={css.sourceHeading}>{t('runSources')}</h3><button type="button" className={css.button} disabled={runState === 'loading'} onClick={onLoadRuns} data-method-source-load-runs="">{runState === 'loading' ? t('sourceLoading') : t('loadRuns')}</button>{runState === 'loading' && <button type="button" className={css.button} onClick={onCancelRunRead}>{t('cancel')}</button>}</div>
          {runState === 'error' && <div className={css.textError}>{t('sourceReadFailure')}</div>}
          {runState === 'cancelled' && <div className={css.muted}>{t('sourceCancelled')}</div>}
          {runState === 'ready' && runNames.length === 0 && <div className={css.muted}>{t('noCompletedRuns')}</div>}
          {runNames.map((run) => {
            const active = selectedRun?.name === run
            return <button key={run} type="button" data-method-source-run="" aria-pressed={active} className={`${css.button} ${css.sourceChoiceBtn}${active ? ` ${css.buttonActive}` : ''}`} onClick={() => { onSelectRun(run) }}>{run}</button>
          })}
        </div>
        <div aria-live="polite" data-method-source-preview="">
          {selectedRun === null ? <span className={css.muted}>{selectedRunLoading ? <>{t('sourceLoading')} <button type="button" className={css.button} onClick={onCancelRunRead}>{t('cancel')}</button></> : t('chooseRun')}</span> : <>
            <strong>{selectedRun.name}</strong>
            <div className={css.mt6}><span className={css.muted}>{t('runQuestion')}</span>{previewText(selectedRun.question)}</div>
            <div className={css.mt6}><span className={css.muted}>{t('runDeliverable')}</span>{previewText(selectedRun.deliverable)}</div>
            <div className={`${selectedRun.eligible ? css.textMuted : css.textError} ${css.mt6}`}>{selectedRun.status}</div>
            {selectedRun.eligible && selectedRun.question.kind === 'ok' && selectedRun.deliverable.kind === 'ok'
              && <button type="button" data-method-source-use-run="" className={`${css.primaryButton} ${css.mt8}`} onClick={() => { onStartRun(selectedRun) }}>{t('useRun')}</button>}
          </>}
        </div>
      </section>
    </section>
  )
}

const NAME_ISSUE_KEYS: Readonly<Record<MethodNameIssueKind, DeepResearchPackLocaleKey>> = {
  brackets: 'methodNameIssueBrackets',
  'format-char': 'methodNameIssueFormatChar',
  'leading-hash': 'methodNameIssueLeadingHash',
  newline: 'methodNameIssueNewline',
}

function nameIssueMessageOf(name: string, t: TranslateNS<'deepResearchPack'>): string | null {
  const kind = methodNameIssueKind(name)
  return kind === null ? null : t(NAME_ISSUE_KEYS[kind])
}

function draftStatusOf(props: {
  readonly draft: Draft
  readonly mode?: 'new' | 'edit'
  readonly existingNames?: readonly string[]
  readonly t: TranslateNS<'deepResearchPack'>
}): {
  readonly missingFields: readonly string[]
  readonly nameIssue: string | null
  readonly blockerText: string | null
  readonly duplicateWarning: string | null
} {
  const { draft, mode, existingNames, t } = props
  const missingFields = [
    ...(draft.name.trim() === '' ? [t('methodName')] : []),
    ...SECTION_LABELS.filter(({ key }) => (draft.sections[key] ?? '').trim() === '').map(({ key }) => sectionLabel(t, key)),
  ]
  const nameIssue = nameIssueMessageOf(draft.name, t)
  const parts = [
    ...(nameIssue === null ? [] : [nameIssue]),
    ...(missingFields.length > 0 ? [t('incompleteFields', { fields: missingFields.join(t('listSeparator')) })] : []),
  ]
  const blockerText = parts.length > 0 ? parts.join(' · ') : null
  const trimmed = draft.name.trim()
  const duplicateWarning = mode === 'new' && nameIssue === null && trimmed !== '' && existingNames?.includes(trimmed) === true
    ? t('methodDuplicateNameWarning', { name: trimmed })
    : null
  return { missingFields, nameIssue, blockerText, duplicateWarning }
}

export function MethodSummaryView(props: {
  readonly draft: Draft
  readonly mode?: 'new' | 'edit'
  readonly existingNames?: readonly string[]
  readonly stage: WorkbenchStage
  readonly manualFields: ReadonlySet<DraftField>
  readonly coachFields: ReadonlySet<DraftField>
  readonly sourceFields: ReadonlySet<DraftField>
  readonly onStageChange: (stage: WorkbenchStage) => void
  readonly onFocusField: (field: DraftField) => void
  readonly onRestartSource: () => void
  readonly onCancel?: () => void
  readonly canSave: boolean
  readonly sending: boolean
  readonly onSave: (setDefault: boolean) => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { draft, mode, existingNames, stage, manualFields, coachFields, sourceFields, onStageChange, onFocusField, onRestartSource, onCancel, canSave, sending, onSave, t } = props
  useEffect(() => {
    if (onCancel === undefined || typeof window === 'undefined') return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented || sending) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable === true) return
      event.preventDefault()
      onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [onCancel, sending])
  const filled = SECTION_LABELS.filter(({ key }) => (draft.sections[key] ?? '').trim() !== '').length
  const status = draftStatusOf({
    draft,
    ...(mode === undefined ? {} : { mode }),
    ...(existingNames === undefined ? {} : { existingNames }),
    t,
  })
  const effectiveCanSave = canSave && status.nameIssue === null && status.missingFields.length === 0
  return (
    <section data-method-summary="" className={css.summaryRoot}>
      <div className={css.summaryHeadRow}>
        <button type="button" data-method-summary-field="name" onClick={() => { onFocusField('name') }} className={`${css.summaryFieldBtn} ${css.summaryTitleBtn}`}>
          {draft.name.trim() === '' ? t('currentMethod') : draft.name}
        </button>
        {draft.provenance !== null && <span className={css.muted}>{draft.provenance}</span>}
        <span className={`${css.muted} ${css.mlAuto}`}>{t('fieldProgress', { count: String(filled) })}</span>
      </div>
      <div className={css.summaryGrid}>
        {SECTION_LABELS.map(({ key }) => {
          const value = draft.sections[key]?.trim() ?? ''
          const source = manualFields.has(key) ? t('changedManually') : coachFields.has(key) ? t('changedInInterview') : sourceFields.has(key) ? t('fromSource') : t('fieldPending')
          return (
            <button key={key} type="button" data-method-summary-field={key} onClick={() => { onFocusField(key) }} className={css.summaryFieldBtn}>
              <span className={css.summaryFieldLabel}>{sectionLabel(t, key)}</span>
              <span title={value} className={css.summaryFieldVal}>
                {value === '' ? '—' : value}
              </span>
              <span className={css.summaryFieldSrc}>{source}</span>
            </button>
          )
        })}
      </div>
      <div className={css.summaryActions}>
      <div role="tablist" aria-label={t('currentMethod')} className={css.stageTabs}>
        <button type="button" role="tab" aria-selected={stage === 'interview'} className={`${css.button}${stage === 'interview' ? ` ${css.buttonActive}` : ''}`} onClick={() => { onStageChange('interview') }}>{t('interview')}</button>
        <button type="button" role="tab" aria-selected={stage === 'form-check'} className={`${css.button}${stage === 'form-check' ? ` ${css.buttonActive}` : ''}`} onClick={() => { onStageChange('form-check') }}>{t('formCheck')}</button>
      </div>
      <button type="button" className={css.primaryButton} disabled={!effectiveCanSave || sending} onClick={() => { onSave(false) }}>{sending ? t('saving') : t('save')}</button>
      <button type="button" className={css.button} disabled={!effectiveCanSave || sending} title={t('saveAndSetDefaultDescription')} onClick={() => { onSave(true) }}>{t('saveAndSetDefault')}</button>
      {mode !== 'edit' && (
        <button type="button" data-method-restart-source="" className={`${css.button} ${css.mlAuto}`} onClick={onRestartSource}>{t('restartSource')}</button>
      )}
      {onCancel !== undefined && (
        <button type="button" data-method-summary-cancel="" className={`${css.button}${mode === 'edit' ? ` ${css.mlAuto}` : ''}`} disabled={sending} onClick={onCancel}>{t('cancel')}</button>
      )}
      </div>
      {!effectiveCanSave && status.blockerText !== null && <div role="status" className={`${css.muted} ${css.mt6}`}>{status.blockerText}</div>}
      {status.duplicateWarning !== null && <div role="status" className={`${css.muted} ${css.mt6}`}>{status.duplicateWarning}</div>}
    </section>
  )
}

/** 内置打法的只读视图（summary + 四字段；可直接作为新方法来源）。 */
export function BuiltinView({ entry, onUse, useLabel, t }: {
  readonly entry: { readonly name: string; readonly summary: string; readonly sections: LibrarySections }
  readonly onUse?: () => void
  readonly useLabel?: string
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  // 只读详情 = 显示位：名称/摘要/四字段走当前 locale 的投影（canonical 仍是库与指令的键）。
  const display = displayBuiltinOf(entry, t)
  return (
    <div>
      <div className={css.viewTitleRow}>
        <strong className={css.viewTitleStrong}>{display.name}</strong>
        <span className={css.muted}>{t('builtinReadOnly')}</span>
        {onUse !== undefined && <button type="button" data-method-builtin-use="" className={`${css.primaryButton} ${css.mlAuto}`} onClick={onUse}>{useLabel ?? t('startFromThis')}</button>}
      </div>
      <div className={`${css.muted} ${css.mb8}`}>{display.summary}</div>
      <div className={css.viewBody}>
        {SECTION_LABELS.map(({ key }) => (
          <div key={key} className={css.mb6}>
            <div className={css.sectionEyebrow}>{sectionLabel(t, key)}</div>
            <div className={css.preWrap}>{display.sections[key] ?? '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 我的库条目的只读视图：四字段 + 编辑/删除入口（删除有二次确认）。 */
export function ReadMineView(props: {
  readonly entry: LibraryEntry
  readonly pendingDelete: string | null
  readonly sending: boolean
  readonly onEdit: (entry: LibraryEntry) => void
  readonly onPendingDelete: (name: string | null) => void
  readonly onRemove: (entry: LibraryEntry) => void
  readonly onSetDefault: (entry: LibraryEntry) => void
  readonly onClearDefault: () => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { entry, pendingDelete, sending, onEdit, onPendingDelete, onRemove, onSetDefault, onClearDefault, t } = props
  return (
    <div>
      <div className={css.viewTitleRow}>
        <strong className={css.viewTitleStrong}>{entry.name}</strong>
        {entry.isDefault && <span className={css.badgeBrand}>{t('defaultPreference')}</span>}
        {entry.provenance !== null && <span className={css.muted}>{entry.provenance}</span>}
        <span className={css.spacer} />
        <button type="button" className={css.button} disabled={sending} onClick={() => { onEdit(entry) }}>{t('continueInterview')}</button>
        {entry.isDefault
          ? <button type="button" className={css.button} disabled={sending} onClick={onClearDefault}>{t('clearDefault')}</button>
          : <button type="button" className={css.button} disabled={sending} onClick={() => { onSetDefault(entry) }}>{t('setDefault')}</button>}
        <button type="button" className={css.button} disabled={sending} onClick={() => { onPendingDelete(entry.name) }}>{t('deleteAction')}</button>
      </div>
      {pendingDelete === entry.name && (
        <div className={css.deleteBox}>
          {t('deleteConfirm', { name: entry.name })}
          <button type="button" className={`${css.button} ${css.mt6}`} disabled={sending} onClick={() => { onRemove(entry) }}>{t('confirmDelete')}</button>
          <button type="button" className={`${css.button} ${css.mt6}`} onClick={() => { onPendingDelete(null) }}>{t('cancel')}</button>
        </div>
      )}
      <div className={css.viewBody}>
        {SECTION_LABELS.map(({ key }) => {
          const value = entry.sections[key]
          return (
            <div key={key} className={css.mb6}>
              <div className={css.sectionEyebrow}>{sectionLabel(t, key)}</div>
              <div className={css.preWrap}>{value ?? <span className={css.notFilled}>{t('notFilled')}</span>}</div>
            </div>
          )
        })}
        {entry.legacyText !== null && <div className={`${css.muted} ${css.mt6}`}>{t('legacyBody', { text: entry.legacyText })}</div>}
      </div>
    </div>
  )
}

/** 编辑/新建表单：四字段 + Markdown 预览 + 保存/取消。 */

/** 每格的人话提示的 locale key（用户不该先学 schema）。 */
const SECTION_LABEL_KEYS: Record<keyof LibrarySections, DeepResearchPackLocaleKey> = {
  source: 'sectionSource',
  verify: 'sectionVerify',
  report: 'sectionReport',
  limit: 'sectionLimit',
}

/** 四字段标题走 locale（`SECTION_LABELS` 的数据只用于纯折算，不做展示）。 */
function sectionLabel(t: TranslateNS<'deepResearchPack'>, key: keyof LibrarySections): string {
  return t(SECTION_LABEL_KEYS[key])
}

const SECTION_HINT_KEYS: Record<keyof LibrarySections, DeepResearchPackLocaleKey> = {
  source: 'sectionHintSource',
  verify: 'sectionHintVerify',
  report: 'sectionHintReport',
  limit: 'sectionHintLimit',
}

export function EditorView(props: {
  readonly draft: Draft | null
  readonly t: TranslateNS<'deepResearchPack'>
  readonly mode: 'edit' | 'new'
  readonly existingNames?: readonly string[]
  readonly sending: boolean
  readonly onNameChange: (name: string) => void
  readonly onSectionChange: (key: keyof LibrarySections, value: string) => void
  readonly onSave: (setDefault: boolean) => void
  readonly onCancel: () => void
  readonly coachFields?: ReadonlySet<DraftField>
  readonly manualFields?: ReadonlySet<DraftField>
  readonly activeField?: DraftField | null
  readonly coachUpdated?: boolean
  readonly onUndoCoach?: () => void
}): ReactNode {
  const {
    draft, mode, existingNames, sending, onNameChange, onSectionChange, onSave, onCancel, t,
    coachFields, manualFields, activeField, coachUpdated, onUndoCoach,
  } = props
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (activeField === null || activeField === undefined) return
    const element = rootRef.current?.querySelector<HTMLElement>(`[data-field="${activeField}"]`)
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    element?.querySelector<HTMLElement>('input, textarea')?.focus()
  }, [activeField])
  if (draft === null) return null
  const status = draftStatusOf({
    draft,
    mode,
    ...(existingNames === undefined ? {} : { existingNames }),
    t,
  })
  const canSave = status.missingFields.length === 0 && status.nameIssue === null
  const filled = SECTION_LABELS.filter(({ key }) => (draft.sections[key] ?? '').trim() !== '').length
  const marker = (field: DraftField): ReactNode => {
    if (manualFields?.has(field) === true) return <span className={css.markerTag}>{t('changedManually')}</span>
    if (coachFields?.has(field) === true) return <span className={css.markerTag}>{t('changedInInterview')}</span>
    return <span className={css.markerTag}>{t('fieldPending')}</span>
  }
  return (
    <div ref={rootRef}>
      <div className={css.editorHeader}>
        <strong className={css.viewTitleStrong}>{mode === 'new' ? t('newMethod') : t('editMethod')}</strong>
        <span className={css.muted}>{t('editorHint')}</span>
        <span className={css.spacer} />
        <span className={css.muted}>{t('filledCount', { count: String(filled) })}</span>
      </div>
      {coachUpdated === true && (
        <div className={css.editorUndoRow}>
          <span>{t('coachUpdated')}</span>
          <button type="button" className={css.button} onClick={onUndoCoach}>{t('undoCoach')}</button>
        </div>
      )}
      {draft.legacyText !== null && (
        <div className={css.legacyNotice}>
          {t('legacyBodyReadonly', { text: draft.legacyText })}
        </div>
      )}
      <label
        data-field="name"
        className={`${css.fieldBlock}${activeField === 'name' ? ` ${css.fieldBlockActive}` : ''}`}
      >
        <div className={css.fieldLabelRow}>
          <span className={css.fieldLabel}>{t('nameLabel')}</span>
          {marker('name')}
        </div>
        <div className={css.fieldHint}>
          {mode === 'edit' ? t('nameHintEdit') : t('nameHintNew')}
        </div>
        <input
          className={`${css.input}${activeField === 'name' ? ` ${css.fieldActiveInput}` : ''}`}
          value={draft.name}
          placeholder={t('namePlaceholder')}
          readOnly={mode === 'edit'}
          aria-readonly={mode === 'edit'}
          onChange={(event) => { onNameChange(event.target.value) }}
        />
      </label>
      {SECTION_LABELS.map((section) => (
        <label
          key={section.key}
          data-field={section.key}
          className={`${css.fieldBlock}${activeField === section.key ? ` ${css.fieldBlockActive}` : ''}`}
        >
          <div className={css.fieldLabelRow}>
            <span className={css.fieldLabel}>{sectionLabel(t, section.key)}</span>
            {marker(section.key)}
          </div>
          <div className={css.fieldHint}>{t(SECTION_HINT_KEYS[section.key])}</div>
          <textarea
            className={`${css.textarea}${activeField === section.key ? ` ${css.fieldActiveInput}` : ''}`}
            value={draft.sections[section.key] ?? ''}
            placeholder={t('bodyPlaceholder')}
            onChange={(event) => { onSectionChange(section.key, event.target.value) }}
          />
        </label>
      ))}
      {!canSave && status.blockerText !== null && <div role="status" className={css.incompleteMsg}>{status.blockerText}</div>}
      {status.duplicateWarning !== null && <div role="status" className={css.incompleteMsg}>{status.duplicateWarning}</div>}
      <details className={css.previewDetails}>
        <summary className={css.previewSummary}>{t('markdownPreview')}</summary>
        <pre className={css.markdownPre}>{renderLibraryEntry({ name: draft.name.trim() === '' ? t('unnamed') : draft.name.trim(), sections: draft.sections, provenance: draft.provenance }, {
          sections: Object.fromEntries(SECTION_LABELS.map(({ key }) => [key, sectionLabel(t, key)])),
          provenance: (value) => t('provenancePrefix', { provenance: value }),
          defaultMark: t('defaultPreference'),
        })}</pre>
      </details>
      <div className={css.rowFlexGap8}>
        <button type="button" className={css.primaryButton} disabled={sending || !canSave} onClick={() => { onSave(false) }}>{sending ? t('saving') : t('save')}</button>
        <button type="button" className={css.button} disabled={sending || !canSave} title={t('saveAndSetDefaultDescription')} onClick={() => { onSave(true) }}>{t('saveAndSetDefault')}</button>
        <button type="button" className={css.button} disabled={sending} onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  )
}
