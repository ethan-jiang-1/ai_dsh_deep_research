// checks/lib/analyze/run-trajectory-core.mjs — 多角色研究轨迹体检纯核（keyless，零 IO）。
//
// 从 Lead 根会话 + 全部子会话（teammate / subagent）的事件流还原整棵角色树、汇总成本/步数/技能，
// 并检出深研域 5 类非确定性反模式（Diagnostic Smells）；同时支持按时间窗关联原生 web.log 的
// `[deep-research:*]` 运行留痕。只读投影（show），不做交付放行裁决。

/**
 * @typedef {{
 *   sessionId: string,
 *   events: readonly Record<string, any>[],
 *   missing?: boolean,
 * }} TrajectorySessionInput
 *
 * @typedef {{
 *   slug?: string,
 *   evidenceCount?: number | null,
 *   verdictCounts?: { supported: number, partially_supported: number, unsupported: number, unverifiable: number, total: number } | null,
 * }} TrajectoryBundleFacts
 *
 * @typedef {{
 *   code: 'missing-skill' | 'fetch-anomaly' | 'orchestration-drift' | 'write-conflict' | 'count-mismatch' | 'missing-child',
 *   severity: 'warn' | 'error',
 *   sessionId: string,
 *   step?: number,
 *   detail: string,
 * }} TrajectorySmell
 */

const UUID_RE = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi
const MOJIBAKE_RE = /\ufffd/g

/** @param {string} id */
export function normalizeSessionId(id) {
  return String(id ?? '').replace(/^session-/, '')
}

/**
 * 从 DSH 原生权威事件（`subagent/catalog`、`team/member`）提取确切子会话 ID。
 * 缺盘时可据此 100% 确定地标出 `missing-child`，不会把网页随机 UUID 误判为缺席子会话。
 * @param {readonly Record<string, any>[]} events
 * @param {string} [selfId]
 * @returns {string[]}
 */
export function discoverExplicitChildSessionIds(events, selfId = '') {
  const selfNorm = normalizeSessionId(selfId)
  /** @type {Set<string>} */
  const found = new Set()
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    if (ev.type === 'subagent/catalog' && typeof ev.data?.childId === 'string') {
      const id = normalizeSessionId(ev.data.childId).toLowerCase()
      if (id !== '' && id !== selfNorm) found.add(id)
    } else if (ev.type === 'team/member' && typeof ev.data?.member?.id === 'string') {
      const id = normalizeSessionId(ev.data.member.id).toLowerCase()
      if (id !== '' && id !== selfNorm) found.add(id)
    }
  }
  return [...found]
}

/**
 * 从会话事件文本中提取可能关联的子会话 UUID（供本地目录精准寻址，不扫全盘）。
 * @param {readonly Record<string, any>[]} events
 * @param {string} [selfId]
 * @returns {string[]}
 */
export function discoverReferencedSessionIds(events, selfId = '') {
  const selfNorm = normalizeSessionId(selfId)
  /** @type {Set<string>} */
  const found = new Set(discoverExplicitChildSessionIds(events, selfId))
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    if (ev.type === 'tool/result' || ev.type === 'user/message' || ev.type === 'agent/inbox/spliced' || ev.type === 'subagent/spawned') {
      const text = JSON.stringify(ev.data ?? '')
      for (const match of text.matchAll(UUID_RE)) {
        const id = match[1].toLowerCase()
        if (id !== selfNorm) found.add(id)
      }
    }
  }
  return [...found]
}

/** @param {unknown} raw @returns {Record<string, any>} */
function safeParseJson(raw) {
  if (typeof raw !== 'string') return {}
  try {
    const val = JSON.parse(raw)
    return val && typeof val === 'object' ? val : {}
  } catch {
    return {}
  }
}

/** @param {any} content @returns {string} */
function contentText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map((block) => (block && typeof block.text === 'string' ? block.text : '')).join('\n')
}

/**
 * 汇总单个会话的拓扑元信息、成本与行为事实。
 * @param {TrajectorySessionInput} input
 */
