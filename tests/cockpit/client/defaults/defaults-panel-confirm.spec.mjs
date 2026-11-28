// 「项目默认」面板的局部确认态必须跟随会话切换复位（BUG-399）。
//
// 病症：在会话 A 点「清除本项目默认」让按钮进入二次确认（confirmClear=true）后切到会话 B——
// 按钮仍停在「再点一次确认」，于是 B 里第一次点击就**直接清空 B 的研究默认**。
//
// 负例留证 2026-11-23：BUG-399——删掉 `useEffect(() => setConfirmClear(false), [sessionId])`
// → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { loadRtl, makeTranslator } from '../../client-dom-helpers.mjs'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { createDefaultsStore } from '../../../../packages/deep-research-pack/src/client/defaults/store.ts'
import { DefaultsPanel } from '../../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const t = makeTranslator(zh)

function makeStore(sent) {
  return createDefaultsStore({
    readText: async (sid) => JSON.stringify({ schema: 1, revision: 1, effort: sid === 's1' ? 'quick' : 'deep' }),
    readLibrary: async () => ({ kind: 'absent', path: 'method-library.md' }),
    listDir: async () => [],
    execute: async (sid, line) => {
      sent.push({ sid, line })
      return { ok: true, value: { result: { kind: 'success', text: 'ok revision=2' } } }
    },
  })
}

test('BUG-399 切会话复位二次确认：s2 首次点击仍只是上膛，不得直接 clear', async () => {
  const rtl = await loadRtl()
  const sent = []
  const store = makeStore(sent)
  const { container, rerender } = rtl.render(createElement(DefaultsPanel, { sessionId: 's1', store, t }))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=defaults-depth]')?.value !== 'quick') throw new Error('wait s1')
    })
    const clearBtn = container.querySelector('[data-testid=defaults-clear]')
    rtl.fireEvent.click(clearBtn)
    assert.equal(clearBtn.textContent, t('defaultsClearConfirm'), '第一次点击后应进入确认态（前置）')

    rerender(createElement(DefaultsPanel, { sessionId: 's2', store, t }))
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=defaults-depth]')?.value !== 'deep') throw new Error('wait s2')
    })
    assert.equal(clearBtn.textContent, t('defaultsClear'), '切会话后确认态必须复位')
    assert.deepEqual(sent, [], '复位前不得发出任何 clear 指令')

    rtl.fireEvent.click(clearBtn)
    assert.equal(clearBtn.textContent, t('defaultsClearConfirm'), 's2 首次点击只上膛')
    assert.deepEqual(sent, [], 's2 首次点击不得直接清空研究默认')
    rtl.fireEvent.click(clearBtn)
    await rtl.waitFor(() => { if (sent.length === 0) throw new Error('wait clear') })
    assert.equal(sent.length, 1, '第二次点击才真正 clear')
    assert.equal(sent[0].sid, 's2')
    assert.match(sent[0].line, /clear/)
  } finally {
    rtl.cleanup()
  }
})

test('SelectMenu：点击深度控件打开 DSH Menu 并在选中项后触发 setPatch', async () => {
  const rtl = await loadRtl()
  const sent = []
  const store = makeStore(sent)
  const { container } = rtl.render(createElement(DefaultsPanel, { sessionId: 's1', store, t }))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=defaults-depth]')?.value !== 'quick') throw new Error('wait s1')
    })
    const depthBtn = container.querySelector('[data-testid=defaults-depth]')
    rtl.fireEvent.click(depthBtn)
    const deepItem = await rtl.waitFor(() => {
      const items = [...document.querySelectorAll('[role="menuitem"]')]
      const match = items.find((el) => el.textContent?.includes(t('defaultsDepthDeep')))
      if (!match) throw new Error('wait menuitem')
      return match
    })
    rtl.fireEvent.click(deepItem)
    await rtl.waitFor(() => { if (sent.length === 0) throw new Error('wait patch') })
    assert.equal(sent.length, 1)
    assert.match(sent[0].line, /effort=deep|deep/)
  } finally {
    rtl.cleanup()
  }
})

