// dag-map.spec.mjs — DagMap SVG 作用域/中文裁剪与 ResearchGraphTab 交互/子节点投影测试（BUG-477 / BUG-478）。
//
// 归属：住 client/research-graph/，测试 DagMap 与 ResearchGraphTab 交互边界。
// 负例留证 2026-11-28：BUG-477——DagMap 曾写死全局 marker id、无 clipPath、按字数截断中文溢出邻卡且碰撞 +N、
// ResearchGraphTab 保留过期 expandedId 压暗全图边、使用重复全局 DOM id、diff 视图点异常不切回 current、
// 窄屏自动全屏反切 wide 模式。红配方：回退任一修法 → 本文件对应断言即红。
// 负例留证 2026-11-28：BUG-478——childStateOf 曾传 undefined/undefined 丢失子节点 running 与 attention、
// 缺图时 diff 视图残留 vnull 死锁。红配方：改回 childStateOf 传 undefined 或删 latestSnapshot 守卫 → 本文件红。
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { DagMap } from '../../../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx'
import { ResearchGraphTab } from '../../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { toolCall } from '../../../fixtures/events.mjs'
import { flushMicrotasks, loadRtl, makeMaliciousRunSource } from '../../client-dom-helpers.mjs'

const { render, fireEvent, act, cleanup } = await loadRtl()
const tZh = (key, params = {}) => String(zh[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))

afterEach(() => {
  cleanup()
})

const sampleNodes = [
  {
    id: 'W1.1',
    label: 'broad-scan',
    subject: '比较不同向量数据库在亿级规模下的查询延迟与内存开销',
    ownerName: '侦察员甲乙丙丁戊',
    status: 'completed',
    blockedBy: [],
    state: { text: '已完成', icon: '✓', color: 'var(--dsw-alias-state-success-primary)' },
  },
  {
    id: 'W2.1',
    label: 'deep-dive',
    subject: '比较不同向量数据库在亿级规模下的查询延迟与内存开销',
    ownerName: '分析师一二三四五',
    status: 'in_progress',
    blockedBy: ['W1.1'],
    state: { text: '进行中', icon: '●', color: 'var(--dsw-alias-state-business-primary)' },
  },
]

