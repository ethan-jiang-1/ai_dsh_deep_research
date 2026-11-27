# 验证宪法 — 评估五面、测试策略与落家规则

> 性质：**合同**（评估怎么判、改动配什么证据、检查落哪一层；只写 now）。改评估标准本身 = 一个 D 号决策，进 `notes/`，不悄悄改；时变状态不住本文件。
> L0 全量门禁逐条台账 = [reference/gates-ledger.generated.md](./reference/gates-ledger.generated.md)（自动生成）；全量命令字典 = [reference/commands.md](./reference/commands.md)。
> 制度依据 = [三环四账五关 Note](../notes/implemented/2026-11-13-test-strategy-operating-model.md) · [制度化交付 Note](../notes/implemented/2026-11-13-test-strategy-institutionalization.md) · [守卫契约加固 Note](../notes/implemented/2026-11-16-guard-contract-hardening.md)；命名车道 = [D53](./decisions.md#d53)。

## 0. 一句话与权威血缘

证据要匹配**失败类**，不是匹配「测试金字塔」或「改了几个文件」。先归类，再选最便宜但确实能看见该失败类的层；先证明它会红，再交付绿；拿不准就写「显式未覆盖」，不拿绿冒充充分。

| 原则 | 权威出处 |
|---|---|
| 完成定义 = 该面最小"真检查"通过；发现权在代理一侧 | company repo D15（依据 vendor `docs/testing.md` + postmortem 0001–0003） |
| no-key 测试只证明管道通；with-key 才证明 agent 真的能用 | vendor/dsh `docs/testing.md` "with-key policy" |
| Verify the world, not the self-report（断言重读文件/重跑命令，不信自述） | vendor/dsh `docs/testing.md` |
| 真入口路径 = 发布产物（npm pack → 干净 profile → plugin add → 真会话） | vendor/dsh `docs/testing.md` + company `docs/release.md` |
| 真模型/真浏览器不进 keyless 回归（layering 守卫防混） | company `tests/layering.spec.ts` 模式 |
| 每条新门禁带反证：先注入回归看红 → 还原 → 绿 | vendor/dsh `docs/testing.md` "A guard only guards if…" |
| 挂载失败只有真会话抓得到（dump/roster 看不见） | company postmortem 0001 → `preset.e2e.mjs` |

---

## 1. 五个评估面（L0–L4）

每面 = 一个可独立判定的检查域。**面与面不互抵**：L4 绿不能补 L0 红。探针（根 `probes/`）**不是第六个评估面**：它是 L1/L4 的证据工具，定义与操作 = [guides/probe-playbook.md](./guides/probe-playbook.md)。

### L0 结构面（机械门禁，keyless）

- **定义**：仓库结构、文件卫生、preset 声明完整性、vendor 铁律与静态契约等机械可查的不变量。
- **最小真检查（fresh clone 可跑）**：`pnpm verify`（= `node checks/verify/verify.mjs`，含 `pack-lint`）+ `pnpm test`（默认回归，含 `.mjs` `checkJs` 与领域语义扫描）——两件均 keyless、无 vendor 构建产物。
- **加跑面**：
  - `pnpm lint`（standalone oxlint 检查 pack `src/`）与 `pnpm test:vendor`（vendor 源码契约，fresh clone 可跑）；
  - `pnpm typecheck`（pack 双半类型面 + `tsconfig.scripts.json` 脚本域；pack 半需要 vendor 构建产物）；
  - 改门禁时可 `--only=<gate[,gate]>` 并跑 `node checks/smoke/gates.e2e.mjs --gate=<name>`（收尾仍须全量）；
  - 改驾驶舱（client 面，[D18](./decisions.md#d18)）加跑 `node --import tsx/esm checks/smoke/client-load.entry.mjs`（CI 加 `--seed tests/fixtures/client-load-home`；失败留 `runtime/smoke-workspace/client-load-*`；无交付目标 = exit 2 SKIP，主机不健康 = exit 2 NOT-RUN，未跑 ≠ 通过）；事实/终稿目标改动加跑 `cockpit-truth*.entry` 与 `cockpit-locale.entry`（路由正本 = [guides/dev-loop.md §2](./guides/dev-loop.md)）。
- **门禁自动台账与反证口径**：全量门禁与自测覆盖自动生成于 [reference/gates-ledger.generated.md](./reference/gates-ledger.generated.md)（由 `gate-ledger-sync` 对账）。常驻反证 = [gates-cases.mjs](../checks/lib/harness/gates-cases.mjs) 的 `CASES`；结构性不适门禁列于 `NO_CASE_GATES`，由 `tests/checks/harness/verify-gates.test.mjs` 反向对账。
- **契约回归索引（`pnpm test` 守卫族，全量映射见 [tests/INDEX.generated.md](../tests/INDEX.generated.md)）**：
  - **文档与台账**：`decisions-now`、`docs-consistency`、`docs-reference`、`navigability-contract`、`readme-manual-commands`、`release-copies`、`install-copies`；
  - **run 与数据面**：`run-bundle-charter`、`schema-scan`、`verdict-audit`、`findings-contract`、`review-contract`、`protocol-core`、`data-plane-invariants`；
  - **pack 与内容**：`content-injection`、`template-contract`、`content-disclosure`、`presets-wiring`、`content-coverage`、`role-consumer-matrix`、`bundle-composition.vendor`、`skill-parser-contract`；
  - **驾驶舱与客户端**：`client-surface`、`client-file-size`、`client-effect-return`、`no-unused-code`、`tabs-fault-matrix`、`run-property`、`plan-mdast`；
  - **车道、静态防线与发布**：`test-lanes`、`smoke-oracle-surface`、`smoke-cost-budget`、`ci-workflow`、`shipped-surface`、`release-anchor`、`scripts-typecheck`、`semantic-guardrails`。
- **通过判据**：全绿；门禁自动台账与 `tests/` 守卫完整同步。**何时跑**：每轮 goal 续驶必跑。

### L1 挂载面（真挂载 = preset 类改动的完成定义）

- **定义**：每个研究角色 preset 在**真 DSH 会话**里挂载成功——persona 生效、skills 可见、工具面齐全（dump/roster 可见不算）。
- **最小真检查**：`node checks/smoke/preset.e2e.mjs`——keyless 预检 + 真会话档（`DSH_SMOKE_REAL=1`；落地证据 = [L1/L2 绿灯 Note](../notes/archived/2026-09-24-l1-l2-green.md)）。
- **通过判据**：全部角色真挂载绿。**何时跑**：preset 内容/结构改动及里程碑必跑。

### L2 安装面（真实安装形状）

- **定义**：插件以用户实际获得的方式可用——`npm pack` 产物完整，装进**干净 profile** 成功，起会话可用，client 半在场。
- **最小真检查族**（命令正本 = [guides/dev-loop.md §2](./guides/dev-loop.md)）：
  - **发布面/显示面**：`node checks/smoke/lifecycle.entry.mjs`（`market.json` 校验 → 装 tarball → dump → 真启动 → `readPluginMeta` 中英元数据 → `remove` 回落）；
  - **安装与首启（[D40](./decisions.md#d40)）**：`install-shape.entry.mjs` + `product-boot.entry.mjs` + `release.entry.mjs`（`npm pack` → 重建 profile → `plugin add` → doctor `--install-only` → 安装域会话断言）；
  - **冷启动与诊断**：`cold-start.entry.mjs`（独立 home/profile/端口/state 到浏览器面 GREEN）+ `doctor.e2e.mjs`。
- **通过判据**：pack 清单与 `files` 一致、安装零缺失警告、roster 三态正确、首屏可达、`lib/client.js` 在场、端口释放无残留。**何时跑**：包结构、startup/client 恢复、release 改动及里程碑必跑。

### L3 领域面（Deep Research 方法论完整性）

- **定义**：从 codex Deep Research harness 提炼的方法论在本插件上有完整落点，且用 DSH 原生载体实现。
- **最小真检查**：[contracts/methodology-mapping.md](./contracts/methodology-mapping.md) 映射表审查 + `tests/checks/analyze/evaluation-contract.test.mjs` 与 `tests/contracts/methodology-mapping.spec.mjs`。
- **通过判据**（五条全要）：① 生命周期映射完整（立项对齐 / 广度侦察 / 深度挖掘 / 综合写作 / 质量把关 / 审阅交付均有 DSH 落点或弃用理由）；② 角色分工单一职责（每类事实单一 owner）；③ 证据可追溯载体存在（frontmatter 契约与追溯链）；④ 信噪比策略显式（来源分级 / 多源交叉 / 反例判据写进角色 skill）；⑤ 读者版合同（critic PASS 后派生 `final/readable.md` → `final/readable-vN.md`，由 `node-gate` 门C 与 `presets.spec.mjs` 把守）。
- **有效证据谓词（开发仓观察面）**：硬五字段（`source_url` / `retrieved_at` / `quality` / `found_by` / `supports`）全齐才算有效；软二字段（`source_tier` / `publisher`）缺失标"未分级"；`evidence-audit` 核实抓取与引用链，日期校准与版式归 critic。

### L4 交付面（真模型端到端）

- **定义**：真模型、真实研究问题、完整研究 run，产出可核查报告。
- **L4-lite（框架里程碑档）**：`l4-lite.e2e.mjs` 每角色一条真模型消息 + scout `web_search` 真实调用。
- **L4 全量（方法论里程碑档）**：真实问题完整 run；六条判据中**四条机器、两条人工走查**：

  | 判据 | 类型 | 载体 / 命令 | 通过 |
  |---|---|---|---|
  | ① 报告存在且含来源清单 | 机器 | `node checks/run-gates/node-gate.mjs <bundle>`（门A）+ `final/vN` 在场 | exit 0 |
  | ② 结论能回溯到来源文件 | 机器 | `node checks/run-gates/evidence-audit.mjs <bundle>` → `audit.md` | exit 0 且 `CRITICAL=0` |
  | ⑤ claim 级裁决覆盖（新契约 run） | 机器 | `node checks/run-gates/verdict-audit.mjs <bundle>` → `review/verdict-audit-r<N>.md` | exit 0（critical 全有结论性裁决） |
  | ⑥ Protocol 工件与审计（新契约 run） | 机器 | `node checks/run-gates/protocol-audit.mjs <bundle>` → `protocol-audit.md` | exit 0（schema/effort/output/投影/批准链与无环图自洽） |
  | ③ 两点交互纪律（HITL 之间静默自主） | 人工走查 | 会话日志里 HITL1 与 HITL2 之间无 `ask_user_question` 或请示汇报 | 结论一行 + 日期写入 bundle `acceptance.md`「人工走查」节 |
  | ④ 中断后从 run 工作区恢复 | 人工走查 | 停通道 → 重启 → 新会话说「继续 `<slug>`」可接续且不依赖 chat memory | 同上 |

  人工走查不是"随便看看"：**没有记录 = 未跑**（未跑 ≠ 通过）；`acceptance.md`「人工走查」节不可再生，`run-accept` 重跑与 `--repair` 均保留它。

### 五面的退出语义、完成判断四分离与作用域

每面的最小真检查按三态收口：**exit 0 = 该面绿 / 1 = 红 / 2 = 未跑（前置缺席）**。未跑 ≠ 通过——交付报告必须分列"已跑绿 / 已跑红 / 未跑"（[checks/AGENTS](../checks/AGENTS.md)）。

| 面 | 最小真检查的退出码来源 |
|---|---|
| L0 | `node checks/verify/verify.mjs` + `pnpm test`（均 0/1；无 2 态） |
| L1 | `preset.e2e`（缺环境 exit 2） |
| L2 | `lifecycle.entry` / `release.entry` / `install-shape.entry` / `product-boot.entry` / `cold-start.entry` / `doctor.e2e`（缺前置 exit 2） |
| L3 | `pnpm test` 的 `methodology-mapping` + `evaluation-contract`（0/1） |
| L4 | 机器 ①②⑤⑥ 审计脚本退出码；③④ 人工走查记录在场即"已跑"，缺席即"未跑" |

**完成判断四分离（交付判断公理）**：**能加载 ≠ 有行为证据 ≠ 能安装 ≠ 已获交付批准**——四个结果必须分别观察和记录（[discipline-matrix 源 11](./reference/discipline-matrix.md#source-11)）：能加载 = L1 真挂载；有行为证据 = L1 行为断言 + L3 + L4/run 审计；能安装 = L2 `release.entry`；已获交付批准 = 收尾对账 + 语义自审（[reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md)）+ 用户批准。交付判断四角色（**机械检查 / 语义自审 / 用户批准 / 显式交互**）互不冒充。

**完成判据的四个作用域**：**面级**（本页 §1，下限）→ **任务级**（[guides/dev-loop.md §0/§4](./guides/dev-loop.md)）→ **goal 级**（本页 §5 里程碑矩阵，只对持续目标）→ **语义级**（[reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md)，可否决前三者但不能替代机械面证据）。

### 判据形状：判据不猜，投影不编（跨面）

<a id="verdict-shape"></a>

| 层 | 例子 | 读不出 / 有歧义时 | 禁止 |
|---|---|---|---|
| 判据 | 交付门、审计、验收决定 | **红**，并给出可执行的改法 | 「取最后一个 / 取最像的 / 关键词命中即算」 |
| 投影 | 驾驶舱、仪表盘、回放 | 显式 `unknown` / `unreadable` | 显示一个看起来合理的值 |

权威输入 = 结构化事实（canonical JSON、会话事件、文件事实，交付终局权威 = `review/readiness.json`）；散文仅作交叉核对，不一致 = 红。不猜、不增兼容分支（既有断代见 [D33](./decisions.md#d33)）；变异矩阵与不变量测试住 `tests/contracts/verdict-conformance.spec.mjs`（[verdict-shape Note](../notes/implemented/2026-11-13-verdict-shape.md) + [workflow-substance-gates Note](../notes/implemented/2026-11-13-workflow-substance-gates.md)）。

---

## 2. 测试策略：三环、四账、五关（D54 / D55）

### 2.1 三环与失败类 → 最低可见层

| 环 | 回答 | 资产 | 节奏 | 出口 |
|---|---|---|---|---|
| **回归环** | 旧行为被改坏了吗 | `pnpm test` = `test:spec` + `test:checks`；`test:vendor` | 每次改动 / commit | 0/1；秒级 |
| **装配环** | 组装后的产品还对吗 | L1 `preset.e2e`、L2 `*.entry`、`client-load.entry`、`snapshot-replay.entry`、真模型档 | 改动面触发 + CI + 里程碑 | 0/1/2；分钟级 |
| **发现环** | 哪些输入会静默做错事 | 探索 charter、变异矩阵、probes、后验取证 | 里程碑/大特性/复发后 | bug 卡 / 观察 / 歧义 / 空假设 |

默认往下走，不默认往上走（同一失败类能在纯函数层证，就不上进程/浏览器/模型）：

| 失败类 | 最低可见层 | 最小守卫形态 | 不应先上 |
|---|---|---|---|
| C1 静默接受 / fail-open | 纯函数 / 判据核 | 不变量 + 缺/空/非法/互斥矩阵 + fail-closed 默认 | 浏览器 / 真模型 |
| C2 消费者遗忘 | 静态契约 | 生产者盘上枚举 × 消费者清单；零孤儿 + 全覆盖 + 防空语料 | 真 run |
| C3 双份事实漂移 | 纯函数 | 同源 codec；同一输入两个入口同判；round-trip | 冷启动 |
| C4 边界 / 解析 | 纯函数 | 语法/编码维度矩阵（宽度/空白/注释/BOM/CRLF/后缀） | E2E |
| C5 状态 / 竞态 / 生命周期 | 纯函数 + 假时钟/屏障 | 状态迁移 × 交错矩阵；创建窗口/接管/释放/pid 复用/晚到 | 长跑 soak |
| C6 路径 / 安全 | 临时目录 | 绝对/相对/`..`/symlink/hardlink/目录当文件/空格/unicode；外部世界逐字节不变 | 真 run |
| C7 假绿 | 盘侧 oracle | 重读文件 / 重跑命令 / 计数≥1 / 明细行对账 / 在场≠内容 / 负控 | 只看退出码 |
| C8 假红 | 判据核 + 主机健康 | 选择器/健康前置抽纯并直测；真浏览器只做装配 | 先改断言 |
| C9 夹具漂移 | 夹具同源 | 夹具 import 当前判据；改夹具先预期红；基线带 source/新鲜度 | 刷新金标准 |
| C10 安装/发布/浏览器/模型 | `*.entry` / 真模型档 | 真 profile/tarball/浏览器/模型；exit 2 分列 | keyless 单测 |
| C11 文档/规则漂移 | 门禁/契约 | 文档副本同源、计数正本、路径/锚点门禁 | 人读 |
| C12 残余 | 先归因 | 一次探针/现场；归不进去 = 先补归因，不硬塞 | 猜 |

### 类级守卫三判据与旧性质继承

- **类级三判据（缺一不算类级）**：① 断言含显式全称命题，覆盖整族输入而非单条示例；② 变体由同一事实的多种写法、多读者或多时刻生成；③ 能指名一条**非本次报错原例**的邻近变体使守卫真实报红（负控）。
- **旧性质继承**：语义变更先从当前 owner 与已有测试追溯适用性质，优先由公共 Module 拥有操作，用独立 expected 在新实现上重跑原有正反例；保留多实现时须在家族 suite 显式列出批准实现并逐个对账实际执行集合。
- **决策五步**：① 归类（C1–C12）→ ② 选最低可见层 → ③ 同 diff 注入目标回归证会红 → ④ 验外部世界真值 → ⑤ 七问（会红/真入口/验世界/模型可见钉住/最低层/skip 可见/可重复）+ 证据账本 + 显式未覆盖。

### 2.2 五关与四账

| 关 | 问题 | 判据 | 不满足时 |
|---|---|---|---|
| **准入** | 新资产值得存在吗 | 唯一证明面 + 最低可见层 + 负控 + owner + 成本 | 不进；或先写进探索账 |
| **变更类** | 这类变更该带什么证据 | 模型可见→snapshot B；新纯件→直测；新实体→消费者矩阵；新判据→变异矩阵 | 证据账本写「显式未覆盖」并立卡 |
| **必需** | 在 required 路径吗 | 交付面证据必须在 CI/收尾；skip 可见 | 降为诊断或补 job |
| **退役** | 还有消费者吗 | `uniqueClaim` 仍成立、oracle 仍在、成本可承受 | `sunset` 或删除；不静默留着 |
| **复盘** | 为什么流程放它过去 | P0/P1 或同类复发 → 五节复盘 + 新守卫 | 复盘未完成，bug 卡不归档 |

实施前语义准入由 [guides/dev-loop.md §1.3](./guides/dev-loop.md#13-语义变更的验收准备) 拥有；实际执行与证明范围在 [reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md#从什么开始) 核对。

| 账 | 记什么 | 载体 | 何时更新 |
|---|---|---|---|
| **资产账** | lane / class / cost / uniqueClaim / oracleType / sunset | 慢车道 = [checks/smoke/registry.json](../checks/smoke/registry.json)（`smoke-oracle-surface`）；进程内 spec/check = [asset-ledger/ledger.json](../tests/fixtures/asset-ledger/ledger.json)（AST 推导 `oracleType`，`asset-ledger.test` 重算对账） | 新增/退役/改判据或改 import |
| **失败类与守卫账** | 类 → 代表 BUG → 守卫路径 → `oracleType` → 红配方 | [测试制度 Note](../notes/implemented/2026-11-13-test-strategy-operating-model.md) + 本文表 + [guard-ledger/ledger.json](../tests/fixtures/guard-ledger/ledger.json)（`guard-ledger.test` 双向对账） | 每次 P0/P1/复发或入账 |
| **证据账** | 证据/层/失败类/负控/CI/显式未覆盖 | [reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md) 证据账本节 | 每次非平凡交付 |
| **探索账** | charter/面/oracle/结果/毕业/日期 | [research 题目录](../_backlog/research/README.md) + [探索技能](../.agents/skills/exploratory-verification/SKILL.md) | 每轮探索 |

### 2.3 命名车道、重资产预算与反模式（D53）

| 后缀 / 位置 | 车道 | 命令 |
|---|---|---|
| `tests/{run,cockpit,pack,contracts}/**/*.spec.mjs`（`*.spec.mjs`） | 进程内核验 | `pnpm test:spec` |
| `tests/checks/<owner>/*.test.mjs` | 门禁自身（owner = `checks/lib/<owner>`） | `pnpm test:checks` |
| `checks/smoke/*.e2e.mjs`（`*.e2e.mjs`） | 真进程 | `pnpm test:e2e` |
| `checks/smoke/*.entry.mjs`（`*.entry.mjs`） | 真浏览器/profile/tarball | `pnpm test:entry` |
| `tests/vendor/*.vendor.spec.mjs` | vendor 源契约 | `pnpm test:vendor` |
| `*.support.mjs` | 支援件 | 不进车道 |

- **CI 分层与数量 ratchet**：`pnpm test` = spec + checks（秒级，pre-commit/CI push 必跑，0 条 smoke）；慢车道 `tier` = `ci` / `nightly` / `dev-only`（`smoke-registry` 对账 `ci.yml`/`nightly.yml`）；`smoke-cost-budget` 守 required ≤3、required slow ≤3、nightly ≤12、slow 总数 ≤15；全 SKIP 时 runner exit 2；`gates.e2e` 支持 `--gate` / `--case` 局部跑与 4 并发。
- **反模式**：为历史 BUG 逐张补实例测试而不落类级守卫；用 E2E/真模型测纯逻辑；加 retry/sleep/改 normalizer 凑绿；用「文件在场/点击计数/自报成功」当内容证明；新资产无 `uniqueClaim`/`oracle`/`sunset`。

---

## 3. 词汇桥、owner 轴与新检查落家序

### 测试词汇对照（传统金字塔词汇 → 本仓形态）

不用 unit / integration / e2e 作组织轴：同一标签下纯核与真 IO 的失败含义不同，**标签回答不了"要什么前置"**——本仓用三轴回答（档位 = 凭什么跑 / 验收面 = 证明了什么 / 命名即层 = 住哪怎么选；正本 = 本文、[checks/AGENTS](../checks/AGENTS.md)、[tests/AGENTS](../tests/AGENTS.md)）。

| 传统词汇 | 本仓形态 | 住哪 | 凭据 |
|---|---|---|---|
| 单元（纯函数） | run-state / hitl-fold / activity-fold / tool-card / bundle-bind 等谓词与折算断言（消费 [checks/lib](../checks/README.md) 纯函数） | `tests/<domain>/*.spec.mjs` | keyless |
| 契约（结构断言） | layering / smoke-contract / evaluation-contract / presets / export-shape / 各门用例 / navigability-contract | `tests/` + `tests/checks/` + [fixtures](../tests/fixtures/README.md) | keyless |
| 集成（真子系统） | preset.e2e（L1）/ release.entry（L2）/ snapshot-replay / client-load | `checks/` 冒烟族 | keyless（子进程/浏览器，无模型） |
| 端到端（真模型） | l4-lite / team-preflight / client-hitl；完整 run = L4 全量 | `checks/` 真模型档 | 需凭据 |
| 单点机制（探针） | behavior 六支 + browser `cdp-probe`；stream tee 是仪器，不是探针 | `probes/`（指南 = [guides/probe-playbook](./guides/probe-playbook.md)） | 真模型档/连已起 GUI；**不是第六个评估面** |
| 生产审计 | node-gate / schema-scan / evidence-audit（对真实 run bundle） | `checks/` run 门 | keyless |

### 测试 owner 轴

`tests/run/<owner>/` 与 `tests/checks/<owner>/` 均与 `checks/lib/<owner>/` 同名（跨切证据住 `shared/`，无 import 门禁测试住 `repo/`；镜像契约 = [test-owner-mirror](../tests/checks/shared/test-owner-mirror.test.mjs)）。pack 侧：`src/lib/<domain>/` ↔ `tests/cockpit/lib/<domain>/`，`src/client/<sub>/` ↔ `tests/cockpit/client/<sub>/`，`src/<surface>/` ↔ `tests/pack/<surface>/`，包级合同住 `tests/pack/contract/`，跨面产品合同住 `tests/contracts/`，pack 脚本住 `tests/pack/scripts/`（[pack-mirror](../tests/checks/shared/pack-mirror.test.mjs)）。

### 新检查落家序（加一个检查时按序找家，单一入口）

1. **`tests/<domain>/*.spec.mjs` 契约测试**——断言对象是仓内自控文件、keyless 秒级可判真假。义务：同 diff 在本文对应面登记；新契约测试带反证（[tests/AGENTS](../tests/AGENTS.md)）；
2. **一次性检查**——不复现的核对：跑完即弃（运行区临时脚本），证据进实施记录；**复现第二次即升格契约测试**，不滞留临时态；
3. **`checks/smoke/*.e2e.mjs` / `*.entry.mjs` 分车道**——真进程 / 真浏览器·profile·tarball；义务：后缀申报车道与档位（[checks/AGENTS](../checks/AGENTS.md)）；
4. **探针 / 真模型档脚本**——真实边界的单点机制证据 → `probes/`（指南 = [guides/probe-playbook](./guides/probe-playbook.md)）；需要凭据与模型调用。义务：头注 + 索引登记（`probe-registry`），closed set 登记（`smoke-contract`）；
5. **verify 门禁**——断言跨条目恒真的仓结构不变量。义务：走 [writing-a-gate](../.agents/skills/writing-a-gate/SKILL.md) 全流程（先想红 + `context.gates` + 域模块 + `pnpm docs:gen` 刷新台账）；
6. **run 门（`*-gate` / `*-audit` / `*-scan`）**——断言真实 run bundle 的文件事实，随 run 消费；
7. **`tests/fixtures/` 支撑样本**——taxonomy 建行，consumer 必须真实（[taxonomy](../tests/fixtures/README.md) + 契约测试零孤儿断言）。

选层成本原则：穷举矩阵不是目标——**能咬中本次回归的红灯才是**；升档前先问"这个红灯真的会咬中本次改动吗"。

---

## 4. 负面判据（任一出现 = 框架不合理，触发重构而非堆功能）

1. 自建机制与 DSH 现成载体重复，且拿不出"DSH 载体不可用"的证据——**不发明纪律**；
2. 角色职责重叠或漂移，某类事实出现双 owner / 无 owner；
3. 挂载假绿：preset 在 dump/roster 可见但真会话缺工具/skill；
4. 生命周期环节在 DSH 上无落点且无弃用登记；
5. keyless 回归里混入真模型/真浏览器依赖（layering 违例）；
6. 评估面互抵尝试（拿 L4 绿掩盖 L0 红）。

---

## 5. 里程碑 × 面 矩阵与 goal 续驶判定

> 里程碑前缀统一为 `MS1` / `MS2` / `MS3+`，与运行形态 `M1–M3`（[contracts/run-forms.md](./contracts/run-forms.md)）彻底分离。

| 里程碑 | L0 | L1 | L2 | L3 | L4 |
|---|---|---|---|---|---|
| MS1 框架搭建 | ✓ | ✓ | ✓ | ✓ | lite |
| MS2 首次完整研究 run | ✓ | 改动则跑 | 改动则跑 | ✓ | **全量** |
| MS3+ 打磨/回归固化 | ✓ | 改动则跑 | 改动则跑 | 改动则跑 | 按需 |

**每轮 goal 续驶判定程序**：① 每轮必跑 L0，改动涉及哪些面就加跑哪些面，只报告实际跑过的检查；② goal 标 `complete` 的唯一条件：当前里程碑矩阵全绿；③ 同一面连续 3 轮无法转绿且阻塞条件明确 → goal 标 `blocked`，区分"缺上游能力"与"设计缺陷"；④ 评估标准本身的变更 = D 号决策登记，禁止静默放宽。

## 已知限制与延后工作

- L1/L2/L4 需要真 DSH 环境与（L4）`DEEPSEEK_API_KEY`；环境未就绪时该面标"未跑"，**不等同通过**。
- `watch-run` 轮询循环与 `tools/env.sh` 本体为壳面不测（状态谓词与折算已下沉 `checks/lib/` 由 `pnpm test` 覆盖）。
