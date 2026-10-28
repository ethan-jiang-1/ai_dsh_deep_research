---
status: 推敲中
opened: 2026-10-28
---

# 推敲：方法库页内对话共创（独立会话 + 方法编辑 preset）

> 立卡：2026-10-28 ｜ 状态：推敲中（2026-10-28 用户拍板：页内三栏 + 方法编辑写库 + 一 workspace 一会话；spike 已跑）｜ 类型：Feature ｜ 结论倾向：现在做（准备落地）｜ 可关闭：否

**问题与期望结果：** 方法库「新建方法」是一张四字段空表（找来源 / 怎么核实 / 报告怎么写 / 不承诺），
陌生用户不知道这四个词背后的质量标准，填不出来。期望：用户在这页里用对话把方法聊出来，
表随对话逐格成形；对话占一条独立会话、不干扰主对话；用户全程停在「方法库」tab 里，
保存与回执也在这页闭环。**用户不困惑优先于技术优雅。**

**当前情况：** 页面只有表单；保存 = 给当前会话的 Lead 发 `session/prompt`，回执在 Chat tab，页面只让「点刷新」。
spike 已证明最终形态（2026-10-28，分支 `spike/method-coach-embed`）：方法库 tab 内做**普通 React 三栏**
（我的库 / 新建方法表单 / 方法编辑对话），coach 会话的 React 树放在根级 `shell.overlay`
（在外层 `conversation.content` 之外，绕开递归门），用 `createPortal` 把 DOM teleport 到页面右栏；
主 composer 用 CSS `:has` 抑制、外层 pending 问卡自动让位。26 条断言全绿，证据见
[调研篇 §14](../research/method-library-cocreation/2026-10-28-dsh-session-and-surface-internals.md)。

**拍板记录：** D2 → 第 5 个 preset「方法编辑」（非研究角色），登记 D37；D25 → 方法编辑写库（面板仍永不直写）；
会话 → 一 workspace 一个「方法编辑」；载体 → **页内三栏（portal）**，不做固定浮层、不做右栏 chat tab。
**下一步：** 按 `## 实施计划` 的阶段 1 开始；先可点页面 + 假回复，再接 preset/skill 与草稿闭环。

## 已知与未决

### 已确定（源码 / spike 证据）

- **会话实体只有 Session**；subagent child 不能调 `ask_user_question`，所以 coach 用 root session。
- **root session 用 `workspaceId` 建**才进同一工作区；只给 `cwd` 会落 Ungrouped。
- **直接嵌 `conversation.content` 被 vendor 递归门拦死**；根级 `shell.overlay` + `createPortal`
  进页面是可行解（spike 26 步绿）。
- **双 composer 是真实坑**：`conversation.view` 只换正文，主 composer 仍在；CSS 规则
  `[data-conversation-scroll]:has([data-method-library]):not(:has(> [data-composer-seat] [data-question-key])) > [data-composer-seat]{display:none}`
  隐藏主 composer，且只对外层 composer 自己的问卡让位（coach 的问卡在页面里，不误触发）。
- **coach 用 lead 替身时会出现 Think/Read/Glob/研究 HITL**——这正是要消掉的困惑；方法编辑必须
  不研究、不展示研究工具卡。
- **当前写路径 = 当前会话 Lead**；D25 扩成「有库技能的 agent」后由方法编辑写。

### 未决 / 待落地

- 方法编辑 preset/skill 的真实访谈质量（spike 用 lead 代跑）；
- coach 的 skill/read/write 工具卡如何压成一行/隐藏（keyed toolview 按会话判断；或窄工具）；
- 草稿回填、手改、撤销、保存回执、库刷新（spike 只到布局）；
- 侧栏「方法编辑」行与页内聊天的一致性文案；
- 空态/起手式/首问的具体文案（当前只有 spike 原型）。

## 最终形态（UX 基线）

### 页面：方法库 tab 内三栏

- 左：我的库（搜索、列表、内置参考入口）；中：新建/编辑表单；右：**方法编辑对话面板**。
- 页面是正常 React/CSS：`display:flex`，右侧 380px 固定栏，表单独立滚动；不是浮层、不是右栏 tab。
- 读态沿用现有只读视图；新建/编辑态切到三栏；保存/取消在表单底部。
- 右侧聊天面板：标题「方法编辑」+ 一句人话（"把这条方法聊清楚；保存时我来写库"）+ 起手式 chips；
  下面是原生 conversation（消息、问卡、composer）。
