# 项目研究默认：workspace 文件 + host command + 活注入 + composer 按钮

> 状态：implemented
>
> 关联：[卡（已归档）](../../_backlog/_archived/settled_issues/2026-11-12-project-research-defaults.md) · [D50](../../docs/decisions.md#d50) · [蓝图（已归档）](../../_backlog/_archived/research/startup-preferences/2026-11-12-project-defaults-design.md) · [现状材料](../../_backlog/_archived/research/startup-preferences/2026-11-12-settings-inventory.md)

## 决定

- 项目级研究默认 = `<workspace>/research-defaults.json`（只存 `effort` / `output.shape` / `output.audience` / `source.families` / `source.authority` / `source.recency`；`schema`+`revision`+`updatedAt` 元数据）。**缺席 = 自动 = Lead 按题型/判型/证据判断**：不写 `"auto"` sentinel，不在读盘/开面板时物化默认。方法默认仍住 `method-library.md` 的 `〔默认偏好〕`；gates/lens/参考目录/语言不进来。
- **唯一写路径 = `/research-defaults` host command**（`show` / `set <json>` / `unset <fields> [revision=N]` / `clear [revision=N]`）：原子写（temp+rename）、revision+1、expectedRevision stale、写后回读、symlink/目录/相对 cwd 拒绝；结果 code-like，面板映射 locale 文案。面板不直写盘，Lead 不写文件。
- **注入 = `research:defaults` `systemPrompt.context`（order 206，手册 205 之后）**：每次 assembly 从 `agent.session.header.cwd` 读两个文件；只列已设置字段，明写「未列出的维度 = 自动：由你（Lead）判断，不要当成系统默认」；无值 → 空串；非法字段不注入并给忽略行；方法库默认只进方法行。
- **消费 = `research-brief`**：HITL1 三问照发；显式值首推并标「项目默认」；自动维度按判型/映射推荐并标「Lead 判断」；用户本次优先；覆盖项目默认记 §Decisions，不自动进 `protocol.deviations`；protocol 批准后的偏离才进。
- **界面 = composer 左侧 `conversation.input.left` 状态按钮 + 现有「研究配置」页签顶部「项目默认」块**：按钮文案 = 自动 / 方法 X / 已设 N 项 / 需检查；点击开配置页签；面板方法行只读（写仍归方法库 D25/D37），深度/输出/来源可改；无保存按钮，select/blur 即发 command；失效/stale/清除三态；zh/en 字典。
- **新 host 行** `src/defaults/`（`name = deep-research-defaults`）：`inject=['systemPrompt']`；命令面用 `ctx.inject(['commands'])` 等 service 出现（不是 `ctx.get`——Loader 不保证 commands 先 mount；实测 `ctx.get` 为 undefined 导致命令永不注册）。
- D50 登记；D40 工作区形状增补 `research-defaults.json`；D25 写路径由本行 host command 承接（不是 client 直写）；不做 D48/O2 的策略优先 UI，不做硬强制。

## 输掉的方案

- **Lead 用 `write` 落盘**：lead preset 只有 tool-fs，没有 temp+rename；非原子、模型依赖、慢。
- **面板直写盘 / client Remote 直写**：D25 期 2 未授权；本行用 host command，命令事件进会话日志，文件随后被 prompt 注入。
- **DSH Config / volatile**：profile 级，不是 workspace；且要引入 schemastery/Config schema。
- **home 设置里的 per-workspace map**：路径键、无生命周期、语义混淆。
- **`AGENTS.md` 自由文本作主形态**：能用，但无校验/无面板/刷新依赖 fs 操作；保留为项目指令旁路。
- **从上一场 protocol 继承**：把一次 run 的设计偷偷升成项目默认，违背 D46。
- **方法默认复制进新文件 / 面板直写方法库**：第二写路径；方法库已有唯一窄工具。
- **「自动」写成 sentinel**：会把「不约束」读成「系统选了一个值」；本卡明确避免。

## 实际跑过的验证

- **L0**：`pnpm verify` 全绿；`pnpm test` **1289 pass / 0 fail**；`pnpm typecheck` 通过。
- **新增 keyless**：`tests/pack/research-defaults.spec.mjs` 14 例（缺席/合法/部分 auto/非法/禁止字段/合并/unset/序列化/按钮状态/prompt 段/方法默认/命令结果/枚举对账）；`defaults-command.spec.mjs` 10 例（空 show / set / stale / 非法 / unset / clear / 路径安全 / 坏文件 / schema / audience-only）；`defaults-effect.spec.mjs` 6 例（context 名/order/插值、cwd 读、命令注册、commands 缺席、两 workspace 不串、commands 晚到注入）；`tests/cockpit/defaults-store.spec.mjs` 8 例；`tests/cockpit/defaults-ui.spec.mjs` 3 例（按钮四态 / 面板自动态与控件 / 显式值渲染）（无文件 auto、值/方法默认/冲突、两 session 隔离、set payload/revision、stale、unset/clear、invalid/unreadable、loading 不写）。
- **L1**：`preset.e2e` **ALL PASS**（5 角色 + 2 worker 真挂载；skill 改动后）。
- **client-load**：`client-load.entry --seed tests/fixtures/client-load-home` **ALL PASS**；新增 pass-3d：按钮在场、状态文案、点开配置页签、面板自动态、seed 初始无文件、改深度 → 文件 `effort=deep`/`revision=1`、按钮变「已设 1 项」、unset → 无 effort/`revision=2`、文件无 `"auto"`；另改输出形态/读者/来源家族 → 文件逐次 `revision=3/4/5`、shape 保留、按钮变「已设 2 项」。
- **L2**：`install-shape.entry` **ALL PASS**；`product-boot.entry` **GREEN**（第一次跑起步卡 3 项红，重跑 GREEN——首屏时序 flake，现场无 pageerror）；`release.entry` **ALL PASS**（真实安装形状 + 安装域 preset.e2e 全绿）。
- **L4-lite**：**ALL PASS**（5 角色 + method-editor 真模型响应；scout `web_search` 真调用）。
- **一次性 seeded 真模型 probe（2026-11-12，port 3122，1 boot / 2 会话；脚本 `runtime/smoke-workspace/defaults-probe.mjs`，报告 `runtime/smoke-workspace/defaults-probe-last.md`）**：seeded HITL1 卡 **3×「项目默认」/ 1×「库默认」**；Q2 显式写「项目默认是深度档 + 完整报告/决策层，但单点名单题按题型推荐快答，冲突在此说明」并推荐 quick（符合 skill 的「冲突显式、用户本次优先」）；Q3 推荐项目默认 official+regulatory/12m；auto 卡 **0×「项目默认/库默认/默认」**。
- **常驻 `probes/behavior/defaults-probe.mjs`（1 boot / 2 场景；REAL_MODEL；port 3124；`_index --write` 已登记）**：**ALL PASS** —— seeded HITL1 ask 在场、三问、项目默认标记 **7/7**（项目默认/库默认/事实核查/完整报告/决策层/official/regulatory）；auto 无项目默认/库默认；语言同句/选项名判据绿（NOTE：同选项但分句出现「按项目默认；中文正文…」，观察不判红）。
- **snapshot**：`snapshot-replay.entry` 12 项红（Team Lead/headers/runtime-context）已由 [BUG-080](../../_backlog/_archived/fixed_bugs/BUG-080-snapshot-research-face-stale-team-baseline.md) 用当前 profile 重录 4 角色 + source 身份 + C 金标准人审后 **ALL PASS**；重录还发现 MCP_PLAYWRIGHT=0 形态无 MCP 组，场景声明补 `mcp:false` + replay-fixtures 条件守卫（先红后绿）；重录 diff 不含 `research:defaults` 段（该段在 dev 工作区无默认时本就不注入）。seeded HITL1 默认推荐已有常驻 `defaults-probe`。

### 反证（测试是否真会咬）

- serialize(empty) 物化 `effort` → `research-defaults.test` 红；恢复绿。
- 删 `set` 的 expectedRevision stale 比较 → `defaults-command.test` 红；恢复绿。
- store 的 set payload 去掉 `expectedRevision` → `defaults-store.test` 红；恢复绿。
- context cache 去掉 `cwd` → 两 workspace 用例红；恢复绿。
- host 行改回 `ctx.get(commands)` → `defaults-effect.test` 红（fake 的 `get` 直接拒绝）；恢复绿。
- `defaults-ui` 的静态渲染先红后发现真 bug：audience 输入框首帧空值（依赖 Effect 回填）→ 改为 `useState(快照值)` 后绿；修复的是首屏闪现，不是测试迁就。
- client-load 的写盘断言在实现期真咬过一次：命令服务尚未 mount 时 `ctx.get` 为 undefined，按钮点击报「command returned no execution」→ 改为 `ctx.inject` 后绿。

## 残余风险

- **snapshot B 旧基线**：已由 BUG-080 重录（4 角色 + source + C 金标准）；重录是基线更新，不证明团队层行为本身正确。
- **seeded HITL1 默认推荐**已有常驻真模型 probe（单场景 seeded/auto）；其他题型、长上下文、竞争指令下是否仍按默认，未证；语言仍可能在同选项以分句出现（observation，不判红）。
- **语言边界的探针观察**：prompt 段已写「未列出的维度（含语言/界面语言） = 自动」，skill 明写「语言不是项目默认」；复跑后同句/选项名判据绿，但模型仍可能在同一选项里用分号分句提「中文正文」（观察，不判红）。
- **`ctx.inject(['commands'])` 时序**：本轮实测命令服务晚于 pack 行 mount；若上游 loader 改成 commands 永不出现（headless），命令面静默缺席，注入仍工作——这是有意降级。
- **ledger 预算**：D50 加入时 `docs/decisions.md` 触 32KB 硬顶，压缩了 D25/D40/D41 表述；后续新增 D 号需先退役/搬 Note。
- **方法行只读**：面板不提供方法默认切换；用户需去顶部「方法库」tab。Lead 中继扩展未做。
- **client-load 主机态**：2026-11-12 23:05 load ≈10.4 / 10 CPU 时**未强制**跑 `client-load.entry --seed`，preflight 通过且 **ALL PASS**（clean-host 证据）；此前 load ≈18.9 的强制跑记录仅作历史。
- **`literature_review`**：protocol 保留值，不在面板六种内；单源对账另案。
- **命令文本 code-like**：面板映射了 stale/invalid/io；聊天里直接输入命令时看到的是 code-like 文本，不是完整双语 prose。
