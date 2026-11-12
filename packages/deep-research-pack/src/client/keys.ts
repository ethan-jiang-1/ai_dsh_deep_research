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

/** 「研究图谱」页签（plan/依赖/worker/attention 观察面）：同槽第三 key。 */
export const RESEARCH_GRAPH_TAB_KEY = 'dsh-deep-research-pack/research-graph'

/** 「研究图谱」页签的 kind（openTab 用）。 */
export const RESEARCH_GRAPH_TAB_KIND = 'research-graph'

/** 「终稿」页签：接管 `drt_<slug>/final.md` 文件地址的页签类型 id（= 槽体 key）。 */
export const RESEARCH_FINAL_TAB_KEY = 'dsh-deep-research-pack/research-final'

/** 「终稿」页签的 kind（页签类型 discriminator；注册与路由同值）。 */
export const RESEARCH_FINAL_KIND = 'research-final'

// 认领范围 = basename 宽匹配 + `canOpen` 收窄到终稿族（三位置 + final/vN + readable*）。
//
// 为什么只写无分隔符的 glob（2026-11-03 实测）：vendor `tab-registry` 对**不含 `:`** 的
// pattern 一律用 `picomatch(..., { basename: true })` 编译——它拿地址的 basename 去匹配，
// 所以 `**/final/v*.md` / `final/v*.md` 这类带分隔符的写法**永远不命中**（basename 里没有
// `/`），终稿页签因此从不参与认领，点「读终稿」落到 vendor 文档预览（页签标题变 `v1.md`）。
// 精确性由 `canOpen: isFinalAddress` 承担；pattern 只负责进入候选。
export const RESEARCH_FINAL_PATTERN = 'final.md'
export const RESEARCH_FINAL_PATTERN_LEDGER = 'v*.md'
export const RESEARCH_FINAL_PATTERN_READER = 'readable*.md'

/** 「研究状态」页签的 keyed 槽名（sidebar.right.pane.tab）。 */
export const RESEARCH_PANE_SLOT = 'sidebar.right.pane.tab'

/** 「研究状态」页签的**活标题**槽名（挂起时变"研究状态 · ⏳ 等你拍板"）。 */
export const RESEARCH_TITLE_SLOT = 'sidebar.right.pane.tab.title'

/** 品牌标槽（宿主 ui-sidebar 声明；虎鲸标的落点）。 */
export const RESEARCH_BRAND_MARK_SLOT = 'sidebar.brand.mark'

/** 品牌名槽（宿主 ui-sidebar 声明；Orca 名的落点——与 mark 槽并列的 single slot）。 */
export const RESEARCH_BRAND_NAME_SLOT = 'sidebar.brand.name'

/** 产品首屏起步卡的 dock 槽名（conversation.input.dock；D38）。 */
export const RESEARCH_START_DOCK_SLOT = 'conversation.input.dock'

/** 项目研究默认的 composer 左侧按钮槽（conversation.input.left；D50）。 */
export const RESEARCH_DEFAULTS_SLOT = 'conversation.input.left'

/** 项目研究默认按钮的 entry id（同一槽内的稳定身份）。 */
export const RESEARCH_DEFAULTS_BUTTON_ID = 'deep-research-defaults'

/** 研究语义工具卡的 keyed 槽名（tool.call.toolview；key = wire 工具名，见 ResearchToolCard）。 */
export const RESEARCH_TOOLVIEW_SLOT = 'tool.call.toolview'

/** 研究语义工具卡的 wire 工具名族（toolview 槽的 keyed key——必须与 wire 注册名逐字一致，
 *  拼错不报错、永不渲染）。族正本住这里（审计 P3 件①收口：曾住 ResearchToolCard.tsx，
 *  门禁 client-keys 规则③④⑤把守单一正本）。新增研究语义工具卡时在族尾追加 wire 名。 */
export const RESEARCH_TOOL_KEYS = ['spawn_teammate', 'web_search'] as const

/** 主界面「方法库」tab 的 conversation.view 槽名（Chat/Trajectory 同排）。 */
export const METHOD_LIBRARY_VIEW = 'conversation.view' as const

/** 方法编辑对话：根级 portal 宿主座位（shell.overlay；会话树在 main 之外，DOM teleport 进页内右栏）。 */
export const METHOD_COACH_PORTAL = 'shell.overlay'

/** 方法编辑 portal 的 entry id。 */
export const METHOD_COACH_PORTAL_ID = 'deep-research-pack/method-coach-portal'

/** 方法编辑 portal 目标格内的私有 session 子槽。 */
export const METHOD_COACH_CHAT = 'method.coach.chat'

/** 方法库写库工具的 wire 名（toolview 卡 key 与 host 工具名逐字一致）。 */
export const METHOD_LIBRARY_TOOL = 'method_library_upsert'

/** 方法库删库工具的 wire 名（toolview 卡 key 与 host 工具名逐字一致）。 */
export const METHOD_LIBRARY_REMOVE = 'method_library_remove'

/** 方法库默认操作工具的 wire 名（toolview 卡 key 与 host 工具名逐字一致）。 */
export const METHOD_LIBRARY_DEFAULT = 'method_library_set_default'
