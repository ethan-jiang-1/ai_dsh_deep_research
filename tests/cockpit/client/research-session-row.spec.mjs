// research-session-row.spec.mjs — 左栏会话行研究状态标、悬停摘要、菜单项与 HeroOptions 渲染回归。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { loadRtl, makeTranslator } from '../client-dom-helpers.mjs'
import { zh, en } from '../../../packages/deep-research-pack/src/client/locales.ts'
import {
  ResearchSessionHover,
  ResearchSessionLeading,
  ResearchSessionOpenFinalMenuItem,
} from '../../../packages/deep-research-pack/src/client/ResearchSessionRow.tsx'
import { HeroResearchOptions } from '../../../packages/deep-research-pack/src/client/HeroResearchOptions.tsx'

const tZh = makeTranslator(zh)
const tEn = makeTranslator(en)

function makeSessionsHook(projectionById) {
  const state = {
    ids: Object.keys(projectionById),
    byId: Object.fromEntries(Object.entries(projectionById).map(([id, p]) => [id, { id, projectionValues: p ? { researchRun: p } : undefined }])),
    projectionsBySession: {},
  }
  return (selector) => selector(state)
}

test('ResearchSessionLeading：非研究/idle 零渲染，hitl_pending / running / delivered 渲染对应状态与无障碍文案', async () => {
  const rtl = await loadRtl()
  const useSessions = makeSessionsHook({
    sIdle: { schemaVersion: 1, slug: null, phase: 'idle', hitlKind: null, deliveredPath: null, updatedAt: 1 },
    sHitl: { schemaVersion: 1, slug: 'ai-chip', phase: 'hitl_pending', hitlKind: 'hitl1', deliveredPath: null, updatedAt: 2 },
    sDeliv: { schemaVersion: 1, slug: 'un-sc', phase: 'delivered', hitlKind: null, deliveredPath: 'drt_un-sc/final/readable-v1.md', updatedAt: 3 },
  })
  try {
    const rIdle = rtl.render(createElement(ResearchSessionLeading, { sessionId: 'sIdle', useSessions, t: tZh }))
    assert.equal(rIdle.container.innerHTML, '', 'idle 会话不得渲染任何指示器')
    rIdle.unmount()

    const rHitl = rtl.render(createElement(ResearchSessionLeading, { sessionId: 'sHitl', useSessions, t: tZh }))
    const mark = rHitl.container.querySelector('[data-research-row-phase="hitl_pending"]')
    assert.ok(mark, 'HITL 挂起必须渲染 hitl_pending 状态标')
    assert.match(mark.textContent ?? '', /立项待你拍板/)
    assert.match(mark.textContent ?? '', /drt_ai-chip/)
    rHitl.unmount()

    const rDeliv = rtl.render(createElement(ResearchSessionLeading, { sessionId: 'sDeliv', useSessions, t: tEn }))
    const markEn = rDeliv.container.querySelector('[data-research-row-phase="delivered"]')
    assert.ok(markEn, '已交付必须渲染 delivered 状态标')
    assert.match(markEn.textContent ?? '', /Report delivered/)
  } finally {
    rtl.cleanup()
  }
})

test('ResearchSessionHover 与 ResearchSessionOpenFinalMenuItem：展示 slug/阶段并在已交付会话执行打开终稿', async () => {
  const rtl = await loadRtl()
  const useSessions = makeSessionsHook({
    sDeliv: { schemaVersion: 1, slug: 'un-sc', phase: 'delivered', hitlKind: null, deliveredPath: 'drt_un-sc/final/readable-v1.md', updatedAt: 3 },
    sRun: { schemaVersion: 1, slug: 'active-run', phase: 'running', hitlKind: null, deliveredPath: null, updatedAt: 2 },
  })
  try {
    const rHover = rtl.render(createElement(ResearchSessionHover, { sessionId: 'sDeliv', useSessions, t: tZh }))
    assert.match(rHover.container.textContent ?? '', /drt_un-sc/)
    assert.match(rHover.container.textContent ?? '', /研究已交付/)
    rHover.unmount()

    let closed = false
    const opened = []
    const rMenuRun = rtl.render(createElement(ResearchSessionOpenFinalMenuItem, {
      sessionId: 'sRun',
      displayTitle: 'Active',
      useSessions,
      useMenuOpenState: () => [true, () => { closed = true }],
      openSessionFinal: (sid, p) => { opened.push([sid, p]) },
      t: tZh,
    }))
    assert.equal(rMenuRun.container.innerHTML, '', '未交付会话菜单不得显示打开终稿')
    rMenuRun.unmount()

    const rMenuDeliv = rtl.render(createElement(ResearchSessionOpenFinalMenuItem, {
      sessionId: 'sDeliv',
      displayTitle: 'Delivered',
      useSessions,
      useMenuOpenState: () => [true, () => { closed = true }],
      openSessionFinal: (sid, p) => { opened.push([sid, p]) },
      t: tZh,
    }))
    const btn = rMenuDeliv.container.querySelector('[role="menuitem"]')
    assert.ok(btn, '已交付会话必须显示打开研究终稿菜单项')
    assert.match(btn.textContent ?? '', /打开研究终稿/)
    rtl.fireEvent.click(btn)
    assert.equal(closed, true, '点击后必须关闭行菜单')
    assert.deepEqual(opened, [['sDeliv', 'drt_un-sc/final/readable-v1.md']])
  } finally {
    rtl.cleanup()
  }
})

test('HeroResearchOptions：三枚快捷胶囊分别直达方法库 / 透镜 / 工作台', async () => {
  const rtl = await loadRtl()
  const opened = []
  try {
    const { container } = rtl.render(createElement(HeroResearchOptions, {
      openHubTab: (tab) => { opened.push(tab) },
      t: tZh,
    }))
    rtl.fireEvent.click(container.querySelector('[data-testid="hero-opt-methods"]'))
    rtl.fireEvent.click(container.querySelector('[data-testid="hero-opt-lenses"]'))
    rtl.fireEvent.click(container.querySelector('[data-testid="hero-opt-hub"]'))
    assert.deepEqual(opened, ['methods', 'lenses', 'runs'])
  } finally {
    rtl.cleanup()
  }
})
