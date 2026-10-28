---
status: 等人拍板
opened: 2026-10-28
---

# 推敲：方法库页内对话共创（独立会话 + 方法编辑 preset）

> 立卡：2026-10-28 ｜ 状态：等人拍板 ｜ 类型：Feature ｜ 结论倾向：现在做（待 D2/D25 与嵌入 spike 拍板）｜ 可关闭：否

**问题与期望结果：** 方法库「新建方法」是一张四字段空表（找来源 / 怎么核实 / 报告怎么写 / 不承诺），
陌生用户不知道这四个词背后的质量标准，填不出来。期望：用户在这页里用对话把方法聊出来，
表随对话逐格成形；对话占一条独立会话、不干扰研究会话；用户全程停在这页，保存与回执也在这页闭环。
完成判据见 `## 验收标准`。

**当前情况：** 页面只有表单；保存 = 给当前会话的 Lead 发一条 `session/prompt`，回执在 Chat tab，
页面只让用户「点刷新」——这正是要消掉的跳转（[MethodLibraryView.tsx L204-L234](../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)）。
DSH 侧的可行路径已查清：root session、workspace 归属、`conversation.view` 内嵌原生 conversation、
问卡、双 composer、preset/skill 与写入回执，证据与取舍见
[调研篇](../research/method-library-cocreation/2026-10-28-dsh-session-and-surface-internals.md)。

**未决问题：** 见 `## 需要拍板`——D2（第 5 个 preset）、D25（谁写库）、会话粒度、是否先做 spike。
**下一步：** 用户回答四问；批准后先做半天嵌入 spike（不写生产功能），红了就退右栏 chat tab。

## 已知与未决

### 已确定（有源码/先例证据）

- **会话实体只有 Session，没有 side/companion 第三态**；header 分类只有 `cwd` / `origin:'subagent'` /
  `parentSession` / `delegationDepth` / `agentPreset`（`vendor/dsh/packages/core/session/src/types.ts` L100-L131）。
- **root session 必须用 `workspaceId` 建才会进同一工作区**；只给 `cwd` 会落 Ungrouped
  （`vendor/dsh/packages/api/session-controller/src/commands.ts` L111-L143）。
- **subagent child 不能调 `ask_user_question`**（`vendor/dsh/packages/interaction/tool-ask-user/README.md` L12）——
  原生选项卡会消失，所以不选 child。
- **嵌入有现成同构先例**：ui-subagent 用 `SessionProvider` + `renderFactorySlot('conversation.content', {variant:'embedded'})`
  渲染另一个会话（`vendor/dsh/packages/client/ui-subagent/src/client/sidebar-chat/index.tsx` L126-L165），
  单测已钉（`vendor/dsh/packages/client/ui-subagent/tests/sidebar-chat.client.spec.tsx` L207-L219）。
- **双 composer 是真实坑**：`conversation.view` 只换正文，主会话 composer 仍在 view 之后
  （`vendor/dsh/packages/client/ui-conversation/src/client/skeleton/ConversationContent.tsx` L138-L215）；
  截图里看不到只是因为它被挤到折下。必须用 `conversation.composer` chain 抑制（pending 问卡时让位）。
- **方法编辑 persona 只能靠 preset**；新增第 5 个 preset 会动 D2、数量哨兵、`preset-structure` 时钟行、
  `l4-lite` 覆盖、snapshot fixture 与文档 roster。
- **当前写路径 = 当前会话 Lead**，D25 明写「唯一路径 = Lead」
  （[decisions.md L38](../../docs/decisions.md)）；方法编辑写库需要扩展这条的字面（理由不变）。

### 假设 / 待验（未跑真实 spike）

- 私有 session 子槽 + `SessionProvider` + `conversation.content` 能在 `conversation.view` 里稳定渲染
  （高度、滚动、composer、问卡、卸载/重挂）；
- `conversation.composer` chain 的抑制项能在方法库 view 激活时吞掉主 composer、pending 时让位；
- 一 workspace 一个方法编辑会话，多草稿共用一个 transcript 是否可读；
- 模型在 `method-interview` skill 下能稳定输出完整库条目块，而不是只聊天不落稿。

## 方案与取舍

### A. 会话：root session，一 workspace 一个「方法编辑」

