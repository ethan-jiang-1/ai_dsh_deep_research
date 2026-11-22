# 缺陷积压修复（BUG-320…350 中的 20 张活跃卡）

> 状态：implemented
>
> 批索引与决定账 = [修复程序卡](../../_backlog/_archived/settled_issues/2026-11-21-bug-stack-repair-program.md)。
> 本 Note 只记决定理由、输掉的方案、实际验证与未证边界；逐卡证据在卡内 `json fix-evidence`。

## 决定

1. **不做旧产物兼容（用户 2026-11-21 裁定）**：判据只认 canonical 形状；旧 `claims.json`/`readiness.json`/
   一行式 findings/手写回执/旧 plan 剩余工作一律按非法处理，不为它们放宽门或加 second reader。
   两场旧 run（`drt_pg-latest-stable`、`drt_sodium-ion-bess`）降级为修复前诊断夹具——研究结果可用，
   但不是本程序的验收目标；手改它们迁就门禁 = 改证据。
2. **一份产物一份正本，三个投影同源**：① 代码 parser/schema 是唯一判定；② 模型可见样例（模板或 skill 的
   fenced 块）就是测试输入；③ `contract-fixture` 测试把样例喂给 parser，改一侧不同步即红。落点：
   readiness（critic skill 样例）、claims（`content/templates/run/claims.json`）、findings（模板 +
   synthesis skill 块样例）、plan 剩余工作（模板表格）。
3. **canonical 形状**：
   - `review/readiness.json` v2：`version:2` + 必填 `counts {critical,major,minor,unverified,rechecked_urls}`（≥0 整数）；未知键/缺项/v1 红。
   - `review/claims.json` v2：`version:2` + `critical` 必填；禁 `must_answer/verdict/verdict_file`——裁决只住 `review/verdicts-rN.json`，同一事实不写两份。
   - `findings.md`：每个 finding 一个 `## F<n>：` 块（冒号必需），字段逐行；一行式/无冒号标题在报错里点名正确形态。
   - `plan.md` 的 `## 剩余工作`：两列表格 `| task_id | state |`（待派发/进行中/完成/阻塞）；owner/next 从节点表与 `deps` 派生，不再手写。
   - 交付回执：只认 ops `run-accept` 写的 `version:1 + slug + acceptedAt + gate.PASS`；lead 手写的 install-only 形状不是回执。
   - run 健康：derive-only（最后活动 + 最后一回合错误 + 静默阈值），不写 `run.md` 机器事实；驾驶舱横幅与 `watch-run` 共用同一 fold。
4. **流程门 G2**：`backlog-liveness` 新增「`修复就绪` 必须带同边界可复现命令，或 `复现状态：未复现` + 读法协议」。
   它先在本批 6 张空复现薄卡上取红，再落绿；防「读码即就绪」再生。
5. **11 张已不是缺陷的卡迁暂停池**（用户直派）：8 张被 `71010fef` 的新启动所有权取代、2 张实现已入树而
   最终反控未跑、1 张为获批合同取向；另有 330 已由 BUG-313 修复。**不为它们制造修复证据**，也不复活凑数。
6. **红先绿后 + 每卡一案**：每卡同边界红证（注入回归/回退旧实现实跑 exit 1）+ 绿证 + 永久 guard；
   共享守卫不替代单卡证据，卡内 `fix-evidence` 的 `exit` 为 oracle。

## 输掉的方案

- **双轨/兼容（v1 计划的推荐）**：让门禁同时接受旧形状。输在：过去六批（260→350）反复放宽判据没有收敛，
  每轮只是追认另一种写法；且旧形状本身与模板/技能不一致，保留它们等于保留"第二真相"。
- **手改两场旧 bundle 让 run-accept 转绿**：改证据迁就门禁，tests/AGENTS 明令禁止；且 B 的卡外红里有
  真实的交付缺陷（覆盖表缺行、未解释 CRITICAL），门禁判定是对的。
