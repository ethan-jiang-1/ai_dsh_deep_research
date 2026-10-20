// web-ui-nav.mjs — 观察面侧栏 UI 导航共享件——**唯一正本**（冒烟/驱动/探针脚本的浏览器侧栏会话定位）。
//
// 正本地位与策略裁决（2026-10-21 收拢，六维卫生评审维度2 M2）：侧栏会话定位此前跨 6 文件
// 3 风格——本 lib 只被部分采用：client-load-smoke import 的同时自持 clickRowByText /
// openSessionByRowKey 私有版；hitl-answer 自持行键扫描/折叠展开/搜索兜底一套；e2e-021rc2
// 明写分叉理由改走 data-row-key；cdp-probe 另有 CDP evaluate 版「Show N more」点击；
// client-hitl-smoke 还在 class 扫行。两套选择器策略各有实红教训，裁决如下：
//   · 类名锚（span[class*='_root_'] + 左栏 x<256 版面约束）：2026-10-13 从两份逐字副本收敛
//     而来，但 vendor 换版类名漂移即**静默失效**（e2e-021rc2 分叉实录：0.2.1-rc.2 上按类名
//     找分组行够不着，data-row-key 契约才稳）——例外正是本 lib 旧 expandGroup 的实现。
//   · data-row-key 锚（session:<id> / workspace:<name> 行键）：UI 的权威行标识（BUG-034 行键
//     直开、hitl-answer 行键复核、e2e-021rc2 分叉三处实证）；盲点 = **搜索结果不带行键**
//     （2026-10-18 实测），搜索兜底必须按文本点。
// 裁决：**data-row-key 主锚**；类名扫描降级为兜底（vendor 行键缺席的旧形态）；「Show N more」
// 逐层与「Search sessions」搜索为懒渲染/深列表的标准兜底层。全部消费方从本件取策略。
//
// CDP 边界：cdp-probe 走裸 CDP evaluate（handle.evaluate 字符串形态，无法共用 Playwright
// Page 鸭子类型接口）——保留薄 CDP 适配层，但选择器策略从本 lib 取：纯常量
// SHOW_MORE_SESSIONS_PATTERN（regex source 字符串）供其 evaluate 字符串插值消费。
//
// 零依赖：page 按 Playwright Page 鸭子类型使用，不 import playwright——lib 面保持
// keyless-闭包友好（tests/layering 闭包图不因本模块引入浏览器依赖）；真浏览器证据
// 仍归消费方冒烟档（client-load-smoke / e2e-021rc2）。

/** 侧栏候选分组名（折叠态逐组展开的目标序；组随会话 cwd 走——BUG-002 清扫轮实证：
 *  老 ad-hoc 会话在 harness-home 组，不在 research-workspace）。两消费方共用同一份。 */
export const SIDEBAR_GROUP_CANDIDATES = ['research-workspace', 'harness-home', 'Ungrouped', 'rehearsal-workspace']

/** 「Show N more sessions」按钮文本模式（regex source 字符串，**不是 RegExp 实例**：
 *  CDP 消费方要把这个模式插进 evaluate 字符串，JSON.stringify(RegExp) 会丢 source；
 *  Playwright 消费方 new RegExp(SHOW_MORE_SESSIONS_PATTERN) 等价。唯一正本——vendor 换
 *  文案只改这一处，各消费方一起跟。keyless 钉 = tests/cockpit/library-fold.test.mjs。 */
export const SHOW_MORE_SESSIONS_PATTERN = 'Show \\d+ more sessions'

// ── 行键定位原语（data-row-key 主锚）──────────────────────────────────────────────

/** 会话行定位器（主锚：`data-row-key="session:<id>"` 是 UI 的权威行标识——按 id 直达，
 *  不经文本启发式；标题重名/子串撞车的实红教训见 openSessionById 头注）。 */
export function sessionRowById(page, sessionId) {
  return page.locator(`[data-row-key="session:${sessionId}"]`)
}

/** 按文本找会话行（主锚：`[data-row-key^="session:"]` + hasText；text 可以是剥掉 markdown
 *  强调符的标题片段——run 标题常带反引号，原文喂匹配会失效，e2e-021rc2 实证）。 */
export function sessionRowsByLabel(page, text) {
  return page.locator('[data-row-key^="session:"]').filter({ hasText: text })
}

/** 逐个展开仍折叠的组行（workspace/overflow 行 `aria-expanded="false"`，只认左栏 x<256）——
 *  目标组名未知时的通用扫展（hitl-answer 原语义）；只点收起的组，无手风琴误伤。
 *  @returns 是否又展开了一组。 */
