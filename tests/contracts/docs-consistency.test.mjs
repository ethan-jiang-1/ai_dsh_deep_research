// docs-consistency 回归 — 跨文档/盘上的少数高价值事实一致性（keyless 纯 fs）。
// 2026-10-20 审计 P1-1/P1-2 的机械面：不再让"同一事实两个家"只靠人眼。
// 只钉可以稳定判真假的几条；语义质量仍归交付自审。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
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
  const seedMap = { 'AGENTS.md': '手册', 'NODES.md': 'NODES', 'question-patterns.md': '判型库', 'method-library.md': '偏好库', 'templates': '模板', 'seed.json': '清单' }
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

// 研究配置面板形态：源码渲染什么，发布物就读到什么。
// 2026-10-21 管理迁移（commit 9456199）把库列表/内置卡/领域示范/管理回执迁到主界面「方法库」tab，
// 页签默认 `COMPACT = true` 只留摘要面；pack README（随 npm 发布）与 D25 台账没跟上，继续描述四区
// ——发布物与源码**同向不同事**，读者据此会认定"功能缺失"，而旧实现完整躺在 COMPACT=false 分支里，
// 「翻开关」看起来既便宜又正确。结构与墓碑在门禁射程内（md-links/gate-ledger），
// 「描述 vs 渲染」没有守门，故在此钉住：COMPACT 默认态 ⇒ README 不得出现已迁走的四区词。
// 负例留证 2026-10-27：本测试首跑即红（README:286-288 命中 四区/内置打法/我的偏好库/底线条 四词）；
// 改 README 为摘要面 → 绿。反向：把 COMPACT 改 false 则该断言自失效（回滚态由设计文档另行描述）。
// 构成索引的"描述即存在"（2026-10-28 Phase E）：design/40 §2 的窄索引表只写**主文件名**
// （完整路径在各件小节的「**文件**：」行）。索引是最常被扫的一行，主文件名漂了（改名/删除）
// 就没有任何门禁发现——cockpit-doc-registry 只查完整路径在正本里出现过。
// 负例留证 2026-10-28：把某行的 ResearchStatusTab.tsx 改成 ResearchStatusPane.tsx → 红。
test('构成索引：design/40 §2 索引行点名的主文件名在盘上存在', () => {
  const text = read('docs/design/40-research-cockpit.md')
  const lines = text.split('\n')
  const hdr = lines.findIndex((l) => l.trim().startsWith('| 件 | 文件 | 一句话 | 详情 |'))
  assert.ok(hdr >= 0, 'design/40 §2 缺构成索引表头')
  const rows = []
  for (let i = hdr + 2; i < lines.length && lines[i].startsWith('|'); i += 1) rows.push(lines[i])
  assert.ok(rows.length >= 10, `构成索引行数异常少（${rows.length}）——防空语料`)
  const dirs = ['packages/deep-research-pack/src/client', 'packages/deep-research-pack/src/lib', 'packages/deep-research-pack/src']
  const existsUnder = (name) => dirs.some((d) => existsSync(join(ROOT, d, name)))
    || existsSync(join(ROOT, 'packages/deep-research-pack', name))
    // 递归：子目录里的同名文件也算（research-graph/NodeCard.tsx 这类只写 basename）
    || dirs.some((d) => readdirSync(join(ROOT, d), { recursive: true })
      .some((f) => typeof f === 'string' && f.split('/').pop() === name))
  const missing = []
  for (const row of rows) {
    const cell = (row.split('|')[2] ?? '').trim()
    const names = [...cell.matchAll(/[A-Za-z][\w.-]*\.(?:tsx|ts|js)\b/g)].map((m) => m[0])
    for (const name of new Set(names)) if (!existsUnder(name)) missing.push(`${row.split('|')[1].trim()} → ${name}`)
  }
  assert.deepEqual(missing, [], `构成索引点名了盘上不存在的文件（改名/删除后没更新索引）：${missing.join('、')}`)
})

