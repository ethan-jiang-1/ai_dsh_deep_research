# keyless 录制快照面（输出快照级回归）——已交付

> 状态：implemented
> 归档：2026-10-24

> 部分取代（2026-10-09）：本文拥有回放通道选型（keyless、禁真 LLM、插 llm-replay）与三层判据的
> 立项理由；"场景声明住 `snapshot.yml`、夹具落 `tests/fixtures/`"的部分已由
> [snapshots 采纳 Note](../implemented/2026-10-09-snapshots-adoption.md) 取代（声明正本迁 `snapshots/replay/research-face/snapshot.json`，
> B 层比对面扩大）。

2026-09-24 立项（当日搁置）、2026-09-27 复活（频率条件实质到达：单日 6+ 次模型可见文本变更
各耗真模型档验证）并交付。先例 = vendor `snapshots/web/web-search-round/`。

## 决定

**窄带钉法**：只钉研究工具面（spawn_teammate / web_search / team_task_* / ask_user_question /
present）的会话流 + 观察面渲染，不整代快照。四件套（形状照 vendor 先例）：

1. **`tests/fixtures/snapshot-research-face/session.v1.jsonl`**——50 事件最小探针会话
   （web_search ×3 含上游故障形态 + web_fetch ×1）；挥发性身份 tokenize：system-reminder 里的
   40 位 vendor 构建戳 → `<token:volatile-commit-…>`（pin-agreement 门禁对 fixture 豁免——
   录制流含构建身份属正常，钉死会与每次重录打架）；GUI 端口在 diff 侧双侧 tokenize；
2. **`snapshot.yml`**——`profile: research` + `sessionFormat: {version: 4, coverage:
   [retired-tools]}`：22 个工具 schema（含研究面五件）钉在当前 format 版本——工具日后退役
   本场景仍可回放（vendor snapshots/AGENTS.md 机制）；声明后 record/refresh 不改写 fixture，
   有意变更 = 新一代 `session.vN.jsonl` + 人审；
3. **`ui.expected.md`**——渲染金标准：研究语义卡标题（web_search ×3）+ 研究状态页签活动行
   （🔍 ×3 + 💬 ×2）；`--update-expected` 从真实回放渲染重写，比较逐字；窄带不钉工具结果体/
   时间戳/bundle 渐进面（依赖工作区态，非录制流）；
4. **`scripts/snapshot-replay-smoke.mjs`**——三层判据（各自独立报告、各自带红证）：
   - **A 回放通路**：零真模型调用完整回放，收尾文本逐字命中；只认**本次 boot 之后新写**的
     会话日志（mtime 过滤——否则第二跑起命中上一跑旧日志假绿）；
   - **B 组装请求 diff**：回放会话持久化日志的 `system/message`（persona 全文）与
     `request/header`（provider/model + 全量工具 schema）对 fixture 逐字比对——persona/skill/
     工具行等**模型可见文本**变化在此 keyless 红（机制边界：canned 响应不随 persona 变化，
     A 层抓不到——这正是 B 层存在的理由）；config 只钉 provider/model（maxTokens/
     reasoningEffort 是会话调节值：录制显式 high、回放默认，合法不同）；
   - **C 渲染金标准**：Playwright DOM 行走提取卡片标题 + 活动行（textContent——innerText
     行过滤被 flex 块级化拆行打败），虚拟化窗口用滚动扫掠兜底。

**实施期两个机制发现**（全部红绿实证，均已成为本 lane 的战果）：

- **title LLM 偷吃脚本位**：`session-title-first-prompt-llm` 也是一条 llm/stream 调用，按
  first-call 序与用户回合交错消耗回放脚本位（实测：title 拿走第 2 个 settlement，3 次搜索只
  回放 2 次、日志少一个 step）——回放 patch 必须显式 `- id: session-title-llm / disabled: true`
  （vendor 场景用 headless 档无 title LLM，从未踩过）；title 走 fallback，金标准本就不钉标题
  （侧栏定位靠 rename 唯一标题）。
- **web_search wire 形状 = `queries` 数组**（vendor `packages/web/tool-web/src/search.ts`
  schema 权威）：观察面折算旧代码读 `query` 单串——真实 web_search 卡从未显示过查询词、🔍
  活动行从未出行（连单测也用假形状与错代码互证）。已修 `tool-card.ts` + `activity-fold.ts`
  + 单测改真实形状 + 补 tool-card 测试欠账；client 面重建后冒烟实证卡标题带查询词。

## 输掉的方案

- **E1 时随解析依赖引入**：E1 事故本身（`cannot resolve active package`）——快照二包只作
  devDependency 解析物，绝不进 runtime 依赖（vendor-links 门禁把守）；
- **整代 session 快照**：押后至 retired-tools 窄带钉法出现——本 lane 即以窄带落地；
- **整日志 diff**：回放日志与录制日志在工具结果/时间戳/session id 上必然不同——窄化到
  system/message + request/header 两个模型可见面；
- **innerText 行过滤提取渲染面**：flex 块级化把 icon 与文本拆成两行、折叠容器排除文本、
  虚拟化窗口缺节点——三重打败，改 DOM 行走 textContent + 滚动扫掠；
- **config 全量比对**：reasoningEffort/maxTokens 是会话调节值非模型可见文本；
- **ui.expected 钉整页文本**：卡片/活动行之外的正文依赖工作区态与实时工具结果。

## 实际跑过的验证（2026-09-27）

- **回放 keyless 绿**：`node scripts/snapshot-replay-smoke.mjs` ALL PASS 多轮（A + B1 persona
  7596 字逐字 + B2 22 工具 schema + C 3 卡 5 行；比较档与 `--update-expected` 档各验过）；
- **红证 ×3**（各层独立归因，其余层保持绿，fixture 为 tracked 文件可精确还原）：
  A：fixture 收尾文本「探针完成」→「探针未完成」→ A 红（240s 超时如实报）→ 还原绿；
  B1：fixture persona「主编」→「大主编」→ B1 红（首个差异 @72）→ 还原绿；
  C5：fixture 第 2 条查询词加后缀（须 `/g`——sed 不带 g 只改每行首个命中，block-end 在次处）
  → C5 红（金标准 diff @296）→ 还原绿；
- **连带面闭环**：client-load-smoke 渐进面三断言红（位置=状态后工作区根无 bundle）→ 改为
  自造临时活动 bundle（验完即删）→ ALL PASS；安装域 profile 镜像不随源码重建传导 → 走
  boot-run.sh 官方重建（rm profile + 重跑，漂移检测把守）后修复生效；
- **L0**：`pnpm verify` 全绿（含 vendor-links = 依赖面零污染）· `pnpm test` 66/66（+8：
  tool-card 真实形状断言与 activity-fold queries 形态）。

## 环境状态

- 冒烟端口 3103（preset-smoke 3099 / l4-lite 3101 各自独占）；run 通道 3081 已随 profile 重建
  复活（token 在 `dev/smoke-workspace/web.log`）；
- 改 persona/skill/手册文本的**keyless 秒级信号** = 本冒烟 B 层；有意变更的流程 = 新一代
  fixture + `--update-expected` 重写金标准 + 人审；行为证据仍是 L4-lite 真模型档
  （no-key 证管道 / with-key 证 agent，不互抵）；
- 回放会话在 dev home 逐次累积（同名唯一标题定位不受影响——侧栏按 newest 优先命中本次）。
