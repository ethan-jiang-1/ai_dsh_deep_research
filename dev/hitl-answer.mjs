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
// 用法：
//   node dev/hitl-answer.mjs --port 3081 --token <横幅 token> [--session <标题子串>]
//                            [--pick recommended|first|<1-based index>] [--custom <文本>]
//                            [--max-steps 8] [--dry-run]
// 行为：打开 web → 关测试须知模态 → 点开侧栏里"Waiting for answer"的会话 → 逐题作答
//       （默认选带 Recommended 的那一项）→ 走到最后一题提交 → 打印每题的选择。
// 注意：**必须**在 question.md §Decisions 与 journal.md 标注"代理模拟"——它替的是人，不是人。
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadChromium, launchChromium } from '../scripts/lib/playwright.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// 与 dev/run-kickoff.mjs 同形：name 自带 `--`（本仓约定，别在 helper 里再加一次）
const flag = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i === -1 ? fallback : process.argv[i + 1]
}
const has = (name) => process.argv.includes(name) // 同约定：name 自带 `--`

const PORT = flag('--port', '3081')
const TOKEN = flag('--token', null)
const SESSION = flag('--session', null) // 标题子串；缺省 = 侧栏里第一个 "Waiting for answer"
const PICK = flag('--pick', 'recommended') // recommended | first | <1-based index>
const CUSTOM = flag('--custom', null)
const MAX_STEPS = Number(flag('--max-steps', '8'))
const DRY = has('--dry-run')

if (!TOKEN) {
  console.error('缺 --token（web 横幅里的 token）')
  process.exit(2)
}
// 模式自报（2026-09-26 教训：`flag/has` 的 `--` 加了两遍 → `--dry-run` 判假，**"dry-run" 实际
// 执行了代答**。此后开局即打印模式，操作者一眼能看出它到底会不会点。）
console.log(`hitl-answer: 模式 = ${DRY ? 'dry-run（只看不点）' : '实答（会提交）'} · pick=${PICK} · session=${SESSION ?? '（侧栏第一个待答）'}`)

const answered = []
const log = (m) => console.log(m)

const chromium = await loadChromium(ROOT)
const browser = await launchChromium(chromium)
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
try {
  await page.goto(`http://127.0.0.1:${PORT}/?token=${TOKEN}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)

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

  // ① 点开侧栏里挂起问询的会话（左栏 x < 256，防中央区同名 class 抢匹配）
  const rows = page.locator('span[class*="_root_"]')
  const n = await rows.count()
  let opened = null
  for (let i = 0; i < Math.min(n, 80); i++) {
    const el = rows.nth(i)
    if (!(await el.isVisible().catch(() => false))) continue
    const box = await el.boundingBox().catch(() => null)
    if (box === null || box.x >= 256) continue
    const text = ((await el.textContent()) ?? '').trim()
    const match = SESSION !== null ? text.includes(SESSION) : text.includes('Waiting for answer')
    if (!match) continue
    await el.click({ timeout: 10_000 }).catch(() => {})
    opened = text.slice(0, 60)
    break
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

  // ② 逐题作答：每题选一项（默认 Recommended），再按 pager 前进
  const visible = async (loc) => loc.isVisible().catch(() => false)
  for (let step = 1; step <= MAX_STEPS; step++) {
    // 题干 = 卡片里 "Waiting for your action · <题干>" 的那一行
    const prompt = page.locator('text=/Waiting for your action/').first()
    const promptText = (await visible(prompt)) ? ((await prompt.textContent()) ?? '').replace(/\s+/g, ' ').trim() : '(未取到题干)'

    // 选项目标：recommended → 带 Recommended 的那一项；first → 第 1 项；数字 → 第 n 项
    const optionRows = page.locator('[class*="_option_"], label[class*="_option_"]')
    let target = null
    let targetLabel = null
    if (PICK === 'recommended') {
      const rec = page.locator('text=/Recommended/').first()
      if (await visible(rec)) {
        target = rec.locator('xpath=ancestor::*[self::label or self::button or contains(@class,"option")][1]')
        if (!(await visible(target))) target = rec
      }
    }
    if (target === null) {
      const idx = PICK === 'first' ? 0 : Math.max(0, Number(PICK) - 1)
      if (await optionRows.count() > idx) target = optionRows.nth(idx)
      else {
        const anyOpt = page.locator('text=/^(主张验证|探索性全景|快速事实核查|标准报告|简报|深度报告)$/').first()
        if (await visible(anyOpt)) target = anyOpt
      }
    }
    if (target === null || !(await visible(target))) {
      log(`hitl-answer: 第 ${step} 题没找到可点选项——停在此处（已答 ${answered.length} 题）`)
      break
    }
    targetLabel = ((await target.textContent()) ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
    if (DRY) { log(`[dry-run] 第 ${step} 题将选：${targetLabel}`); break }
    await target.click({ timeout: 8_000 }).catch(() => {})
    await page.waitForTimeout(400)
    if (CUSTOM !== null) {
      const box = page.locator('textarea, input[type="text"]').first()
      if (await visible(box)) { await box.fill(CUSTOM).catch(() => {}); await page.waitForTimeout(200) }
    }
    answered.push({ step, prompt: promptText.slice(0, 140), selected: targetLabel })
    log(`hitl-answer: 第 ${step} 题 ← ${targetLabel}`)

    // 前进：优先 Submit/提交/完成，其次 Next，最后 Done
    let advanced = false
    for (const label of ['Submit', '提交', 'Done', '完成', 'Next', '下一步']) {
      const b = page.locator(`button:has-text("${label}")`).first()
      if (await visible(b)) { await b.click({ timeout: 8_000 }).catch(() => {}); advanced = true; break }
    }
    if (!advanced) { log(`hitl-answer: 第 ${step} 题后没找到前进按钮——可能已是末题且已提交`); break }
    await page.waitForTimeout(1500)
    // 卡片消失 = 提交完成
    if (!(await visible(page.locator('text=/Waiting for your action/').first()))) { log('hitl-answer: 问询卡片已消失（提交完成）'); break }
  }

  log(`hitl-answer: 共作答 ${answered.length} 题`)
  log('hitl-answer: 代理模拟记录（写进 bundle 的 question.md §Decisions 与 journal.md）——')
  for (const a of answered) log(`  Q${a.step}: ${a.prompt}\n     → ${a.selected}`)
} finally {
  await browser.close()
}
