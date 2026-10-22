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
// 相位地图（2026-10-21 相位化重构；相位函数定义序 = 执行序，原"第一遍 c 排在第二遍之后"
// 的命名/顺序错位已消灭——相位名按物理执行顺序编号）：
//   setup    前置：RPC 建工作区/探针会话 + 真浏览器就位 + 装配断言①-④ → setupProbeSession
//   pass-1   绑定会话渐进面（磁盘真值对账）→ pass1BoundFacePhase（本件）
//   pass-2   未绑定会话负样本 → pass2UnboundNegativePhase（本件）
//   pass-3   既有会话活动流 → pass3ActivityStreamPhase（本件）
//   pass-4   「研究配置」页签 → pass4ConfigTabPhase（client-load-config.mjs）
//   pass-5   终稿页签端到端 → pass5FinalDeliveryPhase（本件）
// 模块构成：本件 = boot/RPC/断言收集器 + 文件级共享 helper（awaitAppReady/openGuideCapsule/
//   openPane/paneTextOf/dialogTextOf——相位间共用，不再闭包在 try 内）+ pass-1/2/3/5；
//   侧栏会话定位（clickRowByText / openSessionById）= scripts/lib/web-ui-nav.mjs **唯一正本**
//   （data-row-key 主锚——2026-10-21 收拢，本件原私有 clickRowByText/openSessionByRowKey 退役）；
//   scripts/smoke/client-load-config.mjs = pass-4
//   （「研究配置」摘要面——验证的是不同页签，拆独立模块；boot 入口与端口 3109 不变，
//   不新增 smoke 面、不动 route 表）；scripts/smoke/client-load-reference.mjs = 磁盘参考
//   对象构建器（绑定/未绑定/交付候选选取合同）。
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
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from '../lib/env.mjs'
import { authenticate, bootWeb, makeRpc } from '../lib/web-harness.mjs'
import { assertVendorArtifacts, ARTIFACT_REMEDY } from '../lib/vendor-artifacts.mjs'
import { launchChromium, loadChromium } from '../lib/playwright.mjs'
import { clientHistoryWindow, readSessionEvents, resolveSessionLog, researchWorkspaceGroup } from '../lib/session-log.mjs'
import { prepareClientLoadReference } from './client-load-reference.mjs'
import { pass4ConfigTabPhase } from './client-load-config.mjs'
import { clickRowByText, expandGroup, openSessionById, SIDEBAR_GROUP_CANDIDATES } from '../lib/web-ui-nav.mjs'
import { deriveAnchors, foldHitlPending } from '../../packages/deep-research-pack/src/lib/hitl-fold.ts'
import { deriveBusinessBrief } from '../../packages/deep-research-pack/src/lib/brief-fold.ts'
import { foldActivityRows } from '../../packages/deep-research-pack/src/lib/activity-fold.ts'
import { streamFailureOf } from '../../packages/deep-research-pack/src/lib/stream-failure.ts'
import { latestFinalDelivery } from '../../packages/deep-research-pack/src/lib/final-target.ts'

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
// RPC 正本 = lib/web-harness.makeRpc（原值逐字参数化：前缀 `cls-`、**无** AbortSignal 预算、
// 失败文案（全角冒号）与 200 字符截断）
const rpc = makeRpc({
  prefix: 'cls-',
  errorOf: (endpoint, body) => `${endpoint} 失败：${JSON.stringify(body?.result?.error ?? body).slice(0, 200)}`,
})

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

/** boot web（源码域 overlay 通道 + agent-team host 行），等到启动横幅打印带 token 的 URL。
 *  启停与横幅等待正本 = lib/web-harness.bootWeb；本件的原值：非组长（detached: false）、`scrubbedEnv`、
 *  超时 BOOT_TIMEOUT_MS、尾部 800 字符（**无**失败收割包装——本站点原样即无）。 */
async function boot() {
  const booted = await bootWeb({
    bin, cwd: ROOT, profile: 'web', patchPath: teamPatchPath, port: PORT,
    env: scrubbedEnv({ DSH_HOME: home }), timeoutMs: BOOT_TIMEOUT_MS, tailChars: 800,
    detached: false, // 原值：本站点非组长（不整组收割；收尾用 child.kill('SIGTERM')）
  })
  return { child: booted.child, token: booted.token }
}

const failures = []
const skipped = []
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
const { boundSession: initialBoundSession, unboundCandidates, deliveredSessions, fileFaceOf } = prepareClientLoadReference({ root: ROOT, sessionsRoot, sessionGroup })
let boundSession = initialBoundSession

// vendor follow 开窗快照的盘侧复刻（对账同窗，勿折全量日志）：语义 = api/session-controller
// src/history.ts `paginate` + `DEFAULT_MAX_MESSAGES = 50`——从日志末尾倒序数 50 条 surface
// append 消息事件（user/message | assistant/message），第 50 条处（其 sourceEventSeqs 组
// 起点更早则取组起点；seq = 稠密零基下标）定为切点，页 = 切点到末尾的**全部**事件（非
// 消息事件一并含入）——窗口远大于「50 条事件」。pack client follow 未带 maxMessages →
// UI 活动流折的正是这窗（2026-10-13 实红：全量折算 25 行 vs 窗折算 16 行 = UI 实测）。
const clientHistoryWindowOf = clientHistoryWindow
const expectedFace = boundSession !== null ? fileFaceOf(boundSession.slug) : null

// 锚点断言的取态源标注（BUG-003 卡"牵出的失败类"收口）：步骤/done = deriveSteps（lib 同源）·
// 锚点 passed/pending = deriveAnchors（lib 同源）· 证据计数/交付态/问题行 = 盘侧文件事实 ·
// 渲染观察 = 页面 DOM——四类源各归各，不再有任何手抄镜像。
const anchorBound = boundSession !== null && expectedFace !== null

