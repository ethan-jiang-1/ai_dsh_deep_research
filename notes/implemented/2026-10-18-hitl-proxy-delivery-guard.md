# 代答闸：默认档在 review 非 PASS 的交付卡上自拒

> 状态：implemented

出处 = 端到端真 run 实测（2026-10-18）：`review.md` 终局 FAIL（critic 要的是修复轮）、Lead 仍呈了
HITL2 交付卡，而**代理代答默认取推荐档 = 「定稿」** → 交付越过前置（NODES 第 6 行「PASS = HITL2 前置」）。
卡 = BUG-039（运行纪律那一半）；判据与证据 = 本 Note。

## 决定

`dev/hitl-answer.mjs` 在提交前加**交付代答闸**（纯判据在 `scripts/lib/ask-drive.mjs`）：

- `isDeliveryReviewCard(questions)`：选项集同时含「定稿」与「补研究/修订」族 → 认作交付审阅卡（按族匹配，
  不抄死文案）；
- `deliveryAnswerGuard({isDeliveryCard, readiness, pick})`：交付卡 + readiness **非 PASS** + **默认推荐档**
  → **自拒**（exit 4，不开浏览器作答），消息给三条出路：① 人工在 GUI 裁决；② 显式 `--pick <非定稿项>`
  或 `--custom`；③ 先补审查轮使 PASS。**显式**指定视为操作者有意为之 → 放行并在日志留痕。
- readiness 取自 **pack 的 `terminalReadiness`**（与 UI 同源；门的副本漂移另立 BUG-040）。

## 输掉的方案

- **默认改投「补研究」**：代答工具不该替操作者决定内容取舍——只该拒绝"越权定稿"这一种越界；
- **只打警告继续投定稿**：实测后果就是这次交付越过前置（红在 node-gate 门A）；
- **新增 `--force-deliver` 旗标**：已有 `--pick/--custom` 就是显式意图的载体，再加旗标是多余面；
- **用门的 `readinessOf` 取 readiness**：实测对一场**已 PASS** 的已交付 run 误判 FAIL（那份副本没跟随
  BUG-036 的轮次仲裁）→ 会误挡合法交付。

## 实际跑过的验证

- **契约测试**（`tests/ask-drive.test.mjs`）：默认档 FAIL 自拒（含"给依据 + 给出路"断言）、PASS 放行、
  显式 pick 放行、无判定行不放行、非交付卡不受约束；卡识别正反例各一。**负例留证块**写明红配方
  （删自拒分支 → 该例红；实做看过红）。
- **真数据核对**：对 `drt_anthropic-claude-release-line-timeline`（终局 FAIL）→ 自拒 ✓；
  对 `drt_cambricon-commercial-sustainability`（终局 PASS）→ 放行 ✓。
- **L0**：`pnpm verify` 全绿 · `pnpm test` **526/526**。
