/**
 * 「研究配置」页签体（2026-10-21 管理迁移后）。
 *
 * 当前只渲染：① 本次研究（本次采用 ＋ 来源 ＋ 换一条——读 question.md 研究方法节，五态如实）
 * 与「方法库（本工作区）→ 顶部 tab」入口；库列表/内置卡/领域示范/术语/管理回执移到主界面
 * `conversation.view` 的「方法库」tab。旧管理块保留在 COMPACT=false 分支（回滚/对照），默认不渲染。
 * 指令仍经 `session/prompt` 交 Lead（面板不直写文件）；折算住 `src/lib/`（纯函数，keyless 单测）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { Button, Input, Menu, MenuItemButton, Modal, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  createInstruction, editInstruction, foldLibrary, instructionOf, legacyLinesOf, libraryReadStateOf, summaryOfEntry,
  type LibraryEntry, type LibrarySections,
} from '../lib/library-fold.ts'
import { bindingTrust } from '../lib/binding-trust.ts'
import { openRun, type RunSource } from '../lib/run-context.ts'
import { foldMethodAdoption, type MethodAdoption } from '../lib/method-of-question.ts'
import { assistantReplyAfter, libraryDiff, receiptOf, type LibraryDiff } from '../lib/receipt-fold.ts'
import type { FollowTarget, JournalFrame } from './ResearchStatusTab.tsx'

/** 页签体注入面：库文件读取 + 目录列举（本次研究区定位 bundle）+ journal 流 + 指令发送闭包
 *  （index.ts 装配，绑定 remote）。 */
export interface ResearchConfigTabInjected {
  /** 读工作区文本文件（limit = 行上限，缺省 40——库读传大限防截断，见 BUG-026）；不可达 → null。 */
  readonly readFile: (sessionId: SessionId, path: string, signal: AbortSignal, limit?: number) => Promise<string | null>
  /** 以当前会话打开的 run bundle 读面（位置/读策略归 lib）。 */
  readonly runSource: (sessionId: SessionId) => RunSource
  /** 列工作区目录（本次研究区三位置查找：根／archive／_abandoned）；不可达 → null。 */
  readonly listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<readonly { type: string; name: string }[] | null>
  /** journal 流（绑定判定 + 「Lead 已回话」信号；与状态页签同一条通道，各自开流）。 */
  readonly follow: (target: FollowTarget, signal: AbortSignal) => AsyncGenerator<JournalFrame>
  /** 发送指令给当前会话 Lead（steer→queue 降级在闭包内）；ok=false 时 detail = 原因。 */
  readonly sendInstruction: (sessionId: SessionId, text: string) => Promise<{ ok: boolean; detail: string }>
}

/** 槽标准 props + 注入面。 */
export type ResearchConfigTabProps = PropsRuntime<'sidebar.right.pane.tab'> & ResearchConfigTabInjected

/** 内置研究偏好（只读；内容正本 = research-brief skill 方法预设表——此处仅投影）。
 *  `summary` = 该表第 2 列「给用户的一句话」——**卡面显示的就是它**（2026-10-16 用户拍板：
 *  面板是用户面，就显示专门为用户写的那句话；四分区详情仍在详情弹窗，不丢信息）。
 *  三处同钉（客户端 ↔ skill 表 ↔ 测试期望），漂移即红：tests/library-fold.test.mjs。 */
export interface BuiltinPreference {
  readonly name: string
  readonly summary: string
  readonly sections: LibrarySections
}

