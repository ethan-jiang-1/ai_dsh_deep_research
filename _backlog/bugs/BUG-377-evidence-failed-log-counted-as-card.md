---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-377：evidence/_failed.md 被算成证据——只有失败登记也显示「1 份证据」+ 挖掘 ✓

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/evidence-failed-only-verdict.json` + `evidence-failed-only.png`；
> 夹具 = `runtime/e2e/evidence-failed-only-e2e.mjs`。

## 症状

bundle 的 `evidence/` 里只有 `_failed.md`（检索失败登记），没有任何证据卡。打开「研究状态」：

```text
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
...
1 evidence files ✅ 已交付
```

页面把失败登记算成 1 份证据，并让「挖掘」步骤通过；用户会以为已有证据，实际零卡。

## 证据

seed bundle 的 evidence/ 只保留 `_failed.md`，真浏览器打开状态页。verdict
（`runtime/e2e/evidence-failed-only-verdict.json`）：

```json
{
  "face": "bound",
  "evidenceFailedOnly": true,
  "digDone": true,
  "statusText": "…… 1 evidence files ✅ 已交付 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/evidence-failed-only-e2e.mjs
```

## 根因

`useStatusFeed` 的证据计数：

```ts
const evidenceCount = evidenceState === 'ok' && evidenceDir !== null && evidenceDir.ok
  ? evidenceDir.value.filter((entry) => entry.type === 'file' && entry.name.endsWith('.md')).length
  : 0
```

只按 `.md` 后缀计数，没有排除 `_failed.md`（也不是证据卡命名/格式校验）。
`deriveSteps` 的 `evidence: inputs.evidence > 0` 于是把「挖掘」判 done。

## 修法方向（未实施）

- 证据卡计数排除 `_failed.md` 与非证据命名（或按 evidence 卡 frontmatter/命名规则校验）。
- `_failed.md` 单独作为失败登记呈现（可选计数），不能计入证据数/步骤完成。
- 只有失败登记时 `evidence=0`，挖掘步骤不得 done（unknown/pending）。
- 保留正常 9 卡 + `_failed.md` 时的 9 份计数（负控）。

## 修复判据

- 只有 `_failed.md` → 0 份证据，挖掘不 done，无“已交付证据”的暗示。
- 1 张卡 + `_failed.md` → 1 份（且英文单数，见 BUG-379）。
- 9 张卡 + `_failed.md` → 9 份（不退化为 10）。
- 无 evidence/ → 0 份（负控）。
- 红证：把 `_failed.md` 加回计数 → 本夹具再次出现 1 份 + ✓ 挖掘，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的证据计数纯函数/状态矩阵，或浏览器层用例。
