// config feed 会话切换：reload epoch + 交互态复位（BUG-086/108）。
// 负例留证 2026-11-12：BUG-086/108——旧 reload 无 session 守卫会回写新会话；切会话不清回执。
// 还原法 = 删 isReloadCurrent 的 session 比较 / 删 effect 里的 state 复位。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isReloadCurrent } from '../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('BUG-086 reload epoch：旧 session 或旧序号都不算当前', () => {
  assert.equal(isReloadCurrent({ current: 's2', seq: 3 }, 's2', 3), true)
  assert.equal(isReloadCurrent({ current: 's2', seq: 3 }, 's1', 3), false)
  assert.equal(isReloadCurrent({ current: 's2', seq: 3 }, 's2', 2), false)
})

test('BUG-086/108 接线：readLibrary 全量读 + 切会话复位交互态', () => {
  const source = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/research-config/useConfigFeed.ts'), 'utf8')
  assert.match(source, /props\.readLibrary\(sid, LIBRARY_PATH/, '配置页签必须走分页 readLibrary')
  for (const line of ['setReceiptBase(null)', 'setReceiptDiff(null)', 'setReplied(false)', 'setDetail(null)', 'setMenuFor(null)', 'setConfirmDelete(null)', 'setSwitchOpen(false)', 'setSending(false)']) {
    assert.ok(source.includes(line), `切会话必须复位 ${line}`)
  }
  assert.match(source, /isReloadCurrent\(epochRef\.current, sid, seq\)/, 'await 后必须有 epoch 守卫')
})
