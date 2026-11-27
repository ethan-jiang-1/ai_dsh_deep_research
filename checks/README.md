# checks/ · 职责索引

> 维护面：**judge**——装裁决入口（`verify/`、`smoke/`、`run-gates/`、`release/release-check`），
> 不装只读投影（→ `probes/`）与导出/清理（→ `tools/`）；非面支撑：`lib/` 是维护层公共库（judge/show/operate
> 共享，按消费者域分组）、`test/` runner、support、配置 JSON 与消费者同根。组级面表见下，逐件例外 = [surface-contract](../docs/policy.md)。
>
> 职责分组：`verify/`、`smoke/`、`test/`、`run-gates/`、`release/` + `lib/` 支撑库（show 件住 `probes/analyze/`、operate 件住 `tools/`——拆分后本目录只留 judge）；每个盘上入口一行：类 / 证明什么 / 档位。命令与前置正本 = [guides/dev-loop.md §2](../docs/guides/dev-loop.md)；档位列申报凭据/调用模式，不替代 guides/dev-loop.md 的 `source` 前置；子树纪律 = [AGENTS.md](AGENTS.md)；测试资产分层 = [tests/fixtures taxonomy](../tests/fixtures/README.md)。本索引不改脚本路径与命令。

## 维护面（组级）

判据 = 主要产出什么：裁决 → judge，证据 → show，持久状态 → operate；规则与逐件例外 =
[surface-contract](../docs/policy.md)。本目录已按面拆开：show 件住 `probes/analyze/`、operate 件住 `tools/`，这里只留 judge 与非面支撑。

| 组 | 面 | 判定 |
|---|---|---|
| `verify/` | judge | L0 结构门禁聚合；红 = 不放行 |
| `smoke/` | judge（`*.support.mjs` 非面） | 断言红 = 证据面红；support 是夹具/支援件 |
| `run-gates/` | judge | run bundle 机械门与审计 + 交付验收（run-accept / acceptance-check） |
| `release/` | judge | 发布前版本/tag 一致性（release-check） |
| `test/` | 非面（runner） | 车道调度 |
| `lib/` | 非面（实现） | 支撑库 |
| 根面 | 非面（数据/文档） | 门禁消费的配置与登记簿、本索引、子树指令 |

## verify/（L0 结构门禁）

| 件 | 证明什么 | 档位 | 事实来源 |
|---|---|---|---|
| verify.mjs | L0 入口：`--only` 配置 + 按域调用 + 汇总；门禁本体住 `verify/gates/{a-docs,b-pack,c-notes,d-vendor,e-workspace,f-repo}.mjs`，共享助手 = `verify/context.mjs` | keyless | [evaluation §L0 台账](../docs/testing.md) |

根面（不分组的配置与指令件）：`doc-budgets.json`（常驻文档 UTF-8 字节上限，被 doc-budgets 门禁消费，正本即自身）、`archived-note-pointers.json`（活面→notes/archived 链接的历史指针登记簿，被 archived-note-pointer 门禁消费，正本即自身）、`test-path-redirects.json`（搬家路径重定向登记簿：旧路径→新路径，被 md-links 消费，正本即自身）、`README.md`（本索引）、`AGENTS.md`（子树常设指令：新门禁流程、范围纪律、命名即层）。

## smoke/（分级冒烟）

> 频率归属 = [registry.json](smoke/registry.json)：每个 smoke 必须登记 `tier`（`ci` = push/required、`nightly` = 夜间承重、`dev-only` = 手动 + 理由）；
> 机械对账 = [tests/checks/test-infra/smoke-registry.test.mjs](../tests/checks/test-infra/smoke-registry.test.mjs)（新增件不登记即红）。
> 命名即车道：`<target>.e2e.mjs` = 真进程，`<target>.entry.mjs` = 真浏览器/profile/tarball，`<target>.support.mjs` = 支援件；`pnpm test:e2e` / `pnpm test:entry` 由 [test/run-lane.mjs](test/run-lane.mjs) 按 registry 的 `lane` 选跑。
> `registry.json` 每条另有 `cost` / `uniqueClaim` / `oracle` / `sunset`；契约 = [tests/checks/test-infra/smoke-oracle-surface.test.mjs](../tests/checks/test-infra/smoke-oracle-surface.test.mjs)（oracle 可直测或 `none:` 有理由）。

