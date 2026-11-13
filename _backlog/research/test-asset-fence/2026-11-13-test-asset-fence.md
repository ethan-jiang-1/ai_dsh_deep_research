---
topic: 测试资产围栏：成本、覆盖边界与更新/补充/淘汰候选
intent: 为“把测试资产围栏做对、以快资产为主”提供一手盘点、实测成本、缺口与迁移切片。
---

# 测试资产围栏：先量成本，再判证明力

> 证据边界：数字 = 本机 2026-11-13 实测（macOS / Node 22.23.1 / pnpm 11.7.0，HEAD `ec652a30`）。
> 未跑的浏览器/真模型档明确标“未跑”，不把未跑写成通过。本页只做调研，不改任何测试资产。

## 0. 结论

1. **快核健康，慢核有成本悬崖。** `pnpm verify` 2.5s、`pnpm test` 1,407 例 4.4s、L1 `preset.e2e`
   3.8s；但 `gates.e2e` 202s、`snapshot-replay` 162s。默认回归不是问题，**慢资产的重复启动与
   全量校验**才是问题。
2. **最大的缺口不是“测试少”，是慢资产的判据仍长在慢壳里。** BUG-142/147/151/152 四张卡证明：
   慢冒烟的选中器/判据选错层时，会假绿或假红；抽成 `scripts/lib/*` + 直测后才止住
   （`client-load-select`、`host-health`、`hitl-provenance`、`replay-request`）。这套做法还没有
   成为准入规则。
3. **客户端纯逻辑有一片无直测区。** 59 个 `src/client` 文件里 36 个未被测试直接 import；其中
   `lead-prompt`、`research-graph/format`、`coach-prompts`、`operation-prompts`、`section-labels`、
   `defaults/labels` 是纯逻辑或模型可见字符串，适合秒级直测，却只被浏览器慢档间接覆盖。
4. **夹具会随判据漂移。** 当前 CI 的 `run-accept.e2e` 在 HEAD 红：第 ⑦ 段夹具创建了 `review/`
   （claims/verdicts）却没写 `review/readiness.json`；D51 对 `review/` 在场要求结构化声明，缺声明
   即红；预检停在 node-gate，冒烟却按旧形状等报告。标题 `## readiness: PASS` 不是原因——它会
   被 `stripVerdictDecor` 剥成 PASS；真正缺的是声明件。这是“测试资产本身没有形状合同”的活例。
5. **目标围栏**：默认快环 ≤10s；每条慢资产必须有**唯一证明面** + **可直测的判据核**；纯客户端
   逻辑进单元；夹具用当前判据自检；`e2e-021rc2.entry` 退役（先补 picker 断言/升级路径复核）；
   `gates.e2e`/`snapshot-replay` 降到 ≤60s 或明确降为里程碑档。

### 0.1 更新/补充/淘汰一览（候选）

| 动作 | 对象 | 证据 | 前提/风险 |
|---|---|---|---|
| **更新** | `run-accept.e2e` ⑦ 夹具写 `review/readiness.json` + 夹具形状合同 | §3.1 当前 CI 红 | 无；建议先做 |
| **补充** | 4 个无路径 + 2 个无直测的客户端纯逻辑 + `client-surface` | §3.3 36/59 未直接 import | 组件/hook 须登记理由 |
| **补充** | smoke `cost`/`uniqueClaim`/`oracle` 台账 | §3.5 无成本/所有权 | 28 条逐条填；`none` 写理由 |
| **补充** | 慢夹具“应绿/应红”形状合同 | §3.4 夹具随判据漂移 | 用同一判据，不复制 |
| **降本（P3）** | `gates.e2e` worker pool + 共享 fixture（`--only` 不省时间） | 202s（CI-only） | 先量 CI 需求；保留一次全量对照 |
| **降本（P2）** | `snapshot-replay` 按 `--scenario` 定向/并行 | 162s（本地常跑） | 全场景仍 >60s 则降里程碑 |
| **降本** | `client-load` 纯逻辑断言外移 | 未计时 | 需 component/hook 测 |
| **淘汰** | `e2e-021rc2.entry` | §3.6 历史版本 E2E | 先补 picker 顺序断言（静态 order 不够） |
| **合并** | L2 安装 harness（release/install/lifecycle/cold-start） | §3.6 四者都装+启动 | 保留各自证明面 |
| **观察** | L4 / 真模型档 | 未跑 | 只在里程碑 |

## 1. 口径：本仓不按金字塔组织，但可以按“成本层”看

本仓的三轴是**档位（凭什么跑）/ 验收面（证明什么）/ 命名即层（住哪）**，不把 unit/integration/e2e
当组织轴（[project-map §测试词汇对照](../../../docs/project-map.md)）。用户说的“单元/集成快资产、
少用 E2E 慢资产”翻译成本页的观察口径：

