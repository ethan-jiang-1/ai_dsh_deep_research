#!/usr/bin/env node
// product-boot-smoke — T3 首启面：真 launcher + 真 Web + 浏览器，证明 Host 注册 → 首屏
// blank Lead Session（cwd = 工作区）→ 产品首屏元素。
//
// 前置：同 product-smoke（真 dsh/pnpm/团队层 registry/缓存）+ Playwright chromium。
// 缺前置 exit 2；断言失败 exit 1；全绿 exit 0。
//
// 用法：node scripts/smoke/product-boot-smoke.mjs
import { spawn, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadChromium, launchChromium } from '../lib/playwright.mjs'
import { reclaimPort, listenersOn } from '../lib/port-reclaim.mjs'
import { scrubbedEnv } from '../lib/env.mjs'
import { readSessionText } from '../lib/session-log.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const LAUNCH = join(PACK, 'scripts', 'launch.mjs')
const TEMP_ROOT = join(ROOT, 'runtime', 'smoke-workspace', `product-boot-smoke-${process.pid}`)
const PORT = Number(process.env.PRODUCT_BOOT_PORT ?? '3137')

const failures = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === '' ? '' : `\n      → ${detail}`}`)
  if (!ok) failures.push(name)
}
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const canonical = (path) => {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}
const notRun = (reason) => {
  console.error(`product-boot-smoke: NOT-RUN — ${reason}`)
  process.exit(2)
}

function makeSandbox() {
  const root = join(TEMP_ROOT, 'main')
  const home = join(root, 'home')
  const ws = join(root, 'ws')
  const bin = join(root, 'bin')
  for (const dir of [home, ws, bin]) mkdirSync(dir, { recursive: true })
  const provided = process.env.PRODUCT_SMOKE_DSH
  let dsh
  if (typeof provided === 'string' && provided !== '') {
    dsh = resolve(provided)
    if (!existsSync(dsh)) notRun(`PRODUCT_SMOKE_DSH 不存在：${dsh}`)
    writeFileSync(join(bin, 'dsh'), `#!/bin/sh\nexec ${dsh} "$@"\n`)
  } else {
    const binTs = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
    const tsx = join(ROOT, 'node_modules', 'tsx', 'dist', 'loader.mjs')
    if (!existsSync(binTs) || !existsSync(tsx)) notRun('vendor/dsh 源码或 tsx 不在位')
    dsh = join(bin, 'dsh')
    writeFileSync(dsh, `#!/bin/sh\nexport TSX_TSCONFIG_PATH=${JSON.stringify(join(ROOT, 'tsconfig.json'))}\nexec ${JSON.stringify(process.execPath)} --import ${JSON.stringify(tsx)} ${JSON.stringify(binTs)} "$@"\n`)
  }
  chmodSync(join(bin, 'dsh'), 0o755)
  return {
    root, home, ws, bin, dsh,
    env: { ...scrubbedEnv(), DSH_HOME: home, DSH_BIN: dsh, PATH: `${bin}:${process.env.PATH ?? ''}`, npm_config_cache: join(root, 'npm-cache') },
  }
}

function runSetup(sandbox) {
  return spawnSync(process.execPath, [LAUNCH, '--workspace', sandbox.ws, '--home', sandbox.home, '--profile', 'product-boot', '--setup-only'], { cwd: sandbox.ws, env: sandbox.env, encoding: 'utf8', timeout: 300_000 })
}

function firstSessionHeader(home) {
  const sessionsRoot = join(home, 'sessions')
  if (!existsSync(sessionsRoot)) return null
  for (const group of readdirSync(sessionsRoot)) {
    const groupDir = join(sessionsRoot, group)
    for (const session of readdirSync(groupDir)) {
      const sessionDir = join(groupDir, session)
      for (const name of readdirSync(sessionDir)) {
        // live 会话的日志可能是 `session.v4.jsonl.zstd.<rand>.tmp`；readSessionText 能解完整首帧。
        if (!/^session\.v[34]\.jsonl/.test(name)) continue
        const text = readSessionText(join(sessionDir, name))
        if (text === null) continue
        const line = text.split('\n').find((value) => value.trim() !== '')
        if (line === undefined) continue
        try {
          const event = JSON.parse(line)
          if (event?.type === 'session') return event
        } catch {
          // 下一份
        }
      }
    }
  }
  return null
}

