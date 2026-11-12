// 状态页数据装配：HITL2 锚点的交付事实 = present 见证，不是 final.md 在场（BUG-094）；
// 切会话清空旧 journal 投影（BUG-087）。
// 负例留证 2026-11-12：BUG-094——修复前 deriveAnchors 收 final.md 在场即判 HITL2 passed；
// BUG-087——修复前 useStatusFeed 切会话不重置 journalEvents/rows/journalSeen。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deriveAnchors } from '../../packages/deep-research-pack/src/lib/hitl-fold.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('BUG-094 HITL2 锚点：final.md 在场但 present 缺席 → 不是 passed', () => {
  const anchors = deriveAnchors([], { question: true, delivered: false })
  assert.equal(anchors.find((a) => a.key === 'anchor-2')?.state, 'upcoming')
  const presented = deriveAnchors([], { question: true, delivered: true })
  assert.equal(presented.find((a) => a.key === 'anchor-2')?.state, 'passed')
})

test('BUG-087 接线：切会话清空 journalEvents/rows/journalSeen', () => {
  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'), 'utf8')
  for (const line of ['setJournalEvents([])', 'setRows([])', 'setJournalSeen(false)', 'setHitl({ pending: false, since: undefined })']) {
    assert.ok(source.includes(line), `切会话必须清 ${line}`)
  }
  assert.match(source, /delivered: delivery !== null/, 'HITL2 交付事实必须用 present 见证')
})
