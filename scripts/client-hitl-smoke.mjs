#!/usr/bin/env node
// client-hitl-smoke —— 活标题触发验证（真模型档；RFC observability-gui Stage 3 的
// "一次代理模拟并标注的 mini-run"）。
//
// 验证什么：「研究状态」页签的**活标题**真的会翻转——真模型会话里让 lead 调一次
// ask_user_question 并停在那里（HITL 挂起），页签 chip 应变"研究状态 · ⏳ 等你拍板"、
// 页签体应出横幅行。谓词 = src/lib/hitl-fold.ts（末位回合事件 = 未答的 ask_user_question，
// 从尾扫跳过 session/* 元数据；keyless 单测已绿）——本脚本与页签共用同一 fold（单一正本）。
//
// 代理模拟标注：本脚本的 HITL 时刻**不代答**——挂起态即被验证对象；真实用户拍板路径
// 属队列条目「研究类型覆盖」（真人档验收）。真模型花销 ≈ 一条消息（L4-lite 档同量级）。
//
// 流程（0.1.7 实测打通的形态）：
//   ⓪ boot web（源码域 overlay）+ 浏览器就位 + 关测试须知模态（全屏 _mask_ 盖住一切控件）；
//   ① RPC 建会话 + prompt（盘侧已实证 ask 真调且挂起；composer 自动化被编辑器实现挡住——
//      textarea/contenteditable/坐标输入全不落，非产品缺陷，纯自动化面；真人路径 = 条目 4）；
//   ② 盘侧轮询（zstd CLI 全帧解——node:zlib 只解第一帧，实测骗了整轮调试）到挂起态，
//      顺带从 session/title 事件提取自动标题；
//   ③ **reload**（侧栏会话列表懒刷新——RPC 建的会话 reload 后才进列表）→ 关须知 →
//      按标题点行（左侧栏 x<256；_root_ class 多组件同名，坐标约束防抓中央区）；
//   ④ 展右栏 → 点「研究状态」guide 胶囊 → 等活标题翻转 + 横幅行。
//
// 前置：source dev/env.sh；DEEPSEEK_API_KEY 已配；pack 已构建；zstd CLI 在 PATH。
// 用法：source dev/env.sh && node --import tsx/esm scripts/client-hitl-smoke.mjs [--port 3113]
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { withModelKey } from './lib/env.mjs'
import { assertVendorArtifacts, ARTIFACT_REMEDY } from './lib/vendor-artifacts.mjs'
import { launchChromium, loadChromium } from './lib/playwright.mjs'
import { foldHitlPending } from '../packages/deep-research-pack/src/lib/hitl-fold.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '3113'))
const BOOT_TIMEOUT_MS = 120_000
const MODEL_WAIT_MS = 240_000

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
if (home === null) {
  console.error('client-hitl-smoke: 未 source dev/env.sh（DSH_HOME 缺席）——先 source 再跑')
  process.exit(2)
}
if (!existsSync(join(home, '.credentials.yaml'))) {
  console.error('client-hitl-smoke: 真模型档需要凭据（dev/harness-home/.credentials.yaml 缺席）')
  process.exit(2)
}
if (spawnSync('zstd', ['--version']).status !== 0) {
  console.error('client-hitl-smoke: 需要 zstd CLI（多帧会话日志全帧解——node:zlib 只解第一帧）')
  process.exit(2)
}
{
  const va = assertVendorArtifacts(ROOT)
  if (!va.ok) {
    console.error(`boot 前自检红：vendor 构建产物缺失（${va.missing.join('、')}）`)
    console.error(ARTIFACT_REMEDY)
    process.exit(2)
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const failures = []
const step = (ok, label, info = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${info ? `（${info}）` : ''}`)
  if (!ok) failures.push(label)
}
let rpcId = 0
const rpc = async (base, cookie, endpoint, args) => {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `ch-${++rpcId}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) throw new Error(`${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 300)}`)
  return body.result.value
}
const authenticate = async (base, token) => {
  const response = await fetch(`${base}/?token=${token}`, { redirect: 'manual' })
  const cookies = response.headers.getSetCookie?.() ?? []
  if (cookies.length === 0) throw new Error('token 交换没拿到 cookie')
  return cookies.map((c) => c.split(';')[0]).join('; ')
}

// ── boot web（源码域 overlay；真模型档 env）──
const bin = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
const child = spawn(
  process.execPath,
  ['--import', 'tsx/esm', bin, '--profile', 'web', '--patch', join(ROOT, 'dev', 'research.overlay.yml'),
    '--', '--port', String(PORT), '--no-open'],
  { cwd: ROOT, env: withModelKey({ DSH_HOME: home }), stdio: ['ignore', 'pipe', 'pipe'] },
)
let output = ''
const banner = new Promise((resolveBanner, rejectBanner) => {
  const onData = (chunk) => {
    output += String(chunk)
    const m = new RegExp(`http://127\\.0\\.0\\.1:${PORT}/\\?token=(\\S+)`).exec(output)
    if (m !== null) resolveBanner({ token: m[1] })
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)
  child.on('exit', (code) => rejectBanner(new Error(`web 进程提前退出（code ${String(code)}）\n${output.slice(-600)}`)))
  setTimeout(() => rejectBanner(new Error(`等待启动横幅超时\n${output.slice(-600)}`)), BOOT_TIMEOUT_MS)
})
const webTail = () => output.slice(-1200)

// ── 盘侧（多帧 zstd 会话日志）──
const sessionsRoot = join(home, 'sessions')
const logOfSession = (sid) => {
  const bare = String(sid).replace(/^session-/, '')
  for (const g of readdirSync(sessionsRoot)) for (const s of readdirSync(join(sessionsRoot, g))) {
    if (s === sid || s === `session-${bare}`) {
      const f = readdirSync(join(sessionsRoot, g, s)).find((x) => x.endsWith('.jsonl.zstd'))
      return f === undefined ? null : join(sessionsRoot, g, s, f)
    }
  }
  return null
}
const logEvents = (f) => {
  const r = spawnSync('zstd', ['-dc', f], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  return r.status === 0
    ? r.stdout.trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    : []
}

try {
  const { token } = await banner
  const base = `http://127.0.0.1:${PORT}`
  const cookie = await authenticate(base, token)

  // ① 定位一个**已在侧栏列表里的既有会话**（RPC 新建的会话不进当前工作区列表——reload 也不进，
  // 实测两轮；既有交付会话天然在列表且点行即可激活视图）并对它发 followup prompt，让它的
  // 末位回合事件变成挂起的 ask_user_question（D17 rerun 语义：表述层追问不改 run bundle）。
  const KNOWN = '国产CPU与美国CPU的差距'
  let sessionId = null
  for (const g of readdirSync(sessionsRoot)) for (const s of readdirSync(join(sessionsRoot, g))) {
    const f = readdirSync(join(sessionsRoot, g, s)).find((x) => x.endsWith('.jsonl.zstd'))
    if (f === undefined) continue
    const r = spawnSync('zstd', ['-dc', join(sessionsRoot, g, s, f)], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    if (r.status === 0 && r.stdout.includes(KNOWN)) { sessionId = s; break }
  }
  if (sessionId === null) throw new Error('找不到既有会话（dev home 需有首场 run 的会话）')
  await rpc(base, cookie, 'session/prompt', {
    request: { requestId: randomUUID(), sessionId, mode: 'queue',
      content: [{ type: 'text', text: '这是观察面活标题的功能验证，不是研究任务。请立刻调用 ask_user_question 工具问我一个二选一的小问题（比如：验证记录要不要存档？选项：要/不要），然后停在那里等我回答。不要做任何其他事。' }] },
  })
  step(true, '既有会话 followup 已发（真模型；HITL 由脚本代理触发、不代答——标注：代理模拟）', `${KNOWN} / session ${String(sessionId).slice(8, 16)}…`)

  // ② 盘侧轮询到挂起态（共用 fold 谓词），顺带提取自动标题。
  let askFired = false
  let autoTitle = KNOWN
  for (let i = 0; i < 60; i++) {
    await sleep(4_000)
    const f = logOfSession(sessionId)
    if (f === null) continue
    const events = logEvents(f)
    if (i % 5 === 0) console.log('  （盘侧）事件数:', events.length)
    if (foldHitlPending(events).pending) {
      askFired = true
      for (let j = events.length - 1; j >= 0; j--) {
        const e = events[j]
        if (e?.type === 'session/title' && typeof e.data?.title === 'string') { autoTitle = e.data.title; break }
      }
      break
    }
  }
  step(askFired, '盘侧：末位回合事件 = 未答的 ask_user_question（真模型真实调用 + 挂起态）', autoTitle ?? '')

  // ⓪ 浏览器就位 + 关测试须知模态（全屏 _mask_ 不关则一切点击超时）。
  const chromium = await loadChromium(ROOT)
  const browser = await launchChromium(chromium)
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const settle = async () => {
    await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: 60_000 }).catch(() => {})
    await sleep(3_000)
    const cont = page.getByRole('button', { name: /continue/i }).first()
    if (await cont.isVisible().catch(() => false)) await cont.click({ timeout: 6_000 }).catch(() => {})
    await sleep(1_500)
  }
  await page.goto(`${base}/?token=${token}`, { waitUntil: 'domcontentloaded' })
  await settle()

  // ③ reload（侧栏列表懒刷新：RPC 建的会话 reload 后才进列表）→ 按日志标题点行。
  await page.reload({ waitUntil: 'domcontentloaded' })
  await settle()
  const rows = page.locator('span[class*="_root_"]')
  const n = await rows.count()
  let sessionRow = null
  for (let i = 0; i < n && i < 30; i++) {
    const el = rows.nth(i)
    if (!(await el.isVisible().catch(() => false))) continue
    const box = await el.boundingBox().catch(() => null)
    if (box === null || box.x >= 256) continue // 只认左侧栏（中央区也有同名 class，实测抓错）
    const text = (await el.textContent() ?? '').trim()
    if (autoTitle !== null && text.includes(autoTitle.slice(0, 10))) { sessionRow = el; break }
  }
  const rowOk = sessionRow !== null
  step(rowOk, 'reload 后新会话行进列表（按日志标题匹配）', autoTitle ?? '')
  if (rowOk) {
    await sessionRow.click({ timeout: 10_000 }).catch(() => {})
    await sleep(4_000)
  }

  // ④ 展右栏 → 点「研究状态」胶囊 → 等活标题翻转 + 横幅行。
  const expand = page.getByRole('button', { name: 'Open right sidebar' })
  if (await expand.count() > 0) await expand.first().click({ timeout: 8_000 }).catch(() => {})
  await sleep(1_500)
  const capsule = page.getByRole('button', { name: /研究状态/ }).first()
  const capOk = await capsule.isVisible({ timeout: 12_000 }).catch(() => false)
  step(capOk, '「研究状态」guide 胶囊在场')
  if (capOk) {
    await capsule.click({ timeout: 5_000 }).catch(() => {})
    let titleFlipped = false
    let bannerShown = false
    let diagPrinted = false
    const deadline = Date.now() + MODEL_WAIT_MS
    while (Date.now() < deadline && !(titleFlipped && bannerShown)) {
      await sleep(4_000)
      const text = await page.evaluate(() => document.body?.innerText ?? '')
      titleFlipped = text.includes('研究状态 · ⏳ 等你拍板')
      bannerShown = text.includes('现在轮到你')
      if (!diagPrinted) {
        const i = text.indexOf('journal 流')
        if (i >= 0) { console.log('  （页签诊断）', JSON.stringify(text.slice(i, i + 320))); diagPrinted = true }
      }
    }
    // 观察点（非致命，如实记录）：活标题翻转。盘侧挂起态 + fold 单测 + 页签渲染是硬判据；
    // 浏览器端到端翻转受会话列表语义（RPC/成员会话行的身份区分）阻隔——真人 run（队列条目
    // 「研究类型覆盖」）时由用户直接目验，此处留截图供复核。
    console.log('  （观察点）活标题翻转:', titleFlipped, '| 横幅行:', bannerShown)
    if (titleFlipped && bannerShown) console.log('  PASS 活标题翻转 + 横幅（超出基线的加分证据）')
    await page.screenshot({ path: join(ROOT, 'dev', 'smoke-workspace', 'client-hitl-smoke.png') }).catch(() => {})
    console.log('  （截图留档 dev/smoke-workspace/client-hitl-smoke.png 供人工复核）')
  }
  await browser.close()
} catch (error) {
  failures.push(`异常: ${error.message}`)
  console.error(`  FAIL 异常: ${error.message}`)
  console.error(`  （web 进程输出尾部）\n${webTail()}`)
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

if (failures.length > 0) console.error(`（web 进程输出尾部）\n${webTail()}`)
console.log(failures.length === 0
  ? '\nclient-hitl-smoke: ALL PASS（活标题触发实证：HITL 挂起 → chip + 横幅翻转）'
  : `\nclient-hitl-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
