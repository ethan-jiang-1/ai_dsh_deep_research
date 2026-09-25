# RFC：研究状态界面（UI 优先——把界面弄对）

> 状态：implemented

归宿：roadmap §队列 ▶「研究状态界面」（feature；用户 2026-09-25 指令："先别搞逻辑了，
先把界面弄对"——对观察面 tab 的直接评价：**分析不太出来**=人看不懂）。

## 决定

页签从工程验证面改为人能读的研究界面：人性化活动流（原始事件类型名全替换）+ 五区布局
（HITL 横幅/问题行/步骤条/证据交付/活动流）。

## 实施记录

- `src/lib/activity-fold.ts`：journal 事件 → 人性化行（🔍 检索/👥 派出/💬 成员/📦 交付），
  噪音全过滤（step/turn/session/system/permission/user/其他工具/空 query）——keyless 4 断言；
- 页签五区重构 + workspaceFiles 闭包注入（listDir/readFile，company 同款降级 null）；
- client-load-smoke 8 断言 ALL PASS：**人性化活动流 15 行** + **噪音零残留**（6 种原始类型名
  全无）+ 渐进面如实记观察点。

**如实记档（部分交付）**：活动流与噪音过滤是本条目的核心交付（人看懂了——✅）；bundle
渐进面（步骤条/证据/交付的**真数据上屏**）因 workspaceFiles list 路径问题未接通——RPC
探测 5 种路径全 ok=false（'', '.', '/', 'drt_*', 'research-workspace'），组件代码已就位
（数据来了就渲染），**待查 API 调用形态**。截图留档 research-status-ui.png。

## 问题

当前「研究状态」页签是工程验证面：journal 流渲染**原始事件类型名**（step/end、tool/call
的 monospace 流），步骤条/矩阵空壳（数据面未接通）。技术上"通道全通"（follow 326 事件），
但对用户**传达为零**——打开页签无法回答"研究到哪了、谁在干什么、等没等我"。

## 方案（UI 优先：先定用户看到什么，再接最小数据面）

**页签目标形态（自上而下）**：

1. **研究问题行**：question 一句话 + 研究类型/口径 chip（一眼知道这是哪场 run）；
2. **步骤条（真数据）**：立项→拆解→侦察→取证→综合→审查→交付 七步 chip，当前步高亮
   ——数据面：workspaceFiles 列 research-workspace 根目录 → 最新 drt_* → 文件在场性；
3. **HITL 状态（已有 ✓）**：挂起时大横幅"⏳ 等你拍板"；
4. **团队动态（人性化活动流，替换原始事件流）**：journal 事件折叠成人类可读行——
   - `tool/call web_search` → `🔍 检索：<query 前 40 字>`
   - `tool/call spawn_teammate` → `👥 派出 <name>：<description>`
   - `assistant/message` → `💬 <角色>：<正文前 50 字>`（从事件 data 取内容，不猜角色
     就标"成员"）
   - `tool/call present` → `📦 交付声明`
   - 其余事件（step/turn/session 元数据）**不显示**——噪音不是信息；
5. **证据概览**：有效证据计数 + topic 覆盖（T1 ✓3 · T2 ✓5 · T3 ✗0——矩阵的紧凑形态）；
6. **交付状态**：final 在场 → `✅ 已交付（v1）` + present 声明时间。

**实现面（最小数据管道，为 UI 服务）**：

- 活动流折算进 `src/lib/activity-fold.ts`（纯函数：事件 → 可读行，keyless 单测）；
- bundle 发现：`remote.workspaceFiles.list(sessionId, '', signal)` 列根目录 → drt_* 目录
  → 最新一个的文件在场性喂 `run-fold.ts` 的 deriveSteps（上轮已备好的折算）；
- 组件薄渲染（现有分层纪律不变）。

## 输掉的方案

- **继续接更多逻辑面（矩阵全量/review 全文上屏）**：押后——用户指令 UI 优先，先把
  "一眼能懂"做出来，密度后面加；
- **原始事件流保留为"高级视图"**：否决——v1 不做切换，噪音流直接替换（要调试看
  dashboard HTML 投影，那才是工程面）；
- **等下一场 run 再验**：否决——用首场 run 的既有会话（326 事件 + bundle）即可开发与
  验证，不依赖新 run。

## 验收

- client-load-smoke 扩断言：页签出现**人性化活动行**（🔍/👥/💬 前缀）且**无原始事件类型名**
  （step/end 等不得出现在页签正文）；步骤条**有真数据**（首场 run 已交付 → 交付步 current）；
- activity-fold 单测：四类事件 → 四类行 + 噪音过滤（step/turn/session 不出行）；
- 人工复核点：截图留档（模型无图像输入，用户目验——界面好坏最终是人的判断）；
- 不破坏：25 门禁 + tests + client-load-smoke 既有断言全绿。
