# 评估框架 — 本 repo 的验收合同

> 性质：**合同**（评估怎么判，只写 now）。改评估标准本身 = 一个 D 号决策，进 `notes/`，不悄悄改；时变状态（哪个面跑到哪了）不住本文件；工作进度由当前授权范围与会话记录表达。
> 证据选择（失败类 → 最低可见层；五关/四账）= [guides/67](guides/67-test-strategy.md)；L0 全量门禁逐条台账 = [reference/gates-ledger.generated.md](reference/gates-ledger.generated.md)（自动生成）。

## 0. 血缘与权威

| 原则 | 权威出处 |
|---|---|
| 完成定义 = 该面最小"真检查"通过；发现权在代理一侧 | company repo D15（依据 vendor `docs/testing.md` + postmortem 0001–0003） |
| no-key 测试只证明管道通；with-key 才证明 agent 真的能用 | vendor/dsh `docs/testing.md` "with-key policy" |
| Verify the world, not the self-report（断言重读文件/重跑命令，不信 agent 自述） | vendor/dsh `docs/testing.md` |
| 真入口路径 = 发布产物（npm pack → 干净 profile → plugin add → 真会话） | vendor/dsh `docs/testing.md` + company `docs/release.md` |
| 真模型/真浏览器不进 keyless 回归（layering 守卫防混） | company `tests/layering.spec.ts` 模式 |
| 每条新门禁带反证：先注入回归看红 → 还原 → 绿 | vendor/dsh `docs/testing.md` "A guard only guards if…" |
| 挂载失败只有真会话抓得到（dump/roster 看不见） | company postmortem 0001 → `preset.e2e.mjs` |

## 1. 五个评估面

每面 = 一个可独立判定的检查域。**面与面不互抵**：L4 绿不能补 L0 红。探针（根 `probes/`）**不是第六个评估面**：它是 L1/L4 的证据工具，定义与操作 = [guides/66](guides/66-probe-playbook.md)。

### L0 结构面（机械门禁，keyless）

