---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-118：useStatusFeed 的 leads.md/findings.md 仍用 names.has——同名目录被当步骤文件

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 步骤条 leads.md/findings.md 改用 `view.hasFile`，同名目录不再点亮（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`
> （BUG-100 修复把 question/review/final/plan 改为 `view.hasFile`，但 `leads.md` /
> `findings.md` 仍是 `names.has`）。

## 症状

run bundle 里 `leads.md` / `findings.md` 是**目录**：

```json
{
  "namesHasLeads": true,
  "hasFileLeads": false,
  "namesHasFindings": true,
  "hasFileFindings": false,
  "incompleteFix": true
}
```

`useStatusFeed` 的步骤条仍用 `names.has('leads.md')` / `names.has('findings.md')`，目录会让
「组队/侦察」「结论」步骤被当成已落盘；`view.hasFile` 明确为 false。

## 复现（keyless，只读）

```sh
node --import tsx/esm runtime/explore-20261112/status-leads-findings-directory.mjs
```

## 影响与触发面

- 步骤条状态与文件事实不一致：目录同名即点亮 leads/findings；
- 修复 BUG-100 时只替换了 question/review/final/plan，漏了 leads/findings；
- 与 `final.md` 同名目录（已修）同族，属于「名字在场 ≠ 文件在场」的剩余面；
- 用户可能误以为侦察/结论步骤已完成。

## 根因（已证）

- `useStatusFeed` 的 `deriveSteps` 输入仍 `leads: names.has('leads.md')` /
  `findings: names.has('findings.md')`；
- `RunView.hasFile` 已存在，但这两处未迁移；
- 没有统一「所有 step 文件都用 hasFile」的守卫。

## 修法候选（未实施）

1. 两处改 `view.hasFile('leads.md')` / `view.hasFile('findings.md')`；
2. 抽 step 文件谓词，避免下一次漏改；
3. 对同名目录给 warning/观察态，不只静默 false。

倾向 1；本卡不改代码。

## 修复判据

- [ ] leads.md/findings.md 为目录时步骤条不得判 passed；
- [ ] 普通文件时行为不变；其它 step 文件不回归；
- [ ] 复现脚本 namesHasLeads/hasFileLeads 对账；新增 keyless/组件用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明其它 `names.has` 消费面（plan/evidence 目录是合法目录）；
- 不证明真实 bundle 中同名目录分布。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/status-feed.test.mjs` BUG-118。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
