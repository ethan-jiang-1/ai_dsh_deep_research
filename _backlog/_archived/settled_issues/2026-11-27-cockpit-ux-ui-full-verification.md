---
status: 已结
opened: 2026-11-27
---

# 推敲：全量 UX/UI 端到端与异常态全面核查（发现即建 BUG 卡）

> 立卡：2026-11-27 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是
> 去向：implemented — [2026-11-27-cockpit-ux-ui-full-verification](../../../notes/implemented/2026-11-27-cockpit-ux-ui-full-verification.md)（业务验收 owner = 用户；2026-11-27 确认三轮核查闭环，Note 与归档同变更落盘）
> 前置依据：[2026-11-26-cockpit-ux-ui-native-upgrade](2026-11-26-cockpit-ux-ui-native-upgrade.md) · [40-research-cockpit](../../../docs/design/40-research-cockpit.md) · [guides/67 测试策略](../../../docs/guides/67-test-strategy.md)

**问题与期望结果：** 研究驾驶舱（Research Cockpit）刚完成“五态事实诚实性修复（BUG-340…434）”与“DSH 原生 UX/UI 全面升级（M1–M7）”，新增或重构了 10 余个交互面（首屏 Hero/模板、研究默认选单、顶栏进度胶囊、对话里程碑卡、4 类工具卡、状态步进轨/Protocol 卡/质量雷达、图谱缩略与边高亮、终稿三视图/TOC/Claim 核查/证据卡分屏溯源/续研预填、全局「研究工作台」Hub 等）。由于交互路径深、状态组合多，且用户对新版界面尚不熟悉，单靠人工手点必然遗漏边界与异常路径。本卡制定一份**零盲区、可自动化复跑 + 真人视角复核**的全量 UX/UI 核查计划：由 Agent 借助既有门禁、浏览器冒烟、CDP 探针、多主题/多视口截图巡检与真模型/合成夹具逐环过一遍；**每发现一处真实缺陷（视觉断裂、交互卡死、数据失真、串会话、错误吞没、布局溢出、翻译漏词、控制台报错等），直接按 [_backlog/bugs/README.md](../../bugs/README.md) 建独立 `BUG-NNN` 卡并留可复现命令与现场截图/日志，不静默放过或顺手掩盖**。

**当前情况：**
- M1–M7 代码与 L0 单测/门禁已在工作区就位，但现有 `tests/fixtures/client-load-home` 种子夹具尚未完整覆盖新引入的 `protocol.json`、`claims.json` / `verdicts-r*.json`、8 字段 `evidence/*.md`、终稿 `[来源: evidence/...]` 分屏引用、`## 下一版优先项` 续研预填，以及直播流（live `present` / `HITL` 自动弹栏 / `MemberActivity` / `ResearchMilestoneCard`）；
- 前期 `cockpit-truth` / `cockpit-artifact-truth` / `cockpit-truth-residuals` / `cockpit-truth-substance` / `cockpit-locale` 五条真浏览器入口覆盖了早期事实矩阵，但尚需与 M1–M7 新面合流验收并补齐明/暗双主题、多视口、键盘可达性与异常态覆盖；
- `tools/record/research.overlay.yml` 与未暂存新文件是否全链就绪也需在核查前一次性确认。

**未决问题：**
1. 本轮核查执行过程中发现的 P0/P1 缺陷，是**全部建卡汇总后统一由用户分诊定优先级，还是边查边修 P0 阻断**（默认纪律：先建卡留证，P0/触及入口链/公共行为等用户拍板或明确授权后再修，不擅自掩盖缺陷）。
2. 真模型档（L4 / `client-hitl.entry`）依赖当前环境 `DEEPSEEK_API_KEY` 与网络连通性；若环境受限，对应项必须诚实标 `NOT-RUN` 并用可控会话流重放补证边界。