test('文档地图：docs/ 下每个 tracked .md 都被 00-index 文档地图点名（新增不登记 = 红）', () => {
  const index = read('docs/00-index.md')
  const start = index.indexOf('## 文档地图')
  const end = index.indexOf('## 决策台账')
  assert.ok(start >= 0 && end > start, '00-index 缺「## 文档地图」节——本断言的判据源消失')
  const map = index.slice(start, end)
  const docs = readdirSync(join(ROOT, 'docs'), { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.md'))
    .map((f) => f.replaceAll('\\', '/'))
    .filter((f) => f !== '00-index.md')
  assert.ok(docs.length >= 15, `防空语料：docs/ 下 .md 过少（${docs.length}）`)
  const missing = docs.filter((rel) => !map.includes(rel)).sort()
  assert.deepEqual(missing, [],
    `文档地图漏登记：${missing.join('、')}——新文档要在 00-index §文档地图 有一行（按需加载的入口）；`
    + '只放在目录里 = fresh agent 找不到')
})

// Fresh-agent 入口探针（2026-10-28，只读）：00-index 的"开跑前置"漏了 vendor 构建与工作区注册，
// guides/60 的"纯文档"行漏了 entry-chain-probe 条件，AGENTS 的"最小集 1–3"没指向第 4 步。
// 这三处是 fresh agent 会照做的导航事实；措辞可改，但关键义务不能丢。
test('入口链导航合同：开跑前置含 vendor 构建/工作区注册；纯文档行指向入口链探针；最小集指向第 4 步', () => {
  const index = read('docs/00-index.md')
  const preStart = index.indexOf('**开跑前置**')
  const preEnd = index.indexOf('**歧义裁定**')
  assert.ok(preStart >= 0 && preEnd > preStart, '00-index 缺「开跑前置」/「歧义裁定」边界')
  const pre = index.slice(preStart, preEnd)
  assert.ok(pre.includes('vendor-build.sh'), '开跑前置漏 vendor 构建——fresh clone 会在 boot 自检红')
  assert.ok(pre.includes('research-workspace') && pre.includes('已注册'), '开跑前置漏工作区注册——研究手册不会注入')
  assert.ok(pre.includes('端口空闲'), '开跑前置漏端口（3083 被占时 boot 只会 fail-loud，不会自己换口）')
  assert.ok(pre.includes('guides/60 §2'), '开跑前置的 source 清单应指向 guides/60 §2（命令/前置唯一 owner）')
  const guide = read('docs/guides/60-dev-loop.md')
  const row = guide.split('\n').find((l) => l.includes('| 纯文档 / 卫生 |'))
  assert.ok(row !== undefined, 'guides/60 缺「纯文档 / 卫生」行')
  assert.ok(row.includes('entry-chain-probe'), '纯文档行漏 AGENTS/入口链改动时的探针条件（§4 有、路由表没有 = 两套说法）')
  assert.ok(guide.includes('根/子树 AGENTS 或入口链'), '§4 的探针触发词与路由表不一致（docs/AGENTS vs AGENTS/入口链）')
  const agents = read('AGENTS.md')
  assert.ok(agents.includes('改仓任务的验收/收尾按第 4 步'), 'AGENTS 最小集未指向第 4 步——fresh agent 会停在 1–3')
  assert.ok(agents.includes('guides/60 命令/前置'), 'AGENTS 的 source 清单 owner 应指向 guides/60 命令/前置（scripts/README 只申报凭据/调用模式）')
  const evalText = read('docs/evaluation.md')
  assert.ok(evalText.includes('node --import tsx/esm scripts/smoke/client-load-smoke.mjs'), 'evaluation 的 client-load 命令缺 tsx（直接 node 会在 .ts import 处失败）')
  assert.ok(!evalText.includes('`node scripts/smoke/client-load-smoke.mjs`'), 'evaluation 仍有不带 --import tsx/esm 的 client-load 命令')
})

test('研究配置面板形态：COMPACT 默认态下 README 不描述已迁走的管理四区（2026-10-27 卫生轮）', () => {
  const tab = read('packages/deep-research-pack/src/client/ResearchConfigTab.tsx')
  const compact = /const COMPACT = true/.test(tab)
  assert.ok(/const COMPACT = (true|false)/.test(tab), 'ResearchConfigTab.tsx 缺 COMPACT 开关——本断言的判据源消失')
  if (!compact) return // 回滚态：管理块渲染中，README 的四区描述与之一致，不再断言
  const readme = read('packages/deep-research-pack/README.md')
  for (const term of ['四区', '内置打法', '我的偏好库', '底线条']) {
    assert.ok(!readme.includes(term), `COMPACT=true（四区不渲染）但 pack README 仍写「${term}」——发布物与源码不同事；同步为摘要面或改 COMPACT 前先改 README`)
  }
})
