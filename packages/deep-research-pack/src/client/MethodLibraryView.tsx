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
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import {
  SECTION_LABELS,
  foldLibrary,
  renderLibraryEntry,
  instructionOf,
  summaryOfEntry,
  type LibraryEntry,
  type LibrarySections,
} from '../lib/library-fold.ts'
import { BUILTIN_PREFERENCES } from '../lib/config-tables.ts'
import { FIELD_LABELS, FIELD_ORDER, mergeCoachDraft, parseMethodDraft, type DraftField } from '../lib/method-draft.ts'
import { BUTTON_STYLE, HEADER_STYLE, INPUT_STYLE, MUTED_STYLE, PRIMARY_STYLE, ROW_STYLE } from './method-library/styles.ts'
import { BuiltinView, EditorView, ReadMineView, type Draft } from './method-library/views.tsx'
import { MethodCoachPanel } from './method-library/coach.tsx'

const LIBRARY_PATH = 'method-library.md'
const LIBRARY_READ_LIMIT = 1000

export interface MethodLibraryInjected {
  readonly readFile: (sessionId: SessionId, path: string, signal: AbortSignal, limit?: number) => Promise<string | null>
  readonly sendInstruction: (sessionId: SessionId, text: string) => Promise<{ readonly ok: boolean; readonly detail?: string }>
  /** 方法编辑会话的建/保留（独立 root session；页面右栏 portal）。 */
  readonly ensureCoach: (sessionId: SessionId) => Promise<{
    readonly id: SessionId
    readonly reference: { release(): void }
  }>
  /** 给方法编辑发一条 prompt（起手式/后续对话由原生 composer 发）。 */
  readonly sendCoach: (sessionId: SessionId, text: string) => Promise<void>
  /** 跟随方法编辑会话的 assistant 消息（草稿回填；live only）。 */
  readonly watchCoach: (sessionId: SessionId, signal: AbortSignal, onText: (text: string) => void) => Promise<void>
  /** 列工作区目录（找最近的 run，供「从这次研究沉淀」）。 */
  readonly listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<readonly { type: string; name: string }[] | null>
}

export type MethodLibraryViewProps = PropsRuntime<'conversation.view'> & MethodLibraryInjected

type Mode = 'read' | 'edit' | 'new'
type Segment = 'mine' | 'builtin'
type LoadState = 'loading' | 'ok' | 'absent' | 'error'

