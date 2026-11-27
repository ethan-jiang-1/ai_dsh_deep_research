// docs-consistency 回归 — 跨文档/盘上的少数高价值事实一致性（keyless 纯 fs）。
// 2026-10-20 审计 P1-1/P1-2 的机械面：不再让"同一事实两个家"只靠人眼。
// 只钉可以稳定判真假的几条；语义质量仍归交付自审。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

test('归档路径三处一致：archive/drt_<slug>/（2026-10-20 审计 P1-2 反证）', () => {
  const handbook = read('packages/deep-research-pack/content/manual.md')
  const design = read('docs/contracts/data-model.md')
  const guide = read('docs/guides/run-ops.md')
  for (const [rel, text] of [['packages/deep-research-pack/content/manual.md', handbook], ['docs/contracts/data-model.md', design], ['docs/guides/run-ops.md', guide]]) {
    assert.ok(text.includes('archive/drt_<slug>/'), `${rel} 未写 archive/drt_<slug>/——归档目录名以盘上为准`)
  }
  assert.ok(!/archive\/<slug>/.test(guide), 'guides/run-ops.md 仍出现 archive/<slug>（盘上是 drt_<slug>）')
})

test('开发技能清单覆盖盘上目录（2026-10-20 审计 P1-1 反证）', () => {
  const skills = readdirSync(join(ROOT, '.agents', 'skills'))
    .filter((name) => statSync(join(ROOT, '.agents', 'skills', name)).isDirectory())
  assert.ok(skills.length > 0, '防空语料：.agents/skills 零目录')
  const guide = read('docs/guides/dev-loop.md')
  for (const name of skills) assert.ok(guide.includes(name), `guides/dev-loop.md 未路由技能 ${name}——盘上有而文档不可发现`)
})

