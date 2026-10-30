// method-library/views.tsx — 方法库的详情、来源选择、摘要、访谈/表单表面。
//
// 本层是纯展示：草稿、发送态与操作回执归父级。保存与删除走 Method Editor Host tools，
// 本层只转发动作，不新增写权限、不直写文件。
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { SECTION_LABELS, renderLibraryEntry, type LibraryEntry, type LibrarySections } from '../../lib/library-fold.ts'
import type { DraftField } from '../../lib/method-draft.ts'
import type { SourcePreview } from '../../lib/method-library-source.ts'
import { BUTTON_STYLE, INPUT_STYLE, MUTED_STYLE, PRIMARY_STYLE, TEXTAREA_STYLE } from './styles.ts'

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
  const previewText = (preview: SourcePreview): ReactNode => preview.kind === 'ok'
    ? <><pre style={{ whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto', margin: '4px 0', fontSize: 12 }}>{preview.text}</pre>{preview.eof === false && <span style={MUTED_STYLE}>{t('previewPartial')}</span>}</>
    : <span style={{ color: preview.kind === 'error' ? 'var(--dsw-alias-label-error)' : 'var(--dsw-alias-label-secondary)' }}>{preview.kind === 'error' ? `${t('sourceReadFailure')}: ${preview.detail}` : preview.kind === 'cancelled' ? t('sourceCancelled') : t('sourceMissing')}</span>
  return (
    <section data-method-source-selection="" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920 }}>
      <header>
        <strong>{t('chooseSource')}</strong>
        <div style={MUTED_STYLE}>{t('sourceSelectionRequired')}</div>
      </header>
      <section style={{ paddingBottom: 12, borderBottom: '1px solid var(--dsw-alias-border-l1)' }}>
        <h3 style={{ fontSize: 14 }}>{t('startFromScratch')}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={PRIMARY_STYLE} onClick={onStartBlank}>{t('startFromScratch')}</button>
          <button type="button" data-method-source-cancel="" style={BUTTON_STYLE} onClick={onCancel}>{t('cancel')}</button>
        </div>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--dsw-alias-border-l1)' }}>
        <div>
          <h3 style={{ fontSize: 14 }}>{t('builtinSources')}</h3>
          {builtinChoices.map((entry) => (
            <button key={entry.name} type="button" data-method-source-builtin="" style={{ ...BUTTON_STYLE, display: 'block', width: '100%', textAlign: 'left', marginBottom: 4 }} onClick={() => { onSelectBuiltin(entry) }}>{entry.name}</button>
          ))}
        </div>
        <div aria-live="polite" data-method-source-preview="">
          {selectedBuiltin === null ? <span style={MUTED_STYLE}>{t('chooseBuiltin')}</span> : <>
            <strong>{selectedBuiltin.name}</strong>
            {SECTION_LABELS.map(({ key, label }) => <div key={key} style={{ marginTop: 6 }}><span style={MUTED_STYLE}>{label}</span><div style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{selectedBuiltin.sections[key] ?? '—'}</div></div>)}
            <button type="button" data-method-source-use-builtin="" style={{ ...PRIMARY_STYLE, marginTop: 8 }} onClick={() => { onStartBuiltin(selectedBuiltin) }}>{t('useBuiltin')}</button>
          </>}
        </div>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><h3 style={{ fontSize: 14 }}>{t('runSources')}</h3><button type="button" style={BUTTON_STYLE} disabled={runState === 'loading'} onClick={onLoadRuns} data-method-source-load-runs="">{runState === 'loading' ? t('sourceLoading') : t('loadRuns')}</button>{runState === 'loading' && <button type="button" style={BUTTON_STYLE} onClick={onCancelRunRead}>{t('cancel')}</button>}</div>
          {runState === 'error' && <div style={{ color: 'var(--dsw-alias-label-error)' }}>{t('sourceReadFailure')}</div>}
          {runState === 'cancelled' && <div style={MUTED_STYLE}>{t('sourceCancelled')}</div>}
          {runState === 'ready' && runNames.length === 0 && <div style={MUTED_STYLE}>{t('noCompletedRuns')}</div>}
          {runNames.map((run) => <button key={run} type="button" data-method-source-run="" style={{ ...BUTTON_STYLE, display: 'block', width: '100%', textAlign: 'left', marginBottom: 4 }} onClick={() => { onSelectRun(run) }}>{run}</button>)}
        </div>
        <div aria-live="polite" data-method-source-preview="">
          {selectedRun === null ? <span style={MUTED_STYLE}>{selectedRunLoading ? <>{t('sourceLoading')} <button type="button" style={BUTTON_STYLE} onClick={onCancelRunRead}>{t('cancel')}</button></> : t('chooseRun')}</span> : <>
            <strong>{selectedRun.name}</strong>
            <div style={{ marginTop: 6 }}><span style={MUTED_STYLE}>{t('runQuestion')}</span>{previewText(selectedRun.question)}</div>
            <div style={{ marginTop: 6 }}><span style={MUTED_STYLE}>{t('runDeliverable')}</span>{previewText(selectedRun.deliverable)}</div>
            <div style={{ color: selectedRun.eligible ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-label-error)', marginTop: 6 }}>{selectedRun.status}</div>
            {selectedRun.eligible && selectedRun.question.kind === 'ok' && selectedRun.deliverable.kind === 'ok'
              && <button type="button" data-method-source-use-run="" style={{ ...PRIMARY_STYLE, marginTop: 8 }} onClick={() => { onStartRun(selectedRun) }}>{t('useRun')}</button>}
          </>}
        </div>
      </section>
    </section>
  )
}

