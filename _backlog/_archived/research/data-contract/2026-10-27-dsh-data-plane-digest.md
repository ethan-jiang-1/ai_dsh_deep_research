---
topic: DSH 数据面（FAQ 26）与 deep-research-pack 的落点
intent: 服务发布前数据契约卡：把 FAQ 26 的「承诺 / 家 / 作用域 / 生命周期」框架与本包真实写面逐项对账，留下 Gap 证据。
---

# DSH 数据面阅读：FAQ 26 的框架与本包的落点

> 口径：FAQ 26（`_faq_on_digested/26_plugin-data-model`）按 `0.2.1-rc.3` 写作；本仓 pin =
> `dsh-v0.2.1-rc.2`（`687f282e86`）。凡「DSH 现在如何」，以 `vendor/dsh` 本 pin 的 docs/源码为准；
> 与 FAQ 不一致处标 VERSION-DIFF。证据等级沿用 FAQ：**C** 当前合同（本 pin 源码/docs）、**H** 历史、
> **P** 提案、**U** 未确认。本包代码引用一律相对仓根。

## 1. 一句话

DSH 没有「插件数据目录」。它给的是一组**权威不同、作用域不同、失败语义不同**的存储面（五个家 + 一个
只读层）；作者先选**数据承诺**（P0–P4），再选家、作用域、键与生命周期。FAQ 反复强调的五条硬约束——
无插件数据根、无 per-workspace domain、session 无删除 API、插件无卸载契约、domain 无自动迁移——
是**设计**，不是待修 bug。把它们当缺陷去绕，才会做出第二权威、孤儿数据和不可迁移的 schema。

## 2. 十条压缩（只留会改变决定的）

1. **先承诺，后 API。** 承诺 = 对用户说的话：记住什么、在哪、删了/换机器/升级后还算不算数。
2. **一个事实一个家。** 副本/索引/缓存只能派生；两层都声称权威 = 必然漂移。
3. **用户字节留在用户处。** 插件只存路径、哈希、游标、偏好、可重建副本。
4. **作用域先于存储。** session / workspace / profile / home / device 选错，换 API 也救不回来。
5. **删除与保留是一等设计。** 平台不替你删；作者必须回答「谁删、何时删、删不干净怎么办」。
6. **秘密只存引用。** `CredentialRef` / `CredentialKey` 在调用点解析；文件权限挡不住同 uid 的模型工具。
7. **客户端分两层。** 纯 UI → `localStorage`/`userData`；session-derived 事实 → projection，不能复制。
8. **原生优先。** N0 核心 / N1 随包插件首选；N2 experimental 只参考；E1 社区插件只借模式、不进 `dependencies`。
9. **迁移是数据设计的一部分。** 版本、兼容读、一次性迁移、失败可见、旧数据保留，一起设计。
10. **按代价选路。** 同一份事实通常有 2–3 条都成立的路；选能长期维护的那条。

## 3. 五个家 → 本包的实际落点

| 家 | DSH 权威 | 本包用它做什么 | 结论 |
|---|---|---|---|
| 内容 | 用户（工作区文件） | run bundle、seed、`method-library.md` 都在会话工作区 | P2，正确 |
| 历史 | 会话日志（模型可见 ⟺ logged） | 不新增事件类型；配置页只发 `session/prompt`；驾驶舱从 journal 折 | 正确，零扩展 |
| 状态 | domain / settings / credentials | **无 storage domain、无 volatile config**；凭据只读引用 | 正确，零 home 账本 |
| 派生 | projections / sessionQuery / cache | 驾驶舱 = 文件 + journal 的只读投影；`session-query-sqlite` 显式 `:memory:` | 正确，零持久索引 |
| 客户端 | 浏览器 / 设备 | 本包代码零 `localStorage`；侧栏布局由 vendor 写 | 正确，非本包所有 |
| 只读层 | npm 包 | `presets/`、`skills/`、`workspace/` 种子、`lib/` | 正确，升级整体替换 |

## 4. 本包数据卡（as-is，按 FAQ 41 的列）