- 首开：方法编辑先问一句（或 chips），不出现空表 + 空 composer；表单四字段带人话提示。
- 只有一个可见 composer（页面右栏）；主 composer 隐藏；外层研究 pending 问卡出现时让位。

### 会话：独立 root session，用户不需要知道

- 一 workspace 一个 coach session：`workspaceId` + `agentPreset: 'method-editor'` + 标题「方法编辑」；
  确定性 session id（`method-coach-<workspaceKey hash>`）做锚——FAQ 26 零浏览器持久化；先 retain，失败才 create；
  当前会话本身就是 coach 时复用。
- 侧栏出现一行「方法编辑」；与右栏标题同名；点开是同一会话。
- 聊天面板的 React 树在根级 `shell.overlay`（`createPortal` 进页面），主会话的 transcript/上下文/composer 不变。

### 方法编辑：第 5 个 preset + 两个 skill

- `method-editor`（非研究角色）：persona 只做方法访谈/写库；一次一问；先给选项；不研究、不检索、不组队。
- 工具：`tool-ask-user`（blocking）、`tool-skill`、`time-context`、`tool-fs`（read/write/edit，只碰方法库）。
  **不挂** web/subagent/goal/present/session-query/bash/agent-instructions。
- skills：`method-interview`（四字段判据、选项集、转换模式、输出契约、库意识、写入、反模式、停手）+
  `method-from-run`（按需读 question.md/final.md/evidence 归纳）。
- 工具卡收口：skill/read/write 卡在 coach 会话里压成一行/隐藏（keyed `tool.call.toolview` 按会话判断）；
  右栏只留问答、草稿、回执。若 toolview 代价高，退窄 host 工具 `method_library_upsert`（只写库、带干净卡）。

### 草稿 ↔ 表单 ↔ 保存

- coach 每轮有变化就在消息末尾给**完整库条目**（`## 名称（来源）` + 四行），页面解析 `foldLibrary` 回填；
  字段标「来自对话」、可撤销；手改不被静默覆盖。
- 手改后下一条消息带一行 diff；保存封套带完整条目 + 新建/更新 + provenance。
- 保存：页面发给 coach → coach 写 `method-library.md` → 页面回读对账 → 三态回执（已发送/已回话/已落盘）→
  刷新左侧库。删除/设默认同路；研究时「换一条」仍走 Lead。
- 研究 Lead 不再是方法库页的写入者；主会话不收到任何方法指令。

## 验收标准

### 用户面（不困惑）

1. 全程只在「方法库」tab 内：没有浮层、没有右栏 chat tab、没有会话切换；
2. 首开有方法编辑的第一问或起手式，不是空表 + 空 composer；
3. 一次一问 + 2–4 个选项；没有 Think/Read/Glob/研究 HITL/长研究 prose；
4. 表单自动回填、可手改、可撤销、有「n/4 已定」进度；保存后回执在页内、库就地刷新；
5. 页面只有一个 composer；主 composer 隐藏；外层研究问卡出现时优先；
6. 左栏「方法编辑」行与右栏标题一致；点开是同一会话；
7. 模型/预设不可用时，表单照常能填能存，只提示「方法编辑暂不可用」；
8. 页面文案不出现 spike/session/portal/recursive 这类技术词。

### 技术面

1. 页内三栏 + portal + SessionProvider + conversation.content（spike 26 步绿；分支 `09bba8a`）；
2. 主 composer 抑制 + 外层 pending 让位（spike 绿；CSS 规则只认外层 seat 自己的问卡）；
3. 方法编辑 preset 真挂载（preset-smoke）+ 全角色 l4-lite + snapshot fixture；
4. keyless：`method-draft` 解析/回填/手改 diff/保存封套 round-trip；四标签与 `library-fold` 对钉；
5. 真模型 probe：5 种人（很模糊/过度指定/「不知道」/贴旧做法/从 run 沉淀）各跑通，条目过结构校验；
6. client-load smoke 页面/三栏/一个 composer/主会话日志不变；`pnpm verify` + `pnpm test` 绿；
7. D37/D2/D25、`design/40` §2.7、pack README、`20-roles`、`docs/00-index` 同 diff 更新。

