---
topic: 编排对齐 · Phase 2 keyless 组合原型证据
intent: 证明薄 worker preset、角色 skill 挂载、agentPreset 默认值在真实组合里能成立；不改生产面，产物只住 _backlog。
---

# Phase 2 · keyless 组合原型证据

> 原型 overlay = [prototypes/worker.overlay.yml](prototypes/worker.overlay.yml)；
> 探针 = [prototypes/probe-composition.mjs](prototypes/probe-composition.mjs)；
> 原始输出 = [evidence/composition-scan.json](evidence/composition-scan.json)。
> 只读 `dev/research.overlay.yml` 与 vendor；临时组合/会话/证据全部写进 `_backlog/`。
> 本阶段**不调用模型**：证明的是“能挂、技能目录可见、默认解析正确”，不证明模型行为。

## 1. 原型形状

两个**非研究角色**的 worker profile（`order` 20/21，不进四角色 roster）：

| preset | 工具面 | 用途 |
|---|---|---|
| `research-worker` | fs / fs-search / skill / todo / web / agent-instructions；**无** ask/goal/present/team/spawn/subagent/workflow | 一次性取证、写卡、检索；省略 `agent_preset` 时的安全默认候选 |
| `research-wave` | 同上 + workflow engine/tool（`maxConcurrentAgents: 4`、`maxTotalAgents: 8`、无后台） | 同质 wave executor；child 继承此薄组合 |

两个 preset 的 `skill-filesystem.customSkillDirs` 都列了
`presets/analyst/skills` + `presets/critic/skills`；`includeDefaultRoots: false`。

## 2. 结果（全部 PASS）

| 检查 | 结果 |
|---|---|
| roster 含 `research-worker` / `research-wave`，无 `broken` | PASS |
| `session/create` 两个 preset 真挂上，返回 `agentPreset` 正确 | PASS |
| `research-worker` 的 `skills/list` 含 `evidence-extraction` / `adversarial-review` | PASS |
| `research-wave` 同上 | PASS |
| 两者都**看不见** lead 的 `team-assembly`（角色隔离仍在） | PASS |
| `critic` 控制组仍只看见自己的 `adversarial-review` / `claim-verdict` | PASS |
| 端口 3105 回收 | PASS |

`skills/list` 实际目录（worker/wave 相同）：
`adversarial-review`、`claim-verdict`、`evidence-extraction`、`wave-execution`。
这说明 **G5 的“角色 skill 不在 teammate 技能目录”有原生修法**：把角色 skill 目录加进
`customSkillDirs` 后，teammate/worker 继承的是**技能目录**，不需要 raw `read` 绝对路径。

## 3. 角色技能长度 vs 8192 裁剪

| skill | 字符数 | 结论 |
|---|---:|---|
| `evidence-extraction` | 2518 | 远低于 8192 |
| `wave-execution` | 3926 | 低于 8192 |
| `adversarial-review` | 5019 | 低于 8192 |
| `claim-verdict` | 1341 | 远低于 8192 |
| `lead-mapping` | 3933 | 低于 8192 |

base 的 `tool-result-pruner` 阈值是 8192（head 4096 / tail 1024）；当前角色技能全部低于
阈值，**skill 载体可行**。若未来技能变长，raw read 仍是兜底；但当前没有“必须 raw read”
的长度理由。

## 4. `agentPreset` 默认值机制

只读 vendor 源码的 keyless 检查（[prototypes/check-preset-default.mjs](prototypes/check-preset-default.mjs)）：

- 配 `agentPreset: research-worker` + allowlist → `resolve({}) = research-worker`，
  模型可见措辞变成 `Omit to use research-worker.`；
- 不配默认 → `resolve({}) = undefined`，模型可见措辞仍是
  `Omit to inherit the parent agent's current preset.`；
- 显式 `agent_preset: critic` 正常解析。

结论：**G3 的默认值修复是组合层可做的**，不需要模型自觉；但“默认选谁”是产品取舍
（worker 还是某个角色），且会让省略的语义从“Lead 克隆”变成“worker”。

## 5. 仍然未知 / 留给 Phase 3

- `session/create` 只证 mount；**实际工具面**要读第一次 `request/header.tools`，才能确认
  薄 worker 是否仍被 host 层注入 `present`（critic child 已见 `present` 先例）。
- workflow child 继承 executor 组合是 DSH 机制事实（`workflow-ptc/src/host.ts` 的 parent =
  run.parent），但“child 实际看到哪些工具”仍需一次真模型 workflow 请求。
- 第六个 preset 会出现在用户选择器（DSH 无 hidden 标志）；产品是否接受，Phase 4 决策。
- 角色技能挂载后，模型是否真的用 `skill` 而不是 raw read，仍需行为探针。

## 6. 对 issue 形状的含义

1. **薄 worker preset 可行**：mount、skills、默认值都过；它可同时解决 G3/G4/G5 的组合面。
2. **不需要为了技能传递保留 raw read**：技能目录挂载是原生载体，且长度安全。
3. **worker 的产品成本是真的**：第六个 preset 会进 roster/选择器；要么接受并命名清楚，
   要么只把它当“内部 worker + 默认值”，并在 UI/文档标注非研究角色。
4. **Phase 3 必须验证实际工具面**：mount 绿不等于工具面绿；host 层工具可能绕过 preset 声明。