| # | 事实 | 承诺 | 权威 | 位置 | 作用域/键 | 寿命与删除 | 可见性 | 卸载后 |
|---|---|---|---|---|---|---|---|---|
| 1 | 角色/preset/skill | 只读层 | 包 | `packages/deep-research-pack/{presets,skills,lib}/` | 安装 | 随包版本 | 模型（注入）/用户 | 安装副本删，源包不动 |
| 2 | 工作区种子（手册/NODES/判型库/模板） | P2 | 落地后用户 | `<workspace>/{AGENTS.md,NODES.md,question-patterns.md,.gitignore,templates/run/*}` | workspace / 文件路径 | 跟目录；用户手删 | 模型（AGENTS 注入）/用户 | 保留 |
| 3 | 种子状态账本 | 插件账本（寄居 P2） | 插件 | `<workspace>/.dsh-research-seed.json` | workspace | **无代码删除**；`--check` 只报告 | 用户（gitignored） | 保留 |
| 4 | scaffold 锁 | 插件临时 | 插件 | `<workspace>/.dsh-research-scaffold.lock` | workspace | 正常退出删；SIGKILL 留，下次接管 | 用户 | 可能残留 |
| 5 | 合并副本 | 插件产生、用户处置 | 用户 | `<workspace>/<file>.seed-new[-<ver>]` | workspace | **无 GC** | 用户 | 保留 |
| 6 | 用户方法库 | P2 | 用户 | `<workspace>/method-library.md` | workspace | 任何模式不覆盖；用户手删 | 用户 + Lead | 保留 |
| 7 | run bundle | P2 | 用户 | `<workspace>/drt_<slug>/`、`archive/`、`_abandoned/` | workspace + slug | 用户手删；无 GC | 模型读写/用户 | 保留 |
| 8 | 交付/审计回执 | 派生 | 无（可重建） | bundle 内 `delivered.json` / `manifest.json` / `acceptance.md` / `audit.md` / `node-gate.md` | run | 每次 ops 重写；`receiptProblems` 校验 final/audit 哈希 | 用户 | 保留 |
| 9 | 交付声明 | 派生（历史家） | 会话日志 | `deliverables/presented` 事件 | session | 跟日志；无删除 API | 模型/用户 | 保留 |
| 10 | API key | P4 | provider | `$DSH_HOME/.credentials.yaml` / env / `.env` | home/profile | DSH 管；本包只读 | 不回传 | 残留是 DSH 语义 |
| 11 | 团队机制层 | N2 依赖 | vendor experimental | `$DSH_HOME/profiles/<p>/`（包 + `dsh.profile.bundles`） | profile | **卸载本包不删** | 用户 | **保留** |
| 12 | 侧栏布局 | 客户端 | 浏览器 | `localStorage['dsh.sidebar-right.v1.<sessionId>']` | device/session | vendor 管；换端口/浏览器丢 | 用户 | 保留（vendor 键） |
| 13 | 会话日志 | 历史 | DSH | `$DSH_HOME/sessions/…` | session | DSH 无删除 API | 模型/用户 | 保留 |

## 5. 对账：哪些做对了（不必改）

- **零 home 账本。** 全仓 `src/**` 无 `ctx.storageDomain`、无 `SessionEventMap` 扩展、无 projection 注册；
  `dev` home 的 `storages/` 只有 DSH 自带的 `session_projcache` 与 `workspace.json`。FAQ 41 的 Q15「不用
  domain 就自造目录，谁来清」在本包不发生——因为没有自造目录。
- **run 绑定是派生的，不是键。** `src/lib/bundle-bind.ts` 从 journal 的 `tool/call` 参数里的
  `drt_<slug>/` 折出「本会话的 run」，write 强绑定、read 弱绑定、立项窗口抑制。这正好是 FAQ 的 P1：
  不引入 `workspaceId`、不建 home 索引，因此没有「删工作区→账本孤儿」这类问题。
- **驾驶舱只读。** `src/client/index.ts` 只调 `remote.workspaceFiles.list/read/stat` 与
  `session.follow`；唯一写是 `session/prompt`（成为普通、可记录的用户消息）。FAQ 的
  「模型可见 ⟺ logged」与「客户端分两层」都满足。
- **交付是引用。** `present` 只记路径，文件留在工作区；`final/vN` 与 `readable-vN` 都是工作区文件。
- **秘密只存引用。** `src/fetch-fallback/credentials.ts` 每次调用 `credentials.resolve(ref)` → env；
  错误文案只带环境变量名，不带值；`data-smoke` 断言假 token 不出现在 stdout/stderr/home 文本。
- **种子是版本化模板，不是第二权威。** `workspace/seed.json` 带版本 + 每文件 sha256；
  `.dsh-research-seed.json` 记「我写过什么/用户改过什么/adopted」；升级只覆盖未改文件，其余写 sidecar。
  这正是 FAQ 13「项目内小标记 + 可核验清单」的合法形态，而且比 home 账本更可移植。

