#!/usr/bin/env node
// client-load 冒烟（client 面完成定义，keyless 档——起真 web 无模型调用）：headless 浏览器
// 加载真 web 页面，断言观察面 client 插件真的挂上。
//
// 为什么必须有它（company postmortem 0003 同款教训）：preset-smoke 只打 RPC 面（roster /
// session/create），**client 入口的 apply 抛错**（如重复 $mount、槽名拼错）只有浏览器能抓——
// 这类失败不静默，会把整个 Web UI 砖在 BootPage 错误屏。keyed 槽的 key 拼错则相反：静默
// 永不渲染——所以本冒烟除"零失败"外还断言**功能可见性**（页签可点、渐进面与活动流真渲染）。
//
// 断言 13+ 条（前置条件 + 渐进面硬断言 + 活动流）：① 页面无 "Failed to load plugins"；② console
// 无 `failed to apply loader entry`；③ 「研究状态」页签可见、可点，点开后步骤条七步 / 证据计数 /
// ✅ 已交付 / 问题行渲染（首场 run 真数据）——它证明 app 渲染完成且本包 client 入口成功 apply +
// keyed 槽体挂对 key；另有活动流断言（人性化行在场、原始事件类型名零残留）。
//
// 通道：源码域（--profile web --patch dev/research.overlay.yml，与 preset-smoke 真挂载档
// 同款——boot 起自本仓，行包名经根 node_modules 解析到 pack 源码树，浏览器经
// exports["./client"] 取已构建的 lib/client.js）。
// 前置：source dev/env.sh；pack 已构建（lib/client.js 在位——boot 前自检会拦）。
// 用法：node --import tsx/esm scripts/client-load-smoke.mjs [--port 3109] [--session <既有会话标题>]
// 前置（B-min 起）：dev home 里有至少一个**绑定 run bundle 的带历史会话**（跑过一场 run 即有——
// 渐进面断言的磁盘认证源；未绑定会话负样本可选，snapshot-replay 冒烟产生）。
//
// bundle 渐进面断言（2026-09-26 接通，根因链见 notes/archived/2026-09-26-bundle-face-wiring.md；
// 2026-09-28 起会话绑定——RFC right-pane-ux-debt：渐进面只跟本会话自己的 run）：
// 渐进面读**会话 journal 工具调用路径绑定的 bundle**（bundle-bind 谓词），位置=状态两个位置
// 都认（根=在飞 / archive/=已交付）。断言的磁盘认证源 = 磁盘侧扫出的最新绑定会话（跑过 run
// 即有），其 bundle 的 evidence 计数/交付态/问题行以盘上真值对账——不再自造探针 bundle。
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from './lib/env.mjs'
import { assertVendorArtifacts, ARTIFACT_REMEDY } from './lib/vendor-artifacts.mjs'
import { launchChromium, loadChromium } from './lib/playwright.mjs'
import { readSessionEvents } from './lib/run-state.mjs'
import { sessionBundleOf } from '../packages/deep-research-pack/src/lib/bundle-bind.ts'
import { deriveSteps } from '../packages/deep-research-pack/src/lib/run-fold.ts'
import { deriveAnchors, foldHitlPending } from '../packages/deep-research-pack/src/lib/hitl-fold.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '3109'))
// 既有会话默认 = 盘侧最新绑定会话（惰性解析——boundSession 在下方扫描；硬编码标题会
// 随会话积累腐烂，BUG-002 清扫轮实测假红）。--session 仍可显式指定。
const SESSION_TITLE_ARG = arg('session', null)
// 侧栏把**非当前会话所在的组折叠**（实测：只展开 active 组）——找行前先展开目标组。
const GROUP_TITLE = arg('group', 'harness-home')
const BOOT_TIMEOUT_MS = 120_000
const RENDER_TIMEOUT_MS = 60_000

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
if (home === null) {
  console.error('client-load-smoke: 未 source dev/env.sh（DSH_HOME 缺席）——先 source 再跑')
  process.exit(2)
}
const bin = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
if (!existsSync(bin)) {
  console.error(`client-load-smoke: 机制基线源码不在位（${bin}）`)
  process.exit(2)
}
// boot 前自检（RFC vendor-build-guard）：client 面尤其依赖 lib/client.js 与 vendor client 产物。
{
  const va = assertVendorArtifacts(ROOT)
  if (!va.ok) {
    console.error(`boot 前自检红：vendor 构建产物缺失（${va.missing.join('、')}）`)
    console.error(ARTIFACT_REMEDY)
    process.exit(2)
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── RPC（造"会话建在 research-workspace"的条件——渐进面断言的前提）──
let rpcSeq = 0
const rpc = async (base, cookie, endpoint, args) => {
  const res = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `cls-${++rpcSeq}`, method: endpoint, payload: { args } }),
  })
  const body = await res.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint} 失败：${JSON.stringify(body?.result?.error ?? body).slice(0, 200)}`)
  return body.result.value
}
const authenticate = async (base, token) => {
  const res = await fetch(`${base}/?token=${token}`, { redirect: 'manual' })
  const cookies = res.headers.getSetCookie?.() ?? []
  if (cookies.length === 0) throw new Error('token 交换没拿到 cookie')
  return cookies.map((c) => c.split(';')[0]).join('; ')
}

/** boot web（源码域 overlay 通道），等到启动横幅打印带 token 的 URL。 */
async function boot() {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx/esm', bin, '--profile', 'web', '--patch', join(ROOT, 'dev', 'research.overlay.yml'),
      '--', '--port', String(PORT), '--no-open'],
    { cwd: ROOT, env: scrubbedEnv({ DSH_HOME: home }), stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let output = ''
  const banner = new Promise((resolveBanner, rejectBanner) => {
    const onData = (chunk) => {
      output += String(chunk)
      const match = new RegExp(`http://127\\.0\\.0\\.1:${PORT}/\\?token=(\\S+)`).exec(output)
      if (match !== null) resolveBanner({ token: match[1] })
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', (code) => rejectBanner(new Error(`web 进程提前退出（code ${String(code)}）\n${output.slice(-800)}`)))
    setTimeout(() => rejectBanner(new Error(`等待启动横幅超时\n${output.slice(-800)}`)), BOOT_TIMEOUT_MS)
  })
  const { token } = await banner
  return { child, token }
}

