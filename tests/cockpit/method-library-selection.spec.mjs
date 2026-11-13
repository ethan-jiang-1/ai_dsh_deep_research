// method-library-selection.spec.mjs — 方法库选区样式不得静默失效（BUG-047 的机械守卫）。
//
// 为什么存在：2026-11-11 真机症状 = 点另一条方法，右侧详情换了、左侧毫无标记。根因是
// `background: 'var(--dsw-alias-brand-primary)0f'` 这类"变量后拼十六进制 alpha"——`var()`
// 替换后得到"完整颜色 + 孤立 token"，浏览器在计算值阶段整条丢弃；React inline style 不报错、
// typecheck 不咬。本文件钉三件：
//   ① 源码扫描：pack client 不得再出现该拼接（负例先红：修复前命中 9 处）；
//   ② 纯函数：选中视觉走 color-mix（半透明合法），未选中不带任何背景覆盖；
//   ③ 渲染：条目行以 aria-current="true" 表达选中（视觉的锚点），选中名加粗。
// 真机视觉证据（截图）归通道/client-load 档，不在本文件。
//
// 负例留证 2026-11-11：BUG-047——修复前同一条扫描命中 9 处（MethodLibraryView.tsx:408/426 各 2 个
// 属性 + views.tsx:217/289/306/312/334），浏览器把声明整条丢弃（隔离实验 computed = 透明/none）；
// 修复后 0 处。把样式改回"变量后拼 alpha"任一处，本文件立即转红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { LibraryRow } from '../../packages/deep-research-pack/src/client/method-library/views.tsx'
import { libraryRowStyle } from '../../packages/deep-research-pack/src/client/method-library/styles.ts'

const CLIENT_ROOT = fileURLToPath(new URL('../../packages/deep-research-pack/src/client/', import.meta.url))
// `var(--x)` 后紧跟十六进制 alpha（`%`/单位/字母前不算）= 该声明必被浏览器丢弃。
const VAR_ALPHA = /var\(--[A-Za-z0-9-]+\)[0-9a-fA-F]{2}(?![0-9A-Za-z%-])/g

test('pack client 源码里不得出现 var(--…) 后拼十六进制 alpha', () => {
  const hits = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) { walk(path); continue }
      if (!/\.(ts|tsx)$/.test(name)) continue
      const text = readFileSync(path, 'utf8')
      for (const match of text.matchAll(VAR_ALPHA)) {
        const line = text.slice(0, match.index).split('\n').length
        hits.push(`${path.slice(CLIENT_ROOT.length)}:${line} ${match[0]}`)
      }
    }
  }
  walk(CLIENT_ROOT)
  assert.deepEqual(hits, [], `这些 var()+alpha 拼接会被浏览器整条丢弃（BUG-047）：\n${hits.join('\n')}`)
})

test('选中行视觉：color-mix 半透明 + 左侧 accent bar；未选中不覆盖背景', () => {
  const selected = libraryRowStyle(true)
  assert.match(String(selected.background), /^color-mix\(in srgb, var\(--[A-Za-z0-9-]+\) \d+%, transparent\)$/, '选中底色必须走 color-mix（合法半透明）')
  assert.match(String(selected.borderColor), /^color-mix\(in srgb,/, '选中边线必须走 color-mix')
  assert.match(String(selected.boxShadow), /inset 3px 0 0 var\(--/, '选中行要有左侧 accent bar')
  assert.deepEqual(libraryRowStyle(false), {}, '未选中不得覆盖行背景（否则 hover 失效）')
})

test('条目行：选中态用 aria-current="true" 表达（视觉锚点），选中名加粗', () => {
  const render = (selected) => renderToStaticMarkup(createElement(LibraryRow, {
    name: '领域地图', summary: '摸清谁在做什么', selected, t: (key) => key, onSelect() {},
  }))
  const selected = render(true)
  assert.match(selected, /data-method-library-row/)
  assert.match(selected, /aria-current="true"/)
  assert.match(selected, /font-weight:600/)
  assert.match(selected, /领域地图/)
  assert.match(selected, /摸清谁在做什么/)

  const plain = render(false)
  assert.ok(!plain.includes('aria-current'), '未选中行不得带 aria-current')
  assert.ok(!plain.includes('font-weight:600'), '未选中行名字不加粗')
})
