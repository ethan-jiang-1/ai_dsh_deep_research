// client-load-final.support.mjs — client-load 冒烟的「终稿端到端」相位（smoke 层支援件）。
// 被谁消费：checks/smoke/client-load.entry.mjs（唯一消费方，静态 import 调用）。
//
// 为什么单列（2026-10-28 Phase C）：这条相位验证的是一条**独立的用户路径**（交付门 → 终稿页签 →
// 三态静音条 → 页脚与状态页的同源折叠块），与"渐进面/活动流"的断言没有共享状态——照 pass-4
// （client-load-config.support.mjs）的先例搬出主件，主件只留相位执行序。
//
// 环境的注入面 = 主件文件级 helper 与调用时刻的快照（boundSession / deliveredSessions）。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { finalReadPlan, finalTargetOf } from '../../packages/deep-research-pack/src/lib/run/final-target.ts'
import { latestRunVersion } from '../../packages/deep-research-pack/src/lib/run/run-fold.ts'
import { openSessionById, TAB_TEXT } from '../lib/shared/web-ui-nav.mjs'

/**
 * pass-5：终稿端到端（交付门、读者版/审计版切换、静音条、滚动口、两处同源折叠块）。
 * @param env - 主件注入的相位环境；`deliveredSessions` / `boundSession` 为调用时刻快照。
 */
