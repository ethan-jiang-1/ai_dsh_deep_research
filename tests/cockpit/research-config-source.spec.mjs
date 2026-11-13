// research-config-source.spec.mjs — 「研究配置」页签的 keyless 源面合同。
//
// 为什么读源码而不是渲染：该页签依赖 primitives 的 CSS 模块，tsx 测试加载器无法解析 .css；
// 组件行为归 client-load 真机档。这里只钉住「run 前有选方法入口、不再指向死卡片菜单」这两个
// 用户可观察承诺，防止 COMPACT 分支回退时静默丢入口。
// 反证：删掉「选方法（发给 Lead）」或把 no-run 文案改回「⋯ → 用于本次研究」→ 本例红。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zh } from '../../packages/deep-research-pack/src/client/locales.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONFIG = join(ROOT, 'packages', 'deep-research-pack', 'src', 'client', 'ResearchConfigTab.tsx')

test('ResearchConfigTab：run 前有选方法入口，不再指向死卡片菜单', () => {
  const text = readFileSync(CONFIG, 'utf8')
  // 文案已迁到 locales（BUG-055）：组件侧钉 key 接线，文案侧钉 zh 值在场。
  assert.match(text, /props\.t\('pickMethodForLead'\)/, 'no-run 态必须有可点的选方法入口')
  assert.match(text, /methodPicker\(props\.t\('switchMethod'\)\)/, 'recorded 态的换一条应复用同一 picker')
  assert.equal(zh.pickMethodForLead, '选方法（发给 Lead）')
  assert.equal(zh.switchMethod, '换一条')
  assert.doesNotMatch(text, /点任意一条的 ⋯/, 'no-run 文案不能指向未渲染的卡片菜单')
})
