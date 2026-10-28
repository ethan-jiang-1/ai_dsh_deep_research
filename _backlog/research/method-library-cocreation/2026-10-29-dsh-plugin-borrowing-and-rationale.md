---
topic: 方法库页内共创对 DSH 现成插件/机制的借用清单与设计理由
intent: 给外部 reviewer 的上下文——用了 DSH 哪些既有机制、每个为什么这样选、否决了哪些备选、证据在哪个文件/提交，避免“看起来像自造轮子”。
---

# 方法库共创：DSH 现成机制借用清单与设计理由

> 审阅入口：先读 [issue](../../issues/2026-10-29-method-library-workbench-redesign.md)，
> 再读 [A 方案滚动/智力体/切换规格](2026-10-29-option-a-scroll-and-intelligence.md)，
> 本页回答“为什么是这些 DSH 组件，而不是我们自己造”。

## 0. 一句话

整套东西**没有自造 agent loop、聊天 UI、工具协议、主题系统**；全部站在 DSH（`vendor/dsh`，钉 `dsh-v0.2.1-rc.2` @ `687f282e86`）的 preset / skill / tool / client-plugin / slot / conversation 机制上，只写了两层“业务胶水”：**方法库页的三栏/两视图布局** 与 **method-editor 的访谈 persona/skill + 写库窄工具**。

## 1. 借用清单

| # | DSH 现成件 | 我们怎么用 | 为什么用它 | 文件 |
|---|---|---|---|---|
| 1 | `@deepseek-ai/dsh-agent-preset` | 第 5 个 preset `method-editor`（非研究角色） | 角色=preset 是 DSH 原生定义；不改 loop、不改 bundle 顺序 | `presets/method-editor.patch.yml` |
| 2 | `skill-filesystem` + `tool-skill` | `method-interview` / `method-from-run` 两个 skill | 渐进披露：细节放 skill，persona 只留纪律；避免巨型 system prompt | `presets/method-editor/skills/*/SKILL.md` |
| 3 | `@deepseek-ai/dsh-tools` 的 `defineTool` + `ctx.tools.register` | `method_library_upsert` / `method_library_remove` 两个 host 窄工具 | 工具是模型唯一写库路径；schema/render/presentCall 都由 DSH 契约管；面板永不直写（D25） | `src/method-library-tool.ts` |
| 4 | `tool-ask-user`（`ask_user_question`，blocking） | 方法编辑一次一问，选项式 | 复用原生问卡（有选项、会暂停、答案进历史）；不自造表单 | preset 行 |
| 5 | `@deepseek-ai/dsh-client` 插件 | `inject` 拿 sessions/workspaces；`scoped.effect` 注册 slot/style/toolview | DSH 的 client plugin 模型：**registrations are effects**，scoped 生命周期 | `src/client/index.ts` |
| 6 | `conversation.content` + `SessionProvider` | 右栏方法编辑的聊天树 | 复用原生会话渲染：历史、流式、问卡、工具行、滚动 | `src/client/method-library/coach.tsx` |
| 7 | `shell.overlay` + `createPortal` | 把聊天树挂进页面右栏的 host | 绕开 `conversation.content` 在自身 occurrence 内递归的限制；仍在同一 tab 内 | `coach.tsx` |
| 8 | `conversation` 的 `[data-conversation-scroll]` | 自动贴底、上翻暂停、新消息胶囊 | 原生聊天已有滚动容器，不重写聊天 | `coach.tsx` |
| 9 | `tool.call.toolview` slot | `MethodLibraryToolCard` 显示「已写入库：名称」 | 工具卡是 DSH 的扩展点；不把 JSON 参数暴露给用户 | `MethodLibraryToolCard.tsx` |
| 10 | `--dsw-alias-*` 主题 token | 方法库页全部颜色 | 跟随系统明暗；不硬编码白底/蓝字 | `styles.ts` / `views.tsx` |
| 11 | CSS `:has` + `data-` 钩子 | 主 composer 只在方法库编辑态让位 | 不改 vendor 组件；用页面作用域抑制外层 composer，保留右栏自己的输入框 | `index.ts` |
| 12 | `session` / `workspaceId` | 一 workspace 一个方法编辑会话，固定标题「方法编辑」 | 侧栏可见、可回访；不用 localStorage（FAQ 26）；确定性 id + retain-first | `index.ts` |
| 13 | `agent-team` 团队机制 | **不用**：方法编辑不进研究团队 | 它是“方法编辑”，不是研究角色；`allowedAgentPresets` 不含它 | `presets/*.patch.yml` |
| 14 | 源码 web harness（`dev/boot-run.sh` / `--profile web` / overlay） | 真模型 probe、client-load、3083 验收 | “verify the world”：真页面、真会话、真工具，不 mock | `dev/`、`runtime/probe-save/` |
| 15 | 仓内 `scripts/lib/playwright.mjs` | 真浏览器截图/断言 | 已有唯一实现；不新装依赖 | probe / smoke |

## 2. 关键设计选择与备选否决

### 2.1 为什么方法编辑是 **root session**，不是 subagent/fork
- 证据：Live child agent 不能调 `ask_user_question`（subagent 无宿主 answerer），而访谈核心就是一次一问。
- 否决：subagent（不能问人）、fork（会话继承研究上下文，语义污染）、页面内自建聊天（没有会话/历史/工具）。
- 出处：`2026-10-28-dsh-session-and-surface-internals.md` §2/§14（已归档）。

