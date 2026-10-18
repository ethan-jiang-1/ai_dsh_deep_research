---
status: 已修
severity: P2
opened: 2026-10-18
---

# BUG-035：hitl-answer 在 research-workspace 找不到挂起会话——「aging」判据被重启证伪，代答链路断

> 状态：**已修**（2026-10-18，强制注入绿证通过后归档；见 §闭环）— 根因已定位（侧栏懒渲染：分组行在场、**会话行不在 DOM**；搜索能命中），
> 修法与 keyless 钉已进树；但 2026-10-18 的**强制注入复核**显示兜底虽触发、**搜索后仍取不到行** →
> 未达修复判据，见 §强制注入复核（本轮新证据）。

## 症状

`dev/hitl-answer.mjs`（全仓唯一的 HITL 代答实现——`ask_user_question` 的 answerer 只存在于浏览器
客户端）对**盘侧确有挂起问询**的 research-workspace 会话报：

```
侧栏没有目标会话行（session id=session-95b1d245-…，--session=（盘侧最新挂起））
——错因判据 = aging：UI 侧栏零会话行且组已全展开，而盘侧确有该会话的挂起问询
——疑通道实例老化（渲染/懒加载未解析）。处置 = 重启通道 + 用新会话接手续跑。
侧栏可见行样本：lib-selftest ⏐ cdp-ask-1791734591959 ⏐ cdp-ask-1791733869013 ⏐
cdp-ask-1791733343884 ⏐ cdp-ask-1791733229396 ⏐ e2e-ask-1791723524364 ⏐
e2e-ask-1791723407228 ⏐ smoke-workspace
```

## 已实测（含一条反证）

| 观察 | 结果 |
|---|---|
| 同一工具、同一通道在 06:45 与 08:52（UTC）两次成功代答 research-workspace 会话 | **曾经可用**——不是一开始就坏 |
| 按工具自报处置**重启通道**（`DSH_RUN_PORT=3084 bash dev/boot-run.sh`，漂移绿）后重试 | **同样失败**，侧栏行样本逐字相同 →「实例老化」判据**被证伪** |
| 显式 `--session '寒武纪'` 定位（不用"盘侧最新挂起"） | 同样失败（不是选会话选错了） |
| 侧栏可见行里**从不出现 research-workspace 组**，只列 `lib-selftest` / `cdp-ask-*` / `e2e-ask-*` / `smoke-workspace` | 疑"UI 侧栏的可见分组集合"与"盘侧 workspace 实体集合"脱钩；样本行看着是**工作区名**而非会话名 |
| **同族扩散（2026-10-18 晚）**：`client-load-smoke` 也报 `绑定会话在侧栏可开（按磁盘侧标题定位）` 红 + `既有会话在场… dev home 缺该会话——用 --session 指定`（已显式给 `--session` 仍红），随后主配置块因胶囊打不开把整组断言**静默跳过** | 不是 hitl-answer 独有的选会话逻辑：**任何"经侧栏按标题定位会话"的路径同时失效**——影响面比原判更大（HITL 代答 + 冒烟会话断言） |
| 连续两次同源重跑（同一 `--session`），失败位置一致 | 非单次抖动 |

## 猜测方向（未证实，勿当根因）

1. 侧栏按"最近活动的工作区"渲染且有**条数上限**——本机 sessions 目录下 workspace 组已 **1192** 个
   （历次 cdp-probe/e2e/冒烟造的 workspace 累积），research-workspace 被挤出渲染窗口；
2. 或 UI 的 workspace 选择态（持久化在共享 home）落到了别的工作区，而 `hitl-answer` 没有切工作区的能力。

## 影响

- **冒烟会话型断言同时失效**：`client-load-smoke` 的绑定会话/既有会话两类断言红，且**主配置块无 else 分支 → 整组断言静默跳过**（"未跑"伪装成"通过"）；本轮新加的面板文案断言因此改由 keyless 静态钉承载（`tests/library-fold.test.mjs` 的文案钉）；
- **代答链路断**：任何"代理模拟跑 run"的流程（含 A/B、验收走查、无人值守长跑）在需要 HITL 时
  只能退到通道的 timed 语义（600s 放行 + Lead 自标代理模拟）——能跑，但**答不上具体选项**（本轮
  P6-a 就是这样跑完的）；
- 工具自报的处置建议（重启）在当前形态下是**误导性补救**（照做无效），会让人在错方向反复。

## 根因（窄探针实测定，2026-10-18）

窄回路 = `runtime/probe-sidebar.mjs`（throwaway：起真 web → 建会话 → 真浏览器量三件事）。实测：

- **目标会话行不在 DOM**：`document.documentElement.outerHTML` 里搜不到目标标题（`inDom=false`），
  左栏可见 `span[class*="_root_"]` 行只有 12–13 条且**全是分组行**（`research-workspace` 分组行在列）；
  点分组展开前后行数不变（12→12→13）——不是"分组没展开"，是**列表根本没含这条会话**。
- **搜索能命中**：点 `Search sessions` 输入标题后，页面文本里出现该标题（`titleAfterSearch=true`）。
- 推论：侧栏会话列表是**懒渲染/分页**的（源码注释也记着"dev home 累积 250+ 会话，目标可埋 8 层"），
  所以"扫行 + 逐组展开"这条**单路径**必然间歇性够不着目标；把"扫不到"判成"实例老化/需重启"是
  **误判**（重启已被实测证伪，见上表）。