## 6. Gap 证据（按发布风险排序）

### G1 交付回执带绝对路径（实测缺陷）

- 症状：`delivered.json` / `acceptance.md` / `node-gate.md` 可写入本机绝对路径，bundle 交给别人即
  泄漏用户名/目录。
- 证据：`scripts/run-ops/run-accept.mjs:75` 先跑 `path-hygiene` 预检，`:125`/`:128`/`:142` 才写回执；
  `scripts/lib/run-receipt.mjs:167` 把 `present.path` 原样写入；`node-gate.md` 的门②也带着同一路径。
  现网新契约 `research-workspace/drt_cn-open-vs-us-closed-agentic/` 实测 3 处（`path-hygiene` 输出）。
- 为什么是发布风险：这与 `docs/guides/65-run-forms.md` §5「新 run 不写本机 home 绝对路径」直接冲突；
  而「run bundle 可单独移交」是发布承诺。
- 级别：P1（数据可移植性 + 路径泄漏）。

### G2 声称支持的 DSH 版本，客户端面只有安装形状证据

- 现状：`engines.dsh = >=0.2.1-rc.2 <0.3.0-0`，`dsh.compatibility.dshReleases = [rc.2, rc.3]`；
  开发 pin 是 rc.2；`compat-smoke` 在 rc.3 上只证 install / dump / scaffold / remove。
- **本轮已核**：rc.2 → rc.3 在所有数据面相关路径（storage / session / workspace / credentials /
  settings / attachment / spill / deliverables / fs / session-query / CLI）上机制**逐字一致**，只有 2 个
  CLI e2e 测试与 `docs/subsystems/slots.md` 变了；因此数据面本身没有 rc.3 漂移风险。
- 真正的缺口在**客户端面**：rc.3 新增 `ui-entry-customization`，`ui-conversation` 有 view-pins 改动，
  `ui-agent-preset` 有 seat-store 改动。本包 client 依赖 `ui-conversation` / `ui-sidebar-right` /
  `ui-tool` 等槽与 props；没有 rc.3 上的 `client-load-smoke`（真浏览器挂载）证据。
- 为什么是发布风险：装得上 ≠ 挂得上；槽/props 形状变化会让驾驶舱静默缺页签或渲染错位，而安装预检全绿。
- 级别：P1（支持面诚实性；数据面风险已由本轮 diff 排除）。

### G3 没有一张用户可读的数据卡与清理路径

- 现状：事实散在 `packages/deep-research-pack/README.md` §Data、`docs/guides/65-run-forms.md` §2、
  `docs/design/50-agent-loop-and-state.md`、`research-workspace/NODES.md`、种子 `.gitignore.example`。
- 缺什么：一张表回答「装完在哪、卸载留什么、怎么删、换机器带不带走」，以及卸载后
  `.dsh-research-seed.json` / `*.seed-new*` / 团队层 / 浏览器 sidebar 键的处置。
- 级别：P1（支持成本与用户信任）。

### G4 承重依赖是 N2 experimental，但没按依赖层级披露

- 事实：本包不声明 team 行（RFC m2-p1-run-channel A），改由 `scaffold` 安装
  `@deepseek-ai/dsh-experimental-agent-team-profile`（`packages/deep-research-pack/scripts/scaffold.mjs:467`）；
  client 侧还插 `@deepseek-ai/dsh-experimental-client-ui-agent-team`（`cordis.patch.yml`）。两者都在
  `vendor/dsh/packages/experimental/`。
- FAQ 41/42 的发布规则：**N2 只参考，不承诺稳定，不写进发布依赖**。本包没把它写进 `dependencies`，
  但功能上承重、安装时必装——等于把 experimental 的生命周期绑进了发布。上游的原文更硬：
  “Experimental means the complete public capability remains under evaluation and is not a
  product-support commitment. Its behavior or API may change, and the capability may be withdrawn”
  （`vendor/dsh/packages/experimental/README.md`）。
- 现有缓解：按运行中 DSH 版本派生团队层版本、版本不符拒绝改写、`--refresh-team` 显式升级。
- 缺什么：README/guides 明示 N2 层级与代价；`triggers.md` 登记「上游把 agent-team 移出
  experimental / 改名 / 删除」的重议条件；缺失时的失败文案要可行动。
- 级别：P1（发布依赖风险）。

### G5 卸载没有安装侧契约：团队层留着