// 负例留证 2026-10-21：六维卫生轮 维度4 M1——本测试首跑即红：research-workspace 根的
// method-library.md 与 _abandoned/、pack 种子的"偏好库"类别均缺席根 AGENTS 布局块
//（BUG-042 于 2026-10-19 新增偏好库种子后布局枚举未跟上）。红 → 补布局枚举 → 绿；
// 此后工作区根实体契约新增而无布局行 = 常驻红（枚举漂移的机械防线，同"技能清单
// 覆盖盘上目录"先例）。
//
// 2026-11-03：**不再扫本机 research-workspace/**。`drt_*`/`archive/`/`_abandoned/`/
// `method-library.md` 是 gitignored 运行态；CI fresh clone 只有 tracked 的 `drafts/`，
// 扫盘会把 keyless 回归绑到开发机现场（实测 CI 红：根实体 1 < 5）。契约以常量枚举钉住，
// 只对 tracked 的 `drafts/` 做存在性校验——运行区不参与 L0（checks/AGENTS 范围纪律）。
const WORKSPACE_ROOT_ENTITIES = ['method-library.md', 'drt_<slug>', 'archive/', '_abandoned/', 'drafts/']
test('根 AGENTS 布局表覆盖工作区根实体与 pack 种子（2026-10-21 卫生轮，BUG-042）', () => {
  const agents = read('AGENTS.md')
  const start = agents.indexOf('## 布局')
  assert.ok(start >= 0, 'AGENTS.md 缺「## 布局」节')
  const next = agents.indexOf('\n## ', start + 1)
  const layout = agents.slice(start, next === -1 ? undefined : next)
  assert.ok(layout.includes('| 路径 |'), 'AGENTS.md 布局节须采用可点击 GFM 表格')
  assert.ok(WORKSPACE_ROOT_ENTITIES.length >= 5, '防空语料：工作区根实体契约过少')
  for (const name of WORKSPACE_ROOT_ENTITIES) {
    assert.ok(layout.includes(name), `根布局未点名 research-workspace/${name}——契约实体必须进布局枚举`)
  }
  assert.ok(existsSync(join(ROOT, 'research-workspace', 'drafts')), 'tracked 的 research-workspace/drafts 不在场')
  // pack 内容：content/ 是随包只读的研究手册与模板（D40；不再有 workspace/ 种子）
  const contentRoot = join(ROOT, 'packages', 'deep-research-pack', 'content')
  const entries = readdirSync(contentRoot).filter((n) => !n.startsWith('.'))
  assert.ok(entries.includes('manual.md'), 'content/ 缺研究手册 manual.md')
  assert.ok(entries.includes('templates'), 'content/ 缺 run 模板目录')
  const packLine = layout.split('\n').find((l) => l.includes('packages/deep-research-pack/'))
  assert.ok(packLine, '布局表缺 packages/deep-research-pack/ 行')
  for (const word of ['content/', '研究手册', '模板']) {
    assert.ok(packLine.includes(word), `布局行未点名「${word}」（content/ 是随包只读内容）`)
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
// 构成索引的"描述即存在"（2026-10-28 Phase E）：contracts/client-ui.md §2 的窄索引表只写**主文件名**
// （完整路径在各件小节的「**文件**：」行）。索引是最常被扫的一行，主文件名漂了（改名/删除）
// 就没有任何门禁发现——cockpit-doc-registry 只查完整路径在正本里出现过。
// 负例留证 2026-10-28：把某行的 ResearchStatusTab.tsx 改成 ResearchStatusPane.tsx → 红。
test('构成索引：contracts/client-ui.md §2 索引行点名的主文件名在盘上存在', () => {
  const text = read('docs/contracts/client-ui.md')
  const lines = text.split('\n')
  const hdr = lines.findIndex((l) => l.trim().startsWith('| 件 | 文件 | 一句话 | 详情 |'))
  assert.ok(hdr >= 0, 'contracts/client-ui.md §2 缺构成索引表头')
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
  const index = read('docs/README.md')
  const start = index.indexOf('## 文档地图')
  const end = index.indexOf('## 决策台账')
  assert.ok(start >= 0 && end > start, '00-index 缺「## 文档地图」节——本断言的判据源消失')
  const map = index.slice(start, end)
  const docs = readdirSync(join(ROOT, 'docs'), { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.md'))
    .map((f) => f.replaceAll('\\', '/'))
    .filter((f) => f !== 'README.md')
  assert.ok(docs.length >= 15, `防空语料：docs/ 下 .md 过少（${docs.length}）`)
  const missing = docs.filter((rel) => !map.includes(rel)).sort()
  assert.deepEqual(missing, [],
    `文档地图漏登记：${missing.join('、')}——新文档要在 00-index §文档地图 有一行（按需加载的入口）；`
    + '只放在目录里 = fresh agent 找不到')
})

// Fresh-agent 入口探针（2026-10-28，只读）：00-index 的"开跑前置"漏了 vendor 构建与工作区注册，
// guides/dev-loop.md 的"纯文档"行漏了 entry-chain-probe 条件，AGENTS 的"最小集 1–3"没指向第 4 步。
// 这三处是 fresh agent 会照做的导航事实；措辞可改，但关键义务不能丢。
test('入口链导航合同：开跑前置含 vendor 构建/工作区注册；纯文档行指向入口链探针；最小集指向第 4 步', () => {
  const index = read('docs/README.md')
  const preStart = index.indexOf('**开跑前置**')
  const preEnd = index.indexOf('**歧义裁定**')
  assert.ok(preStart >= 0 && preEnd > preStart, '00-index 缺「开跑前置」/「歧义裁定」边界')
  const pre = index.slice(preStart, preEnd)
  assert.ok(pre.includes('vendor-build.sh'), '开跑前置漏 vendor 构建——fresh clone 会在 boot 自检红')
  assert.ok(pre.includes('research-workspace') && pre.includes('已注册'), '开跑前置漏工作区注册——研究手册不会注入')
  assert.ok(pre.includes('端口空闲'), '开跑前置漏端口（3083 被占时 boot 只会 fail-loud，不会自己换口）')
  assert.ok(pre.includes('guides/dev-loop.md §2'), '开跑前置的 source 清单应指向 guides/dev-loop.md §2（命令/前置唯一 owner）')
  const guide = read('docs/guides/dev-loop.md')
  const row = guide.split('\n').find((l) => l.includes('| 纯文档 / 卫生 |'))
  assert.ok(row !== undefined, 'guides/dev-loop.md 缺「纯文档 / 卫生」行')
  assert.ok(row.includes('entry-chain-probe'), '纯文档行漏 AGENTS/入口链改动时的探针条件（§4 有、路由表没有 = 两套说法）')
  assert.ok(guide.includes('根/子树 AGENTS 或入口链'), '§4 的探针触发词与路由表不一致（docs/AGENTS vs AGENTS/入口链）')
  const agents = read('AGENTS.md')
  for (const hop of [
    'docs/architecture.md',
    'docs/README.md',
    'docs/AGENTS.md',
    'packages/deep-research-pack/AGENTS.md',
    'docs/guides/bootstrap.md',
    'docs/testing.md',
    'docs/guides/dev-loop.md',
  ]) {
    assert.ok(agents.includes(hop), `根 AGENTS 首屏缺少 1 跳直链：${hop}`)
  }
  assert.ok(agents.includes('口径 = guides/dev-loop.md §2'), 'AGENTS 的 source 清单 owner 应指向 guides/dev-loop.md §2（checks/README 只申报凭据/调用模式）')
  const evalText = read('docs/testing.md')
  assert.ok(evalText.includes('node --import tsx/esm checks/smoke/client-load.entry.mjs'), 'evaluation 的 client-load 命令缺 tsx（直接 node 会在 .ts import 处失败）')
  assert.ok(!evalText.includes('`node checks/smoke/client-load.entry.mjs`'), 'evaluation 仍有不带 --import tsx/esm 的 client-load 命令')
})

test('研究配置面板形态：COMPACT 默认态下 README 不描述已迁走的管理四区（2026-10-27 卫生轮）', () => {
  // 2026-11-03 G-13 拆分：COMPACT 开关随取数状态移入 useConfigFeed（页签体只消费返回值）。
  const feed = read('packages/deep-research-pack/src/client/research-config/useConfigFeed.ts')
  const compact = /const COMPACT = true/.test(feed)
  assert.ok(/const COMPACT = (true|false)/.test(feed), 'useConfigFeed.ts 缺 COMPACT 开关——本断言的判据源消失')
  if (!compact) return // 回滚态：管理块渲染中，README 的四区描述与之一致，不再断言
  const readme = read('packages/deep-research-pack/README.md')
  for (const term of ['四区', '内置打法', '我的偏好库', '底线条']) {
    assert.ok(!readme.includes(term), `COMPACT=true（四区不渲染）但 pack README 仍写「${term}」——发布物与源码不同事；同步为摘要面或改 COMPACT 前先改 README`)
  }
})

// 负例留证 2026-11-14：BUG-009 的回潮——guides/run-ops.md 曾写「被通道重启终局化」，与卡内实测
//（重启前后日志一字节不变，不补 turn/end）及运行技能「无终局化补写」相抵。
// 红配方：把 61 的句子改回「被通道重启终局化」→ 本例红。
test('通道重启不终局化挂起 ask：61 与运行技能同判（BUG-009）', () => {
  const guide = read('docs/guides/run-ops.md')
  const skill = read('.agents/skills/running-a-research-run/SKILL.md')
  assert.match(skill, /无终局化补写/, '运行技能必须写「无终局化补写」——机制权威')
  assert.doesNotMatch(guide, /被通道重启终局化/, 'guides/run-ops.md 不得写「被通道重启终局化」——重启不补 turn/end')
  assert.match(guide, /不会终局化/, 'guides/run-ops.md 必须明确挂起 ask 不会因重启终局化')
})

// 负例留证 2026-11-14：本测试首跑即红——检出三处真实 GFM 表格渲染断裂：
// ① docs/decisions.md:52/55（表内遗留空行导致 D40–D55 脱离表头退化为普通段落）；
// ② docs/architecture.md:66（表间插入正文段落导致末行脱离表头）；
// ③ docs/reference/discipline-matrix.md:190/198（表后缺空行被吞入上一表 + 二列表混入第三列被静默截断）。
test('GFM 表格完整性：docs/ 下所有表格必须带分隔行、列数一致且表后空行收口', () => {
  const docs = readdirSync(join(ROOT, 'docs'), { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.md'))
    .map((f) => `docs/${f.replaceAll('\\', '/')}`)
  assert.ok(docs.length >= 15, `防空语料：docs/ 下 .md 过少（${docs.length}）`)
  const delimRe = /^\|(?:\s*:?-+:\s*\||\s*:?-+\s*\|)+$/
  const countCols = (row) => {
    let s = row.trim()
    if (s.startsWith('|')) s = s.slice(1)
    if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
    let cols = 1
    for (let i = 0; i < s.length; i += 1) {
      if (s[i] === '|' && s[i - 1] !== '\\') cols += 1
    }
    return cols
  }
  const problems = []
  let tablesChecked = 0
  for (const rel of docs) {
    const cleaned = read(rel).replace(/<!--[\s\S]*?-->/g, (m) => '\n'.repeat((m.match(/\n/g) ?? []).length))
    const lines = cleaned.split('\n')
    let inFence = null
    for (let i = 0; i < lines.length; i += 1) {
      const t = lines[i].trim()
      const fm = /^(`{3,}|~{3,})/.exec(t)
      if (fm) {
        if (!inFence) inFence = fm[1][0]
        else if (t.startsWith(inFence.repeat(3)) && new RegExp(`^${inFence}+\\s*$`).test(t)) inFence = null
        continue
      }
      if (inFence) continue
      if (t.startsWith('|') && t.endsWith('|')) {
        const block = []
        while (i < lines.length) {
          const rt = lines[i].trim()
          if (rt.startsWith('|') && rt.endsWith('|')) { block.push({ lineNo: i + 1, text: rt }); i += 1 }
          else break
        }
        if (block.length < 2 || !delimRe.test(block[1].text)) {
          problems.push(`${rel}:${block[0].lineNo} 孤立表格行（缺表头分隔行，可能是表内混入空行或正文）`)
        } else {
          tablesChecked += 1
          const expectedCols = countCols(block[1].text)
          for (const r of block) {
            const c = countCols(r.text)
            if (c !== expectedCols) problems.push(`${rel}:${r.lineNo} 列数不一致（实得 ${c} 列，表头 ${expectedCols} 列）`)
          }
          if (i < lines.length) {
            const nextTrim = lines[i].trim()
            if (nextTrim !== '' && !/^(#{1,6}\s|>|[-*+]\s|\d+\.\s|<a\s|`{3,}|~{3,})/.test(nextTrim)) {
              problems.push(`${rel}:${i + 1} 表格紧接非空正文（缺空行会被 GFM 吞入上一张表）`)
            }
          }
        }
        i -= 1
      }
    }
  }
  assert.ok(tablesChecked >= 25, `防空语料：扫描到的表格过少（${tablesChecked}）`)
  assert.deepEqual(problems, [], `docs/ 存在 GFM 表格渲染断裂：\n${problems.join('\n')}`)
})

const ALLOWED_DOCS_BACKLOG_TARGETS = new Set([
  '_backlog/triggers.md',
  '_backlog/README.md',
  '_backlog/AGENTS.md',
  '_backlog/issues/README.md',
  '_backlog/bugs/README.md',
  '_backlog/research/README.md',
  '_backlog/methods/README.md',
])

/**
 * 检查 docs/ 下文档是否反向依赖 _backlog/_archived/** 或 _backlog/methods/<具名方法>（白名单仅放行
 * triggers.md 与各池入口 README/AGENTS）。跳过代码围栏。
 * @param {Array<{ rel: string, text: string }>} entries
 * @returns {string[]}
 */
export function checkDocsBacklogLinks(entries) {
  const violations = []
  for (const { rel, text } of entries) {
    const lines = text.split('\n')
    let inFence = null
    for (let i = 0; i < lines.length; i += 1) {
      const t = lines[i].trim()
      const fm = /^(`{3,}|~{3,})/.exec(t)
      if (fm) {
        if (!inFence) inFence = fm[1][0]
        else if (t.startsWith(inFence.repeat(3)) && new RegExp(`^${inFence}+\\s*$`).test(t)) inFence = null
        continue
      }
      if (inFence) continue
      for (const m of lines[i].matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
        const raw = m[1].split('#')[0]
        if (!raw || /^[a-z]+:\/\//i.test(raw) || raw.startsWith('mailto:')) continue
        const resolved = relative(ROOT, resolve(dirname(join(ROOT, rel)), raw)).replaceAll('\\', '/')
        if (!resolved.startsWith('_backlog/')) continue
        if (!ALLOWED_DOCS_BACKLOG_TARGETS.has(resolved)) {
          violations.push(`${rel}:${i + 1} -> ${resolved}`)
        }
      }
    }
  }
  return violations
}

test('单向依赖守卫：docs/ 禁止链接 _backlog/_archived/ 与 _backlog/methods/<具体方法>', () => {
  const docs = readdirSync(join(ROOT, 'docs'), { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.md'))
    .map((f) => `docs/${f.replaceAll('\\', '/')}`)
  assert.ok(docs.length >= 15, `防空语料：docs/ 下 .md 过少（${docs.length}）`)
  const entries = docs.map((rel) => ({ rel, text: read(rel) }))
  assert.deepEqual(checkDocsBacklogLinks(entries), [],
    'docs/ 应只依赖 notes/ 与源码，禁止反向链接 _backlog/_archived/ 或具体方法文件（仅限 triggers.md 与池入口）')
})

test('单向依赖守卫变异矩阵：白名单放行、越界与围栏内外判别准确', () => {
  const okEntries = [
    {
      rel: 'docs/contracts/client-ui.md',
      text: [
        '触发 = [triggers](../../_backlog/triggers.md)',
        '入口 = [README](../../_backlog/README.md) · [AGENTS](../../_backlog/AGENTS.md)',
        '方法索引 = [methods](../../_backlog/methods/README.md)',
        '```md',
        '[示例](../../_backlog/_archived/fixed_bugs/BUG-001.md)',
        '```',
      ].join('\n'),
    },
  ]
  assert.deepEqual(checkDocsBacklogLinks(okEntries), [])

  const badEntries = [
    {
      rel: 'docs/testing.md',
      text: [
        '[bug](../_backlog/_archived/fixed_bugs/BUG-001.md)',
        '[issue](../_backlog/_archived/settled_issues/2026-10-01-x.md)',
        '[research](../_backlog/_archived/research/topic/a.md)',
        '[method](../_backlog/methods/judgment-design.md)',
      ].join('\n'),
    },
    {
      rel: 'docs/guides/dev-loop.md',
      text: '[guard](../../_backlog/methods/class-level-guards.md#01-旧性质随变更继承)',
    },
  ]
  const hits = checkDocsBacklogLinks(badEntries)
  assert.equal(hits.length, 5)
  assert.match(hits[0], /_backlog\/_archived\/fixed_bugs\/BUG-001\.md/)
  assert.match(hits[3], /_backlog\/methods\/judgment-design\.md/)
  assert.match(hits[4], /_backlog\/methods\/class-level-guards\.md/)
})
