// research-projection.spec.mjs — Host sessionProjections 纯增量折算与 Hub 会话归属反查单测。
// 覆盖：空流 / 非研究事件引用保持(Object.is) / 立项预检抑制 / HITL1&2 挂起与应答 / timed pending /
// 交付迁移 / 畸形与截断容错 / 重放幂等 / Hub 同 slug + cwd 归属解析与孤立归档负例。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  RESEARCH_RUN_PROJECTION_KEY,
  applyResearchRunEvent,
  foldResearchRunEvents,
  initialResearchRunState,
  projectResearchRunView,
  resolveRunSessionMatch,
  selectSessionResearchProjection,
} from '../../../../packages/deep-research-pack/src/lib/events/research-projection.ts'

test('空流与非研究事件：严格保持 idle 且无关事件返回原状态引用(Object.is)', () => {
  const s0 = initialResearchRunState({ createdAt: 1700000000000 })
  assert.equal(RESEARCH_RUN_PROJECTION_KEY, 'researchRun')
  const v0 = projectResearchRunView(s0)
  assert.deepEqual(v0, {
    schemaVersion: 1,
    slug: null,
    phase: 'idle',
    hitlKind: null,
    deliveredPath: null,
    updatedAt: 1700000000000,
  })
  assert.equal(projectResearchRunView(s0), v0, '同一 state 引用必须复用 view 引用')

  const noiseEvents = [
    null,
    undefined,
    'corrupted',
    { type: 'turn/start', time: 1700000001000, data: {} },
    { type: 'assistant/message', time: 1700000002000, data: { text: 'hello' } },
    { type: 'user/message', time: 1700000003000, data: {} },
    { type: 'tool/call', time: 1700000004000, data: { name: 'bash', arguments: '{"command":"ls"}' } },
    { type: 'tool/call', time: 1700000005000, data: { name: 'read', arguments: '{"file_path":"README.md"}' } },
    { type: 'deliverables/presented', time: 1700000006000, data: { files: [{ path: 'drafts/final.md' }] } },
  ]
  let cur = s0
  for (const ev of noiseEvents) {
    const next = applyResearchRunEvent(cur, ev)
    assert.equal(Object.is(next, cur), true, `无关事件 ${JSON.stringify(ev)} 不得分配新 state`)
    cur = next
  }
})

test('全生命周期转移：intake → HITL1 挂起(含 timed pending 保持) → 应答 → 写绑定 running → HITL2 → 交付', () => {
  const events = [
    { type: 'tool/call', time: 100, data: { name: 'read', arguments: JSON.stringify({ file_path: 'drt_old_run/question.md' }) } },
    { type: 'tool/call', time: 200, data: { name: 'skill', arguments: JSON.stringify({ name: 'research-brief' }) } },
  ]
  // 立项预检 read 旧 bundle + skill research-brief：kickoffSeen 必须抑制旧 readSlug，不串旧题！
  const atKickoff = foldResearchRunEvents(events)
  assert.equal(atKickoff.phase, 'intake')
  assert.equal(atKickoff.slug, null)

  // HITL1 挂起
  const ask1 = {
    type: 'tool/call',
    time: 300,
    data: {
      name: 'ask_user_question',
      callId: 'call-hitl1',
      arguments: JSON.stringify({ questions: [{ id: 'research_type', header: '研究类型' }] }),
    },
  }
  const atHitl1 = foldResearchRunEvents([...events, ask1])
  assert.equal(atHitl1.phase, 'hitl_pending')
  assert.equal(atHitl1.hitlKind, 'hitl1')
  assert.equal(atHitl1.slug, null)

  // timed 超时落定：带 "pending":true 的 tool/result 仍保持 hitl_pending
  const timedPending = {
    type: 'tool/result',
    time: 350,
    data: { callId: 'call-hitl1', message: { content: [{ type: 'text', text: '{"pending":true}' }] } },
  }
  const stillPending = foldResearchRunEvents([...events, ask1, timedPending])
  assert.equal(stillPending.phase, 'hitl_pending')
  assert.equal(stillPending.hitlKind, 'hitl1')

  // 真人应答 + Lead 落笔写入新 bundle → running + 强绑定新 slug
  const answered = { type: 'user/message', time: 400, data: {} }
  const writeQ = {
    type: 'tool/call',
    time: 500,
    data: { name: 'write', arguments: JSON.stringify({ file_path: 'drt_new_topic/question.md' }) },
  }
  const running = foldResearchRunEvents([...events, ask1, timedPending, answered, writeQ])
  assert.equal(running.phase, 'running')
  assert.equal(running.slug, 'new_topic')
  assert.equal(running.hitlKind, null)

  // HITL2 挂起 → 回答 → present 交付（读者版优先于审计版）
  const ask2 = {
    type: 'tool/call',
    time: 600,
    data: {
      name: 'ask_user_question',
      callId: 'call-hitl2',
      arguments: JSON.stringify({ questions: [{ id: 'hitl2_delivery', header: '交付审阅' }] }),
    },
  }
  const atHitl2 = foldResearchRunEvents([...events, ask1, timedPending, answered, writeQ, ask2])
  assert.equal(atHitl2.phase, 'hitl_pending')
  assert.equal(atHitl2.hitlKind, 'hitl2')

  const ans2 = {
    type: 'tool/result',
    time: 650,
    data: { callId: 'call-hitl2', message: { content: [{ type: 'text', text: '{"answers":{"hitl2_delivery":"approve"}}' }] } },
  }
  const present = {
    type: 'deliverables/presented',
    time: 700,
    data: {
      turn: 4,
      callId: 'call-present',
      files: [
        { path: 'drt_new_topic/final/v1.md' },
        { path: 'drt_new_topic/final/readable-v1.md' },
      ],
    },
  }
  const delivered = foldResearchRunEvents([...events, ask1, timedPending, answered, writeQ, ask2, ans2, present])
  assert.equal(delivered.phase, 'delivered')
  assert.equal(delivered.slug, 'new_topic')
  assert.equal(delivered.deliveredPath, 'drt_new_topic/final/readable-v1.md')
  assert.equal(delivered.hitlKind, null)
  assert.equal(delivered.updatedAt, 700)
})

