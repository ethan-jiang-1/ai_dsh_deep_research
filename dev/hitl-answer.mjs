#!/usr/bin/env node
// dev/hitl-answer.mjs —— HITL 代答驱动（代理模拟 HITL1/HITL2 的唯一实现）。
//
// 为什么需要它（2026-09-26 跑 run 时实测的环路缺口）：`ask_user_question` 走 `ctx.userQuestions`
// 的 answerer waterfall，而**全仓唯一的 answerer 是连着 web 的浏览器客户端**——CLI/host 侧没有
// answerer，也没有提交答案的 RPC（vendor 实测：只有 web 客户端这条 relayed listener）。
// 于是"代理代跑"在机制上无法作答：`scripts/smoke/client-hitl-smoke.mjs` 也明确"触发但不代答"。
// 本脚本补上这条缝：用真浏览器把挂起的问询答完，并把每次选择打印出来，供 bundle 的
// question.md §Decisions 如实记"代理模拟"。
//
// 用法（须带 tsx——前置谓词 import pack .ts 源）：
//   node --import tsx/esm dev/hitl-answer.mjs --port 3083 --token <横幅 token> [--session <标题子串>]
//                            [--pick recommended|first|<1-based index>] [--custom <文本>]
//                            [--max-steps 8] [--dry-run]
// 行为：**先盘侧谓词自拒**（无真挂起会话即退出，不开浏览器）→ 精确按 session ID 打开同一会话
//       → 逐题作答（默认选带 Recommended 的那一项）→ 提交 → 打印每题的选择。
// 注意：**必须**在 question.md §Decisions 与 journal.md 标注"代理模拟"——它替的是人，不是人。
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { loadChromium, launchChromium } from '../scripts/lib/playwright.mjs'
import { runStateOf, readSessionEvents, leadHitlCandidate } from '../scripts/lib/run-state.mjs'
import { clickSearchResultByTitle, searchSessionByTitle } from '../scripts/lib/web-ui-nav.mjs'
import {answerBatchOf, customLandedInBatch, driveVerdict, intentReconcile, nextDriveAction, optionIndexToClick, parseAskArgs, parseAskQuestions, pickTargetLabel, questionCardKeyOf, selectPendingSession, sidebarMissVerdict} from '../scripts/lib/ask-drive.mjs'
import { appendProvenance, attributionBundleOf, batchToAnswered } from '../scripts/lib/hitl-provenance.mjs'
import { localDateStr } from '../scripts/lib/local-date.mjs'
import { researchWorkspaceGroup, sessionLogsInGroup } from '../scripts/lib/session-log.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// 与 dev/run-kickoff.mjs 同形：name 自带 `--`（本仓约定，别在 helper 里再加一次）
const flag = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? fallback : process.argv[i + 1]
}
const has = (name) => process.argv.includes(name) // 同约定：name 自带 `--`

const PORT = flag('--port', process.env.DSH_RUN_PORT || '3083')
const TOKEN = flag('--token', null)
// 空串/纯空白 = 未指定（2026-09-27 实录：`--session ""` 使 text.includes('') 恒真 →
// 点开侧栏第一个无关会话——flag 解析不得把空串当"已指定"）
const rawSession = flag('--session', null)
const SESSION = rawSession !== null && rawSession.trim() !== '' ? rawSession : null // 标题子串；缺省 = 最新盘侧挂起
const PICK = flag('--pick', 'recommended') // recommended | first | <1-based index>
const CUSTOM = flag('--custom', null)
const MAX_STEPS = Number(flag('--max-steps', '8'))
const DRY = has('--dry-run')
const NO_TARGET_SESSION = Symbol('no target session row')
const stopForMissingUiSession = () => {
  process.exitCode = 3
  throw NO_TARGET_SESSION
}

