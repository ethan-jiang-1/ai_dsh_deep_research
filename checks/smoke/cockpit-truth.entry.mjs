#!/usr/bin/env node
// cockpit-truth.entry.mjs — 驾驶舱观察面「事实真实性」五场景（keyless、真浏览器、entry lane）。
//
// 为什么独立成一条入口（2026-11-22 观察面真实性修复程序，BUG-356…360）：
//   五个缺陷都在「页面显示的事实」而不在 reader 层：终稿页签无视地址版本、交付×审查互相否定、
//   bundle/review/evidence 读失败被折成进度/absent/0。单测各自自洽，只有把真实 seed 接上才看得见；
//   五条一次性夹具住 runtime/e2e（gitignored），不能当永久守卫。本件把五场景升格为提交物：
//   S1 交付 v1 + 未交付 v2；S1b 目标缺失；S2 已交付 + review FAIL；S3 bundle 被移走；
//   S4 review.md 不可读；S5 evidence/ 不可读。每场景断言「该出现的出现 + 不该出现的不出现」。
//
// 契约：exit 0 = 五场景全绿；1 = 至少一条断言红；2 = 前置缺席（未 build / 无浏览器 / 无端口）。
// 运行：`node --import tsx/esm checks/smoke/cockpit-truth.entry.mjs`（先 `pnpm build`）。
// 边界：只读观察面；不改 seed 真值；chmod/移走场景在 materialize 后的运行区生成并在 finally 还原。
// 每个场景开新 page（不 reload 同一页）：同页复用会留下旧 tab/旧扫描状态，负断言在空页上假绿。
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
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
const RUN_DIR = join(ROOT, 'runtime', 'smoke-workspace', 'cockpit-truth')
const HOME = join(RUN_DIR, 'home')
const WORKSPACE_ROOT = join(RUN_DIR, 'root')
const PATCH = join(RUN_DIR, 'cockpit-truth.overlay.yml')
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
/** `--scenario S1,S2` 定向子集（P1/P2 每卡自己的同边界绿证）；缺省 = 五场景全跑。 */
const SCENARIO_ARG = (() => {
  const index = process.argv.indexOf('--scenario')
  if (index === -1) return null
  const raw = process.argv[index + 1]
  if (raw === undefined || raw.startsWith('--')) { console.error('cockpit-truth: --scenario 需要 S1,S2,...'); process.exit(2) }
  const ids = raw.split(',').map((x) => x.trim()).filter(Boolean)
  const known = new Set(['S1', 'S2', 'S3', 'S4', 'S5'])
  const unknown = ids.filter((id) => !known.has(id))
  if (unknown.length > 0) { console.error(`cockpit-truth: 未知场景 ${unknown.join(',')}`); process.exit(2) }
  return ids
})()
const selected = (id) => SCENARIO_ARG === null || SCENARIO_ARG.includes(id)