**下一步：** 获得用户确认后，按 **Stage 0（环境与基线）→ Stage 1（既有全量机械与真浏览器回归）→ Stage 2（全界面与交互全路径 E2E 走查）→ Stage 3（视觉/主题/视口/无障碍/双语矩阵）→ Stage 4（新面 M3–M6 故障与边界注入）→ Stage 5（真模型活流与长程边界）→ Stage 6（缺陷建卡汇总与交付验收报告）** 顺序推进，全部结论与现场截图/日志收口后请用户拍板。

---

## 核查总原则（不可退让的纪律）

1. **真机真浏览器优先于静态推断**：JSDOM 通过不代表真实 DSH Web 壳里不遮挡、不溢出、不吞事件、CSS Modules 正确注入；能起真浏览器就必须在真实 `dsh` Web 进程上验。
2. **发现即建 BUG 卡（不藏、不洗绿）**：任何断言失败、视觉破损、控制台 `console.error` / `pageerror`、HTTP 失败、或与 [40-research-cockpit.md](../../../docs/design/40-research-cockpit.md) 合同不符的现象，一律在 `_backlog/bugs/` 建卡（写清复现命令、边界、截图/日志路径、预期 vs 实际），不改断言或放宽选择器凑绿。
3. **未跑 ≠ 通过**：主机不健康（`exit 2`）或无凭据/缺夹具 `SKIP` 必须显式记为 `NOT-RUN` / `SKIP` 并写明原因，绝不写进“已通过”。
4. **守住红线不越界**：不修改 `vendor/dsh/`；测试造数仅在隔离临时 home 或 `--seed` 沙箱，绝不污染仓内 `research-workspace/` 真实研究数据。

---

## 全量覆盖地图（按“用户旅程 × 界面面 × 状态维度”三轴对齐）

### Stage 0 · 构筑物与通道就绪预检（先排除假基线）

- **目标**：确保测到的代码 = 当前工作树最新产物，且覆盖 `vendor/dsh` 只读基线与安装面。
- **动作清单**：
  1. 核对当前未提交变更清单（含 staged / unstaged / untracked），确认 `tools/record/research.overlay.yml` 与 `render-overlay.mjs` 状态是否新鲜；
  2. 执行 `pnpm build && pnpm typecheck && pnpm lint && pnpm verify && pnpm test`（L0 全量门禁，含 `client-tokens` / `client-keys` / `client-effect-wrap` / `cockpit-doc-registry` / `cjk-source` / `locales` / `semantic-guardrails`）；
  3. 验证 `source tools/env.sh && DSH_SMOKE_REAL=1 node checks/smoke/preset.e2e.mjs`（L1 挂载）与 `node checks/smoke/product-boot.entry.mjs`（L2 首启）。
- **过关标准**：L0/L1/L2 全绿，无陈旧 `lib/client.js` 或 overlay 漂移；若本地缺原生 addon 等环境阻塞导致 `NOT-RUN`，记录准确报错并建卡或归因。

---

### Stage 1 · 既有浏览器门禁大盘点（已建 6 条真实浏览器入口全跑）

- **目标**：先用仓库已有的 6 条真浏览器 `.entry.mjs` 把老面 + 已接入的新面全量扫一遍，看是否有回归或被环境跳过。
- **动作清单**：
  1. `client-load.entry.mjs --seed tests/fixtures/client-load-home`（覆盖装配零失败、bound/unbound 状态页、图谱页、DefaultsButton/Panel 写盘、MethodLibrary、Config 页、Final 页、Evidence 引用分屏、Research Hub）；
  2. `cockpit-truth.entry.mjs`（5 场景：S1/S1b 终稿地址版本优先与缺失失败态、S2 已交付×审查 FAIL、S3–S5 bundle/review/evidence 读失败）；
  3. `cockpit-artifact-truth.entry.mjs`（9 场景：S6–S14 question/receipt/readiness 读失败、空文件、读者版失败可见回退）；
  4. `cockpit-truth-residuals.entry.mjs`（8 场景：S15–S22 审查冲突、reader 30s stale watcher、final 目录不可读、plan 不可读、config question 不可读、defaults mixed、空快照）；
  5. `cockpit-truth-substance.entry.mjs`（6 场景：S23–S28 空 findings/leads/plan、标题-only question、`_failed.md` 失败登记与空证据卡）；
  6. `cockpit-locale.entry.mjs`（2 场景：S29/S30 英文单复数与主 Tab 完整可读）。
