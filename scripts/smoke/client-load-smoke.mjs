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
// keyed 槽体挂对 key；另有活动流断言（人性化行在场、原始事件类型名零残留）；「研究配置」
// 页签组（D25/detail-ux：内置与库条目详情读态、内置无编辑入口负例、编辑草稿、删除二次
// 确认 + 抛弃型自测工作区的 12 形态例库对账——**零提示零发送**：keyless 档契约 = 无模型
// 调用，dev home 持凭据，任何 session/prompt 都会唤醒真模型 lead〔2026-10-13 事故实录〕；
// 发送链路载荷由 tests/library-fold 电池钉）。
//
// 通道：源码域（--profile web --patch dev/research.overlay.yml，与 preset-smoke 真挂载档
// 同款——boot 起自本仓，行包名经根 node_modules 解析到 pack 源码树，浏览器经
// exports["./client"] 取已构建的 lib/client.js）。
// 前置：source dev/env.sh；pack 已构建（lib/client.js 在位——boot 前自检会拦）。
// 用法：node --import tsx/esm scripts/smoke/client-load-smoke.mjs [--port 3109] [--session <既有会话标题>]
// 前置（B-min 起）：dev home 里有至少一个**绑定 run bundle 的带历史会话**（跑过一场 run 即有——
// 渐进面断言的磁盘认证源；未绑定会话负样本可选，snapshot-replay 冒烟产生）。
//
// bundle 渐进面断言（2026-09-26 接通，根因链见 notes/archived/2026-09-26-bundle-face-wiring.md；
// 2026-09-28 起会话绑定——RFC right-pane-ux-debt：渐进面只跟本会话自己的 run）：
// 渐进面读**会话 journal 工具调用路径绑定的 bundle**（bundle-bind 谓词），位置=状态两个位置
// 都认（根=在飞 / archive/=已交付）。断言的磁盘认证源 = 磁盘侧扫出的最新绑定会话（跑过 run
// 即有），其 bundle 的 evidence 计数/交付态/问题行以盘上真值对账——不再自造探针 bundle。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from '../lib/env.mjs'
import { assertVendorArtifacts, ARTIFACT_REMEDY } from '../lib/vendor-artifacts.mjs'
import { launchChromium, loadChromium } from '../lib/playwright.mjs'
import { readSessionEvents, resolveSessionLog, researchWorkspaceGroup } from '../lib/session-log.mjs'
import { prepareClientLoadReference } from './client-load-reference.mjs'
import { expandGroup, SIDEBAR_GROUP_CANDIDATES } from '../lib/web-ui-nav.mjs'
import { deriveAnchors, foldHitlPending } from '../../packages/deep-research-pack/src/lib/hitl-fold.ts'
import { deriveBusinessBrief } from '../../packages/deep-research-pack/src/lib/brief-fold.ts'
import { foldActivityRows } from '../../packages/deep-research-pack/src/lib/activity-fold.ts'
import { streamFailureOf } from '../../packages/deep-research-pack/src/lib/stream-failure.ts'
import { SELFTEST_LIBRARY } from '../lib/selftest-library.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '3109'))
// 既有会话默认 = 盘侧最新绑定会话（惰性解析——由下方参考模块选择；硬编码标题会
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

// boot 用补丁 = 源码域 overlay + agent-team host 行（**有团队正例环境**，2026-10-11 首验定案）：
// ⑦ 区 roster（agentTeam 投影）由 agent-team **host 插件**计算——research.overlay.yml 只带
// client 面（ui-agent-team），不带 host 行（A 定案：团队机制组合归 run 通道 profile 层）。
// 无此行则投影恒缺、members 恒空，"spawn ↔ roster 对账"正例断言永远咬合不上（首验实测红）；
// 补行后新 host 从盘上持久状态重算 roster 全量在场（同日二验实证）。行内容镜像 vendor
// agent-team-profile 层（rc.2 同款 config）——升 pin 随 bump-vendor-pin 重校。
// 追加位置 = overlay 末尾的 insert 列表（render-overlay 产物 insert 块到 EOF 收口）。
const TEAM_ROW = `
    - id: agent-team
      name: '@deepseek-ai/dsh-experimental-agent-team'
      config:
        maxMembers: 8
        maxTasks: 256
        maxPendingMessagesPerMember: 64
        maxMessageBytes: 65536
        disposalTimeoutMs: 5000
`
const teamPatchPath = join(ROOT, 'runtime', 'smoke-workspace', 'client-load-team.overlay.yml')
mkdirSync(dirname(teamPatchPath), { recursive: true })
writeFileSync(teamPatchPath, readFileSync(join(ROOT, 'dev', 'research.overlay.yml'), 'utf8') + TEAM_ROW, 'utf8')