| 成本层 | 判据 | 本仓落点 | 典型耗时 |
|---|---|---|---|
| **fast** | keyless、无子进程/浏览器/模型；默认回归与 pre-commit 可承受 | `tests/**/*.spec.mjs`、`pnpm verify`、纯函数 smoke oracle 直测 | 毫秒–秒 |
| **medium** | keyless，但起真子系统（真 DSH、真 git 索引、真 tarball、真回放） | `preset.e2e`、`run-accept.e2e`、`handoff.e2e`、`snapshot-replay` 的 A/B | 秒–分钟 |
| **slow** | 浏览器、真模型、安装矩阵、双实例 | `client-load`、`client-hitl`、`l4-lite`、`release`/`install-shape`/`cold-start`/`workspace-isolation` | 分钟级或需凭据 |
| **manual** | 一次性/发布前/里程碑 | `e2e-021rc2.entry`、部分 L2 变体、L4 全量 | 人工触发 |

这不是要新增一套永久分类；若采纳，只需在 `scripts/README`/`smoke-registry` 里登记成本层，
不新建队列、不改五面验收轴。**成本层按墙钟分，不按有没有凭据分**：`snapshot-replay` 机制上
是 keyless，但 162s 已进入慢档预算；`preset.e2e` 起真 DSH 但 3.8s，仍在快/中档。

## 2. 现状盘点

### 2.1 资产族

| 族 | 数量 | 默认入口 | 档位/说明 |
|---|---|---|---|
| keyless 回归 | 175 个 `*.spec.mjs` / 1,407 例 | `pnpm test`（pre-commit） | 无模型/浏览器/网络；4.4s 全量 |
| L0 结构门禁 | 55 道（`context.gates`） | `pnpm verify` | keyless；2.5s 全量 |
| 分级冒烟 | 28 个 `scripts/smoke/*.mjs` | 按任务路由 | 8 个 CI、20 个 dev-only；见 §2.4 |
| 探针 | 7 支（behavior 6、browser 1；另 stream 仪器 1） | `probes/` | 真模型/连已起 GUI；不是默认回归 |
| 场景回放 | 1 族 / 4 角色 case（仅 lead 有渲染金标准） | `snapshot-replay.entry` | keyless 真 DSH；162s |
| run 门 | 7 个 `scripts/run-gates/*.mjs` | 随 run 验收 | keyless；判据核有直测 |
| run 观察/运维 | 14 个 `scripts/run-ops/*.mjs` | 诊断/验收 | keyless；多为只读投影 |
| 夹具 | 249 个文件（node-gate 105、schema-scan 65、client-load-home 29 等） | `tests/fixtures/` | 零孤儿由 navigability 契约把守 |
| 门禁自测 | 108 个注入案例 + 7 个对照 | `gates.e2e` | keyless；202s |

### 2.2 实测成本（同一台机，HEAD `ec652a30`）

| 命令 | 结果 | 墙钟 | 备注 |
|---|---|---:|---|
| `node scripts/verify/verify.mjs` | 全绿 | **2.53s** | 55 道门禁 |
| `pnpm test`（1,407 例） | 全绿 | **4.37s** | 冷启动约 10s；本机热态 4.4s |
| `DSH_SMOKE_REAL=1 node scripts/smoke/preset.e2e.mjs` | 全绿 | **3.82s** | L1 真挂载（5 角色 + 2 worker） |
| `node scripts/smoke/run-accept.e2e.mjs` | **红（⑦）** | **5.38s** | 见 §3.1；CI keyless 成员 |
| `node scripts/smoke/handoff.e2e.mjs` | 全绿 | **0.95s** | 移交边界 |
| `node scripts/smoke/gates.e2e.mjs` | 全绿 | **201.98s** | 108 案例 |
| `node scripts/smoke/snapshot-replay.entry.mjs` | 全绿 | **161.99s** | 4 场景 A/B + lead C |
| `client-load.entry` | 最近一次 PASS（2026-11-13T04:00Z） | 未计时 | 浏览器档；CI 独立 job |
| 真模型档 / 探针 | 未跑 | — | 需 `DEEPSEEK_API_KEY`；本页不估 |

结论：**快环（verify + test）约 7s，健康**；两个 keyless 慢档（gates.e2e、snapshot-replay）合计
约 6 分钟，是本地迭代与 CI 的主要成本。

> 计时口径：`gates.e2e` / `snapshot-replay` 的墙钟在 0.3.4 提交前同一工作树测得；0.3.4 只动
> 发布副本与 client-load 依赖，不触这两档判据。`pnpm test` / `verify` / `run-accept` 在
> HEAD `ec652a30` 复测。

> 复核：`verify --only=md-links` 实测 **3.24s ≥ 全量 2.53s**。`scripts/verify/context.mjs` 明说
> `--only` “省的是噪声与注意力，不是时间”——其余门禁照常执行，只是失败不计入。**不能用
> `--only` 给 `gates.e2e` 降本**；降本只能并行/复用 fixture。

### 2.3 快资产内部热点

按“单文件被测执行时间”排序（从每文件 `ℹ duration_ms` 汇总；不含进程启动）：

| 文件 | 执行时间 | 例数 | 性质 |
|---|---:|---:|---|
| `tests/checks/layering.test.mjs` | 2.65s | 6 | 全仓 import 闭包图/静态扫描 |
| `tests/checks/cjk-source.test.mjs` | 2.61s | 4 | 全客户端 CJK AST 扫描 |
| `tests/checks/no-unused-code.test.mjs` | 2.50s | 1 | 全仓未使用符号扫描 |
| `tests/checks/test-surface.test.mjs` | 2.40s | 2 | 全 lib 直测覆盖对账 |
| `tests/checks/backlog-liveness.test.mjs` | 1.45s | 22 | backlog 结构全扫 |
| 其余 170 个文件 | 均 < 1s | — | — |

