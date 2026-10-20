# 研究配置页签（管理中继面）——偏好库的只读投影与指令中继

> 状态：implemented

出处 = [长期管理卡](../../_backlog/_archived/settled_issues/2026-10-12-research-method-profile-management.md) 期 1
（用户 2026-10-12 拍板「做期 1：显示 + 一键指令」）；架构依据 = 00-index **D25**（D7/D18 有界
扩展）；详细 UX 推敲（Modal 详情 / 分区编辑 / 四字段库格式）= [1.5 卡](../../_backlog/_archived/settled_issues/2026-10-12-research-preference-detail-ux.md)
（**同一变更一并交付**：四字段格式 + Modal 详情/分区编辑/基于内置新建）；驾驶舱构成正本 = [design/40](../../docs/design/40-research-cockpit.md)；
同族先例 = [驾驶舱 home Note](2026-09-28-cockpit-home.md)。

## 决定
> 2026-10-18 扩展：内置偏好扩为五条（+ 时间线与信号），本 Note 正文的「四偏好/四条」是当时快照；
> 现行以 [研究配置面板显式化](2026-10-18-research-config-explicitness.md) 为准。


1. **右栏新增「研究配置」页签**（与「研究状态」并列，同槽第二 key）——内置四偏好只读 +
   「我的偏好库」实时投影（读工作区 `method-library.md`，与磁盘对账）+ 管理操作（用于本次 /
   设为默认 / 编辑 / 删除）；
2. **面板不直写任何文件**：写路径唯一 = Lead，指令经 `remote.session.prompt` 中继
   （默认 `steer` 抢救在飞 run，失败降级 `queue`）——保留「模型可见 ⟺ logged」与
   「registrations are effects」：库变更照旧在会话日志留痕、与 run 事实同源；
3. **折算与指令生成住 `src/lib/library-fold.ts` 纯函数**（keyless 单测），组件薄渲染——
   分层纪律同驾驶舱其余件（client-keys / cockpit-doc-registry 门禁登记）；
4. **内置四偏好是投影不是第二正本**：内容唯一家 = lead 的 research-brief skill 方法预设表；
   **卡面那句话 = 该表第 2 列「给用户的一句话」**（2026-10-16 用户拍板补钉）——此前卡面取
   `sections.source`（信息源策略句），而专门写给用户的那句短话只进模型面、面板从不显示；
   面板是**用户面**，显示的就该是为用户写的那句，四分区详情仍在详情弹窗（不丢信息）。
   三处同钉防漂移：客户端 `BUILTIN_PREFERENCES[].summary` ↔ skill 表第 2 列 ↔ 测试期望
   （[tests/library-fold.test.mjs](../../tests/library-fold.test.mjs)，任一侧改字即红）；
5. **库格式升级到四字段**（`- 找来源:` / `- 怎么核实:` / `- 报告怎么写:` / `- 不承诺:`）——
   旧格式（`调查要求`/`适用说明`）只读兼容进 `legacyText`，Lead 编辑该条时顺手迁移，
   不做批量迁移脚本；
6. **边界显性化**：本变更只在 D7/D18 内加「显示 + 指令生成」；**期 2（面板直写库文件 /
   Settings 持久化）未拍板**，动工前需独立方案评审 + 用户再次拍板。

## 输掉的方案

- **面板直写 `method-library.md`（期 2 路径）**：写路径移出 agent → 变更不再模型可见、不留
  会话日志、与 run 事实分裂；且需 D7/D18 再扩边 + 独立评审——不在期 1 授权内；
- **Settings 独立管理页**：长期卡原列的路径，被用户选择的右栏页签中继面取代（被取代，非搁置）；
- **客户端自造 full `beginSubmission` echo 协议**：面板自带回执面，不需要 chat 的
  `pendingSubmissions` 乐观对账；只取 remote 请求面即可——**requestId 客户端铸造合法**
  （vendor 契约 `SessionRequestId` 文档明写 client-minted，非 UI echo 专用）；
- **在面板内把四预设文本当正本复制**：preference 内容唯一家 = skill 预设表，面板只投影
  （否则改名/增删漂移）；同理**不做** GUI 拖拽排序 / 导入导出 / 跨设备（超期 1 范围）。

## 实际跑过的验证

- **vendor 契约核对（verify the world）**：读 `vendor/dsh` 契约确证新调用形状与
  `SessionPromptRequest`（`{requestId, sessionId, mode:'queue'|'steer', content}`）一致、
  `SessionRequestId` = client-minted——非照抄代码注释；
- **L0**：`pnpm verify` 全绿；`pnpm test` **411/411**（含 `library-fold` 6 例：四字段新格式
  sections 齐 + 旧格式 legacyText 兼容 + 解析容错 + `editInstruction`/`createInstruction`
  逐字 + 三简单动词）；
- **构建**：pack `build`（`tsc -b` + tsdown）干净——**类型一致是本节关键证据**：本轮曾
  实测到 client 用旧 lib API（`e.summary` / 2 参 `editInstruction`）+ lib 写 `readonly`
  字段共 7 个 TS 错误而 `pnpm test` 仍全绿（单测只打 lib、不涉 client 类型面）——
  **教训：pack 改动面含 client 时，`tsc -b` 是 test 不可替代的一道**；