/** boot web（源码域 overlay 通道 + agent-team host 行），等到启动横幅打印带 token 的 URL。 */
async function boot() {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx/esm', bin, '--profile', 'web', '--patch', teamPatchPath,
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
const sessionGroup = researchWorkspaceGroup(sessionsRoot)
let unboundSession = null
if (sessionGroup === undefined) {
  console.error('client-load-smoke: dev home sessions 里没有 research-workspace 会话组——先 source dev/env.sh 并跑一场 run')
  process.exit(2)
}
const { boundSession: initialBoundSession, unboundCandidates, fileFaceOf } = prepareClientLoadReference({ root: ROOT, sessionsRoot, sessionGroup })
let boundSession = initialBoundSession

// vendor follow 开窗快照的盘侧复刻（对账同窗，勿折全量日志）：语义 = api/session-controller
// src/history.ts `paginate` + `DEFAULT_MAX_MESSAGES = 50`——从日志末尾倒序数 50 条 surface
// append 消息事件（user/message | assistant/message），第 50 条处（其 sourceEventSeqs 组
// 起点更早则取组起点；seq = 稠密零基下标）定为切点，页 = 切点到末尾的**全部**事件（非
// 消息事件一并含入）——窗口远大于「50 条事件」。pack client follow 未带 maxMessages →
// UI 活动流折的正是这窗（2026-10-13 实红：全量折算 25 行 vs 窗折算 16 行 = UI 实测）。
const HISTORY_MESSAGE_WINDOW = 50
const clientHistoryWindowOf = (events) => {
  let counted = 0
  let cut = 0
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if ((e?.type === 'user/message' || e?.type === 'assistant/message') && e?.surfaceOp === 'append') {
      counted++
      if (counted >= HISTORY_MESSAGE_WINDOW) {
        cut = i
        if (Array.isArray(e?.sourceEventSeqs)) {
          for (const s of e.sourceEventSeqs) if (typeof s === 'number' && s < cut) cut = s
        }
        break
      }
    }
  }
  return events.slice(cut)
}
const expectedFace = boundSession !== null ? fileFaceOf(boundSession.slug) : null

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
  // expandGroup / 候选分组名 = lib/web-ui-nav.mjs 唯一正本（与 hitl-answer 共享——2026-10-13
  // 结构重构收敛，原本地双份句法已漂移）。
  // 页面就绪序列（reload → New Session 首屏字样 → 稳定窗）——收口本文件六处同形重复；
  // settleMs 逐调用点保持原值（各处的稳定窗是实测调的，不统一）。
  const awaitAppReady = async (settleMs) => {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: RENDER_TIMEOUT_MS }).catch(() => {})
    await wait(settleMs)
  }
  // 「研究配置」guide 胶囊打开序列：先试已停靠芯片（展开右栏后直接在场），不在则走 dock
  // 「New tab」开 guide 页再试——两条路都试（company 配方核心）。时序参数逐调用点保持
  // 原值（探测窗/重试窗/点击后稳定窗是各上下文实测调的，不统一）；返回 ok = 胶囊已点开。
  const openGuideCapsule = async (probeMs, retryMs, afterClickMs) => {
    const expand = page.getByRole('button', { name: 'Open right sidebar' })
    if (await expand.count() > 0) await expand.first().click({ timeout: 8_000 }).catch(() => {})
    await wait(1_500)
    let cap = page.getByRole('button', { name: /研究配置/ }).first()
    let ok = await cap.isVisible({ timeout: probeMs }).catch(() => false)
    if (!ok) {
      const addTab = page.getByRole('button', { name: 'New tab' }).first()
      if (await addTab.count() > 0) {
        await addTab.click({ timeout: 5_000 }).catch(() => {})
        await wait(2_000)
        cap = page.getByRole('button', { name: /研究配置/ }).first()
        ok = await cap.isVisible({ timeout: retryMs }).catch(() => false)
      }
    }
    if (ok) {
      await cap.click({ timeout: 5_000 }).catch(() => {})
      await wait(afterClickMs)
    }
    return ok
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
    // 深列表循环展开（2026-10-10 实测：dev home 累积 250+ 会话，目标会话可埋 8 层
    // "Show N more sessions"——单次展开够不着。逐层点开直到目标在场/按钮消失/轮上限；
    // 每层揭示数个会话，1.8s 稳定窗）。探针会话污染的定期清理正本 = 录制器头注。
    for (let round = 0; round < 60; round++) {
      const more = page.getByText(/Show \d+ more sessions/).first()
      if (!(await more.isVisible({ timeout: 1500 }).catch(() => false))) break
      await more.click().catch(() => {})
      await wait(1800)
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
  await awaitAppReady(6_000)
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
        let seg = paneText.slice(paneText.indexOf('研究状态'))
        // UI/盘侧时点竞态收口（2026-10-11 首验两红）：①UI bundle 面有 30s 刷新周期（slug
        // 变化即扫 + 定时），盘侧文件现扫可领先 UI 一拍；②lead journal 快照取自 boot 前，
        // 挂起/锚点期望拿旧态对 UI 实时态会假红（实测：快照 HITL2 挂起 vs UI 停靠点已过 2）。
        // 处置 = 两侧都现扫（journal 重读 + 文件现扫），不一致跨刷新周期复核一次，仍不一致
        // 才判红；后续断言用复核后的快照对。
        const parseUiFace = (segText) => ({
          evidence: Number((segText.match(/证据 (\d+) 份/) ?? [])[1] ?? Number.NaN),
          delivered: segText.includes('已交付'),
          passed: Number((segText.match(/停靠点已过 (\d+) 个/) ?? [])[1] ?? Number.NaN),
        })
        let faceNow = null
        const diskSideNow = () => {
          const { readable, events } = readSessionEvents(boundSession.logPath)
          if (readable && events.length > 0) {
            boundSession = { ...boundSession, events, tailAskPending: foldHitlPending(events).pending }
          }
          faceNow = fileFaceOf(boundSession.slug) ?? expectedFace
          const anchors = deriveAnchors(boundSession.events, { question: faceNow.hasQuestion, delivered: faceNow.delivered })
          return { evidence: faceNow.evidenceCount, delivered: faceNow.delivered, passed: anchors.filter((a) => a.state === 'passed').length, anchors }
        }
        let diskSide = diskSideNow()
        let uiFace = parseUiFace(seg)
        // 不一致即再水化复核（有界两轮）：仅等待不够——被跟会话若在**别的 host** 上活跃推进
        // （run 通道 3083 起飞、本 smoke 自起 web 是被动跟读者），被动侧日志尾部追平可超过
        // 30s 刷新周期（2026-10-11 首验实测：HITL2 ask 落盘后 smoke 浏览器仍渲染旧尾部）；
        // reload 强制重 follow → host 重读 journal 发新快照。仍不一致才判红。
        for (let attempt = 0; attempt < 2
          && (uiFace.evidence !== diskSide.evidence || uiFace.delivered !== diskSide.delivered || uiFace.passed !== diskSide.passed); attempt++) {
          await wait(20_000)
          await awaitAppReady(4_000)
          if (!(await clickRowByText(boundSession.title))) break
          await wait(4_000)
          if (!(await openPane())) break
          await wait(6_000)
          const paneAgain = await paneTextOf()
          seg = paneAgain.slice(paneAgain.indexOf('研究状态'))
          uiFace = parseUiFace(seg)
          diskSide = diskSideNow()
        }
        // 渐进面硬断言（会话绑定 + 位置=状态两位置：证据计数/交付态/问题行与磁盘真值对账）
        const stepsOk = ['立项', '组队', '侦察', '挖掘', '综合', '审查', '交付'].every((x) => seg.includes(x))
        step(stepsOk, '步骤条真数据（流程轨道七步 = 定义流程——本会话绑定的 bundle）')
        // 步态语法回归（2026-09-28 trial 实测反馈：done 与 pending 都读成"没走过" + ▲ 粘连
        // 造成双琥珀歧义误读）——✓/●/○ 与仪表盘同语法；current 唯一；done 绿字；重入点描边。
        const rail = await page.evaluate((lbls) => {
          const spans = [...document.querySelectorAll('span')]
          // current 计数收窄到七步名（2026-10-11 首验红：⑦ 区队员 phase 圆点同用 "● " 前缀
          // ——● scout-security 等——裸 startsWith 会把队员行算成 current，● ×5 假红）。
          const cur = spans.filter((n) => /^● (立项|组队|侦察|挖掘|综合|审查|交付)$/.test((n.textContent ?? '').trim()))
          const greenDone = (lbl) => spans.some((n) => (n.textContent ?? '').trim() === `✓ ${lbl}` && getComputedStyle(n).color === 'rgb(22, 163, 74)')
          const ev = spans.find((n) => (n.textContent ?? '').trim() === '✓ 挖掘')
          return { cur: cur.length, greens: lbls.filter(greenDone), reentry: ev === undefined ? null : getComputedStyle(ev).outlineStyle }
        }, ['立项', '组队', '侦察', '挖掘', '综合', '审查'])
        step(rail.cur === 1, '轨道 current 唯一（● 恰一枚——双高亮歧义回归红）', `● ×${rail.cur}`)
        // done 期望 = 盘侧 deriveSteps 真值（BUG-001 轮修正：绑到的会话不一定是已交付 run，
        // 在飞 bundle 只做了一部分步骤——期望随磁盘走，不再隐含"六步全绿"）
        const expectedDone = faceNow.steps.filter((s) => s.state === 'done').length
        step(rail.greens.length === expectedDone, '轨道 done = 盘侧步态真值（✓ 绿字步数与 deriveSteps 对账）', `绿字 ${rail.greens.length} / 盘侧期望 ${expectedDone}：${rail.greens.join('、') || '无'}`)
        // 重入点描边与 ↻ 回边 = 交付审阅锚非 upcoming 的轨道面（BUG-003 合流：盘侧直调
        // deriveAnchors 与 UI 同一函数——mid-flow HITL1/契约外挂起不亮回边，HITL2 挂起亮）。
        const diskAnchors = diskSide.anchors
        const loopExpected = diskAnchors[1] !== undefined && diskAnchors[1].state !== 'upcoming'
        step(loopExpected ? rail.reentry === 'dashed' : (rail.reentry === null || rail.reentry === 'none'),
          '重入点描边（回边落点 = 挖掘；交付审阅非 upcoming 才描边）', `outline=${rail.reentry ?? '无'}（loopOn=${loopExpected}）`)
        step(Number.isInteger(uiFace.evidence) && uiFace.evidence === faceNow.evidenceCount,
          '证据计数 = 磁盘真值（会话绑定 + 根/archive 两位置）', `UI ${uiFace.evidence} / 磁盘 ${faceNow.evidenceCount}`)
        const delivOk = uiFace.delivered === faceNow.delivered
        step(delivOk, '交付状态 = 磁盘真值', faceNow.delivered ? 'final.md 在场 → ✅ 已交付' : '无 final.md → 如实不显')
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
        // ⓪ 业务摘要层真值对账（issue 2026-10-11-executive-research-ux-delivery ③-a）：新摘要层
        // 此前**零浏览器断言**（2026-10-11 实测 client-load-smoke 命中 0）。判据 = 盘侧直调
        // brief-fold.deriveBusinessBrief（UI 同一函数）按组件同源输入算期望值，再逐行断言渲染
        // 文本——期望来自磁盘事实而非组件自报，故能咬住"漏行 / 写死文案 / 只渲染部分五问"。
        const hitlNow = foldHitlPending(boundSession.events)
        const pendingNow = diskAnchors.find((a) => a.state === 'pending')
        const expectedBrief = deriveBusinessBrief({
          bundleBound: true, // 本分支只在绑定会话上跑；未绑定态另有负例断言（③ 的 fail-soft 面）
          kickoffHold: false, // boundBy=write 的会话不进立项预检窗（BUG-001 第二窗口）
          hitlPending: hitlNow.pending,
          pendingKind: pendingNow === undefined ? null : pendingNow.key === 'anchor-1' ? 'hitl1' : pendingNow.key === 'anchor-2' ? 'hitl2' : 'unknown',
          pendingQuestions: pendingNow?.questions ?? 0,
          hasQuestion: faceNow.hasQuestion,
          questionLine: faceNow.questionLine,
          currentStage: faceNow.steps.find((s) => s.state === 'current')?.label ?? null,
          findingsPresent: faceNow.steps.find((s) => s.key === 'findings')?.state === 'done',
          reviewFail: faceNow.reviewFail,
          delivered: faceNow.delivered,
          versions: faceNow.versions,
          lastDecisionKind: null, // 当前数据面未读——组件同款如实缺省，不猜
          openItems: [],
        })
        const briefLines = [
          expectedBrief.stageLine,
          expectedBrief.knownLine,
          expectedBrief.actionLine,
          ...(expectedBrief.unknownLine === null ? [] : [expectedBrief.unknownLine]),
        ]
        const briefMissing = briefLines.filter((line) => !seg.includes(line))
        const goalOk = expectedBrief.goalKnown
          ? faceNow.questionLine !== null && seg.includes(`🎯 ${faceNow.questionLine.slice(0, 12)}`)
          : seg.includes('🎯 尚未确认')
        step(goalOk && briefMissing.length === 0,
          '业务摘要层 = 盘侧 brief-fold 真值（五问逐行对账）',
          briefMissing.length === 0
            ? `goal=${expectedBrief.goal.slice(0, 16)}… ｜ stage=${expectedBrief.stageLine}`
            : `缺行：${briefMissing.map((l) => l.slice(0, 16)).join(' ｜ ')}`)
        // 队员动态折叠区（member-activity-stream，2026-10-10）：盘侧 spawn 名 ↔ agentTeam 投影
        // roster 对账（投影 = 队员会话 id 的唯一发现源，通道探明实证）；spawn 在场而区缺席 =
        // 投影或接线异常；绑定会话本身是队员（无 spawn、roster 住 lead）与无团队 → 区不渲染。
        const spawnNames = boundSession.events
          .filter((e) => e?.type === 'tool/call' && e?.data?.name === 'spawn_teammate')
          .map((e) => { try { return JSON.parse(e.data.arguments).name } catch { return null } })
          .filter((n) => typeof n === 'string' && n !== '')
        if (spawnNames.length > 0) {
          const memberArea = seg.includes('队员动态')
          step(memberArea, '队员动态折叠区在场（盘侧 spawn 在场 → 投影 roster 渲染）', `spawn=[${spawnNames.join('、')}]`)
          if (memberArea) {
            const missingNames = spawnNames.filter((n) => !seg.includes(n))
            step(missingNames.length === 0, '队员 roster = 盘侧 spawn 名对账（一个不漏）', missingNames.length > 0 ? `缺：${missingNames.join('、')}` : spawnNames.join('、'))
          }
        } else {
          step(!seg.includes('队员动态'), '无团队（无 spawn / 队员会话）→ 队员动态不渲染（负例——不冒充）')
        }
      }
    }
  }

  // 第一遍 b（负样本，有样本才跑）：未绑定会话 → 提示行在场 + 零别家渐进面泄漏
  //（候选逐个试到能点开为止——子代理子会话可能不进侧栏，标题垃圾的跳过）
  if (unboundCandidates.length > 0) {
    for (const cand of unboundCandidates) {
      await awaitAppReady(5_000)
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
      // 无团队负例（member-activity-stream）：无 spawn 的会话不渲染队员区（不冒充团队面）。
      step(!seg2.includes('队员动态'), '未绑定会话：队员动态不渲染（无团队负例）')
      // ⓪ 摘要层 fail-soft 负例（③-a 互补态）：无 bundle 绑定时 goal 必须如实「尚未确认」，
      // 不生成替代目标、不借用别家 run 的问题行（brief-fold 的 unbound 分支）。
      step(seg2.includes('🎯 尚未确认'), '未绑定会话：摘要层如实「尚未确认」（不生成替代目标）',
        (seg2.match(/🎯 [^\n]{0,24}/) ?? ['（未找到 🎯 行）'])[0])
      break
    }
    if (unboundSession === null) console.log('  note  未绑定会话负样本：候选都不可点开（子会话不进侧栏？跳过）')
  } else {
    console.log('  note  未绑定会话负样本：无样本（跳过——先跑 snapshot-replay 冒烟产生纯检索会话）')
  }

  // 第二遍：既有会话（有历史 → 活动流断言）。先 reload：第一遍点击后侧栏可能重排/滚动，
  // 直接找行会 miss（实测）——reload 回到干净列表态。
  await awaitAppReady(5_000)
  const SESSION_TITLE = SESSION_TITLE_ARG ?? boundSession?.title ?? null
  let sessionOk = SESSION_TITLE !== null && await clickRowByText(SESSION_TITLE)
  if (!sessionOk && SESSION_TITLE !== null) {
    // 折叠态：逐组展开后重试（侧栏只展开 active 会话所在的组；目标会话的组随其 cwd
    // 走——BUG-002 清扫轮实证：老 ad-hoc 会话在 harness-home 组，不在 research-workspace）
    for (const g of SIDEBAR_GROUP_CANDIDATES) {
      await expandGroup(page, g)
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
    // 流畸形死亡恢复指引（BUG-023 修复①）：盘侧 streamFailureOf 真值 ↔ UI 横幅对账——
    // 末位回合死于上游流失败且无新回合接手才显示；用真实死亡会话（如渐进面探针会话）作正例。
    const openedEvents = (() => {
      const matches = []
      for (const g of readdirSync(join(home, 'sessions'))) {
        const gd = join(home, 'sessions', g)
        let dirs; try { dirs = readdirSync(gd) } catch { continue }
        for (const d of dirs) {
          const lp = resolveSessionLog(join(gd, d))
          if (!lp) continue
          try {
            const { readable, events } = readSessionEvents(lp)
            if (!readable) continue
            const title = events.filter((e) => e?.type === 'session/title').at(-1)?.data?.title
            if (title === SESSION_TITLE) matches.push(events)
          } catch { /* 缺席日志不作为候选 */ }
        }
      }
      return matches.length > 0 ? matches : null
    })()
    if (openedEvents !== null) {
      // 标题可撞车（smoke 每跑造一个探针会话）——同题任一会话死亡即期待横幅（正面证据）；
      // 负例（存活不显示）由 stream-failure keyless 测试覆盖。
      const hintExpected = openedEvents.some((ev) => streamFailureOf(ev).dead)
      step(paneText.includes('上游模型流连续异常') === hintExpected,
        '流失败恢复指引 = 盘侧 streamFailureOf 真值（死亡会话显示、存活会话不显示）', `expected=${hintExpected}`)
    }
    const humanRows = (paneText.match(/🔍|👥|💬|📦/gu) ?? []).length
    // 行数与**本会话自己的**折算对账（数据无关断言）。两次实红家谱：① 2026-10-12——≥3
    // 旧地板把快答型会话形状（lead journal 天然 2 行）误当断言对象，改「≥1 + 与盘侧折算
    // 一致」；② 2026-10-13——盘侧期望折**全量日志**（25 行）而 UI 按 vendor follow 开窗
    // 快照折算（16 行；616 事件、切点 288）——对账对象错位，期望改按 clientHistoryWindowOf
    // 同窗折算（复刻语义 = session-controller history.ts paginate：倒数十 50 条 surface
    // append 消息事件定切点，页含切点到末尾全部事件）。断言时刻重读日志，防在飞 run 采数
    // 漂移（fileFaceOf 同款纪律）；队员会话（spawn_teammate 在场）页含队员动态行、emoji
    // 计数无法归属 lead 面——精确对账显性降级 n/a，不静默放宽。
    const expectedRows = (() => {
      if (SESSION_TITLE === null || boundSession === null || SESSION_TITLE !== boundSession.title) return null
      let events = boundSession.events
      try {
        const fresh = readSessionEvents(boundSession.logPath)
        if (fresh.readable) events = fresh.events
      } catch { /* 日志缺席/损坏时退回 boot 期快照 */ }
      if (events.some((e) => e?.type === 'tool/call' && e?.data?.name === 'spawn_teammate')) return null
      return foldActivityRows(clientHistoryWindowOf(events)).length
    })()
    step(humanRows >= 1 && (expectedRows === null || humanRows === expectedRows),
      '人性化活动流 = journal 折算真值（行数与 foldActivityRows 对账）',
      `${humanRows} 行（盘侧期望 ${expectedRows ?? 'n/a'}）`)
    const rawNoise = ['step/end', 'step/start', 'tool/call', 'assistant/message', 'turn/end', 'turn/start'].filter((x) => paneText.includes(x))
    step(rawNoise.length === 0, '页签正文无原始事件类型名（噪音已过滤）', rawNoise.length > 0 ? rawNoise.slice(0, 2).join('、') : '')
  }

  // 第一遍 c：「研究配置」页签（D25 期 1 管理中继面）——guide 胶囊在场 + 页签体渲染
  // （内置偏好只读表 + 偏好库空态/条目）。防"拼错不报错、永不渲染"（company 坑 1 的
  // 渲染级对账；keyed 字面量另由 client-keys 门禁静态对账）。
  {
    await awaitAppReady(5_000)
    const targetTitle = SESSION_TITLE_ARG ?? boundSession?.title ?? unboundSession?.title
    const openedC = targetTitle !== null && await clickRowByText(targetTitle)
    if (openedC) {
      await wait(3_000)
      // 胶囊在 guide 页（dock「New tab」打开）；已停靠的芯片也可点——两条路都试。
      const capOkC = await openGuideCapsule(4_000, 10_000, 3_000)
      step(capOkC, '「研究配置」guide 胶囊在场（tab 类型注册成功 + guide 页可达）')
      if (capOkC) {
        const tc = await paneTextOf()
        const segC = tc.slice(tc.indexOf('研究配置'))
        const builtinOk = ['事实核查', '领域地图', '主张核查', '方案比较'].every((n) => segC.includes(n))
        step(builtinOk, '研究配置页签体：内置偏好四条在场（只读表渲染）')
        // 库区断言随库状态走（盘侧 method-library.md 真值）：空库 → 引导文案；有条目 → 条目名/默认徽标在场。
        const libFile = join(ROOT, 'research-workspace', 'method-library.md')
        const hasEntries = existsSync(libFile) && /^## /m.test(readFileSync(libFile, 'utf8'))
        const libOk = segC.includes('我的偏好库') && (hasEntries
          ? (segC.includes('格局调研') || segC.includes('默认偏好'))
          : segC.includes('还没有保存的偏好'))
        step(libOk, '研究配置页签体：偏好库区 = 盘侧库状态真值（空态引导 / 条目投影）', hasEntries ? '库有条目' : '库为空')
        // 详情 Modal（detail-ux 期 1.5）：点内置条目名称 → 四分区 + 内置操作在场 → 关闭。
        const nameBtn = page.getByRole('button', { name: /事实核查 ›/ }).first()
        if (await nameBtn.isVisible({ timeout: 6_000 }).catch(() => false)) {
          await nameBtn.click({ timeout: 5_000 }).catch(() => {})
          await wait(1_500)
          const modalText = await paneTextOf()
          const modalOk = ['找什么资料', '怎么核实', '报告怎么写', '明确不承诺', '基于此自定义', '用于本次研究'].every((s) => modalText.includes(s))
            && !modalText.includes('编辑内容')
          step(modalOk, '研究配置详情 Modal：四分区 + 内置操作在场（读态；内置无编辑入口）')
          await page.getByRole('button', { name: '关闭详情' }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_000)
        } else {
          step(false, '研究配置详情 Modal：条目名称钮不可见（渲染回归）')
        }
        // 库条目详情/编辑草稿/删除二次确认（detail-ux 期 1.5 验收行补全；库有条目才有对象）：
        // 编辑只到草稿层即放弃、删除只到确认层即取消——本组零发送；发送回执单独走下方
        // 抛弃型探针会话。
        if (hasEntries) {
          const libName = page.getByRole('button', { name: /格局调研 ›/ }).first()
          if (await libName.isVisible({ timeout: 6_000 }).catch(() => false)) {
            await libName.click({ timeout: 5_000 }).catch(() => {})
            await wait(1_500)
            let t = await paneTextOf()
            const libModalOk = ['找什么资料', '怎么核实', '报告怎么写', '明确不承诺', '编辑内容', '用于本次研究', '来源：'].every((s) => t.includes(s))
              && !t.includes('基于此自定义')
            step(libModalOk, '研究配置详情 Modal（库条目）：四分区 + 编辑入口在场（读态，无「基于此自定义」）')
            // 编辑态：四分区草稿预填 + 单保存钮 + 放弃；放弃不发送
            await page.getByRole('button', { name: '编辑内容' }).first().click({ timeout: 5_000 }).catch(() => {})
            await wait(1_000)
            const drafts = page.locator('textarea')
            const draftCount = await drafts.count().catch(() => 0)
            const draftPrefill = draftCount === 4 ? await drafts.first().inputValue().catch(() => '') : ''
            t = await paneTextOf()
            const editOk = draftCount === 4 && draftPrefill.includes('官方域优先')
              && ['把修改交给 Lead', '放弃'].every((s) => t.includes(s))
            step(editOk, '研究配置编辑态：四分区草稿预填 + 单保存钮在场', draftCount === 4 ? '草稿 4 区，首区预填' : `textarea ${draftCount} 区`)
            await page.getByRole('button', { name: '放弃' }).first().click({ timeout: 5_000 }).catch(() => {})
            await wait(1_000)
            // 删除二次确认：⋯ 菜单 → 删除… → 确认 Modal → 取消（不发送）
            await page.getByRole('button', { name: '格局调研 的操作' }).first().click({ timeout: 5_000 }).catch(() => {})
            await wait(1_000)
            const hasSetDefault = await page.getByRole('menuitem', { name: '设为默认' }).isVisible({ timeout: 4_000 }).catch(() => false)
            await page.getByRole('menuitem', { name: '删除…' }).first().click({ timeout: 5_000 }).catch(() => {})
            await wait(1_000)
            t = await paneTextOf()
            const confirmOk = t.includes('删除「格局调研」？') && t.includes('确认删除') && t.includes('取消')
            step(confirmOk && hasSetDefault, '研究配置删除：⋯ 菜单 → 二次确认 Modal 在场（取消不发送）', hasSetDefault ? '' : '「设为默认」菜单项缺席')
            await page.getByRole('button', { name: '取消' }).first().click({ timeout: 5_000 }).catch(() => {})
            await wait(1_000)
          } else {
            step(false, '研究配置库条目：名称钮不可见（渲染回归）')
          }

          // 发送链路断言（2026-10-13 自测轮移除）：面板→session/prompt→回执曾以「发给抛弃型
          // 探针会话」为安全假设——实测推翻：dev home 持有凭据，任何 session/prompt 都会唤醒
          // 真模型 lead（事故实录：探针壳里的 lead 读写了 research-workspace 用户数据）。本冒烟
          // keyless 档契约 = 无模型调用——发送链路的浏览器断言整体移除，载荷逻辑由
          // tests/library-fold 例库电池钉（editInstruction 逐字），面板编辑态草稿断言保留在上块。
        } else {
          console.log('  note  研究配置库条目断言：盘侧库为空（跳过——先有库条目再验）')
        }
      }
    } else {
      console.log('  note  研究配置页签探针：无会话可开（跳过——先有任一会话再验）')
    }
  }

  // ── 自测例库工作区（2026-10-13 用户委托自测轮 → 固化为常驻断言）：抛弃型工作区 + 12 形态
  // 例库（单一正本 = scripts/lib/selftest-library.mjs，与 tests/library-fold 电池共用）驱动真
  // 面板逐例对账——含 BUG-025 修复面（legacy 单块渲染 / 混居双块 / 编辑预填 / 整段载荷回执）。
  // 种子与探针会话自产自销（runtime/smoke-workspace/ 下覆盖写），不触 research-workspace
  // 用户库；探针会话残留与渐进面探针同规（定期清理正本 = 录制器头注）。
  {
    const SELFTEST_DIR = join(ROOT, 'runtime', 'smoke-workspace', 'lib-selftest')
    mkdirSync(SELFTEST_DIR, { recursive: true })
    writeFileSync(join(SELFTEST_DIR, 'method-library.md'), SELFTEST_LIBRARY)
    const ws2 = await rpc(base, cookie, 'workspace/create', { request: { path: SELFTEST_DIR } })
    const ws2Id = ws2?.workspace?.workspaceId ?? ws2?.workspaceId
    // 绑定路径 = 最新会话默认视图：session/create 一个 lib-selftest 工作区的会话（不重命名、
    // 不发消息、不点侧栏行——空白会话被侧栏隐藏且搜索排除，但 web 重载后默认打开最新会话，
    // 两轮探针实证）→ active 会话 cwd = 种子目录 →「研究配置」页签按会话工作区读
    // method-library.md → 12 形态例库投影。零提示零唤醒（keyless 档契约 = 无模型调用；
    // 2026-10-13 自测轮事故实录：dev home 持有凭据，session/prompt 会唤醒真模型 lead）。
    const created2 = typeof ws2Id === 'string' ? await rpc(base, cookie, 'session/create', { request: { workspaceId: ws2Id, agentPreset: 'lead' } }) : null
    const probe2Id = created2?.sessionId ?? created2?.id
    const probe2Ok = typeof ws2Id === 'string' && typeof probe2Id === 'string'
    step(probe2Ok, '自测工作区 + 最新会话已建（抛弃型，12 形态例库种子）', probe2Ok ? 'lib-selftest' : 'workspace/session RPC 未返回 id')
    if (probe2Ok) {
      // 清持久化布局态（上轮 pass 点开的会话会在重载时恢复为 active——清 storage 后 web
      // 回落默认视图 = 最新会话 = 本探针；两轮探针实证默认视图行为）
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() }).catch(() => {})
      await awaitAppReady(5_000)
      // 重载后默认视图 = 最新会话（= 上面的 lib-selftest 探针）——直接开右栏页签断言
        if (await openGuideCapsule(6_000, 6_000, 2_500)) {
          // 条目加载是异步 readFile——轮询至尾条目按钮在场。innerText 对滚动折叠区不含尾条目
          // 文本（Chromium innerText 只取滚动容器可视区——首版文本断言实红：尾两名缺席）；
          // 按钮可见性（Playwright isVisible 判 display/visibility，不判视口）是正确判据。
          let ts = await paneTextOf()
          const tailBtn = page.getByRole('button', { name: /^缩进行条目 ›/ }).first()
          for (let i = 0; i < 10 && !(await tailBtn.isVisible().catch(() => false)); i++) {
            await wait(1_000)
          }
          // ① 列表全形态投影：12 例名按钮齐 + 重名两钮 + 摘要/徽标真值（文本面）
          const entryNames = ['全量四字段', '部分字段', '空值分区', '旧格式条目', '混合条目', '名称', '同名条目', '空条目', '杂项行条目', '旧格式续行', '缩进行条目']
          const missing = []
          for (const n of entryNames) {
            const ok = await page.getByRole('button', { name: new RegExp(`^${n} ›`) }).first().isVisible({ timeout: 1_500 }).catch(() => false)
            if (!ok) missing.push(n)
          }
          const dupCount = await page.getByRole('button', { name: /^同名条目 ›/ }).count().catch(() => 0)
          const seg = ts.slice(ts.indexOf('研究配置'))
          const summaryOk = seg.includes('官方域优先') && seg.includes('广度优先铺方向') && seg.includes('新字段在场')
          const badgeOk = seg.includes('默认偏好')
          step(missing.length === 0 && dupCount === 2 && summaryOk && badgeOk, '自测例库·列表投影：12 形态全名按钮 + 重名两钮 + 摘要真值 + 默认徽标',
            [missing.length === 0 ? '' : `例名缺席：${missing.join('、')}`, dupCount === 2 ? '' : `重名 ${dupCount} 钮`, summaryOk ? '' : '摘要不符', badgeOk ? '' : '徽标缺席'].filter((s) => s !== '').join('；') || '全中')
          // ② BUG-025·纯旧格式条目：单块「自定义要求」，无 4×（未设置）噪音
          await page.getByRole('button', { name: /旧格式条目 ›/ }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_500)
          ts = await paneTextOf()
          const legacyReadOk = ts.includes('自定义要求') && ts.includes('广度优先铺方向') && ts.includes('地图类问题适用') && ts.includes('来源：') && !ts.includes('（未设置）')
          step(legacyReadOk, '自测例库·BUG-025 修复面：纯旧格式详情 = 单块「自定义要求」（无未设置噪音）')
          // ③ BUG-025·编辑预填（4 分区 + 1 旧正文；不发送——载荷文本由 tests/library-fold
          // 电池逐字钉，发送链路断言因 keyless 契约移除，见上块注）
          await page.getByRole('button', { name: '编辑内容' }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_000)
          const ta = page.locator('textarea')
          const taCount = await ta.count().catch(() => 0)
          const legacyDraft = taCount === 5 ? await ta.nth(4).inputValue().catch(() => '') : ''
          step(taCount === 5 && legacyDraft.includes('广度优先铺方向'), '自测例库·BUG-025 修复面：编辑态旧正文预填（4 分区 + 1 旧正文）', `textarea ${taCount} 区`)
          await page.getByRole('button', { name: '放弃' }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_000)
          // ④ 混居条目：四分区 + 「自定义要求（旧）」双块；编辑预填分区与旧正文并存
          await page.getByRole('button', { name: /混合条目 ›/ }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_500)
          ts = await paneTextOf()
          const mixedReadOk = ts.includes('找什么资料') && ts.includes('新字段在场') && ts.includes('自定义要求（旧）') && ts.includes('旧文残留')
          step(mixedReadOk, '自测例库·混居条目：四分区 + 自定义要求（旧）双块（内容零丢失）')
          await page.getByRole('button', { name: '编辑内容' }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_000)
          const ta2 = page.locator('textarea')
          const c2 = await ta2.count().catch(() => 0)
          const firstDraft = c2 === 5 ? await ta2.first().inputValue().catch(() => '') : ''
          const lastDraft = c2 === 5 ? await ta2.nth(4).inputValue().catch(() => '') : ''
          step(c2 === 5 && firstDraft.includes('新字段在场') && lastDraft.includes('旧文残留'), '自测例库·混居编辑：分区预填 + 旧正文预填并存', `textarea ${c2} 区`)
          await page.getByRole('button', { name: '放弃' }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_000)
          // ⑤ 空值分区：缺席分区显式「（未设置）」，在场分区有内容
          await page.getByRole('button', { name: /空值分区 ›/ }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_500)
          ts = await paneTextOf()
          step(ts.includes('逐字转写') && ts.includes('（未设置）'), '自测例库·空值分区：缺席显式未设置、在场有内容')
          await page.getByRole('button', { name: '关闭详情' }).first().click({ timeout: 5_000 }).catch(() => {})
        } else {
          step(false, '自测例库：lib-selftest 新会话上「研究配置」胶囊不可见')
        }
    }
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
