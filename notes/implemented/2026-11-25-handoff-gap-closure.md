> 状态：implemented

# 接手缺口清零：单一事实源、行契约与可达诊断

2026-11-25 的 L2 接手诊断（13 维）把黄/红缺口逐条列出；本轮按诊断顺序把它们收口。目标不是
「加文档提醒」，而是让每类漂移都有一个机械判据；判据本身必须先见过红。

## 决定

- **版本带的事实源 = `package.json`，人类副本由门禁钉住**。中文包 README 已加入
  `pack-bundle-compat` 的副本表（exact 比对）——此前它停在 rc.3 并断言「rc.5 首屏冒烟失败」，
  无人对账。中文是产品默认语言（`cordis.patch.yml` 钉 `locale: zh`），副本表漏掉它等于主受众读到
  另一套兼容事实。
- **bundle 改到的 host 级行必须写进双语 README**。`tests/pack/contract/readme-bilingual.spec.mjs`
  从 `cordis.patch.yml` 取全部无 `name` 的 replace 行，要求中英 README 逐一出现；新增覆盖行而
  不写文档 = 红。
- **replace 行不得丢 base 键**。Loader 的 replace 是整块换 config、不深合并；本轮补的契约测试
  （`tests/pack/contract/package-contract.spec.mjs`）对账「本 pack 的 replace 行键 ⊇ base + web-app
  同 id 行键」。范围刻意只取 `--from-default-profile web` 实际组合的两个 bundle：sdk/headless 的
  同行键不属于本包支持的安装形态。
- **doctor 把「未验证」与「通过」分开**：profile 存在却解析不到运行中的 DSH 由 warn 升级为
  FAIL；新增 `--dump-config` 挂载行对账（只断言本包行在 effective config、无 `patch: entry … not
  found`，不冒充真挂载——Loader ACTIVE 仍归 L1/L2 真会话断言）；`--install-anchor` 进入 usage。
- **门禁自身的健壮性**：`pack-contract-sync` 对「git 索引有、工作树没有」的文件点名报红，不再让
  `readFileSync` 抛 ENOENT 把整条 verify 崩成栈；`dist-tarball` 增加 `exports` 的 `lib/` 入口逐件
  在制品内的断言（此前只查 patch 目标与模板）。
- **交接路径零猜**：CONTRIBUTING 的源码块补 `source tools/env.sh` 并说明 `hooks-active` 的预期红；
  换 pin 技能删除已不存在的 `dsh.compatibility.dshReleases`，新增「破坏面清单」（engines 覆盖、
  replace 行键 diff、client externals、被删 API）。
- **常驻文档去重换余量**：根 AGENTS 去掉重复的「机械不跳」与车道映射复述，预算处置序改为指向
  `checks/doc-budgets.json`（机读正本）——同一条规则只留一个家。
- **发布锚恢复**：版本升到 `0.3.7`（root + pack 同步；各人类副本由 `release-copies` 与
  `pack-bundle-compat` 点名），重导出 `_dist` 三件并打 annotated tag。旧的 `0.3.6` tag 留在原位：
  它已不是当前源，同名版本两份内容的机械风险由此拆开；`release-check --handoff/--receiver` 转绿。
- **快照新鲜度有主**：`snapshots/README.md` 指定 owner 与 stale 判据（`source` 身份不覆盖当前 pack
  → 重录或登记 `staleWhy` + 触发条件；`ui.expected` 重写必须带 `why`）。

## 输掉的方案

- **把 `engines.dsh` 收敛成只剩 `package.json` 一处**：用户是在 README 的安装前置里做版本决策的；
  删掉人类副本等于把事实藏进清单文件。保留多副本 + exact 门禁，代价是升版本时要改多处——但门禁
  会一次点名全部，零猜。
- **把 replace-键对账做成 L0 门禁**：verify 是无依赖层，需要自造 YAML 解析；测试车道已有
  `tests/pack/preset-helpers.mjs` 的 js-yaml 缝。先落契约测试，等真实漂移出现再门禁化（届时按
  `writing-a-gate` 补案例）。