- **重点核查**：逐项检查输出里是否存在静默 `SKIP`（例如 `终稿引用分屏：当前终稿无 evidence/ 引用按钮` 或 `状态页 ⑤ 折叠块：present 不在尾窗`）——凡是 `SKIP` 的关键路径必须在 Stage 2/4 用完备种子夹具补实证！

---

### Stage 2 · 全 UX/UI 用户旅程端到端走查（真实浏览器交互 + 全功能点）

> 对照 [40-research-cockpit.md](../../../docs/design/40-research-cockpit.md) §2.0–§2.19 逐件逐路径实操，使用 Playwright / `probes/browser/cdp-probe.mjs` 驱动点击、输入、悬停、切页、切会话与分屏。

#### Journey A · 首次启动与空白会话（Blank Session / Onboarding）
1. **出厂白名单验证（§2.0）**：确认主区只有「对话 / 方法库」（无 `ui-trajectory`），右栏无 `New Terminal`（`ui-sidebar-terminal` 关），文件树（`ui-sidebar-files`）可用；
2. **品牌槽**：左栏顶部 `sidebar.brand.mark` + `sidebar.brand.name`（zh `Orca 深度搜索` / en `Orca Deep Research`），Hero 中央 `conversation.hero.brand.mark` 虎鲸图标正常显示，无双logo冲突或裁切；
3. **首屏起步卡（`StartCard`）**：
   - 在无 `drt_*` 且无用户消息时可见，显示工作区名称/路径、三步引导、凭据说明；
   - 点击 **4 个研究题型快捷模板按钮** → 验证通过 `inputActions.insertText` 正确预填进输入框且**不自动发送**；
   - 测试「选择项目目录」按钮交互与取消/失败提示（`errorDetailOf`）；
   - 验证发送消息后或工作区出现 `drt_*` 后起步卡正确收起，且切换会话时 `choosing`/`chooseError` 瞬态复位（BUG-409）；
4. **左侧项目默认按钮（`DefaultsButton`）**：
   - 在 Blank Session 无 session 时不报错；有 session 时显示状态文案（`自动` / `方法 X` / `已设 N 项` / `需检查`）；
   - 悬停 `Tooltip` 列出生效值；点击直接打开右栏「研究配置」页签并定位 `DefaultsPanel`。

#### Journey B · 全局「研究工作台（Research Hub）」（M6 新入口）
1. **入口可达性**：在 **Blank Session（无历史会话）** 与 **活跃研究会话** 下，分别点击左栏 `sidebar.panellist` 的「研究工作台」图标打开 `main` keyed 面板；以及通过右栏任意研究页签的原生右键/菜单项（`ResearchTabMenuItem`）触发「打开研究工作台」；
2. **Tab 1 · 研究档案（`RunsView`）**：
   - 验证扫描工作区三位置（根 / `archive/` / `_abandoned/`）的 run 列表、状态标签、版本号、证据数；
   - 点击跳转对应终稿（`openFinal`）或从工作台「发起新研究」（`startResearch`）→ 验证正确切回对话并带上预填/新建会话；
   - 验证无 run 空态与读取失败提示；
