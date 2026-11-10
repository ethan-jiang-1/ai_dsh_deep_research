---
topic: 本仓探针的凸显化与组织化
intent: 诊断探针为何被埋没，给出借鉴 ai_dsh_company 的取舍、根目录迁移面与落地切片
---

# 探针凸显化：根 `probes/` 与调试第一入口

> 研究日期 2026-11-10。外部证据 = [company 机制审计](2026-11-10-external-probe-model.md)；
> 本仓事实 = 盘上文件（锚点逐条核过）。结论已定性；产出卡 =
> [2026-11-10-probe-surfacing](../../issues/2026-11-10-probe-surfacing.md)。
>
> **执行状态（2026-11-10）**：S1 已落地——根 `probes/`、生成索引、`probe-registry` 门、
> guides/66、`using-a-probe` 技能与路由均已交付；实现记录 =
> [Note](../../../notes/implemented/2026-11-10-probe-surfacing.md)。下面 §1 是**迁移前诊断**，
> §4.1.1 保留为执行面清单；当前路径以 `probes/` 为准。
>
> **用户定调（2026-11-10）**：方向可以；探针必须在仓库根部，像 company 的 `probes/` 一样明显。
> 这条覆盖上一版「暂不迁顶层」的取舍——本版把**根目录迁移放进 S1**，不再是触发后的选项。

## 0. 结论

本仓**有探针，但没有「探针这件事」**：

- 盘上有五支 `*-probe.mjs` + 一支流取证仪器；真模型档四支登记在 `REAL_MODEL` 闭集；
- 发现链只有两条：根 [AGENTS.md](../../../AGENTS.md) 布局里一个括号短语（第 57 行），和
  [scripts/README.md](../../../scripts/README.md) 一张手维护表（第 46 行）；
- 任务路由、症状表、术语表、验收合同、开发技能里都没有「什么时候该用探针」的入口；
- 五支头注没有 `状态` / `何时跑` 字段（全目录 `grep` 零命中），没有索引、没有头注门；
  新增一支探针不会被任何机械检查要求登记——`smoke-contract` 只管「要求凭据的脚本」，
  `navigability-contract` 只要求 `scripts/README` 点名顶层目录名与 lib 文件，不点名每支探针；
- 目录层级本身也在传递错误信号：探针住在 `scripts/` 的检查面里，而不是独立的调试面。

借鉴 company 的正确姿势不是搬 68 支、四个域、65 道门，而是搬**四件组织机制**：
根目录 `probes/`；生成索引 + 字节级新鲜度门；`状态` / `何时跑` 头注门；失败面地图。
再用本仓更强的一层——**任务路由 + 技能**——补 company 自己也没解决的「想不起来用」。

一句话：**探针不是第六个评估面，是 L1/L4 的证据工具；它的家 = 根 `probes/` + 一个指南 +
一个生成索引 + 一道头注/索引门 + 一个技能 + 三处路由。**

## 1. 现状（盘上事实）

### 1.1 资产

| 探针 | 证明什么 | 档位 | 现有头注（散文） | 缺 |
|---|---|---|---|---|
| `scripts/probe/cdp-probe.mjs` | 驾驶舱真浏览器场景：显示、点击、会话回复；`--ask` 判据 = 会话日志落盘对账 | 连已起 GUI；`--ask` 按会话档 | 为什么存在 / 用法 / 前置 / exit | 状态、何时跑、档位、判据、不证明（标签） |
| `scripts/probe/entry-chain-probe.mjs` | 入口链三问：授权范围、RFC 条件、开发环路径 | 真模型（REAL_MODEL） | 为什么 / 设计 / 前置 | 同上 |
| `scripts/probe/discipline-probe.mjs` | 五场景纪律行为标记（A2 超界 / B1 差集 / 收活缺件・UNVERIFIED / 计划确认卡） | 真模型 | 定位 / 场景 / 前置 | 同上 |
| `scripts/probe/method-library-probe.mjs` | 偏好库三问：路径、条目数、点名条目缺席如实说 | 真模型 | 服务 BUG-042 / 分工 / 前置 | 同上 |
| `scripts/probe/rerun-triage-probe.mjs` | 不满转接五条行为（复述 / ≤2 手段 / 代价 / 未确认不动手 / 范围） | 真模型 | 为什么 / 前置 / exit | 同上 |
| `scripts/probe/llm-stream-tee.cjs` | LLM 流四件套证据（req/meta/sse/err），活进程预载 | 仪器（非判据脚本） | 为什么 / 用法 | 状态、何时跑、档位；判据 = 不适用 |

