# 决策台账纯路由化：一处事实一个家（D56）

> 状态：implemented
> 关联：[D56](../../docs/decisions.md#d56)；[docs/AGENTS.md](../../docs/AGENTS.md)；
> [决策台账](../../docs/decisions.md)；[judgment-design](../../_backlog/methods/judgment-design.md)；
> 跨仓建议来源 = `ai_dsh_company` 的 2026-11-14 deep-research decisions proposal（作者本地材料，吸收结果见本 Note）。

## 决定

三层各有一个家，每个事实只住一处：

| 层 | 回答 | 家 |
|---|---|---|
| 现行合同 | 现在怎么做 | `docs/design`、`docs/guides`、`docs/evaluation.md`、包 README / 手册、安装手册 |
| 路由台账 | 哪条决定、去哪读 | `docs/decisions.md`：每行 ≤100 可见字结论 + ≤120 可见字路由列，`<a id="dN">` 锚点保留，D 号不改号 |
| 理由与负知识 | 为什么、输掉了什么 | 各领域 `notes/implemented/`、`notes/rejected/`、冻结的 `notes/archived/` |

- 台账每个 `## 已定` 行必须至少链接一个**已跟踪、非冻结**的活载体（合同文件或活跃 Note）；冻结 Note / 归档卡只能作附加出处。`## 已退役` 行必须有取代者 `#dN` 锚点 + 真实文件链接。
- 删除 `0.3.4` 安装横幅（安装事实归 [安装手册](../../_dist/安装手册.md)，D42 只路由），台账不再承担版本同步。
- 新增 D56 为本规则的宪法锚点。D1–D55 逐行压缩为路由，**不**新建杂物筐 Note：每条理由回自己领域的 Note；D27 的 A0–A3 / P0–P3 否决方案本来就在冻结 Note 第 26 行，台账补链并登记历史指针。
- 压缩前补进合同的事实：D3 的「opt-in POLICY 与部署层预授权」偏离、D22 的零外部依赖交付门槛 → [design/10 §6](../../docs/design/10-architecture.md)。D33 / D36 的从严与见证边界已在 [数据面收口 Note](2026-10-28-data-plane-hardening.md)，D53 / D54 的制度词已在 [guides/67](../../docs/guides/67-test-strategy.md)。
- 旧口径「用户定调只进 decisions.md D 号依据列」撤销：[AGENTS.md](../../AGENTS.md)、[notes/README](../README.md)、[00-index](../../docs/00-index.md) 同 diff 改为「台账只路由，理由归 Note」。
- 触发器 `decisions 台账去历史化` 与 `决策台账 20KB 收敛` 的条件已满足，同 diff 删除。

## 判据形状

- 权威：`docs/decisions.md` 的 GFM 表（结构化）+ 盘上文件 + git 跟踪集（`git ls-files`）。
- 读取方：`tests/checks/decisions-now.test.mjs` 的纯函数 `validateDecisionsLedger(text, { exists, isTracked })`；谓词注入，因此变异输入不依赖真盘。
- 坏输入：决定列 >100 字；路由列 >120 字或为空；纯散文 / 仅 `#dN` 路由；仅链冻结层、未跟踪或不存在的文件；缺号 / 重号 / 末号不足；未转义 `|` 造成列数 ≠3；表内空行；已定节出现引用块横幅；退役行缺取代者锚点；超字节硬顶。
- 旧形态：以 `split(' | ')` 切列、`n <= 54` 硬编码；已转为转义感知三列解析与动态 `1..max`，不留兼容分支。
- 反证：同文件 6 组变异（a–f）逐个红；真台账在旧文本上红（见下）。

## 输掉的方案

| 方案 | 为什么输 |
|---|---|
| 把无活家的理由统一塞进本 Note | 杂物筐：机制名检索会落到迁移 Note，而不是该机制的领域家；改走「回各自领域」 |
| 只限决定列字数 | 依据列会变成第二个散文倾倒口（旧台账依据列有 220–260 字行） |
| 任意相对链接即算有家 | 只链冻结 Note 的行等于没有现行合同；要求活载体 |
| 字节硬顶压到 12KB | 路由链接的相对路径本身占体积（50 余行×平均 3 条路径）；12KB 要靠删 Note 链接才能达成，反而削弱路由。取 16KB，并由单格字数上限控制增长 |
| 不立 D 号，只改测试 | 规则无法一跳引用；与 D13 / D53–D55 同级立 D56 |

## 实际跑过的验证

- 红：判据与变异矩阵先于台账压缩落地。旧台账（32,734 B）上 `node --test tests/checks/decisions-now.test.mjs` = 1 个真仓用例红（超硬顶、含引用块横幅、末号 55 <56、D2 决定列 329 字、D3 283 字、D4 126 字……），6 组合成变异用例绿（说明判据咬得住）。
- 绿：台账重写后 约 14.5 KB（32,734 B → 见 `wc -c docs/decisions.md`，压缩约 55%），全部 56 行通过；路由列 / 决定列上限与活载体要求逐行满足。
- `pnpm verify` 全绿；`pnpm test` 退出 0（含 asset-ledger 重录后对账、layering 禁子进程——台账「已跟踪」以入库边界近似，不调 git）。
- `entry-chain-probe`（AGENTS.md 被触及时的真模型探针）**未运行**：zsh 下 `dev/env.sh` 解析出的 DSH_HOME 不是开发 home，探针 exit 2；降级为语义自审，不记为 verified。

## 环境状态

- 未改 `packages/deep-research-pack/` 任何运行态文件（手册、preset、模型可见文本零变化，回放夹具不受影响）。
- 未改任何 `notes/archived/*` 与 `_backlog/_archived/*` 正文；仅新增已结卡与 `archived-note-pointers.json` 的 D27 指针。
