---
status: 已结
opened: 2026-10-27
---

# 推敲：发布前的数据契约——FAQ 26 的框架对本包意味着什么

> 立卡：2026-10-27 ｜ 状态：已结（2026-10-27） ｜ 类型：Task ｜ 结论倾向：现在做——D1–D4 全采纳推荐，P1/P2 已落地 ｜ 可关闭：是

**关闭结论（2026-10-27）：** D1 = 补 rc.3 客户端挂载证据（`compat-client-smoke`，ALL PASS）；D2 = N2 披露 + 触发器 + 可行动失败，不做降级单人模式；D3 = `state.schemaVersion` + `scaffold --clean`（sidecar 需 `--discard-sidecars`）+ `.gitignore` owner 统一；D4 = 移除字面量 `apiKey`。P1/P2 全部落地或按可观察条件延后；证据 = `pnpm verify` 全绿、`pnpm test` 891、scaffold/release/data/compat/compat-client smoke 全 PASS、现网 bundle `--repair` 后两次 `run-accept` 绿；包版本 `0.1.2 → 0.1.3`。去向：implemented — [发布前数据契约 Note](../../../notes/implemented/2026-10-27-release-data-contract.md)。

**问题与期望结果：** 用户要求按 DSH 数据面 FAQ（26）判断本包是否需要参考，并给出 Gap 与计划。
期望结果：发布后用户升级/卸载/换机器/移交 run bundle 时，数据不丢、不错、不泄漏；维护者能用一张卡
回答「数据在哪、谁删、卸载留什么、版本怎么迁移」，而不是靠散在五处的段落拼。

**当前情况（判断，不是计划）：** 本包的**数据架构不需要参考 FAQ 重做**——它已经独立落在了 FAQ 推荐的
形态上（详见[证据](../research/data-contract/2026-10-27-dsh-data-plane-digest.md)）：

- 没有 storage domain、没有 home 账本、没有新增 session event、没有 projection 注册；`src/**` 对
  `$DSH_HOME` 零写入。
- run bundle 是用户可见的工作区文件（P2），会话日志是执行事实；驾驶舱是只读投影（P1），用
  `workspaceFiles` + `session.follow`，绑定从 journal 的 `drt_<slug>/` 折出（`bundle-bind.ts`），
  不用 `workspaceId`、不建索引。
- 秘密只存引用（`apiKeyEnv` → `credentials.resolve`，调用点解析）；交付用 `present` 引用而非复制；
  种子是版本化模板 + 工作区内状态账本 + sidecar 合并，正是 FAQ 13「项目内标记」的合法形态。

因此真正的 Gap 不在「数据放哪」，而在**三层版本缝**与**安装侧生命周期**：

1. 包（semver）、工作区种子（`state.version`）、run bundle（`run.md → contract`）各自演进，没有兼容
   矩阵；新 preset + 旧手册可以静默共存。
2. 安装侧没有卸载契约（团队层留下、种子垃圾无清理路径），交付回执还能写进本机绝对路径。
3. 承重依赖是 N2 experimental（agent-team 系），却没有按依赖层级披露；声称支持的 rc.3 只有安装形状
   证据，没有客户端面的挂载证据（数据面机制本身已 diff 确认与 rc.2 一致）。

**未决问题（需要用户拍板，见 §方案与取舍）：**
- **D1（版本支持）**：把 `engines.dsh` 收窄到 rc.2，还是补 rc.3 的 `client-load-smoke`（真浏览器挂载）
  后再保留 rc.3？
- **D2（N2 依赖）**：团队层继续做硬前置（披露 + 触发器 + 可行动失败），还是做「无团队层降级单人模式」？
- **D3（种子生命周期）**：只补文档与本卡验收，还是同批做 `state.schemaVersion` + `scaffold --clean`？
- **D4（字面量 `apiKey`）**：pre-1.0 直接移除，还是保留并标注「仅调试」？

**下一步：** 用户对 D1–D4 给出取舍；本卡随之翻「等人拍板 → 推敲中」并按 §计划 排期。G1 缺陷已另卡并修复
（[BUG-044](../fixed_bugs/BUG-044-delivery-receipts-leak-absolute-paths.md)），不与本卡的合同决策混批。

