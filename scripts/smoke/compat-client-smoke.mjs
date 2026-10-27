#!/usr/bin/env node
// compat-client-smoke.mjs — 声明支持的 DSH 版本（rc.3+）上，本包 client 面真的挂得上。
//
// 为什么需要：install/dump/scaffold/remove（compat-smoke）只证安装形状；rc.2→rc.3 的增量在
// 客户端包（ui-conversation view-pins 等），页签/槽是否还能挂只有真浏览器能证。数据面机制
// 已由 rc.2↔rc.3 diff 确认一致，本烟测只证客户端面。
//
// 证明：全局 rc.3 宿主 + tarball 真安装 → 真起 web → headless chromium 加载 → 本包 client
// 零 apply 失败、/plugins/ 批次取到本包 client bundle、「研究状态」「研究配置」页签可见可开。
// 不证明：rc.4/0.2.2、模型行为、Desktop、数据面读写（由 rc.2 全档 + 数据面 diff 承担）。
//
// 用法：node scripts/smoke/compat-client-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席（未跑 ≠ 通过：无全局 rc.3、无 tarball、无团队层、无 chromium）
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { satisfiesVersion } from '../../packages/deep-research-pack/scripts/lib/version-range.mjs'
import { inferInstallAnchor } from '../../packages/deep-research-pack/scripts/lib/install-anchor.mjs'
import { scrubbedEnv } from '../lib/env.mjs'
import { reclaimPort } from '../lib/port-reclaim.mjs'
import { authenticate, makeRpc } from '../lib/web-harness.mjs'
import { launchChromium, loadChromium } from '../lib/playwright.mjs'
import { openSessionById } from '../lib/web-ui-nav.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'
const PORT = 3161
// 假 key 只用于让新 profile 的「Get started」门放行（客户端挂载证据；不调用模型）。
// 显式白名单，经 scrubbedEnv 的 explicit 参数；临时 home 成功后整目录删除。
const FAKE_KEY = 'sk-compat-smoke-FAKE-NOT-REAL-0000'
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}

// ── 前置 ────────────────────────────────────────────────────────────────────
const version = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
const found = version.status === 0 ? (String(version.stdout).match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)?.[0] ?? null) : null
if (found === null) {
  console.error('compat-client-smoke: 需要全局 dsh（本机不可用）——未跑 ≠ 通过')
  process.exit(2)
}
if (!satisfiesVersion(found, '>=0.2.1-rc.3 <0.3.0')) {
  console.error(`compat-client-smoke: 全局 dsh ${found} 不在 rc.3+ 范围——本烟测只证 rc.3+ 客户端面`)
  process.exit(2)
}
if (!existsSync(TARBALL)) {
  console.error(`compat-client-smoke: tarball 缺席（${TARBALL}）——先 node scripts/dist/export-dist.mjs`)
  process.exit(2)
}
let anchor = null
try { anchor = inferInstallAnchor() } catch { anchor = null }
if (anchor === null) {
  console.error('compat-client-smoke: 无法从 PATH 的 dsh 解析安装锚——未跑 ≠ 通过')
  process.exit(2)
}
const teamPath = join(dirname(anchor.path), 'node_modules', ...TEAM.split('/'))
if (!existsSync(join(teamPath, 'package.json'))) {
  console.error(`compat-client-smoke: 全局安装里找不到团队层（${teamPath}）——先装 ${TEAM}`)
  process.exit(2)
}
let chromium = null
try { chromium = await loadChromium(ROOT) } catch (error) {
  console.error(`compat-client-smoke: ${String(error)}——未跑 ≠ 通过`)
  process.exit(2)
}