/** 记录并打印一条断言；失败不立即退出，跑完五场景再汇总（一次看到全部红）。 */
function check(id, ok, detail = '') {
  results.push({ id, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}${detail === '' ? '' : ` — ${detail}`}`)
}

/** 状态页可达性前置：空页/未开 tab 时负断言会假绿，所以先要求有内容。 */
function reachable(id, status) {
  check(`${id} 状态页可达`, status.paneText.length > 40, `face=${String(status.face)} len=${status.paneText.length}`)
}

/** 构建新鲜度 / 构建产物 / 源码基线前置；不满足 → exit 2（未跑 ≠ 通过）。 */
function assertPrereqs() {
  if (!existsSync(BIN)) { console.error(`cockpit-truth: 缺少 vendor 源码基线 ${BIN}`); process.exit(2) }
  const clientBundle = join(PACK, 'lib', 'client.js')
  if (!existsSync(clientBundle)) { console.error('cockpit-truth: 缺少 packages/deep-research-pack/lib/client.js——先 pnpm build'); process.exit(2) }
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
    console.error('cockpit-truth: lib/client.js 旧于 src/client|src/lib——先 pnpm build（旧产物红绿都不描述工作树）')
    process.exit(2)
  }
}

/** 源码域 overlay + agent-team host 行（与 client-load 同款；自建，不依赖 dev 运行区残留）。 */
function writePatch() {
  mkdirSync(dirname(PATCH), { recursive: true })
  writeFileSync(PATCH, readFileSync(join(ROOT, 'tools', 'record', 'research.overlay.yml'), 'utf8') + TEAM_ROW, 'utf8')
}

/** 关掉 seed home 无凭据时的账号 onboarding 模态（遮罩会拦会话行点击）。 */
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

/** 每个场景一个独立 browser context（fresh localStorage/右栏状态）→ 新 page → 关 preview/onboarding。
 *  同 context 复用 page 会继承上一场景的右栏 tab/会话状态，负断言在空页上假绿（2026-11-22 实测）。 */
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

/** 打开 seed 会话 → 展开右栏 → 打开「研究状态」→ 等 `[data-research-face]`；返回机器标记与人读文本。 */
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
    if (await page.locator('[data-research-face]').count().catch(() => 0) > 0) break
  }
  return page.evaluate(() => {
    const face = document.querySelector('[data-research-face]')
    return {
      face: face?.getAttribute('data-research-face') ?? null,
      paneText: (face?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 4_000),
    }
  })
}

/** 从状态页点「读终稿 →」并读右栏页签正文（取最长正文；短 tab 标题不算）。 */
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
  if (!existsSync(bundleDir)) { console.error(`cockpit-truth: seed 缺 ${BUNDLE}`); process.exit(2) }

  const port = await pickFreePort()
  if (port === null) { console.error('cockpit-truth: 无空闲端口'); process.exit(2) }
  let booted = null
  let browser = null
  const restore = []
  try {
    booted = await bootWeb({
      bin: BIN,
      cwd: ROOT,
      profile: 'web',
      patchPath: PATCH,
      port,
      env: scrubbedEnv({ DSH_HOME: materialized.home, DEEP_RESEARCH_WORKSPACE: materialized.workspace }),
      timeoutMs: 120_000,
      tailChars: 800,
      detached: false,
    })
    const base = `http://127.0.0.1:${port}`
    await authenticate(base, booted.token)
    const chromium = await loadChromium(ROOT)
    browser = await launchChromium(chromium)

    const reviewPath = join(bundleDir, 'review.md')
    const evidenceDir = join(bundleDir, 'evidence')
    const v1Path = join(bundleDir, 'final', 'v1.md')
    const v1Text = readFileSync(v1Path, 'utf8')
    const reviewText = readFileSync(reviewPath, 'utf8')

    // ── S1 交付 v1 + 未交付 v2：终稿页签必须显示 v1 ───────────────────────────────
    mkdirSync(join(bundleDir, 'final'), { recursive: true })
    writeFileSync(join(bundleDir, 'final', 'v2.md'), '# E2E UNDELIVERED V2 DRAFT\n\nThis v2 is a later draft; the delivered version is v1.\n', 'utf8')
    if (selected('S1')) {
      const page = await freshPage(browser, base, booted.token)
      try {
        const status = await openStatus(page)
        reachable('S1', status)
        check('S1 状态页交付徽标', /已交付/.test(status.paneText), status.paneText.slice(0, 120))
        const final = await readFinal(page)
        check('S1 终稿显示交付版 v1 正文', /五常|安理会|一句话答案/.test(final.text), final.text.slice(0, 120))
        check('S1 终稿不显示未交付 v2', !/UNDELIVERED V2 DRAFT/.test(final.text), final.text.slice(0, 160))
        check('S1 静音条不标「审计版 · v2」', !/审计版\s*·\s*v2/.test(final.text), final.text.slice(0, 160))
      } finally { await page.context().close().catch(() => {}) }
    }

    // ── S1b 地址目标 v1 缺失：失败态 + 重试，不得拿 v2 冒充 ─────────────────────
    if (selected('S1')) {
      rmSync(v1Path, { force: true })
      const page = await freshPage(browser, base, booted.token)
      try {
        const status = await openStatus(page)
        reachable('S1b', status)
        const final = await readFinal(page)
        check('S1b 目标缺失显示失败态', /读不到终稿|终稿文件缺失|无法读取|读取失败/.test(final.text), final.text.slice(0, 160))
        check('S1b 目标缺失不显示 v2', !/UNDELIVERED V2 DRAFT/.test(final.text), final.text.slice(0, 160))
      } finally {
        await page.context().close().catch(() => {})
        writeFileSync(v1Path, v1Text, 'utf8')
      }
    }

    // ── S2（BUG-357）已交付 + review FAIL：不得再说「报告不交付」 ─────────────────────────
    if (selected('S2')) {
      writeFileSync(reviewPath, reviewText.replace(/readiness:\s*PASS/g, 'readiness: FAIL'), 'utf8')
      const page = await freshPage(browser, base, booted.token)
      try {
        const status = await openStatus(page)
        reachable('S2', status)
        check('S2 审查 FAIL 仍可见', /对抗审查发现问题|审查未过|审查未通过/.test(status.paneText), status.paneText.slice(0, 160))
        check('S2 已交付 + FAIL 不出现「报告不交付」', !/报告不交付/.test(status.paneText), status.paneText.slice(0, 200))
        check('S2 出现「已交付仍可用 + 新审查」', /仍可用/.test(status.paneText) && /新审查|复审/.test(status.paneText), status.paneText.slice(0, 200))
      } finally {
        await page.context().close().catch(() => {})
        writeFileSync(reviewPath, reviewText, 'utf8')
      }
    }

    // ── S3（BUG-358）绑定 bundle 被移走：读取失败 + 重试，不得说「研究推进中」 ─────────────
    if (selected('S3')) {
      const backup = join(WORKSPACE_ROOT, 'bundle-backup')
      renameSync(bundleDir, backup)
      {
        const page = await freshPage(browser, base, booted.token)
        try {
          const status = await openStatus(page)
          reachable('S3', status)
          check('S3 显示研究状态读取失败', /研究状态读取失败|研究状态无法读取|研究状态读取异常/.test(status.paneText), status.paneText.slice(0, 160))
          check('S3 不显示「研究推进中」', !/研究推进中/.test(status.paneText), status.paneText.slice(0, 200))
        } finally { await page.context().close().catch(() => {}) }
      }
      renameSync(backup, bundleDir)
      {
        const page = await freshPage(browser, base, booted.token)
        try {
          const status = await openStatus(page)
          reachable('S3 恢复', status)
          check('S3 恢复后可读回 bound', status.face === 'bound', `face=${String(status.face)}`)
        } finally { await page.context().close().catch(() => {}) }
      }
    }

    // ── S4（BUG-359）review.md 不可读：审查读取失败，不得给 ✓ 审查 ───────────────────────
    if (selected('S4')) {
      chmodSync(reviewPath, 0o000)
      restore.push(() => chmodSync(reviewPath, 0o644))
      const page = await freshPage(browser, base, booted.token)
      try {
        const status = await openStatus(page)
        reachable('S4', status)
        check('S4 显示审查读取失败', /审查读取失败|审查文件读取失败|审查读取异常/.test(status.paneText), status.paneText.slice(0, 160))
        check('S4 不给「✓ 审查」', !status.paneText.includes('✓ 审查'), status.paneText.slice(0, 200))
      } finally {
        await page.context().close().catch(() => {})
        chmodSync(reviewPath, 0o644)
        restore.pop()
      }
    }

    // ── S5（BUG-360）evidence/ 不可读：证据读取失败，不得显示「证据 0 份」+ 全绿 ─────────
    if (selected('S5')) {
      chmodSync(evidenceDir, 0o000)
      restore.push(() => chmodSync(evidenceDir, 0o755))
      const page = await freshPage(browser, base, booted.token)
      try {
        const status = await openStatus(page)
        reachable('S5', status)
        check('S5 显示证据读取失败', /证据读取失败|证据读取异常|证据无法读取/.test(status.paneText), status.paneText.slice(0, 160))
        check('S5 不显示「证据 0 份」', !/证据\s*0\s*份/.test(status.paneText), status.paneText.slice(0, 200))
        check('S5 不把挖掘标 ✓', !status.paneText.includes('✓ 挖掘'), status.paneText.slice(0, 200))
      } finally {
        await page.context().close().catch(() => {})
        chmodSync(evidenceDir, 0o755)
        restore.pop()
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
  console.error(`cockpit-truth: 运行异常 — ${String(error)}`)
  process.exitCode = 2
}

const failed = results.filter((r) => !r.ok)
console.log(`\ncockpit-truth: ${String(results.length - failed.length)}/${String(results.length)} PASS`)
if (failed.length > 0) {
  for (const f of failed) console.log(`  FAIL  ${f.id}${f.detail === '' ? '' : ` — ${f.detail}`}`)
  process.exitCode = 1
} else if (results.length === 0) {
  console.error('cockpit-truth: 零断言 = 未跑，不是通过')
  process.exitCode = 2
}
