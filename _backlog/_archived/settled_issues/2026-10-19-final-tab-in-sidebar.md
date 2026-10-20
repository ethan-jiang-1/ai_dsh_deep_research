---
status: 已结
opened: 2026-10-19
---

# 推敲：终稿——交付那一刻才出现的一页（右栏）

> 立卡：2026-10-19 ｜ 状态：**已结**（2026-10-20 落地并归档；三处口味由用户委托 agent 代定）｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 已关闭：是

**问题与期望结果：** 研究跑完，用户最想先看的是那份终稿（`drt_<slug>/final.md`）。现在它只出现在
会话流里（Lead 的 closing prose + `present` 卡片），要开就得去 Files 页签按路径翻。用户原话：
「panel 里头可以放个 final……研究完了之后，这个 B 斗最后的 final 的 MD 可以呈现出来，开始什么
东西都没有，中间过程也没有，直到 final 出来了」。

**一句话结论：** 终稿不做成"右栏里一个一直等着的空页签"，而做成**交付那一刻才出现的一页文档**
——页签的出生就是交付；它只读一个文件（run 根 `final.md`），中间过程在结构上进不来。

## 当前情况（2026-10-20 核实；推翻立卡时的两条假设）

### 交付判据：`present` 是时刻，`final/` 是状态，`final.md` 在场根本不是信号

| 事实 | 证据 | 对设计的含义 |
|---|---|---|
| 综合步就写 run 根 `final.md` | NODES 综合行；`presets/lead/skills/synthesis/SKILL.md` 步骤 3 | **文件在场 ≠ 已交付**：审查前它是未审草案，拿它点灯就是漏过程 |
| `final/vN.md` 落盘必须在 HITL2 拍板之后 | node-gate 门③ 头注（"版本落盘不得先于用户裁决"）+ 两场 mtime 复算（`drt_semver-caret-prerelease` 15:54:49 拍板 → 15:55:38 v1；`archive/drt_dsh-release-watch` 同序） | 版本目录是**状态**信号：可支撑"已交付 · v1"的断言 |
| `present` 是交付门②的机械判据 | `scripts/run-gates/node-gate.mjs` 门② | 它不是"顺便发的"，是合同；缺席要操作侧代补并记账 |
| `present` 成功 → 追加 durable 事件 `deliverables/presented{turn, callId, files[]}` | `vendor/dsh/packages/deliverables/tool-present/src/index.ts`（`tools/result` 非错时 append） | 客户端可读，且 `callId` 天然给出去重键 |
| follow 流带这个事件，但**开场快照是回合窗口**（≥50 条消息 / ≥2 turn），不是全会话 | `vendor/dsh/packages/api/session-controller/README.md` | `present` 是**现场信号**，不是可回查的档案 |

立卡时写的硬阻塞（"`present` 跨会话打开老 run 时取不到"）在这个设计里**消失**：终稿只在本会话的
交付现场到达；老 run 要看得靠 Files 或对话卡片按文件看——那本来就是文件，不是"终稿的位置"。

### 四块 DSH 结构就是这个设计的支点

| 结构 | 出处 | 用在哪 |
|---|---|---|
| **地址即视图**：类型按 `dsh-resource` 地址认领，priority 带 `extension > builtin > fallback`，扩展带可接管更窄的 pattern | `ui-sidebar-documentpreview`（kind `text` / band `fallback`）+ `ui-sidebar-right` §Extension seats | 接管 `drt_*/final.md` **这个文件地址**，而不是新造页签种类——交付卡片点开的也就是它 |
| `openResource`/`openTab`：同地址幂等（已开则聚焦）；展开面板是命令的一部分（"看不见的内容不算打开"） | `ui-sidebar-right` §ctx.sidebarRight | 到达动作 + 天然去重；不重复开窗 |
| 页签体内 `useTabInfo().tab`：`visible`（真正在看）、`navigation`、`actions`（openTab/openResource） | 同上 §The Tab domain | "正在读"→给更新条；"没在读"→静默刷新；`过程` 按钮回研究状态 |
| 回合尾交付卡（`present` 卡）已存在且点开就是文件地址 | `ui-deliverables` | 自动打开与用户手点时**落到同一个页签**，不会有两个同名视图 |
| 先例：ui-plan 的 pending 方案**自动开一次**、关掉不再弹、之后从尾卡重开 | `ui-plan` README §Use this package | 时机规则直接借，不发明 |

