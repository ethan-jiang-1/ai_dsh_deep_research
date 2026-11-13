# scripts/ · 职责索引

> 职责分组（2026-10-07 目录治理档 C；2026-11-13 命名对齐加 `test/`）：`verify/`、`smoke/`、`test/`、`run-gates/`、`run-ops/`、`dist/` + `lib/` 支撑库；每个盘上入口一行：类 / 证明什么 / 档位。命令与前置正本 = [guides/60 §2](../docs/guides/60-dev-loop.md)；档位列申报凭据/调用模式，不替代 guides/60 的 `source` 前置；子树纪律 = [AGENTS.md](AGENTS.md)；测试资产分层 = [tests/fixtures taxonomy](../tests/fixtures/README.md)。本索引不改脚本路径与命令。

## verify/（L0 结构门禁）

| 件 | 证明什么 | 档位 | 事实来源 |
|---|---|---|---|
| verify.mjs | L0 入口：`--only` 配置 + 按域调用 + 汇总；门禁本体住 `verify/gates/{a-docs,b-pack,c-notes,d-vendor,e-workspace,f-repo}.mjs`，共享助手 = `verify/context.mjs` | keyless | [evaluation §L0 台账](../docs/evaluation.md) |

根面（不分组的配置与指令件）：`doc-budgets.json`（常驻文档行数上限，被 doc-budgets 门禁消费，正本即自身）、`archived-note-pointers.json`（活面→notes/archived 链接的历史指针登记簿，被 archived-note-pointer 门禁消费，正本即自身）、`README.md`（本索引）、`AGENTS.md`（子树常设指令：新门禁流程、范围纪律、命名即层）。

## smoke/（分级冒烟）

> CI 归属 = [registry.json](smoke/registry.json)：每个 smoke 必须登记 `ci` 或 `dev-only` + 理由；
> 机械对账 = [tests/checks/smoke-registry.test.mjs](../tests/checks/smoke-registry.test.mjs)（新增件不登记即红）。
> 命名即车道：`<target>.e2e.mjs` = 真进程，`<target>.entry.mjs` = 真浏览器/profile/tarball，`<target>.support.mjs` = 支援件；`pnpm test:e2e` / `pnpm test:entry` 由 [test/run-lane.mjs](test/run-lane.mjs) 按 registry 的 `lane` 选跑。
> `registry.json` 每条另有 `cost` / `uniqueClaim` / `oracle` / `sunset`；契约 = [tests/checks/smoke-oracle-surface.test.mjs](../tests/checks/smoke-oracle-surface.test.mjs)（oracle 可直测或 `none:` 有理由）。

