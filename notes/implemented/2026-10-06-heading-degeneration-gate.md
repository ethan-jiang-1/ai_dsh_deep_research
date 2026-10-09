# final.md 标题重复机械门禁（node-gate 门R）——oss-dr 借鉴 A1 落地

> 状态：implemented

出处 = [_done/_closed_plans/2026-10-06-oss-dr-lessons.md](../../_backlog/_archived/settled_issues/2026-10-06-oss-dr-lessons.md)
候选 A1（用户 2026-10-06 点名提前激活，走完取题→实施→验收→毕业闭环）；机制出处 =
local-deep-research `HeadingRepetitionGuard`（事故 #6452，材料 =
[_done/_reference/oss-dr-mining/2026-10-06-oss-dr-arch-mining.md](../../_backlog/_archived/research/oss-dr-mining/2026-10-06-oss-dr-arch-mining.md) §3c）。

## 决定

node-gate 新增**门R（标题重复退化门）**：run 根 `final.md`（当前版）中 verbatim 标题行
（`#{1,6}` 前缀、去尾白后整行比对）同一标题出现 **≥4 次 → RED**；断代契约日 = **2026-10-06**（`HEADING_CONTRACT_DATE`），此前交付的 bundle
PRE-CONTRACT 如实报告不计红（门L/门④ 断代成例同构）。

- **阈值 4 的依据**：LDR 判据原文 "a legitimate subsection does not emit one identical
  `### Heading` four times"——合法小节不会逐字重发四遍；×3 是合法下界之外（测试边界钉住
  ×3 PASS / ×4 RED）；
- **门不防什么**（bound on the reported failure，LDR docstring 诚实声明同款）：近似改写
  标题、正文循环、无标题退化不防；代码围栏内的 `#` 行计入比对（final.md 罕见围栏标题，
  误报面可忽略）；
- **落点 = node-gate 判据级，非 schema-scan 在场级**：schema-scan 缺省全量扫归档 bundle，
  新断言会追溯拦红历史交付（违反"run bundle 是交付记录不改历史"）；node-gate 有 per-gate
  契约日成例（门L/门④/门①）+ 交付时点语义（HITL2 拍板前操作侧跑门）；
- **本仓无事故实证也立门的理由**：与 floor 教训（数值未标定是假牙齿）不冲突——本门判据
  是零参数的 verbatim 计数（无标定面）；红灯成本 = 收口去重，误报面近零；用户点名提前
  即复活条件已满足。

## 输掉的方案

- **schema-scan 在场级断言**（候选 A1 原表述）：全量归档扫描会追溯红历史 bundle，需另造
  per-check 断代机制——node-gate 已有成例，成本更低语义更准；
- **阈值 3**：合法复用风险（同级小节合法重名的上界取证不足），且 LDR 判据就是 4；
- **进 evidence-audit**：那是对账溯源面（URL/摘录/final 链），生成退化是内容形态面，混门
  会让失败归因变糊；
- **只借 LDR 代码**：其守的是流式输出截断（runtime 面），本仓交付物是 final.md 文件——
  只借判据（verbatim ≥4）与"局限诚实声明"文风，不借实现。

## 验证

- 反证先红后绿：`tests/node-gate.test.mjs` 门R 六断言（RED / ×3 边界 PASS / 合规 PASS /
  PRE-CONTRACT 断代 / N/A 无对象 / 隔离不连坐）+ 夹具 `fixture-heading-{degenerate,healthy}`；
  门未立时导入即红（6 fail 实录），立后 222/222 绿；
- 注入回归（真 bundle）：`drt_geometry-coaching` 副本注入同标题 ×4 → 门R RED（原始输出：
  `"实证结论" ×4`），探针副本用后即删；
- 追溯面复查：归档 bundle 全量复跑门R 零新红（geometry-coaching 实拍 PASS："标题 11 条，
  无同一标题 ≥4 次重复"）——断代生效，历史不追溯；
- 同 diff 同步面：scripts/README 花名册、NODES.md 门图例、61 §4 拍板前跑门清单、
  pack workspace 种子重同步（pack-workspace-fresh 绿）。
