# 审计 P3 收尾轮（门禁小加固与清单对账打包）

> 状态：implemented

## 问题（背景）

全仓 DSH-native 审计（2026-10-07）的 P3 级发现中，有一批"值得做但不紧急"的机械加固与清单
对账项——单件都小，凑一轮卫生批次做掉，避免散落遗忘。P1/P2 已在当轮修复（审计批次一），
本条目只收 P3 的条目化残部。

## 决定

十件全部落地（2026-10-08，分批 A→B→C 经呈批批准），逐件对账：

| # | 件 | 落点与判据 | 结果 |
|---|---|---|---|
| 1 | client-keys 收口 | `RESEARCH_TOOL_KEYS` 搬进 `src/client/keys.ts`（族正本）；门禁补三规则：keyed 数组族导出只许住 keys.ts（Cordis `inject` 合同豁免——首跑误咬后收窄）、族值引号字面量别处即红、register 描述符 shorthand `key,` 取值溯源（无冒号盲区） | **加宽首跑实咬真债**（族正本漂移）→ 搬正本转绿；注入内联族数组 → 族值+shorthand 双规则齐红 → 还原绿；`pnpm build` 通过；client-load-smoke 8/10（加载/渐进面/零泄漏全绿；2 FAIL = 侧栏可见性环境陈旧——**stash A/B 对拍**：旧客户端同型两红，证明与 diff 无关） |
| 2 | README 清单对账 | 选**纯指路**而非 sync 门禁（role-list-sync 完整哲学 = 消灭手抄副本而非守卫它；"六个/五件"计数同 count-free 腐坏形态） | pack README 21/25 行改指路（清单正本 = 盘上目录 / design/40）；grep 手抄清单清零；零新门禁成本 |
| 3 | persona↔fold 签名契约 | `tests/hitl-signature-contract.test.mjs`：从 fold 源**提取**判型签名断言 lead persona 逐字携带（不手抄第二份词表，双向钉） | 注入删 persona「按现稿定稿」→ 红（BUG-002 形态捕获）→ 还原绿；防空语料断言在案 |
| 4 | doc-budgets ls-files 化 | AGENTS.md 枚举 walk→`git ls-files`（tracked-only） | **误红实证先行**：runtime 探针 AGENTS.md 注入 → 旧实现红（潜伏面坐实）→ 修后探针在场仍绿；tracked 未登记注入仍红（守卫力在） |
| 5 | 端口独占门禁 | 新门禁 `port-exclusive`：tracked scripts/+dev/ 端口缺省声明查重；`DSH_RUN_PORT` 引用豁免（通道连接方）；0 声明防空语料 | **首跑实咬真债** 3102 双认领（team-preflight × entry-chain-probe，file:line 逐字）+ 3105 二咬（人记不住注册表的教学案例）→ entry-chain-probe 迁 3114；注入 3101→3102 红 → 还原绿 |
| 6 | pre-commit 激活态 | 新门禁 `hooks-active`：`core.hooksPath` 指向 dev/hooks（GIT_* 剥离） | unset → 红（修正入口 = source dev/env.sh）→ 重设还原绿 |
| 7 | 路由表补行 | guides/60 §2 新增「改 scripts/lib 支撑模块 / dev 基建本体」行（消费方同 diff 对账 + 消费方门禁） | 人工判据（行语义）；本条目自身即该行的首次执行者 |
| 8 | evidence-audit 语料窗 | slug 窗过滤（窗外语料不得作证）+ 窗零命中 MAJOR + 报告显性化 | 契约测试先红（跨 run URL 被当作证）→ 修后绿；**真实 bundle 校验**：1079 文件 → 窗内 10，14/14 溯源不变（自证未污染） |
| 9 | 选卡面收窄 | `runStateOf` 暴露会话头 `agentPreset` + `leadHitlCandidate` 谓词；hitl-answer 扫描只认 lead 挂起、watch-run 非 lead 盯场显性提示 | 契约测试先红（字段/谓词未实现）→ 绿；队友挂起夹具（teammate-pending）为永久反证 |
| 10 | 换 pin 技能化 | `.agents/skills/bumping-vendor-pin/SKILL.md`（两轮实操教训固化：--clean 铁律 / build-time externals 漂移 / 全档面含 client-load-smoke） | dev-skill-format 绿；落盘即被 harness 技能目录发现（机制实证） |

## 输掉的方案

- **逐件立独立队列条目**：十件小事拆十条目 = 队列噪声；打包一轮，逐件独立验收。
- **本轮（批次一）顺手全做**：批次一已含约二十件；再塞十件会把"当场修"变大轮，违反窄切片。
- **件② 用 sync 门禁守卫 README 清单**：守卫一份本可删除的手抄副本 = 半措施；role-list-sync
  的完整哲学是"盘上目录为正本 + 消灭字面量清单"——改纯指路后漂移面归零，零门禁维护成本。
- **件⑧ 按会话组名预筛语料**（I/O 优化）：组名是 dsh 私有编码，机制耦合换性能不值；slug 窗
  过滤解耦且语义更严。真实 bundle 实测窗内 10/1079——污染面与语料面双收，I/O 成本如实分列
  （解压后才能判窗，未优化）。

## 验证

- **收尾（2026-10-08）**：`pnpm verify` 全绿 + `pnpm test` 252/252 + gates-smoke 全绿
  （对照组零注入 PASS + 7 注入案例点名报红）。
- **门禁件反证齐**（件④⑤⑥ + client-keys 加宽）：每件"注入回归 → 红 → 还原 → 绿"实录见
  §决定表；件④⑤⑥ + client-keys 同步登记进 [evaluation §L0](../../docs/evaluation.md)
  台账对应行（gate-ledger-sync 对账）。
- **契约件反证**（件③⑧⑨）：用例即永久反证记录（改 persona 措辞 / 跨 run URL / 队友挂起
  各一例红），进 `pnpm test` keyless 回归。
- **分列**：client-load-smoke 2 FAIL 环境性（stash A/B 对拍在案——旧客户端同型两红）；
  L1/L2/L4-lite 未跑——改动面无 preset/persona/发布集行（路由行 L0 档），非"通过"。

## 环境状态

- 新增：门禁 `port-exclusive` / `hooks-active`（verify gates 数组 + evaluation §L0 台账行）、
  `tests/hitl-signature-contract.test.mjs`、`tests/fixtures/run-state/teammate-pending.jsonl`、
  `.agents/skills/bumping-vendor-pin/SKILL.md`。
- 改动：`scripts/verify/verify.mjs`（doc-budgets tracked-only 化 + client-keys 三规则 +
  两新门禁）、`scripts/run-gates/evidence-audit.mjs`（slug 语料窗 + 窗计数透出）、
  `scripts/lib/run-state.mjs`（preset 字段 + leadHitlCandidate）、`scripts/run-ops/watch-run.mjs`、
  `dev/hitl-answer.mjs`、`scripts/probe/entry-chain-probe.mjs`（缺省端口 3102→3114——件⑤
  实咬修正）、`packages/deep-research-pack/src/client/{keys.ts,index.ts,ResearchToolCard.tsx}`
  （族正本搬迁）、`packages/deep-research-pack/README.md`（纯指路化）、`docs/evaluation.md`
  （四行台账）、`docs/guides/60-dev-loop.md`（路由补行）。
- 队列：本条目毕业离队，队列恢复 parked 态。