const failures = []
const step = (ok, label, info = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${info ? `（${info}）` : ''}`)
  if (!ok) failures.push(label)
}

// ── 磁盘侧：扫绑定会话（渐进面真数据源）与未绑定会话（不显示别家数据的负样本）──
// 绑定谓词 = pack bundle-bind（journal 工具调用路径里的 drt_<slug>/）；带历史 = 有回合。
const sessionsRoot = join(home, 'sessions')
const sessionGroup = existsSync(sessionsRoot) ? readdirSync(sessionsRoot).find((d) => d.includes('research-workspace')) : undefined
const hasTurns = (events) => events.some((j) => j?.type === 'turn/end')
// 顶层会话才进侧栏（子代理子会话 delegationDepth > 0——run 12 实测其不显示，点了也白点）
const isTopLevel = (events) => {
  const s = events.find((j) => j?.type === 'session')
  return s?.delegationDepth === 0
}
const lastTitleOf = (events) => {
  const titles = events.filter((j) => j?.type === 'session/title')
  return titles[titles.length - 1]?.data?.title ?? null
}
let boundSession = null
let unboundSession = null
const unboundCandidates = []
if (sessionGroup === undefined) {
  console.error('client-load-smoke: dev home sessions 里没有 research-workspace 会话组——先 source dev/env.sh 并跑一场 run')
  process.exit(2)
}
const candidates = []
for (const { d, m } of readdirSync(join(sessionsRoot, sessionGroup))
  .map((d) => ({ d, m: (() => { try { return statSync(join(sessionsRoot, sessionGroup, d, 'session.v4.jsonl.zstd')).mtimeMs } catch { return 0 } })() }))
  .sort((a, b) => b.m - a.m)) {
  if (m === 0) continue
  const { readable, events } = readSessionEvents(join(sessionsRoot, sessionGroup, d, 'session.v4.jsonl.zstd'))
  if (!readable || !hasTurns(events) || !isTopLevel(events)) continue
  const title = lastTitleOf(events)
  if (title === null || title.trim() === '') continue
  const slug = sessionBundleOf(events)
  // 尾窗挂起谓词（BUG-003 合流：回边盘侧真值 = deriveAnchors 直调——锚点判型走 lib 同一
  // 函数，不再手抄镜像；events 留存供 fileFacts 合成）
  if (slug !== undefined) candidates.push({ title, slug, events, eventCount: events.length, tailAskPending: foldHitlPending(events).pending })
  else if (unboundCandidates.length < 5) unboundCandidates.push({ title })
  if (candidates.length >= 5 && unboundCandidates.length >= 1) break
}
// 绑定 = 近窗内（新→旧前 5 个 slug 会话）**富度地板之上取最新**：观察面断言的意图对象是
// 真实 run 的渐进面，而一次性短会话（录制/红证探针/收尾判终态）事件数只有真实 run 的零头
// （BUG-001 同族：期望随绑定态漂移——第三例即短会话被绑定）。地板按事件数划线，取最新
// 保证 GUI 侧栏可见性（旧富会话可能被侧栏窗口挤出——实红教训）。
const RICH_FLOOR = 60
boundSession = (() => {
  const rich = candidates.filter((c) => c.eventCount >= RICH_FLOOR)
  const pool = rich.length > 0 ? rich : candidates
  return pool.length > 0 ? pool[0] : null
})()
// 绑定 bundle 的磁盘真值（evidence 计数 / 交付态 / 问题行首行——与页签折算同口径；
// slug 无 drt_ 前缀、目录名有——拼回；位置=状态两位置）
const bundleBaseOf = (slug) => {
  for (const base of [join(ROOT, 'research-workspace', `drt_${slug}`), join(ROOT, 'research-workspace', 'archive', `drt_${slug}`)]) {
    if (existsSync(base)) return base
  }
  return null
}
const expectedFace = boundSession !== null && bundleBaseOf(boundSession.slug) !== null ? (() => {
  const base = bundleBaseOf(boundSession.slug)
  const names = new Set(readdirSync(base))
  const evidenceCount = existsSync(join(base, 'evidence')) ? readdirSync(join(base, 'evidence')).filter((f) => f.endsWith('.md')).length : 0
  const questionText = names.has('question.md') ? readFileSync(join(base, 'question.md'), 'utf8') : null
  // G3（RFC cockpit-flow-face）：与页签同口径——剥 markdown 强调符再截断（72 字 + 省略号）。
  const firstLine = questionText?.split('\n').find((l) => l.trim() !== '' && !l.startsWith('#'))?.replace(/\*\*/g, '').replace(/`/g, '').trim().slice(0, 72) ?? null
  // 步态盘侧真值（BUG-001 轮修正）：done/current 期望随磁盘文件走——绑到的会话不一定是
  // 已交付 run（在飞 bundle 只做了一部分步骤）；deriveSteps 与页签同一谓词，期望值不再
  // 隐含"六步全绿 + 回边"的已交付假设。
  const steps = deriveSteps({
    question: names.has('question.md'),
    team: names.has('question.md'),
    leads: names.has('leads.md'),
    evidence: evidenceCount,
    findings: names.has('findings.md'),
    review: names.has('review.md'),
    final: names.has('final.md'),
  })
  return { base, evidenceCount, delivered: names.has('final.md'), hasQuestion: names.has('question.md'), firstLine, steps }
})() : null

