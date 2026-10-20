# backlog 制度显性化借鉴（loop_advisor）：入口两张票、缺陷修复通道、状态生命周期、agent 门牌

> 状态：implemented

来源 = `ai_dsh_loop_advisor/_backlog/`（外部材料参考仓快照，非 vendor pin；钉版 `b43be87`，登记 = [00-index §外部研究材料](../../docs/00-index.md)），源卡 = 该仓 `issues/2026-10-12-backlog-process-made-explicit.md`（owner 已批准并落地的铁本：手册 + `_backlog/AGENTS.md` 门牌 + 两轨翻转表）。借鉴卡 = [_backlog settled issue](../../_backlog/_archived/settled_issues/2026-10-12-backlog-process-borrow.md)（含本仓缺口实测审计与验收对账）；决定登记 = [D24](../../docs/00-index.md)。

## 决定

把本仓 `_backlog` 的制度从「在做未成文」补成成文法。三态表：

| 借鉴件 | 处置 | 说明 |
|---|---|---|
| 入口两张票（问题清楚 + 验收手段随格式） | 照搬 | issue 落 `## 验收标准`（结论倾向「现在做」时必写）、bug 落 `## 修复判据`（翻修复就绪前写就）；正本 = [_backlog 入口](../../_backlog/README.md)「入口两张票」节 |
| 缺陷修复通道 + 修复就绪自授权 | 照搬（用户裁定②） | 「修复就绪」翻转（根因有证据 + 修法选定 + 修复判据写就）= 两票合一 + P1/P2 修理型修复的实施授权（D11 的带日期范围例外）；例外清单本仓化：P0 或触及入口链/门禁与验收合同/文档合同/pack 公共行为/已记录决定 → `等人拍板` |
| 状态生命周期（唯一家/镜像/守卫翻转/退出同变更/永不重开/合法回退） | 照搬 | 法则进入口手册；翻转表进两轨 README；frontmatter `status` = 阶段唯一家，状态行 `状态：` 记号镜像 + 拥有历史 |
| 枚举词汇 | 适配 | 中文人面：bugs `排查中/修复就绪/修复落地/等人拍板`；归档值 已结/叫停/已修/待修 保留；立卡时点零活跃 bug 卡，词汇切换零迁移成本 |
| 结论倾向闭集头 | 照搬（用户裁定③） | `未定/现在做/以后做/不做/并入已有`；出口语义本仓化（现在做→验收标准；以后做→触发条件；不做→理由范围；并入已有→链接），不承载「do-now 默认同轮落 RFC」 |
| agent 门牌 `_backlog/AGENTS.md` | 适配 | 本仓子树 AGENTS.md 惯例 + doc-budgets 登记（48 行）；根 AGENTS.md 布局行与「编辑这些指令」节同步点名 |
| 门禁镜像互查/枚举/倾向头 | 适配 | 既有 backlog-liveness 类内收紧（对方 ruling 1 的本仓投影：既有类加强 + 新族 promote-on-recurrence 缓） |
| 根因纪律（假设→证据；撤回留卡） | 照搬 | bugs 模板「根因（假设）」段 + 入口手册「缺陷修复通道」节 |
| severity 消费者 | 照搬 | P0 = 通道边界，永不自授权；bugs frontmatter 表声明 |
| 四门 do-now 默认同轮落 RFC | 不借 | 与 D12 冲突（RFC 非普遍前置）；出口语义走本仓关闭表 |
| 英文枚举/英文手册 | 不借 | 本仓人面中文、方法英文的既有分工 |
| 状态行 `next:` 字段 | 不借 | 「下一步」留卡体（本仓骨架既有） |
| `blocked` 状态 | 不借 | 平台 goal 机需要自报阻塞；读者消费的卡不需要，依赖写进 修复判据/下一步 |
| acceptance-presence 门禁族 | 缓 | under-pressure 登记（[evaluation §L0](../../docs/evaluation.md) 行）；重提条件 = 首张缺验收卡漏过门禁 |
| id-collision 门禁 | 不借 | promote-on-recurrence 哲学，未到复发门槛 |

