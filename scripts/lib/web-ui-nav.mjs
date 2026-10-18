// web-ui-nav.mjs — 观察面侧栏 UI 导航共享件（冒烟/驱动脚本的浏览器侧栏操作）。
// 来源：client-load-smoke.mjs 与 dev/hitl-answer.mjs 的逐字双份收敛（2026-10-13 结构重构）——
// 「同一判据两版实现」是本仓反复吃过的漂移病，两份句法已有微漂移即实证。
// 零依赖：page 按 Playwright Page 鸭子类型使用，不 import playwright——lib 面保持
// keyless-闭包友好（tests/layering 闭包图不因本模块引入浏览器依赖）；真浏览器证据
// 仍归消费方冒烟档（client-load-smoke）。

/** 侧栏候选分组名（折叠态逐组展开的目标序；组随会话 cwd 走——BUG-002 清扫轮实证：
 *  老 ad-hoc 会话在 harness-home 组，不在 research-workspace）。两消费方共用同一份。 */
export const SIDEBAR_GROUP_CANDIDATES = ['research-workspace', 'harness-home', 'Ungrouped', 'rehearsal-workspace']

/** 展开左栏指定折叠组：扫可见行（boundingBox x < 256——防中央区同名 class 抢匹配），
 *  组标题前缀匹配即点，点击后等稳定窗（DOM 重挂载）；找不到返回 false。
 *  点击落空容忍（catch 吞）与原两份一致——调用方靠后续断言/谓词判成败，不靠本函数报错。 */
export async function expandGroup(page, groupTitle) {
  const rows = page.locator('span[class*="_root_"]')
  const n = await rows.count()
  for (let i = 0; i < Math.min(n, 300); i++) {
    const el = rows.nth(i)
    if (!(await el.isVisible().catch(() => false))) continue
    const box = await el.boundingBox().catch(() => null)
    if (box === null || box.x >= 256) continue
    const text = ((await el.textContent()) ?? '').trim()
    if (text.startsWith(groupTitle) && !text.includes('New Session')) {
      await el.click({ timeout: 6_000 }).catch(() => {})
      await page.waitForTimeout(2_000)
      return true
    }
  }
  return false
}

/**
 * 按标题走侧栏**搜索**路径定位会话（2026-10-18 BUG-035 修复的正本）：
 * 侧栏列表是懒渲染的——实测 `research-workspace` 分组行在场，但该组的会话行**根本不在 DOM**
 * （`document.documentElement.outerHTML` 里搜不到目标标题），扫行与逐组展开都够不着；而
 * `Search sessions` 能搜到同一条会话。故搜索是"列表够不着"时的权威路径。
 * 受控输入用 native setter + input 事件（execCommand 不触发受控更新）。
 * @param page - Playwright Page（鸭子类型）。
 * @param title - 目标会话标题（盘侧日志给出的 title）。
 * @param settleMs - 输入后的稳定窗。
 * @returns 搜索面板是否成功打开并输入（不代表一定命中）。
 */
export async function searchSessionByTitle(page, title, { settleMs = 2500 } = {}) {
  const opened = await page.evaluate(() => {
    const b = document.querySelector('[aria-label="Search sessions"]')
    if (b === null) return false
    b.click()
    return true
  })
  if (!opened) return false
  await page.waitForTimeout(1500)
  await page.evaluate((t) => {
    const i = Array.from(document.querySelectorAll('input')).find((x) => x.getBoundingClientRect().width > 0)
    if (i === undefined) return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(i, t)
    i.dispatchEvent(new Event('input', { bubbles: true }))
  }, title)
  await page.waitForTimeout(settleMs)
  return true
}

/**
 * 目标会话定位总入口：扫行 → 逐组展开 → **搜索**（懒渲染兜底）。
 * @param page - Playwright Page（鸭子类型）。
 * @param title - 目标会话标题（搜索路径用）。
 * @param match - 判定"这一行就是目标"的谓词，收 (element) → Promise<boolean>。
 * @param opts - collapseWaitMs = 每次展开后的稳定窗；searchSettleMs = 搜索后稳定窗。
 * @returns {found: boolean, via: 'scan'|'expand'|'search'}。
 */
