---
topic: plugin-as-product-v2
intent: 给出目标产品形态的完整合同——入口、profile、工作区、内容/产物边界、首屏与数据归属
---

# 目标形态：产品 profile + 启动期工作区 + 内容/产物分家

## 一句话

一个 bundle（内容全在包内）+ 一个产品 profile（`deep-research`）。安装与启动全走 DSH 自己的命令；工作区在**每次启动时**由 bundle 的 client 首屏解析或询问；产物（run bundle / 方法库 / 归档）落在工作区。**没有第二个可执行文件。**

## 1. 安装、启动、首启：全部 DSH 原生

| 阶段 | 命令 | 谁做什么 |
|---|---|---|
| **安装（首次）** | `dsh --profile deep-research --from-default-profile web --dump-default-config` → `dsh plugin --profile deep-research add <pack> <team@version>` | 全部 DSH 命令；建 profile 用 shipped web 模板；装 bundle 与团队层用 `dsh plugin`；不手写 profile、不新增安装器、不直接调 pnpm |
| **启动** | `dsh --profile deep-research` | 纯原生；bundle 的 Host 行读产品设置并登记工作区；Lead 会话由首屏 client 建/选 |
| **首启** | 浏览器打开 token URL | 产品首屏 onboarding 问工作区；选完写入产品设置；下次直接进 |
| **更新** | 产品内 Plugins 页（默认，跨面）或 `dsh plugin --profile deep-research add <new>` | 重启 profile 生效 |
| **互操作** | 把同一个 bundle 装进现有 `web` profile | bundle 自足，首屏照样问工作区；但没有自己的 profile 身份——文档只留一行 |

**唯一合同**：产品身份 = `deep-research` profile；工作区 = 产品设置里的那一个；bundle 在启动时自己解析，不依赖 env、不依赖 launcher。

**为什么没有 launcher**：

- FAQ 26 `37-lifecycle-stages.md` #7：启动体验不必另造 launcher——首屏注入、预置会话、工作区都在 host/client 服务层，写在 bundle 里即可。
- 上一轮的经验：第二个入口是漂移源（D38 launcher 与 D39 web-profile 两套主叙事）。
- 安装那两步没有 DSH 之外的机制：`--from-default-profile` 与 `dsh plugin` 都是 DSH 命令；把它们写进手册，比包一个"安装器"更尊重 DSH。
- 用户授权（2026-11-01）：做对最重要、不做兼容、安装必须尊重 DSH → 删除 launcher/scaffold，只留只读 doctor。

**为什么首次安装是两步**：`dsh plugin` 给未知名 profile 只初始化 `dsh-base`（FAQ 26 `10-foundations/18-install-upgrade.md` §CLI 自动化路径；实验 12）；没有 web-app 的 profile 起不了 Web。DSH 没有"一步建 web-backed custom profile"的命令；`--from-default-profile web` 就是它给的路径。不发明安装器。

### 生命周期四阶段对账（FAQ 26 `30-external/37-lifecycle-stages.md`）

| 阶段 | DSH 原生合同 | 本产品选择 | 偏差 / 说明 |
|---|---|---|---|
| **① 装** | 应用内 Plugins 页（当前 profile，无参数，跨面）；CLI `dsh plugin --profile` 仅 web 自动化；"装成功"三状态 | 首次用两步 DSH 命令建 `deep-research` profile + 装 bundle/团队层（文档标"仅 `dsh web`"）；之后在产品内 Plugins 页更新 | 无自定义安装器；唯一"特别"是产品有自己的 profile 名。装成功以 roster 为第三状态核 |
| **② 起** | named profile；profile 四件套 + 有序 patch；CLI 装完须重启；失败三级 | `dsh --profile deep-research`；真启动验收 stderr 无 `did not activate` | 无 |
| **③ 配** | bundle → profile → home → `--patch`；settings / 自有文件 / localStorage 各有作用域；home 能覆盖不能供货 | 产品默认值在 bundle patch；工作区与上次会话放 `$DSH_HOME/deep-research/settings.json`（产品状态，不是 DSH row config）；不使用 home 供货；不把 localStorage 当配置 | 产品设置不是第二套 DSH 配置真值——Settings UI 不暴露工作区 |
| **④ 首启** | token URL → 303 + cookie → SPA；无欢迎页/向导；`settings.onboarding` 只是设置面板的 step | 首屏由 client 行回答：产品名 + 当前工作区 + 起步卡；未设置时给目录选择器；不依赖 `welcome-notice`；首启可推迟 | 无 |

