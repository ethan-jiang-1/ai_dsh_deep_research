---
status: 修复就绪
severity: P1
opened: 2026-11-12
---

# BUG-069：英文界面仍混中文——内置打法内容单语（名称/摘要/四字段/推荐规则）+ 方法编辑历史标题不随 locale

> 严重级别：P1｜发现：2026-11-12｜状态：修复就绪 — 根因已证到代码与渲染证据；修法、影响面清单与判据见下。canonical 内容（skill 表/库格式/模型面）保持不变，只补「显示投影」。

## 症状

界面切到英文后，**chrome 已是英文，但产品自带的方法内容仍是中文**，同一屏左右语言不一致（2026-11-12 02:14 用户截图，方法库 tab）：

- 左栏内置参考列表：`事实核查 / 领域地图 / 主张核查 / 方案比较 / 时间线与信号` 及其中文摘要；
- 右侧详情：标题 `时间线与信号`、摘要与四字段正文全中文，而字段标签是 `Where to look / How to verify / How to report / What is not promised`；
- 研究配置页签的内置卡片、⋯ 菜单、详情弹窗、推荐规则（`什么时候用它：P8 事态跟踪/时间线`）同样中文；
- 从内置自定义时出现混排：英文模板 + 中文名 → `Custom based on 事实核查`，新建草稿名与四字段预填也仍是中文；
- 顶部方法编辑会话标题：英文界面下显示 `方法编辑`（该会话在中文界面创建；标题只在创建时写一次）。

中文界面下这些内容正常；问题集中在**产品内容没有英文投影**与**历史会话标题不跟随 locale**。

补充观察（不并入本卡主因）：顶部 `Method lib...` 是英文 `Method library` 在窄 tab 上的 CSS 截断，**不是缺译**；是否改短标签（如 `Methods`）或放宽 tab 宽度是单独的布局/命名决定，本卡不把截断当语言缺陷。

## 复现

1. 英文 locale 打开方法库 tab → 看左栏内置参考、右侧详情、`New` 来源选择里的内置预览；
2. 打开研究配置 → 看内置卡片/菜单/详情/「什么时候用它」；
3. 任选一条内置 → 「基于此自定义」→ 看草稿名（`Custom based on 事实核查`）与预填四字段；
4. 在中文 locale 打开方法编辑会话后切英文 → 看顶部会话标题仍为 `方法编辑`。

## 根因（已证到代码）

**① 产品内容表只有中文，且同时充当“显示名”与“canonical 标识”。**
[config-tables.ts](../../packages/deep-research-pack/src/lib/config-tables.ts) 的 `BUILTIN_PREFERENCES` 是中文名称/摘要/四字段；它的 `name` 又是库条目、指令载荷、skill 表、判型映射的 canonical 键。UI 直接拿它渲染，没有显示投影层。

**② 显示位逐一直接引用 canonical 数据。** 受影响的当前代码（逐处）：

| 位置 | 现状（英文界面） |
|---|---|
| [MethodLibraryView.tsx:395-402](../../packages/deep-research-pack/src/client/MethodLibraryView.tsx) 内置参考列表 | `name`/`summary` 中文 |
| [MethodLibraryView.tsx:432](../../packages/deep-research-pack/src/client/MethodLibraryView.tsx) 来源选择内置候选项 | `name`/`summary` 中文 |
| [views.tsx:100-106](../../packages/deep-research-pack/src/client/method-library/views.tsx) `SourceSelectionView` 内置预览 | 名称/四字段中文 |
| [views.tsx:194-208](../../packages/deep-research-pack/src/client/method-library/views.tsx) `BuiltinView` 只读详情 | 名称/摘要/四字段中文 |
| [ResearchConfigTab.tsx:58-60](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) 卡片菜单「基于此自定义」 | 英文模板 + 中文 `name` |
| [ResearchConfigTab.tsx:76](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) `patternsFor` | 推荐规则中文 |
| [ResearchConfigTab.tsx:133-135](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) 详情弹窗自定义按钮 | 同上 |
| [ResearchConfigTab.tsx:162](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) 详情弹窗标题 | canonical `detail.name` 中文 |
| [ResearchConfigTab.tsx:183-186](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx)、[187-197](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) 读/编辑四字段 | 值中文 |
| [ResearchConfigTab.tsx:234-241](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) 标本/推荐 | 标本已 en；推荐规则中文 |
| [ResearchConfigTab.tsx:275-278](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) 方法选择菜单 | canonical `name` 中文 |
| [LegacyManagementPane.tsx:43](../../packages/deep-research-pack/src/client/research-config/LegacyManagementPane.tsx) 推荐规则说明 | 中文 |
| [LegacyManagementPane.tsx:52](../../packages/deep-research-pack/src/client/research-config/LegacyManagementPane.tsx)、[77-81](../../packages/deep-research-pack/src/client/research-config/LegacyManagementPane.tsx) 内置卡片/领域示范 | 名称/摘要/四字段/示范内容中文 |
| [useDraftState.ts](../../packages/deep-research-pack/src/client/method-library/useDraftState.ts) 内置来源 provenance / 预填 sections | 中文 |
| [coach-prompts.ts:36](../../packages/deep-research-pack/src/client/method-library/coach-prompts.ts) 方法编辑上下文 | **模型面，必须保持中文 canonical，不翻译** |

**③ 方法编辑会话标题只在创建时取 locale。**
[coach-sessions.ts:57](../../packages/deep-research-pack/src/client/coach-sessions.ts) 创建会话时 `rename(title: t('methodEditorTitle'))`；已有会话的标题是持久化数据，切 locale 不会重命名，也没有“这是本包自动标题”的标记/迁移。因此英文界面里会看到中文 `方法编辑`（截图顶部）。

