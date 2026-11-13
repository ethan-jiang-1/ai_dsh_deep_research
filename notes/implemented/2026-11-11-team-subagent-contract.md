> 状态：implemented

# Team 组合的 subagent 合同纠偏

## 决定

把「Team 组合里 subagent 实际是 one-shot」写进模型可见合同，并修掉三处过度声明：

- `team-assembly` 新增 **Team 组合里的 subagent（one-shot 合同）**：subagent child 不是
  Team 成员，Team `send_message` / `interrupt_agent` 不能寻址它；工具描述里的
  “use send_message to steer / continue” 在本组合不可达；结果以 settlement notice 到达；
  要追问就 `spawn_teammate` 或重新派一发带上下文的 subagent。
- `team-assembly` 分派纪律新增 **角色边界（teammate 不是 Lead）**：spawn prompt 写明不得
  调用 `ask_user_question` / `create_goal` / `present` / `spawn_teammate`；需要拍板写 gap
  回 Lead。Lead persona 同步一句。
- 8 槽公式从“有脚本层时”扩到全 run：teammate + 所有 subagent worker + executor +
  workflow child ≤ 8。
- `design/10 §4` 把“critic 工具面 = 职责边界的机器表达”限定为 **root critic preset**；
  `design/10 §3` / D16 的“subagent 强制 one-shot”改成“provider 可续但控制面不可达 →
  实际 one-shot”。`design/20` 补“角色边界靠派发合同 + 人工验收”。

不改组合、不加 preset、不改 vendor。证据 = 真模型探针：Lead 按 `subagent` 描述把 child id
传给 Team `send_message`，得到 `active teammate "<id>" not found`；child 结果经 settlement
notice 到达（[issue 证据](../../_backlog/_archived/settled_issues/2026-11-11-team-subagent-contract.md)）。

## 输掉的方案

- **从 Lead preset 移除 `tool-subagent`**：会切断 D44 claim 级复核的唯一角色 preset 通道；
  且 point task / worker 也会失去入口。不选。
- **改 vendor 的 `subagent` 工具描述**：不可控；升 pin 会覆盖。不选。
- **把 Team 整个换成 subagent**：20 个 teammate 里 13 个多轮、critic R2/R3 复审依赖持久
  会话；会丢真实协作。不选（D47 保留 Team 只做多轮协调）。
- **只改 docs 不改模型可见 skill/persona**：模型看不到，等于没改。不选。

## 实际跑过的验证

- `node dev/render-overlay.mjs`：source overlay 重生成（含 persona/skill 变更）。
- `DSH_SMOKE_REAL=1 node scripts/smoke/preset.e2e.mjs`：5 角色 + 2 worker profile
  全部真挂载 ALL PASS（roster / session/create / skills）。
- `node scripts/smoke/l4-lite.e2e.mjs`：全角色（含 method-editor）assistant 响应 +
  scout `web_search` 调用 **ALL PASS**。
- `node scripts/smoke/release.entry.mjs --install-only`：真实安装形状 **ALL PASS**
  （pack → 干净 profile → plugin add → 安装域 preset.e2e；含 worker rows）。
- `node scripts/smoke/snapshot-replay.entry.mjs`：A 回放 + B 组装请求（persona /
  headers / skill-catalog / runtime-context / time-context）**全 PASS**；C2/C3 因当前
  客户端 `Open right sidebar` 控件不可见而红（UI 夹具问题，非本合同；状态页签归
  `client-load.entry` 的活体证据）。`ui.expected.md` 的卡片/活动行已按 fixture 折算
  重写，`tests/run/replay-fixtures` 绿。
- 行为探针（真模型，`deep-research` profile 更新到 0.3.1 后）：
  - critic teammate 在“可以问用户/可以再派 subagent”的压力 prompt 下 **零工具调用**，
    明确援引 HITL 纪律——G1 仍是潜伏，不是 active。
  - 显式命令 Lead “对 child id 调 send_message”时，Lead 仍会照做并撞
    `TEAM_MEMBER_NOT_FOUND`。这是**文本合同的边界**：用户显式指令可以覆盖合同；合同
    不能替代机械闸。自然任务（不点名 send_message）未再出现该调用。
- `pnpm test`：1165 pass / 0 fail。
- `pnpm verify`：受影响门禁绿（`role-list-sync` / `overlay-fresh` / `backlog-liveness` /
  `readme-shape` / `dist-tarball` 等）；全量只剩并行 `strategy-abstraction` 未跟踪链接
  这一项外部红。

## 残余风险

- `subagent` 工具描述仍带 “send_message steer” 句；本仓无法改 vendor。模型在显式指令
  下仍会撞 namespace error；需要的话下一步加 run 级审计（扫描 `TEAM_MEMBER_NOT_FOUND`），
  不阻断交付。
- C2/C3 的右栏 guide 控件漂移是 UI 夹具问题，未在本卡修；`client-load.entry` 是状态页签
  的 owner，后续 UI 轮次应更新快照配方。