**一句话**：安装/启动/首启全部走 DSH 的四个阶段；产品只在 ③ 里加一个自己的状态文件，在 ④ 里回答首屏。

## 2. profile

- 名字 `deep-research`；`--profile` 可覆盖（dev / 多实例）。
- 组成：`@deepseek-ai/dsh-base` → `@deepseek-ai/dsh-web-app` → `dsh-deep-research-pack` → `@deepseek-ai/dsh-experimental-agent-team-profile`。
- 只在 profile 不存在时 `--from-default-profile web`；已存在只补缺，不重置。不是 Web-backed 的 profile → doctor 报红，不静默重建。
- "装成功"按三个状态核（FAQ 37 #3）：pnpm exit 0、dependency 写入、`dsh.profile.bundles` 含包。doctor 读第三个；安装冒烟（`install-shape-smoke`）读第三个。
- 升级：`dsh plugin --profile deep-research add <new>` 或产品内 Plugins 页；重启 profile。doctor 报告"安装副本版本 ≠ 包版本"。
- 版本门：`engines.dsh` + `dsh.compatibility.dshReleases` 都写。
- 真启动验收（FAQ 37 发布前判据 3）：stderr 无 `did not activate` / `skipping profile bundle`；`--dump-config` 有 row 不等于能跑。

## 3. 工作区

### 解析顺序（每次启动都走）

1. `DEEP_RESEARCH_WORKSPACE`（脚本 / CI；只覆盖本次，不写设置）
2. 产品设置里的 `workspace`
3. **首屏 onboarding 询问**（bundle 的 client 行；目录选择器走 DSH 的 native/browse capability）
4. 无解：不建会话、不落 DSH 默认工作区；首屏显示"选工作区"。没有 CLI 询问——询问是产品首启的一部分，归 bundle。

### 设置文件

`$DSH_HOME/deep-research/settings.json`：

```json
{ "schemaVersion": 2, "workspace": "/abs/dir", "sessionId": "session-…", "updatedAt": "ISO" }
```

- **home 级而不是 profile 级**：Host 行拿不到当前 profile 名（CLI 没有把它暴露成 env 或服务）；home 级是 FAQ 26 允许的"产品自建 `$DSH_HOME/<plugin>/` 路径约定"。一个 home 一份产品状态；`--home` 天然隔离；删目录即重置。多 profile 共享同一设置——文档写明。
- 一个 owner（产品）；文件写者 = Host 启动行（`sessionId`）与 doctor 之外的显式设置；GUI 不写文件，只写一个 localStorage 提示键（设备级）。原子写、last-wins、无秘密。
- 不是 DSH Settings（避免"两套真值"：Settings UI 不暴露工作区）。
- 列入备份/卸载说明。

### 项目目录

- 用户选 `<dir>` 就是工作区，产品不改写。若 `<dir>` 非空且像项目（`.git` / `package.json` / `AGENTS.md`），询问时把 `<dir>/research` 作为推荐项（默认高亮），但不静默改写；用户选 `<dir>` 本身 = `drt_*` 落在项目根，文档写明。
- 危险目录（HOME / DSH_HOME / pack / profile 本身、祖先、内部）拒绝。
- 目录不存在：交互路径允许"创建"；非交互路径要求已存在（`workspaceRegistry.create` 要求目录存在）。
- 不写 `.gitignore`；工作区是 git 仓库且缺研究数据忽略规则时，打印一行建议，不改文件。

### 启动期动作：Host 只登记，Client 建/选会话

**为什么不在 Host 建会话**：`webserver` 在自己的 fiber 激活里就 `listen`，没有 readiness gate；`appReady` 只保证树已 settle。Host 建会话只有"creator row 排在 `webserver` 之前且 webserver 传递依赖它"时才成立，不是结构保证。所以把会话创建与选中放在 **client**（DSH 自带 ui-workspace 的首次使用就是这个模式）。

**Host 启动行**（boot 期，可靠）：