### 1.2 发现链

| 入口 | 现状 | 能回答什么 |
|---|---|---|
| 根 `AGENTS.md:57` | `probe/（交互与行为探针）` 一个括号短语，挂在 `scripts/` 行内 | 知道有这个目录；不知道何时用、有哪些 |
| `scripts/README.md:46` | 手维护表，六行（每件「证明什么 + 档位」） | 有人翻到时能看全；翻不到就没有 |
| `docs/guides/60` 命令块 | 133 / 137 / 162 / 163 行散落四条 | 复制命令；没有「选探针还是 E2E」的决策 |
| `docs/project-map.md` | 证据表 116–117 只列 cdp-probe 与 method-library-probe；症状表 186–198 无探针行 | 两条具体症状；其余探针无入口 |
| 任务型路由表（guides/60 §2） | 无「探针」行 | — |
| `docs/terms.md` | 无「探针」条目 | — |
| `docs/evaluation.md` | 五面 L0–L4，无探针位置 | — |
| `.agents/skills/` | 开发技能目录里没有探针技能 | — |

### 1.3 机械约束

- `tests/contracts/smoke-contract.test.mjs:19-28` 只登记「要求凭据」的脚本，且扫描器只扫
  `scripts/` 下各组；`cdp-probe` 这类 keyless/GUI 探针不在闭集内，新增 keyless 探针无登记义务。
- `tests/contracts/navigability-contract.test.mjs:70-73` 只要求 `scripts/README` 点名
  `probe/` 目录名与 `lib/` 文件；不要求点名 `probe/` 内每一支。
- 没有 `INDEX.generated.md`；没有头注门；`scripts/README` 的表是唯一全量清单，且可静默漏项。
- 探针全部手动跑；真模型档成本高，不进 CI 是合理设计——但「何时跑」因此更需要写在头注里。
- 根 `AGENTS.md` 当前 139 行，预算 140（[doc-budgets.json](../../../scripts/doc-budgets.json)）：
  加一行根布局刚好到顶；不能再用新增行加指针。

## 2. 缺口

- **G1 目录层级错位**：探针是独立的调试面，却住在 `scripts/`（检查面）里；根布局只用一个
  括号短语提及，fresh agent 不会把它当成「第一站」。
- **G2 发现链单点且浅**：布局短语 + 手维护表。从「行为可疑」到「跑哪支」没有短路径。
- **G3 选择规则缺失**：「探针 vs 单测 vs 冒烟 vs E2E vs 回放」的分界散在各脚本头注与
  外部材料里；本仓没有一页回答「这个不确定性该用哪种实验」。
- **G4 清单会漂**：`scripts/README` 手枚举；新增/改名/删除探针没有机械约束。company 的教训
  正是「手写清单一定会漂」，其解法是生成物 + 字节级门。
- **G5 头注无协议**：没有 `状态` / `何时跑` / `档位` / `判据` / `不证明` 的统一字段；
  「不证明」有的写在散文里（entry/discipline），有的没有。读者无法快速判断一支探针的
  证明边界与重跑条件。
- **G6 生命周期缺失**：没有常驻/已耗，也没有「一次性实验 → 第二次复现就升格为常设探针」的
  规则；一次性实验散在 `_backlog` / `notes` / `runtime`，与常设资产混在一起。
