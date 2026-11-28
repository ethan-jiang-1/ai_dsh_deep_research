// styles.ts — 驾驶舱注入的两段页面级样式（从 client/index.ts 拆出，2026-11-03 审计 P4）。
//
// 所有权标在 <html data-dsh-deep-research>：每段规则都以它为前缀（2026-11-03 G-12），
// 卸载时随 refcount 归零移除——此前是无标记的裸 <style>，跨插件归属不可见、卸载后残留
// 选择器仍在页面上生效。作用域仍是"整页匹配 vendor 稳定钩子"（问卡/方法库不在本插件容器内，
// 没有更近的共同祖先）；fail-soft：vendor 删钩子时规则只是不再命中。
// 移除条件：vendor 卡头自带换行/最小宽后移除。

const MARKER = 'data-dsh-deep-research'
let installed = 0

function acquire(): void {
  if (installed === 0) document.documentElement.setAttribute(MARKER, '')
  installed += 1
}

function release(): void {
  installed = Math.max(0, installed - 1)
  if (installed === 0) document.documentElement.removeAttribute(MARKER)
}

/** 问卡窄列修复：右栏展开后标题不塌成一字一行（2026-10-21 实测）。 */
export function installQuestionCardNarrowFix(): () => void {
  const style = document.createElement('style')
  style.setAttribute(MARKER, 'question-card-narrow')
  style.textContent = [
    `html[${MARKER}] [data-question-key] header{flex-wrap:wrap;row-gap:6px}`,
    `html[${MARKER}] [data-question-key] header>div:first-child{flex:1 1 14em}`,
  ].join('\n')
  acquire()
  document.head.appendChild(style)
  return () => { style.remove(); release() }
}

/** 方法编辑 portal 样式：在方法编辑会话内隐藏模型思考预览与 skill 工具行，保持问答聚焦。 */
export function installMethodCoachPortalStyles(): () => void {
  const style = document.createElement('style')
  style.setAttribute(MARKER, 'method-coach-portal')
  style.textContent = [
    `html[${MARKER}] [data-method-coach-portal] [data-preview]{display:none !important}`,
    `html[${MARKER}] [data-method-coach-portal] [data-tool="skill"]{display:none !important}`,
  ].join('\n')
  acquire()
  document.head.appendChild(style)
  return () => { style.remove(); release() }
}

/** 方法库条目行的状态样式（hover / 焦点环 / 过渡）。选中视觉住 `libraryRowStyle`（inline）；
 *  焦点环画在行外圈、与选中态分开——"焦点 = 选中"的误读是 BUG-047 的另一半现场。 */
export function installMethodLibrarySelectionStyles(): () => void {
  const style = document.createElement('style')
  style.setAttribute(MARKER, 'method-library-row-states')
  style.textContent = [
    `html[${MARKER}] [data-method-library-row]{background:transparent;transition:background-color .12s ease,border-color .12s ease}`,
    `html[${MARKER}] [data-method-library-row]:not([aria-current="true"]):hover{background:var(--dsw-alias-interactive-bg-hover)}`,
    `html[${MARKER}] [data-method-library-row]:focus-visible{outline:2px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, transparent);outline-offset:2px}`,
    `html[${MARKER}] [data-method-library-row]:focus:not(:focus-visible){outline:none}`,
  ].join('\n')
  acquire()
  document.head.appendChild(style)
  return () => { style.remove(); release() }
}