| 件 | 证明什么 | 档位 |
|---|---|---|
| preset.e2e.mjs | L1 真挂载：boot 页模块表行（client 半 served）、roster、逐角色建会话、skills 隔离 | keyless（`DSH_SMOKE_REAL=1` 起真 DSH，无模型） |
| release.entry.mjs | L2 干净室安装：`_dist` 发布 tarball（manifest 已剥离 devDeps）→ 仓外 home + 钉版 DSH 建 web profile → plugin add → manifest/安装域 client 半断言 → 安装域冒烟 → 端口释放；`--dev-home` 回退仓内 home | keyless（`_dist` 产物 + vendor/dsh；`--install-only` 跳凭据） |
| lifecycle.entry.mjs | L2 发布面/显示面（默认钉版 DSH，`--global-dsh` 仅对照；版本必须 ∈ engines.dsh）：staged market.json 过 DSH 校验器（plugins 空 + staged 文案）→ 装 tarball → 本包行 dump（未装团队层时无 `ui-agent-team`）→ 真启动无降级 → 装起后 `content.apply` 真注册 `research_pack_root`/`research:manual`、`startup.apply` 真登记工作区、`defaults.apply` 真注册 context/命令，均返回 disposer → `readPluginMeta` 读出五个 specifier 的中英标题/图标 → remove 后 roster 回落；tarball 旧于 pack 源/构建 = exit 2（BUG-174，`--allow-stale` 显式覆盖） | keyless（真 dsh/pnpm + `_dist` 产物；缺前置/产物陈旧 exit 2） |
| install-shape.entry.mjs | L2 安装形状：原样执行手册的 CLI 装包分支（profile init → `dsh plugin --profile … add` pack+team → 真启动）；断言 roster 三状态、无 `did not activate`、首屏可达 | keyless（真 dsh/pnpm + 团队层 registry/缓存；缺前置 exit 2） |
| product-boot.entry.mjs | L2 首启：纯 `dsh --profile deep-research` + Web + 浏览器；Host 注册工作区、blank Lead Session `cwd` = 工作区、首屏/目录按钮/Lead/composer | keyless（需浏览器 + 团队层；缺前置 exit 2） |
| cold-start.entry.mjs | L2 干净室冷启动：仓外 mkdtemp home + 钉版 DSH（`--version ∈ engines.dsh`）+ `_dist` tarball 真实安装 → web 启动横幅 + token 换 cookie；依赖解析不落仓根 node_modules（浏览器面归 client-load） | keyless（`_dist` 产物与 vendor/dsh 在位；`--global-dsh` 仅对照） |
| doctor.e2e.mjs | doctor 只读判据：fake anchor 齐全绿 / 缺行依赖红 / base-only profile 红 / 缺 pack 红 / 空凭据 warn / 坏设置 warn；不安装、不写 profile | keyless（仓库外临时 home + fake anchor/profile；无 dsh/网络） |
| handoff.e2e.mjs | `export-handoff` 产物边界与接收指令：必备源在场、HANDOFF 含 `git init`/fetch/reset/submodule update、无运行态/凭据/run 数据/依赖/.git/导出包 | keyless（git archive HEAD；临时 out；CI keyless 档） |
| run-accept.e2e.mjs | run-accept 全链（合成 bundle+会话日志，真 CLI）：绝对 present 归一、连续两次幂等、bundle 外 present 红不写、final 含 sk- 红不写、`--repair`、`--no-write` 真只读、未知参数 exit 2、整数契约（schema/created → manifest 记版本与日期、repair 保 schema 快照、schema-scan CLI 认新契约） 后绿 | keyless |
| secret-scan.e2e.mjs | 交付物秘密扫描的范围边界：默认不扫 evidence、`--all` 才扫、`--allow-legacy` 只报告、输出不回显值（纯函数正反例归 tests） | keyless |
| data.entry.mjs | T5 数据面切片：包目录零写入、假 token 不泄漏、卸载后 workspace 用户文件 + session 日志保留 | keyless（真 web 启动、无模型调用；tarball 需先 export-dist） |
| pack.e2e.mjs | T0 tarball 形状：入口/patch/preset/content/doctor 在场、exports 可解析、client 模块表（require ↔ `dsh.client.inject` ↔ peers）、无安装脚本/凭据；手册 sha256、两次 npm pack 同 sha、无 symlink/setuid 条目（在场时）；**发布面自足：顶层 = 允许集、`lib/types` = `exports.types`、随包文本（含构建产物）零 dev 引用、README 用户段零开发命令** | keyless（`npm pack --dry-run --json`；需 lib 已构建——构建产物断言住这里，keyless 回归保持 fresh-clone 可跑） |
| user-env.entry.mjs | 已有 bundle + 用户 overlay + session/凭据/workspace 的安装/卸载共存 | keyless（全局 dsh + 本地 tarball） |
| profile-concurrency.entry.mjs | 两个 `dsh plugin add` + 两个 `remove` 同 profile 并发：至少一个成功、dump 可解析、最终无本包；不留双 bundle/坏 profile | keyless（全局 dsh + tarball） |
| workspace-isolation.entry.mjs | B4 双实例：两套 home/profile/port/state/workspace 各起通道、各建会话；会话组绑定自己的 W、home/session 互斥、marker 互不可见 | keyless（真 web，不调模型；更慢，约两套 cold start） |
| client-load.entry.mjs | 观察面真浏览器装配、页签与渐进面对账（`--seed <dir\|name>` = 从 tests/fixtures/client-load-home 自建 home，CI/干净机器用；磁盘参考选择 = client-load-reference.support.mjs；「研究配置」摘要相位 = client-load-config.support.mjs；终稿端到端相位 = client-load-final.support.mjs；主界面「方法库」相位断言 A′ 两列、详情进入访谈、表单检查与显式来源选择，零模型 prompt；失败留现场（png/html/console/meta + `disconnects` 计数），无窗口内交付目标 = exit 2 SKIP；主机不健康 = exit 2 NOT-RUN（预检；失败时连接死亡同判，判据 = lib/host-health；诊断逃生口 `DSH_CLIENT_LOAD_ALLOW_UNHEALTHY=1` 人工强制跑，失败仍 NOT-RUN） | keyless（浏览器） |
| cockpit-truth.entry.mjs | 观察面事实真实性五场景（BUG-356…360）：已交付 v1 + 未交付 v2 → 终稿只显示 v1；目标 v1 缺失 → 失败态不拿 v2 冒充；已交付 + review FAIL → 不出现「报告不交付」；bundle 被移走 → 研究状态读取失败；review/evidence 不可读 → 审查/证据读取失败、不折成 absent/0；失败逐场景点名，chmod/移走场景在 finally 还原 | keyless（真浏览器 + seed 夹具；先 `pnpm build`，构建过期 = exit 2） |
| cockpit-truth-substance.entry.mjs | 观察面内容实质六场景（BUG-377/378/381/382/383/384）：空 findings/leads → 综合/侦察不 done；标题-only question → 立项不 done；空 plan → 状态页提示；`_failed.md`/0 字节证据卡 → 0 份有效证据；每场景双断言 | keyless（真浏览器 + seed 夹具；先 `pnpm build`，构建过期 = exit 2） |
| cockpit-locale.entry.mjs | 观察面英文二场景（BUG-379/380）：en 1 evidence file 单数；主 tab 完整可读（短标签/无 CSS 截断） | keyless（真浏览器 + en locale overlay；先 `pnpm build`，构建过期 = exit 2） |
| cockpit-truth-residuals.entry.mjs | 观察面残余跨面事实八场景（BUG-369…376）：readiness 冲突（状态+终稿同判）/review 不可读；reader 显示时更新 stale；final/ 目录/plan/config question 读失败；defaults mixed 键合法 effort 生效；空 plan/vN 快照；每场景双断言，空页先判可达 | keyless（真浏览器 + seed 夹具；先 `pnpm build`，构建过期 = exit 2） |
| cockpit-artifact-truth.entry.mjs | 观察面工件真实性九场景（BUG-361…368）：question/回执/readiness 读失败 → 独立失败态；空 question/review/终稿正文/读者版 → 空态或可见回退；读者版读失败 → 审计版 + 提示；每场景双断言（该出现/不该出现），空页先判可达 | keyless（真浏览器 + seed 夹具；先 `pnpm build`，构建过期 = exit 2） |
| client-load-seed.support.mjs | client-load.entry（`--seed`）、cockpit-truth.entry、cockpit-artifact-truth.entry、cockpit-truth-residuals.entry、cockpit-truth-substance.entry、cockpit-locale.entry | 种子夹具 materialize：会话组名 = projectKey(种子工作区) 现算、zstd 两帧（header 单帧）、mtime 回拨 2h、`__WORKSPACE__`/`__REPO_ROOT__` 替换；不写仓内 research-workspace | 支援件（fixture → runtime） |
| method-library-tool.e2e.mjs | 真 Loader + Method Editor Agent + Host Tool：验证 UI 操作 claim、内容摘要拒绝、默认/删除写入及 workspace 回读 | keyless（临时 workspace 与确定性 mock LLM） |
| model-experience.e2e.mjs | 真 Loader 捕获 Lead/Scout 组装首请求（persona + 手册 runtime context + skill 目录 + 工具 schema），token-meter 计价工具 schema token 与手册占比；包 README Model Experience 数字的生成命令 | keyless（临时 home 与确定性 mock LLM；需 native system.node，开发档） |
| snapshot-replay.entry.mjs | 场景 manifest 驱动的角色面组装回放（persona/header 全序列/四处注入，含时钟序列；research-face = 四研究角色 + 方法编辑）+ 声明的渲染金标准；场景集 = `snapshots/replay/` 下含 snapshot.json 的全部目录（发现式，`--face <name>` 定向单集） | keyless（RPC/解压子进程，无模型；A/B 进 CI `snapshot-replay`，`--layers a,b`；C 本地已复验（需 Chromium）；须先 source tools/env.sh） |
| gates.e2e.mjs | 门禁自测：临时副本注入回归经真实 verify 入口点名报红 + 零注入对照组；`--gate=<门禁名[,名]>` 只跑该门禁的案例（改门禁的日常迭代口，末尾自报仅跑几个）、`--case=<id[,id]>` 再收窄（两者取交集）；**日常只跑被改门禁的案例，全量只在发布/nightly**；fixture 复用（有界并行默认 4；--jobs） | keyless（git/node 子进程，无模型） |
| client-hitl.entry.mjs | 活标题触发与挂起显性化 | 真模型档 |
| l4-lite.e2e.mjs | 全角色真模型响应（含 method-editor）+ scout web_search 调用 | 真模型档 |
| team-preflight.e2e.mjs | spawn_teammate 组队与成员组合画像 | 真模型档 |
| cdp-ask.entry.mjs | cdp-probe `--ask` 端到端：空闲态 `Send message` 与在飞态 `Queue message` 双路径发出 + **journal 落盘对账**（BUG-021 正修；判定本体 keyless 钉在 `lib/probe-send-target.mjs`） | 真模型档 |

