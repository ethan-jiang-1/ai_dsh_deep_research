# scripts/ · 职责索引

> 职责分组（2026-10-07 目录治理档 C）：六个子目录 + `lib/` 支撑库；每个盘上入口一行：类 / 证明什么 / 档位。命令与前置正本 = [guides/60 §2](../docs/guides/60-dev-loop.md)；档位列申报凭据/调用模式，不替代 guides/60 的 `source` 前置；子树纪律 = [AGENTS.md](AGENTS.md)；测试资产分层 = [tests/fixtures taxonomy](../tests/fixtures/README.md)。本索引不改脚本路径与命令。

## verify/（L0 结构门禁）

| 件 | 证明什么 | 档位 | 事实来源 |
|---|---|---|---|
| verify.mjs | L0 入口：`--only` 配置 + 按域调用 + 汇总；门禁本体住 `verify/gates/{a-docs,b-pack,c-notes,d-vendor,e-workspace,f-repo}.mjs`，共享助手 = `verify/context.mjs` | keyless | [evaluation §L0 台账](../docs/evaluation.md) |

根面（不分组的配置与指令件）：`doc-budgets.json`（常驻文档行数上限，被 doc-budgets 门禁消费，正本即自身）、`archived-note-pointers.json`（活面→notes/archived 链接的历史指针登记簿，被 archived-note-pointer 门禁消费，正本即自身）、`README.md`（本索引）、`AGENTS.md`（子树常设指令：新门禁流程、范围纪律、命名即层）。

## smoke/（分级冒烟）

