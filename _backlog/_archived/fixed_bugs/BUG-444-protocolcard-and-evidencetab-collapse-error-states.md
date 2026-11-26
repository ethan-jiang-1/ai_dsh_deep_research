---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-444：ProtocolCard 与 ResearchEvidenceTab 将 empty / absent / unreadable / invalid 异常态笼统折叠为同一读错文案

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：ProtocolCard（empty/unreadable/invalid）与 ResearchEvidenceTab（absent/empty/unreadable/invalid）拆分独立文案与 data-* 属性；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

违反「五态诚实性（缺失 ≠ 空文件 ≠ 不可读 ≠ 格式非法）」纪律：
1. 将 `protocol.json` 置为 **0 字节（`state="empty"`）**、**坏 JSON（`state="invalid"`）**、**无权限 `chmod 000`（`state="unreadable"`）** 时，`ProtocolCard` 虽然 `data-protocol-state` 正确区分了三个值，但界面**全部渲染同一组文案**：标签 `契约无效` + 正文 `protocol.json 读取失败或不合法——请重试或检查目录。`；
2. 点击终稿中指向**不存在文件**（`[来源: evidence/missing-e99.md]`，底层 `state="absent"`）或格式损坏的证据卡时，`ResearchEvidenceTab` 只区分了 `empty`，其余**全部显示** `证据卡读取失败——请重试或检查工作区目录。`，把「文件不存在/缺席」误报成权限/读取失败。

## 根因与边界

- [ProtocolCard.tsx](../../../packages/deep-research-pack/src/client/research-status/ProtocolCard.tsx)（`L30-L40`）：仅单设 `if (protocol.state !== 'ok' || protocol.contract === null)`，把 `empty`、`unreadable`、`invalid` 全部合并渲染为 `statusProtocolInvalid` + `statusProtocolUnreadable`；
- [ResearchEvidenceTab.tsx](../../../packages/deep-research-pack/src/client/ResearchEvidenceTab.tsx)（`L84-L90`）：只拦截 `state === 'loading'` 与 `state === 'empty'`，其余非 `ok`（含 `absent` 与 `invalid`）一律落入 `evidenceUnreadable`。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/stage234.log`（Stage 4 `[S4-Fault]` FAIL：`ProtocolCard empty` & `点击缺失证据卡应区分缺席 vs 读取失败`）。

## 复现

```sh
# 1) 将 drt_*/protocol.json truncate 为 0 字节，打开「研究状态」页签 → 仍显示「契约无效 / 读取失败或不合法」
# 2) 在 final.md 插入 [来源: evidence/missing-e99.md] 并点击 → ResearchEvidenceTab 显示「证据卡读取失败」而非文件不存在
```

## 修复判据

1. `ProtocolCard` 对 `empty` / `unreadable` / `invalid` 各自呈现独立 tag 与诊断提示文案（zh & en）；
2. `ResearchEvidenceTab` 对 `absent` / `empty` / `unreadable` / `invalid` 呈现清晰可行动的四态提示（缺失 ≠ 读取失败 ≠ 空文件）。

## 分诊与授权

- 严重级：P1 — 违反五态诚实性纪律：空文件/缺文件/权限不可读/JSON非法渲染 identical 错误文案误导排障。
- 表面 / 边界：`ProtocolCard.tsx`、`ResearchEvidenceTab.tsx` 与双语 locale。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`ProtocolCard` 将 `empty`/`unreadable`/`invalid` 共用一条 tag+body；`ResearchEvidenceTab` 将非 `empty` 故障统合进 `evidenceUnreadable` 且未暴露区分状态属性。

## 修法

在 `zh-cockpit.ts`/`en-cockpit.ts` 新增各态独立词条，拆分 `ProtocolCard.tsx`（`empty`/`unreadable`/`invalid`）与 `ResearchEvidenceTab.tsx`（`absent`/`unreadable`/`invalid` + `data-evidence-state`）。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-status/ProtocolCard.tsx",
    "packages/deep-research-pack/src/client/ResearchEvidenceTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh-cockpit.ts",
    "packages/deep-research-pack/src/client/locales/en-cockpit.ts",
    "tests/cockpit/client/research-status/protocol-radar.spec.mjs",
    "tests/cockpit/client/final-evidence.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test tests/cockpit/client/final-evidence.spec.mjs",
    "exit": 1,
    "output": "BUG-444 ResearchEvidenceTab：absent / empty / unreadable 文案与属性碰撞"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/final-evidence.spec.mjs"
  }
}
```
