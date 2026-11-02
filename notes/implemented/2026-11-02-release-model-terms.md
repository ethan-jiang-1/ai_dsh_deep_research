# 交付模型与术语收口：bundle + custom profile，借 26 判据不借“发行版”标签

> 状态：implemented

> 来源：用户 2026-11-02 批准（“开工 setup goal 记得所有发现的都要落地”）；
> [issue](../../_backlog/issues/2026-11-02-release-surface-26-alignment.md)（AC1–AC12 与证据）；
> 26 语料 `deepseek-harness/_faq_on_digested/26_harness-release`（六轴/生命周期/README/数据卡）；
> DSH 源核验（`vendor/dsh/scripts/doc-standard.spec.ts`、`vendor/dsh/apps/desktop/README.md`、
> `vendor/dsh/packages/boot/plugin-manager/src/operations.ts`、`vendor/dsh/vendor/include/src/index.ts`）。
> 当前合同 = [D41](../../docs/decisions.md#d41)、[terms](../../docs/terms.md)、
> [guides/65](../../docs/guides/65-run-forms.md)、[pack README](../../packages/deep-research-pack/README.md)、
> [安装手册](../../_dist/安装手册.md)。

## 决定

- **交付模型 = bundle + custom profile（`deep-research`），不是“产品”，也不自称“Harness 发行版”。**
  包仍是 `dsh-deep-research-pack`（bundle）；运行环境仍是用户自建 custom profile；启动/首屏走 bundle
  内 startup/client 行；无 launcher/scaffold/自定义安装器。技术决定继承 D40，本决定只改说法与文档/门禁。
- **术语只用 DSH 对象**：plugin / bundle / profile / preset / patch row / app surface / Harness home /
  data card。现行合同文档退役 `插件即产品`、`产品 profile`、`产品形态`、`产品启动`、`产品设置`、
  `产品用户`、`产品面`、`产品化`、`P0–P4`；`产品` 只保留 DSH 形容词用法（product data / product
  stability / product 可接受性）。`六轴` 借用 26 语料，是检查表装置，不是 DSH API。
- **六轴各有 owner，不是六轴都由本包实现**：运行时由用户/DSH 提供，本包只声明 `engines.dsh`；
  profile 由用户自建，本包只给名字/步骤；patch 层由本包默认值 + 用户覆盖；app surface = Web，
  Desktop 仅互操作；Harness home/数据按数据卡逐行；生命周期由 DSH 提供入口、本包写合同。因此
  “完整”成立，“自称发行版”不成立——后者会让读者期待随包运行时/安装器。
- **文档形状**：pack README = DSH `package-bundle`（`kind: "package-bundle"`；七问 + 91 数据卡 +
  维护者内容下沉）；安装手册 = 70 十段骨架 + 运行时/安全/平台/Discover；guides/65 = 六轴 owner +
  profile 归属 + 数据卡指针 + 生命周期合同。
- **安装事实以 DSH 源为准**：默认 Plugins 页；npm/source CLI 不能 `desktop`（Desktop 自带 carrier
  例外）；`--from-default-profile` 仅首次/救援且破坏性；`engines.dsh` registry/path 预检、
  git/tarball 可装后判定并修复、boot 再检；membership 变更重启，config-only 可 HMR；无命令级回滚。
- **不 bump 版本**：0.3.0 未公开发布；`_dist` 重导出即可。**不删除历史**：notes/`_backlog/_archived`
  只加 `> 历史注记`，不改写正文。

## 输掉的方案

- **继续“插件即产品”**：会掩盖六轴，并把 profile 抬成产品边界——正是 26 明确拒绝的 framing。
- **直接自称“Harness 发行版”**：本仓 runtime/app surface/lifecycle 的提供者是 DSH/用户；自称发行版
  是第二次 overclaim，会期待随包运行时/安装器。
- **发布 profile 目录**：DSH 的 profile 是用户侧组合；发布目录会覆盖用户 patch/依赖。
- **保留 P0–P4 / P/H/W 当 owner 模型**：标签替代数据卡；同一份 `settings.json` 已在两处出现不同 owner。
- **保留多份安装说明**：一次 CLI 变更要改 8 处，且已经出现 `@0.3.0` 硬编码与破坏性建议。
- **重命名 `product-manual.md`**：内部文件名不影响用户合同；改为扩大链接/门禁 churn，收益不足。
- **删除 notes/backlog 历史**：会丢掉“输掉的方案”和 spike 证据；只加注记。

## 实际跑过的验证

- **5 路只读审计（2026-11-02）**：规范/实践差（P1–P12）、DSH 源码事实、README/手册形状、术语/历史
  边界、发布文档重复性。结论：技术骨架大体对齐；GAP 集中在交付模型/术语、六轴 owner、README/手册
  形状、安装事实多源、数据卡标签化、陈旧事实与门禁缺口。逐项落点 = issue AC1–AC12。
- **DSH 源码核验（2026-11-02）**：`kind: package-bundle` 为机械推导（`doc-standard.spec.ts:124-144`）；
  Desktop carrier 可 `--profile desktop`，npm/source CLI 被拒（`apps/desktop/README.md`、
  `apps/cli/src/args.ts`）；版本门 registry/path 预检、git/tarball 装后判定并修复
  （`plugin-manager/src/operations.ts:344-352`）；裸 `- id` 是 override target、新增必须 `insert`
  （`vendor/include/src/index.ts:79-113`）。10 项核验中 8 项 true、2 项 partly（Desktop carrier/
  版本门），已按 partly 的精确说法写入合同。
- **术语清扫计数**：现行合同文件（README、AGENTS、CONTRIBUTING、docs/、pack README/AGENTS）中被禁
  复合词从 40 处降到 18 处（截至本 Note 写入时）；`docs/terms.md` 已改为“DSH / 借用 / 本仓”三栏，
  退役词清单在页尾。
- **L0 复跑（2026-11-02）**：`pnpm verify` 全绿（含新增 `readme-shape`/`release-vocab`/
  `dist-manual-fresh` 与 `gate-ledger-sync`）；`pnpm test` 967 pass / 0 fail；`gates-smoke` 全绿
  （97 个注入案例均点名报红）；`pnpm typecheck` exit 0。
- **发布物重导出（T）**：`export-dist` 全绿（134 条目、preset 5/5、skill 13、模板 8、market 3337B）；
  `lifecycle-smoke` ALL PASS（索引 → tarball → dump 11 行 → 真启动 → readPluginMeta → remove）；
  `install-shape-smoke` ALL PASS；`product-boot-smoke` GREEN；`doctor-smoke`/`pack-smoke` ALL PASS。
  `product-boot-smoke` 连跑第一次 RED（3 处失败，sandbox = `runtime/smoke-workspace/product-boot-smoke-26020/main/`），立即复跑 GREEN——按浏览器/端口外部边界记残余 flake。
- **入口链（真模型，T）**：`entry-chain-probe` ALL PASS（Q1/Q2/Q3）。Q2 首跑因词面只认“建立”漏接
  “才建在”判红，补谓词与单测后复跑绿；留档 `runtime/smoke-workspace/entry-chain-probe-2026-11-02T11-15-12-374Z.md`。
- **未改/未宣称**：模型可见 presets/content 仍含“产品”文本（改它会改变模型请求、触发 snapshot B 漂移与
  录制证据义务）；本 Note 只登记为 deferred，不冒充已对齐。`_dist` 已重导出，版本仍 0.3.0（未 bump）。
