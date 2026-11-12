---
topic: 项目研究默认——落地蓝图（数据层 + 界面层）
intent: 把「每个项目起来按哪套研究偏好跑」收敛成唯一可落地的形状：workspace 文件 + host command + 活求值 prompt context + composer 状态按钮 + 研究配置页签面板；含 schema、读改写、消费、测试与实现清单
---

# 项目研究默认：落地蓝图

> 前置事实 = [本仓设置载体现状与机制证据](2026-11-12-settings-inventory.md)（下称「现状材料」）。
> 本页是**决定**，不是选项菜单；证据分级【事实】/【推论】/【决定】。
> pin = `dsh-v0.2.1-rc.5` @ `b830ec950f`；日期 = 2026-11-12。
> 本轮只写设计，不改代码、不立卡、不动 D 号；落地需用户批准。

## 0. 决定（一句话）

**每个 workspace 一个 `research-defaults.json`；`/research-defaults` host command 是唯一写路径；`research:defaults` prompt context 每次 assembly 活读；composer 左侧状态按钮 + 现有「研究配置」页签的「项目默认」块是界面层；方法默认继续住方法库；HITL1 三问不变，项目默认只作首推。**

三条硬边界：

1. **不新增第四问、不做启动 wizard、不做硬强制。** 项目默认是立项先验；本次问题以 HITL1 + protocol 为准。
2. **方法默认不在新文件里复制。** 方法库的 `〔默认偏好〕` 是唯一家；新文件只存 depth / output / source 三项。
3. **面板不直写盘。** 面板调 host command；command 写文件、进会话日志，文件内容随后被 prompt 注入——变更既 logged 又 model-visible。

## 1. 为什么是这个形状

| 证据 | 推出的决定 |
|---|---|
| 方法库 `〔默认偏好〕` 只被面板显示，`research-brief` 没有「先看默认」指令；0/58 bundle 采用库条目（现状材料 §2.2） | 第一步必须是**消费已有默认**，不是加第二套默认 |
| 外部证据：澄清约 2.81 问最优、0–1 问无收益；个性化与事实准确率 trade-off；偏好遵循 10 轮 / ~3k token 跌破 10%（现状材料 §6） | 默认必须**短、活读、可偏离**；HITL1 三问保留 |
| 公司 issue 的形状：状态按钮、右栏、workspace 文件、首项「自动」、软注入 | 采用形状；不采用 productType/deliveryMode/「不再问」语义 |
| 公司轴在本仓不存在（design/70 §7） | 本仓轴 = method / depth / output / source；lens/wiki/语言另题 |
| D25 面板不直写；D48/O2 反对策略优先 UI（现状材料 §4） | 用 host command（host 写、会话日志）+ 现有摘要页签内的一块，不新开策略面板；需新 D 号明确授权 |
| `workspaceFiles` 只读；`commands` 服务在 base、`remote.commands` 在 web-app（现状材料 §3.3；vendor `bundle/base:317-318`、`ui-commands service:423`） | 面板 → `remote.commands.execute` 是现成的 UI 写通道；不需要 client 直写 |

【决定】不采用 O1（AGENTS.md 自由文本）作为主形态：它能用，但无校验、无面板、刷新依赖 fs 操作；保留为「项目指令优先」的旁路，不替代本层。不采用 O7（从上一场 protocol 继承）：把一次 run 的设计偷偷升成项目默认，违背 D46。

## 2. 数据层

### 2.1 文件与 schema

- 文件：`<workspace>/research-defaults.json`（可见、用户所有；不隐藏）。
- 首次 `set` 由 command 创建；`clear` 删除；不播种。
- schema（v1）：

```json
{
  "schema": 1,
  "revision": 3,
  "updatedAt": "2026-11-12T19:10:00+08:00",
  "effort": "deep",
  "output": { "shape": "full_report", "audience": "决策层" },
  "source": {
    "families": ["official", "regulatory"],
    "authority": "primary",
    "recency": "12m"
  }
}
```

