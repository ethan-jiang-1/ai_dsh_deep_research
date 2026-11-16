# 根名统一：checks / probes / tools（三仓承诺方向的本仓落地）

> 状态：implemented
> 关联：[D58](../../docs/decisions.md#d58)（分类法本体 = [D57](../../docs/decisions.md#d57)）；
> 合同 = [guides/68](../../docs/guides/68-surface-contract.md)；门户 = [checks/README](../../checks/README.md) ·
> [probes/README](../../probes/README.md) · [tools/README](../../tools/README.md)；
> 前序 = [维护面三分 Note](2026-11-16-maintenance-surface-taxonomy.md)（纯化轮）；
> 方向来源 = 2026-11-16 三仓研究整理单的 D64 方向更新（宿主 `ai_dsh_company` 的
> `_backlog/research/maintenance-surface-taxonomy/`；根名统一由「可选远期」升为承诺方向）。

## 决定

三仓维护面根名固定为 **checks / probes / tools**；本仓按「先纯化、后统一」的硬顺序落地：

| 根 | 面 | 装什么 | 不装什么 |
|---|---|---|---|
| `checks/` | judge | verify/、smoke/、run-gates/（含 run-accept / acceptance-check）、dist/（release-check） | 只读投影（→ probes/）、导出与清理（→ tools/） |
| `probes/` | show | behavior/ browser/ 探针、analyze/ 只读取证投影、stream/ 预载仪器 | 裁决入口（→ checks/）、持久改动（→ tools/） |
| `tools/` | operate | run 通道与构建、release/ 导出与手册源、runtime-clean、hooks/（judge 例外） | 裁决（→ checks/）、只读投影（→ probes/） |
| `tests/` | oracle（非面） | pnpm test runner 的回归与门禁自测 | 不是第四面 |
| 启动配置 | 非面 | tools/env.sh、tools/research.overlay.yml 等 sourced 环境/生成物 | 不是入口 |

- 本轮动作 = 根改名：`scripts/` → `checks/`、`dev/` → `tools/`、`probes/run/` → `probes/analyze/`
  （骨架推荐名；上一轮的中间态 `probes/run/` 退役）。内部子组名本仓自定，动词纯度不许破。
- 每个根的定位（面 + 装什么/不装什么 + 例外）写进 [guides/68](../../docs/guides/68-surface-contract.md)
  与该根 README 首屏——共识随 handoff 携带，不依赖宿主仓对话。
- 例外登记一次：guides/68 §5（hooks/pre-commit = judge、手册源/配置/预载驱动 = 非面、stream tee 口径差）。
- **tools/ 内部子组化**（根名统一后的同批整理）：`channel/`（run 通道与驱动）、`build/`（环境冷启动与
  vendor 构建）、`record/`（录制与生成器）、`release/`（分发与移交）、`clean/`（运行区清理）、
  `hooks/`（judge 例外）；`env.sh` 留根 = sourced 配置入口（非面）。逐件索引单一 home =
  [tools/README](../../tools/README.md)（子组/件 全路径点名）；每个子组另有 README 首屏写
  装什么/不装什么/例外，只指针不复制索引。
- 索引覆盖门禁随之加宽：navigability 的 tools 覆盖改**递归**枚举（顶层 readdir 会静默漏组内件），
  repo-conventions 的 tools shell 扫面改递归（.sh 进子组后顶层扫不到）。

**同批同步的机械面**：

- 引用：live 文档/AGENTS/README/包文档/CI/门禁/测试/命令字符串全量改指新根；冻结层
  （`notes/`、`_backlog/`）正文不改写，旧路径靠 [redirect 账本](../../checks/test-path-redirects.json)
  解析（520 条：既有条目 `to` 重写 + 每个搬移文件一条 `from`→`to`）。
- 目录注入面：`checks/AGENTS.md` 随根改名；[doc-budgets](../../checks/doc-budgets.json) 登记键同步。
- hooksPath：`tools/env.sh` 与 `git config core.hooksPath` 同改 `tools/hooks`（老 clone 重 source 即恢复）。
- 门禁字面量与正则：b-pack / md-links / doc-budgets / doc-paths ROOTS / navigability / smoke-contract /
  smoke-child-paths / dev-parity / dev-runtime-clean / repo-conventions / hooks-active / ci-workflow /
  fix-evidence / layering / asset-ledger 的根前缀、join 段、转义正则同步。
- 生成物重生成：probes INDEX、tests INDEX、tools/research.overlay.yml、资产账、CI oracle、`_dist/`。

## 判据形状

- **权威输入**：根目录名 = 三仓 skeleton（checks/probes/tools）；每根动词纯度由组表与例外表声明。
- **写入者**：改根结构的人在 guides/68 §4/§5 与三处 README 首屏同 diff 更新定位。
- **非法 / 互斥**：一根装两个动词非法（例外须登记）；先改名后拆组非法（给 mixed 目录假保证）。
- **反证**：本轮真红 = 只搬不改引用时 doc-paths / align-ledger / dist-freshness / smoke-imports /
  navigability / ci-oracle / decisions-now 逐个点名（见验证节）。
- **旧形态退场**：`scripts/`、`dev/`、`probes/run/` 三个根名退役，只作为 redirect 账本的 `from`。

## 输掉的方案

| 方案 | 为什么输 |
|---|---|
| 先改名后拆组 | 给 mixed 目录假保证：`checks/` 里仍混着 show/operate，名字撒谎 |
| 新建 `tools/` 而保留 `dev/` | 四个门牌、两个 operate 家；dev/ 本就是 operate 面，改名即归位 |
| 保留旧根名、只靠声明 | 上一轮已证：人按根名找件，根名不一致 → 理解差异 → 驱动出错（D64 用户裁决） |
| 全仓盲 sed `scripts/`→`checks/`、`dev/`→`tools/` | 实测咬伤四类非根路径：vendor 相对源（ledger `source`、vendor-shorthand 反引号）、包内 `scripts/**` 与 `scripts/lib/`、系统 `/dev/null`、npm `"scripts"` 键与 `--ignore-scripts`；必须逐类保护 |
| show 域沿用 `run/` | 骨架推荐 `analyze/`（只读分析器）；三仓同骨架时域名也应同，避免跨仓再翻译 |
| tools/ 保持平铺、只改根名 | 一面目录里 20 件平铺混着通道/构建/录制/清理，与 checks/probes 的子组化不对称；fresh agent 按组找件失败 |
| 把 lib owner `tools/` 改名避撞根名 | 内部子组本仓自由；撞名只发生在生成索引的裸 owner token 被 doc-paths 误读为根路径——给索引发射加 `checks/lib/` 前缀即解，不动 owner 镜像 |

## 实际跑过的验证

- **真红→绿**（只搬不改引用的预期红，逐条修）：
  - `doc-paths`：vendor-shorthand 反引号被误改（`checks/run-gates.ts` 等）→ 回指 `scripts/`（vendor 相对）→ 绿。
  - `align-ledger`：ledger `source`（vendor 相对）被误改 → 恢复 HEAD 后只改 `landing`（本仓落点）→ 绿。
  - `dist-freshness` / export-dist inventory：包 `files: "scripts/**"` 与 `package/scripts/lib/profile-read.mjs`
    被误改 → 回指包内 scripts → 重导出全绿。
  - 系统路径 `/dev/null` 被误改 `/tools/null`（27 处 / 8 文件，含 boot-run 重定向与 CI oracle 的
    redirection 案例）→ 回指 `/dev/` → oracle 重录 35 fixtures 0 mismatches。
  - `smoke-imports` / `navigability` / `path-hygiene.spec` 的 join 段与静态 import → 同步 → 绿。
  - `decisions-now`：D57 决定列 104 字超 100 → 压缩；新增 D58 路由到本 Note → 绿。
- 收尾：`pnpm verify` 全绿；`pnpm test` 1365 spec 断言 + 214 checks 全绿；
  `node tools/release/export-dist.mjs` 全绿；`node probes/_index.mjs --check` 一致（19 支）。
- 搬移 CLI 抽跑：`tools/runtime-clean.mjs`（dry-run）= 0、`tools/release/market.mjs --check` = 0、
  `probes/analyze/run-inventory.mjs --workspace research-workspace` = 0、`checks/run-gates/run-accept.mjs`
  无参 = 2（用法语义不变）。
- **子组化轮真红→绿**：navigability 加宽后首跑点名 `build/bootstrap.sh` 未入索引（红）→ README 子组化 → 绿；
  lib 消费列对账咬出搬移件**相对 import 浅一层**（`../checks/…` 需 `../../checks/…`、ROOT `..` 需 `../..`）→ 修 15 件 → 绿；
  转义正则替换曾插入裸 `/` 致 regex flags 语法错（profile-health / run-driver-contract spec）→ `node --check` 定位 → 全斜杠转义 → 绿。
- 子组化后复跑：`pnpm verify` 全绿、`pnpm test` 1365 + 214 全绿、`gates.e2e` 133 注入红 + 对照绿；
  搬移 CLI 抽跑 exit 语义不变（runtime-clean dry-run 0、render-test-index --check 0、run-driver url 2、
  hitl-answer 2、bootstrap --check 0）；173 件相对 import 0 断链；redirect 账本 537 条。
- 提交经仓内真 `tools/hooks/pre-commit`（verify + tests）跑绿，未用 `--no-verify`。

### 证据账本

| 证据 | 层 | 覆盖的失败类 | 负控（见过红） | 收尾 |
|---|---|---|---|---|
| `pnpm verify`（57 门禁） | L0 结构 | 路径/链接/预算/注入面/hooksPath/生成物新鲜度 | 是：迁移中途 doc-paths / align-ledger / dist-freshness / md-links 真红 | 本地 + pre-commit |
| `pnpm test`（1365 spec 断言 + 214 checks） | 回归 | join 段/静态 import/正则字面量/索引对账/台账路由 | 是：smoke-imports / navigability / path-hygiene.spec / ci-oracle / decisions-now 真红 | 本地 + pre-commit |
| `checks/smoke/gates.e2e.mjs` | 真入口装配 | 门禁逻辑在改名后仍咬人 | 是：133 注入案例逐一点名红 + 零注入对照全 PASS | 本地 |
| `checks/smoke/run-accept.e2e.mjs` / `handoff.e2e.mjs` / `doctor.e2e.mjs` | 真 CLI | 搬移后 judge/operate 入口全链 | 否（既有用例，非新断言） | 本地 |
| `checks/smoke/pack.e2e.mjs` + `tools/release/export-dist.mjs` | L2 形状 | 包 `files`/inventory/手册/市场/可复现 sha | 是：inventory 缺 `package/scripts/lib/profile-read.mjs` 真红 | 本地 |
| `tools/record-ci-oracle.mjs` | 外部 oracle | CI 执行面解析 vs 真 bash | 是：redirection 案例 `/dev/null` 误改真红 → 重录 0 mismatches | 本地 |
| 相对 import 全解析（173 件）+ `bash -n` + `source tools/env.sh` | 静态/环境 | 搬移后断链 / shell 语法 / hooks 激活 | 否（普查，非断言） | 本地 |

**显式未覆盖 / 未跑**（与已跑绿分列）：L1 真挂载（`preset.e2e` 真档）、浏览器装配（`client-load.entry`）、
模型可见回放（`snapshot-replay.entry`）、真模型档——本轮 pack 模型可见面零改动（仅注释/文档根名引用），
安装镜像未重建（run 通道未起；boot-run 漂移门会在下次开跑时点名）。值级：无值级改动。

### 真入口证据（DSH 插件环境，非静态 grep）

搬移后按「跑过才算过」重跑**真入口链**（`runtime/smoke-workspace/battery-results.txt` / `battery2.txt`）：

| 面 | 命令 | 结果 |
|---|---|---|
| L1 真挂载 | `DSH_SMOKE_REAL=1 checks/smoke/preset.e2e.mjs` | **exit 0** |
| L2 冷启动（真 boot + 浏览器） | `checks/smoke/cold-start.entry.mjs` | 浏览器面 **GREEN**、全部断言 ok；exit 1 仅因收尾端口收割（见下） |
| 观察面装配 | `checks/smoke/client-load.entry.mjs --seed …` | **exit 0** |
| 首启 / 安装 / 生命周期 | `product-boot` / `install-shape` / `lifecycle` | **exit 0 / 0 / 0** |
| 回放与模型可见组装 | `snapshot-replay.entry --read-only --layers a,b` | 重建镜像后 **ALL PASS（5 场景 A+B+渲染金标准）** |
| 真模型全角色 + web_search | `checks/smoke/l4-lite.e2e.mjs` | **ALL PASS**（5 角色 assistant 响应 + scout `web_search` 真调用） |
| 真浏览器 HITL | `checks/smoke/client-hitl.entry.mjs` | **exit 0** |
| Agent Teams 组队 | `checks/smoke/team-preflight.e2e.mjs` | **exit 0** |
| 验收/移交/诊断/包形状 | `run-accept.e2e` / `handoff.e2e` / `doctor.e2e` / `pack.e2e` | **全 ALL PASS** |
| 双实例隔离 | `workspace-isolation.entry.mjs` | 绑定/隔离断言通过；exit 1 仅因收尾端口收割（见下） |
| vendor 契约车道 | `pnpm test:vendor` | **4 pass / 0 fail** |

**两处 exit≠0 的归因（已排除路径因素）**：`cold-start` 与 `workspace-isolation` 的失败行都是
`端口 N 的 listener pid … 身份不可读——拒绝收割`。根因 = 本会话沙箱禁止进程检查（实测
`bash: /bin/ps: Operation not permitted`），而 `port-reclaim.mjs` 的 `commandOf` 正是 `ps`，
拿不到身份就 fail-closed 拒绝收割。**排除法证据**：① 自起 listener 复现同句（`reclaimPort(3199)`
→ 身份不可读）；② `port-reclaim-policy.mjs` 与迁移前 **BYTE-IDENTICAL**，`port-reclaim.mjs`
仅注释路径变化（逻辑零改）；③ 两例的浏览器断言全绿、失败点在收尾清理。

**模型可见面**：迁移只改了一行模型可见文本（`research-brief/SKILL.md` 里指路 `checks/lib/…`），
`snapshot-replay` A/B/C 全绿 + `model-experience.e2e` 绿（Lead 11589 / Scout 8657 tokens）证明
组装面与录制金标准未漂移。

### 退役根名守卫（本轮新增的类级防线）

根名统一暴露一个**静默逃检**：`doc-paths` 的 `ROOTS` 只认现行根，退役根（`scripts/` `dev/`
`probes/run/`）的残留引用因不匹配而**不被检查**——实测 `runtime/README.md` 的 `dev/env.sh`、
`scripts/lib/ops/scene-pack.mjs`、`dev/runtime-clean.mjs`、`probes/run/…` 就这么绿着漏过。处置：

- `doc-paths` 收集面纳入退役根，逐条判红并给新根提示；放行三类：裸目录名（讨论退役本身）、
  vendor 源 shorthand（`scripts/AGENTS.md`）、包内 shorthand（`scripts/doctor.mjs`）。
- 顺带补上 **`probes/` 从未进 ROOTS** 的历史缺口（探针路径此前不受 doc-paths 约束）。
- `snapshots/replay/` 明示排除（录制证据不改写，与 count-free 同源理由）。
- 反证：注入 `dev/env.sh` / `scripts/lib/…` → 点名红；注入 `scripts/AGENTS.md` / `scripts/doctor.mjs` /
  裸 `scripts/` → 放行；注入 `probes/analyze/not-real.mjs` → 红。常驻案例
  `doc-paths-retired-root`（gates.e2e 134 案例全红命中）。

## 环境状态

- 未改任何 exit code 判定分支；未改 pack 模型可见文本（仅 pack 内注释/文档的根名引用）。
- 老 clone 的 `core.hooksPath` 仍指 `dev/hooks`（已不存在）→ 重 source `tools/env.sh` 即幂等恢复；
  hooks-active 门禁会在第一次手跑 verify 时点名未激活态。
- 冻结层正文零改写；旧根名链接全部经 redirect 账本解析。
