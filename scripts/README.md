# scripts/ · 职责索引

> 职责分组（2026-10-07 目录治理档 C）：六个子目录 + `lib/` 支撑库；每个盘上入口一行：类 / 证明什么 / 档位。命令与前置正本 = [guides/60 §2](../docs/guides/60-dev-loop.md)；子树纪律 = [AGENTS.md](AGENTS.md)；测试资产分层 = [tests/fixtures taxonomy](../tests/fixtures/README.md)。本索引不改脚本路径与命令。

## verify/（L0 结构门禁）

| 件 | 证明什么 | 档位 | 事实来源 |
|---|---|---|---|
| verify.mjs | 仓结构机械不变量（门禁聚合入口） | keyless | [evaluation §L0 台账](../docs/evaluation.md) |

根面（不分组的配置与指令件）：`doc-budgets.json`（常驻文档行数上限，被 doc-budgets 门禁消费，正本即自身）、`archived-note-pointers.json`（活面→notes/archived 链接的历史指针登记簿，被 archived-note-pointer 门禁消费，正本即自身）、`README.md`（本索引）、`AGENTS.md`（子树常设指令：新门禁流程、范围纪律、命名即层）。

## smoke/（分级冒烟）

| 件 | 证明什么 | 档位 |
|---|---|---|
| preset-smoke.mjs | L1 真挂载：boot 页模块表行（client 半 served）、roster、逐角色建会话、skills 隔离 | keyless（`DSH_SMOKE_REAL=1` 起真 DSH，无模型） |
| release-smoke.mjs | L2 安装形状：pack → 干净 profile → plugin add → manifest/安装域 client 半断言 → 安装域冒烟 → 端口释放验证（进程卫生：超时预算 + 并发锁 + 退出确认） | keyless（`--install-only` 跳凭据） |
| client-load-smoke.mjs | 观察面真浏览器装配、页签与渐进面对账（磁盘参考选择 = client-load-reference.mjs） | keyless（浏览器） |
| snapshot-replay-smoke.mjs | 场景 manifest 驱动的四角色组装面回放（persona/header 全序列/三处注入）+ 声明的渲染金标准 | keyless（RPC/解压子进程，无模型；须先 source dev/env.sh） |
| gates-smoke.mjs | 门禁自测：临时副本注入回归经真实 verify 入口点名报红 + 零注入对照组 | keyless（git/node 子进程，无模型） |
| client-hitl-smoke.mjs | 活标题触发与挂起显性化 | 真模型档 |
| l4-lite-smoke.mjs | 四角色真模型响应 + scout web_search 调用 | 真模型档 |
| team-preflight-smoke.mjs | spawn_teammate 组队与成员组合画像 | 真模型档 |
| cdp-ask-smoke.mjs | cdp-probe `--ask` 端到端：空闲态 `Send message` 与在飞态 `Queue message` 双路径发出 + **journal 落盘对账**（BUG-021 正修；判定本体 keyless 钉在 `lib/probe-send-target.mjs`） | 真模型档 |

## probe/（探针）

| 件 | 证明什么 | 档位 |
|---|---|---|
| cdp-probe.mjs | 指定场景显示/点击/会话回复（裸 CDP） | 连已起 GUI；`--ask` 按会话档 |
| entry-chain-probe.mjs | 授权范围、RFC 条件与开发环路径三问，词面断言 + 留档人工复核 | 真模型档 |
| discipline-probe.mjs | 散文纪律行为面五场景标记断言（A2 超界 / B1 差集 / 收活缺件 / 收活 UNVERIFIED / 计划确认卡·quick_factual 免发互补对）+ 留档人工复核；`--scenario <id>` 定向跑 | 真模型档 |

## run-gates/（run bundle 机械门与审计）