3. **Tab 2 · 方法库（`MethodLibraryView` inside Hub & `conversation.view`）**：
   - 搜索框过滤、切换「我的库 ↔ 内置参考」（验证切回「内置参考」时清空 `selectedName` 的修复生效，不留旧高亮/误渲染）；
   - 查看库条目详情、设默认/清默认、删除二次确认、内置条目「以此新建」；
   - 新建向导 3 来源（从零 / 内置参考 / 已完成 run 选择器 `useRunSourcePicker` 预览）；
   - 活动草稿顶部摘要、切换「访谈（`MethodCoachPortal` + `CoachChat`）↔ 检查表单（4 个 textarea）」、点摘要字段直达聚焦；
   - 拖拽或键盘方向键（`ArrowLeft`/`ArrowRight`）调节 `ColumnHandle` 分隔条；
   - 验证 **`installCoachComposerStyles` 不溢出**：从 `conversation.view` 方法库切到对话 tab、从 Hub 切回对话、开新会话时，外层主 composer 必须正常恢复可见（绝不能被隐藏死）；
4. **Tab 3 · 研究透镜与项目默认（`LensesView` + `DefaultsPanel`）**：
   - 验证 8 条内置研究视角完整展示、双语切换无遗漏；
   - 验证内嵌 `DefaultsPanel` 全部控件（`SelectMenu` 下拉选单选深度与输出形态、`Input` 填目标读者、`Pill` 切换来源家族与权威源、清空默认二次确认弹框及跨会话复位）写入 `research-defaults.json` 与 `DefaultsButton` 同步更新。

#### Journey C · 顶栏胶囊、工具卡与里程碑卡（M2 & M5 主对话区）
1. **顶栏研究进度胶囊（`ResearchHeaderPill`）**：
   - 绑定 run 会话顶栏显示 `StateDot` + 阶段/HITL 等待/证据数；未绑定会话不瞎显示；
   - 悬停 150ms 触发 `HoverCard` 展示五问摘要；点击胶囊自动展开右栏对应页签（挂起/进行中 → 状态页，已交付 → 终稿页）；
   - 验证与右栏状态页、活标题共用 `session-stream-store`（切会话/关闭右栏/重开时 WebSocket follow 订阅正常增减 refcount，无泄漏或卡死在旧会话）；
2. **对话流语义工具卡（`ResearchToolCard` & `MethodLibraryToolCard`）**：
   - 逐一覆盖 4 类研究工具卡（`spawn_teammate`、`web_search`、`web_fetch`、`subagent`）与 3 类方法库写卡（`upsert` / `remove` / `set_default`）；
   - 验证 `DisclosureRow` 展开/收起、`StateDot`、`TextShimmer`、流式半截入参态（不误判默认动作，显示 `toolDefaultRunning`）、中断未知态（`TOOL_OUTCOME_UNKNOWN` → 显示「结果未知（可重试）」而非失败）；
3. **回合里程碑卡（`ResearchMilestoneCard`）**：
   - 在含立项定稿、审查结论、交付见证的回合尾部正确渲染结构化卡片且可跳转右栏；普通问答回合返回 `null` 不膨胀对话流；
4. **问卡窄列布局（`installQuestionCardNarrowFix`）**：
   - 在 `1280×800` 下展开右栏使聊天列变窄，触发/渲染 HITL 问卡，验证卡头标题不塌陷成“一字一行”竖条。

#### Journey D · 右栏「研究状态」页签（M3 重构面）
1. **活标题与自动展开**：pending 从 `false → true` 时页签名翻为 `研究状态 · ⏳ 等你拍板` 且右栏自动展开；
2. **顶部与核心区**：
   - HITL 挂起横幅（不与底部重复）+ 流失败恢复横幅（只在末位回合真死于流异常时出现）；
   - 停摆横幅四轴门（已绑定 × 未交付 × 未挂起 × 静默且末回合有错，缺一不显）；
   - **HITL1 结构化契约卡（`ProtocolCard`）**：加载完整 `protocol.json` 验证展示内容；
   - **步进轨道（`TrackRail`）**：`StateDot(appearance="step")` 七步 + 锚点，验证窄栏**不横向溢出**、重入描边、`unknown` 琥珀 `?` 正确；
   - **质量雷达（`QualityRadar`）**：加载含 `topics.md`（多 lens）+ 多张 8 字段 `evidence/*.md` 的夹具，验证 `Topic × Lens` 覆盖矩阵、缺口标识与信源等级/质量 A–D 分布条；对比旧无头卡无缺口 run 时正确隐身；
   - 证据计数、交付见证与三种改法折叠块、活动流（`DisclosureRow`）、队员动态折叠区（`MemberActivity`）+ 原生刷新命令（`bindCommands({ refresh })`）。

