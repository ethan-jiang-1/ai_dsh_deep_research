/**
 * rerun-triage.ts — 「还不满意？三种改法」只读文案（单一正本）。
 *
 * 为什么存在（issue 2026-10-23-rerun-dissatisfaction-triage）：交付后用户想改，却只有我们的词
 * （补研究/修订表述），没有入口告诉他「还能怎么改、各自什么代价」。本模块把三行用户语言 +
 * 后果 + 一句可复制的话收成一个常量，状态页 ⑤ 与终稿页脚共用——两处各抄一份必然漂移。
 *
 * 边界：观察面只读（D18）——这里只有**话术**，不含按钮、不带动作 API（rerun 仍由用户把这句话
 * 发给 Lead 触发）。纯函数/常量，keyless 单测面。
 */

/** 一行改法：用户语言 + 后果 + 可复制的一句话。 */
export interface TriageRow {
  /** 手段名（用户语言，不是我们的三词）。 */
  readonly label: string
  /** 代价与版本后果（用户最关心的一句话）。 */
  readonly consequence: string
  /** 可复制的一句话（用户照抄发给 Lead 即触发对应手段）。 */
  readonly copy: string
}

/** 折叠块标题（两处共用，改文案只改这里）。 */
export const RERUN_TRIAGE_TITLE = '还不满意？三种改法'

/** 折叠块脚注（告诉用户怎么用这句话）。 */
export const RERUN_TRIAGE_HINT = '照抄一句发给我即可；三种改法的代价写在每行后面。'

/** 三种改法（顺序 = 推荐尝试顺序：先补证据，再改表达，最后才是重做）。 */
export const RERUN_TRIAGE_ROWS: readonly TriageRow[] = [
  {
    label: '补研究',
    consequence: '按报告末节补证据，出新版本（vN+1）；已有结论与旧版本不变',
    copy: '这份太浅，按报告末节的第 1 条补一轮，出新版本',
  },
  {
    label: '改说法',
    consequence: '只改措辞与结构，版本不变、不用重跑',
    copy: '这份太长，帮我改说法，版本不用变',
  },
  {
    label: '另起一个 bundle',
    consequence: '方向变了就重做一份，旧报告原样保留（成本≈一场新 run）',
    copy: '方向不对，另起一个 bundle 重做，旧报告保留',
  },
]

/**
 * 折叠块的纯文本行（测试与 client-load 冒烟共用；渲染组件按行画，不另拼文案）。
 * @param rows 默认三行正本；注入仅用于测试。
 */
export function triageFoldLines(rows: readonly TriageRow[] = RERUN_TRIAGE_ROWS): string[] {
  return [
    RERUN_TRIAGE_TITLE,
    ...rows.map((row) => `${row.label}：${row.consequence}｜「${row.copy}」`),
    RERUN_TRIAGE_HINT,
  ]
}