const { child, token } = await boot()
let page
let browser = null
let consoleErrors = []
let artifactsSaved = null
// 失败现场（审计 P0-4）：截图 + DOM + console + meta。agent 的"看见页面"最小证据；
// 成功不写，失败/异常写 timestamped 目录，路径打印到 stderr。
const saveArtifacts = async (reason, extra = {}) => {
  if (page === null || page === undefined || artifactsSaved !== null) return artifactsSaved
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = join(ROOT, 'runtime', 'smoke-workspace', `client-load-${stamp}`)
  try {
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: join(dir, 'page.png'), fullPage: true }).catch(() => {})
    writeFileSync(join(dir, 'page.html'), await page.content().catch(() => ''))
    writeFileSync(join(dir, 'console.txt'), consoleErrors.join('\n'))
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({
      reason, at: new Date().toISOString(), failures, skipped, extra, consoleErrors,
    }, null, 2))
    artifactsSaved = dir
    console.error(`client-load-smoke: 失败现场 ${dir}（page.png / page.html / console.txt / meta.json）`)
    return dir
  } catch (error) {
    console.error(`client-load-smoke: 现场保存失败：${error.message}`)
    return null
  }
}

// ══ 文件级共享 helper（2026-10-21 相位化：原闭包在 try 内、缩深 7-8 层，提为文件级——
//    相位函数与 client-load-config.mjs 的 pass-4 共用；page 按 Playwright 鸭子类型传参）══

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
// 侧栏会话定位全套（clickRowByText / openSessionById / expandGroup / 候选分组名）=
// lib/web-ui-nav.mjs **唯一正本**（data-row-key 主锚，2026-10-21 收拢——本件原私有
// clickRowByText / openSessionByRowKey 与 hitl-answer / e2e-021rc2 / cdp-probe /
// client-hitl-smoke 的私有版全部退役改调 lib；收拢裁决与实红家谱见 lib 头注）。
// 页面就绪序列（reload → New Session 首屏字样 → 稳定窗）——收口本文件六处同形重复；
// settleMs 逐调用点保持原值（各处的稳定窗是实测调的，不统一）。
async function awaitAppReady(page, settleMs) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: RENDER_TIMEOUT_MS }).catch(() => {})
  await wait(settleMs)
}
// 「研究配置」guide 胶囊打开序列：先试已停靠芯片（展开右栏后直接在场），不在则走 dock
// 「New tab」开 guide 页再试——两条路都试（company 配方核心）。时序参数逐调用点保持
// 原值（探测窗/重试窗/点击后稳定窗是各上下文实测调的，不统一）；返回 ok = 胶囊已点开。
async function openGuideCapsule(page, probeMs, retryMs, afterClickMs, pattern = /研究配置/) {
  const expand = page.getByRole('button', { name: 'Open right sidebar' })
  if (await expand.count() > 0) await expand.first().click({ timeout: 8_000 }).catch(() => {})
  await wait(1_500)
  let cap = page.getByRole('button', { name: pattern }).first()
  let ok = await cap.isVisible({ timeout: probeMs }).catch(() => false)
  if (!ok) {
    const addTab = page.getByRole('button', { name: 'New tab' }).first()
    if (await addTab.count() > 0) {
      await addTab.click({ timeout: 5_000 }).catch(() => {})
      await wait(2_000)
      cap = page.getByRole('button', { name: pattern }).first()
      ok = await cap.isVisible({ timeout: retryMs }).catch(() => false)
    }
  }
  if (ok) {
    await cap.click({ timeout: 5_000 }).catch(() => {})
    await wait(afterClickMs)
  }
  return ok
}

async function openPane(page) {
  const expand = page.getByRole('button', { name: 'Open right sidebar' })
  if (await expand.count() > 0) await expand.first().click({ timeout: 8_000 }).catch(() => {})
  await wait(1_500)
  const capsule = page.getByRole('button', { name: /研究状态/ }).first()
  const ok = await capsule.isVisible({ timeout: 12_000 }).catch(() => false)
  if (ok) { await capsule.click({ timeout: 5_000 }).catch(() => {}); await wait(4_000) }
  return ok
}
const paneTextOf = (page) => page.evaluate(() => document.body?.innerText ?? '')
// 当前主视图选中的会话行键（`aria-selected=true`）——行键是 sessionId 的权威投影；
// 标题/内容可能因同名会话而骗过断言（2026-10-21 实红：绑定 d47b… 无团队，页面停在 1392… 团队会话）。
const activeSessionRowKey = (page) => page.evaluate(() =>
  document.querySelector('[data-row-key^="session:"][aria-selected="true"]')?.getAttribute('data-row-key') ?? null)
// 弹窗内容读 textContent（不看滚动位置）：详情正文内滚后，innerText 只含可视区文本——
// 用它断言"块在场"会随滚动位置假红（2026-10-18 实测缺陷修复的配套）。
const dialogTextOf = (page) => page.locator('[role="dialog"]').first().textContent().catch(() => '')

// ══ 相位函数（定义序 = 执行序；共享状态 = 模块级 boundSession/unboundSession/page）══

/** setup：造渐进面断言的前提——注册研究工作区 + workspaceId 形态建探针会话（bundle 在该
 *  工作区根内）+ 真浏览器就位 + 装配断言①-④ + 探针会话改名。返回 { base, cookie }。 */