| 件 | 证明什么 | 档位 |
|---|---|---|
| node-gate.mjs | 判据级：门①②③④ + 门L + 门R（标题重复退化，2026-10-06 起）+ 门A（交付完整性，2026-10-08 起；图例正本 = research-workspace/NODES.md 头部），报告落 bundle——判据核心住 lib/node-gate-core.mjs 门面及领域模块（本件 = CLI 壳 + zstd reader 注入） | keyless |
| schema-scan.mjs | 在场级：八节点输出件在场断言（断代定红；判据核住 lib/schema-scan-core.mjs，本件 = CLI 壳） | keyless |
| evidence-audit.mjs | URL/摘录/final 链溯源对账 → audit.md——判据核心住 lib/evidence-audit-core.mjs（本件 = CLI 壳 + zstd reader 注入） | keyless（须 source dev/env.sh） |

## run-ops/（run 观察与运维）

| 件 | 证明什么 | 档位 |
|---|---|---|
| watch-run.mjs | 谓词化状态判定（HITL-PENDING / RUN-SETTLED 自报） | keyless（会话根缺省回退开发 home；显式 source 更稳） |
| run-dashboard.mjs | 只读 HTML 投影：多 run 扫描 + 步骤条（fail-soft；纯管线住 lib/run-dashboard-core.mjs，本件 = CLI 壳） | keyless |
| stream-diagnostics.mjs | 流失败归因诊断（run-ops）：模型尝试时间线/失败密度/provider 与重试策略实名/工具调用与检索查询/宿主 boot 事实——出问题第一步跑它 | keyless（读会话日志与 boot 日志） |
| provider-error-stats.mjs | 上游流错误（回合被终结）的跨场分布投影（BUG-022 的"可数"面；判据与抽取 = lib/provider-errors.mjs） | keyless（须 source dev/env.sh） |
| plan-card-stats.mjs | 计划确认卡字数的跨场分布投影（判 ①-c 的升硬门前置「连续 ≥3 场达标」；口径与识别 = lib/plan-card.mjs，与 node-gate 门① 同源） | keyless（须 source dev/env.sh） |

## dist/（分发）

| 件 | 证明什么 | 档位 |
|---|---|---|
| export-dist.mjs | pack → `_dist/` 安装包与安装手册 | keyless |

## lib/（支撑库）

