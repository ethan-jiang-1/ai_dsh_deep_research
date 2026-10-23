# run context：run bundle 读面与绑定信任（已落地）

> 状态：implemented
>
> 首提 2026-10-23 ｜ 合同 [design/40 §2](../../docs/design/40-research-cockpit.md) ｜
> 读面 [run-context.ts](../../packages/deep-research-pack/src/lib/run-context.ts) +
> [run-source-browser.ts](../../packages/deep-research-pack/src/client/run-source-browser.ts) +
> [run-source-node.mjs](../../scripts/lib/run-source-node.mjs) ｜
> 信任 [binding-trust.ts](../../packages/deep-research-pack/src/lib/binding-trust.ts) ｜
> 回归 [run-context.test.mjs](../../tests/run/run-context.test.mjs) ·
> [run-context-node.test.mjs](../../tests/run/run-context-node.test.mjs) ·
> [run-source-browser.test.mjs](../../tests/cockpit/run-source-browser.test.mjs) ·
> [binding-trust.test.mjs](../../tests/run/binding-trust.test.mjs)

## 决定

**run bundle 的读面收进一个模块，位置/在场/分页/读策略只此一份。**
D28 的三操作桶（根 / `archive/` / `_abandoned/`）此前在四个页签与四个 Node 工具里各写一遍
（至少 8 份循环），读策略也漂移：`review.md` 在状态页翻到 eof、在终稿页只读 600 行，真实
1448 行文件（`FAIL@571` / `PASS@1442`）会被终稿页读成「审查未过」。

- `src/lib/run-context.ts`：纯逻辑，不 import `node:*`、不 import React、永不 throw。
  `openRun` 按桶序发现（显式桶路径先查该桶再回退），空目录是合法 run（不让位给 archive 同名副本），
  `listRuns` 做枚举（同 slug 根优先，mtime 全在场才按 mtime 排序）。`Outcome` 三态
  `ok / missing / unreadable`：空目录/空文件是 `ok` 的空值，不是 missing。
- 读策略是一张表：`review.md` / `final.md` / `final/vN.md` 读到 eof（500 行/页，最多 64 页），
  `question.md` 80、`plan.md` 800、其余 40；未到 eof 一律 `truncated: true`，不静默短读。
- `RunSource` 是两个真实适配器：浏览器的 `remote.workspaceFiles` 与 Node 的 `node:fs`。
  `workspace-file/not-found` → missing，其它 → unreadable；列目录为空与目录缺失因此可分。
- 绑定信任是独立政策：`bindingTrust(events)` 自己折 HITL，write 永远可信，read 在挂起/立项
  信号下抑制并带 reason（`pending` / `kickoff`）；状态/配置/图谱三页签只消费结论。
  配置页因此不再在立项预检窗把上一场 run 显示成“本次研究”。
- Node 侧只把**扫描**归 `listRuns`：`node-gate --latest`（根 + archive）、`evidence-audit --latest`
  （三桶）、`schema-scan` 缺省（archive）各自显式传 buckets；`run-state.bundleDirOf` 用
  `bundleCandidates` 的同步纯函数。`gateBundle` / `scanAll` 的判据核仍是同步——async 只到
  读面需要的地方，不让 63 个门禁测试为它改签名。
- 终稿页签改为整文件读取（到 eof / 触顶 `truncated`），不再有“继续加载”分页；这是有意的取舍：
  一个 1448 行 review 约 50KB，整读正确性优先；触顶时如实显示截断。
- 机械侧 = verify 门禁 `run-context-single-source`：`src/client` 的 tracked `.ts/.tsx` 非注释行
  出现 `_abandoned` 候选链即红（`src/lib/final-target.ts` 的终稿地址校验是另一件事，不在词法
  门禁范围）；`finalCandidates` 已删除，三位置发现只剩 run-context 一份。

## 输掉的方案

- **layout 注册表 + generator effects（`Script`/`Port` 双驱动）**：技术上能同时支持 sync Node 与
  async 浏览器，但为 8 个调用点引入新的控制流概念，fresh agent 要跨过 generator 才能读懂读面；
  YAGNI。
- **materialized `face`（`openRun` 直接返回 steps/review verdict/plan 版本）**：把折算拉进读面，
  还让图谱/配置页每次轮询都读完整 review；便利应住 client 的 `useRunView` hook，不在共享 lib。
- **sync twin（同一实现两套驱动/重载）**：能避免 async 迁移，但重载 + trampoline 是两处易错点；
  选择 async-only 的读面，Node 侧只迁必要的扫描壳。
- **只修终稿页的局部 `readAllPages`**：能消当前 bug，但另外 7 份三位置循环与读策略仍在，且没有
  keyless 的发现/翻页测试面；不解决“规则没有家”。
- **给 `node-gate --latest` 强行扫 `_abandoned`**：停放桶不参与自动审计是合理操作语义；改为在
  调用点显式写 buckets，并用测试钉住范围，而不是让三个工具各写一份隐式范围。
- **强迁 `run-dashboard` / `client-load-reference` oracle**：dashboard 是同步 HTML 投影；
  oracle 的价值在独立——让它复用生产实现会掩盖实现自己的漂移。两者保留，边界登记在
  design/40 §6。

## 实际跑过的验证

- 红证（每条都是先看到红，再还原绿）：
  - 模块缺席时 `run-context.test.mjs` import 失败（首跑 1 文件红）；
  - 把 `review.md` 从 EOF 策略移除 → 1448 行用例读成 40 行、`terminalReadiness` 判红；
  - 删掉 Node 适配器的空文件 `[]` 行切分 → 空文件用例读成 1 行红；
  - 浏览器适配器把 not-found 与其它错误都映射成 missing → 错误分类用例红；
  - 删掉 `bindingTrust` 的 pending 分支 → 挂起真值表用例红；
  - 向 `ResearchStatusTab.tsx` 注入 `['drt_x', 'archive/drt_x', '_abandoned/drt_x']` →
    `run-context-single-source` 点名红；还原绿。
- `pnpm test` **746 pass / 0 fail**；`pnpm verify` 44 门禁全绿；`gates-smoke` 78 案例全绿；
  `pnpm typecheck` 通过；pack 双半 `pnpm build` 通过。
- `client-load-smoke` 真浏览器 **ALL PASS**：状态页证据计数 160/160、业务摘要、HITL 锚点；
  图谱覆盖率；配置页本次研究摘要；终稿页 v2 版本账、首标题、版本切换、静音条、滚动口。
- Node 工具实跑：`schema-scan` 扫 46 份归档（0 契约期违约）；`node-gate --latest` 落到
  `drt_e2e-rerun-2026-10-23` 全绿；`evidence-audit --latest` 4 份证据、URL 8/8、CRITICAL 0。
- 浏览器适配器与 Node 适配器都有 keyless 用例；长 review 的 eof 行为由纯核用例钉住，不依赖
  某个 dev home 的绑定会话。
- 对抗自审修复：终稿 30s 轮询用完整 `dir/name`（不再 stat 工作区根）；`plan/vN.md` 快照与
  `plan.md` 共用 800 行策略（此前漏成默认 40）；配置页只在 bound slug 变化时重读；
  review/plan 的 `truncated` 不再当完整文折叠。
