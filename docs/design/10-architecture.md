# 10 · 架构：repo 形态、组合层与通道选型

> 层：设计（为什么）。工程范式照搬 `ai_dsh_company`（解剖报告见
> [notes/research/2026-09-24-dsh-plugin-repo-anatomy.md](../../notes/research/2026-09-24-dsh-plugin-repo-anatomy.md)）；
> DSH 机制的权威在 vendor 树（钉住 tag `dsh-v0.1.5-rc.2`；本仓暂无 submodule——D10 偏离，
> 机制核对暂用 `/Users/bowhead/ai_dsh_company/vendor/dsh` 同 tag 只读树，偏离登记见 AGENTS.md）。

## 1. repo 形态

独立 repo + 单自写包 + 运行时工作区：

```
packages/deep-research-pack/   唯一自写包：presets/<role>/ + cordis.patch.yml（纯配置，零 JS）
research-workspace/            运行场：角色会话 cwd（研究手册 + runs/ + templates/）
docs/ notes/ scripts/ tests/ dev/   文档/决策/门禁/回归/环境（分层原则见 00-index）
vendor/dsh/                    （队列「vendor-submodule-and-pnpm-dsh」落地）pinned submodule，只读铁律
```

**为什么单包多角色**（company D1 同构）：DSH 的 preset 是自包含组合，角色差异天然住在
`presets/<id>/`；包是发布与安装的单位，角色不是。"行多包少"——bundle 行 + preset 目录
都长在一个包里，`plugin add` 一次全装。

## 2. 两层组合面

| 层 | 载体 | 放什么 | 教义 |
|---|---|---|---|
| bundle 层 | `cordis.patch.yml` | host 共享行：preset roster（default: lead）、present、ui-agent-team 观察行（团队机制行归 vendor agent-team-profile 层——A 定案，RFC m2-p1-run-channel；web 行不进 bundle——D9：base 出厂行，回归守卫在 tests/presets.test.mjs） | `- id:` 只替换已有行；**新增必须 `- insert:`**；baseUrl = profile 目录（路径写 profile 相对 `node_modules/…`，写错 = ENOENT 静默空，UI 无角色） |
| preset 层 | `presets/<role>/agent.cordis.yml` | 角色组合：persona + 硬隔离 skills + 工具面 + agent-instructions | **preset 自包含**（DSH 无 patch 继承）：角色要用的行必须自己声明，否则会话只拿到 bundle 少数行（company R1 血泪：工具行不声明 = CEO 读不了文件） |

`tool-todo` 行若显式声明，`allowParallelInProgress` 是**必填 config**（抄行不抄 config =
挂载时炸且 UI 吞错——company R1 实证，四角色 preset 已全部带上）。

## 3. 协作通道（用户定案：多角色 + agent team）

| 通道 | 载体 | 用途 | 边界依据 |
|---|---|---|---|
| **Agent Teams（主通道）** | `agent-team` + `tool-agent-team`（vendor **agent-team-profile 层**行：profile 装 `@…-agent-team-profile@0.1.5-rc.2`，带实战 config + company D18 机械禁令——control / list-agents 禁用、subagent 强制 one-shot；A 定案） | 持续对话、任务板、多轮往返：scout 汇报 → analyst 接力 → critic 审查 → analyst 补证 | 续驶语义归 team：team-scoped 会话里 continuable child 不可达（company D18 实证）——层把边界从纪律文本升级为组合层禁令 |
| subagent（工人） | `tool-subagent`（preset 行，**one-shot**——company D18 对齐：层强制 one-shot 但实测 preset 行覆盖 profile 行，preset 须同声明；RFC m2-p1-run-channel） | 单点快捷查证、并行铺方向/深挖 | 前台拿结果；连续对话不归它 |
| present（交付） | `tool-present`（bundle + lead preset） | 成品声明：final.md 是唯一成品 | 非 lead 的 present = 过程稿展示（研究手册三态） |

## 4. 工具面（四角色共同基座 + 差异）

- **共同基座**：tool-fs / tool-fs-search / tool-skill / tool-todo / **tool-web**（模型面行随
  preset，行 config 照抄 base：`fetch: true` + `searchTimeoutMs: 60000`）；web 的 providers
  （`web` seam / `web-search-deepseek` / `web-fetch-http`）是 dsh-base 的 **host 面出厂行**、
  不随 preset 也不进本包 bundle——实证依据 vendor base bundle `packages/bundle/base/cordis.patch.yml`
  436–454 行 + web-app surface 对 `tool-web` 的 preset-scoping 注释；DeepSeek 搜索 provider
  的 `apiKeyEnv: DEEPSEEK_API_KEY` 与 chat 同一把钥匙（无需独立搜索 key）；
- **lead 独有**：tool-ask-user（HITL 两点交互的唯一持有人）+ tool-present（成品声明权）；
- **lead/scout/analyst**：tool-subagent（工人）；
- **critic 刻意无**：ask-user（静默审查）、subagent（聚焦独行）——工具面即职责边界的机器表达。

## 5. 环境与验证

- `dev/env.sh`：DSH_HOME 重定向到 `dev/harness-home`（数据面隔离）+ 裸 dsh 拦截（代码面
  隔离——全局安装随升级漂移，不作机制依据）；
- 验证五面见 [evaluation.md](../evaluation.md)；preset 类改动的完成定义 = preset-smoke 真挂载。

## 6. 偏离登记（默认严格 DSH/company 纪律，偏离须 D 号 + 约束证据）

簿记正本 = [AGENTS.md §偏离登记簿](../../AGENTS.md)——一处事实一个家，本节不复制表（防双家漂移）。
当前登记两条：D10（vendor submodule 延后，机制核对暂借 company 同 tag 树只读）与伴随的
node:test/regex 断言选择；均随队列「vendor-submodule-and-pnpm-dsh」销账或重估。
