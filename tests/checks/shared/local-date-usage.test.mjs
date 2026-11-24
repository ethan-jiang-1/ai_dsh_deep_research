// 人读日期口径守卫（BUG-416）：`toISOString().slice(0, 10)` 是**机器时间戳**切片，不是本地日。
//
// 为什么需要：本地 00:00–08:00（UTC+8）窗口里 UTC 日期是前一天——§Decisions 的拍板行会记成
// 昨天，append-only 次序被打破（BUG-017 的失败形态）。本仓已有唯一正本
// `checks/lib/shared/local-date.mjs` 的 `localDateStr()`；本守卫把「再写一次 UTC 切片」变成红。
//
// 负例留证 2026-11-24：BUG-416——run-kickoff 的 closing provenance 用
// `new Date().toISOString().slice(0, 10)`，与同批 hitl-answer 的 `localDateStr()` 差一天。
// 红配方：把 run-kickoff 改回 UTC 切片 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
/** 允许出现 UTC 切片的唯一文件：local-date.mjs 自己（对照实现）。 */
const ALLOWED = new Set(['checks/lib/shared/local-date.mjs'])
const UTC_SLICE = /toISOString\(\)\.slice\(0,\s*10\)/g

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/\.(mjs|ts|tsx)$/.test(entry.name)) out.push(path)
  }
  return out
}

test('BUG-416：tools/ 与 checks/ 不得用 UTC 切片冒充人读日期（唯一正本 = localDateStr）', () => {
  const offenders = []
  for (const dir of ['tools', 'checks']) {
    for (const path of walk(join(ROOT, dir))) {
      const rel = relative(ROOT, path).split('\\').join('/')
      if (ALLOWED.has(rel)) continue
      const text = readFileSync(path, 'utf8')
      for (const match of text.matchAll(UTC_SLICE)) {
        const line = text.slice(0, match.index).split('\n').length
        offenders.push(`${rel}:${line}`)
      }
    }
  }
  assert.deepEqual(offenders, [], `这些位置用 UTC 切片写人读日期（应改 localDateStr()）：\n${offenders.join('\n')}`)
})

test('BUG-416 接线：run-kickoff 的 closing provenance 走 localDateStr', () => {
  const source = readFileSync(join(ROOT, 'tools', 'channel', 'run-kickoff.mjs'), 'utf8')
  assert.match(source, /localDateStr/, 'run-kickoff 未接入 localDateStr')
  assert.doesNotMatch(source, UTC_SLICE, 'run-kickoff 仍用 UTC 切片写日期')
})

test('BUG-416 判据：固定时刻下本地日 ≠ UTC 日（守卫的反证基础）', async () => {
  const { localDateStr } = await import('../../../checks/lib/shared/local-date.mjs')
  // 2026-11-24T00:30+08:00 = 2026-11-23T16:30Z：UTC 切片给 11-23，本地日应为 11-24。
  const at = new Date('2026-11-23T16:30:00Z')
  assert.equal(localDateStr(at, 'Asia/Shanghai'), '2026-11-24')
  assert.equal(at.toISOString().slice(0, 10), '2026-11-23', 'UTC 切片在这里确实是前一天')
})
