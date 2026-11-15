> 状态：implemented

# DSH 插件缺陷修复：边界优先的证据模型

> 2026-11-15 ｜ 决定载体：[bug 修复方法](../../_backlog/methods/bug-to-fix.md)

## 决定

把 bug 轨从“四态状态机 + 落地证据”补成一套 DSH 插件专用的显性流程：

- **先判表面/边界**：pack lib / client / host plugin / preset / content / startup / install / run / vendor seam；最低真实边界 = ② 行为 / ③ 注册 / ④ 真挂载 / L1 / L2 / 浏览器 / snapshot B/C / L4-lite / 真 run。低边界绿不算修好（[evaluation 的四分离](../../docs/evaluation.md)：能加载 ≠ 有行为证据 ≠ 能安装 ≠ 已获交付批准）。
- **三组证据随状态翻转**：排查中 → 修复就绪 = 复现状态 + 根因证据 + 类决策 + 修法 + `## 修复判据` + 分诊授权；修复就绪 → 修复落地 = 红证（同边界、exit≠0、红因正确）+ 绿证（同一命令 exit 0）+ 守卫；修复落地 → 已修 = 判据逐项 + 审查/跳过 + 四分离 + 去向 + 同暂存集。
- **批修复模式**：多张活跃卡同批修时先聚类（卡 → 症状 → 表面/边界 → 共同根因），按根因决定一次修/拆修；共同根因/共享决定 → 一篇批 Note + 每卡自己的 `fix-evidence` + 共享守卫 + `去向：implemented — 批 Note`；卡与 Note 同变更归档；独立机械修复（单卡或同批无共享决定）仍可 `none`。
- **DSH 不变量进入根因**：fail-loud、model-visible ⟺ logged、registrations are effects、plugins not loop changes、host read-only；vendor 只读，机制走 `vendor/dsh/`，不 patch、不以全局安装为依据。
- **卡模板**：[bugs/README](../../_backlog/bugs/README.md) 增 `## 分诊与授权`（严重级/表面/边界/不变量/触及面/授权）、`## 复现` 的 `复现状态：`/边界、`## 根因` 的 `根因证据：`、`## 牵出的失败类` 的结构化首行、`## 修法`；`## 修复落地` 的 guard 明确“与缺陷同边界”。
- **入口**：bugs/README 顶部与缺陷通道、[_backlog/README](../../_backlog/README.md)、[methods/README](../../_backlog/methods/README.md)、[guides/60](../../docs/guides/60-dev-loop.md) 都指向方法；guides/60 的证据句与现行 `json fix-evidence` 对齐。
- **不加新门禁**：现有 `backlog-liveness`（判据/fix-evidence/guard）与 `staged-change-pairing`（同暂存集）继续咬落地证据；前端证据先靠模板 + 方法。触发 = 第一张新卡漏了类/授权/根因证据，或第一批共享根因的卡没有互链批 Note；届时按 promote-on-recurrence 评估 presence 门禁（只查在场，不查语义），带红先反证。

## 输掉的方案

- **通用 bug 修复流程（不带 DSH 表面/边界）**：会把 L1/L2/浏览器/模型可见的 bug 当纯函数修；低边界绿掩盖高边界红。不选。
- **新增状态/队列**：破坏四态状态机与 [D24](../../docs/decisions.md#d24)；不选。
- **现在就加 presence 门禁**：只能证“填了”，不能证“填对”；先让方法和模板跑一张卡，按仓的 promote-on-recurrence 等触发再评估。不选。
- **复述 `diagnosing-bugs` / `reproducing-a-failure`**：方法只做路由和证据标准，诊断技术仍归技能；不选。
- **把 vendor 当可改面 / 把全局安装当机制依据**：违反 [D10](../../docs/decisions.md#d10) 只读铁律与 vendor-pin 纪律；不选。
- **把 `## 修法` 留在 `## 修复关联` 事后补**：翻转时没有“选了什么、为什么不是别的”的记录；不选。
- **逐卡顺序修**：同一根因在第 2、3 张卡上重复交学费，共享守卫也容易缺席；不选。
- **共享守卫替代单卡证据**：共享绿命令没证明每张卡的复现例；不选。

## 实际跑过的验证

- `pnpm verify` → exit 0；`pnpm test` → exit 0。
- `node --test tests/checks/backlog-liveness.test.mjs` → exit 0（方法 frontmatter 与新卡模板未破坏既有生命周期断言）。
- 手工对账：方法 → 卡模板 → bugs/README / _backlog/README / methods/README / guides/60 的链接均解析；guides/60 的证据句与现行 `json fix-evidence` 一致。
