# 架构：repo 形态、组合层与通道选型

> 层：顶层总架构（为什么这样分层与组合）。工程范式照搬 `ai_dsh_company`（解剖报告见 [dsh-plugin-repo-anatomy](../notes/archived/2026-09-24-dsh-plugin-repo-anatomy.md)）；DSH 机制的权威在本仓 `vendor/dsh/` pinned submodule（tag 与钉 commit 正本 = [AGENTS.md](../AGENTS.md) + `.gitmodules`；只读铁律由 `vendor-pin`/`vendor-clean` 把守，[D10](./decisions.md#d10)）。
> 读完去哪：角色契约 = [contracts/roles.md](./contracts/roles.md)；运行状态 = [contracts/data-model.md](./contracts/data-model.md)；研究驾驶舱 = [contracts/client-ui.md](./contracts/client-ui.md)。

## 1. repo 形态

独立 repo + 单自写包 + 运行时工作区：

```text
packages/deep-research-pack/   唯一自写包：presets/<role>/ + cordis.patch.yml + content/（手册与 run 模板，D40）
                               + src/startup/（启动行）+ 研究驾驶舱（src/client/ + lib/client.js，D18，正本 = docs/contracts/client-ui.md）
                               + 抓取回退 provider（src/fetch-fallback/ + lib/fetch-fallback.js，D31）
research-workspace/            dev 工作区实例：角色会话 cwd（drt_<slug>/ + method-library.md + 可选 research-defaults.json）；
                               用户工作区 = 任意目录（首屏选择 / DEEP_RESEARCH_WORKSPACE）
docs/ notes/ checks/ tests/ probes/ tools/   文档/决策/门禁/回归/探针/运维（分层原则见 docs/README.md 与 docs/policy.md）
vendor/dsh/                    pinned submodule（只读铁律；tag 与钉 commit 正本 = AGENTS.md；pnpm dsh 从此起）
```

### 第一性分层：harness / run bundle（D17）

**`研究报告 = harness(bundle)`**——全仓最高分层不变量：

- **harness（框架）= 只读函数**：`packages/deep-research-pack/**`（preset + skills + bundle 行 + `content/` 只读手册与模板，由 `src/content` 注入）与 `docs/`、`notes/`。对任何一次研究是同一份，不持 per-run 状态，run 期间零写入；演进只走开发环，由 run 复盘证据驱动。
- **run bundle = 一次调研的全部变量**：`<workspace>/drt_<slug>/`（dev 实例 = `research-workspace/drt_<slug>/`；drt = Deep Research Topic）——包含 `question.md`（定稿 / HITL1 快照 / `## Decisions` append-only）、`topics`、`leads`、`evidence`、`findings`、`review`、`drafts`、`final/`（版本化交付）与 `journal.md`。恢复本次研究所需即 bundle 变量；交付后 bundle 冻结为只读证据。
- **rerun 三分语义**（源头 DEEP_RESEARCH_HARNESS post-final-recovery 对齐）：表述性微调在当前版原位更新（版本号不变）；证据扩张落同 bundle `final/` 下一版；结构性另起建新 bundle（sibling 预检 + 用户同意）。不搬 CLI 状态引擎与 per-bundle `BUNDLE_MAP`。
- **消歧**：DSH 语境"bundle 行"（`cordis.patch.yml` 配置行）≠ run bundle（研究实例容器）——后者两词连用，禁缩写成裸 "bundle"。

**为什么单包多角色**（company D1 同构）：DSH 的 preset 是自包含组合，角色差异住在 `presets/<id>/`；包是发布与安装单位，角色不是。"行多包少"——bundle 行与 preset 目录都在一个包里，`plugin add` 一次全装。

## 2. 两层组合面

| 层 | 载体 | 放什么 | 教义 |
|---|---|---|---|
| bundle 层 | `cordis.patch.yml` | host 共享行：preset roster（`default: lead`）、检索底座（[D30](./decisions.md#d30)/[D31](./decisions.md#d31)）、present；团队层与 `ui-agent-team` 归 vendor `agent-team-profile`（[Note](../notes/implemented/2026-09-24-m2-p1-run-channel.md)）；provider 行归 base 出厂行（[D9](./decisions.md#d9)，守卫 = [presets.spec.mjs](../tests/pack/scripts/presets.spec.mjs)） | `- id:` 只替换已有行；**新增必须 `- insert:`**；`baseUrl` = profile 目录，路径写错会 ENOENT 静默空 |
| preset 层 | `presets/<role>.patch.yml`（单行 `@deepseek-ai/dsh-agent-preset`，`config.plugins` 内声明子插件；`presets/<role>/` 只放 `skills/`） | 角色组合：persona + 时钟（`time-context`）+ 硬隔离 skills + 工具面 + `agent-instructions` | **preset 自包含**（DSH 无 patch 继承）：角色要用的行必须自己声明 |

`tool-todo` 行若显式声明，`allowParallelInProgress` 是**必填 config**（漏抄会导致挂载炸且 UI 吞错，四研究角色 preset 已全部带上）。

## 3. 协作通道（多角色 + Agent Teams）

| 通道 | 载体 | 用途 | 边界依据 |
|---|---|---|---|
| **Agent Teams（主通道）** | `agent-team` + `tool-agent-team`（vendor `agent-team-profile` 层，禁用全局 `control` / `list-agents`；[m2-p1-run-channel](../notes/implemented/2026-09-24-m2-p1-run-channel.md)） | 持续对话、任务板、多轮往返：scout 汇报 → analyst 接力 → critic 审查 → analyst 补证 | 续驶语义归 team；subagent 工具仍在但 provider 可续但 Team 控制面不可达，实际 one-shot（合同见 `team-assembly`） |
| subagent（工人） | `tool-subagent`（`maxDepth: 2`、`allowedAgentPresets: [scout, analyst, critic, research-worker, research-wave]`、默认 `research-worker`，[D47](./decisions.md#d47)） | 单点快捷查证、并行铺方向/深挖；role work 显式指定 `agent_preset`；wave 显式用 `research-wave` | 每次 delegation 是一次 activation；worker 工具表可见 Team 工具但调不通（vendor known limitation），派工方须显式禁用 |
| present（交付） | `tool-present`（bundle + lead preset） | 成品声明：`final.md` / `final/vN` 是唯一成品 | 非 lead 的 present 仅作过程稿展示 |

- **根角色身份（BUG-071）**：`tool-agent-team` 在 profile 级启用，vendor 无 per-preset 开关，所有根会话都会看到 `team:identity` 与 Team 工具。三个非 lead 角色的 persona 明确禁止调用 `spawn_teammate` / `team_task_*` / `wait_agent`。
- **worker profiles（[D47](./decisions.md#d47)）**：`workers/research-worker.patch.yml`（叶子：fs/fs-search/skill/todo/web）与 `workers/research-wave.patch.yml`（叶子 + workflow engine/tool）。两者是非研究角色，不计入 `presets/` 角色清单。
- **团队层版本派生**：profile 安装 `@deepseek-ai/dsh-agent-team-profile@<运行中的 DSH 版本>`——安装侧取 DSH 安装锚版本，dev 通道 `tools/channel/boot-run.sh` 从运行中 `dsh --version` 派生，严禁用 `engines.dsh` 范围替代 exact 版本。

## 4. 工具面（四研究角色共同基座 + 差异；方法编辑见 D37）

- **共同基座**：`tool-fs` / `tool-fs-search` / `tool-skill` / `tool-todo` / **`tool-web`**（模型面行随 preset，`fetch: true`、`searchTimeoutMs`、`fetchTimeoutMs: 45000` 为抓取两腿兜底，正本见 preset 源与 [D9](./decisions.md#d9)）。
- **检索底座与 provider 选择**：web providers 归 dsh-base 的 host 面出厂行，不进本包 bundle；bundle 的 `- id: web` 替换行固定搜索为 `deepseek-search-api`、抓取为本包回退 provider `deepseek-fallback-fetch`（先本地 http，取不到再走 Fetch API，[D30](./decisions.md#d30) / [D31](./decisions.md#d31)）。Search/Fetch API 与 chat 共用 `DEEPSEEK_API_KEY`。
- **lead 独有**：`tool-ask-user`（HITL 两点交互唯一持有人）+ `tool-present`（成品声明权）。
- **lead / scout / analyst**：`tool-subagent`（`maxDepth: 2` + `allowedAgentPresets` 见 §3）。
- **critic 刻意无**（root critic preset）：无 `ask-user` 与 `subagent`——这是 root preset 的机器边界；teammate 会话继承 Lead 组合，角色边界靠派发合同与人工验收，HITL 仍仅由 Lead 发起。

## 5. 环境与验证

- **隔离与机制基线**：`tools/env.sh` 将 `DSH_HOME` 重定向到 `runtime/harness-home`（数据面隔离）并拦截裸 `dsh`（代码面隔离）；机制基线始终是本仓 `vendor/dsh/`，首次准备见 [guides/bootstrap.md](./guides/bootstrap.md)。
- **验证宪法**：五面合同与测试策略见 [testing.md](./testing.md)；preset 类改动的完成定义 = `preset.e2e` 真挂载。

## 6. 偏离登记（默认严格 DSH 纪律，偏离须 D 号 + 约束证据）

簿记正本 = [decisions.md](./decisions.md) D 号台账（当前偏离 = [D26](./decisions.md#d26)）——本节不复制表。当前约束与偏离的合同句（路由 = [D56](./decisions.md#d56)）：

- **Team 默认通道 = 部署层预授权**：vendor 官方 POLICY 是 opt-in（`packages/experimental/tool-agent-team/src/index.ts`）；本产品即该显式要求的物化，preset 钉默认通道（[D3](./decisions.md#d3)）。
- **对外交付零外部依赖**：pack 采纳面不得引入用户侧外部账号 / API key / 付费订阅；mcp-client 通道选本地 Playwright MCP 而非需账号的远程抓取服务（[D22](./decisions.md#d22)）。
