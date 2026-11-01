# deep-research-pack

> 说明：本 README 随 npm 包发布；指向仓库 `docs/`、`notes/`、`_backlog/` 的链接使用 GitHub 绝对地址。安装包不含这些开发文档，点开即离仓。

Deep Research **产品**（D38）：一个包提供启动器 + 产品 profile + 四研究角色 preset + 方法编辑 preset（D37）+
研究方法论技能 + 研究驾驶舱（Research Cockpit，观察面 client 套件）+ 抓取回退 provider + 工作区种子。
运行时仍是 DSH；`dsh-deep-research` 只负责装配 `deep-research` profile、登记用户工作区、起 Web。

一次调研 = 一支四人研究团队（Lead 主编 / Scout 侦察 / Analyst 分析 / Critic 核查）在 DSH 的
Agent Teams 通道上协作，产出**证据可溯源**的研究报告（run bundle 落 `drt_<slug>/`）。

> **研究驾驶舱** = 观察面 client 套件的套件名（2026-09-28 定名）：右栏「研究状态」/「研究配置」
> 页签 + 交付那一刻出现的「终稿」页签 + 研究语义工具卡 + 活标题 + 挂起显性化（pending 自动展开
> 右栏）——静默自主期看仪表、HITL 挂起时接手、交付后读成品的地方；页签含**流程轨道**（◆立项确认 + 七步 + ◆交付审阅——两个 HITL 停靠点
> 常驻可见）+ 参与指引 + 决策诚实线 + rerun 三分图例（不代表已发生 rerun；证据扩张以 v2+ 文件版本为证）；折算谓词住 `src/lib/`（keyless 单测，
> 与 run-dashboard 投影共用）。
> 构成的当前事实正本 = [docs/design/40-research-cockpit.md](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/design/40-research-cockpit.md)。

## 内容

| 位置 | 内容 | 随包发布 |
|---|---|---|
| `presets/<role>.patch.yml` | preset roster（四研究角色 + 方法编辑；单行形态：一条 `@deepseek-ai/dsh-agent-preset` 行，config.plugins 内声明 persona/时钟/skills/工具行） | ✓ |
| `presets/<role>/skills/<n>/SKILL.md` | 研究方法论技能（各角色清单正本 = 盘上 `presets/<role>/skills/` 目录，bundle 自动发现——新增免改本行） | ✓ |
| `cordis.patch.yml` | bundle 行：preset roster（default: lead）+ **检索底座**（`- id: web` 替换行：搜索 = DeepSeek Search API、fetch = 回退 provider；`research-fetch-fallback` 行注册它——见下节）+ 会话全文检索开关（`session-query-sqlite` `openAt: first-search`——FTS 惰性开，`:memory:` 每进程重建；检索工具行在 lead/critic preset）+ `tool-present` + 团队可视面 `ui-agent-team` + 本包 client 面 | ✓ |
| `workspace/` | **研究工作区种子**：研究手册（`AGENTS.md`：证据契约/目录约定/完成判据）+ `NODES.md`（节点 I/O 契约）+ `question-patterns.md`（判型库）+ `templates/run/` 八件模板（含 `plan.md` 执行图）+ `method-library.md`（独立空架子种子，不从正本同步）+ `.gitignore`（包内名 `.gitignore.example`——npm 不打包 `.gitignore` 文件，安装时由 scaffold 落地成本名；工作区纳入版本控制时拒收 run bundle/归档/方法库，留档加 `!路径`） | ✓ |
| `src/client/` → `lib/client.js` | **研究驾驶舱**（Research Cockpit——观察面 client 面，D18 有界例外；构成正本 = [design/40](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/design/40-research-cockpit.md)）：右栏「研究状态」页签（流程轨道锚点/人性化活动流/活标题/HITL 横幅/参与指引/决策诚实线）+ 「研究配置」页签 + 「研究图谱」页签（只读 SVG DAG：顶层 plan 节点 / Team 任务 / 依赖边；复合子节点 W2.1.1… 在节点详情展开，节点可复制 `drt_<slug>/W2.1` 引用；Wave 前缀/重号/悬空 parent/deps/墓碑/跨组只读提示；无 plan 或 blocked_by 时明确无图，不提供调整动作）+ 「终稿」页签（认领 `drt_<slug>/` 终稿地址族：`final.md` / `final/vN.md` / `final/readable.md` / `final/readable-vN.md`；有读者版默认看读者版，可切审计版；交付时自动开一次）+ **主界面「方法库」tab**（`conversation.view`；我的库/内置参考/四字段编辑，保存交方法编辑）+ 研究语义工具卡 + 挂起显性化 | ✓ 构建产物 |
| `src/fetch-fallback/` → `lib/fetch-fallback.js` | **抓取回退 provider（D31）**：先本地匿名抓取，取不到页面时才打 DeepSeek Fetch API；正文带来源标记。纯判据在 `src/fetch-fallback/policy.ts`（keyless 单测），凭据解析与两腿预算在 `index.ts` | ✓ 构建产物 |
| `src/lib/` → `lib/types/lib/` | 纯函数折算（清单正本 = [design/40](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/design/40-research-cockpit.md)）——keyless 单测直接断言 | ✓ 构建产物 |
| `scripts/preflight.mjs` · `scripts/scaffold.mjs` | 部署前置检查 + 一键准备（见下） | ✓ |

