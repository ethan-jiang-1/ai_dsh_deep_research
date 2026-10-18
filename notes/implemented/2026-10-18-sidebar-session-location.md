# 会话定位：侧栏懒渲染下的搜索兜底 + 按 id 显式定位（BUG-034/035 闭环）

> 状态：implemented

出处 = [BUG-034](../../_backlog/_archived/fixed_bugs/BUG-034-client-load-smoke-selftest-capsule-intermittent.md)
与 [BUG-035](../../_backlog/_archived/fixed_bugs/BUG-035-hitl-answer-sidebar-session-invisible.md)
（2026-10-18 当日立案、当日闭环并归档）。被扩展的 owner =
[全仓结构重构 Note](2026-10-13-repo-structure-refactor.md)（它建立 `scripts/lib/web-ui-nav.mjs`
为侧栏导航唯一正本；本 Note 只加它的**判据**，不改该收敛本身）。

## 决定

1. **"扫不到"不等于"不存在"**：侧栏会话列表是懒渲染的——实测同一次加载里**分组行在场、目标会话行
   不在 DOM**（`document.documentElement.outerHTML` 搜不到该标题；`[data-row-key]` 仅有分组键），
   而 `Search sessions` 能搜到同一条。故任何"按行扫描定位会话"的工具都必须把**搜索**当兜底路径，
   并把该策略抽成纯函数（`locateSessionStrategy`：扫不到且手上有标题 → 必须 search；试过才可放弃）。
2. **不得从单次扫描下"实例老化/需重启"的结论**：BUG-035 的旧判据把"零会话行"归因于通道实例老化，
   处置写"重启通道"——实测**重启无效**（同条件复跑仍红）。判据与处置都属误诊，重启不是修法。
3. **按 id 显式定位 > 依赖"默认视图＝最新会话"**：冒烟的自测例库块原靠"重载后默认视图＝最新会话"
   取得目标会话，会话数量增长后该假设不成立（BUG-034）。修法 = `openSessionById`（直达
   `data-row-key="session:<id>"`，行不在 DOM 时走搜索），打不开**如实报红**，不静默跳过整组断言。
4. **搜索结果不带行键**：搜索后 `[data-row-key]` 计数为 0，故搜索路径只能**按文本**点最具体的匹配行；
   是否真切到目标由既有的"主视图 session id 复核"兜底（点错也不代答）。

## 输掉的方案

- **把"扫不到"判成实例老化 + 重启通道**：实测重启无效（同条件复跑仍红）——误诊且给出错误处置；
- **加长等待/无脑重试**：懒渲染是"列表里根本没有这一行"，不是"还没渲染出来"；重试只会掩盖
  （`scripts/AGENTS.md` §retry 白名单）；
- **清理 dev home 的会话/工作区来"治本"**：治标且破坏证据（会话日志是冒烟的磁盘真值来源）；
- **只在冒烟里修（hitl-answer 不动）**：同一判据两版实现正是本仓反复吃过的漂移病
  （见 [重构 Note](2026-10-13-repo-structure-refactor.md) §真·重复收敛）；
- **把"搜索结果"当普通行扫**（假设它带 `data-row-key`）：被实测否掉（计数 0），改为按文本点。

## 实际跑过的验证

- **窄回路**：`runtime/probe-sidebar.mjs`（起真 web → 建会话 → 真浏览器量：胶囊可开否／可见行数／
  目标是否在 DOM／搜索能否命中）与 `runtime/probe-search.mjs`（量搜索结果 DOM 形态）；
- **强制注入绿证（决定性）**：`HITL_FORCE_SCAN_BLIND=1` 把"扫行 + 逐组展开"致盲 → 工具
  `走搜索路径` → `已点搜索结果` → `已答 3 题` → `盘侧复核通过（4/4 实质作答）` → `意图对账通过`；
  仪器按 Phase 6 拆除，红配方与重装步骤写进 BUG-035 卡；
- **keyless**：`locateSessionStrategy` 策略用例（含 `guard-red-record` 要求的负例留证块）；
  反证：把策略改成"扫不到就放弃" → 该例红；
- **冒烟**：BUG-034 的注入反证（显式打开换成不存在的 id → 新步如实红）＋还原后该步
  `PASS（via=row）`、自测例库整块全绿；口径订正后 0/4 复现；
- **注入抓出的我自己的缺陷（3 处，全修）**：`searchSessionByTitle` 未导入（上轮替换未命中
  `import {answerBatchOf,` 这行——`{` 后无空格）；`uiTargetTitle` 跨作用域 `ReferenceError`；
  误以为搜索结果带行键。