- **doctor 起一个真会话验挂载**：违反 doctor「不启动、不写 profile」的合同；`--dump-config` 能抓
  行级缺失与 patch 错，抓不到 PENDING 就如实不声称。
- **只写文档提醒 zh 漂移**：上一次正是靠人记才漂的；不入户禁的提醒不是机制。
- **清理 `checks/test-path-redirects.json` 的冻结层重定向**：旧链接靠它解析（`md-links` 的
  登记簿），删了会让历史层大面积变红；它已有 stale/dangling 反向门禁，不需要动。
- **把 `0.3.6` 的 tag 移到 HEAD**：已打的 tag 是发布锚、不移动；HEAD 比它多出一批修复，正确收口
  是新 patch 版本（`0.3.7`），`0.3.6` 留在原位。版本号本身是发布语义，但「同名版本两份内容」是
  机械风险，拆开它不需要等发布——npm publish 仍未执行。

## 实际跑过的验证

- `node checks/verify/verify.mjs`：全绿（重建 `_dist` 后；`dist-freshness` 曾因源变更红，重导出转绿）。
- `pnpm test`：全绿（含新增的两条契约断言）。
- `node checks/smoke/gates.e2e.mjs --gate=pack-bundle-compat`：全绿，新增 `engines-zh-drift` 注入
  案例进入该门禁的自测。
- 红证（先看红再交付绿）：
  - 删 `web` 覆盖行的 `fetchProvider` → 新契约测试红并点名 `web: 未重述 fetchProvider`；
  - 把 README 的 `ui-trajectory` 改名 → `readme-bilingual` 红并点名该 id；
  - 假 dsh 少回 `dsh-deep-research-pack/startup` → `doctor.e2e` 红并点名缺行；
  - 删 `presets/critic.patch.yml`（未暂存）→ `pack-contract-sync` 点名「在 git 索引但不在工作树」，
    verify 不再崩栈（本轮修复前的形态是 ENOENT stack trace）。
- `node checks/smoke/doctor.e2e.mjs`：ALL PASS（含挂载行正/负两案例）。
- `node tools/release/export-dist.mjs`：全绿，`_dist` 三件由当前 pack 源重建（`build-manifest` 源指纹
  与工作树一致）。
- `install-shape.entry`（在 `/tmp` 的干净 clone 副本里跑，自带临时 home）：ALL PASS——profile 初始化
  → 装 tarball + 团队层 → dump 有本包行 → 真启动出 token URL、无 `did not activate`。
- `lifecycle.entry`：`remove` 回落绿（roster 回到 base + web-app、dependency 移除）；显示面探针红 =
  机器前置 `node-addon-require-builtin` 原生 build 缺席（既有记录 =
  [2026-11-24 Note](2026-11-24-gate-cli-parsing-and-session-local-state.md)），不是本批引入。
- `client-load.entry --seed`：exit 2 NOT-RUN（主机 load/cpu 1.93 > 阈值）——未跑 ≠ 通过；
  `product-boot.entry` 被同一个原生 build 前置挡住（`MODULE_NOT_FOUND … require_builtin.node`）。
- `npm pack --dry-run --ignore-scripts`（隔离 cache）：条目含 `lib/*.js`、`presets/*.patch.yml`、
  `scripts/doctor.mjs` 与中英 locale。
- 干净 clone 全链（`/tmp` 的本地 clone 副本，非暖树）：`pnpm install --frozen-lockfile`（35s）→
  `bash tools/build/vendor-build.sh`（2m40s，含 native host addon）→ `node tools/release/export-dist.mjs`
  全绿 → `node checks/verify/verify.mjs`：除 `hooks-active`（未 `source tools/env.sh`，预期红，
  CONTRIBUTING 已写明修法）外全绿。这证明「源码 clone → 制品 → 门禁」不依赖作者机器上的既有产物。