角色职责与方法论：见各 `presets/<role>.patch.yml`（persona）与 `presets/<role>/skills/<n>/SKILL.md`（方法论正文）——都随本包发布。

方法库写入：保留模型可见 Host tools `method_library_upsert`、`method_library_set_default`、`method_library_remove`。Host projection 只允许 Method Editor owning Session 中由 owner `user/message.source.rpcId` 对应的操作命令；每次 claim 绑定动作、名称、turn 和单个 tool `callId`，保存命令还校验 entry 的 SHA-256 摘要。Host 从 owning Session header 的 cwd 定位 `method-library.md`，写后重新读取并核对条目、来源、旧正文和默认列表；结构化结果通过 `presentationMeta` 供 Client 按 callId 关联。Client 读取完整分页直到 `eof`，保存/默认/删除只有在匹配工具结果并读到完整目标状态后才报告已核对。超时、调用结果缺失或文件读取不完整时状态标为未知，禁止自动重试；手动刷新只核对当前内容，不声称恢复原命令身份。Client Remote 直接写入不授权。普通保存与编辑保留目标条目的默认状态；另存为保留旧条目且不更改默认；「保存并设为默认」「设为默认」「清除默认」均为独立明确操作；删除默认不自动提升另一条。方法库当前 UI 已采用两列和「详情 / 摘要+访谈 / 表单检查」状态；摘要字段可直达表单并聚焦，内置参考详情可直接作为新来源；新建必须先选择从零、某条内置参考或一条有完成记录的 run，并显示 question 与最高 final/vN 的有界预览。每个活动草稿使用独立 Method Editor Session，并以单调 draft revision 拒绝旧 turn、重复 seq 或用户修改后的迟到回填；模式切换保留同一草稿与历史，刷新恢复不承诺。真实浏览器入口 smoke 已覆盖两列、详情/访谈/表单切换、内置来源与已完成 run 预览，并断言窄屏无横向裁切、库/工作台可切换且切换期间草稿保持挂载、分隔条键盘可调宽；业务验收 = 真实浏览器/真实模型 E2E；最终视觉手感以用户实际使用为准。

## Model Experience

### Method Editor library operations

#### What the model sees

Only the Method Editor Agent sees `method_library_upsert`, `method_library_set_default`, and `method_library_remove`. Each explicit page action is a durable user message beginning with `【方法库操作】`; it carries one `operationId`, action and target name, plus an entry SHA-256 for saves. The save tool also receives `operationHash` and `defaultAction`; the default and remove tools receive only the operation-specific action/name. Successful tool responses give a short textual result, while `presentationMeta` carries structured operation data for the Client. The default marker is not part of `method-draft`; only explicit page actions can change it.

#### Token effect

A deterministic Method Editor Loader scenario prices the actual first request as the sum of its model-visible messages and tool schemas with DSH's fixed-density estimator. It compares that request with the same messages and the earlier upsert/remove schemas; the current fixture measures 6,778 first-turn input tokens, of which the schema change is +246. This is a comparative estimate, not provider-specific tokenization or billing; each save request also includes its complete method entry and command marker.

#### KV Cache effect

Tool schemas are stable within a Method Editor request series; a newly selected Agent receives its composed schema in the request header. Per-operation command text and the method entry are appended as user content, so they do not replace the preceding conversation prefix.

## 检索底座（DeepSeek Search API + 抓取回退）

搜索与抓取由本包 bundle 的两条行固定：`- id: web`（provider 选择）+ `research-fetch-fallback`
（注册回退 provider）。

| 能力 | provider | 行为 |
|---|---|---|
| 搜索 `web_search` | `deepseek-search-api` | 每条结果带 **snippet + 发布日期（RFC 3339）**，支持 `site:` / `-site:` / `"短语"` / `lang:` / `after:` / `before:` 算子，一次请求完成、不烧模型 token。对比 Messages 搜索：一个完整模型回合（2–10k input tokens），本仓 9,270 条历史结果只有 **1.7% 带摘要、0.4% 带日期** |
| 抓取 `web_fetch` | `deepseek-fallback-fetch`（本包 host 半） | 先本地匿名抓取：真实 HTTP 状态码、markdown 无转义、0.5–2.2s；**本地取不到页面时**（超时 / 跨源重定向 / 不支持的类型 / 传输错误 / 5xx）再用 DeepSeek Fetch API 补一次，正文首行带来源标记。安全策略拒绝（内网地址 / 非法 URL）与用户取消**绝不**回退。对比"只用 Fetch API"：同类页面 5–15s、反斜杠转义、对 wikipedia / BBC / NYTimes / Medium / X / 知乎 / GitHub Pages 返回 404 |

- **两个 `web` 字段必须同时写**：Loader 的 replace 行整体替换 config；只写 `searchProvider` 会让
  fetch 面对多个可用 provider，报 `WEB_PROVIDER_AMBIGUOUS`。
- **回退的开关与预算**：`research-fetch-fallback` 行的 `enabled: false` = 只走本地（不用改
  selection）；`localTimeoutMs`（默认 10s）/ `totalBudgetMs`（默认 28s）控制两腿预算，preset 的
  `fetchTimeoutMs: 45000` 兜住工具预算。API 回退计入 Search/Fetch 计费（$0.75 / 1,000 次成功请求，
  2026-11-01 起）。
