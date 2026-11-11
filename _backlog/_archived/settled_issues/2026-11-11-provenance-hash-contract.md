---
status: 已结
opened: 2026-11-11
---

# Provenance hash 计算路径：不要让 analyst 用 workflow 当 python3

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是
> 结论：implemented — Provenance hash owner 改为 ops/Lead；manual/analyst skill/team-assembly 同步；analyst 工具面已无 workflow；T0 9973 字符。
> 去向：implemented — notes/implemented/2026-11-11-provenance-hash-contract.md

**问题与期望结果：** 本仓的 quick_factual / wave 派发 prompt 要求 analyst 为
`provenance/<id>.json` 计算 `sha256`，写法是 "python3 hashlib"；但 analyst 的工具面
没有 bash/python，唯一的 JS 沙箱是 `workflow`。真 run `c91d1525` 因此把 `workflow`
当 SHA-256 计算器（`meta.name=sha256-slice`，无 agent），未授权且
`sandbox-unavailable` 失败。期望结果 = 不再要求角色做它没有工具做的事；provenance
hash 要么由 ops/Lead 在 run 后计算，要么提供明确的窄计算工具；普通 analyst 不再把
workflow 当通用计算 runtime。

**当前情况：**

- `content/manual.md:45-46`、`:98-101` 说 provenance 是 analyst/ops 的 C-lite 契约，
  `sha256` 是其中字段；`team-assembly` / quick_factual 派发把它写成“每张卡一个 +
  python3 hashlib”。
- `presets/analyst.patch.yml` 工具面无 bash；有 `workflow`（D45 的 wave executor）。
- `_backlog/_archived/research/orchestration-alignment/2026-11-11-session-evidence.md` §4：
  `c91d1525` 的 prompt 第 26 行要求 python3 hashlib；它在 seq 106 调 workflow 纯 JS
  SHA-256，结果 `sandbox-unavailable`；这是本样本唯一一次未授权 workflow 调用。
- DSH 原生：workflow 是编排工具，不是通用计算沙箱；工具描述明确“only when user
  explicitly asks for workflow or large multi-agent orchestration”。模型在缺工具时
  仍会找最近的沙箱，这是合同/工具错配，不是纪律文本能根治的。

**未决问题：**

1. provenance hash 是否仍是交付必需？手册说“可带”（C-lite），派发 prompt 写“每张卡
   一个”；如果审计不依赖 hash，最省事的修法是降为可选 + ops 后补。
2. 若审计确实需要 hash，是否值得加一个窄 `provenance_hash` 工具（只读文件/URL →
   sha256，无 shell）？这是新代码面，需 D 号。
3. 谁拥有 hash：analyst、Lead、ops，还是 `evidence-audit` 自己？owner 必须单一。

**下一步：** 先按方案 A 改派发/手册（不要求 analyst 算 hash；hash 由 ops/Lead 后补或
显式可选）；若审计门要求 hash，再评估方案 B 的窄工具。

## 已知与未决

- 已知：analyst 无 bash/python；workflow 是唯一 JS/PTC 沙箱；模型会用它算 hash。
- 已知：workflow 的 explicit-ask 是 prompt 约束，不是机械闸；工具可见就会被误用。
- 已知：`c91d1525` 的 workflow 调用未 spawn agent、未产生研究副作用，但仍是未授权
  工具使用；修法应同时消除“为什么需要它”。
- 未决：hash 是否交付必需；若必需，窄工具 vs ops 后补；owner 是谁。

## 方案与取舍

**方案 A（推荐）· 合同降级 + ops 后补**

- `team-assembly` / `research-brief` / quick_factual 派发模板删除“analyst 用
  python3 hashlib 算 sha256”的硬要求；provenance 改为“analyst 可写元数据，hash 由
  ops/Lead 在 run 后用 bash 补”，或整份 provenance 由 ops 生成。
- `manual` 明确：provenance 是 C-lite 可选证明；没有 hash 不是伪造，只是
  UNATTESTED；`file://` 的 MAJOR 规则不变。
- 验收：quick_factual pilot 不再出现 analyst 的 workflow 调用；若 provenance 需要
  hash，ops 侧有可复跑的补写步骤。

**方案 B · 窄 `provenance_hash` 工具**

- 新增只读工具：输入 file path 或 URL + slice，输出 sha256；无 shell、无网络写入。
- 成本：新代码面 + D 号 + 工具行 + 测试；收益：模型可自足，不需要 bash/workflow。
- 只在 A 被审计门否决时采用；不要为了“让 analyst 能算 hash”给 bash。

**方案 C · 给 analyst bash**

- 能力面过大，且与“研究角色只读写证据”的边界冲突；不选。

## 验收标准

1. 派发/persona/skill 文本中不再出现“analyst 用 python3 hashlib 算 sha256”的硬要求；
   `grep` 可证。
2. `manual` 的 provenance 语义明确：可选、hash 由 ops/Lead 或显式工具负责；无 hash
   时的审计结果是 UNATTESTED，不是伪造；`file://` 规则不变。
3. 一场 quick_factual pilot（或等价 fixture）：analyst 没有调用 `workflow`；若需要
   hash，ops/Lead 的补写步骤有证据。
4. 若走方案 B：窄工具在真会话可用、无 shell、sha256 与 `sha256sum` 对账；工具行/
   D 号/测试齐。
5. `pnpm verify` 绿；相关测试绿；Note 记录证据与未采用方案。

## 关闭条件

- 上述 1–5 全绿；Note 与卡同变更归档。
- 若审计门坚持 hash 必须由角色在 run 内产生：转方案 B，卡保持 `待落地`，另立
  工具实施子步；不要静默给 bash。

## 证据

- [Phase 1 会话证据 §4](../research/orchestration-alignment/2026-11-11-session-evidence.md)
- [Phase 3 行为证据 §2](../research/orchestration-alignment/2026-11-11-behavior-evidence.md)
- [研究总材料](../research/orchestration-alignment/2026-11-11-orchestration-alignment.md)
