# 问卡窄列布局修复（本包注入）

> 状态：implemented

右栏展开后聊天列变窄时，HITL 问卡的标题被压成一字一行。症状由 `session-replay` 实走捕获（同一会话：不展开右栏正常，展开后崩）。根因在 vendor `ui-user-questions`，本包只读 vendor，故以**受限的布局补丁**收口。

## 决定

- **在 `src/client/index.ts` 注入一条按 vendor 稳定钩子限定的样式**（`scoped.effect` append `<style>` + dispose 移除）：
  `[data-question-key] header{flex-wrap:wrap}` + `header>div:first-child{flex:1 1 14em}`。
  选 `data-question-key` 而非类名——vendor CSS module 的类名是哈希前缀（实测 `CaCzdq_header`），
  按类名匹配下一秒就漂；`data-question-key` 是问卡组件根的语义钩子（全 vendor 仅此一处）。
- **只影响窄列**：宽列下 14em 基准 + 换行不触发，卡头仍是一行。修后 1280×720 实测：标题恢复整行、
  "Work continued…" 换到第二行、三选项与描述完整可读（`runtime/scenes/replay-narrow-fix/page.png`）。
- **fail-soft 优先于精确**：vendor 若删该钩子，规则只是不再命中，不会误伤其它组件；代价是修复
  可能静默失效——所以移除条件与观测面都写进 [design/40 §已知限制与延后工作](../../docs/design/40-research-cockpit.md)，
  并由 `client-load-smoke` 常驻兜底（观察面装配零失败）。
- **不改 vendor 源码**：`vendor/dsh` 只读铁律（`vendor-clean` 把守）；此类上游缺陷的正解是向上游报，
  本包补丁是过渡态，附移除条件。

## 输掉的方案

- **按哈希类名覆盖**（`[class*="header"]`）：类名随构建变，且会连带命中别的卡片（如计划确认卡），
  一次误伤就是别处的布局回归。
- **全局 `header { flex-wrap: wrap }`**：范围太大，等于替所有 vendor 卡片改布局。
- **调窄右栏默认宽度**：宽度是用户可拖拽/持久化的布局状态，页签注册契约没有宽度字段（已核）；
  从我们这边改别人的布局偏好属于越界。
- **只把工具截图视口调宽（1600×1000）**：那只是让证据好看，产品里 1280 用户依旧看竖排——属于掩盖。
- **改 vendor 源码**：违反只读铁律，且下次换 pin 即冲突。

## 实际跑过的验证

- **修前/修后同会话对照**：`runtime/scenes/replay-cockpit-demo/page.png`（标题 24px 宽 / 946px 高，
  一字一行）→ `runtime/scenes/replay-narrow-fix/page.png`（正常换行）。两图均由 `session-replay --open-status` 生成。
- **盒模型实测**（一次性测量脚本，已删）：右栏 576 / 卡片 353 / 卡头 353 / 标题 24——定位到卡头 flex 塌缩。
- **浏览器回归**：`client-load-smoke` ALL PASS（观察面真浏览器装配、页签渐进面与自测例库全绿），
  证明注入未影响驾驶舱其它面。
- **包构建**：`packages/deep-research-pack` `pnpm build` 通过（client bundle 重新生成）。
- **机械面**：`pnpm verify` 全绿（`client-keys` / `client-effect-wrap` / `cockpit-doc-registry` 均过）；
  `pnpm test` 605/605。

## 环境状态

- 补丁只在 client 半边生效（`lib/client.js` 已重建）；宿主半边与配置面零改动。
- 观测面：若将来 1280×720 + 右栏展开时又出现竖排，先查 `data-question-key` 钩子是否被 vendor 改名
  （改了就按新钩子更新本规则，而不是加宽视口）。