// 负例留证 2026-11-27：BUG-442——DefaultsPanel 改用 SelectMenu <button> 后，浏览器 inputValue()
// 返回 null；控件须显式暴露 data-value 供浏览器断言读取。红配方：去掉 SelectMenu 的 data-value → 红。
test('BUG-442 SelectMenu：button 控件同时暴露 data-value 与 value 属性', async () => {
  const rtl = await loadRtl()
  const store = makeStore([])
  const { container } = rtl.render(createElement(DefaultsPanel, { sessionId: 's2', store, t }))
  try {
    const depthBtn = await rtl.waitFor(() => {
      const btn = container.querySelector('[data-testid=defaults-depth]')
      if (btn?.getAttribute('value') !== 'deep') throw new Error('wait deep')
      return btn
    })
    assert.equal(depthBtn.getAttribute('data-value'), 'deep')
    assert.equal(depthBtn.getAttribute('value'), 'deep')
  } finally {
    rtl.cleanup()
  }
})

// 负例留证 2026-11-27：BUG-452——DefaultsPanel「方法库 ›」过去是不可点击也不可聚焦的 <span> 伪链接。
// 红配方：把 <button data-testid="defaults-method-library-link"> 改回 <span> 或无条件渲染 → 本例红。
test('BUG-452 DefaultsPanel：「方法库 ›」在注入回调时渲染为可点击 button，缺回调时不渲染伪链接', async () => {
  const rtl = await loadRtl()
  const store = makeStore([])
  let clicked = 0
  const withAction = rtl.render(createElement(DefaultsPanel, {
    sessionId: 's1',
    store,
    t,
    onOpenMethodLibrary: () => { clicked += 1 },
  }))
  try {
    const linkBtn = withAction.container.querySelector('[data-testid="defaults-method-library-link"]')
    assert.ok(linkBtn !== null && linkBtn.tagName === 'BUTTON' && linkBtn.getAttribute('type') === 'button')
    rtl.fireEvent.click(linkBtn)
    assert.equal(clicked, 1)
  } finally {
    rtl.cleanup()
  }

  const withoutAction = rtl.render(createElement(DefaultsPanel, { sessionId: 's1', store, t }))
  try {
    assert.equal(withoutAction.container.querySelector('[data-testid="defaults-method-library-link"]'), null)
    assert.equal(withoutAction.container.textContent?.includes(t('defaultsMethodLibraryLink')), false, '无跳转回调时不得渲染假链接文案')
  } finally {
    rtl.cleanup()
  }
})

// 负例留证 2026-11-28：BUG-476 / BUG-482——① DefaultsPanel 受众失焦未判脏触发无效写盘，且切会话不清空草稿；
// ② defaults-source-auto 直接 unset(['source']) 误清 authority/recency；③ SelectMenu 布局类挂在内层 button
// 而非外层 Menu wrapper，且 defaults.module.css 缺 flex-wrap 与 @container (max-width: 720px)。
test('BUG-476 DefaultsPanel：受众未修改 blur 零写盘；跨会话清空未保存草稿', async () => {
  const rtl = await loadRtl()
  const sent = []
  const store = createDefaultsStore({
    readText: async () => JSON.stringify({ schema: 1, revision: 1, effort: 'quick' }),
    readLibrary: async () => ({ kind: 'absent', path: 'method-library.md' }),
    listDir: async () => [],
    execute: async (sid, line) => {
      sent.push({ sid, line })
      return { ok: true, value: { result: { kind: 'success', text: 'ok revision=2' } } }
    },
  })
  const { container, rerender } = rtl.render(createElement(DefaultsPanel, { sessionId: 's1', store, t }))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=defaults-depth]')?.value !== 'quick') throw new Error('wait s1')
    })
    const input = container.querySelector('[data-testid=defaults-audience]')
    rtl.fireEvent.focus(input)
    rtl.fireEvent.blur(input)
    await rtl.act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)) })
    assert.deepEqual(sent, [], '未修改受众时 blur 绝不得发出写盘命令')

    // 会话 s1 键入未保存草稿，直接切换到 s2（同样无 audience）→ 草稿必须清空
    rtl.fireEvent.change(input, { target: { value: '决策层草稿' } })
    assert.equal(input.value, '决策层草稿')
    rerender(createElement(DefaultsPanel, { sessionId: 's2', store, t }))
    await rtl.waitFor(() => {
      if (input.value !== '') throw new Error('wait draft clear')
    })
    assert.equal(input.value, '', '切会话后未提交的受众草稿必须清空')
    rtl.fireEvent.blur(input)
    assert.deepEqual(sent, [], '切会话清空后的空草稿 blur 不得写盘')
  } finally {
    rtl.cleanup()
  }
})

