# 归档判定复核面落地 + stocktake 边界个案裁定

> 状态：implemented

出处 = [notes-stocktake 体检](../../_backlog/research/2026-10-08-notes-stocktake.md) §下一步候选 1
（"给归档判定补一层可复核面——推荐先做"）与候选 3（两篇边界个案待裁定，前提 = 候选 1 落地）；
用户 2026-10-10 指令「把剩下要做的都做了吧」。

## 决定

**归档判定补三层可复核面：① 新 L0 门禁 `archived-note-pointer`——活面（`notes/archived/`
之外的 tracked .md）以 Markdown 链接引用 `notes/archived/<具名 Note>`，必须在
[scripts/archived-note-pointers.json](../../scripts/archived-note-pointers.json) 登记为历史指针
（逐条带理由）；未登记链接 / 登记条目失真 / 登记条目失存 / 冻结语料空而活面扫描集空，四形态即红。
② 登记簿 = 每条"活面引用冻结件"的显式裁定（20 条存量逐条登记）。③ stocktake 两篇边界个案
裁定归档（[hitl-docking-polish 快照](../archived/2026-09-28-hitl-docking-polish.md)、
[node-topology-procedure 快照](../archived/2026-09-28-node-topology-procedure.md)）。**

- **门禁边界（如实）**：它把"被引用还想归档"顶到对账面现形，但进门条件 2（"不再可能指导
  未来变更"）的语义判断保留给人——机械面只保证引用关系不静默；反引号裸路径不检（与
  [md-links](../../docs/evaluation.md) 同边界，wide 盘点另行）。
- **两案裁定依据**（各自进门三条件，[archived/README](../archived/README.md)）：
  - **node-topology-procedure**：完整交付 ✓；rationale 已由 changing-node-topology SKILL 全文
    承接（六处同步清单 + 四条已知坑，2026-10-08 体检核实），活面零引用（本 diff 全量解析
    扫描实证）✓；历史理由值得保留 ✓。
  - **hitl-docking-polish**：完整交付 ✓；操作内容（SSRF 守卫机理 + 代理变量配方全文）已由
    [guides/61 §HITL1](../../docs/guides/61-run-playbook.md) 承接（2026-10-08 体检核实），
    残余的"实证与 vendor 依据"指针按登记制显式化为历史出处 ✓；历史理由值得保留 ✓。
  - 搬移纪律照 [archived/README](../archived/README.md)：唯一机械编辑 = 状态行下插归档行；
    入链重定向（guides/61 ×1、[stocktake Note](2026-10-08-notes-stocktake.md) ×2、
    [体检材料](../../_backlog/research/2026-10-08-notes-stocktake.md) ×2）仅改相对路径。

## 输掉的方案

- **全面禁令（活面→archived 链接一律红）**：实测语料 18 处链接中，design/40 §7"历史指针"节、
  00-index 外部材料表（行内标注"已归档/冻结"）、README 索引导航都是**合法历史指针**——
  一刀切会把门禁变成对既有文档的大清洗令（窄证据切片纪律不收）。
- **只扫高风险面（如 evaluation.md 台账）**：会让 stocktake 边界个案 A 的失败形状
  （guides→archived 作实证依据）逃检——那正是体检打回 8/8 的类别之一；面收窄 = 盲区复长
  （BUG-018 教训同源）。
- **存量链接自动豁免、只管未来**：豁免清单静默腐烂（align-ledger na 理由同病）——改为
  逐条登记 + 理由，腐烂本身即红（登记条目失真/失存断言）。
- **只做判据问句改写、不立机械面**：问句（"机制若消失，哪次未来变更会变差"）保留在
  体检材料与归档行的裁定指针里，但它单独无法阻止"归档仍被引用的 Note"——两层都要。
- **登记簿空判红（防空语料过度延伸）**：登记簿清零 = 活面彻底解除引用，是合法终态；
  防空语料由语料臂（archived 空 → 红）与活面扫描集臂承担。

## 实际跑过的验证

- **反证①（未登记链接）**：README.md 追加一行指向 ui-observability-surfaces 快照
  （`notes/archived/2026-09-24-ui-observability-surfaces.md`）的 Markdown 链接 →
  `[archived-note-pointer] README.md: 未登记的活面→archived 链接 → …（×1）` 红 → 还原绿。
- **反证②（登记条目失存）**：登记簿首条 target 改不存在路径 → 三红连发（`登记条目失存
  （目标不在 notes/archived/）` + 该对 `未登记` + `登记条目失真`——失存探针连带暴露登记簿
  与观测集的双向对账，行为正确）→ 还原绿。反证中还抓出并修复 `sep` 未导入的实现崩溃
  （门禁红前先崩 = 另一种静默，已修）。
- **gates-smoke**：新增 `archived-pointer-unregistered` / `archived-pointer-stale-entry`
  常驻案例（2026-10-10 实跑全绿，对照组零注入全 PASS）。
- **存量全量对账**：解析法（非文本匹配）扫 429 篇 tracked .md——15 对存量链接逐条登记
  （文本匹配漏 5 对 `../archived/` 形态，登记簿因此以解析法为准）；归档两案后 +5 对 = 20 条。
- **L0**：`pnpm verify` 全绿（含新门禁）+ `pnpm test` 322/322。

## 环境状态

- 登记簿 20 条（docs/ ×10、notes/implemented ×7、guides ×2、pack README ×1——按 (源,目标)
  对计数）；archived 语料 29 篇（27 + 本轮 2）。
- stocktake 三条候选的最终状态：候选 1 = 本门禁落地；候选 2（class 层）维持不引入；
  候选 3 = 两篇裁定归档（本 Note）。
- 已知限制：登记簿只覆盖 Markdown 链接形态的引用；反引号路径与代码内引用的覆盖面
  归 bare-path 盘点（2026-10-10 进行中）另行决定。
