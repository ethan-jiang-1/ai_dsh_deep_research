# 研究驾驶舱（Research Cockpit）：观察面 client 套件合同

> **读法**：本页是驾驶舱**架构、出厂面白名单、数据通道、分层与防御红线**的当前合同正本；全量源码模块路径清单由 [reference/cockpit-registry.generated.md](../reference/cockpit-registry.generated.md) 自动生成（`cockpit-doc-registry` 门禁校验新鲜度）。
> 命名分层正本 = §1（历史定夺见 [cockpit-naming 快照](../../notes/archived/2026-09-28-cockpit-naming.md)）；运行模型与四类状态 = [data-model.md](./data-model.md)。

## 1. 定位与命名分层

**一句话**：DSH Web GUI 右栏与工作台的观察面 client 套件——多 agent 研究运行期间，人在这里"看仪表、关键时刻接手"（[D7](../decisions.md#d7) 纯配置包教义的有界例外 = [D18](../decisions.md#d18)；另一处 = 抓取回退 provider，[D31](../decisions.md#d31)）。

| 层 | 名 | 指什么 | 改动频率 |
|---|---|---|---|
| 伞 | 观察面 | 驾驶舱 + 仪表盘投影（[D18](../decisions.md#d18) 原语义） | — |
| **套件** | **研究驾驶舱（Research Cockpit）** | `src/client/` 的 React 件全体 | **最频** |
| 折算层 | folds | `src/lib/` 纯函数谓词（keyless 单测；驾驶舱与 HTML 投影共享 HITL/步骤适配） | 少 |
| 投影 | 仪表盘（run-dashboard） | `probes/analyze/run-dashboard.mjs` 只读 HTML 投影（抛弃型、永不入库） | 少 |

目录名守 DSH 双半约定 host/client（不叫 `src/cockpit/`）；套件名钉 `src/client/index.ts` 头注。

## 2. 构成（出厂面白名单与核心件）

<a id="cockpit-surface"></a>
### 2.0 出厂面契约（哪些出厂入口在、哪些不在）

研究界面是**一张白名单**，用 Loader 第一类语义（后置 bundle 层按 id `disabled: true`）关面，不用 CSS 隐藏。机检守卫 = [bundle-composition](../../tests/vendor/bundle-composition.vendor.spec.mjs)（零跳过 + 白名单两侧）；像素面归真 Web 证据。

| 面 | 出厂行 | 状态 | 为什么 |
|---|---|---|---|
| 主区 Trajectory 页签 | `ui-trajectory` | 关 | 展示 harness 内部事件流，非研究证据；证据在 `drt_<slug>/` |
| 右栏 New Terminal | `ui-sidebar-terminal` | 关 | 研究逃生口不是 shell；工作区是文件面的 |
| 主区 对话 | `ui-chat` | 留 | 研究的入口与出口 |
| 右栏 文件树 | `ui-sidebar-files` | 留 | 终稿页签读 `workspaceFiles`；保留盘上可见性 |
| 右栏 浏览器 | `ui-sidebar-browser` | 上游关（非 desktop） | 沿用 DSH profile 关面机制 |

### 核心件索引（全量 `src/{client,lib}` 模块见 [cockpit-registry.generated.md](../reference/cockpit-registry.generated.md)）

| 件 | 文件 | 一句话 | 详情 |
|---|---|---|---|
| 研究状态页签 | ResearchStatusTab.tsx | 右栏主观察面（含活标题与顶栏/回合胶囊） | [§2.1](#cockpit-1) |
| 流失败恢复指引 | stream-failure.ts | 上游流畸形死亡的人话恢复横幅 | [§2.1](#cockpit-1) |
| 品牌（虎鲸 Orca） | BrandMark.tsx | 侧栏与空首屏 Hero 品牌标/品牌名槽 | [§2.2](#cockpit-4) |
| 面板数据面 | config-tables.ts | 内置打法、判型映射、底线与领域示范纯常量 | [§2.3](#cockpit-6) |
| 研究配置页签 | ResearchConfigTab.tsx | 右栏摘要页签 + 项目默认面板（[D25](../decisions.md#d25) / [D50](../decisions.md#d50)） | [§2.3](#cockpit-6) |
| 项目默认按钮 | DefaultsButton.tsx | composer 左侧状态按钮与 store 同步 | [§2.3](#cockpit-6) |
| 全局研究工作台与方法库 | ResearchHubPanel.tsx / MethodLibraryView.tsx | 全局 Hub（Runs / 方法库 / 透镜）+ Method Editor 写库队列 | [§2.4](#cockpit-7) |
| 研究图谱页签 | ResearchGraphTab.tsx | 右栏只读 SVG DAG、版本轨与覆盖率 | [§2.5](#cockpit-8) |
| 终稿页签 | ResearchFinalTab.tsx | 读者版 / 审计版 / 核查清单三视图 + 目录 + 续研预填 | [§2.6](#cockpit-9) |
| 证据卡阅读页签 | ResearchEvidenceTab.tsx | 认领 `evidence/*.md`，展示 8 字段与 Question List | [§2.6](#cockpit-9) |
| 浏览器 RunSource 适配器 | run-source-browser.ts | `workspaceFiles` → `RunSource`（区分 missing 与 unreadable） | [§2.7](#cockpit-10) |
| 研究语义工具卡 | ResearchToolCard.tsx | `spawn_teammate` 组队卡 + `web_search` 检索卡 | [§2.7](#cockpit-13) |
| 挂起显性化与装配入口 | index.ts | `scoped.effect` 装配全部槽位；挂起时自动展开右栏 | [§2.7](#cockpit-14) |
| keyed 常量 | keys.ts | 全部槽名/页签键/wire 工具名族的唯一正本（`client-keys` 把守） | [§2.7](#cockpit-15) |
| host 空壳 | src/index.ts | bundle 行宿主位；浏览器半经 `exports["./client"]` 装载 | [§2.7](#cockpit-16) |
| 产品首屏起步卡 | StartCard.tsx | blank Session 首屏指引与「选择项目目录」按钮 | [§2.8](#cockpit-17) |
| 启动工作区恢复 | startup.ts | 挂载后选/切研究工作区与空白 Lead 会话 | [§2.8](#cockpit-18) |

### 「研究状态」页签渲染八区（自上而下）

| 区 | 职责 |
|---|---|
| ① HITL 挂起横幅 / 流失败恢复横幅 | 条件显示：点名停靠锚点与参与指引；末位回合死于流失败时提示「等一两分钟发『继续』」 |
| ⓪ 业务摘要层 | 五问业务语言（研究什么 / 已确认 / 未知 / 是否需操作）；折算住 `brief-fold.ts`，计数不进本层 |
| ② 流程轨道 | `TrackRail` 七步四态（✓ done / ● current / ○ pending / ? unknown 读失败）+ HITL 锚点 + 交付版本 |
| ⑥ 决策诚实线 + ③ 研究问题 + 研究契约卡 | 条件指路 `question.md §Decisions`、展示本场问题与 `protocol.json` 只读摘要 |
| 证据质量雷达 + ⑤ 证据与交付 | `QualityRadar` Topic×Lens 矩阵；有效证据计数（排除 `_failed.md`/空卡）+ `present` 交付见证 + rerun 版本面 + 三种改法只读卡 |
| ④ 活动流 | 人性化检索/派出/成员/交付行，原始事件类型名不出正文 |
| ⑦ 队员动态折叠区 | [member-activity-first-validation](../../notes/archived/2026-10-11-member-activity-first-validation.md)：经 `agentTeam` 投影多路 follow 队员检索/抓取/出错动作，默认折叠 |

<a id="cockpit-1"></a>
### 2.1 研究状态页签、活标题与顶栏/回合胶囊

- **页签主体**：按上表八区渲染，与 `ResearchHeaderPill`（`session.header.actions` + `HoverCard`）、`ResearchMilestoneCard`（`chat.turnTail`）及图谱页签经 `session-stream-store.ts` 按 `sessionId` refcount 复用单路 `follow` 流。
- **活标题**：HITL 挂起时页签名翻为「研究状态 · ⏳ 等你拍板」；折算由 `hitl-fold.ts` 负责。
- **纯状态机与读面**：异步状态收口到 `status-state.ts`（`reduceStatusFeed` / `collectStatusNotices`）；工件读取统一经 `artifact-read.ts` 输出五态（`ok` / `absent` / `unreadable` / `empty` / `invalid`），杜绝把读失败或空文件折成「正常缺失 / 0 份」。

<a id="cockpit-4"></a>
### 2.2 品牌（虎鲸 Orca）

`BrandMark.tsx` 占领 `sidebar.brand.mark`、`sidebar.brand.name` 与 `conversation.hero.brand.mark` 槽位；品牌名随 locale（zh `Orca 深度搜索` / en `Orca Deep Research`）。

<a id="cockpit-6"></a>
### 2.3 研究配置页签与项目默认（[D25](../decisions.md#d25) / [D50](../decisions.md#d50)）

- **摘要页签**：`ResearchConfigTab.tsx` 默认 `COMPACT=true`（`LegacyManagementPane.tsx` 为 `COMPACT=false` 回滚面），只留 ① 本次研究（`method-of-question.ts` 七态，判不了绝不回落默认打法）与「方法库 → 顶部 tab」入口；管理指令经 `session/prompt` 交 Lead。
- **项目默认（[D50](../decisions.md#d50)）**：顶部 `DefaultsPanel.tsx` 与 composer 左侧 `DefaultsButton.tsx` 共用 `src/client/defaults/store.ts`；只存 `depth` / `output` / `source`（首项「自动」= 字段省略 = Lead 判断），经 `/research-defaults` host command 原子写 `<workspace>/research-defaults.json`，面板不直写盘。

<a id="cockpit-7"></a>
### 2.4 全局研究工作台与方法库（`ResearchHubPanel` + `MethodLibraryView`）

- 除 `conversation.view` 内的方法库 tab 外，经 `sidebar.panellist` + `main` 注册全局「研究工作台」，空白首屏也可随时切换 **Runs（三位置 `drt_*` 研究档案）/ 方法库 / 研究透镜（8 条内置透镜 + 项目默认）**；右栏 5 个研究页签经 `sidebar.right.tab.menu.item` 注入「打开研究工作台」并响应 `tab.actions.bindCommands({ refresh })`。
- 方法编辑走 [D37](../decisions.md#d37) 第 5 个 preset（`shell.overlay` portal）；写库唯一路径 = Method Editor 窄 host 工具 + `useOperationQueue.ts` 串行队列与回读三态回执。

<a id="cockpit-8"></a>
### 2.5 研究图谱页签

- `ResearchGraphTab.tsx` + `DagMap.tsx`（CSS Modules + `--dsw-*` 语义令牌）把顶层 `plan.md` 节点与 `agentTeam` 任务画成只读交互式 SVG DAG，支持点击高亮上下游依存边、展开复合子节点、复制 `drt_<slug>/W3.1` 引用及 `plan/vN` 版本轨 diff（`plan-diff.ts`）。
- 映射四态（`mapped` / `unmapped` / `stale` / `plan-only`）由 `graph-model.ts` 折算：未映射节点明确显示「状态未知」，绝不假称「未执行」；无依赖边时只显示任务快照并说明原因。

<a id="cockpit-9"></a>
### 2.6 终稿页签与证据卡阅读页签

- `ResearchFinalTab.tsx` 认领 `drt_<slug>/` 终稿地址族（`final.md`、`final/vN.md`、`final/readable*.md`，由 `final-target.ts` 严格过滤），顶部用 `SegmentedControl` 切换 **读者版 / 审计版 / 核查清单（`claims.json × verdicts.json`）** 并支持分屏对照。
- 配备折叠目录 `FinalToc` 与内存 `citation-linkify.ts`（不改磁盘 `final*.md`），点击证据引用通过 `openResource(..., { preferNewPane: true })` 分屏打开 `ResearchEvidenceTab.tsx`（8 字段 frontmatter + Question List）；页脚 `FinalFollowupFooter` 从「下一版优先项」生成点击预填按钮（经 `inputActions.insertText` 不自动发送），守住 [D18](../decisions.md#d18) 只读边界。

<a id="cockpit-10"></a><a id="cockpit-13"></a><a id="cockpit-14"></a><a id="cockpit-15"></a><a id="cockpit-16"></a>
### 2.7 适配、工具卡、挂起显性化与装配底座

- `run-source-browser.ts` 将 `remote.workspaceFiles` 适配为 `RunSource`（`not-found` → `missing`，其它错误 → `unreadable`）；`ResearchToolCard.tsx` 提供组队卡与检索卡；`index.ts` 全量 `scoped.effect` 注册全部槽位并在 HITL 挂起时调用 `openTab` 自动展开右栏；`keys.ts` 为全部 keyed 常量唯一正本（`client-keys` 门禁把守）；`src/index.ts` 为 host 空壳位。

<a id="cockpit-17"></a><a id="cockpit-18"></a>
### 2.8 首屏起步卡与启动工作区恢复（[D40](../decisions.md#d40)）

- `StartCard.tsx` 挂在 `conversation.input.dock`，仅在 blank Session、无用户消息且工作区根无 `drt_*` 时展示三步指引与「选择项目目录」按钮（经 `uiWorkspace.pickDirectory` → `workspaces.create` → 写设备提示键 → 开 Lead 会话）。
- `startup.ts` 在挂载后按「已保存 `workspaceId` → 唯一 `Deep Research — ` 标题」恢复研究工作区并切到对应 Lead 会话。

## 3. 数据通道与接线

- **两条官方通道，零自建协议**：`remote.session.follow`（WebSocket journal 流）喂活动流 / HITL 谓词 / 会话绑定；`remote.workspaceFiles` 喂 bundle 渐进面（失败显性降级，不折成空态）。remote 命名空间须两级声明（`remote` + `remote.session`）。
- **项目默认写通道（[D50](../decisions.md#d50)）**：面板 → `remote.commands.execute('/research-defaults …')` → host command 原子写 `<workspace>/research-defaults.json`。
- **交付判据与自动打开**：终稿"已交付"只认 live 帧 `deliverables/presented`（`present` 见证），`final.md` 在场仅代表可审；`delivery-watch.ts` 只对在屏会话的 live 交付触发一次 `openResource`（`callId` 去重、焦点在输入框时不打断）。
- **双半构建与接线**：client 半由 `exports["./client"]` ↔ `cordis.patch.yml` 的 `research-client` 行装配，构建为 cjs/browser + `window.__ModuleLoader__.load` 外壳（细节 = [guides/plugin-authoring.md](../guides/plugin-authoring.md)）。

## 4. 分层纪律

- **折算进 `src/lib` 纯函数 + keyless 单测；组件薄渲染**（全量 `src/lib/` 列表见 [cockpit-registry.generated.md](../reference/cockpit-registry.generated.md)）。
- **keyed 字面量单一正本** `keys.ts`（`client-keys` 门禁把守）；全部注册包裹 `scoped.effect`（`client-effect-wrap` 把守）；样式颜色严守 `--dsw-alias-*` 令牌（`client-tokens` 把守）。
- **界面文案 day-one 双语**：任何用户可见文本必须同时有 zh/en——chrome 住 `src/client/locales/{zh,en}.ts`，折层住 `{zh,en}-fold.ts`，驾驶舱扩展住 `{zh,en}-cockpit.ts`；canonical 内容不动，UI 经 `builtin-display.ts` 投影取词；模型面 prompt 不翻译。
  守卫 = `tests/cockpit/client/builtin-display.spec.mjs`、`tests/cockpit/client/locales/client-locale.spec.mjs`、`tests/cockpit/client/method-library/locales.spec.mjs`、`tests/cockpit/shared/i18n.spec.mjs`、`tests/checks/repo/cjk-source.test.mjs`；步骤 = [changing-ui-copy](../../.agents/skills/changing-ui-copy/SKILL.md)。
- **默认语言 = 中文（[D49](../decisions.md#d49)）**：bundle patch 钉 `locale.preference: zh`，用户可在 profile patch 切 English。
- **页签自带滚动口**：vendor `.tabBody` 为定高 `overflow: hidden`，页签根必须 `flex: 1; minHeight: 0` + 内容区 `overflowY: auto`。
- **会话绑定与发现单源**：三位置发现（根 / `archive/` / `_abandoned/`，[D28](../decisions.md#d28)）唯一实现 = `src/lib/run/run-context.ts`（`run-context-single-source` 把守）；写强读弱 + `binding-trust.ts` 抑制立项预检错绑。

## 5. 验证面与防御红线

| 面 | 入口 | 断言什么 |
|---|---|---|
| keyless 真浏览器 | [client-load.entry](../../checks/smoke/client-load.entry.mjs) + `cockpit-*.entry.mjs` | 装配零失败 + 页签渲染 + 磁盘真值对账 + 工件/内容/残余/英文场景 |
| 真模型档 | [client-hitl.entry](../../checks/smoke/client-hitl.entry.mjs) | 活标题翻转 + 横幅 + 挂起自动展开右栏 |
| keyless 单测 | `pnpm test` | 全部 `src/lib/` 纯件与 `src/client/` 逻辑直测 |

命令与改动次序 = [guides/dev-loop.md §2](../guides/dev-loop.md)「改驾驶舱」行；判据 = [evaluation](../testing.md)。

<a id="defensive-redlines"></a>
### 5.1 防御式与契约红线（`vendor/dsh/docs/defensive-patterns/` 本地化）

| 上游规则 | 本仓落点与具体禁止 | 机检防线 |
|---|---|---|
| One value states one fact | `ArtifactState` / `StepSignal` / `BriefInputs` 等判别联合；禁止用 `null`/`undefined` 混指未查询/缺席/读失败/非法 | `semantic-guardrails.test.mjs` + `tsc` |
| Honor public contracts on BOTH sides | `readArtifact` 为唯一 `RunView.read` 入口且 JSON 强制传 `{ decoder }`；Skill/模板样例与门禁 parser 双向对账 | `semantic-guardrails.test.mjs` + `skill-parser-contract.spec.mjs` |
| Identity, initial state & disposal | 异步状态收进纯 Reducer + 原子 `reset-session`；`AbortController` 必 `.abort()` 回收；`catch` 禁静默吞错（例外标 `@silent-catch:`） | `semantic-guardrails.test.mjs` + Reducer/Feed 行为测试 |
| Narrow injection face / Timing correctness | 页签组件通过 `*Injected` 窄接口注入；状态流转靠显式 `dispatch`，不依赖 `setTimeout` 时序 | `client-keys` / `client-effect-wrap` + 组件测试 |

## 6. 已知限制与延后工作

- **项目默认只存 `depth`/`output`/`source`**：方法默认仍在方法库；lens/语言/跨 workspace 默认留 v2；启动空会话不自动复用（触发 = [_backlog/triggers.md](../../_backlog/triggers.md)）。
- **独立 oracle 保留**：`run-dashboard` 与 `client-load-reference.support` 保持独立，不复用 `run-context`（[run-context Note](../../notes/implemented/2026-10-23-run-context.md)）。
- **问卡窄列补丁**：`src/client/index.ts` 按 `data-question-key` 注入窄列换行规则；vendor 卡头自带换行后移除。
- **失败态与空态严格分流**：新增观察面读取路径必须沿用 `ArtifactState` 五态，严禁 `catch` 后落回空态；终稿版本账（`final/vN`）≠ 交付凭证（`present`）；`task_id` 空白的 plan 节点固定显式报「状态未知」。
- **右栏会话绑定与范围**：会话须建在研究工作区才有渐进面；vendor 切会话后右栏偶发滞留上一会话需收起重开；`present` 见证仅覆盖最近 journal 窗口；左栏会话行徽标因缺 Host 聚合态延后；G6 跨会话串联归 vendor UI（历史链 = [cockpit-flow-face](../../notes/archived/2026-09-28-cockpit-flow-face.md)）。
- **版本兼容**：`engines.dsh` = `>=0.2.1-rc.2 <=0.2.1-rc.5`（已测基线 `0.2.1-rc.2` / `rc.3` / `rc.5`；`rc.4` 在区间内未单独取证）。

## 7. 演进链（指针，不是设计合同）

选型与输掉的方案住 `notes/`：
[ui-observability-surfaces](../../notes/archived/2026-09-24-ui-observability-surfaces.md) → [observability-gui](../../notes/implemented/2026-09-24-observability-gui.md) → [research-status-ui](../../notes/archived/2026-09-25-research-status-ui.md) → [bundle-face-wiring](../../notes/archived/2026-09-26-bundle-face-wiring.md)
→ [right-pane-ux-debt](../../notes/archived/2026-09-28-right-pane-ux-debt.md) → [cockpit-naming](../../notes/archived/2026-09-28-cockpit-naming.md) → [cockpit-ux-ui-native-upgrade](../../notes/implemented/2026-11-26-cockpit-ux-ui-native-upgrade.md)。
