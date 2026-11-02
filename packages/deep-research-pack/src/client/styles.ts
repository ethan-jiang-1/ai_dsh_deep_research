// styles.ts — 驾驶舱注入的两段页面级样式（从 client/index.ts 拆出，2026-11-03 审计 P4）。
//
// 两段都只按 vendor 稳定钩子（data-question-key / data-method-library*）限定，fail-soft：
// vendor 删钩子时规则只是不再命中；移除条件登记在 design/40 §已知限制与延后工作。

/** 问卡窄列修复：右栏展开后标题不塌成一字一行（2026-10-21 实测）。 */
export function installQuestionCardNarrowFix(): () => void {
  const style = document.createElement('style')
  style.setAttribute('data-dsh-deep-research', 'question-card-narrow')
  style.textContent = [
    '[data-question-key] header{flex-wrap:wrap;row-gap:6px}',
    '[data-question-key] header>div:first-child{flex:1 1 14em}',
  ].join('\n')
  document.head.appendChild(style)
  return () => style.remove()
}

/** 方法库编辑态：隐藏外层 composer（只对外层问卡让位）、隐藏思考/skill 行、三栏各自滚动。 */
export function installCoachComposerStyles(): () => void {
  const style = document.createElement('style')
  style.setAttribute('data-dsh-deep-research', 'method-library-coach-composer')
  style.textContent = [
    '[data-conversation-scroll]:has([data-method-library-edit]):not(:has(> [data-composer-seat] [data-question-key])) > [data-composer-seat]{display:none}',
    /* 方法编辑只露一问一答：不显示模型思考行与 skill 工具行（"用户不困惑" #3/#8）。 */
    '[data-method-coach-portal] [data-preview]{display:none !important}',
    '[data-method-coach-portal] [data-tool="skill"]{display:none !important}',
    /* 三栏各自滚动：整页/view 不滚（page 填满 tab，列内滚动）。 */
    '[data-method-library]{height:100%;overflow:hidden}',
    '[data-method-library] > div{min-height:0}',
    '[data-method-library] [data-method-coach-host]{min-height:0;overflow:hidden}',
  ].join('\n')
  document.head.appendChild(style)
  return () => style.remove()
}
