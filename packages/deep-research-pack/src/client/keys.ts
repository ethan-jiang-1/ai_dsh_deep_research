/** 观察面 client 的 keyed 常量（唯一正本）。
 * 页签类型 id 与 keyed 槽体的 key **必须同值**（拼错任一处不报错、永不渲染——company 坑 1：
 * "a typo simply never renders"）。verify 门禁 client-keys 逐处对账：源里出现的每个 key
 * 字面量都必须等于这里的导出值，杜绝第二份会漂移的清单。 */

/** 「研究状态」页签：sidebarRightTabs.register 的 id 与 sidebar.right.pane.tab 槽的 key。 */
export const RESEARCH_TAB_KEY = 'dsh-deep-research-pack/research-status'

/** 「研究配置」页签（D25 管理中继面）：同槽第二 key。 */
export const RESEARCH_CONFIG_TAB_KEY = 'dsh-deep-research-pack/research-config'

/** 「研究状态」页签的 kind（openTab 用；同页签类型注册的 discriminator）。 */
export const RESEARCH_STATUS_TAB_KIND = 'research-status'

/** 「研究配置」页签的 kind（openTab 用）。 */
export const RESEARCH_CONFIG_TAB_KIND = 'research-config'

/** 「终稿」页签：接管 `drt_<slug>/final.md` 文件地址的页签类型 id（= 槽体 key）。 */
export const RESEARCH_FINAL_TAB_KEY = 'dsh-deep-research-pack/research-final'

/** 「终稿」页签的 kind（页签类型 discriminator；注册与路由同值）。 */
export const RESEARCH_FINAL_KIND = 'research-final'

/** 「终稿」认领的地址 glob（含分隔符 → 整路径匹配；认领范围另由 canOpen 收窄到三个位置）。 */
export const RESEARCH_FINAL_PATTERN = '**/final.md'

/** 「终稿」认领的地址 glob（无分隔符 → 按 basename 任意深度匹配，与上一行互补）。 */
export const RESEARCH_FINAL_PATTERN_ROOT = 'final.md'

/** 「研究状态」页签的 keyed 槽名（sidebar.right.pane.tab）。 */
export const RESEARCH_PANE_SLOT = 'sidebar.right.pane.tab'

/** 「研究状态」页签的**活标题**槽名（挂起时变"研究状态 · ⏳ 等你拍板"）。 */
export const RESEARCH_TITLE_SLOT = 'sidebar.right.pane.tab.title'

/** 品牌标槽（宿主 ui-sidebar 声明；虎鲸标的落点）。 */
export const RESEARCH_BRAND_MARK_SLOT = 'sidebar.brand.mark'

/** 品牌名槽（宿主 ui-sidebar 声明；Orca 名的落点——与 mark 槽并列的 single slot）。 */
export const RESEARCH_BRAND_NAME_SLOT = 'sidebar.brand.name'

/** 研究语义工具卡的 keyed 槽名（tool.call.toolview；key = wire 工具名，见 ResearchToolCard）。 */
export const RESEARCH_TOOLVIEW_SLOT = 'tool.call.toolview'

/** 研究语义工具卡的 wire 工具名族（toolview 槽的 keyed key——必须与 wire 注册名逐字一致，
 *  拼错不报错、永不渲染）。族正本住这里（审计 P3 件①收口：曾住 ResearchToolCard.tsx，
 *  门禁 client-keys 规则③④⑤把守单一正本）。新增研究语义工具卡时在族尾追加 wire 名。 */
export const RESEARCH_TOOL_KEYS = ['spawn_teammate', 'web_search'] as const
