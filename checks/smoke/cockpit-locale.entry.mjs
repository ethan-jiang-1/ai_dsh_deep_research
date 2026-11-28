#!/usr/bin/env node
// cockpit-locale.entry.mjs — 观察面「英文计数/导航」二场景（BUG-379/380，keyless 真浏览器）。
// 批 Note = notes/implemented/2026-11-23-observation-substance.md（2026-11-23 收口；en singular/nav）。
//
// 与 cockpit-truth / cockpit-artifact-truth 同 seed、同边界；本入口只测 en（boot-level locale overlay）：
//   S29 en 单数 evidence；S30 en 主 tab 完整可读（短标签/不截断）。
//   zh 内容实质场景在 cockpit-truth-substance.entry.mjs（S23–S28）。
// 每场景断言「该出现的出现 + 不该出现的不出现」；状态/终稿/配置/图谱先要求可达。
//
// 契约：exit 0 = 八场景全绿；1 = 断言红；2 = 前置缺席（未 build / 无浏览器 / 无端口）。
// 运行：`node --import tsx/esm checks/smoke/cockpit-locale.entry.mjs`（先 pnpm build）。
// 边界：只读观察面；seed 工件在运行区生成，chmod/空文件/文件改写/会话日志在 finally 还原。
// 注：helpers 与 cockpit-artifact-truth.entry 同源；第三入口已出现，下批可抽 cockpit-truth.support。
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { materializeSeedHome, resolveSeedFixture } from './client-load-seed.support.mjs'
import { projectKey } from '../lib/shared/session-log.mjs'
import { scrubbedEnv } from '../lib/shared/env.mjs'
import { pickFreePort, reclaimPort } from '../lib/harness/port-reclaim.mjs'
import { authenticate, bootWeb } from '../lib/shared/web-harness.mjs'
import { loadChromium, launchChromium, SMOKE_LOCALE } from '../lib/harness/playwright.mjs'
import { dismissPreviewNotice, openSessionById } from '../lib/shared/web-ui-nav.mjs'

const ROOT = resolve(process.cwd())
const BIN = join(ROOT, 'vendor/dsh/apps/cli/src/bin.ts')
const PACK = join(ROOT, 'packages/deep-research-pack')
const BUNDLE = 'drt_unsc-p5-members'
const SESSION_ID = 'session-2473b678-4838-496f-b592-5d7600b8a87e'
const SESSION_TITLE = '联合国安理会五常国家'
const RUN_DIR = join(ROOT, 'runtime', 'smoke-workspace', 'cockpit-locale')
const HOME = join(RUN_DIR, 'home')
const WORKSPACE_ROOT = join(RUN_DIR, 'root')
const PATCH = join(RUN_DIR, 'cockpit-locale.overlay.yml')
const TEAM_ROW = `
    - id: agent-team
      name: '@deepseek-ai/dsh-experimental-agent-team'
      config:
        maxMembers: 8
        maxTasks: 256
        maxPendingMessagesPerMember: 64
        maxMessageBytes: 65536
        disposalTimeoutMs: 5000

    - id: ui-agent-team
      name: '@deepseek-ai/dsh-experimental-client-ui-agent-team'
`

const results = []
const SCENARIO_ARG = (() => {
  const index = process.argv.indexOf('--scenario')
  if (index === -1) return null
  const raw = process.argv[index + 1]
  if (raw === undefined || raw.startsWith('--')) { console.error('cockpit-locale: --scenario 需要 S29..S30'); process.exit(2) }
  const ids = raw.split(',').map((x) => x.trim()).filter(Boolean)
  const known = new Set(['S29', 'S30'])
  const unknown = ids.filter((id) => !known.has(id))
  if (unknown.length > 0) { console.error(`cockpit-locale: 未知场景 ${unknown.join(',')}`); process.exit(2) }
  return ids
})()
const selected = (id) => SCENARIO_ARG === null || SCENARIO_ARG.includes(id)