## UX 论点（为什么不是"加个页签"）

1. **空态是承诺。** 常驻空页签 = 提前许愿；点一次发现什么都没有，第二次就不点了。右栏已有的空态
   语言（研究配置五态）是给"暂时没有但该有"的事用的；终稿不是"暂时没有"，是"还没发生"。
2. **时机的三种模型。** ①交付前就占位（立卡原倾向）：换来"永远提醒你还没有结果"的噪音，还占掉每个
   会话一个页签位；②交付后一直有（不自动开）：结果在，但 40 分钟静默后没人告诉你去哪；③**交付那
   一刻打开**：页签的出生就是交付，安静期什么都不多占。取③。
3. **DSH 没有通知服务，最强的那一下就是 openTab。** 全局没有 toast/badge 通道；"到达"只能靠页签
   自动展开（ui-plan 已这么用）。所以"可见性"不是附加说明，而是这个设计的主件。
4. **结果面 ≠ 工具面，但也不该是第二个文件预览。** 页签的意义是"这就是终稿"，不是"final.md 的
   另一种排版"：所以它接管的是**这个文件**，走的是同一条地址，而不是再放一个同名的文件预览页签。

## 方案

### 形态：接管 `drt_*/final.md` 的文件地址（不新增 guide 胶囊、不新增页签种类）

- 注册 `kind: 'research-final'`、`priority: 'extension'`、`patterns: ['**/final.md', 'final.md']`；
  `canOpen(address)` 只放行 **session 地址**且路径整段匹配 `^(archive/|_abandoned/)?drt_[^/]+/final\.md$`
  （绝对地址一律让给 fallback 预览——读不了就用看得见的那个）；
- 于是交付卡片、结句里的内联引用、Files 树、恢复后的布局，点 `final.md` 全部落到**同一个**页签；
- 页签标题固定「终稿」（打开时捕获，不做活标题——见 §不做什么）；
- 页体：一次读（`readFile`，limit 取满、`!eof` 时给"继续加载"）+ `MarkdownText`（`ui-primitives`
  已有，同一套 Markdown 词表）；顶部一条 32px 静音条：`已交付 · v1`（`final/` 有 vN 时；否则
  `未定稿`）+ 右侧 `过程 →`（`tab.actions.openTab('research-status')`）。

### 时机：交付事件到达时打开一次

- 插件层跟随**当前在屏会话**的 journal（`sidebarRight.mounted`），只认 **live 帧**（不收快照回放）；
- `deliverables/presented` 里任一文件路径匹配上面的终稿形态 → `openResource` 该地址一次；
- 去重键 = `callId`：同一交付不重复开；用户关掉后**不再弹**（与 ui-plan 同规则）；
- 焦点保护：触发瞬间若焦点在可编辑元素（输入框/文本域/contenteditable）→ 不打开（不打断正在写
  下一条消息的人；他眼前的回合尾卡与状态页签的门仍在）；
- 只在交付所属会话在屏时打开——切会话弹右栏是已被否决过的打扰（见"输掉的方案"）。

### 门：状态页签⑤交付行承担"承诺"与"回程"

- 未交付：一行静音字「终稿将在交付后自动出现在右栏」——承诺许在用户已经在看的地方，随后自动兑现；
- 已交付（本会话 journal 里见过指向本 bundle 的 `present`）：同一行变按钮「✅ 已交付 · 读终稿 →」，
  点开 = 同一个地址（已开着就聚焦）。⑤ 现有的"`final.md` 在场 → ✅ 已交付"顺手改掉：那是"有终稿
  可审"，不是"已交付"，混用会让两个面互相打脸。

