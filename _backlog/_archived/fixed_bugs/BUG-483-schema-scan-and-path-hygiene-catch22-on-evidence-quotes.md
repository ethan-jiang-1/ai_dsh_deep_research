---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-483：`schema-scan` 与 `path-hygiene` 扫描 `evidence/*.md` 逐字引文形成 Catch-22，且 `/media/` 误杀相对网页路径

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

`drt_huawei-ascend-dd` 交付完成后，两项路径卫生门禁同时判 RED，并与 `evidence-audit` 形成互相冲突的死锁（Catch-22）：

1. **`schema-scan` 判红两张外部一手证据卡**：
   - `evidence/t4-reg-gp10-ascend-guidance.md 含绝对路径（D28 新 run 禁）`
   - `evidence/t4-software-cann-version-mismatch.md 含绝对路径（D28 新 run 禁）`
2. **`path-hygiene` 阻断 `run-accept`**：
   - `evidence/t4-software-cann-version-mismatch.md:16 > OSError: /home/mtp/Ascend/nnal/atb/latest/atb/cxx_abi_1/lib/libtbe_adapter.so: undefined symbol: ...`

其中 `t4-reg-gp10-ascend-guidance.md` 命中原因是 BIS 官方新闻稿页面里指向 PDF 的**网站相对链接**（`:20` 的 Markdown 链接目标为 `/media/1575` 及 `:28` 反引号路径 `` `/media/1575` ``）；`t4-software-cann-version-mismatch.md:16` 命中原因是 GitHub `Ascend/pytorch#99` issue 正文报错栈自带的 `/home/mtp/...` 路径，该行属于 `## 原文摘录` 的 `> ` 逐字引用块。

## 分诊与授权

- 严重级：P1 — 真实网页/GitHub 一手引文被验收交付门永久判红，按规定保留原文必死、脱敏改动则触发 `evidence-audit` 转写不符。
- 表面 / 边界：`checks/lib/gates/schema-scan-core.mjs`、`checks/run-gates/path-hygiene.mjs`、`checks/lib/shared/path-hygiene.mjs` / run-gates
- DSH 不变量：verify the world
- 触及面：交付验证门禁正则与扫描范围边界
- 授权：等人拍板
- 批：2026-11-28-run-fidelity-and-gate-accuracy

## 复现

```bash
source tools/env.sh
node checks/run-gates/schema-scan.mjs research-workspace/drt_huawei-ascend-dd
node checks/run-gates/path-hygiene.mjs research-workspace/drt_huawei-ascend-dd
```

`schema-scan` 报 2 项 RED；`path-hygiene` exit=1 并在 `run-accept.mjs --no-write` 中直接判 RED。

## 证据链

1. [schema-scan-core.mjs](../../../checks/lib/gates/schema-scan-core.mjs)（`L160`, `L189-L191`）：`ABS_PATH_RE` 把 `/media/` 放在 `(?:^|[\s(`"'\[])` 之后，Markdown 相对网页链接与反引号路径 `` `/media/1575` `` 与 Linux 挂载点 `/media/...` 混同判红；`hygieneOf` 扫遍 `evidence/*.md` 全文，未豁免 `## 原文摘录` 外部引文行。
2. [path-hygiene.mjs](../../../checks/run-gates/path-hygiene.mjs)（`L29-L31`）与 [共享 path-hygiene.mjs](../../../checks/lib/shared/path-hygiene.mjs)（`L10-L17`）：将 `evidence/*.md` 整体纳入 `scanHomePaths`，第三方 issue traceback 里的 `/home/<user>/...` 直接阻断 `run-accept`。
3. [adversarial-review/SKILL.md](../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md)（`L109-L111`）要求引文行只留网页原文；`critic-1` 本轮即以 M4 驳回过对引文行的改写。

## 建议方向 / 不越界边界

- 将「防本机宿主路径泄露」收窄到产出自写面或剔除 `evidence/*.md` `## 原文摘录` 中的非宿主栈路径；对 `ABS_PATH_RE` 中的 `/media/` 排除站点相对路径（如 `(/media/...)`）。
- 不修改 `vendor/dsh/` 与历史 run 证据卡内容。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/path-hygiene.mjs",
    "checks/lib/gates/schema-scan-core.mjs",
    "checks/README.md",
    "tests/run/gates/path-hygiene.spec.mjs",
    "tests/run/gates/schema-scan.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/run/gates/path-hygiene.spec.mjs tests/run/gates/schema-scan.spec.mjs",
    "exit": 1,
    "output": "BUG-483: path-hygiene & schema-scan flagged verbatim > quotes in evidence/*.md and relative /media/1575 links"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/path-hygiene.spec.mjs tests/run/gates/schema-scan.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/path-hygiene.spec.mjs"
  }
}
```
