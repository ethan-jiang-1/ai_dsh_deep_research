// final-studio-sub.spec.mjs — research-final 子模块（CitationHoverLayer / useEvidencePreview / FinalToc）直测回归（BUG-472 / BUG-473）。
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from '../../client-dom-helpers.mjs'

const { CitationHoverLayer } = await import('../../../../packages/deep-research-pack/src/client/research-final/CitationHoverLayer.tsx')
const { FinalToc } = await import('../../../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx')
const { useEvidencePreview } = await import('../../../../packages/deep-research-pack/src/client/research-final/useEvidencePreview.ts')

const { render, fireEvent, cleanup, act } = await loadRtl()
const tZh = makeTranslator(zh)

afterEach(() => {
  cleanup()
})

// 负例留证 2026-11-28：BUG-472——CitationHoverLayer 滚动不收起、点击 onOpenSplit 不收起、docKey 切换不收起、
// 卡片高度硬编码 210 导致高卡贴底压住原链接或溢出视口，且缺少 role="region" 与键盘焦点续留。
// 红配方：去掉 scroll/onOpenSplit 收起或把 useLayoutEffect 实测改回硬编码 210 → 本例红。
test('BUG-472 CitationHoverLayer：滚动/分屏打开/切文档即时收起，高卡贴底向上翻转不遮挡链接且支持焦点续留', async () => {
  const summary = {
    cardName: 'e1.md',
    title: '长摘录证据卡',
    quality: 'A',
    sourceTier: 'primary',
    sourceUrl: 'https://example.org/doc',
    publisher: 'example.org',
    lens: 'official',
    retrievedAt: '2026-11-28',
    excerptLines: ['摘录一', '摘录二', '摘录三'],
  }
  const host = document.createElement('div')
  const citeBtn = document.createElement('button')
  citeBtn.type = 'button'
  citeBtn.setAttribute('title', 'evidence/e1.md')
  citeBtn.textContent = 'e1'
  citeBtn.getBoundingClientRect = () => ({ left: 80, top: 620, bottom: 640, right: 140, width: 60, height: 20, x: 80, y: 620, toJSON: () => ({}) })
  host.appendChild(citeBtn)
  document.body.appendChild(host)

  const prevHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return this.getAttribute?.('data-testid') === 'citation-hover-card' ? 320 : 0
    },
  })

  try {
    const openedSplit = []
    const makeLayer = (docKey) => createElement(CitationHoverLayer, {
      containerEl: host,
      docKey,
      loadPreview: async () => ({ state: 'ok', summary }),
      getCached: () => ({ state: 'ok', summary }),
      onOpenSplit: (rel) => { openedSplit.push(rel) },
      t: tZh,
    })

    const { rerender } = render(makeLayer('final/v1.md'))
    fireEvent.pointerOver(citeBtn, { bubbles: true })
    await act(async () => { await new Promise((r) => setTimeout(r, 200)) })

    const card = document.querySelector('[data-testid="citation-hover-card"]')
    assert.ok(card !== null, '悬停后应弹出预览卡')
    assert.equal(card.getAttribute('role'), 'region', '悬停卡应使用 role="region" 支持无障碍与焦点进入')
    const topPx = Number.parseFloat(card.style.top)
    assert.ok(topPx + 320 <= 620, `高卡片底边(${topPx + 320})不得压住触发链接顶部(620)`)
    assert.ok(topPx >= 12, `高卡片顶边(${topPx})不得超出视口上边距`)

    fireEvent.focusOut(citeBtn, { bubbles: true })
    const splitBtn = card.querySelector('[data-testid="citation-hover-open-split"]')
    assert.ok(splitBtn !== null)
    fireEvent.focus(splitBtn)
    await act(async () => { await new Promise((r) => setTimeout(r, 180)) })
    assert.ok(document.querySelector('[data-testid="citation-hover-card"]') !== null, '焦点移入卡片后不应自动关闭')

    fireEvent.click(splitBtn)
    assert.deepEqual(openedSplit, ['evidence/e1.md'])
    assert.equal(document.querySelector('[data-testid="citation-hover-card"]'), null, '点击 onOpenSplit 后卡片必须立即收起')

    fireEvent.pointerOver(citeBtn, { bubbles: true })
    await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
    assert.ok(document.querySelector('[data-testid="citation-hover-card"]') !== null)
    fireEvent.scroll(host)
    assert.equal(document.querySelector('[data-testid="citation-hover-card"]'), null, '滚动正文容器必须立即收起卡片')

    fireEvent.pointerOver(citeBtn, { bubbles: true })
    await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
    assert.ok(document.querySelector('[data-testid="citation-hover-card"]') !== null)
    rerender(makeLayer('final/readable-v1.md'))
    await flushUi(act)
    assert.equal(document.querySelector('[data-testid="citation-hover-card"]'), null, 'docKey 切换文档必须立即收起卡片')
  } finally {
    if (prevHeight !== undefined) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', prevHeight)
    else delete HTMLElement.prototype.offsetHeight
    host.remove()
  }
})