export function summarizeSession(input) {
  const { sessionId, events, missing = false } = input
  if (missing) {
    return {
      sessionId,
      parentSession: null,
      role: 'unknown',
      label: null,
      delegationDepth: 1,
      turns: 0,
      steps: 0,
      createdAt: null,
      lastEventAt: null,
      wallClockMs: 0,
      toolCalls: 0,
      toolErrors: 0,
      inTok: 0,
      outTok: 0,
      cacheReadTok: 0,
      cacheHitRate: 0,
      maxContext: 0,
      loadedSkills: /** @type {string[]} */ ([]),
      goalCompleted: false,
      missing: true,
    }
  }

  /** @type {string | null} */
  let parentSession = null
  /** @type {string} */
  let role = 'unknown'
  /** @type {string | null} */
  let label = null
  let delegationDepth = 0
  let turns = 0
  let steps = 0
  /** @type {number | null} */
  let createdAt = null
  /** @type {number | null} */
  let lastEventAt = null
  let toolCalls = 0
  let toolErrors = 0
  let inTok = 0
  let outTok = 0
  let cacheReadTok = 0
  let maxContext = 0
  let goalCompleted = false
  /** @type {Set<string>} */
  const loadedSkills = new Set()

  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    if (typeof ev.createdAt === 'number' && createdAt === null) createdAt = ev.createdAt
    if (typeof ev.time === 'number') {
      if (createdAt === null) createdAt = ev.time
      if (lastEventAt === null || ev.time > lastEventAt) lastEventAt = ev.time
    }
    if (ev.type === 'session') {
      if (typeof ev.parentSession === 'string') parentSession = ev.parentSession
      if (typeof ev.agentPreset === 'string' && role === 'unknown') role = ev.agentPreset
      if (typeof ev.delegationDepth === 'number') delegationDepth = ev.delegationDepth
    } else if (ev.type === 'agent-preset/selected' && typeof ev.data?.agentPreset === 'string') {
      role = ev.data.agentPreset
    } else if (ev.type === 'subagent/descriptor' && typeof ev.data?.label === 'string') {
      label = ev.data.label
    } else if (ev.type === 'session/title' && typeof ev.data?.title === 'string' && label === null) {
      label = ev.data.title
    } else if (ev.type === 'step/start') {
      if (typeof ev.data?.turn === 'number') turns = Math.max(turns, ev.data.turn)
      steps += 1
    } else if (ev.type === 'goal/change' && ev.data?.operation === 'complete') {
      goalCompleted = true
    } else if (ev.type === 'tool/call') {
      toolCalls += 1
      if (ev.data?.name === 'skill') {
        const parsed = safeParseJson(ev.data.arguments)
        if (typeof parsed.name === 'string' && parsed.name.trim() !== '') loadedSkills.add(parsed.name.trim())
      }
    } else if (ev.type === 'tool/result') {
      const txt = contentText(ev.data?.message?.content)
      if (ev.data?.isError === true || /^Error:/i.test(txt)) toolErrors += 1
    } else if (ev.type === 'assistant/message') {
      const usage = ev.data?.usage ?? ev.data?.message?.usage
      if (usage && typeof usage === 'object') {
        const inp = Number(usage.inputTokens ?? 0)
        const out = Number(usage.outputTokens ?? 0)
        const cr = Number(usage.cacheReadTokens ?? 0)
        const cw = Number(usage.cacheWriteTokens ?? 0)
        if (Number.isFinite(inp)) inTok += inp
        if (Number.isFinite(out)) outTok += out
        if (Number.isFinite(cr)) cacheReadTok += cr
        const ctxSize = (Number.isFinite(inp) ? inp : 0) + (Number.isFinite(cr) ? cr : 0) + (Number.isFinite(cw) ? cw : 0)
        if (ctxSize > maxContext) maxContext = ctxSize
      }
    }
  }

  const totalInput = inTok + cacheReadTok
  const cacheHitRate = totalInput > 0 ? Number((cacheReadTok / totalInput).toFixed(4)) : 0
  const wallClockMs = createdAt !== null && lastEventAt !== null && lastEventAt >= createdAt ? lastEventAt - createdAt : 0

  return {
    sessionId,
    parentSession,
    role,
    label,
    delegationDepth,
    turns,
    steps,
    createdAt,
    lastEventAt,
    wallClockMs,
    toolCalls,
    toolErrors,
    inTok,
    outTok,
    cacheReadTok,
    cacheHitRate,
    maxContext,
    loadedSkills: [...loadedSkills],
    goalCompleted,
    missing: false,
  }
}