这四件静态扫描串行约 10.2s，但全量 `pnpm test` 靠文件级并发压到 4.4s。它们不是“慢资产”，
除非未来把快环预算压到 5s 以下，否则不值得为省 2s 增加复杂度。

### 2.4 慢资产清单（28 个 smoke，按族归并）

| 资产 | 档位 | 唯一证明面 | 与谁重叠 | 本页判定 |
|---|---|---|---|---|
| `preset.e2e` | CI deploy | 真 DSH 挂载、逐角色会话、skills 隔离 | — | 保留（3.8s，已很快） |
| `release.entry` | dev-only | `npm pack` + 干净 profile + 安装域 preset.e2e + 端口释放 | `install-shape`、`lifecycle`、`cold-start` | 保留证明面；作为安装 harness 的主干 |
| `lifecycle.entry` | CI deploy | market/tarball 显示面、entry dump、`readPluginMeta`、remove | `release`、`install-shape` | 保留（显示/卸载唯一） |
| `install-shape.entry` | dev-only | 全局 `dsh` CLI 分支 + 团队层 + roster 三态 + `did not activate` | `release`（约 90% 重叠） | 合并候选：release 先支持全局 dsh 模式，再并入 |
| `product-boot.entry` | dev-only | 首启 blank Lead Session、cwd、StartCard | `client-load`（浏览器装配） | 保留（首启唯一），可并入 client-load 的 boot 相位 |
| `cold-start.entry` | dev-only | 独立 home/profile/端口/state + tarball + 浏览器 | `install-shape` | 保留为手工档；自身仅断言 `verdict/端口`，补隔离断言 |
| `doctor.e2e` | CI deploy | doctor 只读判据（缺 pack/engines/坏设置） | — | 保留 |
| `handoff.e2e` | CI keyless | 移交产物边界 + 接收指令 | — | 保留（0.95s） |
| `run-accept.e2e` | CI keyless | 回执链：归一/幂等/外部 present/秘密/repair/schema/claim | `tests/run/run-accept`（核） | 保留；先修 §3.1 |
| `secret-scan.e2e` | dev-only | CLI 扫描范围边界（默认不扫 evidence、`--all` 才扫） | `tests/run/secret-scan`（核） | 保留 |
| `data.entry` | dev-only | 真 web 零写入、假 token 不泄漏、卸载保留 | `tests/pack/data-plane-invariants`（形状） | 保留（真 IO 唯一） |
| `pack.e2e` | CI deploy | tarball 条目/模块表/sha/无 symlink | `tests/pack`（导出形状） | 保留（构建产物唯一） |
| `user-env.entry` | dev-only | 已有 bundle + 用户 overlay 共存 | — | 保留为手工档 |
| `profile-concurrency.entry` | dev-only | 并发 `plugin add/remove` 不坏 profile | — | 保留为手工档 |
| `workspace-isolation.entry` | dev-only | 双实例 home/session/workspace 隔离 | — | 保留为重型手工档 |
| `client-load.entry` | CI client-load | 真浏览器驾驶舱装配/页签/渐进面 | `e2e-021rc2.entry`、`tests/cockpit`（纯逻辑） | 保留；减纯逻辑、保装配 |
| `method-library-tool.e2e` | dev-only | 真 Loader + Host Tool + mock LLM | `tests/pack/method-library-*`（纯核） | 保留（native 唯一） |
| `e2e-021rc2.entry` | dev-only | 升级后角色 order 成组 + 两页签 + 零故障 | `tests/pack/presets`（order 字段）、`preset.e2e`（roster 在场）、`client-load`（②③ 有对应断言，退役前逐条复核）；**① 连续相邻无快替代（静态 order 只是代理，不证 picker 排序）** | **退役候选**（先补 client-load 的 picker 顺序断言，静态 order 不够） |
| `snapshot-replay.entry` | dev-only | A 回放通路 + B 真 DSH 组装请求 diff + C lead 渲染金标准 | `tests/run/replay-request`（比较器） | 保留 A/B；C 可移/减 |
| `gates.e2e` | CI keyless | 注入回归经真实 verify 入口点名报红 | `tests/contracts/verify-gates`（静态对账） | 保留；**先并行降本（非 `--only`）** |
| `client-hitl.entry` | dev-only | 真模型活标题翻转 + 挂起自动展开 + 代答落盘 | `cdp-ask`（发送/排队） | 保留薄壳；判据已抽到 `hitl-provenance` |
| `l4-lite.e2e` | dev-only | 五角色真模型响应 + scout `web_search` | — | 保留为里程碑档 |
| `team-preflight.e2e` | dev-only | `spawn_teammate` 组队与成员画像 | — | 保留为里程碑档 |
| `cdp-ask.entry` | dev-only | 空闲 Send / 在飞 Queue + `run-kickoff --session` 送达对账 | `client-hitl`（HITL UI） | 保留（发送/唤醒唯一） |
| `client-load-config.support/final/reference/seed` | dev-only | client-load 支援件（相位/参考/种子） | — | 合并为 client-load 内部模块，不单列“资产” |