- **把 `must_answer/verdict` 并入 claims v2**：会与 `verdicts-rN.json` 形成双份事实；裁决的唯一家是 verdicts 文件。
- **`run.md` 写 `phase: stalled`**：模型手写机器事实 = 第二真相；改为从事件派生 + 横幅/CLI。
- **按 BUG 号逐张修**：会先撞 11 张已被取代的幽灵卡；批次按机制聚类并用共享 owner 修。
- **为 348 直接加静默告警（只看 quietMs）**：正常长回合误报；必须叠加"最后一回合有错误"。
- **345 接受 install-only 回执**：lead 手写机器事实就是根因；收紧到工具形状，旧形状保持未见证。

## 实际跑过的验证

- 批次收口：`pnpm verify` 全绿；`pnpm test` **1457 spec + 266 checks 全绿（零 skip）**；`pnpm typecheck` 与 `pnpm build` 全绿。
- 真进程：`node checks/smoke/channel-start.e2e.mjs` **13 项全绿**（含 `ps unreadable` 与继承管道保锁负控）；
  `node checks/smoke/run-accept.e2e.mjs` 全绿（含协议夹具带 evidence 的壳级用例）。
- 模型可见面：readiness/claims/plan/findings 的 skill/manual/模板变更后，5 个角色 fixture **全部重录**
  （`record-role-fixture`，真模型探针、哨兵在场），`snapshot-replay.entry --face research-face --update-expected`
  **A/B/C 5 场景 ALL PASS**；`skill-golden`、`asset-ledger`、`test-index` 同变更。
- 真实数据：BUG-348 用 `runtime/e2e-2026-11-20/runb-events-full.jsonl` 重放 02:35–08:47 窗口 →
  `stalled=true / quiet=372min / error=DeepSeek Messages transport failed`；正常长回合（无错误）不告警（单测）。
- 注入红证（逐卡）：见 §卡→case 表；每张卡的红证命令在卡内 `json fix-evidence` 的 `red` 字段（exit≠0 为 oracle）。

## 判据形状

| 产物 | 权威输入 / 写入者 | 缺 / 非法 / 互斥 | 反证 | 旧形态退场 |
|---|---|---|---|---|
| readiness v2 | critic skill 写；`parseReadinessDeclaration` 读 | 缺 counts、未知键、version≠2、错值 → 红 | 删 counts 校验 → 对应例红 | v1 与扁平计数键不再接受 |
| claims v2 | lead 按模板写；`parseClaims` 读 | 缺 critical、未知字段（含 verdict/must_answer）、version≠2 → 红 | 加 verdict 字段 → 例红 | rich ledger 不再接受 |
| findings 块 | lead 写；`parseFindingsOf` 读 | 一行式/无冒号标题 → 报错点名形态；重复 F#/幽灵 lens 红 | 改回一行式 → 例红 | 一行式不再隐式接受 |
| 剩余工作表 | lead 写；`plan-gate` 读 | 非表格、未知 task_id、非法 state、空表+active → 红 | 回退 bullet 判据 → 6 例红 | owner/next 字面判据退场 |
| 交付回执 | ops `run-accept` 写；`deliveryFromReceipt` 读 | 非工具形状（缺 version/slug/acceptedAt/gate）→ null | 放宽回执 → install-only 例红 | 手写 install-only 不算回执 |
| run 健康 | 事件流派生；`runHealthOf` | 静默但无错误 / 有错误但仍有活动 → 不告警 | 只看静默 → 误报例红 | 无 model-written 状态 |

## 卡→case 表