/**
 * 检出深研域 5 类非确定性反模式（外加缺失子会话显性告警）。
 * @param {{
 *   sessions: readonly TrajectorySessionInput[],
 *   rootSessionId: string,
 *   bundleFacts?: TrajectoryBundleFacts | null,
 *   localTimeoutMs?: number,
 * }} input
 * @returns {TrajectorySmell[]}
 */
export function detectTrajectorySmells({ sessions, rootSessionId, bundleFacts = null, localTimeoutMs = 10_000 }) {
  /** @type {TrajectorySmell[]} */
  const smells = []
  /** @type {Map<string, { subject: string, status: string }>} */
  const tasks = new Map()
  let taskCounter = 0
  let rootGoalCompleted = false

  for (const s of sessions) {
    if (s.missing) {
      smells.push({
        code: 'missing-child',
        severity: 'warn',
        sessionId: s.sessionId,
        detail: `子会话日志缺失：${s.sessionId}（仅导出单会话或文件已移走）`,
      })
      continue
    }

    const isRoot = normalizeSessionId(s.sessionId) === normalizeSessionId(rootSessionId)
    /** @type {Set<string>} */
    const loadedSkills = new Set()
    /** @type {Map<string, { name: string, args: Record<string, any>, time: number | null, step: number | undefined }>} */
    const callsById = new Map()
    /** @type {Map<number, number>} */
    const subagentsPerStep = new Map()
    /** @type {Set<string>} */
    const writtenKinds = new Set()
    /** @type {string[]} */
    const rootFinalTexts = []

    for (const ev of s.events) {
      if (!ev || typeof ev !== 'object') continue
      if (isRoot && ev.type === 'goal/change' && ev.data?.operation === 'complete') rootGoalCompleted = true

      if (ev.type === 'tool/call') {
        const name = String(ev.data?.name ?? '')
        const args = safeParseJson(ev.data?.arguments)
        const step = typeof ev.data?.step === 'number' ? ev.data.step : undefined
        const callId = typeof ev.data?.callId === 'string' ? ev.data.callId : ''
        if (callId !== '') callsById.set(callId, { name, args, time: typeof ev.time === 'number' ? ev.time : null, step })

        if (name === 'skill' && typeof args.name === 'string') loadedSkills.add(args.name.trim())
        if (name === 'subagent' && step !== undefined) {
          subagentsPerStep.set(step, (subagentsPerStep.get(step) ?? 0) + 1)
        }
        if (name === 'write' || name === 'edit') {
          const fp = String(args.file_path ?? args.path ?? '')
          if (/(?:^|\/)(?:findings|final)\.md$/.test(fp)) writtenKinds.add('synthesis')
          if (/(?:^|\/)evidence\/[^/]+\.md$/.test(fp)) writtenKinds.add('evidence')
          if (/(?:^|\/)review\.md$/.test(fp)) writtenKinds.add('review')
          if (/(?:^|\/)leads\.md$/.test(fp)) writtenKinds.add('leads')
        }
        if (name === 'team_task_create') {
          taskCounter += 1
          const tid = `task-${taskCounter}`
          tasks.set(tid, { subject: String(args.subject ?? tid), status: 'pending' })
        } else if (name === 'team_task_update' && typeof args.task_id === 'string') {
          const prev = tasks.get(args.task_id) ?? { subject: args.task_id, status: 'pending' }
          if (args.action === 'claim' || args.action === 'reassign') prev.status = 'in_progress'
          else if (args.action === 'complete') prev.status = 'completed'
          tasks.set(args.task_id, prev)
        } else if (isRoot && name === 'ask_user_question') {
          const qs = Array.isArray(args.questions) ? args.questions : []
          for (const q of qs) if (typeof q?.question === 'string') rootFinalTexts.push(q.question)
        }
      } else if (ev.type === 'tool/result') {
        const callId = String(ev.data?.callId ?? ev.data?.message?.toolCallId ?? '')
        const call = callsById.get(callId)
        const txt = contentText(ev.data?.message?.content)
        const step = call?.step ?? (typeof ev.data?.step === 'number' ? ev.data.step : undefined)

        if (call?.name === 'web_fetch') {
          const url = String(call.args.url ?? '')
          const elapsed = call.time !== null && typeof ev.time === 'number' ? ev.time - call.time : null
          if (/Error:\s*web fetch aborted/i.test(txt)) {
            const nearLocalTimeout = elapsed !== null && elapsed >= localTimeoutMs - 1000 && elapsed <= localTimeoutMs + 3000
            smells.push({
              code: 'fetch-anomaly',
              severity: nearLocalTimeout ? 'error' : 'warn',
              sessionId: s.sessionId,
              step,
              detail: nearLocalTimeout
                ? `web_fetch 约 ${elapsed}ms 报 web fetch aborted（疑似本地超时误判 WEB_ABORTED 跳过回退）：${url}`
                : `web_fetch 报 web fetch aborted（${elapsed ?? '?'}ms）：${url}`,
            })
          } else if (/WEB_REDIRECT_BLOCKED/.test(txt) && /^Error:/i.test(txt)) {
            smells.push({ code: 'fetch-anomaly', severity: 'warn', sessionId: s.sessionId, step, detail: `web_fetch 跨源重定向失败：${url}` })
          } else if (/WEB_UNSUPPORTED_CONTENT_TYPE/.test(txt) && /^Error:/i.test(txt)) {
            smells.push({ code: 'fetch-anomaly', severity: 'warn', sessionId: s.sessionId, step, detail: `web_fetch 不支持的内容类型（如 PDF）：${url}` })
          } else if (/HTTP 200\)/.test(txt)) {
            const badChars = txt.match(MOJIBAKE_RE)?.length ?? 0
            if (badChars >= 4) {
              smells.push({ code: 'fetch-anomaly', severity: 'warn', sessionId: s.sessionId, step, detail: `web_fetch HTTP 200 含 ${badChars} 处替换符 U+FFFD（疑似 GBK/非 UTF-8 乱码）：${url}` })
            }
          }
        } else if (call?.name === 'wait_agent' && /no-active-peer/i.test(txt)) {
          smells.push({ code: 'orchestration-drift', severity: 'warn', sessionId: s.sessionId, step, detail: 'wait_agent 返回 no-active-peer（无活跃 teammate，疑似对 one-shot subagent 误调）' })
        }

        if (/FS_STALE_VERSION|file changed since it was read|file has not been read/i.test(txt)) {
          const target = String(call?.args.file_path ?? call?.args.path ?? '')
          smells.push({
            code: 'write-conflict',
            severity: 'warn',
            sessionId: s.sessionId,
            step,
            detail: `写盘前置冲突（${/not been read/i.test(txt) ? '未读先改' : '并发版本陈旧'}）：${target || '(unknown)'}`,
          })
        }
      } else if (isRoot && ev.type === 'assistant/message') {
        const txt = contentText(ev.data?.message?.content)
        if (txt.trim() !== '') rootFinalTexts.push(txt)
      }
    }

    // 1) Skill 漏载检查
    if (isRoot && writtenKinds.has('synthesis') && !loadedSkills.has('synthesis')) {
      smells.push({ code: 'missing-skill', severity: 'error', sessionId: s.sessionId, detail: 'Lead 写入 findings.md/final.md 前未加载 synthesis skill' })
    }
    if (!isRoot && writtenKinds.has('evidence') && !loadedSkills.has('evidence-extraction')) {
      smells.push({ code: 'missing-skill', severity: 'warn', sessionId: s.sessionId, detail: '子会话写入 evidence/*.md 前未加载 evidence-extraction skill' })
    }
    if (!isRoot && writtenKinds.has('review') && !loadedSkills.has('adversarial-review')) {
      smells.push({ code: 'missing-skill', severity: 'warn', sessionId: s.sessionId, detail: '子会话写入 review.md 前未加载 adversarial-review skill' })
    }
    if (!isRoot && writtenKinds.has('leads') && !loadedSkills.has('lead-mapping')) {
      smells.push({ code: 'missing-skill', severity: 'warn', sessionId: s.sessionId, detail: '子会话写入 leads.md 前未加载 lead-mapping skill' })
    }

    // 3a) subagent 同 step 并行派发
    for (const [step, count] of subagentsPerStep.entries()) {
      if (count >= 2) {
        smells.push({ code: 'orchestration-drift', severity: 'warn', sessionId: s.sessionId, step, detail: `同 step 并发派发 ${count} 个 subagent（违反串行逐批等待约定）` })
      }
    }

    // 5) 交付叙述数字 vs 盘上实数对账
    if (isRoot && bundleFacts) {
      const joinedText = rootFinalTexts.join('\n')
      if (typeof bundleFacts.evidenceCount === 'number' && bundleFacts.evidenceCount > 0) {
        const cardClaims = [...joinedText.matchAll(/(\d+)\s*张证据卡/g)].map((m) => Number(m[1]))
        const mismatched = [...new Set(cardClaims.filter((n) => n !== bundleFacts.evidenceCount))]
        if (mismatched.length > 0) {
          smells.push({
            code: 'count-mismatch',
            severity: 'warn',
            sessionId: s.sessionId,
            detail: `Lead 叙述声称 ${mismatched.join('/')} 张证据卡，盘上 evidence/*.md 实际 ${bundleFacts.evidenceCount} 张`,
          })
        }
      }
      if (bundleFacts.verdictCounts) {
        const vc = bundleFacts.verdictCounts
        const pairs = [
          ...[...joinedText.matchAll(/(\d+)\s*supported[、,，/\s]+(\d+)\s*partially/gi)].map((m) => [Number(m[1]), Number(m[2])]),
          ...[...joinedText.matchAll(/(\d+)\s*支持\s*[/、,，]\s*(\d+)\s*部分/g)].map((m) => [Number(m[1]), Number(m[2])]),
        ]
        const badPairs = pairs.filter(([sup, part]) => sup !== vc.supported || part !== vc.partially_supported)
        if (badPairs.length > 0) {
          const sample = badPairs[0]
          smells.push({
            code: 'count-mismatch',
            severity: 'error',
            sessionId: s.sessionId,
            detail: `Lead 叙述声称 ${sample[0]} supported / ${sample[1]} partially，盘上 verdicts 实际 ${vc.supported} supported / ${vc.partially_supported} partially（共 ${vc.total} 条）`,
          })
        }
      }
    }
  }

  // 3b) goal 完成但仍有未闭合 team_task
  if (rootGoalCompleted) {
    const unclosed = [...tasks.entries()].filter(([, t]) => t.status !== 'completed')
    if (unclosed.length > 0) {
      smells.push({
        code: 'orchestration-drift',
        severity: 'warn',
        sessionId: rootSessionId,
        detail: `goal 已 complete 但仍有 ${unclosed.length} 条 team_task 未闭合：${unclosed.map(([id, t]) => `${id}(${t.status})`).join(', ')}`,
      })
    }
  }

  return smells
}