| 件 | 证明什么 | 档位 |
|---|---|---|
| preset-smoke.mjs | L1 真挂载：boot 页模块表行（client 半 served）、roster、逐角色建会话、skills 隔离 | keyless（`DSH_SMOKE_REAL=1` 起真 DSH，无模型） |
| release-smoke.mjs | L2 安装形状：pack → 干净 profile → plugin add → manifest/安装域 client 半断言 → 安装域冒烟 → 端口释放验证（进程卫生：超时预算 + 并发锁 + 退出确认） | keyless（`--install-only` 跳凭据） |
| cold-start-smoke.mjs | L2 冷启动：独立 `DSH_DEV_HOME` + profile + 端口 + state，`run-driver up --bootstrap` 到浏览器 GREEN；MCP 关闭 | keyless（须先 `source dev/env.sh`；vendor/依赖在位；团队层需 registry/缓存） |
| scaffold-smoke.mjs | scaffold CLI 行为：参数严格性 / 根守卫 / 父 symlink 越界 / 首次铺种 / sidecar 保护 / `--check` deleted / `--upgrade` 只升级未改文件 | keyless（临时 pack 副本 + 临时工作区；无 dsh/模型/网络） |
| preflight-smoke.mjs | preflight 解析锚与验收真伪：fake anchor 齐全绿 / 缺行依赖红（不从仓库泄漏）/ base-only profile 红 / untracked AGENTS 红 / 空凭据红 / workspace `.env` 绿 | keyless（仓库外临时 home + fake anchor/profile；无 dsh/网络） |
| real-home-smoke.mjs | 真用户环境安装：仓库外 home + 全局 dsh + tarball → scaffold/preflight 绿 → 真 web 页面 boot graph 含本包；团队层 link 不被改写 | keyless（需全局 dsh + `_dist` tarball；缺前置 exit 2） |
| handoff-smoke.mjs | `export-handoff` 产物边界：必备源在场、无运行态/凭据/run 数据/依赖/导出包 | keyless（git archive HEAD；临时 out） |
| compat-smoke.mjs | T6 rc.3 安装面：全局 rc.3 在干净 home 做 install → dump-config → scaffold/preflight → remove | 需全局 dsh rc.3；缺失 exit 2（未跑 ≠ 通过） |
| compat-client-smoke.mjs | rc.3+ 客户端面：全局 dsh 真装 tarball → 真起 web → headless chromium 断言零 apply 失败 + 本包 client bundle 取到 + 研究状态/研究配置页签可见可开 | 需全局 dsh rc.3+、tarball、团队层、chromium；缺一 exit 2 |
| run-accept-smoke.mjs | run-accept 全链（合成 bundle+会话日志，真 CLI）：绝对 present 归一、连续两次幂等、bundle 外 present 红不写、final 含 sk- 红不写、`--repair` 后绿 | keyless |
| secret-scan-smoke.mjs | 交付物秘密扫描的范围边界：默认不扫 evidence、`--all` 才扫、`--allow-legacy` 只报告、输出不回显值（纯函数正反例归 tests） | keyless |
| data-smoke.mjs | T5 数据面切片：包目录零写入、假 token 不泄漏、卸载后 workspace 用户文件 + session 日志保留 | keyless（真 web 启动、无模型调用；tarball 需先 export-dist） |
| pack-smoke.mjs | T0 tarball 形状：入口/patch/preset/种子在场、exports 可解析、无安装脚本/凭据；手册 sha256、两次 npm pack 同 sha、无 symlink/setuid 条目（在场时） | keyless（`npm pack --dry-run --json`；需 lib 已构建） |
| user-env-smoke.mjs | 已有 bundle + 用户 overlay + session/凭据/workspace 的安装/卸载共存 | keyless（全局 dsh + 本地 tarball） |
| profile-matrix-smoke.mjs | 多 profile 并存/独立卸载、损坏 tarball 失败原因可读且无半装、用户 overlay 不改写、directory file: 移动/重装、卸载重装后 workspace 数据保留 | keyless（全局 dsh + 本地 tarball） |
| upgrade-smoke.mjs | 安装 → 模拟下一版覆盖安装 → 种子升级 → 回滚拒绝降级 → 卸载；profile + 工作区双面 | keyless（全局 dsh + npm pack；不调模型） |
| profile-concurrency-smoke.mjs | 两个 `dsh plugin add` + 两个 `remove` 同 profile 并发：至少一个成功、dump 可解析、最终无本包；不留双 bundle/坏 profile | keyless（全局 dsh + tarball） |
| interrupt-smoke.mjs | SIGKILL 中断 scaffold + 真双进程锁竞争：stale lock、state 临时件清理、重跑补齐全部种子（失败保留现场） | keyless（本地临时 pack，无 dsh） |
| workspace-isolation-smoke.mjs | B4 双实例：两套 home/profile/port/state/workspace 各起通道、各建会话；会话组绑定自己的 W、home/session 互斥、marker 互不可见 | keyless（真 web，不调模型；更慢，约两套 cold start） |
| client-load-smoke.mjs | 观察面真浏览器装配、页签与渐进面对账（磁盘参考选择 = client-load-reference.mjs；「研究配置」摘要相位 = client-load-config.mjs；终稿端到端相位 = client-load-final.mjs；主界面「方法库」tab 与其余相位住主件；失败留现场（png/html/console/meta + `disconnects` 计数），无窗口内交付目标 = exit 2 SKIP | keyless（浏览器） |
| e2e-021rc2.mjs | **升级端到端验收**（0.2.1-rc.2 起）：① 四个研究角色在角色列表里连续成组（内置 standard/ptc/minimal/creator 与 pack order 撞车的回归锁）② 右栏「研究状态」胶囊可点 + 页签体真数据 ③「研究配置」同上 ④ 本插件面零故障；真实实例走完用户路径，不靠人眼 | keyless（浏览器；须先 source dev/env.sh；失败留现场） |
| snapshot-replay-smoke.mjs | 场景 manifest 驱动的四角色组装面回放（persona/header 全序列/四处注入，含时钟序列）+ 声明的渲染金标准；场景集 = `snapshots/replay/` 下含 snapshot.json 的全部目录（发现式，`--face <name>` 定向单集） | keyless（RPC/解压子进程，无模型；须先 source dev/env.sh） |
| gates-smoke.mjs | 门禁自测：临时副本注入回归经真实 verify 入口点名报红 + 零注入对照组；`--case=<id[,id]>` 只跑指定案例（改一道门禁的迭代口，末尾自报仅跑几个）；CI keyless job 每次全量跑 | keyless（git/node 子进程，无模型） |
| client-hitl-smoke.mjs | 活标题触发与挂起显性化 | 真模型档 |
| l4-lite-smoke.mjs | 四角色真模型响应 + scout web_search 调用 | 真模型档 |
| team-preflight-smoke.mjs | spawn_teammate 组队与成员组合画像 | 真模型档 |
| cdp-ask-smoke.mjs | cdp-probe `--ask` 端到端：空闲态 `Send message` 与在飞态 `Queue message` 双路径发出 + **journal 落盘对账**（BUG-021 正修；判定本体 keyless 钉在 `lib/probe-send-target.mjs`） | 真模型档 |