function check(id, ok, detail = '') {
  results.push({ id, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}${detail === '' ? '' : ` — ${detail}`}`)
}

function reachable(id, text) {
  check(`${id} 页面可达`, text.length > 40, `len=${text.length}`)
}

function assertPrereqs() {
  if (!existsSync(BIN)) { console.error(`cockpit-locale: 缺少 vendor 源码基线 ${BIN}`); process.exit(2) }
  const clientBundle = join(PACK, 'lib', 'client.js')
  if (!existsSync(clientBundle)) { console.error('cockpit-locale: 缺少 packages/deep-research-pack/lib/client.js——先 pnpm build'); process.exit(2) }
  const newest = (dir) => {
    let latest = 0
    const walk = (d) => {
      for (const ent of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, ent.name)
        if (ent.isDirectory()) walk(p)
        else if (/\.(ts|tsx)$/.test(ent.name)) latest = Math.max(latest, statSync(p).mtimeMs)
      }
    }
    walk(dir)
    return latest
  }
  const srcNewest = Math.max(newest(join(PACK, 'src', 'client')), newest(join(PACK, 'src', 'lib')))
  if (srcNewest > statSync(clientBundle).mtimeMs) {
    console.error('cockpit-locale: lib/client.js 旧于 src/client|src/lib——先 pnpm build')
    process.exit(2)
  }
}

const LOCALE_ROW = `
    - id: locale
      name: '@deepseek-ai/dsh-client-locale'
      config:
        preference: en
`

function writePatch() {
  mkdirSync(dirname(PATCH), { recursive: true })
  writeFileSync(PATCH, readFileSync(join(ROOT, 'tools', 'record', 'research.overlay.yml'), 'utf8') + TEAM_ROW + LOCALE_ROW, 'utf8')
}

async function dismissOnboarding(page, budget = 12) {
  for (let i = 0; i < budget; i++) {
    const dialogs = page.locator('[role="dialog"]')
    const count = await dialogs.count().catch(() => 0)
    let dialog = null
    for (let j = 0; j < count; j++) {
      const d = dialogs.nth(j)
      const t = (await d.textContent().catch(() => '')) ?? ''
      if (/Get started|Add API Key|Sign in to your DeepSeek account|开始设置|添加 API Key|登录 DeepSeek/.test(t)) { dialog = d; break }
    }
    if (dialog !== null) {
      const close = dialog.getByRole('button', { name: /^(Close|关闭)$/ }).first()
      if (await close.isVisible().catch(() => false)) await close.click({ force: true }).catch(() => {})
      else await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(1_200)
      return
    }
    await page.waitForTimeout(200)
  }
}

async function freshPage(browser, base, token) {
  const context = await browser.newContext({ locale: SMOKE_LOCALE, viewport: { width: 1600, height: 1000 } })
  context.on('page', (p) => {
    p.on('response', (r) => {
      if (r.status() >= 400) console.log(`  note  HTTP ${String(r.status())} ${r.url().replace(/token=[^&]+/, 'token=REDACTED').slice(0, 160)}`)
    })
  })
  const page = await context.newPage()
  await page.goto(`${base}/?token=${token}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForTimeout(3_000)
  await dismissPreviewNotice(page)
  await dismissOnboarding(page)
  return page
}

async function openGuide(page, guide) {
  await openSessionById(page, SESSION_ID, SESSION_TITLE)
  await page.waitForTimeout(1_800)
  for (let i = 0; i < 12; i++) {
    if (await page.locator('[data-sidebar-right-open]').count().catch(() => 0) === 0) {
      const b = page.locator('[data-sidebar-right-expand]').first()
      if (await b.count().catch(() => 0) > 0) await b.click({ force: true }).catch(() => {})
    }
    const tab = page.locator(`[data-sidebar-right-guide-entry="${guide}"]`).first()
    if (await tab.count().catch(() => 0) > 0) await tab.click({ force: true }).catch(() => {})
    await page.waitForTimeout(1_200)
    if (await page.locator('[data-sidebar-right-tab]').count().catch(() => 0) > 0) {
      await page.waitForTimeout(1_500)
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('[data-sidebar-right-tab]')) {
          el.scrollTop = el.scrollHeight
          for (const child of el.querySelectorAll('*')) child.scrollTop = child.scrollHeight
        }
      })
      break
    }
  }
  await page.waitForTimeout(1_000)
  return page.evaluate(() => {
    const face = document.querySelector('[data-research-face]')
    const bodies = [...document.querySelectorAll('[data-sidebar-right-tab]')]
      .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    return {
      face: face?.getAttribute('data-research-face') ?? null,
      paneText: bodies.join(' ').slice(0, 6_000),
    }
  })
}