/**
 * 从宿主 web.log 摘出 `[deep-research:*]` 运行留痕（若带 ISO 时间戳则按会话时间窗过滤）。
 * @param {string} text
 * @param {{ startMs?: number | null, endMs?: number | null }} [window]
 * @returns {string[]}
 */
export function sliceDeepResearchWebLog(text, window = {}) {
  const startMs = typeof window.startMs === 'number' ? window.startMs - 5_000 : null
  const endMs = typeof window.endMs === 'number' ? window.endMs + 5_000 : null
  const out = []
  for (const rawLine of String(text ?? '').split('\n')) {
    if (!rawLine.includes('[deep-research:')) continue
    const iso = /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b/.exec(rawLine)?.[1]
    if (iso && startMs !== null && endMs !== null) {
      const ts = Date.parse(iso)
      if (Number.isFinite(ts) && (ts < startMs || ts > endMs)) continue
    }
    out.push(rawLine.trim())
  }
  return out
}

/**
 * 主分析入口（纯函数）：聚合整棵多角色树总账、Smells 与 web.log 留痕。
 * @param {{
 *   rootSessionId: string,
 *   sessions: readonly TrajectorySessionInput[],
 *   bundleFacts?: TrajectoryBundleFacts | null,
 *   webLog?: { status: 'not-requested' | 'absent' | 'ok', text?: string },
 *   localTimeoutMs?: number,
 * }} input
 */