- **已知未用**（vendor provider 丢弃）：Search API 的 `summary` / `need_content` 与
  `authority` / `rerank_score`。换 DSH 版本时复核。
- 实测与取舍：[_backlog/_archived/research/retrieval-backend/2026-10-27-provider-audit.md](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/_backlog/_archived/research/retrieval-backend/2026-10-27-provider-audit.md)。

## 账号与凭据（分发）

本包**不内置、不转发任何凭据**；所有 DeepSeek 调用复用 DSH 的凭据面。

| 你的情况 | 搜索 | 抓取 | 需要做什么 |
|---|---|---|---|
| 有 `DEEPSEEK_API_KEY`（推荐） | ✓ Search API | 本地优先 + API 回退 | 在 Models 页面写入，或 `export DEEPSEEK_API_KEY=…`，或 `$DSH_HOME/.credentials.yaml` |
| 只有 DeepSeek 账号登录（Web GUI） | ✓ 账号 token | 本地优先；**回退不可用**（本包只解析 API key） | 无需额外配置；缺失时错误里如实标 `fallback unavailable` |
| 无 DeepSeek 访问 | ✗（搜索需要凭据） | ✓ 本地抓取 | 研究 run 前先配 key |

- 凭据面优先级：Models 页 / credentials 服务 → 启动环境变量 → `.credentials.yaml`（用户本机，
  永不进仓库）；换 ref 名改 `research-fetch-fallback.config.apiKeyEnv`。
- 回退只把**目标 URL**发给 DeepSeek（不带 cookie / header）；本地能取到的页面不出本机。
- 团队 / 多用户：每个用户在自己的 DSH home 配自己的 key；run bundle 与方法库不含凭据。

## 部署（产品启动）

运行形态、数据归属、升级/回滚与多实例的完整合同 = [guides/65](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/65-run-forms.md)。
用户视角完整手册 = [`_dist/安装手册.md`](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/_dist/%E5%AE%89%E8%A3%85%E6%89%8B%E5%86%8C.md)。

**前置**：DSH 满足 `engines.dsh`（值以 `package.json` 的 `engines.dsh` 为准；宿主安装/启动会拒绝不匹配版本），
Node 满足 `engines.node`；`dsh` 在 PATH；**首次装团队层需要 pnpm**；团队层需要 registry 或预装缓存。
若 `dsh` 不在 PATH，用 `--install-anchor`（或 `DSH_INSTALL_ANCHOR`）给 scaffold/preflight 指安装锚。

```sh
# ① 安装启动器（npm 发布后；离线用 tarball 绝对路径）
npm install -g dsh-deep-research-pack
# 或：npm install -g /path/to/dsh-deep-research-pack-<版本>.tgz

# ② 一条命令启动产品；首次会装配 profile、装包/团队层、铺工作区种子、登记工作区
dsh-deep-research --workspace ~/research
# 不指定 --workspace 时首次启动会询问（回车 = 当前目录）
```

- **profile**：默认 `deep-research`；`--profile <name>` 可换。launcher 只在 profile 不存在时从 Web 模板初始化；
  已有 profile 只补缺，不重置、不触碰用户 patch。
- **工作区**：`--workspace <dir>` / `DEEP_RESEARCH_WORKSPACE` / 上次设置 / TTY 询问。
  非空项目且没有研究契约时默认研究根 = `<project>/research`（不碰项目文件）；`--in-place` 才用项目根。
  已有 `.gitignore` 不静默改；`--gitignore-append` 显式追加。
- **首屏**：Orca 品牌 + 产品化工作区标题 + 起步卡（当前工作区 / 三步起步 / 凭据提示 / 换工作区）；
  默认 preset = Deep Research Lead；右栏研究状态/研究配置/研究图谱/终稿；主界面方法库 tab。
- **检查/预装**：`dsh-deep-research --check --workspace <ws>` 只读；`--setup-only` 装配/铺种子后退出；
  `--home <dir>` 用独立 DSH_HOME；`--no-seed` 跳过种子。
- **数据**：run bundle/方法库/归档全在工作区；启动器只在 profile 目录写一个设置文件（见 §Data）。
- **手动装进已有 profile（高级）**：`dsh --profile <p> --from-default-profile web --dump-config` →
  `dsh plugin --profile <p> add <tarball>` → `dsh-deep-research-scaffold --workspace <ws> --profile <p>`
  → `DEEP_RESEARCH_WORKSPACE=<ws> dsh --profile <p>`。产品路径优先。

## Data

一张表回答「装完数据在哪、谁删、卸载留什么」。承诺用 DSH 数据面的 P0–P4 记号（纯引用 / 会话派生 /
用户可见文件 / 宿主账本 / 账号配置）；本包**没有 P3 home 账本**。读数：**P2** = 用户可见工作区文件；
**派生** = 可从日志+文件重建；**只读层** = 随包发布、升级替换；**插件账本** = 插件自己写的工作区元数据。
**可移植** = 换机器/移交后还在不在：`随 bundle`（跟着 `drt_<slug>/` 走）/ `随工作区`（跟着工作区目录走）/
`随包`、`随 profile`（重装重建）/ `仅本机`（依赖本机 home、日志或浏览器，移交不带）。

