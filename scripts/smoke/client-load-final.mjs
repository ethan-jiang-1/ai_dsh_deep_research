// client-load-final.mjs — client-load 冒烟的「终稿端到端」相位（smoke 层支援件）。
// 被谁消费：scripts/smoke/client-load-smoke.mjs（唯一消费方，静态 import 调用）。
//
// 为什么单列（2026-10-28 Phase C）：这条相位验证的是一条**独立的用户路径**（交付门 → 终稿页签 →
// 三态静音条 → 页脚与状态页的同源折叠块），与"渐进面/活动流"的断言没有共享状态——照 pass-4
// （client-load-config.mjs）的先例搬出主件，主件只留相位执行序。
//
// 环境的注入面 = 主件文件级 helper 与调用时刻的快照（boundSession / deliveredSessions）。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { latestRunVersion } from '../../packages/deep-research-pack/src/lib/run-fold.ts'
import { openSessionById } from '../lib/web-ui-nav.mjs'

/**
 * pass-5：终稿端到端（交付门、读者版/审计版切换、静音条、滚动口、两处同源折叠块）。
 * @param env - 主件注入的相位环境；`deliveredSessions` / `boundSession` 为调用时刻快照。
 */
export async function pass5FinalDeliveryPhase(env) {
  const { page, step, wait, skipped, paneTextOf, boundSession, deliveredSessions, fileFaceOf } = env
  // 打开「研究状态」页签（右栏可能收起/页签可能不在带上）——本相位自用的小助手。
  const openStatusTab = async () => {
    const expandBtn = page.getByRole('button', { name: 'Open right sidebar' })
    if (await expandBtn.count() > 0 && await expandBtn.first().isVisible().catch(() => false)) {
      await expandBtn.first().click({ timeout: 8_000 }).catch(() => {})
      await wait(1_500)
    }
    const capsuleVisible = async () => page.getByRole('button', { name: /研究状态/ }).first().isVisible().catch(() => false)
    const chip = page.getByRole('tab', { name: /研究状态/ }).first()
    if (await chip.isVisible().catch(() => false)) { await chip.click({ timeout: 5_000 }).catch(() => {}); return true }
    if (await capsuleVisible()) { await page.getByRole('button', { name: /研究状态/ }).first().click({ timeout: 5_000 }).catch(() => {}); return true }
    const addTab = page.getByRole('button', { name: /^(New tab|新标签页)$/ }).first()
    if (await addTab.isVisible().catch(() => false)) {
      await addTab.click({ timeout: 5_000 }).catch(() => {})
      await wait(1_500)
      if (await capsuleVisible()) { await page.getByRole('button', { name: /研究状态/ }).first().click({ timeout: 5_000 }).catch(() => {}); return true }
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
    const opened = (await openSessionById(page, candidate.sessionId, candidate.title)).found
    if (!opened) { trials.push({ ...candidate, opened: false, statusTab: false, door: false }); continue }
    await wait(4_000)
    const statusTab = await openStatusTab()
    if (!statusTab) { trials.push({ ...candidate, opened: true, statusTab: false, door: false }); continue }
    await wait(5_000)
    // 交付门来自 journal 流（present 事件），有界等待（≤15s）
    const door = page.getByRole('button', { name: /读终稿/ }).first()
    for (let i = 0; i < 5 && !doorFound; i++) {
      doorFound = await door.isVisible().catch(() => false)
      if (!doorFound) await wait(3_000)
    }
    trials.push({ ...candidate, opened: true, statusTab: true, door: doorFound })
    if (doorFound) { deliveredTarget = candidate; break }
  }
  if (deliveredTarget !== null && doorFound) {
    step(true, '交付目标会话可开且 ⑤ 交付门在场（present 见证）', `${deliveredTarget.title} → ${deliveredTarget.path}`)
    await page.getByRole('button', { name: /读终稿/ }).first().click({ timeout: 6_000 }).catch(() => {})
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
    const onFinalTab = tabTitles.some((t) => t.includes('终稿'))
    step(onFinalTab, '交付门点开 → 页签标题「终稿」（extension 带接管了文件地址）', `tabs=${JSON.stringify(tabTitles)}`)
    // 终稿页脚同款只读折叠块（与状态页 ⑤ 共用 src/lib/rerun-triage 文案）
    const triageFooter = page.getByText('还不满意？三种改法').first()
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
    if (readerName !== null) {
      const toggle = page.getByRole('button', { name: /看审计版|看读者版/ }).first()
      const toggleVisible = await toggle.isVisible().catch(() => false)
      step(toggleVisible, '终稿页签读者版/审计版切换在场', readerName)
    } else if (ledgerLatest >= 1) {
      const toggle = page.getByRole('button', { name: /看当前工作稿|看 v\d+（版本账）/ }).first()
      const toggleVisible = await toggle.isVisible().catch(() => false)
      step(toggleVisible, '终稿页签版本切换在场（版本账 / 当前工作稿）', toggleVisible ? `v${ledgerLatest}` : '缺切换按钮')
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
    // 状态页 ⑤ 同款折叠块（同一交付目标会话；与终稿页脚共用 src/lib/rerun-triage 文案）
    const statusChip = page.getByRole('tab', { name: /研究状态/ }).first()
    if (await statusChip.isVisible().catch(() => false)) {
      await statusChip.click({ timeout: 5_000 }).catch(() => {})
      // 切页签后等**显式内容**（状态页的停靠点/交付态）再判——固定读一次会读到终稿页旧 DOM。
      let statusPane = ''
      for (let i = 0; i < 8; i++) {
        statusPane = await paneTextOf(page)
        if (statusPane.includes('停靠点已过') || statusPane.includes('已交付')) break
        await wait(800)
      }
      // ⑤ 的折叠块只在「本会话 present 见证在窗内」时渲染（交付态=事件，不是 final 在场）。
      // 冷会话的 present 可能已滑出尾窗 → 如实 SKIP，不把"这窗口没交付态"记成渲染缺陷。
      if (!statusPane.includes('已交付')) {
        skipped.push('状态页 ⑤ 折叠块：交付目标会话的 present 不在尾窗（⑤ 无「已交付」）')
      } else {
        const statusFold = page.getByText('还不满意？三种改法').first()
        const statusFoldVisible = await statusFold.isVisible().catch(() => false)
        if (statusFoldVisible) await statusFold.click({ timeout: 3_000 }).catch(() => {})
        const statusText = statusFoldVisible ? await paneTextOf(page) : ''
        step(statusFoldVisible && statusText.includes('补研究') && statusText.includes('这份太浅'),
          '状态页 ⑤：已交付后的三种改法折叠块（与终稿页脚同源文案）', statusFoldVisible ? 'fold expanded' : '缺折叠块')
      }
    } else {
      skipped.push('状态页 ⑤ 折叠块：交付目标会话无研究状态 tab')
    }
  } else {
    // 前置未建立 ≠ 断言红：候选窗/时序不保证 UI 这一窗里有交付门。显式 SKIP 并让脚本
    // exit 2（未跑），不制造假红；trials 给下一跳排查面。
    skipped.push(`终稿端到端：无窗口内交付目标（${finalCandidates.length} 候选）`)
    console.log(`  SKIP 终稿端到端：无窗口内交付目标（${finalCandidates.length} 候选）`)
    if (trials.length > 0) console.log(`       trials=${JSON.stringify(trials)}`)
  }
}