| 字段 | 取值 | 缺省 | 约束 |
|---|---|---|---|
| `schema` | `1` | 必填 | 未知 schema → 只读报错，不覆盖 |
| `revision` | 非负整数 | 缺失按 0 读；下次写 = 当前+1 | 乐观并发；面板写带 expectedRevision |
| `updatedAt` | ISO 时间 | 写时生成 | 诊断用 |
| `effort` | `quick` / `standard` / `deep` | 缺 = 自动 | 只存 band；caps 由 band 表派生，不存数字 |
| `output.shape` | `quick_answer` / `full_report` / `one_page_memo` / `comparison_table` / `timeline` / `landscape_map` | 缺 = 自动 | **HITL1 六种**；protocol 的 `literature_review` 本期不上卡，单源对账另案 |
| `output.audience` | 1–200 字符，单行 | 缺 = 自动 | 用户原文；去换行；不翻译 |
| `source.families` | `official` / `web` / `academic` / `regulatory` / `practitioner` / `local` 的非空子集 | 缺 = 自动 | 去重；顺序按 canonical |
| `source.authority` | `primary` / `secondary` / `any` | 缺 = 自动 | — |
| `source.recency` | `6m` / `12m` / `24m` / `as-of-capture` | 缺 = 自动 | HITL1 四值；protocol 的其他形式不在面板 |
| `method` | **禁止** | — | 方法默认住方法库；出现即报错 |
| `gates` / `lens` / `referenceRoot` / `language` | **禁止** | — | 不是本项目默认的轴；出现即报错 |

- 「自动」= 字段省略，**不是**写 `"auto"`。
- 未知键：读时忽略并报 warning；command `set` 时拒绝（防手滑）。
- 文件损坏 / schema 不符 / 非法值：读侧不注入该字段；面板标失效；不静默覆盖。
- 原子写：同目录 temp + `renameSync`（同 home 设置 `src/startup/settings.ts:118-135` 的形状）；目标为 symlink 或目录 → 拒绝写。
- 路径安全：command 只写 `<cwd>/research-defaults.json`；`cwd` 必须绝对、存在、是目录；不接受用户传路径。

### 2.2 共享纯模块 `src/lib/research-defaults.ts`（host + client 同一份）

职责：

- `DEFAULTS_FILE = 'research-defaults.json'`、`DEFAULTS_SCHEMA = 1`；
- `parseDefaults(text) → { value, problems }`：缺字段合法；非法值进 problems；未知键进 warnings；
- `mergeDefaults(current, patch) → next`（顶层合并；`output`/`source` 整体替换）；
- `unsetDefaults(current, fields) → next`；
- `serializeDefaults(value) → string`（稳定 key 顺序、2 空格缩进）；
- `defaultsContextText({ defaults, methodDefault }) → string`（prompt 段文本；纯函数，可测）；
- `defaultsButtonState({ defaults, methodDefault, problems }) → { labelKey, count, tooltipValues }`（纯函数，UI 只渲染）；
- `defaultsCommandPayload({ expectedRevision, patch })` / `parseCommandResult(text)`；
- `findDefaultMethod(libraryText) → string | null`（复用 shared `library-fold.ts` 的 `foldLibrary`，不另写解析）。

【决定】这个模块是**唯一枚举源**：`effort`/`output.shape`/`source` 的 id 列表住这里；client 只拿 id + locale 字典取标签；`tests/pack/research-defaults.test.mjs` 直接 import `scripts/lib/protocol-core.mjs` 的 `OUTPUT_SHAPES`/`SOURCE_FAMILIES`/`AUTHORITIES` 对账，防第三个副本。

### 2.3 写：`/research-defaults` host command

新 host 行：`src/defaults/index.ts`（`name = 'deep-research-defaults'`；`inject = ['systemPrompt']`；命令面用 `ctx.inject(['commands'], …)` 可选挂载——headless 组合没有 commands 时注入仍工作，行不 fail-mount）。

命令语法：

```text
/research-defaults                         show（code-like 摘要）
/research-defaults set <json>              { "expectedRevision"?: number, "patch": { ... } }
/research-defaults unset <field[,field]>   effort | output | source
/research-defaults clear                   删除文件
```

