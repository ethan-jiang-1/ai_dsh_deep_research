---
status: 排查中
severity: P2
opened: 2026-10-16
---

# BUG-031：hitl-answer 在长跑通道实例上"侧栏零 session 行"——组能展开但行不渲染，且无搜索兜底

> 状态：排查中 — 根因待定（已排除"组未展开"与"行被扫窗截断"两种假设，见证据）；
> **恢复路径已验证**：重启通道 + 新会话即可正常代答（本轮实测）。

## 症状

长跑（数小时、数千会话目录）的 run 通道实例上，`dev/hitl-answer.mjs` 报
「侧栏没有目标会话行」→ 如实停止；而目标会话**确实挂起在场**（盘侧谓词通过，任务确实在等答复）。

## 证据（2026-10-16 实测，drt_cn-moe-2026 的 HITL2 卡）

- 侧栏可见行样本只含**其它工作区**的会话，目标工作区（research-workspace）的 session 行一条没有；
- **假设①「组未展开」被排除**：探针直接点 `[data-row-key="workspace:eb5792d8…"]`（research-workspace 行，
  y=510、x=12、屏内）→ `aria-expanded` 由 `false` 变 **`true`**，但全表 `[data-row-key^="session:"]`
  计数**仍为 0**；11 个 workspace 组初始全是 `false`；
- **假设②「扫窗截断」被排除**：驱动新增的扫描上限行**未触发**（上限 300，未命中）；
- **无搜索兜底**：驱动未使用 UI 自带的 `input[placeholder="Search session names"]`；人工试填该框后
  workspace 行清空、`session:` 行仍 0（该实例上搜索也没救回来）；
- **恢复路径**：停掉该通道 → `bash dev/boot-run.sh` 起新实例 → 侧栏正常渲染 → 目标会话可打开并
  **代答一次成功**；同一张卡在旧实例上点 Submit 无效（ask 未落地）。

## 待查（根因）

- 是 DSH web 侧栏会话列表在该实例上**懒加载未解析 / 索引老化**，还是**渲染被某状态卡住**
  （需抓 web 侧日志与前端错误）；
- 若是前者，驱动侧可加"**组已展开却零 session 行**"这一特征判据，直接自报"疑通道实例老化，
  建议重启通道"，而不是笼统说"可能已归档/被终局化"——**当前文案在本次现场是误导的**（两条都不成立）。

## 修复判据（拟定）

1. 驱动能区分"组已展开却零 session 行"与"目标不在侧栏"，报错文案给出正确处置（重启通道 / 换新会话）；
2. 可选：侧栏搜索兜底（填 `Search session names` 定位目标行）作为第二路径；
3. 反证：在复现该状态的实例上先看旧文案（误导），改后同实例报出正确特征；并在正常实例上确认既有
   路径不受影响（`client-hitl-smoke` 回归 ALL PASS）。

## 参考

- 受影响工具：[dev/hitl-answer.mjs](../../dev/hitl-answer.mjs)（其侧栏扫描上限错因区分卡已结，见
  [settled 卡](../_archived/settled_issues/2026-10-15-hitl-answer-and-test-surface-hardening.md)）；
- 操作手册的恢复路径正本：[guides/61 §5](../../docs/guides/61-run-playbook.md)。
