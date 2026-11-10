---
status: 已结
opened: 2026-11-02
---

# 推敲：dev 通道与产品安装路径对齐——同机制、有界差异

> 立卡：2026-11-02 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是
> 去向：implemented — [dev/product parity Note](../../../notes/archived/2026-11-02-dev-product-path-parity.md)；业务验收：用户（2026-11-02 指示按流程推进落地）。

**意图（先说清为什么做）：**

> 开发环境里，DSH 载入插件的流程要**尽量接近真实用户装/启插件的感受**；我们这边可以调试、可以看日志、
> 可以反复重建，但不该因此走一条只有开发者才走的载入路径。（用户 2026-11-02 原话的意思）

拆成三条可执行的意图：

1. **验证可迁移**：dev 里验过的机制，就是用户装上去会经过的机制。dev 绿必须能推出"用户路径这个断点
   是通的"，而不是"另一条路是通的"。
2. **差异有界且显性**：本地调试必然要换 runtime、换工作区、换凭据、要 probe——这些差异**允许存在**，
   但必须登记成一张表；不在表里的新差异 = 门禁红。**"接近"不是形容词，是一张能对账的表。**
3. **不为接近牺牲调试力**：不砍源码 runtime、日志、probe、快速重建；也不拿 dev 特例去掩盖用户路径
   的问题（例如用 overlay 冒充安装、用手写 profile 冒充 roster）。

**问题：** dev 通道已经走 tarball + `dsh plugin add`（机制同形），但**profile 身份、团队层版本、profile
用户层写入者、重建语义**与产品路径不同，且没有登记——"dev 绿"不能直接推出"用户装上也绿"。此外
`LAYER_VER` 仍在读已删除的 `dsh.compatibility.dshReleases`，boot-run 当前是坏的。

**期望结果：** 用户路径上的每个机制点 dev 都真走一遍；差异只落在可调试性上并写进 parity 表；表外
差异 = 门禁红。**不追求一模一样**——追求"同机制 + 有界差异"。

**当前情况：**

- 已经同形（T）：run 通道启动 = `--from-default-profile web` → `npm pack` → `dsh plugin add file:<tgz>`
  → 团队层 → roster 四项。见 [boot-run.sh](../../../dev/boot-run.sh)。
- 五处仍不同：
  1. **profile 身份**：dev `research` vs 产品 `deep-research`（`dev/boot-run.sh`、`dev/run-driver.mjs`）。
  2. **团队层版本**：dev 从 `dsh.compatibility.dshReleases` 派生（**该字段已删**，派生已失效）vs 产品按
     `dsh --version` 取 exact 版本。
  3. **profile 用户层**：dev 把 MCP Playwright 行直接 append 进 profile 的 `cordis.patch.yml`；产品
     路径不写 profile 用户层（这正是 DSH 合同里"不要手写 profile"的反面）。
  4. **重建语义**：dev 缺件即 `rm -rf` 整个 profile；产品是 `plugin add/remove` 增量 + 重启。
  5. **runtime**：dev 走 vendor 源码，产品走 npm 全局——这条属必然差异，只需登记，不需要消除。
- 另有一处**当前已坏**：`LAYER_VER` 仍读 `dsh.compatibility.dshReleases[0]`，而该字段在
  [插件生命周期合规](2026-11-01-plugin-lifecycle-conformance.md) 里已删——boot-run 现在会在
  这一行抛 TypeError。本卡顺手修复。

**未决问题：** 无（两项已由用户口头定：dev profile 就叫 `deep-research`；团队层跟运行中 dsh 同版本）。

**下一步：** P0 换身份 → P1 收手写 patch → P2 版本门 → P3 差异表 + 门禁；每片按下方验收标准退出。

## 方案与取舍

### P0 · 同一身份

- `dev/boot-run.sh` 与 `dev/run-driver.mjs` 的默认 profile 改 `deep-research`；`DSH_RUN_PROFILE`
  仍可覆写（多实例用 `DSH_RUN_STATE_DIR` 隔离，不靠改名字）。
- 文档同步：guides/61、guides/62、guides/65、terms、00-index 里 "research profile" 的指称。

### P1 · profile 用户层零写入

- MCP Playwright 行不再写 `$PROFDIR/cordis.patch.yml`；改为生成 dev 覆盖层
  `$STATE_DIR/dev-overlay.yml`，boot 时用 launcher 的 `--patch <file>` 传入。
- `MCP_PLAYWRIGHT=0` = 不生成、不传。
- **迁移**：已有 profile 的 patch 里若带旧 marker，启动时摘除（一次性），保证 profile 回到用户态。

### P2 · 版本门对齐

- 团队层版本 = 运行中 `dsh --version` 的 exact 值（与产品手册同一句）；不再从包清单派生。
- `profile_ok` 的 deps 版本比对同步改成对运行版本。