- handler 取 `invocation.agent.session.header.cwd`；无 cwd → `error no-workspace`。
- `set`：读当前 → 校验 patch → 合并 → revision+1 → 原子写 → 回读 → 返回 `ok revision=N ...`。
- `unset`：删对应顶层键；若文件变空（只剩 schema/revision/updatedAt）也保留文件（revision 连续）；`clear` 才删文件。
- `clear`：删文件；已不存在 = 成功。
- `expectedRevision` 不匹配 → `error stale revision=<current>`；面板据此重读。
- 返回值全部 code-like（`ok revision=4 effort=deep output=full_report` / `error invalid field=effort value=bogus`），不做 prose、不需要双语；面板把 code 映射到 locale 文案。
- 命令描述用双语常量 `项目研究默认 / Project research defaults`（命令面板显示）；`input.hint` 用语法串。
- `recordInput` 默认 true：JSON patch 进会话日志；文件内容随后进 prompt。满足「logged + model-visible」。
- 注册走 `ctx.inject(['commands'], (scoped) => scoped.effect(() => scoped.commands.register({...})))`；HMR/dispose 可回收，且 commands 缺席时整行不炸。

【决定】不采用「Lead 用 write 落盘」：lead preset 只有 tool-fs，没有 temp+rename；非原子、模型依赖、慢。也不采用「面板直写」：D25 期 2 未授权。host command 是唯一写路径；用户既可点面板，也可直接输入命令。

### 2.4 注入：`research:defaults` prompt context

同一个 host 行注册：

```ts
systemPrompt.context({
  name: 'research:defaults',
  order: 206,              // 手册 205 之后
  interpolate: false,      // audience 是用户原文，不参与 {{}} 插值
  text: (context) => defaultsContextTextFor(context),
})
```

- `context` 取 `(context as { agent?: Agent }).agent?.session?.header?.cwd`（生产 `assembleContextFor` 带 agent；vendor 先例 `session-reference:203`）。无 cwd / 无文件 / 读失败 → `''`（不贡献）。
- 读 `<cwd>/research-defaults.json` + `<cwd>/method-library.md`；用共享 parser + `foldLibrary`；按 mtime/size 缓存，避免每步重复读。
- 至少有一个值才渲染；没有默认（文件空 + 无方法默认）→ `''`，保证无配置场景的 assembly 不变。
- 文本草案（≤6 行，模型面用 canonical 中文 + id）：

```text
## 本项目研究默认（用户设置，非硬约束）
- 方法: 库默认「格局调研」；深度: deep（深度）；输出: full_report（完整报告；读者：决策层）
- 来源: official, regulatory；权威: primary；时效: 12m
- 这是立项起点：HITL1 三问仍照发，推荐项优先用默认；用户本次明确要求优先。
- 与题型冲突时按题型推荐并在卡上说明偏离；偏离记 question.md §Decisions，协议级偏离写 protocol.deviations。
- 项目 AGENTS.md 的指令优先于本默认；已批准 run 以 protocol.json 为准。
```

- 非法字段不入文；若有 problems，追一行「（部分默认无效，已忽略：…）」——不静默。
- 文件损坏：整段不注入 + host `logger.warn` 一次；面板显示错误。不在 prompt 里每轮刷错误。
- 方法默认：从方法库 `〔默认偏好〕` 读；多个默认 → 取第一个并 warning；方法库读不回 → 不写方法行，交给 `research-brief` 的三态处理。

### 2.5 消费：HITL1 / protocol / decisions

【决定】模型面只改 `presets/lead/skills/research-brief/SKILL.md`（**不改 T0 手册**，避免撞 10,000 字符预算）；host 侧新增 `research:defaults` context 是数据注入，不是第二份规则。

- 立项时读到 `research:defaults` → 三问仍照发；对应问的选项把默认值置首并标「项目默认」；方法首推库默认。
- 默认与题面/题型冲突 → 推荐更合适项，并在卡上写「项目默认：X；本次建议 Y」；用户选 Y = 用户本次设计，记 §Decisions，**不**自动进 `deviations`；只有 protocol 批准后的变更才写 `protocol.deviations`。
- 用户本次明确要求优先；定稿后 `question.md §Decisions` 记「项目默认：…」/「Lead 判断：…（自动维度）」/「用户本次：…」。
- quick_factual 仍走既有自动采用；默认不得把它升级成 deep。
- run 进行中不重读默认改设计：prompt 段已写「已批准 run 以 protocol.json 为准」；中途改默认只影响下一场。
- **Lead 不写项目默认**；用户要改，引导到面板或 `/research-defaults`。