## 已知与未决

**已知（代码/盘上证据）：**

- 包目录不是数据目录：`data-smoke` 断言安装/启动后包树 hash 不变；`files` 白名单只发运行所需。
- 卸载后工作区文件与会话日志保留（`data-smoke`）；profile 无本包痕迹。
- 本包 `src/**` 无 `localStorage`/`sessionStorage`/`indexedDB`；侧栏布局是 vendor
  `ui-sidebar-right` 写的 `dsh.sidebar-right.v1.<sessionId>`，本包不拥有、不清理。
- 旧 bundle 按 D28 epoch 豁免（`contractEpochOf` → null），不追改；新回执有哈希校验
  （`receiptProblems`，node-gate 门A 消费）。
- `session-query-sqlite` 显式 `path: ':memory:'`，不产生持久索引文件。
- **rc.2 → rc.3 已 diff**：数据面相关路径（storage/session/workspace/credentials/settings/attachment/
  spill/deliverables/fs/session-query/CLI）机制逐字一致，只有 2 个 CLI e2e 测试与 `slots.md` 变了；
  真正的 rc.3 增量在客户端包（`ui-entry-customization` 新增，`ui-conversation` view-pins、
  `ui-agent-preset` seat-store）。所以版本风险在「挂不挂得上」，不在「读得对不对」。

**未决（事实缺口）：**

- rc.3 上驾驶舱的真实挂载/渲染没有证据（只有 install/dump/scaffold/remove）。
- 上游把 `agent-team` 移出 `packages/experimental/` 的时间表未知；本包没有替代通道。
- 团队层被其他插件共用的情况未知——所以不能默认「卸载时删团队层」。

## Gap 表