#### Journey E · 右栏「研究配置」与「研究图谱」页签（M3）
1. **研究配置（`ResearchConfigTab`）**：`DefaultsPanel` + `本次研究` 七态 + 「换一条」弹窗发送与三态回执（`已发送 / Lead 已回话 / 已落盘 diff`）+ question 读失败独立重试按钮；
2. **研究图谱（`ResearchGraphTab` + `DagMap`）**：
   - 版本轨（切换当前图 / 旧图 `plan/vN` / 结构 diff 详情）；
   - 覆盖率行（`已映射 K / 未映射 N-K` / stale / plan-only）；
   - `DagMap` SVG 交互：平移/缩放（如有）、点击选中节点 → **上下游依赖边与关联节点高亮**、折叠块「查看全部节点」展开与收起、选中后展开聚焦 `NodeCard`（含复合子节点 `W3.1` 展开与复制路径按钮）；
   - 无边/空计划/截断/读失败等各降级横幅不叠床架屋。

#### Journey F · 右栏「终稿」与「证据卡阅读器」双格分屏溯源（M4 杀手级核心路径）
> 专门构造或使用包含**读者版（`readable-v1.md`）、审计版（`v1.md`）、`claims.json`、`verdicts-r1.json`、8 字段 `evidence/*.md`、带 `[来源: evidence/xx.md]`（含代码块内假引用负控）及 `## 下一版优先项`** 的完整种子 bundle 实跑以下全链路：
1. **三视图切换（`SegmentedControl`）**：
   - 默认读者版优先（无读者版时审计版），静音条仅陈述盘上事实（`读者版 v1` / `审计版 v1` / `当前工作稿` / `审查未过`，不冒充已交付）；
   - 切换「审计版」与「核查清单（`ClaimsAuditView`）」：逐条检查 Claim 状态（PASS / FAIL / `UNVERIFIED` / 关联证据链接）、过滤/展开行为；
2. **章节目录（`FinalToc`）**：折叠/展开 H1–H3 目录，点击标题平滑滚动定位到对应章节（同时验证在 vendor `.tabBody` 定高容器内滚动条确实可滚、不被截断）；
3. **点击引用分屏溯源（`citation-linkify` + `ResearchEvidenceTab`）**：
   - 验证正文 `[来源: evidence/e1.md]` 自动变为可点链接，而 **Markdown 代码块/行内代码里的 `[来源: evidence/fake.md]` 保持纯文本不转链**；
   - 点击证据链接 → 通过 `MarkdownDelegateProvider.openFile` + `openResource(..., { preferNewPane: true })` 在右栏原生双格分屏打开「证据卡」页签（左终稿 / 右证据卡）；
   - 核查 `ResearchEvidenceTab` 顶部 8 字段元数据（`Quality A–D` / `source_tier` / `publisher` / `lens` / `retrieved_at` / 可点击外链）、正文摘录、解读与 Question List 勾选态；
   - 点击 `Files` 树里的 `evidence/*.md` 与 `final/vN.md` 确认均由对应 extension 页签接管，而 `drafts/final.md` 仍回落到默认预览；
4. **续研预填（`FinalFollowupFooter`）**：
   - 点击 `## 下一版优先项` 按钮与「三种改法」预填按钮 → 验证通过 `inputActions.insertText` 把草稿填入主对话输入框并聚焦，**绝不直接发给模型**（守住 D18）；
5. **切换回「过程 →」与 30s stale watcher**：切换视图后修改当前显示文件（reader vs audit），验证 stale 提示仅盯当前显示件且点击刷新重读后消除。

---

### Stage 3 · 视觉、双主题、多视口、语言与无障碍全面巡检

