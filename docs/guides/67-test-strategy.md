# 67 · 测试策略：三环、四账、五关

> 层：指南（怎么选证据）。**不是第六个评估面**——五面验收合同仍以
> [evaluation.md](../evaluation.md) 为准；本页回答「这次改动该配什么证据、算不算够」。
> 失败类全量账本 = [research/dsh-test-strategy 的普查](../../_backlog/_archived/research/dsh-test-strategy/2026-11-13-failure-class-census.md)；
> 类级守卫形态 = [_backlog/methods/class-level-guards.md](../../_backlog/methods/class-level-guards.md)；
> 命名车道 = [D53](../decisions.md#d53)。

## 0. 一句话

证据要匹配**失败类**，不是匹配「测试金字塔」或「改了几个文件」。先归类，再选最便宜但确实能看见
该失败类的层；先证明它会红，再交付绿；拿不准就写「显式未覆盖」，不拿绿冒充充分。

## 1. 三环

| 环 | 回答 | 资产 | 节奏 | 出口 |
|---|---|---|---|---|
| **回归环** | 旧行为被改坏了吗 | `pnpm test` = `test:spec` + `test:checks`；`test:vendor` | 每次改动 / commit | 0/1；秒级 |
| **装配环** | 组装后的产品还对吗 | L1 `preset.e2e`、L2 `*.entry`、`client-load.entry`、`snapshot-replay.entry`、真模型档 | 改动面触发 + CI + 里程碑 | 0/1/2；分钟级 |
| **发现环** | 哪些输入会静默做错事 | 探索 charter、变异矩阵、probes、后验取证 | 里程碑/大特性/复发后 | bug 卡 / 观察 / 歧义 / 空假设 |

三环不是「快中慢」，是问题类型：回归防已知，装配防组装，发现找未知。把发现环的 bug 只塞进回归，
得到的是实例修复，不是类级守卫。

## 2. 失败类 → 最低可见层

> 类定义与全量案例见失败类账本；下表只给「先在哪层证」。**默认往下走，不默认往上走。**

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

**成本原则**：同一失败类能在纯函数层证，就不上进程/浏览器/模型；上贵层必须能说出「unit 为什么
看不见」。**不是所有测试都要矩阵**：纯算术、封闭枚举 + 唯一写方、否决式不变量、受控常量路径、
单次调用契约，举例/不变量就够（详见 class-level-guards §F）。

## 3. 五关

| 关 | 问题 | 判据 | 不满足时 |
|---|---|---|---|
| **准入** | 这条新资产值得存在吗 | 唯一证明面 + 最低可见层 + 负控 + owner + 成本 | 不进；或先写进探索账 |
| **变更类** | 这类变更该带什么证据 | 模型可见→snapshot B；新纯件→直测；新实体→消费者矩阵；新判据→变异矩阵 | 证据账本写「显式未覆盖」并立卡 |
| **必需** | 这条证据在 required 路径吗 | 产品面证据必须在 CI/收尾；skip 可见 | 降为诊断或补 job |
| **退役** | 这条资产还有消费者吗 | `uniqueClaim` 仍成立、oracle 仍在、成本可承受 | `sunset` 或删除；不静默留着 |
| **复盘** | 为什么流程放它过去 | P0/P1 或同类复发 → 五节复盘 + 新守卫 | 复盘未完成，bug 卡不归档 |

## 4. 四账

| 账 | 记什么 | 载体 | 何时更新 |
|---|---|---|---|
| **资产账** | cost / uniqueClaim / oracle / sunset / lane | [scripts/smoke/registry.json](../../scripts/smoke/registry.json) + `smoke-oracle-surface` | 新增/退役/改判据 |
| **失败类账** | 类 → 代表 BUG → 守卫 → 缺口 → owner | [失败类普查](../../_backlog/_archived/research/dsh-test-strategy/2026-11-13-failure-class-census.md) + 本文表 | 每次 P0/P1/复发 |
| **证据账** | 证据/层/失败类/负控/CI/显式未覆盖 | [reviewing-a-delivery](../../.agents/skills/reviewing-a-delivery/SKILL.md) 的证据账本节 | 每次非平凡交付 |
| **探索账** | charter/面/oracle/结果/毕业/日期 | [research 题目录](../../_backlog/research/README.md) + [探索技能](../../.agents/skills/exploratory-verification/SKILL.md) | 每轮探索 |

## 5. 决策程序

1. **归类**：这次改动/事故属于哪个失败类？归不进 = 先补归因。
2. **选层**：按 §2 选最低可见层；写清「为什么这一层能看见」。
3. **证会红**：同 diff 注入目标回归，看红，再还原；新门禁/契约必须带反证。
4. **验世界**：断言外部状态（文件/事件/盘侧真值/UI 真值），不信自测；快照/回放比对声明的面。
5. **判够 + 记账**：七问（会红/真入口/验世界/模型可见钉住/最低层/skip 可见/可重复）+ 证据账本 +
   显式未覆盖；P0/P1/复发进复盘。

## 6. 命名与命令（D53）

| 后缀 / 位置 | 车道 | 命令 |
|---|---|---|
| `tests/{run,cockpit,pack,contracts}/**/*.spec.mjs` | 进程内核验 | `pnpm test:spec` |
| `tests/checks/*.test.mjs` | 门禁自身 | `pnpm test:checks` |
| `scripts/smoke/*.e2e.mjs` | 真进程 | `pnpm test:e2e` |
| `scripts/smoke/*.entry.mjs` | 真浏览器/profile/tarball | `pnpm test:entry` |
| `tests/vendor/*.vendor.spec.mjs` | vendor 源契约 | `pnpm test:vendor` |
| `*.support.mjs` | 支援件 | 不进车道 |

`pnpm test` = spec + checks；慢车道显式跑。错后缀/错 lane 由 `test-lanes` + `smoke-registry` 判红。

## 8. 成本预算（重资产治理）

- **默认回归必须秒级**：`pnpm test` = spec + checks；重资产不在 pre-commit。
- **三条装配车道按变更类型触发**：模型可见文本 → snapshot B；客户端 → client-load；安装/发布 →
  lifecycle/release；不要「改一行就跑全链」。
- **CI required 只保留慢资产的最小集**：当前慢 CI job = `client-load` / `snapshot-replay` / `deploy`
  （keyless）；`test:e2e`/`test:entry` 全量是诊断车道，不是每次提交的门。
- **新增入口先过成本关**：必须说明替代谁/新失败类/为什么现有层看不见；registry 写 `cost` 与
  `sunset`；不能替代的才新增。没有 `uniqueClaim` 的资产优先退役。
- **局部重跑**：`pnpm test:e2e --only <substr>` / `pnpm test:entry --only <substr>`；
  `--list` 显示 tier/cost。全量只在阶段收口/夜间/大改后跑。
- **同构案例有界并行**：`gates.e2e` 108 个独立注入案例默认 4 并发（`--jobs=<n>`），串行 248s → 并行 86s；
  不删案例、不改判据，只压墙钟。
- **数量 ratchet**：CI 入口 ≤9、CI slow ≤3、slow 总数 ≤15（`smoke-cost-budget`）；新增 slow/CI 资产先退役/合并一个，
  或按 D54 改预算并同 diff 说明。
- **实测基线（2026-11-13 本机）**：`test:e2e` 6 入口（gates 并行 86s）；`test:entry` 3 入口 **374.7s**
  （client-load seed + lifecycle + snapshot 5 角色 A/B/C）。两者都是诊断车道，不进 pre-commit。
- **成本看的是每次发现**，不是测试数量或覆盖率；慢而重复的资产比少一个测试更贵。

## 7. 反模式

- 为 159 张 BUG 逐张补测试（实例修）→ 先归类，落类级守卫或显式不可机械化。
- 用 E2E/真模型测纯逻辑；为凑绿加 retry/sleep/改 normalizer/放宽断言。
- 用「文件在场」「点击计数」「有限词表」「自报成功」当内容证明。
- 新资产没有 uniqueClaim/oracle/sunset；慢资产只增不减。
- 探索只在英雄卡里，不毕业成技能/账本；复盘只写 story，不落新守卫。