1. 读产品设置（`DEEP_RESEARCH_WORKSPACE` 只覆盖本次）——无 → 不登记、不建会话，首屏走 onboarding。
2. `stat` 目录；失败 → log error，不创建。
3. `workspaceRegistry.create(path, "Deep Research — <basename>")`（同路径幂等，只登记）。
4. 不新增 Remote（S2 spike 结论：Typert 生成物不在本包构建链里）。首屏用 DSH 既有客户端服务：`workspaces.create` / `sessions.create` / `uiWorkspace.startSession` / `uiWorkspace.pickDirectory`；GUI 的产品工作区记忆只写一个 localStorage 提示键（设备级，不是账本）。
5. 失败只影响产品行：log 清楚，不阻断 DSH 启动；首屏显示"未就绪"。

**Client 启动行**（页面加载后，可靠）：

1. 等 `workspaces` / `sessions` 列表 ready；读 localStorage 提示键与 `dsh.sessions.current`。
2. 有 `workspace`：`uiWorkspace.startSession(workspaceId, { agentPreset: 'lead' })`（blank/同目录复用；否则新建）；当前会话已在该目录则不切。
3. 无 `workspace`：起步卡的「选择项目目录」按钮 → `uiWorkspace.pickDirectory()` → `workspaces.create({ path })` → 写提示键 → `startSession`。browse-only 部署失败时显示错误、不假装成功。
4. 监听 `api-session/added`（已转发的 `SessionSummary` 带 `cwd` / `blank`）：Host/其他入口新建的产品会话出现时，若当前会话不在产品工作区，显示横幅或自动切（P1 自动切）。

**新产品面的边界**：Host 启动行只读设置/登记工作区 + best-effort 建会话；client 只用 DSH 现有服务做导航与目录选择；浏览器只写 `dsh.deep-research.workspaceId.v1` 一个提示键。不写 DSH patch、不声明 storage domain、不新增 session event。它是继驾驶舱（D18）、抓取回退（D31）之后的又一处有界产品面。

### 多工作区

- 设置只记最后一个；切换 = 首屏 onboarding / 换工作区入口。历史 run 留在各自工作区。

## 4. 内容 / 产物边界

**总则**：包内 = 随版本变化的只读内容；工作区 = 用户生成、可带走、可备份的东西。

| 内容 | 现在 | 目标 |
|---|---|---|
| persona / skills | 包 | 包（不变） |
| 研究手册（AGENTS.md） | 包 + 复制到工作区，由 agent-instructions 从 cwd 链注入 | **包** `content/manual.md`；Host 行用 `ctx.systemPrompt.context()` 注入（durable user-role 快照，`interpolate: true`），不落工作区 |
| NODES 节点契约 | 包 + 复制 | **包**；Lead 的一个 skill（按需加载） |
| question-patterns 判型库 | 包 + 复制 | **包**；Lead 的一个 skill（按需加载） |
| run 模板 8 件 | 包 + 复制 | **包** `content/templates/run/`；手册给出 `{{research_pack_root}}/…` 路径，角色直接 read |
| method-library.md | 包种子 + 复制 | **工作区**（用户数据；首次保存时由工具创建；不预置） |
| run bundle / archive / _abandoned | 工作区 | 工作区（不变） |
| seed.json / .dsh-research-seed.json / .gitignore / scaffold | 包 + 工作区 | **删除**（无种子、无账本、无 scaffold、无 gitignore 写入） |
| 产品设置 | profile 目录 | profile 目录（不变） |

### 为什么手册走 runtime context 而不是 workspace AGENTS.md

- `dsh-agent-instructions` 只从 cwd 链发现 `AGENTS.md`/`CLAUDE.md`，没有绝对路径配置（vendor `packages/context/agent-instructions/README.md` §Configuration）。上一轮因此把手册复制进工作区。
- `ctx.systemPrompt.context()` 是 DSH 系统提示注册表提供的正式 seam：带 order、可插值、成为 durable 的 user-role 快照，模型可见且可重建（model-visible ⟺ logged）。`harness-dev-context` 就是同一用法（vendor `packages/context/harness-dev-context/src/index.ts:141-160`）。
- 用户的 `<project>/AGENTS.md` 仍由 agent-instructions 照常注入；产品手册与项目指令并存，手册里写明"项目指令优先"。

**插值**：Host 行注册 `research_pack_root` 变量（安装副本绝对路径）；手册与模板引用用它，避免写死本机路径。

## 5. 首屏

