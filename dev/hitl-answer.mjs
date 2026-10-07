#!/usr/bin/env node
// dev/hitl-answer.mjs —— HITL 代答驱动（代理模拟 HITL1/HITL2 的唯一实现）。
//
// 为什么需要它（2026-09-26 跑 run 时实测的环路缺口）：`ask_user_question` 走 `ctx.userQuestions`
// 的 answerer waterfall，而**全仓唯一的 answerer 是连着 web 的浏览器客户端**——CLI/host 侧没有
// answerer，也没有提交答案的 RPC（vendor 实测：只有 web 客户端这条 relayed listener）。
// 于是"代理代跑"在机制上无法作答：`scripts/client-hitl-smoke.mjs` 也明确"触发但不代答"。
// 本脚本补上这条缝：用真浏览器把挂起的问询答完，并把每次选择打印出来，供 bundle 的
// question.md §Decisions 如实记"代理模拟"。
//
// 用法（须带 tsx——前置谓词 import pack .ts 源）：
//   node --import tsx/esm dev/hitl-answer.mjs --port 3083 --token <横幅 token> [--session <标题子串>]
//                            [--pick recommended|first|<1-based index>] [--custom <文本>]
//                            [--max-steps 8] [--dry-run]
// 行为：**先盘侧谓词自拒**（无真挂起会话即退出，不开浏览器——2026-09-27 实录：grep 误报
//       "卡已挂起"后代答空转找卡）→ 打开 web → 关测试须知模态 → 点开侧栏里"Waiting for
//       answer"的会话 → 逐题作答（默认选带 Recommended 的那一项）→ 提交 → 打印每题的选择。
// 注意：**必须**在 question.md §Decisions 与 journal.md 标注"代理模拟"——它替的是人，不是人。
import { resolve, dirname, join } from 'node:path'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadChromium, launchChromium } from '../scripts/lib/playwright.mjs'
import { runStateOf, readSessionEvents, bundleStateOf } from '../scripts/lib/run-state.mjs'
import { parseAskArgs, nextDriveAction, driveVerdict, answerBatchOf, parseAskQuestions, pickTargetLabel, intentReconcile } from '../scripts/lib/ask-drive.mjs'
import { appendProvenance, batchToAnswered } from '../scripts/lib/hitl-provenance.mjs'

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
const SESSION = rawSession !== null && rawSession.trim() !== '' ? rawSession : null // 标题子串；缺省 = 侧栏里第一个 "Waiting for answer"
const PICK = flag('--pick', 'recommended') // recommended | first | <1-based index>
const CUSTOM = flag('--custom', null)
const MAX_STEPS = Number(flag('--max-steps', '8'))
const DRY = has('--dry-run')

if (!TOKEN) {
  console.error('缺 --token（web 横幅里的 token）')
  process.exit(2)
}

