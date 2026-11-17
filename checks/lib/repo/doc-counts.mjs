// doc-counts.mjs — live 文档「资产计数」名词闭集的唯一正本（count-free 判据面）。
//
// 为什么单独成件：词表就是判据面——旧实现把四个名词写死在门禁里，「案例」（本仓增长最快的资产
// 计数）不在其中，于是换一个名词就静默逃检（BUG-214）。名词表在这里登记、由测试钉住正/负样本，
// 门禁只消费本模块；新增资产计数名词 = 同一处加词 + 同 diff 补测试，不在别处补正则。
//
// 只认阿拉伯数字 +（可选量词）+ 名词；中文数字与枚举不检（语义面归 docs-consistency 契约）。
export const COUNT_NOUNS = Object.freeze(['注入案例', '案例', '门禁', 'tests', '断言', '条源面'])

/** 文本里的硬计数 token（[{ index, match }]）；index 用于消费方算行号。 */
export function countFraudTokens(text) {
  // 长名词先于短名词（`注入案例` 在 `案例` 前），否则只吃到后缀。
  const pattern = new RegExp(`(?<![A-Za-z0-9])[0-9]+ ?(?:个|条|道)? ?(?:${COUNT_NOUNS.join('|')})`, 'g')
  return [...String(text ?? '').matchAll(pattern)].map((m) => ({ index: m.index, match: m[0] }))
}