| 事实 | 承诺 | 权威 | 位置 | 作用域 | 寿命 / 删除 | 谁看得见 | 秘密 | 卸载后 | 可移植 |
|---|---|---|---|---|---|---|---|---|---|
| 角色 / preset / skill | 只读层 | 包 | 安装副本 `node_modules/dsh-deep-research-pack/` | 安装 | 随包版本；`dsh plugin remove` | 模型（注入）/用户 | 否 | 删 | 随包 |
| 工作区种子（手册 / NODES / 判型库 / 模板） | P2 | 落地后用户 | `<workspace>/{AGENTS.md,NODES.md,question-patterns.md,.gitignore,templates/run/}` | workspace | 用户手删；`--upgrade` 只写 sidecar | 模型（AGENTS 注入）/用户 | 否 | **保留** | 随工作区 |
| 本工作区方法库 | P2 | 用户 | `<workspace>/method-library.md` | workspace | 任何模式不覆盖；用户手删 | 用户/Lead | 否 | **保留** | 随工作区 |
| run bundle（研究事实） | P2 | 用户 | `<workspace>/drt_<slug>/`、`archive/`、`_abandoned/` | workspace + slug | 用户手删；无自动 GC | 模型/用户 | 否（内容可能含敏感材料） | **保留** | 随 bundle |
| run.md 状态头 | 声明（非权威） | 事实（bundle 文件 + journal；`schema` 是整数契约、`created` 是人读日期） | `<bundle>/run.md` | run | 角色/ops 随阶段写；门禁只信事实 | 模型/用户 | 否 | **保留** | 随 bundle |
| 交付 / 审计回执 | 派生 | 无（需日志+文件重建） | bundle 内 `delivered.json` / `manifest.json` / `acceptance.md` / `audit.md` / `node-gate.md` | run | ops 重新验收即重建；present 只记相对标签；权威文件变化即 stale | 用户/ops | 否 | **保留** | 回执随 bundle；`audit.md`/`node-gate.md` 仅本机（需会话语料复算） |
| 种子状态账本 | 插件账本（寄居 P2） | 插件 | `<workspace>/.dsh-research-seed.json`（含 `schemaVersion`） | workspace | `scaffold --clean`；不自动删 | 用户（gitignored）/插件 | 否 | **保留** | 随工作区（新机可缺，`--check` 报 untracked） |
| 启动器设置（上次工作区） | 产品设置 | 启动器 | `$DSH_HOME/profiles/<p>/deep-research.launcher.json` | profile | 删 profile 即删；无秘密；可重选 | 启动器/用户 | 否 | **保留**（随 profile） | 随 profile |
| git 跟踪规则 | P2 | 用户 | `<workspace>/.gitignore` | workspace | 用户手改；产品不静默改，`--gitignore-append` 才追加 | 用户 | 否 | **保留** | 随工作区 |
| scaffold 临时件 | 插件临时 | 插件 | `<workspace>/.dsh-research-scaffold.lock`、`*.seed-new*`、`*.tmp-*` | workspace | 正常退出删锁；`--clean --write` 清陈旧锁/临时件，sidecar 需 `--discard-sidecars` | 用户 | 否 | 可能保留 | 仅本机 |
| 会话日志 | DSH | DSH | `$DSH_HOME/sessions/` | session | DSH 管理（无删除 API）；本包不删 | 模型（surface）/用户 | 否（可能含用户数据） | 保留（DSH 语义） | 仅本机 |
| 凭据 | DSH | provider | `$DSH_HOME/.credentials.yaml` / env / `.env` | home | DSH 管理；本包只按 ref 读 | 用户 / 插件（仅引用） | 是（值只在 provider） | 保留 | 仅本机（不导出） |
| 团队机制层 | N2 依赖 | vendor experimental | `$DSH_HOME/profiles/<p>/`（依赖 + bundle 行） | profile | 用户显式删；本包卸载不删 | 用户/插件 | 否 | **保留** | 随 profile |
| 浏览器侧栏布局 | 客户端 | 浏览器 | `localStorage['dsh.sidebar-right.v1.<sessionId>']` | device | vendor 管；清站点数据 | 用户/浏览器 | 否 | 保留（vendor 键） | 仅本机 |

- **运行时插件代码对 `$DSH_HOME` 零写入**（不声明 storage domain、不新增 session event、不写浏览器存储）；启动器只写 profile 目录内的一个产品设置文件（无秘密、可删）。
  home 里的会话/凭据/profile 是 DSH 的。安装/升级由 DSH CLI 写 profile；scaffold 只**触发**团队层安装（N2）。默认共享 `$DSH_HOME`：Web UI 会显示该 home 下其他 Workspace/Session；需要干净环境用 launcher `--home`。
  驾驶舱只读 `remote.workspaceFiles`（根 = 会话 `header.cwd`，不是可变 working directory）与 `session.follow`。
