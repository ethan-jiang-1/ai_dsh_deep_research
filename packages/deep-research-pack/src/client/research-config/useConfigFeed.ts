/**
 * useConfigFeed — 「研究配置」页签的取数与折算（2026-11-03 审计 G-13：492 行页签体拆分）。
 *
 * 数据面四块：库读四态（loading/ok/absent/unreadable）、journal 绑定（bindingTrust）、
 * 方法节五态（foldMethodAdoption）、发送/回执三态（receiptOf + 落盘对账轮询）。视图只消费。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { foldLibrary, type LibraryEntry } from '../../lib/library-fold.ts'
import { bindingTrust } from '../../lib/binding-trust.ts'
import { openRun, type RunSource } from '../../lib/run-context.ts'
import { foldMethodAdoption, type MethodAdoption } from '../../lib/method-of-question.ts'
import { assistantReplyAfter, libraryDiff, receiptOf, type LibraryDiff } from '../../lib/receipt-fold.ts'
import type { PackTranslate } from '../../lib/i18n.ts'
import { LIBRARY_PATH, type DetailState } from './config-model.ts'
import type { FollowTarget, JournalFrame } from '../ResearchStatusTab.tsx'
import type { DefaultsStore } from '../defaults/store.ts'
import type { MethodLibraryReadResult } from '../../lib/method-library-read.ts'

/** 页签体注入面：库文件读取 + 目录列举（本次研究区定位 bundle）+ journal 流 + 指令发送闭包
 *  （index.ts 装配，绑定 remote）。 */
export interface ResearchConfigTabInjected {
  /** 读工作区文本文件（limit = 行上限，缺省 40）；不可达 → null。 */
  readonly readFile: (sessionId: SessionId, path: string, signal: AbortSignal, limit?: number) => Promise<string | null>
  /** 完整方法库读面（分页 + eof；配置页签不再用固定 1000 行截断，BUG-088）。 */
  readonly readLibrary: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<MethodLibraryReadResult>
  /** 以当前会话打开的 run bundle 读面（位置/读策略归 lib）。 */
  readonly runSource: (sessionId: SessionId) => RunSource
  /** 列工作区目录（方法库 `.` 等）；run bundle 的三位置发现归 run-context。 */
  readonly listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<readonly { type: string; name: string }[] | null>
  /** journal 流（绑定判定 + 「Lead 已回话」信号；与状态页签同一条通道，各自开流）。 */
  readonly follow: (target: FollowTarget, signal: AbortSignal) => AsyncGenerator<JournalFrame>
  /** 发送指令给当前会话 Lead（steer→queue 降级在闭包内）；ok=false 时 detail = 原因。 */
  readonly sendInstruction: (sessionId: SessionId, text: string) => Promise<{ ok: boolean; detail: string }>
  /** 项目研究默认 store（D50；与 composer 按钮共用）。 */
  readonly defaults: DefaultsStore
}

export type ConfigFeedInput = ResearchConfigTabInjected & { readonly sessionId: SessionId | undefined; readonly t: PackTranslate }

/** session epoch：reload 只允许「当前 session + 当前序号」回写（BUG-086）。 */
export interface FeedEpoch { current: SessionId | undefined; seq: number }
export const isReloadCurrent = (epoch: FeedEpoch, sid: SessionId, seq: number): boolean => epoch.current === sid && epoch.seq === seq

