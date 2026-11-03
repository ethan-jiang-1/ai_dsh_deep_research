// research-tabs.test.mjs — 状态/图谱页签的 keyless 静态渲染（react-dom/server）。
//
// 覆盖边界：两页签在没有数据时的空态壳与机器标记；配置/终稿页签依赖 primitives 的 CSS 模块
// （Modal / MarkdownText），tsx 测试加载器无法解析 .css，故其组件行为归 client-load 真机档。
// 反证：把 `data-research-face` 或空态文案删掉 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResearchStatusTab } from '../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx'
import { ResearchGraphTab } from '../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx'

const baseProps = {
  sessionId: 'session-test',
  t: (key) => key,
  useSession: () => undefined,
  useSessions: () => undefined,
  useSessionStatus: () => undefined,
  openFinal: () => {},
  openOwner: () => {},
  follow: async function* () {},
  readFile: async () => null,
  listDir: async () => [],
  runSource: () => ({}),
  send: async () => {},
  visible: true,
}

test('研究状态：空态渲染 + data-research-face 机器标记', () => {
  const html = renderToStaticMarkup(createElement(ResearchStatusTab, baseProps))
  assert.match(html, /data-research-face="unbound"/, '状态页必须暴露机器可读数据面')
  assert.match(html, /本会话尚未绑定研究 run/, '未绑定空态如实说明')
  assert.match(html, /（研究中，暂无可见动作）/, '无活动流时的空态')
})

test('研究图谱：空态渲染 + 只读边界', () => {
  const html = renderToStaticMarkup(createElement(ResearchGraphTab, baseProps))
  assert.match(html, /研究图谱/)
  assert.match(html, /只读观察/)
  assert.match(html, /还没有团队投影/, '无 Team 投影时不画假图')
})
