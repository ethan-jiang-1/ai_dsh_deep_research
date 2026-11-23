---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-382：空 leads.md 让「侦察」✓——侦察步骤只检查文件在场，不检查正文

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/empty-findings-leads-verdict.json` + `empty-findings-leads.png`；
> 夹具 = `runtime/e2e/empty-findings-leads-e2e.mjs`。

## 症状

bundle 的 `leads.md` 存在但是 0 字节（写坏/截断）。打开「研究状态」：

```text
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
...
报告已交付 ✅ 已交付
```

「侦察」步骤仍 ✓，没有「leads 为空/读取失败」提示；用户会以为侦察线索已经写成。

## 证据

seed 已交付 run 把 `leads.md`（和 `findings.md`）清空，真浏览器打开状态页。verdict
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
leads: view.hasFile('leads.md'),
```

只判文件在场，不读正文；0 字节与有效 leads 同形。`leads.md` 没有进
`ARTIFACT_POLICY` / `StatusReads`，所以没有 empty/读失败横幅。

## 修法方向（未实施）

- 把 `leads.md` 纳入工件五态（nonEmpty；truncated 视为 unreadable）；空/读失败 →
  侦察步骤 unknown/失败 + 明确提示 + 重试。
- 只有正文有效（非空）时侦察 done；不要用 `hasFile` 冒充内容。
- 保留 leads 有效时的正常侦察（正向）；保留 leads 缺席的语义（负控）。

## 修复判据

- leads.md 0 字节/纯空白 → 侦察不 done，显示「侦察线索为空/读取失败」。
- leads.md 不可读 → 同上。
- leads.md 可读非空 → 侦察 ✓（正向）。
- leads.md 缺席 → 既有形态（负控）。
- 红证：把空 leads 改回 `hasFile` 判 done → 本夹具再次出现 ✓ 侦察，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 leads 五态矩阵，或浏览器层用例。
