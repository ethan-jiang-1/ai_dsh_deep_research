// LegacyManagementPane.tsx — 「研究配置」页签的**四区旧管理面**（D25 回滚分支）。
//
// 默认 `COMPACT=true` 只渲染摘要面；本件是 `COMPACT=false` 时的对照/回滚形态，保留但不默认
// 渲染。2026-10-28 Phase C 把它从 601 行的页签体里整块搬出（约 70 行 JSX）：页签体只留
// "哪一版在渲染"的判断，四区形态自己的结构在本件里读。
//
// 为什么保留而不是删：D25 记录了管理面迁移到「方法库」tab，回滚分支是那次迁移的对照物；
// 删除属改记录决定，退役条件登记在 `_backlog/triggers.md`。
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { BASELINE_DISCIPLINES, BUILTIN_PREFERENCES, DEMO_ENTRY, DISTILL_INSTRUCTION, DRAFT_INSTRUCTION, PATTERN_METHOD_RULES, SECTIONS } from '../../lib/config-tables.ts'
import { summaryOfEntry, type LibraryEntry, type LibrarySections } from '../../lib/library-fold.ts'

export interface LegacyManagementPaneProps {
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
  const { entries, libraryRead, receipt, sending, sessionId, card, onOpenDetail, send, onRefresh } = props
  return (
    <>

      {/* ② 内置研究偏好（只读）＋ 推荐规则说明位（①-4 呈现位，始终在场）。 */}
      <div style={{ fontWeight: 700, margin: '4px 0 2px' }}>内置打法（只读）</div>
      <div style={{ opacity: 0.6, marginBottom: 6, fontSize: 11 }}>
        随包提供、不可改（要改就基于它自定义）。推荐怎么算出来的：题面形态 → 打法（
        {PATTERN_METHOD_RULES.map((r) => `${r.patterns.split(' · ').map((p) => p.split(' ')[0]).join('·')}→${r.method}`).join('；')}）。
      </div>
      {BUILTIN_PREFERENCES.map((b) => card(b.name, b.summary, false, { isBuiltin: true }, () => onOpenDetail({ mode: 'read', kind: 'builtin', name: b.name, sections: b.sections, provenance: null, isDefault: false, legacyText: null })))}

      {/* ③ 我的偏好库（本工作区数据）。 */}
      <div style={{ fontWeight: 700, margin: '10px 0 2px' }}>我的偏好库</div>
      <div style={{ opacity: 0.6, marginBottom: 6, fontSize: 11 }}>保存的常用做法——存在本工作区；同工作区的会话都看得到，换工作区不带。⋯ 菜单里管理。</div>
      {libraryRead === 'loading' && entries === null && <div style={{ opacity: 0.5 }}>（读取偏好库…）</div>}
      {libraryRead === 'unreadable' && (
        <div style={{ opacity: 0.7, marginBottom: 6 }}>
          读不到 method-library.md——它存在但这次没读回来（工作区文件面暂时不可达）。点下面「刷新」再试；
          这一格显示不了，不代表库是空的。
        </div>
      )}
      {libraryRead === 'absent' && (
        <div style={{ opacity: 0.55, marginBottom: 6 }}>本工作区还没有偏好库——研究中说「记住这种做法」，或用下面的「让 Lead 帮我起草」新建一条。</div>
      )}
      {libraryRead === 'ok' && entries !== null && entries.length === 0 && (
        <div style={{ opacity: 0.55, marginBottom: 6 }}>偏好库是空的——研究中说「记住这种做法」，或用下面的「让 Lead 帮我起草」。</div>
      )}
      {entries !== null && entries.map((e) => card(e.name, summaryOfEntry(e), e.isDefault, { isBuiltin: false }, () => onOpenDetail({ mode: 'read', kind: 'library', name: e.name, sections: { ...e.sections }, provenance: e.provenance, isDefault: e.isDefault, legacyText: e.legacyText })))}

      {/* 领域示范（只读）：厚条目体例——抄体例不抄内容（发现 6：内置四字段是口号级，要有可对照的深度）。 */}
      <div style={{ fontWeight: 700, margin: '10px 0 2px' }}>领域示范（只读）</div>
      <div style={{ opacity: 0.6, marginBottom: 6, fontSize: 11 }}>
        行业差异要写到这个颗粒度：一手源点名到渠道、口径写到条款号、工件与免责写明边界。抄体例，不抄内容——换成你自己行业的渠道与口径。
      </div>
      <div style={{ padding: '7px 10px', borderRadius: 6, background: '#00000008' }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{DEMO_ENTRY.name}</div>
        {SECTIONS.map(({ key, label }) => (
          <div key={key} style={{ marginTop: 4, fontSize: 12, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 600, opacity: 0.75 }}>{label}：</span>
            <span style={{ opacity: 0.85 }}>{DEMO_ENTRY.sections[key]}</span>
          </div>
        ))}
      </div>

      {/* 回执：三态（已发送／Lead 已回话／已落盘）——发送成功只说明话传出去了。
          空闲态也在场（告诉用户改动回执会长在哪；keyless 冒烟就靠这一行证回执区在场）。 */}
      <div style={{
        marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: 12,
        background: receipt === null ? '#00000008' : receipt.state === 'failed' ? '#ef444414' : receipt.state === 'landed' ? '#22c55e1f' : '#22c55e14',
        color: receipt === null ? 'inherit' : receipt.state === 'failed' ? '#b91c1c' : '#166534',
        opacity: receipt === null ? 0.6 : 1,
      }}>
        {receipt === null
          ? '改动的回执会显示在这里：已发送 → Lead 已回话 → 已落盘（回读对账出改了哪一句）'
          : receipt.text}
      </div>

      {/* ④ 底线条：六条共同底线 ＋ 两个定制入口 ＋ 刷新（始终在场，含空库与失败态）。 */}
      <div style={{ marginTop: 10, borderTop: '1px solid #00000018', paddingTop: 8, fontSize: 12 }}>
        <div style={{ opacity: 0.75 }}>任何打法都改不掉：{BASELINE_DISCIPLINES.join(' · ')}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" disabled={sending || sessionId === undefined} onClick={() => { void send(DRAFT_INSTRUCTION, { target: null, expectsChange: false }) }}>让 Lead 帮我起草</Button>
          <Button variant="outline" size="sm" disabled={sending || sessionId === undefined} onClick={() => { void send(DISTILL_INSTRUCTION, { target: null, expectsChange: false }) }}>从本次 run 沉淀</Button>
          {sessionId !== undefined && <Button variant="ghost" size="sm" onClick={() => { onRefresh() }}>刷新（重读库文件）</Button>}
        </div>
        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
          改动由 Lead 执行并回话（面板不直接改文件）；两个入口都是把要求交给 Lead，由它写进库——回执的「已落盘」就是回读库文件对出的结果。
          <br />改动影响的是**之后**的研究；要让正在跑的这场改用某条，用「用于本次研究」把指令发给 Lead（它记进 question.md §Decisions，不算重跑）。
        </div>
      </div>

    </>
  )
}
