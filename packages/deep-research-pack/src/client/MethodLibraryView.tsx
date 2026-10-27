/**
 * 主界面「方法库」tab（2026-10-21 方法库管理计划 Phase 1/2）。
 *
 * 为什么在这里：方法库管理是 workspace 级用户任务，不是 run 观察、也不该塞在右栏窄页签。
 * DSH 的 `conversation.view` 是 list slot（Chat/Trajectory 同款），第三 tab 全宽、就在对话旁。
 *
 * 交互边界：管理是"我的库"（本工作区 `method-library.md`）；保存走 **W1**——表单生成一条
 * 规范化指令交给当前会话 Lead，由 Lead 写文件并回执；本页签不直写文件、不新增写权限。
 * 内置打法只读；所有动作都显式（保存/取消/删除二次确认）。
 *
 * 数据面：注入 `readFile`（workspaceFiles 会话级只读）+ `sendInstruction`（session/prompt
 * steer→queue）。纯折算/序列化住 `src/lib/library-fold.ts`；本组件只画。
 */
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import {
  SECTION_LABELS,
  foldLibrary,
  instructionOf,
  renderLibraryEntry,
  saveInstruction,
  summaryOfEntry,
  type LibraryEntry,
  type LibrarySections,
} from '../lib/library-fold.ts'
import { BUILTIN_PREFERENCES } from '../lib/config-tables.ts'

const LIBRARY_PATH = 'method-library.md'
const LIBRARY_READ_LIMIT = 1000

export interface MethodLibraryInjected {
  readonly readFile: (sessionId: SessionId, path: string, signal: AbortSignal, limit?: number) => Promise<string | null>
  readonly sendInstruction: (sessionId: SessionId, text: string) => Promise<{ readonly ok: boolean; readonly detail?: string }>
}

export type MethodLibraryViewProps = PropsRuntime<'conversation.view'> & MethodLibraryInjected

type Mode = 'read' | 'edit' | 'new'
type Segment = 'mine' | 'builtin'
type LoadState = 'loading' | 'ok' | 'absent' | 'error'

interface Draft {
  readonly name: string
  readonly sections: LibrarySections
  readonly currentName?: string
  readonly provenance: string | null
  readonly isDefault: boolean
  readonly legacyText: string | null
}

interface Receipt {
  readonly ok: boolean
  readonly detail: string
}

const HEADER_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid #00000012' }
const MUTED_STYLE: CSSProperties = { fontSize: 11, opacity: 0.62, lineHeight: 1.5 }
const BUTTON_STYLE: CSSProperties = {
  fontSize: 12, padding: '3px 9px', borderRadius: 4, border: '1px solid #00000026',
  background: '#00000008', cursor: 'pointer', color: 'inherit',
}
const PRIMARY_STYLE: CSSProperties = { ...BUTTON_STYLE, background: '#2563eb', borderColor: '#2563eb', color: '#fff' }
const INPUT_STYLE: CSSProperties = { width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '5px 7px', borderRadius: 4, border: '1px solid #00000024', background: 'transparent', color: 'inherit' }
const TEXTAREA_STYLE: CSSProperties = { ...INPUT_STYLE, minHeight: 54, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }
const ROW_STYLE: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 5,
  border: '1px solid transparent', background: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit',
}

/** 空四字段草稿。 */
function emptySections(): LibrarySections {
  return { source: null, verify: null, report: null, limit: null }
}

/** 草稿是否与源条目一致（粗糙但够用的 dirty 判据：用于离开确认，不用于保存）。 */
function draftOf(entry: LibraryEntry): Draft {
  return {
    name: entry.name,
    sections: entry.sections,
    currentName: entry.name,
    provenance: entry.provenance,
    isDefault: entry.isDefault,
    legacyText: entry.legacyText,
  }
}

/**
 * 主界面「方法库」tab。
 * @param props - conversation.view 标准 props + readFile/sendInstruction。
 */
