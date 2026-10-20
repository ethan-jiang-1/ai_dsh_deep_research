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

**两层分工（2026-10-11 收口）**：DOM 规则的**判定**与**访问**分家——页面只读按钮表与 composer 坐标、
并按索引执行点击；「选谁 / 拒点」住纯函数 `scripts/lib/probe-send-target.mjs`（send 家族六标签 +
**stop 家族拒点** + composer 邻近窗 + `stop-only`/`no-send-family`/`empty` 分因）。原先这两条规则只活在
页面 `evaluate()` 字符串里，唯一证据是一次性 harness；分家后由 keyless 测试常驻钉住。
真 UI 上的端到端证据同时转正为**登记制真模型档 smoke** `scripts/smoke/cdp-ask-smoke.mjs`
（认领端口 3115 + `smoke-contract` closed set + `$DSH_HOME/.credentials.yaml` 预检 exit 2 +
verdict 契约 0/1/2）：两阶段 = 空闲态 `Send message` 发出并落盘（硬判）、在飞态 `Queue message`
标签命中（硬判；**该阶段不硬判落盘**——排队消息由服务端在 turn 取用时才写日志，时机可能远超探针
轮询窗，实测同代码两跑一 landed 一 not-landed；「发出 → 落盘」整条链由空闲态阶段硬证）。

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

- **keyless 契约测试**（`tests/run/inject-reconcile.test.mjs`，7 用例）先红后绿；**四路反证注入**各看红一次
  再还原：①恒 `landed:true` → 4 红；②丢时间下界 → 1 红；③只扫末条事件 → 1 红；④类型过滤失效 → 1 红；
  还原后 7/7 绿。
- **真模型两阶段 E2E**（一次性通道 3115 + 独立 workspace；刻意不打在交付会话上；该驱动已转正为 `scripts/smoke/cdp-ask-smoke.mjs`）**全绿**：①空闲态 `sentBy=Send message` + `landed=true`（seq 9）+ 自动探测的
  会话 id 与建会话 id 一致；②在飞态（子代理挂着）`sentBy=Queue message` + `landed=true`（seq 54）——
  **这正是生产现场旧探针构造性零命中的形态**；阶段② `answered=false` 而 `landed=true`，失败信息如实
  分报「已落盘但未见回复」。
- **Stop 陷阱实测**：阶段②曾以「挂起交互」造在飞态，实测该位置 `send 家族候选=[]`、`stop 家族在场=
  ["Stop generating"]`——探针报 `no-send-button` 且**未点击**，没有掐断任何 turn。
- **L0**：`pnpm verify` 全绿、`pnpm test` 360/360（含新增 7 用例）；新 lib 模块已登记
  [scripts/README.md](../../scripts/README.md) 职责索引（navigability 门禁要求）。

事故卡与修复关联：[BUG-021](../../_backlog/_archived/fixed_bugs/BUG-021-cdp-probe-ask-send-fail.md)。

- **判定纯函数化后**（2026-10-11）：`tests/run/probe-send-target.test.mjs` 9 用例（空闲／在飞／插话＋中文三态／
  **挂起态拒点**／邻近窗／无 send 家族／空表防空语料／composerY 读数失败退化）；三路反证注入各看红一次
  （删 stop 拒点 → 2 红、去邻近窗 → 1 红、删空表守卫 → 1 红）。
- **登记 smoke 首跑**：`node scripts/smoke/cdp-ask-smoke.mjs` **ALL PASS**（空闲态发出 + 落盘、在飞态
  `Queue message` 标签命中、对账目标 = 建会话 id）；阶段② 落盘按上文口径记为信息项。
- **措辞契约**：`tests/pack/presets.test.mjs` 加两条断言钉住 research-brief 的字数口径与「呈卡前先数字数」
  （删该句 → 红 → 还原绿），与 node-gate 门① 的 WARN 记账同源。
