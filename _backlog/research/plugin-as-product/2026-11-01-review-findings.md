---
topic: plugin-as-product
intent: 复核产品化研究与卡片——重述初衷、记录挑战点与打包 spike 结果、列出仍未透的未知
---

# 复核：摸透了吗？——初衷、挑战与 spike

## 0. 先把初衷放回桌上

我们不是要把一个插件包装成安装器；初衷是**让 Deep Research 这支研究团队成为一个用户可直接使用的产品**：

- 用户不需要懂 DSH profile、bundle、patch、team layer；一条命令进入产品。
- 启动时知道或询问工作区；插件的全部能力施加到用户手上的那个目录。
- 插件内容（角色、方法论 skill、驾驶舱、抓取、种子、部署脚本）留在插件里，不要求用户拿仓库 checkout。
- 生产现场（run bundle、方法库、归档、交付回执）留在用户工作区；用户能打开、能带走、能备份。
- 产品要像产品：首屏知道从哪开始，研究过程有 HITL 与驾驶舱，交付有终稿；不是"起了一个 DSH 空白会话，用户自己猜"。

技术方案（launcher + 产品 profile + Host 注册）只是达成这个体验的手段。复核卡片时，判断标准不是"DSH 机制是否讲对"，而是"用户是否真的得到这个产品"。

## 1. 这次复核挑战了什么

### 1.1 启动器不是产品，首屏 UX 在卡里是缺的

原卡片花了大量篇幅讲 profile 装配、workspace 注册、数据归属，但**没有回答用户打开浏览器后看到什么**。当前默认结果 = 一个 blank Lead Session + 标准 DSH 聊天框 + 右栏"研究状态"页签（无 run 时是空的）。用户不知道：

- 这是 Deep Research 产品，不是普通聊天；
- 该直接问研究问题；
- Lead 会先问三问（HITL1），不是马上开跑；
- 右栏"研究状态"是过程观察面，交付在"终稿"页签；
- 当前工作区是哪个、怎么换。

**处置**：新增子卡 D（产品首屏体验），要求首屏有产品名/品牌、工作区指示、起步指引（问一个问题；会先被问三问）、凭据提示、驾驶舱/终稿入口说明；用现有 client slot（`conversation.input.dock` / `conversation.hero.*`）实现，不新增模型可见事实、不做皮肤。验收用真浏览器 smoke。

### 1.2 多工作区 / 已保存会话会抢首屏

Host 插件登记工作区后，Web Client 的 `restoreSelection` 优先恢复浏览器已保存的 Session（可能属于另一个 workspace）；只有在没有 saved selection 时才选 recent workspace。**新 home 首装没问题；已有 DSH 使用史的用户可能打开在错误工作区。**

**处置**：P0 明确"新 home/无 saved selection 保证选中启动工作区"；已有 saved selection 时，产品必须给出可见的工作区指示/一键切换（子卡 D），不能静默打开错误工作区。自动选中 launch workspace 作为 P1，需要 client 侧读 Host 的 launch 状态或 URL 参数，先不承诺。

### 1.3 打包：全局安装 peer 冲突（已用 spike 证实）

原卡片把"单包 + optional peers"写成待实测的推荐。复核时做了 dry-run：

- **不加 optional peers**：`npm install --dry-run` 直接 `ERESOLVE`——registry 上的 `@deepseek-ai/*` 已到 rc.5，而本包 peer ranges 与 rc.2/rc.5 混合，npm 解不出树；全局安装根本装不上。
- **加 `peerDependenciesMeta.*.optional: true`**：dry-run 只 `add dsh-deep-research-pack 0.1.3`（1 个包），真实本地安装也只装 1 个包，bins 链到 `node_modules/.bin`。

**结论**：optional peers 不是可选项，而是全局 launcher 分发的必需条件；profile 内的 `dsh plugin add` 用 pnpm 的 `autoInstallPeers: false`，不受影响。`package-contract` 要钉住"所有 peer 都 optional"并写理由。仍需补测真实 `npm i -g` 的全局 bin 链接与 launcher 运行。

### 1.4 "插件内容都在插件内"与种子副本

严格读"所有内容在插件内"，会把工作区里的 `AGENTS.md`/`NODES.md`/模板也视为不该存在。但 DSH 的 `agent-instructions` 只从会话 cwd 链发现文件，不能从包内指定绝对路径；研究手册必须落在工作区才能被注入。

**处置**：在父卡与文档里明确两层：

