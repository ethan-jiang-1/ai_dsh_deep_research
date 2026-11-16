# 2026-11-16 · Model Experience L2 加固：行为级注入断言 + 恢复 DSH 规范 H4

> 状态：implemented

## 决定

- L2 复评自查挖出同日 shipped 工作的两处回归，本变更纠正：
  - **GAP-2 弱断言**：`model-experience` driver 原先直接读 `content/manual.md` 文件估 `manualTokens`，未断言手册真在捕获的首请求里（只靠 `share≤1` 间接兜底）。修：mock 增 `firstTurnRequestJson()` 捕获首请求 `messages` 序列化；driver 断言手册首行标记 `# 研究工作区 — 研究手册` 真实在场于 Lead/Scout 捕获请求（行为级，非形状）。
  - **GAP-3 格式退化**：上轮为压 310 行预算删了 Model Experience 的 H4 字段改 bold 内联，违反 DSH 规范（vendor `adding-a-package.md:108` 要求每 H3 条目带三个有序 H4：What the model sees / Token effect / KV Cache effect，verifier 强制）。修：恢复 H4 + 保留「一段一物理行」（vendor `verify-md-wrap` 同要求）→ en 309≤310，**无需升顶**（上轮错在删结构而非用一行段落）；zh 同步保 `readme-bilingual` 同构（h4=6）。

## 输掉的方案

- **升 readme-shape 顶（310→更高）容纳 H4**：vendor 同时要求一段一行，用一行段落即可在 309 行内容纳 H4，无需动门禁阈值（改顶须 gates.e2e 案例 + 理由，成本更高）。放弃。
- **保留 bold 内联（本仓 readme-shape 不查 H4 故绿）**：按权威序 DSH 契约 > 本仓 gate，本仓 gate 没拦不等于合规；README 应守 DSH 规范结构。放弃留退化。
- **只靠 share≤1 间接证注入**：手册占消息约一半才碰巧咬住缺席；手册占比若变小则漏。改为直接断言标记在场，与占比解耦。放弃间接。

## 实际跑过的验证

- `node scripts/smoke/model-experience.e2e.mjs` → PASS（Lead 11589/工具 6634、Scout 8657/工具 4999、manual 2506≈50.6%）；新增手册标记断言对 Lead/Scout 均通过（手册真注入）。
- `node scripts/verify/verify.mjs` → 全绿（readme-shape 309≤310、dist-freshness 重 export 后绿）。
- `pnpm test` → 1578 绿 0 skip（含 `readme-bilingual` en/zh 标题层级同构 1/10/9/6）。
- `node scripts/dist/export-dist.mjs` → 全绿（README 源变刷新 _dist 手册 sha）。
- **未跑**：远程 CI（待 GAP-1 Linux 修复后一并推送验）。记 U。
