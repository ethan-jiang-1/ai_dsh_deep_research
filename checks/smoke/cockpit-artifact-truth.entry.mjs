#!/usr/bin/env node
// cockpit-artifact-truth.entry.mjs — 观察面「工件真实性」九场景（BUG-361…368，keyless 真浏览器）。
//
// 与 cockpit-truth.entry（S1–S5）同边界、同 seed，但专测工件的空/读失败/非法与回退可见：
// 批 Note = notes/implemented/2026-11-22-observation-artifact-truth.md（2026-11-22 收口；八卡 361–368）。
//   S6 question 不可读；S7 回执不可读；S8 readiness 缺席；S9 readiness 不可读；
//   S10 空读者版；S11 空终稿正文；S12 空 review；S13 空 question；S14 读者版不可读。
// 每场景断言「该出现的出现 + 不该出现的不出现」；状态页/终稿页签先要求可达，避免空页假绿。
//
// 契约：exit 0 = 九场景全绿；1 = 断言红；2 = 前置缺席（未 build / 无浏览器 / 无端口）。
// 运行：`node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs`（先 pnpm build）。
// 边界：只读观察面；seed 工件在运行区生成，chmod/空文件/会话日志改动在 finally 还原。
// 注：helpers 与 cockpit-truth.entry 同源；第三条浏览器入口出现时抽 cockpit-truth.support。
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { encodeSessionLog, materializeSeedHome, resolveSeedFixture } from './client-load-seed.support.mjs'
import { projectKey, readSessionEvents } from '../lib/shared/session-log.mjs'
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
const RUN_DIR = join(ROOT, 'runtime', 'smoke-workspace', 'cockpit-artifact-truth')
const HOME = join(RUN_DIR, 'home')
const WORKSPACE_ROOT = join(RUN_DIR, 'root')
const PATCH = join(RUN_DIR, 'cockpit-artifact-truth.overlay.yml')
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
  if (raw === undefined || raw.startsWith('--')) { console.error('cockpit-artifact-truth: --scenario 需要 S6..S14'); process.exit(2) }
  const ids = raw.split(',').map((x) => x.trim()).filter(Boolean)
  const known = new Set(['S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14'])
  const unknown = ids.filter((id) => !known.has(id))
  if (unknown.length > 0) { console.error(`cockpit-artifact-truth: 未知场景 ${unknown.join(',')}`); process.exit(2) }
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
  if (!existsSync(BIN)) { console.error(`cockpit-artifact-truth: 缺少 vendor 源码基线 ${BIN}`); process.exit(2) }
  const clientBundle = join(PACK, 'lib', 'client.js')
  if (!existsSync(clientBundle)) { console.error('cockpit-artifact-truth: 缺少 packages/deep-research-pack/lib/client.js——先 pnpm build'); process.exit(2) }
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
    console.error('cockpit-artifact-truth: lib/client.js 旧于 src/client|src/lib——先 pnpm build')
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

