#!/usr/bin/env node
// cockpit-truth-residuals.entry.mjs — 观察面「残余跨面事实」八场景（BUG-369…376，keyless 真浏览器）。
// 批 Note = notes/implemented/2026-11-23-observation-residuals.md（2026-11-23 收口；七卡已修 + 376 not-a-bug）。
//
// 与 cockpit-truth / cockpit-artifact-truth 同 seed、同边界；本入口只测上一批没覆盖的四个面：
//   S15 readiness 声明 vs review.md 冲突（状态 + 终稿同判）；S16 终稿 review 不可读；
//   S17 reader 显示时更新（stale watcher）；S18 final/ 目录不可读；
//   S19 plan.md 不可读；S20 config question 不可读；S21 defaults mixed 键（合法 effort 生效）；
//   S22 空 plan/vN 快照。
// 每场景断言「该出现的出现 + 不该出现的不出现」；状态/终稿/配置/图谱先要求可达。
//
// 契约：exit 0 = 八场景全绿；1 = 断言红；2 = 前置缺席（未 build / 无浏览器 / 无端口）。
// 运行：`node --import tsx/esm checks/smoke/cockpit-truth-residuals.entry.mjs`（先 pnpm build）。
// 边界：只读观察面；seed 工件在运行区生成，chmod/空文件/文件改写/会话日志在 finally 还原。
// 注：helpers 与 cockpit-artifact-truth.entry 同源；第三入口已出现，下批可抽 cockpit-truth.support。
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
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
const RUN_DIR = join(ROOT, 'runtime', 'smoke-workspace', 'cockpit-truth-residuals')
const HOME = join(RUN_DIR, 'home')
const WORKSPACE_ROOT = join(RUN_DIR, 'root')
const PATCH = join(RUN_DIR, 'cockpit-truth-residuals.overlay.yml')
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
  if (raw === undefined || raw.startsWith('--')) { console.error('cockpit-truth-residuals: --scenario 需要 S15..S22'); process.exit(2) }
  const ids = raw.split(',').map((x) => x.trim()).filter(Boolean)
  const known = new Set(['S15', 'S16', 'S17', 'S18', 'S19', 'S20', 'S21', 'S22'])
  const unknown = ids.filter((id) => !known.has(id))
  if (unknown.length > 0) { console.error(`cockpit-truth-residuals: 未知场景 ${unknown.join(',')}`); process.exit(2) }
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
  if (!existsSync(BIN)) { console.error(`cockpit-truth-residuals: 缺少 vendor 源码基线 ${BIN}`); process.exit(2) }
  const clientBundle = join(PACK, 'lib', 'client.js')
  if (!existsSync(clientBundle)) { console.error('cockpit-truth-residuals: 缺少 packages/deep-research-pack/lib/client.js——先 pnpm build'); process.exit(2) }
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
    console.error('cockpit-truth-residuals: lib/client.js 旧于 src/client|src/lib——先 pnpm build')
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

async function readFinal(page) {
  const openFinal = page.getByRole('button', { name: /读终稿|Open final/ }).first()
  const visible = await openFinal.isVisible().catch(() => false)
  if (visible) await openFinal.click({ force: true }).catch(() => {})
  await page.waitForTimeout(2_500)
  return page.evaluate(() => {
    const bodies = [...document.querySelectorAll('[data-sidebar-right-tab]')]
      .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    return { tabs: bodies.map((t) => t.slice(0, 120)), text: bodies.sort((a, b) => b.length - a.length)[0]?.slice(0, 5_000) ?? '' }
  })
}