export const BUILTIN_PREFERENCES: readonly BuiltinPreference[] = [
  {
    name: '事实核查',
    summary: '核准具体事实/数字/状态的对象、时点与口径',
    sections: {
      source: '官方/原始来源优先，第三方只作线索',
      verify: '逐字转写核对；关键来源独立重抓；单源结论显式标注',
      report: '快答首屏：答案+口径+依据+限制',
      limit: '不做领域覆盖；"快"由深度决定',
    },
  },
  {
    name: '领域地图',
    summary: '摸清谁在做什么、到哪一步',
    sections: {
      source: '广度优先铺方向，多类来源交叉定位阵营',
      verify: '覆盖对账：每个子域至少一条可核来源；盲点显式标注',
      report: '地图式：分节定位+关系+时效边界',
      limit: '不把未覆盖说成不存在',
    },
  },
  {
    name: '主张核查',
    summary: '查证一个说法是真是假',
    sections: {
      source: '对称检索：正反同权重；追原始出处',
      verify: '反例权重最高；判定四态（成立/部分/不成立/证据不足）',
      report: '判定+证据强度分级+最强反证单列',
      limit: '不预设真伪；不做只找赞同的检索',
    },
  },
  {
    name: '方案比较',
    summary: '把几个选项放在同一标准下比',
    sections: {
      source: '各选项同维度查证；厂商资料与实际使用反馈并重',
      verify: '口径对齐才可比；价值权衡与事实分开',
      report: '维度化对比+适用情境+取舍说明',
      limit: '不替用户决定偏好；无场景不推唯一答案',
    },
  },
  {
    name: '时间线与信号',
    summary: '按官方节点排时间线，用预列指标判断走到哪了',
    sections: {
      source: '官方变更点（release notes／changelog／公告／生效日）为骨，媒体报道为肉；每个节点必须落在官方出处上',
      verify: '每节点带日期与出处；「现状」标注截至时刻；先列可观察指标与阈值，再下趋势判断；趋势与事实分句',
      report: '首屏仍走既有骨架（六段或快速缩略）；正文按时间线组织（节点＋日期＋出处）→ 现状截点 → 指标读数表 → 趋势判断（显式标「判断」）→ 覆盖边界',
      limit: '不做无时间窗的预测；不把趋势判断写成事实',
    },
  },
]

/** 库文件路径（工作区根；格式正本 = research-brief skill「用户方法库」）。 */
const LIBRARY_PATH = 'method-library.md'

/** question.md 读行上限：方法节在模板第 32–40 行，默认 40 行恰好卡边界（BUG-026 同族）——
 *  读方法节必须显式传足额 limit；question.md 之后还有 §Decisions，留足量。 */

/** 判型 → 打法映射（**推荐规则正本 = research-brief skill §方法预设 的同名表**；此处是它的
 *  投影——卡面「什么时候用它」与「推荐规则说明位」都由它派生；同钉 = tests/library-fold）。 */
const PATTERN_METHOD_RULES: readonly { patterns: string; method: string }[] = [
  { patterns: 'P1 单点事实/状态核查 · P2 数据表/价目核查', method: '事实核查' },
  { patterns: 'P3 领域全景梳理', method: '领域地图' },
  { patterns: 'P4 断言验证', method: '主张核查' },
  { patterns: 'P5 多维对比/差距 · P6 尽调/评估 · P7 方法/方案指导', method: '方案比较' },
  { patterns: 'P8 事态跟踪/时间线', method: '时间线与信号' },
]

/** 六条共同底线（任何打法都改不掉）——正本 = research-brief skill 的「共同底线（…）」句；
 *  面板只做投影（同钉 = tests/library-fold；防第二份手抄清单）。 */
const BASELINE_DISCIPLINES: readonly string[] = ['来源链', '逐字摘录', '独立信源', '日期校准', '缺口显式', 'readiness']

/** 四字段的执行面（谁读它／在哪生效／管不到什么）——面向用户的诚实边界；证据 = 各 skill 与
 *  操作侧门禁，来源 = 方法配置总卡的执行面表（`_backlog/issues/2026-10-18-research-method-config-ux.md`）。 */
