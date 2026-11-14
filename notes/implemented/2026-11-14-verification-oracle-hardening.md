# D55 验证层 Oracle 独立化收口：单一真源、外部 AST 解析与双账闭环

> 状态：implemented
> 关联：[D55](../../docs/decisions.md#d55)；程序卡 = [补强卡](../../_backlog/_archived/settled_issues/2026-11-14-verification-oracle-hardening.md)（前序 = [初版卡](../../_backlog/_archived/settled_issues/2026-11-14-verification-oracle.md)）；取证 = [d55-oracle-gap-audit](../../_backlog/_archived/research/d55-oracle-gap-audit/README.md)

## 决定

本篇完整吸收并取代初版 Note（已归档冻结），把 D55「验证层判据独立于作者手写自指心智模型」落实为五项机制合同：

1. **Markdown 块级遮罩单一真源 + 进程内 `mdast` 真值对账**：
   - 将块级遮罩收敛至唯一实现 [markdown-mask.ts](../../packages/deep-research-pack/src/lib/markdown-mask.ts)（纯 TypeScript、零第三方运行时依赖，随插件包编译进 `lib/`）；[review-readiness.ts](../../packages/deep-research-pack/src/lib/review-readiness.ts)、[note-scan.mjs](../../scripts/lib/note-scan.mjs) 与 [fix-evidence.mjs](../../scripts/lib/fix-evidence.mjs) 三处读者统一消费它，删除原有的两套手写遮罩副本。
   - 废除静态 `tests/fixtures/markdown-oracle/oracle.json` 与录制脚本 `dev/record-markdown-oracle.mjs`；测试经受锁的 [workspace-parsers.mjs](../../scripts/lib/workspace-parsers.mjs) 在进程内直调 `mdast-util-from-markdown@2.0.3` AST，对围栏代码块、块引用/列表嵌套容器退出、行内反引号优先于 `<!--`、同行多段/跨行 HTML 注释及 Astral 平面 UTF-16 偏移逐行全等校验。
2. **CI 工作流 `yaml` AST 解析 + 写入侧规范 `run:` 门 + 真 shell 对照**：
   - [ci-workflow.mjs](../../scripts/lib/ci-workflow.mjs) 与 [ci-jobs.test.mjs](../../tests/checks/ci-jobs.test.mjs) 全面改用 `yaml@2.9.1` `parseDocument` AST（`uniqueKeys: true`）解析 `on:`（标量、序列、块映射与行内流映射）、`jobs:`、`needs:` 与 `if:`，删除手写缩进解析器。
   - 新增写入侧规范门 `ciWorkflowRunProblems`：凡引用 `scripts/smoke/` 的步骤，命令段必须符合受控前缀白名单，出现 `!` 取反、`&&`/`||` 短路死分支、后台 `&`、`|| true` 或未知包装一律直接判红；不再靠启发式猜任意 bash 语句。
   - [record-ci-oracle.mjs](../../dev/record-ci-oracle.mjs) 改以真实 `bash -eo pipefail` + 按目标独立注入失败的 `node` stub 校验错误传播，将 `events` 纳入录制真值（闭环 `BUG-190`），并在 [gates.e2e.mjs](../../scripts/smoke/gates.e2e.mjs) 接入 `--check` 防漂移。
3. **修复证据与红录守卫封死绕过链**：
   - [fix-evidence.mjs](../../scripts/lib/fix-evidence.mjs) 复用 `markdown-mask` 定位章节，词法级解码 JSON 键名拦截 `\uXXXX` 转义重复键，要求唯一 `json fix-evidence` 块以 `red.exit !== 0`、`green.exit === 0` 为判据，且活跃 `_backlog/bugs/` 零历史豁免。
   - [staged-change-pairing.mjs](../../scripts/lib/staged-change-pairing.mjs) 要求若 `guard.path` 未在本次暂存集内修改，该守卫文件内必须已包含声称本 `BUG-nnn` 的 `test()` 标题；[backlog-liveness.mjs](../../scripts/lib/backlog-liveness.mjs) 常驻核验已归档卡的 `guard.path` 在盘上存在；[f-repo.mjs](../../scripts/verify/gates/f-repo.mjs) 修正 `*conformance.(spec|test).mjs` 正则并提取同一 `test()` 标题内的全部 `BUG-\d{3}` 编号。
4. **行为/AST 守卫替代字面 grep + 五角色快照 B 层 keyless 内容对账**：
   - `BUG-095`：拆出零子进程纯函数 [web-banner.mjs](../../scripts/lib/web-banner.mjs)，在 [boot-timer.test.mjs](../../tests/checks/boot-timer.test.mjs) 实测成功、早退、超时三路径零残留 `Timeout` 句柄并用 AST 钉住 `bootWeb` 委托关系。
   - `BUG-136`：在 [port-reclaim-policy.mjs](../../scripts/lib/port-reclaim-policy.mjs) 与 [port-reclaim.mjs](../../scripts/lib/port-reclaim.mjs) 抽共享端口退避与进程组收割助手，覆盖 `probes/behavior/*.mjs` 全部六个探针。
   - `BUG-079` & `BUG-059/061`：[smoke-imports.test.mjs](../../tests/checks/smoke-imports.test.mjs) 与 [web-ui-nav-bilingual.test.mjs](../../tests/checks/web-ui-nav-bilingual.test.mjs) 升级为 TypeScript AST 扫描，并清理 `client-load` 残留的单语定位器。
   - `BUG-013 / BUG-080`：[profile-health.mjs](../../scripts/lib/profile-health.mjs) 增加开发 profile 安装副本与包源一致性预检；[replay-fixtures.spec.mjs](../../tests/run/replay-fixtures.spec.mjs) 在 keyless 层对五角色 `session.v4.jsonl` 的 `persona`、`skill-catalog`、`runtime-context`（`manual.md`）与 `vendor` SHA 做逐字全等对账。
5. **双账 AST 自动推导与全量收口**：
   - [asset-ledger.mjs](../../scripts/lib/asset-ledger.mjs) 删除手工 `OVERRIDES` 覆盖字典，补齐 `lane / class / cost / uniqueClaim / oracleType / sunset` 六属性并由 TypeScript AST 自动推导 `oracleType`。
   - [guard-ledger/ledger.json](../../tests/fixtures/guard-ledger/ledger.json) 扩充覆盖普查 D-1（24）+ D-2（17）+ 探索批 A–D（31）全集，每张卡与测试标题、留证注释及 `asset-ledger` 的 `oracleType` 双向零冲突对账。

## 判据形状

- **权威事实**：
  1. Markdown 遮罩 = `markdown-mask.ts` 纯状态机输出（测试期对标 `mdast-util-from-markdown` AST 偏移）；
  2. CI 工作流 = `.github/workflows/*.yml` 的 `yaml` Document AST + `ciWorkflowRunProblems` 规范命令白名单 + `bash -eo pipefail` 退出传播录制集；
  3. 修复证据 = Bug 卡 `## 修复关联` / `## 修复落地` 内唯一的 `json fix-evidence` 对象（`exit` 码 + 绑定 `BUG-nnn` 的 `guard.path`）；
  4. 资产账与守卫账 = 测试文件 AST import/调用图 + `test('...BUG-nnn...')` 声明生成的 `asset-ledger` 与 `guard-ledger`；
  5. 角色组装面 = `snapshots/replay/research-face/` 事件流与当前 `presets/`、`content/manual.md`、submodule SHA 的逐字投影。
- **读取方**：`review-readiness.ts`、`note-scan.mjs`、`fix-evidence.mjs`、`ci-workflow.mjs`、`staged-change-pairing.mjs`、`backlog-liveness.mjs`、`f-repo.mjs`、`asset-ledger.test.mjs`、`guard-ledger.test.mjs`、`replay-fixtures.spec.mjs`。
- **坏输入**：围栏/容器/反引号/注释遮罩失配、YAML 重复键或非法语法、`run:` 含取反/短路死分支/吞错、`fix-evidence` 编码重复键或借无关旧测试充当 `guard.path`、无外部解析器 import 却标 `external`、两账 `oracleType` 矛盾、快照与当前包内容失配 → 一律判红。
- **旧形态退场**：删除 `note-scan.mjs` 与 `review-readiness.ts` 旧遮罩副本、删除 `dev/record-markdown-oracle.mjs` 与静态 `markdown-oracle`、删除 `ci-workflow.mjs` 与 `ci-jobs.test.mjs` 手写 YAML 解析器、删除 `asset-ledger.mjs` 的 `OVERRIDES` 字典；仅盘上既有无 JSON 块的历史归档旧卡按显式集合冻结 grandfather。
- **反证**：各分片均在对应测试中常驻负例注入（`markdown-mask-conformance.spec.mjs` 五类边界矩阵、`ci-workflow-oracle.test.mjs` 短路/取反/行内 `on:`、`fix-evidence.test.mjs` Unicode 重复键与活跃卡拦截、`staged-change-pairing.test.mjs` 借无关测试拦截、`asset-ledger.test.mjs` 伪 `external` 拦截、`guard-ledger.test.mjs` 跨账失配拦截、`replay-fixtures.spec.mjs` 内容篡改拦截）。

## 输掉的方案

- **维持两套手写 Markdown 遮罩靠静态录制 JSON 对账**：静态快照只能钉住录制者想到的输入；初版 36 例全绿下仍漏掉行内反引号 `<!--`、块引用/列表容器退出等 5 类 CommonMark 邻接语法。合并为单一纯 TS 实现并在测试进程内直跑 `mdast` 既保住插件包零运行时依赖，又消除双实现漂移。
- **继续升级手写缩进 YAML / bash 解析器**：GitHub Actions YAML 与 bash 控制流是开放语法，靠正则猜 `isKnownFailure` 永远存在未枚举死角；改用真实 `yaml` AST 配合写入侧受控 `run:` 语法门把复杂度挡在门外。
- **在 `packages/deep-research-pack` 运行时 `dependencies` 引入 `mdast` / `yaml`**：违背插件包轻量零新增第三方依赖边界；解析库只驻根 workspace `devDependencies`（经锁文件固定版本由 `workspace-parsers.mjs` 解析），生产包只含零依赖的 `markdown-mask.ts`。
- **手工维护 `asset-ledger` 的 `OVERRIDES` 字典**：初版刚落地即与 `guard-ledger` 产生十余处 `oracleType` 矛盾，且漏标已用 TS AST 的守卫；改为 AST 自动推导后两账天然同源。
- **仅重跑真机重录而不补 keyless 快照 B 层内容对账**：每次改 `manual.md` 或 persona 若只能等重型浏览器/回放车道才能发现漂移，反馈环过慢；`replay-fixtures.spec.mjs` 秒级拦截内容失配，真机 `snapshot-replay.entry` 负责完整 A/B 装配回放。

## 实际跑过的验证

- **L0 门禁与类型构建**：`pnpm typecheck`、`pnpm build`、`node scripts/dist/export-dist.mjs`、`pnpm verify` 全绿（含 `guard-red-record`、`staged-change-pairing`、`backlog-liveness`、`archived-note-pointer`、`count-free`、`decisions-now`）。
- **Keyless 全量回归**：`pnpm test`（`test:spec` + `test:checks`）全绿；`node dev/record-ci-oracle.mjs --check` 与 `node dev/record-asset-ledger.mjs --check` 零漂移。
- **真进程与真入口装配验证**：
  - `node scripts/smoke/pack.e2e.mjs` 通过（验证编译后 tarball 内容与零多余运行时依赖）；
  - `source dev/env.sh && node scripts/smoke/gates.e2e.mjs` 通过（含新增 `conformance.spec.mjs` 缺留证、`release-vocab` 正反例与 `ci-oracle` 对照）；
  - 重建开发 profile 后实跑 `source dev/env.sh && node scripts/smoke/snapshot-replay.entry.mjs --layers a,b` 五角色（`lead` / `scout` / `analyst` / `critic` / `method-editor`）全部 PASS。
- **显式未覆盖 / 后续迁移面**：`asset-ledger` 中识别出的单模块内联样例测试（`self-referential`）保留为显式可见的组合迁移面，按 [_backlog/triggers.md](../../_backlog/triggers.md) 在对应失败类复发或周期复核时迁移；真模型档 `l4-lite` 未随本轮纯验证层改造触发。
- **post-tag 归档（2026-11-15）**：D55 返工卡 `_backlog/_archived/settled_issues/2026-11-14-verification-oracle-hardening.md` 与本 Note 同变更归档（post-tag archiving batch）；卡状态已结。
