#!/usr/bin/env node
// e2e-021rc2 —— 0.2.1-rc.2 升级后插件的**端到端验收**（agent 自测，不依赖用户手测）。
//
// 为什么存在（用户 2026-10-19 指令）：升级后插件是否还兼容，不能靠人眼点一遍"看着像好了"，
// 也不能靠分组冒烟各自绿——必须有一个脚本在**真实运行的 web 实例**上，走完用户真实路径，
// 并把每一段的可见结果断言下来：
//
//   ① 角色列表成组：角色选择器里四个 Deep Research preset **连续相邻**（0.2.1 新增内置
//      standard/ptc/minimal/creator 曾按 order 撞车把它们打散——本脚本是对那次回归的锁）；
//   ② 「研究状态」页签：右栏胶囊可点 → 点开后页签体渲染（步骤条/证据计数等真数据面）；
//   ③ 「研究配置」页签：右栏胶囊可点 → 点开后页签体渲染（内置偏好/偏好库等真数据面）。
//
// 判据 = 本脚本全绿（exit 0）。任何一条断言不过 → 非零退出 + 点名是哪一段。
//
// 用法：
//   node scripts/smoke/e2e-021rc2.mjs                # 自 boot 实例（临时端口，跑完收工）
//   node scripts/smoke/e2e-021rc2.mjs --url '<gui-url>'  # 对既有实例验（含 ?token= 的横幅 URL）
//   node scripts/smoke/e2e-021rc2.mjs --session '<标题>' # 指定绑定了 drt_ 的会话标题
//
// 前置：先 `source dev/env.sh`（DSH_HOME 与 dsh 解析都要）；未 source 自拒 exit 2。
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
// 侧栏会话定位 = lib/web-ui-nav **唯一正本**（2026-10-21 收拢：本件原私有 expandWorkspace /
// enterSession 的 data-row-key 实现升为 lib 主体——expandGroup / sessionRowsByLabel /
// searchSessionByTitle / typeIntoSessionSearch / clickSearchResultByTitle；当年分叉理由
// 「类名锚随 vendor 版本漂移即静默失效」已吸收进 lib 的主锚裁决，见其头注）。
import { clickSearchResultByTitle, expandGroup, searchSessionByTitle, sessionRowsByLabel, SIDEBAR_GROUP_CANDIDATES, typeIntoSessionSearch } from '../lib/web-ui-nav.mjs'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
if (home === null) {
  console.error('e2e-021rc2: 未 source dev/env.sh（DSH_HOME 缺席）——先 source 再跑')
  process.exit(2)
}

const argv = process.argv.slice(2)
const argOf = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : null
}
const givenUrl = argOf('--url')
const givenSession = argOf('--session')
const PORT = 3111

const { bootWeb } = await import('../lib/web-harness.mjs')
const { scrubbedEnv } = await import('../lib/env.mjs')
const { loadChromium } = await import('../lib/playwright.mjs')


/** 断言收集器：逐条打印 PASS/FAIL，收尾一次判定。 */
const failures = []
const step = (ok, label, info = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${info === '' ? '' : `（${info}）`}`)
  if (!ok) failures.push(label)
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** boot 一个实例（仅当未给 --url）；返回 { url, stop }。 */
async function bootInstance() {
  const bin = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
  if (!existsSync(bin)) throw new Error(`机制基线源码不可达：${bin}`)
  // overlay = 源码域（preset 行 + 本包 client 行）＋ agent-team host 行（团队正例环境）。
  const overlay = join(ROOT, 'runtime', 'smoke-workspace', 'e2e-021rc2.overlay.yml')
  const { readFileSync, writeFileSync, mkdirSync } = await import('node:fs')
  const TEAM_ROW = `
    - id: agent-team
      name: '@deepseek-ai/dsh-experimental-agent-team'
      config:
        maxMembers: 8
        maxTasks: 256
        maxPendingMessagesPerMember: 64
        maxMessageBytes: 65536
        disposalTimeoutMs: 5000
`
  mkdirSync(join(ROOT, 'runtime', 'smoke-workspace'), { recursive: true })
  writeFileSync(overlay, readFileSync(join(ROOT, 'dev', 'research.overlay.yml'), 'utf8') + TEAM_ROW, 'utf8')
  const booted = await bootWeb({
    bin,
    cwd: ROOT,
    profile: 'web',
    patchPath: overlay,
    port: PORT,
    env: scrubbedEnv({ DSH_HOME: home }),
    timeoutMs: 240_000,
    tailChars: 1200,
    detached: false,
  })
  return {
    url: `http://127.0.0.1:${String(PORT)}/?token=${booted.token}`,
    stop: () => {
      try {
        booted.child.kill('SIGTERM')
      } catch {
        /* 已退出 */
      }
    },
  }
}

