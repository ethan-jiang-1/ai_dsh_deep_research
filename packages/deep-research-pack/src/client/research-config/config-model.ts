// config-model.ts — 研究配置页签的常量与详情态（从 ResearchConfigTab.tsx 拆出，2026-11-03 审计 P4）。
//
// 无 React：四字段执行面表、标本骨架、详情三态。组件负责读取/发送/渲染；这些是纯数据。
import type { LibrarySections } from '../../lib/library-fold.ts'

/** 库文件路径（工作区根；格式正本 = research-brief skill「用户方法库」）。 */
export const LIBRARY_PATH = 'method-library.md'

/** question.md 读行上限：方法节在模板第 32–40 行，默认 40 行恰好卡边界（BUG-026 同族）——
 *  读方法节必须显式传足额 limit；question.md 之后还有 §Decisions，留足量。 */


/** 四字段的执行面（谁读它／在哪生效／管不到什么）——面向用户的诚实边界；证据 = 各 skill 与
 *  操作侧门禁，来源 = 方法配置总卡的执行面表（`_backlog/issues/2026-10-18-research-method-config-ux.md`）。 */
export const FIELD_EXECUTION_ROWS: readonly { key: keyof LibrarySections; who: string; where: string; cannot: string }[] = [
  {
    key: 'source',
    who: 'scout（检索器对账、query 三轮）＋ analyst（采信分级）',
    where: '派工五件⑤ 的方法论装载 ＋ leads.md 的「单检索器——待破」行',
    cannot: '不是域名硬过滤（检索本身没有这个能力）；也不改手册里的信源分级判据表本体',
  },
  {
    key: 'verify',
    who: 'analyst（摘录口径至少两项）＋ critic（独立重抓、反例搜索）',
    where: 'evidence 卡的口径契约 ＋ review.md 的方法承诺核查',
    cannot: '不新增机械门；node-gate 与 evidence-audit 都不检查方法承诺；「≥2 独立信源」是底线不是可调项',
  },
  {
    key: 'report',
    who: 'lead（synthesis 综合写作）',
    where: 'final.md 首屏在两种已文档化骨架之间选（六段／快速缩略）＋ 正文组织方式',
    cannot: '换不了第三种首屏形态（表格／时间线／矩阵）——正文用时间线合法，首屏换时间线不合法',
  },
  {
    key: 'limit',
    who: 'critic ＋ 最终报告的交付限制节',
    where: 'review.md 检查点 ＋ 报告里的「目前不能判断」',
    cannot: '不被任何机械门把守——只能靠 critic 与你的复查把它当真',
  },
]

/** 标本位·内联输出骨架（R7 = ①＋③ 的 ③）：三行示意这条打法产出长什么样；任何工作区都能看
 *  （部署侧没有 archive/，① 的真标本在无 run 时为空态）。 */
export const SPECIMEN_SKELETONS: Record<string, readonly string[]> = {
  事实核查: ['答案（对象／时点／口径三件齐）', '依据：来源链 ＋ 口径说明', '限制：单源或未覆盖处显式'],
  领域地图: ['分节定位：谁在做什么', '关系与阵营 ＋ 时效边界', '盲点清单（未覆盖 ≠ 不存在）'],
  主张核查: ['判定四态之一（成立／部分／不成立／证据不足）', '证据强度分级', '最强反证单列'],
  方案比较: ['维度化对比表（同口径）', '适用情境 ＋ 取舍说明', '未公开项显式列出'],
  时间线与信号: ['时间线（节点＋日期＋官方出处）', '现状截点 ＋ 指标读数表', '趋势判断（显式标「判断」）＋ 覆盖边界'],
}
/** 库条目的通用骨架（非内置打法时用）。 */
export const SPECIMEN_SKELETON_FALLBACK: readonly string[] = ['结论 ＋ 每条附来源链', '证据强度与口径说明', '限制、缺口与「目前不能判断」']


/** 详情三态（读态携 legacyText：纯旧格式条目单块渲染、混居条目四分区外追加；编辑态 legacy = 旧正文草稿，null = 源条目无旧正文——BUG-025）。 */
export type DetailState =
  | { readonly mode: 'read'; readonly kind: 'builtin' | 'library'; readonly name: string; readonly sections: LibrarySections; readonly provenance: string | null; readonly isDefault: boolean; readonly legacyText: string | null }
  | { readonly mode: 'edit'; readonly name: string; readonly sections: LibrarySections; readonly legacy: string | null }
  | { readonly mode: 'create'; readonly sourceName: string; readonly drafts: { name: string } & LibrarySections }