## 实施计划

### 阶段 0 · 冻结（已完成）

- spike 分支 `spike/method-coach-embed`（commit `09bba8a`）证明页内三栏 + portal + 一个 composer + 主会话不动；
- master 无 spike 代码、生产 pack 已重建；本卡 + 调研 §14 记录最终形态；
- 退出：三栏/聊天面板/主 composer 抑制作为实现基线（spike 只读参考，不合并）。

### 阶段 1 · 客户端页面（先可点，不接模型）

- `MethodLibraryView.tsx` 新建/编辑改三栏：库 / 表单 / 方法编辑；读态沿用；
- `method-library/coach.tsx`：coach session 的 portal/聊天面板/store/起手式/空态；
- `keys.ts` / `index.ts`：coach session 创建（workspaceId + 标题）、`shell.overlay` portal、私有子槽、
  `SessionProvider`、`conversation.content`、CSS 抑制；
- `src/lib/method-draft.ts` 骨架：解析 `method-draft` 围栏 → `foldLibrary` → Draft；字段 provenance/undo；
- 验收：client-load smoke 页面/三栏/portal/一个 composer/主会话日志不变；起手式/空态/取消；
- 证据：keyless + client-load + 截图。

### 阶段 2 · 方法编辑 preset + skill

- D2/D37：`presets/method-editor.patch.yml`（persona/工具/skill 目录）+ `presets/method-editor/skills/{method-interview,method-from-run}`；
- 工具卡收口（keyed toolview 按会话压行/隐藏；或窄 host 工具，二选一，默认前者）；
- 机械面：preset 数量哨兵 5、`preset-structure` 时钟行、`l4-lite` PROMPTS、snapshot fixture、roster/文档；
- 验收：preset-smoke 真挂载、l4-lite 全角色、snapshot、真模型 5 种人 probe；coach 不做研究、一次一问。

### 阶段 3 · 草稿 ↔ 表单 ↔ 保存闭环

- 每轮解析 coach 的完整库条目 → 回填；字段「来自对话」/撤销；手改 diff 回传；撞库提示；
- 保存封套 → coach 写库 → 回读对账 → 三态回执 → 刷新库；删除/设默认可选；
- 验收：keyless round-trip；真模型保存；回读；失败态；手改不覆盖；库列表刷新；主会话无方法指令。

**2026-10-28 复盘（用户指出「对话引导填写不对」）**：首版只做了 parser + **整体覆盖**回填 + 整体撤销；
字段级引导、手改保护、进度、逐字段来源、手改 diff、保存闭环都没做——被 demo 节奏掩盖了。已补：

- 字段级 merge（`mergeCoachDraft`）：**手改字段永远以用户为准**，其余字段取 coach 新值；coachFields 记录
  哪些格来自对话；activeField = 相对上一轮 coach 草稿刚变化的第一格；上一轮态保留给撤销；
- 页面：手改集合、active 高亮/滚动、n/4 进度、per-field「来自对话 / 手改 / 待定」、900ms 手改 diff
  回传（「以用户为准，不要覆盖」）、撤销对话更新；keyless merge 3 条 + parser 5 条；client-load 绿。

**2026-10-28 保存闭环真模型验收**：host 窄工具 `method_library_upsert` + 页面保存封套 + 三态回执已落地
（commit `69dc257`；回执顺序/卡片修复 `5e3b099`）。真模型端到端 probe（源码 web + 临时 workspace +
method-editor 9 轮问答）**全部通过**：问卡 → 四字段回填 → 保存 → coach 调工具 → 磁盘 `method-library.md`
含标题+四字段 → 页面「已落盘核对通过」；证据 = `runtime/probe-save/artifacts/2026-10-28T14-04-52-928Z/`。

**2026-10-28 阶段 4（UX/降级）**：字段人话提示、撞名保存前确认、读态「和编辑聊聊」、方法编辑不可用降级文案、
起手式三路（从零/照内置/从最近 run）已落地；`pnpm verify`/`pnpm test` 绿。

**仍缺**：删除/设默认；内置参考的逐条选择入口；空态细节；client-load 的 roster 红（dev home 某 run 的 spawn 数据漂移，与方法库无关）；phase 5 收口（snapshot/release/用户验收/implemented）。

