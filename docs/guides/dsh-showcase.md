# DSH 标杆示范导览：零改内核长出深度研究工作台

> **面向两类读者**：想 3 分钟直观体验完整深度研究工作台的人，直接跑 `pnpm demo`（零 API Key）；想看 DeepSeek Harness（DSH）如何在不修改宿主源码前提下支撑垂直应用的人，按下方「体验 → 原生 Seam → 源码落点」全景表逐层下钻。
> 本仓严格守住 `vendor/dsh/` 只读红线、[D17](../decisions.md#d17)（harness 只读、run 状态唯一住工作区 `drt_<slug>/`）、[D18](../decisions.md#d18)（驾驶舱只读观察与预填草稿，不绕过会话直写盘）与 [D22](../decisions.md#d22)（核心研究包零外置服务依赖）。

## 1. 3 分钟零 Key 本地体验（`pnpm demo`）

无需配置任何 API Key，也不会改动日用 `~/.dsh` 或仓内 `research-workspace/`。前置只需 `pnpm install`、`bash tools/build/vendor-build.sh` 与 `pnpm build`：

```sh
pnpm demo
```

入口脚本 `tools/channel/demo-showcase.mjs` 会把脱敏自包含示范夹具 `tests/fixtures/showcase-home/` materialize 到隔离运行区 `runtime/smoke-workspace/showcase-{home,showcase}/`，剥离全部模型 API Key 环境变量并启动带预载会话的 DSH Web 界面（仅自检启动链路可加 `--check`）。打开终端打印的带 token URL 后，按顺序体验五个标志性瞬间：

1. **S1 · 意图优先首屏**：点左上角新建空白会话，感受被声明式白名单裁剪掉 Trajectory 与 Terminal 后的纯净界面；在 Hero 角色选择栏右侧同行点击轻量选配胶囊（方法 / 视角 / 工作台），点选下方带题型标签的起题灵感卡即可预填草稿。
2. **S2 · 全域活队列与阶段聚焦驾驶舱**：看左侧会话列表——已交付会话自带绿标、待立项会话自带琥珀 HITL 提醒点（零按行轮询）；进入已交付会话，在右栏「研究状态」查看精简三层焦点卡，点击 `QualityRadar` 命中单元格直接展开证据微列表并下钻证据卡。
3. **S3 · 学术级全屏三栏精读与悬停溯源**：在终稿页签点击全屏切换，自动展开「左常驻滚动同步目录 + 中舒适阅读列宽正文 + 右证据/Critic 核查对照栏」；鼠标悬停正文任意 `[来源: evidence/...]` 链接 150ms 即弹出质量等级、信源层级与核心摘录卡片；切到「核查」视图点击「仅看风险」秒筛 C5/C6 存疑项。
4. **S4 · Composer `/` 与 `@` 研究指令流**：在输入框敲 `/lens` 模糊筛选研究透镜、敲 `/method` 速选研究方法、敲 `/research-defaults` 可视化设定默认深度与输出、敲 `/hub` 直开工作台；敲 `@` 将当前 run 的证据卡或计划节点变原子胶囊嵌进追问，已发消息中的引用自动渲染为可点击 `ReferenceChip`；也可用 `Cmd/Ctrl+Shift+U`（状态）、`G`（图谱）、`D`（工作台）切换。
5. **S5 · 全局研究工作台与零 hack 嵌入式方法库**：点左侧全局「研究工作台」查看 `Runs / 方法库 / 研究透镜`。在 `Runs` 中点击已交付报告会先自动切回产生该报告的所属会话再开终稿（杜绝跨会话串台），而本地无历史会话的归档目录则诚实标为只读归档；在「方法库」新建/优化方法会拉起独立 Method Editor 悬浮对话，经窄权 Host 工具安全落盘。

## 2. 全景能力解剖：体验 → DSH 原生 Seam → 本仓源码落点

| 层次 / 瞬间 | 用户可感体验 | 消费的 DSH 原生机制 / Seam | 本仓源码落点 |
|---|---|---|---|
| **后端 S0 裁剪** | 去掉通用编程壳噪音，只留研究相关面板 | `cordis.patch.yml` 后置白名单 `disabled: true`（零 CSS 隐藏） | `packages/deep-research-pack/cordis.patch.yml` |
| **多角色与隔离执行** | Lead / Scout / Analyst / Critic / Method Editor 分工与批量透镜扇出 | `@deepseek-ai/dsh-agent-preset` + `isolate` 非角色 worker profile + `workflow-ptc` | `packages/deep-research-pack/presets/lead.patch.yml` · `packages/deep-research-pack/workers/research-wave.patch.yml` |
| **网络检索与抓取回退** | 稳定检索与本地抓取失败自动回退 | 自定义 `ctx.web` search/fetch provider + `ctx.credentials` 引用 | `packages/deep-research-pack/src/fetch-fallback/` |
| **S1 · 意图首屏** | 品牌识别 + Hero 同行选配 + 标签化起题卡与最近 Run 续接 | `sidebar.brand.*` / `conversation.hero.brand.mark` / `conversation.hero.options` / `conversation.input.dock` | `packages/deep-research-pack/src/client/BrandMark.tsx` · `packages/deep-research-pack/src/client/HeroResearchOptions.tsx` · `packages/deep-research-pack/src/client/StartCard.tsx` |
| **S2 · 全域活队列** | 左栏实时研究状态标与右键开终稿，Hub 切回所属会话零串台 | Host `ctx.sessionProjections` 增量折叠 + `sidebar.session.row.leading` / `hover` / `sidebar.workspaces.session.menu.item` | `packages/deep-research-pack/src/index.ts` · `packages/deep-research-pack/src/lib/events/research-projection.ts` · `packages/deep-research-pack/src/client/ResearchSessionRow.tsx` · `packages/deep-research-pack/src/client/research-hub/RunsView.tsx` |
| **S2 · 阶段聚焦与交互雷达** | 状态页按阶段自适应聚焦，雷达格点击直钻证据卡，队员一键跳转 | `sidebar.right.tab` + `remote.workspaceFiles` 并行读面 + `ArtifactState` 五态 + `agentTeam` 投影 | `packages/deep-research-pack/src/client/ResearchStatusTab.tsx` · `packages/deep-research-pack/src/client/research-status/QualityRadar.tsx` |
| **S3 · 全屏三栏与悬停溯源** | 全屏自动三栏（目录 / 正文 / 核查），150ms 悬停看证据摘录，核查风险筛选，宽画布 DAG | `useTabInfo().sidebar.fullscreen` + `HoverCardGroup` + `SegmentedControl` + `openResource` 分屏 | `packages/deep-research-pack/src/client/ResearchFinalTab.tsx` · `packages/deep-research-pack/src/client/research-final/CitationHoverLayer.tsx` · `packages/deep-research-pack/src/client/research-final/StudioInspectorPane.tsx` · `packages/deep-research-pack/src/client/research-final/ClaimsAuditView.tsx` · `packages/deep-research-pack/src/client/research-graph/DagMap.tsx` |
| **S4 · Composer 指令流与工具卡** | `/` 模糊命令弹窗、`@` 证据与计划节点胶囊、全局快捷键、富语义搜索/组队工具卡 | `ctx.commandUi` + `ui-input-trigger` + `conversation.user.text.node`（`ReferenceChip`）+ `ctx.shortcuts` + `chat.toolCall`（`<WebBlock>`） | `packages/deep-research-pack/src/client/research-commands.ts` · `packages/deep-research-pack/src/client/research-triggers.tsx` · `packages/deep-research-pack/src/client/research-shortcuts.ts` · `packages/deep-research-pack/src/client/ResearchToolCard.tsx` |
| **S5 · 全局工作台与方法库** | 统一管理 Runs / 方法库 / 研究透镜，独立 Method Editor 安全写盘 | `sidebar.panellist` + `main` 视图 + `shell.overlay` Portal + 窄权 Host 工具 | `packages/deep-research-pack/src/client/ResearchHubPanel.tsx` · `packages/deep-research-pack/src/client/MethodLibraryView.tsx` |

全量源码模块与槽位注册索引由 `pnpm docs:gen` 自动生成，详见 [驾驶舱注册表](../reference/cockpit-registry.generated.md) 与 [包目录](../reference/package-catalog.generated.md)；设计约束正本见 [研究驾驶舱合同](../contracts/client-ui.md)。

## 3. 零改本包代码的生态可组合性（Profile 层叠加示范）

严守 [D22](../decisions.md#d22) 的核心价值在于让 `dsh-deep-research-pack` 保持干净、零外部服务依赖、开箱即用；而当用户希望把深度研究与定时追踪、动态网页渲染或文档导出组合起来时，**无需修改本包一行代码**，直接在自己的 `deep-research` custom profile 层叠加所需 DSH 插件即可：

```sh
# 示例：在已有 deep-research profile 中按需叠加官方扩展能力（版本号与 dsh --version 对齐）
DSH_VER="$(dsh --version)"

# 1) 定期复查课题变化：叠加 schedule-bundle（定时唤醒研究会话追踪新动态）
dsh plugin --profile deep-research add "@deepseek-ai/dsh-experimental-schedule-bundle@$DSH_VER"

# 2) 动态渲染网页深抓：叠加浏览器控制插件（需本机浏览器环境）
dsh plugin --profile deep-research add "@deepseek-ai/dsh-browser-use@$DSH_VER"

# 3) 交付文档格式转换：叠加文档处理插件
dsh plugin --profile deep-research add "@deepseek-ai/dsh-office-to-pdf@$DSH_VER"
```

也可以在用户自持的 `$DSH_HOME/profiles/deep-research/cordis.patch.yml` 中做精细覆写（例如切换默认界面语言为英文或调优抓取超时）：

```yaml
# $DSH_HOME/profiles/deep-research/cordis.patch.yml（用户 profile 层，独立于研究包）
plugins:
  - id: locale
    config:
      preference: en
```

组合后的能力立即对整个 `deep-research` profile 生效，卸载第三方扩展也不会破坏 `drt_<slug>/` 工作区数据或 `method-library.md`。这正是 DSH 插件组合模型相比单体垂直应用的核心优势：核心研究体验保持纯粹，外围能力由 profile 自由拼装。
