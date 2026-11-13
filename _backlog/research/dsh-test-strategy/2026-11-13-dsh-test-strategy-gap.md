---
topic: DSH 测试策略对标：三环、四账、五关
intent: 把 DSH 的测试策略抓成可迁移的机制，对照本仓资产与 159 张 BUG 的失败史，给出长期可执行的借鉴与落地路线。
---

# DSH 测试策略对标：从「发现缺陷」到「制度化不漏」

> 证据边界：DSH 侧 = `_digested/test-strategy/` 16 篇 + `vendor/dsh`（pin `dsh-v0.2.1-rc.5` @
> `b830ec950f`）一手源；本仓侧 = HEAD `62c5cfca` 附近的工作树。数字凡标「实测」= 本机 2026-11-13
> 实跑（macOS / Node 22.23.1 / pnpm 11.7.0）；未跑的档位明确标「未跑」。本文只做对标与路线，
> 不把未实施的切片写成已落地。

## 0. 结论先行

1. **DSH 的强项不是「测试多」，是「让绿有意义」的制度。** 55 行政策、七层证据形态、
   六个互不替代的防漏面、五步选层程序、一个事故回路——核心是让「漏」变成红灯、显式豁免、
   可见跳过或可追溯的复盘，而不是靠更聪明的测试作者。
2. **本仓的强项不是「测试全」，是「发现得快」。** 五面验收合同、exit 0/1/2、真模型档
   closed set、探针登记制、探索协议，在 2026-11-11 起五轮探索里以 79 张 BUG（BUG-081..159）
   证明了「回归绿 ≠ 新输入不静默放行」。这是 DSH 也没有成文制度化的一面。
3. **真正的差距在「发现之后」。** 我们的多数修复是**实例级**（为报出的那个输入加一条测试），
   不是**类级**（为这一类输入加一个矩阵/清单/同源合同）；因此同一族会以邻接变体复发
   （readiness 074→141→150、方法库 heading 081→085→093→123→124→127→128→138、
   锁/端口 073→104→113→114→126→130）。
4. **第二差距是昂贵层的必需性。** DSH 把「模型可见变更必须同 PR 加强制快照」写进政策并由 CI
   执行；本仓的 `snapshot-replay.entry` 是 162s 的 dev-only 档，任务型路由表把 L4-lite 列为
   必跑面，却没有把更便宜、更可靠的 keyless 组装请求 diff 放进 required 路径。
5. **第三差距是账本。** 我们不知道每条慢资产「唯一证明什么、判据核在哪、最近一次真绿是什么、
   什么时候该退役」；`smoke-registry` 只有 `ci/dev-only` + 理由。`test-asset-fence` 已把这件事
   量出来并立了 S2，但还没落地。
6. **第四差距是「未覆盖」的显式化。** DSH 的 PR 账本有一行「显式未覆盖」；我们的交付收口有
   「未跑分列」，但没有一份按变更面写「哪类失败没证、为什么、留下什么」的标准账本。
7. **第五差距是学习回路。** 159 张 BUG 有根因、有修复、有反证，但缺少一次「为什么流程放它
   过去」的复盘；`notes/README` 有事故复盘规则，却没有触发条件，于是规则空转。
8. **不该照搬的也很清楚**：vitest / per-file 100% 覆盖 / 七层宪法层 / run-gates DAG /
   多 OS 矩阵 / benchmark tier / Python SDK / 四快照面——本仓 D26 已把测试栈钉在 node:test，
   规模与产品面也不支持这些形态。照搬会得到一套更慢、更脆、没人维护的迷你 DSH。
9. **长期正确的做法 = 三环 + 四账 + 五关**：回归环（快、keyless）、装配环（真入口）、
   发现环（探索/变异/复盘）；资产账、失败类账、证据账、探索账；准入关、变更类关、必需关、
   退役关、复盘关。它不是新框架，而是把已有资产与已有探索协议接成闭环。
10. **首批落地按杠杆排序**：① 客户端纯逻辑/纯函数的直测面（S1）；② smoke 成本/唯一证明面/
    判据核台账（S2）；③ 宿主半运行时导出守卫（Loader `unwrapExports` round-trip）；④
    快照 A/B 进 CI（先做 profile 预备的可行性 spike）；⑤ 证据账本模板 + 一次探索波复盘。
    前四件是把已有证据变可信，第五件是把已有发现变制度。

## 1. 证据与方法

> 读法：15 分钟 = §0 + §4 + §7；1 小时 = 加 §2（DSH 骨架）+ §3（本仓现状）+ §5（失败史）+
> §6（借/缩编/不借）；要落地 = §8（路线）+ §9（拍板点）。附录 A/B 是引用锚点，不必通读。

### 1.1 DSH 侧

- **消化稿**：`_digested/test-strategy/` 16 篇（00-map 到 15-plugin-testing-contract）。
  其 `catalog.json` 自报基线 = `dsh-v0.2.1-rc.5` @ `b830ec950f`，与本仓 pin 相同；但页面
  核验状态是混合的：00/02/03/04/05/12/15 为 `reverified`，01/06–11/13–14 为 `carried`
  （来自旧基线 `639ed01539`）。**本文因此不把 digest 当唯一事实源**：关键机制回到
  `vendor/dsh` 源码/配置/政策逐条核验；digest 只提供组织与解释。
- **一手源**：`vendor/dsh/docs/testing.md`（55 行政策）、根 `AGENTS.md`、
  `snapshots/AGENTS.md`、根部 8 份 `vitest*.ts`、`scripts/run-gates.ts`、
  `.agents/skills/{dsh-pre-push-checks,dsh-ci-test-reliability,dsh-code-review}`、
  `.agents/notes/implemented/testing/`、`docs/postmortem/0001–0004`、`packages/AGENTS.md`、
  `packages/test-support/*/README`、`benchmarks/AGENTS.md`、`.github/workflows/{ci,e2e,sandbox}.yml`。

### 1.2 本仓侧

- 验收合同：`docs/evaluation.md`（L0–L4、退出语义、完成判断四分离、判据形状、已知限制）。
- 执行程序：`docs/guides/60-dev-loop.md`（任务型路由表、全档命令、收尾五件）。
- 资产与命名：`tests/AGENTS.md`、`scripts/AGENTS.md`、`scripts/README.md`、
  `snapshots/README.md`、`probes/README.md`、`tests/fixtures/README.md`。
- 机械面：`scripts/verify/context.mjs` 的 55 道门禁、`tests/contracts/{test-surface,
  smoke-contract,smoke-registry,layering,verify-gates}.spec.mjs`、`scripts/smoke/registry.json`。
- 失败史：`_backlog/_archived/fixed_bugs/` 的 159 张卡、
  `_backlog/issues/2026-11-11-exploratory-test-strategy.md`（1847 行探索协议与逐轮记录）、
  2026-11-12/13 的五个批量修复提交（`252c2fd7`、`d966fa31`、`275b8c03`、`bb0323ac`、`4d6308c9`）
  与 D51 判据形状提交（`7b504d48`、`9f64b3a7`、`b64d170b`、`88cc38b6`、`d49b5e9f`）。
- 成本侧：`_backlog/research/test-asset-fence/2026-11-13-test-asset-fence.md` 的实测
  （`gates.e2e` 202s、`snapshot-replay` 162s）；本文复测快环（`pnpm verify` 3.91s、
  `pnpm test` 4.59s / 1409 例）。

### 1.3 口径

- 「本仓」= 本 git 仓，不含 `runtime/`、`research-workspace/` 运行区。
- 「昂贵层」按墙钟与前置分，不按有没有凭据分：`snapshot-replay` 机制上 keyless，但 162s
  已进入慢档；`preset.e2e` 起真 DSH 但 3.8s，仍在快/中档。
- 「强/弱」不是价值判断，是**证据形态与失败类的匹配度**：某一层强，只代表它对其目标失败类
  可见，不代表它能替代另一层。

## 2. DSH 的测试策略骨架

> 本节不复述 16 篇；只抽「为什么这套东西能防止绿而空」的骨架。逐条原文与一手源见
> 附录 A。

### 2.1 一句话：让绿有意义

DSH `docs/testing.md` 的开篇定语是：

> "How this repo tests, tier by tier, and the rules that keep a green suite meaningful."

这句话决定了整套政策的方向：**规则的目标不是让测试变多，而是让「绿」仍然能作为合并判据**。
所有具体条款都可以从这个目标推出来：

- 覆盖率高不等于产品能装（postmortem 0001：178 个绿单测 + 100% 行覆盖，ACP 仍在生产崩）；
- 单测绿不等于 Loader 装得上（hand-built `ctx.plugin(...)` 不算组装证据）；
- agent 自报成功不等于世界被改了（verify the world）；
- 全跳过显示绿不等于跑过（preflight 硬失败、skipped 判红）；
- 刷新期望不等于行为正确（record/refresh 后每个 diff 人工 review）。

### 2.2 七层与「后缀即层」

DSH 不按 unit/integration/e2e 三分，而按**证据形态 + 入口真实性**分七层：

| 层 | 证据形态 | 入口真实性 |
|---|---|---|
| Unit | 进程内行为、边界、错误路径、事件顺序、并发竞态、HMR dispose | src 就近，真依赖 + 脚本化模型 |
| Coverage gate | per-file 100%，死代码探测器 | 与 unit 同一运行，但独立门 |
| Real-API e2e | 真模型/真 provider，无 key 自跳过 | 真进程、真 API |
| Owner-local expected | 无录制往返的组装输出 | 驱动 built exports |
| Performance benchmarks | 时间/堆/缩放预算，预算常量自身有测试 | 编译 worker + plain Node |
| Snapshot | 录制会话回放，组装后的完整转录 | shipped profile + 真进程 |
| Web browser snapshot | 浏览器/ARIA/布局证据 | 真 Chromium（picker 另跑 WebKit） |