const FIELD_EXECUTION_ROWS: readonly { key: keyof LibrarySections; who: string; where: string; cannot: string }[] = [
  {
    key: 'source',
    who: 'scout（检索器对账、query 三轮）＋ analyst（采信分级）',
    where: '派工五件⑤ 的方法论装载 ＋ leads.md 的「单检索器——待破」行',
    cannot: '不是域名硬过滤（检索本身没有这个能力）；也不改手册里的信源分级判据表本体',
  },
  {
    key: 'verify',
    who: 'analyst（摘录口径至少两项）＋ critic（独立重抓、反例搜索）',
    where: 'evidence 卡的口径契约 ＋ review.md 的方法承诺核查',
    cannot: '不新增机械门；node-gate 与 evidence-audit 都不检查方法承诺；「≥2 独立信源」是底线不是可调项',
  },
  {
    key: 'report',
    who: 'lead（synthesis 综合写作）',
    where: 'final.md 首屏在两种已文档化骨架之间选（六段／快速缩略）＋ 正文组织方式',
    cannot: '换不了第三种首屏形态（表格／时间线／矩阵）——正文用时间线合法，首屏换时间线不合法',
  },
  {
    key: 'limit',
    who: 'critic ＋ 最终报告的交付限制节',
    where: 'review.md 检查点 ＋ 报告里的「目前不能判断」',
    cannot: '不被任何机械门把守——只能靠 critic 与你的复查把它当真',
  },
]

/** 标本位·内联输出骨架（R7 = ①＋③ 的 ③）：三行示意这条打法产出长什么样；任何工作区都能看
 *  （部署侧没有 archive/，① 的真标本在无 run 时为空态）。 */
const SPECIMEN_SKELETONS: Record<string, readonly string[]> = {
  事实核查: ['答案（对象／时点／口径三件齐）', '依据：来源链 ＋ 口径说明', '限制：单源或未覆盖处显式'],
  领域地图: ['分节定位：谁在做什么', '关系与阵营 ＋ 时效边界', '盲点清单（未覆盖 ≠ 不存在）'],
  主张核查: ['判定四态之一（成立／部分／不成立／证据不足）', '证据强度分级', '最强反证单列'],
  方案比较: ['维度化对比表（同口径）', '适用情境 ＋ 取舍说明', '未公开项显式列出'],
  时间线与信号: ['时间线（节点＋日期＋官方出处）', '现状截点 ＋ 指标读数表', '趋势判断（显式标「判断」）＋ 覆盖边界'],
}
/** 库条目的通用骨架（非内置打法时用）。 */
const SPECIMEN_SKELETON_FALLBACK: readonly string[] = ['结论 ＋ 每条附来源链', '证据强度与口径说明', '限制、缺口与「目前不能判断」']

/** 两个定制入口的指令逐字（**正本 = research-brief skill「两个面板入口的指令形态」**；
 *  同钉 = tests/library-fold 的逐字包含断言）。 */
const DRAFT_INSTRUCTION = '我要新建一条研究打法。请先问我三个问题——① 我这一行的一手来源具体是哪些（点名到机构／数据库／官方页）② 必须带的口径字段是什么（时间／单位／币种／版本等）③ 这份报告给谁看、要什么形态与免责——拿到回答后，按四字段（找来源／怎么核实／报告怎么写／不承诺）起草一条命名条目写入我的偏好库，并一句话回执你写了什么。'
const DISTILL_INSTRUCTION = '把本次研究实际采用的做法存成研究偏好——从 question.md 研究方法节、evidence 的来源分级分布与 final.md 的结构归纳出四字段，写入我的偏好库；一句话回执，并说明它与最接近的内置打法的差异在哪。'

/** 领域示范（只读）：一条**厚条目**长什么样——行业差异四处（一手源是谁／口径必带什么／
 *  冲突怎么裁／工件与免责）该写到什么颗粒度。正本 = research-brief skill「领域示范」节，
 *  逐字同钉（tests/library-fold）；它不是按判型推荐的方法，故不进「内置打法」清单。
 *  内容来自外部逐条核实（`_backlog/research/2026-10-18-method-config-ux-external.md`）。 */