**④ 守卫缺口：** `tests/cockpit/cjk-source.test.mjs` 把 `config-tables.ts` 登记为产品数据 allowlist（正确：它是 canonical 内容），但没有断言“UI 必须经显示投影取用”；`tests/cockpit/locales.test.mjs` 的 `BuiltinView` 用**合成英文** entry，从未用真实 `BUILTIN_PREFERENCES` 渲染，所以这个混排一直绿。

渲染证据（临时 one-off，真实数据 + en 字典）：

```text
BUILTIN EN CONTAINS CJK: true
时间线与信号 Built-in · read-only Start from this 按官方节点排时间线，用预列指标判断走到哪了
Where to look 官方变更点（release notes／changelog／公告／生效日）为骨，媒体报道为肉…
```

## 影响面清单（本包自有 UI；已排除非缺陷）

| 类别 | 处置 |
|---|---|
| 内置打法名称/摘要/四字段、判型推荐规则、领域示范 | **本卡修**：补英文显示投影 |
| 从内置自定义的草稿名/预填四字段 | **本卡修**：显示层用英文投影；保存的是新用户条目（内容语言随当前界面） |
| 方法编辑**自动**会话标题（历史会话） | **本卡修**：打开时按当前 locale 迁移已知默认标题；新建用当前 locale |
| 用户自建方法条目、研究问题/plan/终稿内容 | 不翻译（用户/模型内容，保持作者语言） |
| 文件名/格式键（`question.md`、`final/`、`task_id`）、`readiness`、`HITL2`、`plan-only`、`worker`/`owner` 术语 | 不翻译（技术标识；已在字典中按品牌术语处理） |
| vendor chrome（`Chat`/`Agent Team`/`Plugins`/`Automation tasks`/`Workspaces`） | 不归本包；由宿主 locale 拥有 |
| preset/角色名（`Deep Research Lead` 等） | 不在本卡：是 agent 标识/团队层显示名，是否本地化需单独决定（当前中英都英文，属产品命名边界） |

## 修法（已选定）

**显示投影层，不改 canonical：**

1. 新增 `src/client/builtin-display.ts`（或 `method-content.ts`）：以 canonical 名称为键，提供 `displayBuiltinOf(t)` / `displayNameOf(name, t)` / `displaySummaryOf(name, t)` / `displaySectionsOf(name, t)` / `displayPatternsOf(method, t)`；四字段值 5×4、名称/摘要 5×2、推荐规则 5、领域示范 5，共约 45 个字典键（zh 正本 + en，键集/占位符对账）。
2. 所有**显示位**改用投影；所有**动作/持久化/模型面**继续用 canonical：
   - `instructionOf` / `createInstruction` / `editInstruction` / `renderLibraryEntry` / 库写入 / `coach-prompts` 仍用 canonical 中文；
   - `createInstruction` 的 `sourceName` 保持 canonical；UI 文案里的 `{name}` 用显示名；
   - 列表 `key`、`selectedName`、查找仍用 canonical。
3. `basedOnBuiltin` 等模板的 `{name}` 传显示名，不传 canonical；保存的新条目可以保存英文内容（用户条目，不是内置条目）。
4. 方法编辑会话：打开时若标题等于已知 `methodEditorTitle` 的任一语言值（zh/en），改名为当前 locale；新建直接使用当前 locale。若产品决定不迁移历史会话，至少新会话与标题更新逻辑有测试；本卡默认迁移。
5. 测试：
   - `builtin-display` 覆盖：5 个 canonical 名称全有映射；en 无 CJK；zh 与 canonical 逐字一致（防止显示层漂移）；未知名回退 canonical（fail-soft）；
   - `tests/cockpit/locales.test.mjs` 用**真实** `BUILTIN_PREFERENCES[4]` 或全量渲染 `BuiltinView` + `SourceSelectionView`，en 零 CJK；`ResearchConfigTab` 不能静态渲染（CSS 模块）时用源面/纯函数测试；
   - 方法编辑会话标题：构造已知 zh 标题 → 打开 en → 断言 rename 到 en；新建 en 直接 en；
   - `tests/cockpit/cjk-source.test.mjs` 保持 `config-tables.ts` allowlist（canonical 数据），但新增显示投影测试，防止“UI 直接读 canonical”回归；
   - `pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm verify` 绿；client-load smoke 的 en 面至少用静态渲染断言（浏览器档钉 zh-CN）。

## 修复判据

- 英文 locale：方法库内置参考（列表/详情/来源选择）、研究配置（卡片/菜单/详情/推荐规则/领域示范）、从内置自定义的草稿名与预填四字段**零 CJK**；中文 locale 保持现有中文；
- canonical 合同不变：`config-tables.ts` 的名称/摘要/四字段、`library-fold` 的库格式、`coach-prompts` 的模型上下文、Lead 指令载荷**逐字不变**；现有 `library-fold`/`preset` 测试继续绿；
- 方法编辑自动会话：新建时标题 = 当前 locale；已存在的已知默认标题在打开时迁移到当前 locale（或按卡上记录的产品决定只保证新建——二选一须写明）；
- 用户自建内容、研究产出的正文不被翻译（负例：英文界面下用户库条目/研究报告正文保持原文）；
- 新增显示投影测试与真实数据 en 渲染断言；`cjk-source` 的 allowlist 不放宽到组件；
- `pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm verify` 绿；`client-load-smoke` 不因本卡回退。

## 修复关联

（修完补：改动文件 / 测试 / 证据）
