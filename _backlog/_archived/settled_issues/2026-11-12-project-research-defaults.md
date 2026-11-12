---
status: 已结
opened: 2026-11-12
---

# 项目研究默认：workspace 文件 + host command + 活注入 + composer 按钮/配置页签面板

> 立卡：2026-11-12 ｜ 状态：已结 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：是
> 结论：项目研究默认 = workspace 文件 + `/research-defaults` host command + `research:defaults` 活注入 + composer 状态按钮/配置页签面板；TDD/L0–L2/L4-lite/client-load + 常驻 `defaults-probe`（真模型 HITL1）见 Note；snapshot B 已由 BUG-080 重录（Team Lead/headers baseline，ALL PASS）。
> 去向：implemented — [Note](../../../notes/implemented/2026-11-12-project-research-defaults.md)；[D50](../../../docs/decisions.md#d50)；卡归档。
> 授权：用户 2026-11-12 选定视觉形状并点名「把 issue 写出来」，随后授权落地；本卡已按卡交付并归档。
> 审查：机械门禁全跑；语义自审按 `reviewing-a-delivery` 走查；业务验收 = 用户 2026-11-12 批准视觉形状并授权落地。
> 视觉稿：[主界面](../research/startup-preferences/ux/2026-11-12-project-defaults-main.svg) · [状态板](../research/startup-preferences/ux/2026-11-12-project-defaults-states.svg)（PNG 同目录）；完整设计 = [落地蓝图](../research/startup-preferences/2026-11-12-project-defaults-design.md)。

**问题与期望结果：** 现在每个新项目，HITL1 都要重新问深度 / 输出 / 来源；方法库虽有一条 `〔默认偏好〕`，但模型面没有「立项先看默认」的指令，开发工作区 58 个 bundle 中 0 个采用库条目。期望：每个 workspace 能记住「这个项目通常怎么研究」，下一个项目起来时按它推荐；用户**也可以什么都不选**，不选的维度就是 Lead 按题型与证据自主判断，不是被系统塞一个默认值。

**当前情况（证据）：**

- 方法库默认只到面板显示层；`research-brief` 没有消费指令；实测 0/58（[现状材料 §2.2](../research/startup-preferences/2026-11-12-settings-inventory.md)）。
- 本仓已有五层设置：DSH 原生 / 包部署钉值 / home `settings.json`（只存 workspace+session）/ workspace `method-library.md` / run `protocol.json`；缺的是 **workspace 级、跨 run 的研究默认**（同上 §1–§2）。
- 机制可行：`conversation.input.left`（有 session 才渲染）、右栏现有「研究配置」页签、`systemPrompt.context` 活求值 provider、`workspaceFiles` 只读、`commands` 服务在 base、`remote.commands.execute` 在 web-app（同上 §3）。
- 边界：D25 面板不直写文件、期 2 未授权；D48 落地 Note 的 O2 否掉「策略优先 UI」；D40 工作区形状目前只列 `method-library.md`（同上 §4）。
- 外部证据反对启动 wizard / 硬强制：澄清约 2.81 问最优、0–1 问无收益；个性化与事实准确率 trade-off；偏好遵循 10 轮 / ~3k token 跌破 10%（同上 §6）。

**未决问题：**

- **实施放行（唯一阻塞）**：本卡是「待落地」，不是实施授权；用户下一步明确「落」即按本卡执行。

**已知边界（不阻塞本卡）：**

- 方法行只读：视觉稿按只读设计（方法默认的写入口仍在方法库，D25/D37）。若用户要求面板内直接换默认，另加 Lead 中继扩展，不混进本期。
- `literature_review` 只在 protocol 枚举里、不在 HITL1 六种内：面板本期不提供；单源对账另案，不在本卡扩。

**下一步：** 数据层 → 界面层 → D50/文档/Note，按 `## 验收标准` 与蓝图 §5 实施。

## 核心语义：自动 = 缺席 = 你自主决定

这条是全卡的地基，实现时不能走样：

1. **文件里没有「自动」这个值。** `research-defaults.json` 只有显式选择；某维度没有键 = 自动。不写 `"auto"` sentinel，不在读盘时补一个默认值，不在面板打开时物化一个值。
2. **用户可以不选，且可能永远不选。** 无文件 = 全自动；面板每个下拉第一项是「自动（不约束）」；不选不阻塞、不弹 wizard、不要求先配置再提问。**不选项目默认 ≠ 跳过 HITL1**：HITL1 仍是三问确认，项目默认只影响推荐项。
3. **自动 = Lead 自主判断，不是继承系统默认。** prompt 段只列已设置的字段，并明写「未列出的维度 = 自动：由你按题型、判型模式与证据判断，不要当成系统默认」。HITL1 对自动维度按 `question-patterns` + 研究方法映射推荐；这不是「项目默认」，是 Lead 的判断。
4. **来源可区分，覆盖不是偏离。** 定稿时 `question.md §Decisions` 记：`项目默认：深度=deep；输出=full_report；来源=official,regulatory` / `Lead 判断：深度=standard（自动维度，无项目默认）` / `用户本次：…`。用户选了一个不同于项目默认的值 = 用户本次设计，记 §Decisions，**不**自动进 `protocol.deviations`；只有 protocol 批准之后偏离协议才写 `deviations`。项目默认是先验，不是政策。
5. **`unset` 恢复自动。** 设过再清掉，下一场必须回到 Lead 判断，不残留旧值；面板 select 回「自动」，按钮回「研究默认：自动」/「方法 X」。
6. **机械证据：** 缺席解析、无 `auto` sentinel、打开面板零写入、`unset` 后下一场自动、HITL1 卡上标「Lead 判断」而非「项目默认」——进 A1/A2/A3/A5。

## 范围与排除项

**范围（v1）**

1. **数据**：`<workspace>/research-defaults.json`，只存 `effort` / `output.shape` / `output.audience` / `source.families` / `source.authority` / `source.recency`；`schema` + `revision` + `updatedAt` 元数据。方法默认不进来（住 `method-library.md`）；gates 不进来。
2. **写**：新增 `/research-defaults` host command（`show` / `set <json>` / `unset <field[,field]>` / `clear`），原子写 + revision + expectedRevision + 回读 + 路径/symlink 拒绝。它是唯一写路径；面板不直写，Lead 不写文件。
3. **注入**：新增 `research:defaults` `systemPrompt.context`（order 206，手册 205 之后），每次 assembly 从 `agent.session.header.cwd` 活读；只列已设置字段；无任何值（含方法默认）→ 返回空串；非法字段不注入并给一行忽略说明；`interpolate: false`。
4. **消费**：`research-brief` 立项读默认；三问照发；显式值首推并标「项目默认」；自动维度按判型/映射推荐并标「Lead 判断」；quick_factual 不被升级；`§Decisions` 记录来源；用户覆盖默认不算 deviation，protocol 批准后的偏离才进 `deviations`。
5. **界面**：`conversation.input.left` 状态按钮（文案 = 自动 / 方法 X / 已设 N 项 / 需检查 / 加载中）；点击 `sidebarRight.openTab(RESEARCH_CONFIG_TAB_KIND)` 开现有「研究配置」页签；页签顶部「项目默认」块：方法行只读（显示库默认 + 方法库入口），深度 / 输出（形态 + 读者）/ 来源（family chips + 权威 + 时效）可改；无保存按钮；命令回执 + 失效 + stale + 清除；zh/en 字典。
6. **决定/合同**：D50（修订 D40 工作区形状与 D25 写路径；声明不构成 O2）；pack README 数据卡、design/10、design/40、guides/65、terms、`_dist/安装手册.md` 生成链、Note。

**排除（本卡不做）**

- **硬强制**：不插命令解析链、不改 gates/证据门槛；项目默认只作推荐。D46 明写 gates 不作偏好开放。
- **第四问 / 启动 wizard / StartCard 必答**：HITL1 三问不变；项目默认只影响推荐项。
- **方法默认复制 / 面板写方法库**：方法默认唯一家 = 方法库 `〔默认偏好〕`；面板只读。
- **面板直写 / client 直写**：D25 期 2 未授权；唯一写路径 = host command。
- **从上一场 protocol 继承**：把一次 run 的设计偷偷升成项目默认，违背 D46。
- **lens / 参考目录 / wiki / 输出语言 / 用户级跨 workspace 默认**：v2 另题；本地源证据合同未定。
- **`literature_review` 上卡**：协议保留值，不在 HITL1 六种内；单源对账另案。
- **productType / deliveryMode / company 层**：design/70 §7。
- **DSH Config / volatile**：profile 作用域，不是 workspace；且不为此引入 schemastery。

## 方案与取舍

- **文件而非 home map / DSH Config**：workspace 用户数据天然随项目走；home map 有路径键与生命周期问题，Config 是 profile 级。
- **host command 而非 Lead 写 / 面板直写**：lead 只有 tool-fs、非原子且模型依赖；面板直写触 D25 期 2。command 原子、确定、命令事件进会话日志，文件内容随后进 prompt——变更既 logged 又 model-visible。
- **「自动」= 缺席而非 sentinel**：缺席天然表达「不约束」；sentinel 会多一个要校验的值，还容易读成「系统选了一个默认」——正是本卡要避免的语义。
- **方法只读**：方法库写入已有唯一窄工具（D25/D37）；面板再开一个入口就是第二条写路径。面板显示方法默认、提供入口，不复制。
- **三问保留**：外部证据说 2.81 问最优、再加前置问会 over-ask；项目默认只喂推荐项。
- **D50**：`项目研究默认 = workspace research-defaults.json + /research-defaults host command + research:defaults prompt context；只存 depth/output/source；每次 assembly 活读；HITL1 三问照发、默认只作首推；composer 状态按钮 + 研究配置页签项目默认块；面板经 host command 读写`。修订 D40 工作区形状；D25 写路径以本行为准（host command，不是 client 直写）；不构成 D48/O2 的策略优先 UI。

## 验收标准

> 每条都要实跑证据；A1/A2/A3/A5 是本卡的「自动语义」红线，不能只靠代码走读。

- **A1 缺席即自动**：无文件 / 空对象 / 字段缺失 → parser 返回 `auto` 状态（文件存在但无值也算自动）；文件里不出现 `"auto"` sentinel；面板打开时 select 初始 = 自动、零写入；按钮显示「研究默认：自动」。
- **A2 用户可以不选**：无文件也能开面板、改别的行；不弹 wizard、不要求先配置；HITL1 仍三问、无第四问；quick_factual 不被升级；未选维度不产生任何文件写入。
- **A3 自动 = Lead 自主判断**：存在至少一个显式值时，prompt 段对未设置维度明写「自动：由你判断」；HITL1 对自动维度按判型/映射推荐，`question.md §Decisions` 标「Lead 判断」而非「项目默认」；不把自动维度的正常判断写进 `protocol.deviations`。全自动（无文件/无值）→ 无 prompt 段，仍三问。
- **A4 显式值被消费**：设 `effort/output/source` → HITL1 对应问首推并标「项目默认」；方法库有 `〔默认偏好〕` → 第一问首推它；protocol 生效值 = 项目默认 / Lead 判断 / 用户选择；用户覆盖项目默认记 §Decisions「用户本次」，不自动进 `deviations`；protocol 批准后偏离协议才进 `deviations`。
- **A5 unset 恢复自动**：设一项 → `unset` → 下一场回 Lead 判断、无旧值残留；面板回「自动」；按钮回「自动」/「方法 X」；`question.md` 不再写该项目默认。
- **A6 command 正确性**：`set/unset/clear` 走原子写 + revision+1 + 回读；`expectedRevision` 不匹配 → `stale`；非法 enum / 未知键 / `method` / `gates` → 拒绝；symlink、目录、相对 cwd → 拒绝；`clear` 删文件但不动方法库。
- **A7 注入**：设值后下一轮 assembly 出现 `research:defaults`（order 206）；无值 → 空串；两 workspace 不串；非法字段不进文并有一行忽略说明；方法库默认只进方法行；无每轮错误刷屏。
- **A8 界面**：有 session 才有按钮；点击开「研究配置」页签、顶部见项目默认块；四态文案正确；改动后按钮/面板即时一致；无保存按钮；失效/stale/清除三态可见；方法行只读且「方法库 ›」在场；**「自动」文案带「由 Lead 判断」语义（不是「系统默认 / 继承默认」）**；zh/en 字典齐全、默认 zh、无硬编码中文。
- **A9 端到端**：`client-load-smoke` 点面板改一项 → 盘上文件变、revision 变、按钮变（无模型调用）；`L4-lite` seeded 工作区 + 默认 → HITL1 卡面首推 = 默认；无文件场景 → 「Lead 判断」；两种场景都无第四问。
- **A10 门禁/合同**：`pnpm verify` / `pnpm typecheck` / `pnpm test` 全绿；L1 `preset-smoke`；`install-shape-smoke` / `product-boot-smoke` / `release-smoke`；snapshot 因新 context 变化则重录 B 层；D50 + 数据卡 + README/design/guides/terms 同 diff。
- **A11 负向**：方法库文件未被面板/命令改写；`research-defaults.json` 不出现 `method`/`gates`/`lens`；面板打开零写入；自动维度不被物化成显式值；不新增第四问。

## 关闭条件

- A1–A11 全部有实跑证据；A1/A2/A3/A5 的「自动语义」证据单独列出。
- 同 diff 登记 D50，更新 D40/D25 的现行指向、pack README 数据卡、design/10、design/40、guides/65、terms、`_dist` 生成链。
- 同 diff 写 implemented Note（含输掉的方案、红→绿证据、残余风险），卡归档。
- 方法行只读已按视觉稿落地；若用户中途要求可编辑，另开扩展卡，不把本卡改宽。

## 抽象度

- **换公司/换项目要改吗？** 不——文件是 workspace 用户数据，轴是研究设计轴，不含公司名/产品类型。
- **换产品类型要改吗？** 不适用——本仓没有 productType 轴。
- **换做法要改吗？** 不——settings 只存「选哪个」；方法正文仍在方法库，规则正文仍在内容层。
- **只有机制变才改吗？** 是。
- **第二消费者**：research-brief（HITL1）、prompt context（注入）、composer 按钮/面板（显示/写入）、protocol（生效值）、client-load/L4（验证）——五面共用同一共享 parser，枚举不写死第二份。
- **搬家成本**：低——文件是数据，随 workspace 走；删文件即回全自动。