export function analyzeTrajectory(input) {
  const summaries = input.sessions.map(summarizeSession)
  const root = summaries.find((s) => normalizeSessionId(s.sessionId) === normalizeSessionId(input.rootSessionId)) ?? summaries[0] ?? null
  const smells = detectTrajectorySmells({
    sessions: input.sessions,
    rootSessionId: input.rootSessionId,
    bundleFacts: input.bundleFacts ?? null,
    localTimeoutMs: input.localTimeoutMs,
  })
  const totals = summaries.reduce((acc, s) => {
    acc.sessions += 1
    acc.missing += s.missing ? 1 : 0
    acc.steps += s.steps
    acc.toolCalls += s.toolCalls
    acc.toolErrors += s.toolErrors
    acc.inTok += s.inTok
    acc.outTok += s.outTok
    acc.cacheReadTok += s.cacheReadTok
    acc.maxContext = Math.max(acc.maxContext, s.maxContext)
    return acc
  }, { sessions: 0, missing: 0, steps: 0, toolCalls: 0, toolErrors: 0, inTok: 0, outTok: 0, cacheReadTok: 0, maxContext: 0 })

  const totalInput = totals.inTok + totals.cacheReadTok
  const cacheHitRate = totalInput > 0 ? Number((totals.cacheReadTok / totalInput).toFixed(4)) : 0
  const webLogStatus = input.webLog?.status ?? 'not-requested'
  const webLogLines = webLogStatus === 'ok'
    ? sliceDeepResearchWebLog(input.webLog?.text ?? '', { startMs: root?.createdAt, endMs: root?.lastEventAt })
    : []

  return {
    rootSessionId: input.rootSessionId,
    slug: input.bundleFacts?.slug ?? null,
    totals: { ...totals, cacheHitRate, wallClockMs: root?.wallClockMs ?? 0 },
    sessions: summaries,
    smells,
    webLog: { status: webLogStatus, lines: webLogLines },
  }
}

