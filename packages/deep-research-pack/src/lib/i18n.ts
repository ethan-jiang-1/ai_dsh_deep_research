/**
 * i18n.ts —— 数据面（fold 层）生成 UI 文案的**翻译桥**。
 *
 * 为什么住 lib：七步标签、业务摘要、图谱状态词等文案由纯折算生成（`run-fold` / `brief-fold` /
 * `graph-model` …），组件只画。让这些函数**接受**翻译器（`t`）而不是自己写死中文字面量，英文
 * locale 下才不会在数据面留下中文（BUG-055 残留清单）。字典本身仍住 `client/locales/`（UI 文案
 * 唯一正本）；本文件只做类型与缺省插值。
 *
 * 缺省翻译器 = zh：非 UI 消费面（run-dashboard HTML 投影、冒烟脚本、keyless 测试）不传 `t` 时
 * 保持中文优先（2026-11-03 用户拍板）——**UI 组件必须传 `props.t`**，由
 * `tests/cockpit/locales-data.test.mjs` 的 en 断言与 `locales.test.mjs` 的渲染断言把守。
 *
 * 依赖方向说明：`client/locales/zh.ts` 是纯数据（无 import）；lib → client 的这条边只有本文件
 * 与类型面，运行时只把字典读进来，不引入 React/浏览器依赖。
 */
import type { DeepResearchPackLocaleKey } from '../client/locales/zh.ts'
import { zh } from '../client/locales/zh.ts'

/** 折层可用的翻译器（与 DSH `TranslateNS<'deepResearchPack'>` 结构兼容；参数值为 unknown）。 */
export type PackTranslate = (key: DeepResearchPackLocaleKey, params?: Record<string, unknown>) => string

/** 与 DSH translate 同形的占位符插值；缺参原样留 `{k}`（便于对账漏参）。 */
export function interpolate(template: string, params?: Record<string, unknown>): string {
  if (params === undefined) return template
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (all, name: string) => (name in params ? String(params[name]) : all))
}

/** 缺省翻译器 = 中文（非 UI 消费面用；UI 必须显式传 `props.t`）。 */
export const translateZh: PackTranslate = (key, params) => interpolate(zh[key], params)