- **present 可移植**：回执里的 `present.path` 写成 `drt_<slug>/final/vN.md`，不写本机绝对路径。
  present 必须指向 **bundle 内**的文件；指向 bundle 外时 `run-accept` 判红（交付副本不能依赖本机路径）。
  历史回执若已被旧版本写进绝对路径，用 `run-accept --repair` 修（只动可再生产物）。
- **清理自己的残留**：`scaffold --clean` 只报告；`--clean --write` 删除未改过的孤儿种子、陈旧锁与
  临时状态；**sidecar 默认只报告**（它可能是未合并的种子更新），加 `--discard-sidecars` 才丢弃。
  **改过的孤儿、种子文件、`drt_*`、`method-library.md` 永不删**。
- **工作区边界**：不能指到 `$HOME` / `$DSH_HOME` / pack / profile（或其祖先或内部）——否则
  `AGENTS.md` 会变成全局指令或写进安装树。
- **一个通道一个工作区**：运行通道/实例是宿主级的，但一次研究锚定一个 cwd；多项目请各起通道
  （不要在同一会话里切项目根）。`header.cwd` 不可变，`working_directory` 改了也不改观察面的读取根。
- **E2 出网**：搜索 query 与回退时的目标 URL 会发给 DeepSeek；本地抓取成功时页面不出本机。
  证据卡可能引用第三方页面内容，run bundle 移交前请自审。
- **秘密扫描边界**：交付物（final/receipts/audit）跑高置信凭据扫描；evidence/ 默认不扫（安全题材的
  示例密钥会误伤），需要时 `node scripts/run-gates/secret-scan.mjs <bundle> --all`。
- **不使用** attachments / spill / KB-RAG / storage domain；本包也不提供会话删除或附件 GC（DSH 边界）。
  `session-query-sqlite` 显式 `path: ':memory:'`，不落持久索引。
- **run bundle 改名/移动**：只走根 ↔ `archive/` ↔ `_abandoned/`（位置=操作桶）；不要手工改
  `drt_<slug>` 目录名——会话绑定按 slug 折，改名即失联。

**备份 / 恢复 / 跨机器移交**

- 研究数据 = 工作区里的 `drt_<slug>/`、`archive/`、`_abandoned/`、`method-library.md` 与种子文件；
  复制这些目录即可（`.dsh-research-seed.json` 可带可不带——新机缺席时 scaffold 会按 `--check` 报
  untracked，再用 `--adopt`/`--upgrade` 明确接受）。`present` 回执只记 bundle 内相对标签，换机不断链。
- **随 bundle 走 / 仅本机**：`final/vN`、`run.md`、`delivered.json`、`manifest.json` 随目录走；
  `audit.md` / `node-gate.md` 需要本机 `$DSH_HOME/sessions` 才能复算，`present` 本身是会话事件——
  这两样**不随移交**。所以移交后的 bundle 自证「交付了什么、谁拍的板」，复算审计要在原机或补齐语料。
- **不要**把 `$DSH_HOME/sessions/`、`.credentials.yaml` 当研究备份；它们是 DSH 的，会话导出走
  `/export`（ZIP 只含日志与附件，不含工作区文件）。
- 恢复顺序：复制工作区 → `scaffold --check` →（按报告）`--adopt` 或 `--upgrade` → 新会话「继续 <slug>」。

**保留、权限与版本线**

- **无自动 GC**：`drt_*`/`archive/` 只增不减；删除是用户显式动作（`--clean` 不碰研究数据）。
  先看规模再决定：`node scripts/run-ops/run-inventory.mjs --workspace <ws>`（只读：每场文件数/大小/最老；
  `--json` 给脚本）。
- **一 Host 一用户**：run bundle 继承工作区权限；共享机器请把工作区放在私有目录（如 `chmod 700`）。
  本包不做每用户分区。
- **一工作区一条 pack 版本线**：种子状态只有一个 `version`；不同 profile 装不同 pack 版本时，先在
  旧版跑 `scaffold --check`（会报「工作区记录较新」），不要跨版本直接 `--upgrade`。
- `method-library.md` 是用户数据：**run 活跃时不要手改**（Lead 也会写；无锁、无版本史，后写覆盖先写）。

## Compatibility

- `engines.dsh`: `>=0.2.1-rc.2 <0.3.0-0`（0.2.x 范围，显式排除 `0.3.0-*` 预发布；宿主只认它，不读 `dsh.compatibility`）。
- 测试基线：`0.2.1-rc.2`（开发 pin，数据面 + 客户端全档）+ `0.2.1-rc.3`（安装形状 + 客户端挂载
  `compat-client-smoke`；数据面机制经 diff 确认与 rc.2 一致）。`dsh.compatibility.dshReleases` 是已测基线镜像。
- 不匹配时：安装预检/启动拒绝；本包不使用版本豁免。

**依赖层级**（DSH 数据面 FAQ 的 N0/N1/N2/E 记号；发布规则 = 不把实验/外部包写进 `dependencies`）：