- 事实：`dsh plugin remove dsh-deep-research-pack` 只移除本包（pnpm remove）；scaffold 装的团队层是
  独立依赖，卸载本包不删；`package.json` 无 `postuninstall` / cleanup。
- 缺什么：README 的 Uninstall 节明确「留下团队层；不需要时这样删」，或提供显式
  `scaffold --remove-team-layer`（默认不做，避免误删其他使用者）。
- 级别：P2（用户环境残留）。

### G6 种子生命周期：状态无 schema 版本、`--force` 覆盖用户 `.gitignore`、垃圾无 GC

- 状态文件 `{version, files, skipped, adopted}` 没有 state schema 版本，未来改语义无门禁；
  解析失败当 `null`，会把已有工作区判成 untracked 而拒绝（安全但不透明）。
- `--force` 会覆盖用户改过的 `.gitignore`（`scaffold.mjs:329`），而 `preflight.mjs:246-247` 把
  untracked `.gitignore` 描述为「保留用户规则」——同一个文件的 owner 说法不一致。
- `*.seed-new*`、孤儿种子、SIGKILL 留下的锁/tmp 状态没有任何清理入口；`.gitignore` 只是拒收，不是清理。
- 级别：P2（升级/清理边界），其中 `.gitignore` owner 不一致建议同批修。

### G7 三条版本轴没有兼容矩阵（种子 / 包 / run bundle）

- 三条轴各自演进：包 semver（`0.1.2`）、种子状态 `version`（= 生成时的包版本）、run bundle 的
  `run.md → contract: YYYY-MM-DD`（D28 纪元）。
- 现状：旧 bundle 有 epoch 豁免（`contractEpochOf` 返回 null）；新包 + 旧种子只在 preflight 里报
  `null`（WARN），不阻断；旧包 + 新 bundle 的 read-side 语义没有声明。
- 为什么是发布风险：升级包但忘了 `scaffold --upgrade` 的用户，会拿**新 preset + 旧手册**跑；
  角色引用的手册章节/技能可能对不上，而系统不会 fail loud。
- 级别：P1/P2（取决于是否把「升级必须重铺」做成硬检查）。

### G8 并发：同 workspace 双实例无锁，仅有文档声明

- 事实：run/method 文件没有跨进程锁；`docs/guides/65-run-forms.md` §4 声明不支持；`triggers.md`
  已登记重议条件。scaffold 自己有 pid 锁（同一 workspace 的 scaffold 串行），但角色写 run 文件不经它。
- 结论：与 FAQ 的「声明并设计清理」一致，**不建议**加一个角色无法遵守的文件锁；保持声明 + 在
  README 数据卡里写明。
- 级别：P2（已覆盖，补用户可见面）。

### G9 `apiKey` 字面量配置口子

- 事实：`packages/deep-research-pack/src/fetch-fallback/index.ts` 的 `Config` 同时有 `apiKey?: string`
  （`.role('secret')`）与 `apiKeyEnv`。`role('secret')` 只保证不回传，值仍会落在 profile patch。
- 现状：默认行只写 `apiKeyEnv`，没有代码写 `apiKey`；但 schema 允许用户/profile 写入。
- 建议：pre-1.0 移除字面量字段，或至少在 README/注释标「仅调试，生产用 apiKeyEnv」。
- 级别：P2（秘密卫生）。

### G10 文档漂移（数据卡顺带修）

- `packages/deep-research-pack/README.md:25` 说 `templates/run/`「七件模板」，盘上 8 件；
  `workspace/seed.json` 12 条 manifest，落地 13 个文件（`method-library.md` 刻意不在 manifest）。
- 级别：P2（准确性，不是行为）。

## 7. 依赖层级对账（FAQ 41 的 N0/N1/N2/E1/E2）

| 能力 | 层级 | 依据 | 发布含义 |
|---|---|---|---|
| `remote.workspaceFiles` / `session.follow` | N0 核心 | client 只读通道 | 最稳，但形状变化即空面板（见 G2） |
| `deliverables/presented` + `tool-present` | N1 | base 无此行，pack 插 | 随 DSH 版本走 |
| `session-query-sqlite`（`:memory:`） | N1 | 官方随包，显式无持久索引 | 零状态，代价是每次进程重建 |
| `ctx.credentials` | N1 | 只读引用 | 值不进本包 |
| `agent-team` / `agent-team-profile` | **N2 experimental** | `vendor/dsh/packages/experimental/` | **承重但无稳定性承诺**（G4） |
| `client-ui-agent-team` | **N2 experimental** | 同上 | 观察面的一部分 |
| E1 社区插件 | — | 本包零依赖 | 无供应链绑定 |
| E2 外部服务 | — | 仅模型/搜索/抓取 HTTP | 运维/网络自负 |

