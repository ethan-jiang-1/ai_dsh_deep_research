# backlog → notes：结论去向与质量责任（issue-to-note 重写）

> 状态：implemented

首提 2026-10-24 ｜ 用户 2026-10-24 批准按推荐方案落地 ｜ 前身 = [2026-10-09 方法论吸收](2026-10-09-backlog-methodology-absorption.md) + [2026-10-12 制度显性化](2026-10-12-backlog-process-borrow.md)（部分取代：只改“下游申请/接收方”这一段，其余决定维持）

## 决定

1. **文件名保留 `issue-to-note`。** 曾改为 `conclusion-disposition`，用户判断新名更抽象、反而增加理解成本，遂回退；旧名作为历史标识保留，方法标题与 `whenToUse` 明确“不是每张 issue 都成为 note”。
2. **一卡一主去向。** 一张卡只记一个主结论的去向；子结论拆子卡，或写进目标载体的“未决/后续”节，不在一张卡上堆多个 `去向`。
3. **两种模式。** 决定本身是交付物 → 结论处关闭；决定绑定实施 → 卡留活跃到交付，`implemented` Note 与交付同一变更写，再关。批准但未实施不写 `implemented`。
4. **五个值，五个载体。** `none / rejected / proposed / implemented / deferred`；每个值有目标与关闭条件。`none` 链现有载体；`rejected` 只收有防复犯价值的否决；`proposed` 只在需要实施前显式评审时用；`implemented` 收已最终交付的决定理由；`deferred` 只记触发器 owner。
5. **一行记录，不收件。** 卡头 `去向：<value> — <target>` 就是交接记录；不建收件箱、队列或回执。目标搬家（`proposed` → `implemented`、`implemented` → `archived`）时，搬家那次变更同步入链，`md-links` 把守。
6. **转换契约。** 卡保留问题、讨论、选项与质量契约；Note 只收决定、真实输掉的方案、实际验证与残余风险，并回链来源卡。Issue → Note：决定 = 卡上结论，验证 = 对 `## 验收标准` 的证据；Bug → Note：决定 = 修复方式（仅当承载持久决定），验证 = 对 `## 修复判据` 的证据；机械/局部修复为 `none`。
7. **质量责任不随载体转移。** issue 的业务验收（目标、范围、验收标准、品味/价值/风险）归用户；bug 的产品可接受性与 P0/触面例外拍板归用户，严重级分诊、根因、修法选择与修复证据归 agent；Note 作者（agent）负责决定理由与验证，阶段边界由用户评审。`implemented` Note 的验证节必须引用或列出卡上质量契约；卡上没有可检验的质量契约时，先回验收设计/修复判据，不得直接 `implemented`。
8. **notes 收件规则。** 见 [notes/AGENTS §从 backlog 进来的结论](../AGENTS.md)；`none` / `deferred` 不进 notes，未裁决推敲留在 backlog。`deferred` 的 owner 按序：`triggers.md`（正常工作可观察）→ owning note（已交付决定的一部分）→ 明确 `none`（不跟踪）。
9. **历史不改。** 新规则只对新卡/新变更生效；归档卡与已交付 Note 不追改（本次未改任何历史卡正文）。

方法正本 = [_backlog/methods/issue-to-note.md](../../_backlog/methods/issue-to-note.md)；地图 = [design/60 §二](../../docs/design/60-intent-carriers.md)；收件规则 = [notes/AGENTS](../../notes/AGENTS.md)；关闭规则 = [_backlog/README](../../_backlog/README.md)。

## 输掉的方案

- **改名 `conclusion-disposition`**：用户反馈新名更抽象、认知成本更高；名字不是语义修复的必需品，保留旧名 + 正文澄清更划算。
- **保留“提交申请 → 接收方 → 回执”模型**：本仓没有收件箱，D20 也不设第二队列；申请只有发送方卡上的自证，收件方无义务响应。改为一行 `去向` + 载体准入。
- **每张 issue 都写 Note**：Note 通胀，且与“只有持久决定理由需要 Note”冲突；`none` 是合法且常见的出口。
- **`proposed` 作默认**：把 RFC 变回普遍前置，违反 D12/D19；只在需要实施前显式评审时用。
- **把业务质量责任交给 notes**：Note 是决定记忆，不是业务验收单；业务验收/产品可接受性仍归用户，Note 只承载技术证据。
- **给一张卡记多个 `去向`**：会让卡变成第二状态机；一卡一主去向，子项进目标载体。
- **保留旧名但不改正文**：旧正文把“申请/接收方”当动作，读起来仍像生产线；本次重写正文，名字只作历史标识。
- **现在加 `去向` 门禁**：没有真实漏失，先观察 2–4 张新卡；有漏失再按 `writing-a-gate` 加结构检查（只查值域与目标存在，不判判断质量）。

## 实际跑过的验证

- **纸面原型（不提交，`runtime/backlog-notes-paper.md`）**：六个真实场景——实施绑定（reader-final）、决定型（retire-roadmap）、`none`（egress）、混合主+子项（research-method-config）、`deferred` 无活触发器（hitl2）、`proposed` 后毕业（dynamic DAG）——全部唯一落进五值表；暴露并固定“一卡一主去向”“deferred 三级 owner”“目标搬家同步入链”三条规则。
- **`pnpm verify`**：全绿（含 `md-links`、`md-anchors`、`doc-budgets`、`note-format`、`note-status`、`backlog-liveness`、`entry-chain`）。首轮 `md-anchors` 因中文锚点不可解析红，改为文件链接后绿。
- **`pnpm test`**：769/769 通过。
- **跳数**：根 `AGENTS.md` → design/60 §二 → 方法 = 2 跳；notes/README → notes/AGENTS → 方法 = 2 跳；_backlog/README → 方法 = 1 跳。
- **旧词清扫**：`申请下游处理 / 下游处理申请 / 申请提交 / 接收方` 在 live 文档中归零（历史 Note/归档卡保留原文，不改写）。
- **预算**：根 `AGENTS.md` 137/140、`_backlog/AGENTS.md` 44/48、`notes/AGENTS.md` 46/50，均未升顶；方法 70 → 81 行，增量全部是质量责任与转换契约。
- **历史面**：`git status` 只有 16 个 live 文档改动；归档卡、历史 Note 正文未改。

## 环境状态

纯文档/方法改动，无产品代码、无新门禁、无角色/preset 变更。`issue-to-note` 文件名保留，内容改为结论去向程序；`notes/AGENTS` 新增收件规则；`design/60` 地图改为“两种模式 + 五个去向”。下一窗口观察 2–4 张真实新卡是否使用 `去向` 行、`implemented` Note 是否对账验收标准；若出现真实漏失，再按 `writing-a-gate` 给 `backlog-liveness` 加 `去向` 值域/目标存在检查，并为旧卡设 grandfather。
