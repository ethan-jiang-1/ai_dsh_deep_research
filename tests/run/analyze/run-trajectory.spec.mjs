// run-trajectory.spec.mjs — 多角色研究轨迹体检纯核（run-trajectory-core.mjs）的 keyless 回归。
//
// 覆盖 5 类深研域非确定性 Smells 的正向触发与负向控制、missing-child 显性标记、
// 以及原生 web.log 时间窗切片。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeTrajectory,
  discoverExplicitChildSessionIds,
  discoverReferencedSessionIds,
  formatTrajectoryReport,
  sliceDeepResearchWebLog,
} from '../../../checks/lib/analyze/run-trajectory-core.mjs'

const ROOT_ID = 'session-11111111-1111-1111-1111-111111111111'
const CHILD_ID = '22222222-2222-2222-2222-222222222222'

function cleanRunSessions() {
  return [
    {
      sessionId: ROOT_ID,
      events: [
        { type: 'session', id: ROOT_ID, createdAt: 1000, agentPreset: 'lead', delegationDepth: 0 },
        { type: 'step/start', time: 1000, data: { turn: 1, step: 1 } },
        { type: 'tool/call', time: 1010, data: { step: 1, callId: 'c1', name: 'skill', arguments: JSON.stringify({ name: 'synthesis' }) } },
        { type: 'tool/call', time: 1020, data: { step: 1, callId: 'c2', name: 'team_task_create', arguments: JSON.stringify({ subject: 'W1' }) } },
        { type: 'tool/call', time: 1030, data: { step: 1, callId: 'c3', name: 'write', arguments: JSON.stringify({ file_path: 'drt_demo/findings.md' }) } },
        { type: 'tool/call', time: 1040, data: { step: 1, callId: 'c4', name: 'subagent', arguments: JSON.stringify({ agent_preset: 'critic' }) } },
        { type: 'tool/result', time: 1050, data: { step: 1, callId: 'c4', message: { content: [{ type: 'text', text: `child=${CHILD_ID}` }] } } },
        { type: 'assistant/message', time: 2000, data: { message: { content: [{ type: 'text', text: '共 10 张证据卡；7 supported、3 partially。' }] }, usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 900 } } },
        { type: 'goal/change', time: 2100, data: { operation: 'complete' } },
      ],
    },
    {
      sessionId: CHILD_ID,
      events: [
        { type: 'session', id: CHILD_ID, parentSession: ROOT_ID, createdAt: 1050, agentPreset: 'analyst', delegationDepth: 1 },
        { type: 'step/start', time: 1050, data: { turn: 1, step: 1 } },
        { type: 'tool/call', time: 1060, data: { step: 1, callId: 'a1', name: 'skill', arguments: JSON.stringify({ name: 'evidence-extraction' }) } },
        { type: 'tool/call', time: 1070, data: { step: 1, callId: 'a2', name: 'team_task_update', arguments: JSON.stringify({ task_id: 'task-1', action: 'complete' }) } },
        { type: 'tool/call', time: 1080, data: { step: 1, callId: 'a3', name: 'web_fetch', arguments: JSON.stringify({ url: 'https://example.com/ok' }) } },
        { type: 'tool/result', time: 1200, data: { step: 1, callId: 'a3', message: { content: [{ type: 'text', text: 'Fetched https://example.com/ok (HTTP 200)\n正常中文正文' }] } } },
        { type: 'tool/call', time: 1250, data: { step: 1, callId: 'a4', name: 'write', arguments: JSON.stringify({ file_path: 'drt_demo/evidence/t1.md' }) } },
      ],
    },
  ]
}

test('干净多角色 run：零 Smells，准确聚合拓扑、缓存率与引用发现', () => {
  const sessions = cleanRunSessions()
  assert.deepEqual(discoverReferencedSessionIds(sessions[0].events, ROOT_ID), [CHILD_ID])
  const report = analyzeTrajectory({
    rootSessionId: ROOT_ID,
    sessions,
    bundleFacts: { slug: 'drt_demo', evidenceCount: 10, verdictCounts: { supported: 7, partially_supported: 3, unsupported: 0, unverifiable: 0, total: 10 } },
  })
  assert.equal(report.smells.length, 0)
  assert.equal(report.totals.sessions, 2)
  assert.equal(report.totals.steps, 2)
  assert.equal(report.totals.cacheHitRate, 0.9)
  assert.match(formatTrajectoryReport(report), /Smells \(0\)/)
})