| 件 | 证明什么 | 档位 |
|---|---|---|
| preset.e2e.mjs | L1 真挂载：boot 页模块表行（client 半 served）、roster、逐角色建会话、skills 隔离 | keyless（`DSH_SMOKE_REAL=1` 起真 DSH，无模型） |
| release.entry.mjs | L2 安装形状：pack → 干净 profile → plugin add → manifest/安装域 client 半断言 → 安装域冒烟 → 端口释放验证（进程卫生：超时预算 + 并发锁 + 退出确认） | keyless（`--install-only` 跳凭据） |
| lifecycle.entry.mjs | L2 发布面/显示面：staged market.json 过 DSH 校验器（plugins 空 + staged 文案）→ 装 tarball → 本包行 dump（未装团队层时无 `ui-agent-team`）→ 真启动无降级 → 装起后 `content.apply` 真注册 `research_pack_root`/`research:manual`、`startup.apply` 真登记工作区、`defaults.apply` 真注册 context/命令，均返回 disposer → `readPluginMeta` 读出五个 specifier 的中英标题/图标 → remove 后 roster 回落 | keyless（真 dsh/pnpm + `_dist` 产物；缺前置 exit 2） |
| install-shape.entry.mjs | L2 安装形状：原样执行手册的 CLI 装包分支（profile init → `dsh plugin --profile … add` pack+team → 真启动）；断言 roster 三状态、无 `did not activate`、首屏可达 | keyless（真 dsh/pnpm + 团队层 registry/缓存；缺前置 exit 2） |
| product-boot.entry.mjs | L2 首启：纯 `dsh --profile deep-research` + Web + 浏览器；Host 注册工作区、blank Lead Session `cwd` = 工作区、首屏/目录按钮/Lead/composer | keyless（需浏览器 + 团队层；缺前置 exit 2） |
| cold-start.entry.mjs | L2 冷启动：独立 `DSH_DEV_HOME` + profile + 端口 + state，`run-driver up --bootstrap` 到浏览器 GREEN；MCP 关闭 | keyless（须先 `source dev/env.sh`；vendor/依赖在位；团队层需 registry/缓存） |
| doctor.e2e.mjs | doctor 只读判据：fake anchor 齐全绿 / 缺行依赖红 / base-only profile 红 / 缺 pack 红 / 空凭据 warn / 坏设置 warn；不安装、不写 profile | keyless（仓库外临时 home + fake anchor/profile；无 dsh/网络） |
| handoff.e2e.mjs | `export-handoff` 产物边界与接收指令：必备源在场、HANDOFF 含 `git init`/fetch/reset/submodule update、无运行态/凭据/run 数据/依赖/.git/导出包 | keyless（git archive HEAD；临时 out；CI keyless 档） |
| run-accept.e2e.mjs | run-accept 全链（合成 bundle+会话日志，真 CLI）：绝对 present 归一、连续两次幂等、bundle 外 present 红不写、final 含 sk- 红不写、`--repair`、`--no-write` 真只读、未知参数 exit 2、整数契约（schema/created → manifest 记版本与日期、repair 保 schema 快照、schema-scan CLI 认新契约） 后绿 | keyless |
| secret-scan.e2e.mjs | 交付物秘密扫描的范围边界：默认不扫 evidence、`--all` 才扫、`--allow-legacy` 只报告、输出不回显值（纯函数正反例归 tests） | keyless |
| data.entry.mjs | T5 数据面切片：包目录零写入、假 token 不泄漏、卸载后 workspace 用户文件 + session 日志保留 | keyless（真 web 启动、无模型调用；tarball 需先 export-dist） |
| pack.e2e.mjs | T0 tarball 形状：入口/patch/preset/content/doctor 在场、exports 可解析、client 模块表（require ↔ `dsh.client.inject` ↔ peers）、无安装脚本/凭据；手册 sha256、两次 npm pack 同 sha、无 symlink/setuid 条目（在场时） | keyless（`npm pack --dry-run --json`；需 lib 已构建——构建产物断言住这里，keyless 回归保持 fresh-clone 可跑） |
| user-env.entry.mjs | 已有 bundle + 用户 overlay + session/凭据/workspace 的安装/卸载共存 | keyless（全局 dsh + 本地 tarball） |
| profile-concurrency.entry.mjs | 两个 `dsh plugin add` + 两个 `remove` 同 profile 并发：至少一个成功、dump 可解析、最终无本包；不留双 bundle/坏 profile | keyless（全局 dsh + tarball） |
| workspace-isolation.entry.mjs | B4 双实例：两套 home/profile/port/state/workspace 各起通道、各建会话；会话组绑定自己的 W、home/session 互斥、marker 互不可见 | keyless（真 web，不调模型；更慢，约两套 cold start） |
| client-load.entry.mjs | 观察面真浏览器装配、页签与渐进面对账（`--seed <dir\|name>` = 从 tests/fixtures/client-load-home 自建 home，CI/干净机器用；磁盘参考选择 = client-load-reference.support.mjs；「研究配置」摘要相位 = client-load-config.support.mjs；终稿端到端相位 = client-load-final.support.mjs；主界面「方法库」相位断言 A′ 两列、详情进入访谈、表单检查与显式来源选择，零模型 prompt；失败留现场（png/html/console/meta + `disconnects` 计数），无窗口内交付目标 = exit 2 SKIP；主机不健康 = exit 2 NOT-RUN（预检；失败时连接死亡同判，判据 = lib/host-health；诊断逃生口 `DSH_CLIENT_LOAD_ALLOW_UNHEALTHY=1` 人工强制跑，失败仍 NOT-RUN） | keyless（浏览器） |
| client-load-seed.support.mjs | client-load.entry（`--seed`） | 种子夹具 materialize：会话组名 = projectKey(种子工作区) 现算、zstd 两帧（header 单帧）、mtime 回拨 2h、`__WORKSPACE__`/`__REPO_ROOT__` 替换；不写仓内 research-workspace | 支援件（fixture → runtime） |
| method-library-tool.e2e.mjs | 真 Loader + Method Editor Agent + Host Tool：验证 UI 操作 claim、内容摘要拒绝、默认/删除写入及 workspace 回读 | keyless（临时 workspace 与确定性 mock LLM） |
| e2e-021rc2.entry.mjs | **升级端到端验收**（0.2.1-rc.2 起）：① 四个研究角色在角色列表里连续成组（内置 standard/ptc/minimal/creator 与 pack order 撞车的回归锁）② 右栏「研究状态」胶囊可点 + 页签体真数据 ③「研究配置」同上 ④ 本插件面零故障；真实实例走完用户路径，不靠人眼 | keyless（浏览器；须先 source dev/env.sh；失败留现场） |
| snapshot-replay.entry.mjs | 场景 manifest 驱动的角色面组装回放（persona/header 全序列/四处注入，含时钟序列；research-face = 四研究角色 + 方法编辑）+ 声明的渲染金标准；场景集 = `snapshots/replay/` 下含 snapshot.json 的全部目录（发现式，`--face <name>` 定向单集） | keyless（RPC/解压子进程，无模型；A/B 进 CI `snapshot-replay`，`--layers a,b`；C 本地；须先 source dev/env.sh） |
| gates.e2e.mjs | 门禁自测：临时副本注入回归经真实 verify 入口点名报红 + 零注入对照组；`--case=<id[,id]>` 只跑指定案例（改一道门禁的迭代口，末尾自报仅跑几个）；CI keyless job 每次全量跑 | keyless（git/node 子进程，无模型） |
| client-hitl.entry.mjs | 活标题触发与挂起显性化 | 真模型档 |
| l4-lite.e2e.mjs | 全角色真模型响应（含 method-editor）+ scout web_search 调用 | 真模型档 |
| team-preflight.e2e.mjs | spawn_teammate 组队与成员组合画像 | 真模型档 |
| cdp-ask.entry.mjs | cdp-probe `--ask` 端到端：空闲态 `Send message` 与在飞态 `Queue message` 双路径发出 + **journal 落盘对账**（BUG-021 正修；判定本体 keyless 钉在 `lib/probe-send-target.mjs`） | 真模型档 |

## probes/（探针，已迁根）

探针住根 [probes/](../probes/README.md)：指南 = [guides/66](../docs/guides/66-probe-playbook.md)，索引 = [probes/INDEX.generated.md](../probes/INDEX.generated.md)。本索引不再手枚举探针（头注是事实源，索引是生成物）。

## 分发/安装失败面 → 资产