// ── 临时真安装 ──────────────────────────────────────────────────────────────
const root = mkdtempSync(join(tmpdir(), 'dsh-compat-client-'))
const home = join(root, 'dshhome')
const ws = join(root, 'ws')
const profile = join(home, 'profiles', 'research')
const installed = join(profile, 'node_modules', 'dsh-deep-research-pack')
const env = (extra = {}) => scrubbedEnv({ DSH_HOME: home, MCP_PLAYWRIGHT: '0', ...extra })
const dsh = (args, extra = {}) => spawnSync('dsh', args, { encoding: 'utf8', env: env(extra), timeout: 180_000 })
const tail = (result) => `${result.status}\n${(result.stderr || result.stdout || '').trim().split('\n').slice(-3).join(' | ')}`
let web = null
let browser = null
let page = null
let consoleErrors = []
let requests = []
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const waitForBanner = (child, timeoutMs) => new Promise((resolveWait) => {
  let output = ''
  const timer = setTimeout(() => resolveWait({ ok: false, output, why: 'timeout' }), timeoutMs)
  const onData = (chunk) => {
    output = (output + String(chunk)).slice(-128_000)
    const match = /dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/.exec(output)
    if (match !== null) { clearTimeout(timer); resolveWait({ ok: true, output, url: match[1] }) }
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)
  child.once('exit', (code) => { clearTimeout(timer); resolveWait({ ok: false, output, why: `exit ${code}` }) })
})
const evidenceDir = join(ROOT, 'runtime', 'smoke-workspace', `compat-client-${String(process.pid)}`)

