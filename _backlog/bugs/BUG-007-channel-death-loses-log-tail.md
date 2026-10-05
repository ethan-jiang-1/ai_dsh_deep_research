# BUG-007：通道死亡丢会话日志尾部——SIGTERM 后未落盘缓冲蒸发，settled run 回变成"挂起未答"假态

> 严重级别：P1（重要——"文件即真相"合同（D17/61 §5）对 bundle 文件成立、对会话日志**不成立**：审计链与交互谓词的地基丢数据）｜发现：2026-10-05（系统探针 C：杀通道重启实测）｜状态：活跃

## 症状

探针 C 把在飞 run 的通道 `job_kill`（SIGTERM → boot-run trap → web 子进程）：

- `session-21d5df52`（probe B lead，claude-context-window run）日志从 **303 事件缩水回 158**：
  死亡前 15 分钟的全部事件（研究段、HITL2 问卡 `call_00_G84YF5kD…`、其应答、final 落盘、
  present 声明、turn 终结）从日志**消失**——`callId` 在日志中 grep 不到、`turn/end` 计数 0。
  这些事件此前逐条实读验证过在盘（HITL2 卡就是从这个文件里抠出来的）。
- 同期被杀的另一会话（recovery lead bfc503ff，560 事件含 present）**完整存活**——丢失是
  非确定性的（缓冲状态竞态），不是确定性截断。
- **下游假态**：日志尾部回退后，hitl-fold 把已 settled 的 run 重新折叠成"挂起未答"
  （hitlPending=true、present=0）——watch-run/代答工具的盘侧谓词全部被假象带偏
  （本本轮实录：hitl-answer 重跑时谓词误指向该会话）。

## 根因（假设）

会话日志（v4 zstd 多帧拼接）的持久化是**批缓冲**而非逐事件落盘（95 帧 ≈ 158 事件 ≈
1.7 事件/帧，且死亡时最后 ~145 事件在缓冲中蒸发）——SIGTERM 路径没有"清缓冲再退出"的
finalizer，或 finalizer 只清了部分。vendor 宿主侧 durability 缺口；"文件即真相"的实测
（web 死 2 小时 bundle 零损失）只覆盖了 bundle 文件（lead 的 fs 写入），没覆盖会话日志。

## 复现

```sh
# 起一个 run → 等 lead 研究到中途（事件数 N1，盘侧可 grep 的标志事件就位）
# job_kill 通道（SIGTERM）→ 重启 → 重读同一会话日志：
#   事件数 < N1，死亡窗口内的事件（含 ask/result/present）消失
# 对照：另一同期会话可能完整——丢失随缓冲状态竞态
```

## 修复方向

- **vendor（正修，上游 seam）**：会话日志逐帧（或逐 turn）flush + SIGTERM finalizer 清
  缓冲；至少 turn 边界（turn/end、session/end-seed）强制落盘——回合边界是恢复语义的
  天然锚点。
- **本仓（观测面自救）**：watch-run/仪表盘增"事件数回退"检测（同会话事件数在无新写入
  前提下变小 = 日志损坏，大声报）——当前所有盘侧谓词都默认日志单调，回退即假象。
- **操作纪律**：61 §5 恢复节的"文件即真相"表述需限定——bundle 文件零损失成立，会话
  日志尾部在通道死亡时**不保证**；跨会话取证（session_search）的结论要意识到日志可能
  被截断。

## 牵出的失败类

**"盘侧 = 真相"的前提是盘侧完整**——本仓全套盘侧谓词（watch-run / hitl-answer /
node-gate 门② / evidence-audit）都建立在会话日志之上，日志丢尾 = 所有谓词的地基晃动。
本轮实录的连锁：settled run 回变挂起态 → 代答工具误定向。与 BUG-006 同族（盘侧可判而
无人判），但更底层：这次是盘侧自己不完整。
