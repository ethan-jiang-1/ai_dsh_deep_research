/**
 * client/defaults/labels — 项目默认 id → 字典 key 的显示投影（按钮/面板共用）。
 * canonical id 仍住 `src/lib/research-defaults.ts`；这里只做 UI 取词，不翻译数据。
 */
import type { Authority, EffortBand, OutputShape, Recency, SourceFamily } from '../../lib/research-defaults.ts'

export const DEPTH_LABEL: Readonly<Record<EffortBand, 'defaultsDepthQuick' | 'defaultsDepthStandard' | 'defaultsDepthDeep'>> = {
  quick: 'defaultsDepthQuick',
  standard: 'defaultsDepthStandard',
  deep: 'defaultsDepthDeep',
}

export const SHAPE_LABEL: Readonly<Record<OutputShape, 'defaultsShapeQuickAnswer' | 'defaultsShapeFullReport' | 'defaultsShapeOnePageMemo' | 'defaultsShapeComparisonTable' | 'defaultsShapeTimeline' | 'defaultsShapeLandscapeMap'>> = {
  quick_answer: 'defaultsShapeQuickAnswer',
  full_report: 'defaultsShapeFullReport',
  one_page_memo: 'defaultsShapeOnePageMemo',
  comparison_table: 'defaultsShapeComparisonTable',
  timeline: 'defaultsShapeTimeline',
  landscape_map: 'defaultsShapeLandscapeMap',
}

export const FAMILY_LABEL: Readonly<Record<SourceFamily, 'defaultsFamilyOfficial' | 'defaultsFamilyWeb' | 'defaultsFamilyAcademic' | 'defaultsFamilyRegulatory' | 'defaultsFamilyPractitioner' | 'defaultsFamilyLocal'>> = {
  official: 'defaultsFamilyOfficial',
  web: 'defaultsFamilyWeb',
  academic: 'defaultsFamilyAcademic',
  regulatory: 'defaultsFamilyRegulatory',
  practitioner: 'defaultsFamilyPractitioner',
  local: 'defaultsFamilyLocal',
}

export const AUTHORITY_LABEL: Readonly<Record<Authority, 'defaultsAuthorityPrimary' | 'defaultsAuthoritySecondary' | 'defaultsAuthorityAny'>> = {
  primary: 'defaultsAuthorityPrimary',
  secondary: 'defaultsAuthoritySecondary',
  any: 'defaultsAuthorityAny',
}

export const RECENCY_LABEL: Readonly<Record<Recency, 'defaultsRecency6m' | 'defaultsRecency12m' | 'defaultsRecency24m' | 'defaultsRecencyAsOfCapture'>> = {
  '6m': 'defaultsRecency6m',
  '12m': 'defaultsRecency12m',
  '24m': 'defaultsRecency24m',
  'as-of-capture': 'defaultsRecencyAsOfCapture',
}
