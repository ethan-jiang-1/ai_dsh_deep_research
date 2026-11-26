// LegacyManagementPane.tsx — 「研究配置」页签的**四区旧管理面**（D25 回滚分支）。
//
// 默认 `COMPACT=true` 只渲染摘要面；本件是 `COMPACT=false` 时的对照/回滚形态，保留但不默认
// 渲染。2026-10-28 Phase C 把它从 601 行的页签体里整块搬出（约 70 行 JSX）：页签体只留
// "哪一版在渲染"的判断，四区形态自己的结构在本件里读。
//
// 为什么保留而不是删：D25 记录了管理面迁移到「方法库」tab，回滚分支是那次迁移的对照物；
// 删除属改记录决定，退役条件登记在维护者触发账（不随包）。
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PackTranslate } from '../../lib/shared/i18n.ts'
import { BUILTIN_PREFERENCES, DISTILL_INSTRUCTION, DRAFT_INSTRUCTION, PATTERN_METHOD_RULES, SECTIONS } from '../../lib/shared/config-tables.ts'
import { displayDemoOf, displayNameOf } from '../builtin-display.ts'
import { summaryOfEntry, type LibraryEntry, type LibrarySections } from '../../lib/method-library/library-fold.ts'
import { sectionLabelOf } from './section-labels.ts'
import css from './config.module.css'

export interface LegacyManagementPaneProps {
  /** 当前 UI 翻译器（四区回滚面同样要双语，BUG-055）。 */
  readonly t: PackTranslate
  /** 库条目（null = 尚未读到；空数组 = 读到了但库为空）。 */
  readonly entries: readonly LibraryEntry[] | null
  readonly libraryRead: 'loading' | 'unreadable' | 'absent' | 'ok'
  readonly receipt: { readonly state: 'sent' | 'replied' | 'landed' | 'failed'; readonly text: string } | null
  readonly sending: boolean
  readonly sessionId: string | undefined
  /** 卡片渲染器（页签体里的同一份，保证两版条目外观一致）。 */
  readonly card: (name: string, summary: string | null, isDefault: boolean, opts: { isBuiltin: boolean }, onOpen: () => void) => ReactNode
  readonly onOpenDetail: (entry: {
    mode: 'read'
    kind: 'builtin' | 'library'
    name: string
    sections: LibrarySections
    provenance: string | null
    isDefault: boolean
    legacyText: string | null
  }) => void
  readonly send: (text: string, opts: { target: null; expectsChange: false }) => Promise<unknown>
  readonly onRefresh: () => void
}


export function LegacyManagementPane(props: LegacyManagementPaneProps): ReactNode {
  const { t, entries, libraryRead, receipt, sending, sessionId, card, onOpenDetail, send, onRefresh } = props
  // 显示位：打法名/领域示范走显示投影（canonical 仍是映射表的键；BUG-069）。
  const demo = displayDemoOf(t)
  const rules = PATTERN_METHOD_RULES.map((r) => `${r.patterns.split(' · ').map((p) => p.split(' ')[0]).join('·')}→${displayNameOf(r.method, t)}`).join(t('ruleSeparator'))
  return (
    <>

      {/* ② 内置研究偏好（只读）＋ 推荐规则说明位（①-4 呈现位，始终在场）。 */}
      <div className={css.legacyHeadingFirst}>{t('legacyBuiltinTitle')}</div>
      <div className={css.legacyHint}>
        {t('legacyBuiltinHint', { rules })}
      </div>
      {BUILTIN_PREFERENCES.map((b) => card(b.name, b.summary, false, { isBuiltin: true }, () => onOpenDetail({ mode: 'read', kind: 'builtin', name: b.name, sections: b.sections, provenance: null, isDefault: false, legacyText: null })))}

      {/* ③ 我的偏好库（本工作区数据）。 */}
      <div className={css.legacyHeading}>{t('legacyMineTitle')}</div>
      <div className={css.legacyHint}>{t('legacyMineHint')}</div>
      {libraryRead === 'loading' && entries === null && <div className={css.legacyStatusText}>{t('legacyLoading')}</div>}
      {libraryRead === 'unreadable' && (
        <div className={css.legacyStatusText}>
          {t('legacyUnreadable')}
        </div>
      )}
      {libraryRead === 'absent' && (
        <div className={css.legacyStatusText}>{t('legacyAbsent')}</div>
      )}
      {libraryRead === 'ok' && entries !== null && entries.length === 0 && (
        <div className={css.legacyStatusText}>{t('legacyEmpty')}</div>
      )}
      {entries !== null && entries.map((e) => card(e.name, summaryOfEntry(e), e.isDefault, { isBuiltin: false }, () => onOpenDetail({ mode: 'read', kind: 'library', name: e.name, sections: { ...e.sections }, provenance: e.provenance, isDefault: e.isDefault, legacyText: e.legacyText })))}

      {/* 领域示范（只读）：厚条目体例——抄体例不抄内容（发现 6：内置四字段是口号级，要有可对照的深度）。 */}
      <div className={css.legacyHeading}>{t('legacyDemoTitle')}</div>
      <div className={css.legacyHint}>
        {t('legacyDemoHint')}
      </div>
      <div className={css.legacyDemoBox}>
        <div className={css.legacyDemoTitle}>{demo.name}</div>
        {SECTIONS.map(({ key }) => (
          <div key={key} className={css.legacyDemoLine}>
            <span className={css.legacyDemoKey}>{sectionLabelOf(t, key)}{t('labelSeparator')}</span>
            <span className={css.legacyDemoVal}>{demo.sections[key]}</span>
          </div>
        ))}
      </div>

      {/* 回执：三态（已发送／Lead 已回话／已落盘）——发送成功只说明话传出去了。
          空闲态也在场（告诉用户改动回执会长在哪；keyless 冒烟就靠这一行证回执区在场）。 */}
      <div className={`${css.legacyReceipt} ${receipt === null ? css.legacyReceiptIdle : receipt.state === 'failed' ? css.legacyReceiptFailed : receipt.state === 'landed' ? css.legacyReceiptLanded : css.legacyReceiptSent}`}>
        {receipt === null
          ? t('legacyReceiptIdle')
          : receipt.text}
      </div>

      {/* ④ 底线条：六条共同底线 ＋ 两个定制入口 ＋ 刷新（始终在场，含空库与失败态）。 */}
      <div className={css.legacyFooter}>
        <div className={css.legacyStatusText}>{t('legacyBaselinePrefix')}{t('baselineDisciplines')}</div>
        <div className={css.legacyFooterActions}>
          <Button variant="outline" size="sm" disabled={sending || sessionId === undefined} onClick={() => { void send(DRAFT_INSTRUCTION, { target: null, expectsChange: false }) }}>{t('legacyDraftAction')}</Button>
          <Button variant="outline" size="sm" disabled={sending || sessionId === undefined} onClick={() => { void send(DISTILL_INSTRUCTION, { target: null, expectsChange: false }) }}>{t('legacyDistillAction')}</Button>
          {sessionId !== undefined && <Button variant="ghost" size="sm" onClick={() => { onRefresh() }}>{t('legacyRefreshAction')}</Button>}
        </div>
        <div className={css.legacyFooterSmall}>
          {t('legacyFooter1')}
          <br />{t('legacyFooter2')}
        </div>
      </div>

    </>
  )
}