### 2.5 快资产里的“判据形状”覆盖

| 指标 | 数量 | 说明 |
|---|---:|---|
| 测试文件 | 175 | 1,407 例 |
| 有 `负例留证/夹具留证` 块 | 74 | 42% |
| 标题声称 BUG-nnn | 51 | `guard-red-record` 强制红配方 |
| `*conformance*` 判据测试 | 2 | D52 后新增的显式判据测试；`guard-red-record` 强制红配方 |
| `tests/contracts` 无红配方块 | 14 | 含 `layering`、`test-surface`、`smoke-contract` 等结构测试 |

`guard-red-record` 的现状是**窄而准**：只咬“标题带 BUG”与“文件名含 conformance”两类，不要求
所有结构测试都写块。这是有意的；本页不建议一刀切扩到全部测试，而是建议把“判据测试”的声明
变成显式登记（见 §4）。

## 3. 缺口与失修

### 3.1 当前红：`run-accept.e2e` ⑦（测试资产漂移的活例）

```sh
node scripts/smoke/run-accept.e2e.mjs
# exit 1；3 项失败，末项：
# FAIL ⑦ verdict-audit 报告落 review/verdict-audit-r1.md
# ENOENT .../drt_claims/review/verdict-audit-r1.md
```

根因不是产品回归，也不是标题行，而是**声明件缺席**：

- `writeClaimFixtures`（第 75 行起）创建了 `review/claims.json` 与 `review/verdicts-r1.json`，
  但**没有** `review/readiness.json`；
- D51 的 `readinessOfSources({hasReviewDir:true})` 对“`review/` 在场但声明缺席”返回
  `{pass:false, source:'missing'}`；node-gate 预检因此红，`run-accept` 停在预检，第 ⑦ 段却仍等
  `verdict-audit-r1.md`；
- 标题 `## readiness: PASS` **不是**原因：`terminalReadiness` 的 `stripVerdictDecor` 会剥掉 `##`，
  无 `review/` 时它确实读作 PASS；有 `review/` 时缺声明才是红因。第 58 行的裸写同样不是关键。
- 诊断旁证：`scripts/lib/verdict-audit-core.mjs` 第 483 行的 warn 把这种情况说成“不是门禁认的
  终局判定行”，会把人引向改 prose；应改为区分“声明缺席/非法”和“prose 非终局行”（可随 P0
  同 diff，也可另开小卡）。

实测边界（同一夹具文本）：

```text
terminalReadiness('## readiness: PASS') = PASS
readinessOfSources({hasReviewDir:false, declarationText:null}) = {pass:true, source:'prose'}
readinessOfSources({hasReviewDir:true,  declarationText:null}) = {pass:false, source:'missing'}
```

所以“标题行不认”是误诊；真正要补的是声明件。

**修复验证（实测）**：在失败现场补 `review/readiness.json`（`{version:1,readiness:"PASS"}`）后，
`run-accept` exit 0，预检/落盘全绿，`review/verdict-audit-r1.md` 生成。P0 的修法因此是补声明件 +
抽夹具构造器，不是改标题。

**意义**：D51 改的是判据形状（`review/` 存在 ⇒ 必须有声明件），慢夹具没有同源自检；
`pnpm test`/`verify` 都绿，只有跑 5.4s 的 CI 慢冒烟才红。一个 fast fixture 合同就能在毫秒级
抓住它：构造同一夹具，用 `readinessOfSources` 断言它应是 `{pass:true, source:'declaration'}`。

### 3.2 慢冒烟的判据仍长在慢壳里

最近四张卡是同一失败类：

| 卡 | 慢壳 | 错判 | 抽出的快核 |
|---|---|---|---|
| BUG-142 | `client-load-reference.support` 选绑定会话 | 只看“富 + 标题唯一”，选中 method-editor → 假红 | `scripts/lib/client-load-select` + `tests/run/client-load-select` |
| BUG-147 | `client-hitl` ⑤b | 用“共作答 0 题”判通过 → 假绿 | `hitl-provenance` + `tests/run/hitl-provenance` |
| BUG-151 | `client-hitl` ⑤b | 用“点击计数”判已答 → 假红 | 同上，改盘侧 `selected/landed` |
| BUG-152 | `client-load` 收口 | 把“主机不健康 + 断言失败”判产品红 | `host-health` + `tests/run/host-health` |

仍内联、且抽出来收益最高的判据：

| 优先 | 位置 | 判据 | 为什么值得抽 |
|---:|---|---|---|
| 1 | `run-accept.e2e` 的 `writeClaimFixtures` | claim 夹具的 readiness/claims 形状 | 今天的红就是它；抽到 `scripts/lib` 后 `test-surface` 会强制直测 |
| 2 | `release.entry` 的 `assertCleanupTarget` | 清理目标白名单 | 破坏性 `rm` 的安全判据；白名单写错会删真目录 |
| 3 | `e2e-021rc2.entry` 的 `assertRoleGrouping` | 角色连续相邻 | 谓词可单测；真实 picker 排序仍需 client-load |
| 4 | `data.entry` 的 `treeHash/textFiles` | 包目录零写入 + 泄漏边界 | 定义“扫什么算泄漏”，与纯数据卡形状分开 |
| 5 | `product-boot.entry` 的 `canonical()` | D40 工作区身份判定 | 纯字符串归一，却只在浏览器档跑 |
| 6 | `client-load-reference.support` 的 expected 构造器 | 与 client fold 同步的期望值 | 选会话部分已抽（BUG-142）；其余仍是镜像逻辑 |

