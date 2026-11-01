---
status: 推敲中
opened: 2026-11-01
---

# 推敲：产品文档与分发——README、_dist 安装手册与仓库叙事对齐

> 立卡：2026-11-01 ｜ 状态：推敲中（用户 2026-11-01 授权静默自主执行） ｜ 类型：Task ｜ 结论倾向：现在做——文档目标已列，待父卡确认产品门面措辞、首屏文案与版本策略 ｜ 可关闭：否
>
> 落地位置：**S3（文档与分发）**；可先起草，最终依赖 A/D 的 flag/文案，见[落地计划](../research/plugin-as-product/2026-11-01-landing-plan.md)。
> 落地记录（2026-11-01）：README/pack README/00-index/61/62/65/project-map/design/terms/AGENTS/CONTRIBUTING + `product-manual.md` → `_dist/安装手册.md`；版本 0.2.0；`pnpm verify` 绿。

**问题与期望结果：** 产品运行时改完后，文档仍会在四处把用户带回旧路径：根 README 的首个动作是 `run-driver`，`_dist/安装手册.md` 是五步手动安装，`docs/00-index.md` 说"别直接 `dsh --profile`"，`docs/guides/62` 说"别把本包写成 profile"；首屏也没有告诉用户"这是什么、从哪开始、当前工作区"。期望：README、pack README、`_dist` 安装手册与全仓文档统一讲"一条产品命令 → 选工作区 → 首屏起步 → 产物在用户工作区"，开发通道单独成面，不再互相污染。

**当前情况：**

- 根 `README.md:11` 把 `node dev/run-driver.mjs up` 写成"跑一次研究"；`:13,18` 用两跳把用户导到 pack README/安装手册。
- `_dist/安装手册.md` 是 tracked 生成物（生成器 = `scripts/dist/export-dist.mjs:109-269` 的模板字面量），正文仍是"建 profile → 装包 → 验证 → scaffold → cd + dsh"五步；`dist-manual-version` 只钉表头版本。
- `docs/00-index.md:11-17` 的模型句与"别直接 `dsh --profile research`"把开发通道禁令读成产品禁令。
- `docs/guides/65:13` 的 M1 已是"用户自己的 home + 自选工作区"，但入口是手动三步；`:25-31` 把 `research-workspace/` 写成 M2 工作区，与 `project-map`/`guides/61` 的读法不一致。
- `docs/guides/62:26` 的 "Nothing is both" 与"插件自带启动 profile"表面冲突；实际是"包仍是 bundle，launcher 在运行期装配 profile"。
- `docs/guides/61`、`dev/README.md`、`docs/design/10`、`docs/design/50`、`docs/terms.md`、`docs/project-map.md` 仍以仓内 `research-workspace` 为唯一运行场。
- pack README 的 10 列数据卡由 `tests/pack/data-plane-invariants.test.mjs` 形状守卫；新增启动器设置行必须保持 10 列。
- 首屏文案目前不存在；子卡 D 会产出具体文案与 slot，本卡负责把它落到 README/pack README/`_dist`/首屏帮助。

**下一步：** 父卡拍板后，按本卡 §改动清单 逐页落；`_dist` 只在生成器改完后重导出，不手改手册正文。

## 范围

**做：**

1. **根 `README.md`**：产品门面优先——一句话是什么、一条安装/启动命令、工作区与产物归属、首屏会看到什么、数据边界；开发入口收成一行链接。预算 31 行；建议先下放/压缩；若仍不够，按 `doc-budgets` 升顶（建议 31→45）并在 `_raises` 写理由（产品门面 = 每轮用户第一入口）。
2. **pack `README.md`**：
   - Summary 改为"产品：自带启动 profile + 用户工作区 + 首屏起步"；保留角色/驾驶舱说明。
   - `§部署` 改为产品启动（一条命令、首启工作区、profile 装配、手动安装作为 advanced）。
   - `§Data` 10 列数据卡新增"启动器设置（上次工作区）"行；明确运行时零 home 写入 vs 启动器一个设置文件的例外。
   - `§Uninstall` 分列 profile/团队层/工作区/会话/凭据/浏览器；写明工作区保留。
   - 新增"首屏怎么开始"小节：问一个研究问题 → Lead 先问三问（HITL1）→ 静默自主区 → HITL2 → 终稿页签；凭据可选（账号登录也可）。
   - 随包文本 de-repo（具体清单见 §de-repo）。