- **G7 覆盖地图不可见**：五支集中在入口、纪律、偏好库、转接、GUI；哪一失败面薄、哪一空白，
  没有一张表能看出来。
- **G8 术语与验收未登记**：`terms.md` 无条目；`evaluation.md` 无一句话说明「探针不是第六面」。

## 3. 借鉴决策

| 外部做法 | 决策 | 本仓落法 / 理由 |
|---|---|---|
| **根目录 `probes/`** | **采纳（用户定调）** | `git mv scripts/probe/* probes/`；根 AGENTS 布局独立一行；目录名用复数，与 company 一致 |
| 探针定义与六层资产表 | **采纳** | 写进指南 §0–§1；用本仓词汇（L0–L4、smoke、真模型档）重写 |
| 按失败面分域（behavior/browser/stream） | **采纳（用户 2026-11-10 追加）** | 域 = 共享 harness；不抄 company 四域名；新域按 harness 增，不按 unit/integration 分 |
| 生成索引 + 字节级新鲜度门 | **采纳** | `probes/INDEX.generated.md` + 纯函数 + `--write/--check` + 门 |
| `状态` / `何时跑` 头注门 | **采纳** | 本仓再加 `档位`，并要求 `判据` / `不证明` 字段在场（只判在场，不判语义） |
| `成本` / `用法` 作为必填门禁；`判据` / `不证明` 的语义判定 | **拒绝** | company 这些字段只有 22–53/68 有、无门禁；本仓只把可判定的字段机械化（在场），语义归评审 |
| 症状 → 探针表 | **采纳** | `project-map` 症状表加行；指南维护完整覆盖表 |
| 生命周期 `常驻/已耗` | **改造** | 只用于**入库**探针；一次性实验留 `_backlog`/`notes`，复现第二次才升格 |
| 探针进 CI | **暂不** | 真模型/GUI 档成本高；先保证「何时跑」可查 |
| `--port 0` | **拒绝** | 本仓 `port-exclusive` 要求每个脚本独占固定端口；迁移后该门要把 `probes/` 纳入扫描 |
| 68 支 / 四域名 / 65 道门 | **拒绝** | playbook §10 自己也说先三支；本仓从五支现状出发 |
| 证据两档（runtime vs snapshots） | **采纳** | 本仓已有 `runtime/smoke-workspace/` 与 `snapshots/`，指南只写规则，不新建目录 |

## 4. 方案

### 4.1 S1（现在做，根迁移 + 凸显）

**目标树**

```
probes/                         ← 根目录，调试第一入口
  README.md                     ← 门户：指南/索引/一句话规则，不复制枚举
  INDEX.generated.md            ← 生成物（按域分组 + 域计数），头注是源
  _index.mjs                    ← --write / --check
  behavior/                     ← 真模型行为
    entry-chain-probe.mjs
    discipline-probe.mjs
    method-library-probe.mjs
    rerun-triage-probe.mjs
  browser/                      ← 真浏览器交互
    cdp-probe.mjs
  stream/                       ← 流取证仪器
    llm-stream-tee.cjs
scripts/lib/probe-index.mjs     ← 纯函数：递归扫描/解析/按域渲染
docs/guides/66-probe-playbook.md ← 单一指南（是什么/何时用/怎么写/证据/边界）
.agents/skills/using-a-probe/SKILL.md ← 回忆层
```

**4.1.1 迁移面（逐项，不能漏）**