取代关系：[2026-10-09 backlog 方法论吸收 Note](2026-10-09-backlog-methodology-absorption.md) 建立制度骨架（D19/D20），本篇在其上补显性化层——骨架决定全部维持，互链不取代。

## 输掉的方案

- **文档先行、门禁后补**：用户裁定全套一轮——新枚举在旧门禁眼里是红的，形状先拧巴一轮；「格式先行无门禁」正是借鉴源要修的病。
- **只立卡不动文档**（借鉴源当时的形态）：本仓用户直接授权落地，推敲轮没有要等的增量信息。
- **英文枚举直搬**：本仓 `_backlog` 人面中文（模板、归档值全中文），直搬造成一区内双语。
- **镜像互查立新门禁族**：既有 liveness 类内加强自带既有反证面（gates-smoke 案例表），新族走 promote-on-recurrence。
- **保留「活跃」作 bugs 枚举**：与手册自己的「活跃区」词汇相撞（对方同款理由）；零活跃卡时点切换免迁移。
- **镜像互查覆盖归档卡**：归档卡状态行是「原值 + 追加结论」的历史形态，互查会强迫重写历史正文——违反「位置即状态、正文不重写」铁律；门禁对归档卡豁免。

## 实际跑过的验证

2026-10-12 门禁收紧反证（注入真实回归 → `node scripts/verify/verify.mjs` 点名红 → 还原 → 绿；探针经 `git add` 入 tracked 面——门禁覆盖面 = git ls-files 驱动）：

- 探针① issues 结论倾向头越界（`结论倾向：尽快给个说法`）→ 红：`[backlog-liveness] _backlog/issues/2099-01-01-probe.md active status line needs 结论倾向 head: <未定|现在做|以后做|不做|并入已有> + 自由说明`；还原 → 绿。
- 探针② issues 镜像漂移（frontmatter `推敲中` / 状态行 `等人拍板`）→ 红：`[backlog-liveness] _backlog/issues/2099-01-01-probe.md status line must mirror frontmatter status (状态：推敲中；记号 = 等人拍板)`；还原 → 绿。
- 探针③ bugs 枚举越界（`status: 修复中`）→ 红：`[backlog-liveness] _backlog/bugs/BUG-998-probe.md invalid status for shelf`；还原 → 绿。
- 探针④ bugs 镜像漂移（frontmatter `排查中` / 状态行 `修复就绪`）→ 红：`[backlog-liveness] _backlog/bugs/BUG-997-probe.md status line must mirror frontmatter status (状态：排查中；记号 = 修复就绪)`；还原 → 绿。
- 还原后复查：backlog-liveness 无红，探针文件与索引行零残留（盘上与 git index 双查）。

常驻反证 = gates-smoke 案例表新增四形态注入（`backlog-issue-graduation-open` / `backlog-issue-mirror-drift` / `backlog-bug-enum-invalid` / `backlog-bug-mirror-drift`）+ `backlog-bug-severity` 案例与 `guard-red-record-active-bug` 正例改新枚举形态；契约测试 = `tests/contracts/backlog-liveness.test.mjs`（生命周期全值/镜像漂移/倾向头越界/闭集全值通过/归档豁免/🔒 记号不破坏镜像断言）。

全量收尾（2026-10-12）：`pnpm verify` 全绿；`pnpm test` 全绿；`node scripts/smoke/gates-smoke.mjs` 全绿（对照组零注入全 PASS + 注入案例均被点名报红）。

## 环境状态

`_backlog/` 制度面 = 入口手册（两张票/缺陷通道/生命周期法则）+ 两轨 README（翻转表）+ `_backlog/AGENTS.md` 门牌（doc-budgets 登记 48 行）；门禁 backlog-liveness 在既有类内收紧（枚举/镜像/倾向头），acceptance-presence 族 under-pressure。借鉴源钉版 `b43be87`（[00-index §外部研究材料](../../docs/00-index.md)）；上游再前进时按钉版纪律复核。