test('恢复会话（无立项动作、直接读取目标 bundle）可合法读取 readSlug', () => {
  const resumed = foldResearchRunEvents([
    { type: 'tool/call', time: 900, data: { name: 'read', arguments: JSON.stringify({ file_path: 'archive/drt_past_case/final/v1.md' }) } },
  ])
  assert.equal(resumed.phase, 'running')
  assert.equal(resumed.slug, 'past_case')
})

test('畸形/截断事件与重放幂等性', () => {
  const malformed = [
    { type: 'tool/call', time: 'not-a-date', data: { name: 'write', arguments: '{"file_path":"drt_broken/' } },
    { type: 'tool/call', time: -10, data: { name: 'ask_user_question', arguments: '{truncated' } },
    { type: 'tool/result', time: 100, data: null },
    { type: 'deliverables/presented', time: 200, data: { files: 'not-an-array' } },
  ]
  const v1 = foldResearchRunEvents(malformed)
  const v2 = foldResearchRunEvents(malformed)
  assert.deepEqual(v1, v2)
  assert.equal(v1.phase, 'hitl_pending')
  assert.equal(v1.hitlKind, 'other')
  assert.equal(v1.slug, null)
})

test('selectSessionResearchProjection：优先活投影，冷启动回退 byId.projectionValues', () => {
  const liveProj = { schemaVersion: 1, slug: 'live_run', phase: 'delivered', hitlKind: null, deliveredPath: 'drt_live_run/final/v1.md', updatedAt: 200 }
  const coldProj = { schemaVersion: 1, slug: 'cold_run', phase: 'running', hitlKind: null, deliveredPath: null, updatedAt: 100 }
  const sessions = {
    ids: ['s1', 's2', 's3'],
    byId: {
      s1: { id: 's1', cwd: '/ws/a', projectionValues: { researchRun: coldProj } },
      s2: { id: 's2', cwd: '/ws/a', projectionValues: { researchRun: coldProj } },
      s3: { id: 's3', cwd: '/ws/a' },
    },
    projectionsBySession: {
      s1: { values: { researchRun: liveProj } },
    },
  }
  assert.equal(selectSessionResearchProjection(sessions, 's1'), liveProj)
  assert.equal(selectSessionResearchProjection(sessions, 's2'), coldProj)
  assert.equal(selectSessionResearchProjection(sessions, 's3'), null)
})