interface Receipt {
  readonly ok: boolean
  readonly detail: string
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
  const [coachId, setCoachId] = useState<SessionId | null>(null)
  const [manual, setManual] = useState<ReadonlySet<DraftField>>(() => new Set())
  const [coachFields, setCoachFields] = useState<ReadonlySet<DraftField>>(() => new Set())
  const [activeField, setActiveField] = useState<DraftField | null>(null)
  const [coachBase, setCoachBase] = useState<LibraryEntry | null>(null)
  const [runContext, setRunContext] = useState<string | null>(null)
  const previousRef = useRef<{
    draft: Draft
    manual: ReadonlySet<DraftField>
    coachFields: ReadonlySet<DraftField>
    active: DraftField | null
    base: LibraryEntry | null
  } | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const manualRef = useRef<ReadonlySet<DraftField>>(manual)
  const coachFieldsRef = useRef<ReadonlySet<DraftField>>(coachFields)
  const activeRef = useRef<DraftField | null>(activeField)
  const coachBaseRef = useRef<LibraryEntry | null>(coachBase)
  const savePendingRef = useRef<{ name: string; sections: LibrarySections; timeout: ReturnType<typeof setTimeout> } | null>(null)
  draftRef.current = draft
  manualRef.current = manual
  coachFieldsRef.current = coachFields
  activeRef.current = activeField
  coachBaseRef.current = coachBase
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
    clearCoachFill()
  }

  const beginEdit = (entry: LibraryEntry): void => {
    if (!confirmDiscard()) return
    setSegment('mine')
    setSelectedName(entry.name)
    setDraft(draftOf(entry))
    setMode('edit')
    setReceipt(null)
    setPendingDelete(null)
    clearCoachFill()
  }

  const selectMine = (entry: LibraryEntry): void => {
    if (!confirmDiscard()) return
    setSegment('mine')
    setSelectedName(entry.name)
    setMode('read')
    setDraft(null)
    setReceipt(null)
    setPendingDelete(null)
    clearCoachFill()
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
    clearCoachFill()
  }

  const updateSection = (key: keyof LibrarySections, value: string): void => {
    if (draft === null) return
    markManual(key)
    setDraft({ ...draft, sections: { ...draft.sections, [key]: value === '' ? null : value } })
  }

  // 保存闭环（D25 2026-10-28 扩展）：页面发保存封套 → 方法编辑调 method_library_upsert 写库 →
  // 页面回读对账 → 三态回执（已发送/已回写/已落盘）→ 刷新库。面板不直写；唯一写路径是 coach 的窄工具。
  const save = async (): Promise<void> => {
    if (draft === null) return
    const name = draft.name.trim()
    if (name === '') {
      setReceipt({ ok: false, detail: '名称不能为空' })
      return
    }
    const missing = SECTION_LABELS.filter(({ key }) => {
      const value = draft.sections[key]
      return value === null || value.trim() === ''
    })
    if (missing.length > 0) {
      setReceipt({ ok: false, detail: `还缺字段：${missing.map(({ label }) => label).join('、')}——填完再保存` })
      return
    }
    if (coachId === null) {
      setReceipt({ ok: false, detail: '方法编辑暂不可用；表单可以继续填，稍后重试保存' })
      return
    }
    const existing = foldLibrary(text).find((entry) => entry.name === name)
    const renaming = mode === 'edit' && draft.currentName !== undefined && draft.currentName !== name
    if (existing !== undefined && (mode === 'new' || renaming)) {
      const confirmed = typeof window === 'undefined'
        ? true
        : window.confirm(`库里已有同名方法「${name}」，保存会覆盖它。继续？`)
      if (!confirmed) {
        setReceipt({ ok: false, detail: `未保存：库里已有「${name}」` })
        return
      }
    }
    const block = [
      renderLibraryEntry({ name, sections: draft.sections, provenance: draft.provenance, isDefault: draft.isDefault }),
      ...(draft.legacyText !== null && draft.legacyText.trim() !== '' ? [draft.legacyText.trim()] : []),
    ].join('\n')
    const action = mode === 'new' ? '新建' : `更新（原「${draft.currentName ?? name}」）`
    const envelope = `【保存封套】把下面这条方法条目写入工作区 method-library.md。\n- 动作：${action}\n- 用 method_library_upsert 工具写；写后只回复「已写入：${name}」，不要做其它事。\n\`\`\`method-draft\n${block}\n\`\`\``
    const timeout = setTimeout(() => {
      if (savePendingRef.current?.name !== name) return
      savePendingRef.current = null
      setSending(false)
      setReceipt({ ok: false, detail: '等方法编辑回话超时；可重试，库不会被写坏' })
    }, 120000)
    savePendingRef.current = { name, sections: draft.sections, timeout }
    setSending(true)
    setReceipt({ ok: true, detail: '已发送给方法编辑，等它写库…' })
    try {
      await props.sendCoach(coachId, envelope)
    } catch (cause) {
      clearTimeout(timeout)
      savePendingRef.current = null
      setSending(false)
      setReceipt({ ok: false, detail: `发送失败：${String(cause)}` })
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

  // 最近一次 run 的上下文（「从这次研究沉淀」）：只读 question.md + final.md 摘要，不重跑研究。
  useEffect(() => {
    if (sessionId === undefined) return undefined
    const controller = new AbortController()
    void (async () => {
      try {
        const listing = await props.listDir(sessionId, '', controller.signal)
        const runs = (listing ?? []).filter((item) => item.type === 'directory' && item.name.startsWith('drt_')).map((item) => item.name).sort().slice(-3)
        if (runs.length === 0) return
        const read = async (path: string): Promise<string> => {
          try {
            return (await props.readFile(sessionId, path, controller.signal, 40)) ?? ''
          } catch { return '' }
        }
        const blocks: string[] = []
        for (const run of runs) {
          const question = (await read(`${run}/question.md`)).trim()
          const final = (await read(`${run}/final.md`)).trim()
          if (question === '' && final === '') continue
          blocks.push(`- run：${run}\n  question.md：${question.slice(0, 300)}\n  final.md：${final.slice(0, 600)}`)
        }
        if (blocks.length > 0) setRunContext(blocks.join('\n'))
      } catch { /* 读取失败不砸页面；没有 run 就不带 */ }
    })()
    return () => controller.abort()
  }, [sessionId, props.listDir, props.readFile])

  // 方法编辑首问的上下文：库快照 + 当前草稿 + 内置参考（只读）。只随第一条消息发一次。
  const librarySnapshot = text === null ? '（未加载）' : text.trim() === '' ? '（空）' : text.trim()
  const draftSnapshot = draft === null
    ? '（新建：四字段为空）'
    : [
        `名称：${draft.name.trim() === '' ? '（未命名）' : draft.name}`,
        ...SECTION_LABELS.map((item) => `${item.label}：${draft.sections[item.key] ?? '（空）'}`),
      ].join('\n')
  const coachContext = [
    '【页面自动附带的上下文，不是用户输入】',
    `当前方法库（method-library.md）：\n${librarySnapshot}`,
    `当前草稿：\n${draftSnapshot}`,
    `内置参考（只读，仅对照，不要照抄）：${BUILTIN_PREFERENCES.map((entry) => `${entry.name}（${entry.summary}）`).join('；')}`,
    ...(runContext === null ? [] : [`最近的 run（用户点「从这次研究沉淀」时用它的实际做法）：\n${runContext}`]),
  ].join('\n\n')


  const clearCoachFill = (): void => {
    setManual(new Set())
    setCoachFields(new Set())
    setActiveField(null)
    setCoachBase(null)
    previousRef.current = null
  }

  // 草稿回填（字段级）：手改字段永远以用户为准，其余字段取 coach 新值；
  // 刚变化的字段记成 activeField，交给表单高亮/滚动；上一轮态保留给「撤销对话更新」。
  useEffect(() => {
    if (coachId === null || (mode !== 'edit' && mode !== 'new')) return undefined
    const controller = new AbortController()
    void props.watchCoach(coachId, controller.signal, (text) => {
      // 保存回执先于草稿解析：coach 的「已写入」回复没有 method-draft，不能被 parser 提前 return 吞掉。
      const pendingNow = savePendingRef.current
      if (pendingNow !== null && text.includes('已写入')) {
        void (async () => {
          clearTimeout(pendingNow.timeout)
          savePendingRef.current = null
          setReceipt({ ok: true, detail: '方法编辑已回写；正在回读核对…' })
          try {
            const latest = await props.readFile(sessionId, LIBRARY_PATH, new AbortController().signal, LIBRARY_READ_LIMIT)
            const saved = foldLibrary(latest).find((item) => item.name === pendingNow.name)
            const match = saved !== undefined && SECTION_LABELS.every(({ key }) => (saved.sections[key] ?? '') === (pendingNow.sections[key] ?? ''))
            if (match) {
              setReceipt({ ok: true, detail: `已落盘核对通过：${pendingNow.name}` })
              setMode('read')
              setSelectedName(pendingNow.name)
              setDraft(null)
              void load(new AbortController().signal)
            } else {
              setReceipt({ ok: false, detail: '方法编辑已回话，但库回读对不上——请点「刷新」复核' })
            }
          } catch (cause) {
            setReceipt({ ok: false, detail: `已回写但回读失败：${String(cause)}` })
          } finally {
            setSending(false)
          }
        })()
      }
      const entry = parseMethodDraft(text)
      const current = draftRef.current
      if (entry === null || current === null) return
      const merged = mergeCoachDraft(
        { name: current.name, sections: current.sections, manual: manualRef.current, base: coachBaseRef.current },
        entry,
      )
      previousRef.current = {
        draft: current,
        manual: new Set(manualRef.current),
        coachFields: new Set(coachFieldsRef.current),
        active: activeRef.current,
        base: coachBaseRef.current,
      }
      setDraft({
        ...current,
        name: merged.name,
        sections: merged.sections,
        provenance: entry.provenance ?? current.provenance,
        isDefault: entry.isDefault,
        legacyText: entry.legacyText ?? current.legacyText,
      })
      setCoachFields(new Set(merged.coachFields))
      setActiveField(merged.activeField)
      setCoachBase(entry)
    }).catch(() => { /* fail-soft：流断不砸页面 */ })
    return () => controller.abort()
  }, [coachId, mode, props.watchCoach])

  // 手改 diff 回传：用户停下 900ms 后，把改动字段作为一条「以用户为准」的消息发给方法编辑。
  useEffect(() => {
    if (coachId === null || manual.size === 0 || draft === null) return undefined
    const handle = setTimeout(() => {
      const lines = FIELD_ORDER
        .filter((field) => manual.has(field))
        .map((field) => field === 'name'
          ? `名称：${draft.name}`
          : `${FIELD_LABELS[field]}：${draft.sections[field] ?? '（空）'}`)
      void props.sendCoach(coachId, `【用户手改，以下值以用户为准，不要覆盖】\n${lines.join('\n')}`).catch(() => { /* fail-soft */ })
    }, 900)
    return () => clearTimeout(handle)
  }, [coachId, draft, manual, props.sendCoach])

  const markManual = (field: DraftField): void => {
    setManual((current) => current.has(field) ? current : new Set(current).add(field))
  }

  const onNameChange = (name: string): void => {
    markManual('name')
    setDraft((current) => current === null ? null : { ...current, name })
  }

  const undoCoach = (): void => {
    const previous = previousRef.current
    if (previous === null) return
    setDraft(previous.draft)
    setManual(previous.manual)
    setCoachFields(previous.coachFields)
    setActiveField(previous.active)
    setCoachBase(previous.base)
    previousRef.current = null
  }

  return (
    <div
      data-method-library=""
      data-method-library-edit={mode !== 'read' ? '' : undefined}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <div style={HEADER_STYLE}>
        <strong style={{ fontSize: 15 }}>方法库</strong>
        <span style={MUTED_STYLE}>本工作区共享 · 保存交方法编辑</span>
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
          {mode === 'read' && segment === 'builtin' && builtin !== null && <BuiltinView entry={builtin} />}
          {mode === 'read' && segment === 'mine' && selected !== null && <ReadMineView entry={selected} pendingDelete={pendingDelete} sending={sending} onEdit={beginEdit} onPendingDelete={setPendingDelete} onRemove={(entry) => { void remove(entry) }} />}
          {mode === 'read' && segment === 'mine' && selected === null && (
            <div style={{ ...MUTED_STYLE, paddingTop: 20 }}>
              {loadState === 'absent'
                ? '还没有方法。点「新建」写第一条；或让 Lead 从一次 run 里沉淀。'
                : query.trim() !== '' ? '没有匹配的方法。' : '从左边选一条方法。'}
            </div>
          )}
          {(mode === 'edit' || mode === 'new') && <EditorView draft={draft} mode={mode} sending={sending} onNameChange={onNameChange} onSectionChange={updateSection} onSave={() => { void save() }} onCancel={cancel} coachFields={coachFields} manualFields={manual} activeField={activeField} coachUpdated={coachBase !== null} onUndoCoach={undoCoach} />}
        </main>
        {(mode === 'edit' || mode === 'new') && sessionId !== undefined && (
          <MethodCoachPanel sessionId={sessionId} context={coachContext} ensure={props.ensureCoach} send={props.sendCoach} onCoach={setCoachId} />
        )}
      </div>
    </div>
  )
}