- **定义**：仓库结构、文件卫生、preset 声明完整性、vendor 铁律与静态契约等机械可查的不变量。
- **最小真检查（fresh clone 可跑）**：`pnpm verify`（= `node checks/verify/verify.mjs`，含 `pack-lint`）+ `pnpm test`（命令正本 = [reference/commands.md](reference/commands.md)；默认回归，含 `.mjs` `checkJs` 与领域语义扫描）——两件均 keyless、无 vendor 构建产物。
- **加跑面**：
  - `pnpm lint`（standalone oxlint 检查 pack `src/`）；
  - `pnpm test:vendor`（vendor **源码**契约：组合层与设置 schema；根 tsconfig 源映射，fresh clone 可跑）；
  - `pnpm typecheck`（pack 双半类型面 + `tsconfig.scripts.json` 脚本域；pack 半需要 vendor 构建产物，不计入 fresh clone 最小集）；
  - 改门禁时可 `--only=<gate[,gate]>` 只判该门（收尾仍须全量）并跑 `node checks/smoke/gates.e2e.mjs --gate=<name>`；
  - 改驾驶舱（client 面，[D18](decisions.md#d18)）加跑 `node --import tsx/esm checks/smoke/client-load.entry.mjs`（CI/干净机器加 `--seed tests/fixtures/client-load-home`；失败留 `runtime/smoke-workspace/client-load-*` 现场；无窗口内交付目标 = exit 2 SKIP，主机不健康/连接死亡 = exit 2 NOT-RUN，判据 = `lib/host-health`，未跑 ≠ 通过）；观察面事实/终稿目标改动加跑 `cockpit-truth.entry`、`cockpit-artifact-truth.entry`、`cockpit-truth-residuals.entry`、`cockpit-truth-substance.entry`、`cockpit-locale.entry`（路由正本 = [guides/60 §2](./guides/60-dev-loop.md)）。
- **门禁自动台账**：全量 L0 门禁清单与域归属、断言摘要、自测覆盖自动生成于 [reference/gates-ledger.generated.md](reference/gates-ledger.generated.md)（由 `gate-ledger-sync` 与 `checks/verify/context.mjs` `gates` 数组机械对账，改门禁后执行 `pnpm docs:gen`）。
- **反证口径（两态）**：常驻 = [gates-cases.mjs](../checks/lib/harness/gates-cases.mjs) 的 `CASES` 注入案例（零注入对照组绿 + 注入后点名红；结构性不适门禁的例外清单与理由住同文件 `NO_CASE_GATES`，由 `tests/checks/harness/verify-gates.test.mjs` 反向对账，反证 = 一次性 Note 红录）。
- **契约回归（`pnpm test` 守卫族，全量模块映射见 [tests/INDEX.generated.md](../tests/INDEX.generated.md)）**：
  - **文档与台账**：[decisions-now.test.mjs](../tests/checks/repo/decisions-now.test.mjs)、[docs-consistency.test.mjs](../tests/checks/repo/docs-consistency.test.mjs)、[docs-reference.test.mjs](../tests/checks/repo/docs-reference.test.mjs)、[navigability-contract.test.mjs](../tests/checks/repo/navigability-contract.test.mjs)、[readme-manual-commands.test.mjs](../tests/checks/repo/readme-manual-commands.test.mjs)、[release-copies.test.mjs](../tests/checks/repo/release-copies.test.mjs)、[install-copies.test.mjs](../tests/checks/repo/install-copies.test.mjs)；
  - **run 与数据面**：[run-bundle-charter.spec.mjs](../tests/contracts/run-bundle-charter.spec.mjs)、[schema-scan.spec.mjs](../tests/run/gates/schema-scan.spec.mjs)、[verdict-audit.spec.mjs](../tests/run/gates/verdict-audit.spec.mjs)、[findings-contract.spec.mjs](../tests/run/gates/findings-contract.spec.mjs)、[review-contract.spec.mjs](../tests/run/gates/review-contract.spec.mjs)、[protocol-core.spec.mjs](../tests/run/gates/protocol-core.spec.mjs)、[data-plane-invariants.spec.mjs](../tests/pack/contract/data-plane-invariants.spec.mjs)；
  - **pack 与内容**：[content-injection.spec.mjs](../tests/pack/contract/content-injection.spec.mjs)、[template-contract.spec.mjs](../tests/pack/contract/template-contract.spec.mjs)、[content-disclosure.spec.mjs](../tests/pack/contract/content-disclosure.spec.mjs)、[presets-wiring.spec.mjs](../tests/pack/contract/presets-wiring.spec.mjs)、[content-coverage.spec.mjs](../tests/pack/contract/content-coverage.spec.mjs)、[role-consumer-matrix.spec.mjs](../tests/pack/contract/role-consumer-matrix.spec.mjs)、[bundle-composition.vendor.spec.mjs](../tests/vendor/bundle-composition.vendor.spec.mjs)、[skill-parser-contract.spec.mjs](../tests/contracts/skill-parser-contract.spec.mjs)；
  - **驾驶舱与客户端**：[client-surface.test.mjs](../tests/checks/test-infra/client-surface.test.mjs)、[client-file-size.test.mjs](../tests/checks/repo/client-file-size.test.mjs)、[client-effect-return.test.mjs](../tests/checks/repo/client-effect-return.test.mjs)、[no-unused-code.test.mjs](../tests/checks/repo/no-unused-code.test.mjs)、[tabs-fault-matrix.spec.mjs](../tests/cockpit/client/tabs-fault-matrix.spec.mjs)、[run-property.spec.mjs](../tests/cockpit/lib/run/run-property.spec.mjs)、[plan-mdast.spec.mjs](../tests/cockpit/lib/plan/plan-mdast.spec.mjs)；
  - **车道、静态防线与发布闭环**：[test-lanes.test.mjs](../tests/checks/shared/test-lanes.test.mjs)、[smoke-oracle-surface.test.mjs](../tests/checks/test-infra/smoke-oracle-surface.test.mjs)、[smoke-cost-budget.test.mjs](../tests/checks/test-infra/smoke-cost-budget.test.mjs)、[ci-workflow.test.mjs](../tests/checks/test-infra/ci-workflow.test.mjs)、[shipped-surface.test.mjs](../tests/checks/repo/shipped-surface.test.mjs)、[release-anchor.test.mjs](../tests/checks/repo/release-anchor.test.mjs)、[scripts-typecheck.test.mjs](../tests/checks/repo/scripts-typecheck.test.mjs)、[semantic-guardrails.test.mjs](../tests/checks/repo/semantic-guardrails.test.mjs)。
- **通过判据**：全绿；门禁自动台账与 `tests/` 守卫完整同步。
- **何时跑**：每轮 goal 续驶必跑。

### L1 挂载面（真挂载 = preset 类改动的完成定义）

- **定义**：每个研究角色 preset 在**真 DSH 会话**里挂载成功——persona 生效、skills 可见、工具面齐全（dump/roster 可见不算，挂载失败只有真会话抓得到）。
- **最小真检查**：`node checks/smoke/preset.e2e.mjs`——keyless 预检 + 真会话档（`DSH_SMOKE_REAL=1`：boot 真 web/headless 逐角色建会话，机器断言工具/skill 面在场；落地证据 = [L1/L2 绿灯 Note](../notes/archived/2026-09-24-l1-l2-green.md)）。
- **通过判据**：全部角色真挂载绿；失败角色即里程碑未完成。
- **何时跑**：preset 内容/结构改动时；里程碑必跑。

### L2 安装面（真实安装形状）

- **定义**：插件以用户实际获得的方式可用——`npm pack` 产物完整，装进**干净 profile** 成功，起会话可用，client 半在安装形状里在场。
- **最小真检查族**（命令与参数正本 = [guides/60 §2](./guides/60-dev-loop.md)）：
  - **发布面/显示面**：`node checks/smoke/lifecycle.entry.mjs`（`market.json` 过 DSH `parseMarketIndex` → 装 tarball → dump → 真启动无降级 → `readPluginMeta` 五 specifier 中英元数据 → `remove` 回落；缺前置 exit 2）；
  - **安装与首启（[D40](decisions.md#d40)）**：`node checks/smoke/install-shape.entry.mjs`（手册 CLI 装包分支：profile init → plugin add → 真启动）+ `node checks/smoke/product-boot.entry.mjs`（真 Web + 浏览器首屏与工作区会话）+ `node checks/smoke/release.entry.mjs`（`npm pack` → 重建 profile → `plugin add` → doctor `--install-only` → 安装域会话断言）；
  - **冷启动与诊断**：`node checks/smoke/cold-start.entry.mjs`（独立 home/profile/端口/state 到浏览器面 GREEN）+ `doctor.e2e.mjs`（fake anchor 只读判据）。
- **通过判据**：pack 清单与 `files` 一致、安装零缺失警告、roster 三态正确、首屏可达、`lib/client.js` 在场、端口释放无残留。
- **何时跑**：包结构、startup/client 恢复、release 相关改动及里程碑必跑。

### L3 领域面（Deep Research 方法论完整性）

- **定义**：从 codex Deep Research harness 提炼的方法论在本插件上有完整落点，且用 DSH 原生载体实现。
- **最小真检查**：[design/30-methodology-mapping.md](design/30-methodology-mapping.md) 映射表审查 + `tests/checks/analyze/evaluation-contract.test.mjs` 与 `tests/contracts/methodology-mapping.spec.mjs` 断言。
- **通过判据**（五条全要）：
  1. **生命周期映射完整**：立项对齐 / 广度侦察 / 深度挖掘 / 综合写作 / 质量把关 / 审阅交付在映射表均有 DSH 落点或带证据的弃用理由；
  2. **角色分工单一职责**：每类事实单一 owner，无双 owner 或无 owner；
  3. **证据可追溯载体存在**：最终报告关键结论 → 来源文件有明确 frontmatter 契约与追溯链；
  4. **信噪比策略显式**：来源质量分级 / 多源交叉 / 反例与弃用判据写进角色 skill；
  5. **读者版合同**：critic PASS 后按 `reader-final` 派生 `final/readable.md` → `final/readable-vN.md`，由 `node-gate` 门C 与 `presets.spec.mjs` 机械把守。
- **何时跑**：方法论/preset 内容改动及里程碑必跑。

### 证据谓词与机械强度（开发仓观察面，非模型可见）

- **有效证据谓词（分层）**：run 仪表盘与驾驶舱按同一契约投影——**硬五字段**（`source_url` / `retrieved_at` / `quality` / `found_by` / `supports`）全齐才算有效证据，缺任一标无效；**软二字段**（`source_tier` / `publisher`）缺失不否决有效性，标"未分级"（旧 run 存量不回填）；对账 = `tests/checks/analyze/evaluation-contract.test.mjs`。
- **机械强度诚实记账**：`evidence-audit` 核 `source_url` 成功抓取、摘录覆盖与 final 引用链（结果落 `audit.md`），不校验日期校准或版式结构（由 critic 狩猎）。

### L4 交付面（真模型端到端）

- **定义**：真模型、真实研究问题、完整研究 run，产出可核查报告。
- **L4-lite（框架里程碑档）**：`l4-lite.e2e.mjs` 每角色一条真模型消息 + scout `web_search` 真实调用。
- **L4 全量（方法论里程碑档）**：一个真实问题的完整 run；六条判据中**四条机器、两条人工走查**：

  | 判据 | 类型 | 载体 / 命令 | 通过 |
  |---|---|---|---|
  | ① 报告存在且含来源清单 | 机器 | `node checks/run-gates/node-gate.mjs <bundle>`（门A）+ `final/vN` 在场 | exit 0 |
  | ② 结论能回溯到来源文件 | 机器 | `node checks/run-gates/evidence-audit.mjs <bundle>` → `audit.md` | exit 0 且 `CRITICAL=0` |
  | ⑤ claim 级裁决覆盖（新契约 run） | 机器 | `node checks/run-gates/verdict-audit.mjs <bundle>` → `review/verdict-audit-r<N>.md` | exit 0（critical 全有结论性裁决） |
  | ⑥ Protocol 工件与审计（新契约 run） | 机器 | `node checks/run-gates/protocol-audit.mjs <bundle>` → `protocol-audit.md` | exit 0（schema/effort/output/投影/批准链与无环图自洽） |
  | ③ 两点交互纪律（HITL 之间静默自主） | 人工走查 | 会话日志里 HITL1 与 HITL2 之间无 `ask_user_question` 或请示汇报 | 结论一行 + 日期写入 bundle `acceptance.md`「人工走查」节 |
  | ④ 中断后从 run 工作区恢复 | 人工走查 | 停通道 → 重启 → 新会话说「继续 `<slug>`」可接续且不依赖 chat memory | 同上 |

  人工走查不是"随便看看"：**没有记录 = 未跑**（未跑 ≠ 通过）；`acceptance.md`「人工走查」节不可再生，`run-accept` 重跑与 `--repair` 均保留它。
- **何时跑**：里程碑 + [guides/60 §2](guides/60-dev-loop.md) 要求跑 L4-lite 的改动取并集；L4 全量仅在里程碑跑。

### 五面的退出语义（统一口径）

每面的最小真检查按三态收口：**exit 0 = 该面绿 / 1 = 红 / 2 = 未跑（前置缺席）**。未跑 ≠ 通过——交付报告必须分列"已跑绿 / 已跑红 / 未跑"。脚本正本 = [checks/AGENTS §冒烟脚本可靠性纪律](../checks/AGENTS.md)：

| 面 | 最小真检查的退出码来源 |
|---|---|
| L0 | `node checks/verify/verify.mjs` + `pnpm test`（均 0/1；无 2 态） |
| L1 | `preset.e2e`（缺环境 exit 2） |
| L2 | `lifecycle.entry` / `release.entry` / `install-shape.entry` / `product-boot.entry` / `cold-start.entry` / `doctor.e2e`（缺前置 exit 2） |
| L3 | `pnpm test` 的 `methodology-mapping` + `evaluation-contract`（0/1） |
| L4 | 机器 ①②⑤⑥ 审计脚本退出码；③④ 人工走查记录在场即"已跑"，缺席即"未跑" |

### 完成判断四分离（交付判断公理）

**能加载 ≠ 有行为证据 ≠ 能安装 ≠ 已获交付批准——四个结果必须分别被观察和记录**（[discipline-map 源 11](discipline-map.md#source-11)）：

| 结果 | 证明它的面 | 不证明 |
|---|---|---|
| 能加载 | L1 真挂载（roster、逐角色会话建起） | 行为正确、安装形态可用 |
| 有行为证据 | L1 行为断言 + L3 契约 + L4 与 run 机械审计 | 安装形态可用、交付获批 |
| 能安装 | L2 `release.entry`（发布产物 → 干净 profile → 安装域） | 交付获批 |
| 已获交付批准 | 收尾对账 + 语义自审（[reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md)）+ 用户批准 | —（终点） |

**交付判断四角色**各证明不同的东西、互不冒充：**机械检查** · **语义自审** · **用户批准** · **显式交互**。

### 完成判据的四个作用域（谁管哪一层）

| 作用域 | 回答什么 | 正本 |
|---|---|---|
| 面级 | 这次改动涉及的每个评估面各自绿了吗 | 本页 §1（下限：缺一面即未完成） |
| 任务级 | 本轮授权范围内的交付做完了吗 | [guides/60 §0/§4](guides/60-dev-loop.md)（交付收尾五件） |
| goal 级 | 跨轮目标达成吗 | 本页 §3 里程碑矩阵（只对持续目标） |
| 语义级 | diff 与意图/文档/证据说的是同一件事吗 | [reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md) |

**优先序**：面级是下限；任务级决定当次能否交付；goal 级只在持续目标生效；语义级可否决前三者但不能替代机械面证据。

### 判据形状：判据不猜，投影不编（跨面）

<a id="verdict-shape"></a>

| 层 | 例子 | 读不出 / 有歧义时 | 禁止 |
|---|---|---|---|
| 判据 | 交付门、审计、验收决定 | **红**，并给出可执行的改法 | 「取最后一个 / 取最像的 / 关键词命中即算」 |
| 投影 | 驾驶舱、仪表盘、回放 | 显式 `unknown` / `unreadable` | 显示一个看起来合理的值 |

- **权威输入 = 结构化事实**：canonical JSON、会话事件、文件事实；散文仅作交叉核对，不一致 = 红（交付终局权威 = `review/readiness.json`）。
- **不猜、不增兼容分支**：互斥或只有散文包裹 → 判「无法判定」；既有 schema/日期断代见 [D33](decisions.md#d33)。
- **机械化**：变异矩阵 + 不变量测试住 `tests/contracts/verdict-conformance.spec.mjs`；规则依据 = [verdict-shape Note](../notes/implemented/2026-11-13-verdict-shape.md) + [workflow-substance-gates Note](../notes/implemented/2026-11-13-workflow-substance-gates.md)。

## 2. 负面判据（任一出现 = 框架不合理，触发重构而非继续堆功能）

1. 自建机制与 DSH 现成载体重复，且拿不出"DSH 载体不可用"的证据——**不发明纪律**；
2. 角色职责重叠或漂移，某类事实出现双 owner / 无 owner；
3. 挂载假绿：preset 在 dump/roster 可见但真会话缺工具/skill；
4. 生命周期环节在 DSH 上无落点且无弃用登记；
5. keyless 回归里混入真模型/真浏览器依赖（layering 违例）；
6. 评估面互抵尝试（拿 L4 绿掩盖 L0 红）。

## 3. 里程碑 × 面 矩阵

> 里程碑前缀统一为 `MS1` / `MS2` / `MS3+`，与运行形态 `M1–M3`（[guides/65](guides/65-run-forms.md)）彻底分离。

| 里程碑 | L0 | L1 | L2 | L3 | L4 |
|---|---|---|---|---|---|
| MS1 框架搭建 | ✓ | ✓ | ✓ | ✓ | lite |
| MS2 首次完整研究 run | ✓ | 改动则跑 | 改动则跑 | ✓ | **全量** |
| MS3+ 打磨/回归固化 | ✓ | 改动则跑 | 改动则跑 | 改动则跑 | 按需 |

里程碑进度由本轮目标与交付范围判断；本表只定义里程碑验收形状，不携带时变状态。

## 4. 每轮 goal 续驶的判定程序

1. 每轮必跑 L0；改动涉及哪些面就加跑哪些面，只报告实际跑过的检查；
2. goal 标 `complete` 的唯一条件：当前里程碑矩阵全绿；
3. 同一面连续 3 轮无法转绿且阻塞条件明确 → goal 标 `blocked`，区分"缺上游能力"与"设计缺陷"；
4. 评估标准本身的变更 = D 号决策登记，禁止静默放宽。

## 5. 已知限制与延后工作（诚实记账）

- L1/L2/L4 需要真 DSH 环境与（L4）`DEEPSEEK_API_KEY`；环境未就绪时该面标"未跑"，**不等同通过**。
- `watch-run` 轮询循环与 `tools/env.sh` 本体为壳面不测（状态谓词与折算已下沉 `checks/lib/` 由 `pnpm test` 覆盖）。