| 失败面 | 资产 | 前置 |
|---|---|---|
| 包内容/导出/安装脚本/手册 sha | `pack.e2e`、`package-contract.spec`、`export-dist` | 需 lib；手册/tarball 在场 |
| 已有用户环境（别的 bundle + overlay + session/凭据/workspace） | `user-env.entry` | 全局 dsh + tarball |
| 双实例 W/H 隔离 | `workspace-isolation.entry` | 真 web；约两套 cold start |
| 数据面零写入/secret/session 保留 | `data.entry` | 真 web + tarball |

## run-gates/（run bundle 机械门与审计）

| 件 | 证明什么 | 档位 |
|---|---|---|
| node-gate.mjs | 判据级：门①②③④ + 门L + 门R（标题重复退化，2026-10-06 起）+ 门A（交付完整性，2026-10-08 起）+ 门C（读者版合同，2026-10-23 起；图例正本 = research-workspace/NODES.md 头部），默认只读，`--write` 才落 bundle 报告——判据核心住 lib/node-gate-core.mjs 聚合及领域模块（本件 = CLI 壳 + zstd reader 注入） | keyless |
| schema-scan.mjs | 在场级：八节点输出件在场断言（整数契约/日期两态断代；判据核住 lib/schema-scan-core.mjs，本件 = CLI 壳） | keyless |
| evidence-audit.mjs | URL/摘录/final 链溯源对账；默认只读，`--write` 才落 audit.md——判据核心住 lib/evidence-audit-core.mjs（本件 = CLI 壳 + zstd reader 注入） | keyless（须 source dev/env.sh） |
| path-hygiene.mjs | run bundle 的 `final/`/`acceptance.md`/`delivered.json`/`provenance/` 本机 home 路径；默认红，`--allow-legacy` 旧场只报告 | keyless |
| verdict-audit.mjs | **claim 级裁决审计**：`review/claims.json` + `review/verdicts-r<N>.json` 的覆盖（critical 全有结论性裁决）/ 值域 / raw 原文重解析 / 与 child 会话逐字一致 / child preset·depth·只读；默认只读，`--write` 才落 `review/verdict-audit-r<N>.md`；旧 bundle/quick_factual/契约日前 = 不适用（epoch），`--require` 强制审——判据核心住 lib/verdict-audit-core.mjs（本件 = CLI 壳 + zstd reader 注入） | keyless（须 source dev/env.sh） |
| protocol-audit.mjs | **Protocol（研究设计）审计**：schema/枚举/四字段/canonical hash/effort 合同/output 形状/`§Protocol` 投影/策略行投影（通道/worker/预算上限；预算不可解析 = 红）/`§Decisions` 与 `plan.md` 版本/`approval_basis`/复合方法包含判据/`deviations` 形状；默认只读，`--write` 才落 `protocol-audit.md`（版本指纹行）；旧 bundle/契约日前 = 不适用（epoch），`--require` 强制审——判据核心住 lib/protocol-core.mjs（schema）+ lib/protocol-audit-core.mjs（bundle 审计；本件 = CLI 壳 + bundle 读取） | keyless |
| secret-scan.mjs | 交付物面（final/、receipts、audit、node-gate）的高置信凭据形态（sk-/ghp_/AKIA/AIza/xox[baprs]-/PRIVATE KEY/Bearer）；默认红，`--allow-legacy` 旧场只报告，`--all` 加证据/过程件；输出只到 path/line/kind | keyless |

## run-ops/（run 观察与运维）

