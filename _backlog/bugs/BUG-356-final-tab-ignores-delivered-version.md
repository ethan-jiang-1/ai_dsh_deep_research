---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-356：终稿页签无视交付版本——已交付 v1，点「读终稿」却显示未交付的 v2 草稿

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/final-version-verdict.json` + `final-version.png`；
> 夹具 = `runtime/e2e/final-version-e2e.mjs`。

## 症状

一个 run 已交付 `final/v1.md`（present + canonical `delivered.json` 都指向 v1）。之后
`final/` 里又出现一个**未交付**的 `v2.md` 草稿（补研究/rerun 的中间态）。状态页如实显示：

```text
✅ 已交付   读终稿 →   v1 已交付 · 当前工作稿
```

点「读终稿 →」后，终稿页签却显示：

```text
审计版 · v2
E2E UNDELIVERED V2 DRAFT
This v2 is a later draft; the delivered version is v1.
```

用户以为自己在读**已交付的 v1**，实际看到的是未交付的 v2 草稿。这不是「最新版」偏好，
而是把**交付凭证**与**版本账最高号**混为一谈。

## 证据

seed 已交付 run（`drt_unsc-p5-members`）加入 `final/v2.md`（内容 = `E2E UNDELIVERED V2 DRAFT`），
`delivered.json` / present 仍是 v1；真浏览器打开状态页并点「读终稿 →」。verdict：

```json
{
  "face": "bound",
  "deliveredBadge": true,
  "openFinalVisible": true,
  "showsUndeliveredV2": true,
  "final": {
    "tabs": ["研究状态", "终稿", "审计版 · v2…E2E UNDELIVERED V2 DRAFT"]
  }
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/final-version-e2e.mjs
```

## 根因

`packages/deep-research-pack/src/client/ResearchFinalTab.tsx` 的 `load`：

```ts
const nextVersions = latestRunVersion(versionNames)
const name = nextVersions === 0 ? FINAL_NAME : `${FINAL_LEDGER_DIR}/v${String(nextVersions)}.md`
```

它只按 `final/` 目录里的**最高版本**读正文，完全无视页签地址里的版本
（`openFinal(sessionId, delivery.path)` 传的是 `drt_x/final/v1.md`），也无视
`delivered.json` / present 的版本。于是：

- 交付 v1 + 草稿 v2 → 读 v2；
- 交付 v1 + `final/v1.md` 缺失但 `final.md` 在场 → 读 `final.md`（当前工作稿），
  也不报「交付版本缺失」。

读者版选择同样只认 `readable-v<latest>`；交付版本的 `readable-v1` 会被忽略。

## 修法方向（未实施）

- 终稿页签**先认地址里的版本**：`final/vN.md` / `readable-vN.md` → 读该版本；
  `final.md` / 通用地址才回退「最高版本 / 当前工作稿」。
- 地址指向的交付版本文件缺失时，走 `finalUnreadable` 失败态（带重试），不要拿另一份
  `final.md` 或更高版本草稿冒充。
- 读者版只在**该版本**有 `readable-vN.md` 时展示；不要拿 v2 的读者版冒充 v1。
- 不改「版本账 ≠ 交付凭证」的合同；本修复只让页签尊重已有的交付地址。

## 修复判据

- 已交付 v1 + 未交付 v2 草稿：点「读终稿」→ 显示 v1，绝不出现 v2 内容/「审计版 · v2」。
- 已交付 v1 但 `final/v1.md` 缺失：显示「终稿文件缺失」失败态 + 重试，不显示 `final.md` 草稿。
- 地址为 `final.md` / 无版本：仍按当前工作稿/最高版本回退（既有行为不回退）。
- 交付 v1 有 `readable-v1.md`、草稿 v2 无 reader：页签显示 v1 读者版，不显示 v2 审计版。
- 红证：把「按地址版本」改回「latestRunVersion」→ 本夹具再次出现 v2，exit 1；还原后绿。
- guard 落点：`final-target` / `ResearchFinalTab` 的纯函数版本选择矩阵，或浏览器层用例
  （本 seed 夹具可升格）。
