# DSH 插件市场粗扫（market scout）
> 状态：implemented
> 归档：2026-09-27

<!-- grandfather: 调研报告形态（状态表），非 Note 骨架——内容有效不追改。原状态行：**已完成（粗扫）** · 2026-09-24 · 种子登记；落点 = 认真版 [dsh-plugin-ecosystem](../implemented/2026-09-25-dsh-plugin-ecosystem.md)（已毕业，登记在 [00-index](../../docs/00-index.md) §外部研究材料）。 -->



> 性质：**粗扫**（用户 steer 2026-09-24："提早的预言 + 粗糙找找，回头再认真琢磨"）。
> 认真研究 = 后续 research 条目（用户定节奏触发），本 Note 只做登记与种子。
> 扫描面：① 机制（vendor CLI 源码实证）；② vendor 存量能力目录差集；③ 第三方公开
> 生态（web 检索快照）。证据分级：vendor 源码 = 实证；web 结果 = 外部快照（未亲装）。

## 1. market 的机制真相（vendor 实证）

- `dsh plugin` = **pnpm 薄转发器**（`apps/cli/src/plugin.ts` 头注）：在 profile 目录跑
  pnpm，然后按"装到的包是否声明 `dsh.bundle`"对账层栈（reconcile by installed
  state）——**没有策展目录，market = npm registry + dsh.bundle 约定**；
- ⚠ 本会话沙箱挡 npm registry（对照测试：已知第三方包同样 query 失败）——
  **@deepseek-ai 官方系列是否公开发布，本粗扫无法判定**（D15"peers 声明语义、安装
  锚兜底解析"表明 vendor 工作区即可解析，是否另有 npm 发布待 P1 实测用真通道验）；
- 含义：能"订过来"的插件 = 任何遵循 dsh.bundle 约定的 npm 包；官方能力走 vendor
  工作区（我们现有模式）。

## 2. vendor 存量能力目录差集（本仓已采用 15 行 vs 货架 48+ 包组）

按 deep research 相关度分级（自述摘自各包组 README）：

**高相关（直接弹药候选）**：

| 包组 | 自述 | 对我们的意义 |
|---|---|---|
| `workflow`（非 experimental） | 模型编写的编排脚本，扇出 subagents | wave 编排的替代/互补通道（vs agent-team 任务板）——与 D3 定案的关系需认真琢磨 |
| `mcp` | 外接 MCP server，其工具以原生工具可调 | 研究工具扩展面：browser/fetch 渲染、学术搜索类 MCP——源头"JS 渲染页换渠道"痛点的可能解 |
| `session-query` | 会话检索/追踪/读取（live + durable）+ Web 会话日志导出 | 观察面（dashboard）与 Q2 验证的现成载体（vs 手解 zstd 日志） |
| `compaction` | 会话压缩/按需 compact/工具输出裁剪 | lead 长会话（证据堆积）的上下文预算刚需 |
| `webhook` | 已验证外部事件、编程规则、fire-and-forget 建 DSH 会话 | 外部触发研究动作（定时补搜、事件驱动） |

**中相关（特定场景）**：`e2b`（远程 Linux 沙箱跑文件/命令）、`code-runtime-python`
（CPython 子进程运行时——芯片 run 那类 TCO 计算表）、`jobs`（后台作业控制）、
`schedule`（会话内持久提醒）、**`experimental/agent-team-profile`（现成 team profile
层：Team-scoped 协作工具 + one-shot 委派——P1 run 通道的候选基础）**。

**低相关（维护/调试面）**：`inspector`（DevTools 检查）、`webworker-*`（预览运行时）、
`lsp`/`typert`/`code-runtime`（代码智能）等。

## 3. 第三方公开生态（web 检索快照 2026-09-24，未亲装）

生态已经相当活跃：

- **市场/管理器**：[dsh-plugin-market](https://github.com/NanmiCoder/dsh-plugin-market)
  （Web UI 里 discover/inspect/install/remove，宣称 verified）；
  [deepseek-harness-plugin-manager](https://github.com/hrhgit/deepseek-harness-plugin-manager)
  （Web 插件管理器：inspect/search/group/enable/disable）；
  [dsh-plugin-marketplace（Scorp1o117）](https://github.com/Scorp1o117/dsh-plugin-marketplace)
  与 npm 上的 [dsh-plugin-marketplace](https://www.npmjs.com/package/dsh-plugin-marketplace)；
- **策展清单**：[awesome-dsh-plugins（kejixiaoliang）](https://github.com/kejixiaoliang/awesome-dsh-plugins)
  ——宣称 **14 类 280+ 社区插件**（MCP / Skill / TUI / 多 Agent / 上下文记忆 / UI 皮肤）；
  [awesome-dsh-plugin（rob-x-ai）](https://github.com/rob-x-ai/awesome-dsh-plugin)；
- **其他**：[@dsh-tui/dsh-tui](https://www.npmjs.com/package/@dsh-tui/dsh-tui)（终端 UI）、
  [@openma/dsh-agents-plugins-bridge](https://www.npmjs.com/package/@openma/dsh-agents-plugins-bridge)。

## 4. 与当前计划的即时关联（只留钩子，不改 M2 范围）

- **P1（run 通道）**：agent-team-profile 是候选基础——落地时对照评估（自建 vs 复用）；
- **观察面**：session-query 可能是 dashboard 的正解底座——已挂进 m2-run-dashboard
  RFC 的开放问题；
- **搁置池 UI 皮肤**：第三方 UI 皮肤类已有一批——将来复活该条目时先逛市场再自建。

## 5. 认真琢磨的问题清单（后续 research 条目的种子，用户定节奏）

1. **workflow vs agent-team**：分工还是替代？（"不发明 + DSH 载体优先"纪律下，若
   workflow 更适合 wave 编排，应带证据修订 D3 与映射表，而不是固守）；
2. **mcp × 研究工具**：browser 渲染 / 学术搜索（arxiv、专利）/ fetch 增强，生态里
   有哪些能直接接上？
3. **compaction 进不进 bundle**：长 run 的上下文预算——M2 观察点之一；
4. **session-query 当审计/观察底座** vs 自解 zstd 日志（成本/稳定性对比）；
5. **市场逛法制度化**：市场/清单类工具装进 dev profile 浏览？何时引入（M2 后？）。

## 吸收落点

本 Note = 种子与登记（00-index §外部研究材料有行）；认真琢磨 = 后续 research 条目；
P1 落地时读 §2/§4。