- `session.create({ workspaceId, agentPreset: 'method-editor' })` → `remote.session.rename` 钉成「方法编辑」→
  `sessions.retain` → 嵌进页面。当前会话不在任何 workspace 时退回 `cwd`（两边都 Ungrouped，视觉一致）。
- localStorage 存 `workspaceKey → coachSessionId`；先 retain，失败再建。懒创建：用户第一次点起手式/发消息才建，
  不产生空行。当前会话本身就是 coach 时复用当前 id。
- 为什么不是一草稿一会话：侧栏行数会随新建次数增长；先一 workspace，实测 transcript 混读再改。
- 代价：第一次发消息后侧栏多一行「方法编辑」。这是 root session 的产品事实；可归档，不接受则退右栏。

### B. 嵌入：view 内私有 session 子槽

- `conversation.view` 注册时声明 `children: { METHOD_COACH_SLOT: { kind:'single', scope:'session' } }`；
  页面渲染 `<SessionProvider session={coachRef}>{renderSlot(METHOD_COACH_SLOT, {})}</SessionProvider>`；
  子槽组件调 `renderFactorySlot('conversation.content', { variant:'embedded', phase:'active', hero:false }, { slots:{ views: FixedChat } })`。
- 聊天标题、起手式 chips、空态由方法库页画；正文/流式/工具卡/问卡/停止/队列全用原生。
- 不加 RPC、不加 host 插件；只加 client 服务注入 `sessions`/`workspaces` 与一个私有槽 key。
- 失败退路：同一个 coach 会话放进右栏 chat tab（原生 `sidebar.chat.conversation` 模式），页面不动。

### C. 双 composer：chain 抑制，pending 例外

- 注册 `conversation.composer` chain entry：`viewActiveSession === owner.sessionId && owner.pendingInteraction === undefined`
  时返回 `null`，吞掉主 composer 的 fallback；页内 chat 的 composer 成为唯一输入。
- `pendingInteraction` 在场时不匹配 → `ui-user-questions` 的 entry 接住，研究 Lead 的问卡照常可答。
- 备选 CSS `:has` 隐藏不推荐：会把问卡一起藏掉。

### D. 方法编辑：第 5 个 preset（非研究角色）

- `id: method-editor`，`name: 方法编辑`，`order: 9`；persona 只做方法访谈/写库，不做研究、不检索、不组队。
- 工具：`skill-filesystem` + `tool-skill` + `tool-ask-user`（blocking）+ `tool-fs`（read/write/edit）+
  `tool-fs-search` + `time-context`；不挂 web/subagent/goal/present/session-query/agent-instructions。
- skills：`method-interview`（核心：四字段够用判据、选项集、转换模式、输出契约、库意识、写入规则、反模式、停手）
  + `method-from-run`（按需：读 question.md/final.md/evidence 归纳）。
- 输出契约：变了才发、发就发完整库条目（`## 名称（来源）` + 四行），客户端 `foldLibrary` 折回；
  保存封套带完整条目，模型逐字写库。

### E. 写入：方法编辑写，页内三态回执

- 页面把保存封套发给 coach（不是当前 Lead）：已发送 → 已回话 → 回读 `method-library.md` 确认「已落盘」；
  回话但读不到就如实说，不假装成功。落盘后刷新左侧列表。
- 理由：方法库是 workspace 级，不该依赖某个 run；研究会话不被塞管理指令；面板仍永不直写。
- D25 扩成「有库技能的 agent（研究时 Lead；方法库页 = 方法编辑）」，理由（模型可见、日志留痕）不变。
- 若用户要保 D25 字面：退 B 方案——仍发当前 Lead，页面 `follow` 当前会话把回执显示在页内。

## 验收标准

### 用户面（做成什么样算合格）

1. 新建方法时不再面对空表 + 空聊天：可从「从零聊 / 照内置改 / 从这次研究沉淀 / 直接填表」任一起手；
2. 编辑一次只问一个问题，先给 2–4 个选项（原生问卡），也永远允许自由说；用户主要做判断而不是创作；
3. 每轮改稿只动 1–2 格，表上闪一下并标「来自对话」，可撤销；手改不被静默覆盖；
4. 「2/4 已定」式进度，不是必填红墙；到「够用」能停并保存；
5. 撞库检查：与已有条目（如「格局调研」）相似时先问「新建还是改旧」；
6. 保存后回执三态在本页可见，库列表就地刷新；全程不切 tab、不切 session、不弹新窗；
7. 切到 Chat 再回来，未保存草稿与聊天都还在；
8. 页内只有方法编辑一个 composer；研究 Lead 有待答问卡时，问卡优先出现；
9. 方法编辑会话独立出现在侧栏（标题「方法编辑」），不影响研究会话的上下文与回合；
10. 模型/预设在装态不可用时，表单照常能填能存，只提示「共创暂不可用」。