export async function openSessionByTitle(page, title, match, { collapseWaitMs = 1800, searchSettleMs = 2500, expandRounds = 20 } = {}) {
  const rows = page.locator('span[class*="_root_"]')
  const scan = async () => {
    const n = await rows.count()
    for (let i = 0; i < Math.min(n, 400); i++) {
      const el = rows.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      const box = await el.boundingBox().catch(() => null)
      if (box === null || box.x >= 256) continue
      if (await match(el)) return el
    }
    return null
  }
  let hit = await scan()
  if (hit !== null) { await hit.click({ timeout: 10_000 }).catch(() => {}); return { found: true, via: 'scan' } }
  for (const group of SIDEBAR_GROUP_CANDIDATES) await expandGroup(page, group).catch(() => {})
  await page.waitForTimeout(collapseWaitMs)
  hit = await scan()
  if (hit !== null) { await hit.click({ timeout: 10_000 }).catch(() => {}); return { found: true, via: 'expand' } }
  if (locateSessionStrategy({ triedSearch: false, title }) === 'search') {
    if (await searchSessionByTitle(page, title, { settleMs: searchSettleMs })) {
      hit = await scan()
      if (hit !== null) { await hit.click({ timeout: 10_000 }).catch(() => {}); return { found: true, via: 'search' } }
    }
  }
  return { found: false, via: title ? 'search' : 'expand' }
}

/**
 * 「扫不到就走搜索」的**策略**判定（纯函数，keyless 可测——浏览器 I/O 无 seam，但这条策略有）。
 * BUG-035 的教训：单路径扫行会把"侧栏懒渲染没列出目标行"误判成"会话不在/实例老化"，
 * 于是重启通道（实测无效）。策略 = 只要还没试过搜索且手上有标题，就必须试。
 * @param obs - foundByScan / foundByExpand / triedSearch / title。
 * @returns 'accept' | 'search' | 'give-up'。
 */
export function locateSessionStrategy(obs) {
  const { foundByScan = false, foundByExpand = false, triedSearch = false, title = null } = obs ?? {}
  if (foundByScan || foundByExpand) return 'accept'
  if (!triedSearch && typeof title === 'string' && title.trim() !== '') return 'search'
  return 'give-up'
}

/**
 * 按 **session id** 定位并点击侧栏会话行——直达路径（`data-row-key="session:<id>"` 是 UI 的
 * 权威行标识，不必扫行猜标题）；行不在 DOM 时退回标题搜索再试一次（懒渲染兜底，BUG-035）。
 * 用途：冒烟/驱动脚本里"要打开的就是这一条"的确定性定位——替代"重载后默认视图＝最新会话"
 * 这类脆弱假设（BUG-034 的选定修法）。
 * @param page - Playwright Page（鸭子类型）。
 * @param sessionId - 目标会话 id（不带 `session:` 前缀）。
 * @param title - 该会话的标题（搜索兜底用；未知传 null）。
 * @param settleMs - 搜索后的稳定窗。
 * @returns {found: boolean, via: 'row'|'search'}。
 */
export async function openSessionById(page, sessionId, title = null, { settleMs = 2500 } = {}) {
  const row = page.locator(`[data-row-key="session:${sessionId}"]`)
  if (await row.count().catch(() => 0) > 0) {
    if (await row.first().isVisible().catch(() => false)) {
      await row.first().click({ timeout: 10_000 }).catch(() => {})
      return { found: true, via: 'row' }
    }
  }
  if (locateSessionStrategy({ triedSearch: false, title }) === 'search') {
    if (await searchSessionByTitle(page, title, { settleMs })) {
      if (await row.count().catch(() => 0) > 0 && await row.first().isVisible().catch(() => false)) {
        await row.first().click({ timeout: 10_000 }).catch(() => {})
        return { found: true, via: 'search' }
      }
    }
  }
  return { found: false, via: 'row' }
}

/**
 * 点搜索结果（**搜索结果不带 `data-row-key`**——2026-10-18 实测：搜索后 `[data-row-key]` 计数 0，
 * 而搜索前列表里是有行键的；故只能按文本点最具体的那个匹配行）。点完由调用方复核
 * "主视图 session id 是否切到目标"（hitl-answer 已有该复核，点错也不代答）。
 * @param page - Playwright Page（鸭子类型）。
 * @param title - 目标会话标题。
 * @param settleMs - 点击后稳定窗。
 * @returns 是否点到（不代表切换成功）。
 */
export async function clickSearchResultByTitle(page, title, { settleMs = 2500 } = {}) {
  const clicked = await page.evaluate((t) => {
    const nodes = [...document.querySelectorAll('button,a,div,li,span')]
      .filter((n) => n.getClientRects().length > 0 && n.getBoundingClientRect().x < 320)
      .filter((n) => ((n.textContent ?? '').trim()).includes(t))
      .sort((a, b) => (a.textContent ?? '').length - (b.textContent ?? '').length)
    if (nodes.length === 0) return false
    nodes[0].click()
    return true
  }, title)
  await page.waitForTimeout(settleMs)
  return clicked
}