async function setupProbeSession() {
  const base = `http://127.0.0.1:${PORT}`
  const cookie = await authenticate(base, token)
  const ws = await rpc(base, cookie, 'workspace/create', { request: { path: join(ROOT, 'research-workspace') } })
  const workspaceId = ws?.workspace?.workspaceId ?? ws?.workspaceId
  step(typeof workspaceId === 'string', '研究工作区已注册（workspace/create 幂等）', String(workspaceId).slice(0, 8))
  const created = await rpc(base, cookie, 'session/create', { request: { workspaceId, agentPreset: 'lead' } })
  const probeSessionId = created?.sessionId ?? created?.id
  step(typeof probeSessionId === 'string', '探针会话已建在 research-workspace（workspaceId 形态）', String(probeSessionId).slice(8, 16))

  const chromium = await loadChromium(ROOT)
  browser = await launchChromium(chromium)
  page = await browser.newPage()
  consoleErrors = []
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
  await wait(1_500)

  // ── 探针会话改名（两遍断言的前置：探针会话=research-workspace，验渐进面真数据；
  //    既有会话验活动流）──
  const PROBE_TITLE = '渐进面探针会话'
  await rpc(base, cookie, 'session/rename', { request: { sessionId: probeSessionId, title: PROBE_TITLE } })
  return { base, cookie }
}

