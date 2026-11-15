/**
 * workspace-title.ts — 产品工作区标题的单一正本（client 过滤与 host 登记共用）。
 *
 * 为什么单独成件：client 用前缀 `startsWith` 过滤产品工作区，host 用同一字面拼登记标题；
 * 两半各写一份时，改文案会静默漏工作区（client 过滤不到、host 登记成普通标题）。
 */

/** Host 登记产品工作区时使用的标题前缀（两半都从这里取）。 */
export const PRODUCT_TITLE_PREFIX = 'Deep Research — '

/** 工作区标题：目录名 → `Deep Research — <name>`；无名 = `Deep Research`。 */
export function workspaceTitleFor(name: string | undefined): string {
  return name === undefined || name === '' ? 'Deep Research' : `${PRODUCT_TITLE_PREFIX}${name}`
}
