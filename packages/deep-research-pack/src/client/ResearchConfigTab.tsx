/**
 * 「研究配置」页签体（D25 期 1 + detail-ux 期 1.5 —— 管理中继面）。
 *
 * 三区：① 内置研究偏好（只读卡）；② 我的偏好库（`method-library.md` 投影卡）；③ 就地回执。
 * 交互全部走 ui-primitives：条目操作 = `Menu`/`MenuItemButton`（⋯触发）；详情 = `Modal`
 * （读/编辑/新建三态，分阶段草稿——保存未落地保留草稿）；默认徽标 = `Tag`；删除 = 确认
 * `Modal`；回执 = 就地紧凑行（失败不丢内容，文案 ≤2 句）。面板不直写文件——写路径唯一 =
 * Lead 经 `session/prompt`（D25 边界）；指令文本正本 = research-brief skill 管理动词。
 * 折算住 `src/lib/library-fold.ts`（纯函数，keyless 单测）；组件薄渲染。
 */
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { Button, Input, Menu, MenuItemButton, Modal, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  createInstruction, editInstruction, foldLibrary, instructionOf,
  type LibraryEntry, type LibrarySections,
} from '../lib/library-fold.ts'

/** 页签体注入面：库文件读取 + 指令发送闭包（index.ts 装配，绑定 remote）。 */
export interface ResearchConfigTabInjected {
  /** 读工作区文本文件；不可达 → null。 */
  readonly readFile: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<string | null>
  /** 发送指令给当前会话 Lead（steer→queue 降级在闭包内）；ok=false 时 detail = 原因。 */
  readonly sendInstruction: (sessionId: SessionId, text: string) => Promise<{ ok: boolean; detail: string }>
}

/** 槽标准 props + 注入面。 */
export type ResearchConfigTabProps = PropsRuntime<'sidebar.right.pane.tab'> & ResearchConfigTabInjected

/** 内置研究偏好（只读；内容正本 = research-brief skill 方法预设表——此处仅投影）。 */
interface BuiltinPreference {
  readonly name: string
  readonly sections: LibrarySections
}

const BUILTIN_PREFERENCES: readonly BuiltinPreference[] = [
  {
    name: '事实核查',
    sections: {
      source: '官方/原始来源优先，第三方只作线索',
      verify: '逐字转写核对；关键来源独立重抓；单源结论显式标注',
      report: '快答首屏：答案+口径+依据+限制',
      limit: '不做领域覆盖；"快"由深度决定',
    },
  },
  {
    name: '领域地图',
    sections: {
      source: '广度优先铺方向，多类来源交叉定位阵营',
      verify: '覆盖对账：每个子域至少一条可核来源；盲点显式标注',
      report: '地图式：分节定位+关系+时效边界',
      limit: '不把未覆盖说成不存在',
    },
  },
  {
    name: '主张核查',
    sections: {
      source: '对称检索：正反同权重；追原始出处',
      verify: '反例权重最高；判定四态（成立/部分/不成立/证据不足）',
      report: '判定+证据强度分级+最强反证单列',
      limit: '不预设真伪；不做只找赞同的检索',
    },
  },
  {
    name: '方案比较',
    sections: {
      source: '各选项同维度查证；厂商资料与实际使用反馈并重',
      verify: '口径对齐才可比；价值权衡与事实分开',
      report: '维度化对比+适用情境+取舍说明',
      limit: '不替用户决定偏好；无场景不推唯一答案',
    },
  },
]

/** 库文件路径（工作区根；格式正本 = research-brief skill「用户方法库」）。 */
const LIBRARY_PATH = 'method-library.md'

/** 详情三态。 */
type DetailState =
  | { readonly mode: 'read'; readonly kind: 'builtin' | 'library'; readonly name: string; readonly sections: LibrarySections; readonly provenance: string | null; readonly isDefault: boolean }
  | { readonly mode: 'edit'; readonly name: string; readonly sections: LibrarySections }
  | { readonly mode: 'create'; readonly sourceName: string; readonly drafts: { name: string } & LibrarySections }

/** 四分区的固定呈现序与用户语言标签（= skill 库格式正本）。 */
const SECTIONS: readonly { key: keyof LibrarySections; label: string }[] = [
  { key: 'source', label: '找什么资料' },
  { key: 'verify', label: '怎么核实' },
  { key: 'report', label: '报告怎么写' },
  { key: 'limit', label: '明确不承诺' },
]

/**
 * 「研究配置」页签体。
 * @param props 槽 props + 注入面。
 * @returns 研究配置面板。
 */
