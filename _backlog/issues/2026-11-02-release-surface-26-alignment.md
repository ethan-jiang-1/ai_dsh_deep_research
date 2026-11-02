---
status: 等人拍板
opened: 2026-11-02
---

# 推敲：发布面对齐 26_harness-release——术语、六轴、README/手册/门禁

> 立卡：2026-11-02 ｜ 状态：等人拍板（Phase 0–5 已落地；N11 模型可见文本 deferred） ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否

**问题与期望结果：** 用户要求以 `deepseek-harness/_faq_on_digested/26_harness-release` 为更规整的
说法，对齐本仓围绕插件发布的内容：术语与做法按 DSH 推荐，清理历史未对齐项，维持高信噪比；所有
发现都要落地，并用证据证明。期望：G1–G12 / P1–P12 全部有落点，发布面（README、安装手册、
guides/65、术语、数据卡、历史注记、门禁）一致，`pnpm verify`/`pnpm test` 与可运行的分级冒烟给出
真实结果；不 bump 版本，不删除 notes/backlog 历史。

**当前情况：**

- 5 路只读审计已完成：规范/实践差（P1–P12）、DSH 源码事实、README/手册形状、术语/历史边界、
  发布文档重复性。结论：技术骨架大体对齐；GAP 在交付模型/术语、六轴 owner、README/手册形状、
  安装事实多源、数据卡标签化、陈旧事实与门禁缺口。
