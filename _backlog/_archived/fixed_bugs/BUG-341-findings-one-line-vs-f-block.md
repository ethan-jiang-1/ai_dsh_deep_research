---
status: 已修
severity: P1
opened: 2026-11-20
---

# BUG-341：findings 的模型可见指令是「一行一条」，门 F 只认 `## F#` 块——正常 run 必红

> 严重级别：P1 ｜ 发现：2026-11-20 ｜ 状态：已修（2026-11-21）— 结论：findings 只认 `## F<n>：` 块；synthesis skill 的一行式指令改成块样例；报错点名一行式/缺冒号；审查：agent — 注入红回归；去向：none — 合同收紧
>
> 现场 = `runtime/e2e-2026-11-20/`（gitignored）；run = `research-workspace/drt_pg-latest-stable/`。

## 症状

一场按技能写出的 quick_factual run，`findings.md` 每条 finding 一行：

```text
- F1｜版本号：…… 支撑：…｜lenses: official｜gap: supported
```

`node checks/run-gates/node-gate.mjs research-workspace/drt_pg-latest-stable` 门 F 红：
「findings.md 无 F# 块——防空语料（不得静默 0 条）」。交付门因此不可过。

## 根因（合同冲突，非实现 bug）

- 模型可见指令：`presets/lead/skills/synthesis/SKILL.md` 写「每个 finding **一行**：结论 + 支撑证据
  文件 + lenses + lens_gaps + gap 状态」。
- 门禁实现：`checks/lib/gates/findings-core.mjs` 的 `parseFindingsOf` 只认 `^##\s*F(\d+)\s*[:：]`
  标题块，块内再认 `- 支撑证据:` / `- lenses:` / `- lens_gaps:` / `- gap:`。
- 模板 `content/templates/run/findings.md` 用 `## F1:` 块，但 quick_factual 的 lead 没有复制模板，
  它照了技能正文的「一行」。

两份 live 合同互相矛盾；照技能写的产出必被门禁判红，且 lead 侧无同轮反馈。

## 复现

```sh
node checks/run-gates/node-gate.mjs research-workspace/drt_pg-latest-stable
# 门 F = RED … 无 F# 块
```

## 第二现场（2026-11-21，P5 run）

`research-workspace/drt_sodium-ion-bess/findings.md` 写成了 `## F1 已投运的…`（有块，但**没有冒号**），
门 F 仍报「无 F# 块」。解析器正则要求 `^##\s*F(\d+)\s*[:：]`；模板恰是 `## F1: …`，而技能正文没有
强调冒号。操作侧只看到"无 F# 块"，与盘上事实不符，排障成本高。

```sh
node checks/run-gates/node-gate.mjs research-workspace/drt_sodium-ion-bess
# 门 F = RED … 无 F# 块（文件里其实有 10 个 ## F 标题）
```

## 修法（三选一，需拍板）

1. 解析器同时接受行首 `- F<n>｜…`（按「支撑/lenses/lens_gaps/gap」字段切分）；
2. 技能与模板统一改成块格式，并在 quick_factual 路径给最小样例；
3. 双轨：解析器宽容 + 技能给块样例。

## 修复判据

- 照当前技能写出的 findings（本卡现场）门 F 绿；构造的无 gap / 幽灵 lens 仍红（负控保留）。
- 另一条错误形态（缺 gap、空 lens_gaps）仍点名红。
- `pnpm test` 的 findings-contract 矩阵同步更新并通过。


## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/findings-core.mjs",
    "packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md",
    "tests/run/gates/findings-contract.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/findings-contract.spec.mjs",
    "exit": 1,
    "output": "回退旧解析器：1 例红——一行式/无冒号标题只报「无 F# 块」，不点名修正形态"
  },
  "green": {
    "command": "node --test tests/run/gates/findings-contract.spec.mjs",
    "exit": 0,
    "output": "8 tests 全过：一行式与无冒号标题各自点名正确形态"
  },
  "guard": {
    "path": "tests/run/gates/findings-contract.spec.mjs"
  }
}
```

可关闭：是