关键在于**层的成员资格是穷尽的**：根部 vitest 配置用 include/exclude 把测试文件空间切完，
一个文件属于哪层由后缀 + 目录唯一决定；`tests/harness.ts` 刻意放在 include 之外，import 它
不会重复注册 `describe`、不会重复真实 API 调用。命名即所有权：`expected` 而非 `golden`，
`*.expected.e2e.ts` 与 `*.e2e.ts` 互斥，`snapshot.yml` 拥有场景声明。

> 口径修正（一手源核验）：8 份运行配置 = **6 条自动车道 + 2 条手动 lane**
> （`vitest.web-stress.config.ts` / `vitest.web.perf.config.ts`，注释明写不进默认 inventory）。
> digest 有时把 8 份都算进「宪法层」，本文按「自动 / 手动」分开；「手动不进 required」的结论
> 反而因此更硬。

### 2.3 六个防漏面 + 一个回路

DSH 不靠「多写测试」防漏，而把漏降解成可见的红灯、显式豁免、可见跳过与可追溯复盘。消化稿
归纳为 M1–M7（这是解释框架，不是 DSH 术语）：

| 面 | 机制 | 把哪种漏变成什么 |
|---|---|---|
| M1 空间完备 | 后缀 + 目录唯一选中；新后缀必须同时改配置 | 「有一份测试没人跑」→ 很难 |
| M2 执行下限 | `packages/*/*/src` per-file 100%；豁免逐条带理由与移除条件 | 「这行没测」→ 红，或进豁免账本 |
| M3 变更类触发 | 模型/协议/人可见 → 同 PR 快照；product-visible 插件 → REAL composition；每个 registry → HMR-safety；每条验收规则 → 负控 | 「忘了测这类东西」→ 规则不允许 |
| M4 真实入口 | REAL composition、shipped profile、built `lib/` + plain `node` | 「测了个手搭假货」→ 可见 |
| M5 验证世界 | 重跑命令/重读文件/断言未改动文件逐字节相同 | 「agent 说成功」→ 不算 |
| M6 跳过可见 | 必需 job 的 skip 判失败；缺 secret preflight 硬失败；CI 只读 replay | 「静默 skip」→ 红 |
| M7 复盘回路 | postmortem 列 guardrails；Agent Note 记决策；政策随事故增长 | 「同类漏再犯」→ 有记忆 |

这套机制的关键不是每一条多强，而是**六面同时存在**：少一个面，就有一种漏法穿过其余五个；
少了回路，同类漏会在下一轮重演。DSH 的四篇 postmortem 各自钉住一种面：0001 钉 M4/M3，
0002 钉 M5/M7（快照 refresh 接受错误转录），0003 钉分层真路径，0004 钉原生边界。

### 2.4 五步决策程序 + 七问 + PR 账本

消化稿把 DSH 的实践提炼成五步（这是提炼，不是 DSH 成文流程）：

1. **分类**：这次变更属于哪一类失败？（纯逻辑/服务/插件导出/工具/模型文本/persistence/
   provider/子进程/Client UI/配置/性能/文档）
2. **选层**：最便宜、但**确实能看见**该失败类的层是哪层？先问「这是不是静态不变式」，
   能用 `verify-*`/lint 证明的就不写运行时测试。
3. **证明会红**：引入目标回归，确认证据变红，再恢复；守卫型插件要测「什么时候不做」。
4. **验证世界**：断言外部状态，不信自测；快照 mutating 场景比对完整 `workspace.expected/`。
5. **判够 + 记账**：七问（会红吗/真入口吗/验世界吗/模型可见钉住了吗/最低层吗/跳过可见吗/
   并发平台 teardown 可重复吗）+ PR 证据账本 + 显式未覆盖。

七问里最容易被忽略的是第 5 问（最低层）和第 7 问（可重复）。DSH 的反模式清单直接点名：
用 e2e 测纯逻辑、为凑绿加 retry/sleep/弱化断言/改 normalizer、把手动 lane 放进 required。

> 归属提醒：五步程序、七问、账本模板都是 digest 05 的**提炼**，不是 DSH 成文流程；DSH 成文的
> 只有 `testing.md` 的条款与 `.github/pull_request_template.md` 的 `## Testing`/`Proof` 节。

### 2.5 所有权：政策 / 命令 / 理由三个家

DSH 的测试规矩不在一个文件里，而按「谁需要什么时候看到」分三处：

- **政策**：`docs/testing.md`——每个 tier 一句话、每条规则链到 owning note；
- **命令**：根 `AGENTS.md` 的 Commands 节——只写命令，不写理由；
- **理由**：`.agents/notes/implemented/testing/`——为什么这么定、放弃了什么；
- **局部契约**：`snapshots/AGENTS.md`、`packages/AGENTS.md`、各包 README 的已知限制；
- **操作步骤**：`docs/cookbook/`；
- **事故**：`docs/postmortem/`——唯一允许 war-story 叙事的层。

这个分层的实质是**上下文经济**：每个 session 只加载常驻条令；碰到快照再看快照所有权；
碰到插件再看包规则；要改政策再看 note 理由。规则改变时只改 owner，不在 AGENTS 里复制。

### 2.6 CI 与可靠性：让「没跑」不可能伪装成「过了」

DSH 的 CI 不是散装 workflow，而是 `scripts/run-gates.ts` 的可编程门禁图；workflow 只调用
聚合模式。关键语义：

- **单一 required check**：`all-checks-passed` 聚合 9 个必需 job，任何 `failure/cancelled/
  skipped` 都判红——「没跑」不算「过了」。
- **with-key 独立 workflow**：fork/Dependabot 跳过；缺 secret 的 preflight **硬失败**，
  防「全跳过 = 假绿」；`DEEPSEEK_BASE_URL` 钉死官方端点。
- **自跳过即失败**：sandbox 矩阵在跑之前数「应该过的文件数」，套件悄悄自跳过会被 grep 拦下。
- **观察性显式化**：不能稳定跑的门用 `allowFailure`/`continue-on-error` 保留结果但不进
  required；手动 lane（perf/stress）不进任何 CI 执行清单。
- **可靠性单向归因**：共享 host/volume 上只有进程隔离；「单跑才绿」永远算 spec 缺陷，
  不许赖 runner。retry 只给真 API e2e；确定性层禁止 retry。资源从获取到 teardown 归测试所有；
  「abort/close/kill 而不 await 完成信号」不算清理。

### 2.7 插件五台阶

DSH 对插件作者的测试要求可以压成五级台阶（13–15 篇；本仓 `guides/62` 已移植过一版）：

1. **导出形态守卫**：function 插件具名导出 `name/inject/Config/apply`，无 default；
   `expect('default' in mod).toBe(false)` + `Loader.prototype.unwrapExports` round-trip +
   `name/inject` 断言。事故原型 = postmortem 0001。
2. **行为 spec**：挂真依赖服务，只 stand-in 最外层（模型 adapter/网络/时钟）；从注册后的
   真入口调用，断言 schema、拒绝路径、错误结果、session log 副作用。
3. **注册生命周期**：每个 registry 贡献都要有 HMR-safety 测试——dispose 贡献 fiber，
   断言移除，且服务 built-in 不受影响。
4. **REAL composition**：test-only `cordis.yml` 走真 Loader + app/process；两级——进程内
   Loader boot（证明 Config 是真配置）与子进程 Loader smoke（证明发布形态组装）。
5. **组装转录**：模型/协议/人可见变更同 PR 加/更新 keyless recorded-session 场景；
   package/e2e/mock/rationale 都不能替代 assembled transcript。

15 篇进一步**提炼**出三种采用等级（L0 内部 / L1 产品可见 / L2 发布型）、十条契约、PR 账本与
最小编排。注意：这是 digest 的缩编契约，**不是 DSH 成文**——rc.5 树里没有 L0/L1/L2 术语、
没有对应的门禁文件；同样，「台阶 4 分进程内 Loader 与子进程 smoke 两级」也是 digest 对可观察
实现分工的提炼，DSH 政策只有一句 `boot test-only cordis.yml through Loader and app/process`。
它的价值不在「照抄五台阶」，而在**按插件承诺选组合**：工具插件承诺行为与 Config，
provider 承诺可选性与拓扑，guard 承诺「什么时候不做」，UI 承诺组装与文案。

### 2.8 probe：证据选择器，不是测试资产

DSH 的 `probe` 不是术语表里的对象，而是一种**问事实的动作**；产物是分叉、判断或事实，
从来不是测试资产。它在防漏体系里的位置是**证据选择器**：决定一条用例跑不跑、一个文件
豁免不豁免、一个平台 skip 不 skip。最重要的纪律是：**探针与它守护的判断必须同源**——
如果豁免用的探针比用例用的判据更宽，就会出现「用例其实要跑、却被豁免掉」的假绿。

## 3. 本仓现在是什么

> 这一节只写事实；评价与差距在 §4。

### 3.1 五面合同与三轴

本仓的验收轴不是测试金字塔，而是三轴并用（正本 = `docs/evaluation.md`、
`docs/project-map.md` 的测试词汇对照）：

| 轴 | 回答 | 载体 |
|---|---|---|
| 档位 | 凭什么跑（keyless / 真模型 / 浏览器 / 未跑） | `AGENTS.md §密钥`、`smoke-contract` 的 REAL_MODEL closed set |
| 验收面 | 证明了什么（L0–L4） | `docs/evaluation.md` |
| 命名即层 | 住哪、怎么选（`*.spec.mjs` / `*-smoke` / `*-probe` / `*-gate/audit/scan`） | `tests/AGENTS.md`、`scripts/AGENTS.md` |

