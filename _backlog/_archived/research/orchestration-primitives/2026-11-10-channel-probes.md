---
topic: 编排原语：五个探针的证据
intent: 记录 channel-policy v2 的探针命令、输出、边界与未证事项，供复核与实施前复跑。
---

# 编排原语：探针记录（2026-11-10）

> 服务 = [channel-policy v2](2026-11-10-channel-policy.md)。同 pin = `dsh-v0.2.1-rc.5` @
> `b830ec950f`。探针在开发 home / 源码 overlay 上跑，**不留 tracked 改动**。
> 证据分层：P1 是真挂载（L1）；P2–P4 是源码/文档级；P5 是运行态测量。别把源码结论写成
> 「已跑过」。

## 0. 环境与复现口径

```sh
cd /Users/bowhead/ai_dsh_deep_research
source dev/env.sh
node dev/render-overlay.mjs          # overlay 由 pack 渲染；改 preset 后必须重渲染
DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs --port 3099
```

`preset-smoke` 真会话档会 boot `web` profile + `dev/research.overlay.yml`，逐个角色
`session/create`，并断言 skills 硬隔离。它**不**检查模型可见工具表；工具表要 `request/header.tools`
（真模型或 mock LLM）才看得到。

## 1. P1：workflow 的挂载形状（真挂载，已跑）

### 1.1 基线（未改任何 preset）

```
PASS  ...（5 个 preset 的 keyless 预检）
  PASS boot 页模块表含本包 client 行（served）
  PASS roster 含 analyst / critic / lead / method-editor / scout
  PASS session/create 挂上 analyst / critic / lead / method-editor / scout
  PASS analyst 只看见自己的 skills
  PASS critic 只看见自己的 skills
  PASS lead 只看见自己的 skills
  PASS method-editor 只看见自己的 skills
  PASS scout 只看见自己的 skills
preset-smoke: ALL PASS（5 个 preset 全部真挂载绿）
```

### 1.2 只插 `tool-workflow`（缺 engine）→ 红

临时在 `analyst.patch.yml` 的 `plugins` 里加一个 group，只放 `tool-workflow`：

```yaml
          - id: workflow-delegation
            name: cordis:group
            group: true
            isolate:
              workflowEngine: true
            config:
              - id: tool-workflow
                name: '@deepseek-ai/dsh-tool-workflow'
```

重渲染 overlay 后跑 `preset-smoke`：

```
  PASS boot 页模块表含本包 client 行（served）
  FAIL roster 含 analyst: preset 被标 broken：tool-workflow (@deepseek-ai/dsh-tool-workflow): waiting for workflowEngine
  PASS roster 含 critic
...
  FAIL session/create 挂上 analyst: session/create 失败: tool-workflow (@deepseek-ai/dsh-tool-workflow): waiting for workflowEngine
...
preset-smoke: 3 FAILURE(S)
```

**结论**：web-app 在 root 层把 `workflow-ptc` 也 disable 了
（`vendor/dsh/packages/bundle/web-app/cordis.patch.yml:572-576`），preset 只插 tool 不够；
`tool-workflow` 的 `inject: ['workflowEngine']` 等不到服务，preset 直接 broken。

### 1.3 engine + tool（同 group，isolate）→ 绿

把 group 改成：

```yaml
          - id: workflow-delegation
            name: cordis:group
            group: true
            isolate:
              workflowEngine: true
            config:
              - id: workflow-ptc
                name: '@deepseek-ai/dsh-workflow-ptc'
                config:
                  provider: spawn
              - id: tool-workflow
                name: '@deepseek-ai/dsh-tool-workflow'
```

重渲染后跑 `preset-smoke`：

```
  PASS session/create 挂上 analyst
  PASS analyst 只看见自己的 skills
...
preset-smoke: ALL PASS（5 个 preset 全部真挂载绿）
```

**结论**：engine + tool 同 group、`isolate: workflowEngine: true` 是可用形状；与 shipped
`standard` preset 的 `delegation` group 同形（`web-app/presets/standard.patch.yml:100-110`）。
这一步只证明**能挂载**，不证明模型看得到 `workflow` 工具（要看 P2/P3 的 request header）。

### 1.4 复原

```sh
cp /tmp/analyst.patch.yml.bak packages/deep-research-pack/presets/analyst.patch.yml
node dev/render-overlay.mjs
shasum -a 256 packages/deep-research-pack/presets/analyst.patch.yml
# c2af787bcc1dadc4b9069f77dbf7409d0bde75ddac971be93074359560b5b772（与探针前一致）
```

探针结束后 `git status` 无 `analyst.patch.yml` 改动；overlay 只剩探针前已有的注释改动。
**没有把探针代码留在树里。**

## 2. P2：workflow child 是否继承 `research-content` 注入（源码级，待 live）

事实链：

- `research-content` 是 **bundle/host 行**：`packages/deep-research-pack/cordis.patch.yml:103-104`
  insert `dsh-deep-research-pack/content`。
- 该行 `apply` 在 host 的 `systemPrompt` 上注册 `research_pack_root` 变量 + `research:manual`
  runtime context（`packages/deep-research-pack/src/content/index.ts:65-72`），order 205。
- workflow child 通过 `startActivation` → `composeFrom` 加入调用者 preset 修订；它是 host 下的
  子 Agent，`systemPrompt` 仍是 host 服务，child 还会额外得到 `subagent:delegation` context
  （`vendor/dsh/packages/subagent/subagent/src/child-agent.ts:204-218`）。

**判断**：按 scope 可见性，child **应当**继承研究手册（host 级 context 对所有 Agent 生效）。
**未证**：没有发真模型请求读 `request/header` 的上下文快照；如果 preset 自己挂了
`systemPrompt` 子服务，结论可能不同（本包 preset 没挂）。

