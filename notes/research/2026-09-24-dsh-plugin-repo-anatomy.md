# DSH 插件开发仓库（ai_dsh_company）工程机制解剖

> 状态：**已完成** · 2026-09-24 · 参考插件仓的机制解剖；落点 = design/10 与 verify/env.sh。

> 归档注（2026-09-24）：本文为 R1 搭建前的消化产物（委派子代理对 `/Users/bowhead/ai_dsh_company/`
> 的考古）。吸收落点 = `docs/design/10-architecture.md`（组合层/通道/工具面）、
> `scripts/verify.mjs`（门禁移植）、`dev/env.sh`（双 home）、`docs/plans/roadmap.md`（队列制）。

## 1. 仓库分层总览

| 位置 | 职责 |
|---|---|
| 根配置 | `package.json`（scripts 三件：`dsh`=`node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts`、`verify`、`test`）、`pnpm-workspace.yaml`（本仓 + vendor 全树入 workspace）、`tsconfig.json`（extends vendor base，源码面解析）、`vitest.config.ts`（keyless 回归层）、`.gitmodules`、`.gitignore` |
| `packages/company-pack/` | 唯一自写包（D1：行多包少）：presets + bundle 行 + host/client 双半代码 |
| `company-workspace/` | 运行场：角色会话 cwd（AGENTS.md 公司手册、kb/、deliverables/、templates/） |
| `docs/` | 按性质分层：00-index 导航+决策台账、design/、plans/、guides/、顶层合同（profile/delegation/presets/demo/release.md） |
| `notes/` | 按时间分层：intents.md → proposed/ → implemented/ + postmortem/ + research/ |
| `scripts/` | verify.mjs 结构门禁 + 8 个认证档 `*-smoke.mjs` + sync-dsh.mjs + lib/（纯逻辑库：deliverables/playwright/rehearsal/session-log） |
| `tests/` | 6 个 keyless spec：presets/layering/client-face/delegation-card/deliverables/presence-board |
| `dev/` | env.sh 双 home、company.overlay.yml、harness-home/（dev DSH_HOME）、rehearsal-workspace/（排练场≠运行场） |
| `snapshots/` | 回放录制（r2-motion 等，replay-smoke 判据） |
| `vendor/dsh` | pinned submodule：dsh-v0.1.5-rc.2 @ fb2c4b9e698e30edb738bca4cf0618587db7d203，只读铁律 |

## 2. 插件包构成要件

**package.json 的 `dsh` 段**：
- `dsh.bundle.patch: "./cordis.patch.yml"`——plugin add 时并入 host 的默认行（host 共享面；角色差异在 presets/）
- `dsh.compatibility.dshReleases: ["dsh-v0.1.5-rc.2"]`——兼容矩阵，必须含当前 pin 的 tag
- `dsh.client: { inject: [官方 client/api 模块名…], platform: "web" }`——浏览器半依赖（informational only，不排序不 gate）
- exports 必须双半：`.`（host）+ `./client`（浏览器）；`files` 含 `lib/**`、`presets/**`、`cordis.patch.yml`；runtime 行依赖进 peerDependencies（pre-stable 不钉死）

**cordis.patch.yml 行语法**：`- id: X` 只替换 base/bundle 已有行（not found 即丢弃并警告）；**新增行必须 `- insert:` 子列表**（D12）。例：`agent-presets` 行用**替换**语法覆盖 web-app 出厂行（default: standard → ceo + 自定位 roots）。⚠ `baseUrl` = profile 目录（非包安装目录），roots 路径须写 profile 相对 `node_modules/dsh-company-pack/presets/`——写成 `presets/` 会 ENOENT 静默空、UI 无角色。`tool-present`/`agent-team`/`tool-agent-team`/`ui-agent-team`/本包 client 行走 insert。

**presets/<role>/ 三件套**：`preset.yml`（元数据）、`agent.cordis.yml`（角色组合行）、`skills/<name>/SKILL.md`（目录名=skill 名）。

**src host 面 vs client 面**：host 面 `src/index.ts` 可为空壳（`export function apply(): void {}`）+ 再导出纯函数；client 面 `src/client/index.ts` 注册 UI（`export const inject = ['slots','remote','sessions']` + `export async function apply(ctx)`，经 `ctx.inject([...], scoped => …)` 注册 slots：`sidebar.brand.name`、`conversation.session.header.actions`、`sidebar.right.pane.tab`（keyed）、`tool.call.toolview`（工具卡））。两半靠 `exports["./client"] ⟺ dsh.client` 对齐（verify 门禁 8）。

## 3. preset.yml 与 agent.cordis.yml 字段语义

**preset.yml**：`name`（显示名，如 `wochen CEO`）、`description`（一句话职责）、`order`（roster 排序）。preset id=目录名，须匹配 `/^[a-z0-9][a-z0-9-]*$/`。

