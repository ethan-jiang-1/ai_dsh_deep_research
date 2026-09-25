# Note：DSH Agent Note 生命周期点状吸纳（note-format 门禁 + 取代检查 + 毕业改写）

> 状态：implemented

> 2026-09-24 · 用户指令（"点和吸纳就行了，不要推翻我们现在"）· 来源：
> `/Users/bowhead/deepseek-harness/_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md`
> （DSH 官方 SDLC 参考，亲读全文）· 合同落点：[notes/README.md §决定覆盖与取代检查](../README.md)

## 决定

点状吸纳四件；本仓既有规则（RFC 状态行住头部、proposal-scheduled 门禁、逆转互链、
机械豁免、无 INDEX）**全部保留不动**：

1. **取代检查硬触发**：每新增一篇 Note 搜活动树同决定/同机制——已有 owner 更新不建
   重复；部分取代双方互链（现行"逆转互链"规则的推广）；完整取代 = 新 Note 吸收旧
   Note 全部独有的决定理由/输掉的方案/验证/环境状态后才可删旧。落点：
   notes/README.md §决定覆盖与取代检查 + AGENTS.md notes 段触发 bullet。
2. **毕业 = 正文改写**：计划体 → 已交付事实体，删未来时态/迁移计划——只改路径不改正文
   = 未来计划伪装成当前事实。落点：guides/60 §4 第 2 条 + notes/README.md。
3. **轻量格式门禁 `note-format`**（regex 版，非 DSH 全量 heading 门禁）：proposed/ 状态行
   与目录互验 + 输掉的方案在场；implemented/ 骨架（## 决定 + ## 输掉的方案）在场；
   rejected/ 否决状态行。落点：verify.mjs 门禁 + evaluation.md 登记表（门禁 14→15）。
4. **grandfather 条款**：门禁生效前无法对齐骨架的 7 篇遗留 Note 标固定注释（内容有效
   不追改），新篇一律按 guides/60 §4 骨架写——DSH 原生解法，不为门禁追改历史内容。

**决定覆盖原则**（Note 不必从 proposed/ 起步，已交付决定直接进 implemented/）随本 Note
落地示范。外部材料登记 = 00-index §外部研究材料新增行。

## 输掉的方案

- **全量照搬 DSH 格式门禁**（Problem/Decision heading 强制 + 三行头 Status: implemented
  回填 13 篇历史 Note）：否——目录即状态，回填 Status 行是形式主义；机械断言只证结构
  不证语义（reference 原文自认），中文章架在场断言已覆盖"伪装成当前事实"检查面。
- **把 7 篇遗留 Note 追改成标准骨架**：否——为门禁改历史内容 = tail wagging the dog；
  grandfather 条款是 DSH 原生解法。
- **吸纳 class 子目录封闭集**：否——notes/README.md 差异表既有结论（规模不到，随
  「dsh-discipline 全量枚举」条目重估），维持。
- **吸纳 archived/ 树 + append-only hash manifest**：否——无归档存量（差异表既有结论），
  维持；引入条件不变。
- **集中 INDEX.md**：否——两仓一致明文禁止（第二份会漂移的清单；目录树即工作清单）。

## 实际跑过的验证

- `node scripts/verify.mjs`：15 门禁全绿（implemented 13 篇：6 篇骨架原生符合 + 7 篇
  grandfather 标注；proposed 4 篇 RFC 状态行全在位；rejected 1 篇状态行在位）。
- note-format 红绿反证（双形态）：无骨架无 grandfather 的临时 Note 注入 → 红（精确
  点名缺"## 决定"与"## 输掉的方案"）→ 删除；无状态行的临时 RFC 注入 → 红（点名状态行
  缺席 + 输掉的方案缺席）→ 删除 → 复绿。
- `node --test tests/*.test.mjs`：20 tests 全绿。

## 环境状态

- 吸纳不触碰 run 通道：CPU 题会话（session-d29822ed）HITL1 仍挂起待用户答，web 3081
  与仪表盘 watcher 运行中（后台任务 bash-231）。
- 本 Note 按新纪律执行取代检查：搜活动树无同主题 owner——notes 流程规则的正本 =
  notes/README.md（本轮同 diff 更新 = 更新 owner 文档，本 Note 记决定与证据）。
