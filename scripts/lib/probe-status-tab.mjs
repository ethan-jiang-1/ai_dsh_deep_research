// scripts/lib/probe-status-tab.mjs —— 「点哪个按钮才算打开研究状态页签」的纯判据（cdp-probe 的 DOM 规则核心）。
//
// 为什么抽出来（2026-10-19，run-driver 落地时实测的**假阳**）：cdp-probe 旧版这样找页签——
//   Array.from(document.querySelectorAll('button')).find(x => (x.textContent ?? '').includes('研究状态'))
// vendor 右栏页签胶囊的 DOM 是「标题 span + 描述 span」（ui-sidebar-right GuideBody 的
// `<span data-title>研究状态</span><span data-description>研究 run 的步骤…</span>`），按钮的
// textContent = 「研究状态研究 run 的步骤、等待与证据状态」——`includes('研究状态')` 本该命中。
// 真正的缺陷在**时序**：`openStatusPane` 点完「Open right sidebar」只等 1.5s 就查按钮，右栏
// 未完成挂载时查不到 → `statusPaneOpen=false`；而**不开会话时**右栏仍是 Guide 空态（页签胶囊
// 在场）与开过会话时**右栏已被会话页占位**（页签胶囊不在顶层按钮表里）两种形态不同——
// 旧判据把后者读成"页签坏了"，把前者里的**会话正文**里出现的「研究状态」字样读成"页签开了"
// （探针 `paneText()` 取 `body.innerText.indexOf('研究状态')`——会话正文提到这个词就假阳）。
//
// 判据拆两半，本文件管"该点谁 + 怎么判开没开"：
//   · 页签胶囊候选 = 带 `data-sidebar-right-guide-entry` 的按钮，按 aria-label 之外的**标题 span**
//     精确等于目标标题（拒绝描述串入匹配——描述文本变化不许让门禁漂移）；
//   · 页签体 = `[data-sidebar-right-tab]` 元素的文本（vendor 稳定的 data 钩子，不用哈希类名）。
// 页面侧只读 DOM（evaluate 取按钮签名与 data 钩子），选谁/判绿的决定留在本纯函数里——BUG-021
// 的 `probe-send-target` 同款分层：判据可被 keyless 测试常驻钉住。
//
// 消费方 = scripts/probe/cdp-probe.mjs（`--open-status`）、dev/run-driver.mjs（浏览器面 verdict）。

/** 页签按钮签名里允许出现的最长子串：标题 span 的精确文本。 */
const TITLE_SPAN_CHARS = 80;

/**
 * 从页面读到的按钮表里选页签胶囊。
 * @param {{buttons: Array<{tag: string, label: string, title: string, guideEntry: string|null}>}} dom - 页面只读表。
 * @param {string} title - 目标页签标题（如「研究状态」）。
 * @returns {{pickedIndex: number|null, reason: string, candidateTitles: string[]}}
 *   pickedIndex = 按钮表下标（页面按同一下标点击）；null 时 reason 说明为什么没点。
 */
export function pickStatusTab({ buttons, title }) {
  const list = Array.isArray(buttons) ? buttons : [];
  const withGuide = list.map((b, i) => ({ ...b, i })).filter((b) => b.guideEntry !== null && b.guideEntry !== undefined);
  // 优先：带 vendor guide-entry 钩子的胶囊（右栏 Guide 空态的标准形态）
  const guideHit = withGuide.find((b) => exactTitle(b.title, title));
  if (guideHit !== undefined) {
    return { pickedIndex: guideHit.i, reason: 'guide-entry', candidateTitles: withGuide.map((b) => b.title) };
  }
  // 退化：页签胶囊已渲染在别处（右栏已被会话页占位）——在**所有**按钮里按标题 span 精确匹配
  const anyHit = list.map((b, i) => ({ ...b, i })).find((b) => exactTitle(b.title, title));
  if (anyHit !== undefined) {
    return { pickedIndex: anyHit.i, reason: 'title-span', candidateTitles: list.map((b) => b.title).filter(Boolean) };
  }
  return { pickedIndex: null, reason: 'not-found', candidateTitles: withGuide.map((b) => b.title) };
}

/** 标题精确匹配：按钮内**标题 span** 逐字等于目标（不拿 textContent 整串 includes——描述串入即漂移）。 */
function exactTitle(spanText, title) {
  if (typeof spanText !== 'string') return false;
  // 逐字相等（不 trim：标题 span 的前后空白本身就是"不是同一个标题"的信号——trim 会让
  // '研究状态 ' 命中 '研究状态'，那正是本判据要拒绝的近似形态）
  if (spanText.length === 0 || spanText.length > TITLE_SPAN_CHARS) return false;
  return spanText === title;
}

/**
 * 页签是否真的打开了（正文来自 `[data-sidebar-right-tab]` 的文本，不来自会话正文）。
 * 只认「页签体在场」这一条：页签体文本可以是空占位（"本会话尚未绑定研究 run"也是合法面），
 * 内容断言归调用方（`--expect-face` / run-driver 的 verdict）。
 * @param {{tabBodies: string[]}} dom - 页面只读表。
 * @returns {boolean}
 */
export function statusPaneOpened({ tabBodies }) {
  return Array.isArray(tabBodies) && tabBodies.some((t) => typeof t === 'string' && t.length > 0);
}