## probes/（探针与只读取证，住根目录）

探针与只读取证投影住根 [probes/](../probes/README.md)：behavior / browser / analyze 三域 + stream 仪器；指南 = [guides/probe-playbook.md](../docs/guides/probe-playbook.md)，索引 = [probes/INDEX.generated.md](../probes/INDEX.generated.md)。本索引不再手枚举（头注是事实源，索引是生成物）。

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
| node-gate.mjs | 判据级：门①②③④ + 门L + 门R（标题重复退化，2026-10-06 起）+ 门A（交付完整性，2026-10-08 起）+ 门C（读者版合同，2026-10-23 起；图例正本 = `packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md` 头部），默认只读，`--write` 才落 bundle 报告——判据核心住 lib/node-gate-core.mjs 聚合及领域模块（本件 = CLI 壳 + zstd reader 注入） | keyless |
| schema-scan.mjs | 在场级：八节点输出件在场断言（整数契约/日期两态断代；判据核住 lib/schema-scan-core.mjs，本件 = CLI 壳） | keyless |
| evidence-audit.mjs | URL/摘录/final 链溯源对账；默认只读，`--write` 才落 audit.md——判据核心住 lib/evidence-audit-core.mjs（本件 = CLI 壳 + zstd reader 注入） | keyless（须 source tools/env.sh） |
| path-hygiene.mjs | run bundle 的 `final/`/`acceptance.md`/`delivered.json`/`provenance/` 本机 home 路径；默认红，`--allow-legacy` 旧场只报告 | keyless |
| verdict-audit.mjs | **claim 级裁决审计**：`review/claims.json` + `review/verdicts-r<N>.json` 的覆盖（critical 全有结论性裁决）/ 值域 / raw 原文重解析 / 与 child 会话逐字一致 / child preset·depth·只读；默认只读，`--write` 才落 `review/verdict-audit-r<N>.md`；旧 bundle/quick_factual/契约日前 = 不适用（epoch），`--require` 强制审——判据核心住 lib/verdict-audit-core.mjs（本件 = CLI 壳 + zstd reader 注入） | keyless（须 source tools/env.sh） |
| protocol-audit.mjs | **Protocol（研究设计）审计**：schema/枚举/四字段/canonical hash/effort 合同/output 形状/`§Protocol` 投影/策略行投影（通道/worker/预算上限；预算不可解析 = 红）/`§Decisions` 与 `plan.md` 版本/`approval_basis`/复合方法包含判据/`deviations` 形状；默认只读，`--write` 才落 `protocol-audit.md`（版本指纹行）；旧 bundle/契约日前 = 不适用（epoch），`--require` 强制审——判据核心住 lib/protocol-core.mjs（schema）+ lib/protocol-audit-core.mjs（bundle 审计；本件 = CLI 壳 + bundle 读取） | keyless |
| secret-scan.mjs | 交付物面（final/、receipts、audit、node-gate）的高置信凭据形态（sk-/ghp_/AKIA/AIza/xox[baprs]-/PRIVATE KEY/Bearer）；默认红，`--allow-legacy` 旧场只报告，`--all` 加证据/过程件；输出只到 path/line/kind | keyless |
| run-accept.mjs | **交付验收原子动作**：node-gate（门 A/交付两门）+ evidence-audit（audit.md）+ verdict-audit（claim 覆盖）+ protocol-audit（Protocol 设计/`protocol-audit.md`）+ path-hygiene（新 bundle 本机 home 路径零容忍；旧 bundle --allow-legacy）+ 未来日期 sanity；预检 `--no-write` 红不写，绿才落盘 node-gate/audit + `delivered.json` + `manifest.json` + `acceptance.md`（回执生成/校验 = lib/run-receipt.mjs，新 run 非 quick_factual 的 reader 角色/哈希一并绑定；present 归一化为 `drt_<slug>/final/vN` 相对标签，语料根写 `$DSH_HOME` 相对标签；待写回执先校验再落盘，门禁/审计生成物落盘后复检；旧 bundle 只写 acceptance）；`--repair` 修历史回执的绝对路径（只动可再生产物）；`--archive` 才移入 archive/ | keyless（须先 source tools/env.sh） |
| acceptance-check.mjs | **收活判据三态求值**：`<bundleDir> + <criteria.json>`（判据 = 委派方显式清单，仓内无落盘约定）→ 逐条 PASS/FAIL/UNVERIFIED 与汇总（"收活结论" 对账成机械事实；判据 = lib/acceptance-check.mjs）。退出码 = 0 全 PASS / 1 有 FAIL·UNVERIFIED·零判据 / 2 用法或前置错 | keyless |

## run 观察 = probes/analyze/

只读投影/诊断/回放件住探针目录：[probes/analyze/](../probes/analyze/)——面 = show，逐件表 = [probes/README](../probes/README.md) 与 [guides/probe-playbook.md](../docs/guides/probe-playbook.md)；本索引不再列举。

## release/（发布前裁决）

| 件 | 证明什么 | 档位 |
|---|---|---|
| release-check.mjs | 发布前版本/tag 一致性（root = pack、HEAD tag = version、tag 为 annotated）；`--handoff` 另查 tag=HEAD、工作树、manual sha、artifact freshness；`--receiver` 在 clean clone 上跳过源指纹（tag/manual/tarball/manifest）；只读 | keyless |

（分发与移交的 operate 件住 [tools/release/](../tools/release/)：export-dist / market / export-handoff + 手册源。）

## test/（测试车道 runner）

| 件 | 证明什么 | 档位 | 事实来源 |
|---|---|---|---|
| run-lane.mjs | `pnpm test:e2e` / `test:entry`：按 `checks/smoke/registry.json` 的 `lane`/`tier` 选跑，0/1/2 汇总 + 单件/车道耗时；`--only <substr>` 定向、`--list` 带 tier/cost；逐件参数取 registry `args`（client-load 默认 seed） | keyless 壳（脚本自检前置） | registry.json + `lib/smoke-lane.mjs` |

## lib/（支撑库）