export function useConfigFeed(props: ConfigFeedInput) {
  const [entries, setEntries] = useState<readonly LibraryEntry[] | null>(null)
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [sending, setSending] = useState(false)
  // 回执三态：base = 发送结果 + 对账基准；diff / replied 分别由回读与 journal 流补上。
  const [receiptBase, setReceiptBase] = useState<{ ok: boolean; detail: string; target: string | null; expectsChange: boolean } | null>(null)
  const [receiptDiff, setReceiptDiff] = useState<LibraryDiff | null>(null)
  const [replied, setReplied] = useState(false)
  // 本次研究区：journal 绑定 + 方法节五态。
  const [events, setEvents] = useState<readonly unknown[]>([])
  /** 库读四态：loading（首读中）／ok／absent（文件不在＝新工作区正常空态）／unreadable（在而读不回）。 */
  const [libraryRead, setLibraryRead] = useState<'loading' | 'ok' | 'absent' | 'unreadable'>('loading')
  // 2026-10-21 方法库迁移：侧栏只留本次研究摘要 + 入口；管理/编辑在主界面 conversation.view。
  const COMPACT = true

  const sessionId = props.sessionId
  const repliedMarker = useRef(0)
  const diffBase = useRef<readonly LibraryEntry[] | null>(null)
  /** 卸载闸：落盘对账是有界轮询（20×3s），组件卸载后不该继续发 RPC／setState。 */
  const aliveRef = useRef(true)
  useEffect(() => () => { aliveRef.current = false }, [])

  const sessionRef = useRef(sessionId)
  sessionRef.current = sessionId
  const epochRef = useRef<FeedEpoch>({ current: sessionId, seq: 0 })
  const reloadControllerRef = useRef<AbortController | null>(null)

  const reload = useCallback(async (sid: SessionId): Promise<readonly LibraryEntry[]> => {
    const seq = ++epochRef.current.seq
    epochRef.current.current = sid
    reloadControllerRef.current?.abort()
    const controller = new AbortController()
    reloadControllerRef.current = controller
    // 完整读面（readLibrary 分页到 eof）：固定 1000 行会在 >1000 行时静默短读（BUG-088）。
    const result = await props.readLibrary(sid, LIBRARY_PATH, controller.signal)
    const folded = result.kind === 'ok' ? foldLibrary(result.text) : []
    if (!isReloadCurrent(epochRef.current, sid, seq) || sessionRef.current !== sid) return folded
    if (result.kind === 'ok') { setEntries(folded); setLibraryRead('ok') }
    else if (result.kind === 'absent') { setEntries([]); setLibraryRead('absent') }
    else { setEntries(null); setLibraryRead('unreadable') }
    return folded
  }, [props.readLibrary])

  useEffect(() => {
    // 切会话：取消上一轮读 + 推进 epoch（旧 resolve 不再回写，BUG-086）；交互态归零（BUG-108）。
    reloadControllerRef.current?.abort()
    epochRef.current.seq += 1
    epochRef.current.current = sessionId
    setReceiptBase(null)
    setReceiptDiff(null)
    setReplied(false)
    setDetail(null)
    setMenuFor(null)
    setConfirmDelete(null)
    setSwitchOpen(false)
    setSending(false)
    repliedMarker.current = 0
    diffBase.current = null
    if (sessionId === undefined) { setEntries(null); setLibraryRead('absent'); return }
    void reload(sessionId)
    return () => {
      reloadControllerRef.current?.abort()
      epochRef.current.seq += 1
    }
  }, [sessionId, reload])

  // journal 流（只为本面板的两件事：会话绑定 → bundle 定位；发送后的 assistant 事件 → 已回话）。
  useEffect(() => {
    if (sessionId === undefined) { setEvents([]); return }
    const controller = new AbortController()
    void (async () => {
      try {
        for await (const frame of props.follow(sessionId, controller.signal)) {
          setEvents((prev) => (frame.kind === 'history' ? [...frame.events] : [...prev, frame.event]))
        }
      } catch {
        // 流失败不打断面板：绑定与回话信号退化为"未知"，其余面照常（fail-soft 同状态页签）。
      }
    })()
    return () => controller.abort()
    // 依赖只留 sessionId：注入面闭包（follow/listDir/readFile）不进依赖——状态页签与
    // useMemberActivity 同款约定（闭包标识可变时会把订阅/扫描打成重复回路）。
  }, [sessionId])

  // 「Lead 已回话」：只看**本面板发出的那条指令之后**出现的 assistant 事件（发送前的不算）。
  useEffect(() => {
    if (receiptBase === null || !receiptBase.ok) return
    if (assistantReplyAfter(events, repliedMarker.current)) setReplied(true)
  }, [events, receiptBase])

  // 本次研究区：可信绑定 slug → openRun（三位置归 run-context）→ 读 question.md 方法节。
  const trust = useMemo(() => bindingTrust(events), [events])
  const boundSlug = trust.kind === 'bound' ? trust.slug : undefined
  const [adoption, setAdoption] = useState<MethodAdoption>({ kind: 'no-run', adopted: null, origin: null, requirements: null })
  useEffect(() => {
    const sid = sessionId
    if (sid === undefined) { setAdoption({ kind: 'no-run', adopted: null, origin: null, requirements: null }); return }
    const slug = boundSlug
    if (slug === undefined) { setAdoption({ kind: 'no-run', adopted: null, origin: null, requirements: null }); return }
    let stopped = false
    const controller = new AbortController()
    void (async () => {
      const opened = await openRun(props.runSource(sid), `drt_${slug}`, { signal: controller.signal })
      if (stopped) return
      if (!opened.ok) {
        setAdoption(foldMethodAdoption(null, { bundle: opened.reason !== 'missing', question: false }))
        return
      }
      const view = opened.value
      const hasQuestion = view.hasFile('question.md')
      const text = hasQuestion ? await view.read('question.md', { signal: controller.signal }) : null
      if (stopped) return
      setAdoption(foldMethodAdoption(text?.ok === true ? text.value.text : null, { bundle: true, question: hasQuestion }))
    })()
    return () => { stopped = true; controller.abort() }
  }, [sessionId, boundSlug, props.runSource])

  /** 回执文案（三态优先级 = 失败 > 已落盘 > 已回话 > 已发送）。 */
  const receipt = receiptBase === null
    ? null
    : { ...receiptOf({ ok: receiptBase.ok, detail: receiptBase.detail, replied, diff: receiptBase.expectsChange ? receiptDiff : null }, props.t), expectsChange: receiptBase.expectsChange }

  /**
   * 发送指令 + 起落盘对账轮询。
   * @param text - 指令逐字。
   * @param intent - 对账意图：target = 目标条目名（新建传新名）；expectsChange = 这条指令是否会改库。
   * @param onOk - 发送成功后的收尾（关弹窗等）。
   */
  const send = async (text: string, intent: { target: string | null; expectsChange: boolean }, onOk?: () => void) => {
    if (sessionId === undefined || sending) return
    const sid = sessionId
    setSending(true)
    setReceiptDiff(null)
    setReplied(false)
    try {
      repliedMarker.current = events.length
      diffBase.current = entries
      const result = await props.sendInstruction(sid, text)
      if (sessionRef.current !== sid) return
      setReceiptBase({ ok: result.ok, detail: result.detail, target: intent.target, expectsChange: intent.expectsChange })
      if (!result.ok) return
      onOk?.()
      if (!intent.expectsChange) {
        setTimeout(() => { if (sessionRef.current === sid) void reload(sid) }, 2500)
        return
      }
      // 落盘对账：有界轮询（20 × 3s）。Lead 是模型，落笔时间不可预期——轮询到对账出 diff 即停，
      // 超时停在「已发送／已回话」态（不冒充落地）。
      for (let i = 0; i < 20 && aliveRef.current; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        if (!aliveRef.current) return
        const after = await reload(sid)
        const diff = libraryDiff(diffBase.current ?? [], after, intent.target, props.t)
        if (diff.landed) { setReceiptDiff(diff); return }
      }
    } finally {
      setSending(false)
    }
  }

  return {
    COMPACT, entries, detail, setDetail, menuFor, setMenuFor, confirmDelete, setConfirmDelete,
    switchOpen, setSwitchOpen, sending, receipt, send, adoption, libraryRead, reload,
  }
}
