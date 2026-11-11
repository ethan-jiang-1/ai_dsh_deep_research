// section-labels.ts — 四字段标签的 UI 取词（file-format 标签住 library-fold / config-tables；
// 页面按当前 locale 取词）。BUG-055 数据面收口：英文界面不再显示中文分区标签。
import type { LibrarySections } from '../../lib/library-fold.ts'
import type { PackTranslate } from '../../lib/i18n.ts'

const SECTION_LABEL_KEYS: Readonly<Record<keyof LibrarySections, 'sectionSource' | 'sectionVerify' | 'sectionReport' | 'sectionLimit'>> = {
  source: 'sectionSource',
  verify: 'sectionVerify',
  report: 'sectionReport',
  limit: 'sectionLimit',
}

/** 四字段标签（UI 用）；不在表内的 key 原样返回（防御）。 */
export function sectionLabelOf(t: PackTranslate, key: keyof LibrarySections): string {
  return t(SECTION_LABEL_KEYS[key])
}