【决定】protocol 不升 schema：生效值照常落 `method/source_scope/effort/output`；来源/偏离由 question.md + deviations 承担。不新增 `defaults_revision` 字段（run 的 canonical 是设计值，不是设置文件指针）。

### 2.6 方法默认：只读，不复制

- 面板方法行只读：`自动（库默认：X）` / `自动（按题型推荐）` / `默认冲突` / `方法库读不到`；旁边文字「在顶部「方法库」tab 设置默认」。
- 不在面板里选方法、不写方法库；写入仍归方法库页/Method Editor 窄工具（D25/D37）。
- prompt 段展示方法默认；`research-brief` 消费它。P0（修消费）由此一并完成。

### 2.7 优先级与「自动」

```text
项目 AGENTS.md 指令
  > 用户本次明确要求
  > HITL1 本次选择
  > 项目默认（research-defaults.json + 方法库默认）
  > 题型/方法预设
  > 模型判断
```

「自动」= 该字段省略；项目默认不与题面争；偏离必须记录。

## 3. 界面层

### 3.1 composer 状态按钮

- 槽：`conversation.input.left`（list、session scope、有 session 才渲染；vendor `InputBar.tsx:463-469`）。
- 注册：`id: 'deep-research-defaults'`、`order: 20`、`locale: 'deepResearchPack'`、`inject: (sessionId) => ({ sessionId, store, openConfig })`。
- 文案（纯函数 + 字典）：

| 状态 | 按钮文案 | tooltip |
|---|---|---|
| 无默认（含方法） | `研究默认：自动` | 三问现场确认；点开设置 |
| 只有方法默认 | `研究默认：方法 X` | 方法默认：X；深度/输出/来源自动 |
| 有非方法字段 | `研究默认：已设 N 项` | 列 method/depth/output/source 生效值 |
| 文件失效 | `研究默认：需检查` | 失效原因 + 点开修复 |
| 加载中 | `研究默认` | — |

- 点击 → `sidebarRight.openTab(RESEARCH_CONFIG_TAB_KIND)`（现有「研究配置」页签；不新开页签、不弹 modal）；页签顶部就是「项目默认」块。
- 图标用现有 `IconSettingsOutlineRegular` 一类；文案是状态，不是「设置」；无 session 不渲染。
- 不新增 StartCard 入口（blank session 的起步卡先不动；有 session 后按钮即在场）。

### 3.2 面板：现有「研究配置」页签里的「项目默认」块

位置：`ResearchConfigTab` 顶部、现有「本次研究」之前。标题「项目默认」+ 副标题「影响下一场研究的立项推荐；本次研究仍以 HITL1 为准」。视觉稿 = [主界面](ux/2026-11-12-project-defaults-main.svg) / [状态板](ux/2026-11-12-project-defaults-states.svg)。

```text
项目默认                                   v4
影响下一场研究的立项推荐；本次研究仍以 HITL1 为准
────────────────────────────────────────────
方法    自动（库默认：格局调研）           在顶部「方法库」设置
深度    [ 自动 ▾ ]  （快答档 / 标准档 / 深度档）
输出    形态 [ 自动 ▾ ]   读者 [ 决策层________ ]
来源    家族 [官方][学术][监管][从业][网络][本地]
        权威 [一手优先 ▾]   时效 [近 12 个月 ▾]
────────────────────────────────────────────
[清除本项目默认]                 只在 workspace 保存
```