export function MethodSummaryView(props: {
  readonly draft: Draft
  readonly stage: WorkbenchStage
  readonly manualFields: ReadonlySet<DraftField>
  readonly coachFields: ReadonlySet<DraftField>
  readonly sourceFields: ReadonlySet<DraftField>
  readonly onStageChange: (stage: WorkbenchStage) => void
  readonly onRestartSource: () => void
  readonly canSave: boolean
  readonly sending: boolean
  readonly onSave: (setDefault: boolean) => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { draft, stage, manualFields, coachFields, sourceFields, onStageChange, onRestartSource, canSave, sending, onSave, t } = props
  const filled = SECTION_LABELS.filter(({ key }) => (draft.sections[key] ?? '').trim() !== '').length
  const missingFields = [
    ...(draft.name.trim() === '' ? [t('methodName')] : []),
    ...SECTION_LABELS.filter(({ key }) => (draft.sections[key] ?? '').trim() === '').map(({ label }) => label),
  ]
  return (
    <section data-method-summary="" style={{ flex: '0 0 auto', minWidth: 0, padding: '10px 14px', borderBottom: '1px solid var(--dsw-alias-border-l1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong>{draft.name.trim() === '' ? t('currentMethod') : draft.name}</strong>
        {draft.provenance !== null && <span style={MUTED_STYLE}>{draft.provenance}</span>}
        <span style={{ ...MUTED_STYLE, marginLeft: 'auto' }}>{t('fieldProgress', { count: String(filled) })}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '5px 14px', marginTop: 8 }}>
        {SECTION_LABELS.map(({ key, label }) => {
          const value = draft.sections[key]?.trim() ?? ''
          const source = manualFields.has(key) ? t('changedManually') : coachFields.has(key) ? t('changedInInterview') : sourceFields.has(key) ? t('fromSource') : t('fieldPending')
          return (
            <div key={key} style={{ minWidth: 0, display: 'flex', gap: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--dsw-alias-label-secondary)', flex: '0 0 auto' }}>{label}</span>
              <span title={value} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {value === '' ? '—' : value}
              </span>
              <span style={{ ...MUTED_STYLE, flex: '0 0 auto' }}>{source}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
      <div role="tablist" aria-label={t('currentMethod')} style={{ display: 'flex', gap: 4 }}>
        <button type="button" role="tab" aria-selected={stage === 'interview'} style={BUTTON_STYLE} onClick={() => { onStageChange('interview') }}>{t('interview')}</button>
        <button type="button" role="tab" aria-selected={stage === 'form-check'} style={BUTTON_STYLE} onClick={() => { onStageChange('form-check') }}>{t('formCheck')}</button>
      </div>
      <button type="button" style={PRIMARY_STYLE} disabled={!canSave || sending} onClick={() => { onSave(false) }}>{sending ? t('saving') : t('save')}</button>
      <button type="button" style={BUTTON_STYLE} disabled={!canSave || sending} title={t('saveAndSetDefaultDescription')} onClick={() => { onSave(true) }}>{t('saveAndSetDefault')}</button>
      <button type="button" style={{ ...BUTTON_STYLE, marginLeft: 'auto' }} onClick={onRestartSource}>{t('restartSource')}</button>
      </div>
      {!canSave && <div role="status" style={{ ...MUTED_STYLE, marginTop: 6 }}>{t('incompleteFields', { fields: missingFields.join('、') })}</div>}
    </section>
  )
}

/** 内置打法的只读视图（summary + 四字段；无编辑入口）。 */
export function BuiltinView({ entry }: { readonly entry: { readonly name: string; readonly summary: string; readonly sections: LibrarySections } }): ReactNode {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <strong style={{ fontSize: 16 }}>{entry.name}</strong>
        <span style={MUTED_STYLE}>内置只读</span>
      </div>
      <div style={{ ...MUTED_STYLE, marginBottom: 8 }}>{entry.summary}</div>
      <div style={{ lineHeight: 1.65, fontSize: 13 }}>
        {SECTION_LABELS.map(({ key, label }) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, opacity: 0.55 }}>{label}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{entry.sections[key] ?? '—'}</div>
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <strong style={{ fontSize: 16 }}>{entry.name}</strong>
        {entry.isDefault && <span style={{ fontSize: 10, color: 'var(--dsw-alias-brand-primary)' }}>默认偏好</span>}
        {entry.provenance !== null && <span style={MUTED_STYLE}>{entry.provenance}</span>}
        <span style={{ flex: 1 }} />
        <button type="button" style={BUTTON_STYLE} onClick={() => { onEdit(entry) }}>{t('continueInterview')}</button>
        {entry.isDefault
          ? <button type="button" style={BUTTON_STYLE} disabled={sending} onClick={onClearDefault}>{t('clearDefault')}</button>
          : <button type="button" style={BUTTON_STYLE} disabled={sending} onClick={() => { onSetDefault(entry) }}>{t('setDefault')}</button>}
        <button type="button" style={BUTTON_STYLE} onClick={() => { onPendingDelete(entry.name) }}>删除…</button>
      </div>
      {pendingDelete === entry.name && (
        <div style={{ ...MUTED_STYLE, padding: '6px 8px', border: '1px solid var(--dsw-alias-label-error)40', borderRadius: 4, marginBottom: 8 }}>
          删除「{entry.name}」？方法编辑会从库里删掉它。
          <button type="button" style={{ ...BUTTON_STYLE, marginLeft: 8 }} disabled={sending} onClick={() => { onRemove(entry) }}>确认删除</button>
          <button type="button" style={{ ...BUTTON_STYLE, marginLeft: 6 }} onClick={() => { onPendingDelete(null) }}>取消</button>
        </div>
      )}
      <div style={{ lineHeight: 1.65, fontSize: 13 }}>
        {SECTION_LABELS.map(({ key, label }) => {
          const value = entry.sections[key]
          return (
            <div key={key} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, opacity: 0.55 }}>{label}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{value ?? <span style={{ opacity: 0.5 }}>未填写</span>}</div>
            </div>
          )
        })}
        {entry.legacyText !== null && <div style={{ ...MUTED_STYLE, marginTop: 6 }}>旧格式正文：{entry.legacyText}</div>}
      </div>
    </div>
  )
}

/** 编辑/新建表单：四字段 + Markdown 预览 + 保存/取消。 */
const MARKER_STYLE = { fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'var(--dsw-alias-bg-layer-2)', opacity: 0.65 } as const

/** 每格的人话提示（用户不该先学 schema）。 */
const SECTION_HINTS: Record<keyof LibrarySections, string> = {
  source: '先看哪里、信谁：官方文档 / 定价页 / 公告优先',
  verify: '冲突时怎么裁、数字怎么回原表复算',
  report: '第一屏给谁看、分几节、什么形态',
  limit: '这条方法明确不做什么（至少一条）',
}

export function EditorView(props: {
  readonly draft: Draft | null
  readonly t: TranslateNS<'deepResearchPack'>
  readonly mode: 'edit' | 'new'
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
    draft, mode, sending, onNameChange, onSectionChange, onSave, onCancel, t,
    coachFields, manualFields, activeField, coachUpdated, onUndoCoach,
  } = props
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (activeField === null || activeField === undefined) return
    const element = rootRef.current?.querySelector<HTMLElement>(`[data-field="${activeField}"]`)
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeField])
  if (draft === null) return null
  const missingFields = [
    ...(draft.name.trim() === '' ? [t('methodName')] : []),
    ...SECTION_LABELS.filter(({ key }) => (draft.sections[key] ?? '').trim() === '').map(({ label }) => label),
  ]
  const canSave = missingFields.length === 0
  const filled = SECTION_LABELS.filter(({ key }) => (draft.sections[key] ?? '').trim() !== '').length
  const marker = (field: DraftField): ReactNode => {
    if (manualFields?.has(field) === true) return <span style={MARKER_STYLE}>手改</span>
    if (coachFields?.has(field) === true) return <span style={MARKER_STYLE}>来自对话</span>
    return <span style={MARKER_STYLE}>待定</span>
  }
  const fieldStyle = (field: DraftField) => activeField === field
    ? { borderColor: 'var(--dsw-alias-brand-primary)', boxShadow: '0 0 0 2px var(--dsw-alias-brand-primary)18' }
    : undefined
  return (
    <div ref={rootRef}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <strong style={{ fontSize: 16 }}>{mode === 'new' ? '新建方法' : '编辑方法'}</strong>
        <span style={MUTED_STYLE}>字段会随右侧对话逐格成形；保存由方法编辑写入库。</span>
        <span style={{ flex: 1 }} />
        <span style={MUTED_STYLE}>{filled}/4 已定</span>
      </div>
      {coachUpdated === true && (
        <div style={{ ...MUTED_STYLE, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span>已按方法编辑的草稿更新。</span>
          <button type="button" style={BUTTON_STYLE} onClick={onUndoCoach}>撤销对话更新</button>
        </div>
      )}
      {draft.legacyText !== null && (
        <div style={{ ...MUTED_STYLE, marginBottom: 8, padding: '4px 6px', border: '1px solid var(--dsw-alias-label-caption)40', borderRadius: 4 }}>
          旧格式正文会保留（只读）：{draft.legacyText}
        </div>
      )}
      <label
        data-field="name"
        style={{ display: 'block', marginBottom: 10, borderRadius: 6, ...(activeField === 'name' ? { background: 'var(--dsw-alias-brand-primary)08', padding: 6, marginLeft: -6, marginRight: -6 } : {}) }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 11, opacity: 0.6 }}>名称</span>
          {marker('name')}
        </div>
        <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 4 }}>用你的口径起名；新建时别和已有条目撞名</div>
        <input
          style={{ ...INPUT_STYLE, ...fieldStyle('name') }}
          value={draft.name}
          placeholder="例如：投研尽调（我的口径）"
          onChange={(event) => { onNameChange(event.target.value) }}
        />
      </label>
      {SECTION_LABELS.map((section) => (
        <label
          key={section.key}
          data-field={section.key}
          style={{ display: 'block', marginBottom: 10, borderRadius: 6, ...(activeField === section.key ? { background: 'var(--dsw-alias-brand-primary)08', padding: 6, marginLeft: -6, marginRight: -6 } : {}) }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{section.label}</span>
            {marker(section.key)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 4 }}>{SECTION_HINTS[section.key]}</div>
          <textarea
            style={{ ...TEXTAREA_STYLE, ...fieldStyle(section.key) }}
            value={draft.sections[section.key] ?? ''}
            placeholder="可以从右侧对话开始，也可以直接填…"
            onChange={(event) => { onSectionChange(section.key, event.target.value) }}
          />
        </label>
      ))}
      {!canSave && <div role="status" style={{ color: 'var(--dsw-alias-label-secondary)', margin: '6px 0' }}>{t('incompleteFields', { fields: missingFields.join('、') })}</div>}
      <details style={{ marginBottom: 10 }}>
        <summary style={{ ...MUTED_STYLE, cursor: 'pointer' }}>Markdown 预览（只读）</summary>
        <pre style={{ maxHeight: 140, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 11, lineHeight: 1.5, background: 'var(--dsw-alias-bg-layer-1)', padding: 6, borderRadius: 4 }}>{renderLibraryEntry({ name: draft.name.trim() === '' ? '（未命名）' : draft.name.trim(), sections: draft.sections, provenance: draft.provenance })}</pre>
      </details>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={PRIMARY_STYLE} disabled={sending || !canSave} onClick={() => { onSave(false) }}>{sending ? t('saving') : t('save')}</button>
        <button type="button" style={BUTTON_STYLE} disabled={sending || !canSave} title={t('saveAndSetDefaultDescription')} onClick={() => { onSave(true) }}>{t('saveAndSetDefault')}</button>
        <button type="button" style={BUTTON_STYLE} disabled={sending} onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}