五面：L0 结构（55 道门禁 + 1409 例 keyless 回归）、L1 真挂载（`preset.e2e`）、
L2 安装（`release.entry` 等）、L3 方法论完整性（映射表 + 契约）、L4 真模型交付
（L4-lite / 完整 run）。每面的退出语义统一为 0 绿 / 1 红 / 2 未跑；未跑 ≠ 通过。

### 3.2 资产盘点（实测）

| 族 | 数量 | 入口 | 档位 / CI |
|---|---|---|---|
| L0 门禁 | 55 道 | `pnpm verify` | keyless；CI keyless job |
| keyless 回归 | 176 文件 / 1409 例 | `pnpm test` | keyless；pre-commit + CI |
| 门禁自测 | 108 注入案例 + 7 对照 | `scripts/smoke/gates.e2e.mjs` | keyless；CI keyless job（202s） |
| 分级冒烟 | 28 个 | 按任务路由 | 8 个 CI（keyless / client-load / deploy），20 个 dev-only |
| 探针 | 8 支（行为 6 / 浏览器 1 / 流仪器 1）+ 索引生成器 | `probes/` | 真模型 6 / 连已起 GUI 1 / 仪器 1；不进默认回归 |
| 场景回放 | 1 族 / 4 角色 case | `snapshot-replay.entry` | keyless，但 dev-only（162s） |
| run 门 | 7 个 | 随 run 验收 | keyless |
| run 观察/运维 | 14 个 | 诊断/验收 | keyless |
| 夹具 | 249 文件 | `tests/fixtures/` | 零孤儿由 navigability 契约把守 |
| 失败史 | 159 张 BUG 卡 | `_backlog/_archived/fixed_bugs/` | 23 P1 / 119 P2 / 17 早期未标 |

快环复测：`pnpm verify` 3.91s、`pnpm test` 4.59s（1409 例，本机热跑；同机负载下另一次
复测 9.0–13.6s，口径见附录 C）。慢档引用
`test-asset-fence` 实测：`gates.e2e` 202s、`snapshot-replay` 162s。

### 3.3 已经吸收的 DSH 纪律

本仓不是从零开始。`docs/discipline-map.md` 源 2 与源 10 已把 DSH 测试教义逐条对表；
`notes/implemented/2026-10-04-test-strategy-adoption.md` 记录了 2026-10-04 的 11 篇 digest
吸收。已经落地的包括：

- 档位与 with-key 分层、verify the world、真入口路径、mock 只放边界；
- 证据匹配面（任务型路由表 + `guides/62` 五台阶）、prove-it-red、fix fixtures not normalizers；
- 防假绿 verdict 0/1/2、真模型档 closed set、`gates.e2e` 对照组、`guard-red-record`；
- 命名即层（后缀申报证据类型与档位）、`SMOKE_ONLY` 登记、fixture 零孤儿；
- 快照 A/B/C 三层判据、`--update-expected --why`、record/refresh 分叉、B 层组装请求 diff；
- probe 登记制与头注六字段；探索协议 E1–E6（本仓自创，非 DSH）。

### 3.4 机械把守 vs 散文约定

| 规则 | 机械把守 | 还是散文 |
|---|---|---|
| 回归层 keyless | `layering` 五件套 | — |
| 每个 `scripts/lib`/pack `src/lib` 有直测 | `test-surface` | 直测质量仍靠 review |
| 每个 smoke 有 CI/dev-only 归属 | `smoke-registry` | 成本/唯一证明面/判据核/退役条件无机械面 |
| 真模型档 closed set | `smoke-contract` | — |
| 门禁有反证 | `gates.e2e` 108 案例 + `verify-gates` 对照 | 部分结构性例外只有一次性红录 |
| BUG 标题带编号的测试有红配方 | `guard-red-record` | 只咬标题带 BUG / 文件名含 conformance 的两类 |
| 模型可见变更同 PR 更新快照 | 无 | 任务型路由表 + 人审 |
| 慢夹具与判据同源 | 无（S0 只修了 run-accept 一处） | `tests/AGENTS`「改夹具先想红」 |
| 客户端纯逻辑有直测 | 无（S1 未做） | `tests/AGENTS` 域映射 |
| 新资产有唯一证明面/成本/退役 | 无（S2 未做） | `smoke-registry` 理由一句话 |
| 交付有证据账本/显式未覆盖 | 无 | `reviewing-a-delivery` 口头检查 |

### 3.4.1 已测的文档漂移（不是本文结论，是「docs 会腐」的证据）

| 位置 | 文档说 | 盘上/代码实际 | 处置 |
|---|---|---|---|
| `docs/evaluation.md` §L0 反证口径 | 结构性例外 5 个 | `NO_CASE_GATES` 6 个（漏 `staged-change-pairing`） | Phase 1 E 同 diff 改 |
| `probes/README.md` behavior「现有」 | 4 支 | 盘上/索引 6 支 | 同上 |
| `scripts/README.md` smoke 表 | 25 行 | 28 个文件（3 个 client-load 支援件在 `client-load.entry` 行内点名） | 同上 |
| `docs/external-materials.md` digest 行 | 11 篇 @ `639ed01539` | 16 篇，catalog 基线 rc.5，7 篇 reverified / 9 篇 carried | Phase 1 E 同 diff 改 |
| `docs/guides/66-probe-playbook.md` | `:140` 与 `:152` 对同三格空白两套说法 | 应合并成一套「已有证据但不是探针」 | Phase 3 P |
| `scripts/lib/replay-scene.mjs` | 头注「six B judges」 | `JUDGES` 5 项（`time-context` 另并） | Phase 3 P |

这些漂移不影响本文的机制结论，但说明：**DSH 的 `docs/testing.md` 自己也会过期（examples 路径
不存在），本仓的合同文档也会**。所以「一手源核验」不是一次性动作，而是每次引用前的动作；
Phase 1 E 只修已测的六处，不假装把所有文档都对齐了。

### 3.5 探索协议：本仓的独特资产

`_backlog/issues/2026-11-11-exploratory-test-strategy.md` 提出了 E1–E6：

- **E1 变更面盘点**（git 驱动）：按机制归组，优先级 ≈ 改动量 × 合同密度 × 证据薄度 ÷ 成本；
- **E2 最低可观察层**：纯函数 → 门禁/契约 → L1 → 回放 → 探针 → L4，默认往下走；
- **E3 四条无规格 oracle**：散文合同变异、表示层差分、回放差分、后验取证；
- **E4 探针加速**：降级、放大（一次 boot 多场景）、取证复用；
- **E5 charter 纪律**：一条 charter 一个可证伪命题，七件齐全，至少一条负对照；
- **E6 分诊与毕业**：真缺陷 → bug 卡；歧义 → 用户/D 号；空假设 → 记「已探索、无发现」；
  可机械化的一类 fail-open → 先红后绿再登记台账。

这套协议在五轮里产出 BUG-081..159 共 79 张卡，覆盖客户端 hook 竞态、跨会话残留、路径/
symlink 越界、锁/端口身份、判据关键词、快照 turn 语义、manifest 消费者遗漏等。它回答的是
「新东西在没被写进测试的输入上会不会静默放行」——这是回归天生回答不了的问题。

### 3.6 本仓强于 DSH 成文面的地方（不要只看见差距）

对标不是单向抄。以下几条是本仓已经做成、而 DSH 只有散文或更弱形态的：

1. **金标准重写有理由强制**：`--update-expected` 必带 `--why <载体>`，加上
   `staged-change-pairing` 的「`ui.expected` ↔ `snapshot.lastRewrite`」配对门。DSH 的对应
   条款是「review every resulting diff」的散文；本仓把「谁允许重写」做成了机械前置。
2. **场景守卫先于比较，且在 CI**：`replay-scene` 的 14+ 条结构守卫（相对路径/穿越/symlink/
   roster 全等/case id 唯一/fixture 路径不重复/provenance 形状）由 `replay-scene.test` 拿盘上
   真场景对账，keyless 进 `pnpm test`；DSH 的同类守卫跑在 snapshot lane 里。
3. **B 层双向覆盖自守**：基线不得携带未登记注入种类，回放不得出现基线外种类——这是
   BUG-018「声明的覆盖 > 实际的覆盖」的修复形态，DSH 的 digest 没有对应表述。
4. **真模型档 closed set**：`smoke-contract` 把「要求凭据的入口」机械钉成 10 个名单，并钉
   preflight exit(2) 与收尾 exit(0/1) 形状；DSH 只有「各 suite 自跳过 + preflight」，
   没有「名单恰好相等」这一层。
5. **probe 登记制**：头注六字段 + 生成索引 + `probe-registry` 门禁，把「探针不证明什么」变成
   可对账字段；DSH 的 probe 是产品代码里的局部动作，没有仓级登记。
6. **探索协议与失败史**：E1–E6 + 159 张 BUG + 79 张探索期卡，是本仓独有的「发现未知失败类」
   资产；DSH 的 anti-omission 主要防已知类，没有成文的探索循环。
7. **完成判断四分离与 exit 2**：能加载 ≠ 有行为证据 ≠ 能安装 ≠ 已获批准；未跑显式分列。
   DSH 有 same-spirit 的条款，但没有把这四个结果做成一张合同表。

这些强项说明：本仓不需要「变成 DSH」，需要的是把**已经强的地方接到制度上**，把**弱的地方
缩编成可执行的几条**。

## 4. 差距矩阵

> 评分为「本仓相对 DSH 的成熟度」，不是绝对分数：● 已具备且机械把守；◐ 有等价物但弱/未入
> required；○ 无对应物或只有散文。最后一列是**决定**：借鉴 / 缩编 / 不适用。