- **无「保存」按钮**：select 变更即发命令；文本框 blur/Enter 发命令；控件 pending 时禁用；成功后小回执「已保存（v5）」；失败显示错误。
- **无 modal**：右栏页签内联；对话区不被遮挡。
- **方法行只读**（见 §2.6）；其余三行可改。
- **来源家族**是 toggle chips；选空 = 自动；「自动」按钮清除整行（families/authority/recency）。
- **清除本项目默认**：删文件；不影响方法库默认。二次点击确认（或 3 秒内再点）。
- **失效态**：文件损坏 / 非法 enum / 未知 schema → 红色横幅 + 行标失效 + 给可用值；不静默沿用。`clear` 或重选可修复。
- **stale 态**：命令返回 `stale` → 自动重读一次，横幅「配置已在别处修改，已刷新」。
- **诊断**：右上角 `v<revision>`；hover 显示 `updatedAt`。
- **i18n**：所有文案进 `src/client/locales/{zh,en}.ts`；数据面标签按 id 取字典；默认 zh（D49）；无硬编码中文。
- **无障碍**：按钮/select 有 aria-label；chips 是 `aria-pressed`；状态回执 `role="status"`。

### 3.3 共享客户端 store（按钮与面板同一份状态）

- `src/client/defaults/store.ts`：按 sessionId 保存 `{ phase, defaults, methodDefault, problems, revision, pending, lastError }`；`refresh()` 读两文件；`setField()/unset()/clear()` 调 command 后 `refresh()`。
- 用 `useSyncExternalStore` 订阅；按钮和面板读同一 store，改完立即一致。
- 读：`readText(sessionId, 'research-defaults.json', signal, 200, true)` + 现有 `readLibrary`；`missingOk` 区分缺席（合法空态）与故障。
- 写：`scoped.remote.commands.execute(sessionId, '/research-defaults …')`；结果 `CommandExecution` 的 `result.kind/text` 转成 store 的 `lastError`/回执。
- 生命周期：store 随 `ctx.effect` 回收；读请求带 AbortController + 每 session 请求序号，避免旧响应覆盖新状态。
- 纯逻辑（label、计数、失效映射）住 `src/lib/research-defaults.ts` 或 `src/client/defaults/model.ts`，keyless 单测。

### 3.4 为什么不是别的入口

- **不新开第五个侧栏页签**：现有「研究配置」就是设置面；加一块，不增加导航成本。
- **不用 modal**：会挡对话，且 D25 的形状是右栏。
- **不用 DSH Settings / `settings.section`**：profile 作用域，不是 workspace；且 settings modal 无公共 opener（现状材料 §3.4）。
- **不做启动 wizard / StartCard 必答**：过度前置；按钮在有 session 时即在场，用户想设就设。

## 4. 边界与已定决定

| 决定 | 本设计怎么守 |
|---|---|
| D17 harness/run bundle | 默认文件是 workspace 用户数据；不写包内；run 期间不改已批准设计 |
| D25 面板不直写 | 面板 → host command；command 写盘 + 会话日志；文件注入模型；不 client 直写 |
| D40 工作区形状 | 新增一个可选 `research-defaults.json`；D50 明确修订；数据卡/README/design/10 同 diff |
| D46 protocol canonical | 默认只是输入；实际值落 protocol；不新增第二份设计 |
| D48/O2 | 不做策略优先 UI/策略目录；只做现有摘要页签内的一块默认块；D50 说明为何不构成 O2 回潮 |
| D49 默认中文 | 面板/按钮 zh/en 字典；默认 zh；命令描述双语常量 |
| design/70 §7 | 不引入 productType/deliveryMode/company 层 |
| 方法库 D25/D37 | 方法默认只读；写入仍归方法库页/窄工具 |

【决定】新增 **D50**（草案，落地时登记）：

> 项目研究默认 = workspace `research-defaults.json` + `/research-defaults` host command + `research:defaults` prompt context；只存 depth/output/source（method 跟方法库默认；gates 不开放）；每次 assembly 活读；HITL1 三问照发、默认只作首推；composer 状态按钮 + 「研究配置」页签「项目默认」块；面板经 host command 读写（不直写盘）。修订 D40 工作区形状；D25 的写路径以本行为准（host command，不是 client 直写）；不构成 D48/O2 的策略优先 UI。

## 5. 实现清单

### 5.1 新增

