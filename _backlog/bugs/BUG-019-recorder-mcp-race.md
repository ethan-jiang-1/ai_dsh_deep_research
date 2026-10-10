---
status: 活跃
severity: P2
opened: 2026-10-10
---

# BUG-019：录制器 MCP 竞态——不等 MCP server 就绪即发探针，fixture 工具表随机缺 MCP 组

> 严重级别：P2（次要）｜发现：2026-10-10｜状态：活跃

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

候选 = 发探针前等**显式就绪信号**（web 日志的 MCP 连接线，或首列工具表含 mcp 组的盘侧
谓词），替代时序运气——修法对齐 scripts/AGENTS「等待显式状态」；修复义务 = 修后连续重录
N 次全含 MCP 组 + 本卡关闭。本轮临时处置 = 重录至竞态落对（已入库存件），判据不受影响。