// ⓪⁻ 盘侧前置谓词（RFC run-ops-self-diagnosis）：开浏览器前，先按**事件形状**判定
//    research-workspace 组最新会话里有没有真挂起（末位回合事件 = 未答 ask_user_question）。
//    request/header 里的工具 schema 字样不构成挂起——那正是 grep 假阳性的形态。无真挂起即
//    自拒，不开浏览器空转。
// 以下三个模块级变量 = 谓词块的发现结果，尾部盘侧复核复用（2026-10-03：块作用域提升）。
let pendingSid = null // 形如 session-<uuid>；null = 无挂起
let wsGroup = null
let wsSessionsRoot = null
{
  const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(ROOT, 'runtime', 'harness-home')
  const sessionsRoot = join(home, 'sessions')
  const group = existsSync(sessionsRoot) ? readdirSync(sessionsRoot).find((d) => d.includes('research-workspace')) : undefined
  wsSessionsRoot = sessionsRoot; wsGroup = group
  if (group === undefined) {
    console.error('hitl-answer: 找不到 research-workspace 会话组——先 source dev/env.sh')
    process.exit(2)
  }
  const gdir = join(sessionsRoot, group)
  const sids = readdirSync(gdir)
    .map((d) => ({ d, m: (() => { try { return statSync(join(gdir, d, 'session.v4.jsonl.zstd')).mtimeMs } catch { return 0 } })() }))
    .sort((a, b) => b.m - a.m)
  let pending = null
  for (const { d, m } of sids.slice(0, 15)) {
    if (m === 0) continue
    const s = runStateOf({ logPath: join(gdir, d, 'session.v4.jsonl.zstd'), wsRoot: join(ROOT, 'research-workspace') })
    if (s.hitlPending === true) { pending = d; pendingSid = d; break } // 新者先扫，命中即停
  }
  if (pending === null) {
    console.error('hitl-answer: 盘侧谓词自拒——最新 15 个会话无真挂起（末位回合事件 ≠ 未答 ask_user_question）。'
      + '可能：① 卡还没发（request/header 工具 schema 字样不算挂起——grep 会误报，谓词不会）；'
      + '② 挂起回合已被 web 重启终局化（需向会话发恢复 prompt 让 lead 原样重发）。不开浏览器。')
    process.exit(3)
  }
  console.log(`hitl-answer: 盘侧谓词——真挂起会话在场：${pending}`)
}
// 驱动计划（点击前读盘侧形态，BUG-005）：卡共几题 + ask 形态。活等待（wait:-1）下
// timed 600s 放行与文本消息兜底**都不可用**——脚本必须真浏览器答满，操作者必须知道这点。
let plan = { questionCount: null, indefinite: null, callId: null, questions: [] }
{
  const s1 = readSessionEvents(join(wsSessionsRoot, wsGroup, pendingSid, 'session.v4.jsonl.zstd'))
  const ask = s1.readable ? [...s1.events].reverse().find((j) => j?.type === 'tool/call' && j?.data?.name === 'ask_user_question') : undefined
  if (ask !== undefined) plan = { ...parseAskArgs(ask.data?.arguments), questions: parseAskQuestions(ask.data?.arguments), callId: ask.data?.callId ?? null }
}
console.log(`hitl-answer: 驱动计划——卡共 ${plan.questionCount ?? '?'} 题 · 形态 = ${plan.indefinite === true ? 'wait:-1 无限期（⚠ timed 放行与文本兜底均不可用，必须真浏览器答满）' : plan.indefinite === false ? 'timed/默认（600s 放行 + 保持可答）' : '未知（日志读不到 ask 参数）'}`)
// 模式自报（2026-09-26 教训：`flag/has` 的 `--` 加了两遍 → `--dry-run` 判假，**"dry-run" 实际
// 执行了代答**。此后开局即打印模式，操作者一眼能看出它到底会不会点。）
console.log(`hitl-answer: 模式 = ${DRY ? 'dry-run（只看不点）' : '实答（会提交）'} · pick=${PICK} · session=${SESSION ?? '（侧栏第一个待答）'}`)

const answered = []
const log = (m) => console.log(m)