3. **`_dist/安装手册.md`**：只改 `scripts/dist/export-dist.mjs` 模板，然后 `node scripts/dist/export-dist.mjs` 重导出；内容 = 前置、一条命令安装/启动、首启工作区、首屏起步、验证、数据归属、升级/回滚、卸载、离线/故障、高级手动安装。产品示例 profile = `deep-research`；`research` 只作开发/旧用户兼容说明。
4. **`docs/00-index.md` §先分流**：第一行 = 产品启动器；开发通道单独一行；修正"别直接 dsh"的作用域；开跑前置分成产品/开发两套；产品路径指向 pack README/`_dist`，开发路径指 guides/61。
5. **`docs/guides/65`**：运行形态加 M1-product（launcher）/ M1-manual（装进已有 profile）/ M2-dev / M3-handoff；P/H/W 表更新（产品 profile 默认 `deep-research`，dev 镜像 `research`）；安装/升级/卸载分产品与开发两路；证据矩阵加 product-smoke/product-boot-smoke。
6. **`docs/guides/62`**：裁定 "Nothing is both"——包仍是 bundle，launcher 是运行期装配器；交付拓扑表加 launcher 一行；作者面"改 profile 镜像"仍是开发通道。
7. **`docs/guides/61`**：页首声明只服务开发通道；产品 run 指向 pack README；移除"唯一启动"的暗示；`DSH_RUN_WORKSPACE` 生效说明。
8. **`docs/project-map.md` / `docs/design/10` / `docs/design/50` / `docs/terms.md`**：
   - 把 `research-workspace/` 从"唯一运行场"改为"dev 实例"。
   - 新增 product launcher / product profile / 产品设置 / workspace root 术语。
   - `terms.md` 加"产物 / artifacts = run bundle（`drt_<slug>/`）"别名，避免用户与文档用两套词。
   - 状态合同指针扩到产品面。
9. **`docs/decisions.md`**：D38 产品形态。至少覆盖：
   - 包仍是 bundle；launcher 是运行期装配器，不新增应用进程/应用 bin。
   - 产品 profile 默认 `deep-research`（dev 镜像 `research`）；home 共享默认、`--home` 可选。
   - 工作区解析顺序、项目子目录模式、`--in-place`、危险目录拒绝。
   - 产物在用户工作区；种子是部署副本；启动器设置文件例外。
   - optional peers 是全局 launcher 分发的必需条件。
   - 与 D1/D7/D17/D18/D21/D34 的边界；输掉的方案。
   **`notes/implemented/`**：决定理由、证据、未验证项。
10. **根 `AGENTS.md` / pack `AGENTS.md` / `CONTRIBUTING.md`**：布局/命令速查/入口链加产品入口；pack 子树指令加 launcher/workspace-boot；贡献者区分产品/开发。
11. **种子手册**：`research-workspace/AGENTS.md` 与 `packages/deep-research-pack/workspace/AGENTS.md` 的标题/首段去 `research-workspace` 仓名，写"研究工作区（可部署在任意目录）"；`dev/sync-pack-workspace.mjs` 同步；行数预算 200/200 不得净增。
12. **共享 home 说明**：README/pack README/guides/65 写明"产品默认用用户 `$DSH_HOME`；Web UI 会显示该 home 下其他 Workspace/Session；需要干净环境用 `--home`"。不承诺 profile 隔离。
13. **版本与重导出**：pack/root 版本 bump（至少 0.2.0），`release-check`，重跑 `export-dist`；`_dist` 手册表头与 tarball 一致。

**不做：**

- 不手改 `_dist/安装手册.md` 正文（生成物）。
- 不重写研究方法论/角色内容/驾驶舱设计（只在必要处改路径措辞）。
- 不在本卡改运行时行为；发现的行为缺口回子卡 A/C。
- 不把开发文档搬进包内；包内 README 继续用 GitHub 绝对链接指向仓内 docs。
- 不做产品皮肤/视觉重设计（首屏卡片归子卡 D；D18/ui-skin 边界不变）。

## de-repo 具体清单（随包文本）

| 文件 | 现文/风险 | 处置 |
|---|---|---|
| `packages/deep-research-pack/scripts/scaffold.mjs:186` | 种子清单缺席时提示 `node dev/sync-pack-workspace.mjs` | 改为"重装 pack / 联系维护者"；不出现 `dev/` |
| `packages/deep-research-pack/scripts/preflight.mjs:212` | 同上 | 同上 |
| `packages/deep-research-pack/workspace/AGENTS.md` | `drafts/` 标"仅开发仓在场"；`schema-scan`/`node-gate`/`run-accept` 提及 | 明确"开发仓才有；安装态按 `no machine audit (install-only)` 降级"；`drafts/` 改为可选/删除 |
| `packages/deep-research-pack/workspace/NODES.md` | "开发仓门禁，不随包" | 保留但集中成一句边界说明，不逐条引用不存在的脚本 |
| `packages/deep-research-pack/workspace/question-patterns.md` | "`dev/sync-pack-workspace.mjs` 同步" | 改为"由 pack 维护者同步"，不出现仓内路径 |
| `packages/deep-research-pack/README.md` | 用户步骤引用 `scripts/dist/export-dist.mjs`、`scripts/run-gates/*`、`scripts/run-ops/*` | 开发仓链接移到"维护者"节，用户节不出现；明确这些工具不随包 |
| pack 内 `workspace/seed.json` | 种子版本/哈希 | 改文本后重新生成，`pack-workspace-fresh` 绿 |