| 件 | 证明什么 | 档位 |
|---|---|---|
| watch-run.mjs | 谓词化状态判定（HITL-PENDING / RUN-SETTLED 自报；挂起带 `hitlAgeMs` / STATE-NOTE 等待分钟）；teammate 会话（首事件 origin=subagent）显性提示「hitlPending 不构成停靠信号」；TIMEOUT 文案带归档提示（bundle 已归档 → 盯旧会话永不落定）；`--group <子串>` 换组盯场（缺省 research-workspace） | keyless（会话根缺省回退开发 home；显式 source 更稳） |
| session-events.mjs | **会话事件尾部**（agent 的"刚才发生了什么"入口）：id/标题 → `[HH:MM:SS] type 摘要`；`--tail/--type/--grep/--json/--group`（组过滤盲区逃生口——冒烟/自测组可读，缺省 research-workspace）；`--stuck-after <分钟>` 给卡住判定（开回合 + 静默超阈，`STUCK`/`NOT-STUCK`）；teammate 标题 strip `<system-reminder>` 前缀；摘要与筛选 = lib/session-events-core.mjs | keyless（读会话日志；须先 source） |
| run-dashboard.mjs | 只读 HTML 投影：多 run 扫描 + 步骤条 + 归档场 stdout 标注（fail-soft；解析/模型住 lib/run-dashboard-core.mjs、渲染住 lib/run-dashboard-html.mjs，本件 = CLI 壳） | keyless |
| stream-diagnostics.mjs | 流失败归因诊断（run-ops）：模型尝试时间线/失败密度/provider 与重试策略实名/工具调用与检索查询——出问题第一步跑它；`--recent N` 限制最近 N 个有模型活动的会话 | keyless（读会话日志） |
| provider-error-stats.mjs | 上游流错误（回合被终结）的跨场分布投影（BUG-022 的"可数"面；判据与抽取 = lib/provider-errors.mjs） | keyless（须 source dev/env.sh） |
| plan-card-stats.mjs | 计划确认卡字数的跨场分布投影（升硬门前置 = 连续多场达标；口径与识别 = lib/plan-card.mjs，与 node-gate 门① 同源） | keyless（须 source dev/env.sh） |
| session-replay.mjs | **历史会话回放**：任意历史会话（id 全名/标题唯一子串，跨组）在真实 UI 里重开并抓场景包——检验/扩大症状还原面；判据纯函数 = lib/session-replay.mjs，浏览器编排在本壳（keyless：起一次性通道 + 登记 cwd 工作区 + 按 id 打开 + 五件套落盘；`--open-status` 展开右栏研究状态页签） | keyless（真实浏览器；须先 source） |
| scene-capture.mjs | **场景包捕获与读取**：抓取（连已起 GUI → 截图(fullPage)+DOM+正文+console+meta，token 脱敏，落 `runtime/scenes/<name>/`）+ 读取（`--list` 列既有包 / `--show <name>` 看单包——事后看现场，消费闭环；判据 = lib/scene-pack.mjs） | 抓取 keyless（真实浏览器；须先起通道）；读取 keyless（纯读盘） |
| run-inventory.mjs | **只读保留期视图**：`--workspace <dir>` 扫 root/`archive/`/`_abandoned/` 的 `drt_*`，逐场文件数/大小/最老日期与合计；`--json` 给脚本；不删除任何文件（折算 = lib/run-inventory-core.mjs） | keyless |
| run-accept.mjs | **交付验收原子动作**：node-gate（门 A/交付两门）+ evidence-audit（audit.md）+ verdict-audit（claim 覆盖）+ protocol-audit（Protocol 设计/`protocol-audit.md`）+ path-hygiene（新 bundle 本机 home 路径零容忍；旧 bundle --allow-legacy）+ 未来日期 sanity；预检 `--no-write` 红不写，绿才落盘 node-gate/audit + `delivered.json` + `manifest.json` + `acceptance.md`（回执生成/校验 = lib/run-receipt.mjs，新 run 非 quick_factual 的 reader 角色/哈希一并绑定；present 归一化为 `drt_<slug>/final/vN` 相对标签，语料根写 `$DSH_HOME` 相对标签；待写回执先校验再落盘，门禁/审计生成物落盘后复检；旧 bundle 只写 acceptance）；`--repair` 修历史回执的绝对路径（只动可再生产物）；`--archive` 才移入 archive/ | keyless（须先 source dev/env.sh） |
| unconsumed-evidence.mjs | **B1 差集出题的操作侧投影**：bundle 的 evidence/ 未进 findings.md 清单（收尾核验入口——lib 头注承诺"操作侧核验"，此前无 CLI；判据 = lib/unconsumed-evidence.mjs） | keyless |
| bundle-sessions.mjs | **bundle → 见证会话反查**：给 bundle 或 slug，按绑定谓词（写过 `drt_<slug>/` 的 lead 会话）列出会话 id/组/present 条数，并打印**状态摘要**（runStateOf 的 events/hitlPending/runSettled 一行）与下一步诊断命令——诊断入口都要会话 id，而 bundle 不记它（折算 = lib/bundle-sessions.mjs，绑定语义复用 node-gate 门①②同一条谓词） | keyless（须先 source dev/env.sh；默认只扫 `research-workspace` 组、结果按日志 mtime+size 缓存——首次约 25s、重复调用 <0.1s；`--all` 扫整根、`--no-cache` 绕过） |
| acceptance-check.mjs | **收活判据三态求值**：`<bundleDir> + <criteria.json>`（判据 = 委派方显式清单，仓内无落盘约定）→ 逐条 PASS/FAIL/UNVERIFIED 与汇总（"收活结论"对账成机械事实；判据 = lib/acceptance-check.mjs）。退出码 = 0 全 PASS / 1 有 FAIL·UNVERIFIED·零判据 / 2 用法或前置错 | keyless |
| runtime-clean.mjs | **运行区清理**：默认 dry-run；`--yes` 才删；白名单容器/实验根 + 子树最新 mtime 保留期（缺省 14 天）；symlink / harness-home / research-workspace / scenes 永不候选（scenes = 证据，人工处理；判据 = lib/runtime-clean-core.mjs） | keyless |

## dist/（分发）

| 件 | 证明什么 | 档位 |
|---|---|---|
| export-dist.mjs | pack → `_dist/` 安装包、安装手册与 staged 市场索引（tarball/手册同版本；market 为 0 条目） | keyless |
| market.mjs | 生成 `_dist/market.json`（DSH 插件市场 format 1），先过 `parseMarketIndex` 再落盘；`--check` 只校验 | keyless |
| export-handoff.mjs | HEAD 的 tracked 源 → `_dist/` 干净移交包（不含运行态/凭据/run 数据/依赖）；submodule 需对方 init | keyless |
| release-check.mjs | 发布前版本/tag 一致性（root = pack、HEAD tag = version、tag 为 annotated）；只读 | keyless |

## test/（测试车道 runner）

| 件 | 证明什么 | 档位 | 事实来源 |
|---|---|---|---|
| run-lane.mjs | `pnpm test:e2e` / `test:entry`：按 `scripts/smoke/registry.json` 的 `lane`/`tier` 选跑，0/1/2 汇总 | keyless 壳（脚本自检前置） | registry.json + `lib/smoke-lane.mjs` |

## lib/（支撑库）


