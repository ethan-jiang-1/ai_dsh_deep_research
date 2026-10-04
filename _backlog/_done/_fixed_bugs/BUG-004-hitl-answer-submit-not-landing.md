# BUG-004：hitl-answer 点击提交不落地——"卡头消"与盘侧 answer 事件脱钩

> 严重级别：P1（重要——授权代驱通道在当前 UI 上失效，只能降级文本消息应答）｜发现：2026-10-04｜状态：活跃 — 已修复并活体确认 2026-10-05：确认 run（dr_deepseek-chat-price-check）HITL1 四问卡 answer 批 4/4 全 Recommended 落盘、HITL2 单题批落地、盘侧裁决 exit 0，回合推进零悬挂；进程收割 A/B 实证（探针起→收，通道连接数零残留）。修复后追加切片：verdict 改吃盘侧 answer 批内容（点击计数在预选/自动推进形态下不可作判据——实测点击 0 而批全 Recommended 的假红），全空批 = 把沉默当拍板不放行。

## 症状

`dev/hitl-answer.mjs` 对挂起 ask 卡执行选项点击 + 提交后，自报"卡头消——提交完成"，但
**盘侧会话日志无任何 answer 落地**（ask 的 tool/call 之后无 result、无 user/message），
工具自带的盘侧复核连续四次（HITL1 两卡 + HITL2 一卡三题）如实判"未真正提交"。均发生
于本 run（dr_agent-memory-landscape，0.2.0 timed ask 语义下）。

**第 5 例（2026-10-05，dr_open-weights-swebench-parity，ask 后约 1 分钟内 drive）**：
HITL1 三问卡，工具自报"共作答 1 题"＋"卡头消——提交完成"，盘侧复核如实判仍挂起——
**600s 窗口内同样复现**，"ask 创建 >600s 后才 drive"的原假设被证伪。

## 根因（2026-10-05 复盘改写——两层叠加，原"timed 超时污染"假设作废）

1. **多题卡启发式误判（直接根因）**：三问卡逐题渲染（pager 翻页），点选项自带
   auto-advance 翻到第 2 题；脚本的完成判据 `opts2 > 0 && !headerAlive()` 把"题头换成
   第 2 题"误读成"卡头消失＝已提交"——于是只答了 1/3 题就退出。**反证：同一张卡用
   CDP 逐题点满 3 题＋末题点 Submit（/tmp/answer-card.mjs 一次性驱动），answer 事件
   立即落盘、turn 恢复**——UI 提交路径本身是好的，坏的是"单题即交"的判读。
2. **浏览器进程泄漏（放大器）**：脚本 `finally { await browser.close() }` 后 Chrome
   子进程（含 websocket 连接）仍存活——CDP 驱动的 close 未杀干净进程树。僵尸 client
   持有连接，是第 5 例中宿主侧等待被孤儿化的前提之一（联动 BUG-005）。

## 复现

```sh
source dev/env.sh && node --import tsx/esm dev/hitl-answer.mjs --port 3083 --token <t>
# 挂起 ask 超 600s 后执行：报"提交完成"但盘侧复核判未提交（连续四次）
# 2026-10-05：ask 后 1 分钟内执行（窗口内）：多题卡只答第 1 题即自报完成（第 5 例）
```

（另：本脚本要求先 `source dev/env.sh` 定位 dev home，61 §3 的用法行没写——缺了会报
"找不到 research-workspace 会话组"；报错文本自带补救，属文档摩擦非缺陷。）

## 牵出的失败类

**"UI 观察判据 vs 盘侧事实"脱钩**类（与 BUG-003 同族的反向实例）：工具用 DOM 状态
（卡头消失）当提交证据，盘侧才是真相——watch-run 已立"事件形状非字符串 grep"的先例，
hitl-answer 的成功判据应同样以盘侧 answer 事件落地为准（工具内已有盘侧复核，但放在
事后且只警告不退出——应升级为裁决）。

## 修复关联

已落地（2026-10-05，TDD 红→绿，反证 = 注入旧启发式看红再还原）：

- **`scripts/lib/ask-drive.mjs`（新）**：驱动策略与裁决抽成纯函数——`nextDriveAction`
  （观察→动作；UI 形状永不判完成，Submit 可用 = 唯一提交动作）、`driveVerdict`
  （盘侧复核从警告升格 verdict：仍挂起/一题未答 = exit 1，遵循冒烟 verdict 契约）、
  `parseAskArgs`（盘侧 ask 形态判别，兼 BUG-005）；`tests/ask-drive.test.mjs` 11 例
  契约钉（含第 5 例现场形态回归钉：多题卡换题头 + Submit 禁用 → 必须继续点选项）。
- **`dev/hitl-answer.mjs` 重接**：逐题循环改策略驱动（弃"卡头消"判据，重渲染二次确认防
  瞬态误 abort）；驱动前打印盘侧计划（卡共 N 题 + timed/无限期形态）；DOM 原生点击
  （Playwright actionability 在问询卡上被挡死的既有实测）；盘侧裁决给退出码。
- **`scripts/lib/cdp-driver.mjs` 收割**：`detached` spawn + 进程组负 pid kill + await 退出
  （裸 `chrome.kill()` 只杀主进程，Helper 存活持 websocket 即僵尸——第 5 例放大器）；
  playwright 侧 `browser.close()` 后补 SIGKILL 兜底。
- 待办：下一场真 run 的 HITL 实测确认（多题卡全答满 + 盘侧 answer 落地）→ 归档
  `_fixed_bugs/`。