async function expandOneCollapsedSection(page) {
  for (const prefix of ['workspace:', 'overflow:']) {
    const rows = page.locator(`[data-row-key^="${prefix}"]`)
    const n = await rows.count().catch(() => 0)
    for (let i = 0; i < Math.min(n, 300); i++) {
      const el = rows.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      if (await el.getAttribute('aria-expanded') !== 'false') continue
      const box = await el.boundingBox().catch(() => null)
      if (box === null || box.x >= 256) continue
      await el.click({ timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(120)
      return true
    }
  }
  return false
}

/** 点一层「Show N more sessions」（深列表分页：dev home 累积 250+ 会话、目标可埋 8 层——
 *  2026-10-10 实测）。按钮在 → 点 + 稳定窗 → true；不在 → false。 */
async function showMoreOnce(page, { clickTimeoutMs = 4_000, settleMs = 1_500 } = {}) {
  const more = page.getByText(new RegExp(SHOW_MORE_SESSIONS_PATTERN)).first()
  if (!(await more.isVisible({ timeout: 1_500 }).catch(() => false))) return false
  await more.click({ timeout: clickTimeoutMs }).catch(() => {})
  await page.waitForTimeout(settleMs)
  return true
}

/**
 * 展开侧栏指定折叠组：**data-row-key 主锚**（`[data-row-key^="workspace:"]` 行 hasText 组名
 * → 点，点击后等稳定窗；e2e-021rc2 的 expandWorkspace 分叉实现升正本）；行键扫不到时降级
 * 类名扫描（`span[class*="_root_"]` 前缀匹配——2026-10-13 收敛版，vendor 行键缺席的旧形态
 * 兜底）。找不到返回 false。点击落空容忍（catch 吞）与原两份一致——调用方靠后续断言/谓词
 * 判成败，不靠本函数报错。
 * @param opts.settleMs 点击后稳定窗（默认 2s = client-load-smoke 原值；e2e-021rc2 传 3s）。
 */
export async function expandGroup(page, groupTitle, { settleMs = 2_000 } = {}) {
  const wsRows = page.locator('[data-row-key^="workspace:"]')
  const n = await wsRows.count().catch(() => 0)
  for (let i = 0; i < n; i++) {
    const el = wsRows.nth(i)
    const text = (await el.textContent().catch(() => null)) ?? ''
    if (!text.includes(groupTitle)) continue
    if (!(await el.isVisible().catch(() => false))) continue
    await el.click({ timeout: 8_000 }).catch(() => {})
    await page.waitForTimeout(settleMs)
    return true
  }
  const rows = page.locator('span[class*="_root_"]')
  const m = await rows.count().catch(() => 0)
  for (let i = 0; i < Math.min(m, 300); i++) {
    const el = rows.nth(i)
    if (!(await el.isVisible().catch(() => false))) continue
    const box = await el.boundingBox().catch(() => null)
    if (box === null || box.x >= 256) continue
    const text = ((await el.textContent().catch(() => null)) ?? '').trim()
    if (text.startsWith(groupTitle) && !text.includes('New Session')) {
      await el.click({ timeout: 6_000 }).catch(() => {})
      await page.waitForTimeout(settleMs)
      return true
    }
  }
  return false
}

// ── 搜索路径（懒渲染兜底——BUG-035 的权威路径）────────────────────────────────────

/**
 * 向**已打开**的搜索面板输入（受控输入用 native setter + input 事件——execCommand 不触发
 * 受控更新）；输入后等稳定窗。与 searchSessionByTitle 的分工：本函数只打字不开面板——
 * 多关键词逐个试的消费方（e2e-021rc2 的 frag 轮）开一次面板后反复调用，避免重复点开
 * 面板按钮（该按钮疑似开关，重复点击可能把面板收起）。
 */
export async function typeIntoSessionSearch(page, text, { settleMs = 2500 } = {}) {
  await page.evaluate((t) => {
    const i = Array.from(document.querySelectorAll('input')).find((x) => x.getBoundingClientRect().width > 0)
    if (i === undefined) return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(i, t)
    i.dispatchEvent(new Event('input', { bubbles: true }))
  }, text)
  await page.waitForTimeout(settleMs)
}

/**
 * 按标题走侧栏**搜索**路径定位会话（2026-10-18 BUG-035 修复的正本）：
 * 侧栏列表是懒渲染的——实测 `research-workspace` 分组行在场，但该组的会话行**根本不在 DOM**
 * （`document.documentElement.outerHTML` 里搜不到目标标题），扫行与逐组展开都够不着；而
 * `Search sessions` 能搜到同一条会话。故搜索是"列表够不着"时的权威路径。
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
  await typeIntoSessionSearch(page, title, { settleMs })
  return true
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

// ── 定位总入口（消费方收敛面）────────────────────────────────────────────────────

/**
 * 会话行定位核心（**data-row-key 主锚**；只定位不点击不搜索——点击与搜索兜底归
 * openSessionById 与消费方自带复核）：
 *   ① 行键直达：目标行已在 DOM 且可见；
 *   ② 具名组展开：点含 groupTitle（默认 research-workspace——本仓 run 会话的家）的
 *      workspace 行；手风琴回正（点后行数不增反减 = 把已展开的组点收了 → 再点一次）；
 *   ③ 通用扫展：逐个展开仍折叠的组行（aria-expanded，无具名假设——hitl-answer 语义）；
 *   ④ 「Show N more」逐层（openSessionByRowKey 原语义：40 层上限）。
 * @param opts.groupTitle 具名组步的组名（null 跳过该步）；sweepAttempts / showMoreRounds 上限。
 * @returns `{ row, via }`（via = 'direct'|'named-group'|'sweep'|'show-more'）或 null。
 */
export async function revealSessionRow(page, sessionId, opts = {}) {
  const { groupTitle = 'research-workspace', sweepAttempts = 300, showMoreRounds = 40 } = opts
  const row = page.locator(`[data-row-key="session:${sessionId}"]`)
  const visible = async () => (await row.count().catch(() => 0)) > 0
    && await row.first().isVisible().catch(() => false)
  if (await visible()) return { row: row.first(), via: 'direct' }
  // ② 具名组（手风琴回正——原 openSessionByRowKey 逐字语义：2s 稳定窗 ×2）
  if (groupTitle !== null) {
    const wsRows = page.locator('[data-row-key^="workspace:"]')
    const n = await wsRows.count().catch(() => 0)
    for (let i = 0; i < n; i++) {
      const el = wsRows.nth(i)
      if (!((await el.textContent().catch(() => null)) ?? '').includes(groupTitle)) continue
      const before = await page.locator('[data-row-key^="session:"]').count().catch(() => 0)
      await el.click({ timeout: 8_000 }).catch(() => {})
      await page.waitForTimeout(2_000)
      const after = await page.locator('[data-row-key^="session:"]').count().catch(() => 0)
      // 手风琴：本来展开着的组被点成收起（行数掉）→ 再点一次展开回来
      if (before > 0 && after < before) { await el.click({ timeout: 8_000 }).catch(() => {}); await page.waitForTimeout(2_000) }
      break
    }
    if (await visible()) return { row: row.first(), via: 'named-group' }
  }
  // ③ 通用扫展（aria-expanded——只点收起的组）
  for (let attempt = 0; attempt < sweepAttempts; attempt++) {
    if (await visible()) return { row: row.first(), via: 'sweep' }
    if (!(await expandOneCollapsedSection(page))) break
  }
  // ④ Show N more 逐层
  for (let round = 0; round < showMoreRounds; round++) {
    if (await visible()) return { row: row.first(), via: 'show-more' }
    if (!(await showMoreOnce(page))) break
  }
  return await visible() ? { row: row.first(), via: 'show-more' } : null
}

/**
 * 同名行择取的标题点击（原 client-load-smoke 私有 clickRowByText 升正本，2026-10-21 收拢；
 * 返回布尔，签名不变）：扫行 → 「Show N more」逐层 → 搜索后再扫。
 * 扫行 = **行键主锚**（`[data-row-key^="session:"]` 会话行）+ 类名兜底（`span[class*="_root_"]`
 * + 左栏 x<256——vendor 行键缺席的旧形态），同一择取规则：
 *   同名行择取（2026-10-19 实红）：绑定标题「Claude 模型发布线追踪」是「Anthropic Claude
 *   模型发布线追踪」的子串，先撞上后者——点开的是另一场 run。取法 = 全遍历后择一：
 *   完全等优先，否则取最短含子串行，仍并列才按侧栏顺序（新→旧）取首个。
 * 搜索后扫行靠类名兜底命中——**搜索结果不带行键**（2026-10-18 实测）。
 * @returns 是否点到（不代表切换成功——切换复核归调用方）。
 */
export async function clickRowByText(page, text, opts = {}) {
  const { showMoreRounds = 60, searchSettleMs = 2500 } = opts
  const scan = async () => {
    let exact = null
    const partial = []
    // 主锚：会话行（行键）——exact 优先 / 最短含子串；行键行天然只在侧栏（无 x 约束）
    const keyed = page.locator('[data-row-key^="session:"]')
    const kn = await keyed.count().catch(() => 0)
    for (let i = 0; i < Math.min(kn, 300); i++) {
      const el = keyed.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      const rowText = ((await el.textContent().catch(() => null)) ?? '').trim()
      if (rowText === text) { exact = el; break }
      if (rowText.includes(text)) partial.push({ el, len: rowText.length })
    }
    let pick = exact ?? (partial.length === 0 ? null : partial.sort((a, b) => a.len - b.len)[0].el)
    if (pick !== null) { await pick.click({ timeout: 10_000 }).catch(() => {}); return true }
    // 兜底：类名扫描（旧形态 + 左栏 x<256——中央区同名 class 会抢匹配）
    const rows = page.locator('span[class*="_root_"]')
    const n = await rows.count().catch(() => 0)
    exact = null
    partial.length = 0
    for (let i = 0; i < Math.min(n, 300); i++) {
      const el = rows.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      const box = await el.boundingBox().catch(() => null)
      if (box === null || box.x >= 256) continue
      const rowText = ((await el.textContent().catch(() => null)) ?? '').trim()
      if (rowText === text) { exact = el; break }
      if (rowText.includes(text)) partial.push({ el, len: rowText.length })
    }
    pick = exact ?? (partial.length === 0 ? null : partial.sort((a, b) => a.len - b.len)[0].el)
    if (pick !== null) { await pick.click({ timeout: 10_000 }).catch(() => {}); return true }
    return false
  }
  if (await scan()) return true
  // 深列表循环展开（2026-10-10 实测：dev home 累积 250+ 会话，目标会话可埋 8 层
  // "Show N more sessions"——单次展开够不着。逐层点开直到目标在场/按钮消失/轮上限；
  // 每层揭示数个会话，1.8s 稳定窗）。探针会话污染的定期清理正本 = 录制器头注。
  for (let round = 0; round < showMoreRounds; round++) {
    if (!(await showMoreOnce(page, { settleMs: 1_800 }))) break
    if (await scan()) return true
  }
  // 仍不可见 → 走「Search sessions」按名字定位（深列表的权威路径；搜索结果不带行键，
  // 由上面的类名兜底扫描命中）
  if (await searchSessionByTitle(page, text, { settleMs: searchSettleMs })) {
    if (await scan()) return true
  }
  return false
}

/**
 * 目标会话定位总入口（**行键主锚**；吸收原 client-load-smoke 私有 openSessionByRowKey、
 * hitl-answer 私有 revealTargetRow、旧 openSessionById 三套，2026-10-21 收拢）：
 *   ① revealSessionRow（行键直达 → 具名组展开(手风琴回正) → 通用扫展 → Show N more 逐层）
 *      → 点行；
 *   ② 搜索兜底（title 在手时；懒渲染权威路径——BUG-035）：Search sessions 输入标题 →
 *      行键重试 → 搜索结果按文本点（结果不带行键）；是否真切到目标由调用方复核
 *      （hitl-answer 的 activated() 同款，点错也不代答）。
 * 搜索层门槛 = locateSessionStrategy（纯函数 seam，tests/cockpit/library-fold 钉住）。
 * 为什么行键优先：标题在 dev home 里会重名（「…发布线跟踪」多份），按标题点会打开另一条
 * ——期望侧绑的却是参考对象选的那条，对账因此假红（2026-10-20 实测）；会话 id 是权威标识，
 * `[data-row-key]` 定位不经文本。
 * @returns { found, via: 'direct'|'named-group'|'sweep'|'show-more'|'search'|'miss', tried }。
 */
export async function openSessionById(page, sessionId, title = null, opts = {}) {
  const { clickTimeoutMs = 8_000, searchSettleMs = 2500, resultSettleMs = 2500 } = opts
  const tried = []
  const reveal = await revealSessionRow(page, sessionId, opts)
  if (reveal !== null) {
    await reveal.row.click({ timeout: clickTimeoutMs }).catch(() => {})
    return { found: true, via: reveal.via, tried: [...tried, 'reveal'] }
  }
  tried.push('reveal')
  if (locateSessionStrategy({ triedSearch: false, title }) === 'search') {
    tried.push('search')
    if (await searchSessionByTitle(page, title, { settleMs: searchSettleMs })) {
      const row = page.locator(`[data-row-key="session:${sessionId}"]`)
      if (await row.count().catch(() => 0) > 0 && await row.first().isVisible().catch(() => false)) {
        await row.first().click({ timeout: clickTimeoutMs }).catch(() => {})
        return { found: true, via: 'search', tried }
      }
      if (await clickSearchResultByTitle(page, title, { settleMs: resultSettleMs })) {
        return { found: true, via: 'search', tried }
      }
    }
  }
  return { found: false, via: 'miss', tried }
}
