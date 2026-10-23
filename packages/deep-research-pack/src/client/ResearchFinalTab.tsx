/**
 * 「终稿」页签体（issue 2026-10-19-final-tab-in-sidebar）：研究交付后整篇渲染 run 根
 * `final.md`，只读、只认一个文件。
 *
 * 形态 = **接管 `drt_<slug>/final.md` 这个文件地址**（index.ts 以 extension 带注册资源页签类型）：
 * 交付卡片、结句内联引用、Files 树点到同一份文件，落的都是这一个页签——同地址幂等，不会
 * 出现"文件名预览"与"终稿"两个同名视图。
 *
 * 读面是一张定表（折算 = `src/lib/final-target.ts` 的 `finalReadPlan`）：
 *   `final.md`（正文）· `review.md`（审查判定，静音条用）· `final/` 目录（版本记账）。
 * 别的任何路径都不读——"中间过程不泄漏"在结构上成立，不是口头承诺。
 *
 * 静音条只讲**盘上事实**，不替交付背书：`review.md` 判 FAIL → `审查未过`；`final/` 有 vN →
 * `vN`；否则 → `当前版`。**不写"已交付"**——2026-10-20 真 run 实测：`final/v1.md` 在 HITL2
 * 之前就落盘（门③ 禁的正是这个，但模型会先写），所以版本目录不是交付凭证；"已交付"只由
 * 状态页签⑤ 的 `present` 见证说（journal 事实），不与本页争这个话。
 *   "何时出现"由 index.ts 的交付监听（`deliverables/presented`）负责，本组件不判断交付——渲染
 *   只依赖文件，所以重载、切会话、恢复布局都能自证。
 *
 * 更新语义：文件被改写时，正在看（`tab.visible`）→ 顶部提示条"重新读取"，不换掉你正在读的
 * 字；没在看 → 静默重读。轮询节奏与驾驶舱其余面同款（30s）。
 */
import { RERUN_TRIAGE_HINT, RERUN_TRIAGE_ROWS, RERUN_TRIAGE_TITLE } from '../lib/rerun-triage.ts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { finalReadPlan, sessionFileOf } from '../lib/final-target.ts'
import { openRun, type RunSource } from '../lib/run-context.ts'
import { latestRunVersion } from '../lib/run-fold.ts'
import { terminalReadiness } from '../lib/review-readiness.ts'
import { RESEARCH_STATUS_TAB_KIND } from './keys.ts'

/** 页签体注入面（index.ts 装配，绑定 remote.workspaceFiles）。 */
export interface ResearchFinalTabInjected {
  /** 以当前会话打开的 run bundle 读面（workspaceFiles 适配器；位置/读策略归 lib）。 */
  readonly runSource: (sessionId: SessionId) => RunSource
}

/** 槽标准 props + 注入面。 */
export type ResearchFinalTabProps = PropsRuntime<'sidebar.right.pane.tab'> & ResearchFinalTabInjected

/** 文件改写的巡检节奏（与驾驶舱其余面一致）。 */
const REFRESH_MS = 30_000

/** Markdown 词表（常量：`MarkdownText` 按引用比较，重建会重挂渲染器）。 */
const MARKDOWN_LABELS = {
  code: {
    copyLabel: '复制',
    copiedLabel: '已复制',
    toolbarLabels: { codeLabel: '代码', wrapLabel: '换行', unwrapLabel: '不换行' },
  },
  footnotes: '脚注',
}

const MESSAGE: React.CSSProperties = { padding: '12px', fontSize: 12.5, opacity: 0.6, lineHeight: 1.6 }
const STRIP: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '3px 2px 7px',
  marginBottom: 8, fontSize: 11, opacity: 0.75, borderBottom: '1px solid #00000014',
}
const LINK_BUTTON: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: 'inherit', fontSize: 'inherit', textDecoration: 'underline',
}
const BAR: React.CSSProperties = {
  marginBottom: 8, padding: '5px 8px', borderRadius: 6, fontSize: 11.5,
  background: '#b4530914', color: '#b45309', display: 'flex', alignItems: 'center', gap: 8,
}