| 卡 | 修复点 | guard |
|---|---|---|
| 327 | probe 缓存键唯一构造器（MCP 入键） | `tests/run/channel/channel-cache.spec.mjs` |
| 328 | plan 快照比对解码事实 | `tests/run/gates/plan-gate.spec.mjs` |
| 329 | threshold 未知范围给 unscoped warning | `tests/run/gates/protocol-core.spec.mjs` |
| 333–336 | `parsePort` 唯一端口正本（四入口） | `tests/run/shared/port.spec.mjs` |
| 338 | 自动端口有界重选（显式端口不重选） | `tests/run/harness/port-reclaim.spec.mjs` |
| 340 | protocol-audit 壳 import + null 守卫 | `checks/smoke/run-accept.e2e.mjs` |
| 341 | findings 块格式 + 报错点名 | `tests/run/gates/findings-contract.spec.mjs` |
| 342 | plan 剩余工作表（task_id\|state） | `tests/run/gates/plan-gate.spec.mjs` |
| 343 | readiness v2（counts） | `tests/run/gates/readiness-declaration.spec.mjs` |
| 344 | runSettled 追加无在飞子代理 | `tests/run/shared/run-state.spec.mjs` |
| 345 | 回执只认工具形状 | `tests/run/gates/final-target.spec.mjs` |
| 346 | 静默判据 kill(-pgid,0) | `checks/smoke/channel-start.e2e.mjs` |
| 347 | 无 review 面 = absent（pass=null） | `tests/run/gates/readiness-declaration.spec.mjs` |
| 349 | 嵌套沙箱探测 + 运行时声明 | `tests/pack/content/content-effect.spec.mjs` |
| 350 | claims v2（critical 必填、禁 verdict 字段） | `tests/run/gates/verdict-audit.spec.mjs` |
| 348 | run 健康 fold + 横幅文案 fold + watch-run | `tests/cockpit/lib/run/health.spec.mjs` |

## 残余与未证边界

- **348 的横幅在打开会话时不可达**：follow 快照注入的生命周期事件会把静默窗口清零（351）。
  已修：活动谓词收窄 + 客户端 tick；真快照重放与 durable log 同判。研究状态页挂载仍以
  `client-load.entry --seed` 的既有绿为准（终稿端到端 1 例 SKIP）。
- **旧 shape 兼容**：两场旧 run 在新判据下保持红（预期）；它们的 `readiness/claims/findings/plan` 不迁移。
- **345 窗口残差**：vendor follow 快照窗口不改；present-only 且窗口外且无工具回执 = 未见证（不伪造）。
  生产侧正路 = 交付时跑 ops `run-accept` 写回执；工具回执的消费路径已由 352 修复。
- **新 canonical 的模型遵守**：模板/fixture 已就位，但模型是否照写只有下一次自然 P5 run 能证明；
  `run-accept` 会在那次红。触发条件已登记 `_backlog/triggers.md`。
- **旧 run B 的卡外红**（未建卡，门禁判定正确）：`W2.1 owner_role` 含 `executor=`（plan schema 无 executor
  落点，是下一个待议的合同缺口）、`W2.2 task_id` 非 plan-only、review 覆盖表缺 T1/T2/T3、未解释 CRITICAL
  C7/C1 而 readiness=PASS。它们是生产者错误/真实交付缺陷，不为它们放宽门；下一次自然 run 若复发再建卡。
- **349**：探测只影响模型可见提示；workflow 的真实失败仍由 `waves/W2.json` 如实记录；未跑真模型 run。
- 未跑：完整 L4 run、L2 安装档（本批未改安装形态）、跨平台矩阵。

## 后续修正（2026-11-22，BUG-351/352）

上一批的 345/348 在真实路径上各有一个可达性缺口，已由两张回归卡修复：

- **352（回执身份）**：回执的 `slug` 是 bundle 目录名（`drt_<slug>`），驾驶舱传裸 slug；严格相等让
  345 的「回执兜底」成为死代码。修法 = 在 `deliveryFromReceipt` 一处归一，`present.path` 的 `drt_`
  前缀不动；fixture 改用真实 `run-accept` 形状（`drt_x` + 裸 `x`）。