| # | Gap | 证据 | 级别 | 处置 |
|---|---|---|---|---|
| G1 | 交付回执可写本机绝对路径，`path-hygiene` 在写回执之前跑 | `scripts/run-ops/run-accept.mjs:75` vs `:125`/`:142`；`scripts/lib/run-receipt.mjs:167`；现网新契约 bundle 实测 3 处（delivered/acceptance/node-gate） | P1 | 已修：[BUG-044](../fixed_bugs/BUG-044-delivery-receipts-leak-absolute-paths.md)（真 bundle 复验绿） |
| G2 | 声称 rc.2/rc.3；数据面机制已 diff 一致，但 rc.3 客户端面无挂载证据 | `engines.dsh` / `dsh.compatibility.dshReleases`；`compat-smoke` 只覆盖安装形状；rc.3 有 `ui-conversation` view-pins 等客户端增量 | P1 | D1：收窄或补 `client-load-smoke` |
| G3 | 没有一张用户可读的数据卡 + 清理路径 | README §Data / guides/65 §2 / design/50 / NODES / 种子 `.gitignore` 五处分居 | P1 | 文档同批：README 数据卡 + 清理清单 |
| G4 | 承重依赖 N2 experimental 未按层级披露 | `scaffold.mjs:467`；`cordis.patch.yml` 的 `ui-agent-team`；`vendor/dsh/packages/experimental/` | P1 | D2：披露 + 触发器；降级模式另议 |
| G5 | 卸载不删团队层 | `dsh plugin remove` 只移除本包；无 `postuninstall` | P2 | 文档写明 + 可选显式清理命令 |
| G6 | 种子状态无 schema 版本；`--force` 覆盖用户 `.gitignore`；sidecar/孤儿/锁无 GC | `scaffold.mjs:221`/`:329`/`:340-355`；`preflight.mjs:246-247` 与 `--force` 语义冲突 | P2 | D3：schema + `--clean`（dry-run 默认） |
| G7 | 包/种子/bundle 三条版本轴无兼容矩阵 | `seed.json` version、`run.md` contract、`package.json` semver；preflight 对种子版本只记 WARN | P1/P2 | 文档矩阵 + 升级时必须 `scaffold --check` 的硬提示；不改 run 语义 |
| G8 | 同 workspace 双实例无锁，只有文档声明 | `docs/guides/65-run-forms.md` §4；`triggers.md` 已登记 | P2 | 保持声明，写进用户可见数据卡；不装假锁 |
| G9 | `apiKey` 字面量配置口子 | `src/fetch-fallback/index.ts` 的 `Config.apiKey`（`.role('secret')` 仍落 profile patch） | P2 | D4：移除或标注 |
| G10 | 文档漂移：8 件模板写成 7 件；seed manifest 12 条 vs 落地 13 文件 | `README.md:25`；`workspace/seed.json` vs 盘上 | P2 | 同批校正 |
| G11 | run bundle 没有秘密扫描：evidence/audit 可能含 URL 里的 key/token，`path-hygiene` 只查 home 路径 | `scripts/run-gates/path-hygiene.mjs` 只有 `findHomePaths`；`run-accept` 无 secret 面 | P1 | 新增 `secret-scan`（高置信模式，先红后接） |
| G12 | 没有备份/恢复/跨机器带走 run bundle 与方法库的操作说明 | README 只有「run bundle 单独移交」一句；无恢复步骤 | P1 | README Data 增 Backup/Restore 小节 |
| G13 | `--clean` 的破坏性边界未收口：`--clean --write --dry-run` 会真删；工作区记录比 pack 新时仍会删「孤儿」；sidecar 默认随 `--write` 丢弃 | 实测两条：dry-run 删除 old.md；state v9.0.0 删 newer.md；`scaffold.mjs` clean 分支无 versionAhead 守卫 | P1 | 立即修：dry-run 拒绝组合、versionAhead 拒绝 clean、sidecar 需 `--discard-sidecars` |
| G14 | `portableBundlePath` 用 `resolve` 不用 `realpath`：工作区经 symlink 访问时 present 的 realpath 可能判成 bundle 外（假红） | `scripts/lib/path-hygiene.mjs` | P2 | 双方 realpath 归一 + symlink fixture |
| G15 | 一个工作区被不同 pack 版本的 profile 共用时，种子状态只有一条版本线；旧版 profile 的 `--check` 会报「较新」，但没有运行期硬提示 | `.dsh-research-seed.json` 单例；`versionAhead` 只挡 `--upgrade` | P2 | README Compatibility/Data 写明「一工作区一条 pack 版本线」；preflight 提示 |
| G16 | `method-library.md` 用户与 Lead 可同时写，无锁/无版本；后写覆盖先写 | `packages/deep-research-pack/README.md` §245 只写「无版本史」；无并发说明 | P2 | README 写明「run 活跃时不要手改」；不做文件锁 |
| G17 | 共享机器上 run bundle 继承工作区权限；无租户/每用户分区 | DSH 单 home 模型；bundle 目录未设 0700 | P2 | README 写明「一 Host 一用户；共享机用私有工作区」 |
| G18 | run bundle / archive 无自动 GC，磁盘只增 | 设计如此（用户所有）；`--clean` 不碰 `drt_*` | P2 | README 写明保留策略；不做自动删 |
| G19 | 新合同没登记到所有索引面：`docs/design/50` 状态表、`docs/evaluation.md`、`project-map`、`scripts/README` | 本轮新增快照/clean/compat-client 面 | P1 | 同 diff 登记（进行中） |

### 第二遍补扫（2026-10-27，用户追问「只有这些？」后）

第一遍按**发布阻断面**收敛，漏了三类：

1. **隐私/秘密面**（G11）：只查了 home 路径，没查 key/token/私钥；研究证据最可能带 URL 凭据。
2. **生命周期/运维面**（G12/G15–G18）：备份恢复、跨版本 profile、方法库并发、共享机权限、保留期。
3. **我自己刚写的代码的破坏性边界**（G13/G14）：`--clean` 在 dry-run/新版本状态/sidecar 上有真实数据丢失路径；
   `portableBundlePath` 的 symlink 假红。这三条不是「FAQ 缺口」，是**实现引入的缺陷**，优先级高于文档。

补扫方法：按 FAQ 41 的十八问逐条过（尤其 Q10 删除/保留、Q11 秘密、Q13 并发、Q15 自造目录谁清、Q17 客户端），
再按 42 的十个 archetype 对号；没有匹配的（附件/spill/RAG/同步服务）明确标「本包不用」。

## 落地结果（2026-10-27）