撞库提示；删除/设默认；真模型访谈 probe（现在 l4 只测了 preset 挂载/标记，没测一问一答与落表）；
空态/降级/读态「和编辑聊聊」；页面级 keyless/真模型测试。

### 阶段 4 · UX/文案/降级

- 起手式/首问/进度/保存文案/错误态；读态「和编辑聊聊」；coach 行「方法编辑」；无技术词；
- 模型/预设不可用 → 表单照常 + 提示；portal 异常 → 表单照常 + 「方法编辑暂不可用」；
- 验收：人工走 3 条路径（从零/照内置/从 run）+ 手改 + 保存；`## UX 验收` 逐条。

### 阶段 5 · 门禁/文档/交付

- D37/D2/D25、`design/40` §2.7、pack README、`20-roles`、`docs/00-index`；
- `pnpm verify` + `pnpm test`；preset-smoke / l4-lite / snapshot / client-load / release-smoke（装态）；
- 退出：技术验收全绿 + 用户验收；`implemented` 与交付同一变更，不先关后补。

## 风险与边界

- **coach 工具卡**：skill/read/write 的卡可能仍闪；先做 keyed toolview 收口，必要时退窄 host 工具；
- **侧栏「方法编辑」行**：root session 必然可见；标题与页内一致；不接受则只能回 subagent（丢原生问卡）；
- **portal / react-dom**：`react-dom` 必须外置（否则 bundle 翻四倍、可能双 React）；spike 已验证；
- **CSS `:has`**：DSH Web 是 Chromium；规则只对外层 seat 的卡让位；换主题/改 DOM 需重验；
- **D2/D25/D37**：preset 数量/哨兵/roster/snapshot 和写者变更都要同 diff；P0 不适用；
- **coach 模型质量**：skill 写得好也可能漏块/多块；解析失败不覆盖 + probe；
- **一 workspace 一会话**：多草稿共用一个 transcript；先这样，实测难读再考虑一草稿一会话。

## 关闭条件

- 阶段 1–5 完成，`## UX 验收` 与 `### 技术面` 全绿，用户验收；
- D37/D2/D25 登记落地，`design/40`/pack README/roster 同 diff；
- 若中途叫停：记录理由与可观察重议条件，按去向归档。

## 影响面

- **pack**：`presets/method-editor.patch.yml`、`presets/method-editor/skills/**`、`package.json`（bundle patch/peer/dev deps/client inject）、
  `workspace/method-library.md` 头注（如需「方法编辑」措辞）；
- **client**：`MethodLibraryView.tsx`（三栏装配）、`method-library/{views,coach}.tsx`、`src/lib/method-draft.ts`、
  `src/client/keys.ts`、`src/client/index.ts`（session/portal/composer 抑制）、`tsdown.config.ts`（react-dom external）；
- **docs**：`docs/design/40-research-cockpit.md` §2.7、`docs/design/20-roles.md`、`docs/decisions.md`（D2/D25/D37）、
  pack README、`docs/00-index.md`；
- **门禁/测试**：`tests/pack/presets.test.mjs`、`l4-lite-smoke`、`preset-smoke`、`snapshot-replay`、`client-load-smoke`、
  `client-keys`/`client-effect-wrap`/`cockpit-doc-registry`、`row-deps`；
- **生成物**：`dev/render-overlay.mjs`、`runtime/harness-home/profiles/research/` 镜像、`boot-run` 漂移检测。

## 证据

- 调研篇：[2026-10-28-dsh-session-and-surface-internals.md](../research/method-library-cocreation/2026-10-28-dsh-session-and-surface-internals.md)（§14 = spike 实跑）
- spike 分支：`spike/method-coach-embed`（commit `09bba8a`，仅实验、不合并）；证据 =
  `runtime/spike-embed/artifacts/2026-10-28T05-58-46-583Z/`（01–04 截图；gitignored）
- 现行页签与保存路径：[MethodLibraryView.tsx](../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)
- 库格式与四标签：[library-fold.ts](../../packages/deep-research-pack/src/lib/library-fold.ts)
- 现行方法库政策（Lead 侧）：[research-brief/SKILL.md L87-L105](../../packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md)
- 驾驶舱构成正本：[design/40 §2.7](../../docs/design/40-research-cockpit.md#cockpit-7)
- 决定台账：[D2](../../docs/decisions.md#d2)、[D25](../../docs/decisions.md#d25)
