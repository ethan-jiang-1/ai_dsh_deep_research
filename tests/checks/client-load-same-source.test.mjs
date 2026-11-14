// 负例留证 2026-11-14：BUG-003 / BUG-034——client-load 曾手抄锚点公式、私有会话定位器；退役后
// 必须直调 hitl-fold.deriveAnchors 与 web-ui-nav.openSessionById。红配方：把 import 换成
// 本地 `const deriveAnchors = ...` 或删 openSessionById 调用 → 本例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

test('client-load 直调 hitl-fold.deriveAnchors，不手抄锚点公式（BUG-003）', () => {
  const src = read('scripts/smoke/client-load.entry.mjs')
  assert.match(src, /import \{[^}]*deriveAnchors[^}]*\} from ['"][^'"]*hitl-fold(?:\.ts)?['"]/)
  assert.match(src, /deriveAnchors\(/)
  assert.doesNotMatch(src, /(?:const|function)\s+deriveAnchors\b/)
  assert.doesNotMatch(src, /delivered\s*\|\|\s*tailAskPending/)
})

test('client-load 会话定位走 web-ui-nav.openSessionById，不赖默认视图（BUG-034）', () => {
  const src = read('scripts/smoke/client-load.entry.mjs')
  assert.match(src, /import \{[^}]*openSessionById[^}]*\} from ['"][^'"]*web-ui-nav/)
  assert.match(src, /openSessionById\(/)
  assert.doesNotMatch(src, /(?:const|function)\s+(?:openSessionByRowKey|clickRowByText)\b/)
})
