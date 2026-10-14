import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { readSessionEvents, resolveSessionLog } from '../lib/session-log.mjs'
import { sessionBundleOf } from '../../packages/deep-research-pack/src/lib/bundle-bind.ts'
import { deriveSteps } from '../../packages/deep-research-pack/src/lib/run-fold.ts'
import { foldHitlPending } from '../../packages/deep-research-pack/src/lib/hitl-fold.ts'
import { terminalReadiness } from '../../packages/deep-research-pack/src/lib/review-readiness.ts'

/**
 * 从 dev home 会话与研究 bundle 盘上事实建立 client-load 冒烟的参考对象。
 *
 * 调用方先完成 `researchWorkspaceGroup` 缺席时的 exit 2 判定，再在原启动点调用本函数；
 * 模块导入不做 I/O，本函数只在调用点同步读取磁盘事实，不操作进程、浏览器或输出。绑定候选
 * 排序/过滤、未绑定候选限制、富度地板，以及 bundle 根目录优先于 archive 的选取顺序，都是
 * smoke 的期望值合同。
 */
export function prepareClientLoadReference({ root, sessionsRoot, sessionGroup }) {
  // 绑定谓词 = pack bundle-bind（journal 工具调用路径里的 drt_<slug>/）；带历史 = 有回合。
  const hasTurns = (events) => events.some((j) => j?.type === 'turn/end')
  // 顶层会话才进侧栏（子代理子会话 delegationDepth > 0——run 12 实测其不显示，点了也白点）
  const isTopLevel = (events) => {
    const s = events.find((j) => j?.type === 'session')
    return s?.delegationDepth === 0
  }
  const lastTitleOf = (events) => {
    const titles = events.filter((j) => j?.type === 'session/title')
    return titles[titles.length - 1]?.data?.title ?? null
  }

  const unboundCandidates = []
  const candidates = []
  for (const { logPath, m } of readdirSync(join(sessionsRoot, sessionGroup))
    .map((d) => {
      const logPath = resolveSessionLog(join(sessionsRoot, sessionGroup, d))
      let m = 0
      try { if (logPath) m = statSync(logPath).mtimeMs } catch { /* 缺席日志不作为候选 */ }
      return { logPath, m }
    })
    .sort((a, b) => b.m - a.m)) {
    if (m === 0 || logPath === null) continue
    const { readable, events } = readSessionEvents(logPath)
    if (!readable || !hasTurns(events) || !isTopLevel(events)) continue
    const title = lastTitleOf(events)
    if (title === null || title.trim() === '') continue
    const slug = sessionBundleOf(events)
    // 尾窗挂起谓词（BUG-003 合流：回边盘侧真值 = deriveAnchors 直调——锚点判型走 lib 同一
    // 函数，不再手抄镜像；events 留存供 fileFacts 合成）
    // 绑定候选排除（2026-10-13 自测轮定案）：①本冒烟自建的探针标题会话——事故实录：被面板
    // 指令唤醒的真模型 lead 会在探针壳里长成富会话并绑到真 bundle，混入渐进面真值源；②近
    // 30 分钟仍写盘的会话——在飞 run 与断言存在竞态，渐进面断言的稳定前提 = 绑定对象静止
    // （当日实红：绑到在飞 run 后 UI NaN / 行数漂移）。两者只出绑定候选；未绑定负样本不受限。
    const probeTitled = title === '渐进面探针会话'
    const stillHot = Date.now() - m < 30 * 60_000
    if (slug !== undefined) {
      // 绑定但被排除（探针壳 / 在飞）不进任何候选——塞进未绑定候选会污染负样本（当日实红：
      // 点到绑定探针 → 渐进面无提示行）
      if (!probeTitled && !stillHot) candidates.push({ title, slug, events, logPath, eventCount: events.length, tailAskPending: foldHitlPending(events).pending })
    } else if (unboundCandidates.length < 5) unboundCandidates.push({ title })
    if (candidates.length >= 5 && unboundCandidates.length >= 1) break
  }
  // 绑定 = 近窗内（新→旧前 5 个 slug 会话）**富度地板之上取最新**：观察面断言的意图对象是
  // 真实 run 的渐进面，而一次性短会话（录制/红证探针/收尾判终态）事件数只有真实 run 的零头
  // （BUG-001 同族：期望随绑定态漂移——第三例即短会话被绑定）。地板按事件数划线，取最新
  // 保证 GUI 侧栏可见性（旧富会话可能被侧栏窗口挤出——实红教训）。
  const RICH_FLOOR = 60
  const boundSession = (() => {
    const rich = candidates.filter((c) => c.eventCount >= RICH_FLOOR)
    const pool = rich.length > 0 ? rich : candidates
    return pool.length > 0 ? pool[0] : null
  })()

  // 绑定 bundle 的磁盘真值（evidence 计数 / 交付态 / 问题行首行——与页签折算同口径；
  // slug 无 drt_ 前缀、目录名有——拼回；位置=状态两位置）
  const bundleBaseOf = (slug) => {
    for (const base of [join(root, 'research-workspace', `drt_${slug}`), join(root, 'research-workspace', 'archive', `drt_${slug}`)]) {
      if (existsSync(base)) return base
    }
    return null
  }
  // 盘侧真值取数函数化（2026-10-11 首验教训）：绑定对象可能是在飞 run——evidence/final.md
  // 随分析员写盘而增长，boot 前取的快照到断言时刻可能已过期（实测首验红：UI 4 份 vs 快照 2 份）。
  // 断言处用 fileFaceOf 现扫；快照版 expectedFace 只供前置判空与非时敏字段（问题行）。
  const fileFaceOf = (slug) => {
    const base = bundleBaseOf(slug)
    if (base === null) return null
    const names = new Set(readdirSync(base))
    const evidenceCount = existsSync(join(base, 'evidence')) ? readdirSync(join(base, 'evidence')).filter((f) => f.endsWith('.md')).length : 0
    const questionText = names.has('question.md') ? readFileSync(join(base, 'question.md'), 'utf8') : null
    // G3（RFC cockpit-flow-face）：与页签同口径——剥 markdown 强调符再截断（72 字 + 省略号）。
    const rawLine = questionText?.split('\n').find((l) => l.trim() !== '' && !l.startsWith('#')) ?? null
    const flatLine = rawLine !== null ? rawLine.replace(/\*\*/g, '').replace(/`/g, '').trim() : null
    const firstLine = flatLine === null ? null : flatLine.slice(0, 72)
    // 业务摘要 goal 的期望值必须用**客户端同款**截断（>72 补省略号）——上面那行是不补省略号的
    // 既有形态（研究问题行断言按首 12 字锚定，不受影响），两者不可混用。
    const questionLine = flatLine === null || flatLine === '' ? null : flatLine.length > 72 ? `${flatLine.slice(0, 72)}…` : flatLine
    // review 终局 readiness：规则与客户端**同源**（pack lib `review-readiness.terminalReadiness`）——
    // 冒烟里不再抄第二版 regex。2026-10-11 实测教训：抄来的「未锚行首末位匹配」把 review.md 文末
    // 附录保留的首轮 `readiness: FAIL` 读成终局，于是盘侧期望与 UI 渲染对不上（红得对）。
    const reviewText = names.has('review.md') ? readFileSync(join(base, 'review.md'), 'utf8') : null
    const readiness = terminalReadiness(reviewText)
    const reviewFail = readiness === 'FAIL' ? true : readiness === 'PASS' ? false : null
    const versions = existsSync(join(base, 'final')) ? readdirSync(join(base, 'final')).filter((f) => /^v\d+\.md$/.test(f)).length : 0
    // 步态盘侧真值（BUG-001 轮修正）：done/current 期望随磁盘文件走——绑到的会话不一定是
    // 已交付 run（在飞 bundle 只做了一部分步骤）；deriveSteps 与页签同一谓词，期望值不再
    // 隐含"六步全绿 + 回边"的已交付假设。
    const steps = deriveSteps({
      question: names.has('question.md'),
      team: names.has('question.md'),
      leads: names.has('leads.md'),
      evidence: evidenceCount,
      findings: names.has('findings.md'),
      review: names.has('review.md'),
      final: names.has('final.md'),
    })
    return { base, evidenceCount, delivered: names.has('final.md'), hasQuestion: names.has('question.md'), firstLine, questionLine, steps, reviewFail, versions }
  }

  return { boundSession, unboundCandidates, fileFaceOf }
}