export function ResearchConfigTab(props: ResearchConfigTabProps): ReactNode {
  const [entries, setEntries] = useState<readonly LibraryEntry[] | null>(null)
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<{ ok: boolean; text: string } | null>(null)
  const [sending, setSending] = useState(false)

  const sessionId = props.sessionId
  const reload = useCallback(async (sid: SessionId) => {
    const text = await props.readFile(sid, LIBRARY_PATH, new AbortController().signal)
    setEntries(foldLibrary(text))
  }, [props.readFile])

  useEffect(() => {
    if (sessionId === undefined) { setEntries(null); return }
    void reload(sessionId)
  }, [sessionId, reload])

  const send = async (text: string, onOk?: () => void) => {
    if (sessionId === undefined || sending) return
    setSending(true)
    try {
      const result = await props.sendInstruction(sessionId, text)
      setReceipt(result.ok
        ? { ok: true, text: `已发给 Lead：${text}` }
        : { ok: false, text: `发送失败，草稿已保留：${result.detail}` })
      if (result.ok) {
        onOk?.()
        setTimeout(() => { if (sessionId !== undefined) void reload(sessionId) }, 2500)
      }
    } finally {
      setSending(false)
    }
  }

  const cardMenu = (name: string, opts: { isBuiltin: boolean; isDefault: boolean }) => (
    <Menu
      open={menuFor === name}
      anchor={(
        <Button variant="ghost" size="sm" aria-label={`${name} 的操作`} onClick={() => setMenuFor(menuFor === name ? null : name)}>⋯</Button>
      )}
      onClose={() => setMenuFor(null)}
      align="end"
    >
      <MenuItemButton onSelect={() => { setMenuFor(null); void send(instructionOf('use-now', name)) }}>用于本次研究</MenuItemButton>
      {!opts.isBuiltin && !opts.isDefault && (
        <MenuItemButton onSelect={() => { setMenuFor(null); void send(instructionOf('set-default', name)) }}>设为默认</MenuItemButton>
      )}
      {opts.isBuiltin ? (
        <MenuItemButton onSelect={() => {
          setMenuFor(null)
          const builtin = BUILTIN_PREFERENCES.find((b) => b.name === name)
          if (builtin !== undefined) setDetail({ mode: 'create', sourceName: builtin.name, drafts: { name: `基于${builtin.name}的自定义`, ...builtin.sections } })
        }}>基于此自定义</MenuItemButton>
      ) : (
        <MenuItemButton onSelect={() => {
          setMenuFor(null)
          const entry = entries?.find((e) => e.name === name)
          if (entry !== undefined) setDetail({ mode: 'edit', name: entry.name, sections: { ...entry.sections } })
        }}>编辑内容</MenuItemButton>
      )}
      {!opts.isBuiltin && (
        <MenuItemButton danger separatorBefore onSelect={() => { setMenuFor(null); setConfirmDelete(name) }}>删除…</MenuItemButton>
      )}
    </Menu>
  )

  const card = (name: string, summary: string | null, isDefault: boolean, opts: { isBuiltin: boolean }, onOpen: () => void): ReactNode => (
    <div key={`${opts.isBuiltin ? 'b' : 'l'}-${name}`} style={{ padding: '7px 10px', marginBottom: 6, borderRadius: 6, background: opts.isBuiltin ? '#00000008' : '#22c55e14', border: opts.isBuiltin ? 'none' : '1px solid #22c55e33' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" onClick={onOpen} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'inherit' }}>
          {name} ›
        </button>
        {isDefault && <Tag tone="success">默认偏好</Tag>}
        {cardMenu(name, { isBuiltin: opts.isBuiltin, isDefault })}
      </div>
      {summary !== null && summary !== '' && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{summary}</div>}
    </div>
  )

  const sectionBlock = (label: string, value: string | null) => (
    <div key={label} style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{value ?? '（未设置）'}</div>
    </div>
  )

  const detailModal = (() => {
    if (detail === null) return null
    const drafts = detail.mode === 'read' ? null : detail.mode === 'edit' ? detail.sections : detail.mode === 'create' ? detail.drafts : null
    const setDraft = (key: keyof LibrarySections, value: string) => {
      if (detail.mode === 'edit') setDetail({ ...detail, sections: { ...detail.sections, [key]: value } })
      else if (detail.mode === 'create') setDetail({ ...detail, drafts: { ...detail.drafts, [key]: value } })
    }
    const readFooter = detail.mode === 'read' ? (
      <>
        {detail.kind === 'builtin'
          ? (
            <Button variant="outline" onClick={() => {
              const builtin = BUILTIN_PREFERENCES.find((b) => b.name === detail.name)
              if (builtin !== undefined) setDetail({ mode: 'create', sourceName: builtin.name, drafts: { name: `基于${builtin.name}的自定义`, ...builtin.sections } })
            }}>基于此自定义</Button>
          )
          : (
            <Button variant="outline" onClick={() => setDetail({ mode: 'edit', name: detail.name, sections: { ...detail.sections } })}>编辑内容</Button>
          )}
        <Button variant="primary" onClick={() => { void send(instructionOf('use-now', detail.name), () => setDetail(null)); }}>用于本次研究</Button>
      </>
    ) : null
    const editingFooter = detail.mode !== 'read' ? (
      <>
        <Button variant="ghost" onClick={() => setDetail(null)}>放弃</Button>
        <Button variant="primary" disabled={sending} onClick={() => {
          if (detail.mode === 'edit') {
            void send(editInstruction({ name: detail.name, provenance: null, isDefault: false, sections: detail.sections, legacyText: null }), () => setDetail(null))
          } else if (detail.drafts.name.trim() !== '') {
            void send(createInstruction(detail.drafts.name.trim(), detail.drafts, detail.sourceName), () => setDetail(null))
          }
        }}>{detail.mode === 'create' ? '保存为新偏好' : '把修改交给 Lead'}</Button>
      </>
    ) : null
    return (
      <Modal
        open
        onClose={() => setDetail(null)}
        title={detail.mode === 'create' ? '新建研究偏好' : detail.name}
        closeLabel="关闭详情"
        description={detail.mode === 'read' && detail.provenance !== null ? `来源：${detail.provenance}` : detail.mode === 'edit' ? '改动会发给当前会话的 Lead 执行；保存未落地前草稿都在' : '四项都会成为这条偏好的内容；保存后可在库里继续调整'}
        footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{readFooter ?? editingFooter}</div>}
      >
        {detail.mode === 'create' && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>偏好名称</div>
            <Input value={detail.drafts.name} onChange={(ev) => setDetail({ ...detail, drafts: { ...detail.drafts, name: ev.target.value } })} placeholder="给它起个好认的名字" />
          </div>
        )}
        {detail.mode === 'read'
          ? SECTIONS.map(({ key, label }) => sectionBlock(label, detail.sections[key]))
          : SECTIONS.map(({ key, label }) => (
            <div key={label} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{label}</div>
              <textarea
                value={drafts?.[key] ?? ''}
                onChange={(ev) => setDraft(key, ev.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, lineHeight: 1.5, padding: 6, borderRadius: 4, border: '1px solid #00000033', minHeight: 52 }}
              />
            </div>
          ))}
        {detail.mode === 'read' && detail.kind === 'library' && (
          <div style={{ fontSize: 12, opacity: 0.55 }}>
            想从这条出发做一份新的？点下方「编辑内容」改完后用 ⋯ 菜单另存——当前版本直接改。
          </div>
        )}
      </Modal>
    )
  })()

  const deleteModal = confirmDelete !== null ? (
    <Modal
      open
      onClose={() => setConfirmDelete(null)}
      title={`删除「${confirmDelete}」？`}
      closeLabel="取消删除"
      description="删除后新研究不再有这条偏好；已按它做完的研究不受影响。"
      footer={(
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>取消</Button>
          <Button variant="primary" disabled={sending} onClick={() => { const n = confirmDelete; setConfirmDelete(null); void send(instructionOf('remove', n)) }}>确认删除</Button>
        </div>
      )}
    />
  ) : null

  const summaryOfEntry = (entry: LibraryEntry): string | null => {
    if (entry.legacyText !== null) {
      const first = entry.legacyText.split('\n')[0]
      return (first ?? '').replace(/^- /, '').trim() || null
    }
    return entry.sections.source ?? entry.sections.verify ?? entry.sections.report
  }

  return (
    <div style={{ padding: 12, flex: 1, minHeight: 0, overflowY: 'auto', fontSize: 13, lineHeight: 1.7 }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>研究偏好</div>
      <div style={{ opacity: 0.6, marginBottom: 8, fontSize: 12 }}>点名称看它具体怎么干活；每次研究自动推荐、可换。</div>
      {BUILTIN_PREFERENCES.map((b) => card(b.name, b.sections.source, false, { isBuiltin: true }, () => setDetail({ mode: 'read', kind: 'builtin', name: b.name, sections: b.sections, provenance: null, isDefault: false })))}
      <div style={{ fontWeight: 700, margin: '10px 0 2px' }}>我的偏好库</div>
      <div style={{ opacity: 0.6, marginBottom: 6, fontSize: 12 }}>保存的常用做法（存于本工作区）；⋯ 菜单里管理。</div>
      {entries === null && <div style={{ opacity: 0.5 }}>（读取偏好库…）</div>}
      {entries !== null && entries.length === 0 && (
        <div style={{ opacity: 0.55, marginBottom: 6 }}>还没有保存的偏好——研究中说「记住这种做法」，或基于上面的内置偏好自定义。</div>
      )}
      {entries !== null && entries.map((e) => card(e.name, summaryOfEntry(e), e.isDefault, { isBuiltin: false }, () => setDetail({ mode: 'read', kind: 'library', name: e.name, sections: { ...e.sections }, provenance: e.provenance, isDefault: e.isDefault })))}
      {receipt !== null && (
        <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: 12, background: receipt.ok ? '#22c55e14' : '#ef444414', color: receipt.ok ? '#166534' : '#b91c1c' }}>
          {receipt.text}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.55, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>改动由 Lead 执行并回话（面板不直接改文件）</span>
        {sessionId !== undefined && <Button variant="ghost" size="sm" onClick={() => { if (sessionId !== undefined) void reload(sessionId) }}>刷新</Button>}
      </div>
      {detailModal}
      {deleteModal}
    </div>
  )
}