export const DEMO_ENTRY: { readonly name: string; readonly sections: LibrarySections } = {
  name: '投研尽调（示范）',
  sections: {
    source: '一手件按渠道点名——A 股招股书看证监会《格式准则第57号》与交易所网站；港股看港交所《Guide for New Listing Applicants》（2023-11）与披露文件；美股看 SEC EDGAR 的 10-K／10-Q／8-K；主体与股东信息看国家企业信用信息公示系统（《企业信息公示暂行条例》第六条）。注意：工商年报里资产总额、营业收入等由企业选择是否公示，不能当财务底稿。',
    verify: '交叉印证——三表勾稽；余额类做第三方函证（书面、由第三方直复）；关键结论至少两条独立来源。集中度必查：对关键客户/供应商的依赖（美股 Reg S-K Item 101(c)(1)(i)、101(h)(4)(vi)；港股《Guide》3.7 要求前五大客户/供应商的身份、占比与集中度与对手方风险）。心态 = 职业怀疑（ISA (UK) 200）；本工具纪律——先列红旗与 kill criteria 再找亮点，不得只挑有利项（Item 10(b)(2)(i)）。',
    report: '先对齐口径——会计年度（A 股＝公历 1 月 1 日至 12 月 31 日；美股改财年按 17 CFR 240.13a-10 出过渡期报告）；非 GAAP 指标须与最可比 GAAP 等量或更显著呈现并附量化调节表（Reg G §244.100(a)），不得平滑"非经常、偶发或特殊"项目（Item 10(e)(1)(ii)(B)），A 股非经常性损益看证监会〔2008〕43号；外币按《企业会计准则第19号》第十至十二条取交易发生日/资产负债表日即期汇率，用近似汇率须披露确定方法；敏感性分析参照 Item 305(a)(1)(ii)(A)。工件体例（论点／关键假设／反证／敏感性）是本工具模板，不是监管要求。',
    limit: '不构成投资建议；不给目标价与评级；不替代尽调程序（函证、访谈、现场核查）；工商公示信息不等于经审计的财务底稿。',
  },
}

/** 详情三态（读态携 legacyText：纯旧格式条目单块渲染、混居条目四分区外追加；编辑态 legacy = 旧正文草稿，null = 源条目无旧正文——BUG-025）。 */
type DetailState =
  | { readonly mode: 'read'; readonly kind: 'builtin' | 'library'; readonly name: string; readonly sections: LibrarySections; readonly provenance: string | null; readonly isDefault: boolean; readonly legacyText: string | null }
  | { readonly mode: 'edit'; readonly name: string; readonly sections: LibrarySections; readonly legacy: string | null }
  | { readonly mode: 'create'; readonly sourceName: string; readonly drafts: { name: string } & LibrarySections }

/** 四分区的固定呈现序与用户语言标签（**逐字 = 库格式与指令载荷**；`library-fold.SECTION_LABELS`
 *  是正本，本常量是它的呈现副本——由 tests/library-fold 的"显示名一致性"断言对钉）。
 *  2026-10-18 修发现 13：此处曾写「找什么资料／明确不承诺」，与指令里的「找来源／不承诺」不一致。 */