这四张卡与上表候选的共同修法不是“再跑一遍慢档”，而是**把判据核抽成纯函数，慢壳只做传输**。这套做法
已有四个范本（另加 `tests/run/replay-request`），但还没有成为新慢资产的准入条件。仍内联在慢壳
里的判据候选：`e2e-021rc2.entry` 的角色成组/页签判定、`preset.e2e` 的 roster/skills 断言、
`release`/`install-shape` 的安装成功判定、`client-load` 的 DOM 断言、`snapshot-replay` 的 A/B/C
驱动。不是所有都能抽（DOM 可见性、安装退出码是传输面），但**“选哪个对象/算不算过”应先抽**。

### 3.3 客户端纯逻辑的无直测区

`src/client` 59 个文件，测试直接 import 23 个；36 个未直接 import。其中 17 个仍经被测试的组件
可达，**真正没有任何测试路径的约 19 个**。按性质分：

| 类 | 文件 | 处理 |
|---|---|---|
| **纯逻辑/模型可见字符串**（建议补快测） | `lead-prompt.ts`、`research-graph/format.ts`、`method-library/coach-prompts.ts`、`method-library/operation-prompts.ts`、`research-config/section-labels.ts`、`defaults/labels.ts` | 直测：steer→queue 回退、短标签/图标、指令字符串逐字、id→key 映射全量 |
| **字典/折层**（多数已间接覆盖） | `locales/en.ts`、`locales/en-fold.ts`、`locales/zh-fold.ts` | 经 `locales.ts` 间接覆盖；可加键集对账 |
| **React hooks**（需渲染或抽纯） | `useStatusFeed`、`useGraphFeed`、`useLibraryData`、`useDraftState`、`useOperationQueue`、`useRunSourcePicker`、`useConfigFeed`、`useMemberActivity` | 先抽纯投影（已有 `src/lib` 折层），hook 只留 effect/setState；不强迫 jsdom |
| **组件/样式/入口**（浏览器面） | 各 `.tsx`、`styles.ts`、`index.ts`、`types.ts` | 留在 `client-load`；登记理由，不假装单测 |

现有机械面只覆盖 `src/lib`（37 个）和 `scripts/lib`（40+）；`test-surface` 没有 `src/client`
的“直测或登记”规则。新加一个纯客户端模块不会有人发现它没测试——这是“补充”的首选落点。
上表 6 个纯逻辑候选里，4 个（`lead-prompt`、`section-labels`、`operation-prompts`、`coach-prompts`）
在当前测试闭包里完全没有路径；`format`/`defaults-labels` 经组件可达但无直测。

### 3.4 夹具与判据没有同源合同

249 个夹具文件有“零孤儿”契约（`navigability-contract`），但没有“形状仍被当前判据接受”的契约。
`run-accept` 的 ⑦ 是活例；同类风险：

- node-gate/schema-scan 的 fixture 直接写 `run.md`/`review.md` 文本，判据收紧后夹具不会自动红；
- `tests/fixtures/client-load-home` 是冻结 home，D51/D52 的字段/版本变化可能让它慢慢过期；
- snapshot 的 `snapshot.json` 有 `lastRewrite` 理由门，但夹具本身没有“当前 schema 可解析”的直测。

建议的最小合同：**慢夹具的构造器抽成共享模块，直测用同一个判据函数断言“夹具应绿/应红”**；
不复制判据，不另造一套 oracle。

### 3.5 成本与所有权没有台账

`smoke-registry.json` 只有 `tier`（ci/dev-only）+ 理由；没有成本、唯一证明面、判据核、最近证据、
退役条件。后果：

- 202s 的 `gates.e2e` 与 1s 的 `handoff.e2e` 在登记表里同权；
- 没人能回答“这条慢档最近一次真的跑绿是什么时候、谁消费”；
- 退役只能靠读代码/记忆，`e2e-021rc2.entry` 就是这样活到 0.3.4 的。

`snapshots/README` 已诚实登记两个未立预算：场景资格三态、体积预算。测试资产层同样需要
“资格 + 成本”的最小台账；不需要新队列，扩 `smoke-registry` 或 `scripts/README` 一列即可。

### 3.6 重复与退役候选

