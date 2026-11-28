// product-startup — GUI 侧工作区记忆的纯谓词（D40）；不碰 DOM/localStorage。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CURRENT_SESSION_KEY, PRODUCT_WORKSPACE_KEY, PRODUCT_TITLE_PREFIX,
  buildMemberSessionTarget, buildStartResearchOptions, needsProductSwitch,
  openResourceWhenMounted, openTabWhenMounted, pickProductWorkspace, pickStartWorkspaceId, readCurrentSessionId,
} from '../../../packages/deep-research-pack/src/client/startup.ts'
import { createRightbarNav } from '../../../packages/deep-research-pack/src/client/rightbar-nav.ts'

test('readCurrentSessionId：裸 id / {sessionId} / 坏值', () => {
  assert.equal(readCurrentSessionId(null), null)
  assert.equal(readCurrentSessionId(''), null)
  assert.equal(readCurrentSessionId('"session-a"'), 'session-a')
  assert.equal(readCurrentSessionId('{"sessionId":"session-b"}'), 'session-b')
  assert.equal(readCurrentSessionId('{"sessionId":42}'), null)
  assert.equal(readCurrentSessionId('not-json'), null)
})

test('pickProductWorkspace：保存 id 优先，其次唯一标题', () => {
  const items = [
    { workspaceId: 'w1', title: 'other', path: '/p/other' },
    { workspaceId: 'w2', title: `${PRODUCT_TITLE_PREFIX}acme`, path: '/p/acme' },
  ]
  assert.equal(pickProductWorkspace(items, 'w1')?.workspaceId, 'w1')
  assert.equal(pickProductWorkspace(items, 'gone')?.workspaceId, 'w2')
  assert.equal(pickProductWorkspace(items, null)?.workspaceId, 'w2')
  assert.equal(pickProductWorkspace([items[0]], null), null)
  assert.equal(pickProductWorkspace([], null), null)
})

test('needsProductSwitch：cwd 未知或不同即需要切', () => {
  assert.equal(needsProductSwitch(undefined, '/p/acme'), true)
  assert.equal(needsProductSwitch('/p/other', '/p/acme'), true)
  assert.equal(needsProductSwitch('/p/acme', '/p/acme'), false)
})

test('键名稳定（vendor 约定 + 产品键）', () => {
  assert.equal(CURRENT_SESSION_KEY, 'dsh.sessions.current')
  assert.equal(PRODUCT_WORKSPACE_KEY, 'dsh.deep-research.workspaceId.v1')
})

// 负例留证 2026-11-27：BUG-451——startResearch 向 uiWorkspace.startSession 误传 initialPrompt，
// vendor StartSessionOptions 实际读 prompt 字段导致透镜预设草稿被静默丢弃。红配方：传 initialPrompt 或删 buildStartResearchOptions → 红。
test('BUG-451 buildStartResearchOptions：使用 vendor DraftInitializationOptions.prompt 字段且不产出 initialPrompt', () => {
  assert.equal(buildStartResearchOptions(undefined), undefined)
  assert.equal(buildStartResearchOptions('   '), undefined)
  const opts = buildStartResearchOptions('请按监管口径研究 AI 芯片出口规则')
  assert.deepEqual(opts, { prompt: '请按监管口径研究 AI 芯片出口规则', whenDraftExists: 'append' })
  assert.equal('initialPrompt' in opts, false)
})

// 负例留证 2026-11-27：BUG-459——从 ResearchHub 返回对话时会话右栏尚未完成重挂，直接调 openResource 会抛
// `sidebarRight: no session surface is mounted` 并被静默吞掉；且已收起的右栏必须确保展开。
// 红配方：删除 startup.ts openResourceWhenMounted 或移除重试 / toggleExpanded 逻辑 → 本例红。
test('BUG-459 openResourceWhenMounted：等待会话右栏重挂后打开资源，并在收起时展开右栏', async () => {
  let attempts = 0
  let expanded = false
  const opened = []
  let errors = 0
  const cancel = openResourceWhenMounted(
    {
      openResource(addr) {
        attempts += 1
        if (attempts < 3) throw new Error('sidebarRight: no session surface is mounted')
        opened.push(addr)
      },
      isExpanded: () => expanded,
      toggleExpanded: () => { expanded = true },
    },
    'dsh-resource://file/session/s1/archive/drt_a/final/readable-v1.md',
    { intervalMs: 5, maxAttempts: 20, onError: () => { errors += 1 } },
  )
  await new Promise((r) => setTimeout(r, 80))
  cancel()
  assert.deepEqual(opened, ['dsh-resource://file/session/s1/archive/drt_a/final/readable-v1.md'])
  assert.equal(expanded, true, '原本收起的右栏必须被展开')
  assert.equal(errors, 0)

  // dispose 时取消挂起重试，避免已卸载插件继续调宿主接口
  let postCancelAttempts = 0
  const cancelImmediate = openResourceWhenMounted(
    {
      openResource() {
        postCancelAttempts += 1
        throw new Error('sidebarRight: no session surface is mounted')
      },
    },
    'dsh-resource://file/session/s1/drt_a/final.md',
    { intervalMs: 5, maxAttempts: 10 },
  )
  cancelImmediate()
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(postCancelAttempts, 1, '取消后不得继续调度后台重试')
})

