---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-485：`verdict-audit` `[not-verbatim]` 未剥围栏与 `\u200b`，且单行压缩模板诱导 Lead 重序列化丢字符

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

`verdict-audit.mjs` 对 `drt_huawei-ascend-dd` 报 7 项 RED；除 `BUG-463` 记录的 5 项 `[coverage-gap]` 外，**两批全部触发 `[not-verbatim]`**：

- `[not-verbatim] verdicts-r1.json：batches[0].raw 与该会话第 1 条起的助手正文都不逐字相等——裁决必须原文落盘，且按轮次先后对应`
- `[not-verbatim] verdicts-r2.json：batches[0].raw 与该会话第 1 条起的助手正文都不逐字相等——裁决必须原文落盘，且按轮次先后对应`

将子会话 `9dd8cb31-263c-4da7-ad98-ed056609f7e7`（5212B pretty-printed）和 `b38b64ae-86b6-4e46-99e5-f59f5b19ef1b`（3555B ```` ```json ```` 围栏）最后一条助手正文与盘上 `batches[0].raw` 比对发现：Lead 在落盘时手动把子代理输出重序列化为单行紧凑 JSON，除剥去缩进换行与围栏外，还丢掉了 `r1` 路透引文中的零宽空格 `\u200b`（`2.008 \u200bmillion` / `seen by \u200bReuters.`）和 `r2` `reason` 中的 `**设备时间**`、`**拟中标候选人**` 加粗符号。

## 分诊与授权

- 严重级：P1 — 哪怕解决 `BUG-463` 的多批合并问题，两批仍会在 `run-accept` 的 `verdict-audit` 上因 `[not-verbatim]` 全红拒收。
- 表面 / 边界：`checks/lib/gates/verdict-audit-core.mjs`、`packages/deep-research-pack/content/templates/run/verdicts.json` / verdict-audit gate + template
- DSH 不变量：fail-loud
- 触及面：裁决原文落盘契约与验证比对逻辑
- 授权：等人拍板
- 批：2026-11-28-run-fidelity-and-gate-accuracy

## 复现

```bash
source tools/env.sh
node checks/run-gates/verdict-audit.mjs research-workspace/drt_huawei-ascend-dd --no-write
```

## 证据链

1. [verdict-audit-core.mjs](../../../checks/lib/gates/verdict-audit-core.mjs)（`L41`, `L425`, `L466-L473`）：`L425` 文案明言「原文必须是 child 逐字正文（代码围栏可剥一层）」，但 `normalizeVerbatim`（`L41`）实际只执行 `.replace(/\s+$/u, '')`，未剥一层代码围栏，也无法容忍网页零宽空格 `\u200b` 或合法重排空白；于是剥掉 ```` ```json ```` 围栏或重写 JSON 缩进即报 `[not-verbatim]`。
2. [verdicts.json 模板](../../../packages/deep-research-pack/content/templates/run/verdicts.json)（`L9`, `L15`）把 `raw` 示例写成了单行压缩 JSON 字符串（无 `\n`、无围栏），与 [lead.patch.yml](../../../packages/deep-research-pack/presets/lead.patch.yml)（`L28`）要求的「child 正文原文一字不改」相矛盾，诱导 Lead 在无脚本辅助时手动压缩转写，从而丢失 `\u200b` 与 `**` 格式符。

## 建议方向 / 不越界边界

- 使 `verdict-audit-core.mjs` 兑现「可剥一层代码围栏」并与单行 JSON 模板去冲突（或改由不经手转写的方式留存 raw 原文）。
- 不修改 `vendor/dsh/`，不篡改已完成历史会话日志。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/verdict-audit-core.mjs",
    "tests/run/gates/verdict-audit.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/run/gates/verdict-audit.spec.mjs",
    "exit": 1,
    "output": "BUG-485: verbatimMatches emitted false [not-verbatim] on fenced child JSON and zero-width spaces"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/verdict-audit.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/verdict-audit.spec.mjs"
  }
}
```
