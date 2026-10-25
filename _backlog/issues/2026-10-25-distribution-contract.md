---
status: 推敲中
opened: 2026-10-25
---

# 推敲：分发的可执行合同——兼容、依赖、安装/升级/卸载

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 结论倾向：现在做——兼容/团队层已落地；升级/离线/冷 home 待做 ｜ 可关闭：否

**问题与期望结果：** 分发现状是“声明很多、判据不齐”：安装手册、preflight、scaffold、release-smoke、`dsh.compatibility` 各说一部分，但没有一条合同同时回答“支持哪个 DSH / 依赖什么 / 怎么装 / 怎么升 / 怎么退 / 离线算什么 / 证据在哪”。期望把安装、升级、卸载与前置条件收成一套可执行、可机械验证的合同，并让宿主真正执行兼容性判断，而不是只靠本仓自查。

**当前情况：** pack 已有 npm / tarball 两种形态、安装手册、`preflight.mjs`、`scaffold.mjs`、L2 `release-smoke.mjs`、版本/tag 规则。当前缺口集中在五处：

- **兼容声明不是宿主真规则。** `packages/deep-research-pack/package.json` 声明 `dsh.compatibility.dshReleases`，但 DSH 公共 manifest 类型（`vendor/dsh/packages/util/package-manifest/src/types.ts`）没有这个字段；宿主实际只认 `engines.dsh`，没有它时检查 `@deepseek-ai/dsh*` 的 peer 范围（`vendor/dsh/packages/boot/app-boot/src/plugin-compatibility.ts`）。官方发布文档明确安装与 profile 启动会拒绝不满足范围的 bundle（`vendor/dsh/docs/user/develop/basic/publish.md` §Declare DSH compatibility）。当前 pack 没有 `engines.dsh`，peer 是 `^0.2.1-rc.2`，比“只声明 rc.2”宽；`preflight` 用 PATH 上 `dsh --version` 的字符串自查，可能是另一个 CLI。
- **团队层没有随安装路径钉版本。** `scripts/scaffold.mjs` 调 `dsh plugin add @deepseek-ai/dsh-experimental-agent-team-profile` 时不带版本；`dev/boot-run.sh` 从兼容矩阵派生精确版本。用户按手册安装时可能装到与 DSH pin 不匹配的最新层。
- **“自包含 tarball”说大了。** tarball 本身不需要 registry，但部署链还要 DSH 本体、团队层（registry）与 Playwright MCP（npx 首次拉取）；离线/隔离环境不成立。手册应区分“无需克隆仓库”和“零外部前置”。
- **升级/回滚缺失。** 手册只有安装和卸载；workspace 种子是“已存在不覆盖”的快照，没有版本标记，`preflight` 不检查种子版本。插件升级后旧工作区的手册/NODES 仍旧，行为可能漂移（详见 [工作区所有权与升级](2026-10-25-workspace-ownership-and-upgrade.md)）。
- **证据面不是干净机器。** `release-smoke` 要求 `DSH_HOME` 等于仓内 `runtime/harness-home`，CLI 走 vendor 源码；没有“独立 home + 外部 workspace + 只有 tarball/目录”的冷启动证据。`preflight` 不检查 Node `engines.node`；`dev/boot-run.sh` 含 macOS 专用 `sed -i ''`，OS 支持未声明。

**未决问题：** 兼容性以哪个字段为唯一权威；`dsh.compatibility` 保留、删除还是降级为人读元数据；团队层版本从哪里派生；Node/OS/离线支持到什么程度；升级/回滚的证据形态；L2 是否改为独立 home 的冷启动测试。

**下一步：** 已按 [运行形态合同](2026-10-25-run-form-contract.md) 的结论进入实施；兼容字段、团队层钉版、Node 检查与 L2 安装形状已有证据。继续补升级/回滚、离线矩阵与冷 home 的 L2（与 [独立环境冷启动与多实例](2026-10-25-standalone-cold-start.md) 共用）。

## 实施进度（2026-10-25）

- `packages/deep-research-pack/package.json` 增 `engines.dsh: 0.2.1-rc.2`；`dsh.compatibility.dshReleases` 保留为镜像；`tests/pack/presets.test.mjs` 与 `pack-bundle-compat` 门禁断言两者同源（gates-smoke 注入案例 `pack-bundle-compat-engines-drift`）。
- `scaffold.mjs` 从 `engines.dsh` 派生团队层版本，`plugin add` 不再装未钉版最新层；`preflight.mjs` 读 profile 的 `@deepseek-ai/dsh-app-boot` 运行时（不按 PATH 上另一个 CLI 误判），并检查 Node 与团队层版本。
- 证据：`pnpm verify` 全绿；`pnpm test` 全绿；`node scripts/smoke/gates-smoke.mjs` 全绿；`node scripts/smoke/release-smoke.mjs` ALL PASS（含安装副本 `engines.dsh` 断言、scaffold 钉版、preflight 安装验收）。
- 追加：安装手册导出时计算 tarball sha256，并补升级/回滚与离线矩阵；`cold-start-smoke` 用独立 home/profile/端口/state 从 tarball 安装到浏览器面 GREEN；pack 目录安装（`file:<目录>`）在 `pnpm build` 后实测可装、`--dump-config` 可见本包行（profile 记绝对路径，移动即断链）。
- 残余：Linux 未在同轮跑（macOS 实测；脚本已用 BSD/GNU 兼容 `sed -i.bak`，`lsof/pgrep` 缺失有告警）；npm publish 未执行；宿主拒绝不匹配 `engines.dsh` 的行为依据 = vendor 代码 + 安装形状，不由本仓测试替代；升级/回滚为手册步骤 + 工作区升级测试，未做真实版本 bump 的安装回滚演练。

