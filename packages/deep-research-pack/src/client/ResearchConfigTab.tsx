/**
 * 「研究配置」页签体（2026-10-21 管理迁移后）。
 *
 * 当前只渲染：① 本次研究（本次采用 ＋ 来源 ＋ 换一条——读 question.md 研究方法节，五态如实）
 * 与「方法库（本工作区）→ 顶部 tab」入口；库列表/内置卡/领域示范/术语/管理回执移到主界面
 * `conversation.view` 的「方法库」tab。旧管理块保留在 COMPACT=false 分支（回滚/对照），默认不渲染。
 * 指令仍经 `session/prompt` 交 Lead（面板不直写文件）；折算住 `src/lib/`（纯函数，keyless 单测）。
 */
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Input, Menu, MenuItemButton, Modal, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  createInstruction, editInstruction, instructionOf, legacyLinesOf,
  type LibrarySections,
} from '../lib/library-fold.ts'
import { BUILTIN_PREFERENCES, SECTIONS } from '../lib/config-tables.ts'
import { displayBuiltinOf, displayNameOf, displayPatternsOf, displaySectionsOf, displaySummaryOf } from './builtin-display.ts'
import { LegacyManagementPane } from './research-config/LegacyManagementPane.tsx'
import { fieldExecutionRowsOf, specimenSkeletonsOf } from './research-config/config-model.ts'
import { sectionLabelOf } from './research-config/section-labels.ts'
import { useConfigFeed, type ResearchConfigTabInjected } from './research-config/useConfigFeed.ts'