## probe/（探针）

| 件 | 证明什么 | 档位 |
|---|---|---|
| cdp-probe.mjs | 指定场景显示/点击/会话回复（裸 CDP） | 连已起 GUI；`--ask` 按会话档 |
| llm-stream-tee.cjs | **LLM 流透明 tee**（复现技能 §2 的 tracked 仪器）：预载挂进目标进程只抄写字节（零行为路径改动），四件套证据包（`req/meta/sse/err`，凭据头脱敏）落 `runtime/smoke-workspace/` 时间戳目录；单跑 `--port` 预检目标在场（缺席/参数错 exit 2） | keyless（活进程仪器，无 keyless 自动测试；判据核 = lib/llm-stream-tee-core.mjs） |
| entry-chain-probe.mjs | 授权范围、RFC 条件与开发环路径三问，词面断言 + 留档人工复核 | 真模型档 |
| method-library-probe.mjs | 偏好库可发现性三问（文件名/位置、当前条目数、点名条目缺席时是否如实说），cwd = 临时研究工作区。修复判据 #4 的机器化证明（BUG-042） | 真模型档 |
| discipline-probe.mjs | 散文纪律行为面五场景标记断言（A2 超界 / B1 差集 / 收活缺件 / 收活 UNVERIFIED / 计划确认卡·quick_factual 免发互补对）+ 留档人工复核；`--scenario <id>` 定向跑 | 真模型档 |
| rerun-triage-probe.mjs | 不满转接的模型行为五条（复述不满 / ≤2 手段 / 代价与版本后果 / 未确认前不动手 / 范围来自报告末节）：给一句「太浅」跑真 lead 会话；五条全中才 PASS（探针不证明长尾说法不误判——人读） | 真模型档 |

## 分发/安装失败面 → 资产

| 失败面 | 资产 | 前置 |
|---|---|---|
| 包内容/导出/安装脚本/手册 sha | `pack-smoke`、`package-contract.test`、`export-dist` | 需 lib；手册/tarball 在场 |
| 干净 profile 安装/卸载/client | `release-smoke`、`compat-smoke`、`compat-client-smoke` | 全局/源码 DSH；rc.3 缺失 exit 2 |
| 已有用户环境（别的 bundle + overlay + session/凭据/workspace） | `user-env-smoke` | 全局 dsh + tarball |
| 多 profile、损坏 tarball、目录 file:、卸载重装 | `profile-matrix-smoke` | 全局 dsh + tarball |
| 下一版/回滚/活数据 | `upgrade-smoke` | 全局 dsh + npm pack |
| 初始化种子/锁/原子 state/特殊文件/路径穿越 | `scaffold-smoke` | 临时 pack；无 dsh |
| SIGKILL/stale lock/崩溃恢复 | `interrupt-smoke` | 本地临时 pack；失败保留现场 |
| 双实例 W/H 隔离 | `workspace-isolation-smoke` | 真 web；约两套 cold start |
| 数据面零写入/secret/session 保留 | `data-smoke` | 真 web + tarball |

## run-gates/（run bundle 机械门与审计）

| 件 | 证明什么 | 档位 |
|---|---|---|
| node-gate.mjs | 判据级：门①②③④ + 门L + 门R（标题重复退化，2026-10-06 起）+ 门A（交付完整性，2026-10-08 起）+ 门C（读者版合同，2026-10-23 起；图例正本 = research-workspace/NODES.md 头部），默认只读，`--write` 才落 bundle 报告——判据核心住 lib/node-gate-core.mjs 聚合及领域模块（本件 = CLI 壳 + zstd reader 注入） | keyless |
| schema-scan.mjs | 在场级：八节点输出件在场断言（断代定红；判据核住 lib/schema-scan-core.mjs，本件 = CLI 壳） | keyless |
| evidence-audit.mjs | URL/摘录/final 链溯源对账；默认只读，`--write` 才落 audit.md——判据核心住 lib/evidence-audit-core.mjs（本件 = CLI 壳 + zstd reader 注入） | keyless（须 source dev/env.sh） |
| path-hygiene.mjs | run bundle 的 `final/`/`acceptance.md`/`delivered.json`/`provenance/` 本机 home 路径；默认红，`--allow-legacy` 旧场只报告 | keyless |
| secret-scan.mjs | 交付物面（final/、receipts、audit、node-gate）的高置信凭据形态（sk-/ghp_/AKIA/AIza/xox[baprs]-/PRIVATE KEY/Bearer）；默认红，`--allow-legacy` 旧场只报告，`--all` 加证据/过程件；输出只到 path/line/kind | keyless |