async function openStatus(page) {
  await openSessionById(page, SESSION_ID, SESSION_TITLE)
  await page.waitForTimeout(1_800)
  for (let i = 0; i < 12; i++) {
    if (await page.locator('[data-sidebar-right-open]').count().catch(() => 0) === 0) {
      const b = page.locator('[data-sidebar-right-expand]').first()
      if (await b.count().catch(() => 0) > 0) await b.click({ force: true }).catch(() => {})
    }
    const tab = page.locator('[data-sidebar-right-guide-entry="research-status"]').first()
    if (await tab.count().catch(() => 0) > 0) await tab.click({ force: true }).catch(() => {})
    await page.waitForTimeout(1_200)
    const faceAttr = await page.locator('[data-research-face]').first().getAttribute('data-research-face').catch(() => null)
    if (faceAttr !== null && faceAttr !== 'unknown') break
  }
  return page.evaluate(() => {
    const face = document.querySelector('[data-research-face]')
    return {
      face: face?.getAttribute('data-research-face') ?? null,
      paneText: (face?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 4_000),
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
  const receiptPath = join(bundleDir, 'delivered.json')
  const finalDir = join(bundleDir, 'final')
  const v1Path = join(finalDir, 'v1.md')
  const readerPath = join(finalDir, 'readable-v1.md')
  const logPath = join(materialized.home, 'sessions', materialized.group, SESSION_ID, 'session.v4.jsonl.zstd')
  if (!existsSync(bundleDir) || !existsSync(v1Path)) { console.error('cockpit-artifact-truth: seed 缺 bundle/v1'); process.exit(2) }

  const port = await pickFreePort()
  if (port === null) { console.error('cockpit-artifact-truth: 无空闲端口'); process.exit(2) }
  let booted = null
  let browser = null
  const restore = []
  try {
    booted = await bootWeb({
      bin: BIN, cwd: ROOT, profile: 'web', patchPath: PATCH, port,
      env: scrubbedEnv({ DSH_HOME: materialized.home, DEEP_RESEARCH_WORKSPACE: materialized.workspace }),
      timeoutMs: 120_000, tailChars: 800, detached: false,
    })
    const base = `http://127.0.0.1:${port}`
    await authenticate(base, booted.token)
    browser = await launchChromium(await loadChromium(ROOT))

    const withStatus = async (label) => {
      const page = await freshPage(browser, base, booted.token)
      try {
        const status = await openStatus(page)
        reachable(label, status.paneText)
        return status
      } finally { await page.context().close().catch(() => {}) }
    }
    const withFinal = async (label) => {
      const page = await freshPage(browser, base, booted.token)
      try {
        const status = await openStatus(page)
        reachable(label, status.paneText)
        const final = await readFinal(page)
        check(`${label} 终稿可达`, final.text.length > 0, `len=${final.text.length}`)
        return final
      } finally { await page.context().close().catch(() => {}) }
    }
    const backupFile = (path) => {
      const existed = existsSync(path)
      const content = existed ? readFileSync(path) : null
      return () => {
        if (existed) writeFileSync(path, content)
        else rmSync(path, { force: true })
        try { chmodSync(path, 0o644) } catch { /* missing is fine */ }
      }
    }

    if (selected('S6')) {
      chmodSync(questionPath, 0o000)
      try {
        const status = await withStatus('S6')
        check('S6 显示研究问题读取失败', /研究问题读取失败/.test(status.paneText), status.paneText.slice(0, 160))
        check('S6 不显示「尚未确认/问题定稿写盘后」', !/(尚未确认|问题定稿写盘后)/.test(status.paneText), status.paneText.slice(0, 200))
        check('S6 不给「✓ 立项」', !status.paneText.includes('✓ 立项'), status.paneText.slice(0, 200))
      } finally { chmodSync(questionPath, 0o644) }
    }

    if (selected('S7')) {
      const logBackup = readFileSync(logPath)
      const { readable, events } = readSessionEvents(logPath)
      if (!readable) throw new Error('seed session log unreadable')
      writeFileSync(logPath, encodeSessionLog(events.map((e) => e.type === 'deliverables/presented'
        ? { type: 'sandbox/mode', seq: e.seq, time: e.time, data: { mode: 'workspace-write' } }
        : e).map((e) => JSON.stringify(e)).join('\n') + '\n'))
      restore.push(() => writeFileSync(logPath, logBackup))
      chmodSync(receiptPath, 0o000)
      try {
        const status = await withStatus('S7')
        check('S7 显示交付回执读取失败', /交付回执读取失败|交付回执不合法/.test(status.paneText), status.paneText.slice(0, 160))
        check('S7 不显示「交付未见证」', !/交付未见证/.test(status.paneText), status.paneText.slice(0, 220))
      } finally { chmodSync(receiptPath, 0o644) }
    }

    if (selected('S8')) {
      mkdirSync(reviewDir, { recursive: true })
      try {
        const status = await withStatus('S8')
        check('S8 显示审查未定', /审查未定|审查声明/.test(status.paneText), status.paneText.slice(0, 160))
        check('S8 不给「✓ 审查」', !status.paneText.includes('✓ 审查'), status.paneText.slice(0, 220))
      } finally { rmSync(reviewDir, { recursive: true, force: true }) }
    }

    if (selected('S9')) {
      mkdirSync(reviewDir, { recursive: true })
      writeFileSync(readinessPath, JSON.stringify({
        version: 2, readiness: 'PASS', conditional: false, round: 3, at: '2026-11-01T21:00:00+08:00',
        counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 },
      }, null, 2))
      chmodSync(readinessPath, 0o000)
      try {
        const status = await withStatus('S9')
        check('S9 显示审查未定/读取失败', /审查未定|审查声明|readiness.*读取失败/.test(status.paneText), status.paneText.slice(0, 160))
        check('S9 不给「✓ 审查」', !status.paneText.includes('✓ 审查'), status.paneText.slice(0, 220))
      } finally {
        chmodSync(readinessPath, 0o644)
        rmSync(reviewDir, { recursive: true, force: true })
      }
    }

    if (selected('S10')) {
      writeFileSync(readerPath, '', 'utf8')
      try {
        const final = await withFinal('S10')
        check('S10 显示读者版为空提示', /读者版为空/.test(final.text), final.text.slice(0, 200))
        check('S10 显示非空审计版', /一句话答案/.test(final.text), final.text.slice(0, 200))
      } finally { rmSync(readerPath, { force: true }) }
    }

    if (selected('S11')) {
      const undo = backupFile(v1Path)
      writeFileSync(v1Path, '', 'utf8')
      try {
        const final = await withFinal('S11')
        check('S11 显示终稿为空', /终稿为空/.test(final.text), final.text.slice(0, 200))
      } finally { undo() }
    }

    if (selected('S12')) {
      const undo = backupFile(reviewPath)
      writeFileSync(reviewPath, '', 'utf8')
      try {
        const status = await withStatus('S12')
        check('S12 显示审查未给结论', /审查未给结论/.test(status.paneText), status.paneText.slice(0, 200))
        check('S12 不给「✓ 审查」', !status.paneText.includes('✓ 审查'), status.paneText.slice(0, 220))
      } finally { undo() }
    }

    if (selected('S13')) {
      const undo = backupFile(questionPath)
      writeFileSync(questionPath, '', 'utf8')
      try {
        const status = await withStatus('S13')
        check('S13 显示研究问题为空', /研究问题为空/.test(status.paneText), status.paneText.slice(0, 200))
        check('S13 不显示「尚未确认/问题定稿写盘后」', !/(尚未确认|问题定稿写盘后)/.test(status.paneText), status.paneText.slice(0, 220))
        check('S13 不给「✓ 立项」', !status.paneText.includes('✓ 立项'), status.paneText.slice(0, 220))
      } finally { undo() }
    }

    if (selected('S14')) {
      const undo = backupFile(readerPath)
      writeFileSync(readerPath, '# Reader v1\n\nA non-empty reader body.\n', 'utf8')
      chmodSync(readerPath, 0o000)
      try {
        const final = await withFinal('S14')
        check('S14 显示读者版读取失败', /读者版读取失败/.test(final.text), final.text.slice(0, 200))
        check('S14 显示非空审计版', /一句话答案/.test(final.text), final.text.slice(0, 200))
      } finally {
        chmodSync(readerPath, 0o644)
        undo()
      }
    }
  } finally {
    for (const undo of restore.reverse()) { try { undo() } catch { /* 还原失败不掩盖主结果 */ } }
    if (browser !== null) await browser.close().catch(() => {})
    if (booted !== null) booted.child.kill()
    await reclaimPort(port)
  }
}

try {
  await main()
} catch (error) {
  console.error(`cockpit-artifact-truth: 运行异常 — ${String(error)}`)
  process.exitCode = 2
}

const failed = results.filter((r) => !r.ok)
console.log(`\ncockpit-artifact-truth: ${String(results.length - failed.length)}/${String(results.length)} PASS`)
if (failed.length > 0) {
  for (const f of failed) console.log(`  FAIL  ${f.id}${f.detail === '' ? '' : ` — ${f.detail}`}`)
  process.exitCode = 1
} else if (results.length === 0) {
  console.error('cockpit-artifact-truth: 零断言 = 未跑，不是通过')
  process.exitCode = 2
}