**怎么证**：在试点第一场 run 里，对 wave-runner child 的 `request/header` 检查是否含
`research:manual` / `research_pack_root`；或用一个 mock LLM 走 `preset-smoke` 的 boot 后发一条
prompt，读 `request/header`。若红，brief 必须内联手册的目录/证据 schema。

## 3. P3：team profile 的 disable 与 preset 的 insert（源码级 + 旧差分，待 live tool-list）

事实链：

- bundle patch 按 entry list/id 作用；`applyEntryPatches` 只递归进 **group** 行，不递归进
  `config.plugins` 这种对象字段（`vendor/dsh/vendor/include/src/index.ts:57-74, 109-113`）。
- preset 的 `config.plugins` 是独立 EntryTree（`packages/preset/agent-preset-registry/src/mount.ts:204-215`），
  id 在树内作用域。
- team profile 在 root 层 disable `tool-subagent` 四行
  （`packages/experimental/agent-team-profile/cordis.patch.yml:4-14`），并明说 preset 仍可挂
  continuable subagent 控制（`.../README.md:107`）。

**判断**：team profile 的 disable **不会**删掉 lead/scout/analyst preset 自己 insert 的
`tool-subagent`；persona 的「用 subagent 生 worker」在机制上成立。D16 的差分实验（preset 行
覆盖 profile 行）与此一致。

**未证**：没有在真挂载下读 Lead 的 `request/header.tools`；工具行存在 ≠ 模型可见（还需要
`agentPresets`/`subagents`/`systemPrompt` 服务在 child scope 可见）。**怎么证**：在 run 通道里
让 Lead 发一条最小 prompt，tee 请求体，断言 `subagent` 在 `tools` 里；再建一个 teammate，
断言它也有（继承 Lead 修订）。

## 4. P4：workflow child 与 8 槽（源码算术，待压力实测）

事实链：

- root 一个 `ActivationPool`，所有 local/external 后代共享；root 不占槽
  （`packages/subagent/subagent/src/manager.ts:743-744, 840-848`；
  `packages/subagent/subagent/README.md:53`）。
- 每次 `materialize` 先 `pool.reserve(maxActiveSubagents)`；超限抛 `ACTIVATION_LIMIT_REACHED`，
  **不排队**（`activation.ts:24-35`）。
- workflow 的 `startChild` 走 `startActivation`，是同一个 root 下的 local child
  （`workflow-ptc/src/host.ts:200-228`），所以**占同一池**。
- workflow child 不传 `maxDepth`，服务只 stamp `parent+1`，不做深度检查
  （`manager.ts:384-387`；`child-agent.ts:54-57`）。
- 超槽时 `agent()` 把错误包成 `AGENT_START`（fatal），脚本整体失败
  （`workflow-ptc/src/runtime.ts:189-191`）。

**算术**：Lead（root，0）+ teammate M + wave-runner 1 + 并行 child N ≤ 8。试点取 M=2、N=4 →
7 槽。若 M=4、N=4 → 9 槽，必炸。workflow 自己的 `maxConcurrentAgents` 默认
`min(16, cores-2)`，可能大于剩余槽，所以要把脚本并发显式压到剩余槽。

**未证**：真实并发下槽位会计时（child 何时释放、sequential pipeline 是否只占 1 槽）没有压力
测试。**怎么证**：试点里读 `subagent/start`/`end` 事件或 `ACTIVATION_LIMIT_REACHED` 错误；记录
峰值 live children。

## 5. P5：HITL1 计划卡预算（运行态测量，已跑）

```sh
source dev/env.sh
node scripts/run-ops/plan-card-stats.mjs
```

输出（开发 home，近 30 天，组含 `research-workspace`）：

```
plan-card-stats: 扫描 106 场会话 → 计划确认卡 3 张
    200 字    合规  2026-10-28  session-b26d94c4-62d5-41  [计划确认]
    183 字    合规  2026-10-28  session-38c3399a-7712-43  [计划确认]
    171 字    合规  2026-10-28  session-38c3399a-7712-43  [计划确认]
分布：min 171 / 中位 183 / max 200；阈值 ≤200 字 → 合规 3 / 超限 0
```

口径 = ask 的 `question` 字段全长；标签 = options 里含「按计划开跑」
（`scripts/lib/plan-card.mjs`）。阈值 200 是 WARN，不拦交付。

**判断**：现有最大卡已顶格 200 字；在正文加「W2 脚本扇出 ×N」会超，除非同时删字。**加一个
选项**不改 `question` 字段，不会触发 200 字阈值，但会改变用户对整场 run 的理解。建议：正文
点名 + 删字；选项不动。

## 6. 这五个探针不证明什么

- P1 只证明 **preset 能挂载**；不证明模型看得到 `workflow`，也不证明 child 工具面。
- P2/P3/P4 是**源码/文档级**；真实组合下的工具可见性、context 快照、槽位会计时都未跑。
- P5 只测了**计划卡**；不测 HITL2 卡，也不测用户实际阅读负担。
- 没有跑真模型，所以不证明模型会遵守 workflow 的 explicit-ask 政策、不会递归起 workflow、
  或不会把 `null` 当成功。

## 7. 建议的补证（试点第一场）

1. 对 Lead / teammate / wave-runner / workflow child 各抓一次 `request/header.tools`；
2. 对 workflow child 抓 `request/header` 的注入快照，确认 `research:manual` 在场；
3. 试点 wave 峰值 live children ≤ 8，记录每个 child 的 start/end 与占用时长；
4. 计划卡正文点名 workflow 层后，复跑 `plan-card-stats`，确认 ≤200 字；
5. 若任一红，按 channel-policy §9「什么会改变结论」重审。