let child = null
let exitCode = 0
try {
  rmSync(TEMP_ROOT, { recursive: true, force: true })
  const existing = listenersOn(PORT)
  if (existing !== null && existing.length > 0) notRun(`端口 ${PORT} 已被占用（pid ${existing.join(',')}）；换 PRODUCT_BOOT_PORT`)
  const sandbox = makeSandbox()
  const setup = runSetup(sandbox)
  if (setup.status !== 0) {
    const text = `${setup.stdout ?? ''}${setup.stderr ?? ''}`
    if (/EAI_AGAIN|ENOTFOUND|ERR_PNPM|ECONNREFUSED|registry|offline/i.test(text)) notRun(`安装前置不可用：${text.trim().split('\n').slice(-4).join(' ')}`)
    check('setup exit 0', false, text.slice(-800))
    throw new Error('setup failed')
  }
  check('setup exit 0', true)

  child = spawn(process.execPath, [LAUNCH, '--workspace', sandbox.ws, '--home', sandbox.home, '--profile', 'product-boot', '--no-open', '--port', String(PORT)], {
    cwd: sandbox.ws,
    env: sandbox.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  let output = ''
  child.stdout.on('data', (chunk) => { output = (output + String(chunk)).slice(-64_000) })
  child.stderr.on('data', (chunk) => { output = (output + String(chunk)).slice(-64_000) })

  const urlMatch = await new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error(`等待 dsh web URL 超时；输出尾部：\n${output.slice(-2000)}`)), 120_000)
    const tick = setInterval(() => {
      const match = /http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+/.exec(output)
      if (match !== null) {
        clearInterval(tick)
        clearTimeout(timer)
        resolveUrl(match[0])
      }
    }, 200)
    child.once('exit', (code) => {
      clearInterval(tick)
      clearTimeout(timer)
      rejectUrl(new Error(`dsh 提前退出 code=${code}\n${output.slice(-2000)}`))
    })
  })
  check('Web URL 出现', true)

  const browser = await launchChromium(await loadChromium(ROOT))
  let body = ''
  let pageErrors = []
  try {
    const page = await browser.newPage({ locale: 'zh-CN' })
    page.on('pageerror', (error) => pageErrors.push(String(error)))
    await page.goto(urlMatch, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-composer-input][contenteditable="true"]').first().waitFor({ timeout: 60_000 })
    await page.getByText('Deep Research Lead', { exact: false }).first().waitFor({ timeout: 30_000 })
    body = (await page.locator('body').innerText()).replace(/\n+/g, ' | ')
  } finally {
    await browser.close()
  }
  check('首屏无 pageerror', pageErrors.length === 0, pageErrors.join('; '))
  check('首屏有 Orca 品牌', body.includes('Orca'))
  check('首屏有产品 preset（Deep Research Lead）', body.includes('Deep Research Lead'))
  check('首屏有产品化工作区标题', body.includes('Deep Research — ws'))
  check('首屏有起步卡（标题）', body.includes('一支多角色研究团队'))
  check('首屏有起步卡（当前工作区）', body.includes('当前工作区'))
  check('首屏有起步卡（三步/换工作区）', body.includes('直接问一个研究问题') && body.includes('换工作区'))

  const storagePath = join(sandbox.home, 'storages', 'workspace.json')
  check('workspace.json 在场', existsSync(storagePath))
  const storage = existsSync(storagePath) ? readJson(storagePath) : null
  const workspaces = storage === null ? [] : Object.values(storage.tables?.workspaces ?? {})
  check('host 已登记工作区（canonical path 一致）', workspaces.some((ws) => canonical(ws.path) === canonical(sandbox.ws)), JSON.stringify(workspaces).slice(0, 400))
  check('工作区有 session', workspaces.some((ws) => (ws.sessionIds ?? []).length > 0))

  const header = firstSessionHeader(sandbox.home)
  check('session header 在场', header !== null)
  check('session cwd = 工作区', header !== null && canonical(header.cwd) === canonical(sandbox.ws), String(header?.cwd))
  check('session preset = lead', header?.agentPreset === 'lead', String(header?.agentPreset))

  if (failures.length > 0) {
    console.error(`\nproduct-boot-smoke: RED（${failures.length} 处失败；现场保留 = ${TEMP_ROOT}）`)
    console.error(`  web 输出尾部：\n${output.slice(-3000)}`)
    exitCode = 1
  } else {
    console.log('\nproduct-boot-smoke: GREEN（注册 → 首屏 Lead Session，cwd = 工作区）')
  }
} catch (error) {
  console.error(`product-boot-smoke: RED — ${String(error?.message ?? error)}`)
  console.error(`  现场保留 = ${TEMP_ROOT}`)
  exitCode = 1
} finally {
  if (child !== null) {
    try { process.kill(-child.pid, 'SIGTERM') } catch { /* already gone */ }
    if (child.exitCode === null) {
      await new Promise((resolveExit) => {
        const timer = setTimeout(resolveExit, 3000)
        child.once('exit', () => { clearTimeout(timer); resolveExit() })
      })
    }
  }
  const leak = await reclaimPort(PORT)
  if (leak !== null) {
    console.error(`product-boot-smoke: ${leak}`)
    exitCode = 1
  }
  if (exitCode === 0) rmSync(TEMP_ROOT, { recursive: true, force: true })
}
process.exit(exitCode)
