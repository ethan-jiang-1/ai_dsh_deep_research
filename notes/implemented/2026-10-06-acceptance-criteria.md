# subagent 收活 acceptance_criteria 纪律（DeerFlow 四件套唯一有落点成分）落地

> 状态：implemented

出处 = [_done/_closed_plans/2026-10-06-oss-dr-lessons.md](../../_backlog/_done/_closed_plans/2026-10-06-oss-dr-lessons.md)
（用户 ongoing goal 2026-10-06 点名提前激活，A2 毕业后同 goal 顺带推进）；下钻依据 =
[_done/_reference/oss-dr-mining/2026-10-06-oss-dr-followups.md](../../_backlog/_done/_reference/oss-dr-mining/2026-10-06-oss-dr-followups.md)
（DeerFlow 5 PR 逐个下钻：acceptance_criteria = 父侧 1,396 行纯函数零 LLM 核查 + UNVERIFIED
永不静默放行）。

## 决定

收活侧纪律显式化，两处同 diff（纪律级，不立机械门）：

1. **NODES.md 输入侧规矩**新增「委派-收活同构」：lead 派工的验收判据（team-assembly 派发
   五件③④）收活时逐条机械核验；判不了的判据显式标 **UNVERIFIED**（第三态：不是 PASS 也不
   是 FAIL，交 critic 狩猎或人工核），**永不静默放行**；收活结论（哪条 PASS/哪条
   UNVERIFIED）随关单/journal 记账；
2. **lead skill**（team-assembly）新增「收活验收」节：判据落在文件上的打开文件核、**不信
   teammate 自报**——既有"收'补完'只认文件事实"（补搜特例）推广到全部派发；当场核不了的
   （外部状态/模型判断/拿不到的材料）→ UNVERIFIED + 为什么判不了。

词汇取自 DeerFlow（checked/holds/UNVERIFIED 分层、禁用 verified/passed 的诚实口径——本仓
采纳第三态与"判不了要说明"两点）。

## 输掉的方案

- **机械门禁判收活**：委派判据是每任务动态的散文清单，机械判 = 会漂移的假牙齿（同 A2
  取舍）；bundle 级机械面已有 node-gate/evidence-audit 把守，委派级留纪律；
- **receipt/bounded ledger/tamper-evidence 整套移植**：宿主 runtime 面机制（wrap_tool_call
  中间件、运行时所有权盖戳），DSH 插件层无插桩面且会话日志已 event-sourced，重建违
  "循 DSH 而不发明"；
- **只改 NODES 不改 skill**：收活的执行者是 lead，skill 才是开工时读的操作文本——合同与
  操作面分离会让纪律停在纸面。

## 验证

- `pnpm verify` 全绿（含 pack-workspace-fresh 种子重同步对账）；
- **真模型档**：`l4-lite-smoke` ALL PASS（四角色 assistant 响应 + scout web_search 工具
  调用——lead 携收活验收节的 skill 真挂载、真响应）；
- 毕业形态：RFC 由 proposed/ 改写迁 implemented/ + 队列行删除（queue 回 parked）。
