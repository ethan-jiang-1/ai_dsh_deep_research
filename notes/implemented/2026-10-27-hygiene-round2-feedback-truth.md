# 六维卫生轮·二：把"绿"变成人看得见的绿

> 状态：implemented

六维卫生评审（维度1 渐进披露 / 2 代码与测试结构层次 / 3 文档-执行-验收整体结构 / 4 上下文腐化 /
5 测试资产 / 6 反馈通路）第二轮，7 路并行取证 + 逐条实测复核后按 P0/P1 落地。本 Note 只记承载
持久决定理由的部分；逐项证据住各 commit 与实测输出。

## 决定

- **GREEN 的语义 = 人看得见的页面，不是 DOM 在位**。`cdp-probe` 全程 JS 派发点击，绕过
  hit-testing；DSH 版本升级后的 Preview Notice 全屏遮罩在时它照样"点得到"——实测 run-driver
  判 GREEN 的同刻截图仍被遮罩盖住，用户打开 URL 先撞一屏 Continue。处置：遮罩选择器与关闭动作
  收进 `web-ui-nav`（唯一正本，CDP 字符串与 Playwright 函数两形态），探针先关遮罩再取场景，
  `runDriverVerdict` 增第五条检查 `overlay-clear`（`null` 不许当绿——未跑 ≠ 通过）。
  **输掉的方案**：只把遮罩写进 run-driver 的 console 警告（不拦绿）——"提示"不改变呈交判断，
  红绿才是 agent 读的东西。
- **判红前先落现场，且每次判定独立归档**。`cold-start-smoke` 原先是"先把整个临时根 rm 掉再判红"，
  红时盘上零证据、只剩 25 行 stdout 尾巴；`run-driver` 只写固定名 verdict，下一次 up/probe
  直接覆盖——同日实测 21:14 RED、21:22 GREEN，红的现场被后来的绿抹掉。处置：cold-start 判红前
  把 `state/` 与完整输出搬进 `runtime/smoke-workspace/cold-start-fail-<ts>/`；run-driver 每次落
  `run-verdicts/<ts>-<kind>/`（verdict + page.png）+ `latest-verdict.json` 指针，固定名副本保留
  （cold-start 等既有消费方契约不动）。
- **bundle → 会话的反查键必须落盘**。诊断入口（stream-diagnostics / session-events / watch-run /
  session-replay）全部以会话 id 或标题起手，而 run bundle 从不记会话 id——旧回执只有
  `sessions: "$DSH_HOME/sessions"` 一个根，于是"哪场 run 坏了"到"该点哪个会话"没有入口，
  agent 只能按 mtime 猜（多 run 并存必串场）。处置：`scanWitnessLogs` 带出会话 id（绑定谓词仍是
  门①②那条，**不另立第二套语义**）；新增 `lib/bundle-sessions` + `run-ops/bundle-sessions` CLI；
  `run-accept` 写 `delivered.json` 时落 `witness.sessions`。
- **覆盖率由代码拥有，散文只指正本**。门禁台账写"常驻案例覆盖 39/43"，盘上实为 43/47（分子分母
  都不对），而 `verify-gates` 只做单向对账——新增门禁不带案例、案例退役留缺口都不会红。处置：
  `NO_CASE_GATES`（名单 + 结构性例外理由）作正本，`verify-gates` 反向断言
  "gates − 案例覆盖 = 该名单"；evaluation 台账与 gates-cases 注释不再记数。
- **发布物必须与源码渲染同源**。2026-10-21 管理迁移把"研究配置"四区迁进主界面「方法库」tab，
  页签默认 `COMPACT=true` 只留摘要面；pack README（随 npm 发布）与 D25 台账没跟上，继续描述四区，
  而旧实现完整躺在 `COMPACT=false` 分支里——读者据此会认定"功能缺失"，"翻开关"看起来既便宜又
  正确。处置：README 与 D25 改成摘要面事实；`docs-consistency` 加一条契约
  "COMPACT 默认态 ⇒ README 不得出现已迁走的四区词"。
- **`verify --only=<gate[,gate]>`**：47 道门禁一格到底，改一道要么全跑、要么盲改。只判指定门禁，
  输出与退出码都只看它们，末尾自报"仅判 N 道"；未登记门禁名 exit 2。判据零变化——省的是噪声与
  注意力，不是时间；收尾仍须全量。