| 文件 | 内容 |
|---|---|
| `packages/deep-research-pack/src/lib/research-defaults.ts` | 共享 schema/parse/merge/unset/serialize/contextText/buttonState/findDefaultMethod |
| `packages/deep-research-pack/src/defaults/index.ts` | host 行：注册 command + `research:defaults` context；cwd 解析；缓存 |
| `packages/deep-research-pack/src/defaults/command.ts` | `/research-defaults` 核心：show/set/unset/clear；原子写；stale；路径安全 |
| `packages/deep-research-pack/src/client/defaults/store.ts` | 按 session 的读写状态与 command 调用 |
| `packages/deep-research-pack/src/client/defaults/DefaultsButton.tsx` | composer 按钮 |
| `packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx` | 「项目默认」块（供 ResearchConfigTab 用） |
| `tests/pack/research-defaults.test.mjs` | 共享 parser/merge/contextText/buttonState 的 keyless 电池 |
| `tests/pack/defaults-command.test.mjs` | 命令核心：set/unset/clear/stale/invalid/symlink/path |
| `tests/pack/defaults-effect.test.mjs` | host 行注册走 ctx.effect、command/context 名与 order |
| `tests/cockpit/research-defaults.test.mjs` | 客户端 label/失效映射/字典键 parity |

### 5.2 修改

| 文件 | 改动 |
|---|---|
| `cordis.patch.yml` | 新增 `- id: research-defaults name: 'dsh-deep-research-pack/defaults'` |
| `package.json` | `exports['./defaults']`、`files`、peer/deps 如需（命令用结构类型，尽量不新增 peer） |
| `tsconfig.host.json` | include `src/defaults`、`src/lib/research-defaults.ts` |
| `tsdown.config.ts` | entry `defaults: 'lib/types/defaults/index.js'` |
| `src/lib/faces.json` | `research-defaults.ts` 加进 `shared` |
| `src/client/index.ts` | inject `remote.commands`；store 装配；`conversation.input.left` 注册按钮；config tab 注入 store |
| `src/client/keys.ts` | `RESEARCH_DEFAULTS_SLOT = 'conversation.input.left'` + 按钮 id 常量（client-keys 单一正本） |
| `src/client/ResearchConfigTab.tsx` | 顶部插入 `DefaultsPanel` |
| `src/client/locales/{zh,en}.ts` | 按钮/面板/错误/回执文案键 |
| `presets/lead/skills/research-brief/SKILL.md` | 项目默认消费 + 方法默认首推 + 偏离记录 + 不写默认 |
| `tests/pack/research-brief-contract.test.mjs` | 默认消费断言 |
| `tests/pack/export-shape.test.mjs` / `package-contract.test.mjs` | 新 `./defaults` 导出与 entry 进清单 |
| `tests/pack/data-plane-invariants.test.mjs` / `pack README` | 新数据卡行 |
| `docs/design/10-architecture.md` / `docs/design/40-research-cockpit.md` | 工作区形状、驾驶舱件表 |
| `docs/guides/65-run-forms.md` / `docs/terms.md` | 数据卡、术语 |
| `docs/decisions.md` | D50 |
| `dev/research.overlay.yml` | 跑 `node dev/render-overlay.mjs` 重新生成 |
| `scripts/smoke/lifecycle-smoke.mjs` / `doctor-smoke.mjs` | 新 entry 进清单 |
| `scripts/dist/product-manual.md`（+ 重新生成 `_dist/安装手册.md`） | 安装合同若列工作区文件，同 diff 更新生成物 |
| `scripts/smoke/client-load-smoke.mjs` + seed | 按钮/面板/命令端到端断言 |
| `packages/deep-research-pack/README.md` / `README.zh.md` | 数据卡 + 用法 |

### 5.3 实施顺序（同一交付，两段验证）

1. **数据层**：共享模块 + command + host 行 + prompt context + skill 消费 + 单测；用 `/research-defaults` 手跑一遍；L1 + L4-lite。
2. **界面层**：store + 按钮 + 面板 + locale + client-load-smoke；按钮 ↔ 面板状态一致性。
3. **收尾**：D50 + 数据卡/README/design/guides/terms + overlay + install/product/release smoke + Note。

