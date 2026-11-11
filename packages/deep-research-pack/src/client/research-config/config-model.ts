// config-model.ts — 研究配置页签的常量与详情态（从 ResearchConfigTab.tsx 拆出，2026-11-03 审计 P4）。
//
// 无 React：四字段执行面表、标本骨架、详情三态。组件负责读取/发送/渲染；这些是纯数据。
// 用户可见文案走折层字典（`keyOf` + `t`）——见 BUG-055 的数据面收口。
import type { LibrarySections } from '../../lib/library-fold.ts'
import { BUILTIN_PREFERENCES } from '../../lib/config-tables.ts'
import { translateZh, type PackTranslate } from '../../lib/i18n.ts'

/** 库文件路径（工作区根；格式正本 = research-brief skill「用户方法库」）。 */
export const LIBRARY_PATH = 'method-library.md'

/** question.md 读行上限：方法节在模板第 32–40 行，默认 40 行恰好卡边界（BUG-026 同族）——
 *  读方法节必须显式传足额 limit；question.md 之后还有 §Decisions，留足量。 */


/** 四字段的执行面（谁读它／在哪生效／管不到什么）——面向用户的诚实边界；证据 = 各 skill 与
 *  操作侧门禁，来源 = 方法配置总卡的执行面表（`_backlog/issues/2026-10-18-research-method-config-ux.md`）。
 *  文案键按字段分组（`execution{Who,Where,Cannot}{Source,Verify,Report,Limit}`）。 */
const EXECUTION_KEYS = {
  source: { who: 'executionWhoSource', where: 'executionWhereSource', cannot: 'executionCannotSource' },
  verify: { who: 'executionWhoVerify', where: 'executionWhereVerify', cannot: 'executionCannotVerify' },
  report: { who: 'executionWhoReport', where: 'executionWhereReport', cannot: 'executionCannotReport' },
  limit: { who: 'executionWhoLimit', where: 'executionWhereLimit', cannot: 'executionCannotLimit' },
} as const

export function fieldExecutionRowsOf(t: PackTranslate = translateZh): readonly { key: keyof LibrarySections; who: string; where: string; cannot: string }[] {
  return (Object.keys(EXECUTION_KEYS) as (keyof LibrarySections)[]).map((key) => ({
    key,
    who: t(EXECUTION_KEYS[key].who),
    where: t(EXECUTION_KEYS[key].where),
    cannot: t(EXECUTION_KEYS[key].cannot),
  }))
}

export const FIELD_EXECUTION_ROWS = fieldExecutionRowsOf()

/** 标本骨架的字典键（按内置打法名索引；名字本身是产品数据，不作翻译单元）。 */
const SPECIMEN_KEYS: Readonly<Record<string, 'specimenFactCheck' | 'specimenLandscape' | 'specimenClaimCheck' | 'specimenComparison' | 'specimenTimeline'>> = {
  // i18n-ignore: builtin method names are product data (index keys, not rendered by this module)
  事实核查: 'specimenFactCheck',
  领域地图: 'specimenLandscape',
  主张核查: 'specimenClaimCheck',
  方案比较: 'specimenComparison',
  时间线与信号: 'specimenTimeline',
}

function specimenLines(key: 'specimenFactCheck' | 'specimenLandscape' | 'specimenClaimCheck' | 'specimenComparison' | 'specimenTimeline' | 'specimenFallback', t: PackTranslate): readonly string[] {
  return t(key).split('\n')
}

/** 标本位·内联输出骨架（R7 = ①＋③ 的 ③）：三行示意这条打法产出长什么样；任何工作区都能看
 *  （部署侧没有 archive/，① 的真标本在无 run 时为空态）。 */
export function specimenSkeletonsOf(t: PackTranslate = translateZh): Record<string, readonly string[]> {
  return Object.fromEntries(BUILTIN_PREFERENCES.map((entry) => {
    const key = SPECIMEN_KEYS[entry.name] ?? 'specimenFallback'
    return [entry.name, specimenLines(key, t)]
  }))
}

export const SPECIMEN_SKELETONS: Record<string, readonly string[]> = specimenSkeletonsOf()

/** 库条目的通用骨架（非内置打法时用）。 */
export const SPECIMEN_SKELETON_FALLBACK: readonly string[] = specimenLines('specimenFallback', translateZh)


/** 详情三态（读态携 legacyText：纯旧格式条目单块渲染、混居条目四分区外追加；编辑态 legacy = 旧正文草稿，null = 源条目无旧正文——BUG-025）。 */
export type DetailState =
  | { readonly mode: 'read'; readonly kind: 'builtin' | 'library'; readonly name: string; readonly sections: LibrarySections; readonly provenance: string | null; readonly isDefault: boolean; readonly legacyText: string | null }
  | { readonly mode: 'edit'; readonly name: string; readonly sections: LibrarySections; readonly legacy: string | null }
  | { readonly mode: 'create'; readonly sourceName: string; readonly drafts: { name: string } & LibrarySections }