- **驾驶舱子件按职责切出**：`ResearchGraphTab.tsx` 873 行里的 DAG 小图与队员 worker chips 是
  自包含展示件，而 `research-graph/` 子目录此前只装 `types.ts`。切出 `DagMap.tsx`（几何 + 状态色 +
  SVG + 选中）、`WorkerChips.tsx`（每成员一次实例化，hooks 数恒定）、`format.ts`（短标签，图与列表
  共用——放任一组件里都会让另一个反向依赖组件）、`GraphNodeView` 进 `types.ts`；页签体降到 699 行。
  四个新路径同 diff 进 design/40 §2（`cockpit-doc-registry` 要求每个 client 模块登记）。
- **状态页再切一刀：取数与画分家**。`useStatusFeed`（270 行）独占 journal follow / bundle 扫描 /
  绑定可信性 / 锚点与版本面折算，返回事实包；页签体 480 → 239 行只读事实包并渲染。切这条缝的
  判据 = "改扫描节奏"与"改渲染"是两类改动，此前都要在同一个 480 行函数里翻。
- **驾驶舱其余页签按"视图 / 数据"分层**：方法库的三种视图（内置只读 / 我的库只读 / 编辑表单）
  从 456 行页签体里切成 `method-library/views.tsx`（纯展示，动作走 props，父级仍独占发送态与
  回执）+ `styles.ts`（样式常量单列，否则视图件要反向依赖页签体）；状态页的流程轨道（取色 /
  步态符号 / 列位 / 回边几何）切成 `research-status/TrackRail.tsx`，输入收窄成
  anchors / steps / faceVersions 三样。两处都是**纯搬家**：判据、文案、交互逐字未改，验证 =
  client-load-smoke 对应断言全绿。配置页签仍是单件——它的 `COMPACT=false` 回滚分支（约 350 行
  不可达 JSX）属 D25 决定，删分支才谈得上拆，已登记为可观察触发条件。
- **门禁按域拆文件（verify.mjs 1848 行 → 入口 61 行 + 6 个域模块）**。47 道门禁单文件一格到底，
  改一道要读全文件或盲改；而改门禁本来就是 `--only=<名>` 的窄面。拆法：`context.mjs`（路径常量 /
  gates 名单 / gitOnce / trackedFiles / fail-note 收集器）+ `gates/{a-docs,b-pack,c-notes,d-vendor,
  e-workspace,f-repo}.mjs`（各域 219–428 行）+ 入口只做配参、按域调用、汇总。**判据与文案逐字未改**；
  等价性证据 = gates-smoke 87 注入案例 + 4 对照在拆分前后同一判（两次全绿），`pnpm test` 916 例不变。
  连带更新：门禁契约测试改从 `context.mjs` 读名单（仍是 keyless 文本解析，不 import 含子进程的模块）、
  writing-a-gate 技能与 scripts/AGENTS/evaluation/guides 的门禁落点指向各域模块。
- **面板数据面搬出视图**：`ResearchConfigTab.tsx` 里 7 张纯数据表（内置偏好 / 判型映射 /
  六条底线 / 四分区标签 / 领域示范 / 两个入口指令）进 `src/lib/config-tables.ts`。理由不只是
  "文件太长"：这些表是 skill 的**投影**，与视图生命周期无关；放在 700 行 TSX 里时 lib 侧拿不到
  （`MethodLibraryView` 曾反向 import 视图文件取常量），而 keyless 测试只能 `ts.createSourceFile`
  扒源码、并被迫断言"必须保持为可静态对账的数组字面量"——视图一重构就红，且红得与业务无关。
  处置后测试直接 import，整套 AST 取数助手（约 140 行）删除。
- **门禁自测进 CI**：`gates-smoke`（87 注入案例 + 4 对照，经真实 verify 入口判红）与
  `run-accept-smoke` 都声明 keyless，却只活在"改 verify 必跑"的散文里——CI 上永不执行。
  实测全量 1m44s + 2.6s，进 keyless job 的预算无压力；同时加 `--case=<id>` 供改单道门禁时
  迭代（单案例 2.5s，末尾自报"仅跑 N 个"，未登记 id exit 2）。
- **D 号台账加 `<a id="dN">` 锚点**：31 行单表零锚点，而 live 文档有 138 处裸 D 引用，读一个
  D 号 = 读整页 20KB，"按需跳"物理上不成立。锚点落地后 `md-anchors` 能校验 D 号链接，页头写死
  引用写法 `[D18](../../docs/decisions.md#d18)`；历史层（notes/_backlog）不追改。

