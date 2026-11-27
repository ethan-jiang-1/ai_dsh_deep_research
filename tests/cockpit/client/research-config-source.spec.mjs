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
import { zh } from '../../../packages/deep-research-pack/src/client/locales.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
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

// 负例留证 2026-11-27：BUG-454——1280×720 视口下「换一条」Menu 未使用 portal，向下展开溢出底部视口被裁切。
// 红配方：从 methodPicker <Menu> 移除 portal 或 listClassName → 本例红。
test('BUG-454 ResearchConfigTab：换一条 Menu 必须启用 portal 与视口限高滚动 listClassName', () => {
  const text = readFileSync(CONFIG, 'utf8')
  const start = text.indexOf('const methodPicker =')
  assert.ok(start >= 0, '找不到 methodPicker')
  const slice = text.slice(start, start + 350)
  assert.match(slice, /<Menu[\s\S]*?\bportal\b/, 'methodPicker <Menu> 必须启用 portal 防止在 720p 下被底部裁切')
  assert.match(slice, /<Menu[\s\S]*?\blistClassName\s*=/, 'methodPicker <Menu> 必须传 listClassName 限制最大高度与内滚')
})
