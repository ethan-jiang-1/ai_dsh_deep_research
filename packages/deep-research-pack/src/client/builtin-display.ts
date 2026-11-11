// builtin-display.ts — 内置打法内容的**显示投影层**（BUG-069）。
//
// 为什么存在：`src/lib/config-tables.ts` 的名称/摘要/四字段同时是 canonical 标识（库条目、
// 指令载荷、skill 表、判型映射的键），不能翻译；但 UI 直接渲染它时，英文界面会露出中文产品
// 内容（方法库列表/详情/来源选择、研究配置卡片/菜单/详情/推荐规则/领域示范）。
//
// 分层合同：
//   · 本文件只给**显示**用：以 canonical 名称为键，取当前 locale 的显示副本；canonical 数据
//     与所有动作/持久化/模型面（`instructionOf` / `createInstruction` / `editInstruction` /
//     `renderLibraryEntry` / 库写入 / `coach-prompts` / Lead 指令载荷）继续用 config-tables 原文；
//   · canonical `name` 仍是列表 key / `selectedName` / 查找键——显示名只进 JSX；
//   · 未登记的名称**fail-soft**：名称原样返回、sections 返回 null、调用方回退 canonical；
//   · zh 值必须逐字等于 canonical（tests/cockpit/builtin-display.test.mjs 对钉，防显示层漂移）。
import { BUILTIN_PREFERENCES, PATTERN_METHOD_RULES } from '../lib/config-tables.ts'
import type { LibrarySections } from '../lib/library-fold.ts'
import { translateZh, type PackTranslate } from '../lib/i18n.ts'
import type { DeepResearchPackLocaleKey } from './locales.ts'

type SectionKey = keyof LibrarySections

interface BuiltinDisplayKeys {
  readonly name: DeepResearchPackLocaleKey
  readonly summary: DeepResearchPackLocaleKey
  readonly sections: Readonly<Record<SectionKey, DeepResearchPackLocaleKey>>
}

/** 五个内置打法的显示键（键 = canonical 名称；值 = locales/zh.ts 与 en.ts 的键）。 */
const BUILTIN_DISPLAY_KEYS: Readonly<Record<string, BuiltinDisplayKeys>> = {
  // i18n-ignore: canonical builtin names are lookup keys (display copy lives in locales)
  事实核查: {
    name: 'builtinFactCheckName',
    summary: 'builtinFactCheckSummary',
    sections: {
      source: 'builtinFactCheckSource',
      verify: 'builtinFactCheckVerify',
      report: 'builtinFactCheckReport',
      limit: 'builtinFactCheckLimit',
    },
  },
  // i18n-ignore: canonical builtin names are lookup keys (display copy lives in locales)
  领域地图: {
    name: 'builtinLandscapeName',
    summary: 'builtinLandscapeSummary',
    sections: {
      source: 'builtinLandscapeSource',
      verify: 'builtinLandscapeVerify',
      report: 'builtinLandscapeReport',
      limit: 'builtinLandscapeLimit',
    },
  },
  // i18n-ignore: canonical builtin names are lookup keys (display copy lives in locales)
  主张核查: {
    name: 'builtinClaimCheckName',
    summary: 'builtinClaimCheckSummary',
    sections: {
      source: 'builtinClaimCheckSource',
      verify: 'builtinClaimCheckVerify',
      report: 'builtinClaimCheckReport',
      limit: 'builtinClaimCheckLimit',
    },
  },
  // i18n-ignore: canonical builtin names are lookup keys (display copy lives in locales)
  方案比较: {
    name: 'builtinComparisonName',
    summary: 'builtinComparisonSummary',
    sections: {
      source: 'builtinComparisonSource',
      verify: 'builtinComparisonVerify',
      report: 'builtinComparisonReport',
      limit: 'builtinComparisonLimit',
    },
  },
  // i18n-ignore: canonical builtin names are lookup keys (display copy lives in locales)
  时间线与信号: {
    name: 'builtinTimelineName',
    summary: 'builtinTimelineSummary',
    sections: {
      source: 'builtinTimelineSource',
      verify: 'builtinTimelineVerify',
      report: 'builtinTimelineReport',
      limit: 'builtinTimelineLimit',
    },
  },
}