// 锚点断言的取态源标注（BUG-003 卡"牵出的失败类"收口）：步骤/done = deriveSteps（lib 同源）·
// 锚点 passed/pending = deriveAnchors（lib 同源）· 证据计数/交付态/问题行 = 盘侧文件事实 ·
// 渲染观察 = 页面 DOM——四类源各归各，不再有任何手抄镜像。
const anchorBound = boundSession !== null && expectedFace !== null

const { child, token } = await boot()
let page
try {
  // 造渐进面断言的前提：注册研究工作区 + 用 workspaceId 形态建会话（bundle 在该工作区根内）
  const base = `http://127.0.0.1:${PORT}`
  const cookie = await authenticate(base, token)
  const ws = await rpc(base, cookie, 'workspace/create', { request: { path: join(ROOT, 'research-workspace') } })
  const workspaceId = ws?.workspace?.workspaceId ?? ws?.workspaceId
  step(typeof workspaceId === 'string', '研究工作区已注册（workspace/create 幂等）', String(workspaceId).slice(0, 8))
  const created = await rpc(base, cookie, 'session/create', { request: { workspaceId, agentPreset: 'lead' } })
  const probeSessionId = created?.sessionId ?? created?.id
  step(typeof probeSessionId === 'string', '探针会话已建在 research-workspace（workspaceId 形态）', String(probeSessionId).slice(8, 16))

  const chromium = await loadChromium(ROOT)
  const browser = await launchChromium(chromium)
  page = await browser.newPage()
  const consoleErrors = []
  const urls = []
  page.on('response', (r) => urls.push(r.url()))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  await page.goto(`http://127.0.0.1:${PORT}/?token=${token}`, { waitUntil: 'domcontentloaded' })

  // ① 先等 app 真渲染（首屏字样在场——此前 bodyText 抓太早，横幅晚于断言出现造成假绿，实测踩过），
  //    再断言零插件挂载失败横幅（apply 抛错会把 UI 砖在 BootPage）。
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: RENDER_TIMEOUT_MS }).catch(() => {})
  const bodyText = await page.evaluate(() => document.body?.innerText ?? '')
  step(!bodyText.includes('Failed to load plugins'), '页面无 "Failed to load plugins" 横幅')

  // ② console 无 loader entry 失败
  await sleep(2_000)
  const loaderFailures = consoleErrors.filter((t) => t.includes('failed to apply loader entry'))
  step(loaderFailures.length === 0, 'console 无 "failed to apply loader entry"', loaderFailures.slice(0, 2).join(' | ').slice(0, 200))

  // ③ 模块表证据（Stage 1）：/plugins/ 批次请求必须包含本包 client bundle 且 200——
  //    证明 host 侧 client-modules 把我们的行编进了 boot 图、浏览器真的取到了模块。
  //    （页签经 dock「New tab → guide 条目」显形的 UI 流 = Stage 2 B-min 的断言面；
  //    本阶段探针结论留档：New tab 控件 = button[aria-label] 在 dock 区、guide 为
  //    sidebar.right.pane.tab 的 GUIDE_ID 槽体——见 RFC 实施记录。）
  const batchHit = urls.find((u) => u.includes('/plugins/??') && u.includes('dsh-deep-research-pack/client.js'))
  step(batchHit !== undefined, '/plugins/ 批次包含 dsh-deep-research-pack/client.js（模块表收录 + 浏览器取到）')

  // ④ B-min 真渲染流（company runCockpitFlow 配方 + 0.1.7 两处适配，实测打通）：
  //    a) 关测试须知模态（Continue——它的全屏 _mask_ 盖住一切控件，不关则后续点击全超时）；
  //    b) 打开既有会话（journal 有真数据；行文本被隐藏的同名 actions 菜单抢匹配——迭代取
  //       可见者，actionability 被拦则 force 落点）；
  //    c) 展开右栏（收起时叫 Open right sidebar；company 同款）；
  //    d) 点「研究状态」guide 胶囊（展开后直接在场，无需 New tab——company 配方核心；
  //       0.1.7 的 New tab 控件在折叠列内永远 visibility:hidden，不走它）；
  //    e) 页签体渲染 journal 流且 snapshot 历史 ≥1 事件。
  const cont = page.getByRole('button', { name: /continue/i }).first()
  if (await cont.isVisible().catch(() => false)) await cont.click({ timeout: 6_000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 1_500))

  // ── 两遍断言：探针会话（research-workspace，验渐进面真数据）+ 既有会话（验活动流）──
  const PROBE_TITLE = '渐进面探针会话'
  await rpc(base, cookie, 'session/rename', { request: { sessionId: probeSessionId, title: PROBE_TITLE } })

  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const expandGroup = async (groupTitle) => {
    const rows = page.locator('span[class*="_root_"]')
    const n = await rows.count()
    for (let i = 0; i < Math.min(n, 300); i++) {
      const el = rows.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      const box = await el.boundingBox().catch(() => null)
      if (box === null || box.x >= 256) continue
      const text = (await el.textContent() ?? '').trim()
      if (text.startsWith(groupTitle) && !text.includes('New Session')) {
        await el.click({ timeout: 6_000 }).catch(() => {})
        await wait(2_000)
        return true
      }
    }
    return false
  }
  const clickRowByText = async (text) => {
    const scan = async () => {
      const rows = page.locator('span[class*="_root_"]')
      const n = await rows.count()
      for (let i = 0; i < Math.min(n, 300); i++) {
        const el = rows.nth(i)
        if (!(await el.isVisible().catch(() => false))) continue
        const box = await el.boundingBox().catch(() => null)
        if (box === null || box.x >= 256) continue // 只认左栏（中央区同名 class 会抢匹配）
        const rowText = (await el.textContent() ?? '').trim()
        if (rowText.includes(text)) { await el.click({ timeout: 10_000 }).catch(() => {}); return true }
      }
      return false
    }
    if (await scan()) return true
    // 目标沉到「Show N more sessions」折叠区 → 展开后重试一次（BUG-002 轮：验证会话
    // 被后续探针会话挤出近列表——按标题定位必须能穿透折叠）
    const more = page.getByText(/Show \d+ more sessions/).first()
    if (await more.isVisible({ timeout: 4000 }).catch(() => false)) {
      await more.click().catch(() => {})
      await wait(3000)
      if (await scan()) return true
    }
    // 仍不可见 → 走「Search sessions」按名字定位（深列表的权威路径；React 受控输入
    // 用 native setter + input 事件——execCommand 不触发受控更新）
    const searchOpened = await page.evaluate(() => { const b = document.querySelector('[aria-label="Search sessions"]'); if (b === null) return false; b.click(); return true })
    if (searchOpened) {
      await wait(1500)
      await page.evaluate((t) => {
        const i = Array.from(document.querySelectorAll('input')).find(x => x.getBoundingClientRect().width > 0)
        if (i === undefined) return
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(i, t)
        i.dispatchEvent(new Event('input', { bubbles: true }))
      }, text)
      await wait(2500)
      if (await scan()) return true
    }
    return false
  }
  const openPane = async () => {
    const expand = page.getByRole('button', { name: 'Open right sidebar' })
    if (await expand.count() > 0) await expand.first().click({ timeout: 8_000 }).catch(() => {})
    await wait(1_500)
    const capsule = page.getByRole('button', { name: /研究状态/ }).first()
    const ok = await capsule.isVisible({ timeout: 12_000 }).catch(() => false)
    if (ok) { await capsule.click({ timeout: 5_000 }).catch(() => {}); await wait(4_000) }
    return ok
  }
  const paneTextOf = () => page.evaluate(() => document.body?.innerText ?? '')

  // 第一遍：绑定会话（磁盘侧定位——渐进面真数据 = 本会话自己的 bundle，磁盘认证对账）
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: RENDER_TIMEOUT_MS }).catch(() => {})
  await wait(6_000)
  const boundOk = boundSession !== null && expectedFace !== null
  step(boundOk, '磁盘侧找到绑定 run 的带历史会话（渐进面真数据源）', boundOk ? `「${boundSession.title}」→ drt_${boundSession.slug}` : '缺——先跑一场 run（run 通道现用 workspaceId 形态建会话）')
  if (boundOk) {
    const opened = await clickRowByText(boundSession.title)
    step(opened, '绑定会话在侧栏可开（按磁盘侧标题定位）')
    if (opened) {
      await wait(4_000)
      const capOk = await openPane()
      step(capOk, '「研究状态」guide 胶囊在场（tab 类型注册成功 + 右栏展开）')
      if (capOk) {
        await wait(6_000)
        const paneText = await paneTextOf()
        const seg = paneText.slice(paneText.indexOf('研究状态'))
        // 渐进面硬断言（会话绑定 + 位置=状态两位置：证据计数/交付态/问题行与磁盘真值对账）
        const stepsOk = ['立项', '组队', '侦察', '挖掘', '综合', '审查', '交付'].every((x) => seg.includes(x))
        step(stepsOk, '步骤条真数据（流程轨道七步 = 定义流程——本会话绑定的 bundle）')
        // 步态语法回归（2026-09-28 trial 实测反馈：done 与 pending 都读成"没走过" + ▲ 粘连
        // 造成双琥珀歧义误读）——✓/●/○ 与仪表盘同语法；current 唯一；done 绿字；重入点描边。
        const rail = await page.evaluate((lbls) => {
          const spans = [...document.querySelectorAll('span')]
          const cur = spans.filter((n) => (n.textContent ?? '').trim().startsWith('● '))
          const greenDone = (lbl) => spans.some((n) => (n.textContent ?? '').trim() === `✓ ${lbl}` && getComputedStyle(n).color === 'rgb(22, 163, 74)')
          const ev = spans.find((n) => (n.textContent ?? '').trim() === '✓ 挖掘')
          return { cur: cur.length, greens: lbls.filter(greenDone), reentry: ev === undefined ? null : getComputedStyle(ev).outlineStyle }
        }, ['立项', '组队', '侦察', '挖掘', '综合', '审查'])
        step(rail.cur === 1, '轨道 current 唯一（● 恰一枚——双高亮歧义回归红）', `● ×${rail.cur}`)
        // done 期望 = 盘侧 deriveSteps 真值（BUG-001 轮修正：绑到的会话不一定是已交付 run，
        // 在飞 bundle 只做了一部分步骤——期望随磁盘走，不再隐含"六步全绿"）
        const expectedDone = expectedFace.steps.filter((s) => s.state === 'done').length
        step(rail.greens.length === expectedDone, '轨道 done = 盘侧步态真值（✓ 绿字步数与 deriveSteps 对账）', `绿字 ${rail.greens.length} / 盘侧期望 ${expectedDone}：${rail.greens.join('、') || '无'}`)
        // 重入点描边与 ↻ 回边 = 交付审阅锚非 upcoming 的轨道面（BUG-003 合流：盘侧直调
        // deriveAnchors 与 UI 同一函数——mid-flow HITL1/契约外挂起不亮回边，HITL2 挂起亮）。
        const diskAnchors = deriveAnchors(boundSession.events, { question: expectedFace.hasQuestion, delivered: expectedFace.delivered })
        const loopExpected = diskAnchors[1] !== undefined && diskAnchors[1].state !== 'upcoming'
        step(loopExpected ? rail.reentry === 'dashed' : (rail.reentry === null || rail.reentry === 'none'),
          '重入点描边（回边落点 = 挖掘；交付审阅非 upcoming 才描边）', `outline=${rail.reentry ?? '无'}（loopOn=${loopExpected}）`)
        const evMatch = seg.match(/证据 (\d+) 份/)
        step(evMatch !== null && Number(evMatch[1]) === expectedFace.evidenceCount,
          '证据计数 = 磁盘真值（会话绑定 + 根/archive 两位置）', evMatch ? `${evMatch[0]}（磁盘 ${expectedFace.evidenceCount}）` : '未渲染')
        const delivOk = expectedFace.delivered ? seg.includes('已交付') : !seg.includes('已交付')
        step(delivOk, '交付状态 = 磁盘真值', expectedFace.delivered ? 'final.md 在场 → ✅ 已交付' : '无 final.md → 如实不显')
        // 锚点入轨断言（RFC cockpit-flow-face）：轨道渲染 + 诚实线计数与盘侧文件事实对账
        const railOk = seg.includes('◆立项确认') && seg.includes('◆交付审阅')
        step(railOk, '流程轨道渲染（◆立项确认 + ◆交付审阅在场）')
        // ↻ 回边盘侧真值（BUG-003 合流）：直调 hitl-fold.deriveAnchors（UI 同一函数）取
        // 交付审阅锚态——旧手抄公式（delivered ∨ tailAskPending）停留在 BUG-002 前的
        // 「一律记交付审阅」旧启发式，mid-flow 挂起被误判为回边应亮，废。
        step(loopExpected === seg.includes('↻ 补研究'), '↻ rerun 回边 = 盘侧真值（deriveAnchors 合流，交付审阅锚非 upcoming）', `loopOn=${loopExpected}（anchor-2=${String(diskAnchors[1]?.state)} tailAskPending=${boundSession.tailAskPending}）`)
        if (anchorBound && diskAnchors.some((a) => a.state === 'passed')) {
          // 停靠点诚实线（BUG-003 同族收口）：passed 计数 = diskAnchors（lib 同一函数）——
          // pending 覆盖 passed 的 re-open 语义（BUG-002）在此与 UI 天然一致；旧
          // hasQuestion+delivered 镜像不知道 re-open，是本族最后一块手抄镜像。
          const expectedPassed = diskAnchors.filter((a) => a.state === 'passed').length
          step(seg.includes(`停靠点已过 ${expectedPassed} 个`), '停靠点诚实线 = 盘侧真值（deriveAnchors 合流——passed 文件事实 + pending 覆盖语义同源）', `盘侧 passed=${expectedPassed}`)
        }
        const qOk = expectedFace.firstLine !== null && seg.includes(expectedFace.firstLine.slice(0, 12))
        step(qOk, '研究问题行 = question.md 首行', expectedFace.firstLine?.slice(0, 24) ?? '')
      }
    }
  }

  // 第一遍 b（负样本，有样本才跑）：未绑定会话 → 提示行在场 + 零别家渐进面泄漏
  //（候选逐个试到能点开为止——子代理子会话可能不进侧栏，标题垃圾的跳过）
  if (unboundCandidates.length > 0) {
    for (const cand of unboundCandidates) {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: RENDER_TIMEOUT_MS }).catch(() => {})
      await wait(5_000)
      const opened2 = await clickRowByText(cand.title)
      if (!opened2) continue
      await wait(4_000)
      const capOk2 = await openPane()
      if (!capOk2) continue
      await wait(5_000)
      const t2 = await paneTextOf()
      const seg2 = t2.slice(t2.indexOf('研究状态'))
      unboundSession = cand
      step(seg2.includes('本会话未绑定 run bundle'), '未绑定会话：提示行在场（如实说明，不冒充）', cand.title)
      // 泄漏检查盯**别家面数据**（渐进面/诚实线），不盯占位步骤名——未绑定但本会话有挂起 ask
      // 时，锚点轨道带占位步骤在场是有意行为（cockpit-flow-face：锚点段从 journal 画）。
      const leaked = ['已交付', '证据 ', '停靠点已过'].filter((x) => seg2.includes(x))
      step(leaked.length === 0, '未绑定会话：零别家渐进面泄漏', leaked.length > 0 ? leaked.join('、') : '')
      break
    }
    if (unboundSession === null) console.log('  note  未绑定会话负样本：候选都不可点开（子会话不进侧栏？跳过）')
  } else {
    console.log('  note  未绑定会话负样本：无样本（跳过——先跑 snapshot-replay 冒烟产生纯检索会话）')
  }

  // 第二遍：既有会话（有历史 → 活动流断言）。先 reload：第一遍点击后侧栏可能重排/滚动，
  // 直接找行会 miss（实测）——reload 回到干净列表态。
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: RENDER_TIMEOUT_MS }).catch(() => {})
  await wait(5_000)
  const SESSION_TITLE = SESSION_TITLE_ARG ?? boundSession?.title ?? null
  let sessionOk = SESSION_TITLE !== null && await clickRowByText(SESSION_TITLE)
  if (!sessionOk && SESSION_TITLE !== null) {
    // 折叠态：逐组展开后重试（侧栏只展开 active 会话所在的组；目标会话的组随其 cwd
    // 走——BUG-002 清扫轮实证：老 ad-hoc 会话在 harness-home 组，不在 research-workspace）
    for (const g of ['research-workspace', 'harness-home', 'Ungrouped', 'rehearsal-workspace']) {
      await expandGroup(g)
      sessionOk = await clickRowByText(SESSION_TITLE)
      if (sessionOk) break
    }
  }
  step(sessionOk, '既有会话在场（journal 数据源；折叠组自动展开）', sessionOk ? SESSION_TITLE : 'dev home 缺该会话——用 --session 指定')
  if (sessionOk) {
    await wait(5_000)
    await openPane()
    const paneText = await paneTextOf()
    const paneOk = paneText.includes('研究状态') && (paneText.includes('💬') || paneText.includes('（研究中'))
    step(paneOk, '页签体渲染（keyed 槽体挂对 key + follow 通道接通）')
    const humanRows = (paneText.match(/🔍|👥|💬|📦/gu) ?? []).length
    step(humanRows >= 3, '人性化活动流在场（≥3 行）', humanRows + ' 行')
    const rawNoise = ['step/end', 'step/start', 'tool/call', 'assistant/message', 'turn/end', 'turn/start'].filter((x) => paneText.includes(x))
    step(rawNoise.length === 0, '页签正文无原始事件类型名（噪音已过滤）', rawNoise.length > 0 ? rawNoise.slice(0, 2).join('、') : '')
  }

  await browser.close()
} catch (error) {
  failures.push(`浏览器断言异常: ${error.message}`)
  console.error(`  FAIL 浏览器断言异常: ${error.message}`)
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log(failures.length === 0
  ? '\nclient-load-smoke: ALL PASS（观察面 client 面真浏览器加载绿）'
  : `\nclient-load-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