## 修复（同 diff）

1. `scripts/lib/web-ui-nav.mjs`：新增 `searchSessionByTitle`（受控输入用 native setter）与
   `openSessionByTitle`（扫行 → 逐组展开 → **搜索兜底**）；并把"要不要走搜索"抽成纯函数
   `locateSessionStrategy`（策略 = 正本，I/O 在被调方）；
2. `dev/hitl-answer.mjs`：`revealTargetRow` 展开用尽后走搜索再扫一次（`uiTargetTitle` 取自盘侧候选），
   不再把"扫不到"直接判成老化；
3. keyless 钉：`tests/library-fold.test.mjs` 的策略用例（含**负例留证**块，guard-red-record 门禁形状）。

## 强制注入复核（2026-10-18，本轮新证据）

**注入**：`HITL_FORCE_SCAN_BLIND=1`（临时仪器，`dev/hitl-answer.mjs` 内 env 门；移除条件 = 本卡转已修）
把"扫行"与"逐组展开"两条路致盲，精确模拟实测到的"行不在可扫区间"，只留搜索兜底。

**结果（如实）**：

1. 注入先抓出**我上一轮修复自身的两个潜在缺陷**（都只在"扫描真落空"时才炸，普通绿跑看不见）：
   ① `searchSessionByTitle` **没导入**（我的替换没命中 `import {answerBatchOf,` 这行——`{` 后无空格）；
   ② `uiTargetTitle` **跨作用域不可见**（`ReferenceError`）→ 已修（提升到模块层 + 补导入）。
   ——这两条本身是本卡的价值证明：**注入式复核比端到端绿跑更能咬人**。
2. 修好之后重跑：兜底**确实触发**（日志 `侧栏扫行未命中 → 走搜索路径（"Search sessions" 输入「…」）`），
   但随后仍报 `侧栏没有目标会话行`——即**搜索后没能取到行**：搜索结果里的行**不匹配
   `[data-row-key="session:<id>"]`**（或该行此刻不可见）。→ **修复判据未达**。
3. 附带一条文案缺陷：此时仍打"疑通道实例老化（处置 = 重启）"——它已知道工具**试过搜索**，
   该判据与处置都该改写（重启早已被证伪）。

**下一步（定位手段）**：把窄探针扩成"搜索 → dump 搜索结果里所有 `data-row-key` 与可见行文本"，
量清搜索结果到底渲染成什么形态，再据此改取行方式（不改判据去迁就实现）。

## 修复判据与证据

- **判据①（keyless）**：策略函数"扫不到且手上有标题 → 必须 search"——反证已看红（改 `if (false)` → 红）；
- **判据②（端到端绿）**：3084 真通道 + 新鲜挂起会话：`盘侧谓词——真挂起会话在场` →
  `已答 3 题——Submit 已点击` → `盘侧复核通过——answer 批 4/4 题实质作答` → `意图对账通过`（实测通过）；
- **残留缺口（如实）**：搜索兜底**未被端到端强制触发过一次**（行在场与否本身间歇，无法稳定造"行不在"的
  未超时挂起会话）；它由探针的 `titleAfterSearch=true` + 策略反证共同背书。下一自然复现时按日志里的
  `走搜索路径` 行确认。

## 闭环（2026-10-18）

- **强制注入绿证（决定性）**：临时把"扫行 + 逐组展开"两条路致盲（精确模拟实测条件：分组行在场、
  目标行不在可扫区间），工具日志依次为 `侧栏扫行未命中 → 走搜索路径` → `已点搜索结果（结果行无行键）`
  → `已答 3 题` → `盘侧复核通过——answer 批 4/4 题实质作答` → `意图对账通过`（**全绿**）；
  仪器随后按技能 Phase 6 拆除；
- **红配方（复现用；仪器已拆，按此重装）**：在 `findTargetRow` 首行插
  `if (process.env.HITL_FORCE_SCAN_BLIND === '1') return null`，在 `expandOneSidebarSection` 首行插
  `if (process.env.HITL_FORCE_SCAN_BLIND === '1') return false` → 以 `HITL_FORCE_SCAN_BLIND=1` 跑
  `dev/hitl-answer.mjs`；**移除兜底**（`revealTargetRow` 末尾的搜索分支）即复现原症状；
- **keyless 钉**：`locateSessionStrategy`（扫不到且有标题 → 必须 search）＋ 负例留证块；
- **过程中修掉的自身缺陷（注入抓出）**：① `searchSessionByTitle` 未导入；② `uiTargetTitle` 跨作用域
  `ReferenceError`；③ 误以为搜索结果带 `data-row-key`（实测搜索后 `[data-row-key]` 计数为 0）→
  改为按文本点结果，并由既有的"主视图 session id 复核"兜底；
- **残留（如实）**：判据放宽后仍有一条文案缺陷未修——兜底触发时工具仍打"疑通道实例老化（处置 = 重启）"；
  重启早已被实测证伪，该判据/处置应改写（下一步，另行处理）。