- **351（停摆可达性）**：`runHealthOf` 对任何带时间的事件更新活动时间，而打开历史会话时 follow 快照
  注入 `session/end-seed` 等生命周期事件（时间戳 = 打开时刻）。修法 = 活动谓词收窄为 agent 回合工作
  事件；`useStatusFeed` 加 30s tick，`now` 不再冻在 `useMemo`。真 follow 快照（11 事件，含 4 条
  生命周期）重放 → `stalled=true`，与 durable log 同判。
- **类级修正（G9–G11）**：① 守卫夹具必须来自真实生产者产物，并写明调用方真实参数形状（352）；
  ② 两个 oracle 判同一事实时要有同输入集对账（351 的 durable vs snapshot）；③ 时间谓词必须有推进面
  与可执行的源码/假时钟守卫（351 的 tick）。
- **未证边界**：351 的浏览器「打开即显示横幅 / 停留跨阈值」未复验——`client-load.entry --seed` 因主机
  load 20.6 判 NOT-RUN；下一次 client-load/dev-home 运行触发复验（triggers 已登记）。

### 2026-11-22 第二批回归（BUG-353/354/355）

- **353/354（停摆横幅的可行动门）**：348/351 只修了「停摆判据」，没修「该不该给行动指令」。
  收成一个四轴 gate（`stalled × bound × delivered × hitl`）：只有**已绑定、未交付、未挂起**的 run
  才显示恢复指引。真浏览器复跑：已交付 run → `delivered=true / stalled=false`；未绑定会话 →
  `unbound=true / stalled=false`，各自的如实说明照常。
- **355（图谱读失败）**：`planState` 增加 `error`，`!read.ok` 与 catch 不再落 `missing`；
  图谱显示「计划读取失败 + 重试读取」，`missing` 只留给文件真缺席。真浏览器：
  `planUnreadable=true / failureState=true`，文案不再出现「没有 plan.md」。
- **类级修正**：① 可行动横幅必须有权限门 + 四轴真值表（纯函数，JSX 只消费）；②「读失败 ≠ 缺席」
  要做 reader 扫描。本轮有界扫描：final tab、method-library、run-context 已区分 missing/unreadable；
  图谱快照轨仍用 `snapshotState='missing'` 但文案是 `oldGraphUnread`，登记 trigger 复核，不建卡。
- 未证边界：无（三张卡的现场浏览器脚本均复跑绿）。

### 2026-11-22 第三批（BUG-356…360）

- 第二批的「读失败 ≠ 缺席」按 reader 扫描，未覆盖消费者：`useStatusFeed` 仍把 `Outcome` 折平，
  终稿页签仍按版本账重算目标。第三批把观察面事实模型（`SourceRead` / `StatusReads`）、地址目标版本、
  交付×审查矩阵一次补齐；五卡证据与决定 = [观察面事实真实性 Note](2026-11-22-observation-truthfulness.md)。
- 本批补充 355 的类级结论：读失败要修在消费者边界（bundle/review/evidence 三态 + 步骤 unknown），
  不只在 reader；浏览器五场景入口 = `checks/smoke/cockpit-truth.entry.mjs`。

### 2026-11-22 第四批（BUG-361…368）

- 第三批的三态仍缺 `empty/invalid`，且事实清单只到 bundle/review/evidence；question/回执/readiness/
  终稿 reader 的读取点各自折平。第四批把 `artifact-read` 五态 + 完整事实清单 + `finalViewOf`
  回退可见一次补齐；八卡证据与决定 = [观察面工件真实性 Note](2026-11-22-observation-artifact-truth.md)。
- 同一观察面第三次复发后的流程修正：G19 读取点收口（源级零裸 `view.read`）、G20「先闭合清单与
  机械入口，再做卡片修复」；浏览器九场景入口 = `checks/smoke/cockpit-artifact-truth.entry.mjs`。