## run-ops/（run 观察与运维）

| 件 | 证明什么 | 档位 |
|---|---|---|
| watch-run.mjs | 谓词化状态判定（HITL-PENDING / RUN-SETTLED 自报）；teammate 会话（首事件 origin=subagent）显性提示「hitlPending 不构成停靠信号」；TIMEOUT 文案带归档提示（bundle 已归档 → 盯旧会话永不落定）；`--group <子串>` 换组盯场（缺省 research-workspace） | keyless（会话根缺省回退开发 home；显式 source 更稳） |
| session-events.mjs | **会话事件尾部**（agent 的"刚才发生了什么"入口）：id/标题 → `[HH:MM:SS] type 摘要`；`--tail/--type/--grep/--json/--group`（组过滤盲区逃生口——冒烟/自测组可读，缺省 research-workspace）；teammate 标题 strip `<system-reminder>` 前缀；摘要与筛选 = lib/session-events-core.mjs | keyless（读会话日志；须先 source） |
| run-dashboard.mjs | 只读 HTML 投影：多 run 扫描 + 步骤条 + 归档场 stdout 标注（fail-soft；解析/模型住 lib/run-dashboard-core.mjs、渲染住 lib/run-dashboard-html.mjs，本件 = CLI 壳） | keyless |
| stream-diagnostics.mjs | 流失败归因诊断（run-ops）：模型尝试时间线/失败密度/provider 与重试策略实名/工具调用与检索查询——出问题第一步跑它；`--recent N` 限制最近 N 个有模型活动的会话 | keyless（读会话日志） |
| provider-error-stats.mjs | 上游流错误（回合被终结）的跨场分布投影（BUG-022 的"可数"面；判据与抽取 = lib/provider-errors.mjs） | keyless（须 source dev/env.sh） |
| plan-card-stats.mjs | 计划确认卡字数的跨场分布投影（升硬门前置 = 连续多场达标；口径与识别 = lib/plan-card.mjs，与 node-gate 门① 同源） | keyless（须 source dev/env.sh） |
| session-replay.mjs | **历史会话回放**：任意历史会话（id 全名/标题唯一子串，跨组）在真实 UI 里重开并抓场景包——检验/扩大症状还原面；判据纯函数 = lib/session-replay.mjs，浏览器编排在本壳（keyless：起一次性通道 + 登记 cwd 工作区 + 按 id 打开 + 五件套落盘；`--open-status` 展开右栏研究状态页签） | keyless（真实浏览器；须先 source） |
| scene-capture.mjs | **场景包捕获与读取**：抓取（连已起 GUI → 截图(fullPage)+DOM+正文+console+meta，token 脱敏，落 `runtime/scenes/<name>/`）+ 读取（`--list` 列既有包 / `--show <name>` 看单包——事后看现场，消费闭环；判据 = lib/scene-pack.mjs） | 抓取 keyless（真实浏览器；须先起通道）；读取 keyless（纯读盘） |
| run-inventory.mjs | **只读保留期视图**：`--workspace <dir>` 扫 root/`archive/`/`_abandoned/` 的 `drt_*`，逐场文件数/大小/最老日期与合计；`--json` 给脚本；不删除任何文件（折算 = lib/run-inventory-core.mjs） | keyless |
| run-accept.mjs | **交付验收原子动作**：node-gate（门 A/交付两门）+ evidence-audit（audit.md）+ path-hygiene（新 bundle 本机 home 路径零容忍；旧 bundle --allow-legacy）+ 未来日期 sanity；预检 `--no-write` 红不写，绿才落盘 node-gate/audit + `delivered.json` + `manifest.json` + `acceptance.md`（回执生成/校验 = lib/run-receipt.mjs，新 run 非 quick_factual 的 reader 角色/哈希一并绑定；present 归一化为 `drt_<slug>/final/vN` 相对标签，语料根写 `$DSH_HOME` 相对标签；待写回执先校验再落盘，门禁/审计生成物落盘后复检；旧 bundle 只写 acceptance）；`--repair` 修历史回执的绝对路径（只动可再生产物）；`--archive` 才移入 archive/ | keyless（须先 source dev/env.sh） |
| unconsumed-evidence.mjs | **B1 差集出题的操作侧投影**：bundle 的 evidence/ 未进 findings.md 清单（收尾核验入口——lib 头注承诺"操作侧核验"，此前无 CLI；判据 = lib/unconsumed-evidence.mjs） | keyless |
| bundle-sessions.mjs | **bundle → 见证会话反查**：给 bundle 或 slug，按绑定谓词（写过 `drt_<slug>/` 的 lead 会话）列出会话 id/组/present 条数，并打印下一步诊断命令——诊断入口都要会话 id，而 bundle 不记它（折算 = lib/bundle-sessions.mjs，绑定语义复用 node-gate 门①②同一条谓词） | keyless（须先 source dev/env.sh；默认只扫 `research-workspace` 组、结果按日志 mtime+size 缓存——首次约 25s、重复调用 <0.1s；`--all` 扫整根、`--no-cache` 绕过） |
| acceptance-check.mjs | **收活判据三态求值**：`<bundleDir> + <criteria.json>`（判据 = 委派方显式清单，仓内无落盘约定）→ 逐条 PASS/FAIL/UNVERIFIED 与汇总（"收活结论"对账成机械事实；判据 = lib/acceptance-check.mjs） | keyless |