/**
 * 终稿页签体。
 * @param props 槽 props + 注入面。
 * @returns 终稿正文或与其相称的空/失败态。
 */
export function ResearchFinalTab(props: ResearchFinalTabProps): ReactNode {
  const tab = props.useTabInfo()
  const sessionId = props.sessionId
  const address = tab.tab.navigation.address
  const file = useMemo(() => sessionFileOf(address), [address])
  const plan = useMemo(() => (file === null ? null : finalReadPlan(file.path)), [file])

  // 注入面按引用可能逐帧变化（槽 props），装进 ref：`load` 的依赖只留字符串身份，
  // 否则 effect 依赖实际值 `props` 会形成重读循环。
  const ioRef = useRef(props)
  ioRef.current = props
  const visibleRef = useRef(false)
  visibleRef.current = tab.tab.visible
  const versionRef = useRef<string | null>(null)
  const aliveRef = useRef(true)

  const [text, setText] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [versions, setVersions] = useState(0)
  const [pass, setPass] = useState<boolean | null>(null)
  const [stale, setStale] = useState(false)
  const [resolved, setResolved] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [showDraft, setShowDraft] = useState(false)
  const targetRef = useRef<{ dir: string; name: string } | null>(null)

  /** 打开终稿所在 run bundle，按同一套读策略读正文/审查/版本目录。
   *  review.md 必须读到 eof——终局判定在文末，固定行窗会读到中段旧判定（BUG-036 同族）。 */
  const load = useCallback(async (signal: AbortSignal): Promise<void> => {
    if (sessionId === undefined || plan === null) return
    const io = ioRef.current
    setLoading(true)
    setFailure(null)
    const opened = await openRun(io.runSource(sessionId), plan.final, { signal })
    if (signal.aborted || !aliveRef.current) return
    if (!opened.ok) {
      setFailure(opened.reason === 'missing' ? '读不到终稿文件（可能已被移动或归档）' : '终稿读取失败（通道或权限）')
      setLoading(false)
      return
    }
    const view = opened.value
    const listed = await view.list('final', { signal })
    if (signal.aborted || !aliveRef.current) return
    const versionNames = listed.ok
      ? listed.value.filter((entry) => entry.type === 'file').map((entry) => entry.name)
      : []
    const nextVersions = latestRunVersion(versionNames)
    const name = showDraft || nextVersions === 0 ? 'final.md' : `final/v${String(nextVersions)}.md`
    const [body, review] = await Promise.all([
      view.read(name, { signal }),
      view.read('review.md', { signal }),
    ])
    if (signal.aborted || !aliveRef.current) return
    if (!body.ok) {
      setFailure(body.reason === 'missing' ? '读不到终稿文件（可能已被移动或归档）' : '终稿读取失败（通道或权限）')
      setLoading(false)
      return
    }
    targetRef.current = { dir: view.dir, name }
    setResolved(body.value.path)
    setText(body.value.text)
    setTruncated(body.value.truncated)
    setVersions(nextVersions)
    if (body.value.version !== undefined) versionRef.current = body.value.version
    const readiness = review.ok ? terminalReadiness(review.value.text) : null
    setPass(readiness === null ? null : readiness === 'PASS')
    setLoading(false)
    setStale(false)
  }, [sessionId, plan, showDraft])

  // 首读 + 地址/会话变化重读
  useEffect(() => {
    aliveRef.current = true
    const controller = new AbortController()
    setText(null)
    setStale(false)
    setResolved(null)
    targetRef.current = null
    versionRef.current = null
    void load(controller.signal)
    return () => { aliveRef.current = false; controller.abort() }
  }, [load])

  // 文件改写：在看 → 提示重读；没在看 → 静默重读
  useEffect(() => {
    if (sessionId === undefined) return
    const controller = new AbortController()
    const timer = setInterval(() => {
      void (async () => {
        const target = targetRef.current
        if (target === null) return
        const token = await ioRef.current.runSource(sessionId).version(target.name, { signal: controller.signal })
        if (controller.signal.aborted) return
        if (!token.ok) return
        if (versionRef.current === null) { versionRef.current = token.value; return }
        if (token.value === versionRef.current) return
        versionRef.current = token.value
        if (visibleRef.current) setStale(true)
        else void load(controller.signal)
      })()
    }, REFRESH_MS)
    return () => { clearInterval(timer); controller.abort() }
  }, [sessionId, load])

  if (file === null || plan === null) return <div style={MESSAGE}>（这不是研究终稿文件）</div>
  if (loading && text === null) return <div style={MESSAGE}>正在读取终稿…</div>
  if (failure !== null && text === null) {
    return (
      <div style={MESSAGE}>
        {failure}
        <div style={{ marginTop: 6 }}>
          <button type="button" style={LINK_BUTTON} onClick={() => { void load(new AbortController().signal) }}>重试</button>
        </div>
      </div>
    )
  }
  if (text === null) return <div style={MESSAGE}>（终稿未能读取）</div>

  const showingLedger = !showDraft && versions >= 1
  const state = pass === false
    ? '审查未过'
    : showingLedger ? `v${versions}（版本账）` : versions >= 1 ? '当前工作稿' : '当前版'
  const stateStyle = pass === false
    ? { color: '#b45309', fontWeight: 600 }
    : undefined
  // 滚动义务在页签体自己：vendor 的 `.tabBody` 是定高 flex 列且 `overflow: hidden`，
  // 内容超出即被裁且不可滚（2026-10-20 用户实测报障：终稿页签不滚）。同款约定见
  // ResearchStatusTab 根容器（2026-10-12 同一类 BUG 的修法）——根吃满高度，正文区自滚，
  // 静音条固定不随文滚动。
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {stale && (
        <div style={{ ...BAR, margin: '8px 12px 0', flexShrink: 0 }}>
          <span style={{ flex: 1 }}>终稿有更新</span>
          <button type="button" style={LINK_BUTTON} onClick={() => { void load(new AbortController().signal) }}>重新读取</button>
        </div>
      )}
      <div style={{ ...STRIP, padding: '3px 12px 7px', flexShrink: 0 }} title={resolved ?? plan.final}>
        <span style={stateStyle}>{state}</span>
        <span style={{ flex: 1 }} />
        {versions >= 1 && (
          <button
            type="button"
            style={LINK_BUTTON}
            title="版本账 = final/vN；交付与否以「研究状态」的 ✅ present 为准"
            onClick={() => { setShowDraft((current) => !current) }}
          >{showDraft ? `看 v${versions}（版本账）` : '看当前工作稿'}</button>
        )}
        <button type="button" style={LINK_BUTTON} onClick={() => { tab.tab.actions.openTab(RESEARCH_STATUS_TAB_KIND) }}>过程 →</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '0 12px 40px', fontSize: 13.5, lineHeight: 1.75, overflowWrap: 'anywhere' }}>
        <MarkdownText text={text} labels={MARKDOWN_LABELS} />
        {truncated && (
          <div style={{ marginTop: 12, fontSize: 11.5, opacity: 0.6 }}>
            文件过长，已截断（显示前 {text.split('\n').length} 行）
          </div>
        )}
        {failure !== null && <div style={{ marginTop: 12, fontSize: 11.5, color: '#b00' }}>{failure}</div>}
        {/* 交付后只读出口（同状态页 ⑤，共用 src/lib 文案；D18 只读） */}
        <details style={{ marginTop: 18, fontSize: 12, opacity: 0.9 }}>
          <summary style={{ cursor: 'pointer' }}>{RERUN_TRIAGE_TITLE}</summary>
          <div style={{ marginTop: 6, lineHeight: 1.6 }}>
            {RERUN_TRIAGE_ROWS.map((row) => (
              <div key={row.label} style={{ marginBottom: 4 }}>
                <strong>{row.label}</strong>：{row.consequence}
                <div style={{ opacity: 0.75 }}>「{row.copy}」</div>
              </div>
            ))}
            <div style={{ opacity: 0.6 }}>{RERUN_TRIAGE_HINT}</div>
          </div>
        </details>
      </div>
    </div>
  )
}