## 输掉的方案

- **"让探针不点 Continue，只报 blockedByOverlay"**：用户要求的是"看到真正的页面展现"——只报
  阻断而不清场，agent 拿到的仍是"页面不能用"而没有任何可用现场；且 DSH 的 acknowledgment 是
  持久的，清场一次即稳定，代价可接受。
- **把 run-driver 的固定名 verdict 直接改成只写时间戳目录**：cold-start-smoke 与既有消费方按
  固定名读，改契约要连带改三处；固定名副本 + 时间戳目录并存，新增能力不动旧契约。
- **覆盖率用"散文里的分子分母"维护**：正是它腐成了 39/43；计数必须由能失败的断言拥有。
- **给 `--only` 加"逐门禁早退"**：47 个门禁块是线性执行、没有派发循环，包 if 等于重写结构；
  过滤 fail/汇总已消除噪声与误判，5 秒全跑不是瓶颈。

## 实际跑过的验证

- 每提交过 pre-commit（verify + 全量 tests）；收尾态 `pnpm verify` 全绿、`pnpm test` 909/909。
- **先红后绿实录**：① 面板契约首跑红（README 命中"四区/内置打法/我的偏好库/底线条"四词）→ 改
  README → 绿；② 反向覆盖断言：删 `count-free` 唯一案例 → `# fail 1`（未覆盖名单不符）→ 还原
  绿；③ 遮罩判据：把关闭文案收窄成只认 `Continue` → 第 4 例红 → 还原绿；④ `bundle-sessions`：
  把 slug 写死成空串 → 第 1 例红 → 还原绿；⑤ `--only=nope-xyz` → exit 2 并点名未登记门禁。
- **重构未改行为**：`tsc -b` 绿、`pnpm build` 重建 `lib/client.js`、`client-load-smoke` ALL PASS
  （29 例 library-fold + 全量 909 例通过；测试数不变 = 没有用删断言换绿）。
- **真环境实测**：同一通道连跑三次 `run-driver probe`——旧实现下 21:14 RED / 21:22 GREEN，
  且 GREEN 同刻截图仍被 Preview Notice 遮罩；新实现新增 `overlay-clear` 检查后同一通道 GREEN，
  `overlayPresent=false overlayCleared=true`。`client-load-smoke` 改用共享 helper 后 ALL PASS
  （含"研究配置页签体：管理/内置/示范/回执已移出侧栏"一条，与 P0 修正互为反证）。
  `bundle-sessions drt_cn-open-vs-us-closed-agentic` 在 2058 个会话日志里命中 1 个 present 见证
  会话（12s），打印的下一步命令可直接跑。
- **未跑项（如实登记）**：① `cold-start-smoke` 的现场保留分支未真跑红（需 tarball + 全局 dsh
  且冷启动约 5 分钟；分支逻辑为"判红前复制 state + 输出"，语法与路径静态核对）；② 遮罩的
  **出现→消失转换**未在同一探针内观测到——实测到的是"第一次探针 present=true 且点击已派发、
  overlayCleared=false"，其后 acknowledgment 持久化（DSH 的 WelcomeNotice 按版本记 ack），
  再跑即 present=false。因此"关不掉"的红线（overlayPresent=true 且 cleared=false → RED）只有
  keyless 单测正面覆盖，未有活进程红录；代价 = 版本升级后**首次**呈交可能因 ack 尚未落盘而判红
  （fail-closed，重跑一次即绿）。
  `run-accept` 的 `witness.sessions` 只在已有 bundle 上验证了读取面（旧回执无该字段，属新增可选
  字段，向后兼容），未重跑一次完整验收。

## 环境状态

- 本轮覆盖 P0（发布物/台账纠正）、P1（遮罩自证、现场保留、bundle 反查、覆盖账本为正）、
  P2（`--only`、`--case`、D 锚点、guides/62 路由行、门禁自测进 CI）与一项 P3（面板数据面搬出视图）。
  仍属结构面的一项（研究配置页签按区拆件）受 D25 回滚分支约束，已进 `_backlog/triggers.md`
  作可观察触发条件；其余结构面（verify 拆域、驾驶舱三页签分层、design/40 §2 拆节）已落地。
- 运行区新增两类产物（gitignored）：`runtime/smoke-workspace/run-verdicts/<ts>-<kind>/` 与
  `cold-start-fail-<ts>/`——前者每次 up/probe 一份，后者只在冷启动红时出现。