| # | 维度 | DSH | 本仓 | 差距 | 决定 |
|---|---|---|---|---|---|
| 1 | 政策与教义 | 55 行 `testing.md` + 根 AGENTS + note 理由，一个事实一个家 | `evaluation.md` 257 行 + `tests/AGENTS` + `scripts/AGENTS` + `guides/60` + `discipline-map` | ◐ 规则齐但分散；没有一句「绿为什么有意义」的总纲；复述点多 | **缩编**：加一节短政策/总纲，不新增第七份文档 |
| 2 | 分层与命名 | 七层 + 后缀穷尽 + 8 配置 + expected/golden 命名门 | 三轴 + glob + 后缀申报 + smoke closed set | ● 命名已强；◐ 缺「测试文件空间穷尽」检查（错后缀静默不跑） | **缩编**：加 lane-membership 契约，不搬七层 |
| 3 | 资产分布与成本 | 宽底窄塔尖；昂贵层按失败类；成本参数即声明 | 快环 4.6s；慢档 202s/162s；无成本/唯一证明面台账 | ◐ 快环健康；○ 慢资产无账本、无退役条件 | **借鉴**：S2 台账 + 准入/退役关 |
| 4 | 防漏 M1 空间 | 后缀+目录穷尽 | glob 递归；smoke/probe/fixture 有登记；测试文件无 lane 检查 | ◐ 新 `.spec.mjs`/错目录不会红 | **缩编**：lane-membership |
| 5 | 防漏 M2 执行 | per-file 100% 死代码探测器 | `test-surface` 只覆盖 `scripts/lib` + pack `src/lib`；`src/client` 缺口；`no-unused-code` 只证零引用 | ◐ 宽底有洞（客户端 36/59 无直测，约 19 无任何测试路径）；无覆盖率门（有意） | **缩编**：客户端 surface + hook 测试，不设百分比门 |
| 6 | 防漏 M3 变更类 | 模型/协议/人可见 → 同 PR 快照；插件 → REAL composition；registry → HMR | 任务型路由表；export-shape 静态；`client-effect-wrap` 静态；快照靠路由表 | ◐ 规则在，机械不在；HMR 行为面空缺 | **借鉴**：变更类关 + 运行时导出守卫 + HMR 行为测试（小范围） |
| 7 | 防漏 M4 真入口 | Loader + app/process；built `lib/`；shipped profile | L1 源码域、L2 安装域、client-load、bundle-composition | ● 大体具备；◐ 快照仍是 dev profile，未进 CI | **缩编**：快照 CI + profile 预备 |
| 8 | 防漏 M5 验世界 | 重跑/重读/字节比对；mutating `workspace.expected/` | evidence-audit、client-load 盘侧真值、watch-run 谓词 | ● 强；◐ 快照只比转录/UI，不比 bundle 世界树 | **缩编**：快照世界树（后续）；现有 manifest/hash 可复用 |
| 9 | 防漏 M6 跳过可见 | required skip=failure；preflight 硬失败；CI 只读 replay | exit 0/1/2、closed set、preflight、`--why` | ● 强；◐ 快照不在 CI；无 required 聚合（当前 job 全跑，问题不大） | **缩编**：快照 CI 是主要缺口 |
| 10 | 防漏 M7 复盘 | 4 篇 postmortem → guardrails；note 记理由 | 159 张 BUG 有根因/修复/反证；`notes/README` 有复盘规则但无触发 | ◐ 个体修得好；○ 缺「为什么流程放它过去」与类级沉淀 | **借鉴**：复盘触发 + 类级守卫规则 |
| 11 | 决策程序 | 五步 + 七问 + PR 账本 | 任务型路由表 + `writing-a-gate` + `reviewing-a-delivery` + 反证 | ◐ 程序在，但按任务型而非失败类；无标准账本；显式未覆盖不强制 | **借鉴**：失败类→层表 + 证据账本 |
| 12 | 快照 | 同 PR 强制；世代；四面；world tree；corpus | A/B/C 三层；1 族 4 case；record/refresh 分叉；`--why` | ◐ 机制设计好，但覆盖窄、不在 CI、无 world tree/corpus | **缩编+借鉴**：先 CI 与族扩展，不搬四面 |
| 13 | probe/探索 | probe 是选择器；同源判据；flake 阶梯 | 8 支探针 + 头注 + 索引 + 探索协议 | ● 探针与探索强于 DSH 的成文面；◐ 探索未毕业成常驻实践 | **保留+毕业**：不改造探针，改造探索制度 |
| 14 | CI/可靠性 | required 聚合、preflight、flake 八类、资源所有权 | 3 job、exit 2、closed set、port/lock/host-health；无 flake 分类；多处固定 sleep | ◐ 防假绿强；○ 无 flake 纪律；慢档归属倒挂 | **借鉴**：flake 最小集 + 快照 CI；不搬 run-gates DAG |
| 15 | 测试基建 | test-support 七件套 + known limitations | `scripts/lib` + `web-harness` + fixtures；无 known limitations 节 | ◐ 集中但缺「这个 harness 证明不了什么」的成文 | **缩编**：给共享 harness 加一段已知限制 |
| 16 | 资产退役 | expected-filenames、豁免移除条件、snapshot 世代不可变 | 无退役条件；`e2e-021rc2.entry` 仍活；安装档重叠 | ○ 慢资产只增不减 | **借鉴**：S2 sunset + 季度复核 |

## 5. 失败史告诉我们什么

> 这一节的数据来自 159 张 BUG 卡与探索记录；精确计数以卡面与提交为准，不把「已归类样本」写成全量。

### 5.1 失败类分布（按可归类的卡）

本次逐卡深读 60 张（其中探索期 38 张），按**造成漏检的主类**计数：双份事实漂移 11、假绿/
判据代理化 10、状态/竞态/生命周期 9、静默接受/fail-open 8、消费者遗忘 5、夹具漂移 4、假红 4、
边界/解析 3、文档/规则漂移 2、其他（进程身份）2、路径/安全 1、安装/发布 1。**已归类 60 / 全量
159（37.7%）**；其余 99 张只用于背景与复发链核对，不进入计数——不把样本写成全量。

| 失败类 | 典型 BUG | 为什么回归没抓到 |
|---|---|---|
| 静默接受/fail-open | 050（通道缺席零提示）、056（投影不可解析零 finding）、153（`protocol/v1.json={}` 也 PASS） | 测试按 happy path 写；缺「看起来像该字段但解析不了 → 红」的变异矩阵 |
| 边界/解析变体 | 081（全角括号）、093（`*`/`+`/缩进/全角冒号）、121（行尾注释）、127/128（半角/全角空白） | 一个输入一条测试；没覆盖语法邻接形态 |
| 消费者遗漏 | 076（schema 白名单漏新件）、154（manifest 角色表漏新证据）、159（claims evidence/topics 不校验） | 新实体出现时，消费者清单不在代码里；只有生产者测试 |
| 双份事实漂移 | 040（readiness 两份）、084（模板↔解析器）、102/112/125（plan 版本三处）、159（散文↔JSON） | 没有同源 codec；两份副本各自有测试 |
| 状态/竞态/生命周期 | 086/087/108/117/119（跨会话 stale/race）、097/114/126/130（lost update/锁） | 单会话单线程路径；缺 session switch/并发/失败注入矩阵 |
| 路径/符号链接/安全 | 110（run source symlink）、111/120（方法库 symlink/hardlink）、104/113（端口误杀） | 只用正常路径；缺逃逸/身份/权限负例 |
| 假绿 | 147（0 题也 PASS）、057（FAIL 仍 exit 0）、151（点击计数当已答） | 断言选错层/关键词；没有盘侧真值对账 |
| 假红 | 142（选错会话）、152（主机不健康判产品红） | 判据与选择器混在慢壳；没有 oracle 直测 |
| 夹具漂移 | run-accept ⑦（S0）、018（声明的覆盖 > 实际覆盖） | 夹具没有「当前判据仍接受」的同源合同 |
| 文档/命名/规则漂移 | 072（子串误伤）、071（根角色身份注入） | 门禁词表/文档与语义不同源 |

补充事实：**130/159 张卡的 BUG 号出现在 `tests/`**；探索期 79 张（BUG-081..159）中 **73 张有
BUG 号痕迹**，6 张没有标题级引用（095、106、108、112、113、136）；其中 **095（bootWeb timer
泄漏）与 136（defaults-probe 端口自锁）没有永久性 keyless 守卫**——一个只有一次性探针，一个
只有探针实跑。另有 028（一次性故障 harness）、079（只 smoke 实跑）、143（只断言 persona 句，
不断言运行时工具面）、072（无测试）、080（基线 source 无新鲜度门禁）、055（en 运行面无浏览器档）
属于「修了但没沉淀」。`guard-red-record` 只证明「负例留证文本在场」，**不证明红录真的跑过**；
合并标题（如 `BUG-091/106`）只登记首个号。这两条是「发现 → 永久守卫」毕业率不可数的直接证据。

### 5.2 五种漏检机制（比失败类更值得记）

1. **Happy-path 测试**：实现者按同一条路径写测试，边界由探索者补。DSH 的对策是
   「edge cases, error paths, event ordering, concurrency races first」+ 负控；我们的对策
   已经写在 `tests/AGENTS`，但没有变成「新判据必须带矩阵」的准入条件。
2. **实例修而非类修**：报出的输入加一条测试，邻接输入下次再报。典型是方法库 heading
   （081→085→093→123→124→127→128→138）与 readiness（074→141→150）。这是本文认为
   **最该制度化**的一条。
3. **双份事实**：模板与解析器、散文与 JSON、源与 dist、present 与 final。每次修一处，
   另一处继续漂。DSH 的对策是「one home per fact」+ 真实入口；我们的对策应是
   **同源 codec 或 round-trip 契约**，不是再加一条 grep。