| 能力 | 层级 | 说明 |
|---|---|---|
| `remote.workspaceFiles` / `session.follow` | **N0 核心** | 驾驶舱只读通道；随 DSH 版本走 |
| `tool-present`（交付声明） | **N1 原生插件** | base 无此行，由本包 insert |
| `session-query-sqlite`（会话搜索） | **N1 原生插件** | 本包显式 `path: ':memory:'`，不落持久索引 |
| `ctx.credentials`（凭据引用） | **N1 原生插件** | 每次调用解析；值不进本包 |
| `@deepseek-ai/dsh-experimental-agent-team{,-profile}` | **N2 实验** | **不是产品稳定性承诺**：上游可能改 API 或撤掉能力。本包不写进 `dependencies`；`scaffold` 按运行中的 DSH 版本装团队层，版本不符默认不改写（`--refresh-team` 显式刷新） |
| `@deepseek-ai/dsh-experimental-client-ui-agent-team` | **N2 实验（peer）** | 客户端团队可视面，随宿主提供；不是本包安装的层。上游移除/改名时 client 挂载会失败，`compat-client-smoke` 能抓到 |
| 社区插件（E1）/ 外部服务（E2） | — | 本包零 E1 依赖；外部只有模型/搜索/抓取 HTTP（隐私边界见上节） |

**三条版本轴**（升级前先 `scaffold --check`）：

| 轴 | 当前 | 兼容规则 |
|---|---|---|
| 包 semver | 以 `package.json` 为准（本表不抄版本号） | 安装/升级走 `dsh plugin`；`engines.dsh` 不匹配即拒绝 |
| 工作区种子 | `seed.json.version` = 包版本 | 记录在 `.dsh-research-seed.json`（`schemaVersion` 独立）；`--upgrade` 只覆盖未改文件，改过的写 `.seed-new`；`--force` 不覆盖用户 `.gitignore` |
| run bundle 契约 | `run.md` 的 `schema: 2`（D33 整数版本，门禁按整数分档）+ `created:`（人读日期） | 旧 bundle 只有 `contract: YYYY-MM-DD` = 旧形态：读兼容、按日期断代、不追改；未来 schema 由门禁判红，不猜语义 |

## Uninstall

```sh
# 1) 停掉正在跑的 profile（避免运行中替换 node_modules）
dsh plugin --profile <p> remove dsh-deep-research-pack
# 2) 团队层是本包的承重依赖（N2 experimental），但不在本包内；不需要时显式移除：
dsh plugin --profile <p> remove @deepseek-ai/dsh-experimental-agent-team-profile
# 3) 需要删产品 profile（含启动器设置）时显式删除；工作区不受影响：
rm -rf "$DSH_HOME/profiles/deep-research"
# 4) 工作区留给用户；只想清 scaffold 残留时（先报告、再执行）：
node <pack>/scripts/scaffold.mjs --workspace <ws> --clean
node <pack>/scripts/scaffold.mjs --workspace <ws> --clean --write
```

**卸载后留下什么**：工作区种子、`method-library.md`、`drt_*`/`archive/`/`_abandoned/`、种子状态账本、
可能有的 `.seed-new`/陈旧锁——都在工作区，由用户决定去留；启动器设置随产品 profile 删除；`$DSH_HOME`
里的 sessions/credentials 是 DSH 的，本包不删；浏览器侧栏布局是 vendor 的 localStorage 键，清站点数据即可。

## 研究怎么跑

1. **HITL1 立项（两段卡）**：对 Lead 说出研究问题 → 第一段三问（研究类型/深度篇幅/时间口径
   与语言）+ 按需采集业务决策简报 → 点选即定稿；Lead 按判型推荐**研究方法**（内置预设：
   事实核查/领域地图/主张核查/方案比较/时间线与信号——回答"怎样调查、核验、综合"，与类型/深度互不替代），
   落稿 question.md 的「研究方法（本次实际采用）」节；Lead 落稿 question.md + topics.md 后发
   第二段**计划确认卡**（quick_factual 豁免；含方法行，quick_factual 的方法自动采用并落格）——
   按计划开跑(Recommended)/ 修订计划（意见附加，含用自然语言调整方法）/ 放弃，
   拍板即开工（一轮制）。卡的硬格式细则（简报字段、≤200 字、推荐项置首）与方法预设、推荐
   映射、用户方法库（`method-library.md`，显式才写）的细则正本 = 研究手册 §交互纪律与
   Lead 的 research-brief skill——本页不复述防漂移；
2. **静默自主区**：Lead 拆 topic、派 Scout/Analyst/Critic（Agent Teams 通道），证据落
   `drt_<slug>/evidence/`（七字段 frontmatter：source_url / retrieved_at / quality / found_by /
   supports / source_tier / publisher）；Critic 对抗核查出 `review.md`（readiness PASS 是交付前置）；
3. **HITL2 审阅**：Critic readiness PASS 后，Lead 按 `reader-final` skill 写 `final/readable.md`
   （1–3 页、六节、不新增事实）；「终稿」页签默认显示读者版，可切审计版（`final/vN` 或
   `final.md`）。结构化选项卡（定稿（按现稿交付）(Recommended) / 补研究（看报告末节；出新版本）/
   改说法（版本不变）；题干给「太浅 / 方向不对 / 太长」三个词）→ 拍板后交付 `final/vN` 副本
   + `final/readable-vN.md`（同版），present 两份（reader 第一、canonical 第二）；
   canonical 每条关键结论附 `[来源: evidence/xx.md]`；报告首屏 = 决策摘要：建议与适用条件 /
   备选取舍 / 关键依据 / 最强反证 / 目前不能判断 / 下一步，末节 = 下一版优先项 / 什么会改变建议——
   快速事实型缩略为答案+口径+依据+限制（quick_factual 可跳过读者版）；交付后想改 = 状态页 ⑤ 与
   终稿页脚的只读折叠块「还不满意？三种改法」给话术，Lead 按 `rerun-triage` skill 分诊（不自动 rerun）；
