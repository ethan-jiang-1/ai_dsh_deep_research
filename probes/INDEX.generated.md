# 探针索引（生成物，勿手改）

> 生成器 = `probes/_index.mjs --write`；事实源 = 每支探针头注；本表只答「有哪些、在哪」。
> 指南 = [../docs/guides/66-probe-playbook.md](../docs/guides/66-probe-playbook.md)。

## behavior/（6 支）

| 探针 | 一句话 | 档位 | 何时跑 | 状态 |
|---|---|---|---|---|
| [defaults-probe.mjs](behavior/defaults-probe.mjs) | seeded 项目默认进入 HITL1 首推、auto 不冒充默认、三问不变、语言不冒充项目默认 | 真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集） | `research:defaults` context / `research-brief` / HITL1 合同改动；D50 回归 | 常驻 |
| [discipline-probe.mjs](behavior/discipline-probe.mjs) | 五场景纪律在真模型下按合同触发（A2/B1/收活两态/计划确认卡） | 真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集） | 纪律合同/persona/skill 文本改动；收活判据变更；snapshot 重录后 | 常驻 |
| [entry-chain-probe.mjs](behavior/entry-chain-probe.mjs) | 入口链三问（授权范围/RFC 条件/开发环路径）真模型可召回 | 真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集） | 改根/子树 AGENTS 或入口链；入口链导航合同变更；纯文档卫生轮 | 常驻 |
| [method-library-probe.mjs](behavior/method-library-probe.mjs) | Lead 能说出偏好库路径、当前条目数、点名条目缺席（BUG-042 判据 #4） | 真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集） | 偏好库播种/手册指路/面板文案改动；BUG-042 回归 | 常驻 |
| [rerun-triage-probe.mjs](behavior/rerun-triage-probe.mjs) | 给一句「太浅」，Lead 按五条转接纪律回话 | 真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集） | rerun-triage skill/HITL2 文案/终稿页脚改动；2026-10-23 卡回归 | 常驻 |
| [wave-execution-probe.mjs](behavior/wave-execution-probe.mjs) | analyst 执行器在真模型下按固定 lens-fanout 配方跑通一个 cell，留下八字段证据卡 + waves 报告 | 真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集） | wave-execution skill / content/waves/lens-fanout.js / analyst workflow 挂载 / plan Wave 契约改动；snapshot 重录后 | 常驻 |

## browser/（1 支）

| 探针 | 一句话 | 档位 | 何时跑 | 状态 |
|---|---|---|---|---|
| [cdp-probe.mjs](browser/cdp-probe.mjs) | 驾驶舱显示/点击/会话回复在真实浏览器成立（--ask 以日志落盘为判据） | 连已起 GUI（--ask 按会话档） | 改驾驶舱渲染/交互/页签；run-driver 浏览器判据；BUG-021 回归 | 常驻 |

## run/（11 支）

| 探针 | 一句话 | 档位 | 何时跑 | 状态 |
|---|---|---|---|---|
| [bundle-sessions.mjs](run/bundle-sessions.mjs) | bundle → 见证会话反查 + 状态摘要 + 下一步命令 | keyless（须先 source；默认只扫 research-workspace 组） | 诊断第一步：bundle 不记会话 id，需要拿会话 id | 常驻 |
| [plan-card-stats.mjs](run/plan-card-stats.mjs) | 计划确认卡字数的跨场分布投影（升硬门前置的可复跑仪器） | keyless（须先 source dev/env.sh） | 评估「连续多场 ≤200 字」是否达标 | 常驻 |
| [provider-error-stats.mjs](run/provider-error-stats.mjs) | 上游流错误（回合被终结）的跨场分布投影 | keyless（须先 source dev/env.sh） | BUG-022 类复发时数它；需要跨场而非单场分布 | 常驻 |
| [run-dashboard.mjs](run/run-dashboard.mjs) | M2 run 只读 HTML 投影（步骤条 / HITL 等待横幅 / 归档标注；多场扫描） | keyless（只读 bundle 与会话日志；写抛弃型 HTML） | 要看 run 进度或多场对比；给用户看现场 | 常驻 |
| [run-inventory.mjs](run/run-inventory.mjs) | run bundle 只读保留期视图（数量 / 大小 / 最老日期；不删任何东西） | keyless（纯读盘） | 清理运行区前先看有几场、多大；保留期评估 | 常驻 |
| [scene-capture.mjs](run/scene-capture.mjs) | 场景包捕获/读取：截图 + DOM + 正文 + console + meta（token 脱敏） | 抓取 keyless（真实浏览器，须起通道）；读取 keyless（纯读盘） | 看见「当时页面」；事后看现场（--list / --show） | 常驻 |
| [session-events.mjs](run/session-events.mjs) | 会话事件尾部：按 id/标题看「刚才发生了什么」（tool/call、turn/end 摘要） | keyless（读会话日志） | agent 需要会话时间线；诊断第一步（除会话 id 之外的事实） | 常驻 |
| [session-replay.mjs](run/session-replay.mjs) | 任意历史会话在真实 UI 重开并抓场景包（现在的客户端 + 当年的数据） | keyless（真实浏览器；须先 source） | 复看历史会话当时/现在的页面；症状还原 | 常驻 |
| [stream-diagnostics.mjs](run/stream-diagnostics.mjs) | 流失败归因诊断：模型尝试时间线 / 失败密度 / provider 与重试策略实名 | keyless（读会话日志） | 回合被流错误终结、重试风暴、上游错误归因 | 常驻 |
| [unconsumed-evidence.mjs](run/unconsumed-evidence.mjs) | bundle 的 evidence/ 未进 findings.md 的差集投影（收尾核验入口） | keyless（纯读盘） | 收活前核验证据是否被消费 | 常驻 |
| [watch-run.mjs](run/watch-run.mjs) | run 盯场：谓词化状态判定（HITL-PENDING / RUN-SETTLED；超时自报） | keyless（只读会话日志；先 source dev/env.sh 更稳） | run 挂起/等 HITL/落定不明；要盯某会话状态时 | 常驻 |

## stream/（1 支）

| 探针 | 一句话 | 档位 | 何时跑 | 状态 |
|---|---|---|---|---|
| [llm-stream-tee.cjs](stream/llm-stream-tee.cjs) | LLM 流异常时留下可离线复判的原始字节/响应头四件套 | 活进程仪器（NODE_OPTIONS 预载；keyless） | 流异常第一动作（MALFORMED/断流/重试风暴）；BUG-022/023/024 复盘 | 常驻 |
