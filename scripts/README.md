# scripts/ · 职责索引

> 每个盘上入口一行：类 / 证明什么 / 档位 / 事实来源。命令与前置正本 = [guides/60 §2](../docs/guides/60-dev-loop.md)；子树纪律 = [AGENTS.md](AGENTS.md)；测试资产分层 = [tests/fixtures taxonomy](../tests/fixtures/README.md)。本索引不改脚本路径与命令。

## 门禁（L0 聚合）

| 件 | 证明什么 | 档位 | 事实来源 |
|---|---|---|---|
| verify.mjs | 仓结构机械不变量（门禁聚合入口） | keyless | [evaluation §L0 台账](../docs/evaluation.md) |
| doc-budgets.json | 常驻文档行数上限（配置，被 doc-budgets 门禁消费） | — | 本文件即正本 |

## 分级冒烟

| 件 | 证明什么 | 档位 |
|---|---|---|
| preset-smoke.mjs | L1 真挂载：roster、逐角色建会话、skills 隔离 | keyless（`DSH_SMOKE_REAL=1` 起真 DSH，无模型） |
| release-smoke.mjs | L2 安装形状：pack → 干净 profile → plugin add → 安装域冒烟 | keyless（`--install-only` 跳凭据） |
| client-load-smoke.mjs | 观察面真浏览器装配、页签与渐进面对账 | keyless（浏览器） |
| snapshot-replay-smoke.mjs | 四角色组装面回放 + Lead 渲染金标准 | keyless（RPC/解压子进程，无模型） |
| client-hitl-smoke.mjs | 活标题触发与挂起显性化 | 真模型档 |
| l4-lite-smoke.mjs | 四角色真模型响应 + scout web_search 调用 | 真模型档 |
| team-preflight-smoke.mjs | spawn_teammate 组队与成员组合画像 | 真模型档 |

## 探针

| 件 | 证明什么 | 档位 |
|---|---|---|
| cdp-probe.mjs | 指定场景显示/点击/会话回复（裸 CDP） | 连已起 GUI；`--ask` 按会话档 |
| entry-chain-probe.mjs | 入口链时不变四问，软断言 + 留档人工复核 | 真模型档 |

## run 机械门与审计

| 件 | 证明什么 | 档位 |
|---|---|---|
| node-gate.mjs | 判据级：交付两门②③ + 门L + 门④，报告落 bundle | keyless |
| schema-scan.mjs | 在场级：八节点输出件在场断言（断代定红） | keyless |
| evidence-audit.mjs | URL/摘录/final 链溯源对账 → audit.md | keyless（须 source dev/env.sh） |

## run 观察与运维

| 件 | 证明什么 | 档位 |
|---|---|---|
| watch-run.mjs | 谓词化状态判定（HITL-PENDING / RUN-SETTLED 自报） | keyless |
| run-dashboard.mjs | 只读 HTML 投影：多 run 扫描 + 步骤条（fail-soft） | keyless |

## 分发

| 件 | 证明什么 | 档位 |
|---|---|---|
| export-dist.mjs | pack → `_dist/` 安装包与安装手册 | keyless |

## 支撑库（lib/）

| 模块 | 被谁消费 | 说明 |
|---|---|---|
| lib/roles.mjs | 冒烟与门禁 | 角色清单访问器（事实源 = 盘上 presets/） |
| lib/session-log.mjs | run-state、watch-run、回归 | canonical 日志选择与读取（BUG-010） |
| lib/run-state.mjs | watch-run、仪表盘、回归 | run 操作面状态谓词 |
| lib/env.mjs | 冒烟族 | 双 home 环境判定 |
| lib/playwright.mjs | 浏览器冒烟 | Playwright 启停支撑 |
| lib/cdp-driver.mjs | cdp-probe | 裸 CDP 驱动 |
| lib/ask-drive.mjs | hitl-answer | 代答读窗与谓词 |
| lib/hitl-provenance.mjs | hitl-answer | 代答 provenance 写盘（BUG-014 正修——代理模拟显式记账） |
| lib/vendor-artifacts.mjs | boot 面护栏（五个入口共用） | vendor 构建产物自检 |

## 指令件

- `AGENTS.md` = 本子树常设指令（新门禁流程、范围纪律、命名即层）。