| # | 结果 | 证据 |
|---|---|---|
| G1 | 已修（BUG-044） | present 归一化 + 写前/写后校验 + `--repair`；现网 bundle 两次 `run-accept` 绿、`path-hygiene` 干净 |
| G2 | 已补 rc.3 客户端证据 | `compat-client-smoke` ALL PASS（真安装 → 真 web → chromium：零 apply 失败、client bundle 在、两页签可见可开） |
| G3 | 已落地 | pack README §Data 数据卡（13 类事实）+ 备份/恢复/保留/权限/版本线 |
| G4 | 已披露 | README §Compatibility N0/N1/N2 表 + `triggers.md` 两行 + scaffold/preflight 可行动文案 |
| G5 | 已落地 | README §Uninstall 列团队层显式移除 + `scaffold --clean` |
| G6 | 已落地 | `schemaVersion`（旧态前移/新版拒绝）+ `--clean`（报告/执行/幂等）+ `.gitignore` 不被 `--force` 覆盖；scaffold-smoke 新用例 |
| G7 | 已落地 | README 三轴版本表 + `--check` 先行；旧 bundle epoch 不变 |
| G8 | 已落地 | 数据卡写明「一 workspace 一实例，不装锁」 |
| G9 | 已移除 | Config 无 `apiKey` 字面量；单测钉住 |
| G10 | 已校正 | 8 件模板；数据卡取代旧 bullet |
| G11 | 已落地 | `secret-scan`（高置信、只报 path/line/kind）+ run-accept 三处接入 + 单测；现网交付物/全量均干净 |
| G12 | 已落地 | README 备份/恢复/移交小节 |
| G13 | 已修 | dry-run 组合拒绝、versionAhead 拒绝 clean、sidecar 默认保留；scaffold-smoke 四用例 |
| G14 | 已修 | `portableBundlePath` 双方 realpath；symlink 单测 |
| G15–G18 | 已写清 | README 版本线/方法库并发/单用户权限/无自动 GC |
| G19 | 已登记 | `docs/design/50` 安装侧指针 + `project-map` + `scripts/README` + `guides/62/65` |

## 方案与取舍

### D1 版本支持

- **A（推荐）补客户端面证据**：在 rc.3 上跑 `client-load-smoke`（真浏览器，断言页签/槽/工具卡在场），
  把 `compatibility` 与证据同 diff。数据面机制已 diff 一致，不需要再补读取证据。代价：需要 rc.3 宿主。
- **B 收窄**：`engines.dsh` 只留 rc.2，rc.3 标「未验证」。代价：少一批用户；诚实。
- **C 只写文档**：不改声明，只在 README 标「rc.3 仅安装形状验证，客户端面未验」。代价：支持面仍模糊。

### D2 N2 依赖

- **A（推荐）披露 + 触发器 + 可行动失败**：README/guides 标 N2；`triggers.md` 登记「agent-team 移出
  experimental / 改名 / 删除」；`scaffold`/`preflight` 缺层时给出具体补救。代价：仍是硬前置。
- **B 降级单人模式**：无团队层时退化为 Lead 单角色研究（无 scout/analyst/critic）。代价：产品语义
  变化大（方法论依赖对抗审查），需要单独 RFC；不建议现在做。
- **C 自己实现团队通道**：不现实，且违反「循 DSH 而不发明」。

### D3 种子生命周期

- **A（推荐）加 `state.schemaVersion` + 读旧 + `scaffold --clean --dry-run`**：清理只碰自己的
  state/lock/tmp/sidecar；孤儿种子只报告；`.gitignore` 从 `--force` 名单排除（或 `--force` 前显式提示）。
  代价：改 pack 公共行为（`--force` 语义），需同 diff 文档 + scaffold-smoke 新用例。
- **B 只改文档**：说明手工删除路径。代价：垃圾继续累积，用户仍要自己判断。
- **C 什么都不做**：不接受——G6 的 `.gitignore` 语义冲突是实打实的 owner 不一致。

### D4 `apiKey`

- **A（推荐）移除**：`apiKeyEnv` + credentials 服务已覆盖；pre-1.0 移除成本最低。
- **B 保留 + 标注**：对脚本化用户方便，但开了秘密进 profile 的口子。