4. **消费者清单不在代码里**：新件出现，schema/manifest/readiness/cockpit/文档注册表各自
   有一份手写清单。DSH 用「每个 registry 的 HMR-safety + REAL composition」把消费者拉进
   测试；我们需要一个**消费者矩阵**（新实体 → 所有消费面）作为评审/测试模板。
5. **慢壳判据**：选哪个对象、算不算过，写在 200s 的浏览器/安装脚本里；判据错了只能等慢档
   才发现。`test-asset-fence` 已把「判据核先抽」写成规则，S2 是它的执行面。

### 5.3 为什么「回归绿」不能回答这些问题

回归回答的是「旧行为被改坏了吗」；探索回答的是「哪些输入会让系统**静默**地做错事」。
前者的 oracle 是已写下的断言，样本是固定清单；后者的 oracle 是散文合同、双份事实、回放金样、
既有现场；样本是变异/边界/矛盾，不可枚举。把探索发现直接塞进回归，只能得到「这次不再犯」，
得不到「这一类不再犯」。所以长期正确的不是「多跑探索」，而是**探索发现 → 类级守卫**的
毕业机制。

### 5.4 复发链是类级缺口的直接证据

| 族 | 链 | 共同缺口 |
|---|---|---|
| readiness 判定 | 074 → 141 → 150 | 用有限关键词表做语义判断；缺「剥包裹范围 + 取最后裸写」的不变量 |
| HITL2 词汇 | 075 → 096 → 140 → 144 → 149 → 156 | 中英/挂起/版本/行数多轴；缺一张互斥判型矩阵 |
| 方法库 heading | 081 → 085 → 093 → 123 → 124 → 127 → 128 → 138 | 标题语法有 name/provenance/marker 三段；缺单一 codec + 语法矩阵 |
| 锁/端口 | 073 → 104 → 113 → 114 → 126 → 130 | 身份/存活/释放三件事；缺资源所有权模型 |
| present/版本 | 101 → 103 → 116 | 「最后一条 present」与「最高版本」两语义；缺单一权威点 |
| plan 版本 | 102 → 112 → 125 | 头/记录/正文三处；缺同源解析 |
| 跨会话状态 | 086 → 087 → 108 → 117 → 119 | hook effect 无 reset/epoch；缺 session-switch 矩阵 |

这些链说明：**每张卡都修对了，但修复的粒度不对**。类级守卫不是「更多测试」，而是
「把这一族的语法/状态空间变成可生成的矩阵，并让矩阵成为测试文件的形状」。

按频次排序，最该制度化的五类是：**双份事实漂移、假绿/判据代理化、状态/竞态/生命周期、
消费者遗忘、夹具漂移**；路径/安全单列第六（样本少，但严重度高）。

### 5.5 六条反模式（从失败史直接抄，不要再交学费）

1. **不要继续加词表。** HITL2 075→140→149→156 四代、readiness 074→141→150 三代都证明：
   有限词表追不上同义扩展；正确方向是结构 id、范围仲裁、fail-closed 默认、版本配对。
2. **不要用点击计数/UI 交互当「已答」。** 147（0 题假绿）→151（0 点击假红）是同一个错误的
   两面；判据必须是盘侧 landed batch。
3. **不要让夹具注释解释谓词的缺陷。** 084 的 fixture 注释「写成 `- phase:` 不匹配」就是夹具
   迁就谓词的证据；夹具应按模板/合同写，红了改实现。
4. **不要用「全绿输出」替代明细对账。** 147 的「共作答 0 题」就藏在 12 个 PASS 里；必须读
   明细行/盘侧事实。
5. **不要把「文件在场」当「内容正确」。** 153（空 JSON 快照）、157（伪造 session id）、
   158（review 缺席）、159（evidence 不存在）是同一族；判据必须打开内容/对账盘上。
6. **不要在慢冒烟里写判据。** 142/147/151/152 证明慢壳里的选择器/计数/健康判据会假绿/假红；
   判据核外移，慢壳只装配。

另两条给守卫自己：`guard-red-record` 的「留证存在」不等于「红录跑过」；合并标题
（`BUG-091/106`）只登记首个号——需要定期抽查或拆标题。

## 6. 借鉴决策：借什么、怎么缩编、不借什么

### 6.1 借（直接采纳原则，载体缩编）

| DSH 机制 | 本仓载体 | 为什么值得借 | 成本 |
|---|---|---|---|
| 证据账本 + 显式未覆盖 | `reviewing-a-delivery` 技能 + issue/commit 模板 | 把「没测」从作者脑子里搬到评审桌上；DSH 的 PR 模板已证明可操作 | 低 |
| 失败类→最低可见层表 | `docs/evaluation.md` 或 `guides/67` 的一节 | 让选层从「顺手」变成「按失败类」；与现有任务型路由表互补 | 低 |
| 同 PR 模型可见快照 | 快照 A/B 进 CI + 路由表「必跑面」 | 最便宜的模型可见回归，当前却不在 required 路径 | 中 |
| 运行时导出守卫 | `tests/pack/export-shape` 升级 | 静态正则挡不住 `export { default }`/re-export；Loader round-trip 是 postmortem 0001 的正解 | 低 |
| 客户端直测面 | S1 + `client-surface` 契约 | 36/59 无直测（约 19 无任何路径）是已证缺口；新纯逻辑不再静默无测 | 中 |
| smoke 资产账 | S2：cost/uniqueClaim/oracle/sunset | 让慢资产可治理、可退役；DSH 的「昂贵层按失败类」落地 | 中 |
| 复盘触发 | `notes/README §事故复盘` 加 P0/P1/复发触发 | 159 张卡缺一次「流程为什么放它过去」；DSH 的 postmortem 回路已验证 | 低 |
| 类级守卫规则 | `tests/AGENTS` + `guard-red-record` 扩展 | 治复发链；不是每条 bug 都写矩阵，而是判据/解析类必须 | 中 |
| flake 最小纪律 | `scripts/AGENTS` 加 5 条 + 现有 port/lock/host-health 案例 | 固定 sleep/共享资源已在冒烟里出现；DSH 的归因条款能直接缩编 | 低 |
| 资产退役 | S2 sunset + 季度复核 | 防慢资产只增不减；`e2e-021rc2.entry` 是活例 | 低 |
| 最小聚合裁决 | `ci.yml` 加 `needs: [keyless, client-load, deploy]` 的裁决 job + job 清单契约 | 今天不假绿，但新增 job 忘了加保护/加 `if:` 没人拦；DSH 的最小不变量可借 | 低 |
| with-key 可触发通道 | `workflow_dispatch` 的 `l4-lite` 单档 + preflight 硬失败，不进 PR 聚合 | 把「真模型档能跑」从散文变成可触发事实；不撞 fork 无 secret | 中 |
| 只读快照模式 | `snapshot-replay.entry --read-only` 与 `--update-expected` 互斥 | 今天 refresh 是 replay 的 flag，误写只靠 `--why` + 暂存区配对；DSH 的 `DSH_SNAPSHOT=replay` 可缩编 | 低 |
| 客户端 dispose 行为 | 假 ctx 的 effect/dispose 测试（不是 HMR 行为面） | 2026-10-19 的静默失效是作用域生命周期，不是 HMR；静态包裹门禁只证形态 | 低 |
| 装起 + 效果 | `lifecycle.entry`/`release.entry` 增「装起后内容注入/startup/defaults 真发生」正向断言 | 现在只证「装得起 + 无降级 + 元数据」，不证 `apply` 的效果 | 中 |
| skip 可见 | `pnpm test` 零 skip 契约（或静态禁 `test.skip`） | 当前 0 skipped，但 `node:test` 的 skip 不会让 `pnpm test` 非零；DSH 的 skipped=failure 可缩编 | 低 |

### 6.2 缩编（保留判据，换载体）

| DSH | 本仓缩编 | 保留的判据 |
|---|---|---|
| 七层宪法层 | L0–L4 + 三环（回归/装配/发现） | 证据形态与入口真实性，而不是层名 |
| per-file 100% 覆盖 | `test-surface` 的「每个纯件有直测或登记理由」 | 未执行代码必须可见；不用百分比当充分性 |
| PR 模板 + 九 job | issue/commit 的「证据账本」+ 现有 3 个 CI job | 证据、负控、显式未覆盖；CI 只承担必需面 |
| run-gates DAG | 现有 `verify` + `smoke/registry` + `reviewing-a-delivery` | 门禁有 owner、有反证、有必需性 |
| 快照四面/世代/corpus | 单 Web 面 + 单族；先扩族与 CI，world tree 后置 | 组装转录不可由单测替代；录制/刷新只读/人审 |
| 插件 L0–L2 采用等级 | `guides/62` 的五台阶 + 按承诺选组合 | 按插件承诺决定证据，而不是按仓库大小 |
| flake 八分类 | 5 条最小纪律 + 现有失败案例 | 归因单向、资源所有权、等状态、retry 白名单、release to quiescence |

### 6.3 不借（明确不适用，避免 cargo cult）

| DSH 机制 | 不借理由 | 重估触发 |
|---|---|---|
| vitest / 8 份配置 / per-file coverage 门 | D26 已定 node:test；TS 面只有 pack `src/`；覆盖率不是充分性 | 测试栈出现无法用 node:test 表达的层 |
| 七层宪法层 / run-gates DAG / 多 OS 矩阵 / Wine | 单人插件仓，无自托管 runner、无跨平台产品面；维护成本 > 收益 | 出现跨平台发布面或多人贡献矩阵 |
| benchmark tier / 性能预算 | 当前无用户路径性能承诺；慢档已有成本账 | 出现性能回归类事故或发布性能承诺 |
| Python SDK / 四快照面 / ACP | 本包只支持 Web 面；无 SDK | 产品面扩展到 SDK/ACP |
| 录制会话全套世代/corpus | 单族 4 case；vendor session format 由上游拥有；B 层已覆盖模型可见请求 | 场景族 > 3 或需要迁移覆盖 |
| 真模型 API 不限额 | 我们不是模型厂；凭据与成本是真实约束；用快照回放把模型证据带进 keyless | 有稳定 CI 凭据与预算 |

