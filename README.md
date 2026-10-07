# ai_dsh_deep_research

DSH 插件项目：**Deep Research 多角色研究团队**——一个包（`packages/deep-research-pack`）提供四个研究角色 preset（`Deep Research Lead / Scout / Analyst / Critic`），协作走 DSH 现成 Agent Team 通道。

设计来源：方法论内核出自 codex 下的 Deep Research harness 考古（[考古报告](notes/implemented/2026-09-24-deep-research-harness-analysis.md)），插件工程范式照搬 `ai_dsh_company`（[解剖报告](notes/implemented/2026-09-24-dsh-plugin-repo-anatomy.md)）。

## Start Here

- 开工入口链（唯一正本，5 步）= [`AGENTS.md`](AGENTS.md) §入口链——依次读什么、接下来做什么、怎么验收、怎么开工收尾，全在那节。
- 人类速览"现在干什么"：[`_backlog/queue.md`](_backlog/queue.md) §队列 ▶（全仓唯一"当前"指针）。
- **跑一次研究**：`bash dev/boot-run.sh` → 浏览器打开横幅 URL（工作区注册/发问题/HITL/交付/恢复全程序 = [`docs/guides/61-run-playbook.md`](docs/guides/61-run-playbook.md)）。
- **改完怎么验**：选层地图 = [`docs/project-map.md`](docs/project-map.md) §测试怎么选（命令正本 = [`docs/guides/60-dev-loop.md`](docs/guides/60-dev-loop.md) §2，判据 = `docs/evaluation.md`）。
- 想**用它**（跑一次研究 / 装到自己的 DSH）而不是改它：意图分流表 = [`docs/00-index.md`](docs/00-index.md) §先分流（每种说法的第一条命令）。
- 想**看懂**项目怎么运转、怎么调试、状态放哪：[`docs/project-map.md`](docs/project-map.md)（任务入口矩阵 + 失败定位）与 [`docs/design/50-agent-loop-and-state.md`](docs/design/50-agent-loop-and-state.md)（Agent Loop 与四类状态合同）。

## Commands

命令表正本 = [`docs/guides/60-dev-loop.md`](docs/guides/60-dev-loop.md) §2（L0/L1/L2/真模型档/run 通道全档，含 `source dev/env.sh` 前置说明）；[`AGENTS.md`](AGENTS.md) 只留速查与指针——本文件不复制。

## 研发宪章（2026-09-27 用户定调）

1. **循 DSH 而不发明**：机制权威 = `vendor/dsh`（钉 tag），纪律全表 = `docs/discipline-map.md`（逐源三态）；优先用 DSH 现成载体，自建机制须有"载体不可用"证据。
2. **自主优先，借鉴成熟**：问题先探成熟 DSH 插件的解法（采纳度 = 下载量 / 影响力为信号；参考仓 `ai_dsh_company`），能自主解决的静默解决、不外抛。
3. **审阅分层**：机械门禁 / 溯源审计 / 判据探针 / 对抗自审（critic 式）全部自主做；只有不可代理的判断（真人体验、方向取舍）才在阶段边界请人——不设额外打断点。

## Rules In One Screen

- 配置为主的 pack（预设/技能/bundle 行）+ 一个观察面 client 面（D18 单点例外）；Node `^22.19.0 || >=24.0.0`（`engines`，与 vendor 对齐）；测试用 `node:test` + `node:assert`（无测试框架）。
- 评估五面（L0 结构 / L1 挂载 / L2 安装 / L3 领域 / L4 交付）不互抵，定义见 `docs/evaluation.md`。
- 迭代单位 = 垂直轮（最薄全路径 → 逐轮加宽），当前进度看 `_backlog/queue.md` §队列。