| 面 | 落点 | 改法 | 验证 |
|---|---|---|---|
| 物理迁移 | `scripts/probe/` 六件 | `git mv scripts/probe/* probes/`（保留文件历史） | `git status` 显示 rename |
| 脚本内部 | 六件探针 | 用法注释 `scripts/probe/` → `probes/`；`import '../lib/…'` → `'../scripts/lib/…'`；`ROOT` 从 `../..` 改为 `..` | 各脚本 `node --check`；`_index.mjs --check` |
| 根布局 | `AGENTS.md` | 新增 `probes/` 布局行（调试面 + 指南/索引指针）；从 `scripts/` 行删除 `probe/（交互与行为探针）` | 行数 = 140/140；`entry-chain` 绿 |
| 脚本子树 | `scripts/AGENTS.md` | 命名行 `*-probe` 标注「住根 `probes/`，协议见 guides/66」 | 行数不超 57 |
| 脚本索引 | `scripts/README.md` | 删除 `## probe/` 表；顶部加一行指针「探针已迁根 `probes/`」；`lib/llm-stream-tee-core` 行的路径改 `probes/llm-stream-tee.cjs`；加 `lib/probe-index.mjs` 行 | `navigability` 绿 |
| 命令面 | `docs/guides/60` | 五处路径（133/137/162/163/229）；§2 加「查/加探针」任务行 | 命令块 grep 零旧路径 |
| 作者入口 | `docs/guides/62` | 第 74 行路径 | `md-links` 绿 |
| 设计链接 | `docs/design/50` | 第 19 行链接 | `md-links` 绿 |
| 项目地图 | `docs/project-map.md` | 116–117 链接；症状表加三行；词汇对照加「单点机制（探针）」行；落家序第 4 步补一句 | `navigability` 五词仍绿；链接绿 |
| 归档链接 | `_backlog/_archived/research/company-snapshots/…` | 两处链接改新路径（冻结材料只修链接，不改正文） | `md-links` 绿 |
| 技能链接 | `.agents/skills/reproducing-a-failure/SKILL.md` | `scripts/probe/llm-stream-tee.cjs` → `probes/…` | 链接绿 |
| 代码注释 | `scripts/lib/{cdp-driver,probe-status-tab,llm-stream-tee-core,direct-authorization-boundary,inject-reconcile}.mjs`、`scripts/run-ops/acceptance-check.mjs`、`tests/run/llm-stream-tee-core.test.mjs` | 路径改 `probes/`（只改注释，不改逻辑） | `pnpm test` 绿 |
| 真模型闭集 | `tests/contracts/smoke-contract.test.mjs` | 扫描面扩到 `scripts/` 组 + `probes/`；`REAL_MODEL` 改 `probes/…`；路径 helper 兼容两区 | 闭集对账仍绿 |
| lib 消费图 | `tests/contracts/navigability-contract.test.mjs` | `collect()` 加 `probes/`（否则新 CLI 的 import 不在图里，README 消费列会假红） | 该测试绿 |
| 分层守卫 | `tests/contracts/layering.test.mjs` | 正则 `scripts/(smoke|probe|dist|verify)` 扩 `probes/`；注释同步 | 守卫仍能咬住驱动面 import |
| 减法守卫 | `tests/contracts/no-unused-code.test.mjs` | 扫描根加 `probes/`（先确认 CLI 顶层声明不误报） | 该测试绿 |
| 端口独占 | `scripts/verify/gates/f-repo.mjs` | `git ls-files scripts dev` → 加 `probes`；注释同步 | `port-exclusive` 仍扫到端口 |
| 跨环境 | `scripts/verify/gates/f-repo.mjs` | `host-paths` 的 live 前缀加 `probes/`（新 README 也受同一纪律） | `host-paths` 绿 |
| 新门 | `scripts/verify/context.mjs` + `f-repo.mjs` + `docs/evaluation.md` + `scripts/lib/gates-cases.mjs` | `probe-registry`：头注六字段 + 索引字节级一致 + README 链接；登记三处 | `gate-ledger-sync` 绿；`gates-smoke` 红→绿 |

**4.1.2 新件**

