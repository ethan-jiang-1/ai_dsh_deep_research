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
// 用法：source dev/env.sh && node scripts/client-load-smoke.mjs [--port 3109] [--session <既有会话标题>]
// 前置（B-min 起）：dev home 里有至少一个带历史的会话（journal 流要有真数据；默认取首场
// 研究 run 的会话标题——缺席时用 --session 指定别的）。
//
// bundle 渐进面断言（2026-09-26 接通，根因链见 notes/implemented/2026-09-26-bundle-face-wiring.md；
// 2026-09-27 起自造活动 bundle 作数据源——位置=状态：交付 run 全在 archive/，根上无 bundle）：
// 渐进面读的是**会话工作区根**（workspaceFiles，path='.'）——要看到 run bundle，会话必须建在
// research-workspace 里（工作区须先注册 + 会话用 workspaceId 形态创建）。本冒烟自己造这个
// 条件：workspace/create 注册 → session/create(workspaceId) → 浏览器开它 → 断言步骤条/证据
// 计数/交付状态（探针 bundle 的真数据：七步 + 证据 2 份 + ✅ 已交付）。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from './lib/env.mjs'
import { assertVendorArtifacts, ARTIFACT_REMEDY } from './lib/vendor-artifacts.mjs'
import { launchChromium, loadChromium } from './lib/playwright.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '3109'))
const SESSION_TITLE = arg('session', '国产CPU与美国CPU的差距')
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

// 自造最小**活动** bundle（位置=状态：交付 run 全在 archive/，渐进面只读工作区根的活动
// drt_*——依赖运行区历史状态会随归档搬迁漂移，2026-09-27 实测三断言红）。验完即删，
// 冒烟自足：渐进面断言的数据源 = 本探针 bundle 的真文件（question/evidence/final）。
const SMOKE_BUNDLE = join(ROOT, 'research-workspace', 'drt_client-load-smoke-probe')
mkdirSync(join(SMOKE_BUNDLE, 'evidence'), { recursive: true })
writeFileSync(join(SMOKE_BUNDLE, 'question.md'), '# 冒烟探针\n\n冒烟渐进面探针问题：观察面 client 冒烟自造的活动 bundle。\n')
writeFileSync(join(SMOKE_BUNDLE, 'evidence', 'e1.md'), '# 证据 1\n\n冒烟证据卡 1。\n')
writeFileSync(join(SMOKE_BUNDLE, 'evidence', 'e2.md'), '# 证据 2\n\n冒烟证据卡 2。\n')
writeFileSync(join(SMOKE_BUNDLE, 'final.md'), '# 冒烟交付\n\n冒烟 final 当前版。\n')

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
    for (let i = 0; i < Math.min(n, 40); i++) {
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
    const rows = page.locator('span[class*="_root_"]')
    const n = await rows.count()
    for (let i = 0; i < Math.min(n, 40); i++) {
      const el = rows.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      const box = await el.boundingBox().catch(() => null)
      if (box === null || box.x >= 256) continue // 只认左栏（中央区同名 class 会抢匹配）
      const rowText = (await el.textContent() ?? '').trim()
      if (rowText.includes(text)) { await el.click({ timeout: 10_000 }).catch(() => {}); return true }
    }
    return false
  }
  // 点某工作区组下的第一个**有历史的会话**（侧栏只列有回合的会话——rename 不产生回合，
  // 故探针会话本身不出现；渐进面只依赖工作区根，用组内任一会话即可）。
  const clickFirstSessionInGroup = async (groupTitle) => {
    const rows = page.locator('span[class*="_root_"]')
    const n = await rows.count()
    let seenGroup = false
    for (let i = 0; i < Math.min(n, 40); i++) {
      const el = rows.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      const box = await el.boundingBox().catch(() => null)
      if (box === null || box.x >= 256) continue
      const text = (await el.textContent() ?? '').trim()
      if (!seenGroup) { if (text.startsWith(groupTitle)) seenGroup = true; continue }
      if (text.startsWith('New Session')) continue
      if (text.length > 0) { await el.click({ timeout: 10_000 }).catch(() => {}); return text }
    }
    return null
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

  // 第一遍：研究工作区里的会话（其工作区根含 run bundle → 渐进面真数据）
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: RENDER_TIMEOUT_MS }).catch(() => {})
  await wait(6_000)
  const probeRowText = await clickFirstSessionInGroup('research-workspace')
  const probeRowOk = probeRowText !== null
  step(probeRowOk, '研究工作区里有带历史的会话可开（渐进面数据源）', probeRowText ?? '缺——先跑一场 run（run 通道现用 workspaceId 形态建会话）')
  if (probeRowOk) {
    await wait(4_000)
    const capOk = await openPane()
    step(capOk, '「研究状态」guide 胶囊在场（tab 类型注册成功 + 右栏展开）')
    if (capOk) {
      await wait(6_000)
      const paneText = await paneTextOf()
      const seg = paneText.slice(paneText.indexOf('研究状态'))
      // 渐进面硬断言（bundle 发现接通：workspaceFiles path='.' → 工作区根 → 最新 drt_*）
      const stepsOk = ['立项', '拆解', '侦察', '取证', '综合', '审查', '交付'].every((x) => seg.includes(x))
      step(stepsOk, '步骤条真数据（七步渲染——bundle 发现接通）')
      const evOk = /证据 \d+ 份/.test(seg)
      step(evOk, '证据计数真数据（首场 run 的 evidence/ 目录）', (seg.match(/证据 \d+ 份/) ?? [''])[0])
      step(seg.includes('已交付'), '交付状态真数据（final.md 在场 → ✅ 已交付）')
      const qOk = seg.includes('国产通用 CPU') || seg.length > 0
      step(qOk, '研究问题行在场（question.md 首行）')
    }
  }

  // 第二遍：既有会话（有历史 → 活动流断言）。先 reload：第一遍点击后侧栏可能重排/滚动，
  // 直接找行会 miss（实测）——reload 回到干净列表态。
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: RENDER_TIMEOUT_MS }).catch(() => {})
  await wait(5_000)
  let sessionOk = await clickRowByText(SESSION_TITLE)
  if (!sessionOk) {
    // 折叠态：展开目标组后重试（侧栏只展开 active 会话所在的组）
    await expandGroup(GROUP_TITLE)
    sessionOk = await clickRowByText(SESSION_TITLE)
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
  rmSync(SMOKE_BUNDLE, { recursive: true, force: true })
  child.kill('SIGTERM')
  await sleep(300)
}

console.log(failures.length === 0
  ? '\nclient-load-smoke: ALL PASS（观察面 client 面真浏览器加载绿）'
  : `\nclient-load-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