| 模块 | 被谁消费 | 说明 |
|---|---|---|
| lib/roles.mjs | 冒烟与门禁 | 角色清单访问器（事实源 = 盘上 presets/） |
| lib/session-log.mjs | run-state、watch-run、client-load-smoke、hitl-answer、回归 | canonical 日志选择与读取 + research-workspace 组发现（BUG-010；组发现 = 2026-10-13 三处同款一行收敛） |
| lib/provider-errors.mjs | provider-error-stats、provider-errors.test | 回合被上游流错误终结的结构化抽取（唯一语义源：只认 `turn/end` + `reason.kind=error`，不双算 `assistant/attempt`） |
| lib/plan-card.mjs | node-gate 门①、plan-card-stats、run-ops 投影 | 计划确认卡识别与字数口径（唯一语义源：标签「按计划开跑」+ `question` 字段全长 + 阈值 200） |
| lib/run-state.mjs | watch-run、仪表盘、回归 | run 操作面状态谓词 |
| lib/env.mjs | 冒烟族 | 子进程环境清洗（scrubbedEnv/withModelKey——凭据卫生） |
| lib/playwright.mjs | 浏览器冒烟 | Playwright 启停支撑 |
| lib/cdp-driver.mjs | cdp-probe | 裸 CDP 驱动 |
| lib/inject-reconcile.mjs | cdp-probe、inject-reconcile.test | 注入消息「落盘对账」判据（BUG-021 正修：日志里出现本条 user/message 才算送达；时间下界防同文假阳） |
| lib/probe-send-target.mjs | cdp-probe、probe-send-target.test | 提交按钮判定纯函数（BUG-021 正修：send 家族六标签状态机 + **stop 家族拒点** + composer 邻近窗；页面只读 DOM 与执行点击） |
| lib/ask-drive.mjs | hitl-answer | 代答读窗与谓词 |
| lib/web-ui-nav.mjs | client-load-smoke、hitl-answer | 观察面侧栏导航共享件：折叠组展开（expandGroup）+ 候选分组名——两消费方逐字双份的收敛（零依赖，page 鸭子类型；真浏览器证据归消费方冒烟档） |
| lib/unconsumed-evidence.mjs | unconsumed-evidence.test / 收尾核验 | B1 机械基座：evidence/ 未进 findings.md 的差集投影（critic 差集出题的操作侧对账） |
| lib/acceptance-check.mjs | acceptance-check.test / 收尾核验 | 收活判据机械求值：PASS/FAIL/UNVERIFIED 三态（DeerFlow acceptance_criteria keyless 移植，判不了永不静默放行） |
| lib/hitl-provenance.mjs | hitl-answer | 代答 provenance 写盘（BUG-014 正修——代理模拟显式记账；BUG-017 题面富集） |
| lib/local-date.mjs | hitl-answer、export-dist | 人读日期行本地口径（与 bash date 同源；BUG-017 正修——UTC slice 凌晨窗口差一天） |
| lib/vendor-artifacts.mjs | boot 面护栏（五个入口共用） | vendor 构建产物自检 |
| lib/backlog-liveness.mjs | verify/backlog-liveness | 问题卡、缺陷、调研、方法与归档索引的结构合同；被 verify 入口与 keyless 回归消费 |
| lib/direct-authorization-boundary.mjs | entry-chain-probe | 按授权范围执行、无需重复请批的词面判定；由探针与 keyless 回归消费 |
| lib/replay-scene.mjs | snapshot-replay-smoke | 场景声明消费者：roster/版本/来源形状/路径校验（缺件、串角色、垃圾锚点 fail-loud） |
| lib/replay-request.mjs | snapshot-replay-smoke | 组装请求面逐条比较：persona、header 全序列、三处 user/message 注入（定向归一化） |
| lib/port-reclaim.mjs | preset-smoke、release-smoke | 端口收割执行器（按端口杀 + 三轮验证释放；实测依据 = web 孙进程不在子进程组里） |
| lib/selftest-library.mjs | tests/library-fold.test.mjs、client-load-smoke（自测工作区种子） | 「研究配置」面板/library-fold 自测例库单一正本：12 形态条目（四字段/部分/空值/旧格式/混居/重名/空条目/杂项行/续行/缩进），两处共用防形态漂移 |
| lib/keyless-imports.mjs | tests/layering.test.mjs | 只读 import 检查（解析器 = typescript 纯函数；company keyless-imports@59551f2 移植）——调用表达式解析 + 本地 import 闭包图 |
| lib/gates-cases.mjs | gates-smoke（驱动）+ verify-gates.test（静态对账） | 门禁自测的注入案例表（纯 fs mutate；git add 由驱动壳统一执行） |
| lib/node-gate-core.mjs | run-gates/node-gate（驱动）+ node-gate.test | 兼容门面与 bundle 判据聚合（保留 `gateBundle` 与原有导出） |
| lib/node-gate-contracts.mjs | node-gate-run-gates、node-gate-delivery-gate | 交付日期合同、readiness 与 decisions 行解析 |
| lib/node-gate-session-gates.mjs | node-gate-core | HITL、present 与 §Decisions 会话门 |
| lib/node-gate-run-gates.mjs | node-gate-core | leads、版本与标题退化门 |
| lib/node-gate-delivery-gate.mjs | node-gate-core | 门A 交付完整性判据 |
| lib/schema-scan-core.mjs | run-gates/schema-scan（壳）+ schema-scan.test + node-gate-core | 节点 I/O 契约在场级断言判据核（交付日/研究类型/条件件豁免/断代定红——从 run-gates 下沉修 lib→入口层反向依赖） |
| lib/run-dashboard-core.mjs | run-dashboard（壳）+ run-dashboard.test + run-fold.test | M2 run 观察面纯管线：解析 → 场景 → 模型 → HTML 渲染（全 fail-soft；CLI/watch/写盘归壳） |
| lib/evidence-audit-core.mjs | run-gates/evidence-audit（驱动）+ evidence-audit.test | 证据溯源审计判据核心（readLog 注入同上） |