### 观感

- 只读：无编辑、无删除、无"打开所在目录"、无版本切换器；历史版本留给 Files；
- 条与页体同底色、一条发丝线，不抢正文；不设章节目录（不发明阅读器）；
- 文件被改写：`tab.visible` 为真 → 顶部一条"终稿有更新 · 重新读取"（不换掉你正在读的字）；不可见 →
  静默重读。轮询节奏沿用驾驶舱的 30s。

## 不做什么（排除项，同属设计）

不做靠空态撑着的常驻页签｜不做 guide 胶囊（常驻胶囊是面板兑现不了的承诺，且撑不到"开始什么都没
有"）｜不做通知/角标/系统级提醒｜不在页签体内渲染任何 question/topics/evidence/drafts 内容，也不列
run 目录｜不做 v1↔v2 版本切换｜不做活标题（"终稿 · 审阅中"这类状态先放页内静音条；两个同名页签的
歧义记为已知边界）｜不自动滚动定位到某节｜不做"分享/导出"按钮（要导出走系统打开）。

## 方案与取舍（输掉的）

- **交付前占位的空页签**（立卡原倾向）：提前许愿 + 每会话占一个页签位，且必须写一段"还没到交付"来
  解释自己——那正是用户说"开始什么东西都没有"要避免的观感；
- **独立页签种类 + slug 参数**（不接管地址）：同一份终稿会有两个视图（交付卡开的文件预览 vs 终稿
  页签），地址身份也不再唯一；
- **塞进「研究状态」作为末尾区块**：结果面会继承工具的噪音，违背"中间过程也没有"；
- **只做门、不自动开**：安静期结束时没有任何东西"到达"，等于把发现成本推回给用户；
- **切会话时补开**：既有裁决否决（每次切会话弹右栏打扰性超限）；
- **用 `final.md` 在场当交付信号**：审查前就会点灯，把未审草案当终稿；
- **用 `final/` 版本目录当交付信号**：门③ 只保证"不先于拍板"，是纪律不是结构不变量；只拿它做
  "已交付 · v1"的**状态**显示，不做打开判据。

## 验收标准

| # | 判据 | 证据 / 方式 | 负例（先看红） |
|---|---|---|---|
| 1 | `canOpen` 只认三个终稿位置、且只认 session 地址 | `src/lib/` 纯函数 keyless 单测 | `drt_x/question.md`／`drt_x/evidence/a.md`／`drt_x/drafts/final.md`／`notes/final.md`／`absolute` 地址全拒 |
| 2 | 交付折算：事件 → 本次交付的最末一条终稿（slug/path/turn/callId），非终稿的 present 文件忽略 | `delivery-fold` 纯函数 keyless 单测 | 畸形 data／空 files／非终稿路径 → null，不猜 |
| 3 | 自动打开一次：同 `callId` 不重开；关掉后不再弹；非 live 帧不触发 | client-load-smoke（live 事件注入）+ 单测折叠 | 回放快照触发 = 红；重复开两个同名页签 = 红 |
| 4 | 页签体读面是一张定表：只读 `<base>/final.md`、`review.md`、`final/` 目录 | 单测断言 `readsFor(slug)` 恰三条 | 多读一条（evidence/topics/…）= 红 |
| 5 | 交付卡点开与自动打开落到同一个页签 | client-load-smoke | 出现两个 `final.md` 视图 = 红 |
| 6 | ⑤ 交付行三态：未交付提示语／已交付按钮／点开聚焦既有页签 | client-load-smoke + 走查 | 交付前就显示"✅ 已交付" = 红 |
| 7 | 命中本卡必跑面 | `pnpm build` → `client-load-smoke` → `pnpm verify` + `pnpm test` | 任一红即停 |

人工判据（不以技术绿替代）：真跑一场到交付，看"到达"这一下是否被注意到、是否打断；再从 Files 打开
一份**未交付**的 `final.md`，确认它不会自称已交付。