- **目标**：消灭肉眼才能看到的布局重叠、暗色对比度断裂、溢出截断、英文混排与键盘不可达问题。
- **执行矩阵（浏览器脚本自动遍历 + 截图人工/多模态复核）**：
  1. **主题矩阵（2 态）**：**浅色主题（Light）** × **深色主题（Dark）**；
     - 重点检查：全页无残留白底黑字卡片、无透明底导致文字与底色融为一体、`DagMap` SVG 节点/连线/文字在暗色下清晰可读、CSS Modules `<style data-plugin-css>` 无重复注入或样式丢失、选中态/错误态/警告态/成功态颜色可区分；
  2. **视口矩阵（4 档）**：`1440×900`（宽屏桌面）、`1280×800`（标准笔记本 + 问卡窄列）、`768×900`（平板窄窗口）、`480×800`（超窄窗口，重点查方法库左右两列折叠与 `data-method-library-toggle` 切换）；
     - 机械硬检查：每个核心视图断言无意外横向滚动条（`scrollWidth <= clientWidth + 1`）、无元素飞出视口、滚动容器 `overflowY: auto` 可滚动、文字不与按钮/角标重叠；
  3. **语言矩阵（2 态）**：`zh`（默认）与 `en`（`locale: en` overlay）；
     - 验证英文模式下：`Orca Deep Research` 品牌、短标签 `Methods`、所有 M3–M6 新增卡片（Protocol/QualityRadar/ClaimsAudit/EvidenceTab/HeaderPill/MilestoneCard/Hub）零中文硬编码泄漏、零未翻译字典键名、单复数计数正确；
     - 验证运行中切换语言时方法编辑会话标题自动迁移（BUG-069）；
  4. **键盘与交互可用性**：Tab 焦点移动、`SelectMenu` / `Modal` / `HoverCard` / `SegmentedControl` / `ColumnHandle` 键盘操作、`Escape` 关闭浮层、`document.activeElement` 焦点不丢失。

---

### Stage 4 · 新面（M3–M6）异常态与跨会话边界压力测试

- **目标**：把之前只靠 JSDOM 矩阵测到的故障，在真实 DSH Web 浏览器环境里过一遍（特别是 M3–M6 新增数据面）：
  1. **五态故障实机验证**：
     - `protocol.json`：缺失 / 0 字节 / 畸形 JSON / 读失败（chmod 000）→ `ProtocolCard` 如实提示，不崩溃；
     - `claims.json` / `verdicts-r*.json`：仅 claims 无 verdicts（全部 `UNVERIFIED`）/ JSON 畸形 / 读失败 → `ClaimsAuditView` 明确提示；
     - 终稿点击指向**不存在或不可读**的 `evidence/missing.md` → `ResearchEvidenceTab` 呈现明确失败/缺席态，不白屏、不卡死；
     - 终稿 `final/v2` 与 `readable-v2` 中一版坏一版好 → 互补回退带可见提示，双坏原子清正文走失败屏；
  2. **跨会话与并发竞态**：
     - 在 **已绑定 run A → 未绑定会话 B → 绑定 run C → Blank Session → Hub 面板** 之间连续快速切换；
     - 核查：状态页/图谱/配置/顶栏胶囊是否出现“上一会话残影串台”、`session-stream-store` 是否断开旧流、未绑定会话是否绝不泄露旧 run 数据、`DefaultsPanel` 清空二次确认是否跨会话自动取消；
     - 在方法库新建/保存异常（coach 连接超时/失败）时验证队列正确解锁恢复可点。

---

### Stage 5 · 真模型活流与实时交互环验证（L4 / 通道实机）

