# 第 14 轮七维复核：评级与真相复位

> 状态：implemented

## 决定

- **评级**：① A−、② B、③ B、④ B、⑤ A−、⑥ B、⑦ B。口径：A− = 无 P1、仅余 P2；B = 仍有会误导 agent 或让反馈失真的 P1。上一轮“七维全 A”不成立。
- **L0 最小集 = `pnpm verify` + `pnpm test`**（fresh clone 可跑）；`pnpm test:vendor` 与 `pnpm typecheck` 是加跑面——前者 keyless，后者需要 vendor 构建产物。入口文档统一 source-first：fresh clone 首次跑 L0 前先 `source dev/env.sh`，因为 `hooks-active` 门禁要求 pre-commit 已激活。
- **安装步骤 owner = `scripts/dist/product-manual.md`**；`_dist/安装手册.md` 是生成物（重导出 = `node scripts/dist/export-dist.mjs`）。
- **两篇已失效决定加历史注记**：workspace 种子 / preflight-scaffold 两篇描述的是 D40 已删除的机制；按 notes/AGENTS 加 `> 历史注记`，互链现行 guides/65。
- **live 文档去计数腐化**：删“47 道门禁”、D41“十段”、00-index/project-map 的“种子”；61 标注为开发通道（M2）。历史 Note 不重写正文，只加历史注记。
- **不把代码落地当盘上证据**：`page.html` 代码已落，但 21 个 verdict 目录 0 个 page.html；证据声明降级为“代码写、盘上未观测”，产物补齐另立证据。
- **启动行记录 last-used**：env 来源也把 `workspace + sessionId` 写入产品设置；同一工作区下一次启动复用会话，换工作区不复用。env 仍是覆盖源（不改变工作区优先级）；不记录会每次 mint 一个新的 blank Lead 会话。
- **发布面补齐**：`exports` 增加 `./cordis.patch.yml`、`./presets/*.patch.yml`、`./method-library-tool/{icon,locale}`；`files` 带 `locale-method-library/**`；build 先清 `lib/`；doctor 检查安装副本的 patch/client 完整性。团队层不写成 peerDependency——它是 bundle 不是 Node peer；`doctor` 已把“profile 缺团队层”记为硬失败，手册/README 改为“完整多角色研究必需”。
- **数据面改为正向证据**：状态页根节点暴露 `data-research-face`（`bound | unbound | kickoff-hold | pending | error | unknown`）；`run-channel` 优先读它，没标记时才回退文本，且回退必须命中“证据 N / 已交付 / 读终稿”正向标记。旧的“没写未绑定 = bound”负判会放过 kickoff/error/空挂载。
- **`--expect-face` 改为 opt-in**：默认拿页签标题当断言时，标题本来就在 paneText 里 = 重言式；未传该参数时不生成检查项，而不是默认绿。探针崩溃/输出不可解析时也落 `probeError` verdict 并更新 latest，避免 latest 停在上一次旧绿。
- **页签 render 面**：状态/图谱两页签新增 keyless 空态静态渲染（`react-dom/server`）；配置/终稿页签依赖 primitives 的 `Modal` / `MarkdownText` CSS 模块，tsx 测试加载器不解析 `.css`，其行为证据仍归 client-load 真机档。

## 输掉的方案

- **继续维护“七维全 A”**：与实测冲突，下一轮会在错误基线上做决策。
- **把 L0 扩成四件“均 keyless、秒级”**：typecheck 需要 vendor 构建，fresh clone 跑不了，会把“done”变成两套口径。
- **用 `prepare` 自动设 hooksPath 让 fresh clone 变绿**：把提交纪律藏进安装副作用，违背 fail-loud；改为 source-first。
- **重写历史 Note 的正文**：毁掉证据链；按 notes 规则加历史注记并互链。
- **把文档修正冒充行为修复**：本轮只做真相复位；行为面的证据不在这里冒充。
- **把团队层写进 peerDependencies**：团队层是 profile 里的 bundle，不是本包 import 的 Node peer；写 peer 会误导安装语义。保留 doctor 的 `profile 含团队层` 硬失败 + 手册“完整多角色研究必需”。
- **env 来源只写 sessionId 不写 workspace**：跨工作区复用 sessionId 不安全（controller 的可复用判定按 cwd）；记录 last-used workspace 才能只在同一工作区复用。

## 实际跑过的验证

- `pnpm verify`：52/52 PASS（含本 Note 与 Phase 0 文档变更后的复跑）。
- `pnpm test`：1023/1023 PASS；`pnpm test:vendor`：3/3 PASS；`pnpm typecheck`：exit 0。
- `client-load-smoke --seed tests/fixtures/client-load-home --port 3109`：ALL PASS（真 Chromium）。
- `node scripts/dist/export-dist.mjs`：全绿（147 条目、preset 5/5、模板 8）；clean build 后 `lib/workspace-boot.js` 不再随 tarball（`lib/types/client/workspace-boot.d.ts` 是 client 源码的类型件，不是旧插件）。
- `node scripts/smoke/doctor-smoke.mjs`：ALL PASS（新增“半装缺 client 产物 → exit 1”反证）。
- `node scripts/smoke/product-boot-smoke.mjs`：GREEN（注册 → 首屏 Lead Session，cwd = 工作区）。
- `tests/pack/startup.test.mjs` 8/8；`tests/pack/package-contract.test.mjs` 6/6（含删除 `./cordis.patch.yml` export 的红证）。
- `client-load-smoke --seed`：ALL PASS，新增“状态页数据面 marker = bound”硬断言（真 Chromium）。
- `run-driver-contract`：`dataFace` 正向/错误标记、kickoff 负例、无 `--expect-face` 不生成检查项、探针崩溃落 `probeError` verdict。
- 反证：把 `core.hooksPath` 置空后 `node scripts/verify/verify.mjs --only=hooks-active` → 点名红；还原后绿。
- 发布面未收口：`npm view dsh-deep-research-pack` → 404；`git tag` 最新 0.1.2；`release-check` → “0.3.0，HEAD 未打 tag”。
- 团队层未声明 / `--require-data` 假绿 / probe 崩溃 latest 陈旧 / `src/lib` 两面平铺 / `client-load-smoke` 1292 行：复核记录，本轮未改行为。