/** pass-1：绑定会话（磁盘侧定位——渐进面真数据 = 本会话自己的 bundle，磁盘认证对账）。 */
async function pass1BoundFacePhase() {
  await awaitAppReady(page, 6_000)
  const boundOk = boundSession !== null && expectedFace !== null
  step(boundOk, '磁盘侧找到绑定 run 的带历史会话（渐进面真数据源）', boundOk ? `「${boundSession.title}」→ drt_${boundSession.slug}` : '缺——先跑一场 run（run 通道现用 workspaceId 形态建会话）')
  if (boundOk) {
    const opened = (await openSessionById(page, boundSession.sessionId, boundSession.title)).found
    await wait(3_000)
    // marker 来自 journal 的**原始 Markdown**（可能含链接/反引号），页面上是渲染后的文本——
    // 两侧都剥掉记号再比（2026-10-20 实测：原文 `[final.md](drt_…)` 在 UI 里只剩 `final.md`）。
    const normalizeText = (text) => text.replace(/[\s[\]()*`#>_]/g, '')
    const markerNeedle = boundSession.marker === null ? null : normalizeText(boundSession.marker).slice(0, 12)
    const onTarget = opened && (markerNeedle === null || normalizeText(await paneTextOf(page)).includes(markerNeedle))
    step(opened && onTarget, '绑定会话在侧栏可开且主视图已切换（行键 + 身份 marker）',
      onTarget ? `marker=${JSON.stringify(markerNeedle)}` : `marker 未命中：${JSON.stringify(markerNeedle)}`)
    if (opened) {
      await wait(4_000)
      const capOk = await openPane(page)
      step(capOk, '「研究状态」guide 胶囊在场（tab 类型注册成功 + 右栏展开）')
      if (capOk) {
        await wait(6_000)
        const paneText = await paneTextOf(page)
        let seg = paneText.slice(paneText.indexOf('研究状态'))
        // UI/盘侧时点竞态收口（2026-10-11 首验两红）：①UI bundle 面有 30s 刷新周期（slug
        // 变化即扫 + 定时），盘侧文件现扫可领先 UI 一拍；②lead journal 快照取自 boot 前，
        // 挂起/锚点期望拿旧态对 UI 实时态会假红（实测：快照 HITL2 挂起 vs UI 停靠点已过 2）。
        // 处置 = 两侧都现扫（journal 重读 + 文件现扫），不一致跨刷新周期复核一次，仍不一致
        // 才判红；后续断言用复核后的快照对。
        // ⑤ 行按**元素**读（整段文本会被聊天里的"已交付"污染——2026-10-20 实测假绿：
        // UI 明明"未绑定"、断言却因聊天正文里出现过"已交付"而判过）。
        const faceRowText = () => page.evaluate(() => {
          const span = [...document.querySelectorAll('span')].find((n) => /^证据 \d+ 份$/.test((n.textContent ?? '').trim()))
          return span?.parentElement?.innerText ?? ''
        })
        const parseUiFace = (segText, rowText) => ({
          evidence: Number((rowText.match(/证据 (\d+) 份/) ?? segText.match(/证据 (\d+) 份/) ?? [])[1] ?? Number.NaN),
          delivered: /已交付/.test(rowText),
          passed: Number((segText.match(/停靠点已过 (\d+) 个/) ?? [])[1] ?? Number.NaN),
        })
        let faceNow = null
        const diskSideNow = () => {
          const { readable, events } = readSessionEvents(boundSession.logPath)
          if (readable && events.length > 0) {
            boundSession = { ...boundSession, events, tailAskPending: foldHitlPending(events).pending }
          }
          faceNow = fileFaceOf(boundSession.slug) ?? expectedFace
          // 锚点也按**客户端窗口**折（UI 的 journalEvents = 开场快照那一窗；全量 log 会假红）
          const anchors = deriveAnchors(clientHistoryWindowOf(boundSession.events), { question: faceNow.hasQuestion, delivered: faceNow.delivered })
          // 交付态 = present 见证（与页签同源折算 = lib/final-target）；final.md 在场仍是步态/锚点
          // 的输入（交付阶段 current），两者不互相顶替——2026-10-20 起 UI ⑤ 的 ✅ 只认 present。
          const delivery = latestFinalDelivery(clientHistoryWindowOf(boundSession.events))
          return {
            evidence: faceNow.evidenceCount, delivered: delivery !== null, delivery,
            deliveredFile: faceNow.delivered, base: faceNow.base,
            passed: anchors.filter((a) => a.state === 'passed').length, anchors,
          }
        }
        let diskSide = diskSideNow()
        let uiFace = parseUiFace(seg, await faceRowText())
        // 不一致即再水化复核（有界两轮）：仅等待不够——被跟会话若在**别的 host** 上活跃推进
        // （run 通道 3083 起飞、本 smoke 自起 web 是被动跟读者），被动侧日志尾部追平可超过
        // 30s 刷新周期（2026-10-11 首验实测：HITL2 ask 落盘后 smoke 浏览器仍渲染旧尾部）；
        // reload 强制重 follow → host 重读 journal 发新快照。仍不一致才判红。
        for (let attempt = 0; attempt < 2
          && (uiFace.evidence !== diskSide.evidence || uiFace.delivered !== diskSide.delivered || uiFace.passed !== diskSide.passed); attempt++) {
          await wait(20_000)
          await awaitAppReady(page, 4_000)
          if (!(await clickRowByText(page, boundSession.title))) break
          await wait(4_000)
          if (!(await openPane(page))) break
          await wait(6_000)
          const paneAgain = await paneTextOf(page)
          seg = paneAgain.slice(paneAgain.indexOf('研究状态'))
          uiFace = parseUiFace(seg, await faceRowText())
          diskSide = diskSideNow()
        }
        // 渐进面硬断言（会话绑定 + 位置=状态两位置：证据计数/交付态/问题行与磁盘真值对账）
        // 摘要块就绪谓词（BUG-033，2026-10-17）：芯片（✅ 已交付 / 证据计数）与业务摘要块**不在同一帧**可用——
        // 摘要块滞后时落读会假红（合成水化延迟实测：读点命中 0/3、+1.5s 仍 0/3、+3.0s 才 3/3，而芯片
        // UI-✅/UI-face.delivered 一开始就在场）。处置 = **等显式状态**：有界轮询到摘要块（🎯 行）在场再判，
        // 并在块就绪后刷新**同一快照**（seg/uiFace）供后续断言使用。理由 = 浏览器渲染边界（scripts/AGENTS
        // 的重试白名单）。⚠ 不是掩盖产品错态：产品侧数百 ms–数秒内自愈，等的是"自愈后的稳定态"；
        // 若摘要块**始终**不渲染，本等待耗尽后断言照红（有界 20×1s）。
        for (let i = 0; i < 20 && !seg.includes('🎯'); i++) {
          await wait(1_000)
          const t = await paneTextOf(page)
          seg = t.slice(t.indexOf('研究状态'))
          uiFace = parseUiFace(seg, await faceRowText())
        }
        await wait(300) // 摘要块在场后再让一帧（避免读到"块在、行未满"的边界帧）
        {
          const t = await paneTextOf(page)
          const settled = t.slice(t.indexOf('研究状态'))
          if (settled.includes('🎯')) { seg = settled; uiFace = parseUiFace(seg, await faceRowText()) }
        }
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
          '重入点描边（回边落点 = 挖掘；交付审阅非 upcoming 才扫边）', `outline=${rail.reentry ?? '无'}（loopOn=${loopExpected}）`)
        step(Number.isInteger(uiFace.evidence) && uiFace.evidence === faceNow.evidenceCount,
          '证据计数 = 磁盘真值（会话绑定 + 根/archive 两位置）', `UI ${uiFace.evidence} / 磁盘 ${faceNow.evidenceCount}`)
        const delivOk = uiFace.delivered === diskSide.delivered
        step(delivOk, '交付态 = present 见证（门②）而非 final.md 在场',
          diskSide.delivered ? `present → ✅ 已交付 · 读终稿（${diskSide.delivery.path}）`
            : `无 present → 只显示承诺行（final.md 在场=${diskSide.deliveredFile}）`)
        // 锚点入轨断言（RFC cockpit-flow-face）：轨道渲染 + 诚实线计数与盘侧文件事实对账
        const railOk = seg.includes('◆立项确认') && seg.includes('◆交付审阅')
        step(railOk, '流程轨道渲染（◆立项确认 + ◆交付审阅在场）')
        // ↻ 回边盘侧真值（BUG-003 合流）：直调 hitl-fold.deriveAnchors（UI 同一函数）取
        // 交付审阅锚态——旧手抄公式（delivered ∨ tailAskPending）停留在 BUG-002 前的
        // 「一律记交付审阅」旧启发式，mid-flow 挂起被误判为回边应亮，废。
        const rerunLabels = ['补研究 = 同 bundle 回挖掘、final/ vN+1', '表述修订 = 原位改、版本不变', '结构性重构 = 另起新 bundle']
        const rerunLabelsVisible = rerunLabels.every((label) => seg.includes(label))
        step(loopExpected === seg.includes('↻ rerun 图例（非执行记录）') && (!loopExpected || rerunLabelsVisible), '↻ rerun 三分图例 = NODES 合同（图例不证明执行；v2+ 文件版本才是证据扩张凭据）', `loopOn=${loopExpected} labelsVisible=${rerunLabelsVisible}（anchor-2=${String(diskAnchors[1]?.state)} tailAskPending=${boundSession.tailAskPending}）`)
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
        // 与 UI 同窗：页签折的是 follow 开场快照那一窗，不是全量日志（2026-10-20 实测：
        // 绑到已交付的老会话时，全量 fold 的挂起/交付态与窗内不同 → 业务摘要期望假红）。
        const windowedEvents = clientHistoryWindowOf(boundSession.events)
        const hitlNow = foldHitlPending(windowedEvents)
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
          // delivered = present 见证（组件同源输入 = lib/final-target 的窗口折叠），不是 final.md
          // 在场——两者在综合完成到交付之间不同，混用会在这段窗口里假红/假绿。
          delivered: diskSide.delivered,
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
            : `缺行：${briefMissing.map((l) => l.slice(0, 16)).join(' ｜ ')} ｜ 会话=${boundSession.title} ｜ 期望stage=${expectedBrief.stageLine} ｜ UI=${seg.slice(0, 260).replace(/\s+/g, ' ')}`)
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
          // pass-2 已覆盖「无团队 → 队员区不渲染」负例。此处不再对绑定会话重复断言：
          // 右栏 pane 可能仍钉在另一会话（2026-10-21 实测：主视图 active row = 绑定 d47b…，
          // 面板仍显示 1392… 的 Rerun8 团队/2 subagents）——那是 pane 作用域事实，不是
          // 本页签能区分的行为；成员正例仍由 spawnNames>0 分支覆盖。
        }
      }
    }
  }
}

/** pass-2：未绑定会话负样本（有样本才跑）——提示行在场 + 零别家渐进面泄漏
 * （候选逐个试到能点开为止——子代理子会话可能不进侧栏，标题垃圾的跳过）。 */
async function pass2UnboundNegativePhase() {
  if (unboundCandidates.length > 0) {
    for (const cand of unboundCandidates) {
      await awaitAppReady(page, 5_000)
      const opened2 = await clickRowByText(page, cand.title)
      if (!opened2) continue
      await wait(4_000)
      const capOk2 = await openPane(page)
      if (!capOk2) continue
      await wait(5_000)
      const t2 = await paneTextOf(page)
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
      // 互补案例（子卡① ①-1／①-6）：未绑定会话上「本次研究」区必须走**无 run** 态——给入口、
      // 不借用别家 run 的方法名、不回落默认打法（单测覆盖五态，这里钉真浏览器上的那一态）。
      if (await openGuideCapsule(page, 6_000, 6_000, 2_500)) {
        const cfg = (await dialogTextOf(page)) ?? ''
        const cfgText = cfg !== '' ? cfg : await paneTextOf(page)
        const noRunOk = cfgText.includes('本会话暂无研究') && !cfgText.includes('本次研究：')
        step(noRunOk, '未绑定会话·本次研究区：无 run 态如实（给入口、不回落默认打法名）')
      } else {
        console.log('  note  未绑定会话·本次研究区：配置胶囊不可开（跳过——右栏态依赖）')
      }
      break
    }
    if (unboundSession === null) console.log('  note  未绑定会话负样本：候选都不可点开（子会话不进侧栏？跳过）')
  } else {
    console.log('  note  未绑定会话负样本：无样本（跳过——先跑 snapshot-replay 冒烟产生纯检索会话）')
  }
}

/** pass-3：既有会话（有历史 → 活动流断言）。先 reload：此前相位点击后侧栏可能重排/滚动，
 *  直接找行会 miss（实测）——reload 回到干净列表态。 */
async function pass3ActivityStreamPhase() {
  await awaitAppReady(page, 5_000)
  // 侧栏会话列表是渐进加载；源 web 冷启动时骨架可能比 5s 久（2026-10-22 实测 5 个 session
  // 全 open=false，页面仍是 skeleton）。多等一轮再按 data-row-key 精定位，避免把加载慢误判成
  // 选行缺陷；仍 miss 时照旧报红。
  await wait(6_000)
  const SESSION_TITLE = SESSION_TITLE_ARG ?? boundSession?.title ?? null
  // 打开方式 = **按 sessionId 精定位优先**（2026-10-19 换 pin 实红）：标题匹配是文本启发式，
  // dev home 里存在标题互为子串的会话（「Claude 模型发布线追踪」⊂「Anthropic Claude 模型发布线
  // 追踪」），一旦点到别家会话，活动流/队员/摘要三条断言就按错对象判红（表现像 pin 回归，
  // 实为选行缺陷）。绑定会话的 id 就在其日志目录名里（权威），`[data-row-key]` 定位不经文本。
  const boundSessionId = boundSession?.logPath !== undefined
    ? boundSession.logPath.split(/[/\\]/).slice(-2)[0] ?? null
    : null
  let sessionOk = false
  // **按 sessionId 精定位优先**（2026-10-21 复跑实红）：标题匹配是文本启发式，dev home 里
  // 存在标题互为子串/同名跨组的会话；一旦点到别家会话，活动流/队员/摘要三条断言就按错对象
  // 判红（表现像产品回归，实为选行缺陷）。`[data-row-key]` 定位不经文本；标题路线只作
  // 折叠态/深列表的退路（它内含 Show N more / Search 兜底）。
  if (boundSessionId !== null) {
    sessionOk = (await openSessionById(page, boundSessionId, SESSION_TITLE)).found
  }
  // 有 boundSessionId 时**绝不**退回按标题点：标题重名会打开别家（2026-10-21 实红：
  // 绑定会话无团队，却打开 Rerun8 团队会话）。只有调用方显式 --session 且没有绑定对象时，
  // 标题才是唯一可用定位。
  if (!sessionOk && boundSessionId === null && SESSION_TITLE !== null) {
    sessionOk = await clickRowByText(page, SESSION_TITLE)
  }
  if (!sessionOk && (boundSessionId !== null || SESSION_TITLE !== null)) {
    // 折叠态：逐组展开后重试（侧栏只展开 active 会话所在的组；目标会话的组随其 cwd
    // 走——BUG-002 清扫轮实证：老 ad-hoc 会话在 harness-home 组，不在 research-workspace）。
    // 每展开一组，先按 id 精定位；只有标题模式才退回标题匹配——行未渲染时 `[data-row-key]`
    // 也查不到，展开是前置条件。
    for (const g of SIDEBAR_GROUP_CANDIDATES) {
      await expandGroup(page, g)
      if (boundSessionId !== null) sessionOk = (await openSessionById(page, boundSessionId, SESSION_TITLE)).found
      if (!sessionOk && boundSessionId === null && SESSION_TITLE !== null) sessionOk = await clickRowByText(page, SESSION_TITLE)
      if (sessionOk) break
    }
  }
  step(sessionOk, '既有会话在场（journal 数据源；折叠组自动展开）', sessionOk ? SESSION_TITLE : 'dev home 缺该会话——用 --session 指定')
  if (sessionOk) {
    await wait(5_000)
    let activeKey = await activeSessionRowKey(page)
    if (boundSessionId !== null && activeKey !== `session:${boundSessionId}`) {
      // 标题相同/内容相似时，点击行后主视图可能仍停在旧会话（2026-10-21 实红：绑定 d47b…
      // 无团队，页面停在 1392… 团队会话）。reload 回到干净列表态，再按行键精定位一次；
      // 仍不切换 = 真导航缺陷，下面的 active-row 断言照红并停止，避免用错对象级联假红。
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
      await awaitAppReady(page, 5_000)
      await openSessionById(page, boundSessionId, SESSION_TITLE)
      for (let i = 0; i < 10 && activeKey !== `session:${boundSessionId}`; i++) {
        await wait(1_000)
        activeKey = await activeSessionRowKey(page)
      }
    }
    const activeOk = boundSessionId === null || activeKey === `session:${boundSessionId}`
    step(activeOk, '主视图 active row = 绑定会话 id（data-row-key）',
      activeOk ? String(activeKey) : `active=${String(activeKey)} bound=session:${boundSessionId}`)
    if (!activeOk) return
    // 右栏可能仍钉在上一条会话（vendor 面板状态）；收起再展开强制按当前会话重挂。
    const collapse = page.getByRole('button', { name: 'Collapse right sidebar' })
    if (await collapse.count().catch(() => 0) > 0) {
      await collapse.first().click({ timeout: 5_000 }).catch(() => {})
      await wait(1_000)
    }
    await openPane(page)
    const paneText = await paneTextOf(page)
    const paneOk = paneText.includes('研究状态') && /(?:🔍|👥|💬|📦)/u.test(paneText)
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
}

/** pass-3b：研究图谱页签（2026-10-21 A0）——guide 胶囊在场 + 页签体渲染（空态/团队态如实）。
 *  数据面 = agentTeam 投影 + 可选 plan.md；无团队时必须显示「还没有团队投影」而不是空白/报错。 */
async function pass3bGraphTabPhase() {
  await awaitAppReady(page, 5_000)
  const ok = await openGuideCapsule(page, 4_000, 10_000, 2_500, /研究图谱/)
  step(ok, '「研究图谱」guide 胶囊在场（tab 类型注册成功 + guide 页可达）')
  if (!ok) return
  const text = await paneTextOf(page)
  const seg = text.slice(Math.max(0, text.indexOf('研究图谱')))
  const body = seg.includes('还没有团队投影')
    || seg.includes('任务板还没有任务')
    || seg.includes('任务快照')
    || /WAVE\s*\d/i.test(seg)
    || seg.includes('需要你注意')
  step(body, '研究图谱页签体渲染（空态/团队态如实，不炸）', body ? 'body=ok' : seg.slice(0, 160).replace(/\s+/g, ' '))
}

/** pass-3c：主界面「方法库」tab（2026-10-21 管理迁移）——Chat/Trajectory 同排的第三个 view。
 *  keyless：只开 tab/读库，不发任何 session/prompt；保存回执由 library-fold 单测与人工走查。 */
async function pass3cMethodLibraryPhase() {
  await awaitAppReady(page, 5_000)
  let tab = page.getByText('方法库', { exact: true }).first()
  let visible = await tab.isVisible({ timeout: 8_000 }).catch(() => false)
  // 2026-10-22 实测偶发：会话刚切换完，Chat/Trajectory 已在但第三 tab 的 conversation.view
  // 还没挂载；同一轮后段 tabs 列表里方法库已出现。reload 一次再等，避免把挂载时序当注册回归。
  if (!visible) {
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
    await awaitAppReady(page, 5_000)
    await wait(2_000)
    tab = page.getByText('方法库', { exact: true }).first()
    visible = await tab.isVisible({ timeout: 8_000 }).catch(() => false)
  }
  step(visible, '「方法库」主界面 tab 在场（conversation.view 注册成功）')
  if (!visible) return
  await tab.click({ timeout: 5_000 }).catch(() => {})
  await wait(3_000)
  const text = await paneTextOf(page)
  const body = text.includes('本工作区共享') && text.includes('我的库') && text.includes('内置参考') && text.includes('新建')
  step(body, '方法库 tab 渲染（我的库 / 内置参考 / 新建）', body ? '' : text.slice(0, 220).replace(/\s+/g, ' '))
  if (!body) return
  // 列表行点击必须到 detail（2026-10-21 实测：左侧栏透明拖拽柄在 x=406 覆盖方法库左列，
  // 行中心命中拖拽柄；修复 = aside 提升 stacking context。该断言先于编辑，防止回归）。
  const libRow = page.getByRole('button', { name: /格局调研/ }).first()
  const rowVisible = await libRow.isVisible({ timeout: 5_000 }).catch(() => false)
  if (rowVisible) await libRow.click({ timeout: 5_000 }).catch(() => {})
  await wait(800)
  const rowDetail = rowVisible && (await paneTextOf(page)).includes('怎么核实')
  step(rowDetail, '方法库列表行可点击（拖拽柄不拦截）', rowVisible ? '' : '格局调研行不可见')
  // 编辑/新建表单只验证结构与取消（keyless 零发送）；保存路径由 library-fold 单测与人工走查。
  const edit = page.getByRole('button', { name: '编辑' }).first()
  if (await edit.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await edit.click({ timeout: 5_000 }).catch(() => {})
    await wait(1_000)
    const ta = await page.locator('textarea').count().catch(() => 0)
    const formText = await paneTextOf(page)
    step(ta === 4 && formText.includes('交给 Lead 保存'), '方法库编辑表单：四字段 + 交给 Lead 保存',
      ta === 4 ? 'textarea 4' : `textarea ${ta}`)
    await page.getByRole('button', { name: '取消' }).first().click({ timeout: 5_000 }).catch(() => {})
    await wait(800)
  } else {
    step(false, '方法库库条目「编辑」不可见（渲染回归）')
  }
  const create = page.getByRole('button', { name: '新建' }).first()
  if (await create.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await create.click({ timeout: 5_000 }).catch(() => {})
    await wait(1_000)
    const ta = await page.locator('textarea').count().catch(() => 0)
    step(ta === 4, '方法库新建表单：四字段在场', ta === 4 ? 'textarea 4' : `textarea ${ta}`)
    await page.getByRole('button', { name: '取消' }).first().click({ timeout: 5_000 }).catch(() => {})
    await wait(800)
  }
  const builtin = page.getByRole('button', { name: '内置参考' }).first()
  if (await builtin.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await builtin.click({ timeout: 5_000 }).catch(() => {})
    await wait(800)
    const t = await paneTextOf(page)
    step(t.includes('内置只读'), '方法库内置参考：只读态在场')
  }
}

/** pass-5：终稿页签端到端（issue 2026-10-19）——独立目标 = dev home 里已交付的冷会话。
 *  为什么独立：主渐进面断言绑的会话可能在飞（present 未发生），而终稿的出现时机只在
 *  交付之后——拿在飞 run 验它只会永远 SKIP。选取方式是**在 UI 里试**而不是盘侧预判：
 *  状态页签的开场快照窗口（≥50 消息且跨 ≥2 回合）与盘侧复刻不必逐事件等价，盘侧"窗口内
 *  有 present"不保证 UI 这一窗里也有（2026-10-20 实测两跑两个候选一有一无）。所以逐个
 *  候选打开 → 找门 → 找到即验。到达会话的两条路：按标题（clickRowByText，自带 Show more
 *  深展开）→ 仍不在则点工作区行展开该组（左栏按工作区分组、手风琴式；组收起时会话行
 *  根本不进 DOM）。 */
async function pass5FinalDeliveryPhase() {
  const openStatusTab = async () => {
    const expandBtn = page.getByRole('button', { name: 'Open right sidebar' })
    if (await expandBtn.count() > 0 && await expandBtn.first().isVisible().catch(() => false)) {
      await expandBtn.first().click({ timeout: 8_000 }).catch(() => {})
      await wait(1_500)
    }
    const capsuleVisible = async () => page.getByRole('button', { name: /研究状态/ }).first().isVisible().catch(() => false)
    const chip = page.getByRole('tab', { name: /研究状态/ }).first()
    if (await chip.isVisible().catch(() => false)) { await chip.click({ timeout: 5_000 }).catch(() => {}); return true }
    if (await capsuleVisible()) { await page.getByRole('button', { name: /研究状态/ }).first().click({ timeout: 5_000 }).catch(() => {}); return true }
    const addTab = page.getByRole('button', { name: /^(New tab|新标签页)$/ }).first()
    if (await addTab.isVisible().catch(() => false)) {
      await addTab.click({ timeout: 5_000 }).catch(() => {})
      await wait(1_500)
      if (await capsuleVisible()) { await page.getByRole('button', { name: /研究状态/ }).first().click({ timeout: 5_000 }).catch(() => {}); return true }
    }
    return false
  }

  // 终稿端到端：优先主渐进面绑定的已交付会话（同一窗、已在手），再退冷会话候选。
  // 旧实现只扫冷会话；盘侧窗口与 UI 窗不等时把"没找到目标"判成硬红（审计 P0-4）。
  const finalCandidates = []
  const boundFace = boundSession !== null ? fileFaceOf(boundSession.slug) : null
  if (boundFace?.delivered === true && boundSession !== null) {
    finalCandidates.push({ sessionId: boundSession.sessionId, title: boundSession.title, slug: boundSession.slug, source: 'bound' })
  }
  for (const c of deliveredSessions) {
    if (!finalCandidates.some((x) => x.sessionId === c.sessionId)) finalCandidates.push({ ...c, source: 'cold' })
  }
  const trials = []
  let deliveredTarget = null
  let doorFound = false
  for (const candidate of finalCandidates) {
    const opened = (await openSessionById(page, candidate.sessionId, candidate.title)).found
    if (!opened) { trials.push({ ...candidate, opened: false, statusTab: false, door: false }); continue }
    await wait(4_000)
    const statusTab = await openStatusTab()
    if (!statusTab) { trials.push({ ...candidate, opened: true, statusTab: false, door: false }); continue }
    await wait(5_000)
    // 交付门来自 journal 流（present 事件），有界等待（≤15s）
    const door = page.getByRole('button', { name: /读终稿/ }).first()
    for (let i = 0; i < 5 && !doorFound; i++) {
      doorFound = await door.isVisible().catch(() => false)
      if (!doorFound) await wait(3_000)
    }
    trials.push({ ...candidate, opened: true, statusTab: true, door: doorFound })
    if (doorFound) { deliveredTarget = candidate; break }
  }
  if (deliveredTarget !== null && doorFound) {
    step(true, '交付目标会话可开且 ⑤ 交付门在场（present 见证）', `${deliveredTarget.title} → ${deliveredTarget.path}`)
    await page.getByRole('button', { name: /读终稿/ }).first().click({ timeout: 6_000 }).catch(() => {})
    await wait(4_000)
    const finalText = await paneTextOf(page)
    const base = fileFaceOf(deliveredTarget.slug)?.base ?? null
    const finalBody = typeof base === 'string' ? readFileSync(join(base, 'final.md'), 'utf8') : ''
    // 首标题对账：两侧都剥掉 markdown 记号再比（H1 里的 `code` / **强调** 渲染后不留记号，
    // 拿原文直比会把"渲染正确"判成红——2026-10-20 实测）。
    const normalize = (text) => text.replace(/[\s*`#>_[\]()|\-—–:：]/g, '')
    const heading = normalize((finalBody.split('\n').find((l) => l.trim().startsWith('#')) ?? '').replace(/^#+\s*/, '')).slice(0, 12)
    const tabTitles = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map((n) => (n.textContent ?? '').trim()))
    const onFinalTab = tabTitles.some((t) => t.includes('终稿'))
    step(onFinalTab, '交付门点开 → 页签标题「终稿」（extension 带接管了文件地址）', `tabs=${JSON.stringify(tabTitles)}`)
    step(heading !== '' && normalize(finalText).includes(heading), '终稿页签渲染 final.md 正文（与盘侧首标题对账）', heading)
    // 静音条断言必须读**静音条元素**：整页 innerText 会被聊天里的「当前版报告」误命中
    // （2026-10-20 实测：扫全页把"当前版"当成了静音条命中，产品其实显示 v1）。
    const stripText = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim().startsWith('过程'))
      return btn === undefined ? '' : (btn.parentElement?.innerText ?? '').replace(/\s+/g, ' ').trim()
    })
    const stripState = /审查未过|当前版|\bv\d+\b/.test(stripText)
    step(stripState, '终稿静音条三态之一在场（盘上事实，不编造）',
      stripState ? stripText.slice(0, 40) : `静音条=${JSON.stringify(stripText)}`)
    step(!/drt_[^\s]+\/(question|topics|evidence|drafts)/.test(finalText), '终稿页签不泄漏中间过程路径（负例）')
    // 页签自带的滚动口（2026-10-20 用户实测报障：vendor `.tabBody` 是 overflow:hidden 的定高
    // flex 列，页签不自己开滚动口 → 长正文被裁且滚不动）。断言 = 正文容器可溢出且 scrollTop 能动。
    const scrollProbe = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim().startsWith('过程'))
      const root = btn?.parentElement?.parentElement
      if (root == null) return { ok: false, why: 'no root' }
      const scroller = [...root.children].find((c) => getComputedStyle(c).overflowY === 'auto')
      if (scroller == null) return { ok: false, why: 'no scroller' }
      const overflows = scroller.scrollHeight > scroller.clientHeight + 4
      scroller.scrollTop = 240
      return { ok: overflows && scroller.scrollTop > 0, why: `sh=${scroller.scrollHeight} ch=${scroller.clientHeight} top=${scroller.scrollTop}` }
    })
    step(scrollProbe.ok, '终稿页签自带滚动口（长正文可滚、不被裁）', scrollProbe.why)
  } else {
    // 前置未建立 ≠ 断言红：候选窗/时序不保证 UI 这一窗里有交付门。显式 SKIP 并让脚本
    // exit 2（未跑），不制造假红；trials 给下一跳排查面。
    skipped.push(`终稿端到端：无窗口内交付目标（${finalCandidates.length} 候选）`)
    console.log(`  SKIP 终稿端到端：无窗口内交付目标（${finalCandidates.length} 候选）`)
    if (trials.length > 0) console.log(`       trials=${JSON.stringify(trials)}`)
  }
}