4. **观察面**：DSH Web GUI 右栏「研究状态」页签看实时动态（流程轨道 = ◆立项确认 + 立项→
   组队→侦察→挖掘→综合→审查 + ◆交付审阅 + 交付，↻ rerun 回路自交付审阅可见，人性化活动流，
   HITL 挂起横幅点名锚点与参与方式，活标题「研究状态 · ⏳ 等你拍板」，交付节点显示 `final/` 中的最高有效版本号（vN）；仅 v2+ 文件是证据扩张版本记录。）；
   交付后同一页签 ⑤ 与终稿页脚各有只读折叠块「还不满意？三种改法」（补研究 / 改说法 / 另起一个
   bundle，各写版本后果与一句可复制的话；观察面不按钮化 rerun）；
   右栏「研究配置」页签 = **摘要面**（2026-10-21 管理迁移后）：只留**本次研究**（这次用的是哪条打法
   ＋ 来源 ＋「换一条」，读 question.md 研究方法节、五态如实）与「方法库（本工作区）→ 顶部 tab」
   入口；库列表 / 内置参考 / 新建编辑删除 / 领域示范 / 管理回执都在主界面 `conversation.view` 的
   「方法库」tab（有对话的会话才显示）。写操作交给专用 Method Editor Session 执行 Host 工具，Client 只读 workspace 文件并核对完整结果，不直接写文件；
5. **审计（开发仓，不随包发布）**：仓库内 `node scripts/run-gates/evidence-audit.mjs <bundle>` 对会话日志机械对账——
   URL 是否真被抓取过、摘录是否可回溯、final 溯源链是否完整 → `audit.md`。

## 新增一个研究角色

**第 0 步（先于一切代码）**：增删角色 = 推翻 D2（角色 = 5 个：4 研究 + 方法编辑，D37；见 [docs/00-index.md](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/00-index.md) 台账）——
先在台账登记新 D 号，再动手。tests 的数量哨兵（[tests/pack/presets.test.mjs](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/tests/pack/presets.test.mjs)）会机械拦住没登记的增删。

1. `presets/<role>.patch.yml`：一条 `@deepseek-ai/dsh-agent-preset` 行，`config` 带
   id/name/description/order + plugins（自包含组合：persona 行 + 时钟行 `time-context`（D32）+
   skills roots + 工具行 + agent-instructions 行）+ `skills/<n>/SKILL.md`（frontmatter `name` = 目录名）；
2. 结构门禁：verify 门禁 preset-structure + row-deps（行引用的 `@deepseek-ai/*` 全进 peerDependencies）；
3. roster 装载：`package.json` 的 `dsh.bundle.patch` 数组列出 `cordis.patch.yml` 与每个
   `presets/*.patch.yml`；
4. 消费点**无需逐个改**：角色清单事实源 = 盘上 `presets/` 目录——`preset-smoke` /
   `release-smoke` / `team-preflight-smoke` / `boot-run.sh` / `tests` 全部目录枚举。唯二要补的：
   `l4-lite-smoke` 的 `PROMPTS` 加该角色的标记 prompt；新脚本用 `scripts/lib/roles.mjs` 枚举；
5. 完成定义 = preset-smoke 真挂载绿（L1 面，keyless）。

## 新增一个 skill

1. 建 `presets/<role>/skills/<n>/SKILL.md`——frontmatter `name:` 必须**逐字等于目录名**
   （门禁 preset-structure 强制）；
2. preset 行的 plugins **不用改**：`customSkillDirs` 指向 `presets/<role>/skills/` 且
   `includeDefaultRoots: false`，自动发现。

## 运行期韧性（provider 重试策略）

本包在 bundle 层按 id 替换 base 的 `llm-deepseek` 行，把上游流畸形码 `MALFORMED_RESPONSE` 并入
**有界**重试：`retryPolicy.mode: normal`、`maxRetries: 5`、`retryableCodes` = 出厂五项 +
`MALFORMED_RESPONSE`（退避沿用出厂默认）。理由是研究 run 的**停摆代价**：一次畸形流事件会当场终结
回合，可能让一个 wave 的产出全废（实测分母与恢复程序 = [BUG-022 记录](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/_backlog/_archived/fixed_bugs/BUG-022-provider-stream-malformed-turn-kill.md)；
决定理由与"未运行项" = [provider 重试 Note](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/notes/implemented/2026-10-11-provider-malformed-response-retry.md)）。

这**不是**对上游缺陷的修复（事件顺序违约发生在 vendor 只读层），只是把"一次畸形 = 一次停摆"降为
"一次畸形 = 最多六次尝试"。上层设置（`settings` 的 `llm-deepseek:` 段）仍可覆盖本策略。

## 已知限制与延后工作

