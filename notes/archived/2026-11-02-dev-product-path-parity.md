# dev 通道与产品安装路径对齐：同机制 + 有界差异

> 状态：implemented
> 归档：2026-11-10

> 历史注记：“产品路径” = 用户安装路径；措辞由 [D41](../../docs/decisions.md#d41) 收口，技术决定仍现行。

> 来源：[dev/product path parity 卡](../../_backlog/_archived/settled_issues/2026-11-02-dev-product-path-parity.md)（用户 2026-11-02 定调：dev 只为调试而与产品不同，不能是"另一条载入路"）。
> 当前合同 = [dev/README §parity 表](../../dev/README.md)、[guides/65](../../docs/guides/65-run-forms.md)、[guides/62](../../docs/guides/62-plugin-authoring.md)。

## 决定

- **判据是"同机制 + 有界差异"，不是一个形容词**：用户安装会经过的机制点 dev 也真走，
  差异只允许落在调试必需项，且必须登记成一张可对账的表。**表外新增差异 = L0 门禁 `dev-parity` 红**。
- **同一身份**：dev 默认 profile 改 `deep-research`（= 产品名）。多实例隔离靠 `DSH_RUN_STATE_DIR`，
  **不靠改名**——改名会让 dev 与用户路径身份分叉，dev 绿就推不出用户路径通。
  `DSH_RUN_PROFILE` 仍可覆写（逃生阀），但默认值不再分叉。
- **profile 用户层零写入**：dev 的 MCP Playwright 行不再 append 进 `$PROFDIR/cordis.patch.yml`，
  改生成 `$STATE_DIR/dev-overlay.yml` 并经 launcher `--patch` 传入。理由：用户路径里
  `cordis.patch.yml` 只由用户/设置页写，脚本写它正是 DSH"不要手写 profile"合同的反面；
  dev 写它等于让 dev 走一条用户不会走的写入者路径。`MCP_PLAYWRIGHT=0` = 不生成、不传。
- **版本门对齐运行中 runtime**：团队层版本 = `dsh --version` 的 exact 值，不再从包清单派生。
  派生源改动的直接动因是 `dsh.compatibility.dshReleases` 在
  [插件生命周期合规](../implemented/2026-11-01-plugin-lifecycle-conformance.md) 里已删——`LAYER_VER` 那行会抛
  TypeError（boot-run 当时已坏）。但即使字段还在，从包清单派生也是错的方向：vendor 源码只是机制
  基线，用户拿到的是 npm 全局 runtime，从清单派发会让 dev 测到用户不会有的组合。
  读不到版本 → fail-loud 退出，不猜。
- **一次性迁移**：旧 profile 的 patch 若仍带 MCP marker，boot 时摘除并补回 `[]` 占位，
  让 profile 回到用户态——不要求用户手动 `rm -rf`。

## 输掉的方案

- **靠改 profile 名做多实例隔离**：省一个环境变量，代价是两个身份并存——"dev 绿 ⇒ 用户绿"的
  推理链断掉，而这正是本轮要修的东西。
- **保留 dev 写 profile patch，只在文档里说明"这是 dev-only"**：说明不能让写入者变回用户；
  差异必须落进 parity 表并有门禁守，否则下一轮就腐。
- **从 pack 清单派生团队层版本（修好字段读取而不是换源）**：字段已删；即使恢复，包清单描述的是
  我们发布的兼容基线，不是用户机器上跑的那个 runtime。
- **给 dev 造第二套 launcher**：dev 仍是 `dsh --profile deep-research`，run-driver 只做驱动
  （漂移门 + probe + 呈交），不引入新的载入实现。
- **把 runtime/workspace/凭据/probe 的差异也消掉**：它们是调试必需（源码 runtime、隔离 home、
  可反复重建、观察面），消掉等于牺牲调试力。登记为"允许差异"。

## 实际跑过的验证

- **`pnpm verify`**：新增 `dev-parity` 门禁全绿；其余 L0 门禁无回归（`md-links` 曾因本 Note 缺席红，
  写入后转绿）。
- **门禁反证**：`gates-smoke` 常驻案例 `dev-parity-driver-profile`——把 run-driver 默认 profile
  改回 `research` 即点名红，还原转绿。门禁同时机械判：`LAYER_VER` 从 `dsh --version` 派生、
  不再出现 `compatibility.dshReleases`、`DEV_OVERLAY`/`PATCH_ARGS` 在场、boot-run 不再
  `cat >> $PROFDIR/cordis.patch.yml`、parity 表在场且 ≥8 个机制点并含"允许差异"列。
- **文档同步**：guides/61 · 62 · 65、terms、00-index 里 "research profile" 的指称全部改
  `deep-research`；00-index 的冒烟命令改指已存在的 `product-boot-smoke.mjs`。
- **boot-run 端到端（T）**：在 `runtime/harness-home` 上重建出 `profiles/deep-research`——
  deps = `file:…/run-pack/dsh-deep-research-pack-0.3.0.tgz`，bundles = base + web-app + pack + team，
  team 版本 `0.2.1-rc.2` 与 `dsh --version` 一致；`cordis.patch.yml` 保持 `[]`；web 在 3191 起，
  token URL 正常。
- **dev-only 行走覆盖层（T）**：`dev-overlay.yml` 生成，`--dump-config --patch` 能看到
  `mcp-playwright` 行；profile 用户层没有任何写入。
- **关掉 MCP（T）**：`MCP_PLAYWRIGHT=0` 启动后覆盖层文件不存在、profile patch 仍为 `[]`、
  web 在 3192 正常起。
- **run-driver 真启动（T）**：`up --no-probe --port 3193` 起通道并打印 token URL；boot 日志含
  `profile=deep-research`；`--no-probe` 如实返回 NOT-RUN（未跑 ≠ 通过）。实验后进程与端口均清空。

## 残余风险

- **parity 表是手写清单**：门禁只判"表在场、≥8 行、含允许差异列、指向门禁"，判不了
  "表里每一行都与代码一致"。机制点增删时靠同 diff 人工对账；表外新增差异会被 `dev-parity`
  的逐条断言咬住（覆盖面 = 断言枚举的那几个机制点），未枚举的新机制点仍是人工责任。
- **`dev/research.overlay.yml` 不在同形列**：它是源码域冒烟 harness（`--profile web --patch`），
  不经过 bundle/tarball，判据只对 L1 挂载面有效——已在 parity 表注明，但读者容易混。
- **迁移只摘 marker 块**：若旧 patch 里除 MCP 块外还有别的 dev 写入内容，本迁移不认、也不会报错。