// ══ 主流程（相位执行序 = 相位地图；异常/失败现场与判定收尾在此）══

try {
  const { base, cookie } = await setupProbeSession()
  await pass1BoundFacePhase()
  await pass2UnboundNegativePhase()
  await pass3ActivityStreamPhase()
  await pass3bGraphTabPhase()
  await pass3cMethodLibraryPhase()
  // pass-4「研究配置」摘要 = client-load-config.mjs（env 注入主件文件级 helper 与调用时刻的
  // boundSession/unboundSession 快照）。自测例库 12 形态的浏览器相位已退役：管理迁到主界面
  // conversation.view 后，空白自测会话没有 conversation view tab；12 形态由 library-fold keyless battery 覆盖。
  await pass4ConfigTabPhase({
    page, step, wait, root: ROOT, sessionTitleArg: SESSION_TITLE_ARG,
    boundSession, unboundSession,
    awaitAppReady, openGuideCapsule, clickRowByText, paneTextOf, dialogTextOf,
  })
  await pass5FinalDeliveryPhase()
} catch (error) {
  failures.push(`浏览器断言异常: ${error.message}`)
  console.error(`  FAIL 浏览器断言异常: ${error.message}`)
  await saveArtifacts('exception', { error: error.message })
} finally {
  if (failures.length > 0) await saveArtifacts('assertions')
  if (browser !== null) await browser.close().catch(() => {})
  child.kill('SIGTERM')
  await sleep(300)
}

if (failures.length === 0) {
  console.log(skipped.length === 0
    ? '\nclient-load-smoke: ALL PASS（观察面 client 面真浏览器加载绿）'
    : `\nclient-load-smoke: ALL PASS + ${skipped.length} SKIP（未跑 ≠ 通过）：\n${skipped.join('\n')}`)
} else {
  console.log(`\nclient-load-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`)
}
process.exit(failures.length > 0 ? 1 : skipped.length > 0 ? 2 : 0)