- **首屏工作区**：默认共享 `$DSH_HOME`；浏览器已有 saved Session 时，Web 可能打开上次的工作区，而不是本次启动工作区（首屏/侧栏显示当前工作区，用 Workspace picker 切换；P0 不承诺自动切回）。需要干净环境用 launcher `--home`。
- **项目模式**：非空项目默认研究根 = `<project>/research`；agent 可读项目，但写入留在研究子目录（`workspace-write` 根 = Session cwd）。要让 agent 直接写项目根用 `--in-place`，并接受种子落在项目根。
- **已有 `.gitignore`**：产品不静默改写；`--gitignore-append` 才追加带标记块（研究数据默认在子目录时只动研究子目录）。
- **研究方法配置首版边界**：方法 = 调查路径指导，不新增强制预算/来源数硬门，readiness 不自动验证方法承诺之外的新合同；用户方法库 `method-library.md` 是**工作区本地用户数据**（同工作区的会话都看得到，换工作区不带；由显式页面动作经 Method Editor Host 工具写入，无版本史、无跨设备同步）；高承诺学术模式（系统综述类）不在预设；Settings 管理页不做（需显式重议 D7/D18 架构边界，见 [_backlog 长期管理卡](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/_backlog/_archived/settled_issues/2026-10-12-research-method-profile-management.md)）；方法库的增长纪律（命中计数／休眠）与库规模能力（分组／搜索／导入导出／跨工作区）、交付工件的表格档、领域包升格为字段——四项延后，重议条件登记在 [_backlog/triggers.md](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/_backlog/triggers.md)；

- **会话必须建在**研究工作区里**才能看到渐进面**：页签读的是会话工作区根（`workspaceFiles`），
  run bundle 在工作区内才可见——故需先把研究工作区注册进 DSH（`workspace/create`），再用
  `workspaceId` 形态建会话（`dev/run-kickoff.mjs` 已默认此形态）；建在别处的会话只显示活动流；
- **队员动态折叠区（检索/抓取/出错粒度）**：lead 活动流照旧；队员动作经 agentTeam 投影发现
  队员会话 + 多路 follow，折进每人折叠区（默认折叠，🔍/🌐/⚠️ 计数徽标；定夺与证据 =
  [member-activity-stream 卡](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/_backlog/_archived/settled_issues/2026-10-09-member-activity-stream.md)）。
  文件读写级动作不入流（噪音定夺）；任务粒度看 `ui-agent-team` 任务板——两面板分工不重复；
  有团队正例首验 = 下一场真实 run；
- **`workspace/` 种子是快照**：由 `dev/sync-pack-workspace.mjs` 从仓库正本同步（门禁
  `pack-workspace-fresh` 防漂移）；种子只铺新工作区，**不覆盖**已存在文件（`--force` 除外）；
- **品牌名与品牌标**已按 [ui-skin](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/notes/rejected/2026-09-24-ui-skin.md) 的重启条件窄复活落地（虎鲸 Orca，mark/name 两槽注入——[Note](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/notes/implemented/2026-10-13-orca-brand.md)）；**皮肤层**（配色/主题）与**专职 synthesizer 角色**的重议条件仍分别由 [ui-skin](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/notes/rejected/2026-09-24-ui-skin.md) 和 [synthesizer](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/notes/rejected/2026-09-24-synthesizer-role.md) 拥有；
- **工具卡 = 2 张**（spawn_teammate / web_search）；`team_task_*` 与其他协调类工具
  （wait_agent / list_agents / send_message）**不进对话流**（实测：harness 把协调类工具排除在对话渲染外）——团队任务的观察由 ui-agent-team 任务板与 To-dos
  折叠承担，无需卡片（4 卡方案的回退理由 = [marathon2 复盘](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/notes/archived/2026-09-25-marathon2-retrospective.md)，冻结层）；
- **抓取回退的边界**：只救"本地取不到页面"的失败（超时 / 跨源重定向 / 不支持的类型 / 传输错误 / 5xx）；4xx 不救；安全策略拒绝（内网地址 / 非法 URL）与用户取消**绝不**回退。API 回退的正文带来源标记、状态码恒为 200、最终 URL 不可见——引用时按"内容来自 DeepSeek Fetch API"处理。
- **回退凭据只认 API key**：DeepSeek 账号登录可驱动 chat 与搜索，但本包的回退 provider 只解析 `apiKeyEnv`（默认 `DEEPSEEK_API_KEY`）；缺失时只走本地并在错误里标 `fallback unavailable`。
- **兼容范围**：`engines.dsh` = `>=0.2.1-rc.2 <0.3.0-0`（`-0` 排除 0.3 预发布）；测试基线 = `0.2.1-rc.2` + `0.2.1-rc.3`；pre-stable API，peer 版本号不精确钉死。

## 发布（维护者）

发布前确认 `bin` 含 `dsh-deep-research`、所有 peer 为 optional（全局 launcher 不拉 DSH peers）、`_dist` 手册由 `export-dist` 重导出。版本、tag 与 npm 发布顺序 = [guides/64 发布规则](https://github.com/ethan-jiang-1/ai_dsh_deep_research/blob/master/docs/guides/64-release-versioning.md)。发布前跑 `pnpm release:check`；tag 必须等于本包 `version` 且为 annotated tag。

## License

MIT — 见本包内 [LICENSE](LICENSE)。
