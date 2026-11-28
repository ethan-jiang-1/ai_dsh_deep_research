---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-486：`protocol.json` 模板与 `SOURCE_FAMILIES` 含 `"web"`，但 `content/lenses/` 缺 `web.md` 致 Lead 首轮读错路径

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

同题立项首会话 `session-8bef2da8-23b4-40fe-bfae-f6f0c9ddbc70`（`seq 104`，用户随后重启为 `session-156a6ddc`）在读取透镜文件时尝试读取 `content/lenses/web.md`，触发文件不存在报错：

```text
Error: cannot read "/Users/bowhead/ai_dsh_deep_research/runtime/harness-home/profiles/deep-research/node_modules/dsh-deep-research-pack/content/lenses/web.md": not found
```

正式 run `drt_huawei-ascend-dd/protocol.json`（`L25`）亦沿用了 `"families": ["official", "regulatory", "academic", "practitioner", "web"]`。

## 分诊与授权

- 严重级：P1 — `source_scope.families` 与 `content/lenses/` 共享 4 个同名标识（`official / academic / regulatory / practitioner`），极易误导 Lead 把 family `"web"`（及 `"local"`）当成 lens 文件名去读。
- 表面 / 边界：`packages/deep-research-pack/content/templates/run/protocol.json`、`checks/lib/gates/protocol-core.mjs`、`packages/deep-research-pack/content/lenses/`、`presets/lead/skills/question-patterns/SKILL.md` / pack schema + content
- DSH 不变量：verify the world
- 触及面：pack 内容命名边界与立项读取路径
- 授权：等人拍板
- 批：2026-11-28-run-fidelity-and-gate-accuracy

## 复现

1. 对照 [protocol.json 模板](../../../packages/deep-research-pack/content/templates/run/protocol.json)（`L22`）`SOURCE_FAMILIES` 与 `packages/deep-research-pack/content/lenses/` 目录文件清单；
2. 见会话日志 `runtime/harness-home/sessions/--Users-bowhead-ai_dsh_deep_research-research-workspace--/session-8bef2da8-23b4-40fe-bfae-f6f0c9ddbc70/session.v4.jsonl.zstd`（`seq 104`）。

## 证据链

1. [protocol.json 模板](../../../packages/deep-research-pack/content/templates/run/protocol.json)（`L22`）默认值为 `"families": ["official", "web"]`；[protocol-core.mjs](../../../checks/lib/gates/protocol-core.mjs)（`L51`）定义 `SOURCE_FAMILIES = ['official', 'web', 'academic', 'regulatory', 'practitioner', 'local']`。
2. [question-patterns/SKILL.md](../../../packages/deep-research-pack/presets/lead/skills/question-patterns/SKILL.md)（`L182-L194`）给出 8 枚内置 lens 索引（`official / quant / practitioner / adversarial / structural / historical / regulatory / academic`），磁盘 `packages/deep-research-pack/content/lenses/` 实际也只有这 8 个 `.md` 文件，无 `web.md` 与 `local.md`。
3. [lead.patch.yml](../../../packages/deep-research-pack/presets/lead.patch.yml)（`L22`）把 `(official/academic/regulatory/practitioner/web/local)` 放在三问来源族里，未与 8 枚 lens 的集合边界作防混提醒，导致 Lead 批读 lens 时尝试读取 `content/lenses/web.md` 报错。

## 建议方向 / 不越界边界

- 在 `question-patterns` / `team-assembly` / `lead.patch.yml` 中显式分隔「来源族（`families`，含 `web`/`local`，不对应 lens 文件）」与「8 枚内置研究透镜（`content/lenses/*.md`）」。
- 可在静态 verify 中检查提示/映射所引用的 lens id 不越出 `content/lenses/` 闭集。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/presets/lead/skills/question-patterns/SKILL.md",
    "tests/pack/contract/template-contract.spec.mjs",
    "tests/fixtures/skill-golden/manifest.json",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/pack/contract/template-contract.spec.mjs",
    "exit": 1,
    "output": "BUG-486: question-patterns did not separate web/local source_scope.families from content/lenses/*.md"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/pack/contract/template-contract.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/pack/contract/template-contract.spec.mjs"
  }
}
```