**agent.cordis.yml row 类型**（CEO 实例）：
- `persona`（dsh-persona）：`config.prefix` 注 system prompt；可选 `complete: true`/`includeRuntimeContext: false`
- `skill-filesystem`（dsh-skill-filesystem）：`includeDefaultRoots: false` + `customSkillDirs: [!!js "…fileURLToPath(new URL('skills/', baseUrl))"]` → 角色技能硬隔离（不并入项目根/用户级）
- `tool-fs` / `tool-fs-search`（`sampleOverCapGlobResults: false`）/ `tool-skill` / `tool-todo`（`allowParallelInProgress: true`）/ `tool-ask-user` / `tool-present`——preset 是**自包含组合**（DSH 无 patch 继承），不声明则会话无这些工具
- `delegation` 组（`name: cordis:group, group: true, isolate.workflowEngine: true`）：内含多个 `tool-subagent` 行——`provider: spawn`、`toolName`（命名委托工具如 vp_eng）、`backgroundMode: one-shot`、`enableRunInBackground: false`、`maxDepth: 1`、`persona`（per-instance 人格）；通用 `subagent` 行用 `backgroundMode: continuable`
- `agent-instructions`（dsh-agent-instructions）：`maxBytes: 16384`、`projectRootMarkers: []`（projectRoot=会话 cwd，不向上认 .git，防把开发仓 AGENTS.md 灌进角色会话）

## 4. vendor/dsh 官方包清单（均 @deepseek-ai/ 前缀，按组）

- **web 组——网络工具存在**：`dsh-tool-web`（model-facing web 工具）、`dsh-web`（seam）、`dsh-web-fetch-http`（HTTP 抓取 provider）、`dsh-web-search-deepseek` / `dsh-web-search-exa` / `dsh-web-search-perplexity`（三家搜索 provider）
- **goal 组**：`dsh-goal`、`dsh-command-goal`、`dsh-goal-round-driver`、`dsh-tool-goal`
- **todo 组**：`dsh-tool-todo`（仅此一包）
- **skill 组**：`dsh-skill`、`dsh-skill-filesystem`、`dsh-skill-badge`、`dsh-tool-skill`
- **present**：`dsh-tool-present`（住在 fs 组）；UI 面 = client 组 `dsh-client-ui-deliverables`
- **subagent 组**：`dsh-subagent`、`dsh-tool-subagent`、`dsh-tool-subagent-control`、`dsh-subagent-acp/-claude-code/-codex/-dsh-sdk/-fork-in-process/-in-process-driver/-spawn-in-process`
- **agent-team（experimental 组）**：`dsh-experimental-agent-team`、`dsh-experimental-tool-agent-team`、`dsh-experimental-client-ui-agent-team`、`dsh-experimental-agent-team-profile`、`dsh-experimental-agent-team-web-profile`
- 其他：preset 组（`dsh-agent-presets`、`dsh-persona`）；context 组（`dsh-agent-instructions` 等）；fs 组（`dsh-fs/-local/-sandbox/-observation-policy`、`dsh-tool-fs`、`dsh-tool-fs-search`、`dsh-tool-str-replace-editor`）；interaction 组（`dsh-tool-ask-user`、`dsh-user-approval`、`dsh-commands`…）；workflow 组（workflow/ralph 工具）；bundle 组（`dsh-base/-headless/-web-app/-sdk-app/-acp-app/-sdk-minimal`）；client 组 40+ `dsh-client-ui-*`；另有 llm/shell/terminal/lsp/sandbox/jobs/compaction/session(-query)/settings/credentials/storage/workspace/sdk/acp/hooks/e2b/extensions/guard/feedback/schedule/identity 等组。权威索引：`vendor/dsh/docs/module-graph.md`（生成）+ `packages/<组>/README.md`

## 5. verify.mjs 门禁清单（9 组）

1. md-utf8/newline：全仓 .md 严格 UTF-8、恰一个结尾换行
2. md-links：docs/ + AGENTS.md + pack 文档内相对链接必须可解析
2b. notes-links：notes/ 全树同规则
2c. doc-budget：AGENTS.md≤115、00-index≤145、guides/60≤440 行
3. preset 结构：每角色 agent.cordis.yml + preset.yml + ≥1 skills/<n>/SKILL.md（frontmatter name=目录名）
4. claude-symlink：CLAUDE.md 是指向 AGENTS.md 的 symlink
5. vendor-pin/clean：submodule HEAD=簿记 SHA 且工作树零改动（只读铁律）
6. pack-bundle/compat：dsh.bundle.patch 指向真实文件；dshReleases 含当前 tag
7. preset-row-deps：preset 行引用的包（subpath 归一到包名）必须在 dependencies ∪ peerDependencies
8. client-half：exports["./client"] ⟺ dsh.client 一致；构建过则产物必须存在
9. proposal-scheduled/graduated：proposed/ 每提案必须在 roadmap 出现；状态行带终态字（已消化/已交付/部分交付）者必须毕业到 implemented/

## 6. 开发环境机制

