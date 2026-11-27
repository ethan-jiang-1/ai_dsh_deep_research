# root → docs/ 对齐 DSH 插件统一 16 文件核心骨架与 UTF-8 字节预算

> 状态：implemented
> 决策编号：[D59](../../docs/decisions.md#d59) · 部分取代：[2026-11-27-docs-decouple-backlog-and-align.md](./2026-11-27-docs-decouple-backlog-and-align.md)（完成该篇延后的驾驶舱注册表外置与治理合同迁出；该篇确立的 `docs/` → `_backlog/` 单向依赖边界继续生效）。

## 决定

1. **对齐 DSH 插件仓统一 16 文件核心骨架（最大深度 2 层、零数字前缀、零子目录 `README.md`）**：
   - 顶层 6 锚点：[`docs/README.md`](../../docs/README.md)（原 `00-index.md`）、[`docs/AGENTS.md`](../../docs/AGENTS.md)、[`docs/architecture.md`](../../docs/architecture.md)（原 `design/10-architecture.md`）、[`docs/decisions.md`](../../docs/decisions.md)、[`docs/testing.md`](../../docs/testing.md)（原 `evaluation.md` + `guides/67-test-strategy.md` + `project-map.md` 测试词汇与新检查落家序）、[`docs/policy.md`](../../docs/policy.md)（原 `design/60-intent-carriers.md` + `guides/68-surface-contract.md`）；
   - [`docs/contracts/`](../../docs/contracts/presets.md)（8 份，全部去掉数字前缀并在顶部统一 `> **读法**：...`）：`presets.md`、`client-ui.md`、`data-model.md`、`release.md`、`roles.md`、`methodology-mapping.md`、`run-forms.md`、`git-boundary.md`；
   - [`docs/guides/`](../../docs/guides/bootstrap.md)（5 份，去掉数字前缀）：`bootstrap.md`、`dev-loop.md`、`run-ops.md`、`plugin-authoring.md`、`probe-playbook.md`；
   - [`docs/reference/`](../../docs/reference/commands.md)（7 份 `.md` + `alignment-ledger.json`）：`package-catalog.generated.md`、`cockpit-registry.generated.md`、`gates-ledger.generated.md`、`commands.md`、`glossary.md`、`discipline-matrix.md`、`external.md`；
   - 退役 `docs/00-index.md`、`docs/design/`、`docs/project-map.md`、`docs/evaluation.md`、`docs/discipline-map.md`、`docs/terms.md`、`docs/external-materials.md`、`docs/guides/67-test-strategy.md`、`docs/guides/68-surface-contract.md`；全部 24 条旧路径映射追加进 [`checks/test-path-redirects.json`](../../checks/test-path-redirects.json) 以免改冻结层（`notes/`、`_backlog/_archived/`、`snapshots/replay/`）。
2. **UTF-8 字节预算与可读性收口**：
   - [`checks/doc-budgets.json`](../../checks/doc-budgets.json) 与 `doc-budgets` 门禁（[`checks/verify/gates/a-docs.mjs`](../../checks/verify/gates/a-docs.mjs)）由物理行数切换为 UTF-8 字节预算（对齐 `vendor/dsh/docs/AGENTS.md`），全部 9 份常驻文档留 ≥5% 余量；
   - 解压全仓 live 文档（`AGENTS.md`、`README.md`、`*/AGENTS.md`、`docs/**/*.md`）中 >350 字的单行压缩正文墙至 0 条；
   - 升级 `doc-paths` 门禁支持 `{a,b}` 花括号路径展开（[`checks/lib/repo/doc-surface.mjs`](../../checks/lib/repo/doc-surface.mjs)），并在 `doc-surface-shapes.test.mjs` 与 `gates-cases.mjs` 三向对账；修复 6 处既有路径/语法漂移。
3. **拆瘦 60 KB 巨石文档为 3 份确定性自动生成参考物**：
   - 新增纯渲染核 [`checks/lib/repo/docs-reference.mjs`](../../checks/lib/repo/docs-reference.mjs) + CLI 入口 [`tools/record/render-docs-reference.mjs`](../../tools/record/render-docs-reference.mjs)（`pnpm docs:gen` / `pnpm docs:check`）+ 回归测试 [`tests/checks/repo/docs-reference.test.mjs`](../../tests/checks/repo/docs-reference.test.mjs)；
   - 新增 L0 门禁 `docs-reference-fresh`（守护 3 份 `.generated.md` 新鲜度），并将 `cockpit-doc-registry` 与 `gate-ledger-sync` 对齐至生成索引；
   - `docs/contracts/client-ui.md` 由 60.1 KB 瘦身至 17.9 KB，`docs/testing.md` 由 59.5 KB 瘦身至 18.8 KB；将里程碑编号统一为 `MS1–MS3+` 以消除与研究方法 `M1–M3` 的术语歧义。
4. **重构根 [`AGENTS.md`](../../AGENTS.md) 首屏 1 跳直链与配套门禁加固**：
   - 根 `AGENTS.md` 压缩至 ~9.6 KB（预算 16,384 B），首屏 1 跳直达 `docs/architecture.md`、`docs/README.md`、`docs/AGENTS.md`、`packages/deep-research-pack/AGENTS.md`、`docs/guides/bootstrap.md`、`docs/testing.md`、`docs/guides/dev-loop.md`，并将布局节升级为可点击 GFM 表格；
   - 强化 `entry-chain` 门禁（[`checks/verify/gates/f-repo.mjs`](../../checks/verify/gates/f-repo.mjs)）断言根 `AGENTS.md` 全部 1 跳目标；修复 `surface-claims` 缺少目标文件时直接抛 ENOENT 中断校验的缺口，并补齐 [`checks/lib/repo/shipped-surface.mjs`](../../checks/lib/repo/shipped-surface.mjs) 对新 `docs/` 子目录（`contracts`/`reference` 等）的识别，防止打包面扫描漏检。
5. **保持 `0.3.7` tarball `PACK_INPUTS` 不可变边界**：
   - 不改动 `packages/deep-research-pack/{README.md,README.zh.md,cordis.patch.yml,src/**}` 等已发布 `0.3.7` tarball 输入面，避免破坏 `dist-freshness` 校验与同版本工件 sha256；包内少量旧路径注释与 GitHub URL 延后至下一次 pack 升版（`0.3.8+`），已登记于 [`docs/policy.md`](../../docs/policy.md) 与 [`_backlog/triggers.md`](../../_backlog/triggers.md)。

## 输掉的方案

- **保留 `00-`/`10-`/`60-` 数字前缀与 `docs/design/` 子目录**：会继续与 `vendor/dsh` 原生文档骨架（`contracts/`、`guides/`、`reference/`）和姊妹插件仓错位，且存在 `design/60` 与 `guides/60` 撞号及子目录层数不一致的问题。
- **保留物理行数预算**：物理行数迫使作者把多句压缩进千字单行以“绕过行数上限”，直接损害人类与 agent 阅读体验；切为 UTF-8 字节预算后，折行不再受惩罚，同时保留真实上下文长度上限。
- **继续手写维护 60 KB 巨石文档内的文件注册表与门禁清单**：每次新增模块或门禁都需手工在巨表中同步并造成高噪 diff；改由 `pnpm docs:gen` 确定性生成并由 `docs-reference-fresh` / `cockpit-doc-registry` / `gate-ledger-sync` 守护新鲜度，零人工漂移。
- **在本轮同步改写 `packages/deep-research-pack/` 打包输入面内的旧文档注释与外链**：修改 `PACK_INPUTS` 会改变 `0.3.7` tarball 指纹，逼迫无业务变动的版本升级或使 `dist-freshness` 变红；按仓内发布纪律保持当前版本制品不可变，将注释与外链更新挂钩至下一次升版触发器。

## 实际跑过的验证

- **Phase 1（路径漂移、花括号展开与 UTF-8 字节预算，commit `1d8f8fd6`）**：
  - 红→绿反证：开启 `doc-paths` `{a,b}` 花括号展开后实测捕到 4 文件 12 处旧路径（真红）→ 修正后全绿；`node checks/smoke/gates.e2e.mjs --gate=doc-budgets,doc-paths` 全绿；`pnpm verify && pnpm test` 全绿。
- **Phase 2（自动生成物与巨石拆分，commit `12e8f396`）**：
  - 红→绿反证：注入过期的 `.generated.md`、缺失模块与缺项门禁台账，确认 `docs-reference-fresh`、`cockpit-doc-registry`、`gate-ledger-sync` 均真红 → 还原全绿；连续两跑 `pnpm docs:gen` 零 diff；`node checks/smoke/gates.e2e.mjs --gate=docs-reference-fresh,cockpit-doc-registry,gate-ledger-sync` 全绿；`pnpm verify && pnpm test && pnpm typecheck && pnpm lint` 全绿。
- **Phase 3（16 文件核心骨架迁徙与门禁同步，commit `b6bada30`）**：
  - `node checks/smoke/gates.e2e.mjs --gate=doc-budgets,doc-paths,md-anchors,doc-drefs,archived-note-pointer,surface-claims,entry-chain,release-vocab,pack-bundle-compat,cockpit-doc-registry,gate-ledger-sync,align-ledger,discipline-na-trigger,discipline-state-vocab,docs-reference-fresh,probe-registry,readme-shape`：55 条注入案例 + 2 对照组全绿（且在自测中暴露并修复了 `surface-claims` 缺文件 ENOENT 与 `shipped-surface` 新 `docs/` 根正则缺口）；`pnpm docs:check && pnpm verify && pnpm test && pnpm typecheck && pnpm lint && pnpm release:check` 全绿。
- **Phase 4（根 `AGENTS.md` 重构与 `entry-chain` 强化，commit `b2a64d11`）**：
  - `node checks/smoke/gates.e2e.mjs --gate=entry-chain,doc-budgets,gate-ledger-sync`（含新增负控 `entry-chain-missing-one-hop`）全绿；`pnpm docs:check && pnpm verify && pnpm test && pnpm typecheck && pnpm lint && pnpm release:check` 全绿。
- **Phase 5（收尾、盲测、真模型探针与终验）**：
  - **真模型入口链探针（`source tools/env.sh && node probes/behavior/entry-chain-probe.mjs`）**：首跑暴露 `AGENTS.md` 措辞「才立 RFC」与词面判据「建立/建在」的召回差（Q1/Q3 PASS、Q2 语义正确但词面 FAIL）→ 将 `AGENTS.md` 改为「才在 `notes/proposed/` 建立 RFC」后重跑 **3/3 ALL PASS**（exit 0；留档 `runtime/smoke-workspace/entry-chain-probe-2026-11-27T11-43-42-031Z.md`）；
  - **Fresh-Agent S1–S4 盲测（独立只读子代理，零先验上下文，严格从 `AGENTS.md` 出发）**：S1（1 跳）、S2（1–2 跳）、S3（1 跳）、S4（1–2 跳）全部达标、0 坏链；顺带查出并同变更修复了 6 处残留漂移（`writing-a-gate/SKILL.md`、`checks/AGENTS.md`、`docs/guides/dev-loop.md`、`docs/guides/run-ops.md`、`packages/deep-research-pack/AGENTS.md` 及 `_backlog/research/README.md`）；
  - **结构与静态终验**：16 核心骨架 100% 就位（最大深度 2、零数字前缀、零子目录 `README.md`）、`PROSE_WALLS_GT_350 = 0`、live 活面旧路径清零、`vendor/dsh/` 与冻结层零改动、`pnpm docs:check && pnpm verify && pnpm test && pnpm typecheck && pnpm lint && pnpm release:check` 全部 exit 0；
  - **未跑项声明**：本次仅改动文档、门禁、测试与生成脚本，未修改任何 runtime 业务代码或打包输入面，故未跑 L1/L2/浏览器真机冒烟与全量 `gates.e2e`（改动的 17 道门禁均已按 `--gate` 定向自测全绿，完整发布档留待下次 pack 升版/nightly CI）。

## 环境状态

- `vendor/dsh/` 保持只读零改动（`dsh-v0.2.1-rc.5` @ `b830ec950f`）；`notes/archived/`、`_backlog/_archived/`、`snapshots/replay/`、`_dist/` 与 `packages/deep-research-pack` `0.3.7` `PACK_INPUTS` 零改动；
- 唯一延后跟踪项（pack 打包输入面内的少量旧路径注释与 GitHub URL）已登记于 [`docs/policy.md`](../../docs/policy.md) §已知限制与延后工作 与 [`_backlog/triggers.md`](../../_backlog/triggers.md)，随下一次 pack 升版同步清理。
