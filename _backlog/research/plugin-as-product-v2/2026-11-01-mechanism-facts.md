---
topic: plugin-as-product-v2
intent: 列出目标形态依赖的机制事实、证据出处与等级，区分 DSH 合同、实现细节与未验证项
---

# 机制事实

**等级**：**C** = DSH 文档 / 类型 / 源码合同；**T** = 本仓或 FAQ 26 隔离实验实测；**U** = 未验证，不得当承诺。

pin：`vendor/dsh` = `687f282e86`（submodule tag 见根 AGENTS §DSH 源码表）；FAQ 26 的研究 checkout 是更新的 rc.3（来源标注见该目录 `00-question.md` 文件头）。冲突以 vendor 源码为准，并标注差异。

## 启动与 profile

| # | 事实 | 证据 | 级 |
|---|---|---|---|
| 1 | 受支持的 Node 启动只有 named profile；外层最多一个薄 bootstrap，最终 `exec dsh --profile <name>` | FAQ 26 `50-launch/40-profile-integration.md` §启动入口；`50-launch/00-index.md` §先给结论 | C |
| 2 | `dsh plugin --profile <new>` 对未知名 profile 只初始化 `dsh-base`；Web 产品须先 `--from-default-profile web` | FAQ 26 `10-foundations/18-install-upgrade.md:31-45`；本仓实验 12 | C/T |
| 3 | `--from-default-profile` 是破坏性重置（换 dependencies 与用户 patch）；只在全新 profile 用 | FAQ 26 实验 11；`40-profile-integration.md:156` | C/T |
| 4 | 补丁序：ordered bundle patches → profile patch → home patch → CLI `--patch`；行 `config` 整份替换、不深合并 | `vendor/dsh` app-boot README；FAQ 26 `10-foundations/17-config-layers.md`；实验 5 | C/T |
| 5 | "装成功"三状态：pnpm exit 0 / dependency 写入 / 进 `dsh.profile.bundles`；只有第三个让功能存在 | FAQ 26 `30-external/37-lifecycle-stages.md` #3；`10-foundations/18-install-upgrade.md:19-27`；实验 32 | C/T |
| 6 | home 层能覆盖、不能供货；插入未装包 → dump 有行、真启动 `ERR_MODULE_NOT_FOUND`，服务照常起 | FAQ 26 `17-config-layers.md` §home 层；`37-lifecycle-stages.md` #5；实验 33 | C/T |
| 7 | `--dump-config` 只合成补丁栈，不 import 模块；dump 有 row ≠ 能跑 | FAQ 26 `17-config-layers.md` §dump 与真启动 | C |
| 8 | 启动失败分三级：bundle skipped / row pending / row import 失败（`did not activate`）；进程都活着 | FAQ 26 `37-lifecycle-stages.md` §② | C/T |
| 9 | web app args 整条归 shipped `web-startup`；新增产品 flag 必须替换它并重实现全部 web flags，漏实现静默降级 | FAQ 26 `40-profile-integration.md` §命令行所有权；实验 19/20/26 | T |
| 10 | CLI `dsh plugin` 不能管理 `desktop` profile；Desktop 由 Electron 独占 | FAQ 26 `37-lifecycle-stages.md` #2；实验 9/34 | C/T |
| 11 | 应用内 Plugins 页安装是"当前 profile 相对"的，无 profile 参数；web 与 Desktop 同一句 | FAQ 26 `37-lifecycle-stages.md` #1；`18-install-upgrade.md:9-17` | C |

## 工作区、会话与首屏