### 技术面（证据）

1. 嵌入 spike 绿：`conversation.view` 内渲染另一会话的 `conversation.content`，composer/流式/问卡/卸载重挂可用；
2. chain 抑制 spike 绿：方法库 view 激活时主 composer 消失，pending 问卡时让位；
3. 方法编辑 preset 真挂载（preset-smoke）+ 全角色 l4-lite 覆盖 + snapshot fixture 录制；
4. keyless：`method-draft` 解析器（合围栏/漏块/坏块不覆盖）、四标签与 `library-fold.ts` 对钉、
   保存封套 round-trip；
5. 真模型 probe：5 种人（很模糊 / 过度指定 / 「不知道」 / 贴旧做法 / 从 run 沉淀）各跑通，
   产出的条目过结构校验且人工读得像人话；
6. `pnpm verify` 绿；client-load smoke、release-smoke（装态）按改动面跑；
7. D2/D25/D37、`design/40` §2.7、pack README、`20-roles` 同 diff 更新。

## 需要拍板

1. **D2**：接受第 5 个 preset「方法编辑」（非研究角色），登记新 D 号并把 D2 扩成「研究角色 4 + 工具 preset」？
   还是坚持 4、把方法编辑拆成第二个包/第二个 bundle（部署面更大）？
2. **D25**：保存由方法编辑写（推荐，闭环在这页），还是仍交研究 Lead、页面只把回执显示出来（保字面）？
3. **会话粒度**：一 workspace 一个「方法编辑」（推荐，一行）还是一草稿一会话（transcript 干净，行数多）？
4. **起步**：批准先做半天嵌入 spike（A+B）再排实现？spike 红了就退右栏 chat tab，不硬推。

## 关闭条件

- 四问有明确答复，且 D2/D25/D37 的登记方式确定；
- 若「现在做」：验收标准的技术面全绿、业务面由用户验收；
- 若「以后做/不做」：在卡上记理由与可观察重议条件，按去向归档。
- 实施绑定卡留活跃到交付；`implemented` 与交付同一变更，不先关后补。

## 影响面

- **pack**：`presets/method-editor.patch.yml`、`presets/method-editor/skills/{method-interview,method-from-run}/SKILL.md`、
  `package.json`（bundle patch、peer/dev deps、client inject）、`workspace/method-library.md` 头注（如需改「lead 维护」措辞）；
- **client**：`src/client/index.ts`（inject/注册）、`src/client/keys.ts`（私有槽/preset key）、
  `MethodLibraryView.tsx`（布局/草稿/保存/回执）、`method-library/{views,coach}.tsx`、`src/lib/method-draft.ts`（解析/应用）；
- **docs**：`docs/design/40-research-cockpit.md` §2.7、`docs/design/20-roles.md`、`docs/decisions.md`（D2/D25/D37）、
  pack README、`docs/00-index.md`（如需）；
- **门禁/测试**：`tests/pack/presets.test.mjs`、`l4-lite-smoke`、`preset-smoke`、`snapshot-replay`、
  `client-load-smoke`、`client-keys`/`client-effect-wrap`/`cockpit-doc-registry`；
- **生成物**：`dev/render-overlay.mjs`、`runtime/harness-home/profiles/research/` 镜像、`boot-run` 漂移检测。

## 证据

- 调研篇：[2026-10-28-dsh-session-and-surface-internals.md](../research/method-library-cocreation/2026-10-28-dsh-session-and-surface-internals.md)
- 现行页签与保存路径：[MethodLibraryView.tsx](../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)
- 库格式与四标签：[library-fold.ts](../../packages/deep-research-pack/src/lib/library-fold.ts)
- 现行方法库政策（Lead 侧）：[research-brief/SKILL.md L87-L105](../../packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md)
- 驾驶舱构成正本：[design/40 §2.7](../../docs/design/40-research-cockpit.md#cockpit-7)
- 决定台账：[D2](../../docs/decisions.md#d2)、[D25](../../docs/decisions.md#d25)
