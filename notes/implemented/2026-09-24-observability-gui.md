# RFC：观察面 GUI 化（client-face-bootstrapping + run-status-tab）

> 状态：implemented

> 历史注记（2026-10-30）：本页是驾驶舱 Stage 0–3 的 RFC 毕业记录；“未完成部分”（步骤条 /
> 矩阵 / review 渐进 / 工具卡）已由 [observability-completion](../archived/2026-09-25-observability-completion.md)
> 等后续交付。现行构成 = [design/40](../../docs/design/40-research-cockpit.md)；
> 本页因 `client-keys` 门禁红证出处仍留活跃（见 design/40 §7）。

归宿：roadmap §队列「观察面 GUI 化」（2026-09-25 马拉松条目 3，已毕业离队）；
真人 HITL run 验收**延期给队列条目「研究类型覆盖」**（见文末互指）。

## 决定

按 RFC 两段三步交付观察面 client 面（**D18 = D7 的第一处有界例外**：pack 获准 `src/client/` 源 +
双半 tsdown 产物 `lib/client.js`，构建产物只此一件，用途限定研究观察/调试）：
右栏「研究状态」页签（journal 流 + HITL 挂起显形），构建链/接线/折算/冒烟全链落地。

## 实施记录（Stage 0–3）

- **Stage 0**：D18 登记（docs/00-index 决策台账）+ D7 加修订指针 + design/10 同步。
- **Stage 1（client-face-bootstrapping）**：tsconfig 三件（host/client 分叶——Context 类型
  增强冲突单程序不可兼得）+ tsdown 双半（ModuleLoader 外壳；契约照抄 company-pack）+
  三件套对齐（exports 三出口 ↔ dsh.client ↔ cordis.patch `research-client` 行）+
  **client-keys 门禁**（keyed 字面量单一正本 keys.ts；四种红证形态）+ render-overlay.mjs
  升级为直读 cordis.patch insert 块（消灭硬编码清单）。**附带大修**：首次真浏览器加载即
  抓到升 pin 遗留回归——205 个包 host 半缺失（clientBundle 助手对纯折依赖解析不到就静默
  外置 → "missed the module table"）+ 前端壳 stale（平台种子冻结旧版）→ vendor-build.sh
  固化 ⑦ host 半补建 ⑧ 前端壳重建两步，主线 Web UI 复活。
- **Stage 2（B-min）**：journal 流页签——follow 生成器（company 同款最小投影：snapshot 历史
  + event 实时）+ 页签体（PropsRuntime<槽> + 注入面，薄渲染尾部 30 行事件摘要）。
  **0.1.7 服务注入实证**：remote 命名空间**两级都要声明**（父 remote + 子 remote.session）。
  **UI 流打通**（company runCockpitFlow 配方 + 0.1.7 三处适配）：关测试须知模态（Continue，
  全屏 _mask_ 盖住一切控件——多轮点击失败的总根因）/点会话行整行 span/展右栏/点 guide 胶囊
  （无需 New tab——0.1.7 折叠列该控件永远 hidden）。
- **Stage 3（B-full，时间盒内尽力）**：**活标题**（`RESEARCH_TITLE_SLOT` 槽 + Title 组件，
  挂起时"研究状态 · ⏳ 等你拍板"）+ 页签体横幅行 + **共享折算** `src/lib/hitl-fold.ts`
  （谓词：从尾扫跳过 session/* 元数据后，末位回合事件 = 未答的 ask_user_question——v4 修正：
  0.1.7 自动命名 session/title 落在 ask 之后）+ keyless 单测 7 断言 + 测试基建切
  `node --import tsx/esm --test`（测试可吃 src/lib 的 TS 折算，三处同 diff）+
  `client-hitl-smoke`（真模型档：RPC followup 既有交付会话造挂起态，盘侧谓词与页签共用
  同一 fold；实测真模型真实调 ask 且挂起、盘侧命中）。

## 实际跑过的验证（马拉松档，全部实跑）

| 面 | 结果 |
|---|---|
| L0 | 25 门禁 + 35 tests 全绿 |
| client-load-smoke | **ALL PASS 7/7**：零失败横幅 / 无 loader entry 失败 / client bundle 进 /plugins/ 批次 / 既有会话在场 / guide 胶囊在场 / 页签渲染 / **journal 真数据（331 事件）** |
| client-hitl-smoke | 盘侧全证：真模型真实调 ask_user_question 且挂起（多会话末位实证）+ 谓词命中 + 标题提取；浏览器端到端翻转为**观察点**（截图留档） |
| 收尾链 | L1 真挂载 / L2 release-smoke / L4-lite / team-preflight / entry-chain-probe 全 ALL PASS |
| 主线 | research profile 重建到最终 pack（漂移绿），web 3081 实测可用 |

## 未完成部分（如实，时间盒边界）

- **步骤条 / 矩阵 / review 渐进**（B-full 计划项）：未做——活标题 + journal 流优先（用户点名
  需求 + 数据通道证明）；数据面已通（workspaceFiles 通道范本 = company cultivation 页签），
  复活时接 `src/lib` 折算深化即可；
- **C 工具卡**（stretch）：未做（设计上随 B 议，未触发）；
- **浏览器端到端活标题翻转**：观察点待真人 run 目验（受会话列表工作区归组 + 成员行同文本
  的自动化定位阻隔；fold 单测 + 盘侧实证 + 页签挂载三证在案）。

## 输掉的方案

- **整体放开 D7**（不限观察面用途）：否决——教义演进留最小口子，皮肤/品牌面仍在搁置池；
- **host `@Remote` 读模型起步**：押后——起步走 `remote.session.follow` 零 host 面改动；
- **直接上矩阵全量**（跳过 B-min）：否决——小笔验链（company 生长序）；
- **New tab 路径开页签**：否决——0.1.7 折叠列该控件永远 visibility:hidden（实测），
  guide 胶囊才是正路；
- **node:zlib 解会话日志**：否决——多帧 zstd 只解第一帧（实测整轮误判"1 事件"），
  zstd CLI 全帧解为准。

## 真人档（延期给队列条目「研究类型覆盖」）

一场真人 HITL 全流程 run：页签/活标题/横幅可用、矩阵与 review 状态与 run bundle 一致。
未跑不阻塞本次毕业——用户带题时由该条目一并收口（互指已建）。
