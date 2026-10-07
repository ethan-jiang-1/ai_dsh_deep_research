# scripts/ · 职责索引

> 职责分组（2026-10-07 目录治理档 C）：六个子目录 + `lib/` 支撑库；每个盘上入口一行：类 / 证明什么 / 档位。命令与前置正本 = [guides/60 §2](../docs/guides/60-dev-loop.md)；子树纪律 = [AGENTS.md](AGENTS.md)；测试资产分层 = [tests/fixtures taxonomy](../tests/fixtures/README.md)。本索引不改脚本路径与命令。

## verify/（L0 结构门禁）

| 件 | 证明什么 | 档位 | 事实来源 |
|---|---|---|---|
| verify.mjs | 仓结构机械不变量（门禁聚合入口） | keyless | [evaluation §L0 台账](../docs/evaluation.md) |

根面（不分组的配置与指令件）：`doc-budgets.json`（常驻文档行数上限，被 doc-budgets 门禁消费，正本即自身）、`README.md`（本索引）、`AGENTS.md`（子树常设指令：新门禁流程、范围纪律、命名即层）。

## smoke/（分级冒烟）

| 件 | 证明什么 | 档位 |
|---|---|---|
| preset-smoke.mjs | L1 真挂载：roster、逐角色建会话、skills 隔离 | keyless（`DSH_SMOKE_REAL=1` 起真 DSH，无模型） |
| release-smoke.mjs | L2 安装形状：pack → 干净 profile → plugin add → 安装域冒烟 | keyless（`--install-only` 跳凭据） |
| client-load-smoke.mjs | 观察面真浏览器装配、页签与渐进面对账 | keyless（浏览器） |
| snapshot-replay-smoke.mjs | 四角色组装面回放 + Lead 渲染金标准 | keyless（RPC/解压子进程，无模型） |
| gates-smoke.mjs | 门禁自测：临时副本注入回归经真实 verify 入口点名报红 + 零注入对照组 | keyless（git/node 子进程，无模型） |
| client-hitl-smoke.mjs | 活标题触发与挂起显性化 | 真模型档 |
| l4-lite-smoke.mjs | 四角色真模型响应 + scout web_search 调用 | 真模型档 |
| team-preflight-smoke.mjs | spawn_teammate 组队与成员组合画像 | 真模型档 |

## probe/（探针）

| 件 | 证明什么 | 档位 |
|---|---|---|
| cdp-probe.mjs | 指定场景显示/点击/会话回复（裸 CDP） | 连已起 GUI；`--ask` 按会话档 |
| entry-chain-probe.mjs | 入口链时不变四问，软断言 + 留档人工复核 | 真模型档 |
| discipline-probe.mjs | 散文纪律行为面五场景标记断言（A2 超界 / B1 差集 / 收活缺件 / 收活 UNVERIFIED / 计划确认卡·quick_factual 免发互补对）+ 留档人工复核；`--scenario <id>` 定向跑 | 真模型档 |

## run-gates/（run bundle 机械门与审计）

| 件 | 证明什么 | 档位 |
|---|---|---|
| node-gate.mjs | 判据级：门①②③④L + 门R（标题重复退化，2026-10-06 起），报告落 bundle | keyless |
| schema-scan.mjs | 在场级：八节点输出件在场断言（断代定红） | keyless |
| evidence-audit.mjs | URL/摘录/final 链溯源对账 → audit.md | keyless（须 source dev/env.sh） |

## run-ops/（run 观察与运维）

| 件 | 证明什么 | 档位 |
|---|---|---|
| watch-run.mjs | 谓词化状态判定（HITL-PENDING / RUN-SETTLED 自报） | keyless |
| run-dashboard.mjs | 只读 HTML 投影：多 run 扫描 + 步骤条（fail-soft） | keyless |

## dist/（分发）

| 件 | 证明什么 | 档位 |
|---|---|---|
| export-dist.mjs | pack → `_dist/` 安装包与安装手册 | keyless |

## lib/（支撑库）

| 模块 | 被谁消费 | 说明 |
|---|---|---|
| lib/roles.mjs | 冒烟与门禁 | 角色清单访问器（事实源 = 盘上 presets/） |
| lib/session-log.mjs | run-state、watch-run、回归 | canonical 日志选择与读取（BUG-010） |
| lib/run-state.mjs | watch-run、仪表盘、回归 | run 操作面状态谓词 |
| lib/env.mjs | 冒烟族 | 子进程环境清洗（scrubbedEnv/withModelKey——凭据卫生） |
| lib/playwright.mjs | 浏览器冒烟 | Playwright 启停支撑 |
| lib/cdp-driver.mjs | cdp-probe | 裸 CDP 驱动 |
| lib/ask-drive.mjs | hitl-answer | 代答读窗与谓词 |
| lib/unconsumed-evidence.mjs | unconsumed-evidence.test / 收尾核验 | B1 机械基座：evidence/ 未进 findings.md 的差集投影（critic 差集出题的操作侧对账） |
| lib/acceptance-check.mjs | acceptance-check.test / 收尾核验 | 收活判据机械求值：PASS/FAIL/UNVERIFIED 三态（DeerFlow acceptance_criteria keyless 移植，判不了永不静默放行） |
| lib/hitl-provenance.mjs | hitl-answer | 代答 provenance 写盘（BUG-014 正修——代理模拟显式记账；BUG-017 题面富集） |
| lib/local-date.mjs | hitl-answer、export-dist | 人读日期行本地口径（与 bash date 同源；BUG-017 正修——UTC slice 凌晨窗口差一天） |
| lib/vendor-artifacts.mjs | boot 面护栏（五个入口共用） | vendor 构建产物自检 |
