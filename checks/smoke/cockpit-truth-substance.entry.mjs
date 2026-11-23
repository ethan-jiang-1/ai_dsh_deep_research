#!/usr/bin/env node
// cockpit-truth-substance.entry.mjs — 观察面「内容实质」六场景（BUG-377/378/381/382/383/384，keyless 真浏览器）。
// 批 Note = notes/implemented/2026-11-23-observation-substance.md（2026-11-23 收口；非空≠实质 / sentinel）。
//
// 与 cockpit-truth / cockpit-artifact-truth 同 seed、同边界；本入口测「内容实质」：
//   S23 空 findings（综合不 done）；S24 空 leads（侦察不 done）；S25 标题-only question；
//   S26 空 plan（状态页提示）；S27 只有 _failed.md（0 证据）；S28 0 字节证据卡。
//   en 场景（S29/S30）因 locale 是 boot-level overlay，拆到 cockpit-locale.entry.mjs。
// 每场景断言「该出现的出现 + 不该出现的不出现」；状态/终稿/配置/图谱先要求可达。
//
// 契约：exit 0 = 八场景全绿；1 = 断言红；2 = 前置缺席（未 build / 无浏览器 / 无端口）。
// 运行：`node --import tsx/esm checks/smoke/cockpit-truth-substance.entry.mjs`（先 pnpm build）。
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
const RUN_DIR = join(ROOT, 'runtime', 'smoke-workspace', 'cockpit-truth-substance')
const HOME = join(RUN_DIR, 'home')
const WORKSPACE_ROOT = join(RUN_DIR, 'root')
const PATCH = join(RUN_DIR, 'cockpit-truth-substance.overlay.yml')
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
  if (raw === undefined || raw.startsWith('--')) { console.error('cockpit-truth-substance: --scenario 需要 S23..S28'); process.exit(2) }
  const ids = raw.split(',').map((x) => x.trim()).filter(Boolean)
  const known = new Set(['S23', 'S24', 'S25', 'S26', 'S27', 'S28'])
  const unknown = ids.filter((id) => !known.has(id))
  if (unknown.length > 0) { console.error(`cockpit-truth-substance: 未知场景 ${unknown.join(',')}`); process.exit(2) }
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
  if (!existsSync(BIN)) { console.error(`cockpit-truth-substance: 缺少 vendor 源码基线 ${BIN}`); process.exit(2) }
  const clientBundle = join(PACK, 'lib', 'client.js')
  if (!existsSync(clientBundle)) { console.error('cockpit-truth-substance: 缺少 packages/deep-research-pack/lib/client.js——先 pnpm build'); process.exit(2) }
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
    console.error('cockpit-truth-substance: lib/client.js 旧于 src/client|src/lib——先 pnpm build')
    process.exit(2)
  }
}