| 模块 | 被谁消费 | 说明 |
|---|---|---|
| lib/repo/content-budget.mjs | e-workspace、content-disclosure.spec | 常驻面预算唯一正本：T0 两级（下放 10,000 / 硬顶 12,288）+ lead persona/合计的 char/byte/token |
| lib/shared/roles.mjs | discipline-probe、doctor.e2e、fetch-fallback-orchestration.spec、l4-lite.e2e、preset.e2e、presets.spec、release.entry、replay-fixtures.spec、replay-scene.spec、role-consumer-matrix.spec、snapshot-replay.entry、strategy-core.spec、team-preflight.e2e、plan-gate | 角色清单访问器（presetRoles = 盘上全部；researchRoles = 研究面；事实源 = 盘上 presets/） |
| lib/shared/sandbox-capability.mjs | sandbox-capability.spec、start-channel | 嵌套沙箱探测判据（darwin 上 sandbox-exec 失败/EPERM = 脚本层不可用；其它平台 null） |
| lib/shared/boot-port.mjs | client-load.entry、cold-start.entry、port-reclaim.spec、snapshot-replay.entry | 自动端口的有界重选（BUG-338）：纯逻辑，pick/boot 注入；显式端口不重选 |
| lib/shared/cli-entry.mjs | export-handoff、gates.e2e、market、run-dashboard、protocol-audit、schema-scan、verdict-audit、node-gate、evidence-audit、channel-cache、mirror-sync、run-driver、vendor-artifacts、release-check、cli-entry.test、gate-cli-args.spec | symlink-safe CLI 入口判定（realpath 归一；macOS `/tmp` → `/private/tmp` 下不静默）+ `cliArgsOf`（位置参数/带值选项分离；`--sessions` 缺值 exit 2，BUG-406） |
| lib/shared/cli-exit.mjs | run-dashboard、run-kickoff、run-lane、cli-exit-contract.test | 退出码契约唯一出口：`EXIT` 0/1/2 + `usageError`（usage/前置 = 2）+ `verdictOf`（全 SKIP = 2；有 FAIL = 1；有 PASS 的混合 = 0） |
| lib/repo/release-anchor.mjs | release-check、release-anchor.test | 发布/移交锚纯判据：版本/tag 类型/commit、工作树、manual sha、build-manifest sha、artifact freshness；配套 `release-check --handoff` |
| lib/channel/channel-cache.mjs | run-driver、channel-cache.spec | 启动加速缓存判据：pack 源指纹（路径+size+mtime）+ 发布清单缓存（漂移门 ≈5s→≈0.7s，CLI 供 boot-run.sh 消费）+ 探针 GREEN 缓存（热复用 ≈0.5s / 冷启动命中 ≈10s；键 = pack 指纹 + runtime 构建 + 断言参数，TTL 30 分钟；命中前 HTTP 就绪检查；只存 GREEN，`--force-probe` 绕过） |
| lib/analyze/bundle-sessions.mjs | bundle-sessions、bundle-sessions.spec | run bundle → 见证会话反查：聚合 scanWitnessLogs 的 boundSessions/presented（绑定谓词不另立——与 node-gate 门①②同源）；交付回执的 witness.sessions 亦由此面派生 |
| lib/channel/hitl-card-driver.mjs | hitl-answer | HITL 问询卡的浏览器内驱动片段（Playwright `page.evaluate` 入参）：问卡可见性、选项结构、提交/推进按钮可用性；纯 DOM 函数、零闭包，业务判定仍在 lib/ask-drive |
| lib/shared/frontmatter.mjs | acceptance-check、bundle-date-sanity、evidence-audit-core、findings-core、frontmatter.spec、protocol-audit、review-contract、run-dashboard-core、skill-parser-contract.spec | `---` frontmatter 拆分**唯一正本**（CRLF 兼容；收活验收/审计/仪表盘共用同一实现） |
| lib/shared/zstd-read.mjs | bundle-sessions、evidence-audit、node-gate、run-accept、verdict-audit | zstd CLI 文本解压**唯一调用段**（多帧拼接靠 CLI；成功/失败结构化返回，**失败契约留各壳**：`''` 继续 vs `null` 跳过） |
| lib/shared/web-harness.mjs | client-hitl.entry、client-load.entry、cockpit-truth.entry、cockpit-artifact-truth.entry、cockpit-truth-residuals.entry、cockpit-truth-substance.entry、cockpit-locale.entry、cold-start.entry、defaults-probe、discipline-probe、wave-execution-probe、entry-chain-probe、l4-lite.e2e、method-library-probe、preset.e2e、rerun-triage-probe、run-driver、session-replay、snapshot-replay.entry、team-preflight.e2e | DSH web 冒烟族**启停与通道唯一正本**：`bootWeb`（委托 `web-banner` 等启动横幅拿 token）+ `authenticate` + `makeRpc`；**参数保形**——端口/超时/尾部字符/rpcId 前缀/失败文案与收割方式全留各站点 |
| lib/shared/web-banner.mjs | boot-timer.test、web-harness | DSH web 启动横幅等待与超时定时器结算纯函数（零 child_process/fetch，成功/早退/超时三路径均回收 timer；BUG-095） |
| lib/shared/session-log.mjs | bundle-sessions、cdp-ask.entry、cdp-probe、client-hitl.entry、client-load-reference.support、cockpit-truth.entry、cockpit-artifact-truth.entry、cockpit-truth-residuals.entry、cockpit-truth-substance.entry、cockpit-locale.entry、defaults-probe、client-load.entry、data.entry、discipline-probe、wave-execution-probe、entry-chain-probe、hitl-answer、l4-lite.e2e、method-library-probe、plan-card-stats、product-boot.entry、provider-error-stats、rerun-triage-probe、run-dashboard-core、run-kickoff、run-state、run-state.spec、session-events、session-log.spec、session-replay、snapshot-replay.entry、stream-diagnostics、team-preflight.e2e、verdict-audit、verdict-audit-fixture.spec、watch-run、workspace-isolation.entry | canonical 日志选择与读取 + 会话目录发现（findSessionDir 双形态/首匹配；readSessionTextOf 定位+读取——六处真模型档副本 2026-11-04 收口）+ 会话组发现（findGroup 子串参数化，缺省 research-workspace——BUG-010 三处同款一行收敛；冒烟/自测组逃生口 = 观察工具 --group） |
| lib/analyze/session-events-core.mjs | session-events、session-events.spec | 会话事件摘要与筛选纯函数（CLI 壳 = probes/analyze/session-events） |
| lib/probes/llm-stream-tee-core.mjs | llm-stream-tee-core.spec | LLM 流 tee 的捕获判定（主机子串，fail-closed）与凭据头脱敏（预载壳 = probes/stream/llm-stream-tee.cjs——CJS require 面不在 .mjs 对账图内，壳本体是活进程仪器不设 keyless 自测） |
| lib/analyze/provider-errors.mjs | provider-error-stats、provider-errors.spec | 回合被上游流错误终结的结构化抽取（唯一语义源：只认 `turn/end` + `reason.kind=error`，不双算 `assistant/attempt`） |
| lib/shared/port.mjs | client-load.entry、cold-start.entry、port.spec、run-driver、snapshot-replay.entry | 端口参数唯一解析正本（1–65535 整数；tools/channel 与 checks/smoke 入口共用） |
| lib/shared/plan-card.mjs | node-gate-session-gates、plan-card-stats、plan-card.spec | 计划确认卡识别与字数口径（唯一语义源：标签「按计划开跑」+ `question` 字段全长 + 阈值 200） |
| lib/gates/protocol-core.mjs | content-coverage.spec、protocol-audit、protocol-audit-core、protocol-core.spec、research-defaults.spec、skill-parser-contract.spec、strategy-core、evidence-audit-core、run-accept、topics-parsing.spec | Protocol **schema 半**：枚举/canonical/hash/validateProtocol/§研究方法 与 §Decisions 解析（无 IO；口径 = 核验 §6 + 表达层补篇 §4–§7） |
| lib/gates/protocol-audit-core.mjs | protocol-audit、protocol-core.spec、run-accept.e2e | Protocol **bundle 级判据**：effort 合同/投影/策略行投影（通道/worker/预算 cap；fail-loud）/批准链/plan 引用/audit hash/版本快照 + `projectionOf`/卡文 + `methodLibraryEntryOf`（条目解析复用 pack `foldLibrary`，文件缺失=undefined / 条目缺失=null；无 IO） |
| lib/gates/strategy-core.mjs | protocol-audit-core、strategy-core.spec | Strategy 投影（K/O/G/B）纯派生：Protocol + plan + topics → 通道/worker/角色/拓扑/门/预算；不读模型/会话 |
| lib/analyze/stream-diagnostics-core.mjs | stream-diagnostics、stream-diagnostics.spec | 模型活动会话筛选（活动事件预筛后再按日志 mtime 取最近 N）+ 尝试时间线投影（assistant/message 计成功、assistant/attempt 计失败/无落面，终态三判 alive-or-idle/recovered/dead） |
| lib/shared/run-state.mjs | bundle-sessions、cdp-ask.entry、hitl-answer、run-kickoff、run-state.spec、session-events、session-replay、watch-run | run 操作面状态谓词 |
| lib/gates/run-source-node.mjs | evidence-audit、node-gate、run-context-node.spec、schema-scan | node:fs 的 RunSource 适配器：list/read/version；ENOENT → missing，其余 → unreadable；行窗口与 eof 语义对齐 vendor workspaceFiles |
| lib/shared/env.mjs | clean-room、cdp-ask.entry、client-hitl.entry、client-load.entry、cockpit-truth.entry、cockpit-artifact-truth.entry、cockpit-truth-residuals.entry、cockpit-truth-substance.entry、cockpit-locale.entry、data.entry、defaults-probe、discipline-probe、wave-execution-probe、doctor.e2e、entry-chain-probe、env-credentials.spec、install-shape.entry、l4-lite.e2e、lifecycle.entry、method-library-probe、pack.e2e、preset.e2e、product-boot.entry、profile-concurrency.entry、record-role-fixture、release.entry、rerun-triage-probe、run-accept.e2e、session-replay、snapshot-replay.entry、team-preflight.e2e、user-env.entry、workspace-isolation.entry | 子进程环境清洗（scrubbedEnv/withModelKey）与真模型档前置（requireCredentials/credentialsPresent——凭据卫生） |
| lib/harness/playwright.mjs | client-hitl.entry、client-load.entry、cockpit-truth.entry、cockpit-artifact-truth.entry、cockpit-truth-residuals.entry、cockpit-truth-substance.entry、cockpit-locale.entry、hitl-answer、product-boot.entry、session-replay、snapshot-replay.entry | Playwright 启停支撑 |
| lib/harness/browser-cache.mjs | playwright、browser-cache.spec | 浏览器缓存目录判据（macOS/Linux/Windows 三态 + `PLAYWRIGHT_BROWSERS_PATH` 覆盖） |
| lib/harness/host-health.mjs | client-load.entry、host-health.spec | 真浏览器冒烟的主机健康判据（freeMB / load-per-CPU）：预检与失败归因都把环境红归为 NOT-RUN（exit 2），不伪装产品红 |
| lib/shared/cdp-driver.mjs | cdp-probe、scene-capture | 裸 CDP 驱动 |
| lib/analyze/session-replay.mjs | session-replay、session-replay.spec | 历史会话定位/元信息/判读整形纯函数（跨组枚举、id 优先、标题歧义如实报候选；会话→工作区靠首事件 cwd） |
| lib/analyze/scene-pack.mjs | scene-capture、scene-pack.spec | 场景包读取/列示纯函数（五件套概要如实——缺件与坏 meta 不静默；mtime 降序） |
| lib/channel/inject-reconcile.mjs | cdp-probe、inject-reconcile.spec、run-kickoff | 注入消息「落盘对账」判据（BUG-021 正修：日志里出现本条 user/message 才算送达；时间下界防同文假阳） |
| lib/probes/probe-send-target.mjs | cdp-probe、probe-send-target.spec | 提交按钮判定纯函数（BUG-021 正修：send 家族六标签状态机 + **stop 家族拒点** + composer 邻近窗；页面只读 DOM 与执行点击） |
| lib/shared/final-version.mjs | final-version.spec、node-gate-delivery-gate、node-gate-reader-gate、node-gate-run-gates、node-gate-session-gates、protocol-audit、run-accept、run-dashboard-core、run-receipt、schema-scan-core、verdict-audit | 终稿版本文件名的唯一判据（纯判据从 pack `src/lib/final-target.ts` 取；目录扫描 = final/ 与 readable-vN、bundle 终稿文本回退 `finalTextFromBundle`）；旧 vN 正则的机械漂移锁 = `tests/run/gates/final-version.spec.mjs` |
| lib/shared/probe-status-tab.mjs | cdp-probe、probe-status-tab.spec、session-replay | 右栏「研究状态」页签判定纯函数：胶囊按**标题 span 逐字**匹配（拒绝描述串入 / 近似标题）、页签体只认 `[data-sidebar-right-tab]`（不拿会话正文当观察面） |
| lib/shared/probe-index.mjs | f-repo、probes/_index.mjs、probe-index.spec、smoke-contract.test | 探针索引纯函数（递归扫描 `probes/`、解析头注六字段、按域分组渲染；门禁 probe-registry 消费同一渲染；索引不复制判据/不证明长文） |
| lib/channel/run-channel.mjs | run-driver、run-driver-contract.spec | run 通道驱动判据纯函数：web.log → 当前 GUI URL（取最后一条横幅）、浏览器面 verdict → 呈交判决（GREEN / RED / NOT-RUN）；BUG-435 热载就绪判据：首页 HTML → boot graph、镜像 stat → 期望 rev（vendor artifactRevision 同公式）、graph rev 比对 |
| lib/channel/mirror-sync.mjs | run-driver、mirror-sync.spec | 漂移恢复快路径分类判据（BUG-435）：exports["./client"] → client 产物身份；漂移集分 client/doc/host 三桶（未知默认 host，fail-safe）；CLI 供 boot-run-body.sh sync_mirror 消费（host 桶非空 = exit 1 拒绝就地同步） |
| lib/channel/ask-drive.mjs | ask-drive.spec、hitl-answer、run-kickoff | 代答读窗与谓词 |
| lib/shared/workspace-root.mjs | bundle-sessions、evidence-audit、hitl-answer、node-gate、plan-card-stats、provider-error-stats、schema-scan、session-events、session-log、watch-run、workspace-root.spec | dev 工作区根解析（flag → DSH_RUN_WORKSPACE → 仓内默认）+ vendor 同形 `projectKey(cwd)` 会话组（D38 C1：替代数据根/组名各写一份；legacy substring 兜底） |
| lib/shared/web-ui-nav.mjs | cdp-probe、client-hitl.entry、client-load-config.support、client-load-final.support、client-load.entry、cockpit-truth.entry、cockpit-artifact-truth.entry、cockpit-truth-residuals.entry、cockpit-truth-substance.entry、cockpit-locale.entry、hitl-answer、library-fold.spec、session-replay、snapshot-replay.entry、web-ui-nav-bilingual.test、web-ui-nav.spec | 观察面侧栏会话定位**唯一正本**（2026-10-21 收拢，六处私有版退役）：data-row-key 主锚（session:\<id\>/workspace: 行键）+ 折叠组展开（expandGroup，data-row-key 主 + 类名兜底）+「Show N more」逐层 + 搜索兜底（结果无行键→按文本点）；类名扫描降级为兜底——两套选择器各有实红教训，裁决依据 = 模块头注；零依赖 page 鸭子类型；CDP 边界 = 纯常量 SHOW_MORE_SESSIONS_PATTERN / PREVIEW_NOTICE_PROBE_JS 供 cdp-probe evaluate 字符串消费（后者 = 首屏 Preview Notice 遮罩的探测与关闭，keyless 钉 = web-ui-nav.spec）；真浏览器证据归消费方冒烟档（client-load.entry） |
| lib/analyze/unconsumed-evidence.mjs | unconsumed-evidence、unconsumed-evidence.spec | B1 机械基座：evidence/ 未进 findings.md 的差集投影（critic 差集出题的操作侧对账；CLI 壳 = probes/analyze/unconsumed-evidence） |
| lib/gates/acceptance-check.mjs | acceptance-check、acceptance-check.spec | 收活判据机械求值：PASS/FAIL/UNVERIFIED 三态（DeerFlow acceptance_criteria keyless 移植，判不了永不静默放行；CLI 壳 = checks/run-gates/acceptance-check） |
| lib/shared/hitl-provenance.mjs | ask-drive.spec、client-hitl.entry、hitl-answer、hitl-provenance.spec、node-gate-witness.spec、run-kickoff | 代答 provenance 写盘（BUG-014 正修——代理模拟显式记账；BUG-017 题面富集） |
| lib/shared/local-date.mjs | export-dist、hitl-answer、local-date.spec、local-date-usage.test、run-kickoff、runtime-clean、schema-scan-core、schema-scan.spec | 人读日期行本地口径（与 bash date 同源；BUG-017 / BUG-416 正修——UTC slice 凌晨窗口差一天；守卫 = local-date-usage.test 扫 tools/checks 的 UTC 切片） |
| lib/gates/bundle-date-sanity.mjs | bundle-date-sanity.spec、run-accept | run bundle 未来日期检查（操作侧验收前哨——r1-license 29 处未来日期事故的机械面；消费语境 = run-accept 行） |
| lib/harness/vendor-artifacts.mjs | cdp-ask.entry、client-hitl.entry、client-load.entry、defaults-probe、discipline-probe、wave-execution-probe、entry-chain-probe、l4-lite.e2e、preset.e2e、session-replay、team-preflight.e2e、vendor-artifacts.spec | vendor 构建产物自检 |
| lib/repo/backlog-liveness.mjs | backlog-liveness.test、f-repo、staged-change-pairing | 问题卡、缺陷、调研、方法与归档索引的结构合同；被 verify 入口与 keyless 回归消费 |
| lib/repo/staged-change-pairing.mjs | staged-change-pairing.test、f-repo | 暂存区成对变更判据（归档卡↔Note、ui.expected↔lastRewrite）；纯函数，git 由门禁注入 |
| lib/repo/test-placement.mjs | f-repo、pack-mirror.test、test-lanes.test、test-owner-mirror.test、test-placement.test | tests 落点闭集：全集 − 已知子集 = 空（未知子树/深度/平铺根 = 红；BUG-191/200） |
| lib/repo/doc-prose-paths.mjs | doc-prose-paths.test | 散文路径枚举薄壳（枚举正本 = doc-surface；BUG-204 的 API 不动） |
| lib/repo/doc-surface.mjs | a-docs、f-repo、doc-prose-paths、doc-surface-shapes.test | live 文档可读面的唯一枚举器：形态台账（SHAPES / COMMAND_FORMS）↔ 订单案例对账、命令归一（env 前缀 / `./` / 包装器 / `&&` / heredoc / 缩进 / YAML 折叠块）、退役根判据 |
| lib/repo/doc-counts.mjs | a-docs、doc-counts.test | 资产计数名词闭集（count-free 判据面正本）+ 硬计数 token 抽取 |
| lib/repo/docs-reference.mjs | a-docs、b-pack、f-repo、render-docs-reference、docs-reference.test | `docs/reference/*.generated.md` 三份参考物纯生成与新鲜度判据 + `commands.md` ↔ `package.json` 双向校验 |
| lib/shared/skill-golden.mjs | record-skill-golden、skill-golden.test | skill 正文 sha256 清单与漂移判据（快照 B 只比 catalog） |
| lib/channel/start-lock.mjs | start-channel、start-lock.test | 启动互斥：原子 mkdir + 每次取得的独有 owner 文件；release 仅删除本代文件并 rmdir，无在线 stale 接管；两个入口由 start-channel 统一持有 |
| lib/channel/profile-guard.mjs | run-driver、profile-guard.test | run-driver 的非默认 profile 守卫：默认 profile 放行，其余 fail-loud（显式 `--allow-stale-profile` 才继续） |
| lib/gates/findings-core.mjs | evidence-audit-core、node-gate-run-gates、protocol-core、review-contract、findings-contract.spec、template-contract.spec、topics-contract.spec、topics-parsing.spec、skill-parser-contract.spec、text-encoding-equivalence.spec | findings gap 四态 / lenses / lens_gaps 差集 / scope_role 闭集 |
| lib/gates/review-contract.mjs | node-gate-delivery-gate、review-contract.spec | review 覆盖表（topic × lens）+ CRITICAL 与 readiness 交叉 |
| lib/gates/plan-gate.mjs | node-gate-contracts.spec、node-gate-core、plan-gate.spec、skill-parser-contract.spec、text-encoding-equivalence.spec | plan 图硬结构（环/悬空/重号/自依赖）+ owner/kind/lifecycle/剩余工作/版本快照 |
| lib/harness/role-picker.mjs | client-load.entry、role-picker.test | 角色选择器纯判据：四研究角色连续相邻 + Method Editor（D37）；逐角色 C 归场景级 |
| lib/repo/pack-deps.mjs | pack.e2e、pack-deps.test | 发布物依赖闭包 = peers：require/动态 import()/.d.ts import 正向、死 peer 反向（host-row 显式 allowlist）、DSH-tag peer 范围 = engines.dsh |
| lib/repo/publish-manifest.mjs | export-dist、pack.e2e、publish-manifest.test | 发布 manifest 收口：剥离 devDependencies/scripts + workspace 协议检查 |
| lib/harness/clean-room.mjs | cold-start.entry、release.entry、lifecycle.entry | 干净室安装矩阵：仓外 home / 钉版 dsh / tarball 安装 / 解析祖先 / 版本合同 / 起 web |
| lib/harness/clean-room-policy.mjs | clean-room、clean-room-policy.test、cold-start.entry、lifecycle.entry、release.entry | 干净室纯判据：仓外 home、版本 ∈ engines、profile 解析不落仓根、peer 全集派生 |
| lib/repo/shipped-surface.mjs | b-pack、package-contract.spec、pack.e2e、record-type-closure、shipped-surface.test | 发布面自足判据正本：随包文本零 dev 引用（歧义根只认真实子目录）、README 用户段零开发命令、`files` = `exports.types` 反投影、tarball 顶层/类型集合对账 |
| lib/repo/redirect-ledger.mjs | a-docs、redirect-ledger.test | 搬家账本链式解析：append-only 后旧条目的 `to` 可再次成为 `from`，解析走到最终落点；环/过深/重复 from fail-loud |
| lib/probes/direct-authorization-boundary.mjs | entry-chain-probe、entry-chain-probe.spec | 按授权范围执行、无需重复请批的词面判定；由探针与 keyless 回归消费 |
| lib/harness/replay-scene.mjs | replay-fixtures.spec、replay-scene.spec、snapshot-replay.entry | 场景声明消费者：roster/版本/来源形状/路径校验（缺件、串角色、垃圾锚点 fail-loud）+ 场景集发现（`replay/*/snapshot.json` 全集、防空语料、--face 全名定向） |
| lib/shared/replay-request.mjs | record-role-fixture、replay-request.spec、snapshot-replay.entry | 组装请求面逐条比较：persona、header 全序列、四处 user/message 注入（含时钟序列）（定向归一化） |
| lib/harness/snapshot-mode.mjs | snapshot-readonly.test、snapshot-replay.entry | 快照 smoke 模式判据：只读/刷新互斥、`DSH_SNAPSHOT` 只认 replay、刷新必须 `--why` |
| lib/repo/smoke-lane.mjs | run-lane、smoke-lane.test、cli-exit-contract.test | smoke 车道选择：lane/tier 过滤、support 不进车道、默认 ci∪nightly + `--all`；无匹配消息带修正入口 |
| lib/test-infra/test-index.mjs | render-test-index、test-index.test、test-owner-mirror.test、pack-mirror.test、test-surface.test | 测试 ↔ 源码 owner 索引生成：模块 → owner → 直接 import 的测试（生成物 = tests/INDEX.generated.md；生成器 = tools/record/render-test-index.mjs） |
| lib/shared/profile-health.mjs | profile-health.spec、record-role-fixture、snapshot-replay.entry、team-preflight.e2e | dev profile 版本与镜像新鲜度预检：团队层版本 == 运行时 dsh 版本且安装副本关键文件与包源一致；缺席/落后/陈旧 → 明确 exit 2 + 重建指令（BUG-066/080） |
| lib/shared/startup-hint.mjs | startup-hint.spec、web-banner | boot 失败归因：识别日志里的 incompatible/exemption，指出 profile 未随 pin 重钉（BUG-066） |
| lib/harness/client-load-select.mjs | client-load-reference.support、client-load-select.spec | client-load 绑定会话选择（只认 lead 根；防富 coach 会话假红，BUG-142） |
| lib/harness/port-reclaim-policy.mjs | port-reclaim、probe-port-policy.test、port-reclaim.spec | 端口 listener 身份纯判据与行为探针退避/整组收割纯编排（只认本仓 DSH web；遇占口回落临时端口；无子进程依赖，BUG-104/113/136） |
| lib/harness/run-lock.mjs | client-load.entry、run-lock.spec、snapshot-replay.entry | 冒烟脚本进程级运行锁：存活拒跑、陈旧锁接管、释放（共享 DSH_HOME 的脚本互斥） |
| lib/harness/replay-network-offline.cjs | snapshot-replay.entry | 回放 A 层离线闸 preload：非 loopback DNS(lookup/resolve*)/connect 立即失败；只作用于 dsh 主进程（BUG-064/067） |
| lib/harness/replay-network-offline-policy.cjs | replay-network-offline.spec | 离线闸纯判据（isLoopback/isDshMain；无 node:net 依赖，测试可直引） |
| lib/harness/port-reclaim.mjs | client-load.entry、cockpit-truth.entry、cockpit-artifact-truth.entry、cockpit-truth-residuals.entry、cockpit-truth-substance.entry、cockpit-locale.entry、cold-start.entry、data.entry、defaults-probe、discipline-probe、entry-chain-probe、method-library-probe、preset.e2e、product-boot.entry、release.entry、rerun-triage-probe、wave-execution-probe、workspace-isolation.entry、snapshot-replay.entry | 端口收割执行器与探针端口准备/整组清理（按端口杀 + 三轮验证释放 + 占口回落空闲端口，BUG-136） |
| lib/shared/path-hygiene.mjs | node-gate-session-gates、path-hygiene、path-hygiene.spec、run-accept、run-receipt | 本机 home 路径纯文本检测（Unix/macOS/Windows 前缀；行号）+ `portableBundlePath`（bundle 内绝对路径 → `drt_<slug>/…` 可移植标签；bundle 外 → null） |
| lib/shared/secret-scan.mjs | run-accept、secret-scan、secret-scan.spec | 高置信凭据形态检测（sk-/ghp_/AKIA/PRIVATE KEY/Bearer）；只报 path/line/kind，不回显原文 |
| lib/test-infra/selftest-library.mjs | library-fold.spec | 「研究配置」面板/library-fold 自测例库单一正本：12 形态条目（四字段/部分/空值/旧格式/混居/重名/空条目/杂项行/续行/缩进），两处共用防形态漂移 |
| lib/test-infra/method-presets.mjs | library-fold.spec、method-presets.spec | research-brief skill「方法预设」表的唯一解析入口（表头/行列数/防空集 fail-loud）——内置名单不再各写一份手写副本 |
| lib/test-infra/keyless-imports.mjs | asset-ledger、boot-timer.test、test-index、test-index.test、test-owner-mirror.test、pack-mirror.test、client-surface.test、layering.test、smoke-imports.test、test-lanes.test、test-surface.test | 只读 import 检查（解析器 = typescript 纯函数；company keyless-imports@59551f2 移植）——调用表达式解析 + 本地 import 闭包图 |
| lib/harness/gates-cases.mjs | gates.e2e、verify-gates.test、doc-surface-shapes.test | 门禁自测的注入案例表（纯 fs mutate；git add 由驱动壳统一执行） |
| lib/harness/gates-cli.mjs | gates.e2e、gates-cli.spec | gates.e2e 的 flag/数值输入归一（--case/--jobs 两形状，空值/未知参数 exit 2）与有界并发（BUG-195/203） |
| lib/repo/fix-evidence.mjs | fix-evidence.test、staged-change-pairing、backlog-liveness | bug 修复卡实证合同：改动/红证/绿证 + 可重放红证/测试资产；活跃 修复落地 与归档共用 |
| lib/test-infra/workspace-parsers.mjs | ci-workflow、markdown-mask-conformance.spec、markdown-mask-diff.spec、note-scan.test、plan-mdast.spec、record-ci-oracle、replay-fixtures.spec、skill-parser-contract.spec、verdict-conformance.spec、workspace-parsers.test | 锁定在 `node_modules/.pnpm` 内的外部纯函数解析器加载器（`yaml@2` + `mdast-util-from-markdown@2`；防向上穿透宿主机目录） |
| lib/repo/note-scan.mjs | c-notes、note-scan.test、markdown-mask-conformance.spec | notes 门禁的 Markdown 块级扫描：复用 `src/lib/markdown-mask.ts` 单一正本，与 `mdast` 直接在测试进程内逐行对账（BUG-169/175/178/179/183/185） |
| lib/test-infra/asset-ledger.mjs | asset-ledger.test、guard-ledger.test、record-asset-ledger | 测试资产组合账生成器：lane/class/cost/uniqueClaim/oracleType/sunset（AST 自动推导 oracleType，禁手写 OVERRIDES）；与盘上测试和守卫账双向对账 |
| lib/test-infra/ci-workflow.mjs | ci-jobs.test、ci-workflow-oracle.test、ci-workflow.test、model-workflow.test、record-ci-oracle、smoke-registry.test | GitHub Actions 执行面与写入侧规范门：`yaml@2` 解析 `on:`/`jobs:`/`needs` + `bash -eo pipefail` 执行面 + `ciWorkflowRunProblems`（BUG-172/184/187/190） |
| lib/test-infra/smoke-assets.mjs | smoke-assets.test、smoke-registry.test、smoke-oracle-surface.test、smoke-cost-budget.test | `checks/smoke` 顶层分类（普通文件/目录/symlink/其它）与扁平合同违规项；symlink 不再静默消失（BUG-176） |
| lib/shared/artifact-freshness.mjs | artifact-freshness.test、lifecycle.entry、export-dist、release-check、e-workspace | `_dist` 产物 mtime 不早于 pack 源/构建（src/lib/presets/content/package）；旧 tarball → exit 2（BUG-174） |
| lib/harness/run-accept-fixture.mjs | run-accept.e2e、run-accept-fixture.spec | claim 夹具的 review/readiness 文本（D51 同源：有声明 = declaration/PASS，缺声明 = missing/红） |
| lib/gates/node-gate-core.mjs | node-gate、node-gate-delivery.spec、node-gate-leads.spec、node-gate-session.spec | bundle 判据聚合；唯一导出 = `gateBundle`，领域门直接 import 各自模块 |
| lib/shared/node-gate-contracts.mjs | node-gate-contracts.spec、node-gate-delivery-gate、node-gate-delivery.spec、node-gate-reader-gate、node-gate-run-gates、node-gate-session-gates、plan-gate、readiness-declaration.spec、review-readiness.spec、verdict-audit、verdict-audit-core、verdict-conformance.spec | 交付日期合同（含 findings/topics/plan 三门 2026-11-18 纪元）、readiness 与 decisions 行解析 |
| lib/shared/node-gate-session-gates.mjs | ask-drive.spec、bundle-sessions、node-gate-core、node-gate-delivery-gate、node-gate-witness.spec、node-gate-delivery.spec、node-gate-session.spec、run-accept | HITL、present 与 §Decisions 会话门 |
| lib/gates/node-gate-run-gates.mjs | node-gate-contracts.spec、node-gate-core、node-gate-leads.spec、node-gate-session.spec、findings-contract.spec、text-encoding-equivalence.spec | leads、版本与标题退化门 |
| lib/gates/node-gate-delivery-gate.mjs | node-gate-core、readiness-declaration.spec、run-receipt.spec | 门A 交付完整性判据 |
| lib/gates/node-gate-reader-gate.mjs | node-gate-core、node-gate-reader.spec | 门C 读者版合同：同版/六节/长度/无来源路径；数字子集只 WARN；旧场/quick_factual 豁免 |
| lib/gates/schema-scan-core.mjs | node-gate-contracts、node-gate-contracts.spec、node-gate-core、node-gate-delivery-gate、node-gate-reader-gate、node-gate-run-gates、node-gate-session-gates、protocol-audit、run-accept、run-bundle-charter.spec、run-receipt.spec、schema-scan、schema-scan.spec、verdict-audit | 节点 I/O 契约在场级断言判据核（交付日/研究类型/条件件豁免/断代定红——从 run-gates 下沉修 lib→入口层反向依赖） |
| lib/analyze/run-dashboard-core.mjs | evaluation-contract.test、run-dashboard、run-dashboard-html、run-dashboard.spec | M2 run 观察面解析/场景/模型纯管线（全 fail-soft；HTML 渲染 = run-dashboard-html，CLI/watch/写盘归壳） |
| lib/analyze/run-dashboard-html.mjs | run-dashboard、run-dashboard.spec | M2 run 观察面 HTML 渲染薄壳（纯字符串拼接；矩阵/统计来自 core，不读盘） |
| lib/gates/evidence-audit-core.mjs | evidence-audit、evidence-audit.spec、provenance.spec、skill-parser-contract.spec、template-contract.spec、text-encoding-equivalence.spec | 证据溯源审计判据核心（readLog 注入同上） |
| lib/gates/verdict-audit-core.mjs | verdict-audit、verdict-audit.spec、verdict-audit-fixture.spec、skill-parser-contract.spec、text-encoding-equivalence.spec | claim 级裁决判据核心：claims/verdicts 形状与键集、覆盖（critical 全有结论性裁决）、raw 原文重解析（raw 带 ```json 围栏时只剥一层解析，原文比对不放宽）、逐字一致（跨轮单调）、child preset/depth/只读；`parseSessionFacts` = 真实 v4 日志线形 → 会话事实（CLI 只做定位/解压），readiness 读法复用 node-gate 同源 |
| lib/gates/provenance.mjs | evidence-audit-core、provenance.spec | 离线来源证明：kind/URL/路径 + sha256 + 时间 + 通道 + 切片；local-file 哈希核对 |
| lib/analyze/run-inventory-core.mjs | run-inventory、run-inventory.spec | 只读保留期折算（逐场文件数/字节/最老；合计；1024 进制格式化） |
| lib/channel/runtime-clean-core.mjs | runtime-clean、runtime-clean.spec | 运行区清理纯判据：白名单容器/实验根 + 子树最新 mtime 保留期；symlink/未知名/穿越 fail-closed |
| lib/shared/run-receipt.mjs | node-gate-delivery-gate、run-accept、run-bundle-charter.spec、run-receipt.spec、text-encoding-equivalence.spec | 交付回执（delivered/manifest/acceptance）纯生成与校验：present 取最新版本化、语料根写可复算标签、final/audit/reader 哈希复算（门A/门C 消费） |