/** Revalidate the target Session and ask card in the same DOM turn as each action. */
function operateOnTargetCard({ targetSessionId, expectedCardKey, action = 'identity', index, value, expectedLabels }) {
  // ⚠ expectedLabels 必须在这里绑定：click-option 分支的"题面未变"校验引用它，而它是**未绑定即抛
  // ReferenceError**（2026-10-16 实卡现场：`expectedLabels is not defined`）。存取自 e42155b 引入校验时
  // 漏绑，此后一直潜伏——只在"必须点选项"的卡上才被求值（预选推荐项的卡直接走 Submit 分支，故从未暴露）。
  const visible = (element) => {
    for (let current = element; current !== null; current = current.parentElement) {
      const style = getComputedStyle(current)
      // `display: contents` 的元素**不生成盒子**——rect 恒 0×0 是布局语义，不是"隐藏"
      // （2026-10-16 实测根因：DSH web 的会话容器外有三层 display:contents 包装，旧判据据此把
      //  可见会话判成 `active-session-unavailable` → 拒绝代答 exit 3 → client-hitl-smoke ⑤b/⑤c
      //  连跑四次恒红。零盒祖先必须跳过尺寸检查，其余隐藏信号照查。）
      if (style.display === 'none' || style.visibility === 'hidden'
        || style.opacity === '0' || current.getAttribute('aria-hidden') === 'true') return false
      if (style.display === 'contents') continue
      const rect = current.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return false
    }
    return true
  }
  const active = [...document.querySelectorAll('[data-conversation-content]')].filter(visible)
  if (active.length !== 1) return { ready: false, reason: active.length === 0 ? 'active-session-unavailable' : 'active-session-ambiguous' }
  if (active[0].getAttribute('data-conversation-session') !== targetSessionId) return { ready: false, reason: 'active-session-mismatch' }
  const selected = [...document.querySelectorAll('[data-row-key^="session:"][aria-selected="true"]')].filter(visible)
  if (selected.length !== 1) return { ready: false, reason: selected.length === 0 ? 'session-row-not-selected' : 'session-row-ambiguous' }
  if (selected[0].getAttribute('data-row-key') !== `session:${targetSessionId}`) return { ready: false, reason: 'session-row-ambiguous' }
  if (action === 'session') return { ready: true, reason: null }
  const composers = [...active[0].querySelectorAll('[data-conversation-region="composer"]')].filter(visible)
  const cards = composers.flatMap((composer) => [...composer.querySelectorAll('[data-question-key], [data-plan-review-key]')].filter(visible))
  if (cards.length === 0) return { ready: false, reason: 'ask-card-unavailable' }
  if (cards.length !== 1) return { ready: false, reason: 'ask-card-ambiguous' }
  const card = cards[0]
  const cardKey = card.getAttribute('data-question-key') ?? card.getAttribute('data-plan-review-key')
  if (cardKey !== expectedCardKey) return { ready: false, reason: 'ask-card-mismatch' }
  if (action === 'identity') return { ready: true, reason: null, cardKey }
  const groups = [...card.querySelectorAll('[role="radiogroup"]')]
  if (groups.length > 1) return { ready: false, reason: 'radio-group-ambiguous' }
  // 锚点选择（2026-10-16 实卡修正）：radiogroup **真的含 radio** 时才以它为锚（选项题面，逐项校验用）；
  // 零 radio 题面（纯文本题 / 可选题）以 **card** 为锚——否则"向上找 Submit/Next/Skip"会从**已翻过去的
  // 旧题容器**出发，找不到当前题的按钮（实测：HITL2 Q2 可选文本题的 Skip 恒找不到 → 每次点击 ready=false
  // → 驱动静默空转到步数用尽，表现成"共作答 N 题 / 未走到 Submit"而盘侧仍挂起）。
  const radiosIn = (el) => [...el.querySelectorAll('button[role="radio"]')]
  const group = groups.length === 1 && radiosIn(groups[0]).length > 0 ? groups[0] : card
  const radios = group === card ? [] : radiosIn(group)
  const labels = radios.map((button) => (button.textContent ?? '').trim())
  // 纯文本题面（2026-10-16 实卡触发：HITL2 卡 Q1 = 自由文本题，逐题翻页形态——1 个 textarea +
  // 「Next」推进钮、零 radio）。旧实现要求恰一个 radiogroup 且从中取 radios，于是这题报
  // radioCount=0 → 判据层 abort「无选项可读」→ 整张卡答不了。现在：零 radio 一律按文本题面观察，
  // 由判据层（lib/ask-drive）决定填文本；推进钮认 Next/继续（**仅零 radio 时**，选项题面照旧只认 Submit）。
  if (radios.length === 0 && (action === 'observe' || action === 'custom')) {
    const fields = [...card.querySelectorAll('textarea, input[type="text"]')].filter(visible)
    if (action === 'custom') {
      if (fields.length !== 1) return { ready: false, reason: fields.length === 0 ? 'custom-field-unavailable' : 'custom-field-ambiguous' }
      const field = fields[0]
      if (field.disabled) return { ready: false, reason: 'custom-field-disabled' }
      const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value)
      field.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }))
      field.dispatchEvent(new Event('change', { bubbles: true }))
      return { ready: true, reason: null, filled: true }
    }
    // 终局提交（Submit/提交）与推进钮（Next/继续/Skip/跳过）**分开报**（2026-10-16 实卡修正）：
    // 旧版把两者并成一个集合，于是"Skip 可用 + Submit 禁用"被报成可提交，点击面又因两个匹配
    // 落空 → 驱动静默空转 8 轮（诊断实录：btns=[…, "Skip", "Submit(禁用)"]，submit=true/false）。
    const all = [...card.querySelectorAll('button')]
    const finals = all.filter((b) => /^(Submit|提交)$/i.test((b.textContent ?? '').trim()))
    const advances = all.filter((b) => /^(Next|继续|下一题|Skip|跳过)$/i.test((b.textContent ?? '').trim()))
    return {
      ready: true, reason: null, radioCount: 0, checkedCount: 0, checkedIndex: null,
      labels: [], checkedLabel: null,
      submitFound: finals.length === 1,
      submitDisabled: finals.length !== 1 || !!finals[0].disabled,
      advanceFound: advances.length >= 1,
      advanceDisabled: advances.length === 0 || advances.every((b) => b.disabled),
      textFieldAvailable: fields.length === 1,
      textValue: fields.length === 1 ? String(fields[0].value ?? '') : null,
    }
  }
  if (groups.length !== 1) return { ready: false, reason: 'radio-group-unavailable' }
  if (action === 'observe') {
    let scope = group
    let submits = []
    for (let up = 0; up < 4 && scope && submits.length === 0; up++) {
      scope = scope.parentElement
      if (scope === null || !card.contains(scope)) break
      submits = [...scope.querySelectorAll('button')].filter((button) => /^(Submit|提交)$/i.test((button.textContent ?? '').trim()))
    }
    if (submits.length > 1) return { ready: false, reason: 'submit-ambiguous' }
    const checkedRadios = radios.filter((button) => button.getAttribute('aria-checked') === 'true')
    const checked = checkedRadios[0] ?? null
    return {
      ready: true,
      reason: null,
      radioCount: radios.length,
      checkedCount: checkedRadios.length,
      checkedIndex: checked === null ? null : radios.indexOf(checked),
      labels: radios.map((button) => (button.textContent ?? '').trim()),
      checkedLabel: checked === null ? null : (checked.textContent ?? '').trim(),
      submitFound: submits.length === 1,
      submitDisabled: submits.length === 1 && !!submits[0].disabled,
      ...(() => {
        const adv = [...card.querySelectorAll('button')].filter((b) => /^(Next|继续|下一题|Skip|跳过)$/i.test((b.textContent ?? '').trim()))
        return { advanceFound: adv.length >= 1, advanceDisabled: adv.length === 0 || adv.every((b) => b.disabled) }
      })(),
      textFieldAvailable: [...card.querySelectorAll('textarea, input[type="text"]')].filter(visible).length === 1,
      textValue: null,
    }
  }
  if (action === 'click-option') {
    if (Array.isArray(expectedLabels) && (expectedLabels.length !== radios.length
      || expectedLabels.some((label, i) => label !== labels[i]))) {
      return { ready: false, reason: 'question-options-changed' }
    }
    if (!Number.isInteger(index) || index < 0 || index >= radios.length) return { ready: false, reason: 'radio-index-unavailable' }
    const radio = radios[index]
    radio.scrollIntoView({ block: 'center' })
    radio.click()
    let prompt = group
    for (let up = 0; up < 4 && prompt.parentElement !== null && card.contains(prompt.parentElement); up++) prompt = prompt.parentElement
    return {
      ready: true,
      reason: null,
      label: (radio.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
      prompt: (prompt.textContent ?? '').replace(/\s+/g, ' ').slice(0, 140),
    }
  }
  if (action === 'click-advance') {
    // 推进钮可能**同时**有 Skip 与 Next（2026-10-16 实卡实测：两个都可用 → 旧版判 ambiguous 而停）。
    // 按 UI 自身语义定序，取第一个"在场且可用"的：**文本域有正文 → 先 Next（带正文推进）；
    // 空 → 先 Skip（跳过可选题）**。定序后不再有歧义分支。
    const field = [...card.querySelectorAll('textarea, input[type="text"]')].filter(visible)[0] ?? null
    const hasText = field !== null && String(field.value ?? '').trim() !== ''
    const order = hasText ? ['Next', '继续', '下一题', 'Skip', '跳过'] : ['Skip', '跳过', 'Next', '继续', '下一题']
    // ⚠ 逐层搜、每层按序找（2026-10-16 自伤修正）：旧版从 radiogroup 起搜且"pool 非空即停"，
    // 于是只看到该题自身的选项钮——**卡片层的 Skip/Next 永远看不到**（实测 advance-unavailable）。
    let scope = group
    for (let up = 0; up < 5 && scope !== null; up++) {
      const buttons = [...scope.querySelectorAll('button')].filter((b) => !b.disabled)
      for (const want of order) {
        const hit = buttons.find((b) => (b.textContent ?? '').trim().toLowerCase() === want.toLowerCase())
        if (hit === undefined) continue
        hit.scrollIntoView({ block: 'center' })
        hit.click()
        return { ready: true, reason: null, clicked: true, kind: 'advance', label: want }
      }
      scope = scope.parentElement
      if (scope === null || !card.contains(scope)) break
    }
    return { ready: false, reason: 'advance-unavailable' }
  }
  if (action === 'click-submit') {
    const re = /^(Submit|提交)$/i // 推进钮（Next/Skip…）走 click-advance——此处只点终局提交
    const submits = []
    if (radios.length === 0) {
      // 零 radio 题面：锚点就是 card（见上面的锚点选择），而本函数是"从锚点**向上**找"——
      // 从 card 往上第一步就跳出卡片（`!card.contains(scope)`）⇒ 永远找不到按钮、静默空转。
      // 故零 radio 时**直接在 card 内找**（2026-10-17 自检卡实测：卡在 Q2 空转 7 轮）。
      submits.push(...[...card.querySelectorAll('button')].filter((button) => re.test((button.textContent ?? '').trim())))
    } else {
      let scope = group
      for (let up = 0; up < 4 && scope !== null && submits.length === 0; up++) {
        scope = scope.parentElement
        if (scope === null || !card.contains(scope)) break
        submits.push(...[...scope.querySelectorAll('button')].filter((button) => re.test((button.textContent ?? '').trim())))
      }
    }
    if (submits.length !== 1) return { ready: false, reason: submits.length === 0 ? 'submit-unavailable' : 'submit-ambiguous' }
    if (submits[0].disabled) return { ready: false, reason: 'submit-disabled' }
    const text = (submits[0].textContent ?? '').trim()
    // 逐题翻页形态（2026-10-16 实卡）：零 radio 时按钮可能是「Next/继续」——**翻页 ≠ 提交**，
    // 报 kind 让驱动继续循环（旧行为把翻页当终局提交 → 提前 break → answer 未落地）。
    const kind = /^(Next|继续|下一题|Skip|跳过)$/i.test(text) ? 'advance' : 'final'
    submits[0].scrollIntoView({ block: 'center' })
    submits[0].click()
    return { ready: true, reason: null, clicked: true, kind }
  }
  if (action === 'custom') {
    const fields = [...card.querySelectorAll('textarea, input[type="text"]')].filter(visible)
    if (fields.length !== 1) return { ready: false, reason: fields.length === 0 ? 'custom-field-unavailable' : 'custom-field-ambiguous' }
    const field = fields[0]
    if (field.disabled) return { ready: false, reason: 'custom-field-disabled' }
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value)
    field.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    return { ready: true, reason: null, filled: true }
  }
  return { ready: false, reason: 'action-unavailable' }
}