// 负例留证 2026-11-28：BUG-473——useEvidencePreview 切换 sessionId 后旧会话在途请求写入新会话缓存；
// FinalToc 滚到底部末节不高亮。
// 红配方：去掉 sessionEpochRef 或去掉 FinalToc atBottom 判据 → 本例红。
test('BUG-473 useEvidencePreview / FinalToc：跨会话不污染缓存，滚到底部高亮末节', async () => {
  let releaseOldSession
  const oldRun = makeMaliciousRunSource({
    tree: { drt_x: { evidence: { 'e1.md': '---\nquality: C\n---\n# 旧会话证据\n旧正文。\n' } } },
  })
  const newRun = makeMaliciousRunSource({
    tree: { drt_x: { evidence: { 'e1.md': '---\nquality: A\n---\n# 新会话证据\n新正文。\n' } } },
  })
  const sources = {
    'sess-old': {
      ...oldRun.source,
      read: async (p, o) => {
        await new Promise((r) => { releaseOldSession = r })
        return oldRun.source.read(p, o)
      },
    },
    'sess-new': newRun.source,
  }
  let api
  function Harness({ sid }) {
    api = useEvidencePreview({
      sessionId: sid,
      getBundleDir: () => 'drt_x',
      runSource: (id) => sources[id],
    })
    return null
  }
  const hookView = render(createElement(Harness, { sid: 'sess-old' }))
  const oldPromise = api.loadPreview('evidence/e1.md')
  hookView.rerender(createElement(Harness, { sid: 'sess-new' }))
  await flushUi(act)
  releaseOldSession()
  await oldPromise
  assert.equal(api.getCached('evidence/e1.md'), undefined, '旧会话在途请求完成后不得污染新会话缓存')
  const fresh = await api.loadPreview('evidence/e1.md')
  assert.equal(fresh.state, 'ok')
  assert.equal(fresh.summary.title, '新会话证据')
  cleanup()

  const scroller = document.createElement('div')
  scroller.getBoundingClientRect = () => ({ top: 0, bottom: 300, left: 0, right: 500, width: 500, height: 300, x: 0, y: 0, toJSON: () => ({}) })
  const h1 = document.createElement('h1'); h1.textContent = '标题一'
  h1.getBoundingClientRect = () => ({ top: -180, bottom: -150, left: 0, right: 500, width: 500, height: 30, x: 0, y: -180, toJSON: () => ({}) })
  const h2 = document.createElement('h2'); h2.textContent = '末节标题'
  h2.getBoundingClientRect = () => ({ top: 160, bottom: 190, left: 0, right: 500, width: 500, height: 30, x: 0, y: 160, toJSON: () => ({}) })
  scroller.appendChild(h1)
  scroller.appendChild(h2)
  Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 600 })
  Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 300 })
  Object.defineProperty(scroller, 'scrollTop', { configurable: true, writable: true, value: 300 })
  document.body.appendChild(scroller)

  try {
    const tocView = render(createElement(FinalToc, {
      markdown: '# 标题一\n\n## 末节标题\n',
      bodyEl: scroller,
      mode: 'sticky',
      t: tZh,
    }))
    await flushUi(act)
    const buttons = [...tocView.container.querySelectorAll('button')]
    assert.equal(buttons.length, 2)
    assert.equal(buttons[1]?.getAttribute('data-toc-active'), 'true', '滚动到底部时应高亮最后一个可见章节')
  } finally {
    scroller.remove()
  }
})