## dist/（分发）

| 件 | 证明什么 | 档位 |
|---|---|---|
| export-dist.mjs | pack → `_dist/` 安装包与安装手册 | keyless |
| export-handoff.mjs | HEAD 的 tracked 源 → `_dist/` 干净移交包（不含运行态/凭据/run 数据/依赖）；submodule 需对方 init | keyless |
| release-check.mjs | 发布前版本/tag 一致性（root = pack、HEAD tag = version、tag 为 annotated）；只读 | keyless |

## lib/（支撑库）

| 模块 | 被谁消费 | 说明 |
|---|---|---|
| lib/roles.mjs | discipline-probe、fetch-fallback-orchestration.test、l4-lite-smoke、preset-smoke、presets.test、release-smoke、replay-request.test、replay-scene.test、snapshot-replay-smoke、team-preflight-smoke | 角色清单访问器（事实源 = 盘上 presets/） |
| lib/bundle-sessions.mjs | bundle-sessions、bundle-sessions.test | run bundle → 见证会话反查：聚合 scanWitnessLogs 的 boundSessions/presented（绑定谓词不另立——与 node-gate 门①②同源）；交付回执的 witness.sessions 亦由此面派生 |
| lib/hitl-card-driver.mjs | hitl-answer | HITL 问询卡的浏览器内驱动片段（Playwright `page.evaluate` 入参）：问卡可见性、选项结构、提交/推进按钮可用性；纯 DOM 函数、零闭包，业务判定仍在 lib/ask-drive |
| lib/frontmatter.mjs | bundle-date-sanity、evidence-audit-core、frontmatter.test、run-dashboard-core | `---` frontmatter 拆分**唯一正本**（两 core 共用同一实现） |
| lib/zstd-read.mjs | node-gate、evidence-audit、run-accept、bundle-sessions（四壳） | zstd CLI 文本解压**唯一调用段**（多帧拼接靠 CLI；成功/失败结构化返回，**失败契约留各壳**：`''` 继续 vs `null` 跳过） |
| lib/web-harness.mjs | session-replay、client-hitl-smoke、client-load-smoke、discipline-probe、e2e-021rc2、entry-chain-probe、l4-lite-smoke、method-library-probe、preset-smoke、rerun-triage-probe、snapshot-replay-smoke、team-preflight-smoke、compat-client-smoke | DSH web 冒烟族**启停与通道唯一正本**：`bootWeb`（等启动横幅拿 token）+ `authenticate` + `makeRpc`；**参数保形**——端口/超时/尾部字符/rpcId 前缀/失败文案与收割方式全留各站点 |
| lib/session-log.mjs | cdp-ask-smoke、cdp-probe、session-replay、client-hitl-smoke、client-load-reference、client-load-smoke、discipline-probe、e2e-021rc2、entry-chain-probe、hitl-answer、l4-lite-smoke、method-library-probe、plan-card-stats、provider-error-stats、run-dashboard-core、run-kickoff、run-state、run-state.test、session-events、session-log.test、snapshot-replay-smoke、stream-diagnostics、team-preflight-smoke、watch-run、rerun-triage-probe、workspace-isolation-smoke、data-smoke | canonical 日志选择与读取 + 会话组发现（findGroup 子串参数化，缺省 research-workspace——BUG-010 三处同款一行收敛；冒烟/自测组逃生口 = 观察工具 --group） |
| lib/session-events-core.mjs | session-events、session-events.test | 会话事件摘要与筛选纯函数（CLI 壳 = run-ops/session-events 行） |
| lib/llm-stream-tee-core.mjs | llm-stream-tee-core.test | LLM 流 tee 的捕获判定（主机子串，fail-closed）与凭据头脱敏（预载壳 = scripts/probe/llm-stream-tee.cjs——CJS require 面不在 .mjs 对账图内，壳本体是活进程仪器不设 keyless 自测） |
| lib/provider-errors.mjs | provider-error-stats、provider-errors.test | 回合被上游流错误终结的结构化抽取（唯一语义源：只认 `turn/end` + `reason.kind=error`，不双算 `assistant/attempt`） |
| lib/plan-card.mjs | node-gate-session-gates、plan-card-stats、plan-card.test | 计划确认卡识别与字数口径（唯一语义源：标签「按计划开跑」+ `question` 字段全长 + 阈值 200） |
| lib/stream-diagnostics-core.mjs | stream-diagnostics、stream-diagnostics.test | 模型活动会话筛选（活动事件预筛后再按日志 mtime 取最近 N）+ 尝试时间线投影（assistant/message 计成功、assistant/attempt 计失败/无落面，终态三判 alive-or-idle/recovered/dead） |
| lib/run-state.mjs | cdp-ask-smoke、hitl-answer、run-kickoff、session-replay、run-state.test、session-events、watch-run | run 操作面状态谓词 |
| lib/run-source-node.mjs | evidence-audit、node-gate、run-context-node.test、schema-scan | node:fs 的 RunSource 适配器：list/read/version；ENOENT → missing，其余 → unreadable；行窗口与 eof 语义对齐 vendor workspaceFiles |
| lib/env.mjs | env-credentials.test、compat-smoke、data-smoke、pack-smoke、profile-concurrency-smoke、profile-matrix-smoke、upgrade-smoke、user-env-smoke、workspace-isolation-smoke、session-replay、cdp-ask-smoke、client-hitl-smoke、client-load-smoke、discipline-probe、e2e-021rc2、entry-chain-probe、l4-lite-smoke、method-library-probe、preset-smoke、record-role-fixture、release-smoke、snapshot-replay-smoke、team-preflight-smoke、rerun-triage-probe、preflight-smoke、real-home-smoke、compat-client-smoke、run-accept-smoke | 子进程环境清洗（scrubbedEnv/withModelKey）与真模型档前置（requireCredentials/credentialsPresent——凭据卫生） |
| lib/playwright.mjs | session-replay、client-hitl-smoke、client-load-smoke、e2e-021rc2、hitl-answer、snapshot-replay-smoke、compat-client-smoke | Playwright 启停支撑 |
| lib/cdp-driver.mjs | cdp-probe、scene-capture | 裸 CDP 驱动 |
| lib/session-replay.mjs | session-replay、session-replay.test | 历史会话定位/元信息/判读整形纯函数（跨组枚举、id 优先、标题歧义如实报候选；会话→工作区靠首事件 cwd） |
| lib/scene-pack.mjs | scene-capture、scene-pack.test | 场景包读取/列示纯函数（五件套概要如实——缺件与坏 meta 不静默；mtime 降序） |
| lib/inject-reconcile.mjs | cdp-probe、inject-reconcile.test、run-kickoff | 注入消息「落盘对账」判据（BUG-021 正修：日志里出现本条 user/message 才算送达；时间下界防同文假阳） |
| lib/probe-send-target.mjs | cdp-probe、probe-send-target.test | 提交按钮判定纯函数（BUG-021 正修：send 家族六标签状态机 + **stop 家族拒点** + composer 邻近窗；页面只读 DOM 与执行点击） |
| lib/probe-status-tab.mjs | session-replay、cdp-probe、probe-status-tab.test | 右栏「研究状态」页签判定纯函数：胶囊按**标题 span 逐字**匹配（拒绝描述串入 / 近似标题）、页签体只认 `[data-sidebar-right-tab]`（不拿会话正文当观察面） |
| lib/run-channel.mjs | run-driver、run-driver-contract.test | run 通道驱动判据纯函数：web.log → 当前 GUI URL（取最后一条横幅）、浏览器面 verdict → 呈交判决（GREEN / RED / NOT-RUN） |
| lib/ask-drive.mjs | ask-drive.test、hitl-answer、run-kickoff | 代答读窗与谓词 |
| lib/web-ui-nav.mjs | session-replay、cdp-probe、client-hitl-smoke、client-load-config、client-load-final、client-load-smoke、e2e-021rc2、hitl-answer、library-fold.test、compat-client-smoke、web-ui-nav.test | 观察面侧栏会话定位**唯一正本**（2026-10-21 收拢，六处私有版退役）：data-row-key 主锚（session:\<id\>/workspace: 行键）+ 折叠组展开（expandGroup，data-row-key 主 + 类名兜底）+「Show N more」逐层 + 搜索兜底（结果无行键→按文本点）；类名扫描降级为兜底——两套选择器各有实红教训，裁决依据 = 模块头注；零依赖 page 鸭子类型；CDP 边界 = 纯常量 SHOW_MORE_SESSIONS_PATTERN / PREVIEW_NOTICE_PROBE_JS 供 cdp-probe evaluate 字符串消费（后者 = 首屏 Preview Notice 遮罩的探测与关闭，keyless 钉 = web-ui-nav.test）；真浏览器证据归消费方冒烟档（client-load-smoke / e2e-021rc2） |
| lib/unconsumed-evidence.mjs | unconsumed-evidence.test、unconsumed-evidence | B1 机械基座：evidence/ 未进 findings.md 的差集投影（critic 差集出题的操作侧对账；CLI 壳 = run-ops/unconsumed-evidence 行） |
| lib/acceptance-check.mjs | acceptance-check.test、acceptance-check | 收活判据机械求值：PASS/FAIL/UNVERIFIED 三态（DeerFlow acceptance_criteria keyless 移植，判不了永不静默放行；CLI 壳 = run-ops/acceptance-check 行） |
| lib/hitl-provenance.mjs | ask-drive.test、hitl-answer、hitl-provenance.test、run-kickoff | 代答 provenance 写盘（BUG-014 正修——代理模拟显式记账；BUG-017 题面富集） |
| lib/local-date.mjs | export-dist、hitl-answer、local-date.test | 人读日期行本地口径（与 bash date 同源；BUG-017 正修——UTC slice 凌晨窗口差一天） |
| lib/bundle-date-sanity.mjs | bundle-date-sanity.test、run-accept | run bundle 未来日期检查（操作侧验收前哨——r1-license 29 处未来日期事故的机械面；消费语境 = run-accept 行） |
| lib/vendor-artifacts.mjs | session-replay、cdp-ask-smoke、client-hitl-smoke、client-load-smoke、discipline-probe、entry-chain-probe、l4-lite-smoke、preset-smoke、team-preflight-smoke、vendor-artifacts.test | vendor 构建产物自检 |
| lib/backlog-liveness.mjs | backlog-liveness.test、context、f-repo | 问题卡、缺陷、调研、方法与归档索引的结构合同；被 verify 入口与 keyless 回归消费 |
| lib/direct-authorization-boundary.mjs | entry-chain-probe、entry-chain-probe.test | 按授权范围执行、无需重复请批的词面判定；由探针与 keyless 回归消费 |
| lib/replay-scene.mjs | replay-scene.test、snapshot-replay-smoke | 场景声明消费者：roster/版本/来源形状/路径校验（缺件、串角色、垃圾锚点 fail-loud）+ 场景集发现（`replay/*/snapshot.json` 全集、防空语料、--face 全名定向） |
| lib/replay-request.mjs | record-role-fixture、replay-request.test、snapshot-replay-smoke | 组装请求面逐条比较：persona、header 全序列、四处 user/message 注入（含时钟序列）（定向归一化） |
| lib/port-reclaim.mjs | client-load-smoke、preset-smoke、release-smoke、cold-start-smoke、data-smoke、workspace-isolation-smoke、real-home-smoke、compat-client-smoke | 端口收割执行器（按端口杀 + 三轮验证释放；实测依据 = web 孙进程不在子进程组里） |
| lib/path-hygiene.mjs | run-gates/path-hygiene、path-hygiene.test、node-gate-session-gates、run-accept、run-receipt | 本机 home 路径纯文本检测（Unix/macOS/Windows 前缀；行号）+ `portableBundlePath`（bundle 内绝对路径 → `drt_<slug>/…` 可移植标签；bundle 外 → null） |
| lib/secret-scan.mjs | run-gates/secret-scan、secret-scan.test、run-accept | 高置信凭据形态检测（sk-/ghp_/AKIA/PRIVATE KEY/Bearer）；只报 path/line/kind，不回显原文 |
| lib/selftest-library.mjs | library-fold.test | 「研究配置」面板/library-fold 自测例库单一正本：12 形态条目（四字段/部分/空值/旧格式/混居/重名/空条目/杂项行/续行/缩进），两处共用防形态漂移 |
| lib/method-presets.mjs | library-fold.test、method-presets.test | research-brief skill「方法预设」表的唯一解析入口（表头/行列数/防空集 fail-loud）——内置名单不再各写一份手写副本 |
| lib/keyless-imports.mjs | layering.test | 只读 import 检查（解析器 = typescript 纯函数；company keyless-imports@59551f2 移植）——调用表达式解析 + 本地 import 闭包图 |
| lib/gates-cases.mjs | gates-smoke、verify-gates.test | 门禁自测的注入案例表（纯 fs mutate；git add 由驱动壳统一执行） |
| lib/node-gate-core.mjs | node-gate、node-gate.test | bundle 判据聚合；唯一导出 = `gateBundle`，领域门直接 import 各自模块 |
| lib/node-gate-contracts.mjs | node-gate-delivery-gate、node-gate-reader-gate、node-gate-run-gates、node-gate-session-gates、node-gate.test、review-readiness.test、node-gate-contracts.test | 交付日期合同、readiness 与 decisions 行解析 |
| lib/node-gate-session-gates.mjs | ask-drive.test、bundle-sessions、node-gate-core、node-gate-delivery-gate、node-gate.test、node-gate-witness.test、run-accept | HITL、present 与 §Decisions 会话门 |
| lib/node-gate-run-gates.mjs | node-gate-core、node-gate.test | leads、版本与标题退化门 |
| lib/node-gate-delivery-gate.mjs | node-gate-core、run-receipt.test | 门A 交付完整性判据 |
| lib/node-gate-reader-gate.mjs | node-gate-core、node-gate-reader.test | 门C 读者版合同：同版/六节/长度/无来源路径；数字子集只 WARN；旧场/quick_factual 豁免 |
| lib/schema-scan-core.mjs | schema-scan、schema-scan.test、node-gate-contracts、node-gate-contracts.test、node-gate-core、node-gate-delivery-gate、node-gate-reader-gate、node-gate-run-gates、node-gate-session-gates、run-accept、run-bundle-charter.test、run-receipt.test | 节点 I/O 契约在场级断言判据核（交付日/研究类型/条件件豁免/断代定红——从 run-gates 下沉修 lib→入口层反向依赖） |
| lib/run-dashboard-core.mjs | evaluation-contract.test、run-dashboard、run-dashboard-html、run-dashboard.test | M2 run 观察面解析/场景/模型纯管线（全 fail-soft；HTML 渲染 = run-dashboard-html，CLI/watch/写盘归壳） |
| lib/run-dashboard-html.mjs | run-dashboard、run-dashboard.test | M2 run 观察面 HTML 渲染薄壳（纯字符串拼接；矩阵/统计来自 core，不读盘） |
| lib/evidence-audit-core.mjs | evidence-audit、evidence-audit.test、provenance.test | 证据溯源审计判据核心（readLog 注入同上） |
| lib/provenance.mjs | evidence-audit-core、provenance.test | 离线来源证明：kind/URL/路径 + sha256 + 时间 + 通道 + 切片；local-file 哈希核对 |
| lib/run-inventory-core.mjs | run-inventory、run-inventory.test | 只读保留期折算（逐场文件数/字节/最老；合计；1024 进制格式化） |
| lib/run-receipt.mjs | run-accept、node-gate-delivery-gate、run-bundle-charter.test、run-receipt.test | 交付回执（delivered/manifest/acceptance）纯生成与校验：present 取最新版本化、语料根写可复算标签、final/audit/reader 哈希复算（门A/门C 消费） |