if (!TOKEN) {
  console.error('缺 --token（web 横幅里的 token）')
  process.exit(2)
}

// ⓪⁻ 盘侧前置谓词（RFC run-ops-self-diagnosis）：开浏览器前，先按**事件形状**判定
//    research-workspace 组最新 15 条 canonical 日志里有没有真挂起（末位回合事件 = 未答 ask_user_question）。
//    request/header 里的工具 schema 字样不构成挂起——那正是 grep 假阳性的形态。无真挂起即
//    自拒，不开浏览器空转。
let pendingLogPath = null
// 盘侧"目标真挂起"的事实（供侧栏失败路径的错因判据用）：在选会话时记一次，
// 不在失败路径重算（`selected` 的作用域只在那段选择逻辑里——2026-10-17 注入实测：
// 直接引用它会在失败路径抛 ReferenceError，即"该报的话报不出来反而崩"）。
let diskPendingTarget = false
let uiTargetSessionId = null
let uiTargetTitle = null
{
  const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(ROOT, 'runtime', 'harness-home')
  const sessionsRoot = join(home, 'sessions')
  const group = researchWorkspaceGroup(sessionsRoot)
  if (group === undefined) {
    console.error('hitl-answer: 找不到 research-workspace 会话组——先 source dev/env.sh')
    process.exit(2)
  }
  const gdir = join(sessionsRoot, group)
  const candidates = sessionLogsInGroup(gdir).slice(0, 15).map((session) => {
    const state = runStateOf({ logPath: session.logPath, wsRoot: join(ROOT, 'research-workspace'), includeSessionIdentity: true })
    return { ...session, canonicalSessionId: state.sessionId, title: state.title, pending: state.readable && leadHitlCandidate(state) }
  })
  const selected = selectPendingSession(candidates, SESSION)
  if (selected.candidate === null) {
    const why = {
      'no-pending-session': '最新 15 个会话无 lead 的真挂起',
      'session-title-ambiguous': '标题子串匹配不唯一——拒绝让 UI 与盘侧日志错配',
      'session-not-found': `最新 15 个会话里找不到 --session「${SESSION}」`,
      'session-not-pending': `--session「${SESSION}」匹配的会话不处于 lead 挂起态`,
      'session-id-unavailable': '候选缺少 UI 会话身份标识，无法保证判决日志与浏览器目标一致',
    }[selected.reason] ?? '无法唯一定位挂起会话'
    console.error(`hitl-answer: 盘侧谓词自拒——${why}。不开浏览器。`)
    process.exit(3)
  }
  diskPendingTarget = selected.candidate.pending === true
  pendingLogPath = selected.candidate.logPath
  uiTargetSessionId = selected.candidate.sessionId
  uiTargetTitle = selected.candidate.title ?? null
  console.log(`hitl-answer: 盘侧谓词——真挂起会话在场：${uiTargetSessionId}「${uiTargetTitle ?? '无标题'}」`)
}
// 驱动计划（点击前读盘侧形态，BUG-005）：卡共几题 + ask 形态。活等待（wait:-1）下
// timed 600s 放行与文本消息兜底**都不可用**——脚本必须真浏览器答满，操作者必须知道这点。
let plan = { questionCount: null, indefinite: null, callId: null, questions: [] }
{
  const s1 = pendingLogPath !== null ? readSessionEvents(pendingLogPath) : { readable: false, events: [] }
  const ask = s1.readable ? [...s1.events].reverse().find((j) => j?.type === 'tool/call' && j?.data?.name === 'ask_user_question') : undefined
  if (ask !== undefined) plan = { ...parseAskArgs(ask.data?.arguments), questions: parseAskQuestions(ask.data?.arguments), callId: ask.data?.callId ?? null }
}
const expectedCardKey = questionCardKeyOf(uiTargetSessionId, plan.callId)
if (expectedCardKey === null) {
  console.error('hitl-answer: 盘侧挂起 ask 缺少可用 callId，无法绑定唯一 UI 卡片——拒绝打开浏览器并作答')
  process.exit(3)
}
console.log(`hitl-answer: 驱动计划——卡共 ${plan.questionCount ?? '?'} 题 · 形态 = ${plan.indefinite === true ? 'wait:-1 无限期（⚠ timed 放行与文本兜底均不可用，必须真浏览器答满）' : plan.indefinite === false ? 'timed/默认（600s 放行 + 保持可答）' : '未知（日志读不到 ask 参数）'}`)
// 模式自报（2026-09-26 教训：`flag/has` 的 `--` 加了两遍 → `--dry-run` 判假，**"dry-run" 实际
// 执行了代答**。此后开局即打印模式，操作者一眼能看出它到底会不会点。）
console.log(`hitl-answer: 模式 = ${DRY ? 'dry-run（只看不点）' : '实答（会提交）'} · pick=${PICK} · session=${SESSION ?? '（盘侧最新挂起）'}`)

