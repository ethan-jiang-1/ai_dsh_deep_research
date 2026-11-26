// research-tabs.spec.mjs — 状态/图谱页签的 keyless 静态渲染（react-dom/server）。
//
// 覆盖边界：两页签在没有数据时的空态壳与机器标记；配置/终稿页签依赖 primitives 的 CSS 模块
// （Modal / MarkdownText），tsx 测试加载器无法解析 .css，故其组件行为归 client-load 真机档。
// 反证：把 `data-research-face` 或空态文案删掉 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '../css-module-helpers.mjs'
import { loadRtl } from '../client-dom-helpers.mjs'
import { ResearchStatusTab } from '../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx'
import { ResearchGraphTab } from '../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx'
import { ResearchTabMenuItem } from '../../../packages/deep-research-pack/src/client/ResearchTabMenuItem.tsx'
import { ResearchHeaderPill } from '../../../packages/deep-research-pack/src/client/ResearchHeaderPill.tsx'
import { RESEARCH_STATUS_TAB_KIND } from '../../../packages/deep-research-pack/src/client/keys.ts'
import { zh } from '../../../packages/deep-research-pack/src/client/locales.ts'

const tZh = (key, params = {}) => String(zh[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))

const baseProps = {
  sessionId: 'session-test',
  t: tZh,
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

test('研究图谱：有依赖边时画 DAG 并折叠全量节点列表，仅点击选中后聚焦详情', () => {
  const edgeProps = {
    ...baseProps,
    useSessionStatus: () => new Map(),
    useSessions: (selector) => selector({
      projectionsBySession: {
        'session-test': {
          values: {
            agentTeam: {
              members: [{ id: 'm1', name: 'Scout-1', role: 'teammate', phase: 'active' }],
              tasks: [
                { id: 'W1', subject: 'W1 侦察', status: 'completed', ownerName: 'Scout-1', blockedBy: [] },
                { id: 'W2', subject: 'W2 综合', status: 'in_progress', ownerName: 'Scout-1', blockedBy: ['W1'] },
              ],
            },
          },
        },
      },
    }),
  }
  const html = renderToStaticMarkup(createElement(ResearchGraphTab, edgeProps))
  assert.match(html, /data-testid="graph-all-nodes"/, '有边时全量节点列表默认折叠进 details')
  assert.doesNotMatch(html, /data-testid="graph-selected-node"/, '未点击节点前不展开聚焦详情卡')
})

test('ResearchTabMenuItem：仅研究类页签渲染「打开研究工作台」，点击调用 openHub 与 dismiss', async () => {
  const nonResearch = renderToStaticMarkup(createElement(ResearchTabMenuItem, {
    tab: { id: 't1', kind: 'file-preview', label: 'README.md' },
    dismiss: () => {},
    openHub: () => {},
    t: tZh,
  }))
  assert.equal(nonResearch, '', '非研究类页签不应挂载工作台菜单项')

  const rtl = await loadRtl()
  let hubOpened = 0
  let dismissed = 0
  try {
    const { container } = rtl.render(createElement(ResearchTabMenuItem, {
      tab: { id: 't2', kind: RESEARCH_STATUS_TAB_KIND, label: '研究状态' },
      dismiss: () => { dismissed += 1 },
      openHub: () => { hubOpened += 1 },
      t: tZh,
    }))
    const item = container.querySelector('[role="menuitem"]')
    assert.ok(item !== null, '研究类页签应渲染 menuitem')
    assert.match(item.textContent ?? '', new RegExp(zh.tabMenuOpenHub))
    rtl.fireEvent.click(item)
    assert.equal(hubOpened, 1, '点击后应调用 openHub')
    assert.equal(dismissed, 1, '点击后应调用 dismiss')
  } finally {
    rtl.cleanup()
  }
})

// 负例留证 2026-11-27：BUG-439——ResearchHeaderPill 使用默认 HoverCard（#2C2C2E 硬深色底）搭配
// 浅色主题文字 --dsw-alias-label-primary，导致浅色下黑底暗字不可辨；改用 inline 走主题随动底色。
// 红配方：去掉 ResearchHeaderPill 的 HoverCard inline 属性 → inline 类名缺失即红。
test('BUG-439 ResearchHeaderPill：HoverCard 使用 inline 主题随动表面（避免浅色模式黑底暗字）', async () => {
  const rtl = await loadRtl()
  try {
    const follow = async function* () {
      yield {
        kind: 'history',
        events: [{ type: 'tool/call', data: { name: 'write_file', arguments: JSON.stringify({ path: 'drt_demo/question.md' }) } }],
      }
    }
    const { container } = rtl.render(createElement(ResearchHeaderPill, {
      sessionId: 's-pill',
      t: tZh,
      follow,
      openStatus: () => {},
      openFinal: () => {},
    }))
    const btn = await rtl.waitFor(() => {
      const el = container.querySelector('[data-testid="research-header-pill"]')
      if (el === null) throw new Error('wait pill')
      return el
    })
    const wrapper = btn.parentElement
    assert.ok(wrapper !== null && /\binline\b/.test(wrapper.className), `HoverCard 包装元素须含 inline 表面类，实际 className=${wrapper?.className}`)
  } finally {
    rtl.cleanup()
  }
})