export type { ResearchConfigTabInjected }
export type ResearchConfigTabProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsLocale<'deepResearchPack'> & ResearchConfigTabInjected



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
  const sectionLabel = (key: keyof LibrarySections): string => sectionLabelOf(props.t, key)
  const executionRows = fieldExecutionRowsOf(props.t)
  const specimenSkeletons = specimenSkeletonsOf(props.t)

  // 内置条目从这里起造草稿：名称/四字段用**显示投影**（英文界面下草稿即英文，用户条目）；
  // `sourceName` 仍是 canonical（createInstruction / 库查找的键，BUG-069）。
  const createFromBuiltin = (name: string): void => {
    const builtin = BUILTIN_PREFERENCES.find((b) => b.name === name)
    if (builtin === undefined) return
    const display = displayBuiltinOf(builtin, props.t)
    setDetail({ mode: 'create', sourceName: builtin.name, drafts: { name: props.t('basedOnBuiltin', { name: display.name }), ...display.sections } })
  }

  const cardMenu = (name: string, opts: { isBuiltin: boolean; isDefault: boolean }) => {
    const shownName = opts.isBuiltin ? displayNameOf(name, props.t) : name
    return (
    <Menu
      open={menuFor === name}
      anchor={(
        <Button variant="ghost" size="sm" aria-label={props.t('rowMenuAria', { name: shownName })} onClick={() => setMenuFor(menuFor === name ? null : name)}>⋯</Button>
      )}
      onClose={() => setMenuFor(null)}
      align="end"
    >
      <MenuItemButton onSelect={() => { setMenuFor(null); void send(instructionOf('use-now', name), { target: name, expectsChange: false }) }}>{props.t('useNow')}</MenuItemButton>
      {!opts.isBuiltin && !opts.isDefault && (
        <MenuItemButton onSelect={() => { setMenuFor(null); void send(instructionOf('set-default', name), { target: name, expectsChange: true }) }}>{props.t('setDefault')}</MenuItemButton>
      )}
      {opts.isBuiltin ? (
        <MenuItemButton onSelect={() => {
          setMenuFor(null)
          createFromBuiltin(name)
        }}>{props.t('basedOnBuiltin', { name: shownName })}</MenuItemButton>
      ) : (
        <MenuItemButton onSelect={() => {
          setMenuFor(null)
          const entry = entries?.find((e) => e.name === name)
          if (entry !== undefined) setDetail({ mode: 'edit', name: entry.name, sections: { ...entry.sections }, legacy: entry.legacyText === null ? null : legacyLinesOf(entry.legacyText).join('\n') })
        }}>{props.t('editContent')}</MenuItemButton>
      )}
      {!opts.isBuiltin && (
        <MenuItemButton danger separatorBefore onSelect={() => { setMenuFor(null); setConfirmDelete(name) }}>{props.t('deleteAction')}</MenuItemButton>
      )}
    </Menu>
    )
  }

  /** 推荐规则投影：这条打法在哪些题面形态下会被推出来（canonical = skill 判型→打法映射表；
   *  显示位走 `displayPatternsOf`，英文界面不露中文规则）。 */
  const patternsFor = (method: string): string => displayPatternsOf(method, props.t)

  /** 标本位文案：① 本工作区历史 run（仅当本会话这次研究用的就是这条）＋ ③ 内联骨架片段。 */
  const specimenLine = (name: string, isBuiltin: boolean): string => {
    if (adoption.kind === 'recorded' && adoption.adopted === name) return props.t('specimenAdopted')
    if (!isBuiltin) return props.t('specimenMine')
    return props.t('specimenBuiltin')
  }

  const card = (name: string, summary: string | null, isDefault: boolean, opts: { isBuiltin: boolean }, onOpen: () => void): ReactNode => {
    // 卡面是显示位：内置名/摘要/推荐规则走投影；库条目（用户内容）原样。
    const shownName = opts.isBuiltin ? displayNameOf(name, props.t) : name
    const shownSummary = opts.isBuiltin ? (displaySummaryOf(name, props.t) || summary) : summary
    return (
    <div key={`${opts.isBuiltin ? 'b' : 'l'}-${name}`} style={{ padding: '7px 10px', marginBottom: 6, borderRadius: 6, background: opts.isBuiltin ? '#00000008' : '#22c55e14', border: opts.isBuiltin ? 'none' : '1px solid #22c55e33' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" onClick={onOpen} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'inherit' }}>
          {shownName} ›
        </button>
        {isDefault && <Tag tone="success">{props.t('defaultPreference')}</Tag>}
        {cardMenu(name, { isBuiltin: opts.isBuiltin, isDefault })}
      </div>
      {shownSummary !== null && shownSummary !== '' && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{shownSummary}</div>}
      {opts.isBuiltin && (
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{props.t('whenToUse', { patterns: patternsFor(name) })}</div>
      )}
      <div style={{ fontSize: 11, opacity: 0.45, marginTop: 1 }}>{specimenLine(name, opts.isBuiltin)}</div>
    </div>
    )
  }

  const sectionBlock = (label: string, value: string | null) => (
    <div key={label} style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{value ?? props.t('unset')}</div>
    </div>
  )

  /** 旧格式正文逐行剥前缀：口径 = src/lib/library-fold 的 legacyLinesOf（读态单块与编辑态预填共用）。 */

  /** 旧格式正文呈现块：纯旧格式条目 = 单块「自定义要求」（无 4×未设置噪音）；混居条目 = 四分区之外追加「自定义要求（旧）」，内容零丢失。 */
  const legacyBlock = (label: string, lines: readonly string[]) => (
    <div key={label} style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{label}</div>
      {lines.length === 0
        ? <div style={{ fontSize: 13, lineHeight: 1.6 }}>{props.t('unset')}</div>
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
    // 读态内置条目：四字段值走显示投影；库条目（用户内容）与编辑/新建草稿原样。
    const displayedSections = detail.mode === 'read' && detail.kind === 'builtin'
      ? (displaySectionsOf(detail.name, props.t) ?? detail.sections)
      : null
    const readFooter = detail.mode === 'read' ? (
      <>
        {detail.kind === 'builtin'
          ? (
            <Button variant="outline" onClick={() => createFromBuiltin(detail.name)}>{props.t('basedOnBuiltin', { name: displayNameOf(detail.name, props.t) })}</Button>
          )
          : (
            <Button variant="outline" onClick={() => setDetail({ mode: 'edit', name: detail.name, sections: { ...detail.sections }, legacy: detail.legacyText === null ? null : legacyLinesOf(detail.legacyText).join('\n') })}>{props.t('editContent')}</Button>
          )}
        <Button variant="primary" onClick={() => { void send(instructionOf('use-now', detail.name), { target: detail.name, expectsChange: false }, () => setDetail(null)); }}>{props.t('useNow')}</Button>
      </>
    ) : null
    const editingFooter = detail.mode !== 'read' ? (
      <>
        <Button variant="ghost" onClick={() => setDetail(null)}>{props.t('discard')}</Button>
        <Button variant="primary" disabled={sending} onClick={() => {
          if (detail.mode === 'edit') {
            // 旧正文草稿喂给 editInstruction：四分区留空 + 旧文在场 → 旧格式整段载荷（Lead 迁移路径）；
            // 旧文清空或分区已填 → 四字段载荷（旧文用户已见过，迁移为明示选择）。
            const legacyText = detail.legacy !== null && detail.legacy.trim() !== '' ? detail.legacy : null
            void send(editInstruction({ name: detail.name, provenance: null, isDefault: false, sections: detail.sections, legacyText }), { target: detail.name, expectsChange: true }, () => setDetail(null))
          } else if (detail.drafts.name.trim() !== '') {
            void send(createInstruction(detail.drafts.name.trim(), detail.drafts, detail.sourceName), { target: detail.drafts.name.trim(), expectsChange: true }, () => setDetail(null))
          }
        }}>{detail.mode === 'create' ? props.t('handToLeadNew') : props.t('handToLeadEdit')}</Button>
      </>
    ) : null
    return (
      <Modal
        open
        onClose={() => setDetail(null)}
        title={detail.mode === 'create' ? props.t('newPreference') : detail.mode === 'read' && detail.kind === 'builtin' ? displayNameOf(detail.name, props.t) : detail.name}
        closeLabel={props.t('closeDetail')}
        description={detail.mode === 'read' && detail.provenance !== null ? props.t('provenancePrefix', { provenance: detail.provenance }) : detail.mode === 'edit' ? props.t('configDetailEditDesc') : props.t('configDetailCreateDesc')}
        footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{readFooter ?? editingFooter}</div>}
      >
        {/* 正文内滚（2026-10-18 实测缺陷修复）：显式化块让详情变高——不设上限时弹窗高过视口，
            头部关闭钮被顶到视口外点不到（client-load-smoke 实测 1129px 弹窗 / 720px 视口）。
            maxHeight 用 vh，短窗口同样成立。 */}
        <div style={{ maxHeight: '52vh', overflowY: 'auto', paddingRight: 4 }}>
        {detail.mode === 'create' && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{props.t('preferenceName')}</div>
            <Input value={detail.drafts.name} onChange={(ev) => setDetail({ ...detail, drafts: { ...detail.drafts, name: ev.target.value } })} placeholder={props.t('preferenceNamePlaceholder')} />
          </div>
        )}
        {detail.mode === 'read'
          ? (detail.kind === 'library' && detail.legacyText !== null && SECTIONS.every(({ key }) => detail.sections[key] === null)
              // 纯旧格式条目：单块「自定义要求」（detail-ux 卡库格式升级节的兼容承诺）
              ? legacyBlock(props.t('preferenceCustomRequirement'), legacyLinesOf(detail.legacyText))
              : (
                <>
                  {SECTIONS.map(({ key }) => sectionBlock(sectionLabel(key), displayedSections?.[key] ?? detail.sections[key]))}
                  {detail.kind === 'library' && detail.legacyText !== null ? legacyBlock(props.t('preferenceCustomRequirementLegacy'), legacyLinesOf(detail.legacyText)) : null}
                </>
                ))
          : SECTIONS.map(({ key }) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{sectionLabel(key)}</div>
              <textarea
                value={drafts?.[key] ?? ''}
                onChange={(ev) => setDraft(key, ev.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, lineHeight: 1.5, padding: 6, borderRadius: 4, border: '1px solid #00000033', minHeight: 52 }}
              />
            </div>
          ))}
        {detail.mode === 'edit' && detail.legacy !== null && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{props.t('legacyBodyTitle')}</div>
            <textarea
              value={detail.legacy}
              onChange={(ev) => setDetail({ ...detail, legacy: ev.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, lineHeight: 1.5, padding: 6, borderRadius: 4, border: '1px solid #00000033', minHeight: 52 }}
            />
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{props.t('legacyBodyHint')}</div>
          </div>
        )}
        {detail.mode === 'read' && detail.kind === 'library' && (
          <div style={{ fontSize: 12, opacity: 0.55 }}>
            {props.t('libraryDeriveHint')}
          </div>
        )}
        {detail.mode === 'read' && (
          <div style={{ marginTop: 10, borderTop: '1px solid #00000018', paddingTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 4 }}>{props.t('executionTitle')}</div>
            {executionRows.map((row) => (
              <div key={row.key} style={{ marginBottom: 6, fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{sectionLabel(row.key)}</div>
                <div style={{ opacity: 0.8 }}>{props.t('executionWho', { value: row.who })}</div>
                <div style={{ opacity: 0.8 }}>{props.t('executionWhere', { value: row.where })}</div>
                <div style={{ opacity: 0.7 }}>{props.t('executionCannot', { value: row.cannot })}</div>
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, margin: '8px 0 4px' }}>{props.t('baselineTitle')}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{props.t('baselineDisciplines')}</div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
              {props.t('baselineHint')}
            </div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
              {props.t('sourceChainVsSource')}
              {props.t('baselineReadiness')}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, margin: '8px 0 4px' }}>{props.t('specimenTitle')}</div>
            {(specimenSkeletons[detail.name] ?? props.t('specimenFallback').split('\n')).map((line, i) => (
              <div key={i} style={{ fontSize: 12, opacity: 0.8 }}>{i + 1}. {line}</div>
            ))}
            <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>{specimenLine(detail.name, detail.kind === 'builtin')}</div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, margin: '8px 0 4px' }}>{props.t('recommendTitle')}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {detail.kind === 'builtin'
                ? patternsFor(detail.name)
                : props.t('builtinNotAutoRecommended')}
            </div>
            <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>{props.t('recommendRuleHint')}</div>
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
      title={props.t('deletePreferenceConfirm', { name: confirmDelete })}
      closeLabel={props.t('cancelDelete')}
      description={props.t('deletePreferenceDesc')}
      footer={(
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>{props.t('cancel')}</Button>
          <Button variant="primary" disabled={sending} onClick={() => { const n = confirmDelete; setConfirmDelete(null); void send(instructionOf('remove', n), { target: n, expectsChange: true }) }}>{props.t('confirmDeleteAction')}</Button>
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
        <MenuItemButton key={b.name} onSelect={() => { setSwitchOpen(false); void send(instructionOf('use-now', b.name), { target: b.name, expectsChange: false }) }}>{displayNameOf(b.name, props.t)}</MenuItemButton>
      ))}
      {(entries ?? []).map((e) => (
        <MenuItemButton key={`l-${e.name}`} onSelect={() => { setSwitchOpen(false); void send(instructionOf('use-now', e.name), { target: e.name, expectsChange: false }) }}>{e.name}</MenuItemButton>
      ))}
    </Menu>
  )

  return (
    <div style={{ padding: 12, flex: 1, minHeight: 0, overflowY: 'auto', fontSize: 13, lineHeight: 1.7 }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{props.t('configHeader')}</div>
      <div style={{ opacity: 0.65, marginBottom: 8, fontSize: 11, lineHeight: 1.6 }}>
        {COMPACT
          ? props.t('configMethodHint')
          : props.t('configPreferenceHint')}
      </div>

      {/* ① 本次研究（置顶）：本次采用 ＋ 来源 ＋ 换一条；五态如实，判不了就说判不了。 */}
      <div style={{ padding: '7px 10px', marginBottom: 8, borderRadius: 6, background: '#3b82f60f', border: '1px solid #3b82f633' }}>
        <div style={{ fontWeight: 700, fontSize: 12, opacity: 0.75 }}>{props.t('configThisRun')}</div>
        {adoption.kind === 'recorded' && (
          <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            <span>{props.t('configThisRunAdopted', { name: adoption.adopted === null ? '' : displayNameOf(adoption.adopted, props.t) })}</span>
            {adoption.origin !== null && <span style={{ opacity: 0.7 }}>{props.t('configSourceInline', { origin: adoption.origin })}</span>}
            <span style={{ opacity: 0.4 }}>·</span>
            {methodPicker(props.t('switchMethod'))}
          </div>
        )}
        {adoption.kind === 'no-run' && (
          <div style={{ marginTop: 2, opacity: 0.75, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            {props.t('configNoRun')}
            {methodPicker(props.t('pickMethodForLead'))}
          </div>
        )}
        {adoption.kind === 'missing' && (
          <div style={{ marginTop: 2, opacity: 0.75 }}>{props.t('configMissingQuestion')}</div>
        )}
        {adoption.kind === 'unrecorded' && (
          <div style={{ marginTop: 2, opacity: 0.75 }}>{props.t('configUnrecorded')}</div>
        )}
        {adoption.kind === 'unparsable' && (
          <div style={{ marginTop: 2, opacity: 0.75 }}>{props.t('configUnparsable')}</div>
        )}
        {adoption.kind === 'recorded' && adoption.requirements !== null && (
          <div style={{ marginTop: 2, fontSize: 11, opacity: 0.6 }}>{props.t('configRequirements', { text: adoption.requirements })}</div>
        )}
      </div>

      {COMPACT && (
        <div style={{ padding: '7px 10px', marginBottom: 8, borderRadius: 6, background: '#00000005', border: '1px solid #00000012' }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{props.t('configLibrarySection')}</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>
            {props.t('configLibraryHint')}
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
          t={props.t}
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
