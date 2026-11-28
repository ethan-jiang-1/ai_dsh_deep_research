/**
 * 「研究配置」页签体。
 *
 * 渲染：① 项目研究默认（DefaultsPanel）；② 本次研究采用的方法与「换一条」（读 question.md
 * 研究方法节，五态如实）；③ 指向左侧全局「研究工作台 → 方法库」的一键入口与指令回执。
 * 指令经 `session/prompt` 交 Lead（面板不直写文件）；折算住纯函数层。
 */
import { useEffect, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Menu, MenuItemButton } from '@deepseek-ai/dsh-client-ui-primitives'
import { instructionOf } from '../lib/method-library/library-fold.ts'
import { BUILTIN_PREFERENCES } from '../lib/shared/config-tables.ts'
import { displayNameOf } from './builtin-display.ts'
import { useConfigFeed, type ResearchConfigTabInjected } from './research-config/useConfigFeed.ts'
import { DefaultsPanel } from './defaults/DefaultsPanel.tsx'
import css from './research-config/config.module.css'

export type { ResearchConfigTabInjected }
export type ResearchConfigTabProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsLocale<'deepResearchPack'> & ResearchConfigTabInjected

/**
 * 「研究配置」页签体。
 * @param props 槽 props + 注入面。
 * @returns 研究配置面板。
 */
export function ResearchConfigTab(props: ResearchConfigTabProps): ReactNode {
  const tabInfo = typeof (props as { useTabInfo?: () => { tab?: { actions?: { bindCommands?: (c: { refresh: () => void }) => () => void } } } }).useTabInfo === 'function'
    ? (props as { useTabInfo: () => { tab?: { actions?: { bindCommands?: (c: { refresh: () => void }) => () => void } } } }).useTabInfo()
    : undefined
  const {
    entries, switchOpen, setSwitchOpen, receipt, send, adoption, retryAdoption, reload,
  } = useConfigFeed(props)
  const sessionId = props.sessionId
  useEffect(() => {
    const bind = tabInfo?.tab?.actions?.bindCommands
    if (typeof bind !== 'function') return undefined
    return bind({ refresh: () => { if (sessionId !== undefined) void reload(sessionId) } })
  }, [tabInfo, sessionId, reload])

  const methodPicker = (label: string) => (
    <Menu
      open={switchOpen}
      portal
      listClassName={css.switchMenuList ?? ''}
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
    <div className={css.root}>
      <div className={css.header}>{props.t('configHeader')}</div>
      {sessionId === undefined ? null : (
        <DefaultsPanel
          sessionId={sessionId}
          store={props.defaults}
          t={props.t}
          {...(props.openMethodLibrary === undefined ? {} : { onOpenMethodLibrary: props.openMethodLibrary })}
        />
      )}
      <div className={css.hint}>{props.t('configMethodHint')}</div>

      {/* ① 本次研究（置顶）：本次采用 ＋ 来源 ＋ 换一条；五态如实，判不了就说判不了。 */}
      <div className={css.thisRunBox}>
        <div className={css.sectionTitle}>{props.t('configThisRun')}</div>
        {adoption.kind === 'recorded' && (
          <div className={css.thisRunRow}>
            <span>{props.t('configThisRunAdopted', { name: adoption.adopted === null ? '' : displayNameOf(adoption.adopted, props.t) })}</span>
            {adoption.origin !== null && <span className={css.inlineMuted}>{props.t('configSourceInline', { origin: adoption.origin })}</span>}
            <span className={css.dotMuted}>·</span>
            {methodPicker(props.t('switchMethod'))}
          </div>
        )}
        {adoption.kind === 'no-run' && (
          <div className={css.thisRunMuted}>
            {props.t('configNoRun')}
            {methodPicker(props.t('pickMethodForLead'))}
          </div>
        )}
        {adoption.kind === 'missing' && (
          <div className={css.thisRunMuted}>{props.t('configMissingQuestion')}</div>
        )}
        {adoption.kind === 'question-unreadable' && (
          <div className={css.warnRow}>
            ⚠ {props.t('statusQuestionReadFailed')}
            <button type="button" onClick={retryAdoption} className={css.retryLink}>{props.t('retry')}</button>
          </div>
        )}
        {adoption.kind === 'question-empty' && (
          <div className={css.warnRow}>
            ⚠ {props.t('statusQuestionEmpty')}
            <button type="button" onClick={retryAdoption} className={css.retryLink}>{props.t('retry')}</button>
          </div>
        )}
        {adoption.kind === 'unrecorded' && (
          <div className={css.thisRunMuted}>{props.t('configUnrecorded')}</div>
        )}
        {adoption.kind === 'unparsable' && (
          <div className={css.thisRunMuted}>{props.t('configUnparsable')}</div>
        )}
        {adoption.kind === 'recorded' && adoption.requirements !== null && (
          <div className={css.reqLine}>{props.t('configRequirements', { text: adoption.requirements })}</div>
        )}
      </div>

      <div className={css.libraryEntryBox}>
        <div className={css.libraryEntryHeader}>
          <div className={css.libraryEntryTitle}>{props.t('configLibrarySection')}</div>
          {props.openMethodLibrary !== undefined && (
            <Button
              variant="outline"
              size="sm"
              data-testid="config-open-method-library"
              onClick={props.openMethodLibrary}
            >
              {props.t('configOpenMethodLibrary')}
            </Button>
          )}
        </div>
        <div className={css.libraryEntryHint}>{props.t('configLibraryHint')}</div>
      </div>

      {receipt !== null && (
        <div className={receipt.state === 'failed' ? css.receiptFailed : css.receiptOk}>
          {receipt.text}
        </div>
      )}
    </div>
  )
}