## 文档改动清单（按优先级）

| 优先 | 文档 | 关键改动 |
|---|---|---|
| P0 | 根 `README.md` | 产品门面 + 一条命令 + 首屏说明；开发入口下放 |
| P0 | pack `README.md` | 部署/数据卡/卸载/首屏起步/自包含文本 |
| P0 | `scripts/dist/export-dist.mjs` → `_dist/安装手册.md` | 产品安装手册模板 + 重导出 |
| P0 | `docs/00-index.md` | 分流重写；产品/开发两套前置 |
| P0 | `docs/guides/65` | M1-product；P/H/W；证据矩阵 |
| P1 | `docs/guides/62` | "Nothing is both" 裁定；launcher 装配器 |
| P1 | `docs/guides/61` | 开发通道作用域声明；`DSH_RUN_WORKSPACE` |
| P1 | `docs/project-map.md` | 产品路径/开发路径分开 |
| P1 | `docs/design/10`、`design/50` | 运行场泛化；状态合同指针 |
| P1 | `docs/terms.md`、`docs/decisions.md`、`notes/implemented/` | artifacts 别名、D38、决定 Note |
| P1 | 根 `AGENTS.md`、pack `AGENTS.md`、`CONTRIBUTING.md` | 入口/布局/贡献者分流 |
| P2 | `research-workspace/AGENTS.md` + pack 种子 | 标题/首段去仓名；同步 |
| P2 | `guides/60`、`guides/63`、`guides/64` | 新 smoke 命令；数据边界；发布重导出 |
| P2 | `.agents/skills/running-a-research-run` | 产品 run 与开发 run 分流 |

## 验收标准

1. 根 README 的"跑一次研究"首个动作是产品命令，不是 `run-driver`；开发入口一行可辨；首屏/工作区/产物三段可见。
2. pack README 的部署段能从零走到"起 Web + 选工作区 + 首屏起步"；数据卡 10 列含启动器设置行；卸载段列出每类数据的保留责任；共享 home 可见性写明。
3. `_dist/安装手册.md` 由生成器重导出，表头版本 = pack 版本、指名 tarball；正文含产品启动、工作区选择、首屏起步，不再以五步手动安装为主路径；产品示例 profile = `deep-research`。
4. `docs/00-index` 产品/开发两套前置不混；`guides/65` 有 M1-product 且与实现一致；`guides/62` 的 "Nothing is both" 有明确裁定；`guides/61` 页首声明作用域。
5. 全仓 grep `research-workspace` 时，剩余出现都是"dev 实例/示例路径"或明确的开发通道，不再有"唯一运行场"的读法。
6. 随包文本 de-repo 清单逐条完成；安装态 grep 不到 `dev/sync-pack-workspace`、`scripts/run-gates`、`scripts/run-ops` 作为"用户可执行"的指引。
7. `pnpm verify` 绿：`doc-budgets`、`md-links`、`md-anchors`、`entry-chain`、`backlog-liveness`、`dist-manual-version`、`release-version`。
8. 预算处置有记录：扩容的 README/AGENTS 在 `scripts/doc-budgets.json` 的 `_raises` 写理由；未扩容的证明先下放/压缩。种子手册行数顶格 200/200，不得净增。
9. 包内文档不出现仓内相对链接；pack README 的仓内链接仍是 GitHub 绝对地址。
10. D38 覆盖父卡 §范围 9 的六类边界；Note 记录输掉的方案与未验证项。

## 依赖与风险

- 依赖子卡 A 的最终命令/flag/设置文件路径与子卡 D 的首屏文案；文档可先按推荐形态写，但交付前必须与实现逐字对齐。
- 风险：根 README/AGENTS 预算只剩 1 行；需先下放再决定是否升顶。种子手册行数顶格 200/200，改标题/首段不得净增行。
- `_dist` 手册是生成物；任何正文改动必须同 diff 改生成器，否则下次导出回退。
- 本卡不授予实施授权；父卡拍板后开工。