- **dev/env.sh 双 home**：`export DSH_HOME=dev/harness-home`（数据面隔离，日用 ~/.dsh 不动）+ 定义 `dsh()` 函数拦截裸 dsh（代码面隔离：PATH 里的全局 dsh 会随升级漂移，一律 `pnpm dsh` 走 vendor 钉 tag 源码基线）
- **company.overlay.yml**：纯 headless 组合（无 agent-presets 出厂行可替换）时的实验 overlay——用 insert 行补 pack 的 roots/tool-present/agent-team 等；全 workspace 源码域解析，无 profile 安装混线
- **preset-smoke 为什么必要**：preset 失败发生在**会话创建挂载时**（Loader 逐行校验 config schema，任一必填缺 → 整 preset 挂掉）；roster 扫描只解析 YAML+包名、`--dump-config` 只打印树，都看不见，UI 还吞错（"点了没反应"）。唯一手段 = 走真入口：boot 真 web → token 换 cookie → `agentPresets/list`（roster 全、零 broken）→ 逐角色 `session/create` 真挂载 → 解析页面 `window.__DSH_BOOT__` 模块表（client inject 依赖必须是动态行或 shell baseline）。cwd 默认落 rehearsal-workspace

## 7. docs 与 notes 组织模式

- **docs 按性质分层，不按时间**（D10）：导航 00-index（文档地图 + 决策台账 D1–D23 + 待定 Q + 术语映射表）/ design 为什么（10-architecture、20-roles-isolation、30-ui-demo、40-role-content-plan）/ plans 接下来（roadmap，被实现逐阶段吞掉）/ guides 怎么操作（50-budget-and-ops、60-dev-loop）/ 顶层合同只写 now（profile.md、delegation.md、presets.md、demo.md、release.md）
- **notes 按时间**：`intents.md` → `proposed/`（非停车场：进门必须在 roadmap 有归宿）→ `implemented/`（日期+主题命名，如 2026-09-22-r1-close.md）+ `postmortem/`（0001–0003）+ `research/`
- 合同出生地图：不预建空文件，实现到哪生到哪

## 8. 从零搭建同类仓库最小步骤（有序）

1. `git init`；`git submodule add https://github.com/deepseek-ai/deepseek-harness.git vendor/dsh`；`git -C vendor/dsh checkout <钉住 SHA>`（tag+SHA 记进簿记，供 verify 门禁 5）
2. 写 `pnpm-workspace.yaml`：`packages/*` + `vendor/dsh/packages/*/*` + `vendor/dsh/apps/*` + `vendor/dsh/vendor/*` + `vendor/dsh/native/system`(+`packages/*`)；`linkWorkspacePackages: true`；overrides 把 cosmokit/schemastery link 到 vendor；allowBuilds/patchedDependencies 镜像 vendor 清单（node-pty patch）
3. 根 `package.json`：packageManager pnpm@11.7.0、engines node；scripts：`dsh`/`verify`/`test`
4. 根 `tsconfig.json` extends `./vendor/dsh/tsconfig.base.json`（composite:false、noEmit、files:[]）——否则 @deepseek-ai/* 解析进 lib/ 报 ERR_MODULE_NOT_FOUND；`vitest.config.ts` 用 vite-tsconfig-paths 走 src（防第二份模块单例）
5. 建包 `packages/<pack>/`：package.json（exports `.`+`./client`、dsh.bundle.patch/compatibility/client 段、peerDependencies 行依赖）+ `cordis.patch.yml` + `presets/<role>/{preset.yml, agent.cordis.yml, skills/<n>/SKILL.md}` + `src/{index.ts, client/index.ts}`
6. 构建配置：包内 tsconfig.json extends `../../vendor/dsh/tsconfig.base.client.json` 且 `paths: {}`（清 vendor paths）；`tsdown.config.ts` 双半——host 半 esm/node、external `/^@deepseek-ai\//`；client 半 cjs/browser、只 external react(+jsx-runtime) 与 `dsh-client-/dsh-api-` 前缀、包 `window.__ModuleLoader__.load({id, factory})` banner/intro/footer 外壳；先 `tsc -p`（出 lib/types）再 tsdown（出 lib/index.js + lib/client.js）
7. `dev/env.sh`（双 home + 裸 dsh 拦截）+ `dev/harness-home/`；headless 实验另备 overlay yml
8. 移植 `scripts/verify.mjs`（第 5 节按需裁剪；vendor SHA/tag 换成本仓簿记）
9. `tests/` keyless spec + `layering.spec.ts` 分层守卫（回归层禁 child_process/playwright/fetch/密钥/spawn、禁 import scripts/ 驱动脚本）
10. `docs/00-index.md` + `notes/{intents.md, proposed/README.md}` 骨架 + `ln -s AGENTS.md CLAUDE.md`
11. 实测闭环：`source dev/env.sh` → `pnpm dsh … plugin add <pack>`（或 profile 模板）→ 写 preset-smoke 认证档逐角色真挂载

（来源：ai_dsh_company 实读；vendor 包名引 `vendor/dsh/docs/module-graph.md`。注：本会话后期部分 bash/glob 调用被审批通道拒绝，vendor 各组包名改由 module-graph.md 与组 README 交叉核实，结论完整可靠。）