1. **指南 `docs/guides/66-probe-playbook.md`**：定义与分层；三个筛选问题；目录/索引；头注协议；
   新增四步（先红 → 隔离/端口 → 证据落盘 → 登记索引）；生命周期；覆盖地图；边界。
   不复制每支细节（细节归头注）。
2. **索引 `probes/INDEX.generated.md`**：列 = 探针 | 一句话 | 档位 | 何时跑 | 状态；不复制
   判据/不证明全文。`scripts/lib/probe-index.mjs` 纯函数 + `probes/_index.mjs` CLI。
3. **头注协议**：必填六字段 `状态` / `一句话` / `何时跑` / `档位` / `判据` / `不证明`；
   `为什么存在` 推荐。模板：

   ```js
   // 探针：<name>
   // 状态：常驻 | 已耗（YYYY-MM-DD 原因/复跑条件）
   // 一句话：<证明的那一个命题>
   // 何时跑：<具体触发条件>
   // 档位：真模型（REAL_MODEL）| 连已起 GUI | 活进程仪器
   // 判据：C1 …；C2 …
   // 不证明：<故意不覆盖什么>
   // 为什么存在：<推荐；事故/担忧/歧义>
   ```

4. **门 `probe-registry`**：头注字段齐全（扫 `probes/*.mjs`/`*.cjs`，排除 `_index.mjs`）；
   索引与目录字节级一致；`probes/README.md` 链接索引。防空语料：零探针即红。失败信息给
   「文件 + 缺字段 + 修正命令」。
5. **技能 `.agents/skills/using-a-probe/SKILL.md`**：description 覆盖「复现/归因一个真实边界
   机制」；内容 = 选择规则 + 先红 + 头注/索引 + 隔离/证据 + 一次性实验升格 + 反模式。
   guides/60 点名（`docs-consistency` 对账）。
6. **路由**：`00-index` 先分流一行；`guides/60` §2 一行；`project-map` 症状三行 + 词汇一行；
   `terms.md` 一行；`evaluation.md` 一句「探针不是第六面」；根 `AGENTS.md` 只靠布局行（不
   再新增第二处指针，避免预算超）。

**4.1.3 顺序**

1. `git mv` + 修脚本内部路径 → 先让旧门禁照常绿（`pnpm verify` + `pnpm test`）；
2. 新件（README/index/lib/CLI/headers）+ 索引生成；
3. 迁移面表格逐项（文档、注释、测试扫描面、端口/跨环境门）；
4. `probe-registry` 门 + 反证（缺头注红、索引未更新红、还原绿）；
5. 指南 + 技能 + 路由；
6. 全量 `pnpm verify` + `pnpm test` + 冷读验收。

### 4.2 S2（域增长后）

域已按共享 harness 分为 `behavior/` / `browser/` / `stream/`。新增探针先归现有域；域内数量增长
**不触发**结构变化。只有出现新 harness（headless/desktop/另一宿主）或某域内共享启动/注入代码
明显重复时，才建新域或抽 `probe-kit`。

### 4.3 S3（文化，随 S1 落地）

- `_backlog/bugs/README` 加一条：只能靠 E2E/真 run 抓到的已修 bug，同 diff 补一支探针，
  或写明为什么不做；
- 每轮卫生/交付自审问一次：最近修的 bug 落在哪个失败面？那张面有探针吗？
- `reproducing-a-failure` 技能加一行指针到 guides/66（不重复内容）。

## 5. 验收标准

1. 根目录 `probes/` 存在，根 `AGENTS.md` 布局有独立一行；新读者只读 `AGENTS.md` + `00-index`
   一跳到达 guides/66，能回答「行为可疑先跑哪支 / 没有现成的怎么加」；冷读问答原文留档。
2. `node probes/_index.mjs --check` 绿；新增/改名/删除探针不重生成 → `pnpm verify` 红；
   `--write` 后绿。