| 候选 | 证据 | 风险 | 建议 |
|---|---|---|---|
| `e2e-021rc2.entry` | 头注/咒语仍写 rc.2（`:2,308`）而 pin 是 rc.5；不在 CI；②③ 在 `client-load` 有对应断言（退役前逐条复核）；`order` 字段由 `tests/pack/presets` 覆盖，但 research roles 的 5–8 连续性与 vendor 内置 1–4 的互斥**无快测试** | 静态 order 只能证“值对”，不能证真实 picker 的排序/成组；只做静态就退役会丢 UI 回归锁。若仍承诺从 0.2.1-rc.2 升级，还需保留/更新升级路径 | 先补 pack order 5–8 静态断言 **+ client-load 的 picker 顺序断言**；两者齐再退役。若升级兼容仍是承诺，改为更新到当前 pin，不退役 |
| `release`/`install-shape`/`lifecycle`/`cold-start` | `install-shape` 与 `release` 约 90% 重叠（同 init/add/start；release 多 manifest/engines/doctor/安装域 preset/端口；install-shape 多全局 `dsh` 路径/roster 三态/dump 行）；`cold-start` 自身只断言 `verdict=GREEN` + 端口，唯一面 = 独立 home/profile | 合并可能丢全局 dsh 路径/独立 home | `install-shape` 合并候选（release 先支持全局 dsh 模式，保留 roster 三态）；`lifecycle` 保显示/卸载；`cold-start` 保留但加隔离断言 |
| `client-hitl` vs `cdp-ask` | 前者证活标题/自动展开，后者证 Send/Queue/送达 | 都是真模型，成本高 | 保留两张薄卡；不再加新真模型 UI 档 |
| `snapshot-replay` C 渲染 | 只有 lead 有 `renderExpected`；C 内容已被 `tests/run/activity-fold` 覆盖，C 只锁“录制流 → DOM 字面” | 删 C 会丢这层确定性回归锁 | 保留 lead C；不扩到全角色 |
| `data.entry` vs `data-plane-invariants` | 前者真 web 零写入/卸载保留，后者纯数据卡形状 | 纯测不能替代真 IO | 保留 data.entry（手工档） |

### 3.7 结构性重复：快测已经覆盖的慢断言

- `tests/pack/presets` 已钉 preset 行字段/order 存在；`preset.e2e` 仍需要证“真挂载 + skills 隔离”——
  两者不是重复，前者是形状，后者是装配。
- `tests/run/replay-request` 已钉比较器语义；`snapshot-replay` B 仍需要证“真 DSH 写出的请求能被
  比较器读到”——两者是“判据”与“真输入”的分工。
- `tests/cockpit/*` 已覆盖大量纯折算/静态渲染；`client-load` 仍需要证“真浏览器装配 + 渐进面”——
  但 DOM 断言的**选择器/判定**应尽量下沉，减少假红面。
- **头注漂移（小但真实）**：`client-load.entry` 第 26 行说 pass-5 住“本件”，实际实现住
  `client-load-final.support.mjs`；测试资产的文档面也会腐烂，同 diff 修。

## 4. 目标围栏

### 4.1 七条原则

1. **快默认**：`pnpm verify` + `pnpm test` ≤10s；pre-commit 不跑浏览器/模型/安装。
2. **慢资产必须有唯一证明面**：没有“只有它能证”的一句话，就不进慢档。
3. **判据核先抽**：慢壳里的“选哪个/算不算过”抽成 `scripts/lib/*` 或 `src/lib/*` 纯函数，直测；
   慢壳只做传输与现场。
4. **夹具同源**：慢夹具的构造器与判据函数共享；直测断言夹具在“应绿/应红”两态的形状。
5. **成本入账**：每条慢资产登记 `cost`、`uniqueClaim`、`oracle`（测试路径数组或 `none: 理由`）、
   `sunset`；不新建队列。
6. **一进一出**：新增慢资产时，必须指出它替代的旧资产或旧手工步骤；没有消费者的慢资产退役。
7. **E2E 只证装配**：真挂载、真安装、真浏览器、真模型；不用 E2E 证纯逻辑/解析/折算。

### 4.2 目标指标（候选）

| 指标 | 现状 | 目标 |
|---|---|---:|
| `pnpm verify` + `pnpm test` | ~7s | ≤10s |
| `pnpm test` 单跑 | 4.4s | ≤10s |
| `gates.e2e` 全量 | 202s | ≤60s（worker pool，非 `--only`） |
| `snapshot-replay` 全量 | 162s | ≤60s；全脸 ≥60s 则降为“改动面定向 + 里程碑全量” |
| `client-load` | 未计时（浏览器） | 单次 boot ≤60s；纯逻辑断言移出 |
| 慢资产无 oracle | 未统计 | 0（`none` 必须有理由） |
| `src/client` 纯逻辑无直测 | 4 个无路径 + 2 个无直测 | 0（组件/hook 登记理由） |

### 4.3 登记形状（候选）

在 `scripts/smoke/registry.json` 每条上加三个字段（不新建文件）：

```json
"client-load.entry.mjs": {
  "tier": "ci",
  "job": "client-load",
  "cost": "slow",
  "uniqueClaim": "真浏览器驾驶舱装配、页签与渐进面；纯逻辑归 tests/cockpit",
  "oracle": ["tests/run/client-load-select.spec.mjs", "tests/run/host-health.spec.mjs"],
  "sunset": "当装配面可由 snapshot/preset 的 keyless 档完全覆盖时退役"
}
```

配套一个 `tests/checks/smoke-oracle-surface.test.mjs`：
- 每个 `oracle` 数组元素存在且被某个测试 import（或 `none:` 有 ≥N 字理由）；
- `cost` ∈ fast/medium/slow/manual；
- `uniqueClaim` 非空；
- 新增 smoke 不登记 = 红（与 `smoke-registry` 同款）。