另四条具体不借：**完整 `all-checks-passed`**（40+ 行注释在解释 runner 池/failover，本仓单 runner）、
**`listen(0)` 随机端口**（本仓端口是给人看的 GUI URL/`--port` 面；借身份校验，不借随机分配）、
**`DSH_GATE_FAIL_FAST` 与信号转发**（GitHub step 非零即停，已够）、**flake 八分类**（本仓只出现
六类；硬凑八类会造两个空桶，缩编到六类并保留「归不进去先补归因」出口）。

## 7. 长期操作模型：三环、四账、五关

### 7.1 三环

| 环 | 回答 | 资产 | 节奏 | 出口 |
|---|---|---|---|---|
| **回归环** | 旧行为被改坏了吗 | `pnpm verify` + `pnpm test` + 契约/门禁 | 每次改动/commit | 0/1；≤10s |
| **装配环** | 组装后的产品还对吗 | L1/L2、client-load、snapshot A/B/C、真模型档 | 改动面触发 + CI + 里程碑 | 0/1/2；分钟级 |
| **发现环** | 哪些输入会静默做错事 | 探索 charter、变异矩阵、probe、后验取证 | 里程碑/大特性/复发后 | bug 卡/观察/歧义/空假设 |

三环的分工不是「快中慢」，而是**问题类型**：回归环防已知，装配环防组装，发现环找未知。
任何一环都不能替代另一环；把发现环的 bug 塞进回归环只能得到实例级修复。

### 7.2 四账

| 账 | 记什么 | 载体 | 谁维护 | 何时更新 |
|---|---|---|---|---|
| **资产账** | 每条慢资产：cost / uniqueClaim / oracle / sunset / 最近真绿 | `scripts/smoke/registry.json` 扩字段 + `smoke-oracle-surface` 契约 | 加资产的人 | 新增/退役/改判据 |
| **失败类账** | 失败类 → 代表 BUG → 现有守卫 → 缺口 → owner | `docs/evaluation.md` 或 `guides/67` 的表；不新建索引 | 修 bug 的人 + 复盘 | 每次 P0/P1/复发 |
| **证据账** | 本次变更：证据/层/失败类/负控/CI/显式未覆盖 | `reviewing-a-delivery` 模板 + issue/commit | 交付者 | 每次非平凡交付 |
| **探索账** | charter/面/oracle/结果/毕业/日期 | 探索题的 `README` + 材料；毕业成 skill/guide | 探索者 | 每轮探索 |

四账的共同点：**只记会被消费的事实**，不建第二份索引；资产账进现有 registry，失败类账进
现有合同文档，证据账进现有 review 技能，探索账进现有 research 题目录。

### 7.3 五关

| 关 | 问题 | 判据 | 不满足时 |
|---|---|---|---|
| **准入** | 这条新资产值得存在吗 | 唯一证明面 + 最低可见层 + 负控 + owner + 成本 | 不进；或先写进探索账 |
| **变更类** | 这类变更该带什么证据 | 模型可见→快照；新纯件→直测；新实体→消费者矩阵；新判据→变异矩阵 | 交付账本写「显式未覆盖」并立卡 |
| **必需** | 这条证据在 required 路径吗 | 产品面证据必须在 CI/收尾；skip 可见 | 降为诊断或补 job |
| **退役** | 这条资产还有消费者吗 | uniqueClaim 仍成立、oracle 仍在、成本可承受 | `sunset` 或删除；不静默留着 |
| **复盘** | 为什么流程放它过去 | P0/P1 或同类复发 → 五节复盘 + 新守卫 | 复盘未完成，bug 卡不归档 |

### 7.4 与现有合同的关系

- **不新增第六个评估面**：三环是证据节奏，不是 L0–L4 之外的验收面；五面合同仍是判据正本。
- **不新增仓库任务队列**：四账都寄居现有载体；探索账住 research 题目录。
- **不新增测试框架**：node:test + 现有 smoke/probe 形态不变；只补契约与账本。
- **不降低任何现有判据**：所有新增都是「让已有证据更可信/更可见」，不是「放宽到能过」。

## 8. 落地路线

> 切片按「先让证据可信，再让证据自动，再让发现制度化」排序；每片都先立红、再交付、同 diff 记账。
> 具体授权以用户拍板为准；本文只给候选与验收判据。

### 8.1 Phase 0：研究定稿（本轮）

- 本文 + 题名页 + 索引；对外部材料登记做一次纠偏（16 篇 / rc.5 / 混合核验状态）。
- 产出：研究题 `已定性`、采纳切片清单、需要用户拍板的 3 个决策点（§9）。

### 8.2 Phase 1：让已有证据可信（P0，1–2 周）

| 片 | 做什么 | 验收（先红后绿） | 成本/风险 |
|---|---|---|---|
| **A. 客户端直测面（S1）** | 4 个零路径纯逻辑 + 2 个无直测件补测；`client-surface` 契约：纯逻辑件必须被测试直接 import，组件/hook/entry/style/type-only 登记理由 | 注入一个未测试纯件 → 契约点名红；6 个测试绿；`pnpm test` 不超 10s | 中；需区分纯件与组件，避免误红 |
| **B. smoke 资产账（S2）** | `registry.json` 每条加 `cost/uniqueClaim/oracle/sunset`；`smoke-oracle-surface` 契约；28 条填齐 | 删一条 oracle/填不存在路径 → 红；新增 smoke 不登记 → 红 | 中；28 条一次性填，需人审 uniqueClaim |
| **C. 运行时导出守卫** | 宿主半（`src/index.ts`、`content/startup/defaults/fetch-fallback`）用真 Loader `unwrapExports` round-trip；client 半保留静态 + `client-load` | 注入 `export default` 或 re-export default → 红；还原绿；不引入新依赖（用 vendor `createRequire`） | 低；已 spike 通过（见附录 C） |
| **C2. 最小聚合裁决** | `ci.yml` 加 `needs: [keyless, client-load, deploy]` 的裁决 job，失败条件含 `skipped`；同 diff 加「job 名 ↔ needs」契约测试 | 删一个 needs / 加一个新 job 不登记 → 契约红；上游红时裁决 job 仍给出结果 | 低；不搬 failover/池选择 |
| **C3. 客户端 dispose 行为** | 假 ctx 的 effect/dispose 测试（`src/client/index.ts` 的注册贡献）；不碰「HMR 行为面不做」的偏离 | 注入一个不 dispose 的注册 → 红；dispose 后贡献消失 | 低；与 C 同族，分钟级 |
| **C4. 快照只读模式** | `snapshot-replay.entry --read-only` 与 `--update-expected` 互斥；盘上运行默认只读 | 同时给两 flag → exit 2；只读跑不改任何期望文件 | 低；不加 dependency |
| **C5. skip 可见** | `pnpm test` 零 skip 契约（解析 `node:test` 汇总或静态禁 `test.skip`）；CI 里 2 仍按红处理但报告分列 | 注入一个 `test.skip` → 契约红；正常套件 0 skipped | 低；当前 0 skipped，先立契约 |
| **D. 证据账本模板** | `reviewing-a-delivery` 加「证据账本」节：证据/层/失败类/负控/CI/显式未覆盖；issue 模板同节 | 一次真实交付按模板填写；评审能指出未覆盖行 | 低；是流程，不是门禁 |
| **E. 文档纠偏** | `docs/external-materials.md` digest 行改 16 篇 / rc.5 / 混合核验；`discipline-map` 源 10 同步；`evaluation` 结构性例外 5→6；`probes/README` behavior 4→6；`scripts/README` smoke 25→28；`guides/66` 两套说法合并 | `md-links`/`doc-paths` 绿；不吹「已全部对齐」 | 低；纯文档 |

### 8.3 Phase 2：让证据自动、让发现成类（P1，2–6 周）

| 片 | 做什么 | 验收 | 成本/风险 |
|---|---|---|---|
| **F. 快照 A/B 进 CI** | 先 spike：`boot-run --prepare-profile`（temp home + tarball + team layer）→ `snapshot-replay.entry --read-only --layers a,b`（砍 C：去 chromium/reload/最脆的 sleep）；CI 独立 job（vendor build + pack build + profile + 回放）；路由表把 B 列入模型可见变更的必跑面 | CI 基线绿；故意改 persona/手册 → B 红；运行 ≤5 min；skip 可见 | 高；profile 安装依赖 registry/team layer；需 spike 决定 source vs installed |
| **F2. with-key 可触发通道** | `workflow_dispatch`（可选 nightly）跑 `l4-lite.e2e` 单档；preflight 缺 key 硬失败；**不进 PR 聚合**（fork 无 secret） | 手动触发可跑；缺 key 时红而不是全跳过；不阻塞 PR | 中；凭据只在可信环境 |
| **F3. 装起 + 效果** | `lifecycle.entry`/`release.entry` 增正向断言：装起后内容注入/startup/defaults 真发生，而不只是元数据 | 删掉一个 apply 效果 → 红；装起 + 效果同链 | 中；需要可观测的效果点 |
| **G. 失败类→层表** | 在 `evaluation.md` 或 `guides/67` 加一张 12 行的表（纯逻辑/服务/导出/工具/模型文本/persistence/provider/子进程/Client/配置/性能/文档），每行最低层 + 反例 | 表被 `guides/60` 路由表与 `reviewing-a-delivery` 引用；一次真实变更能按表选层 | 低；避免变成第二份路由表 |
| **H. 类级守卫规则** | `tests/AGENTS` 加：判据/解析类修复必须带语法/状态矩阵（至少 N 个邻接变体），不只报出的输入；`guard-red-record` 对 `conformance`/`judgment` 类要求声明矩阵 | 用 081/150 两个真实族做样板；注入邻接变体 → 矩阵红 | 中；N 与「类」的判定需人审，不硬门 |
| **I. 探索毕业** | 把 E1–E6 从 1847 行 issue 提炼成 `.agents/skills/exploratory-verification/SKILL.md` + `guides/67` 一节；定义每里程碑一轮、预算、charter 模板、毕业判据 | 技能可被新 agent 按 description 加载；一轮探索产出 charter/结果/毕业卡 | 中；不要把探索变成例行仪式 |
| **J. 复盘** | 对 BUG-081..159 这一波写一次五节复盘（症状/为什么没早发现/根因/修复/新增防线），落到 `notes/archived/`；给 P0/P1/复发加触发 | 复盘有「流程为什么放它过去」与新守卫；至少一条守卫进 Phase 1/2 | 中；叙事要短，不写 1847 行 |