- **载体**：`conversation.input.dock` 的起步卡（现有 StartCard）加「选择项目目录」按钮；不另造 `shell.overlay`（S2 收窄：最小可用路径优先，避免新槽位与浏览态分叉）。
- **内容**：产品名 + 当前工作区 + "问一个研究问题"；未设置时是"选项目目录"。
- **动作**：选目录 → `workspaces.create` → `uiWorkspace.startSession`。client 不直写文件；产品设置文件只由 Host/doctor 读写。
- **错工作区**：当前会话的 `cwd` ≠ 设置工作区时，横幅提示 + 一键切到产品会话（`openSession`）；自动切 P1。
- **凭据提示**保留（无 key 也能用账号登录；不硬拦）。
- **不依赖** `settings.onboarding`（FAQ 37 #6）；不做皮肤；不新增模型可见事实。
- **会话选中不是 Host 保证**：client 自己建/选（§3）；`api-session/added` 只作补充信号。

## 6. 数据卡（产品版）

| 事实 | owner | 位置 | 卸载后 | 可移植 |
|---|---|---|---|---|
| 角色 / preset / skill / 手册 / 模板 / 启动行 | 包 | profile `node_modules/dsh-deep-research-pack/` | 删 | 随包 |
| 产品 profile（composition + 团队层） | 用户用 DSH 命令创建 / DSH 拥有格式 | `$DSH_HOME/profiles/deep-research/` | 保留或显式删 | 随 profile |
| 产品设置（工作区 / 上次会话） | 产品 | `$DSH_HOME/deep-research/settings.json` | 删目录即重置 | 仅本机（不随 profile 走） |
| run bundle / archive / _abandoned | 用户 | `<workspace>/drt_<slug>/` 等 | 保留 | 随 bundle |
| 方法库 | 用户 | `<workspace>/method-library.md` | 保留 | 随工作区 |
| Workspace registration | DSH | `$DSH_HOME/storages/workspace.json` | 不自动删 | 仅本机 |
| Session 历史 | DSH | `$DSH_HOME/sessions/` | 不自动删 | 仅本机 |
| 凭据 | DSH / provider | `$DSH_HOME/.credentials.yaml` / env | 不自动删 | 仅本机（不导出） |
| 浏览器侧栏布局 | client | localStorage（vendor 键） | 清站点数据 | 仅本机 |

- 运行时插件代码对 `$DSH_HOME` 的写入只剩产品设置文件（无秘密、可删）；不声明 storage domain、不新增 session event。
- 工作区里没有产品内容文件；`drt_*` 与方法库由研究过程产生。

## 7. 输掉的方案

**A. 继续 D39（bundle 装进 web profile + env）**：输在产品无身份、工作区前置、内容复制；痛点见诊断。不作备选。

**B. 保留种子，但塞进 `<workspace>/.deep-research/` 一个隐藏目录**：比 A 干净，但仍有两份内容、版本账本与合并语义；"内容全在包内"仍不成立。作为内容改造的**降级路径**保留：如果 runtime context 注入被真模型档证伪（模型不按手册工作），退回 B，而不是退回 A。

**C. 自建第二层 app / 桌面壳 / installer**：违反 FAQ 37 #7 与 DSH 启动合同（named profile 是唯一受支持的 Node 启动方式）；安装只走 DSH 命令；不做。

**D. 手写 profile 目录 / 发布 profile**：代码巧合、无锁、无 pnpm 契约；不做。

## 8. 与既有决定的关系

- **D1**（自写包 = 1 个）不变：仍是一个包。
- **D7**（配置为主）边界：新增代码面 = 启动行（工作区登记/会话）+ 内容注入行 + 首屏 client 启动控制器；不新增 Remote。与 D18 驾驶舱、D31 抓取回退并列，需新 D 号明确边界与用途限定。
- **D17 / D28**（harness / run 分离）：harness 从"工作区里的种子"改为"包内内容"；run bundle 位置与状态判定不变。
- **D18**（驾驶舱）不变；首屏/onboarding 是产品启动面，不是第二处观察面套件。
- **D21**（意图分流）：产品入口从 `dsh plugin --profile web` 改为 `dsh-deep-research` / `dsh --profile deep-research`。
- **D34**（回执三态）不变。
- **D35**（种子 policy）随种子一起退役。
- **D38**：保留其机制（Host 注册、首屏思路、optional peers、产品设置文件），**修订**其"种子是部署副本"与"launcher"两处；launcher 删除。
- **D39**：**被取代**（默认 profile 与入口叙事翻回）。
- **D40 同时覆盖安装**：只用 `--from-default-profile` + `dsh plugin` + `dsh --profile`；不保留自定义安装器/launcher。
