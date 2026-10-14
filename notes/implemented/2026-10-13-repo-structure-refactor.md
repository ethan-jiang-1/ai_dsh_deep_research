# 全仓结构重构（代码体检落地）：单一正本收敛 + 判据核下沉 + 入口瘦身

> 状态：implemented

## 决定

用户委托的全仓代码体检（结构/臃肿/SOLID 三问）落地为八个阶段的结构重构，硬约束 =
**零行为变化**（每阶段前后跑同一验证链，任何红即回滚）。形态：

- **verify.mjs 保持单文件聚合**，门禁块按六域分组（A md 卫生 / B pack 驾驶舱 / C notes 技能 /
  D vendor 对齐 / E 工作区生成物 / F 仓规环境），`gates` 数组同序；五组重复 git spawn 收口
  `gitOnce` 缓存（精确保形：参数原样、不注入 quotepath、不剥 env）。判据与台账合同不动。
- **真·重复收敛为单一正本**：① UI 侧栏导航 `expandGroup`/候选组名 → `scripts/lib/web-ui-nav.mjs`
  （client-load-smoke 与 hitl-answer 的逐字双份）；② research-workspace 组发现一行 →
  `session-log.researchWorkspaceGroup`（三处同款）；③ journal wire「JSON 串或对象 + 截断容错」
  解析家族 → `packages/deep-research-pack/src/lib/journal-wire.ts`（五文件六处）；
  ④ hitl-fold 末位 ask 状态机 → `lastAskStateMachine` 单一正本（deriveAnchors 原重复扫描
  foldHitlPending ×3 + findLastAsk ×2，一次扫描取挂起/问数/判型）。
- **判据核下沉 lib、壳只留 CLI**（修分层倒置）：schema-scan 判据核 →
  `lib/schema-scan-core.mjs`（原 node-gate-core 反向 import 入口层——全仓唯一 D 倒置）；
  run-dashboard 纯管线（解析→场景→模型→渲染）→ `lib/run-dashboard-core.mjs`（tests 不再
  import CLI 入口）；node-gate-core 门③②提函数同构化 + 断代判定/后缀收口 + report 渲染
  移驱动壳（呈现归壳、判据归核）。
- **冒烟内部收口**：client-load-smoke 就绪序列六处 → `awaitAppReady(settleMs)`、guide 胶囊
  两处 → `openGuideCapsule(三时序参数)`——时长逐调用点保原值。

### 同一结构目标的追加切片

- **驾驶舱队员订阅归私有 hook**：多路 teammate follow、history 替换/event 追加、折算、取消与
  fail-soft 日志集中在 `src/client/research-status/useMemberActivity.ts`。父组件保留 roster 投影、
  state slot 和 effect 调用位置；lead/HITL、会话连续性、bundle 刷新及 JSX 未移动。
- **内部目录仍受结构门禁约束**：`client-keys` 与 `cockpit-doc-registry` 递归扫描 client 源码；
  构成正本列出私有 hook 与类型模块。门禁聚合入口仍是单文件 `verify.mjs`。
- **smoke 参考模型与浏览器断言分开**：会话候选和 bundle 文件事实集中在 smoke 私有
  `client-load-reference.mjs`；缺组 exit 2、expectedFace 取值点、刷新读、全部浏览器断言顺序仍归
  `client-load-smoke.mjs`。

## 输掉的方案

- **verify.mjs 拆 `gates/<name>.mjs` 每门禁一模块**：合同 churn（scripts/AGENTS、README、
  writing-a-gate 技能、tests 对账面四处）不抵收益——详见
  [2026-10-13 verify-domain-regroup](2026-10-13-verify-domain-regroup.md)（含重启条件）。
- **测试须知模态两处收敛**：client-load-smoke 是朴素版（全局 /continue/i）、hitl-answer 是
  事故后加固版（限定 dialog/mask 容器——防替人提交默认选项，2026-09-26 实录）。语义不同，
  统一即行为变化——**刻意不收敛**，各自上下文保留。