- **包内**：presets/skills/launcher/scaffold/preflight/seed 源/驾驶舱/fetch provider——只读源。
- **工作区**：种子是**部署副本**，落地后归用户、可编辑；它不是第二份权威，包内 `workspace/` 是源，`pack-workspace-fresh` 保持同步。

如果用户要求"手册也只读、不许落到工作区"，那是另一套机制（自定义 instruction loader / 把手册注入 persona），本方案不选；需要单独拍板。

### 1.5 项目模式的 sandbox 边界没有说透

`workspace-write` 的根 = Session `header.cwd`。若选 `<project>/research` 作工作区，agent 能读项目（读取不受写入 fence 限制），但**不能写项目根**；它只在研究子目录里写。若用户期望 agent 直接改项目文件，必须 `--in-place`（工作区 = 项目根，手册/种子落在项目根）。卡片要把这个后果写成用户可见的选择，而不是埋在"项目模式"里。

### 1.6 共享 home 的会话/工作区可见性

产品默认用用户 `$DSH_HOME`（凭据/会话连续），但 Web UI 会列出这个 home 里所有 workspace/session，不只是产品的。产品化不能假装 profile 隔离数据。**处置**：父卡新增 Q6：共享 home 默认 + `--home` 可选隔离；文档写明共享 home 的可见性；不承诺"产品私有"。

### 1.7 项目已有 `.gitignore` 时，run bundle 可能被提交

种子的 `.gitignore` 是 user-owned，scaffold 不覆盖已有文件。项目根（或 `<project>/research`）已有 `.gitignore` 时，`drt_*`/`archive/`/`method-library.md` 不会被自动忽略，用户可能把研究数据提交进项目。**处置**：产品不静默改用户 `.gitignore`；启动器检测到已有 `.gitignore` 时打印建议规则，提供显式 `--gitignore-append`（需用户确认）或文档说明；工作区数据卡写清"git 跟踪规则是用户责任"。

### 1.8 文档预算与 `_dist` 生成物

根 README 只剩 1 行、AGENTS 只剩 1 行；产品门面需要更多空间。**处置**：先下放/压缩；若仍不够，按 `doc-budgets` 规则升顶并登记理由（建议 README 31→45、AGENTS 140→145，理由 = 产品门面 + 产品/开发双入口）。`_dist/安装手册.md` 必须改生成器后重导出，不能手改。

### 1.9 证据诚实性：product-smoke 的档位

`product-smoke` 若用真 `dsh`/pnpm 装配团队层，需要 registry/缓存；不能把它写成纯 keyless 无网络。**处置**：拆两层——launcher 逻辑单测用 fake `dsh`（无网络）；`product-smoke` 标 L2，需要真实安装前置，缺前置 exit 2（不是绿）；`product-boot-smoke` 用真 Web + 浏览器，无模型调用。验收矩阵写清。

## 2. Spike 记录（2026-11-01）

环境：本机 macOS，Node 22，npm 10.9.8；使用 `_dist/dsh-deep-research-pack-0.1.3.tgz` 与 pack 目录的临时副本；未改仓库。

### 2.1 不加 optional peers

```text
npm install --dry-run --json --prefix /tmp/dsh-product-spike \
  --cache /tmp/dsh-product-spike-cache _dist/dsh-deep-research-pack-0.1.3.tgz
→ ERESOLVE unable to resolve dependency tree
  Found: @deepseek-ai/dsh-agent@0.2.1-rc.5
  peer @deepseek-ai/dsh-agent@"^0.2.1-rc.2" from dsh-deep-research-pack@0.1.3
  peer @deepseek-ai/dsh-agent@"0.2.1-rc.2" from @deepseek-ai/dsh-web-deepseek-api@0.2.1-rc.2
```

### 2.2 加 optional peers

临时副本的 `package.json` 对每个 peer 加 `{ optional: true }`，`npm pack --ignore-scripts` 后：

```text
npm install --dry-run --json --prefix /tmp/dsh-product-spike-opt/prefix \
  /tmp/dsh-product-spike-opt/dsh-deep-research-pack-0.1.3.tgz
→ add dsh-deep-research-pack 0.1.3
  { "added": 1, "removed": 0, "changed": 0 }

npm install --prefix /tmp/dsh-product-spike-opt/real ...
→ added 1 package
  node_modules/.bin/dsh-deep-research-{preflight,scaffold}
```

### 2.3 全局安装与 Host/Web spike 结论

- optional peers 解决全局安装的 peer 树冲突；单包分发可行。
- 真实 `npm i -g --prefix`：只装 1 个包，`global/bin/dsh-deep-research-{preflight,scaffold}` 已链接；launcher bin 同形待补。
- **Host boot 注册 + Web 首屏真会话已跑通**（见 §2.4），不再是未知。