| # | 事实 | 证据 | 级 |
|---|---|---|---|
| 12 | `workspaceRegistry.create(path, title)` 要求绝对路径且目录已存在；同路径幂等；registration 只服务导航/分组，不给文件权限 | FAQ 26 `10-foundations/15-four-spaces.md` §用户项目目录；`16-startup-resolution.md` §Workspace 何时需要登记 | C |
| 13 | `sessionController.create({ workspaceId?, cwd?, sessionId?, agentPreset? })`：`workspaceId` 与 `cwd` 互斥；workspace 路径覆盖 cwd 并 attach；`sessionId` 只在仍是 blank、未归档（且是 workspace 成员）时复用；`agentPreset` 覆盖被复用会话的记录 | `vendor/dsh/packages/api/session-controller/src/types.ts:288-300`；`src/commands.ts:111-150` | C |
| 14 | **Host 建会话不保证早于 Web 服务**：`webserver` 在自己的 fiber 激活里 `listen`，没有 readiness gate；只有 `appReady` 与 api-gateway 的 Remote stream 是晚绑定。creator row 必须排在 webserver 前且被它传递依赖才成立 | `vendor/dsh/packages/host/webserver/src/index.ts:517`；`apps/cli/src/profile-boot.ts:44-66,344`；`packages/boot/app-boot/src/index.ts:1240` | T |
| 15 | Host `create` 不改 Client 当前选择；全新 context 可能自动选中最新 blank；返回用户保持 `dsh.sessions.current` | FAQ 26 实验 29/30；`40-profile-integration.md` §workspace 与 session | T |
| 16 | 确定性选中 = client 调 `ctx.uiWorkspace.openSession(sessionId)`；**没有** Host→client 的"打开某会话"事件——转发事件白名单是 `@deepseek-ai/dsh-api-remotes` 里一个不可合并的数组。可用 `api-session/added`（`SessionSummary` 带 `cwd` / `blank`）或 client 自己建会话 | `vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts:44,276-278`；`packages/api/session-controller/src/remote-events.ts:4`；`packages/api/remotes/README.md:43-47` | C（无导航事件 = T） |
| 17 | 原生首启只有 token 门：`dsh web` 打印 token URL；无 token 401；带 token 303 + 30 天 HttpOnly cookie → SPA；无欢迎页/向导 | FAQ 26 `16-startup-resolution.md` §首启不是安装；`37-lifecycle-stages.md` #6 | C |
| 18 | `settings.onboarding` 是设置面板的 step 账本，一次挂一个；`welcome-notice` 在 Desktop 不注册 | FAQ 26 `16-startup-resolution.md`；`37-lifecycle-stages.md` §④ | C |
| 19 | 读取不受 `workspace-write` fence 限制；`working_directory` 改有效目录，不改 `header.cwd` 或 writable roots | FAQ 26 `10-foundations/14-artifacts.md`；`17-config-layers.md` §app 参数与 config | C |
| 20 | `present` 记绝对路径、不复制；不要求 Workspace registration；会话导出不含被 present 的文件内容 | FAQ 26 `10-foundations/14-artifacts.md` §present | C |
| 21 | 首屏/onboarding 的载体：`shell.overlay` 是 frame-wide additive 座位（Desktop onboarding 用它）；`conversation.hero.*` 是 blank-session 起步区 | `vendor/dsh/packages/client/ui-layout/src/client/index.ts:105`；`packages/client/ui-conversation/src/client/contract/slots.ts:258-268`；`docs/subsystems/slots.md` | C |
| 22 | `--patch <file>` 可在每次启动（含 web）使用，但必须排在 app args 之前（之后的 token 归 web-startup）；缺文件抛错 | `vendor/dsh/apps/cli/src/args.ts:100-104,170`；`packages/boot/app-boot/src/index.ts:520-540` | C |
| 23 | `--from-default-profile web` 是破坏性重置：旧依赖与旧 user patch 一起删；只在全新 profile 用 | `vendor/dsh/apps/cli/src/profile-boot.ts:112-175`；`packages/boot/plugin-manager/src/operations.ts:545-560` | C |

## 内容注入

| # | 事实 | 证据 | 级 |
|---|---|---|---|
| 21 | `agent-instructions` 只从 cwd 链发现候选文件（project root → session cwd），加 `$DSH_HOME/AGENTS.md` / `$DSH_AGENTS_HOME/AGENTS.md`；`instructionFileCandidates` 只是文件名，没有绝对路径配置 | `vendor/dsh/packages/context/agent-instructions/README.md` §Configuration | C |
| 22 | `ctx.systemPrompt.section({ name, order, text, interpolate })` 可注册系统提示段；`ctx.systemPrompt.context({...})` 注册 runtime context（durable user-role 快照）；`ctx.systemPrompt.variable(name, provider)` 注册插值变量 | `vendor/dsh/packages/core/system-prompt/src/index.ts:478,513,561`；README §Contribute a prompt section / variable | C |
| 23 | 先例：`harness-dev-context` 用同一套 API 从包内文本注入两段 prompt section + 两条 runtime context | `vendor/dsh/packages/context/harness-dev-context/src/index.ts:141-160` | C |
| 24 | 外部贡献可用任意有限 order；`interpolate: false` 保留字面量；未知 `{{…}}` 引用会让组装 fail loud | `vendor/dsh/packages/core/system-prompt/README.md` §Contribute a prompt section | C |
| 25 | preset 的 `config.plugins` 可挂包内子路径插件（`dsh-deep-research-pack/...`），skills 用 `customSkillDirs` + 包内绝对路径 | `packages/deep-research-pack/presets/lead.patch.yml`（skill-filesystem 行）；vendor skill-filesystem README | C |

## 本仓现状（改动前）

| # | 事实 | 证据 | 级 |
|---|---|---|---|
| 26 | launcher 已默认 `deep-research` profile，但文档/分发以 `web` 为主 | `scripts/launch.mjs:61` vs `docs/decisions.md:56` | C |
| 27 | Host 行只在 env 存在时注册工作区；env 缺席零行为 | `src/workspace-boot/index.ts:28-30` | C |
| 28 | 种子 62.3 KB + `seed.json`（12 个 sha256 + policy），由 `dev/sync-pack-workspace.mjs` 从 `research-workspace/` 同步进包 | `packages/deep-research-pack/workspace/`；`scripts/verify/gates/e-workspace.mjs:161-170` | C |
| 29 | `scaffold` 的 `--profile` 默认是开发镜像 `research` | `scripts/scaffold.mjs:36` | C |
| 30 | 种子版本与包版本焊死；改结构不升版本 = 导出红 + preflight 报落后 | `scripts/dist/export-dist.mjs:89-90`；`scripts/preflight.mjs:276` | C |

## 未验证项（不得写进用户承诺）

- ~~产品 remote `researchSetup`~~：S2 spike 结论 = Typert 生成物不在本包构建链；改用 DSH 既有 workspaces/sessions/uiWorkspace 客户端服务，不新增 Remote。
- client 加载后自己 `session.create` → `openSession` 的完整链路（FAQ 只分别证了 create 与 openSession；本仓未跑过 client 插件建会话）。
- runtime context 注入 18.5 KB 手册的**体积行为**（是否被截断/推高首轮成本）与真模型是否仍按手册工作；降级路径 = 隐藏目录种子。
- `shell.overlay` 上的 onboarding 在窄屏/多面板下的实际可点性（真浏览器冒烟）。
- Desktop / Windows / 正式 npm registry 发布。
