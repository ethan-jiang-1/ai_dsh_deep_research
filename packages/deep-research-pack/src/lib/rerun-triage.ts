/**
 * rerun-triage.ts — 「还不满意？三种改法」只读文案（单一正本）。
 *
 * 为什么存在（issue 2026-10-23-rerun-dissatisfaction-triage）：交付后用户想改，却只有我们的词
 * （补研究/修订表述），没有入口告诉他「还能怎么改、各自什么代价」。本模块把三行用户语言 +
 * 后果 + 一句可复制的话收成一个常量，状态页 ⑤ 与终稿页脚共用——两处各抄一份必然漂移。
 *
 * 边界：观察面只读（D18）——这里只有**话术**，不含按钮、不带动作 API（rerun 仍由用户把这句话
 * 发给 Lead 触发）。纯函数/常量，keyless 单测面。
 *
 * 文案走折层字典（`zh-fold` / `en-fold`）：中文常量保留给非 UI 消费面；UI 组件用
 * `rerunTriageRowsOf(props.t)` 取当前语言。
 */
import { translateZh, type PackTranslate } from './i18n.ts'

/** 一行改法：用户语言 + 后果 + 可复制的一句话。 */
interface TriageRow {
  /** 手段名（用户语言，不是我们的三词）。 */
  readonly label: string
  /** 代价与版本后果（用户最关心的一句话）。 */
  readonly consequence: string
  /** 可复制的一句话（用户照抄发给 Lead 即触发对应手段）。 */
  readonly copy: string
}

/** 折叠块标题（两处共用，改文案只改这里）。 */
export const RERUN_TRIAGE_TITLE = translateZh('triageTitle')

/** 折叠块脚注（告诉用户怎么用这句话）。 */
export const RERUN_TRIAGE_HINT = translateZh('triageHint')

/** 三种改法（顺序 = 推荐尝试顺序：先补证据，再改表达，最后才是重做）。 */
export const RERUN_TRIAGE_ROWS: readonly TriageRow[] = [
  {
    label: translateZh('triageMoreLabel'),
    consequence: translateZh('triageMoreConsequence'),
    copy: translateZh('triageMoreCopy'),
  },
  {
    label: translateZh('triageRewriteLabel'),
    consequence: translateZh('triageRewriteConsequence'),
    copy: translateZh('triageRewriteCopy'),
  },
  {
    label: translateZh('triageRestartLabel'),
    consequence: translateZh('triageRestartConsequence'),
    copy: translateZh('triageRestartCopy'),
  },
]

/** 当前语言的三行（UI 组件用）。 */
export function rerunTriageRowsOf(t: PackTranslate = translateZh): readonly TriageRow[] {
  return [
    {
      label: t('triageMoreLabel'),
      consequence: t('triageMoreConsequence'),
      copy: t('triageMoreCopy'),
    },
    {
      label: t('triageRewriteLabel'),
      consequence: t('triageRewriteConsequence'),
      copy: t('triageRewriteCopy'),
    },
    {
      label: t('triageRestartLabel'),
      consequence: t('triageRestartConsequence'),
      copy: t('triageRestartCopy'),
    },
  ]
}

/**
 * 折叠块的纯文本行（测试与 client-load 冒烟共用；渲染组件按行画，不另拼文案）。
 * @param rows 默认三行正本；注入仅用于测试。
 */
export function triageFoldLines(rows: readonly TriageRow[] = RERUN_TRIAGE_ROWS): string[] {
  return [
    translateZh('triageTitle'),
    ...rows.map((row) => `${row.label}：${row.consequence}｜「${row.copy}」`),
    translateZh('triageHint'),
  ]
}
