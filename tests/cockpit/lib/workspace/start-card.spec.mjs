// start-card — 意图优先首屏起步卡纯判据（D38 演进）：有用户消息即收起，空白新会话（含已有 drt_* 工作区）展示。
// 反证：删掉 userMessage 短路 / 破坏 countWorkspaceRuns 前缀判定 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countWorkspaceRuns, shouldShowStartCard } from '../../../../packages/deep-research-pack/src/lib/workspace/start-card.ts'

// 2026-11-02 首启实测：StartCard 以空路径列工作区根，workspaceFiles.list 判
// gateway/bad-request 并打 console.error，run-driver 的 console-clean 因此红。
// 根路径必须映射成 '.'（与 MethodLibraryView / ResearchConfigTab 同一约定）。
test('StartCard 列工作区根用 "."（空路径会被 workspaceFiles 拒）', () => {
  const source = readFileSync(join(fileURLToPath(new URL('../../../..', import.meta.url)),
    'packages/deep-research-pack/src/client/StartCard.tsx'), 'utf8')
  assert.doesNotMatch(source, /listDir\(sessionId, ''/, 'StartCard 又用空路径列根目录——首启会打 console.error 并让 console-clean 红')
  assert.match(source, /listDir\(sessionId, '\.'/, 'StartCard 没有用 "." 列工作区根')
})

test('blank 新会话（无用户消息）→ 显示（空工作区与已有 drt_* 回访工作区均显示意图卡）', () => {
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [] }), true)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'AGENTS.md' }, { name: 'templates' }] }), true)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'drt_probe' }] }), true)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'AGENTS.md' }, { name: 'drt_x' }] }), true)
})

test('有用户消息 → 收起（无论工作区是否已有 run）', () => {
  assert.equal(shouldShowStartCard({ hasUserMessage: true, entries: [] }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: true, entries: [{ name: 'drt_x' }] }), false)
})

test('DSH 原生会话态：同一会话首条发送/运行中/已有活跃目标/非空白/子会话/研究进行中均立刻收起', () => {
  const blankSession = {
    blank: true,
    promptAttempted: false,
    running: false,
    openState: 'open',
    pendingSubmissionCount: 0,
    hasActiveConversationTarget: false,
    isSubagent: false,
  }
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: blankSession }), true)
  // 首帧点击发送：promptAttempted 同步翻 true，即便 blank 尚未落盘也必须立刻收起
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: { ...blankSession, promptAttempted: true } }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: { ...blankSession, pendingSubmissionCount: 1 } }), false)
  // 对话已启动/运行中/有历史
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: { ...blankSession, running: true } }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: { ...blankSession, blank: false } }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: { ...blankSession, hasActiveConversationTarget: true } }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: { ...blankSession, summaryBlank: false } }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: { ...blankSession, hasResearchRunActivity: true } }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: { ...blankSession, isSubagent: true } }), false)
  // 历史回放未决态（settling）：openState=loading 且 summaryBlank 非 true 时不得闪现
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: { ...blankSession, openState: 'loading' } }), false)
  // 列表摘要已证明空白：loading 期间免闪烁直接显示
  assert.equal(shouldShowStartCard({ hasUserMessage: false, session: { ...blankSession, openState: 'loading', summaryBlank: true } }), true)
})

test('countWorkspaceRuns 只计 drt_ 前缀（不误伤 drafts / drtish.md）', () => {
  assert.equal(countWorkspaceRuns([{ name: 'drafts' }, { name: 'drtish.md' }]), 0)
  assert.equal(countWorkspaceRuns([{ name: 'drt_a' }, { name: 'AGENTS.md' }, { name: 'drt_b' }]), 2)
})