const SECTIONS: readonly { key: keyof LibrarySections; label: string }[] = [
  { key: 'source', label: '找来源' },
  { key: 'verify', label: '怎么核实' },
  { key: 'report', label: '报告怎么写' },
  { key: 'limit', label: '不承诺' },
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

  const reload = useCallback(async (sid: SessionId): Promise<readonly LibraryEntry[]> => {
    // 库读行上限 1000（BUG-026：写死 40 会静默截断多条目库——≥150 条目量级，留 vendor
    // maxLines〔默认 5000〕配置余量）
    const text = await props.readFile(sid, LIBRARY_PATH, new AbortController().signal, 1000)
    const folded = foldLibrary(text)
    setEntries(folded)
    // 「无结果」≠「失败」（外部状态文案准则：No result is different from failure）：先问目录
    // 文件在不在——不存在 = 新工作区的正常空态；在而读不回 = 如实报读不到，不冒充"正在读取"。
    const files = await props.listDir(sid, '.', new AbortController().signal)
    setLibraryRead(libraryReadStateOf(text, files, LIBRARY_PATH))
    return folded
  }, [props.readFile, props.listDir])

  useEffect(() => {
    if (sessionId === undefined) { setEntries(null); return }
    void reload(sessionId)
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

  // 本次研究区：可信绑定 slug → 三位置查找（根／archive／_abandoned）→ 读 question.md 方法节。
  const trust = useMemo(() => bindingTrust(events), [events])
  const [adoption, setAdoption] = useState<MethodAdoption>({ kind: 'no-run', adopted: null, origin: null, requirements: null })
  useEffect(() => {
    const sid = sessionId
    if (sid === undefined) { setAdoption({ kind: 'no-run', adopted: null, origin: null, requirements: null }); return }
    const slug = trust.kind === 'bound' ? trust.slug : undefined
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
      const hasQuestion = view.names.has('question.md')
      const text = hasQuestion ? await view.read('question.md', { signal: controller.signal }) : null
      if (stopped) return
      setAdoption(foldMethodAdoption(text?.ok === true ? text.value.text : null, { bundle: true, question: hasQuestion }))
    })()
    return () => { stopped = true; controller.abort() }
  }, [sessionId, trust, props.runSource])

  /** 回执文案（三态优先级 = 失败 > 已落盘 > 已回话 > 已发送）。 */
  const receipt = receiptBase === null
    ? null
    : { ...receiptOf({ ok: receiptBase.ok, detail: receiptBase.detail, replied, diff: receiptBase.expectsChange ? receiptDiff : null }), expectsChange: receiptBase.expectsChange }

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
      setReceiptBase({ ok: result.ok, detail: result.detail, target: intent.target, expectsChange: intent.expectsChange })
      if (!result.ok) return
      onOk?.()
      if (!intent.expectsChange) { setTimeout(() => { void reload(sid) }, 2500); return }
      // 落盘对账：有界轮询（20 × 3s）。Lead 是模型，落笔时间不可预期——轮询到对账出 diff 即停，
      // 超时停在「已发送／已回话」态（不冒充落地）。
      for (let i = 0; i < 20 && aliveRef.current; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        if (!aliveRef.current) return
        const after = await reload(sid)
        const diff = libraryDiff(diffBase.current ?? [], after, intent.target)
        if (diff.landed) { setReceiptDiff(diff); return }
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
            <Menu
              open={switchOpen}
              anchor={<Button variant="ghost" size="sm" onClick={() => setSwitchOpen(!switchOpen)}>换一条</Button>}
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
          </div>
        )}
        {adoption.kind === 'no-run' && (
          <div style={{ marginTop: 2, opacity: 0.75 }}>
            本会话暂无研究——选一条打法交给 Lead，或直接在对话里提问。交法：点任意一条的 ⋯ →「用于本次研究」。
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
      {!COMPACT && (<>
      {/* ② 内置研究偏好（只读）＋ 推荐规则说明位（①-4 呈现位，始终在场）。 */}
      <div style={{ fontWeight: 700, margin: '4px 0 2px' }}>内置打法（只读）</div>
      <div style={{ opacity: 0.6, marginBottom: 6, fontSize: 11 }}>
        随包提供、不可改（要改就基于它自定义）。推荐怎么算出来的：题面形态 → 打法（
        {PATTERN_METHOD_RULES.map((r) => `${r.patterns.split(' · ').map((p) => p.split(' ')[0]).join('·')}→${r.method}`).join('；')}）。
      </div>
      {BUILTIN_PREFERENCES.map((b) => card(b.name, b.summary, false, { isBuiltin: true }, () => setDetail({ mode: 'read', kind: 'builtin', name: b.name, sections: b.sections, provenance: null, isDefault: false, legacyText: null })))}

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
      {entries !== null && entries.map((e) => card(e.name, summaryOfEntry(e), e.isDefault, { isBuiltin: false }, () => setDetail({ mode: 'read', kind: 'library', name: e.name, sections: { ...e.sections }, provenance: e.provenance, isDefault: e.isDefault, legacyText: e.legacyText })))}

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
          {sessionId !== undefined && <Button variant="ghost" size="sm" onClick={() => { if (sessionId !== undefined) void reload(sessionId) }}>刷新（重读库文件）</Button>}
        </div>
        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
          改动由 Lead 执行并回话（面板不直接改文件）；两个入口都是把要求交给 Lead，由它写进库——回执的「已落盘」就是回读库文件对出的结果。
          <br />改动影响的是**之后**的研究；要让正在跑的这场改用某条，用「用于本次研究」把指令发给 Lead（它记进 question.md §Decisions，不算重跑）。
        </div>
      </div>
      </>)}
      {detailModal}
      {deleteModal}
    </div>
  )
}
