#!/usr/bin/env node
// client-load 冒烟（client 面完成定义，keyless 档——起真 web 无模型调用）：headless 浏览器
// 加载真 web 页面，断言观察面 client 插件真的挂上。
//
// 为什么必须有它（company postmortem 0003 同款教训）：preset-smoke 只打 RPC 面（roster /
// session/create），**client 入口的 apply 抛错**（如重复 $mount、槽名拼错）只有浏览器能抓——
// 这类失败不静默，会把整个 Web UI 砖在 BootPage 错误屏。keyed 槽的 key 拼错则相反：静默
// 永不渲染——所以本冒烟除"零失败"外还断言**功能可见性**（页签可点、占位体渲染）。
//
// 断言三件事：① 页面无 "Failed to load plugins"；② console 无 `failed to apply loader
// entry`；③ 「研究状态」页签可见、可点，点开后占位体（Stage 1 文案）渲染——它证明 app
// 渲染完成且本包 client 入口成功 apply + keyed 槽体挂对 key。
//
// 通道：源码域（--profile web --patch dev/research.overlay.yml，与 preset-smoke 真挂载档
// 同款——boot 起自本仓，行包名经根 node_modules 解析到 pack 源码树，浏览器经
// exports["./client"] 取已构建的 lib/client.js）。
// 前置：source dev/env.sh；pack 已构建（lib/client.js 在位——boot 前自检会拦）。
// 用法：source dev/env.sh && node scripts/client-load-smoke.mjs [--port 3109] [--session <既有会话标题>]
// 前置（B-min 起）：dev home 里有至少一个带历史的会话（journal 流要有真数据；默认取首场
// 研究 run 的会话标题——缺席时用 --session 指定别的）。
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
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

const { child, token } = await boot()
let page
try {
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

  // 会话行点击（实测可行形态）：点**整行 span**（含时间戳的 _root_ 行容器，正规 locator 点击
  // 可触发行处理器——force 点标题文本不触发；隐藏的同名 actions 菜单会抢 getByText 匹配）。
  const sessionRow = page.locator('span[class*="_root_"]').filter({ hasText: SESSION_TITLE }).first()
  const sessionOk = await sessionRow.isVisible({ timeout: RENDER_TIMEOUT_MS }).catch(() => false)
  step(sessionOk, '既有会话在场（journal 数据源）', sessionOk ? SESSION_TITLE : 'dev home 缺该会话——用 --session 指定')
  if (sessionOk) {
    await sessionRow.click({ timeout: 10_000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 4_000))
    const expand = page.getByRole('button', { name: 'Open right sidebar' })
    if (await expand.count() > 0) await expand.first().click({ timeout: 8_000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 1_500))
    const capsule = page.getByRole('button', { name: /研究状态/ }).first()
    const capOk = await capsule.isVisible({ timeout: 12_000 }).catch(() => false)
    step(capOk, '「研究状态」guide 胶囊在场（tab 类型注册成功 + 右栏展开）')
    if (capOk) {
      await capsule.click({ timeout: 5_000 }).catch(() => {})
      await new Promise((r) => setTimeout(r, 3_500))
      const paneText = await page.evaluate(() => document.body?.innerText ?? '')
      const paneOk = paneText.includes('journal 流')
      step(paneOk, '页签体渲染（keyed 槽体挂对 key + follow 通道接通）')
      // B-full 余项断言：渐进面（步骤条/矩阵）——渲染挂载点在场（数据面 v1 简化为空态不硬猜）
      const stepsOk = paneText.includes('立项') && paneText.includes('交付')
      step(stepsOk, '页签渐进面挂载（步骤条七步渲染骨架）')
      if (paneOk) {
        const m = /journal 流（(\d+) 事件）/.exec(paneText)
        step(m !== null && Number(m[1]) >= 1, 'journal 流有真数据（snapshot 历史 ≥1 事件）', m ? '' + m[1] + ' 事件' : '未见计数（等待会话态？）')
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