/**
 * 格式化人类可读的轨迹体检报告。
 * @param {ReturnType<typeof analyzeTrajectory>} report
 * @returns {string}
 */
export function formatTrajectoryReport(report) {
  const lines = []
  const title = report.slug ? `${report.slug} (${report.rootSessionId})` : report.rootSessionId
  lines.push(`run-trajectory: ${title}`)
  lines.push(
    `总账: 会话 ${report.totals.sessions}（缺 ${report.totals.missing}） · 步数 ${report.totals.steps} · 工具 ${report.totals.toolCalls}（错 ${report.totals.toolErrors}） · 墙钟 ${Math.round(report.totals.wallClockMs / 1000)}s · in=${report.totals.inTok} out=${report.totals.outTok} cacheHit=${(report.totals.cacheHitRate * 100).toFixed(1)}% maxCtx=${report.totals.maxContext}`,
  )
  lines.push('')
  lines.push('角色树:')
  for (const s of report.sessions) {
    const tag = s.missing ? 'MISSING' : `${s.role}${s.label ? `「${s.label.slice(0, 28)}」` : ''}`
    const skills = s.loadedSkills.length > 0 ? s.loadedSkills.join(',') : 'none'
    lines.push(`  [d=${s.delegationDepth}] ${s.sessionId.slice(0, 24)}  ${tag}  steps=${s.steps} tools=${s.toolCalls}(err=${s.toolErrors}) skills=[${skills}]`)
  }
  lines.push('')
  lines.push(`Smells (${report.smells.length}):`)
  if (report.smells.length === 0) {
    lines.push('  （无）')
  } else {
    for (const sm of report.smells) {
      const loc = sm.step !== undefined ? `${sm.sessionId.slice(0, 16)}#step${sm.step}` : sm.sessionId.slice(0, 16)
      lines.push(`  [${sm.severity.toUpperCase()}][${sm.code}] ${loc} — ${sm.detail}`)
    }
  }
  if (report.webLog.status === 'absent') {
    lines.push('')
    lines.push('web-log: absent（指定文件不存在）')
  } else if (report.webLog.status === 'ok') {
    lines.push('')
    lines.push(`web-log 留痕 (${report.webLog.lines.length}):`)
    for (const l of report.webLog.lines.slice(0, 30)) lines.push(`  ${l}`)
  }
  return lines.join('\n')
}
