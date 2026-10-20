# 计划确认卡字数：WARN 级检出 + 唯一语义源 + 可复跑的跨场仪器

> 状态：implemented

## 决定

HITL1 第二段「计划确认卡」的正文长度纪律（skill §6 = 计划要点 ≤200 字）此前**只有散文**：persona 与
skill 都写了 ≤200 字，但无任何机械检出；2026-10-11 存量标定 = **2 张卡 2/2 超限**（461 / 246 字），
散文纪律零遵守率。三件一起落：

1. **检出 = WARN，不拦交付**。判据挂 node-gate **门①**（与「HITL1 签名 ask」同一份数据、同一次扫描）：
   **口径 = `ask` 的 `question` 字段全长**；超限 → 该门 detail 出 `⚠ WARN …：N 字`，门位仍 PASS
   （WARN 不改变 `gates` 红绿），报告落 bundle 的 `node-gate.md`。何以不直接上硬门：2/2 超限下硬门会
   **拦下每一场**交付，而这条纪律的可控变量是措辞与模型遵守率，不是交付闸门。
2. **升硬门前置写死**：措辞收紧后**连续 ≥3 场** ≤200 字达标 → 把门① 的 WARN 升为 RED；仍超限则继续
   收敛 skill，不升门。条件写在本 Note 与 ①卡关闭结论里（不靠记忆）。
3. **识别与口径唯一语义源** = `scripts/lib/plan-card.mjs`（`PLAN_CARD_MARK`／`PLAN_CARD_LIMIT`／
   `planCardsOf`）。消费方两处：门禁（判严重级）与**跨场仪器** `scripts/run-ops/plan-card-stats.mjs`
   （判分布、复核升格前置）。
4. **措辞收紧**改在 **skill 正文**（`presets/lead/skills/research-brief/SKILL.md` §6）：写明计数口径
   （`question` 字段全部字符，含「全文 = …」指针）+ **呈卡前先数字数**、超限先删次要项再提交；并由
   `tests/pack/presets.test.mjs` 的两段卡契约测试**两条断言钉住**（删句即红）。**不动 persona**——persona 是
   模型可见面且改动触发 lead fixture 重录，skill 正文不进组装请求（改动面更小、证据面 = L1 + L4-lite）。

## 输掉的方案

- **直接上硬门**：存量 2/2 超限 → 每场交付必红；把"措辞没收敛"的账记在交付闸门上，等于用红灯代替修改。
- **只改措辞、不加检出**：纪律早就在 persona 与 skill 里，2/2 超限证明**散文不约束**；无检出则下一次
  超限只有人读卡才看得见。
- **把检出塞进 `verify.mjs`**：那是**仓库结构**门（tracked 文件），而计划卡长度是 **run 期行为**、数据住
  gitignored 的运行区——本仓既有纪律：运行区数据完整性不进 L0（由 critic + run-gate + 观察面负责）。
- **让门禁与统计各写一份识别逻辑**：实测已发生（门① 内联一份、运行态扫描器一份）——与 readiness 终局
  判定三版分叉同族；收成 `lib/plan-card.mjs` 后两处同源，`tests/run/plan-card.test.mjs` 钉住口径与边界。
- **保留一次性扫描器 + 把结果抄在卡上**：那样"连续 ≥3 场达标"这条前置**没有仪器可判**（一次性脚本随
  `runtime/` 清空即失传）——判据写成条件却没有可复跑的仪器，等于条件不存在。故转正为 run-ops 投影件。

## 实际跑过的验证

- **门① 两态夹具**（`tests/run/node-gate.test.mjs`）：`sessions/s-plan-over`（261 字卡）→ PASS + detail 出
  `WARN …：261 字`；`sessions/s-plan-ok`（99 字卡，互补态）→ PASS + `计划确认卡正文合规（1 张 ≤200 字）`；
  两夹具另带 `present` 声明，保证差异只在计划卡（此前缺 present 导致门② 红、整体红——已修）。
- **真实 bundle 复核**：`node scripts/run-gates/node-gate.mjs research-workspace/drt_deepseek-default-upgrade`
  → 门① detail 出 `⚠ WARN …：461 字 / 246 字`，**exit 0**（WARN 不拦交付），且该 WARN 已落 bundle 的
  `node-gate.md`。
- **唯一语义源契约测试**：`tests/run/plan-card.test.mjs` **8 用例**（命中／普通问卡不误判／一次调用内的逐问
  过滤／多卡出现序／**200 与 201 字边界**／畸形容忍／空语料／常量在场）；**三路反证注入**各看红一次
  （标签判据失效 → 1 红、阈值改 `>=` → 1 红、改取首问 → 1 红），还原 8/8 绿。
- **门禁改为同源消费后**：`tests/run/node-gate.test.mjs` 53/53 保持绿（行为不变，仅去重）。
- **跨场仪器复现标定**：`node scripts/run-ops/plan-card-stats.mjs --days 30` → 扫 627 场会话、命中 **2 张**
  计划卡（461 / 246 字，合规 0 / 超限 2）——与转正前一次性脚本的结论一致，且现在**可复跑**。
- **措辞钉**：`tests/pack/presets.test.mjs` 加两条断言（`呈卡前先数字数` 与 `全部字符` 口径句）；删掉 skill
  该句 → 红 → 还原绿。
- **L0**：`pnpm verify` 全绿、`pnpm test` 385-385（新增 plan-card 8 例）；`render-overlay` → L1
  `preset-smoke` ALL PASS → L4-lite ALL PASS（skill 属模型可见面，按路由补跑）。

条件与接线：[①立项简报卡](../../_backlog/_archived/settled_issues/2026-10-11-executive-research-intake-brief.md)（①-c 行）。