## 待用户点头（三处口味，不改则按上面的倾向落地）

1. **接管文件地址**（点交付卡直接进「终稿」）vs **独立页签**（交付卡仍开普通文件预览）；
2. **交付时自动打开一次**（带焦点保护、关掉不再弹）vs **只做状态页签的门**；
3. **不设 guide 胶囊**（终稿只能被"送到"或从⑤门进）vs 常驻胶囊（每次展开右栏都能看见，但空手时是空态）。

## 落地记录（2026-10-20）

**授权**：用户委托三处口味由 agent 代定并按卡上倾向落地（接管文件地址 / 交付时自动打开一次 /
不设 guide 胶囊）。

**与卡上设计的差异（逐条）**：

- 页签类型 `kind: research-final`、`priority: extension`、`patterns: ['**/final.md','final.md']`、
  `canOpen` 收窄到三个位置；接管生效的端到端证据 = 页签标题是「终稿」而不是 `final.md`；
- 页签体读面照卡（`final.md` / `review.md` / `final/`），**新增三位置回退**（原位 → `archive/` →
  `_abandoned/`）：`present` 记录的是交付当时的位置，bundle 之后被归档就失效——端到端首跑即撞上
  `drt_anthropic-claude-release-line-timeline` 已归档、按记录路径读不到；
- 交付监听的判据收成纯函数 `shouldOpenFinal`（有交付 / `sessionId+callId` 未开过 / 焦点不在可编辑
  元素）；只认 live 帧，回放不触发、关掉不再弹；
- 状态页签 ⑤ 的 `✅ 已交付` 改为 `present` 见证（原先是 `final.md` 在场 = 综合完成就宣告交付）；
  未交付显示承诺行「终稿将在交付后自动出现在右栏」，已交付显示「读终稿 →」门；
- 正文分页读 500 行/页、自动续读 2 万行、`!eof` 给"继续加载"——不赌部署的 `maxLines`。

**证据**：

- keyless：`tests/final-target.test.mjs` 10 条（认领范围 / 交付折叠 / 读面定表 / 三位置回退 / 自动
  打开判据）；反证两次实跑（放宽 `canOpen` → 范围用例红；去掉焦点保护 → 判据用例红），还原后绿；
- 真浏览器：`client-load-smoke` ALL PASS——新增终稿端到端（打开已交付冷会话 → ⑤ 门在场 → 点开 →
  页签标题「终稿」→ 正文与盘侧首标题对账 → 静音条三态 → 不泄漏中间过程路径的负例）；
- L0：`pnpm verify` 全绿 + `pnpm test` 552/552 全绿（2026-10-20 实跑）。

**未验证项（如实）**：**自动打开这条路径没有真浏览器证据**——它只在**现场**交付事件上触发（回放不
触发），keyless 冒烟里没有真模型交付。判据已收成纯函数并 keyless 钉住；接线（mounted → follow →
`openResource`）留待下一场真实 run 观察（L4 面，跑一场即补）。

**去向**：构成正本已同 diff 更新（[40-research-cockpit](../../../docs/design/40-research-cockpit.md)
§2 / §3 / §5 / §6）；观察面冒烟的交付期望改为 present 见证。

## 与其它卡的关系

- 与 [BUG-042](../fixed_bugs/BUG-042-method-library-seed-absent-no-pointer.md) 独立：那类是
  "宣称存在而实际不可用"，本卡是**新增**一个只在有内容时存在的面（该卡 2026-10-19 已修归档）；
- 与「研究配置」显式化那轮（已归档 `2026-10-18-research-config-panel-explicitness`）同一观察面：复用
  其空态与回执的文案纪律（判不了就说判不了），不复制其五态骨架；
- ⑤ 交付行的语义收窄（"有终稿可审" ≠ "已交付"）是同一变更里的顺带修正，影响 `brief-fold` 与状态页签
  文案，晚于本卡则两面对不上。
