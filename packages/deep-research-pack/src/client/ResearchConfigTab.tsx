/**
 * 「研究配置」页签体（2026-10-21 管理迁移后）。
 *
 * 当前只渲染：① 本次研究（本次采用 ＋ 来源 ＋ 换一条——读 question.md 研究方法节，五态如实）
 * 与「方法库（本工作区）→ 顶部 tab」入口；库列表/内置卡/领域示范/术语/管理回执移到主界面
 * `conversation.view` 的「方法库」tab。旧管理块保留在 COMPACT=false 分支（回滚/对照），默认不渲染。
 * 指令仍经 `session/prompt` 交 Lead（面板不直写文件）；折算住 `src/lib/`（纯函数，keyless 单测）。
 */
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Input, Menu, MenuItemButton, Modal, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  createInstruction, editInstruction, instructionOf, legacyLinesOf,
  type LibrarySections,
} from '../lib/library-fold.ts'
import { BASELINE_DISCIPLINES, BUILTIN_PREFERENCES, PATTERN_METHOD_RULES, SECTIONS } from '../lib/config-tables.ts'
import { LegacyManagementPane } from './research-config/LegacyManagementPane.tsx'
import { FIELD_EXECUTION_ROWS, SPECIMEN_SKELETONS, SPECIMEN_SKELETON_FALLBACK } from './research-config/config-model.ts'
import { useConfigFeed, type ResearchConfigTabInjected } from './research-config/useConfigFeed.ts'

export type { ResearchConfigTabInjected }
export type ResearchConfigTabProps = PropsRuntime<'sidebar.right.pane.tab'> & ResearchConfigTabInjected



/**
 * 「研究配置」页签体。
 * @param props 槽 props + 注入面。
 * @returns 研究配置面板。
 */