这不是“再加一层门”，而是把已经写在头注里的“证明什么/不证明什么”变成可对账字段。

### 4.4 检查落家序（沿用 project-map，补一条）

1. 纯函数/契约 → `tests/`（fast）；
2. 真子系统但无浏览器/模型 → `scripts/smoke/`，判据核先抽 `scripts/lib` + 直测（medium）；
3. 真 GUI/安装/模型 → `scripts/smoke/` 或 `probes/`，只证装配（slow）；
4. 一次性 → `runtime/`；复现第二次才升格；
5. **夹具/慢壳的判据** → 与第 2 条同办：先有直测的 oracle，再写慢壳。

## 5. 迁移切片（候选，不是已批准实施）

### Slice 0：先让 CI 绿（P0）

- 在 `writeClaimFixtures` 里写 `review/readiness.json`（`{version:1,readiness:"PASS"}`），**不是**
  改 `## readiness: PASS`；同时修 `verdict-audit-core.mjs` 第 483 行把“声明缺席”说成“不是终局行”
  的误导 warn；
- 把 claim 夹具构造抽成可 import 的共享模块（住 `scripts/lib` 或 `tests/run` 的 helpers），用
  `readinessOfSources` 直测“这份夹具应判 `{pass:true, source:'declaration'}`”；
- 验收：`node scripts/smoke/run-accept.e2e.mjs` 绿；`pnpm test` 增加 1 例；`pnpm verify` 绿。
- 已实测：在失败现场补 `review/readiness.json` 后 `run-accept` 绿、`verdict-audit-r1.md` 落盘。
- 证据：当前红（§3.1）→ 修后绿。

### Slice 1：客户端纯逻辑补测（P1）

- 新增 `tests/cockpit/lead-prompt.spec.mjs`（fake remote：steer 成功、steer 失败→queue、双失败）；
- 新增/扩展 `research-graph-format`、`coach-prompts`、`operation-prompts`、`section-labels`、
  `defaults-labels` 直测（逐字/全量映射/无遗漏）；
- 新增 `tests/checks/client-surface.test.mjs`：`src/client/**/*.ts` 中**纯逻辑件**必须被测试直接
  import；`.tsx`/hooks/entry/style/type-only/字典内部件进 `CLIENT_SMOKE_ONLY` 并写理由（字典件
  可经 `locales.ts` 传递覆盖 + 键集对账）；
- 验收：新测绿；`client-surface` 对“新增纯件不写测试”真红（一次性注入）。

### Slice 2：慢资产 oracle 台账（P1）

- 按 §4.3 给 28 条 smoke 填 `cost`/`uniqueClaim`/`oracle`；先填已有范本
  （`client-load-select`、`host-health`、`hitl-provenance`、`replay-request`），其余 `none:` 写理由；
- 新增 `smoke-oracle-surface` 契约；
- 验收：登记表与盘上 smoke 集合相等；`none` 理由非空；新增 smoke 不登记 = 红。

### Slice 3：降本（P2/P3，按本地负担排序）

- **P2 `snapshot-replay`**：A/B 保留；C 只跑 lead；按 `--scenario` 定向（当前只有
  `research-face` 一族，`--face` 不解决问题）；评估 4 场景并行（独立端口/home）或单 boot 多会话；
  目标 ≤60s，否则降为“改模型可见面才跑”的定向档。
- **P2 `client-load`**：把 DOM 选择器/判定继续下沉到 `scripts/lib` + 直测；单次 boot 覆盖装配。
- **P3 `gates.e2e`**：它是 CI-only meta-test，不进本地默认/pre-commit；202s 先量 CI 需求再优化。
  若要降：**不要用 `--only`**（verify 的 `--only` 只过滤输出，全部门禁仍执行；实测
  `--only=md-links` 3.24s ≥ 全量 2.53s）；改为 worker pool + 共享 base fixture（每个 case 只
  做 clone/reset + 注入 + verify），保留一次全量对照；目标 ≤60s 需实做后测。
- 验收：目标耗时实测；全量 `gates.e2e` 仍能对 108 案例点名报红。

### Slice 4：退役/合并（P2）

- 先补两层：`tests/pack/presets` 的 research order 5–8 连续（method-editor 9 不混入）+ 与 vendor
  内置 1–4 互斥的静态断言，以及 `client-load` 对真实 picker 角色顺序/成组的断言；两层齐再退役
  `e2e-021rc2.entry`（只做静态 order 不够）；
- 评估把 `install-shape.entry` 并入 `release.entry`（release 先支持全局 `dsh` 模式；保留 roster
  三态 + §四-B CLI 分支）；若不迁，至少抽共享安装步骤。`cold-start` 保留独立 home 面并补自己的
  隔离断言；`lifecycle` 保留显示/卸载；
- `client-load-config.support/final/reference/seed` 从“资产”降为内部模块（只在 registry 保留支援件说明）；
- 更新 `scripts/README`、`docs/project-map`、`guides/60`、`smoke-registry` 的同一变更。

### Slice 5：台账/日落（P3）

- 在 `scripts/README` 或 `tests/ASSETS.md` 增加“慢资产台账”：owner、最近证据链接、成本、
  退役触发；不新建队列；
- 与 `_backlog/triggers.md` 对接：无法本轮的退役/合并登记触发条件，不静默拖延。