### 2.2 为什么聊天树用 `shell.overlay` + `createPortal`，而不是直接嵌
- 直接嵌 `conversation.content` 到方法库页 = 在它自己的 occurrence 内递归渲染，vendor 明确抛 `recursive render of factory 'conversation.content'`。
- `shell.overlay` 是根级、非 `conversation.content` 的合法挂载点；portal 把 DOM 投进页面右栏，视觉仍在 tab 内。
- 否决：`conversation.view`（external 视图不支持内嵌聊天）、iframe（会话/样式/主题割裂）、右栏 tab（用户明确要求留在方法库 tab）、独立会话页（跳转）。

### 2.3 为什么写库是 **host 窄工具**，不是面板直写/Lead 写
- D25：方法编辑是唯一写者；面板只读 + 发封套；Lead 不碰方法库。
- 工具只有 upsert/remove 两个动作、只碰 `<cwd>/method-library.md`、同名 upsert、fail-loud；模型不可能“顺手”改别的文件。
- 否决：面板 `writeFile`（绕过模型、无审计）、Lead 代写（研究与方法编辑职责混淆，旧实现已证会漏字段）。

### 2.4 为什么用 **skill** 而不是把访谈规则塞进 persona
- 访谈细节（四字段判据、一次一问、转换、`method-draft` 契约、撞名、保存话术）很长；全塞 persona 会挤占上下文且难迭代。
- skill 是按需加载的；persona 只留“你是谁、纪律、保存交工具”。
- 否决：巨型 persona（维护差、每次全量注入）。

### 2.5 为什么一次一问用 **原生 ask_user_question**
- 原生问卡：选项、暂停、答案入历史、可跳过；方法编辑不会“自问自答”。
- 否决：让模型在正文里问（用户可能不回、流程不阻塞）、自造表单（重复实现）。

### 2.6 为什么颜色必须 **`--dsw-alias-*`**
- DSH 主题 token 随系统明暗；硬编码白底/蓝字在深色模式必炸（已实际发生并被用户指出）。
- 否决：自带一套 theme、跟随 `prefers-color-scheme` 手写（与 DSH 主题脱节）。

### 2.7 为什么主 composer 用 **`:has` 抑制**
- 目标：页内只有一个可见 composer；主会话 transcript 不动。
- 原生 composer 的链式抑制拿不到模块 store，CSS `:has` 在 DOM 层解决；只在外层 seat 有 pending 问卡时让位（右栏问卡不受影响）。
- 否决：改 vendor 组件、隐藏 `conversation.composer` slot（会影响其它页）。

### 2.8 为什么不用 **localStorage** 存会话 id
- FAQ 26：pack 代码不得用浏览器持久化。用确定性 id（`method-coach-<hash>`）+ 先 retain 再 create；工作区唯一。
- 否决：localStorage（违反契约）、每次新建会话（历史断裂）。

### 2.9 为什么对话区要 **自动贴底 + 上翻暂停 + 胶囊**
- 用户明确要求“像正常 LLM 对话”：最新始终可见、旧的自然滚出、上翻阅读不被打断。
- 复用原生 `[data-conversation-scroll]`，只加“何时跟随”的策略，不重写聊天。
- 否决：整页滚（已实际发生并被用户否）、把对话折到底部（历史丢失）。

### 2.10 为什么方法编辑 **不挂 web/fs/subagent**
- 它是访谈者，不是研究者；挂 web/fs 会让它绕开窄工具、破坏 D25 的写入边界。
- 否决：给方法编辑全工具（越权、审计困难）。

## 3. 外部 reviewer 的阅读路径

1. `_backlog/issues/2026-10-29-method-library-workbench-redesign.md`（目标/流程/状态/验收）
2. 本页（为什么这些机制）
3. `2026-10-29-option-a-scroll-and-intelligence.md`（滚动/智力体/切换）
4. `2026-10-29-ux-redesign.md` + `ux/*.svg`（视觉）
5. `2026-10-28-dsh-session-and-surface-internals.md`（已归档；spike 26 条断言与递归/portal 证据）
6. 代码：`presets/method-editor.patch.yml`、`src/method-library-tool.ts`、`src/client/index.ts`、`src/client/method-library/coach.tsx`、`src/client/MethodLibraryView.tsx`
7. 证据：`runtime/probe-save/artifacts/2026-10-28T20-38-14-046Z/`（真模型保存闭环）、`pnpm verify` / `pnpm test`

## 4. 会被 challenge 的点（我先列出来）

- **portal + overlay 的复杂度**：能否接受 `conversation.view` 的替代方案？——现在 vendor 不支持内嵌聊天，这是实测限制。
- **CSS `:has` 的脆性**：它依赖 vendor 的 `data-conversation-scroll` / `data-composer-seat` / `data-question-key`；换 vendor tag 时要重校（discipline-map 有登记）。
- **方法编辑的“智能”仍偏薄**：目前是 persona+skill 驱动；冲突追问、字段↔消息可追溯 id、显式 active 事件还没进协议（见规格 §7）。
- **一次一问的选项质量**：依赖模型生成；坏选项会让用户烦。缓解：允许跳过/手写/“你定”。
- **3080/3083 新旧包**：旧 profile 跑旧包是环境事实，不是设计缺陷；验收要用 3083 新 pack。