3. 每支入库探针头注六字段齐全；删任一必填字段 → `probe-registry` 红；还原 → 绿。
4. `scripts/README` 不再手枚举探针；`navigability`、`smoke-contract`、`layering`、
   `port-exclusive`、`host-paths` 全绿；`REAL_MODEL` 仍精确覆盖要求凭据的探针。
5. `pnpm verify` + `pnpm test` 全绿；`probe-index` 纯函数有直测；`test-surface` 无孤儿；
   根 `AGENTS.md` 行数 ≤140。
6. 不新增评估面；不改探针端口值；不把一次性实验塞进入库目录；归档材料只修链接不改正文。

## 6. 不做什么 / 重议条件

- 不搬 68 支、四域名、65 道门；不把 company 的域名当本仓答案；
- S1 已按 harness 分域（behavior/browser/stream）；不再按 unit/integration 细分；
- 不给一次性实验建头注/索引（它们住 `_backlog` / `notes`；复现第二次再升格）；
- 不把 `判据` / `不证明` 的语义交给门禁；门禁只查字段在场，语义归评审；
- 不把真模型探针塞进 CI；
- 重议：如果 S1 后冷读仍到不了探针 → 在根 AGENTS 入口链加步骤（按预算处置序升顶）；
  如果门禁误红频繁 → 退到只查 `状态` + `何时跑`；如果 `probes/` 出现新 harness → 按 §4.2 建域。

## 7. 风险与反证

- **迁移面广**：路径出现在文档、注释、测试扫描面与门禁里；漏一处就 `md-links`/`navigability`/
  闭集红。对策 = 先 `git grep` 全量清单，再按表逐项；归档材料只修链接。
- **预算风险**：根 `AGENTS.md` 139/140，加一行刚好到顶；不得再顺手加空行。
- **闭集语义**：`smoke-contract` 改扫描面时最容易把「要求凭据」判据改宽；保持「实际要求凭据
  的脚本集 = REAL_MODEL」双向对账，只改扫描根。
- **分层守卫**：`layering` 的正则若不加 `probes/`，tests 可 import 探针而绕过驱动面禁令；
  这是迁移中最容易留下的洞。
- **索引第二权威**：头注是源，索引是投影；README 只做指针。手改索引会被字节级门咬住。
- **探针剧场**：「写了但没人跑」。缓解 = `何时跑` 必填 + 覆盖表 + 冷读验收，不靠数量。
- **反证顺序**：先让门在「缺头注」「索引未更新」两种真实回归上红，再交付绿；只交付绿 =
  不知道门会不会咬人。

## 8. 证据评审与边界

- **外部事实**：由第二个只读审计复核 playbook 与 company 仓库；纠正三处 playbook 式误读
  ——索引实际在 `checks/INDEX.generated.md`（不是 `probes/`）、头注门只强制 `状态`/`何时跑`、
  `已耗` 生命周期从未行使。详见[外部审计](2026-11-10-external-probe-model.md)。
- **本仓事实**：锚点逐条核过（`AGENTS.md:57`、`scripts/README.md:46`、`guides/60:133/137/162/163/229`、
  `project-map:116-117/186-198`、`smoke-contract:19-28`、`navigability:70-73/185-229`、
  `layering:92`、`f-repo:196/205`、`doc-budgets`）；`grep` 确认探针目录无 `状态`/`何时跑`。
- **迁移面**：本版按「根 `probes/`」重排并已执行；当前 `git grep 'scripts/probe'` 只剩历史
  notes/_backlog 证据正文（冻结，不改写）。执行清单 = 本材料 §4.1.1。
- **未做**：S1 已落地，但没有实跑任何探针本体（真模型/GUI 成本与授权面）；冷读 PASS，
  红证/绿证见 [Note](../../../notes/implemented/2026-11-10-probe-surfacing.md)。
- **身份**：company HEAD `7326271d64` 与登记钉 `bf76d36` 不一致，属未重钉借鉴；实施前补
  外部材料登记或重钉复核。
