// start-card — 产品首屏起步卡纯判据：有用户消息 / 有 drt_* 就收起，否则显示。
// 反证：删掉 userMessage 短路 / 删掉 drt_ 前缀判断 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shouldShowStartCard } from '../../packages/deep-research-pack/src/lib/start-card.ts'

// 2026-11-02 首启实测：StartCard 以空路径列工作区根，workspaceFiles.list 判
// gateway/bad-request 并打 console.error，run-driver 的 console-clean 因此红。
// 根路径必须映射成 '.'（与 MethodLibraryView / ResearchConfigTab 同一约定）。
test('StartCard 列工作区根用 "."（空路径会被 workspaceFiles 拒）', () => {
  const source = readFileSync(join(fileURLToPath(new URL('../..', import.meta.url)),
    'packages/deep-research-pack/src/client/StartCard.tsx'), 'utf8')
  assert.doesNotMatch(source, /listDir\(sessionId, ''/, 'StartCard 又用空路径列根目录——首启会打 console.error 并让 console-clean 红')
  assert.match(source, /listDir\(sessionId, '\.'/, 'StartCard 没有用 "." 列工作区根')
})

test('blank 工作区 + 无用户消息 → 显示', () => {
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [] }), true)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'AGENTS.md' }, { name: 'templates' }] }), true)
})

test('有 drt_* → 收起', () => {
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'drt_probe' }] }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'AGENTS.md' }, { name: 'drt_x' }] }), false)
})

test('有用户消息 → 收起（即使还没有 run）', () => {
  assert.equal(shouldShowStartCard({ hasUserMessage: true, entries: [] }), false)
  assert.equal(shouldShowStartCard({ hasUserMessage: true, entries: [{ name: 'drt_x' }] }), false)
})

test('非 drt_ 前缀不误伤（draft/ 不是 run bundle）', () => {
  assert.equal(shouldShowStartCard({ hasUserMessage: false, entries: [{ name: 'drafts' }, { name: 'drtish.md' }] }), true)
})