结论：本包没有 E1 依赖，这是对的；真正的层级风险集中在两个 N2。

## 8. 不应该做什么（防「照着 FAQ 抄出一个新问题」）

- 不要为「run 索引 / 上次打开的 run」加 storage domain 或 home 账本——现有 journal 绑定是 P1，
  加了就是第二权威 + 孤儿。
- 不要按 workspace 建 domain（`defineDomain` 静态、一个名字只能开一次）；也不要拿 `workspaceId`
  当长期键（删重加会换 uuid）。
- 不要为驾驶舱状态新增 session event 类型（第三方事件是 required-on-read 合同）。
- 不要在 `$DSH_HOME` 下自造 `deep-research/` 数据根（无配额/迁移/卸载契约）。
- 不要把 run bundle、`method-library.md` 搬进 home 或附件库；`present` 只认工作区/可访问文件。
- 不要用 localStorage 存 session-derived 事实（标题/模型/preset/绑定）。
- 不要依赖 E1 社区插件；不要把 N2 的「现在能用」当成「会一直能用」。
- 不要实现 session 删除 / 附件 GC / 日志 header 改写（DSH 的缺口不是本包的活）。

## 9. 对 FAQ 的更正（本 pin 核出；照抄会出错的地方）

FAQ 26 的框架可用，但它对 rc.3 的若干**机制描述在本 pin 上不成立**。本轮逐条核过，以下五处不要照抄：

| FAQ 的说法 | 本 pin 的事实 | 对我们的含义 |
|---|---|---|
| `$DSH_HOME/plugins/<id>/` 是「惯例」，只是没人清理 | **连惯例都不是**：源码/docs 里没有这个路径，只有 `profiles/`；唯一受支持的持久家是 storage domain | 我们本来就不自造 home 目录——继续保持 |
| `ctx.fs` 是工作区围栏 | **默认 `fs-local` 不围栏**：绝对路径与 `..` 可逃逸；只有挂 `fs-sandbox` 并按调用传 `sandboxPolicy` 才围栏，且读/list 永不围栏 | 我们的 `scaffold` 是独立 Node 脚本（不经 `ctx.fs`），靠自己的根守卫；以后若写 `ctx.fs` 代码，不能假设安全 |
| 附件与 spill 都「无 GC」 | 附件确实永不回收；**spill 有启动时一次性 sweep**（`cleanupPeriodDays` 默认 30，`0` 关闭），根在 OS temp | 我们两者都不用；未来也不要把 spill 当交付 |
| `workspaceId` 删重加换 uuid（可推论「重加必换」） | 删除后重加才换；**同一 canonical path 重新 create 且未删**会返回原记录 | 我们不用 `workspaceId` 当键——不受影响 |
| 第三方不能注册 projection | **可以**：`ctx.sessionProjections.register()` 是公开 seam，带 `stateVersion` 纪律与 fiber 生命周期；不能做的是新增 session event 类型 | 我们目前不需要；若未来要「宿主折好的只读状态」，这是正路，但会引入进程级 key 表的耦合 |

另有一条不是「错」而是**结论要收紧**：rc.2 → rc.3 在 storage / session / workspace / credentials /
settings / attachment / spill / deliverables / fs / session-query / CLI 上机制逐字一致（只有 2 个 CLI
e2e 测试与 `slots.md` 变了）；真正的 rc.3 增量在客户端包（`ui-entry-customization` 新增，
`ui-conversation` view-pins、`ui-agent-preset` seat-store）。所以 G2 的风险面是**客户端挂载**，不是数据读写。

## 10. 未定与边界

- FAQ 26 的外部插件样本只读过源码、没安装；本仓也没有把它们当依赖，故只借判断，不借 API。
- 本轮已把 rc.2 与 rc.3 在数据面相关路径上 diff 完（结论见 §9）；升 pin 时仍应按
  `bumping-vendor-pin` 重跑，而不是复用本轮结论。
- 单 Host、单 `$DSH_HOME`、单账户；多租户/跨机器同步不在范围（与 FAQ 同边界）。
- 现网旧 bundle 的历史绝对路径**不追改**（D28 grandfather）；G1 的修复只约束新回执。