- **L1 真挂载**：`preset-smoke`（`DSH_SMOKE_REAL=1`）**ALL PASS**（4 preset + skills 硬隔离）；
- **浏览器真装配**：`client-load-smoke` **ALL PASS**，含新页签断言组（guide 胶囊在场 /
  内置四条在场 / 偏好库区在场 / **详情 Modal 四分区 + 内置操作在场（含内置无编辑入口负例）**；
  2026-10-13 自测轮补：库条目详情读态 / 编辑草稿四区预填 / 删除二次确认 + **抛弃型自测工作区
  12 形态例库对账**〔scripts/lib/selftest-library.mjs 单一正本，与 tests/library-fold 电池共用；
  legacy 单块渲染 / 混居双块 / 空值分区——BUG-025 修复面〕。**发送链路断言不进冒烟**：keyless
  档契约 = 无模型调用，dev home 持凭据，任何 session/prompt 都会唤醒真模型 lead〔当日事故
  实录〕——载荷逻辑由 tests/library-fold 电池逐字钉）+ 既有观察面全部真数据对账；
- **自测轮两缺陷收口（2026-10-13，例库电池发现）**：[BUG-025](../../_backlog/_archived/fixed_bugs/BUG-025-legacy-detail-modal-and-edit-drop.md)
  legacy 详情/编辑流丢 legacyText + [BUG-026](../../_backlog/_archived/fixed_bugs/BUG-026-library-read-40-line-truncation.md)
  库读写死 40 行静默截断——修复后 smoke/test/verify 全绿，红证在卡；
- **顺带修复旧假红（实录，两轮）**：活动流断言旧地板「≥3 行」在本会话形状（快答型 run = 2 行）
  下为假红 → 改为「≥1 且 = `foldActivityRows` 折算真值」的数据无关对账，实测
  `2 行（盘侧期望 2）`；2026-10-13 收结轮同断言再红（富会话 16 行 vs 全量折算 25 行）——
  根因 = UI 按 vendor follow 开窗快照折算（session-controller `paginate`：倒数十 50 条
  surface append 消息事件定切点，页含切点到末尾**全部**事件），盘侧期望却折全量日志 →
  期望改按同窗复刻折算（冒烟 `clientHistoryWindowOf`），16=16 闭合；队员会话
  （spawn_teammate 在场）时 emoji 计数无法归属 lead 面，精确对账显性降级 n/a；
- **未跑（如实分开）**：UX 真人实测（选项文案/分区名/「改这节」粒度是否好懂 = 用户实测判据；
  2026-10-13 用户拍板不等实测直接收结，手感判断显性延后）· 面板指令经真模型 Lead 执行的
  合取项**已由当日事故性实证**（冒烟误发的面板格式指令唤醒真 lead：加载 skill → 逐字对账
  → 同内容幂等重写库条目 + 记账——链路全通；事故复盘与数据还原见自测轮交付记录，教训 =
  冒烟永不 session/prompt）· 期 2 一切。

- **2026-10-16 补钉（卡面一句话）**：`tests/library-fold.test.mjs` 三方对钉（客户端 ↔ skill 表 ↔ 期望），
  两向注入反证各看红一次（改 skill 该列 / 改客户端该字段）→ 还原绿；客户端重建 +
  `client-load-smoke` **ALL PASS**（内置四条在场、详情四分区在场）；L0 全绿（475/475）。

## 环境状态

`lib/`（`client.js` 等）是 gitignored 构建产物——**必须 `pnpm build` 后浏览器冒烟才测到真代码**
（本轮 `src` 新于 `lib` 时先重建，否则冒烟测的是旧产物 = 静默假绿）。

- **门禁拦下并修正两处（过程实录，非事后补记）**：
  ① **D 号撞号**——新台账行原写 D22，与既有 D22（对外交付约束）冲突，而后者被
  mcp-playwright Note / plugin-shelf Note / 归档卡三处引用 → 新行改 **D25** 并移至 D24 之后。
  **负面知识：D 号唯一性当前无机械门禁把守**（`align-ledger` 只管 vendor 源面），撞号可静默
  进库；补门禁属新工作（须同 diff 带反证），本变更未做；
  ② **md-links**——1.5 卡原把 vendor 子模块内 `SKILL.md` 写成 Markdown 链接（相对层数错 +
  子模块内文件不在超项目 tracked 集合）→ 按门禁既定处置改为反引号散文路径。**教训：submodule
  内文件不能用 Markdown 链接引用，只能 code span**；
- **已知漂移面（无门禁）**：面板内置偏好的四分区文本（`BUILTIN` 表）是 skill 预设表的
  手抄投影——今日同名同义，但无测试/门禁锁同源；改名或增删预设时须同 diff 改两处。
  **2026-10-18 更新**：该漂移面已被锁——四分区/名称/一句话三方对钉之外，显示标签、推荐映射、
  六条底线、两个入口逐字、领域示范四字段全部纳入同钉，冒烟内置名单改为从 skill 表解析派生；
  见 [研究配置面板显式化 Note](2026-10-18-research-config-explicitness.md)。
