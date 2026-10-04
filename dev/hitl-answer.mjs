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
import { runStateOf } from '../scripts/lib/run-state.mjs'

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
  const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(ROOT, 'dev', 'harness-home')
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

  // ② 逐题作答（0.2.0 分页问询卡：一次渲染一题 = radiogroup + pager "n / N" + Next/Submit）。
  //   2026-10-03 验收 run 现场实测三坑（本块重写的依据）：
  //   a. 选项容器类名漂移（`_option_` → `<hash>_option*`，CSS modules 前缀随构建变）——发现与
  //      定位改走 role（radiogroup / button[role=radio]），与类名彻底解耦；
  //   b. timed 超时后卡头从 "Waiting for your action" 变 "Work continued — you can still
  //      answer"——旧版以旧卡头消失判"提交完成"，在超时态每题都假绿退出（实测答 6 次全空转）；
  //   c. 前进按钮按 has-text 子串匹配会截胡页面里别的同名按钮——改在卡容器（radiogroup 的
  //      祖先）内按精确文本找。
  const visible = async (loc) => loc.isVisible().catch(() => false)
  const cardRoot = () => page.locator('[role="radiogroup"]').last()
  const optionButtons = () => cardRoot().locator('button[role="radio"]')
  /** 卡容器 = radiogroup 向上两层的 div（选项与 pager 按钮同住；类名不钉，走结构）。 */
  const cardContainer = () => cardRoot().locator('xpath=ancestor::div[1]|ancestor::div[2]').first()
  const pagerOf = async () => {
    // 2026-10-04 验收 run 残 bug 修复：旧版向上盲扫 3 层内所有 \d+/\d$ 文本，会命中**别的卡**
    // （历史 ask 卡同屏渲染时串读，实测 2/4 被读成 4/4 致跳题）。改走 drive 实证版：先向上找到
    // "含 pager 或 Next/Submit"的卡作用域，再**只在该作用域内**读 pager。
    return await page.evaluate(() => {
      const rg = [...document.querySelectorAll('[role="radiogroup"]')].pop()
      if (!rg) return null
      let scope = rg
      for (let up = 0; up < 4 && scope; up++) {
        const cand = scope.parentElement
        if (!cand) break
        const hasPager = [...cand.querySelectorAll('*')].some(e => e.childNodes.length <= 3 && /^(\d+)\s*\/\s*(\d+)$/.test((e.textContent ?? '').trim()))
        const hasFwd = [...cand.querySelectorAll('button')].some(b => /^(Next|Submit)$/i.test((b.textContent ?? '').trim()))
        scope = cand
        if (hasPager || hasFwd) break
      }
      const pagerEl = [...scope.querySelectorAll('*')].filter(e => e.childNodes.length <= 3 && /^(\d+)\s*\/\s*(\d+)$/.test((e.textContent ?? '').trim())).pop()
      const m = pagerEl ? (pagerEl.textContent ?? '').trim().match(/^(\d+)\s*\/\s*(\d+)$/) : null
      return m ? { cur: Number(m[1]), total: Number(m[2]) } : null
    })
  }
  const headerAlive = async () => {
    const body = await page.evaluate(() => document.body.innerText).catch(() => '')
    return /Waiting for your action|Work continued|you can still answer/i.test(body)
  }
  for (let step = 1; step <= MAX_STEPS; step++) {
    // 等当前题的选项渲染（radiogroup 里 ≥1 个 radio）
    let opts = 0
    for (let i = 0; i < 20; i++) {
      opts = await optionButtons().count()
      if (opts > 0) break
      await page.waitForTimeout(600)
    }
    if (opts === 0) {
      if (!(await headerAlive())) { log(`hitl-answer: 第 ${step} 题无选项且卡头已消——按已提交处理（尾部有盘侧复核）`); break }
      log(`hitl-answer: 等了 12s 仍无选项（第 ${step} 题）——卡可能被终局化或处于已答态；如实停止`)
      break
    }
    await page.waitForTimeout(500)
    const promptText = await page.evaluate(() => {
      const rg = [...document.querySelectorAll('[role="radiogroup"]')].pop()
      let p = rg
      for (let i = 0; i < 4 && p; i++) p = p.parentElement
      return p ? (p.textContent ?? '').replace(/\s+/g, ' ').slice(0, 140) : '(未取到题干)'
    })
    // 选目标：recommended → radiogroup 内带 Recommended 徽标的 radio；first/数字 → 第 n 个
    let target = null
    if (PICK === 'recommended') {
      const rec = cardRoot().locator('button[role="radio"]', { hasText: /Recommended/i }).first()
      if (await visible(rec)) target = rec
    }
    if (target === null) {
      const idx = PICK === 'first' ? 0 : Math.max(0, Number(PICK) - 1)
      const all = optionButtons()
      if (await all.count() > idx) target = all.nth(idx)
    }
    if (target === null || !(await visible(target))) { log(`hitl-answer: 第 ${step} 题没找到可点选项——停在此处（已答 ${answered.length} 题）`); break }
    const targetLabel = ((await target.textContent()) ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
    if (DRY) { log(`[dry-run] 第 ${step} 题将选：${targetLabel}`); break }
    try { await target.click({ timeout: 5000 }) } catch {
      const ok = await page.evaluate((n) => {
        const els = [...document.querySelectorAll('[role="radiogroup"] button[role="radio"]')]
        const el = els.find(e => (e.textContent ?? '').replace(/\s+/g, ' ').includes(n))
        if (!el) return false
        el.scrollIntoView({ block: 'center' }); el.click(); return true
      }, targetLabel.slice(0, 20))
      log(ok ? 'hitl-answer: ⚠ 选项在视口外点不动——已用 DOM 原生点击兜底' : 'hitl-answer: ⚠ 选项点击失败且 DOM 兜底未命中')
    }
    await page.waitForTimeout(700)
    if (CUSTOM !== null) {
      const box = page.locator('textarea, input[type="text"]').first()
      if (await visible(box)) { await box.fill(CUSTOM).catch(() => {}); await page.waitForTimeout(200) }
    }
    answered.push({ step, prompt: promptText, selected: targetLabel })
    log(`hitl-answer: 第 ${step} 题 ← ${targetLabel}`)
    // 前进：有 pager 且 cur < total → Next（精确文本）；末题或无 pager → Submit。
    //   ⚠ Skip 不是前进（跳题留空），绝不点。
    const pg = await pagerOf()
    const fwdTexts = pg !== null && pg.cur < pg.total ? ['Next', '下一步'] : ['Submit', '提交']
    let advanced = false
    for (const lb of fwdTexts) {
      const b = cardContainer().locator('button').filter({ hasText: new RegExp(`^${lb}$`) }).first()
      if (!(await visible(b))) continue
      const isDisabled = await b.evaluate((el) => el.disabled).catch(() => false)
      if (isDisabled) { await page.waitForTimeout(600) }
      try { await b.click({ timeout: 5000 }) } catch { await b.evaluate((el) => { el.scrollIntoView({ block: 'center' }); el.click() }).catch(() => {}) }
      advanced = true
      log(`hitl-answer: 前进 ← ${lb}（pager=${pg ? `${pg.cur}/${pg.total}` : '无'}）`)
      break
    }
    if (!advanced) { log(`hitl-answer: 第 ${step} 题后没找到前进按钮（${fwdTexts.join('/')}）——如实停止（已答 ${answered.length} 题）`); break }
    await page.waitForTimeout(1600)
    // 下一题判定：pager 前进（cur 变大）或新选项出现；二者都没有 → 检查是否已提交（卡头消）
    const pg2 = await pagerOf()
    const opts2 = await optionButtons().count()
    if (pg !== null && pg2 !== null && pg2.cur > pg.cur) continue // 翻页成功，进下一题
    if (pg === null && opts2 > 0) continue // 无 pager 卡的新选项（罕见形态）
    if (opts2 === 0 && !(await headerAlive())) { log('hitl-answer: 选项与卡头俱消——提交完成'); break }
    if (opts2 > 0 && (pg === null || (pg2 !== null && pg2.cur === pg.cur))) {
      // pager 没动但选项还在——前进可能没生效，再等一轮再验一次
      await page.waitForTimeout(2000)
      const pg3 = await pagerOf()
      if (pg3 !== null && pg !== null && pg3.cur > pg.cur) continue
      log('hitl-answer: ⚠ 前进后 pager 未动——如实报告（可能需要人工看卡）')
      break
    }
  }

  log(`hitl-answer: 共作答 ${answered.length} 题`)
  // 盘侧复核（2026-10-03 假绿教训：UI 判"完成"不算数——答完重读盘侧谓词，仍挂起即大声说）
  if (!DRY && answered.length > 0) {
    await page.waitForTimeout(2500)
    if (pendingSid !== null && wsGroup !== null && wsSessionsRoot !== null) {
      const s2 = runStateOf({ logPath: join(wsSessionsRoot, wsGroup, pendingSid, 'session.v4.jsonl.zstd'), wsRoot: join(ROOT, 'research-workspace') })
      if (s2.hitlPending === true) console.error('hitl-answer: ⚠ 盘侧复核：会话仍挂起——本次代答未真正提交，别信上面的"提交完成"！（重跑本脚本或人工入 GUI 答）')
      else log('hitl-answer: 盘侧复核通过——挂起已清')
    }
  }
  log('hitl-answer: 代理模拟记录（写进 bundle 的 question.md §Decisions 与 journal.md）——')
  for (const a of answered) log(`  Q${a.step}: ${a.prompt}\n     → ${a.selected}`)
} finally {
  await browser.close()
}
