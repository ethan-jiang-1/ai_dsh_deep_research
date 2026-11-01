# 插件生命周期合规：我们的包在 DSH 的打包/发布/安装/初始化/卸载各段还差什么

> 问题：按 DSH 插件生命周期的十段（打包/发布/安装/初始化/特殊初始化/配置/启动/更新/卸载/文档），我们的 `dsh-deep-research-pack` 与 `_dist/` 交付件还差什么？哪些是我们自造的、DSH 根本不读的东西？借助 DSH 原生通道（npm + 应用内 Plugins 页 + 插件市场索引）发布还需要补哪些件？
> 消费者：[插件生命周期合规卡](../../issues/2026-11-01-plugin-lifecycle-conformance.md)
> 产出的卡：[插件生命周期合规卡](../../issues/2026-11-01-plugin-lifecycle-conformance.md)

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-01-dsh-lifecycle-contract.md](2026-11-01-dsh-lifecycle-contract.md) | 十段合同的**仓内取证**：每条判据带 `vendor/dsh` 文件与位置，可在本仓逐条核对 | 2026-11-01 |
| [2026-11-01-experiments.md](2026-11-01-experiments.md) | 隔离 home 实跑：装 tarball、dump、真启动、卸载、更新、registry 404、市场索引校验、tarball 卫生 | 2026-11-01 |
| [2026-11-01-conformance-matrix.md](2026-11-01-conformance-matrix.md) | 十段逐段对账：✅合规 / ⚠️偏差 / ❌缺失，每条带证据等级与 DSH 合同出处 | 2026-11-01 |

## 判据出处（全部在本仓）

- **合同**：`vendor/dsh`（pin `687f282e86` / `0.2.1-rc.2`）。凡"DSH 怎么读/怎么判"的断言一律给出
  vendor 内的文件与位置，见 [合同摘录](2026-11-01-dsh-lifecycle-contract.md)。
- **本包事实**：`packages/deep-research-pack/package.json`、`cordis.patch.yml`、`README.md`、
  `_dist/安装手册.md`、`scripts/dist/export-dist.mjs`。
- **实测**：全局 `dsh` `0.2.1-rc.5` 与 vendor rc.2 两个运行时上的隔离 home 实验，命令与读数见
  [实验记录](2026-11-01-experiments.md)。
- 本页不引用、也不转述仓外材料；任何结论若在本仓找不到出处，视为未取证。

## 边界

- 只对 DSH 约定内的路径做对账；不设计自建 launcher、安装器、第二套更新或私有市场协议。
- 本课题不裁定产品方向（那属 [插件即产品 v2](../../issues/2026-11-01-plugin-as-product-v2.md)）；只回答
  "交付件与 DSH 生命周期合同的差距"。
- 浏览器侧显示元数据按源码判读（C）；本机无 Playwright/browser 实测，未标 T 的部分不当作已验证。