async function main() {
  assertPrereqs()
  rmSync(HOME, { recursive: true, force: true })
  rmSync(WORKSPACE_ROOT, { recursive: true, force: true })
  mkdirSync(RUN_DIR, { recursive: true })
  writePatch()
  const fixture = resolveSeedFixture('tests/fixtures/client-load-home', { root: ROOT })
  const materialized = materializeSeedHome({ fixtureDir: fixture.dir, homeDir: HOME, workspaceRoot: WORKSPACE_ROOT, repoRoot: ROOT, projectKey })
  const bundleDir = join(materialized.workspace, BUNDLE)
  const evidenceDir = join(bundleDir, 'evidence')
  if (!existsSync(bundleDir)) { console.error('cockpit-locale: seed 缺 bundle'); process.exit(2) }
  const port = await pickFreePort()
  if (port === null) { console.error('cockpit-locale: 无空闲端口'); process.exit(2) }
  let booted = null
  let browser = null
  try {
    booted = await bootWeb({ bin: BIN, cwd: ROOT, profile: 'web', patchPath: PATCH, port, env: scrubbedEnv({ DSH_HOME: materialized.home, DEEP_RESEARCH_WORKSPACE: materialized.workspace }), timeoutMs: 120_000, tailChars: 800, detached: false })
    const base = `http://127.0.0.1:${port}`
    await authenticate(base, booted.token)
    browser = await launchChromium(await loadChromium(ROOT))
    const evidenceFiles = () => existsSync(evidenceDir) ? readdirSync(evidenceDir).filter((n) => n.endsWith('.md')) : []
    const backupEvidence = () => {
      const map = new Map(evidenceFiles().map((n) => [n, readFileSync(join(evidenceDir, n), 'utf8')]))
      return () => { for (const n of evidenceFiles()) rmSync(join(evidenceDir, n), { force: true }); for (const [n, text] of map) writeFileSync(join(evidenceDir, n), text) }
    }
    const clearEvidence = () => { for (const n of evidenceFiles()) rmSync(join(evidenceDir, n), { force: true }) }
    const withStatus = async (label, fn) => {
      const page = await freshPage(browser, base, booted.token)
      try {
        const pane = await openGuide(page, 'research-status')
        reachable(label, pane.paneText)
        await fn(page, pane)
      } finally { await page.context().close().catch(() => {}) }
    }

    if (selected('S29')) {
      const restore = backupEvidence()
      try {
        clearEvidence()
        writeFileSync(join(evidenceDir, 'one-card.md'), '---\nsource_url: https://example.test/\n---\n唯一证据正文。\n', 'utf8')
        await withStatus('S29', async (_page, status) => {
          check('S29 en 1 evidence file 单数', /1\s+evidence file\b/.test(status.paneText) && !/1\s+evidence files/.test(status.paneText), status.paneText.slice(0, 240))
        })
      } finally { restore() }
    }

    if (selected('S30')) {
      const page = await freshPage(browser, base, booted.token)
      try {
        await openSessionById(page, SESSION_ID, SESSION_TITLE)
        await page.waitForTimeout(1_500)
        const hubBtn = page.getByRole('button', { name: /Research Hub|研究工作台/ }).first()
        if (await hubBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await hubBtn.click({ force: true }).catch(() => {})
          await page.waitForTimeout(1_200)
        }
        const data = await page.evaluate(() => [...document.querySelectorAll('[role="tab"], button, span, div')]
          .filter((el) => el.getClientRects().length > 0)
          .map((el) => {
            const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
            const cs = getComputedStyle(el)
            return { text, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, overflow: cs.overflow, textOverflow: cs.textOverflow, title: el.getAttribute('title') ?? '' }
          })
          .filter((x) => /^(Method library|Method Library|Methods|方法库)$/i.test(x.text)))
        const full = data.some((x) => /^(Method library|Method Library|Methods|方法库)$/i.test(x.text))
        const clipped = data.some((x) => x.clientWidth > 0 && x.scrollWidth > x.clientWidth + 1 && /hidden|clip/.test(x.overflow + x.textOverflow))
        check('S30 en 工作台 Methods tab 完整可读', full && !clipped, JSON.stringify(data.slice(0, 3)))
      } finally { await page.context().close().catch(() => {}) }
    }
  } finally {
    await browser?.close().catch(() => {})
    booted?.child.kill()
    await reclaimPort(port).catch(() => {})
    const failed = results.filter((r) => !r.ok)
    console.log(`\ncockpit-locale: ${results.length - failed.length}/${results.length} PASS`)
    for (const f of failed) console.log(`  FAIL  ${f.id}`)
    process.exitCode = failed.length === 0 ? 0 : 1
  }
}

await main()
