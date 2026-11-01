---
status: 推敲中
opened: 2026-11-01
---

# 推敲：产品首屏体验——用户打开浏览器后知道从哪开始

> 立卡：2026-11-01 ｜ 状态：推敲中（用户 2026-11-01 授权静默自主执行） ｜ 类型：Task ｜ 结论倾向：现在做——首屏目标已列，待父卡确认信息密度与实现边界 ｜ 可关闭：否
>
> 落地位置：**S2（首屏产品可用）**；依赖 A1 的工作区/标题与 C2 的浏览器 harness，见[落地计划](../research/plugin-as-product/2026-11-01-landing-plan.md)。
> 落地记录（2026-11-01）：`StartCard.tsx` + `start-card.ts` 判据 + `conversation.input.dock` 注册 + `product-boot-smoke` 首屏断言已交付；saved-session 自动切换仍是 P1。

**问题与期望结果：** 产品启动器把 Web 起起来后，用户看到的是一个 blank Lead Session + 标准 DSH 聊天框 + 空的研究状态页签。用户不知道这是 Deep Research、该直接问研究问题、Lead 会先问三问、右栏是观察面、交付在终稿页签、当前工作区是哪个、没有 API key 能不能用。期望：首屏就是一个产品入口——品牌、当前工作区、起步指引、凭据提示、观察/交付入口说明；用户不需要读 README 才能开始第一场研究。

**当前情况：**

- 包内已有 Orca 品牌标/名（`src/client/index.ts` 注册 `RESEARCH_BRAND_MARK_SLOT` / `RESEARCH_BRAND_NAME_SLOT`），首屏已有品牌。
- vendor 的 `conversation.hero.workspace` 已显示 Workspace picker/标题；Host 可以用 `workspaceRegistry.create(path, title)` 给产品化标题。
- 右栏「研究状态」「研究配置」「研究图谱」「终稿」页签已在包内注册；没有 run 时大多为空。
- 目前没有"起步卡"；用户要读 pack README/manual 才知道 HITL1 两段卡、静默自主区、HITL2、终稿页签。
- 首屏工作区可能不是启动工作区（浏览器 saved Session 抢占），需要可见指示/切换，不能静默打开错误目录。
- 数据面约束：包不新增 storage domain/localStorage/自定义 session event；首屏卡片不能用 localStorage 记"已看过"。

**下一步：** 父卡拍板后，与子卡 A/C 并行：A 给启动工作区与标题，C 给浏览器断言；本卡做卡片与文案。

## 范围

**做：**

1. **起步卡（首屏）**：在 blank Session、且当前工作区还没有 `drt_*` 时显示一张全宽卡片（优先 `conversation.input.dock`），内容：
   - 产品名/一句话（Deep Research：一支多角色研究团队，产出可溯源报告）；
   - 当前工作区路径/标题（读 `remote.workspaceFiles`/vendor picker 的当前 workspace）；
   - 三步起步：①直接问一个研究问题；②Lead 先问三问（类型/深度/时间口径）与计划确认；③右栏「研究状态」看进度，交付在「终稿」；
   - 凭据提示：没有 `DEEPSEEK_API_KEY` 也能用 DeepSeek 账号登录；搜索/回退的差别一句（不硬拦）；
   - 工作区不匹配提示：若当前 Session 的 `header.cwd` 与启动工作区不一致，显示"当前会话在 <cwd>；启动工作区是 <launch>"与切换指引（vendor workspace picker）。
2. **收起条件**：工作区已有 `drt_*` 或 Session 已有用户消息时收起；只读 `remote.workspaceFiles` / session 状态，不用 localStorage。
3. **文案与本地化**：中英两套文案（包内已有 locales 机制）；不新增模型可见文本（这是 Client 渲染，不进模型请求）。
4. **首屏与已有页签的关系**：不重复解释「研究状态」页签内部构成；只给入口与一句话。终稿页签的"交付后自动打开"已有行为，不重复实现。
5. **失败/空态**：工作区读不到、无 `method-library.md`、无 `drt_*`、无凭据时，卡片显示可读的下一步，不显示红错。
6. **证据**：真浏览器 smoke 断言首屏品牌、工作区、起步三步、凭据提示、Lead preset、composer 可用；saved-session 不匹配时有可见提示；有 `drt_*` 时卡片收起。

**不做：**

- 不做皮肤/主题/配色（D18/ui-skin 边界不变）。
- 不做完整 onboarding 向导、不新增设置页、不做工作区自动切换（P1）。
- 不新增模型工具、persona 文本或 session event；卡片只是 Client 渲染。
- 不修改 vendor 的 workspace picker/hero 结构；用现有 slot。
- 不用 localStorage/storage domain 记"已看过"；收起条件只读工作区/session 事实。

## 方案与取舍

| 方案 | 选择 | 理由 |
|---|---|---|
| 起步卡位置 | `conversation.input.dock`（全宽、composer 上方） | 不抢 hero；用户视线自然；已有 slot |
| 工作区显示 | 复用 vendor `conversation.hero.workspace` + 卡片内路径 | 不重造 picker；标题由 Host 创建时给 |
| 收起条件 | 工作区有 `drt_*` 或 Session 有用户消息 | 只读事实；不用 localStorage |
| 工作区不匹配 | 卡片内可见提示 + 指到 vendor picker | P0 不自动切换；诚实 |
| 凭据提示 | 一句"账号登录也可用；key 的差别" | 不硬拦；不泄露秘密 |
| 文案语言 | 包内 locales 中英 | 已有机制 |

## 验收标准

1. 新 home + 空工作区启动后，首屏可见：Orca 品牌、当前工作区路径/标题、起步三步、凭据提示、Lead preset、composer 可输入；不是空白困惑页。
2. 卡片只在 blank Session 且工作区无 `drt_*` 时显示；工作区出现 `drt_*` 或用户发出第一条消息后收起（刷新后仍收起，依据事实而非 localStorage）。
3. 当前 Session 的 `header.cwd` 与启动工作区不一致时，首屏有可见提示与切换指引；不静默假装在启动工作区。
4. 中英文案都在；不新增模型可见文本（snapshot/请求面无变化）。
5. 工作区文件读不到、无凭据、无方法库时，卡片显示可读下一步，不红错/不阻塞 composer。
6. 真浏览器 smoke 断言 1–3；`client-load-smoke`/`product-boot-smoke` 可复用；无模型调用。
7. 不新增 localStorage/storage domain/session event；`data-plane-invariants` 绿；`client-effect-wrap`/`client-keys`（如新增 key）绿。

## 依赖与风险

- 依赖子卡 A 的启动工作区/标题/`DEEP_RESEARCH_WORKSPACE` 与子卡 C 的浏览器 harness；可与 A 并行开发卡片。
- 风险：`conversation.input.dock` 的 session 作用域/收起条件可能需要读 workspaceFiles，首屏加载有延迟；用骨架/空态避免闪红。vendor slot 契约变化时随 pin 重校。
- 本卡不授予实施授权；父卡拍板后开工。
