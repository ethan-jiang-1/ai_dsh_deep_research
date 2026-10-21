# 历史会话回放（session-replay）：反馈通路的事后半边

> 状态：implemented

`scene-capture` 只能抓"当场"，`snapshot-replay` 回放的是录制好的固定语料；"三天前那场 run 的页面当时/现在到底是什么样"此前没有一条命令能回答。本条目补这一角：任意历史会话 → 真实 UI 重开 → 场景包。

## 决定

- **薄编排，不做 session→llm-replay 转换**：回放要的是"能看"，不是"确定性回归"。转换是另一个目的、高一个量级成本，且依赖 vendor 内部格式。
- **会话 → 工作区靠首事件 `cwd`**（v4 实测），不猜目录名编码（组名把 `/` 编码成 `-`，解码有歧义）。未登记工作区的会话先 `workspace/create` 登记——**技术前置已验证通**（登记后侧栏可列、按 id 可开，`via=sweep`）。
- **定位判据住纯函数**（`lib/session-replay.mjs`）：id 全名优先、标题歧义如实报候选、坏日志不参与标题匹配。理由：会话多（dev home 现 1600+）时静默选错人 = 造一个新的假现场。
- **`--open-status` 让驾驶舱入镜**：默认只开会话正文；带该 flag 时展开右栏并打开「研究状态」页签（复用 `probe-status-tab.pickStatusTab` 纯函数）。观察面是"页签显示错了"类症状的现场，必须可选入镜。
- **诚实边界写进三处**（工具头注 / 判读行 / project-map 与 guides 路由）：渲染 = 「现在的客户端代码 + 当年的会话数据」，**不是像素级复现**；当年的浏览器 console 已不可得。不写清 = 下一个 agent 会把"重放没复现"误读成"bug 已修"。
- **verdict 契约**：0 已捕获 / 1 打开或捕获失败（页面仍抓）/ 2 前置缺席（未 source、无会话根、会话不存在、歧义、vendor 产物缺失）。歧义时打印候选并 exit 2，不替人挑。

## 输掉的方案

- **session → llm-replay fixture 转换**：能拿到确定性回归，但需要把日志事件映射成 canned 响应、并绑定 vendor 回放协议版本；为"看一眼"付这个成本不值。
- **像素级复现**：技术上不可能（客户端代码已变）；声称能复现就是不诚实记账。
- **默认走 research profile（run 通道）渲染**：更贴近当年组合，但每次要装/校验 profile，重；改为缺省源码域 overlay（当前 dev 客户端代码）+ `--url` 复用已起通道。
- **标题匹配用前缀**：实测会漏（"Anthropic Claude 模型发布线追踪"里查"模型发布"就漏），子串才对；sabotage 前缀版 3 个用例红。
- **歧义时取第一个**：正是 `findGroup` 取首个命中的同款风险（smoke 组前缀重名时读错组），已有实证代价。

## 实际跑过的验证

- **keyless 契约测试** 8 条（`tests/run/session-replay.test.mjs`，先红后绿）：模块缺席红 → 实现绿；sabotage ×2（歧义改成取首个 → 1 红；子串改前缀 → 3 红）→ 还原 8/8。
- **实走 3 次真会话 + 3 个场景包**（keyless，起一次性通道 3117）：
  1. `session-d47bf789…`（research-workspace 组，"Anthropic Claude 模型发布线追踪"）→ 已捕获 174790B；读回页面 = 标题 + Agent Team/Deep Research Lead 徽标 + Chat/Trajectory + **HITL1 选项卡完整渲染**（三选项 / 1/4 / Skip·Next）。
  2. `session-7a10b535…`（`cdp-ask-1792545383930` smoke 组）→ 已捕获 174927B（跨组可用）。
  3. 同 1 加 `--open-status` → 右栏「研究状态」入镜（命中方式 `guide-entry`），可见立项对齐横幅与检索行。
- 场景包读回：`scene-capture --show replay-2026-10-21T01-35-40-966Z` 正常（五件套齐）。
- 机械面：`pnpm verify` 全绿；`pnpm test` 605/605（597 + 8）；`gates-smoke` 全绿。

## 环境状态

- **实走中发现一处真实渲染症状（本轮不修，留证据）**：1280×720 下打开右栏研究状态后，会话列被压窄，HITL 卡呈**一字一行竖排**（截图 `runtime/scenes/replay-cockpit-demo/page.png`）。同一会话不展开右栏时卡片正常（`replay-2026-10-21T01-35-40-966Z`）。判断：属 vendor 右栏宽度与聊天列最小宽度的挤压，不是驾驶舱 tab 自身；是否建档 = 待用户定（涉及 vendor 面，本仓只读）。
- 端口 3117 自持有，用完释放；每次实走在 `runtime/scenes/replay-*` 留一个场景包（gitignored）。