### 8.4 Phase 3：加深与维持（P2，季度）

| 片 | 做什么 | 验收 | 成本/风险 |
|---|---|---|---|
| **K. 快照族扩展** | 场景声明加 `roleFace: research \| method-editor \| worker`，consumer 按声明取 roster；先 B 层，后 C 层；`method-editor`/worker 的 model-visible 面各补一条 | 新族 keyless 回放绿；新面未录 → 加载期 fail-loud | 高；需要真模型录制 + 人审 |
| **L. Hook/HMR 行为测试** | `happy-dom`/jsdom + `react-dom/client` 的 session-switch/race 矩阵；HMR 行为面仍按 2026-10-04 偏离不做（dispose 已在 C3 补） | 注入 stale/race → 红；session switch 后旧投影不残留 | 中高；新依赖 + DOM 环境 |
| **M. 快照世界树** | 回放 run 写出的 bundle 文件树与 `manifest` 哈希比对；record/refresh 不改写 | 改一个 bundle 文件 → 红；世界与转录分开 | 高；需要 bundle fixture |
| **N. flake 最小纪律** | `scripts/AGENTS` 5 条 + 六类归因（环境红/前置缺席/构建过期/锁被占/端口残留/产品红）；冒烟里的 bare sleep 逐个改成谓词等待 | 一条慢冒烟注入延迟 → 不假绿；红能归入六类 | 中；改多个慢壳 |
| **O. 退役/季度复核** | `e2e-021rc2.entry` 补 picker 断言后退役；安装档合并评估；每季度对 DSH digest 重校一次 | 退役有替代证据；季度复核记录进 external-materials/notes | 中；退役前先补证据 |
| **P. 两处口径修正** | `replay-scene` 的 `JUDGES` 5 vs 头注 "six"（time-context 缺省永远放行）；`guides/66` 对同三格空白的两套说法 | 加一条「声明判据集 = 实际判据集」断言；文档只留一套说法 | 低；小但会误导 |

### 8.5 优先级与依赖

```text
A (S1) ─┬─> L (hook/race; HMR 行为仍不做)
C (导出) ┤
C3 (dispose) ┘
C2 (聚合裁决) ─> F? (job 清单/保护)
C4 (只读快照) ─> F (A/B CI)
C5 (skip 可见)
B (S2) ──> O (退役)
D (账本) ─> G (失败类表) ─> H (类级守卫) ─> J (复盘)
F (快照 CI) ─> K (族扩展) ─> M (世界树)
F2 (with-key 通道) ─> J
F3 (装起+效果)
I (探索毕业) ─> J
P (口径修正)
```

先做 A/B/C/C2/C3/C4/C5/D：它们都是「已有证据变可信」，风险低、见效快，且不依赖外部环境。
F 是最高价值但最重，先做 C4 + spike；G/H/I/J 是制度，和 F 并行。
K/L/M/N/O/P 是季度项，等前两阶段稳定后再做。

## 9. 需要拍板的决策点

1. **快照 CI 的形态**：安装域（faithful，但要在 CI 里准备 profile + team layer，重）vs
   源码域（快，但 B 层基线是安装域录的，可能需要第二套基线）。本文倾向**安装域 + profile
   预备**，因为模型可见基线包含 team layer 注入；源码域会改变基线语义。需要一次 spike 决定。
2. **客户端 hook 测试的依赖**：`happy-dom` 作为 devDep（探索脚本已用它跑通过）vs 只用
   vendor 的 `jsdom`（已在 vendor node_modules，但根不可直接 import）。本文倾向
   `happy-dom` devDep + 一个薄 harness；若维护者不接受新依赖，则 hook 面登记为 smoke-only。
3. **政策载体**：新增短 `docs/testing.md` vs 在 `evaluation.md` 加一节 vs 新建
   `guides/67-test-strategy.md`。本文倾向 **`guides/67`（程序）+ `evaluation.md` 指针**，
   不新增第三份「合同」；若未来规则继续膨胀，再升为 `docs/testing.md`。
4. **是否把「三环四账五关」升为 D 号**：它是持久决定，影响门禁/验收合同/文档合同，按
   `_backlog/AGENTS` 属于「等人拍板」。本文建议在首批切片落地后升 D53，而不是现在。

## 10. 不做什么（反目标）

- **不为 159 张 BUG 逐张补测试**：那是实例修，不解决类级复发。
- **不新增慢 E2E 换覆盖**：新增昂贵层必须有「unit 为什么看不见」的一句话 + 唯一证明面。
- **不搬 vitest / coverage gate / 七层 / run-gates DAG / 多 OS 矩阵**：规模与产品面不支持。
- **不把探针变成第六个评估面**：探针是 L1/L4 的证据工具，不是交付门。
- **不建第二份索引**：资产账进 `smoke/registry`，失败类账进合同文档，探索账进 research 题目录。
- **不为凑绿放宽任何判据**：不加重试、不加 sleep、不改 normalizer、不把 skip 写成 pass。
- **不把「绿」当充分性**：覆盖率、快照、L4 绿都只证明它们各自的面；完成判断四分离不变。
- **不搬 DSH 的完整编排**：完整 `all-checks-passed`（池选择/failover）、run-gates DAG、
  `listen(0)` 随机端口、`DSH_GATE_FAIL_FAST`、flake 八分类——只借判据，不借规模。
- **不把 digest 的数字/归属当 DSH 成文**：L0/L1/L2 采用等级、台阶 4 两级分工、负控四类都是
  digest 的缩编提炼；引用时标注「提炼」，不写成「DSH 要求」。

## 11. 研究边界（不证明什么）

- **失败史样本**：逐卡深读 60/159，其余 99 张只用于背景与复发链核对；分类计数是样本计数，
  不是全量普查。复发链的因果只到卡内自述与提交记录，不证明「所有复发都由同一类缺口造成」。
- **未复跑慢档**：`gates.e2e` / `snapshot-replay` / L1 / L2 / L4 本轮未跑；慢档数字引用
  test-asset-fence 的实测（HEAD `ec652a30`），不当作本文改动面的证据。
- **DSH 侧是静态核验**：没有跑 `run-gates.ts`、没有跑任何 DSH 测试；配置语义来自读代码。
  digest 与 rc.5 的 20 条漂移已标出，但未核验的 7 项仍在只读材料里列明。
- **「借鉴」不是「已证明有效」**：本文的采纳建议基于 DSH 的成文机制 + 本仓失败史，不是
  A/B 实验；首批切片落地后要用真实红绿证据修正，不把本文当结论终点。
- **不证明「三环四账五关」一定比现状好**：它是一个防止「发现后不沉淀」的操作模型；
  效果要看 Phase 1/2 的切片是否真的减少复发，而不是看文档是否漂亮。

## 附录 A：DSH 关键条文与一手源

> **引用前先看：digest 有 20 条漂移，DSH 自己的文档也有过期路径。** 本表只收本文实际依赖的
> 条文；数字与归属的核验结果如下（完整 121 行事实表 = 本次研究的
> `runtime/dsh-test-strategy-research/dsh-primary-sources.md`，未入库）。机制结论不受数字漂移
> 影响，但**不要把 digest 的数字当可复算事实**。

| 漂移 | digest 说法 | rc.5 实际 | 对本文的影响 |
|---|---|---|---|
| 本地并发 cap | 4 | `PROGRAM_MODE_CAP = 8`（`scripts/run-gates.ts:96`） | 不影响「本地模式 cap 存在」的结论 |
| `(HMR safety)` 数量 | 02 说 67、13 说 72 | 实测 70（packages+apps，ts/tsx） | 本文不引用绝对值 |
| e2e 用例 | 303 | 同一「行首 it/test」口径：381（含修饰符）/310（裸）；文件 110 精确 | 本文只引用文件数 |
| unit 用例 | 27,757 | 27,756（同口径） | 不引用精确绝对值 |
| web e2e | 613 | 628（含修饰符） | 不引用 |
| built-bin 用例 | 30 | 31 | 不引用 |
| `docs/testing.md` 的 examples 路径 | 引用 `packages/examples/*/tests/built-bin.e2e.ts` | 该路径不存在；实际 = `apps/cli/tests/built-bin.e2e.ts` + 各包 `built-*.e2e.ts` | 说明「政策也会过期」，支持一手源核验 |
| L0/L1/L2 采用等级 | 写成 DSH 等级 | rc.5 无此术语/文件；digest 15 自述为缩编契约 | 本文标注为「digest 提炼」 |
| 插件台阶 4 两级 | 写成 DSH 要求 | 政策只有一句 `boot test-only cordis.yml through Loader and app/process` | 本文标注为「可观察分工」 |
| pre-commit 第 5 项 | third-party notices | `lefthook.yml` 实际是 pi-ai provider metadata | 不影响本文 |
| `.coverage-times.json` | 可打开/找到 | 生成物 + CI cache，不在树内 | 不影响本文；说明「账本文件」也要区分源/生成物 |
| bench 组 | 6 组 | 10 个文件、覆盖更宽 | 不影响本文 |
| `llm-mock-server` README | Messages-compatible | `packages/test-support/README.md` 写成 OpenAI-compatible，源码只吃 `/v1/messages` | 一手源内部不一致；说明「README 也不是唯一事实源」 |