### 2.4 Host boot + Web 首屏 spike（2026-11-01）

临时 home + 临时 Web profile + 临时 `file://` Host 插件（`inject: ['workspaceRegistry']`，`apply` 里 `create(env)`）+ 真 Web + 浏览器：

```text
SPIKE_ENV /tmp/dsh-product-boot/ws
SPIKE_REGISTERED /private/tmp/dsh-product-boot/ws 0d7e22fe-...
dsh web: http://127.0.0.1:3211/?token=...
```

`workspace.json`：

```json
{"workspaces":{"0d7e22fe-...":{"path":"/private/tmp/dsh-product-boot/ws","title":"ws","sessionIds":["session-e7861c78-..."]}}}
```

Session header（zstd 首行）：

```json
{"type":"session","version":4,"id":"session-e7861c78-...","cwd":"/private/tmp/dsh-product-boot/ws","agentPreset":"lead"}
```

浏览器首屏（pack 已装入临时 profile）：

```text
Orca | 新会话 | 工作区 ws | 探索未至之境 | ws | Deep Research Lead | [composer]
ERRORS []
```

关键细节：

- Host 的 `SPIKE_REGISTERED` 先于 `dsh web:` 打印；`apply` 返回 Promise，Web URL 在注册完成后才出现。
- 全新 home（删掉旧 sessions/workspace.json）+ pack 安装后，首屏 blank Session 的 `agentPreset` = `lead`；这是产品默认。
- 先装 pack 前创建的旧 session 保持 `agentPreset: standard`——Session header 不可变；升级/装 pack 后旧 blank 不会自动变 Lead，需要新开会话。产品文档要写。
- 会话组目录 = `--private-tmp-dsh-product-boot-ws--`，与 vendor `projectKey(cwd)` 一致；dev `session-log` 的 `research-workspace` substring 对任意工作区必失败，`projectKey` 是正解。

结论：**产品核心链路（装配 profile → Host 注册工作区 → Web 首屏 blank Lead Session，cwd = 工作区）可行，已被真机证实**。剩余是把这条链路封装成 launcher/产品 bundle，并用 smoke 固化。

### 2.5 完整产品装配 spike（2026-11-01）

用临时 home/profile/workspace 跑完整装配（launcher 逻辑的原型，不含最终代码）：

```text
1) dsh --profile deep-research-prototype --from-default-profile web --dump-config
2) dsh plugin --profile deep-research-prototype add file:<repo>/packages/deep-research-pack
3) dsh plugin --profile deep-research-prototype add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.1-rc.2
4) node <pack>/scripts/scaffold.mjs --workspace <ws> --profile deep-research-prototype --install-only
5) dsh --profile deep-research-prototype --patch <host-workspace-boot overlay> --no-open --port 3213
   （env: DSH_HOME=<temp>, DEEP_RESEARCH_WORKSPACE=<ws>）
```

结果：

- bundle list = `@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`、`dsh-deep-research-pack`、`@deepseek-ai/dsh-experimental-agent-team-profile`。
- scaffold `--install-only` 全绿：手册/NODES/判型库/.gitignore/templates/seed 版本/method-library/lib 产物；凭据检查按安装模式跳过。
- 工作区文件：`AGENTS.md`/`NODES.md`/`templates/run`/`.dsh-research-seed.json` 在场。
- Web 首屏：`Orca | 工作区 ws-launch | Deep Research Lead | [composer]`；`pageerror` 为空。
- Session header：`cwd` = `/private/tmp/dsh-product-boot/ws-launch`、`agentPreset` = `lead`。
- 源码 dsh 从外部 cwd 运行时需 `TSX_TSCONFIG_PATH=<repo>/tsconfig.json`；否则 `@deepseek-ai/cordis` 解析不到 `FiberState`。产品 smoke 的 shim 要带这个 env（或改用 built bin）。

这证明"launcher 要做的事"已经在手工命令下全部成立；A1 只是把它封装成 `launch.mjs` + 错误处理/进度/设置/读回。

### 2.6 saved Session 抢首屏 spike（2026-11-01）

- 启动工作区 = `ws`（Host 注册）；通过 API 另建 `ws2` + 一个 Lead session。
- 浏览器 `localStorage['dsh.sessions.current'] = {sessionId: <ws2 session>}` 后打开页面。
- 结果：侧栏/首屏打开 **`ws2`**，不是启动的 `ws`；`storage` 仍是 ws2 session。
- 结论：**已有 saved Session 时，不能承诺"自动打开启动工作区"**。P0 = 可见当前工作区 + vendor picker 切换；P1 才做 launch workspace 的 client 状态（Remote/URL 参数）。