- **hitl-fold 的 resultTextOf/resultBlockText 进 journal-wire**：嵌套 tool-result 块 + 递归
  语义，与平铺 text 项骨架不同——不强行同类化。
- **EventLike 私有形状收敛为共享类型**：各折算的私有最小形状 = 各自读哪些字段的局部契约，
  非逻辑重复；收敛只增加耦合无行为收益。
- **journal-wire 统一失败哨兵**（把 null/undefined/false/0/'unknown' 收成一种）：哨兵差异是
  各消费方 fail-soft 合同的一部分——共享核统一返回 null、消费方薄包装原地翻译，保零行为。
- **Phase 8 时序参数统一**（六处稳定窗、两处胶囊探测窗取同一值）：各时长是各上下文实测调
  的，统一即行为变化。
- **单消费方助手进 lib**（awaitAppReady/openGuideCapsule）：单一使用者不成缝——留在
  client-load-smoke 本地，lib 只收真共享件（避免假设缝）；同理，历史窗口折算仍邻接其唯一断言消费点。

## 实际跑过的验证

- **基线（动手前）**：并发会话收口 BUG-025/026 提交后（1ab1849），五链全绿存档——verify
  41 门 / test 424 / gates-smoke 37 注入 / client-load-smoke / snapshot-replay。
- **逐阶段同链复跑全绿**（红即回滚的铁律未触发一次回滚）；终态 test 428（+4 = journal-wire
  共享缝钉子）；verify 全绿；gates-smoke 注入全红对照组全绿。
- **行为证据**：client-load-smoke 真浏览器 ALL PASS（Phase 2/3/7/8 各跑一次，收敛后的
  expandGroup/openGuideCapsule/awaitAppReady 实走）；snapshot-replay 四场景 A/B/C 全绿
  （Phase 3/7）。
- **安装形状**：release-smoke --install-only 全绿（Phase 3/7，含 pack 重构建产物）；
  run-dashboard / node-gate / schema-scan 三个壳 CLI 实跑输出形态不变。
- **反证实录**：journal-wire 测试先红后绿（去空白剔除条件 → 红；还原 → 绿）；变换脚本身份
  对账器自身先红后绿（doc-budgets 段尾横幅误计 → 修抽取 → 过）；Phase 5 漏改动态 import
  被 evaluation-contract 测试当场咬红（layering 注释点名的动态字面量形态）后补正。
- **机械对账**：verify 重排经逐门禁代码体逐字对账（除 12 处 spawn 替换）；run-dashboard
  切分经首尾行锚点断言逐字搬移。
- **后续零行为切片复验**：`pnpm test`（428/428）、`pnpm verify`、pack build、真浏览器
  `client-load-smoke` 均通过；`gates-smoke` 零注入对照与有效形态控制通过，45 个注入案例均由
  目标门禁点名报红；`git diff --check` 通过。
- **递归扫描反证**：首轮递归前 gates-smoke 未能由 `client-keys` / `cockpit-doc-registry` 点名
  嵌套 client/模块回归；递归后再以同名 `types.ts` 注入确认 basename 登记会漏检，随后改为
  src-relative 路径校验。最终反证覆盖嵌套 client/lib、同名模块、空格路径、`.ts` 文件链接；
  `node_modules` 与目录链接控制通过。
- **未运行**：`release-smoke`（未改安装/部署面）、`snapshot-replay-smoke`（未改模型可见组装面）、
  `client-hitl-smoke`（未改 reveal/session-switch 路径）与真模型 `team-preflight-smoke`；本次
  `client-load-smoke` 的实际会话没有 teammate 正例，队员订阅非空路径由原 effect 逐句搬移与 pack build 覆盖，未声称 live 正例已验证。

## 环境状态

Node 22.23.1（钉版）；重构期间与另一会话并行（其 BUG-025/026 收尾先提交，本弧基于其全绿
基线开工，用户拍板等其提交后动工）；pack 构建产物 lib/ 已随 src 同步重建（gitignored 本地件）。
