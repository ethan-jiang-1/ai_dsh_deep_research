# ai_dsh_deep_research

DSH 插件项目：**Deep Research 多角色研究团队**——一个包（`packages/deep-research-pack`）提供四个研究角色 preset（`Deep Research Lead / Scout / Analyst / Critic`），协作走 DSH 现成 Agent Team 通道。

设计来源：方法论内核出自 codex 下的 Deep Research harness 考古（`notes/research/2026-09-24-deep-research-harness-analysis.md`），插件工程范式照搬 `ai_dsh_company`（`notes/research/2026-09-24-dsh-plugin-repo-anatomy.md`）。

## Start Here

1. 本仓入口链：[`AGENTS.md`](AGENTS.md)（布局 + 命令表 + 纪律）
2. **接下来做什么**：[`roadmap.md`](roadmap.md) §队列 ▶（全仓唯一"当前"指针）
3. **验收怎么判**：[`docs/evaluation.md`](docs/evaluation.md)（五个评估面——先于框架定案的验收合同）
4. 地图与决策台账：[`docs/00-index.md`](docs/00-index.md)
5. 方法论映射（codex 内核 → DSH 载体）：[`docs/design/30-methodology-mapping.md`](docs/design/30-methodology-mapping.md)

## Directory Map

| Directory | What it is |
|-----------|------------|
| `packages/deep-research-pack/` | 唯一自写包：四角色 presets + bundle 行（cordis.patch.yml） |
| `research-workspace/` | 运行时研究工作区（角色会话 cwd）：runs/ + templates/ + 研究手册 |
| `docs/` | 按性质分层：00-index（导航+台账）→ roadmap.md（队列）→ design/ → guides/ + 顶层合同 |
| `notes/` | 按时间分层：intents → proposed/（RFC）→ implemented/ + research/（考古报告） |
| `scripts/` | 门禁与分层冒烟脚本（verify / preset-smoke / release-smoke / l4-lite-smoke；档位说明见 AGENTS.md §命令表） |
| `tests/` | keyless 回归（node:test，零依赖） |
| `dev/` | boot-run.sh（run 通道开跑命令）、env.sh（双 home + dsh 机制基线）、research.overlay.yml（源码域 overlay）、gitignored 运行区（harness-home/、smoke-workspace/） |

## Commands

```sh
node scripts/verify.mjs          # L0 结构门禁（keyless，收尾必跑）
node --test tests/*.test.mjs     # L0 keyless 回归（也可 pnpm test）
```

全档命令表（env.sh 双 home、L1 preset-smoke keyless 双通道、L2 release-smoke、L4-lite 真模型档）
= [AGENTS.md](AGENTS.md) §命令表（唯一正本，此处不复制）。

## Rules In One Screen

- 纯配置 pack（零自写 JS，见 00-index D7）；Node >= 20；测试用 `node:test` + `node:assert`，零 npm 依赖。
- 评估五面（L0 结构 / L1 挂载 / L2 安装 / L3 领域 / L4 交付）不互抵，定义见 `docs/evaluation.md`。
- 不发明：优先用 DSH 现成载体（preset/skill/agent-team/todo/present/goal），自建机制须有“DSH 载体不可用”的证据。
- 迭代单位 = 垂直轮（最薄全路径 → 逐轮加宽），当前进度看 `roadmap.md` §队列。
