---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-381：空 findings.md 让「综合」✓——综合步骤只检查文件在场，不检查正文

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/empty-findings-leads-verdict.json` + `empty-findings-leads.png`；
> 夹具 = `runtime/e2e/empty-findings-leads-e2e.mjs`。

## 症状

bundle 的 `findings.md` 存在但是 0 字节（写坏/截断）。打开「研究状态」：

```text
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
...
报告已交付 ✅ 已交付
```

「综合」步骤仍 ✓，页面没有「findings 为空/读取失败」提示。用户会以为综合材料已经写成。

## 证据

seed 已交付 run 把 `findings.md`（和 `leads.md`）清空，真浏览器打开状态页。verdict
（`runtime/e2e/empty-findings-leads-verdict.json`）：

```json
{
  "face": "bound",
  "failureShown": false,
  "statusText": "…… ◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查 …… 报告已交付 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/empty-findings-leads-e2e.mjs
```

## 根因

`useStatusFeed` 的步骤输入：

```ts
findings: view.hasFile('findings.md'),
```

只判文件在场，不读正文；0 字节与有效 findings 同形。`findings.md` 没有进
`ARTIFACT_POLICY` / `StatusReads`，所以既没有 empty 态也没有失败横幅。

## 修法方向（未实施）

- 把 `findings.md` 纳入工件五态（nonEmpty；truncated 视为 unreadable）；空/读失败 →
  综合步骤 unknown/失败 + 明确提示 + 重试。
- 只有正文有效（非空）时综合 done；不要用 `hasFile` 冒充内容。
- 保留 findings 有效时的正常综合（正向）；保留 findings 缺席的语义（旧 run，不误报）。

## 修复判据

- findings.md 0 字节/纯空白 → 综合不 done，显示「综合材料为空/读取失败」。
- findings.md 不可读 → 同上（读失败 ≠ 空）。
- findings.md 可读非空 → 综合 ✓（正向）。
- findings.md 缺席 → 既有形态（负控）。
- 红证：把空 findings 改回 `hasFile` 判 done → 本夹具再次出现 ✓ 综合，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 findings 五态矩阵，或浏览器层用例。