## 范围与依赖

本卡拥有分发的**可执行合同**：兼容声明、依赖钉版、安装/升级/卸载、前置检查、离线矩阵、发布证据。它不拥有 preset/skill 内容，也不拥有工作区种子迁移（见 [工作区所有权与升级](2026-10-25-workspace-ownership-and-upgrade.md)）。

依赖：

- [运行形态合同](2026-10-25-run-form-contract.md) 决定 A/B/C 读法与“给不同人使用”的范围。
- [DSH 惯例 research](../research/2026-10-25-dsh-plugin-conventions.md) 提供官方 bundle/profile/兼容声明依据。
- D15（release-smoke 形状）、D16（团队层归 vendor）、D22（零外部账号依赖）是现行边界；本卡不改这些决定，除非另立 D 号。

## 已知事实

- 官方 bundle 以 `dsh.bundle.patch` + 构建好的 `lib/` 发布，不含 workspace/state；`dsh plugin add ./hello-plugin` 支持目录 checkout，但目录形态不会替你构建（`vendor/dsh/docs/user/develop/basic/publish.md` §Install into a profile / §Installing from GitHub）。
- 官方 bundle 使用 `dependencies` 锁步与 `peerDependencies`（如 `@deepseek-ai/cordis`），没有官方包使用 `dsh.compatibility`（vendor 树 package.json 扫描无该字段）。
- `preflight.mjs` 当前检查 DSH 版本、peer、团队层、工作区、构建产物、模型密钥；不检查 Node，也不检查种子版本。
- `release-smoke.mjs` 断言安装副本的 peers-only 形状与 `dsh.compatibility` 存在，但没有断言宿主会按该字段拒绝。
- `scripts/dist/export-dist.mjs` 生成 tarball 与安装手册；手册版本由 `dist-manual-version` 门禁钉住，但手册没有校验和、升级/回滚段、离线矩阵。

## 方案与取舍

| 路线 | 做法 | 收益 | 成本 / 风险 |
|---|---|---|---|
| **A 宿主字段 + 单源派生**（推荐） | 加 `engines.dsh`（精确范围或窄范围），与 `dsh.compatibility.dshReleases` 同源；团队层版本从同一矩阵派生；`dsh.compatibility` 降级为人读元数据或删除；preflight 查同一字段与 Node | 兼容性由宿主执行；安装、preflight、L2、boot-run 共用一份事实 | 需要改 package.json、scaffold、preflight、release-smoke 与文档；`engines.dsh` 范围要选精确还是窄区间 |
| **B peer-only** | 不写 `engines.dsh`，把 peer 收窄到 `0.2.1-rc.2`；preflight 查运行中的 DSH 而不是 PATH 字符串 | 不新增字段；宿主仍会检查 peers | peer 范围是安装语义，不是“支持的 DSH 版本”语义；未来版本要逐个改 peer；可读性差 |
| **C 维持现状 + 文档** | 继续用 `dsh.compatibility` 与 preflight 自查 | 改动最小 | 宿主不执行声明；用户可能装进不兼容环境；本次审计的核心缺口仍在 |

推荐 A：`engines.dsh` 是 DSH 文档与运行时都认的字段；把团队层、preflight、L2、boot-run 的版本判断都收敛到它，才能做到“一份事实一个 owner”。`dsh.compatibility` 若保留，只能作为人读镜像，并加门禁断言它与 `engines.dsh` 同值；否则删除，避免双源。

## 验收标准

翻「现在做」时，至少覆盖：

- `packages/deep-research-pack/package.json` 的 `engines.dsh` 在场，且与 `dsh.compatibility.dshReleases` 的当前位置一致；契约测试断言两者不漂移（若保留后者）。
- 宿主兼容性可被证据化：安装/启动一个不满足 `engines.dsh` 的测试 manifest 被拒绝；满足范围的安装通过。宿主行为由 vendor 负责，但本仓的声明形状与范围必须有测试。
- `scaffold.mjs` 安装的团队层版本从兼容矩阵派生，不再出现无版本 `plugin add`；契约测试或 L2 断言版本。
- `preflight.mjs` 检查 Node `engines.node`、DSH 运行版本、团队层版本；失败给补救命令；`--install-only` 的语义不变。
- L2 的 home 与 workspace 可在仓外：`release-smoke` 或新的冷启动 smoke 使用临时/外部 `DSH_HOME` 与 workspace，不依赖 `runtime/harness-home` 的既有状态。
- 升级/回滚有可执行步骤与一条证据：旧版本 profile 上安装新 tarball，工作区种子按 [工作区所有权与升级](2026-10-25-workspace-ownership-and-upgrade.md) 的规则处理；卸载后 profile 不留插件依赖。
- 离线矩阵写明：DSH 本体、团队层、MCP、npm registry 各自是否必需；tarball 手册带 sha256 或等价校验；`--install-only` 不宣称研究就绪。
- OS 支持写明（macOS/Linux/Windows 中哪些是承诺）；`sed -i ''` 等平台命令有替代或被门禁限制在承诺平台。

## 关闭条件

兼容字段、团队层钉版、Node/OS/离线声明、升级/回滚与冷启动证据全部有结论并落盘；相关门禁/L2 绿；文档与手册同步；结论去向记录。未定期间保持活跃，不用“手册里写了”代替机械证据。