test('BUG-476 DefaultsPanel：信源「自动」仅清 families 保留 authority/recency，三者皆空才 unset source', async () => {
  const rtl = await loadRtl()
  const sent = []
  const store = createDefaultsStore({
    readText: async (sid) => sid === 's-keep'
      ? JSON.stringify({ schema: 1, revision: 1, source: { families: ['official'], authority: 'primary', recency: '12m' } })
      : JSON.stringify({ schema: 1, revision: 1, source: { families: ['official'] } }),
    readLibrary: async () => ({ kind: 'absent', path: 'method-library.md' }),
    listDir: async () => [],
    execute: async (sid, line) => {
      sent.push({ sid, line })
      return { ok: true, value: { result: { kind: 'success', text: 'ok revision=2' } } }
    },
  })
  const { container, rerender } = rtl.render(createElement(DefaultsPanel, { sessionId: 's-keep', store, t }))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=defaults-authority]')?.value !== 'primary') throw new Error('wait keep')
    })
    rtl.fireEvent.click(container.querySelector('[data-testid=defaults-source-auto]'))
    await rtl.waitFor(() => { if (sent.length === 0) throw new Error('wait patch') })
    assert.match(sent[0].line, /set /, 'authority/recency 在场时不得 unset 整条 source')
    assert.match(sent[0].line, /"authority":"primary"/, '必须保留 authority')
    assert.match(sent[0].line, /"recency":"12m"/, '必须保留 recency')
    assert.doesNotMatch(sent[0].line, /"families"/, '必须仅移除 families')

    rerender(createElement(DefaultsPanel, { sessionId: 's-empty', store, t }))
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=defaults-authority]')?.value !== 'auto') throw new Error('wait empty')
    })
    rtl.fireEvent.click(container.querySelector('[data-testid=defaults-source-auto]'))
    await rtl.waitFor(() => { if (sent.length < 2) throw new Error('wait unset') })
    assert.match(sent[1].line, /unset source/, '仅 families 在场且 authority/recency 均为空时才 unset source')
  } finally {
    rtl.cleanup()
  }
})

test('BUG-476 / BUG-482 SelectMenu 与 defaults.module.css：布局类挂外层 Menu wrapper，subRow 允许 wrap，compactGrid 走 @container', async () => {
  const rtl = await loadRtl()
  const store = makeStore([])
  const { container } = rtl.render(createElement(DefaultsPanel, { sessionId: 's1', store, t }))
  try {
    const recencyBtn = container.querySelector('[data-testid=defaults-recency]')
    assert.ok(recencyBtn, '缺少 defaults-recency 按钮')
    const menuWrapper = recencyBtn.parentElement
    assert.ok(menuWrapper && menuWrapper.tagName === 'SPAN', 'SelectMenu 外层应为 Menu wrapper <span>')
    assert.match(menuWrapper.className, /controlGrow/, '布局类 controlGrow 必须挂在 outer <Menu> wrapper 上')
    assert.doesNotMatch(recencyBtn.className, /controlGrow/, '布局类不得挂在内层 <button> 上')
  } finally {
    rtl.cleanup()
  }

  const cssText = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/defaults/defaults.module.css'), 'utf8')
  assert.match(cssText, /\.selectButton\s*\{[^}]*width:\s*100%/, '.selectButton 必须声明 width: 100%')
  assert.match(cssText, /\.subRow\s*\{[^}]*flex-wrap:\s*wrap/, '.subRow 必须允许 flex-wrap: wrap')
  assert.match(cssText, /\.subRowCompact\s*\{[^}]*flex-wrap:\s*wrap/, '.subRowCompact 必须允许 flex-wrap: wrap')
  assert.match(cssText, /container-type:\s*inline-size/, 'DefaultsPanel 容器必须声明 container-type: inline-size')
  assert.match(cssText, /@container\s*\(max-width:\s*720px\)\s*\{\s*\.compactGrid\b/, '.compactGrid 必须走 @container (max-width: 720px)')
  assert.doesNotMatch(cssText, /@media\s*\(max-width:\s*920px\)/, '.compactGrid 不得再使用 @media (max-width: 920px)')
})