## 6. 验收（研究结论落地时）

- `pnpm verify` 绿；`pnpm test` 绿且 ≤10s；`pnpm typecheck` 绿（改 pack 时）。
- `run-accept.e2e` 绿；`gates.e2e` 绿且 ≤60s（或明确记“未达标 + 理由”）。
- `snapshot-replay` A/B 绿；C 仅 lead；全量耗时 ≤60s 或登记为里程碑档。
- `client-surface` 绿；新纯件不写测试 = 红（有一次性注入红录）。
- 28 条 smoke 的 `cost`/`uniqueClaim`/`oracle` 齐；`none` 有理由。
- 退役 `e2e-021rc2.entry` 前，`client-load` 的 picker 顺序断言 + 页签复核齐；静态 order 断言只是前置，不是替代。文档同变更。
- 不设覆盖率百分比门禁；覆盖率仍是观察面（沿用 `test:coverage`）。

## 7. 什么会改变结论

1. 如果 `e2e-021rc2.entry` 仍能抓到 `preset.e2e`/`client-load` 抓不到的回归，或仍承诺从
   0.2.1-rc.2 升级，它就不是退役候选，应改为“更新到当前 pin + 降频 + 抽 oracle”。
2. 如果 `gates.e2e` 的 worker pool 因共享 fixture/进程竞争产生假红，则保留串行全量；
   `--only` 只能降噪，不能作为降本手段。
3. 如果客户端纯逻辑与 React 状态耦合到无法直测，则先抽 `src/lib` 折层；抽不动就保留浏览器档，
   但必须在 `CLIENT_SMOKE_ONLY` 登记理由。
4. 如果安装矩阵的每种形态都有真实用户路径证据，L2 变体应保留为手工档，不能因“重复”删除。
5. 如果 `snapshot-replay` 的 162s 主要来自真实 DSH 启动而非断言，优化空间有限；此时应把它
   降为“改模型可见面才跑”的定向档，而不是硬压时间。

## 8. 本页不证明

- 不是完整 bug 审计：只抽取 BUG-142/147/151/152 作为“慢资产判据错层”的证据样本。
- 不是性能基准：墙钟受主机负载影响；`client-load` 未计时，真模型档未跑。
- 不证明每条慢资产都该保留/退役；退役候选都标了前提条件。
- 不是实施计划：本页不改代码、不建卡、不承诺切片顺序；切片需用户拍板后另立卡。
- 不替代 `docs/evaluation.md` 的五面验收；成本层只是观察口径，不新增第六面。


## 9. 第二遍复核（2026-11-13）

第一版写完后做了一次独立只读审计 + 关键点实跑；以下修正已回写正文，保留在此便于审阅：

1. **P0 原因修正（最重要）**：`run-accept.e2e` ⑦ 不是 `## readiness: PASS` 标题行的问题；
   `terminalReadiness` 会剥掉 `##` 读成 PASS。真正原因是夹具建了 `review/` 却没有
   `review/readiness.json`；D51 的 `readinessOfSources({hasReviewDir:true})` 判 `source:'missing'`。
   实测补声明件后 `run-accept` 绿、报告落盘。**修法 = 写声明件，不是改标题。**
2. **`--only` 降本修正**：`verify --only` 只过滤输出，全部门禁仍执行；实测 `--only=md-links`
   3.24s ≥ 全量 2.53s。`gates.e2e` 不能用 `--only` 降本；改为 worker pool + 共享 fixture，
   ≤60s 需实做后测（单 case 4.48s、4 进程并行 9.06s 仅作可行性参考）。
3. **order 范围修正**：e2e ① 是 **research roles 5–8** 连续，method-editor 9 不混入；不是 5–9。
4. **e2e 退役条件加严**：静态 order 只是代理，不证真实 picker 排序；必须先有 `client-load` 的
   picker 顺序断言，才能退役 e2e。②③ 在 `client-load` 有对应断言，但退役前仍要逐条复核。
   若仍承诺从 0.2.1-rc.2 升级，改为更新到当前 pin，而不是退役。
5. **`client-surface` 规则收窄**：不能要求 `src/client/**/*.ts` 全部直测——`index.ts`、`styles.ts`、
   `types.ts`、字典内部件会被误红；改为“纯逻辑件直测，其余进 `CLIENT_SMOKE_ONLY`”。
6. **install-shape 合并保留项**：除 §四-B CLI 分支外，还要保留全局 `dsh` 路径、roster 三态、
   dump 行；否则合并会丢全局安装 CLI 的覆盖。
7. **warn 修复降级**：`verdict-audit-core` 第 483 行的误导文案是诊断问题，不是 P0 的必要条件；
   可与 P0 同 diff 修，也可另开小卡。
8. **优先级修正**：`gates.e2e` 是 CI-only meta-test（不进 pre-commit），202s 不应排在
   `snapshot-replay`/`client-load` 之前；降本优先级改为 snapshot/client-load P2、gates.e2e P3。
9. **未变**：快核 7s、`gates.e2e`/`snapshot-replay` 的成本悬崖、客户端纯逻辑缺口、e2e 退役/
   install-shape 合并/cold-start 补断言、慢资产 oracle 台账的方向均成立。
