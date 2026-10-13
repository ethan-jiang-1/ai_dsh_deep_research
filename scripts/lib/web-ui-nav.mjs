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