/** 判型推荐规则的显示键（键 = canonical 打法名；值是整行判型标签的译文）。 */
const PATTERN_DISPLAY_KEYS: Readonly<Record<string, DeepResearchPackLocaleKey>> = {
  // i18n-ignore: canonical builtin names are lookup keys (display copy lives in locales)
  事实核查: 'builtinPatternFactCheck',
  // i18n-ignore: canonical builtin names are lookup keys (display copy lives in locales)
  领域地图: 'builtinPatternLandscape',
  // i18n-ignore: canonical builtin names are lookup keys (display copy lives in locales)
  主张核查: 'builtinPatternClaimCheck',
  // i18n-ignore: canonical builtin names are lookup keys (display copy lives in locales)
  方案比较: 'builtinPatternComparison',
  // i18n-ignore: canonical builtin names are lookup keys (display copy lives in locales)
  时间线与信号: 'builtinPatternTimeline',
}

/** 领域示范的显示键（canonical 名称/四字段在 config-tables.DEMO_ENTRY）。 */
const DEMO_DISPLAY_KEYS = {
  name: 'builtinDemoName',
  sections: {
    source: 'builtinDemoSource',
    verify: 'builtinDemoVerify',
    report: 'builtinDemoReport',
    limit: 'builtinDemoLimit',
  },
} as const satisfies { readonly name: DeepResearchPackLocaleKey; readonly sections: Readonly<Record<SectionKey, DeepResearchPackLocaleKey>> }

/** 可投影的条目形状（内置偏好与来源选择里的只读条目都满足）。 */
export interface DisplayableBuiltin {
  readonly name: string
  readonly summary?: string | null
  readonly sections: LibrarySections
}

/** 显示名：登记过的内置名 → 当前 locale；未知名 → 原样返回（fail-soft）。 */
export function displayNameOf(name: string, t: PackTranslate = translateZh): string {
  const keys = BUILTIN_DISPLAY_KEYS[name]
  return keys === undefined ? name : t(keys.name)
}

/** 摘要：登记过的内置名 → 当前 locale；未知内置 → canonical 摘要；完全未知名 → fallback。 */
export function displaySummaryOf(name: string, t: PackTranslate = translateZh, fallback = ''): string {
  const keys = BUILTIN_DISPLAY_KEYS[name]
  if (keys !== undefined) return t(keys.summary)
  return BUILTIN_PREFERENCES.find((entry) => entry.name === name)?.summary ?? fallback
}

/** 四字段：登记过的内置名 → 当前 locale；未知名 → null（调用方回退 canonical sections）。 */
export function displaySectionsOf(name: string, t: PackTranslate = translateZh): LibrarySections | null {
  const keys = BUILTIN_DISPLAY_KEYS[name]
  if (keys === undefined) return null
  return {
    source: t(keys.sections.source),
    verify: t(keys.sections.verify),
    report: t(keys.sections.report),
    limit: t(keys.sections.limit),
  }
}

/** 整条内置条目的显示投影；未登记条目回退自身 canonical 值（不丢内容、不抛错）。 */
export function displayBuiltinOf(entry: DisplayableBuiltin, t: PackTranslate = translateZh): { readonly name: string; readonly summary: string; readonly sections: LibrarySections } {
  return {
    name: displayNameOf(entry.name, t),
    summary: displaySummaryOf(entry.name, t, entry.summary ?? ''),
    sections: displaySectionsOf(entry.name, t) ?? entry.sections,
  }
}

/** 判型推荐规则（「什么时候用它」/「什么时候会推荐它」/推荐规则说明位）：登记过的打法 → 译文；
 *  未登记 → canonical 映射（按 method 过滤后以 ` · ` 连接，与 config-tables 同形）。 */
export function displayPatternsOf(method: string, t: PackTranslate = translateZh): string {
  const key = PATTERN_DISPLAY_KEYS[method]
  if (key !== undefined) return t(key)
  return PATTERN_METHOD_RULES.filter((rule) => rule.method === method).map((rule) => rule.patterns).join(' · ')
}

/** 领域示范（厚条目）的显示投影；canonical 仍住 config-tables.DEMO_ENTRY。 */
export function displayDemoOf(t: PackTranslate = translateZh): { readonly name: string; readonly sections: LibrarySections } {
  return {
    name: t(DEMO_DISPLAY_KEYS.name),
    sections: {
      source: t(DEMO_DISPLAY_KEYS.sections.source),
      verify: t(DEMO_DISPLAY_KEYS.sections.verify),
      report: t(DEMO_DISPLAY_KEYS.sections.report),
      limit: t(DEMO_DISPLAY_KEYS.sections.limit),
    },
  }
}