export async function pass5FinalDeliveryPhase(env) {
  const { page, step, wait, skipped, paneTextOf, boundSession, deliveredSessions, fileFaceOf } = env
  // 打开「研究状态」页签（右栏可能收起/页签可能不在带上）——本相位自用的小助手。
  const openStatusTab = async () => {
    const expandBtn = page.getByRole('button', { name: /Open right sidebar|打开右侧边栏/i })
    if (await expandBtn.count() > 0 && await expandBtn.first().isVisible().catch(() => false)) {
      await expandBtn.first().click({ timeout: 8_000 }).catch(() => {})
      await wait(1_500)
    }
    const capsuleVisible = async () => page.getByRole('button', { name: TAB_TEXT.status }).first().isVisible().catch(() => false)
    const chip = page.getByRole('tab', { name: TAB_TEXT.status }).first()
    if (await chip.isVisible().catch(() => false)) { await chip.click({ timeout: 5_000 }).catch(() => {}); return true }
    if (await capsuleVisible()) { await page.getByRole('button', { name: TAB_TEXT.status }).first().click({ timeout: 5_000 }).catch(() => {}); return true }
    const addTab = page.getByRole('button', { name: /^(New tab|新标签页)$/ }).first()
    if (await addTab.isVisible().catch(() => false)) {
      await addTab.click({ timeout: 5_000 }).catch(() => {})
      await wait(1_500)
      if (await capsuleVisible()) { await page.getByRole('button', { name: TAB_TEXT.status }).first().click({ timeout: 5_000 }).catch(() => {}); return true }
    }
    return false
  }

  // 终稿端到端：优先主渐进面绑定的已交付会话（同一窗、已在手），再退冷会话候选。
  // 旧实现只扫冷会话；盘侧窗口与 UI 窗不等时把"没找到目标"判成硬红（审计 P0-4）。
  const finalCandidates = []
  const boundFace = boundSession !== null ? fileFaceOf(boundSession.slug) : null
  if (boundFace?.delivered === true && boundSession !== null) {
    finalCandidates.push({ sessionId: boundSession.sessionId, title: boundSession.title, slug: boundSession.slug, source: 'bound' })
  }
  for (const c of deliveredSessions) {
    if (!finalCandidates.some((x) => x.sessionId === c.sessionId)) finalCandidates.push({ ...c, source: 'cold' })
  }
  const trials = []
  let deliveredTarget = null
  let doorFound = false
  for (const candidate of finalCandidates) {
    // 点击后复核（2026-11-03）：opened:false = 行点了但主视图没切；旧实现只读 found 会把
    // "没打开"当"打开成功"，后续门/页签断言按错会话判。
    const nav = await openSessionById(page, candidate.sessionId, candidate.title)
    const opened = nav.found === true && nav.opened !== false
    if (!opened) { trials.push({ ...candidate, opened: false, reason: nav.reason ?? null, statusTab: false, door: false }); continue }
    await wait(4_000)
    const statusTab = await openStatusTab()
    if (!statusTab) { trials.push({ ...candidate, opened: true, statusTab: false, door: false }); continue }
    await wait(5_000)
    // 交付门来自 journal 流（present 事件），有界等待（≤15s）
    const door = page.getByRole('button', { name: /读终稿|Open final/ }).first()
    for (let i = 0; i < 5 && !doorFound; i++) {
      doorFound = await door.isVisible().catch(() => false)
      if (!doorFound) await wait(3_000)
    }
    trials.push({ ...candidate, opened: true, statusTab: true, door: doorFound })
    if (doorFound) { deliveredTarget = candidate; break }
  }
  if (deliveredTarget !== null && doorFound) {
    step(true, '交付目标会话可开且 ⑤ 交付门在场（present 见证）', `${deliveredTarget.title} → ${deliveredTarget.path}`)
    await page.getByRole('button', { name: /读终稿|Open final/ }).first().click({ timeout: 6_000 }).catch(() => {})
    await wait(4_000)
    const finalText = await paneTextOf(page)
    const base = fileFaceOf(deliveredTarget.slug)?.base ?? null
    // 终稿页签默认看**版本账最高版**（final/vN）；没有版本账才回落到 final.md 工作稿。
    // 首标题对账必须跟着默认视图走，不能拿 final.md 硬比（rerun 后它是更新的工作稿）。
    const ledgerNames = typeof base === 'string' && existsSync(join(base, 'final'))
      ? readdirSync(join(base, 'final')).filter((name) => name.endsWith('.md'))
      : []
    const ledgerLatest = latestRunVersion(ledgerNames)
    // 默认视图：有读者版先看读者版（`readable-vN.md` 同版，或 HITL2 前的 `readable.md`）；
    // 否则看最高 `final/vN`；再否则回落 `final.md`。首标题对账跟着默认视图走。
    const readerName = ledgerLatest >= 1 && ledgerNames.includes(`readable-v${String(ledgerLatest)}.md`)
      ? `readable-v${String(ledgerLatest)}.md`
      : ledgerNames.includes('readable.md') ? 'readable.md' : null
    const defaultViewPath = typeof base === 'string'
      ? (readerName !== null
        ? join(base, 'final', readerName)
        : ledgerLatest >= 1 ? join(base, 'final', `v${String(ledgerLatest)}.md`) : join(base, 'final.md'))
      : null
    const finalBody = defaultViewPath !== null && existsSync(defaultViewPath) ? readFileSync(defaultViewPath, 'utf8') : ''
    // 首标题对账：两侧都剥掉 markdown 记号再比（H1 里的 `code` / **强调** 渲染后不留记号，
    // 拿原文直比会把"渲染正确"判成红——2026-10-20 实测）。
    const normalize = (text) => text.replace(/[\s*`#>_[\]()|\-—–:：]/g, '')
    const heading = normalize((finalBody.split('\n').find((l) => l.trim().startsWith('#')) ?? '').replace(/^#+\s*/, '')).slice(0, 12)
    const tabTitles = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map((n) => (n.textContent ?? '').trim()))
    const onFinalTab = tabTitles.some((t) => TAB_TEXT.final.test(t))
    step(onFinalTab, '交付门点开 → 页签标题「终稿」（extension 带接管了文件地址）', `tabs=${JSON.stringify(tabTitles)}`)
    // 终稿页脚同款只读折叠块（与状态页 ⑤ 共用 src/lib/rerun-triage 文案）
    const triageFooter = page.getByText(/还不满意？三种改法|Not satisfied\? Three ways to change it/).first()
    const footerVisible = await triageFooter.isVisible().catch(() => false)
    if (footerVisible) await triageFooter.click({ timeout: 3_000 }).catch(() => {})
    const footerText = footerVisible ? await paneTextOf(page) : ''
    step(footerVisible && footerText.includes('补研究') && footerText.includes('这份太浅'),
      '终稿页脚：三种改法折叠块在场（与状态页同源文案）', footerVisible ? 'fold expanded' : '缺折叠块')
    step(heading !== '' && normalize(finalText).includes(heading), '终稿页签渲染默认正文（读者版优先；与盘侧首标题对账）', heading)
    // 静音条断言必须读**静音条元素**：整页 innerText 会被聊天里的「当前版报告」误命中
    // （2026-10-20 实测：扫全页把"当前版"当成了静音条命中，产品其实显示 v1）。
    const stripText = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim().startsWith('过程'))
      return btn === undefined ? '' : (btn.parentElement?.innerText ?? '').replace(/\s+/g, ' ').trim()
    })
    const stripState = /审查未过|当前版|读者版|审计版|\bv\d+\b/.test(stripText)
    const finalPlan = typeof deliveredTarget.path === 'string' ? finalReadPlan(deliveredTarget.path) : null
    const targetFallback = finalPlan !== null ? (finalTargetOf(finalPlan, ledgerNames)?.fallback ?? false) : false
    if (readerName !== null) {
      const stripToggle = page.getByRole('button', { name: /看审计版|看读者版|View audit edition|View reader edition/ }).first()
      const segTab = page.getByRole('tab', { name: /读者版|审计版|Reader|Audit/ }).first()
      const toggleVisible = (await stripToggle.isVisible().catch(() => false)) || (await segTab.isVisible().catch(() => false))
      step(toggleVisible, '终稿页签读者版/审计版切换在场', readerName)
    } else if (ledgerLatest >= 1 && targetFallback) {
      const toggle = page.getByRole('button', { name: /看当前工作稿|看 v\d+（版本账）|View current draft|View v\d+ \(ledger\)/ }).first()
      const toggleVisible = await toggle.isVisible().catch(() => false)
      step(toggleVisible, '终稿页签版本切换在场（版本账 / 当前工作稿）', toggleVisible ? `v${ledgerLatest}` : '缺切换按钮')
    } else if (ledgerLatest >= 1) {
      const auditTab = page.getByRole('tab', { name: /审计版|Audit/ }).first()
      const claimsTab = page.getByRole('tab', { name: /核查清单|Claims/ }).first()
      const segVisible = (await auditTab.isVisible().catch(() => false)) && (await claimsTab.isVisible().catch(() => false))
      step(segVisible, '终稿页签分段控制器在场（点名版本账 vN + 审计/核查视图）', segVisible ? `v${ledgerLatest}` : '缺分段控制器')
    }
    step(stripState, '终稿静音条三态之一在场（盘上事实，不编造）',
      stripState ? stripText.slice(0, 40) : `静音条=${JSON.stringify(stripText)}`)
    step(!/drt_[^\s]+\/(question|topics|evidence|drafts)/.test(finalText), '终稿页签不泄漏中间过程路径（负例）')
    // 页签自带的滚动口（2026-10-20 用户实测报障：vendor `.tabBody` 是 overflow:hidden 的定高
    // flex 列，页签不自己开滚动口 → 长正文被裁且滚不动）。断言 = 正文容器可溢出且 scrollTop 能动。
    const scrollProbe = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim().startsWith('过程'))
      const root = btn?.parentElement?.parentElement
      if (root == null) return { ok: false, why: 'no root' }
      const scroller = [...root.children].find((c) => getComputedStyle(c).overflowY === 'auto')
      if (scroller == null) return { ok: false, why: 'no scroller' }
      const overflows = scroller.scrollHeight > scroller.clientHeight + 4
      scroller.scrollTop = 240
      return { ok: overflows && scroller.scrollTop > 0, why: `sh=${scroller.scrollHeight} ch=${scroller.clientHeight} top=${scroller.scrollTop}` }
    })
    step(scrollProbe.ok, '终稿页签自带滚动口（长正文可滚、不被裁）', scrollProbe.why)
    // R2.1 合一工具栏 + 全屏三栏精读台（Sticky TOC + 正文 + 右侧对照栏）
    const singleToolbar = await page.locator('[data-testid="final-toolbar"]').first().isVisible().catch(() => false)
    step(singleToolbar, 'R2.1 终稿页签渲染单条合一工具栏')
    const fsToggle = page.locator('[data-testid="final-fullscreen-toggle"]').first()
    if (await fsToggle.isVisible().catch(() => false)) {
      await fsToggle.click({ timeout: 5_000 }).catch(() => {})
      await wait(800)
      const studioState = await page.evaluate(() => ({
        layout: document.querySelector('[data-final-layout]')?.getAttribute('data-final-layout') ?? null,
        hasToc: document.querySelector('[data-testid="final-studio-toc"]') !== null,
        hasInspector: document.querySelector('[data-testid="final-studio-inspector"]') !== null,
      }))
      step(studioState.layout === 'studio' && studioState.hasInspector,
        'R2.1 终稿全屏自动展开三栏精读台（Sticky TOC + 对照栏）',
        JSON.stringify(studioState))
      await fsToggle.click({ timeout: 5_000 }).catch(() => {})
      await wait(600)
    }
    // 证据引用悬停预览（150ms）与点开分屏（M4 + R2.1）：
    const evBtn = page.locator('button[title*="evidence/"]').first()
    if (await evBtn.isVisible().catch(() => false)) {
      await evBtn.hover({ timeout: 5_000 }).catch(() => {})
      let hoverVisible = false
      for (let i = 0; i < 6 && !hoverVisible; i++) {
        await wait(150)
        hoverVisible = await page.locator('[data-testid="citation-hover-card"]').first().isVisible().catch(() => false)
      }
      step(hoverVisible, 'R2.1 行内证据引用 150ms 悬停弹出溯源预览卡')
      await evBtn.click({ timeout: 5_000 }).catch(() => {})
      let evTabOk = false
      for (let i = 0; i < 10 && !evTabOk; i++) {
        const tabsNow = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map((n) => (n.textContent ?? '').trim()))
        evTabOk = tabsNow.some((t) => /^(证据卡|Evidence Card)$/.test(t))
        if (!evTabOk) await wait(500)
      }
      step(evTabOk, '终稿引用点击 → 右栏分屏打开「证据卡」页签')
    } else {
      skipped.push('终稿引用分屏：当前终稿无 evidence/ 引用按钮')
    }
    // R2.2 Composer 原生 `/` 研究命令菜单实证（`/lens` 由 ctx.commandUi 注册）
    const composer = page.locator('[contenteditable="true"], textarea').first()
    if (await composer.isVisible().catch(() => false)) {
      await composer.click({ timeout: 4_000 }).catch(() => {})
      await page.keyboard.type('/lens')
      await wait(800)
      const menuHit = await page.evaluate(() => /研究透镜|Research lens/i.test(document.body.innerText))
      step(menuHit, 'R2.2 Composer 键入 /lens 唤出原生 DSH 斜杠命令菜单')
      await page.keyboard.press('Escape').catch(() => {})
      await page.keyboard.press('Meta+A').catch(() => {})
      await page.keyboard.press('Backspace').catch(() => {})
    }
    // 状态页 Focus Hero：已交付后聚焦「读终稿」主 CTA，不再重复渲染三种改法折叠块（统一收口在终稿页尾）
    const statusChip = page.getByRole('tab', { name: TAB_TEXT.status }).first()
    if (await statusChip.isVisible().catch(() => false)) {
      await statusChip.click({ timeout: 5_000 }).catch(() => {})
      let statusPane = ''
      for (let i = 0; i < 8; i++) {
        statusPane = await paneTextOf(page)
        if (statusPane.includes('停靠点已过') || statusPane.includes('已交付')) break
        await wait(800)
      }
      if (!statusPane.includes('已交付')) {
        skipped.push('状态页焦点卡：交付目标会话的 present 不在尾窗（无「已交付」）')
      } else {
        let heroBtnVisible = false
        for (let waited = 0; waited < 6_000 && !heroBtnVisible; waited += 400) {
          heroBtnVisible = await page.locator('[data-testid="status-hero-open-final"]').first().isVisible().catch(() => false)
          if (!heroBtnVisible) await wait(400)
        }
        const dupTriage = await page.locator('[data-research-face]').getByText(/还不满意？三种改法|Not satisfied\? Three ways to change it/).count().catch(() => 0)
        step(heroBtnVisible && dupTriage === 0,
          '状态页焦点卡：已交付显示主 CTA 且无重复三种改法（统一收口在终稿页尾）',
          `heroBtn=${heroBtnVisible} dupTriage=${dupTriage}`)
      }
    } else {
      skipped.push('状态页焦点卡：交付目标会话无研究状态 tab')
    }
  } else {
    // 前置未建立 ≠ 断言红：候选窗/时序不保证 UI 这一窗里有交付门。显式 SKIP 并让脚本
    // exit 2（未跑），不制造假红；trials 给下一跳排查面。
    skipped.push(`终稿端到端：无窗口内交付目标（${finalCandidates.length} 候选）`)
    console.log(`  SKIP 终稿端到端：无窗口内交付目标（${finalCandidates.length} 候选）`)
    if (trials.length > 0) console.log(`       trials=${JSON.stringify(trials)}`)
  }
}