## 3. 卡片改了什么（本轮）

- 父卡：新增 §初衷/产品原则；Q1 改为推荐 `deep-research`（产品身份/避免 dev 冲突），`research` 作兼容；新增 Q6（共享 home / `--home`）、Q7（首屏 UX）；新增子卡 D；验收加首屏与工作区指示；已知限制加 saved-session/多工作区、共享 home、项目模式 sandbox。
- 子卡 A：profile 默认 `deep-research`；optional peers 从"待实测"改为"必需 + spike 记录"；加启动进度/失败补救、版本/pnpm 预检、工作区标题、已有 `.gitignore` 处理、saved-session 提示、`--home`。
- 子卡 B：加首屏文案/起步指引、de-repo 具体清单、docs budget 决策、D38 内容清单、artifacts/run bundle 术语别名。
- 子卡 C：加首屏浏览器断言、saved-session/多工作区测试、`.gitignore`/项目模式测试、product-smoke 档位与前置、group 解析性能注记。
- 新增子卡 D：产品首屏体验（品牌/工作区/起步指引/凭据提示/驾驶舱入口；现有 slot；无皮肤、无新模型事实）。
- 方案取舍：profile 推荐改 `deep-research`；打包 spike 结果；首屏与 saved-session 说明；共享 home 说明。
- 验证计划：首屏 smoke、product-smoke 档位、saved-session 用例。
- 新增 `2026-11-01-landing-plan.md`：把父卡 + 四张子卡串成 S0–S4 薄垂直切片，含依赖图、每切片结束判据、第一刀与残余回退。
- 新增四份实现规格：runtime / first-run UX / repo tooling & tests / docs & dist；每个 issue 都有对应技术支撑。

## 4. 还没透的（不冒充已证）

| 未知 | 影响 | 下一步 |
|---|---|---|
| ~~Host boot 注册 + Web 首屏真会话~~ | **已由 §2.4/§2.5 spike 证实**（cwd = 工作区，preset = lead） | 用 `product-boot-smoke` 固化 |
| ~~完整装配（web 模板 → pack → team → scaffold）~~ | **已由 §2.5 手工命令链证实** | A1 封装 + `product-smoke` 固化 |
| saved Session 抢首屏 | **已由 §2.6 证实**：有 saved 就打开 saved，不保证启动工作区 | P0 可见工作区指示/切换；P1 自动切换 |
| 真实 `npm i -g` 的 launcher bin | 产品分发入口 | 已证 preflight/scaffold bin；加 launcher 后补测 `--help`/`--check` |
| 项目子目录 sandbox 是否符合用户预期 | 用户在项目里"做事情"的边界 | 父卡 Q3 + 用户首启体验 |
| 共享 home 的会话/工作区可见性是否可接受 | 产品私密感/清爽度 | 父卡 Q5 + `--home` 实测 |
| 团队层离线/registry 不可用 | 首装失败面 | 沿用现有离线矩阵；启动器补救文案 |
| docs budget 升顶是否必要 | 文档可读性 | 子卡 B 先下放/压缩，再登记升顶 |
| npm 正式发布 / Desktop / Windows | 分发面 | 沿用现有 triggers；不在 P0 承诺 |

## 5. 复核结论

方向可行，且技术未知已基本清空：全局安装 peer 冲突（optional peers）、产品核心链路（Host 注册 → Web 首屏 blank Lead Session，cwd = 工作区）、完整装配（web 模板 → pack → team → scaffold）、saved-session 行为都已真机证实。真正缺的不是 DSH 机制，而是**产品首屏体验**与**多工作区/已保存会话的诚实边界**。P0 应聚焦：

1. 一条命令装配产品 profile + 注册工作区 + 起 Web；
2. 新 home 首装保证落在启动工作区；
3. 首屏告诉用户这是什么、从哪开始、当前工作区；
4. 产物在用户工作区、数据归属写清；
5. 不把"多工作区自动切换、项目根可写、产品私有 home"这些未证/未定的事说成已支持。

落地顺序 = [落地计划](2026-11-01-landing-plan.md)：S0 决定 → S1 走通骨架 → S2 产品可用（首屏）→ S3 文档分发 → S4 硬化验收；C1 dev 工具与 A1 并行，D/B 在接口稳定后跟进。P1 再做自动工作区切换、项目模式深化、产品内 onboarding 的完整形态。
