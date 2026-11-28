---
status: 已修
severity: P2
opened: 2026-11-28
---

# BUG-469：Lead 算术计数、终稿末节与部分卡 `web_fetch` 遵守度在真实长 run 中漂移

> 严重级别：P2｜发现：2026-11-28｜状态：已修

## 症状

复盘 `drt_huawei-ascend-dd` 全链路 trajectory（Lead `95` 步 + 7 个子会话），发现多处虽未崩进程但明确违反 pack 契约的执行漂移：
1. **HITL2 关键计数算术错误**：`review/verdicts-r1.json`（4 `supported` + 1 `partially_supported`）与 `review/verdicts-r2.json`（3 `supported` + 2 `partially_supported`）合计为 **7 `supported` + 3 `partially_supported` = 10 条**；Lead 在 `step 70/77/95`（HITL2 选项卡文本）及 `journal.md` 全部写成「**8 支持 / 3 部分**」（8+3=11 ≠ 10），`critic-1` 在 `review.md:89` 也未重算直接照抄。
2. **`final.md` 缺必需末节**：[synthesis/SKILL.md](../../../packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md)（`L34`）规定「报告末节必须有 `## 下一版优先项` 与 `## 什么会改变建议`——没有这两节 = 未完成」，但 `final.md` 止于 `## 8. 覆盖与不可判`（Lead 未加载 `synthesis` skill）。
3. **4 张 GitHub 证据卡未逐一抓取 `source_url`**：`analyst-b` 只抓了 `https://api.github.com/repos/Ascend/pytorch/issues?state=all&per_page=100...` 列表接口，未对 `#183/#185/#186/#199` 逐个调用 `web_fetch`，被 `evidence-audit` 标 4 条 `MAJOR [source_url 未抓取]`。
4. **杂项时序/状态漂移**：`critic-1`（`d13c8b0e`）第 1 轮在未校准时间下将 `review.md:1` 审查时点写成 `2026-11-28T16:5x+08:00`（当时实为 `16:29`）；Lead `step 66` 对 `subagent` 误调 `wait_agent` 立即返回 `no-active-peer`；`run.md` 直到 `step 95` 才补改为 `review`；`journal.md` 把 `48 张常规卡 + 1 张 xcheck-01`（盘上共 49 张）简记为 `48 卡`。

## 分诊与授权

- 严重级：P2 — 反映长 run 下模型对 skill 约束的遵守漂移与自检盲区。
- 表面 / 边界：`packages/deep-research-pack/presets/{lead,analyst,critic}` / 真实长 run 行为
- DSH 不变量：verify the world
- 触及面：pack 公共行为 — 角色提示与交接自检
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-run-fidelity-and-gate-accuracy

## 复现

复现状态：稳定 — 直接读取 `research-workspace/drt_huawei-ascend-dd` 工件与 `session-156a6ddc` / `1b7bee9a` / `d13c8b0e` 会话日志即可核实上述四点。

## 根因（假设 → 已证）

1. Lead 在 `step 59` 综合前未调用 `skill("synthesis")`（直接写 `findings.md` 与 `final.md`），导致遗漏 `## F#` 格式与末两节；
2. Lead 与 Critic 在汇总结论时口算 `4+3=8` 并相互复述未逐条点数；
3. `analyst-b` 批量拉取 GitHub `/issues?per_page=100` 后直接复用列表 JSON 建多张单 issue 卡片，未落实 `evidence-extraction` skill 的「每张 `source_url` 必须逐一 `web_fetch`」。
- 根因证据：`session-156a6ddc` `step 58–95`、`1b7bee9a` `web_fetch` 列表、`d13c8b0e` `seq=379/390` 及 `evidence-audit` 输出。
- DSH 不变量：不适用。

## 牵出的失败类

- 同机制第 1 次｜处置：实例修（或并入 Lead/Critic 呈卡前检查单）

## 修法

1. 在 `lead.patch.yml` 综合阶段显式强调先加载 `synthesis` skill，HITL2 呈卡前核对 verdicts 数组逐条计数与 `final.md` 末两节；
2. 在 `evidence-extraction` 明确「批量列表 API 响应不可替代单 issue/单页 `source_url` 的 `web_fetch`」。

## 修复判据

1. 后续规范长 run 中 `final.md` 含 `## 下一版优先项` 与 `## 什么会改变建议`，HITL2 计数与 `verdicts` JSON 一致，`evidence-audit` `srcNeverFetched === 0`。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md",
    "packages/deep-research-pack/presets/lead/skills/reader-final/SKILL.md",
    "packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md",
    "packages/deep-research-pack/presets/analyst/skills/evidence-extraction/SKILL.md",
    "tests/pack/scripts/presets.spec.mjs",
    "tests/fixtures/skill-golden/manifest.json",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/pack/scripts/presets.spec.mjs",
    "exit": 1,
    "output": "BUG-469 presets skill guardrails: missing batch-fetch prohibition / verdicts tally / final end-sections guardrails"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/pack/scripts/presets.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/pack/scripts/presets.spec.mjs"
  }
}
```
