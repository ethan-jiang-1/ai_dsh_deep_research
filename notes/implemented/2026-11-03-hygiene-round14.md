# 第 14 轮七维复核：评级与真相复位

> 状态：implemented

## 决定

- **评级**：① A−、② B、③ B、④ B、⑤ A−、⑥ B、⑦ B。口径：A− = 无 P1、仅余 P2；B = 仍有会误导 agent 或让反馈失真的 P1。上一轮“七维全 A”不成立。
- **L0 最小集 = `pnpm verify` + `pnpm test`**（fresh clone 可跑）；`pnpm test:vendor` 与 `pnpm typecheck` 是加跑面——前者 keyless，后者需要 vendor 构建产物。入口文档统一 source-first：fresh clone 首次跑 L0 前先 `source dev/env.sh`，因为 `hooks-active` 门禁要求 pre-commit 已激活。
- **安装步骤 owner = `scripts/dist/product-manual.md`**；`_dist/安装手册.md` 是生成物（重导出 = `node scripts/dist/export-dist.mjs`）。
- **两篇已失效决定加历史注记**：workspace 种子 / preflight-scaffold 两篇描述的是 D40 已删除的机制；按 notes/AGENTS 加 `> 历史注记`，互链现行 guides/65。
- **live 文档去计数腐化**：删“47 道门禁”、D41“十段”、00-index/project-map 的“种子”；61 标注为开发通道（M2）。历史 Note 不重写正文，只加历史注记。
- **不把代码落地当盘上证据**：`page.html` 代码已落，但 21 个 verdict 目录 0 个 page.html；证据声明降级为“代码写、盘上未观测”，产物补齐另立证据。

## 输掉的方案

- **继续维护“七维全 A”**：与实测冲突，下一轮会在错误基线上做决策。
- **把 L0 扩成四件“均 keyless、秒级”**：typecheck 需要 vendor 构建，fresh clone 跑不了，会把“done”变成两套口径。
- **用 `prepare` 自动设 hooksPath 让 fresh clone 变绿**：把提交纪律藏进安装副作用，违背 fail-loud；改为 source-first。
- **重写历史 Note 的正文**：毁掉证据链；按 notes 规则加历史注记并互链。
- **把文档修正冒充行为修复**：本轮只做真相复位；行为面的证据不在这里冒充。

## 实际跑过的验证

- `pnpm verify`：52/52 PASS（含本 Note 与 Phase 0 文档变更后的复跑）。
- `pnpm test`：1018/1018 PASS；`pnpm test:vendor`：3/3 PASS；`pnpm typecheck`：exit 0。
- `client-load-smoke --seed tests/fixtures/client-load-home --port 3109`：ALL PASS（真 Chromium）。
- `node scripts/dist/export-dist.mjs`：全绿（147 条目、preset 5/5、模板 8）；clean build 后 `lib/workspace-boot.js` 不再随 tarball（`lib/types/client/workspace-boot.d.ts` 是 client 源码的类型件，不是旧插件）。
- 反证：把 `core.hooksPath` 置空后 `node scripts/verify/verify.mjs --only=hooks-active` → 点名红；还原后绿。
- 发布面未收口：`npm view dsh-deep-research-pack` → 404；`git tag` 最新 0.1.2；`release-check` → “0.3.0，HEAD 未打 tag”。
- 团队层未声明 / `--require-data` 假绿 / probe 崩溃 latest 陈旧 / `src/lib` 两面平铺 / `client-load-smoke` 1292 行：复核记录，本轮未改行为。