test('resolveRunSessionMatch：精准反查所属会话、跳过 subagent、跨工作区隔离、孤立归档不串台', () => {
  const sessions = {
    ids: ['s-active-a', 's-owner-b', 's-subagent', 's-other-ws'],
    byId: {
      's-active-a': {
        id: 's-active-a',
        cwd: '/ws/research',
        updatedAt: 500,
        projectionValues: {
          researchRun: { schemaVersion: 1, slug: 'topic-a', phase: 'running', hitlKind: null, deliveredPath: null, updatedAt: 500 },
        },
      },
      's-owner-b': {
        id: 's-owner-b',
        cwd: '/ws/research',
        updatedAt: 400,
        projectionValues: {
          researchRun: { schemaVersion: 1, slug: 'topic-b', phase: 'delivered', hitlKind: null, deliveredPath: 'drt_topic-b/final/readable-v1.md', updatedAt: 400 },
        },
      },
      's-subagent': {
        id: 's-subagent',
        origin: 'subagent',
        cwd: '/ws/research',
        updatedAt: 999,
        projectionValues: {
          researchRun: { schemaVersion: 1, slug: 'topic-b', phase: 'running', hitlKind: null, deliveredPath: null, updatedAt: 999 },
        },
      },
      's-other-ws': {
        id: 's-other-ws',
        cwd: '/ws/elsewhere',
        updatedAt: 999,
        projectionValues: {
          researchRun: { schemaVersion: 1, slug: 'topic-orphan', phase: 'delivered', hitlKind: null, deliveredPath: 'drt_topic-orphan/final/v1.md', updatedAt: 999 },
        },
      },
    },
    projectionsBySession: {},
  }

  // 在 A 题会话下点 B 题：必须精准切到 s-owner-b（忽略更新的 subagent），绝不复用 activeSessionId！
  const matchB = resolveRunSessionMatch({
    slug: 'drt_topic-b',
    workspaceCwd: '/ws/research',
    activeSessionId: 's-active-a',
    sessions,
  })
  assert.equal(matchB.kind, 'owned')
  assert.equal(matchB.sessionId, 's-owner-b')
  assert.equal(matchB.isActive, false)

  // 同 slug 但在另一个 workspace：不得跨工作区串台 → orphan
  const matchOtherWs = resolveRunSessionMatch({
    slug: 'topic-orphan',
    workspaceCwd: '/ws/research',
    activeSessionId: 's-active-a',
    sessions,
  })
  assert.equal(matchOtherWs.kind, 'orphan')

  // 磁盘归档无对应本地会话：返回 orphan，绝不伪造 activeSessionId 归属
  const matchMissing = resolveRunSessionMatch({
    slug: 'untracked-archive',
    workspaceCwd: '/ws/research',
    activeSessionId: 's-active-a',
    sessions,
  })
  assert.equal(matchMissing.kind, 'orphan')
})

// 负例留证 2026-11-28：BUG-482——同会话二次研究写入新 slug drt_run2 时，research-projection 未清空
// 上一场 drt_run1 的 deliveredPath，导致新 run 错误沿用旧终稿路径并停在 delivered 态。
// 红配方：去掉 writeSlug 切换不同新 slug 时重置 deliveredPath: null 的逻辑。
test('BUG-482 同会话写切到新 slug drt_run2 时清空旧 drt_run1 的 deliveredPath；写回同 slug 保留 deliveredPath', () => {
  let state = initialResearchRunState({ createdAt: 100 })
  state = applyResearchRunEvent(state, {
    type: 'tool/call',
    time: 200,
    data: { name: 'write', arguments: JSON.stringify({ file_path: 'drt_run1/question.md' }) },
  })
  state = applyResearchRunEvent(state, {
    type: 'deliverables/presented',
    time: 300,
    data: { files: [{ path: 'drt_run1/final/readable-v1.md' }] },
  })
  assert.equal(projectResearchRunView(state).phase, 'delivered')
  assert.equal(projectResearchRunView(state).deliveredPath, 'drt_run1/final/readable-v1.md')

  // 负控：同 slug 再写文件保持 deliveredPath 与状态引用不变
  const sameSlugState = applyResearchRunEvent(state, {
    type: 'tool/call',
    time: 350,
    data: { name: 'write', arguments: JSON.stringify({ file_path: 'drt_run1/final.md' }) },
  })
  assert.equal(Object.is(sameSlugState, state), true, '写回同一 slug 不得清空 deliveredPath 或分配新 state')

  // 切到新 slug drt_run2：必须清空旧 deliveredPath，回到 running
  const run2State = applyResearchRunEvent(state, {
    type: 'tool/call',
    time: 400,
    data: { name: 'write', arguments: JSON.stringify({ file_path: 'drt_run2/question.md' }) },
  })
  const view2 = projectResearchRunView(run2State)
  assert.equal(view2.slug, 'run2')
  assert.equal(view2.phase, 'running')
  assert.equal(view2.deliveredPath, null, '同会话切到新 slug 必须清空上一场的 deliveredPath')
})