function writePatch() {
  mkdirSync(dirname(PATCH), { recursive: true })
  writeFileSync(PATCH, readFileSync(join(ROOT, 'tools', 'record', 'research.overlay.yml'), 'utf8') + TEAM_ROW, 'utf8')
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
  const questionPath = join(bundleDir, 'question.md')
  const planPath = join(bundleDir, 'plan.md')
  const leadsPath = join(bundleDir, 'leads.md')
  const findingsPath = join(bundleDir, 'findings.md')
  const evidenceDir = join(bundleDir, 'evidence')
  if (!existsSync(bundleDir)) { console.error('cockpit-truth-substance: seed 缺 bundle'); process.exit(2) }
  const port = await pickFreePort()
  if (port === null) { console.error('cockpit-truth-substance: 无空闲端口'); process.exit(2) }
  let booted = null
  let browser = null
  try {
    booted = await bootWeb({ bin: BIN, cwd: ROOT, profile: 'web', patchPath: PATCH, port, env: scrubbedEnv({ DSH_HOME: materialized.home, DEEP_RESEARCH_WORKSPACE: materialized.workspace }), timeoutMs: 120_000, tailChars: 800, detached: false })
    const base = `http://127.0.0.1:${port}`
    await authenticate(base, booted.token)
    browser = await launchChromium(await loadChromium(ROOT))
    const withStatus = async (label, fn) => {
      const page = await freshPage(browser, base, booted.token)
      try {
        const pane = await openGuide(page, 'research-status')
        reachable(label, pane.paneText)
        await fn(page, pane)
      } finally { await page.context().close().catch(() => {}) }
    }
    const backupFile = (path) => {
      const existed = existsSync(path)
      const content = existed ? readFileSync(path, 'utf8') : null
      return () => { if (existed) writeFileSync(path, content); else rmSync(path, { force: true }) }
    }
    const evidenceFiles = () => existsSync(evidenceDir) ? readdirSync(evidenceDir).filter((n) => n.endsWith('.md')) : []
    const backupEvidence = () => {
      const map = new Map(evidenceFiles().map((n) => [n, readFileSync(join(evidenceDir, n), 'utf8')]))
      return () => { for (const n of evidenceFiles()) rmSync(join(evidenceDir, n), { force: true }); for (const [n, text] of map) writeFileSync(join(evidenceDir, n), text) }
    }
    const clearEvidence = () => { for (const n of evidenceFiles()) rmSync(join(evidenceDir, n), { force: true }) }

    if (selected('S23')) {
      const restore = backupFile(findingsPath); writeFileSync(findingsPath, '', 'utf8')
      try { await withStatus('S23', async (_p, s) => {
        check('S23 空 findings 显示综合材料为空/读取失败', /综合材料为空|findings.*为空|findings.*读取失败/.test(s.paneText), s.paneText.slice(0, 260))
        check('S23 综合不 done', /\?\s*综合/.test(s.paneText) && !/✓\s*综合/.test(s.paneText), s.paneText.slice(0, 260))
      }) } finally { restore() }
    }
    if (selected('S24')) {
      const restore = backupFile(leadsPath); writeFileSync(leadsPath, '', 'utf8')
      try { await withStatus('S24', async (_p, s) => {
        check('S24 空 leads 显示侦察线索为空/读取失败', /侦察线索为空|leads.*为空|leads.*读取失败/.test(s.paneText), s.paneText.slice(0, 260))
        check('S24 侦察不 done', /\?\s*侦察/.test(s.paneText) && !/✓\s*侦察/.test(s.paneText), s.paneText.slice(0, 260))
      }) } finally { restore() }
    }
    if (selected('S25')) {
      const restore = backupFile(questionPath); writeFileSync(questionPath, '# Question\n\n## Scope\n\n## Notes\n\n## Decisions\n', 'utf8')
      try { await withStatus('S25', async (_p, s) => {
        check('S25 标题-only question 显示正文为空', /研究问题正文为空|问题正文为空/.test(s.paneText), s.paneText.slice(0, 260))
        check('S25 立项不 done', !/✓\s*立项/.test(s.paneText), s.paneText.slice(0, 260))
        check('S25 不显示「尚未确认」', !/尚未确认/.test(s.paneText), s.paneText.slice(0, 260))
      }) } finally { restore() }
    }
    if (selected('S26')) {
      const restore = backupFile(planPath); writeFileSync(planPath, '', 'utf8')
      try { await withStatus('S26', async (_p, s) => {
        check('S26 空 plan 显示计划为空', /计划为空|计划读取失败/.test(s.paneText), s.paneText.slice(0, 260))
        check('S26 版本面显示计划版本未知', /计划版本未知/.test(s.paneText), s.paneText.slice(0, 260))
      }) } finally { restore() }
    }
    if (selected('S27')) {
      const restore = backupEvidence()
      try { clearEvidence(); writeFileSync(join(evidenceDir, '_failed.md'), '# 抓取失败登记\n\n未取得正文。\n', 'utf8')
        await withStatus('S27', async (_p, s) => {
          check('S27 只有失败登记 → 0 份有效证据', /0\s*份证据|没有有效证据|只有检索失败登记/.test(s.paneText), s.paneText.slice(0, 260))
          check('S27 挖掘不 done', /\?\s*挖掘/.test(s.paneText) && !/✓\s*挖掘/.test(s.paneText), s.paneText.slice(0, 260))
        })
      } finally { restore() }
    }
    if (selected('S28')) {
      const restore = backupEvidence()
      try { clearEvidence(); writeFileSync(join(evidenceDir, 'empty-card.md'), '', 'utf8')
        await withStatus('S28', async (_p, s) => {
          check('S28 0 字节证据卡 → 0 份/空证据提示', /0\s*份证据|证据为空|没有有效证据/.test(s.paneText), s.paneText.slice(0, 260))
          check('S28 挖掘不 done', /\?\s*挖掘/.test(s.paneText) && !/✓\s*挖掘/.test(s.paneText), s.paneText.slice(0, 260))
        })
      } finally { restore() }
    }
  } finally {
    await browser?.close().catch(() => {})
    booted?.child.kill()
    await reclaimPort(port).catch(() => {})
    const failed = results.filter((r) => !r.ok)
    console.log(`\ncockpit-truth-substance: ${results.length - failed.length}/${results.length} PASS`)
    for (const f of failed) console.log(`  FAIL  ${f.id}`)
    process.exitCode = failed.length === 0 ? 0 : 1
  }
}

await main()