| 模块 | 被谁消费 | 说明 |
|---|---|---|
| lib/content-budget.mjs | e-workspace、content-disclosure.spec | 常驻面预算唯一正本：T0 两级（下放 10,000 / 硬顶 12,288）+ lead persona/合计的 char/byte/token |
| lib/roles.mjs | discipline-probe、doctor.e2e、fetch-fallback-orchestration.spec、l4-lite.e2e、preset.e2e、presets.spec、release.entry、replay-scene.spec、snapshot-replay.entry、strategy-core.spec、team-preflight.e2e | 角色清单访问器（presetRoles = 盘上全部；researchRoles = 研究面；事实源 = 盘上 presets/） |
| lib/cli-entry.mjs | export-handoff、gates.e2e、market、run-dashboard、protocol-audit、schema-scan、verdict-audit、node-gate、evidence-audit、channel-cache、run-driver、vendor-artifacts、cli-entry.test | symlink-safe CLI 入口判定（realpath 归一；macOS `/tmp` → `/private/tmp` 下不静默） |
| lib/channel-cache.mjs | run-driver、channel-cache.spec | 启动加速缓存判据：pack 源指纹（路径+size+mtime）+ 发布清单缓存（漂移门 ≈5s→≈0.7s，CLI 供 boot-run.sh 消费）+ 探针 GREEN 缓存（热复用 ≈0.5s / 冷启动命中 ≈10s；键 = pack 指纹 + runtime 构建 + 断言参数，TTL 30 分钟；命中前 HTTP 就绪检查；只存 GREEN，`--force-probe` 绕过） |
| lib/bundle-sessions.mjs | bundle-sessions、bundle-sessions.spec | run bundle → 见证会话反查：聚合 scanWitnessLogs 的 boundSessions/presented（绑定谓词不另立——与 node-gate 门①②同源）；交付回执的 witness.sessions 亦由此面派生 |
| lib/hitl-card-driver.mjs | hitl-answer | HITL 问询卡的浏览器内驱动片段（Playwright `page.evaluate` 入参）：问卡可见性、选项结构、提交/推进按钮可用性；纯 DOM 函数、零闭包，业务判定仍在 lib/ask-drive |
| lib/frontmatter.mjs | bundle-date-sanity、evidence-audit-core、frontmatter.spec、run-dashboard-core | `---` frontmatter 拆分**唯一正本**（两 core 共用同一实现） |
| lib/zstd-read.mjs | bundle-sessions、evidence-audit、node-gate、run-accept、verdict-audit | zstd CLI 文本解压**唯一调用段**（多帧拼接靠 CLI；成功/失败结构化返回，**失败契约留各壳**：`''` 继续 vs `null` 跳过） |
| lib/web-harness.mjs | client-hitl.entry、client-load.entry、defaults-probe、discipline-probe、wave-execution-probe、e2e-021rc2.entry、entry-chain-probe、l4-lite.e2e、method-library-probe、preset.e2e、rerun-triage-probe、run-driver、session-replay、snapshot-replay.entry、team-preflight.e2e | DSH web 冒烟族**启停与通道唯一正本**：`bootWeb`（等启动横幅拿 token）+ `authenticate` + `makeRpc`；**参数保形**——端口/超时/尾部字符/rpcId 前缀/失败文案与收割方式全留各站点 |
| lib/session-log.mjs | bundle-sessions、cdp-ask.entry、cdp-probe、client-hitl.entry、client-load-reference.support、defaults-probe、client-load.entry、data.entry、discipline-probe、wave-execution-probe、e2e-021rc2.entry、entry-chain-probe、hitl-answer、l4-lite.e2e、method-library-probe、plan-card-stats、product-boot.entry、provider-error-stats、rerun-triage-probe、run-dashboard-core、run-kickoff、run-state、run-state.spec、session-events、session-log.spec、session-replay、snapshot-replay.entry、stream-diagnostics、team-preflight.e2e、verdict-audit、verdict-audit-fixture.spec、watch-run、workspace-isolation.entry | canonical 日志选择与读取 + 会话目录发现（findSessionDir 双形态/首匹配；readSessionTextOf 定位+读取——六处真模型档副本 2026-11-04 收口）+ 会话组发现（findGroup 子串参数化，缺省 research-workspace——BUG-010 三处同款一行收敛；冒烟/自测组逃生口 = 观察工具 --group） |
| lib/session-events-core.mjs | session-events、session-events.spec | 会话事件摘要与筛选纯函数（CLI 壳 = run-ops/session-events 行） |
| lib/llm-stream-tee-core.mjs | llm-stream-tee-core.spec | LLM 流 tee 的捕获判定（主机子串，fail-closed）与凭据头脱敏（预载壳 = probes/stream/llm-stream-tee.cjs——CJS require 面不在 .mjs 对账图内，壳本体是活进程仪器不设 keyless 自测） |
| lib/provider-errors.mjs | provider-error-stats、provider-errors.spec | 回合被上游流错误终结的结构化抽取（唯一语义源：只认 `turn/end` + `reason.kind=error`，不双算 `assistant/attempt`） |
| lib/plan-card.mjs | node-gate-session-gates、plan-card-stats、plan-card.spec | 计划确认卡识别与字数口径（唯一语义源：标签「按计划开跑」+ `question` 字段全长 + 阈值 200） |
| lib/protocol-core.mjs | content-coverage.spec、protocol-audit、protocol-audit-core、protocol-core.spec、research-defaults.spec、strategy-core | Protocol **schema 半**：枚举/canonical/hash/validateProtocol/§研究方法 与 §Decisions 解析（无 IO；口径 = 核验 §6 + 表达层补篇 §4–§7） |
| lib/protocol-audit-core.mjs | protocol-audit、protocol-core.spec、run-accept.e2e | Protocol **bundle 级判据**：effort 合同/投影/策略行投影（通道/worker/预算 cap；fail-loud）/批准链/plan 引用/audit hash/版本快照 + `projectionOf`/卡文（无 IO） |
| lib/strategy-core.mjs | protocol-audit-core、strategy-core.spec | Strategy 投影（K/O/G/B）纯派生：Protocol + plan + topics → 通道/worker/角色/拓扑/门/预算；不读模型/会话 |
| lib/stream-diagnostics-core.mjs | stream-diagnostics、stream-diagnostics.spec | 模型活动会话筛选（活动事件预筛后再按日志 mtime 取最近 N）+ 尝试时间线投影（assistant/message 计成功、assistant/attempt 计失败/无落面，终态三判 alive-or-idle/recovered/dead） |
| lib/run-state.mjs | bundle-sessions、cdp-ask.entry、hitl-answer、run-kickoff、run-state.spec、session-events、session-replay、watch-run | run 操作面状态谓词 |
| lib/run-source-node.mjs | evidence-audit、node-gate、run-context-node.spec、schema-scan | node:fs 的 RunSource 适配器：list/read/version；ENOENT → missing，其余 → unreadable；行窗口与 eof 语义对齐 vendor workspaceFiles |
| lib/env.mjs | cdp-ask.entry、client-hitl.entry、client-load.entry、data.entry、defaults-probe、discipline-probe、wave-execution-probe、doctor.e2e、e2e-021rc2.entry、entry-chain-probe、env-credentials.spec、install-shape.entry、l4-lite.e2e、lifecycle.entry、method-library-probe、pack.e2e、preset.e2e、product-boot.entry、profile-concurrency.entry、record-role-fixture、release.entry、rerun-triage-probe、run-accept.e2e、session-replay、snapshot-replay.entry、team-preflight.e2e、user-env.entry、workspace-isolation.entry | 子进程环境清洗（scrubbedEnv/withModelKey）与真模型档前置（requireCredentials/credentialsPresent——凭据卫生） |
| lib/playwright.mjs | client-hitl.entry、client-load.entry、e2e-021rc2.entry、hitl-answer、product-boot.entry、session-replay、snapshot-replay.entry | Playwright 启停支撑 |
| lib/browser-cache.mjs | playwright、browser-cache.spec | 浏览器缓存目录判据（macOS/Linux/Windows 三态 + `PLAYWRIGHT_BROWSERS_PATH` 覆盖） |
| lib/host-health.mjs | client-load.entry、host-health.spec | 真浏览器冒烟的主机健康判据（freeMB / load-per-CPU）：预检与失败归因都把环境红归为 NOT-RUN（exit 2），不伪装产品红 |
| lib/cdp-driver.mjs | cdp-probe、scene-capture | 裸 CDP 驱动 |
| lib/session-replay.mjs | session-replay、session-replay.spec | 历史会话定位/元信息/判读整形纯函数（跨组枚举、id 优先、标题歧义如实报候选；会话→工作区靠首事件 cwd） |
| lib/scene-pack.mjs | scene-capture、scene-pack.spec | 场景包读取/列示纯函数（五件套概要如实——缺件与坏 meta 不静默；mtime 降序） |
| lib/inject-reconcile.mjs | cdp-probe、inject-reconcile.spec、run-kickoff | 注入消息「落盘对账」判据（BUG-021 正修：日志里出现本条 user/message 才算送达；时间下界防同文假阳） |
| lib/probe-send-target.mjs | cdp-probe、probe-send-target.spec | 提交按钮判定纯函数（BUG-021 正修：send 家族六标签状态机 + **stop 家族拒点** + composer 邻近窗；页面只读 DOM 与执行点击） |
| lib/final-version.mjs | final-version.spec、node-gate-delivery-gate、node-gate-reader-gate、node-gate-run-gates、node-gate-session-gates、run-accept、run-dashboard-core、run-receipt、schema-scan-core、verdict-audit | 终稿版本文件名的唯一判据（纯判据从 pack `src/lib/final-target.ts` 取；目录扫描 = final/ 与 readable-vN）；旧 vN 正则的机械漂移锁 = tests/run/final-version.spec |
| lib/probe-status-tab.mjs | cdp-probe、probe-status-tab.spec、session-replay | 右栏「研究状态」页签判定纯函数：胶囊按**标题 span 逐字**匹配（拒绝描述串入 / 近似标题）、页签体只认 `[data-sidebar-right-tab]`（不拿会话正文当观察面） |
| lib/probe-index.mjs | f-repo、probes/_index.mjs、probe-index.spec、smoke-contract.test | 探针索引纯函数（递归扫描 `probes/`、解析头注六字段、按域分组渲染；门禁 probe-registry 消费同一渲染；索引不复制判据/不证明长文） |
| lib/run-channel.mjs | run-driver、run-driver-contract.spec | run 通道驱动判据纯函数：web.log → 当前 GUI URL（取最后一条横幅）、浏览器面 verdict → 呈交判决（GREEN / RED / NOT-RUN） |
| lib/ask-drive.mjs | ask-drive.spec、hitl-answer、run-kickoff | 代答读窗与谓词 |
| lib/workspace-root.mjs | bundle-sessions、evidence-audit、hitl-answer、node-gate、plan-card-stats、provider-error-stats、schema-scan、session-events、session-log、watch-run、workspace-root.spec | dev 工作区根解析（flag → DSH_RUN_WORKSPACE → 仓内默认）+ vendor 同形 `projectKey(cwd)` 会话组（D38 C1：替代数据根/组名各写一份；legacy substring 兜底） |
| lib/web-ui-nav.mjs | cdp-probe、client-hitl.entry、client-load-config.support、client-load-final.support、client-load.entry、e2e-021rc2.entry、hitl-answer、library-fold.spec、session-replay、web-ui-nav.spec | 观察面侧栏会话定位**唯一正本**（2026-10-21 收拢，六处私有版退役）：data-row-key 主锚（session:\<id\>/workspace: 行键）+ 折叠组展开（expandGroup，data-row-key 主 + 类名兜底）+「Show N more」逐层 + 搜索兜底（结果无行键→按文本点）；类名扫描降级为兜底——两套选择器各有实红教训，裁决依据 = 模块头注；零依赖 page 鸭子类型；CDP 边界 = 纯常量 SHOW_MORE_SESSIONS_PATTERN / PREVIEW_NOTICE_PROBE_JS 供 cdp-probe evaluate 字符串消费（后者 = 首屏 Preview Notice 遮罩的探测与关闭，keyless 钉 = web-ui-nav.spec）；真浏览器证据归消费方冒烟档（client-load.entry / e2e-021rc2.entry） |
| lib/unconsumed-evidence.mjs | unconsumed-evidence、unconsumed-evidence.spec | B1 机械基座：evidence/ 未进 findings.md 的差集投影（critic 差集出题的操作侧对账；CLI 壳 = run-ops/unconsumed-evidence 行） |
| lib/acceptance-check.mjs | acceptance-check、acceptance-check.spec | 收活判据机械求值：PASS/FAIL/UNVERIFIED 三态（DeerFlow acceptance_criteria keyless 移植，判不了永不静默放行；CLI 壳 = run-ops/acceptance-check 行） |
| lib/hitl-provenance.mjs | ask-drive.spec、client-hitl.entry、hitl-answer、hitl-provenance.spec、node-gate-witness.spec、run-kickoff | 代答 provenance 写盘（BUG-014 正修——代理模拟显式记账；BUG-017 题面富集） |
| lib/local-date.mjs | export-dist、hitl-answer、local-date.spec、schema-scan-core、schema-scan.spec | 人读日期行本地口径（与 bash date 同源；BUG-017 正修——UTC slice 凌晨窗口差一天） |
| lib/bundle-date-sanity.mjs | bundle-date-sanity.spec、run-accept | run bundle 未来日期检查（操作侧验收前哨——r1-license 29 处未来日期事故的机械面；消费语境 = run-accept 行） |
| lib/vendor-artifacts.mjs | cdp-ask.entry、client-hitl.entry、client-load.entry、defaults-probe、discipline-probe、wave-execution-probe、entry-chain-probe、l4-lite.e2e、preset.e2e、session-replay、team-preflight.e2e、vendor-artifacts.spec | vendor 构建产物自检 |
| lib/backlog-liveness.mjs | backlog-liveness.test、f-repo、staged-change-pairing | 问题卡、缺陷、调研、方法与归档索引的结构合同；被 verify 入口与 keyless 回归消费 |
| lib/staged-change-pairing.mjs | staged-change-pairing.test、f-repo | 暂存区成对变更判据（归档卡↔Note、ui.expected↔lastRewrite）；纯函数，git 由门禁注入 |
| lib/direct-authorization-boundary.mjs | entry-chain-probe、entry-chain-probe.spec | 按授权范围执行、无需重复请批的词面判定；由探针与 keyless 回归消费 |
| lib/replay-scene.mjs | replay-scene.spec、snapshot-replay.entry | 场景声明消费者：roster/版本/来源形状/路径校验（缺件、串角色、垃圾锚点 fail-loud）+ 场景集发现（`replay/*/snapshot.json` 全集、防空语料、--face 全名定向） |
| lib/replay-request.mjs | record-role-fixture、replay-request.spec、snapshot-replay.entry | 组装请求面逐条比较：persona、header 全序列、四处 user/message 注入（含时钟序列）（定向归一化） |
| lib/snapshot-mode.mjs | snapshot-readonly.test、snapshot-replay.entry | 快照 smoke 模式判据：只读/刷新互斥、`DSH_SNAPSHOT` 只认 replay、刷新必须 `--why` |
| lib/smoke-lane.mjs | run-lane、smoke-lane.test | smoke 车道选择：lane/tier 过滤、support 不进车道、默认 ci + `--all` |
| lib/profile-health.mjs | profile-health.spec、record-role-fixture、snapshot-replay.entry、team-preflight.e2e | dev profile 版本面预检：团队层版本 == 运行时 dsh 版本；缺席/落后 → 明确 exit 2 + 重建指令（BUG-066） |
| lib/startup-hint.mjs | startup-hint.spec、web-harness | boot 失败归因：识别日志里的 incompatible/exemption，指出 profile 未随 pin 重钉（BUG-066） |
| lib/client-load-select.mjs | client-load-reference.support、client-load-select.spec | client-load 绑定会话选择（只认 lead 根；防富 coach 会话假红，BUG-142） |
| lib/port-reclaim-policy.mjs | port-reclaim.spec、port-reclaim | 端口 listener 身份纯判据（只认本仓 DSH web；无子进程依赖） |
| lib/run-lock.mjs | client-load.entry、run-lock.spec、snapshot-replay.entry | 冒烟脚本进程级运行锁：存活拒跑、陈旧锁接管、释放（共享 DSH_HOME 的脚本互斥） |
| lib/replay-network-offline.cjs | snapshot-replay.entry | 回放 A 层离线闸 preload：非 loopback DNS(lookup/resolve*)/connect 立即失败；只作用于 dsh 主进程（BUG-064/067） |
| lib/replay-network-offline-policy.cjs | replay-network-offline.spec | 离线闸纯判据（isLoopback/isDshMain；无 node:net 依赖，测试可直引） |
| lib/port-reclaim.mjs | client-load.entry、cold-start.entry、data.entry、defaults-probe、preset.e2e、product-boot.entry、release.entry、wave-execution-probe、workspace-isolation.entry | 端口收割执行器（按端口杀 + 三轮验证释放；实测依据 = web 孙进程不在子进程组里） |
| lib/path-hygiene.mjs | node-gate-session-gates、path-hygiene、path-hygiene.spec、run-accept、run-receipt | 本机 home 路径纯文本检测（Unix/macOS/Windows 前缀；行号）+ `portableBundlePath`（bundle 内绝对路径 → `drt_<slug>/…` 可移植标签；bundle 外 → null） |
| lib/secret-scan.mjs | run-accept、secret-scan、secret-scan.spec | 高置信凭据形态检测（sk-/ghp_/AKIA/PRIVATE KEY/Bearer）；只报 path/line/kind，不回显原文 |
| lib/selftest-library.mjs | library-fold.spec | 「研究配置」面板/library-fold 自测例库单一正本：12 形态条目（四字段/部分/空值/旧格式/混居/重名/空条目/杂项行/续行/缩进），两处共用防形态漂移 |
| lib/method-presets.mjs | library-fold.spec、method-presets.spec | research-brief skill「方法预设」表的唯一解析入口（表头/行列数/防空集 fail-loud）——内置名单不再各写一份手写副本 |
| lib/keyless-imports.mjs | layering.test、test-surface.test、client-surface.test、test-lanes.test | 只读 import 检查（解析器 = typescript 纯函数；company keyless-imports@59551f2 移植）——调用表达式解析 + 本地 import 闭包图 |
| lib/gates-cases.mjs | gates.e2e、verify-gates.test | 门禁自测的注入案例表（纯 fs mutate；git add 由驱动壳统一执行） |
| lib/run-accept-fixture.mjs | run-accept.e2e、run-accept-fixture.spec | claim 夹具的 review/readiness 文本（D51 同源：有声明 = declaration/PASS，缺声明 = missing/红） |
| lib/node-gate-core.mjs | node-gate、node-gate-delivery.spec、node-gate-leads.spec、node-gate-session.spec | bundle 判据聚合；唯一导出 = `gateBundle`，领域门直接 import 各自模块 |
| lib/node-gate-contracts.mjs | node-gate-contracts.spec、node-gate-delivery-gate、node-gate-reader-gate、node-gate-run-gates、node-gate-session-gates、node-gate-delivery.spec、readiness-declaration.spec、review-readiness.spec、verdict-audit、verdict-audit-core | 交付日期合同、readiness 与 decisions 行解析 |
| lib/node-gate-session-gates.mjs | ask-drive.spec、bundle-sessions、node-gate-core、node-gate-delivery-gate、node-gate-witness.spec、node-gate-delivery.spec、node-gate-session.spec、run-accept | HITL、present 与 §Decisions 会话门 |
| lib/node-gate-run-gates.mjs | node-gate-core、node-gate-leads.spec、node-gate-session.spec | leads、版本与标题退化门 |
| lib/node-gate-delivery-gate.mjs | node-gate-core、readiness-declaration.spec、run-receipt.spec | 门A 交付完整性判据 |
| lib/node-gate-reader-gate.mjs | node-gate-core、node-gate-reader.spec | 门C 读者版合同：同版/六节/长度/无来源路径；数字子集只 WARN；旧场/quick_factual 豁免 |
| lib/schema-scan-core.mjs | node-gate-contracts、node-gate-contracts.spec、node-gate-core、node-gate-delivery-gate、node-gate-reader-gate、node-gate-run-gates、node-gate-session-gates、protocol-audit、run-accept、run-bundle-charter.spec、run-receipt.spec、schema-scan、schema-scan.spec、verdict-audit | 节点 I/O 契约在场级断言判据核（交付日/研究类型/条件件豁免/断代定红——从 run-gates 下沉修 lib→入口层反向依赖） |
| lib/run-dashboard-core.mjs | evaluation-contract.test、run-dashboard、run-dashboard-html、run-dashboard.spec | M2 run 观察面解析/场景/模型纯管线（全 fail-soft；HTML 渲染 = run-dashboard-html，CLI/watch/写盘归壳） |
| lib/run-dashboard-html.mjs | run-dashboard、run-dashboard.spec | M2 run 观察面 HTML 渲染薄壳（纯字符串拼接；矩阵/统计来自 core，不读盘） |
| lib/evidence-audit-core.mjs | evidence-audit、evidence-audit.spec、provenance.spec | 证据溯源审计判据核心（readLog 注入同上） |
| lib/verdict-audit-core.mjs | verdict-audit、verdict-audit.spec、verdict-audit-fixture.spec | claim 级裁决判据核心：claims/verdicts 形状与键集、覆盖（critical 全有结论性裁决）、raw 原文重解析（raw 带 ```json 围栏时只剥一层解析，原文比对不放宽）、逐字一致（跨轮单调）、child preset/depth/只读；`parseSessionFacts` = 真实 v4 日志线形 → 会话事实（CLI 只做定位/解压），readiness 读法复用 node-gate 同源 |
| lib/provenance.mjs | evidence-audit-core、provenance.spec | 离线来源证明：kind/URL/路径 + sha256 + 时间 + 通道 + 切片；local-file 哈希核对 |
| lib/run-inventory-core.mjs | run-inventory、run-inventory.spec | 只读保留期折算（逐场文件数/字节/最老；合计；1024 进制格式化） |
| lib/runtime-clean-core.mjs | runtime-clean、runtime-clean.spec | 运行区清理纯判据：白名单容器/实验根 + 子树最新 mtime 保留期；symlink/未知名/穿越 fail-closed |
| lib/run-receipt.mjs | node-gate-delivery-gate、run-accept、run-bundle-charter.spec、run-receipt.spec | 交付回执（delivered/manifest/acceptance）纯生成与校验：present 取最新版本化、语料根写可复算标签、final/audit/reader 哈希复算（门A/门C 消费） |