- **目标**：覆盖 keyless 种子夹具永远造不出来的**实时 WebSocket 推送与真模型交互**。
- **前提检查**：确认 `runtime/harness-home/.credentials.yaml`（`DEEPSEEK_API_KEY`）可用与网络直连正常；若不可用，明确记 `NOT-RUN` 并说明阻塞原因。
- **动作清单**：
  1. `node tools/channel/run-driver.mjs up` 启动并复验活通道（顺带验 `mirror-sync` 在真实开发通道的表现）；
  2. `source tools/env.sh && node checks/smoke/client-hitl.entry.mjs`（真模型 HITL1 挂起：活标题翻 `⏳ 等你拍板`、右栏自动展开、问卡窄列不塌、代答落盘）；
  3. 跑一场微型或可控 L4 研究流程（或 `l4-lite.e2e.mjs` + 活会话跟进）：实证 `ResearchHeaderPill` 随推进实时跳变、`ResearchToolCard` 流式入参到完成态转换、`ResearchMilestoneCard` 实时出现、`MemberActivity` 队员折叠区与真实 `agentTeam` 投影对齐、**live `present` 事件到达时 `delivery-watch` 自动打开终稿页签（且焦点在输入框时不打断用户打字）**。

---

### Stage 6 · 缺陷建卡、审计汇总与收尾

- **输出物**：
  1. **缺陷台账**：本轮扫出的所有真实问题按严重度（P0 阻断/数据撒谎/白屏、P1 功能/布局明显瑕疵、P2 视觉微瑕/文案细节）全部在 `_backlog/bugs/` 建 `BUG-NNN-<slug>.md` 卡（`status: 排查中` 或带完整复现命令的 `待拍板/修复就绪`）；
  2. **覆盖矩阵报告**：一份清晰的「面 × 检查手段 × 实际结果（PASS / FAIL(BUG-NNN) / SKIP / NOT-RUN）× 截图/日志目录」总表，交给用户拍板下一步先修哪些 BUG、哪些可直接验收通过；
  3. **经验回流**：若某类 UX/UI 缺陷在既有 JSDOM/冒烟中漏网，在 Note 中记录“为什么现有门禁没拦住”及后续应补哪类守卫（例如把 M3–M6 富夹具并入 `client-load-home` 或新增视觉回归断言）。

---

## 判据形状（本核查计划本身）

- **不适用**（本卡为核查与测试执行计划，不直接引入或修改生产判据或门禁规则；若核查过程中发现需要新增门禁或结构判据，将在对应修复卡或后续 Issue 中按规范单独立写 `## 判据形状`）。

---

## 验收标准

1. **全覆盖执行记录**：Stage 0–Stage 5 全部清单逐项执行并有明确落盘结论（每项标明 `PASS` / `FAIL → BUG-NNN` / `SKIP（原因）` / `NOT-RUN（环境阻塞）`，零含糊“大致正常”）。
2. **完整视觉留证**：至少覆盖 Light/Dark × 1440/1280/768/480 × 核心界面（Hero/StartCard、Research Hub 三页、Status 含 Protocol+QualityRadar、Graph+DAG、Final 三视图+TOC+Claims、Evidence 分屏、HITL 问卡）的截图集合与零 `console.error` / `pageerror` 核对清单。
3. **缺陷全部结构化建卡**：发现的每一条 UI/UX 问题均已在 `_backlog/bugs/` 建独立卡（含可复现步骤/命令、实际截图或日志证据、期望行为与严重级），且 `_backlog/bugs/README.md` 索引同步；`pnpm verify` 保持全绿。
4. **交接报告**：给出面向用户的结构化核查总结与缺陷优先级建议，等待用户拍板后续修复与 M1–M7 最终归档。

---

## 关闭条件

- Stage 0–Stage 6 全部完成并产出核查总结报告；
- 所有发现问题已按规范建 `BUG-NNN` 卡（或当场经用户授权修复并记录 `fix-evidence`）；
- `notes/implemented/2026-11-27-cockpit-ux-ui-full-verification.md` 落盘记录实跑验证、发现清单与未证边界；
- 经用户确认本轮核查闭环后，状态翻为 `已结`、`可关闭：是` 并 `git mv` 归档至 `_backlog/_archived/settled_issues/`。