test('正向触发全部 5 类深研域 Smells + missing-child 显性标记', () => {
  const report = analyzeTrajectory({
    rootSessionId: ROOT_ID,
    sessions: [
      {
        sessionId: ROOT_ID,
        events: [
          { type: 'session', id: ROOT_ID, createdAt: 1000, agentPreset: 'lead', delegationDepth: 0 },
          { type: 'step/start', time: 1000, data: { turn: 1, step: 1 } },
          // 未加载 synthesis 直接写 findings.md
          { type: 'tool/call', time: 1010, data: { step: 1, callId: 'w1', name: 'write', arguments: JSON.stringify({ file_path: 'drt_demo/findings.md' }) } },
          // 创建 2 个任务但都不闭合
          { type: 'tool/call', time: 1020, data: { step: 1, callId: 't1', name: 'team_task_create', arguments: JSON.stringify({ subject: 'W1' }) } },
          { type: 'tool/call', time: 1030, data: { step: 1, callId: 't2', name: 'team_task_create', arguments: JSON.stringify({ subject: 'W2' }) } },
          // 同 step 并发 2 个 subagent
          { type: 'tool/call', time: 1040, data: { step: 1, callId: 's1', name: 'subagent', arguments: JSON.stringify({ agent_preset: 'critic' }) } },
          { type: 'tool/call', time: 1045, data: { step: 1, callId: 's2', name: 'subagent', arguments: JSON.stringify({ agent_preset: 'critic' }) } },
          // 写盘并发冲突
          { type: 'tool/call', time: 1050, data: { step: 1, callId: 'e1', name: 'edit', arguments: JSON.stringify({ file_path: 'drt_demo/journal.md' }) } },
          { type: 'tool/result', time: 1055, data: { step: 1, callId: 'e1', isError: true, message: { content: [{ type: 'text', text: 'Error: cannot edit journal.md: file changed since it was read' }] } } },
          // 叙述数字与盘上不符
          { type: 'assistant/message', time: 2000, data: { message: { content: [{ type: 'text', text: '证据 48 张证据卡；8 supported、3 partially。' }] } } },
          { type: 'goal/change', time: 2100, data: { operation: 'complete' } },
        ],
      },
      {
        sessionId: CHILD_ID,
        events: [
          { type: 'session', id: CHILD_ID, parentSession: ROOT_ID, createdAt: 1100, agentPreset: 'analyst', delegationDepth: 1 },
          { type: 'step/start', time: 1100, data: { turn: 1, step: 1 } },
          // 10.1s 本地超时误判 WEB_ABORTED
          { type: 'tool/call', time: 10000, data: { step: 1, callId: 'f1', name: 'web_fetch', arguments: JSON.stringify({ url: 'https://www.eet-china.com/mp/a1.html' }) } },
          { type: 'tool/result', time: 20100, data: { step: 1, callId: 'f1', isError: true, message: { content: [{ type: 'text', text: 'Error: web fetch aborted' }] } } },
          // HTTP 200 GBK 乱码
          { type: 'tool/call', time: 21000, data: { step: 1, callId: 'f2', name: 'web_fetch', arguments: JSON.stringify({ url: 'https://www.c114.com.cn/a.html' }) } },
          { type: 'tool/result', time: 21500, data: { step: 1, callId: 'f2', message: { content: [{ type: 'text', text: 'Fetched https://www.c114.com.cn/a.html (HTTP 200)\n20\ufffd\ufffd\ufffd\ufffd\ufffd\ufffd' }] } } },
        ],
      },
      { sessionId: '33333333-3333-3333-3333-333333333333', events: [], missing: true },
    ],
    bundleFacts: { slug: 'drt_demo', evidenceCount: 49, verdictCounts: { supported: 7, partially_supported: 3, unsupported: 0, unverifiable: 0, total: 10 } },
    webLog: { status: 'absent' },
  })

  const codes = new Set(report.smells.map((s) => s.code))
  for (const expected of ['missing-skill', 'fetch-anomaly', 'orchestration-drift', 'write-conflict', 'count-mismatch', 'missing-child']) {
    assert.ok(codes.has(expected), `应检出 ${expected}，实际=${[...codes].join(',')}`)
  }
  assert.ok(report.smells.some((s) => s.code === 'fetch-anomaly' && s.severity === 'error' && /10100ms/.test(s.detail)))
  assert.ok(report.smells.some((s) => s.code === 'fetch-anomaly' && /U\+FFFD/.test(s.detail)))
  assert.equal(report.webLog.status, 'absent')
  assert.match(formatTrajectoryReport(report), /web-log: absent/)
})