async function main() {
  assertPrereqs()
  rmSync(HOME, { recursive: true, force: true })
  rmSync(WORKSPACE_ROOT, { recursive: true, force: true })
  mkdirSync(RUN_DIR, { recursive: true })
  writePatch()

  const fixture = resolveSeedFixture('tests/fixtures/client-load-home', { root: ROOT })
  const materialized = materializeSeedHome({
    fixtureDir: fixture.dir,
    homeDir: HOME,
    workspaceRoot: WORKSPACE_ROOT,
    repoRoot: ROOT,
    projectKey,
  })
  const bundleDir = join(materialized.workspace, BUNDLE)
  const questionPath = join(bundleDir, 'question.md')
  const reviewPath = join(bundleDir, 'review.md')
  const reviewDir = join(bundleDir, 'review')
  const readinessPath = join(reviewDir, 'readiness.json')
  const planPath = join(bundleDir, 'plan.md')
  const finalDir = join(bundleDir, 'final')
  const v1Path = join(finalDir, 'v1.md')
  const readerPath = join(finalDir, 'readable-v1.md')
  const snapshotPath = join(bundleDir, 'plan', 'v1.md')
  if (!existsSync(bundleDir) || !existsSync(v1Path)) { console.error('cockpit-truth-residuals: seed 缺 bundle/v1'); process.exit(2) }

  const port = await pickFreePort()
  if (port === null) { console.error('cockpit-truth-residuals: 无空闲端口'); process.exit(2) }
  let booted = null
  let browser = null
  try {
    booted = await bootWeb({
      bin: BIN, cwd: ROOT, profile: 'web', patchPath: PATCH, port,
      env: scrubbedEnv({ DSH_HOME: materialized.home, DEEP_RESEARCH_WORKSPACE: materialized.workspace }),
      timeoutMs: 120_000, tailChars: 800, detached: false,
    })
    const base = `http://127.0.0.1:${port}`
    await authenticate(base, booted.token)
    browser = await launchChromium(await loadChromium(ROOT))

    const withPage = async (label, guide, fn) => {
      const page = await freshPage(browser, base, booted.token)
      try {
        const pane = await openGuide(page, guide)
        reachable(label, pane.paneText)
        return await fn(page, pane)
      } finally { await page.context().close().catch(() => {}) }
    }
    const withStatus = (label, fn) => withPage(label, 'research-status', fn)
    const withFinal = async (label, fn) => withStatus(label, async (page, status) => {
      const final = await readFinal(page)
      check(`${label} 终稿可达`, final.text.length > 0, `len=${final.text.length}`)
      return await fn(page, status, final)
    })
    const backupFile = (path) => {
      const existed = existsSync(path)
      const content = existed ? readFileSync(path) : null
      return () => {
        if (existed) writeFileSync(path, content)
        else rmSync(path, { force: true })
        try { chmodSync(path, 0o644) } catch { /* missing is fine */ }
      }
    }

    if (selected('S15')) {
      const reviewBackup = readFileSync(reviewPath, 'utf8')
      const hadReviewDir = existsSync(reviewDir)
      mkdirSync(reviewDir, { recursive: true })
      const readinessBackup = backupFile(readinessPath)
      writeFileSync(reviewPath, reviewBackup.replace(/readiness:\s*PASS/g, 'readiness: FAIL'))
      writeFileSync(readinessPath, JSON.stringify({
        version: 2, readiness: 'PASS', conditional: false, round: 3, at: '2026-11-01T21:00:00+08:00',
        counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 },
      }, null, 2))
      try {
        await withFinal('S15', async (_page, status, final) => {
          check('S15 状态页显示审查冲突', /审查结论冲突|审查未过/.test(status.paneText), status.paneText.slice(0, 220))
          check('S15 状态页不误诊「声明缺失/不可读」', !/声明缺失|声明.*不可读/.test(status.paneText), status.paneText.slice(0, 220))
          check('S15 终稿页签同判冲突/审查未过', /审查结论冲突|审查未过/.test(final.text), final.text.slice(0, 220))
          check('S15 不出现单边「审查通过」', !/审查（已）?通过|✓ 审查/.test(final.text), final.text.slice(0, 220))
        })
      } finally {
        writeFileSync(reviewPath, reviewBackup)
        readinessBackup()
        if (!hadReviewDir) rmSync(reviewDir, { recursive: true, force: true })
      }
    }

    if (selected('S16')) {
      chmodSync(reviewPath, 0o000)
      try {
        await withFinal('S16', async (_page, status, final) => {
          check('S16 状态页仍报审查未定/读失败', /审查未定|审查文件读取失败/.test(status.paneText), status.paneText.slice(0, 220))
          check('S16 终稿页签显示审查未定/读取失败', /审查未定|审查.*读取失败/.test(final.text), final.text.slice(0, 220))
        })
      } finally { chmodSync(reviewPath, 0o644) }
    }

    if (selected('S17')) {
      writeFileSync(readerPath, 'E2E READER V1 first reader text.\n', 'utf8')
      try {
        await withFinal('S17', async (_page, _status, _final) => {
          await new Promise((resolve) => setTimeout(resolve, 1_000))
          writeFileSync(readerPath, 'E2E READER V1 UPDATED reader text.\n', 'utf8')
          await new Promise((resolve) => setTimeout(resolve, 35_000))
          const after = await readFinal(_page)
          check('S17 读者版更新出现 stale 提示', /终稿有更新|读者版已更新|重新读取/.test(after.text), after.text.slice(0, 220))
        })
      } finally { rmSync(readerPath, { force: true }) }
    }

    if (selected('S18')) {
      chmodSync(finalDir, 0o000)
      try {
        await withStatus('S18', async (_page, status) => {
          check('S18 状态页显示终稿目录读取失败', /终稿目录读取失败|终稿.*读取失败/.test(status.paneText), status.paneText.slice(0, 240))
          check('S18 不无条件显示「v1 已交付」', !/v1 已交付/.test(status.paneText), status.paneText.slice(0, 240))
        })
      } finally { chmodSync(finalDir, 0o755) }
    }

    if (selected('S19')) {
      chmodSync(planPath, 0o000)
      try {
        await withStatus('S19', async (_page, status) => {
          check('S19 状态页显示计划读取失败', /计划读取失败|计划.*读取失败/.test(status.paneText), status.paneText.slice(0, 240))
          check('S19 版本面不静默消失', /计划版本未知|计划读取失败/.test(status.paneText), status.paneText.slice(0, 240))
        })
      } finally { chmodSync(planPath, 0o644) }
    }

    if (selected('S20')) {
      chmodSync(questionPath, 0o000)
      try {
        await withPage('S20', 'research-config', async (_page, pane) => {
          await _page.waitForTimeout(6_000)
          const paneText = await _page.evaluate(() => [...document.querySelectorAll('[data-sidebar-right-tab]')]
            .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ').slice(0, 6_000))
          check('S20 配置页显示研究问题读取失败', /研究问题读取失败/.test(paneText), paneText.slice(-300))
          check('S20 不显示「question.md 不在/被移走」', !/question\.md 不在|被移走/.test(paneText), paneText.slice(-300))
        })
      } finally { chmodSync(questionPath, 0o644) }
    }

    if (selected('S21')) {
      const defaultsPath = join(materialized.workspace, 'research-defaults.json')
      const defaultsBackup = backupFile(defaultsPath)
      writeFileSync(defaultsPath, JSON.stringify({ schema: 1, effort: 'deep', unknown: 'x' }, null, 2))
      try {
        await withPage('S21', 'research-config', async (page, pane) => {
          const value = await page.locator('[data-testid="defaults-depth"]').first().inputValue().catch(() => null)
          const state = await page.locator('[data-testid="deep-research-defaults"]').first().getAttribute('data-defaults-state').catch(() => null)
          check('S21 合法 effort 生效（select.value=deep）', value === 'deep', `value=${String(value)} state=${String(state)}`)
          check('S21 未知键只警告不丢合法值', !/未知字段已忽略[^]*深度\s*自动/.test(pane.paneText) || value === 'deep', pane.paneText.slice(0, 260))
        })
      } finally { defaultsBackup() }
    }

    if (selected('S22')) {
      mkdirSync(dirname(snapshotPath), { recursive: true })
      const snapshotBackup = backupFile(snapshotPath)
      writeFileSync(snapshotPath, '', 'utf8')
      try {
        await withPage('S22', 'research-graph', async (page, pane) => {
          const shown = await page.evaluate(() => {
            const b = [...document.querySelectorAll('button')].find((x) => /看 v1 旧图/.test((x.textContent ?? '').trim()))
            if (b === undefined) return false
            b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
            return true
          })
          await page.waitForTimeout(3_000)
          const text = await page.evaluate(() => [...document.querySelectorAll('[data-sidebar-right-tab]')]
            .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()).sort((a, b) => b.length - a.length)[0]?.slice(0, 4_000) ?? '')
          check('S22 旧图快照打开', shown, pane.paneText.slice(0, 200))
          check('S22 显示「快照为空」', /快照为空|快照.*为空|无节点|没有节点/.test(text), text.slice(0, 260))
        })
      } finally { snapshotBackup() }
    }
  } finally {
    await browser?.close().catch(() => {})
    booted?.child.kill()
    await reclaimPort(port).catch(() => {})
    const failed = results.filter((r) => !r.ok)
    console.log(`\ncockpit-truth-residuals: ${results.length - failed.length}/${results.length} PASS`)
    for (const f of failed) console.log(`  FAIL  ${f.id}`)
    process.exitCode = failed.length === 0 ? 0 : 1
  }
}

await main()
