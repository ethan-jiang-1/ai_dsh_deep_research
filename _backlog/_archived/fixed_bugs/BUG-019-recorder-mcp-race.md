---
status: 已修
severity: P2
opened: 2026-10-10
---

# BUG-019：录制器 MCP 竞态——不等 MCP server 就绪即发探针，fixture 工具表随机缺 MCP 组

> 严重级别：P2（次要）｜发现：2026-10-10｜状态：已修 2026-10-10：写盘前 MCP 组谓词 +
> 有界重试（commit 94264cd）——宿主 stdout/logs/web.log 实证无就绪信号可等，产出件谓词
> 替代时序运气；mirror 无 mcp 行（MCP_PLAYWRIGHT=0）形态谓词跳过；顺带修 fail 路径孤儿
> 进程（fatal 一律 throw，cleanup 必达）。验收 = 连续 3 次重录全含 MCP 组（实录 3/3，
> marker ×2 each）+ keyless 守卫 tests/replay-fixtures.test.mjs（负例留证内嵌）。

## 症状

同一录制器、同一 boot 形态（`--profile research`，mirror 带 mcp-playwright 行），录出的
fixture 工具表在「含 MCP 组」与「不含」之间随机：

- 2026-10-10 四连录：scout / analyst / critic 三件含 `list_mcp_resources`（×2），lead 首录
  为 0——replay 侧组装（同 mirror，必含 MCP）B·persona / B·headers 遂红；同日 lead 第 2 次
  录制即含 MCP ×2（竞态落对），回放转绿。
- 旧 lead fixture（2026-10-09 录）含 MCP ×2——历史上也赢过竞态，带病潜伏至本轮 handbook
  变更触发重录才现形。

## 根因（假设）

录制器 spawn research profile 后随即建会话发探针；MCP server 经 npx 冷启动连接晚于首回合
请求组装 → 该请求的工具表缺 MCP 组、系统提示缺 `## MCP resource servers` 节。是否命中 ≈
机器时序骰子（本轮实录 6 录 4 赢 2 输）。

## 复现

`source dev/env.sh` 后连续重录 lead，`grep -c list_mcp_resources` 计数波动（本轮实录 0→0→2）。

## 牵出的失败类

「仪器对准目标，不对准跑者」同族：录制仪器对**异步就绪子依赖**（MCP server）没有显式等待
——单次录制通过的 fixture 可能是竞态输家，直到回放对账才现形；且 fixture 是否含 MCP 组
会改变 B 层比对基线，属静默失效形态。

## 修复关联

落地 = commit 94264cd（dev/record-role-fixture.mjs 重构：每次尝试独立 boot/cleanup + 写盘前
MCP 组谓词 + MAX_ATTEMPTS=3 有界重试 + 连续落败 fail-loud 带处置入口；mirror 无 mcp 行时
谓词跳过；顺带修 fail 路径孤儿进程）。卡内『等日志信号』候选实证不可行（捕获 boot 30s 零
mcp 行），落点 = 第二候选『盘侧谓词』。守卫 = tests/replay-fixtures.test.mjs（负例留证内嵌：
剥 marker 红 → 还原绿）。验收实录 = 3/3 连续重录全含 MCP 组 + snapshot-replay-smoke
ALL PASS（重录后 lead 金标准按设计 --update-expected + 人审）。
