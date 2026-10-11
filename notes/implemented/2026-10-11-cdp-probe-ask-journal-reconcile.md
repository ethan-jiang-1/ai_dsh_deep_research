# cdp-probe `--ask`：送达判据改为会话日志落盘对账

> 状态：implemented

## 决定

`cdp-probe --ask` 的**送达判据**从「点击发送按钮 + 等 UI 出现回复」改为**对账会话日志**：发送后在会话
日志里找**本条** `user/message`（时间下界 = 点击时刻），命中才算送达。UI 回复等待降为次信号（模型是否
应答），不再充当送达。三层机制各一处落点：

- **入口选择器**：composer 用稳定钩子 `[data-composer-input]`（页内唯一 contenteditable 的稳定属性），
  不再依赖哈希类名。
- **提交按钮**：显式匹配 **send 家族六个标签**——`Send message`／`Queue message`／`Steer message`
  ＋中文 `发送消息`／`排队发送`／`插话发送`（vendor `ui-conversation` locales 的 `input.send*` 族），
  并**对 stop 家族设防**（`Stop generating`／`停止生成`）。理由：同一位置的主按钮是**状态机**——空闲
  = send；running 且非挂起 = queue/steer；running 且（草稿为空 **或** 有挂起交互）= **stop**。
  「抓 composer 区最后一个按钮」这类懒修法会点到 stop，**掐断在飞 turn**。
- **判据本体**：纯函数 `reconcileInjectedMessage`（`scripts/lib/inject-reconcile.mjs`）——只认
  `user/message`、带时间下界（防上一次同文注入假阳）、空 text 显式拒绝（`includes('')` 恒真的坑）。
  消费方 = 探针（取日志）与 keyless 契约测试（用例即负例留证）。

**fail-loud 四态分报**（旧版一律报「未见模型回复」，把真因盖住，是 BUG-021「静默失效」的直接来源）：
`sent != sent`（没发出去，附候选标签与 stop 在场证据）／`session-mismatch`（页面前台会话 ≠
`--session` 指定——消息可能进了另一个会话）／`not-landed`（日志可读但时间窗内无此消息）／
`log-unreadable`（在飞写入尾帧不完整，fail-closed）。会话 id 缺省从页面 `[data-conversation-session]`
自动读，不把正确性压在调用方传参上。

## 输掉的方案

- **只把 `includes('Send')` 补成中文与 queue 标签字符串**：仍是字符串黑名单，UI 多一个状态就再坏一次
  （steer 态已经存在）；改成「家族匹配 + stop 拒绝」才把状态机整体覆盖。
- **抓 composer 区最后一个按钮当提交**：会点到 `Stop generating`——挂起态实测该位置**只有 stop**，
  点了就是掐断在飞 turn（比发不出去更坏）。E2E 阶段②的红色现场已证实。
- **保留「UI 出现回复」当送达判据**：UI 增长既可能来自别的会话（E2E 实测：消息进了旧同名会话，而
  被盯的会话里根本没有它），也依赖模型应答速度；日志才是「model-visible ⟺ logged」的权威落点。
- **用 `seq` 单调或文件 mtime 当「本次」判据**：`seq` 在通道重启/多会话下不保证可比；mtime 只说明
  有人写过。时间下界 + 逐字匹配才可解释。
- **强制作业方传 `--session`**：把正确性压在人的记性上；改为页面自动探测，`--session` 只作覆盖。
- **照抄 evidence-audit 的「外来 DSH_HOME 自拒」**：那儿误审会判出假 CRITICAL，代价量级不同；探针用错
  会话根只报 `session-log-not-found`——可见、fail-loud，不静默给绿，故不自拒（用哪个根进 verdict）。

## 实际跑过的验证

- **keyless 契约测试**（`tests/inject-reconcile.test.mjs`，7 用例）先红后绿；**四路反证注入**各看红一次
  再还原：①恒 `landed:true` → 4 红；②丢时间下界 → 1 红；③只扫末条事件 → 1 红；④类型过滤失效 → 1 红；
  还原后 7/7 绿。
- **真模型两阶段 E2E**（一次性通道 3115 + 独立 workspace，运行态驱动 `runtime/e2e-ask-probe.mjs`；
  刻意不打在交付会话上）**全绿**：①空闲态 `sentBy=Send message` + `landed=true`（seq 9）+ 自动探测的
  会话 id 与建会话 id 一致；②在飞态（子代理挂着）`sentBy=Queue message` + `landed=true`（seq 54）——
  **这正是生产现场旧探针构造性零命中的形态**；阶段② `answered=false` 而 `landed=true`，失败信息如实
  分报「已落盘但未见回复」。
- **Stop 陷阱实测**：阶段②曾以「挂起交互」造在飞态，实测该位置 `send 家族候选=[]`、`stop 家族在场=
  ["Stop generating"]`——探针报 `no-send-button` 且**未点击**，没有掐断任何 turn。
- **L0**：`pnpm verify` 全绿、`pnpm test` 360/360（含新增 7 用例）；新 lib 模块已登记
  [scripts/README.md](../../scripts/README.md) 职责索引（navigability 门禁要求）。

事故卡与修复关联：[BUG-021](../../_backlog/_archived/fixed_bugs/BUG-021-cdp-probe-ask-send-fail.md)。