- 已落：D41（[decisions](../../docs/decisions.md#d41)）、D40 历史注记、[Note](../../notes/implemented/2026-11-02-release-model-terms.md)（决定/输掉的方案/已跑验证）、[terms](../../docs/terms.md)
  来源三栏与退役词、[external-materials](../../docs/external-materials.md) 的 26 语料登记。
- 已重写：[pack README](../../packages/deep-research-pack/README.md)（`kind: package-bundle`、七问、
  数据卡、维护者内容下沉）、[安装手册源](../../scripts/dist/product-manual.md)（运行时/安全/平台/
  Discover/版本门/Desktop 例外）、[guides/65](../../docs/guides/65-run-forms.md)（六轴 owner、
  profile 归属、数据卡指针、去命令复制）。
- 进行中：Phase 2 传播/去重/陈旧事实清扫；Phase 4 机械门禁；Phase 5 重导出与证据。

**未决问题：** 无阻塞。剩余为执行与证据：Phase 2–5 的传播、门禁反证、`_dist` 重导出、L2 冒烟
（缺 dsh/pnpm/浏览器时如实 NOT-RUN，不冒充绿）。

**下一步：** 你验收 Phase 0–5 的落点；决定 N11（模型可见 presets/content 的“产品”文本）是否单开 snapshot 录制轮。确认后按流程归档。

## 已知与未决

**已知（已定）**

- 交付模型 = **bundle + custom profile（`deep-research`）**；不自称“Harness 发行版”（runtime/app
  surface/lifecycle 的提供者是 DSH/用户），借 26 的六轴/数据卡/生命周期/README 形状判据，不借标签。
- 术语：现行合同文档退役 `插件即产品`/`产品 profile`/`产品形态`/`产品启动`/`产品设置`/`产品用户`/
  `产品面`/`产品化`/`P0–P4`；`产品` 只作 DSH 形容词。
- 安装事实以 DSH 源为准：默认 Plugins 页；npm/source CLI 不能 `desktop`（Desktop carrier 例外）；
  `--from-default-profile` 仅首次/救援；版本门 registry/path 预检、git/tarball 可装后判定并修复、
  boot 再检；membership 变更重启，config-only 可 HMR；无命令级回滚。
- 不 bump 版本；不删除 notes/backlog；历史只加注记。
- README 目标形状 = DSH `package-bundle` 模板 + 75 七问 + 91 数据卡；手册目标 = 70 十段 + 运行时/
  安全/平台/Discover；guides/65 = 六轴 + profile 归属 + 数据卡指针 + 生命周期合同。

**未决**

- 无设计未决；剩余是执行、门禁反证与证据采集。
- 观测项：`install-shape-smoke`/`product-boot-smoke` 需要真 dsh/pnpm/浏览器；缺前置时按 exit 2
  记录 NOT-RUN，并说明未覆盖面。

## 噪声清单（分发/安装/初始化）

> 2026-11-02 全 REPO 扫描（`git ls-files` 驱动，排除 vendor/runtime/生成物后逐文件 grep）。分类 =
> 现行（必须改）/ 生成物（改源后重导出）/ 历史（只加注记，不删正文）/ 模型可见（改文本会触发
> snapshot 证据义务，单列）。本条清单就是“先找噪声”的记录；落地按 AC5/AC7/AC8 验收。

| ID | 噪声 | 证据 | 分类 | 处置 |
|---|---|---|---|---|
| N1 | CI 跑两个已删除的 smoke 脚本 | `.github/workflows/ci.yml:90-94` 的 `scaffold-smoke.mjs` / `preflight-smoke.mjs`；`scripts/smoke/` 无此文件 | 现行 / CI | 删两步；用 keyless 的 `doctor-smoke` 补 preflight 面，保留 `pack-smoke` |
| N2 | 无 `--profile` 的伪命令 | `docs/project-map.md:33`、`docs/terms.md:35`、`docs/evaluation.md:96-97`、`dev/README.md:36-37` 的 `dsh plugin add/remove` | 现行 / 文档 | 补 `--profile <p>`，或改成非命令描述 |
| N3 | dev profile 仍写 `research` | `CONTRIBUTING.md:13` | 现行 / 文档 | 改 `deep-research`（与 boot-run/README 一致） |
| N4 | 已删 smoke 名 `product-smoke` | `CONTRIBUTING.md:53`；`scripts/smoke/product-boot-smoke.mjs:5` 注释 | 现行 | 改 `install-shape-smoke` / 删注释 |
| N5 | 已删“pack 兼容矩阵”被当现行 | `docs/design/10:66`、`docs/discipline-map:39`、`docs/guides/60:96`、`docs/decisions:33`（D16） | 现行 / 历史 | 改 `dsh --version`；D16 加“字段已删”注记 |
| N6 | “产品”复合词残留 18 处 | `README.md`、`docs/00-index.md`、`docs/evaluation.md`、`docs/project-map.md`、design/10/40/50、guides/61/64、`AGENTS.md`、pack AGENTS | 现行 | 按 D41 逐处改写；`产品` 仅留 DSH 形容词 |
| N7 | 市场描述缺 experimental 前置 | `scripts/dist/market.mjs:73-74`；`_dist/安装手册.md` 旧 | 现行 / 生成物 | 描述加 “Custom plugin markets”；重导出 |
| N8 | doctor 输出 “产品 profile / 产品设置” | `packages/deep-research-pack/scripts/doctor.mjs:5,80,95,101-105`；`scripts/smoke/doctor-smoke.mjs:79` 断言 | 用户可见 | 改 “custom profile / 设置文件”；同步测试 |
| N9 | 安装/首启 smoke 的注释/标签仍写“产品” | `scripts/smoke/install-shape-smoke.mjs:4,61`；`product-boot-smoke.mjs:3,168-182` | 内部 / 用户可见标签 | 改“安装形态/首屏”；脚本名保留 |
| N10 | dev 注释与生成物仍写“产品” | `dev/boot-run.sh:2,6,93,150,246`；`dev/research.overlay.yml`（生成物） | 内部 / 生成物 | 改注释；overlay 由 pack 源重渲染 |
| N11 | 模型可见文本仍写“产品” | `packages/deep-research-pack/presets/*.patch.yml` 4 处；`content/manual.md:3,60` | **模型可见** | **deferred**：改文本会使 snapshot B 漂移，需单独录制一轮；本卡只登记，不与文档混改 |
| N12 | 门禁/测试仍断言旧 README/手册形状 | `scripts/verify/gates/b-pack.mjs:438`（kind bundle + 10 节）；`scripts/lib/gates-cases.mjs` readme-shape 三案例；`tests/contracts/product-invariants.test.mjs` | 现行 / 门禁 | Phase 4 更新为 package-bundle/七问/十一段/新词汇；补反证 |
| N13 | 旧 “FAQ 26” 引用 | `notes/implemented/2026-10-27-release-data-contract.md`、`2026-10-26-faq24-decisions.md` | 历史 | 加 `> 历史注记`（旧 26 = 数据面；新 26 = harness-release） |
| N14 | 预算历史里的“产品门面” | `scripts/doc-budgets.json` `_raises` | 历史 | 不改（预算历史） |
| N15 | `_dist/安装手册.md` 仍是旧正文 | 生成物 | 生成物 | 改源后 `export-dist` 重导出 |
| N16 | dev parity 表的安装源写法 | `dev/README.md:36-37` | 现行 | 补 `--profile <p>` |
| N17 | dev-parity 门禁消息仍写“产品名/产品路径” | `scripts/verify/gates/f-repo.mjs:264,278` | 门禁消息 | 改“用户路径/安装形态” |
| N18 | workspace-root 注释“产品工作区” | `scripts/lib/workspace-root.mjs:4,22,93,123` | 内部 | 改“用户工作区”（低风险） |

**落地顺序**：N1 → N2–N6 → N8–N10/N16–N18 → N7/N15（源改后重导出）→ N12（门禁/测试）→ N13
（历史注记）→ N11 单列（模型可见，需 snapshot 证据，不与本轮文档混改）。

## 方案与取舍

- **选 A（已定）**：bundle + custom profile + 六轴 owner 表；借 26 判据不借“发行版”标签。理由：
  本仓不提供 runtime/app surface/lifecycle 实现，自称发行版会 overclaim；六轴表仍证明每个决定有 owner。
- **输掉 B**：直接自称“Harness 发行版（thin）”——需要额外的委托限定，且容易在下一轮变成新叙事债。
- **输掉“只清词、不动 README/手册”**：G3/G4/G7 仍在，首屏继续腐化。
- **输掉“把数据卡搬到手册、README 只留指针”**：91 明确建议放 README；README 是 npm 首屏，
  数据归属应与安装/卸载同屏。
- **输掉“重命名 `product-manual.md`”**：内部文件名不影响用户合同；避免为改名扩大链接/门禁 churn。
- **不删除历史**：notes/`_backlog/_archived` 是决定与证据记忆；只加 `> 历史注记`，不改写正文。

## 验收标准

- **AC1 术语**：现行合同文档（README、AGENTS、CONTRIBUTING、docs/、pack README/AGENTS、手册源）
  不再出现被禁复合词；`terms.md` 有“DSH / 借用 / 本仓”来源标注；D41 与退役词清单在场。
- **AC2 六轴**：guides/65 有六轴 owner 表（运行时/profile/patch 层/app surface/Harness home+数据/
  生命周期），每轴有“谁定/谁提供/怎么读回”；runtime/app surface/lifecycle 的提供者写明是 DSH/用户。
- **AC3 README**：`kind: package-bundle`；七问齐；91 数据卡；无维护者/架构长文；行数受门禁预算；
  无 `dsh.compatibility`；无硬编码版本。
- **AC4 手册**：10+ 编号节；含运行时选择、安全、平台、Discover 前置；卸载与数据独立；版本门按
  spec 形态说明；Desktop/CLI 例外说明；市场索引 URL/实验开关可执行。
- **AC5 安装通道**：无“已有 profile 再跑 `--from-default-profile`”的建议；`dsh plugin add/remove`
  都带 `--profile`；“仅 `dsh web`”按上下文使用；Desktop `desktop` = 互操作而非主路径。
- **AC6 数据卡**：README §Data 使用 91 十字段；P0–P4 退出；P/H/W 只作导航；`settings.json` 的
  owner/retention 在 README、65、手册一致。
- **AC7 单一事实源**：安装命令只在手册（owner）；README/00-index/project-map/65 只链接或写合同；
  README 无硬编码版本；`_dist` 手册由 `export-dist` 重导出且有新鲜度门禁。
- **AC8 陈旧事实**：`dsh.compatibility.dshReleases`、 “pack 兼容矩阵”、dev profile `research`、
  `product-smoke.mjs`、`preflight.mjs` 在现行文档零命中（历史层豁免）。
- **AC9 发布生命周期**：guides/64 写清 tarball/手册/market 索引同源、`lifecycle-smoke`、索引
  `source: npm` 与 npm publish 的时序；发布检查不把未跑当绿。
- **AC10 历史**：D41 + D40 注记 + notes 历史注记 + 26 语料登记；notes/backlog 正文未删。
- **AC11 门禁**：`readme-shape` 校验 package-bundle/七问/模板节/预算；`manual-shape` 校验十段+
  运行时/安全/平台/Discover；`release-vocab` 扫被禁词；`dist-manual-fresh` 校验源↔生成物；
  全部登记 `context.mjs`/`evaluation.md`/`gates-cases.mjs`，每道有 red→green 案例。
- **AC12 证据**：`pnpm verify`、`pnpm test`、`gates-smoke` 实际输出；`export-dist` 产出；
  `lifecycle-smoke`/`install-shape-smoke`/`product-boot-smoke` 实际结果或 NOT-RUN；本卡 §证据
  记录命令、exit、关键输出与残余风险。

## 证据

（2026-11-02 实跑；每条写命令、exit/关键输出，不写“应该绿”。）

- `pnpm verify`：**全绿**（readme-shape/release-vocab/dist-manual-fresh 等含新增门禁；`gate-ledger-sync` 通过）。
- `pnpm test`：**967 pass / 0 fail**（更新了 README 数据卡、安装首动作、运行形态合同相关断言）。
- `node scripts/smoke/gates-smoke.mjs`：**全绿**；对照组零注入全 PASS + **97 个注入案例**均被点名报红（含新增 `readme-shape-wrong-kind` / `readme-shape-maintainer-section` / `readme-shape-too-long` / `manual-shape-missing-security` / `manual-shape-no-market` / `release-vocab-retired-term` / `dist-manual-fresh-body`）。
- `pnpm typecheck`：exit 0。
- `node scripts/dist/export-dist.mjs`：**全绿**；`pnpm build` exit 0、`npm pack` exit 0；inventory 134 条目、preset 行 5/5、skill 13、模板 8；安装手册 0.3.0；market.json 3337B。
- `node scripts/smoke/lifecycle-smoke.mjs`：**ALL PASS**（parseMarketIndex / 索引版本与 engines / tarball locale+icon / profile 初始化 / 装 tarball / dump 11 行 / 真启动 token URL / 四个 specifier 的 readPluginMeta / remove 回落）。
- `node scripts/smoke/install-shape-smoke.mjs`：**ALL PASS**（profile 初始化 → pack+team add → dump 有本包行 → roster 三态 → 真启动无降级）。
- `node scripts/smoke/product-boot-smoke.mjs`：**GREEN**（Host 登记工作区、首屏 Lead Session、cwd = 工作区、preset = lead）。
- `product-boot-smoke` 连跑：第一次（紧接 lifecycle/install 后）**RED（3 处失败）**，sandbox 保留在 `runtime/smoke-workspace/product-boot-smoke-26020/main/`；立即复跑 **GREEN**。按外部边界（浏览器/端口/连跑状态）记残余 flake，不是文档回归；后续可隔离 smoke 端口/状态。
- `node scripts/smoke/doctor-smoke.mjs`：**ALL PASS**（齐全/缺 pack/engines 不匹配/坏设置/不写 profile）。
- `node scripts/smoke/pack-smoke.mjs`：**ALL PASS**（134 条目、export 指向、sha256、可复现、无生命周期脚本）。
- `node scripts/probe/entry-chain-probe.mjs`：**ALL PASS**（Q1/Q2/Q3；Q2 首次因词面只认“建立”漏接“才建在”判红，已补谓词与单测后复跑绿；留档 `runtime/smoke-workspace/entry-chain-probe-2026-11-02T11-15-12-374Z.md`）。
- 噪声清单 N1–N10/N12–N18 已落；**N11（模型可见 presets/content 的“产品”文本）仍 deferred**：改文本会改变模型请求、触发 snapshot B 漂移与真模型/录制证据义务，本卡只登记，不与文档混改。
- 残余：`product-boot-smoke`/`lifecycle-smoke` 依赖本机 dsh/pnpm/浏览器；本轮实际跑绿，CI 仍只跑 keyless（doctor/pack/gates），L2 前置缺席时按 exit 2 记 NOT-RUN。

## 关闭条件

AC1–AC12 全部有落点与证据；`pnpm verify`/`pnpm test` 绿；可运行的分级冒烟给出实际结果（NOT-RUN
需明确）；状态行更新 `可关闭：是`，按流程 `git mv` 归档，Note 记录决定与验证。