// 负例留证 2026-11-28：BUG-471——当前会话 A 仍挂载在右栏时跨会话打开会话 B 的终稿/状态页，
// 旧 openResourceWhenMounted 不核对 expectedSessionId 会直接把资源错开在会话 A；openMember 丢弃 parentSessionId。
// 红配方：去掉 expectedSessionId 校验或 openTabWhenMounted / buildMemberSessionTarget → 本例红。
test('BUG-471 openResourceWhenMounted / openTabWhenMounted / buildMemberSessionTarget：等待目标会话挂载不串台且成员地址携带 parentSessionId', async () => {
  let mountedSession = 'sessionA'
  const listeners = new Set()
  let expanded = false
  const openedResources = []
  const openedTabs = []
  const host = {
    mounted: {
      getSnapshot: () => mountedSession,
      subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    },
    openResource: (addr) => { openedResources.push([mountedSession, addr]) },
    openTab: (kind, opts) => { openedTabs.push([mountedSession, kind, opts]) },
    isExpanded: () => expanded,
    toggleExpanded: () => { expanded = true },
  }

  const cancelRes = openResourceWhenMounted(host, 'dsh-resource://file/session/sessionB/drt_b/final.md', {
    expectedSessionId: 'sessionB',
    intervalMs: 10,
    maxAttempts: 20,
  })
  const cancelTab = openTabWhenMounted(host, 'research-status', {
    expectedSessionId: 'sessionB',
    intervalMs: 10,
    maxAttempts: 20,
  })

  // 尚在 sessionA 时绝不能误开
  assert.deepEqual(openedResources, [])
  assert.deepEqual(openedTabs, [])

  // 延迟切换到 sessionB 并通知 mounted 订阅者
  setTimeout(() => {
    mountedSession = 'sessionB'
    for (const fn of listeners) fn()
  }, 15)
  await new Promise((r) => setTimeout(r, 60))
  cancelRes()
  cancelTab()

  assert.deepEqual(openedResources, [['sessionB', 'dsh-resource://file/session/sessionB/drt_b/final.md']])
  assert.deepEqual(openedTabs, [['sessionB', 'research-status', undefined]])
  assert.equal(expanded, true)

  // 负控：超时未切到目标会话走 onError，绝不在旧会话误开
  let timeoutErr = null
  const cancelMiss = openTabWhenMounted(host, 'research-status', {
    expectedSessionId: 'sessionC',
    intervalMs: 5,
    maxAttempts: 2,
    onError: (e) => { timeoutErr = e },
  })
  await new Promise((r) => setTimeout(r, 40))
  cancelMiss()
  assert.ok(timeoutErr !== null, '超时未命中目标会话应触发 onError')
  assert.equal(openedTabs.length, 1, '超时绝不得在错误会话上打开页签')

  // openMember 地址契约 + createRightbarNav 端到端装配
  assert.deepEqual(buildMemberSessionTarget('lead-1', 'member-2'), {
    parentSessionId: 'lead-1',
    childSessionId: 'member-2',
    mode: 'continuable',
  })
  assert.equal(buildMemberSessionTarget('lead-1', 'lead-1'), 'lead-1')

  const navOpenedSessions = []
  let navBackCount = 0
  const nav = createRightbarNav(host, { openSession: (t) => { navOpenedSessions.push(t) } }, () => { navBackCount += 1 })
  nav.openMember('lead-1', 'member-2')
  nav.openSessionFinal('sessionB', 'drt_b/final.md')
  nav.revealGraphTab('W2.1')
  nav.dispose()
  assert.deepEqual(navOpenedSessions, [
    { parentSessionId: 'lead-1', childSessionId: 'member-2', mode: 'continuable' },
    'sessionB',
  ])
  assert.equal(navBackCount, 1)
  assert.deepEqual(openedTabs.at(-1), ['sessionB', 'research-graph', { params: { nodeId: 'W2.1' } }])
})

// 负例留证 2026-11-28：BUG-479——startResearch 忽略当前工作区硬取旧 localStorage PRODUCT_WORKSPACE_KEY，
// 且 buildStartResearchOptions 使用 whenDraftExists:'keep' 静默丢弃透镜 prompt。
// 红配方：把 whenDraftExists 改回 'keep' 或 pickStartWorkspaceId 优先用 savedId → 本例红。
test('BUG-479 pickStartWorkspaceId 与 buildStartResearchOptions：优先当前会话工作区且已有草稿采用 append', () => {
  const items = [
    { workspaceId: 'w-old', title: `${PRODUCT_TITLE_PREFIX}old`, path: '/p/old' },
    { workspaceId: 'w-cur', title: 'user-workspace', path: '/p/cur' },
  ]
  assert.equal(pickStartWorkspaceId(items, 'w-cur', 'w-old'), 'w-cur')
  assert.equal(pickStartWorkspaceId(items, undefined, 'w-old'), 'w-old')
  assert.equal(buildStartResearchOptions('透镜提示')?.whenDraftExists, 'append')
})
