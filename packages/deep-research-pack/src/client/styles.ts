// styles.ts — 驾驶舱注入的两段页面级样式（从 client/index.ts 拆出，2026-11-03 审计 P4）。
//
// 所有权标在 <html data-dsh-deep-research>：每段规则都以它为前缀（2026-11-03 G-12），
// 卸载时随 refcount 归零移除——此前是无标记的裸 <style>，跨插件归属不可见、卸载后残留
// 选择器仍在页面上生效。作用域仍是"整页匹配 vendor 稳定钩子"（问卡/方法库不在本插件容器内，
// 没有更近的共同祖先）；fail-soft：vendor 删钩子时规则只是不再命中。
// 移除条件登记在 design/40 §已知限制与延后工作。

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

/** 方法库编辑态：隐藏外层 composer（只对外层问卡让位）、隐藏思考/skill 行、三栏各自滚动。 */
export function installCoachComposerStyles(): () => void {
  const style = document.createElement('style')
  style.setAttribute(MARKER, 'method-library-coach-composer')
  style.textContent = [
    `html[${MARKER}] [data-conversation-scroll]:has([data-method-library-edit]):not(:has(> [data-composer-seat] [data-question-key])) > [data-composer-seat]{display:none}`,
    /* 方法编辑只露一问一答：不显示模型思考行与 skill 工具行（"用户不困惑" #3/#8）。 */
    `html[${MARKER}] [data-method-coach-portal] [data-preview]{display:none !important}`,
    `html[${MARKER}] [data-method-coach-portal] [data-tool="skill"]{display:none !important}`,
    /* 三栏各自滚动：整页/view 不滚（page 填满 tab，列内滚动）。 */
    `html[${MARKER}] [data-method-library]{height:100%;overflow:hidden}`,
    `html[${MARKER}] [data-method-library] > div{min-height:0}`,
    `html[${MARKER}] [data-method-library] [data-method-coach-host]{min-height:0;overflow:hidden}`,
  ].join('\n')
  acquire()
  document.head.appendChild(style)
  return () => { style.remove(); release() }
}