test('BUG-477：双实例 DagMap 生成唯一 marker/clipPath ID，中文按宽字形截断且避让 +N 徽标', () => {
  const counts = new Map([['W2.1', 3]])
  const { container } = render(createElement('div', null,
    createElement(DagMap, { nodes: sampleNodes, selectedId: null, childCounts: counts, onSelect: () => {}, t: tZh }),
    createElement(DagMap, { nodes: sampleNodes, selectedId: null, childCounts: counts, onSelect: () => {}, t: tZh }),
  ))
  const svgs = [...container.querySelectorAll('svg')]
  assert.equal(svgs.length, 2)

  const allMarkerIds = new Set()
  for (const svg of svgs) {
    const markers = [...svg.querySelectorAll('defs marker')]
    assert.equal(markers.length, 2)
    const localIds = new Set(markers.map((m) => m.getAttribute('id')))
    for (const id of localIds) {
      assert.ok(id && id !== 'research-graph-arrow' && id !== 'research-graph-arrow-active', `marker id 不得全局硬编码: ${id}`)
      assert.ok(!allMarkerIds.has(id), `双实例 marker id 不得冲突: ${id}`)
      allMarkerIds.add(id)
    }
    const edge = svg.querySelector('path[marker-end]')
    assert.ok(edge !== null)
    const refMatch = /^url\(#([^)]+)\)$/.exec(edge.getAttribute('marker-end') ?? '')
    assert.ok(refMatch !== null && localIds.has(refMatch[1]), 'edge marker-end 必须指向本实例 marker')

    const clips = [...svg.querySelectorAll('defs clipPath')]
    assert.equal(clips.length, sampleNodes.length, '每个节点必须有专属 clipPath')
    const clipIds = new Set(clips.map((c) => c.getAttribute('id')))
    const clippedGroups = [...svg.querySelectorAll('g[clip-path]')]
    assert.equal(clippedGroups.length, sampleNodes.length, '每个节点文本必须包裹在 clip-path 组内')
    for (const group of clippedGroups) {
      const m = /^url\(#([^)]+)\)$/.exec(group.getAttribute('clip-path') ?? '')
      assert.ok(m !== null && clipIds.has(m[1]))
    }
  }

  // 紧凑模式中文截断：无 +N 节点 <= 11 CJK（含省略号），有 +3 徽标节点比无徽标节点更短以避让 +3
  const firstSvg = svgs[0]
  const nodeGroups = [...firstSvg.querySelectorAll('g[role="button"]')]
  const w1Texts = [...nodeGroups[0].querySelectorAll('text')].map((el) => el.textContent ?? '')
  const w2Texts = [...nodeGroups[1].querySelectorAll('text')].map((el) => el.textContent ?? '')
  const w1Summary = w1Texts.find((txt) => txt.startsWith('比较')) ?? ''
  const w2Summary = w2Texts.find((txt) => txt.startsWith('比较')) ?? ''
  assert.ok(w1Summary.length > 0 && w1Summary.length <= 12, `紧凑模式中文摘要应按显示宽度截断，实际: ${w1Summary}`)
  assert.ok(w2Summary.length > 0 && w2Summary.length < w1Summary.length, `带 +3 徽标节点摘要须预留横宽更短，无徽标=${w1Summary} 带徽标=${w2Summary}`)
})

const EDGE_PLAN = [
  '图版本：v2',
  '| id | parent | lifecycle | kind | question | owner_role | deps | output | task_id |',
  '|---|---|---|---|---|---|---|---|---|',
  '| W1 | — | active | broad-scan | 初始侦察 | Scout-1 | — | leads.md | task-1 |',
  '| W2 | — | active | deep-dive | 深度分析 | Analyst-1 | W1 | evidence/a.md | task-2 |',
  '| W2.1 | W2 | active | deep-dive | 子任务活跃 | Scout-1 | — | evidence/a1.md | task-2-1 |',
  '| W2.2 | W2 | active | review | 子任务失败 | Critic-1 | — | evidence/a2.md | task-2-2 |',
  '| W2.3 | W2 | active | deep-dive | 子任务卡住 | Analyst-1 | — | evidence/a3.md | task-2-3 |',
].join('\n')

function makeTabHarness({
  sessionId = 'lead-1',
  slug = 'demo',
  run,
  fullscreen = false,
  teamOverride,
  statusesMap,
} = {}) {
  const defaultTeam = teamOverride ?? {
    members: [
      { id: 'm-scout', name: 'Scout-1', role: 'teammate', phase: 'active' },
      { id: 'm-critic', name: 'Critic-1', role: 'teammate', phase: 'failed' },
      { id: 'm-analyst', name: 'Analyst-1', role: 'teammate', phase: 'idle' },
    ],
    tasks: [
      { id: 'task-1', subject: 'W1 侦察', status: 'completed', ownerName: 'Scout-1', blockedBy: [], revision: 1, ready: false },
      { id: 'task-2', subject: 'W2 深度分析', status: 'in_progress', ownerName: 'Analyst-1', blockedBy: ['task-1'], revision: 1, ready: false },
      { id: 'task-2-1', subject: '子任务活跃', status: 'in_progress', ownerName: 'Scout-1', blockedBy: [], revision: 1, ready: false },
      { id: 'task-2-2', subject: '子任务失败', status: 'in_progress', ownerName: 'Critic-1', blockedBy: [], revision: 1, ready: false },
      { id: 'task-2-3', subject: '子任务卡住', status: 'in_progress', ownerName: 'Analyst-1', blockedBy: [], revision: 1, ready: false },
    ],
  }
  const statuses = statusesMap ?? new Map([
    ['m-scout', { running: true }],
    ['m-critic', { running: false }],
    ['m-analyst', { running: false }],
  ])
  const follow = (_sid, signal) => ({
    async *[Symbol.asyncIterator]() {
      if (slug !== null) {
        yield { kind: 'history', events: [toolCall({ name: 'write_file', arguments: { path: `drt_${slug}/plan.md` } })] }
      }
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
  })
  return {
    sessionId,
    t: tZh,
    useSession: () => undefined,
    useSessions: (selector) => selector({
      projectionsBySession: {
        [sessionId]: { values: { agentTeam: defaultTeam } },
      },
    }),
    useSessionStatus: (selector) => selector(statuses),
    useTabInfo: () => ({ sidebar: { fullscreen } }),
    follow,
    runSource: () => run.source,
    visible: true,
  }
}

test('BUG-477：ResearchGraphTab 再点取消选中、切会话不压暗边、无重复 DOM id、diff 点异常切回 current、窄屏自动全屏保 compact', async () => {
  const run = makeMaliciousRunSource({
    tree: {
      drt_demo: {
        'plan.md': EDGE_PLAN,
        plan: { 'v1.md': EDGE_PLAN },
      },
      drt_other: {
        'plan.md': EDGE_PLAN.replace('W2', 'W9').replace(/W2\./g, 'W9.'),
      },
    },
  })

  // 窄屏 (<768px) 自动 fullscreen 必须保持 compact 模式
  const origClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 420 })
  try {
    const props = makeTabHarness({ run, fullscreen: true })
    const view = render(createElement(ResearchGraphTab, props))
    await act(async () => { await flushMicrotasks(15) })

    const dagWrap = view.container.querySelector('[data-dag-mode]')
    assert.ok(dagWrap !== null)
    assert.equal(dagWrap.getAttribute('data-dag-mode'), 'compact', '视口 <768px 自动全屏时 DagMap 必须保持 compact 模式')

    // 点击 W2 选中；无全局重复 id="research-graph-W2"；再点 W2 取消选中
    const w2Node = [...view.container.querySelectorAll('g[role="button"]')].find((el) => (el.getAttribute('aria-label') ?? '').startsWith('W2 '))
    assert.ok(w2Node !== undefined)
    fireEvent.click(w2Node)
    assert.ok(view.container.querySelector('[data-testid="graph-selected-node"]') !== null)
    assert.equal(view.container.querySelectorAll('[id="research-graph-W2"]').length, 0, 'NodeCard 不得写入全局重复 DOM id')

    // 再点同一节点取消选中
    fireEvent.click(w2Node)
    assert.equal(view.container.querySelector('[data-testid="graph-selected-node"]'), null, '再次点击已选中节点应取消选中')

    // 选中 W2 后切到另一会话 → expandedId 复位，边不再压暗到 0.28
    fireEvent.click(w2Node)
    assert.ok(view.container.querySelector('[data-testid="graph-selected-node"]') !== null)
    const props2 = makeTabHarness({ sessionId: 'lead-2', slug: 'other', run, fullscreen: false })
    await act(async () => {
      view.rerender(createElement(ResearchGraphTab, props2))
      await flushMicrotasks(15)
    })
    assert.equal(view.container.querySelector('[data-testid="graph-selected-node"]'), null, '切会话后选中态必须复位')
    const edgeOpacities = [...view.container.querySelectorAll('svg path[marker-end]')].map((el) => el.getAttribute('opacity'))
    assert.ok(edgeOpacities.every((op) => op === '1'), `切会话后所有边 opacity 必须为 1，实际: ${edgeOpacities.join(',')}`)

    // 切回带快照会话，进入 diff 视图后点击 GraphNotices 异常按钮 → 必须切回 current 并展开对应节点
    const propsBack = makeTabHarness({ sessionId: 'lead-1', slug: 'demo', run, fullscreen: false })
    await act(async () => {
      view.rerender(createElement(ResearchGraphTab, propsBack))
      await flushMicrotasks(15)
    })
    const diffBtn = [...view.container.querySelectorAll('button')].find((b) => b.textContent === zh.graphShowDiff)
    assert.ok(diffBtn !== undefined)
    fireEvent.click(diffBtn)
    await act(async () => { await flushMicrotasks(15) })
    assert.equal(view.container.querySelector('[data-dag-mode]'), null, 'diff 视图下不渲染当前 DAG')

    const attentionBtn = [...view.container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes('task-2 ·'))
    assert.ok(attentionBtn !== undefined, '应存在 task-2 异常提示按钮')
    fireEvent.click(attentionBtn)
    assert.ok(view.container.querySelector('[data-dag-mode]') !== null, 'diff 视图点击异常节点必须切回 current 视图')
    assert.ok(view.container.querySelector('[data-testid="graph-selected-node"]') !== null, '点击异常节点应展开详情卡')
  } finally {
    if (origClientWidth !== undefined) Object.defineProperty(HTMLElement.prototype, 'clientWidth', origClientWidth)
    else delete HTMLElement.prototype.clientWidth
  }
})

test('BUG-478：复合子节点准确投影活跃/失败/卡住态（不误报 owner 未知），且缺图时不陷 vnull 死锁', async () => {
  const run = makeMaliciousRunSource({
    tree: {
      drt_demo: {
        'plan.md': EDGE_PLAN,
        plan: { 'v1.md': EDGE_PLAN },
      },
    },
  })
  const props = makeTabHarness({ run })
  const view = render(createElement(ResearchGraphTab, props))
  await act(async () => { await flushMicrotasks(15) })

  // 选中复合节点 W2，检查其三个子节点 W2.1 / W2.2 / W2.3 的真实状态投影
  const w2Node = [...view.container.querySelectorAll('g[role="button"]')].find((el) => (el.getAttribute('aria-label') ?? '').startsWith('W2 '))
  assert.ok(w2Node !== undefined)
  fireEvent.click(w2Node)

  const selected = view.container.querySelector('[data-testid="graph-selected-node"]')
  assert.ok(selected !== null)
  const selectedText = selected.textContent ?? ''
  assert.doesNotMatch(selectedText, /owner 未知/, '活跃/失败/卡住子节点不得再被误报为 owner 未知')
  assert.match(selectedText, /W2\.1[\s\S]*进行中/, '活跃子节点 W2.1 应显示进行中')
  assert.match(selectedText, /W2\.2[\s\S]*owner 失败/, '失败负责人子节点 W2.2 应显示 owner 失败')
  assert.match(selectedText, /W2\.3[\s\S]*可能卡住/, '卡住子节点 W2.3 应显示可能卡住')

  // 进入 diff 视图后 plan.md 缺失 → 自动退回 current，绝不渲染 vnull
  const diffBtn = [...view.container.querySelectorAll('button')].find((b) => b.textContent === zh.graphShowDiff)
  assert.ok(diffBtn !== undefined)
  fireEvent.click(diffBtn)
  await act(async () => { await flushMicrotasks(15) })
  assert.match(view.container.textContent ?? '', /结构差异/)

  run.update({ fileFaults: { 'drt_demo/plan.md': 'missing' } })
  // 触发一次会话内重新读取（通过重新挂载或等待定时器不依赖假时钟：直接切到另一次 retry 或绑定事件）
  // 这里用 fake timers 或 rerender？直接在上面启用 setInterval 太重，改为通过 bindCommands 拿到的 refresh 回调触发！
  cleanup()

  let refreshCmd = null
  const propsWithCmd = {
    ...props,
    useTabInfo: () => ({
      sidebar: { fullscreen: false },
      tab: { actions: { bindCommands: (cmds) => { refreshCmd = cmds.refresh; return () => {} } } },
    }),
  }
  run.update({ fileFaults: {} })
  const view2 = render(createElement(ResearchGraphTab, propsWithCmd))
  await act(async () => { await flushMicrotasks(15) })
  const diffBtn2 = [...view2.container.querySelectorAll('button')].find((b) => b.textContent === zh.graphShowDiff)
  assert.ok(diffBtn2 !== undefined)
  fireEvent.click(diffBtn2)
  await act(async () => { await flushMicrotasks(15) })
  assert.match(view2.container.textContent ?? '', /结构差异/)

  run.update({ fileFaults: { 'drt_demo/plan.md': 'missing' } })
  assert.ok(typeof refreshCmd === 'function')
  await act(async () => {
    refreshCmd()
    await flushMicrotasks(15)
  })
  assert.doesNotMatch(view2.container.textContent ?? '', /vnull/, 'plan 缺失后绝不能残留 vnull 差异视图')
  assert.doesNotMatch(view2.container.textContent ?? '', /结构差异/, 'plan 缺失后应退回 current 视图退出差异卡')
})