### P3 · 差异显性化 + 门禁

- `dev/README.md` 增一张 **parity 表**：机制点 / dev 是否同形 / 允许差异 / 证据。
- 新 L0 门禁 `dev-parity`：默认 profile 名 = 产品名；boot-run 不手写 profile 用户层（marker 只出现在
  overlay 生成逻辑里）；团队层版本从 `dsh --version` 派生；dev/README 的差异表在场且非空。
- `docs/evaluation.md` 登记 + `gates-smoke` 注入案例。

**取舍**：不追求"一模一样"——runtime、workspace、凭据、日志、probe 是调试必需，登记为允许差异；
**同机制的部分（身份、安装源、roster 写入者、版本门）不接受"dev 特例"**。不引入第二套 launcher：
dev 仍是 `dsh --profile deep-research`，run-driver 只是驱动（漂移门 + probe + 呈交）。

## 验收标准

1. `bash dev/boot-run.sh` 在干净 `runtime/harness-home` 上建出 `profiles/deep-research/`，deps 为
   `file:…/run-pack/dsh-deep-research-pack-<ver>.tgz`，bundles = base + web-app + pack + 团队层，
   且团队层版本 = `dsh --version`。
2. bootstrap 后 `profiles/deep-research/cordis.patch.yml` 保持用户态（无 MCP marker）；MCP 行只出现在
   dev 覆盖层里，且 `--patch` 传入后真启动仍带 playwright 通道。
3. `MCP_PLAYWRIGHT=0` 重跑：不生成覆盖层、启动参数里没有 `--patch`。
4. `node dev/run-driver.mjs up` 默认 profile = `deep-research`；`probe`/`url` 仍可用。
5. 新门禁 `dev-parity` 全绿，且注入"profile 名改回 research"或"boot-run 手写 profile patch"时点名红。
6. `pnpm verify` / `pnpm test` 绿；`dev/README` 的 parity 表与代码一致（机制点可逐条指回文件）。

## 关闭条件

验收标准 1–6 有证据在场；parity 差异表落盘；结论去向 = implemented（Note 同 diff）。


## 验证进展（2026-11-02）

| 验收 | 证据 |
|---|---|
| AC1 同一身份 + 安装源 + 版本门 | `bash dev/boot-run.sh` 在 `runtime/harness-home` 重建出 `profiles/deep-research`：deps = `file:…/run-pack/dsh-deep-research-pack-0.3.0.tgz`、bundles 四项、团队层 `0.2.1-rc.2` = `dsh --version`（T） |
| AC2 profile 用户层零写入 + MCP 走覆盖层 | `cordis.patch.yml` 保持 `[]`；`dev-overlay.yml` 生成；`--dump-config --patch` 能看到 `mcp-playwright`；web 在 3191 起（T） |
| AC3 MCP 关闭形态 | `MCP_PLAYWRIGHT=0`：覆盖层文件不存在、profile patch 仍 `[]`、web 在 3192 起（T） |
| AC4 driver 默认 profile | `node dev/run-driver.mjs up --no-probe --port 3193` 起通道打印 token URL，boot 日志 `profile=deep-research`；`--no-probe` 如实 NOT-RUN（T） |
| AC5 门禁面 | `dev-parity` 绿；`gates-smoke` 案例 `dev-parity-driver-profile` 注入即点名红、还原绿（T） |
| AC6 全量 | `pnpm verify` / `pnpm test` / `pnpm typecheck` 绿（见下一轮收尾读数）；parity 表在 [dev/README](../../../dev/README.md) |

附带修复：`LAYER_VER` 不再读已删除的 `dsh.compatibility.dshReleases`（该行此前会让 boot-run 直接抛错）。

**2026-11-02 收尾复跑（交付前自审）**：删掉漂移的 dev profile 后从零重建，逐条复跑 AC1–AC3（`profiles/deep-research` = `file:…0.3.0.tgz` + 四项 bundles + 团队层 `0.2.1-rc.2` = `dsh --version`；patch 保持 `[]`、overlay 生成、`--dump-config --patch` 有 `mcp-playwright`、web 在 3195 起；`MCP_PLAYWRIGHT=0` 时 overlay 不存在、patch 仍 `[]`、web 在 3196 起）。`pnpm verify`（含 `dev-parity`）、`pnpm test` 965/0、`pnpm typecheck`、`gates-smoke --case=dev-parity-driver-profile` 全绿。首跑时 `dev-parity` 的漂移门按设计拦下 pack README 与镜像不一致（本卡改动面导致），重建后转绿——这正是该门的预期行为。

## 去向

`implemented` → [dev/product parity Note](../../../notes/archived/2026-11-02-dev-product-path-parity.md)。

业务验收：用户 2026-11-02 指示按流程推进落地；dev 手感的后续反馈按新卡处理。