export function MethodLibraryView(props: MethodLibraryViewProps): ReactNode {
  const sessionId = props.sessionId
  const [text, setText] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState<Segment>('mine')
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('read')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [sending, setSending] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const entries = foldLibrary(text)
  const filtered = entries.filter((entry) => {
    if (query.trim() === '') return true
    const q = query.trim().toLowerCase()
    return entry.name.toLowerCase().includes(q) || (summaryOfEntry(entry) ?? '').toLowerCase().includes(q)
  })
  const selected = (segment === 'mine' && query.trim() !== ''
    ? filtered.find((entry) => entry.name === selectedName)
    : entries.find((entry) => entry.name === selectedName)) ?? null
  const builtin = segment === 'builtin'
    ? BUILTIN_PREFERENCES.find((entry) => entry.name === selectedName) ?? null
    : null

  const load = async (signal: AbortSignal): Promise<void> => {
    if (sessionId === undefined) return
    try {
      const text = await props.readFile(sessionId, LIBRARY_PATH, signal, LIBRARY_READ_LIMIT)
      if (signal.aborted) return
      if (text === null) {
        setText(null)
        setLoadState('absent')
      } else {
        setText(text)
        setLoadState('ok')
      }
      setLoadError(null)
    } catch (cause) {
      if (signal.aborted) return
      setText(null)
      setLoadState('error')
      setLoadError(String(cause))
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoadState('loading')
    void load(controller.signal)
    return () => { controller.abort() }
  }, [sessionId])

  useEffect(() => {
    if (entries.length === 0) {
      setSelectedName(null)
      return
    }
    if (selectedName === null || !entries.some((entry) => entry.name === selectedName)) {
      setSelectedName(entries[0]?.name ?? null)
    }
  }, [text])

  const dirty = (() => {
    if (draft === null || mode === 'read') return false
    if (mode === 'new') {
      return draft.name.trim() !== '' || SECTION_LABELS.some(({ key }) => draft.sections[key] !== null)
    }
    if (selected === null) return true
    return draft.name !== selected.name
      || SECTION_LABELS.some(({ key }) => (draft.sections[key] ?? '') !== (selected.sections[key] ?? ''))
  })()
  const confirmDiscard = (): boolean => {
    if (!dirty) return true
    return typeof window === 'undefined' ? true : window.confirm('放弃未保存的修改？')
  }

  const beginNew = (): void => {
    if (!confirmDiscard()) return
    setSegment('mine')
    setSelectedName(null)
    setDraft({ name: '', sections: emptySections(), provenance: null, isDefault: false, legacyText: null })
    setMode('new')
    setReceipt(null)
    setPendingDelete(null)
  }

  const beginEdit = (entry: LibraryEntry): void => {
    if (!confirmDiscard()) return
    setSegment('mine')
    setSelectedName(entry.name)
    setDraft(draftOf(entry))
    setMode('edit')
    setReceipt(null)
    setPendingDelete(null)
  }

  const selectMine = (entry: LibraryEntry): void => {
    if (!confirmDiscard()) return
    setSegment('mine')
    setSelectedName(entry.name)
    setMode('read')
    setDraft(null)
    setReceipt(null)
    setPendingDelete(null)
  }

  const selectBuiltin = (name: string): void => {
    if (!confirmDiscard()) return
    setSegment('builtin')
    setSelectedName(name)
    setMode('read')
    setDraft(null)
    setReceipt(null)
    setPendingDelete(null)
  }

  const cancel = (): void => {
    if (!confirmDiscard()) return
    setMode('read')
    setDraft(null)
    setPendingDelete(null)
  }

  const updateSection = (key: keyof LibrarySections, value: string): void => {
    if (draft === null) return
    setDraft({ ...draft, sections: { ...draft.sections, [key]: value === '' ? null : value } })
  }

  const save = async (): Promise<void> => {
    if (draft === null || sessionId === undefined) return
    const name = draft.name.trim()
    if (name === '') {
      setReceipt({ ok: false, detail: '名称不能为空' })
      return
    }
    const base = mode === 'new'
      ? saveInstruction(name, draft.sections)
      : saveInstruction(name, draft.sections, draft.currentName)
    const text = draft.legacyText !== null && draft.legacyText.trim() !== ''
      ? `${base}\n保留旧格式正文：${draft.legacyText}`
      : base
    const sendInstruction = props.sendInstruction
    setSending(true)
    try {
      const result = await sendInstruction(sessionId, text)
      setReceipt({ ok: result.ok, detail: result.ok ? '已交给 Lead 保存；它写入后点「刷新」回读。' : (result.detail ?? '发送失败') })
      if (result.ok) {
        setMode('read')
        setSelectedName(name)
        setDraft(null)
        const controller = new AbortController()
        setTimeout(() => { void load(controller.signal) }, 1500)
      }
    } catch (cause) {
      setReceipt({ ok: false, detail: String(cause) })
    } finally {
      setSending(false)
    }
  }

  const remove = async (entry: LibraryEntry): Promise<void> => {
    if (sessionId === undefined) return
    const sendInstruction = props.sendInstruction
    setSending(true)
    try {
      const result = await sendInstruction(sessionId, instructionOf('remove', entry.name))
      setReceipt({ ok: result.ok, detail: result.ok ? '已交给 Lead 删除；它写入后点「刷新」回读。' : (result.detail ?? '发送失败') })
      if (result.ok) {
        setPendingDelete(null)
        setSelectedName(null)
        setMode('read')
        const controller = new AbortController()
        setTimeout(() => { void load(controller.signal) }, 1500)
      }
    } catch (cause) {
      setReceipt({ ok: false, detail: String(cause) })
    } finally {
      setSending(false)
    }
  }

  const refresh = (): void => {
    const controller = new AbortController()
    setLoadState('loading')
    void load(controller.signal)
  }

  const renderReadMine = (entry: LibraryEntry): ReactNode => (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <strong style={{ fontSize: 16 }}>{entry.name}</strong>
        {entry.isDefault && <span style={{ fontSize: 10, color: '#2563eb' }}>默认偏好</span>}
        {entry.provenance !== null && <span style={MUTED_STYLE}>{entry.provenance}</span>}
        <span style={{ flex: 1 }} />
        <button type="button" style={BUTTON_STYLE} onClick={() => { beginEdit(entry) }}>编辑</button>
        <button type="button" style={BUTTON_STYLE} onClick={() => { setPendingDelete(entry.name) }}>删除…</button>
      </div>
      {pendingDelete === entry.name && (
        <div style={{ ...MUTED_STYLE, padding: '6px 8px', border: '1px solid #dc262640', borderRadius: 4, marginBottom: 8 }}>
          删除「{entry.name}」？这会把删除指令交给 Lead。
          <button type="button" style={{ ...BUTTON_STYLE, marginLeft: 8 }} disabled={sending} onClick={() => { void remove(entry) }}>确认删除</button>
          <button type="button" style={{ ...BUTTON_STYLE, marginLeft: 6 }} onClick={() => { setPendingDelete(null) }}>取消</button>
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

  const renderBuiltin = (entry: (typeof BUILTIN_PREFERENCES)[number]): ReactNode => (
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

  const renderEditor = (): ReactNode => {
    if (draft === null) return null
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <strong style={{ fontSize: 16 }}>{mode === 'new' ? '新建方法' : '编辑方法'}</strong>
          <span style={MUTED_STYLE}>保存会生成一条指令交给 Lead 写入库；本页不直接改文件。</span>
        </div>
        {draft.legacyText !== null && (
          <div style={{ ...MUTED_STYLE, marginBottom: 8, padding: '4px 6px', border: '1px solid #f59e0b40', borderRadius: 4 }}>
            旧格式正文会保留（只读）：{draft.legacyText}
          </div>
        )}
        <label style={{ display: 'block', marginBottom: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 3 }}>名称</div>
          <input
            style={INPUT_STYLE}
            value={draft.name}
            placeholder="例如：投研尽调（我的口径）"
            onChange={(event) => { setDraft({ ...draft, name: event.target.value }) }}
          />
        </label>
        {SECTION_LABELS.map(({ key, label }) => (
          <label key={key} style={{ display: 'block', marginBottom: 10 }}>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 3 }}>{label}</div>
            <textarea
              style={TEXTAREA_STYLE}
              value={draft.sections[key] ?? ''}
              onChange={(event) => { updateSection(key, event.target.value) }}
            />
          </label>
        ))}
        <details style={{ marginBottom: 10 }}>
          <summary style={{ ...MUTED_STYLE, cursor: 'pointer' }}>Markdown 预览（只读）</summary>
          <pre style={{ maxHeight: 140, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 11, lineHeight: 1.5, background: '#00000005', padding: 6, borderRadius: 4 }}>{renderLibraryEntry({ name: draft.name.trim() === '' ? '（未命名）' : draft.name.trim(), sections: draft.sections, provenance: draft.provenance, isDefault: draft.isDefault })}</pre>
        </details>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={PRIMARY_STYLE} disabled={sending} onClick={() => { void save() }}>{sending ? '发送中…' : '交给 Lead 保存'}</button>
          <button type="button" style={BUTTON_STYLE} disabled={sending} onClick={cancel}>取消</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={HEADER_STYLE}>
        <strong style={{ fontSize: 15 }}>方法库</strong>
        <span style={MUTED_STYLE}>本工作区共享 · 保存交给 Lead</span>
        <span style={{ flex: 1 }} />
        <button type="button" style={BUTTON_STYLE} onClick={refresh}>刷新</button>
        <button type="button" style={PRIMARY_STYLE} onClick={beginNew}>新建</button>
      </div>
      {receipt !== null && (
        <div style={{
          padding: '6px 14px', fontSize: 12,
          background: receipt.ok ? '#16a34a12' : '#dc262612',
          borderBottom: `1px solid ${receipt.ok ? '#16a34a30' : '#dc262630'}`,
          color: receipt.ok ? '#166534' : '#991b1b',
        }}>{receipt.ok ? '✓' : '✕'} {receipt.detail}</div>
      )}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, flexWrap: 'wrap' }}>
        <aside style={{ flex: '0 0 270px', minWidth: 220, borderRight: '1px solid #00000010', padding: 10, overflowY: 'auto', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button type="button" style={{ ...BUTTON_STYLE, ...(segment === 'mine' ? { borderColor: '#2563eb', color: '#2563eb' } : {}) }} onClick={() => { if (segment !== 'mine') { setSegment('mine'); setSelectedName(entries[0]?.name ?? null); setMode('read') } }}>我的库</button>
            <button type="button" style={{ ...BUTTON_STYLE, ...(segment === 'builtin' ? { borderColor: '#2563eb', color: '#2563eb' } : {}) }} onClick={() => { if (segment !== 'builtin') { setSegment('builtin'); setSelectedName(BUILTIN_PREFERENCES[0]?.name ?? null); setMode('read') } }}>内置参考</button>
          </div>
          {segment === 'mine' && (
            <>
              <input style={{ ...INPUT_STYLE, marginBottom: 8 }} placeholder="搜索方法…" value={query} onChange={(event) => { setQuery(event.target.value) }} />
              {loadState === 'loading' && <div style={MUTED_STYLE}>读取中…</div>}
              {loadState === 'error' && <div style={{ ...MUTED_STYLE, color: '#b91c1c' }}>读不到 {LIBRARY_PATH}：{loadError}</div>}
              {loadState === 'absent' && <div style={MUTED_STYLE}>本工作区还没有 {LIBRARY_PATH}。新建第一条，或让 Lead 在研究里记住一种做法。</div>}
              {loadState === 'ok' && filtered.length === 0 && <div style={MUTED_STYLE}>{entries.length === 0 ? '库还是空的。' : '没有匹配的方法。'}</div>}
              {filtered.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  style={{ ...ROW_STYLE, ...(selectedName === entry.name && segment === 'mine' ? { background: '#2563eb0f', borderColor: '#2563eb30' } : {}) }}
                  onClick={() => { selectMine(entry) }}
                >
                  <div style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                    {entry.isDefault && <span style={{ fontSize: 10, color: '#2563eb' }}>默认</span>}
                  </div>
                  <div style={{ ...MUTED_STYLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summaryOfEntry(entry) ?? '（无摘要）'}</div>
                </button>
              ))}
            </>
          )}
          {segment === 'builtin' && (
            <>
              {BUILTIN_PREFERENCES.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  style={{ ...ROW_STYLE, ...(selectedName === entry.name ? { background: '#2563eb0f', borderColor: '#2563eb30' } : {}) }}
                  onClick={() => { selectBuiltin(entry.name) }}
                >
                  <div style={{ fontSize: 13 }}>{entry.name}</div>
                  <div style={{ ...MUTED_STYLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.summary}</div>
                </button>
              ))}
            </>
          )}
        </aside>
        <main style={{ flex: '1 1 420px', minWidth: 280, padding: 14, overflowY: 'auto', boxSizing: 'border-box' }}>
          {mode === 'read' && segment === 'builtin' && builtin !== null && renderBuiltin(builtin)}
          {mode === 'read' && segment === 'mine' && selected !== null && renderReadMine(selected)}
          {mode === 'read' && segment === 'mine' && selected === null && (
            <div style={{ ...MUTED_STYLE, paddingTop: 20 }}>
              {loadState === 'absent'
                ? '还没有方法。点「新建」写第一条；或让 Lead 从一次 run 里沉淀。'
                : query.trim() !== '' ? '没有匹配的方法。' : '从左边选一条方法。'}
            </div>
          )}
          {(mode === 'edit' || mode === 'new') && renderEditor()}
        </main>
      </div>
    </div>
  )
}
