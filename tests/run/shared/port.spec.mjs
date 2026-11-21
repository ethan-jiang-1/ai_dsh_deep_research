// port.spec.mjs — 端口解析正本（BUG-333–336）。反证：把校验换成 Number(raw) →
// 0/-1/1.5/1e3/abc 会被放行，本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePort } from '../../../checks/lib/shared/port.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

test('合法端口：1–65535 的十进制整数（含首尾空白与数字输入）', () => {
  for (const [raw, port] of [['3083', 3083], [' 3083 ', 3083], ['1', 1], ['65535', 65535], [3083, 3083]]) {
    assert.deepEqual(parsePort(raw), { ok: true, port }, String(raw))
  }
})

test('非法端口：0/负数/小数/科学计数/空/非数字/越界', () => {
  for (const raw of ['0', '-1', '1.5', '1e3', 'abc', '', '   ', '65536', '+1', '0x10', null, undefined]) {
    const result = parsePort(raw)
    assert.equal(result.ok, false, `必须拒绝 ${JSON.stringify(raw)}`)
    assert.match(result.error, /1–65535 的整数/)
    assert.ok(result.error.includes(JSON.stringify(raw)), '错误信息回显收到的值，便于定位入口')
  }
})

test('入口接线：四个入口都经 parsePort，不再直接 Number(端口参数)', () => {
  const entries = [
    'tools/channel/run-driver.mjs',
    'checks/smoke/cold-start.entry.mjs',
    'checks/smoke/snapshot-replay.entry.mjs',
    'checks/smoke/client-load.entry.mjs',
  ]
  for (const rel of entries) {
    const text = readFileSync(join(ROOT, rel), 'utf8')
    assert.match(text, /parsePort\(/, `${rel} 未接 parsePort`)
    assert.doesNotMatch(text, /Number\((?:PORT_ARG|process\.env\.COLD_START_PORT|arg\('port')\)/, `${rel} 又直接 Number 端口参数`)
  }
})
