// method-library/views.tsx — 「方法库」主 tab 的三种视图（只读内置 / 只读我的 / 编辑表单）。
//
// 从 MethodLibraryView.tsx 原样切出（2026-10-28 卫生轮 维度2）：三者是**纯展示**——数据与动作
// 全由父级注入，本层不持有状态；此前以闭包形式埋在 360 行的页签体函数里，改表单要在 456 行里
// 定位，也没法单独复用。父级切出后只留数据装配与布局（读文件 / 折叠库 / 发送指令 / 收据）。
//
// 动作仍走 props 的理由：保存与删除都是"生成一条指令交给当前会话的 Lead"，发送态与回执归父级；
// 本层只画与转发，不新增写权限、不直写文件。
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { SECTION_LABELS, renderLibraryEntry, type LibraryEntry, type LibrarySections } from '../../lib/library-fold.ts'
import type { DraftField } from '../../lib/method-draft.ts'
import { BUTTON_STYLE, INPUT_STYLE, MUTED_STYLE, PRIMARY_STYLE, TEXTAREA_STYLE } from './styles.ts'

/** 编辑态草稿（父级持有；`currentName` = 编辑目标原名，新建时省略）。 */
export interface Draft {
  readonly name: string
  readonly sections: LibrarySections
  readonly currentName?: string
  readonly provenance: string | null
  readonly isDefault: boolean
  readonly legacyText: string | null
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
}): ReactNode {
  const { entry, pendingDelete, sending, onEdit, onPendingDelete, onRemove } = props
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <strong style={{ fontSize: 16 }}>{entry.name}</strong>
        {entry.isDefault && <span style={{ fontSize: 10, color: '#2563eb' }}>默认偏好</span>}
        {entry.provenance !== null && <span style={MUTED_STYLE}>{entry.provenance}</span>}
        <span style={{ flex: 1 }} />
        <button type="button" style={BUTTON_STYLE} onClick={() => { onEdit(entry) }}>和编辑聊聊</button>
        <button type="button" style={BUTTON_STYLE} onClick={() => { onPendingDelete(entry.name) }}>删除…</button>
      </div>
      {pendingDelete === entry.name && (
        <div style={{ ...MUTED_STYLE, padding: '6px 8px', border: '1px solid #dc262640', borderRadius: 4, marginBottom: 8 }}>
          删除「{entry.name}」？这会把删除指令交给 Lead。
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
const MARKER_STYLE = { fontSize: 10, padding: '1px 6px', borderRadius: 999, background: '#00000008', opacity: 0.65 } as const

/** 每格的人话提示（用户不该先学 schema）。 */
const SECTION_HINTS: Record<keyof LibrarySections, string> = {
  source: '先看哪里、信谁：官方文档 / 定价页 / 公告优先',
  verify: '冲突时怎么裁、数字怎么回原表复算',
  report: '第一屏给谁看、分几节、什么形态',
  limit: '这条方法明确不做什么（至少一条）',
}

export function EditorView(props: {
  readonly draft: Draft | null
  readonly mode: 'edit' | 'new'
  readonly sending: boolean
  readonly onNameChange: (name: string) => void
  readonly onSectionChange: (key: keyof LibrarySections, value: string) => void
  readonly onSave: () => void
  readonly onCancel: () => void
  readonly coachFields?: ReadonlySet<DraftField>
  readonly manualFields?: ReadonlySet<DraftField>
  readonly activeField?: DraftField | null
  readonly coachUpdated?: boolean
  readonly onUndoCoach?: () => void
}): ReactNode {
  const {
    draft, mode, sending, onNameChange, onSectionChange, onSave, onCancel,
    coachFields, manualFields, activeField, coachUpdated, onUndoCoach,
  } = props
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (activeField === null || activeField === undefined) return
    const element = rootRef.current?.querySelector<HTMLElement>(`[data-field="${activeField}"]`)
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeField])
  if (draft === null) return null
  const filled = SECTION_LABELS.filter((item) => draft.sections[item.key] !== null).length
  const marker = (field: DraftField): ReactNode => {
    if (manualFields?.has(field) === true) return <span style={MARKER_STYLE}>手改</span>
    if (coachFields?.has(field) === true) return <span style={MARKER_STYLE}>来自对话</span>
    return <span style={MARKER_STYLE}>待定</span>
  }
  const fieldStyle = (field: DraftField) => activeField === field
    ? { borderColor: '#2563eb', boxShadow: '0 0 0 2px #2563eb18' }
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
        <div style={{ ...MUTED_STYLE, marginBottom: 8, padding: '4px 6px', border: '1px solid #f59e0b40', borderRadius: 4 }}>
          旧格式正文会保留（只读）：{draft.legacyText}
        </div>
      )}
      <label
        data-field="name"
        style={{ display: 'block', marginBottom: 10, borderRadius: 6, ...(activeField === 'name' ? { background: '#2563eb08', padding: 6, marginLeft: -6, marginRight: -6 } : {}) }}
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
          style={{ display: 'block', marginBottom: 10, borderRadius: 6, ...(activeField === section.key ? { background: '#2563eb08', padding: 6, marginLeft: -6, marginRight: -6 } : {}) }}
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
      <details style={{ marginBottom: 10 }}>
        <summary style={{ ...MUTED_STYLE, cursor: 'pointer' }}>Markdown 预览（只读）</summary>
        <pre style={{ maxHeight: 140, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 11, lineHeight: 1.5, background: '#00000005', padding: 6, borderRadius: 4 }}>{renderLibraryEntry({ name: draft.name.trim() === '' ? '（未命名）' : draft.name.trim(), sections: draft.sections, provenance: draft.provenance, isDefault: draft.isDefault })}</pre>
      </details>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={PRIMARY_STYLE} disabled={sending} onClick={() => { onSave() }}>{sending ? '保存中…' : '保存到方法库'}</button>
        <button type="button" style={BUTTON_STYLE} disabled={sending} onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}
