---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-063：web-ui-nav 的 chrome 文案常量仍是英文单语——zh UI 下「展开更多」与「预览版说明」都静默失效

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 三条 chrome 文案常量改双语（Show N more / 展开其余 N 个会话；Preview Notice / 预览版说明；Continue / 继续 / 我知道了 / Got it）；cdp-probe 展开未命中显式报 `expand=not-found`；`dismissPreviewNotice` 标题认不出但 Continue 候选在场 → `unknown`（不猜点）。先红后绿（2026-11-11，去向：none — 机械修复，审查：agent 自审 + 机械门禁）

## 症状

`scripts/lib/web-ui-nav.mjs` 自称「观察面侧栏 UI 导航共享件——唯一正本」，其中 `TAB_TEXT` 已按
2026-11-03 的结论做成**中英双语**，但同文件另两条 chrome 文案常量仍是**英文单语**：

| 常量 | 现值 | zh UI 实际文案 |
|---|---|---|
| `SHOW_MORE_SESSIONS_PATTERN` | `Show \d+ more sessions` | **展开其余 N 个会话** |
| `PREVIEW_NOTICE_HEADING` | `Preview Notice` | **预览版说明** |
| `PREVIEW_NOTICE_CONTINUE` | `Continue` / `我知道了` / `Got it` | **继续**（列表里没有） |

于是 zh UI 下：

- `cdp-probe` 的「点开折叠组」evaluate 永不命中，而且**返回值被丢弃**（静默 no-op）——目标会话行
  找不到时，探针只会报「行不在」，不会说「展开失败」；
- `dismissPreviewNotice()` 的标题判定直接返回 `'absent'`（模态在也看不见）；即便发现，`继续` 按钮
  也不在候选列表里 → 弹窗不关，后续点击打在遮罩上（该函数声明会返回 `'stuck'`，但标题判定已提前
  退出，走不到这一步）。

证据：zh 文案来自 vendor 同版本 locale 键——`ui-settings-models/src/client/locales.ts` 的
`welcomeTitle` zh=`预览版说明` / `welcomeContinue` zh=`继续`；「展开其余 N 个会话」在本机 zh 界面的
回放诊断行里直接可见。

## 复现（静态即可判）

```sh
grep -n "SHOW_MORE_SESSIONS_PATTERN\|PREVIEW_NOTICE_HEADING\|PREVIEW_NOTICE_CONTINUE" \
  scripts/lib/web-ui-nav.mjs probes/browser/cdp-probe.mjs
# 常量 = 英文单语；cdp-probe 的 evaluate 结果未断言
```

运行时表现（zh UI）：`cdp-probe` 找不到目标行、预览弹窗不消失；而 `client-load-smoke` 因为**显式保持
en-US** 不受影响——这正是「同一套共享常量被不同 locale 的消费方共用」才暴露的问题。

## 根因（已证）

i18n 收口只做了**页签标题**（`TAB_TEXT`），没有把「展开更多 / 预览弹窗」这类 chrome 文案一起进表；
消费方（`cdp-probe`、`client-load-*`）又是**直接吃常量**，于是 locale 一变就静默失配。与
[BUG-059](BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) /
[BUG-061](BUG-061-replay-c2-guide-capsule-missing-after-locale-pin.md) 同一失败类：
**文案断言没有 locale 归属，且失配会静默**。

## 修复判据

1. 三条常量改双语（regex 交替）：
   `Show \d+ more sessions|展开其余 \d+ 个会话`、`Preview Notice|预览版说明`、
   `PREVIEW_NOTICE_CONTINUE` 补 `继续`；
2. `cdp-probe` 的展开调用**断言返回值**：没点到「展开更多」就报明确失败（或至少在输出里标注
   `expand=not-found`），不许静默继续；
3. `dismissPreviewNotice()` 在标题缺席但 Continue 候选在场时也应尝试关闭（或返回 `'unknown'`
   而不是 `'absent'`），保证「美化过的弹窗」不会静默挡住点击；
4. keyless 测试：对三条常量各断言中英两种文案都能命中（`tests/cockpit/` 或 `test/web-ui-nav` 同族）；
5. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-11）：`web-ui-nav` 的 `SHOW_MORE_SESSIONS_PATTERN` / `PREVIEW_NOTICE_HEADING` 改中英交替（heading 改为 regex source，探针 `new RegExp` 消费）/ `PREVIEW_NOTICE_CONTINUE` 增「继续」；`cdp-probe` 展开 evaluate 返回值断言并报 `expand=not-found`；`dismissPreviewNotice` 新增 `unknown`（标题不在但 Continue 在场时不猜点，防误触 HITL）。证据 = `tests/cockpit/library-fold.test.mjs` 中英命中 + `tests/run/web-ui-nav.test.mjs` zh 标题/「继续」例（36/36）。去向 = none — 机械修复。

原始处置（留档）：P2 测试/探针资产修理型，可凭本卡自授权落地。与
[BUG-059](BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md)（已修：钉 locale + 双语定位器）和
[BUG-061](BUG-061-replay-c2-guide-capsule-missing-after-locale-pin.md)（修复就绪：展开按钮英文单语）
同族，建议同批把**所有 UI chrome 文案常量**收进一张双语表，消费方一律从表取。