## 6. 验收（逐条绑定检查方式）

- **A1 读**：`research-defaults.json` 合法 → parser 出三轴；缺字段 = 自动；未知键忽略并 warning；损坏不注入。
- **A2 写**：`/research-defaults set` 原子写、revision+1、回读；`unset` 清字段；`clear` 删文件；stale 拒绝；symlink/目录/相对 cwd 拒绝。
- **A3 注入**：设值后下一轮 assembly 出现 `research:defaults`（order 206）；无值时返回 `''`；两 workspace 不串；非法字段不出现。
- **A4 消费**：seeded 工作区方法库有默认 → HITL1 第一问首推它；`research-defaults.json` 有 depth/output/source → 第二/三问首推；仍三问、无第四问；quick_factual 不被升级；`§Decisions` 记「项目默认 / Lead 判断 / 用户本次」；用户覆盖默认不进 `deviations`，protocol 批准后的偏离才进。
- **A5 UI**：有 session 才有按钮；点击开「研究配置」页签、顶部见项目默认块；改动后按钮文案即时变；无保存按钮；失效/stale 有可见态；清除后回自动。
- **A6 命令端到端**：client-load-smoke 点面板改一项 → 盘上文件变、revision 变、按钮变；无模型调用。
- **A7 真模型**：L4-lite seeded 工作区 + 默认 → HITL1 卡面首推 = 默认；计划卡 ≤200 字；protocol 与默认一致。
- **A8 边界**：面板不直写（只有 command 写）；方法行只读；不写方法库；不出现 method/gates 字段。
- **A9 双语**：按钮/面板/错误/回执 zh/en 字典齐全、默认 zh、无硬编码中文；真页面 zh/en 截图。
- **A10 门禁**：`pnpm verify` / `pnpm typecheck` / `pnpm test` 全绿；L1 `preset-smoke`；`client-load-smoke`；`install-shape-smoke` / `product-boot-smoke` / `release-smoke`（pack AGENTS 要求）；snapshot 若因新 context 变化则重录 B 层。

## 7. 风险与回滚

| 风险 | 处置 |
|---|---|
| 模型不按默认首推 | skill 可读性 + L4-lite 证据；不先加 UI |
| 面板/命令写坏用户文件 | 原子写 + revision + 回读 + symlink/路径拒绝；坏文件不覆盖，只能 clear |
| 命令与 prompt 不同步 | 同一 host 行、同一共享 parser；命令写后立即 refresh；prompt 每步活读 |
| D25/D48 争议 | D50 明确写路径与「不构成 O2」；用户批准后再落地 |
| 新 host 行安装态失败 | lifecycle/install/product/release smoke 全跑；行可单独禁用回滚 |
| 无配置场景 assembly 变化 | 无值返回 `''`；snapshot 对照确认 |

**回滚**：禁用 `research-defaults` bundle 行即可停 command + 注入；文件是用户数据，保留；面板块随 client 行禁用消失。不迁移、不删用户文件。

## 8. 需要你拍板的只有两件

1. **D50 批准**：workspace `research-defaults.json` + `/research-defaults` host command + `research:defaults` 注入 + composer 按钮/配置页签面板；方法默认只读、HITL1 三问不变。这是对 D40（工作区形状）与 D25（写路径）的明确修订。
2. **方法行只读**：面板不在方法库里选默认，只显示并指向顶部「方法库」tab。理由：方法库写入已有唯一窄工具（D25/D37），再开一个入口会变成第二条写路径。若你要面板内直接换方法默认，有两条扩展：①**Lead 中继**——下拉选中后发送既有「以后默认用 X」指令，由 Lead 写库（D25 期 1 同款，不需要新写授权，但模型依赖/慢，且与方法库页重复）；②**新 host command** 写方法库默认（确定性强，但要改 D25/D37 的写授权）。我建议本期只读；①可作为下一小步，②不混进本期。

其余设计点已定为：文件名 `research-defaults.json`、只存 depth/output/source、host command 唯一写、无保存按钮、右栏现有页签、默认 zh/en、lens/wiki/语言/用户级默认全部 v2。