const answered = []
const log = (m) => console.log(m)

const chromium = await loadChromium(ROOT)
const browser = await launchChromium(chromium)
// ⚠ 视口要够高（2026-09-27 第七场实测）：题干超长的问询卡会把选项行挤到 y≈2300+，
// 1100 高的视口里选项在折叠线下方、Playwright 在该容器里自动滚动不生效 → click 超时被
// catch 吞掉 → Submit 一直 disabled、答了 8 次全没提交。2600 覆盖至今见过的最长卡。
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 2600 } })
  await page.goto(`http://127.0.0.1:${PORT}/?token=${TOKEN}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)

  // ⓪ 关测试须知弹窗——**限定在 dialog/mask 容器内点**：实测教训（2026-09-26 跑第二场 run 时踩到）
  //   问询卡片的提交按钮同样可能叫 "Continue"，盲点 `button:has-text("Continue")` 会在卡片已
  //   渲染时**替人提交默认选项**。容器实测有**两种**：`_dialog_`（CSS modules 哈希——测试须知
  //   "Internal Testing Notice" 用这个，重建 profile 后它会重新出现）与 `_mask_`；按序试。
  for (const sel of ['[class*="_dialog_"]', '[role="dialog"]', '[class*="_mask_"]']) {
    const dlg = page.locator(sel).first()
    if (!(await dlg.isVisible().catch(() => false))) continue
    for (const lbl of ['button:has-text("Continue")', 'button:has-text("我知道了")', 'button:has-text("Got it")']) {
      const b = dlg.locator(lbl).first()
      if (await b.isVisible().catch(() => false)) {
        try { await b.click() } catch (error) { log(`hitl-answer: ⚠ 测试须知按钮点击失败（${String(error).slice(0, 90)}）`) }
        break
      }
    }
    break
  }
  await page.waitForTimeout(800)

  // ① 点开侧栏里挂起问询的会话（左栏 x < 256，防中央区同名 class 抢匹配）。
  //    实测坑（2026-09-26 第三场 HITL2）：`click().catch(()=>{})` 会把超时**静默吞掉**——
  //    页面未加载完时元素在重渲染，click 落空但脚本以为点开了，随后 40s 等卡片当然等不到。
  //    现在：①初始等待加长到 6s；②click 失败要**报出来**；③点完校验主视图真的切到了该会话
  //    （正文里出现会话标题或问询卡片），没切就换目标再点一次。
  const rows = page.locator('span[class*="_root_"]')
  const sessionRows = page.locator('[data-row-key^="session:"]')
  const workspaceRows = page.locator('[data-row-key^="workspace:"]')
  const overflowRows = page.locator('[data-row-key^="overflow:"]')
  // 侧栏行扫描上限（2026-10-15 卡第 1 条）：原为三处内联 `Math.min(n, 300)`；提为常量便于
  // 文案引用与反证注入。命中上限与"目标不在侧栏"是**两种因**，报错要分开（下面 capHit 记录）。
  const ROW_SCAN_CAP = 300
  // 命中上限的记录（卡第 1 条）：某次行扫因窗满而提前结束 ≠ "目标不在侧栏"——报错要分开说，
  // 否则超限场会被误导成"归档/终局化"处置（旧文案实测：零上限时报"侧栏没有目标会话行"且
  // 样本区显示"（侧栏零可见行）"，而行明明在场）。
  const capHits = new Map() // kind → total（逐类记账：超限时可能多类同时命中，报单一类会漏信息）
  const noteCap = (kind, total) => { if (total > ROW_SCAN_CAP) capHits.set(kind, total) }
  const rowTexts = [] // 诊断样本：每次行扫收集可见行文本，找不到目标时报给操作者对照
  // 仍折叠的组数（BUG-031）：>0 说明还没展开完，不能断言"通道实例老化"——先把可展开的都展开。
  const collapsedGroupCount = async () => {
    let n = 0
    for (const items of [workspaceRows, overflowRows]) {
      const total = await items.count()
      for (let i = 0; i < Math.min(total, ROW_SCAN_CAP); i++) {
        if (await items.nth(i).getAttribute('aria-expanded') === 'false') n++
      }
    }
    return n
  }
  const findTargetRow = async () => {
    const n = await sessionRows.count()
    noteCap('session 行', n)
    for (let i = 0; i < Math.min(n, ROW_SCAN_CAP); i++) {
      const el = sessionRows.nth(i)
      if (await el.getAttribute('data-row-key') === `session:${uiTargetSessionId}`) return el
    }
    return null
  }
  const expandOneSidebarSection = async () => {
    for (const [items, attr] of [[workspaceRows, 'aria-expanded'], [overflowRows, 'aria-expanded']]) {
      const n = await items.count()
      noteCap('分组行', n)
      for (let i = 0; i < Math.min(n, ROW_SCAN_CAP); i++) {
        const el = items.nth(i)
        if (!(await el.isVisible().catch(() => false)) || await el.getAttribute(attr) !== 'false') continue
        const box = await el.boundingBox().catch(() => null)
        if (box === null || box.x >= 256) continue
        try { await el.click({ timeout: 10_000 }) } catch (e) { log(`hitl-answer: ⚠ 侧栏展开失败（${String(e).slice(0, 90)}）`); return false }
        await page.waitForTimeout(120)
        return true
      }
    }
    return false
  }
  let searchTried = false
  let searchHit = false
  const revealTargetRow = async () => {
    for (let attempt = 0; attempt < 300; attempt++) {
      const row = await findTargetRow()
      if (row !== null && await row.isVisible().catch(() => false)) return row
      if (!(await expandOneSidebarSection())) break
    }
    // 懒渲染兜底（BUG-035 正修，2026-10-18 实测）：侧栏列表可能**根本不含目标会话行**
    // （分组行在场、会话行不在 DOM），而 `Search sessions` 能搜到同一条——扫行/展开够不着时
    // 走搜索路径再扫一次；不再把"扫不到"判成"实例老化/需重启"（重启已被实测证伪）。
    const title = uiTargetTitle
    if (title !== null && title !== undefined && title !== '') {
      searchTried = true
      if (await searchSessionByTitle(page, title)) {
        log(`hitl-answer: 侧栏扫行未命中 → 走搜索路径（"Search sessions" 输入「${String(title).slice(0, 40)}」）`)
        // 搜索结果**不带行键**（实测）→ 按文本点；是否真切到目标由 openSession 的 activated() 复核
        if (await clickSearchResultByTitle(page, title)) {
          log('hitl-answer: 已点搜索结果（结果行无行键，改为按文本点）——等主视图 session id 复核')
          searchHit = true
          return 'search-clicked' // 哨兵：点击已发生，openSession 直接交给 activated() 复核
        }
      }
    }
    return null
  }
  const inspectUi = async (action = 'identity', fields = {}) => page.evaluate(operateOnTargetCard, {
    targetSessionId: uiTargetSessionId,
    expectedCardKey,
    action,
    ...fields,
  })
  const openSession = async () => {
    rowTexts.length = 0
    const n = await rows.count()
    noteCap('可见行（诊断样本）', n)
    for (let i = 0; i < Math.min(n, ROW_SCAN_CAP); i++) {
      const el = rows.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      const box = await el.boundingBox().catch(() => null)
      if (box === null || box.x >= 256) continue
      const text = ((await el.textContent()) ?? '').trim()
      if (text !== '') rowTexts.push(text.slice(0, 60))
    }
    const row = await revealTargetRow()
    if (row === null) return null
    if (row === 'search-clicked') return 'search-clicked' // 点击已在兜底里完成，不重复点
    const text = ((await row.textContent()) ?? '').trim()
    const box = await row.boundingBox().catch(() => null)
    if (box === null || box.x >= 256) return null
    try { await row.click({ timeout: 10_000 }) } catch (e) { log(`hitl-answer: ⚠ 目标会话行点击失败（${String(e).slice(0, 90)}）`); return null }
    return text.slice(0, 60)
  }
  const activated = async () => (await inspectUi('session')).ready
  let opened = await openSession()
  if (opened !== null && !(await activated())) {
    log('目标行已点击，但主视图 session ID 尚未切到目标——按 session ID 重试一次')
    const row = await findTargetRow()
    if (row !== null) {
      try { await row.click({ timeout: 8_000 }) } catch (error) { log(`hitl-answer: ⚠ 目标会话重试点击失败（${String(error).slice(0, 90)}）`) }
    }
    await page.waitForTimeout(2500)
    if (!(await activated())) {
      log('重试后主视图 session ID 仍不匹配——拒绝在未确认的会话视图代答')
      stopForMissingUiSession()
    }
  }
  if (opened === null) {
    // 错因判据（BUG-031）：把"目标不在侧栏"与"通道实例老化（UI 渲染不出会话行）"分开说——
    // 旧文案在老化现场是误导的（让操作者去查归档/终局化，两条都不成立）。
    const verdict = sidebarMissVerdict({
      renderedSessionRows: await sessionRows.count().catch(() => 0),
      collapsedGroups: await collapsedGroupCount().catch(() => 0),
      capHit: capHits.size > 0,
      diskPending: diskPendingTarget,
      triedSearch: searchTried,
      searchHit,
    })
    console.error(`hitl-answer: 侧栏没有目标会话行（session id=${uiTargetSessionId}，--session=${SESSION ?? '（盘侧最新挂起）'}）`
      + `——错因判据 = ${verdict.kind}：${verdict.message}`)
    if (capHits.size > 0) {
    const detail = [...capHits].map(([kind, total]) => `${kind} ${total} 条`).join('、')
    console.error(`hitl-answer: ⚠ 扫描上限（上限 ${ROW_SCAN_CAP}）——${detail}：目标可能在**未扫描区间**`
      + '（与"不在侧栏"不同因——先扩窗或收窄候选再重试，别按"已归档/被终局化"处置）')
    if (rowTexts.length === 0) console.error('hitl-answer: 注：下面的"侧栏可见行样本"为空同样可能由扫描上限造成——不代表侧栏真的没有行。')
  }
  console.error('hitl-answer: 侧栏可见行样本（展开后仍未见目标时对照）：'
      + (rowTexts.slice(0, 8).join(' ⏐ ') || '（侧栏零可见行）'))
    process.exitCode = 3
    throw NO_TARGET_SESSION
  }
  log(`hitl-answer: 已打开会话「${opened}」`)

  // Wait until both the active conversation and its one visible ask card match the disk-selected session/call.
  const cardReady = async () => (await inspectUi('identity')).ready
  let ready = false
  for (let i = 0; i < 40; i++) {
    if (await cardReady()) { ready = true; break }
    await page.waitForTimeout(1000)
  }
  if (!ready) {
    const identity = await inspectUi('identity')
    log(`hitl-answer: 等待目标会话 ask 卡超时或身份未匹配（${identity.reason ?? 'identity-unavailable'}）——拒绝操作任何页面卡片`)
    stopForMissingUiSession()
  }
  await page.waitForTimeout(600)

  // ② 策略驱动作答（BUG-004 重写）：观察 → nextDriveAction → 动作，UI 形状**永不**判完成；
  //    提交成功与否由尾部盘侧裁决（driveVerdict）唯一判定。点击走 DOM 原生派发（Playwright
  //    在 DSH UI 上的 actionability 检查会被问询卡挡死——cdp-probe 头注同款实测）。
  const observeCard = async () => inspectUi('observe')
  const clickOption = async (index, expectedLabels) => inspectUi('click-option', { index, expectedLabels })
  const fillCustom = async (value) => inspectUi('custom', { value })
  const clickSubmit = async () => {
    const result = await inspectUi('click-submit')
    return result.ready && result.clicked === true ? { clicked: true, kind: result.kind ?? 'final' } : { clicked: false, kind: null }
  }
  let submitted = false
  let customConsumed = false // --custom 文本是否已作为纯文本题作答消费掉
  // BUG-015 决策层：预选项 vs pick 意图的符合性进决策——目标不可解析（越界/空）时视为相符
  // 放行（不瞎改选），裁决后的意图对账把关；预选项不符时 nextDriveAction 给 click-option
  // 先改选目标项（clickOption 的 pick 定位逻辑本就在，劫持机制 = 预选使 Submit 提前可用
  // 短路了它）。
  const decideWithIntent = (obs) => {
    const target = pickTargetLabel(obs.labels, PICK)
    const selMatch = obs.checkedLabel === null || target.label === null ? undefined : obs.checkedLabel === target.label
    return nextDriveAction({ ...obs, selectionMatchesIntent: selMatch, textAnswer: CUSTOM })
  }
  for (let step = 1; step <= MAX_STEPS; step++) {
    let obs = await observeCard()
    if (obs.ready !== true) {
      // 重渲染瞬态（卡片切换中）给一次复看机会；身份仍未对上即停——绝不操作未验证的卡。
      await page.waitForTimeout(1200)
      obs = await observeCard()
      if (obs.ready !== true) { log(`hitl-answer: 卡片身份校验失败（${obs.reason ?? 'identity-unavailable'}）——拒绝操作，交盘侧裁决`); break }
    }
    let act = decideWithIntent(obs)
    if (act.action === 'abort') {
      // 重渲染二次确认：题间切换的瞬态（radioCount=0）不该误判"无卡"——1.2s 后重看一次
      await page.waitForTimeout(1200)
      obs = await observeCard()
      if (obs.ready !== true) { log(`hitl-answer: 卡片身份校验失败（${obs.reason ?? 'identity-unavailable'}）——拒绝操作，交盘侧裁决`); break }
      act = decideWithIntent(obs)
    }
    if (DRY) { log(`[dry-run] 观察 radio=${obs.radioCount} checked=${obs.checkedCount} submit=${obs.submitFound}/${obs.submitDisabled} → ${act.action}（${act.reason}）`); break }
    if (act.action === 'abort') { log(`hitl-answer: ${act.reason}`); break }
    if (act.action === 'fill-text') {
      customConsumed = true // 该文本已作为本题作答消费——不再当作选项题的补充文本（防串题）
      const filled = await fillCustom(CUSTOM)
      if (filled.ready !== true) { log(`hitl-answer: 纯文本题填入未命中（${filled.reason ?? 'custom-unavailable'}）——如实停止`); break }
      answered.push({ step, prompt: obs.prompt ?? null, selected: `（文本作答）${String(CUSTOM).slice(0, 60)}` })
      log(`hitl-answer: 第 ${step} 题 ← 文本作答（${String(CUSTOM).slice(0, 40)}…）`)
      await page.waitForTimeout(900)
      continue
    }
    if (act.action === 'click-advance') {
      const adv = await inspectUi('click-advance')
      if (adv.ready !== true || adv.clicked !== true) { log(`hitl-answer: 推进钮点击未命中（${adv.reason ?? 'advance-unavailable'}）——如实停止`); break }
      log(`hitl-answer: 第 ${step} 轮 —— 推进钮「${adv.label ?? 'Skip/Next'}」已点击（不代表提交）`)
      await page.waitForTimeout(900)
      continue
    }
    if (act.action === 'click-option') {
      const index = optionIndexToClick({ optionLabels: obs.labels, checkedIndex: obs.checkedIndex, pick: PICK })
      const hit = index === null ? null : await clickOption(index, obs.labels)
      if (hit === null || hit.ready !== true) { log(`hitl-answer: 选项点击未命中或题面已变化（${hit?.reason ?? 'index-unavailable'}）——如实停止（盘侧裁决收口）`); break }
      // ⚠ 顺序按**意图**定（BUG-032 定案，2026-10-17）：UI 的"自定义文本"是**替换选择**语义——
      // 同一问题上「选择」与「自定义」只能留一个（批形态实测：`selected:[] + custom:"…"` 或 `selected:["label"]`）。
      // 故：给了 `--custom` 就让它**胜出**（点完再填，文本进批；代价 = 选项 label 被替换，stop 语义上
      // 这正是"用户的答复是这段话"）；没给就只点选项。反过来的顺序会让文本被点击清掉——lead 只看到
      // label、看不到修法（2026-10-17 实测：两次下达修法静默丢失、回合空转）。
      if (CUSTOM !== null && !customConsumed) {
        const filled = await fillCustom(CUSTOM)
        if (filled.ready !== true) log(`hitl-answer: ⚠ custom 填写未落在目标卡上（${filled.reason ?? 'custom-unavailable'}）——如实跳过`)
      }
      answered.push({ step, prompt: hit.prompt, selected: hit.label })
      log(`hitl-answer: 第 ${step} 题 ← ${hit.label}`)
      await page.waitForTimeout(900) // 等选中态/翻页渲染
      continue
    }
    // click-submit（kind=advance 只是翻页：继续循环，不算提交成功）
    const now = await clickSubmit()
    if (now.clicked && now.kind === 'advance') {
      log(`hitl-answer: 已答 ${answered.length} 题——翻页（Next）已点击，继续下一题`)
      await page.waitForTimeout(900)
      continue
    }
    if (now.clicked) { submitted = true; log(`hitl-answer: 已答 ${answered.length} 题——Submit 已点击`); break }
    await page.waitForTimeout(700) // 提交钮被重渲染 → 回环重观察
  }

  log(`hitl-answer: 共作答 ${answered.length} 题${plan.questionCount !== null ? ` / 卡共 ${plan.questionCount} 题` : ''}${submitted ? ' · Submit 已点击' : ' · 未走到 Submit'}`)
  // 盘侧裁决（BUG-004 升格 + 活体验证补切片）：成功判据 = 盘侧 answer 批内容（UI 会预选/
  // 自动推进选中态，点击计数不可作判据——实测点击 0 次而批全 Recommended 的假红形态）。
  // 读窗有界重试（BUG-007 关联：日志帧批量落盘，answer 事件可能晚于短读窗数秒——等谓词，
  // 不固定睡；最多 4 读 × 3s，仍不落地才如实红）。
  // landedBatch 声明在裁决块外（作用域教训：块内声明 + 块外 provenance 引用 = 裁决通过后必崩，
  // 答案落地但 provenance 永丢——license run HITL2 实录，第三缺口）。
  let landedBatch = []
  {
    let verdict = null
    if (DRY) {
      verdict = driveVerdict({ dryRun: true, settled: false, batch: [], clickCount: answered.length })
    } else {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) await page.waitForTimeout(3000)
        const s2 = pendingLogPath !== null
          ? runStateOf({ logPath: pendingLogPath, wsRoot: join(ROOT, 'research-workspace') })
          : { hitlPending: null }
        const batch = plan.callId !== null && pendingLogPath !== null
          ? answerBatchOf(readSessionEvents(pendingLogPath).events, plan.callId)
          : []
        const settled = s2.hitlPending === false && batch.length > 0
        const candidate = driveVerdict({ dryRun: false, settled, batch, clickCount: answered.length })
        if (candidate.pass) { verdict = candidate; landedBatch = batch; break }
        verdict = candidate // 保留最后一次（红），继续重试窗
      }
    }
    log(`hitl-answer: 盘侧裁决——${verdict.reason}`)
    process.exitCode = verdict.exitCode
  }
  // custom 进批复核（BUG-032）：盘侧裁决与意图对账都只看 selected——**给了 --custom 却没进批**
  // 必须响亮红（否则操作侧以为修法已送达，实际 lead 只收到一个 label）。处置指向 = 改用
  // `run-kickoff --prompt-file` 注入（注入通道可靠，本轮已验证）。
  let customMissing = false
  if (!DRY && process.exitCode === 0 && CUSTOM !== null && !customLandedInBatch({ batch: landedBatch, custom: CUSTOM })) {
    // 答复**已落地**（盘侧裁决通过），只是那段说明没进批——与 intentFailed 同族：事实照记、结果响亮红。
    console.error('hitl-answer: ⚠ **custom 文本未进答复批**——UI 的自定义是"替换选择"语义（同一问题二者只能留一个），'
      + 'lead 收不到这段说明（只看到选项 label）。处置：长修法改走 `dev/run-kickoff.mjs --session <id> --prompt-file <文件>` 注入。')
    process.exitCode = 1
    customMissing = true
  }
  // 意图对账（BUG-015 裁决后半）：盘侧批已落地 ≠ 命令的答案已落地——逐题对 pick 目标，
  // 不符即响亮红（exit 1）；答案内容仍进 provenance（事实归事实，意图归意图）。
  let intentFailed = false
  if (!DRY && process.exitCode === 0 && landedBatch.length > 0 && (plan.questions ?? []).length > 0) {
    const rec = intentReconcile({ batch: landedBatch, questions: plan.questions, pick: PICK })
    if (rec.ok) {
      log(`hitl-answer: 意图对账通过——answer 批与 pick=${PICK} 逐题一致`)
    } else {
      intentFailed = true
      process.exitCode = 1
      for (const m of rec.mismatches) log(`hitl-answer: ⚠ 意图未达成——Q「${m.id}」pick=${PICK} 目标「${m.expected}」，实际落地「${m.landed}」——答案已落地但不是命令的答案，勿当成功用（BUG-015 对账）`)
    }
  }
  // 代理模拟 provenance（BUG-014 正修 ×3）：盘侧裁决通过（answer 真落地）才写盘——数据源 =
  // **实际提交的 answer 批**（batchToAnswered，id 作标签），不以点击日志为准（DSH UI 预选推荐项、
  // 零点击 Submit 时点击日志为空——第二缺口实录：mcp-hosts run HITL2 预选形态零写盘）。
  // dry-run 不写；裁决红不写；批与点击日志双空 = answer 未落地不写。HITL1 窗口（无 bundle）响亮延迟。
  // ⚠ 作用域教训（第三缺口实录）：landedBatch 必须声明在裁决块之外——块内声明 + 块外引用
  // = ReferenceError，裁决通过后必崩（答案已落地但 provenance 永远丢失，且 node --check 查不出）。
  const provAnswered = batchToAnswered(landedBatch, plan.questions).length > 0 ? batchToAnswered(landedBatch, plan.questions) : answered
  if (!DRY && provAnswered.length > 0 && (process.exitCode === 0 || intentFailed || customMissing)) {
    const wsRoot = join(ROOT, 'research-workspace')
    // 归属 = 被答会话自己的 bundle-bind（BUG-020 正修）：仅写命中归属，仅读/无绑定走延迟
    // 分支——旧字典序 activeBundle 在无关在飞 bundle 在场时误归（两次实测）。journal **现读**
    // （答案落地后 lead 可能已追加事件；绑定只增不减，现读信号面最全）。
    const eventsNow = pendingLogPath !== null ? readSessionEvents(pendingLogPath).events : []
    const attributed = attributionBundleOf(eventsNow)
    const pickNote = intentFailed ? `${PICK}（意图不符实录：目标未达成，见对账输出——事实仍记账）` : PICK
    if (attributed === null) {
      // 无写命中 = HITL1 窗口常态（澄清先于 bundle 实例化）或仅读绑定（预检/恢复，证据不足
      // 不归属）——provenance 响亮延迟不崩溃（answer 已落地，崩溃会让操作者误判答题失败）；
      // 记账义务移交操作侧：bundle 出现/确认后补记（答案内容已逐题打印在下方）。
      log('hitl-answer: answer 已落地但被答会话无可归属 bundle（仅写命中才归属——HITL1 窗口 / 立项预检期常态）——provenance 延迟：bundle 实例化后由操作侧补记，勿隐去')
    } else {
      // 写盘竞态自知：答案落地后 lead 常立即爆发写盘（拍板行 / journal 追加），瞬时 rename
      // 窗口会让严格版 lib 抛「契约件缺席」——驱动侧有界重试（3 次 × 2s）；仍失败则响亮延迟
      // 不崩（答案落地是关键副作用，provenance 缺席要大声但不能吞掉答题成功）。
      let written = null
      for (let attempt = 0; attempt < 3 && written === null; attempt++) {
        if (attempt > 0) await page.waitForTimeout(2000)
        try {
          written = appendProvenance({ bundle: join(wsRoot, `drt_${attributed}`), date: localDateStr(), pick: pickNote, answered: provAnswered })
        } catch (e) {
          if (attempt === 2) log(`hitl-answer: provenance 写盘失败（3 次重试后）——${String(e?.message ?? e).slice(0, 140)}；记账义务移交操作侧（答案内容已打印），勿隐去`)
        }
      }
      if (written !== null) log(`hitl-answer: 代理模拟记录已写盘——${written.question} + ${written.journal}`)
    }
  } else if (DRY) {
    log('hitl-answer: dry-run——代理模拟记录不写盘')
  } else if (answered.length > 0 || provAnswered.length > 0) {
    log('hitl-answer: 未提交成功（盘侧裁决红）——不写 provenance（answer 未落地，如实）')
  }
  for (const a of answered) log(`  Q${a.step}: ${a.prompt}\n     → ${a.selected}`)
} catch (error) {
  if (error !== NO_TARGET_SESSION) throw error
} finally {
  try { await browser.close() } catch (error) { log(`hitl-answer: browser.close 失败（${String(error?.message ?? error).slice(0, 120)}）`) }
  // 进程收割（BUG-004 放大器加固）：close 后主进程若仍活着（exitCode null）→ SIGKILL 兜底。
  // SIGKILL 后等待 exit；close/kill 失败显性报告而不伪装资源已释放。
  const proc = typeof browser.process === 'function' ? browser.process() : null
  if (proc !== null && proc !== undefined && proc.pid !== undefined && proc.exitCode === null && proc.signalCode === null) {
    const exited = once(proc, 'exit').then(() => true, (error) => {
      log(`hitl-answer: 子进程退出监听失败（${String(error?.message ?? error).slice(0, 120)}）`)
      return false
    })
    let signalled = false
    try {
      process.kill(proc.pid, 'SIGKILL')
      signalled = true
    } catch (error) {
      if (error?.code !== 'ESRCH') log(`hitl-answer: SIGKILL 子进程失败（${String(error?.message ?? error).slice(0, 120)}）`)
    }
    if (signalled) await exited
  }
}