test('web.log 切片仅保留 [deep-research:*] 且遵守时间窗过滤', () => {
  const sample = [
    '2026-11-28T10:00:00Z [deep-research:fetch-fallback] event=fallback_ok url=https://a.test/old',
    '2026-11-28T16:10:00Z [deep-research:fetch-fallback] event=fallback_fail url=https://a.test/in',
    '2026-11-28T16:10:05Z unrelated noise line',
    '[deep-research:defaults] event=command_ok op=set detail=ok revision=2',
  ].join('\n')
  const startMs = Date.parse('2026-11-28T16:00:00Z')
  const endMs = Date.parse('2026-11-28T16:30:00Z')
  const kept = sliceDeepResearchWebLog(sample, { startMs, endMs })
  assert.equal(kept.length, 2)
  assert.match(kept[0], /a\.test\/in/)
  assert.match(kept[1], /event=command_ok/)
})

test('discoverExplicitChildSessionIds 仅认原生 subagent/catalog 与 team/member，不误吸网页随机 UUID', () => {
  const webUuid = '99999999-9999-9999-9999-999999999999'
  const teamChild = '44444444-4444-4444-4444-444444444444'
  const events = [
    { type: 'subagent/catalog', data: { childId: CHILD_ID } },
    { type: 'team/member', data: { member: { id: teamChild, name: 'scout-1' } } },
    { type: 'tool/result', data: { message: { content: [{ type: 'text', text: `random page uuid ${webUuid}` }] } } },
  ]
  assert.deepEqual(discoverExplicitChildSessionIds(events, ROOT_ID), [CHILD_ID, teamChild])
  assert.deepEqual(discoverReferencedSessionIds(events, ROOT_ID), [CHILD_ID, teamChild, webUuid])
})

test('实跑盲区回归：read SKILL.md 回退、跨 turn 同 step subagent 不误报、原生 team/task 权威状态优先', () => {
  const report = analyzeTrajectory({
    rootSessionId: ROOT_ID,
    sessions: [
      {
        sessionId: ROOT_ID,
        events: [
          { type: 'session', id: ROOT_ID, createdAt: 1000, agentPreset: 'lead', delegationDepth: 0 },
          // Turn 1 step 2 与 Turn 2 step 2 各派 1 个 subagent — 跨 turn 同 step 不应误报并发
          { type: 'tool/call', time: 1010, data: { turn: 1, step: 2, callId: 's1', name: 'subagent', arguments: '{}' } },
          { type: 'tool/call', time: 1020, data: { turn: 2, step: 2, callId: 's2', name: 'subagent', arguments: '{}' } },
          // 原生 team/task 权威终态：task-1 completed、task-2 cancelled → 均为已闭合，即使工具调用里没有 update
          { type: 'team/task', time: 1030, data: { task: { id: 'task-1', revision: 1, subject: 'W1', status: 'pending' } } },
          { type: 'team/task', time: 1040, data: { task: { id: 'task-1', revision: 2, subject: 'W1', status: 'completed' } } },
          { type: 'team/task', time: 1050, data: { task: { id: 'task-2', revision: 1, subject: 'W2', status: 'cancelled' } } },
          { type: 'goal/change', time: 1060, data: { operation: 'complete' } },
        ],
      },
      {
        sessionId: CHILD_ID,
        events: [
          { type: 'session', id: CHILD_ID, parentSession: ROOT_ID, createdAt: 1010, agentPreset: 'lead', delegationDepth: 1 },
          // 通过 read SKILL.md 回退加载 lead-mapping，再写 leads.md — 不应误报 missing-skill
          { type: 'tool/call', time: 1015, data: { turn: 1, step: 1, callId: 'r1', name: 'read', arguments: JSON.stringify({ file_path: '/pkg/presets/scout/skills/lead-mapping/SKILL.md' }) } },
          { type: 'tool/call', time: 1025, data: { turn: 1, step: 2, callId: 'w1', name: 'write', arguments: JSON.stringify({ file_path: 'drt_demo/leads.md' }) } },
        ],
      },
    ],
  })
  assert.deepEqual(report.sessions[1].loadedSkills, ['lead-mapping'])
  assert.equal(report.smells.length, 0, `不应误报 Smells，实际=${JSON.stringify(report.smells)}`)
})
