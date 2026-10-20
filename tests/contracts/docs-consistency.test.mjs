// docs-consistency 回归 — 跨文档/盘上的少数高价值事实一致性（keyless 纯 fs）。
// 2026-10-20 审计 P1-1/P1-2 的机械面：不再让"同一事实两个家"只靠人眼。
// 只钉可以稳定判真假的几条；语义质量仍归交付自审。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

test('归档路径三处一致：archive/drt_<slug>/（2026-10-20 审计 P1-2 反证）', () => {
  const handbook = read('research-workspace/AGENTS.md')
  const design = read('docs/design/50-agent-loop-and-state.md')
  const guide = read('docs/guides/61-run-playbook.md')
  for (const [rel, text] of [['research-workspace/AGENTS.md', handbook], ['docs/design/50-agent-loop-and-state.md', design], ['docs/guides/61-run-playbook.md', guide]]) {
    assert.ok(text.includes('archive/drt_<slug>/'), `${rel} 未写 archive/drt_<slug>/——归档目录名以盘上为准`)
  }
  assert.ok(!/archive\/<slug>/.test(guide), 'guides/61 仍出现 archive/<slug>（盘上是 drt_<slug>）')
})

test('开发技能清单覆盖盘上目录（2026-10-20 审计 P1-1 反证）', () => {
  const skills = readdirSync(join(ROOT, '.agents', 'skills'))
    .filter((name) => statSync(join(ROOT, '.agents', 'skills', name)).isDirectory())
  assert.ok(skills.length > 0, '防空语料：.agents/skills 零目录')
  const guide = read('docs/guides/60-dev-loop.md')
  for (const name of skills) assert.ok(guide.includes(name), `guides/60 未路由技能 ${name}——盘上有而文档不可发现`)
})

// 负例留证 2026-10-21（六维卫生轮 维度4 M1）：本测试首跑即红——research-workspace 根的
// method-library.md 与 _abandoned/、pack 种子的"偏好库"类别均缺席根 AGENTS 布局块
//（BUG-042 于 2026-10-19 新增偏好库种子后布局枚举未跟上）。红 → 补布局枚举 → 绿；
// 此后盘上新增工作区根实体/种子而无布局行 = 常驻红（枚举漂移的机械防线，同"技能清单
// 覆盖盘上目录"先例）。
test('根 AGENTS 布局块覆盖工作区根实体与 pack 种子（2026-10-21 卫生轮）', () => {
  const agents = read('AGENTS.md')
  const section = agents.slice(agents.indexOf('## 布局'))
  assert.ok(section.includes('## 布局'), 'AGENTS.md 缺「## 布局」节')
  const fence = section.match(/```[^\n]*\n([\s\S]*?)```/)
  assert.ok(fence, 'AGENTS.md 布局节缺围栏块')
  const layout = fence[1]
  // 工作区根：盘上每个顶层实体（除点文件）必须在布局块点名；drt_* 以 drt_<slug> 形态点名
  const wsRoot = readdirSync(join(ROOT, 'research-workspace')).filter((n) => !n.startsWith('.'))
  assert.ok(wsRoot.length >= 5, `防空语料：research-workspace 根实体过少（${wsRoot.length}）`)
  for (const name of wsRoot) {
    if (name.startsWith('drt_')) {
      assert.ok(layout.includes('drt_<slug>'), '布局块未点名 drt_<slug>/（run bundle 位）')
    } else {
      assert.ok(layout.includes(name), `根布局未点名 research-workspace/${name}——盘上实体必须进布局枚举`)
    }
  }
  // pack 工作区种子：每个种子文件映射布局行的类别词（新种子无映射 = 红，先补映射再核对布局行）
  const seedMap = { 'AGENTS.md': '手册', 'NODES.md': 'NODES', 'question-patterns.md': '判型库', 'method-library.md': '偏好库', 'templates': '模板' }
  const seeds = readdirSync(join(ROOT, 'packages', 'deep-research-pack', 'workspace')).filter((n) => !n.startsWith('.'))
  assert.ok(seeds.length > 0, '防空语料：pack workspace 零种子')
  const wsLine = layout.split('\n').find((l) => l.includes('workspace/（工作区种子'))
  assert.ok(wsLine, '布局块缺 workspace/（工作区种子…）行')
  for (const seed of seeds) {
    const category = seedMap[seed]
    assert.ok(category, `pack workspace 种子 ${seed} 无类别映射——先在本测试补映射与布局行，再交付`)
    assert.ok(wsLine.includes(category), `布局行未点名种子类别「${category}」（${seed}）`)
  }
})
