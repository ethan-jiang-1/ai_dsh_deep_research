---
status: 已结
opened: 2026-11-14
---

# 已结：验证层 Oracle 独立化补强与双台账收口（D55 返工）

> 立卡：2026-11-14 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 — D55 首轮交付五类结构缺口按 S1–S5 全部闭环并验收全绿 ｜ 可关闭：是
> 去向：implemented — [Note](../../../notes/implemented/2026-11-14-verification-oracle-hardening.md)；业务验收：用户

**问题与期望结果：** [已结卡 2026-11-14-verification-oracle](2026-11-14-verification-oracle.md)（[D55](../../../docs/decisions.md#d55)）立项旨在终结「手写子集解析器 + 作者自写单测 + 散文证据」引发的第 6–9 轮同类复发（`BUG-160..190`）及历史守卫沉淀缺口，但首轮落地在五个面上只做了外围补丁而未触及根因（双份手写 Markdown 状态机未合并且 5 类相邻语法与 `mdast` 分歧、写入侧 CI `run:` 门漏做且 360 行手写 YAML 仍在、`fix-evidence`/`guard-red-record` 留 4 条绕过链与死正则、`guard-ledger` 与 `asset-ledger` 在 10 个测试文件上自相矛盾、S1 多处用源码字面 grep 冒充行为守卫且缺五角色快照 B 层 keyless 内容对账）。期望在不破插件包零运行时依赖与 `layering` 门禁的前提下，按五分片彻底兑现 D55 合同：单一真源实现、真实解析器/规范写入门、无绕过修复证据链、自洽四账与真正的行为/内容级 keyless 守卫。
**当前情况：** 已按 S1–S5 全量交付闭环；前序因果链与逐项实测复现见归档研究题 [d55-oracle-gap-audit](../research/d55-oracle-gap-audit/README.md)（正文 = [2026-11-14-d55-provenance-and-oracle-audit](../research/d55-oracle-gap-audit/2026-11-14-d55-provenance-and-oracle-audit.md)）。
**未决问题：** 无。
**下一步：** 已关闭归档。

---

## 背景与证据锚点

> 按 [_backlog/AGENTS](../../AGENTS.md) 铁律，已归档卡永不重开；本卡作为 D55 的正式补强卡引用前序载体，完整实测输出见 [2026-11-14-d55-provenance-and-oracle-audit](../research/d55-oracle-gap-audit/2026-11-14-d55-provenance-and-oracle-audit.md)。

1. **S2a Markdown 遮罩未同源且相邻语法失真**：`scripts/lib/note-scan.mjs` 与 `packages/deep-research-pack/src/lib/review-readiness.ts` 仍各存一份 ~90 行手写遮罩；实测行内反引号 `` `<!--` ``、双反引号、引用块/列表未闭合围栏退出容器、跨行注释闭合行紧跟第二段注释共 5 类合法输入与 `mdast` 分歧（吞掉后续标题与 `终局判据` 或漏出隐藏注释）；`dev/record-markdown-oracle.mjs` 用 `[...src]` 混用 `mdast` UTF-16 offset，遇 emoji（`🎯`）直接算错切片且含重复用例名。
2. **S2b CI 工作流缺写入侧门且保留假 `external` 关闭**：漏做规范 `run:` 写入门；`scripts/lib/ci-workflow.mjs` 仍保留 360 行手写缩进 YAML 状态机与 `/exit [1-9]/` 残缺黑名单；`record-ci-oracle.mjs` 缺 `-eo pipefail`；`BUG-190` 在 `guard-ledger` 标 `external/closed`，但 `ci-workflow-oracle.test.mjs` 只调 `executedSmokeFiles` 不读 `events`（删 `parseEvents` 仍 100% 绿）。
3. **S2c 修复证据与红录门禁存在 4 条绕过链 + 1 条死正则**：① `red.command: "pnpm test"` 配任意既有测试路径即可零测试改动过 `staged-change-pairing`；② `backlog-liveness` 不查活跃/已归档卡 `guard.path` 盘上存活，归档后删守卫测试仍全绿；③ `fix-evidence.mjs` 用 `opened < '2026-11-15'` 一刀切豁免且删掉旧散文红绿检查，导致 `<= 2026-11-14` 卡双空；④ `fixSectionOf` 未剥围栏被 `red.output` 内 `## ` 截断、`duplicateKeyOf` 漏 `\uXXXX` 键转义；⑤ `f-repo.mjs:164` 写死 `/conformance\.test\.mjs$/`，D53 改 `.spec.mjs` 后全仓 0 命中。
4. **S3 双台账撕裂与契约缺项**：`guard-ledger`（31 条）与 `asset-ledger`（208 条，其中 194 条因硬编码 14 条 `OVERRIDES` 被标成 `self-referential`）在 **10 个测试文件 / 11 条 BUG** 上 `oracleType` 直接冲突（含 `note-scan.test.mjs` 零外部真值却标 `external`）；`asset-ledger` 缺原卡要求的 `class` 与 `cost`，且未同步 [guides/67 §4 四账](../../../docs/guides/67-test-strategy.md)。
5. **S1 源码 grep 伪守卫、快照 keyless 盲区与账本蒸发**：`boot-timer`（`BUG-095`）、`probe-port-policy`（`BUG-136`，只扫 1/6 行为探针，漏其余 5 个硬编码端口探针）、`smoke-imports`（`BUG-079` 单行正则漏跨行与传递闭包）、`web-ui-nav-bilingual`（`BUG-059/061` 单文件单行）均以源码字面 grep 冒充 `canonical` 守卫；`replay-fixtures.spec.mjs`（`BUG-013/080`）只验 40-hex 而未对五角色 `session.v4.jsonl` 做 B 层内容对账；普查 §D-2（17 卡）与探索批 A–C（24 卡中 23 张无标题声明、24 张未入账）+ 批 D `BUG-186/189` 账本蒸发。

---

## 方案与取舍

| 决策点 | 采纳方案 | 否决备选 | 取舍依据 |
|---|---|---|---|
| **Markdown 遮罩同源与真值层** | 在 `packages/deep-research-pack/src/lib/markdown-mask.ts` 建唯一零依赖纯函数实现（支持行内代码跨度、容器退出闭合围栏、同行多段注释）；`review-readiness.ts` 与 `scripts/lib/note-scan.mjs` 直接同源 import；契约测试直调根 `devDependencies` 锁定的 `mdast-util-from-markdown@2.0.3` 跑确定性结构组合矩阵 + UTF-16 多字节语料，退役 `dev/record-markdown-oracle.mjs` 与静态 `tests/fixtures/markdown-mask/oracle.json` | pack 运行时引 `mdast`；或保留两份手写状态机 + 静态快照 | 发布包必须保持零运行时 `dependencies`；Node `v22.23.1` 实测原生支持裸 `node` 直引 `.ts`，测试层直调 `mdast` 比静态快照更强且无陈旧面 |
| **CI 工作流解析与规范 `run:` 门** | ① 根 `package.json` `devDependencies` 显式声明仓内 `.pnpm` 已有的 `yaml@2.9.1`（消除本机 `/Users/bowhead/node_modules` 幽灵解析），重写 `scripts/lib/ci-workflow.mjs` 基于 `yaml` AST 解析 `on` / `jobs` / `steps`（删 360 行手写缩进解析器）；② 新增写入侧契约检查（并入 `ci-workflow.test.mjs` 或 L0 门禁）：`.github/workflows/*.yml` 中含 `scripts/smoke/` 的每个 `run:` 行/段必须属于规范可执行形态白名单（环境变量赋值 / `source dev/env.sh` / 构建前置 / `node [--import tsx/esm] scripts/smoke/<file>`，严禁 `!`、短路死分支、`|| true` 吞错等歧义包装）；③ 补齐 `BUG-190` 对 `eventKeys` 的真实断言，并在 `gates.e2e.mjs` 用 `bash -eo pipefail` 校验工作流 `run:` 片段执行语义 | 继续给手写缩进 YAML 解析器与 `isKnownFailure` 黑名单打补丁 | YAML 2 用标准解析器一步到位；Bash 子集通过「写入侧收窄生产者契约 + `gates.e2e` 真 `bash -eo pipefail` 对照」闭环，不再维护失败命令黑名单 |
| **修复证据与红录门禁加固** | ① `fix-evidence.mjs` 先经 `markdown-mask` 剥离正文代码围栏再切节，JSON 解析前用标准词法解码键名（含 `\uXXXX`）抓重复键；② 豁免口径从 `opened < '2026-11-15'` 收紧为**仅豁免盘上既有已归档历史卡名单/缺省块**，任何活跃 `bugs/` 卡翻 `修复落地/已修` 一律强制结构化 `json fix-evidence`；③ `guard.path` 闭环：`kind: "unit"` 要求目标测试文件存在且含该 `BUG-nnn` 的 `guard-red-record` 声明（或 `staged-change-pairing` 暂存区真实修改了该守卫文件），`backlog-liveness` 对所有含 `json fix-evidence` 的活跃及已归档卡持续校验 `guard.path` 在盘存在；④ 修 `f-repo.mjs:164` 为 `/conformance\.(?:spec\|test)\.mjs$/` 并在 `gates-cases.mjs` 加注入红例 | 在 pre-commit 里自动切父提交重跑 `red.command` | 切树重跑破坏暂存工作区且超时；锁死「守卫文件真实增改 + `BUG-nnn` 留证绑定 + 归档后文件存活」是零副作用的盘侧硬判据 |
| **四账统一与历史缺口核销** | 以单一 AST/import 分析器重写 `scripts/lib/asset-ledger.mjs`（废除 14 条手工 `OVERRIDES`）：从真实 AST import 图与文件读取目标自动判定 `oracleType`（`external` / `canonical` / `structured` / `self-referential`），补齐 `class` / `cost` / `uniqueClaim` / `sunset` 六字段；让 `guard-ledger` 作为同一事实源上的 BUG 守卫投影（零冲突互锁），同步更新 `docs/guides/67-test-strategy.md` §4 四账，并将普查 D-1（24）+ D-2（17）+ 批 A–D（31）共 **72 张卡**逐一核销入账（补齐批 A–D 缺失的 25 处 `BUG-nnn` 测试标题与留证） | 手工修补 10 处冲突 JSON 行 | 自动从 import/读取面推导才能防止新测试再次退化为 93% 默认 `self-referential`，并消除双账分叉 |
| **S1 真行为守卫 + 快照 B 层 keyless** | ① `BUG-095`：改为可注入 spawn 的真实 `bootWeb` 行为测试（成功/早退/超时三路径后断言零残留 timer）；② `BUG-136`：在 `scripts/lib/web-harness.mjs`（或共享 probe 助手）提炼端口占用预收割 + 空闲端口回落 + `finally` 整组清理，接入全部 6 个 `probes/behavior/*.mjs` 并单测冲突退避行为；③ `BUG-079` & `BUG-059/061`：改用 `typescript` AST 扫描全部 `scripts/smoke/*.mjs` 静态/动态 import 闭包与浏览器定位器双语契约；④ `BUG-013/080`：`tests/run/replay-fixtures.spec.mjs` 复用 `loadReplayScene`，并对五角色 `session.v4.jsonl` 做 `persona`（`presets/<role>.patch.yml`）、`skill-catalog`（`SKILL.md`）、`runtime-context`（`content/manual.md` 插值后正文）及 `source.vendor`（对齐 `vendor/dsh` 钉 SHA）的 keyless 全等对账 | 保留源码正则匹配；仅靠 CI `snapshot-replay.entry` 发现快照漂移 | 行为/AST/内容对账不绑局部变量名，且把角色/手册漂移从分钟级 CI 提前到秒级 `pnpm test` |

---

## 分片

每个分片独立可跑 `pnpm verify && pnpm test`（触及 pack 源码的分片同跑 `pnpm typecheck && pnpm build`）：

- **S1 · Markdown 遮罩单一真源 + `mdast` 组合矩阵契约**
  - 新建 `packages/deep-research-pack/src/lib/markdown-mask.ts`，统一承接围栏（`` ``` `` / `~~~`）、blockquote/list 容器前缀与退出闭合、行内反引号跨度（`` `...` `` / ```` ``...`` ````）及同行多段/跨行 HTML 注释遮罩；
  - `packages/deep-research-pack/src/lib/review-readiness.ts` 与 `scripts/lib/note-scan.mjs` 删除各自手写状态机，统一 import `markdown-mask.ts`；
  - 根 `package.json` `devDependencies` 显式声明锁内已有的 `mdast-util-from-markdown@2.0.3`；重写 `tests/contracts/markdown-mask-conformance.spec.mjs` 直调 `mdast`（UTF-16 精确偏移）覆盖结构组合矩阵与全部 5 类相邻反例；退役 `dev/record-markdown-oracle.mjs` 与静态 `tests/fixtures/markdown-mask/oracle.json`。
- **S2 · CI 工作流 `yaml` AST 解析 + 写入侧规范 `run:` 门 + `BUG-190` 真闭环**
  - 根 `package.json` `devDependencies` 显式声明锁内已有的 `yaml@2.9.1`；重写 `scripts/lib/ci-workflow.mjs` 用 `yaml` AST 解析工作流（删 360 行手写缩进状态机）；
  - 建立 `.github/workflows/*.yml` 写入侧规范 `run:` 形状检查（拦截非规范包装、死分支、`|| true`、注释伪装执行），对真实 `ci.yml` 与 `model-smoke.yml` 全量核验；
  - 修复 `BUG-190` 守卫（直接断言 `parseWorkflow(...).events` / `eventKeys` 对流式/块式/列表 `on:` 与 `mdast`/`yaml` 真值全等），并在 `scripts/smoke/gates.e2e.mjs`（或 `dev/record-ci-oracle.mjs` 新鲜度互锁）补 `bash -eo pipefail` 执行语义对照。
- **S3 · `fix-evidence` / `staged-change-pairing` / `backlog-liveness` / `guard-red-record` 漏洞封堵**
  - `scripts/lib/fix-evidence.mjs`：改用 `markdown-mask` 切节、词法解码 JSON 键名防 `\uXXXX` 重复键、收紧历史豁免边界（活跃 `bugs/` 零豁免）；
  - `scripts/lib/staged-change-pairing.mjs` & `scripts/lib/backlog-liveness.mjs`：封堵「借无关旧测试充当 `guard.path`」与「归档后删 `guard.path` 文件不红」两条绕过链；
  - `scripts/verify/gates/f-repo.mjs`：将 `/conformance\.test\.mjs$/` 修为 `/conformance\.(?:spec|test)\.mjs$/`，并在 `scripts/smoke/gates-cases.mjs` 增补注入负例。
- **S4 · S1 伪守卫升级（真行为 / AST）+ 五角色快照 B 层 keyless 对账**
  - `BUG-095`：可注入子进程的 `bootWeb` 三路径 timer 零泄漏单测（替代局部变量 grep）；
  - `BUG-136`：抽共享 probe 端口预收割 + 空闲端口回落 + `finally` 进程组收割助手，覆盖 `probes/behavior/*.mjs` 全部 6 个探针并补行为单测 + AST 接入检查；
  - `BUG-079` & `BUG-059/061`：`smoke-imports.test.mjs` 与 `web-ui-nav-bilingual.test.mjs` 升级为 `typescript` AST 全文件/闭包扫描；
  - `BUG-013 / BUG-080`：`tests/run/replay-fixtures.spec.mjs` 接入 `loadReplayScene`，并对五角色 `session.v4.jsonl` 做 `persona`、`skill-catalog`、`runtime-context`（`manual.md`）与 `vendor` 钉 SHA 的 keyless 内容全等对账。
- **S5 · 测试资产账与 BUG 守卫账统一收口（72 卡全量对账 + 文档同步）**
  - 重写 `scripts/lib/asset-ledger.mjs`（AST 推导 `oracleType`，补齐 `class` / `cost` / `uniqueClaim` / `sunset`，消灭与 `guard-ledger` 的 10 文件 11 处矛盾）；
  - 逐卡补齐并核销普查 D-1（24）+ D-2（17）+ 探索批 A–D（31）共 **72 张卡**的测试标题声明、`// 负例留证` / `// 夹具留证` 与台账记录；
  - 同步更新 `docs/guides/67-test-strategy.md` §4 四账、`docs/evaluation.md`（若门禁表变动）、`docs/decisions.md#d55`，交付新 Note 并按 `archiving-a-note` 归档首轮旧 Note。

---

## 判据形状

| 判据对象 | Authority（权威结构化事实） | Readers（读取方与决定） | Bad inputs（缺 / 非法 / 互斥） | Legacy exit（旧形态退出条件） | Proof（变异矩阵 / 反证位置） |
|---|---|---|---|---|---|
| **1. Markdown 结构遮罩** | `packages/deep-research-pack/src/lib/markdown-mask.ts` 导出的纯遮罩结果（开发/测试真值锚点 = `mdast-util-from-markdown` AST 偏移） | `review-readiness.ts`（终局判据散文交叉校验）、`scripts/lib/note-scan.mjs`（`c-notes` 门禁）、`scripts/lib/fix-evidence.mjs`（证据块提取） | 未闭合顶层围栏/注释 → 遮罩至文末；容器（`>` / `-`）退出 → 仅闭合容器内围栏；行内反引号内 `<!--` → 视为字面量不进注释态 | 删除 `note-scan.mjs` 与 `review-readiness.ts` 内两份旧手写遮罩，删除 `dev/record-markdown-oracle.mjs` 与静态 `oracle.json` | `tests/contracts/markdown-mask-conformance.spec.mjs`（容器 × 围栏 × 行内反引号 × 多段注释 × Astral UTF-16 矩阵，与 `mdast` 逐行全等） |
| **2. CI 工作流执行面与 `run:` 形状** | `.github/workflows/*.yml` 经 `yaml@2.9.1` 解析出的文档 AST + 规范 `run:` 命令语法白名单 | `scripts/lib/ci-workflow.mjs` → `ci-workflow.test.mjs`、`smoke-registry.test.mjs`、`model-workflow.test.mjs` | YAML 语法错/重复键 → 红；含 `scripts/smoke/` 的 `run:` 行出现 `!`、短路死分支、`|| true` 或未知包装 → 红；未知 `if:` 表达式 → 按保守不计入已覆盖执行面 | 删除 `ci-workflow.mjs` 内 360 行手写缩进解析器与 `isKnownFailure` 正则表 | `tests/checks/ci-workflow.test.mjs` + `tests/checks/ci-workflow-oracle.test.mjs`（含 `BUG-190` `events` 矩阵）+ `scripts/smoke/gates.e2e.mjs`（`bash -eo pipefail` 对照） |
| **3. Bug 修复证据与红录守卫** | Bug 卡 `## 修复关联` 节内唯一的 `json fix-evidence` 结构化对象 + 守卫测试文件内的 `test('...BUG-nnn...')` 与留证注释块 | `scripts/lib/fix-evidence.mjs`、`staged-change-pairing.mjs`、`backlog-liveness.mjs`、`f-repo.mjs`（`guard-red-record`） | 缺块 / 多块 / JSON 语法错 / `\uXXXX` 解码后重复键 / `red.exit === 0` / `green.exit !== 0` / `guard.path` 不存在或未绑定该 `BUG-nnn` 且未在暂存区修改 → 红 | 仅保留盘上既有已归档历史卡（`BUG-001..185` 等无 JSON 块旧卡）冻结豁免；活跃 `bugs/` 路径零豁免 | `tests/checks/fix-evidence.test.mjs`、`tests/checks/staged-change-pairing.test.mjs`、`tests/checks/backlog-liveness.test.mjs`、`scripts/smoke/gates-cases.mjs` |
| **4. 测试资产账与守卫账** | 测试文件 AST import 图 + 头注元数据 + `test('...BUG-nnn...')` 声明生成的统一账本（`tests/fixtures/asset-ledger/ledger.json` 与 `guard-ledger/ledger.json`） | `tests/checks/asset-ledger.test.mjs`、`tests/checks/guard-ledger.test.mjs` | 盘上测试增删未入账 → 红；同一文件在两账 `oracleType` 不一致 → 红；声称 `external`/`canonical` 但 AST 未 import 对应外部库/生产模块 → 红 | 删除 `asset-ledger.mjs` 内 14 条硬编码 `OVERRIDES` 字典 | `tests/checks/asset-ledger.test.mjs` + `tests/checks/guard-ledger.test.mjs`（防漂移与伪造 `oracleType` 负例） |
| **5. 五角色快照 B 层 keyless 对账** | `snapshots/replay/research-face/snapshot.json` + 各角色 `session.v4.jsonl` 事件流 ↔ 当前 `presets/*.patch.yml`、`presets/*/skills/*/SKILL.md`、`content/manual.md`、`.git` vendor submodule SHA | `tests/run/replay-fixtures.spec.mjs`（日常秒级回归）与 `scripts/smoke/snapshot-replay.entry.mjs`（CI 真挂载回放） | 任一角色缺席 / `vendor` SHA 失配 / 录制 `persona`、`skill-catalog` 或 `runtime-context` 与当前包源码不一致 → 红 | 删除 `replay-fixtures.spec.mjs` 中手抄的弱子集断言，统一走 `loadReplayScene` + B 层内容提取器 | `tests/run/replay-fixtures.spec.mjs`（篡改任一角色 persona / manual / skill 描述 / vendor SHA 的负例断言） |

方法 = [设计判据](../../methods/judgment-design.md)。

---

## 验收标准

| Behavior | Class | Input / state | Pass / fail signal | Negative / recovery | Evidence owner | Human judgment |
|---|---|---|---|---|---|---|
| **AC1 · Markdown 遮罩全仓单一实现且对齐 CommonMark (`mdast`)** | Deterministic logic | `review-readiness.ts`、`note-scan.mjs`、`fix-evidence.mjs` 共用 `markdown-mask.ts`；输入覆盖围栏、嵌套容器、行内反引号、同行多段/跨行 HTML 注释、Astral emoji | 全仓仅一份遮罩状态机实现；组合矩阵与 `mdast-util-from-markdown` 输出 100% 逐行一致；`pnpm build && pnpm typecheck` 通过且发布包 tarball 零新增运行时依赖 | 注入 5 类首轮失败输入（`` `<!--` ``、`> ``` ` 退出、`- ``` ` 退出、闭合行双注释、`🎯 <!-- -->`）必须与 `mdast` 同判；回退任一分支即红 | `tests/contracts/markdown-mask-conformance.spec.mjs`、`tests/checks/note-scan.test.mjs`、`scripts/smoke/pack.e2e.mjs` | 无 |
| **AC2 · CI 工作流由真实 `yaml` AST 解析且 `run:` 写入受规范门把守** | Deterministic logic + Orchestration | `.github/workflows/{ci,model-smoke}.yml` 及合成正反例 YAML | `ci-workflow.mjs` 零手写缩进解析；`ci.yml` / `model-smoke.yml` 全部通过规范 `run:` 形状校验；`BUG-190` 实测校验 `events` / `eventKeys`；`gates.e2e.mjs` 经 `bash -eo pipefail` 对账一致 | 在工作流步骤注入 `false && node scripts/smoke/x.e2e.mjs`、`exit 10`、`! node ...` 或删 `events` 解析 → 对应契约测试立即判红 | `tests/checks/ci-workflow.test.mjs`、`tests/checks/ci-workflow-oracle.test.mjs`、`scripts/smoke/gates.e2e.mjs` | 无 |
| **AC3 · `fix-evidence` 与 `guard-red-record` 封死四条绕过链与死正则** | Deterministic logic | 含围栏 `## `、`\u0063hanges` 重复键、`opened: 2026-11-14`、无关 `guard.path`、归档后缺席 `guard.path` 的合成卡，以及缺留证的 `*conformance.spec.mjs` | 合法修复卡绿；四类绕过输入与缺留证 `*conformance.spec.mjs` 全部被 `fix-evidence` / `staged-change-pairing` / `backlog-liveness` / `guard-red-record` 精确判红 | `gates.e2e.mjs` 注入无留证 `conformance.spec.mjs` 与伪造 `guard.path` 均命中预期门禁名判红 | `tests/checks/fix-evidence.test.mjs`、`tests/checks/staged-change-pairing.test.mjs`、`tests/checks/backlog-liveness.test.mjs`、`scripts/smoke/gates.e2e.mjs` | 无 |
| **AC4 · S1 守卫升级为真实行为/AST 判据且五角色快照漂移秒级可捕** | Deterministic logic + Orchestration | `bootWeb` 三结算路径；6 个 `probes/behavior/*.mjs` 端口占用退避；`scripts/smoke/` 跨行与传递 import；浏览器双语定位器；五角色 `research-face` 快照 | `bootWeb` 三路径结束后零残留 timer；6 个行为探针全部具备端口冲突回落与 `finally` 整组清理；`replay-fixtures.spec.mjs` Keyless 校验五角色 `persona` / `skill-catalog` / `runtime-context` / `vendor` 全绿 | 篡改 `content/manual.md` 一字、任一 preset persona、跨行坏 import 或单语字符串定位器 → `pnpm test` 秒级判红（无需起浏览器或重录） | `tests/run/web-harness.spec.mjs`（或更新后的 `boot-timer`）、`tests/checks/probe-port-policy.test.mjs`、`tests/checks/smoke-imports.test.mjs`、`tests/checks/web-ui-nav-bilingual.test.mjs`、`tests/run/replay-fixtures.spec.mjs` | 无 |
| **AC5 · 测试资产账与 BUG 守卫账零冲突收口、72 卡全入账且文档同步** | Deterministic logic | 全仓 `tests/` 资产、普查 D-1（24）+ D-2（17）+ 批 A–D（31）共 72 张卡、`docs/guides/67-test-strategy.md` §4 | `asset-ledger` 含完整六字段且由 AST 自动推导 `oracleType`，与 `guard-ledger` 零冲突（0 处矛盾，无虚假 `external`）；72 张卡逐一可追溯到具体守卫或显式处置；`guides/67`、`decisions.md#d55` 与新旧 Note 状态一致，`pnpm verify && pnpm test` 全绿 | 伪造无外部库 import 的 `external` 标注、删任一已入账 BUG 标题或漏登新测试文件 → 台账契约测试判红 | `tests/checks/asset-ledger.test.mjs`、`tests/checks/guard-ledger.test.mjs`、`pnpm verify` | 用户审阅范围与最终业务验收 |

---

## 排除项

- **不重开已归档卡**：不移动、不改写 `_backlog/_archived/settled_issues/2026-11-14-verification-oracle.md` 与 `_backlog/_archived/fixed_bugs/BUG-*.md` 的历史结论正文（仅在必要处被新卡引用）。
- **不给 `packages/deep-research-pack` 增加任何运行时第三方依赖**：`mdast-util-from-markdown` 与 `yaml` 仅限根 workspace `devDependencies`（供 `scripts/` 与 `tests/` 开发验证消费）。
- **不在 `pnpm test` 或 `pnpm verify` 中引入网络请求、真模型调用或长时间浏览器冷启动**：所有新增 L0/keyless 守卫保持秒级确定性执行；真进程 `bash -eo pipefail` 对照归入 `e2e` 车道（`gates.e2e.mjs`）。
- **不顺带删除或降级现有慢层 `scripts/smoke/*.entry.mjs` 资产**：慢资产去留由独立研究题 [test-asset-fence](../../_archived/research/test-asset-fence/README.md) 承接，本卡只负责把台账字段做实、把 keyless 守卫做真。

---

## 关闭条件

1. `## 分片` S1–S5 全部落地，`## 验收标准` AC1–AC5 对应的机械检查（`pnpm verify`、`pnpm test`、`pnpm typecheck`、`pnpm build`、`node scripts/smoke/gates.e2e.mjs`、`node scripts/smoke/pack.e2e.mjs`）全绿，且新增/收紧判据均完成同 diff 先红后绿验证。
2. 完成 `reviewing-a-delivery` 语义自审（含证据账本）。
3. 同次提交写入 [notes/implemented/2026-11-14-verification-oracle-hardening.md](../../../notes/implemented/2026-11-14-verification-oracle-hardening.md)，按 `archiving-a-note` 将被取代的首轮 [notes/archived/2026-11-14-verification-oracle.md](../../../notes/archived/2026-11-14-verification-oracle.md) 迁入 `notes/archived/` 并更新入链与 [decisions.md#d55](../../../docs/decisions.md#d55)，同时将本卡迁入 `_backlog/_archived/settled_issues/`、将研究题 `d55-oracle-gap-audit/` 迁入 `_backlog/_archived/research/`。

---

## 落地记录（2026-11-14）

- **S1（Markdown 单一真源 + 进程内 `mdast` 真值对账）**：新建 `packages/deep-research-pack/src/lib/markdown-mask.ts` 统一承接围栏、块引用/列表容器退出、行内反引号与同行多段/跨行 HTML 注释；`review-readiness.ts`、`note-scan.mjs` 与 `fix-evidence.mjs` 同源复用，删除两份旧手写遮罩与静态 `markdown-oracle`；`markdown-mask-conformance.spec.mjs`、`verdict-conformance.spec.mjs`、`note-scan.test.mjs` 直调 `mdast-util-from-markdown@2.0.3` 逐行/逐节点对账。
- **S2（CI 工作流 `yaml` AST + 规范 `run:` 门 + 真 `bash -eo pipefail` 对照）**：新建受锁加载层 `scripts/lib/workspace-parsers.mjs`，重写 `ci-workflow.mjs` 与 `ci-jobs.test.mjs` 为 `yaml@2.9.1` AST，新增 `ciWorkflowRunProblems` 写入侧规范门，升级 `record-ci-oracle.mjs`（`events` 入账闭环 `BUG-190`）并接入 `gates.e2e.mjs`。
- **S3（修复证据与红录绕过链封堵）**：修复 `fix-evidence.mjs`（`markdown-mask` 切节、`\uXXXX` 重复键拦截、活跃 `bugs/` 零豁免）、`staged-change-pairing.mjs`（禁借无关旧测试充当 `guard.path`）、`backlog-liveness.mjs`（常驻校验归档卡 `guard.path` 存在）与 `f-repo.mjs`（`conformance.(spec|test).mjs` + 单标题多 `BUG-nnn` 全提取），并在 `gates-cases.mjs` 增补注入案例。
- **S4（真行为/AST 守卫 + 五角色快照 B 层 keyless 对账）**：拆出 `scripts/lib/web-banner.mjs` 完成三路径句柄零泄漏测试（`BUG-095`）；提炼共享端口退避与整组收割覆盖全部 6 个 `probes/behavior/*.mjs`（`BUG-136`）；升级 `smoke-imports.test.mjs` 与 `web-ui-nav-bilingual.test.mjs` 为 TS AST 扫描并修清 11 处单语定位器（`BUG-079`、`BUG-059/061`）；`profile-health.mjs` 补镜像新鲜度、`replay-fixtures.spec.mjs` 补五角色 `persona` / `skill-catalog` / `manual.md` / `vendor` SHA keyless 对账，并实跑真机 `snapshot-replay.entry.mjs --layers a,b` 五角色全 PASS（`BUG-013/080`）。
- **S5（双台账 AST 推导与 72 卡全量闭环）**：`asset-ledger.mjs` 废除 `OVERRIDES`，由 TS AST 自动推导 `oracleType`（209 项：external 23 / canonical 112 / structured 42 / self-referential 32）；`guard-ledger` 扩至 D-1（24）+ D-2（17）+ 批 A–D（31）共 **72 张卡**，与 `asset-ledger` 0 处矛盾；同步 `guides/67`、`decisions.md#d55`、`scripts/README.md` 与新旧 Note。

### 证据账本

| 证据 | 层 | 覆盖的失败类 | 负控（见过红） | CI/收尾 |
|---|---|---|---|---|
| `tests/contracts/{markdown-mask,verdict}-conformance.spec.mjs` + `tests/checks/note-scan.test.mjs` | contract / checks | C3 双实现漂移、C4 CommonMark 相邻语法与 UTF-16 偏移 | 是（5 类首轮分歧输入先红后绿） | `pnpm test` |
| `tests/checks/{ci-workflow,ci-workflow-oracle,ci-jobs,model-workflow,smoke-registry}.test.mjs` | checks | C7 假绿（短路/取反/提及当执行）、C4 YAML 流式映射/job id | 是（`! node`、`false &&`、`on: {...}` 负控） | `pnpm test` |
| `tests/checks/{fix-evidence,staged-change-pairing,backlog-liveness}.test.mjs` | checks | C7/C11 伪造修复证据、借无关守卫路径、编码重复键 | 是（4 条绕过链逐一先红后绿） | `pnpm test` + `pnpm verify` |
| `tests/checks/{boot-timer,probe-port-policy,smoke-imports,web-ui-nav-bilingual,asset-ledger,guard-ledger}.test.mjs` + `tests/run/replay-fixtures.spec.mjs` | checks / spec | C5 资源泄漏/占口自锁、C2 死链与单语定位器、C9 快照与双账漂移 | 是（句柄泄漏、跨行死链、伪 `external`、跨账失配、手册一字篡改） | `pnpm test` |
| `scripts/smoke/{pack,gates}.e2e.mjs` + `scripts/smoke/snapshot-replay.entry.mjs --layers a,b` | e2e / entry | C10 打包零多余运行时依赖、门禁真实 CLI 注入、五角色真实挂载回放 | 是（120+ 门禁注入红例 + `ci-oracle --check`） | 本地收尾 + CI job |