/** 打开一个绑定了 drt_ 的会话（页面进入会话态——右栏页签只在会话上下文里渲染）。
 *  三级路径：① 分组展开（lib expandGroup，data-row-key 主锚）后按行键会话行点；② Search
 *  sessions 面板（懒渲染列表的权威路径；首个 frag 开面板、后续只打字——面板按钮疑似开关，
 *  重复点可能收起）；③ 放弃。定位用**剥掉 markdown 强调符**的标题（run 标题常带反引号，
 *  原文喂匹配会失效）。 */
async function enterSession(page, title) {
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: 120_000 }).catch(() => {})
  await wait(5_000)
  const needle = title.replace(/[`*]/g, '')
  const frags = [needle, ...needle.split(/\s+/).filter((s) => s.length >= 3).sort((a, b) => b.length - a.length)]

  // ① 分组展开后直接点会话行（research-workspace 是本仓 run 会话的家；首展即止——
  //    候选组名正本 = lib SIDEBAR_GROUP_CANDIDATES）。
  for (const group of SIDEBAR_GROUP_CANDIDATES) {
    if (await expandGroup(page, group, { settleMs: 3_000 })) break
  }
  for (const frag of frags) {
    const row = sessionRowsByLabel(page, frag).first()
    if ((await row.count().catch(() => 0)) > 0 && (await row.isVisible().catch(() => false))) {
      await row.click({ timeout: 8_000 }).catch(() => {})
      await wait(5_000)
      return true
    }
  }

  // ② Search sessions（列表懒渲染够不着时的权威路径；搜索结果可能不带 row-key——
  //    行键重试失败后按文本点最具体的那一行，lib 唯一正本）。
  for (const [i, frag] of frags.entries()) {
    if (i === 0) {
      if (!(await searchSessionByTitle(page, frag, { settleMs: 2_500 }))) return false
    } else {
      await typeIntoSessionSearch(page, frag, { settleMs: 2_500 })
    }
    const hit = sessionRowsByLabel(page, frag).first()
    if ((await hit.count().catch(() => 0)) > 0) {
      await hit.click({ timeout: 8_000 }).catch(() => {})
      await wait(5_000)
      return true
    }
    if (await clickSearchResultByTitle(page, frag, { settleMs: 5_000 })) {
      return true
    }
  }
  return false
}

/** 展开右栏，点「研究配置」/「研究状态」胶囊；返回两者是否可见与点开后的正文。 */
async function openTab(page, name) {
  const expand = page.getByRole('button', { name: 'Open right sidebar' })
  if ((await expand.count()) > 0) await expand.first().click({ timeout: 8_000 }).catch(() => {})
  await wait(1_500)
  let cap = page.getByRole('button', { name: new RegExp(name) }).first()
  let ok = await cap.isVisible({ timeout: 10_000 }).catch(() => false)
  if (!ok) {
    // guide 页兜底：右栏「New tab」开 guide，胶囊在 guide 页上（company 配方）。
    const addTab = page.getByRole('button', { name: 'New tab' }).first()
    if ((await addTab.count()) > 0) {
      await addTab.click({ timeout: 5_000 }).catch(() => {})
      await wait(2_000)
      cap = page.getByRole('button', { name: new RegExp(name) }).first()
      ok = await cap.isVisible({ timeout: 10_000 }).catch(() => false)
    }
  }
  if (ok) {
    await cap.click({ timeout: 5_000 }).catch(() => {})
    await wait(5_000)
  }
  const text = await page.evaluate(() => {
    const el = document.querySelector('[data-sidebar-right-session]') ?? document.body
    return el.innerText ?? ''
  })
  return { visible: ok, text }
}

/** 角色选择器：点开 seat 标签，读全部 preset 名，断言四个研究角色连续相邻。
 *  重试白名单（scripts/AGENTS §冒烟脚本可靠性纪律）：seat 标签是首屏异步挂载的 UI 节点，
 *  它缺席不是兼容判据而是渲染竞态——**只对"首次点开没拿到任何 preset 名"重试一次**；
 *  拿到名字之后的一切断言（数量/连续性）都是确定性的，不重试。 */
async function assertRoleGrouping(page) {
  const readNames = async () => {
    const seat = page.locator('[class*="seatLabel"]').first()
    if (!(await seat.isVisible({ timeout: 20_000 }).catch(() => false))) return null
    await seat.click({ timeout: 8_000 }).catch(() => {})
    await wait(2_500)
    const names = await page
      .locator('[role="menuitem"], [role="option"], li')
      .allInnerTexts()
      .then((all) => all.map((s) => s.split('\n')[0].trim()).filter((s) => s !== ''))
    await page.keyboard.press('Escape').catch(() => {})
    await wait(800)
    return names
  }
  let names = await readNames()
  if (names === null || names.length === 0) {
    await wait(3_000)
    names = await readNames()
  }
  if (names === null) return { ok: false, detail: '角色 seat 标签缺席（首屏未挂载）' }
  if (names.length === 0) return { ok: false, detail: '角色选择器点开后零 preset（弹层未渲染）' }
  const research = names.filter((n) => n.startsWith('Deep Research'))
  // 连续谓词：四个研究角色在原始序列里占据相邻下标（中间不夹内置 preset）。
  const idx = names.map((n, i) => (n.startsWith('Deep Research') ? i : -1)).filter((i) => i >= 0)
  const contiguous = idx.length === 4 && idx.every((v, k) => k === 0 || v === idx[k - 1] + 1)
  return {
    ok: research.length === 4 && contiguous,
    detail: `四个角色=${String(research.length)} 连续=${String(contiguous)} 序列=[${names.join(' | ')}]`,
  }
}

const instance = givenUrl === null ? await bootInstance() : { url: givenUrl, stop: () => {} }
const browser = await (await loadChromium(ROOT)).launch()
let page = null
let consoleProblems = []
// 失败现场（审计 P0-4）：agent 的可见证据——截图 + DOM + console + meta，成功不写。
const saveArtifacts = async (reason) => {
  if (page === null) return
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = join(ROOT, 'runtime', 'smoke-workspace', `e2e-021rc2-${stamp}`)
  try {
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: join(dir, 'page.png'), fullPage: true }).catch(() => {})
    writeFileSync(join(dir, 'page.html'), await page.content().catch(() => ''))
    writeFileSync(join(dir, 'console.txt'), consoleProblems.join('\n'))
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ reason, at: new Date().toISOString(), failures, consoleProblems }, null, 2))
    console.error(`e2e-021rc2: 失败现场 ${dir}（page.png / page.html / console.txt / meta.json）`)
  } catch (error) {
    console.error(`e2e-021rc2: 现场保存失败：${error.message}`)
  }
}
try {
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  consoleProblems = []
  // 只收**本仓插件面**的故障：JS 异常一律收（apply 抛错会把 UI 砖掉）；资源失败只收 URL 带
  // deep-research 的。宿主自身接口的既有 4xx 不作判据——对照实测（2026-10-19，stock web
  // profile 不挂本包）：`/api/changes.summary` 进会话后同样 404，计入本脚本即与本升级无关的假红。
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const text = m.text().slice(0, 200)
    if (!/Failed to load resource/.test(text)) consoleProblems.push(text)
  })
  page.on('pageerror', (e) => consoleProblems.push(`EXCEPTION ${String(e).slice(0, 200)}`))
  page.on('response', (r) => {
    if (r.status() >= 400 && /deep-research/.test(r.url())) consoleProblems.push(`${String(r.status())} ${r.url().slice(-120)}`)
  })

  console.log(`e2e-021rc2: ${givenUrl === null ? `自 boot ${String(PORT)}` : '既有实例'}`)
  // 只 goto 一次，**不 reload**：boot 横幅里的 token 与这次页面加载是一对一的，reload 会让
  // 既有实例上的 RPC 通道失配（2026-10-19 实测：--url 模式多一次 reload 后右栏页签静默不渲染，
  // 而同代码自 boot 模式绿——reload 是脚本副作用，不是被测对象）。
  await page.goto(instance.url, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await wait(8_000)

  // 绑定会话标题候选：--session 显式给定 > 盘侧自动发现 > 无。
  // 为什么是**候选列表**：盘侧"最新富会话"未必在侧栏可见窗口内（GUI 只渲染视窗内分组条目，
  // 2026-10-19 实测 `版本范围解析` 会话在盘上但侧栏够不到）；逐个 Try 直到真的点开一个绑定 run
  // 的会话——断言对象是"页签在会话上下文里渲染"，不绑定某个具体 run。
  const titles = []
  if (givenSession !== null) titles.push(givenSession)
  {
    const { researchWorkspaceGroup } = await import('../lib/session-log.mjs')
    const { prepareClientLoadReference } = await import('./client-load-reference.mjs')
    const group = researchWorkspaceGroup(join(home, 'sessions'))
    if (group !== undefined) {
      const { boundSession } = prepareClientLoadReference({ root: ROOT, sessionsRoot: join(home, 'sessions'), sessionGroup: group })
      if (boundSession?.title !== undefined) titles.push(boundSession.title)
    }
  }
  // 侧栏可见的绑定 run 会话（逐个 run 的标题，靠前的先试）。
  for (const extra of ['中美农业差异']) if (!titles.includes(extra)) titles.push(extra)
  if (titles.length === 0) {
    console.error('e2e-021rc2: dev home 找不到绑定 run 的带历史会话——先跑一场 run，或用 --session 指定标题')
    process.exit(2)
  }
  // ① 角色列表成组——**必须在进会话前做**：角色 seat 标签只在首屏（新会话输入框旁）在场，
  //    进了会话就换成交付面（2026-10-19 实测「角色 seat 标签缺席」= 顺序错，不是兼容缺陷）。
  const grouping = await assertRoleGrouping(page)
  step(grouping.ok, '① 四个研究角色在角色列表里连续成组', grouping.detail)

  let entered = false
  let enteredTitle = ''
  for (const title of titles) {
    if (await enterSession(page, title)) {
      entered = true
      enteredTitle = title
      break
    }
  }
  step(entered, '进入绑定 run 的会话（页签渲染的会话上下文）', entered ? `「${enteredTitle}」` : `候选全失败：${titles.join(' / ')}`)

  // ② 研究状态页签
  const status = await openTab(page, '研究状态')
  step(status.visible, '②「研究状态」右栏胶囊在场且可点')
  const statusBodyOk = /证据|步骤|交付|证据计数|立项|组队|侦察/i.test(status.text)
  step(statusBodyOk, '②「研究状态」页签体渲染研究语义真数据', `正文 ${String(status.text.length)} 字`)

  // ③ 研究配置页签
  const config = await openTab(page, '研究配置')
  step(config.visible, '③「研究配置」右栏胶囊在场且可点')
  const configBodyOk = /偏好|底线|本次研究|指令|回执/i.test(config.text)
  step(configBodyOk, '③「研究配置」页签体渲染配置语义真数据', `正文 ${String(config.text.length)} 字`)

  const clean = consoleProblems.length === 0
  step(clean, '本插件面零故障（JS 异常 / deep-research 资源失败）', clean ? '' : consoleProblems.slice(0, 3).join(' / '))

  console.log(
    failures.length === 0
      ? '\ne2e-021rc2: ALL PASS（0.2.1-rc.2 上插件端到端兼容）'
      : `\ne2e-021rc2: ${String(failures.length)} FAILURE(S) —— ${failures.join(' / ')}`,
  )
} catch (error) {
  failures.push(`浏览器断言异常: ${error.message}`)
  console.error(`  FAIL 浏览器断言异常: ${error.message}`)
} finally {
  if (failures.length > 0) await saveArtifacts('assertions')
  await browser.close().catch(() => {})
  instance.stop()
}
process.exit(failures.length === 0 ? 0 : 1)