try {
  mkdirSync(home, { recursive: true })
  const init = dsh(['--profile', 'research', '--from-default-profile', 'web', '--dump-config'])
  check(init.status === 0, `${found}：初始化 web profile`, tail(init))
  const add = dsh(['plugin', '--profile', 'research', 'add', `file:${TARBALL}`])
  check(add.status === 0, `${found}：安装 tarball`, tail(add))
  const team = dsh(['plugin', '--profile', 'research', 'add', `link:${teamPath}`])
  check(team.status === 0, `${found}：安装团队层（link）`, tail(team))
  const scaffold = spawnSync(process.execPath, [
    join(installed, 'scripts', 'scaffold.mjs'), '--install-only', '--workspace', ws, '--profile', 'research', '--host', profile,
  ], { encoding: 'utf8', env: env(), timeout: 180_000 })
  check(scaffold.status === 0 && /安装验收通过/.test(scaffold.stdout || ''), `${found}：scaffold + preflight 安装验收`, tail(scaffold))

  web = spawn('dsh', ['--profile', 'research', '--', '--port', String(PORT), '--no-open'], {
    env: env({ DEEPSEEK_API_KEY: FAKE_KEY }), detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  })
  const boot = await waitForBanner(web, 120_000)
  check(boot.ok, `${found}：web 启动出横幅`, boot.why ?? '')
  if (!boot.ok) throw new Error(`web 未起：${boot.why}`)

  const token = new URL(boot.url).searchParams.get('token')
  const base = `http://127.0.0.1:${PORT}`
  const cookie = await authenticate(base, token)
  const rpc = makeRpc({
    prefix: 'compat-',
    errorOf: (endpoint, body) => `${endpoint} 失败：${JSON.stringify(body?.result?.error ?? body).slice(0, 200)}`,
  })
  const createdWs = await rpc(base, cookie, 'workspace/create', { request: { path: ws } })
  const workspaceId = createdWs?.workspace?.workspaceId ?? createdWs?.workspaceId
  check(typeof workspaceId === 'string', '兼容工作区已注册', String(workspaceId).slice(0, 8))
  const created = await rpc(base, cookie, 'session/create', { request: { workspaceId, agentPreset: 'lead' } })
  const sessionId = created?.sessionId ?? created?.id
  check(typeof sessionId === 'string', '兼容会话已建（lead preset）', String(sessionId).slice(8, 16))
  const title = `compat-client-${String(process.pid)}`
  if (typeof sessionId === 'string') await rpc(base, cookie, 'session/rename', { request: { sessionId, title } })

  browser = await launchChromium(chromium)
  page = await browser.newPage()
  consoleErrors = []
  requests = []
  page.on('request', (request) => requests.push(request.url()))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await page.goto(`${base}/?token=${token}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: 90_000 }).catch(() => {})
  const bodyText = await page.evaluate(() => document.body?.innerText ?? '')
  check(!bodyText.includes('Failed to load plugins'), '页面无 "Failed to load plugins"')
  await wait(2_000)
  const loaderFailures = consoleErrors.filter((text) => text.includes('failed to apply loader entry'))
  check(loaderFailures.length === 0, 'console 无 "failed to apply loader entry"', loaderFailures.slice(0, 2).join(' | ').slice(0, 200))
  check(requests.some((url) => url.includes('/plugins/??') && url.includes('dsh-deep-research-pack/client.js')),
    '/plugins/ 批次含本包 client bundle')

  // 新 profile 首屏有 preview notice 全屏遮罩（Continue 才关）；不关则后续点击全被挡。
  const cont = page.getByRole('button', { name: /continue/i }).first()
  if (await cont.isVisible().catch(() => false)) { await cont.click({ timeout: 6_000 }).catch(() => {}); await wait(1_500) }
  const opened = typeof sessionId === 'string' ? await openSessionById(page, sessionId, title) : { found: false }
  check(opened.found, '打开兼容会话（页签只在会话上下文渲染）', JSON.stringify(opened).slice(0, 200))
  const expand = page.getByRole('button', { name: 'Open right sidebar' })
  if (await expand.count() > 0) await expand.first().click({ timeout: 8_000 }).catch(() => {})
  await wait(2_000)

  const statusTab = page.getByRole('button', { name: /研究状态/ }).first()
  const statusVisible = await statusTab.isVisible({ timeout: 15_000 }).catch(() => false)
  check(statusVisible, '「研究状态」页签可见')
  if (statusVisible) {
    await statusTab.click({ timeout: 5_000 }).catch(() => {})
    await wait(4_000)
    const text = await page.evaluate(() => document.body?.innerText ?? '')
    check(text.includes('本会话未绑定') || text.includes('研究状态'), '「研究状态」页签体渲染（未绑定空态或状态面板）')
  }

  // 「研究配置」是 guide 页签：可能已在条带上，也可能要走「New tab」的 guide 列表。
  const openConfig = async () => {
    let tab = page.getByRole('button', { name: /研究配置/ }).first()
    if (await tab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tab.click({ timeout: 5_000 }).catch(() => {})
      await wait(3_000)
      return true
    }
    const add = page.getByRole('button', { name: 'New tab' }).first()
    if (await add.count().catch(() => 0) > 0) {
      await add.click({ timeout: 5_000 }).catch(() => {})
      await wait(1_500)
      tab = page.getByRole('button', { name: /研究配置/ }).first()
      if (await tab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await tab.click({ timeout: 5_000 }).catch(() => {})
        await wait(3_000)
        return true
      }
      const item = page.getByText(/研究配置/).first()
      if (await item.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await item.click({ timeout: 5_000 }).catch(() => {})
        await wait(3_000)
        return true
      }
    }
    return false
  }
  const configVisible = await openConfig()
  check(configVisible, '「研究配置」页签可见（已在条带或经 New tab 的 guide 列表）')
  if (configVisible) {
    const text = await page.evaluate(() => document.body?.innerText ?? '')
    check(text.includes('研究偏好') || text.includes('方法库'), '「研究配置」页签体渲染（方法/偏好面）')
  }
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  if (page !== null && failures.length > 0) {
    try {
      mkdirSync(evidenceDir, { recursive: true })
      writeFileSync(join(evidenceDir, 'page.html'), await page.content())
      writeFileSync(join(evidenceDir, 'body.txt'), await page.evaluate(() => document.body?.innerText ?? ''))
      writeFileSync(join(evidenceDir, 'console.txt'), consoleErrors.join('\n'))
      writeFileSync(join(evidenceDir, 'requests.txt'), requests.join('\n'))
      await page.screenshot({ path: join(evidenceDir, 'page.png'), fullPage: true })
      console.error(`compat-client-smoke: 失败现场：${evidenceDir}`)
    } catch (error) {
      console.error(`compat-client-smoke: 现场保存失败：${String(error)}`)
    }
  }
  if (browser !== null) await browser.close().catch(() => {})
  if (web !== null) {
    try { process.kill(-web.pid, 'SIGTERM') } catch { try { web.kill('SIGTERM') } catch {} }
    await wait(1_500)
    try { process.kill(-web.pid, 'SIGKILL') } catch {}
    const leak = await reclaimPort(PORT)
    check(leak === null, '端口释放', leak ?? '')
  }
  if (failures.length === 0) rmSync(root, { recursive: true, force: true })
  else console.error(`compat-client-smoke: 安装现场保留：${root}`)
}

if (failures.length > 0) {
  console.error(`\ncompat-client-smoke: ${String(failures.length)} 项失败`)
  process.exit(1)
}
console.log('\ncompat-client-smoke: ALL PASS（rc.3+ 客户端面挂载与页签可见）')
process.exit(0)