export function ResearchConfigTab(props: ResearchConfigTabProps): ReactNode {
  const {
    COMPACT, entries, detail, setDetail, menuFor, setMenuFor, confirmDelete, setConfirmDelete,
    switchOpen, setSwitchOpen, sending, receipt, send, adoption, libraryRead, reload,
  } = useConfigFeed(props)
  const sessionId = props.sessionId

  const cardMenu = (name: string, opts: { isBuiltin: boolean; isDefault: boolean }) => (
    <Menu
      open={menuFor === name}
      anchor={(
        <Button variant="ghost" size="sm" aria-label={`${name} 的操作`} onClick={() => setMenuFor(menuFor === name ? null : name)}>⋯</Button>
      )}
      onClose={() => setMenuFor(null)}
      align="end"
    >
      <MenuItemButton onSelect={() => { setMenuFor(null); void send(instructionOf('use-now', name), { target: name, expectsChange: false }) }}>用于本次研究</MenuItemButton>
      {!opts.isBuiltin && !opts.isDefault && (
        <MenuItemButton onSelect={() => { setMenuFor(null); void send(instructionOf('set-default', name), { target: name, expectsChange: true }) }}>设为默认</MenuItemButton>
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
          if (entry !== undefined) setDetail({ mode: 'edit', name: entry.name, sections: { ...entry.sections }, legacy: entry.legacyText === null ? null : legacyLinesOf(entry.legacyText).join('\n') })
        }}>编辑内容</MenuItemButton>
      )}
      {!opts.isBuiltin && (
        <MenuItemButton danger separatorBefore onSelect={() => { setMenuFor(null); setConfirmDelete(name) }}>删除…</MenuItemButton>
      )}
    </Menu>
  )

  /** 推荐规则投影：这条打法在哪些题面形态下会被推出来（正本 = skill 判型→打法映射表）。 */
  const patternsFor = (method: string): string =>
    PATTERN_METHOD_RULES.filter((r) => r.method === method).map((r) => r.patterns).join(' · ')

  /** 标本位文案：① 本工作区历史 run（仅当本会话这次研究用的就是这条）＋ ③ 内联骨架片段。 */
  const specimenLine = (name: string, isBuiltin: boolean): string => {
    if (adoption.kind === 'recorded' && adoption.adopted === name) return `标本：本会话这次研究用的就是这条`
    if (!isBuiltin) return '标本：按这条做过研究后，这里会挂上那一次的成品（点开看产出骨架）'
    return '标本：跑过一场用这条打法的研究后，这里会挂上那一次的成品（点开看产出骨架）'
  }

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
      {opts.isBuiltin && (
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>什么时候用它：{patternsFor(name)}</div>
      )}
      <div style={{ fontSize: 11, opacity: 0.45, marginTop: 1 }}>{specimenLine(name, opts.isBuiltin)}</div>
    </div>
  )

  const sectionBlock = (label: string, value: string | null) => (
    <div key={label} style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{value ?? '（未设置）'}</div>
    </div>
  )

  /** 旧格式正文逐行剥前缀：口径 = src/lib/library-fold 的 legacyLinesOf（读态单块与编辑态预填共用）。 */

  /** 旧格式正文呈现块：纯旧格式条目 = 单块「自定义要求」（无 4×未设置噪音）；混居条目 = 四分区之外追加「自定义要求（旧）」，内容零丢失。 */
  const legacyBlock = (label: string, lines: readonly string[]) => (
    <div key={label} style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{label}</div>
      {lines.length === 0
        ? <div style={{ fontSize: 13, lineHeight: 1.6 }}>（未设置）</div>
        : lines.map((l, i) => <div key={i} style={{ fontSize: 13, lineHeight: 1.6 }}>{l}</div>)}
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
            <Button variant="outline" onClick={() => setDetail({ mode: 'edit', name: detail.name, sections: { ...detail.sections }, legacy: detail.legacyText === null ? null : legacyLinesOf(detail.legacyText).join('\n') })}>编辑内容</Button>
          )}
        <Button variant="primary" onClick={() => { void send(instructionOf('use-now', detail.name), { target: detail.name, expectsChange: false }, () => setDetail(null)); }}>用于本次研究</Button>
      </>
    ) : null
    const editingFooter = detail.mode !== 'read' ? (
      <>
        <Button variant="ghost" onClick={() => setDetail(null)}>放弃</Button>
        <Button variant="primary" disabled={sending} onClick={() => {
          if (detail.mode === 'edit') {
            // 旧正文草稿喂给 editInstruction：四分区留空 + 旧文在场 → 旧格式整段载荷（Lead 迁移路径）；
            // 旧文清空或分区已填 → 四字段载荷（旧文用户已见过，迁移为明示选择）。
            const legacyText = detail.legacy !== null && detail.legacy.trim() !== '' ? detail.legacy : null
            void send(editInstruction({ name: detail.name, provenance: null, isDefault: false, sections: detail.sections, legacyText }), { target: detail.name, expectsChange: true }, () => setDetail(null))
          } else if (detail.drafts.name.trim() !== '') {
            void send(createInstruction(detail.drafts.name.trim(), detail.drafts, detail.sourceName), { target: detail.drafts.name.trim(), expectsChange: true }, () => setDetail(null))
          }
        }}>{detail.mode === 'create' ? '交给 Lead 新建' : '把修改交给 Lead'}</Button>
      </>
    ) : null
    return (
      <Modal
        open
        onClose={() => setDetail(null)}
        title={detail.mode === 'create' ? '新建研究偏好' : detail.name}
        closeLabel="关闭详情"
        description={detail.mode === 'read' && detail.provenance !== null ? `来源：${detail.provenance}` : detail.mode === 'edit' ? '改动会发给当前会话的 Lead 执行；保存未落地前草稿都在' : '四项会成为这条偏好的内容；点按钮是**发给 Lead 由它建进库**（面板不直接改文件），回执见面板底部'}
        footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{readFooter ?? editingFooter}</div>}
      >
        {/* 正文内滚（2026-10-18 实测缺陷修复）：显式化块让详情变高——不设上限时弹窗高过视口，
            头部关闭钮被顶到视口外点不到（client-load-smoke 实测 1129px 弹窗 / 720px 视口）。
            maxHeight 用 vh，短窗口同样成立。 */}
        <div style={{ maxHeight: '52vh', overflowY: 'auto', paddingRight: 4 }}>
        {detail.mode === 'create' && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>偏好名称</div>
            <Input value={detail.drafts.name} onChange={(ev) => setDetail({ ...detail, drafts: { ...detail.drafts, name: ev.target.value } })} placeholder="给它起个好认的名字" />
          </div>
        )}
        {detail.mode === 'read'
          ? (detail.kind === 'library' && detail.legacyText !== null && SECTIONS.every(({ key }) => detail.sections[key] === null)
              // 纯旧格式条目：单块「自定义要求」（detail-ux 卡库格式升级节的兼容承诺）
              ? legacyBlock('自定义要求', legacyLinesOf(detail.legacyText))
              : (
                <>
                  {SECTIONS.map(({ key, label }) => sectionBlock(label, detail.sections[key]))}
                  {detail.kind === 'library' && detail.legacyText !== null ? legacyBlock('自定义要求（旧）', legacyLinesOf(detail.legacyText)) : null}
                </>
                ))
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
        {detail.mode === 'edit' && detail.legacy !== null && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>自定义要求（旧正文）</div>
            <textarea
              value={detail.legacy}
              onChange={(ev) => setDetail({ ...detail, legacy: ev.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, lineHeight: 1.5, padding: 6, borderRadius: 4, border: '1px solid #00000033', minHeight: 52 }}
            />
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>旧格式正文：四分区留空时按此整段发给 Lead（由它迁移到新格式）；改填四分区则以四分区为准。</div>
          </div>
        )}
        {detail.mode === 'read' && detail.kind === 'library' && (
          <div style={{ fontSize: 12, opacity: 0.55 }}>
            想从这条出发做一份新的？点下方「编辑内容」改完后用 ⋯ 菜单另存——当前版本直接改。
          </div>
        )}
        {detail.mode === 'read' && (
          <div style={{ marginTop: 10, borderTop: '1px solid #00000018', paddingTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 4 }}>这条要求谁读它、在哪生效、管不到什么</div>
            {FIELD_EXECUTION_ROWS.map((row) => (
              <div key={row.key} style={{ marginBottom: 6, fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{SECTIONS.find((s) => s.key === row.key)?.label ?? row.key}</div>
                <div style={{ opacity: 0.8 }}>谁读它：{row.who}</div>
                <div style={{ opacity: 0.8 }}>在哪生效：{row.where}</div>
                <div style={{ opacity: 0.7 }}>管不到：{row.cannot}</div>
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, margin: '8px 0 4px' }}>任何打法都改不掉（共同底线）</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{BASELINE_DISCIPLINES.join(' · ')}</div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
              偏好只能往上加要求，不能减底线；「基于此自定义」新建的副本同样受这六条约束。
            </div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
              与上面四字段的区别：「找来源」改的是"去哪儿找"（可改）；「来源链」管的是"每条结论必须能追到 evidence"
              （改不掉）。readiness = critic 在 review.md 给的终局判定（PASS 才进交付审阅），它也不由偏好设置。
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, margin: '8px 0 4px' }}>产出长这样（标本骨架）</div>
            {(SPECIMEN_SKELETONS[detail.name] ?? SPECIMEN_SKELETON_FALLBACK).map((line, i) => (
              <div key={i} style={{ fontSize: 12, opacity: 0.8 }}>{i + 1}. {line}</div>
            ))}
            <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>{specimenLine(detail.name, detail.kind === 'builtin')}</div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, margin: '8px 0 4px' }}>什么时候会推荐它</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {detail.kind === 'builtin'
                ? patternsFor(detail.name)
                : '库条目不会被自动推荐；立项对齐时 Lead 把它作为推荐参考（题面指定的方法与约束仍优先）。'}
            </div>
            <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>推荐规则正本 = research-brief skill 的「判型 → 打法映射」表；面板是它的投影。</div>
          </div>
        )}
        </div>
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
          <Button variant="primary" disabled={sending} onClick={() => { const n = confirmDelete; setConfirmDelete(null); void send(instructionOf('remove', n), { target: n, expectsChange: true }) }}>确认删除</Button>
        </div>
      )}
    />
  ) : null

  const methodPicker = (label: string) => (
    <Menu
      open={switchOpen}
      anchor={<Button variant="ghost" size="sm" onClick={() => setSwitchOpen(!switchOpen)}>{label}</Button>}
      onClose={() => setSwitchOpen(false)}
      align="start"
    >
      {BUILTIN_PREFERENCES.map((b) => (
        <MenuItemButton key={b.name} onSelect={() => { setSwitchOpen(false); void send(instructionOf('use-now', b.name), { target: b.name, expectsChange: false }) }}>{b.name}</MenuItemButton>
      ))}
      {(entries ?? []).map((e) => (
        <MenuItemButton key={`l-${e.name}`} onSelect={() => { setSwitchOpen(false); void send(instructionOf('use-now', e.name), { target: e.name, expectsChange: false }) }}>{e.name}</MenuItemButton>
      ))}
    </Menu>
  )

  return (
    <div style={{ padding: 12, flex: 1, minHeight: 0, overflowY: 'auto', fontSize: 13, lineHeight: 1.7 }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>研究偏好</div>
      <div style={{ opacity: 0.65, marginBottom: 8, fontSize: 11, lineHeight: 1.6 }}>
        {COMPACT
          ? '本次研究采用哪条打法；「换一条」都是给 Lead 发一条指令。编辑/新建/删除在**有对话的会话**顶部「方法库」tab（空白 New Session 不显示 view tabs）。'
          : '一条「研究偏好」＝一条打法＝一份四字段配方（找来源／怎么核实／报告怎么写／不承诺）。'}
      </div>

      {/* ① 本次研究（置顶）：本次采用 ＋ 来源 ＋ 换一条；五态如实，判不了就说判不了。 */}
      <div style={{ padding: '7px 10px', marginBottom: 8, borderRadius: 6, background: '#3b82f60f', border: '1px solid #3b82f633' }}>
        <div style={{ fontWeight: 700, fontSize: 12, opacity: 0.75 }}>本次研究</div>
        {adoption.kind === 'recorded' && (
          <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            <span>本次研究：{adoption.adopted}</span>
            {adoption.origin !== null && <span style={{ opacity: 0.7 }}>（来源：{adoption.origin}）</span>}
            <span style={{ opacity: 0.4 }}>·</span>
            {methodPicker('换一条')}
          </div>
        )}
        {adoption.kind === 'no-run' && (
          <div style={{ marginTop: 2, opacity: 0.75, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            本会话暂无研究——选一条打法交给 Lead，或直接在对话里提问。
            {methodPicker('选方法（发给 Lead）')}
          </div>
        )}
        {adoption.kind === 'missing' && (
          <div style={{ marginTop: 2, opacity: 0.75 }}>本会话有研究目录，但里面的 question.md 不在——可能还没立项完成，或文件被移走了。</div>
        )}
        {adoption.kind === 'unrecorded' && (
          <div style={{ marginTop: 2, opacity: 0.75 }}>这次研究的方法节没记在 question.md 里（早期研究可能如此）——如实显示「未记录」，不替你补写。</div>
        )}
        {adoption.kind === 'unparsable' && (
          <div style={{ marginTop: 2, opacity: 0.75 }}>方法节在场，但读不出用的是哪条（写法无法判定）——面板不猜。</div>
        )}
        {adoption.kind === 'recorded' && adoption.requirements !== null && (
          <div style={{ marginTop: 2, fontSize: 11, opacity: 0.6 }}>本次要求（来自这次 run 的方法节）：{adoption.requirements}</div>
        )}
      </div>

      {COMPACT && (
        <div style={{ padding: '7px 10px', marginBottom: 8, borderRadius: 6, background: '#00000005', border: '1px solid #00000012' }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>方法库（本工作区）</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>
            编辑、新建、删除、内置参考都在顶部「方法库」tab；这里只保留本次研究采用与「换一条」。
          </div>
        </div>
      )}
      {COMPACT && receipt !== null && (
        <div style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 6, fontSize: 12, background: receipt.state === 'failed' ? '#ef444414' : '#22c55e14', color: receipt.state === 'failed' ? '#b91c1c' : '#166534' }}>
          {receipt.text}
        </div>
      )}
      {!COMPACT && (
        <LegacyManagementPane
          entries={entries}
          libraryRead={libraryRead}
          receipt={receipt}
          sending={sending}
          sessionId={sessionId}
          card={card}
          onOpenDetail={setDetail}
          send={send}
          onRefresh={() => { if (sessionId !== undefined) void reload(sessionId) }}
        />
      )}
      {detailModal}
      {deleteModal}
    </div>
  )
}