| 命题 | 原文短引 | 一手源 |
|---|---|---|
| 政策目标 | "the rules that keep a green suite meaningful" | `vendor/dsh/docs/testing.md` 首段 |
| 分层执行 | "Only the process is isolated: ports, predictable paths, external namespaces, and inherited children are not." | 同上 "How specs execute" |
| 单跑才绿 | "A spec passing only alone has a test defect, not an unstable runner." | 同上 |
| with-key | "We are DeepSeek — do not ration real-API tests. A no-key test proves plumbing; only a with-key run proves the agent works against a real model." | 同上 |
| mock 边界 | "Mock only the expensive or non-deterministic boundary (LLM adapter, network, clock); keep everything downstream real." | 同上 |
| 验世界 | "An e2e assertion re-runs the command or re-reads the file externally; a keyword probe on the agent's own output lets a cheating agent pass." | 同上 |
| 真入口 | "Hand-built `ctx.plugin(...)` suites are insufficient" | 同上 "Test the real entry path" |
| 守卫会红 | "A guard only guards if the regression fails it." | 同上 |
| 快照强制 | "Every non-trivial model-, protocol-, or human-visible change adds or updates a keyless recorded-session scenario in the same PR" | 同上 "When a snapshot test is required" |
| 覆盖率 | "Line coverage is necessary, never sufficient — it proves lines ran, not that the feature works as shipped." | 同上 |
| 死代码 | "An uncovered line is often dead code the gate flags for deletion, not a missing test to bolt on." | 同上 |
| 本地/CI | "Never default to the full suite or repeat a passing check for commit or push." | `vendor/dsh/AGENTS.md` |
| 行为命名 | "Tests describe behavior, not correctness." | 同上 |
| 夹具 | "Fixtures replay on macOS/Linux; fix fixtures, not normalizers." | 同上 |
| 快照所有权 | "The owner alone records or refreshes the selected role." / "Model prose and tool-result text do not prove the external effect." | `vendor/dsh/snapshots/AGENTS.md` |
| CI 聚合 | `all-checks-passed` 的 `if: failure() || cancelled() || skipped()` | `vendor/dsh/.github/workflows/ci.yml` |
| e2e preflight | 缺 `DEEPSEEK_API_KEY` 硬失败 | `vendor/dsh/.github/workflows/e2e.yml` |
| 资源所有权 | "Own each acquired resource through teardown." | `vendor/dsh/docs/testing.md` |
| 等待状态 | "A fixed sleep is not evidence that setup completed or cleanup settled." | `vendor/dsh/.agents/skills/dsh-ci-test-reliability/SKILL.md` |
| flake 归因 | "One passing rerun does not prove an infrastructure fault, and one timeout does not prove a product race." | 同上 |
| 插件台阶 | "Every registry gets an HMR-safety test." | `vendor/dsh/docs/testing.md` Unit |
| 插件契约 | L0/L1/L2 采用等级 + 十条契约 | digest 15（`_digested/test-strategy/15-plugin-testing-contract.md`） |

## 附录 B：本仓关键条文与证据

| 命题 | 本仓条文/证据 |
|---|---|
| 五面与互不抵 | `docs/evaluation.md` §1、§完成判断四分离 |
| exit 0/1/2 | `scripts/AGENTS.md` §冒烟脚本可靠性纪律；`tests/checks/smoke-contract.test.mjs` |
| 真模型 closed set | `tests/checks/smoke-contract.test.mjs` 的 `REAL_MODEL` |
| keyless 五件套 | `tests/checks/layering.test.mjs` |
| 覆盖边界 | `tests/checks/test-surface.test.mjs`（scripts/lib + pack src/lib；不含 src/client） |
| 门禁反证 | `scripts/smoke/gates.e2e.mjs`（108 案例 + 7 对照）；`tests/checks/verify-gates.test.mjs` |
| 命名即层 | `scripts/AGENTS.md` §依赖与分层；`tests/AGENTS.md` §放置规则 |
| 快照 A/B/C | `scripts/smoke/snapshot-replay.entry.mjs` 头注；`snapshots/README.md` |
| 快照边界 | `snapshots/README.md` §证据边界、§已知限制 |
| probe 登记 | `probes/README.md`；`docs/guides/66-probe-playbook.md` |
| 探索协议 | `_backlog/issues/2026-11-11-exploratory-test-strategy.md` §策略 |
| 成本实测 | `_backlog/research/test-asset-fence/2026-11-13-test-asset-fence.md` §2.2 |
| 外部材料 | `docs/external-materials.md` 的 digest 行（当前仍写 11 篇 @ 639ed01539，待纠偏） |
| CI 结构 | `.github/workflows/ci.yml` 3 个 job（keyless/client-load/deploy），无 `needs`/聚合；`smoke-registry` 只对账引用 |
| CI 的 2 | exit 2 在 CI 里与 1 一样是 job 红；报告分列靠人写，不靠 CI |
| skip | 当前 0 skipped，但 `node:test` 的 skip 不会让 `pnpm test` 非零；无契约 |
| 快照三态 | `--update-expected` 是 replay 的 flag；无 `--read-only`；`lastRewrite` 当前不在盘上声明 → 配对门对「跑完不 commit」不生效 |
| 快照判据集 | `replay-scene.mjs` 的 `JUDGES` 5 项 vs 头注「six B judges」；`time-context` 由 `replay-request` 另并，`cases[].judges` 永远放行其缺省 |
| 装起 + 效果 | `lifecycle.entry` 只到「无降级 + `readPluginMeta`」；`apply` 的内容注入/startup/defaults 效果无正向断言 |
| probe 口径 | `guides/66:140` 与 `:152` 对同三格空白两套说法（「暂无探针但有证据」vs「有证据但不是探针」） |

## 附录 C：本次核验与 spike 记录

- **快环**：`pnpm verify` 3.91s 全绿；`pnpm test` 4.59s / 1409 例全绿（HEAD `62c5cfca` 工作树）。
- **运行时导出守卫 spike**：用 `createRequire` 指向 vendor
  `packages/boot/app-boot/package.json` 解析 `@deepseek-ai/cordis-plugin-loader`，
  `Object.create(Loader.prototype).unwrapExports()` 对 host/content/startup/defaults/
  fetch-fallback 五个入口返回同一命名空间、`'default' in mod === false`、`apply` 为函数。
  client 半因 `.css` 导入无法在 Node 直接 import，保留静态守卫 + `client-load` 真浏览器。
  结论：宿主半运行时守卫可行、零新依赖；client 半需 DOM 装载器或留在浏览器档。
- **digest 核验状态**：`catalog.json` 显示 16 篇中 7 篇 `reverified`、9 篇 `carried`；
  `docs/external-materials.md` 仍登记 11 篇 @ `639ed01539`——这是待纠偏的文档漂移。
- **未跑**：`gates.e2e` / `snapshot-replay` 本轮未复跑（引用 test-asset-fence 的实测）；
  L1/L2/L4 未跑（非本文改动面）；真模型档未跑。
- **只读核验材料（未入库，`runtime/dsh-test-strategy-research/`）**：
  `dsh-primary-sources.md`（121 行一手源事实表 + 20 条 digest 漂移）、
  `failure-history.md`（60 张卡逐卡归类 + 复发链 + 毕业缺口）、
  `our-current-model.md`（本仓资产/制度/边界盘点）、
  `special-topics.md`（插件台阶/快照/probe/CI 四组专项）。主文只收结论与必要锚点。
- **`pnpm test` 的 skip 面**：本次实跑 1409 pass / 0 skipped；但 `node:test` 的 skip 不会让
  `pnpm test` 非零，当前没有契约把「0 skipped」钉住——这是 C5 切片的由来。

## 附录 D：术语对照

| 本文用词 | 本仓既有词 | DSH 对应 |
|---|---|---|
| 回归环 | L0 / 默认回归 / 快环 | Unit + Coverage gate + static gates |
| 装配环 | L1/L2/L4-lite / 冒烟 / 快照 | REAL composition + profile + snapshot |
| 发现环 | 探索协议 / probe / 后验取证 | probe + negative control + postmortem（未成文为「环」） |
| 资产账 | smoke registry / 成本层 | asset census / CI 必需性 |
| 失败类账 | 判据形状 / 反模式 | anti-omission M1–M7 |
| 证据账 | 收尾五件 / 交付报告 | PR `## Testing` + `Proof` |
| 探索账 | research 题 / charter | 无直接对应（本仓自创） |
| 准入关 | 新检查落家序 | coverage exemption / plugin ladder |
| 变更类关 | 任务型路由表 | "Plan unit, e2e, and snapshot coverage at plan time" |
| 必需关 | L0 收尾必跑 / CI | required jobs / `all-checks-passed` |
| 退役关 | 无 | expected-filenames / exemption removal conditions |
| 复盘关 | notes §事故复盘 | postmortem |