const chromium = await loadChromium(ROOT)
const browser = await launchChromium(chromium)
// ⚠ 视口要够高（2026-09-27 第七场实测）：题干超长的问询卡会把选项行挤到 y≈2300+，
// 1100 高的视口里选项在折叠线下方、Playwright 在该容器里自动滚动不生效 → click 超时被
// catch 吞掉 → Submit 一直 disabled、答了 8 次全没提交。2600 覆盖至今见过的最长卡。
const page = await browser.newPage({ viewport: { width: 1600, height: 2600 } })
try {
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
      if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break }
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
  const openSession = async () => {
    const n = await rows.count()
    for (let i = 0; i < Math.min(n, 80); i++) {
      const el = rows.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      const box = await el.boundingBox().catch(() => null)
      if (box === null || box.x >= 256) continue
      const text = ((await el.textContent()) ?? '').trim()
      const match = SESSION !== null ? text.includes(SESSION) : text.includes('Waiting for answer')
      if (!match) continue
      try { await el.click({ timeout: 10_000 }) } catch (e) { log(`hitl-answer: ⚠ 行点击失败（${String(e).slice(0, 90)}）——换下一个目标`) ; continue }
      return text.slice(0, 60)
    }
    return null
  }
  const activated = async (title) => {
    const body = await page.evaluate(() => document.body.innerText).catch(() => '')
    if (/Waiting for your action|Recommended|Submit/.test(body)) return true // 问询卡片在场
    return title !== null && body.includes(title.slice(0, 20)) // 或主视图标题 = 会话标题
  }
  let opened = await openSession()
  if (opened !== null && !(await activated(opened))) {
    log('hitl-answer: 点击后主视图没切过去——重试一次（点标题文本）')
    const t2 = page.locator(`text=${(opened.match(/[^A-Za-z]+/) ?? ['x'])[0].slice(0, 8)}`).first()
    await t2.click({ timeout: 8_000 }).catch(() => {})
    await page.waitForTimeout(2500)
    if (!(await activated(opened))) log('hitl-answer: ⚠ 重试后仍未激活——继续等卡片，若超时则如实报告')
  }
  if (opened === null) {
    // 预期态，不是异常：没有待答会话时给一句人话 + 非零退出（原来抛栈，操作者要自己读 trace）
    console.error(`hitl-answer: 侧栏没有待答会话（--session=${SESSION ?? '（缺省：Waiting for answer）'}）——`
      + '可能：① 该 HITL 已被答过；② 挂起回合被 web 重启终局化（需向会话发恢复 prompt 让 lead 原样重发问询）。')
    process.exit(3)
  }
  log(`hitl-answer: 已打开会话「${opened}」`)

  // ①b 等卡片渲染（实测：点开会话后卡片不是立刻就有——问询可能正在写、或视图还在挂载。
  //     固定 sleep 会漏，故轮询到出现为止；超时才放弃。）
  const cardReady = async () => {
    for (const sel of ['text=/Waiting for your action/', '[class*="_option_"]', 'text=/Recommended/']) {
      if (await page.locator(sel).first().isVisible().catch(() => false)) return true
    }
    return false
  }
  let ready = false
  for (let i = 0; i < 40; i++) {
    if (await cardReady()) { ready = true; break }
    await page.waitForTimeout(1000)
  }
  if (!ready) log('hitl-answer: 等了 40s 仍未见问询卡片——会话可能已不在待答态（问询被终局化或已答）')
  await page.waitForTimeout(600)

  // ② 策略驱动作答（BUG-004 重写）：观察 → nextDriveAction → 动作，UI 形状**永不**判完成；
  //    提交成功与否由尾部盘侧裁决（driveVerdict）唯一判定。点击走 DOM 原生派发（Playwright
  //    在 DSH UI 上的 actionability 检查会被问询卡挡死——cdp-probe 头注同款实测）。
  const observeCard = async () => page.evaluate(() => {
    const rg = [...document.querySelectorAll('[role="radiogroup"]')].pop()
    if (!rg) return { radioCount: 0, checkedCount: 0, labels: [], checkedLabel: null, submitFound: false, submitDisabled: false }
    const radios = [...rg.querySelectorAll('button[role="radio"]')]
    let scope = rg
    let submit = null
    for (let up = 0; up < 4 && scope && submit === null; up++) {
      const cand = scope.parentElement
      if (!cand) break
      scope = cand
      submit = [...scope.querySelectorAll('button')].find((b) => /^(Submit|提交)$/i.test((b.textContent ?? '').trim())) ?? null
    }
    const labelOf = (b) => (b.textContent ?? '').trim()
    const checkedRadio = radios.find((b) => b.getAttribute('aria-checked') === 'true') ?? null
    return {
      radioCount: radios.length,
      checkedCount: radios.filter((b) => b.getAttribute('aria-checked') === 'true').length,
      labels: radios.map(labelOf),
      checkedLabel: checkedRadio === null ? null : labelOf(checkedRadio),
      submitFound: submit !== null,
      submitDisabled: submit !== null && !!submit.disabled,
    }
  })
  const clickOption = async () => page.evaluate((pick) => {
    const rg = [...document.querySelectorAll('[role="radiogroup"]')].pop()
    if (!rg) return null
    const radios = [...rg.querySelectorAll('button[role="radio"]')]
    if (radios.length === 0) return null
    const checked = radios.find((b) => b.getAttribute('aria-checked') === 'true')
    let want = null
    if (checked === undefined) {
      if (pick === 'recommended') want = radios.find((b) => /Recommended/i.test(b.textContent ?? '')) ?? null
      else if (pick !== 'first' && Number.isFinite(Number(pick))) want = radios[Number(pick) - 1] ?? null
      if (want === null) want = radios[0]
    }
    const el = checked ?? want
    el.scrollIntoView({ block: 'center' })
    el.click()
    let p = rg
    for (let i = 0; i < 4 && p; i++) p = p.parentElement
    return {
      label: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
      prompt: p ? (p.textContent ?? '').replace(/\s+/g, ' ').slice(0, 140) : '(未取到题干)',
    }
  }, PICK)
  const clickSubmit = async () => page.evaluate(() => {
    const rg = [...document.querySelectorAll('[role="radiogroup"]')].pop()
    if (!rg) return false
    let scope = rg
    for (let up = 0; up < 4 && scope; up++) {
      const cand = scope.parentElement
      if (!cand) break
      scope = cand
      const submit = [...scope.querySelectorAll('button')].find((b) => /^(Submit|提交)$/i.test((b.textContent ?? '').trim()))
      if (submit && !submit.disabled) { submit.scrollIntoView({ block: 'center' }); submit.click(); return true }
    }
    return false
  })
  let submitted = false
  // BUG-015 决策层：预选项 vs pick 意图的符合性进决策——目标不可解析（越界/空）时视为相符
  // 放行（不瞎改选），裁决后的意图对账把关；预选项不符时 nextDriveAction 给 click-option
  // 先改选目标项（clickOption 的 pick 定位逻辑本就在，劫持机制 = 预选使 Submit 提前可用
  // 短路了它）。
  const decideWithIntent = (obs) => {
    const target = pickTargetLabel(obs.labels, PICK)
    const selMatch = obs.checkedLabel === null || target.label === null ? undefined : obs.checkedLabel === target.label
    return nextDriveAction({ ...obs, selectionMatchesIntent: selMatch })
  }
  for (let step = 1; step <= MAX_STEPS; step++) {
    let obs = await observeCard()
    let act = decideWithIntent(obs)
    if (act.action === 'abort') {
      // 重渲染二次确认：题间切换的瞬态（radioCount=0）不该误判"无卡"——1.2s 后重看一次
      await page.waitForTimeout(1200)
      obs = await observeCard()
      act = decideWithIntent(obs)
    }
    if (DRY) { log(`[dry-run] 观察 radio=${obs.radioCount} checked=${obs.checkedCount} submit=${obs.submitFound}/${obs.submitDisabled} → ${act.action}（${act.reason}）`); break }
    if (act.action === 'abort') { log(`hitl-answer: ${act.reason}`); break }
    if (act.action === 'click-option') {
      const hit = await clickOption()
      if (hit === null) { log('hitl-answer: 选项点击未命中——如实停止（盘侧裁决收口）'); break }
      if (CUSTOM !== null) {
        const box = page.locator('textarea, input[type="text"]').first()
        if (await box.isVisible().catch(() => false)) { await box.fill(CUSTOM).catch(() => {}); await page.waitForTimeout(200) }
      }
      answered.push({ step, prompt: hit.prompt, selected: hit.label })
      log(`hitl-answer: 第 ${step} 题 ← ${hit.label}`)
      await page.waitForTimeout(900) // 等选中态/翻页渲染
      continue
    }
    // click-submit
    if (await clickSubmit()) { submitted = true; log(`hitl-answer: 已答 ${answered.length} 题——Submit 已点击`); break }
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
        const s2 = (pendingSid !== null && wsGroup !== null && wsSessionsRoot !== null)
          ? runStateOf({ logPath: join(wsSessionsRoot, wsGroup, pendingSid, 'session.v4.jsonl.zstd'), wsRoot: join(ROOT, 'research-workspace') })
          : { hitlPending: null }
        const batch = plan.callId !== null && wsGroup !== null && wsSessionsRoot !== null
          ? answerBatchOf(readSessionEvents(join(wsSessionsRoot, wsGroup, pendingSid, 'session.v4.jsonl.zstd')).events, plan.callId)
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
  const provAnswered = batchToAnswered(landedBatch).length > 0 ? batchToAnswered(landedBatch) : answered
  if (!DRY && provAnswered.length > 0 && (process.exitCode === 0 || intentFailed)) {
    const wsRoot = join(ROOT, 'research-workspace')
    const { activeBundle } = bundleStateOf(wsRoot)
    const pickNote = intentFailed ? `${PICK}（意图不符实录：目标未达成，见对账输出——事实仍记账）` : PICK
    if (activeBundle === null) {
      // HITL1 窗口常态：澄清先于 bundle 实例化（persona 合同）——provenance 无法即时落盘，
      // 响亮延迟不崩溃（answer 已落地，崩溃会让操作者误判答题失败）；记账义务移交操作侧：
      // bundle 出现后补记（答案内容已逐题打印在下方）。
      log('hitl-answer: answer 已落地但工作区根无 drt_* bundle（HITL1 窗口常态）——provenance 延迟：bundle 实例化后由操作侧补记，勿隐去')
    } else {
      // 写盘竞态自知：答案落地后 lead 常立即爆发写盘（拍板行 / journal 追加），瞬时 rename
      // 窗口会让严格版 lib 抛「契约件缺席」——驱动侧有界重试（3 次 × 2s）；仍失败则响亮延迟
      // 不崩（答案落地是关键副作用，provenance 缺席要大声但不能吞掉答题成功）。
      let written = null
      for (let attempt = 0; attempt < 3 && written === null; attempt++) {
        if (attempt > 0) await page.waitForTimeout(2000)
        try {
          written = appendProvenance({ bundle: join(wsRoot, activeBundle), date: new Date().toISOString().slice(0, 10), pick: pickNote, answered: provAnswered })
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
} finally {
  try { await browser.close() } catch {}
  // 进程收割（BUG-004 放大器加固）：close 后主进程若仍活着（exitCode null）→ SIGKILL 兜底。
  // 僵尸 client 持有与通道的 websocket，会把宿主侧 ask 等待孤儿化（BUG-005 联动前提）。
  const proc = typeof browser.process === 'function' ? browser.process() : null
  if (proc !== null && proc !== undefined && proc.pid !== undefined && proc.exitCode === null) {
    try { process.kill(proc.pid, 'SIGKILL') } catch {}
  }
}