## 计划

> 依赖：D1–D4 定案后启动；G1 已先行修复（BUG-044）。每一步与验收证据同 diff。

**P0 · 记录与分诊（本轮）**：本卡 + 证据 digest + BUG-044；不改代码。

**P1 · 发布前必须（契约与安全）**
1. G1：先写红测（新 bundle 回执里出现绝对路径即红）→ 修 `run-accept` 的回执写入顺序/校验 → 复跑，
   证明新回执零绝对路径、旧 bundle 仍按 epoch 豁免。
2. G2：按 D1 落地；若选 A，补 rc.3 的 `client-load-smoke`（真浏览器挂载断言）。数据面机制不需要再补。
3. G3/G5/G7：README 增一张 `## Data` 卡（13 行级别）+ `## Uninstall leaves` + 版本兼容矩阵；
   guides/65 只留链接（一个事实一个家）。
4. G4：按 D2-A 披露 N2 + `triggers.md` 一行；`scaffold`/`preflight` 的缺层文案改成可行动。
5. G10：同批校正模板数/种子计数。
6. G11：新增高置信 `secret-scan`（sk-/ghp_/AKIA/PRIVATE KEY/Bearer），run-accept 预检接入；
   只报高置信命中，避免把安全题材的示例文本判红。
7. G12/G15–G18：README Data 增 Backup/Restore、保留期、单用户/权限、跨 profile 段落；不做自动 GC/文件锁。

**P2 · 发布后加固（不改 run 语义）**
8. G13/G14：`--clean` 边界收口（dry-run/versionAhead/sidecar 三处）+ `portableBundlePath` realpath；
   同 diff 补 scaffold-smoke 与 path-hygiene 单测。
9. G6：`state.schemaVersion` + `--clean`（dry-run 默认）+ `.gitignore` owner 统一；scaffold-smoke 覆盖
   「旧 state 读入」「clean 不删用户文件」「锁被占时拒绝」。
10. G9：已移除字面量 `apiKey`；`data-smoke` 的 fake-token 断言继续覆盖。
11. G8：数据卡写明「一 workspace 一实例，不装锁」；不新增机制。

**P3 · 持续**
9. 每次宣告新 DSH 版本支持前，跑一次客户端挂载烟测（加入发布检查清单）；数据面按升 pin 流程重审。
10. 上游 agent-team 毕业/改名时按 `triggers.md` 重议。

## 验收标准

- G1：新跑 `run-accept` 的 bundle 中 `delivered.json` / `acceptance.md` / `manifest.json` 零本机
  绝对路径；红测在修前红、修后绿；旧 bundle 行为不变（D28 epoch）。
- G2：`engines.dsh` 声明的每个版本至少有一条客户端挂载证据（`client-load-smoke` 或等价），或声明
  收窄到已验证集合；两者不并存。
- G3：README 一张表覆盖 13 类事实的「承诺/位置/作用域/删除/卸载后」；用户能按表删干净自己的数据；
  文档门禁（md-links/anchors/doc-budgets）绿。
- G4：README/guides 明示 N2；`triggers.md` 有上游重议条件；缺团队层时错误文案给出具体命令。
- G5：Uninstall 节列出「留下什么」与逐项清理命令（含团队层）。
- G6：旧 state（无 `schemaVersion`）可读；`--clean --dry-run` 不写盘；真清理只删本包自己的
  state/lock/tmp/sidecar，不动种子与用户文件；`--force` 不再静默覆盖用户 `.gitignore`。
- G7：包/种子/bundle 三轴兼容矩阵在 README；升级路径写明「先 `scaffold --check` 再 `--upgrade`」。
- G9：按 D4 的结论，配置面不再提供未标注的字面量秘密入口。
- 全程 `pnpm verify` + `pnpm test` 绿；改 pack 行为的面追加 L1/L2 或 scaffold-smoke。

## 关闭条件

D1–D4 有明确取舍并落盘；P1 各项的验收证据在树内；P2 各项要么落地、要么以可观察重议条件延后并登记
`triggers.md`；G1 的 BUG-044 已修或转「待修」。结论去向按 `implemented`（同批 Note）或
`deferred`（触发器）记录后归档。
