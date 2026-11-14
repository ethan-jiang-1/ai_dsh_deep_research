// 负例留证 2026-11-14：BUG-136——探测脚本被历史宿主占住默认端口后自锁；修法 =
// 预收割失败 → freePort 临时端口 + finally 整组 SIGKILL。红配方：删 freePort 回落或
// finally 的 process.kill(-pid) → 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const src = readFileSync(join(ROOT, 'probes/behavior/defaults-probe.mjs'), 'utf8')

test('probe 端口冲突回落 + finally 整组收割（BUG-136）', () => {
  assert.match(src, /const freePort = async \(\)/)
  assert.match(src, /await reclaimPort\(port\)/)
  assert.match(src, /port = next/)
  assert.match(src, /} finally \{[\s\S]{0,200}process\.kill\(-booted\.child\.pid/)
  assert.match(src, /booted\.child\.kill\('SIGKILL'\)/)
})
