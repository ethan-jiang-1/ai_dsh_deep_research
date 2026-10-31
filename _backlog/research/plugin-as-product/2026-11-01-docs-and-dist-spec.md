---
topic: plugin-as-product
intent: 把 README / _dist 安装手册 / 全仓文档的产品化改写写成可执行的编辑规格与生成器改动
---

# 文档与分发实现规格：README、_dist 与全仓叙事

本文是[产品文档与分发](../../issues/2026-11-01-product-docs-and-dist.md)的技术支撑。原则：**当前合同只写现在**；`_dist/安装手册.md` 是生成物，只改 `scripts/dist/export-dist.mjs`；产品与开发两个作用域在每页首段可辨。

## 1. 根 `README.md`（预算 31 行）

建议结构（总行数 ≤45；若超出，先压缩并升顶）：

```markdown
# ai_dsh_deep_research

一句话：Deep Research 多角色研究团队——Lead/Scout/Analyst/Critic 产出证据可溯源报告。
产品 = 自带启动 profile + 用户工作区；运行内容在插件，产物在工作区。

## 用它
安装/启动（一条命令）：<npm/tarball 具体命令；指向 _dist/安装手册.md>
首启会问你工作区；之后 `--workspace` 可换；产物 = `<workspace>/drt_<slug>/`。

## 首屏会看到
Orca 品牌 + 当前工作区 + 起步卡（问一个问题；Lead 先问三问；右栏研究状态/终稿）。
凭据可选：账号登录也能开始；key 影响搜索/抓取回退。

## 改它
开发入口 = AGENTS.md 入口链；`node dev/run-driver.mjs up` 只是开发通道；
数据边界/运行形态 = docs/guides/65；命令正本 = docs/guides/60 §2。

## 研发宪章
（保留现有四条）
```

注意：

- 当前 `README.md` 30 行；产品门面 + 开发入口 + 宪章可能到 40–45。**建议升顶到 45**，在 `scripts/doc-budgets.json` 的 `_raises` 写：产品门面是唯一每轮用户第一入口，开发细节已下放 AGENTS/guides。
- 不复制命令表；指向 guides/60 §2。
- 不写"之前/现在"；只写当前。

## 2. pack `README.md`

### 2.1 结构

| 节 | 改动 |
|---|---|
| Summary | 产品一句话 + 角色/驾驶舱；不再以"装进用户 profile"开头 |
| §部署 | 产品启动：一条命令、首启工作区、profile 装配、手动安装（advanced）；产品 profile 默认 `deep-research` |
| §首屏怎么开始 | 新增：问一个问题 → HITL1 三问 → 计划卡 → 静默区 → HITL2 → 终稿；右栏页签 |
| §数据 | 10 列数据卡 + 启动器设置行；种子是部署副本；共享 home 可见性；`.gitignore` 用户责任 |
| §Uninstall | profile/团队层/工作区/会话/凭据/浏览器分列；工作区保留 |
| §Compatibility | 不变；optional peers 说明放 §打包 |
| §研究怎么跑 | 保留；产品流程不变 |
| §已知限制 | 加：saved-session 可能打开别的工作区（可见指示/切换）；项目子目录 sandbox；共享 home；团队层离线 |
| §发布 | 加：launcher/bin/files/optional peers/`_dist` 重导出 |

### 2.2 数据卡新增行

保持 10 列：

| 事实 | 承诺 | 权威 | 位置 | 作用域 | 寿命 / 删除 | 谁看得见 | 秘密 | 卸载后 | 可移植 |
|---|---|---|---|---|---|---|---|---|---|
| 启动器设置（上次工作区） | 产品设置 | 启动器 | `$DSH_HOME/profiles/<p>/deep-research.launcher.json` | profile | 删 profile 即删；无秘密；可重选 | 启动器/用户 | 否 | 保留（随 profile） | 随 profile |

- 同时改"插件代码对 `$DSH_HOME` 零写入"句：**运行时插件代码零写入；启动器只写这一份产品设置文件**。
- `.gitignore` 行：用户所有；产品不静默改；`--gitignore-append` 显式。

### 2.3 随包文本 de-repo 清单

| 文件/行 | 现文 | 改成 |
|---|---|---|
| `scripts/scaffold.mjs:186` | `node dev/sync-pack-workspace.mjs` | "重装 pack / 联系维护者" |
| `scripts/preflight.mjs:212` | 同上 | 同上 |
| `workspace/AGENTS.md` `drafts/` 行 | 仅开发仓在场 | 删/标"开发仓可选，安装态不需要" |
| `workspace/AGENTS.md` `schema-scan`/`node-gate`/`run-accept` | 开发仓门禁 | 集中一句"开发仓才有；安装态按 `no machine audit (install-only)` 降级" |
| `workspace/NODES.md` "开发仓门禁，不随包" | 逐条 | 收敛成一句边界，不引用不存在的脚本 |
| `workspace/question-patterns.md` `dev/sync-pack-workspace.mjs` | 仓内路径 | "由 pack 维护者同步" |
| pack README 用户节 | `scripts/dist`/`run-gates`/`run-ops` | 移到"维护者"节；用户节不出现 |
| `workspace/seed.json` | 哈希 | 改文本后由 `dev/sync-pack-workspace.mjs` 重生成；`pack-workspace-fresh` 绿 |

## 3. `_dist/安装手册.md`（生成物）

### 3.1 生成器改动

`scripts/dist/export-dist.mjs`：

- 模板正文替换为产品手册（下方结构）。
- `must` inventory 加 `package/scripts/launch.mjs`、`package/lib/workspace-boot.js`。
- 版本/日期/sha256/条目数注入不变。
- 生成后 `dist-manual-version` 仍需绿（表头版本 = pack 版本 + tarball 名）。

### 3.2 手册结构

```text
# dsh-deep-research-pack 产品手册
表头：版本 / 安装包 / 打包日期 / sha256 / 验证基线

## 一、前置
DSH（engines.dsh）/ Node / dsh 在 PATH / pnpm（首次装团队层）/ 网络或离线缓存

## 二、安装并启动（一条命令）
npm 全局或 tarball；`dsh-deep-research`
首启会问工作区；也可 `--workspace <dir>` / `DEEP_RESEARCH_WORKSPACE`

## 三、首屏
Orca / 当前工作区 / 起步卡三步 / 凭据提示 / 右栏研究状态与终稿

## 四、验证
`dsh-deep-research --check`
`dsh --profile deep-research --dump-config` 应见 preset-lead/... + research-workspace-boot + research-client + ...

## 五、数据归属
工作区（种子/方法库/drt_*/archive）保留；profile/团队层/设置；会话/凭据/浏览器；共享 home 可见性

## 六、升级 / 回滚
先停 profile；换 launcher 包；重启；`scaffold --check/--upgrade`；种子不随插件降级

## 七、卸载
停；`dsh plugin --profile deep-research remove dsh-deep-research-pack`；
团队层可选 remove；profile 可选删；工作区保留；设置随 profile

## 八、离线 / 故障
团队层 registry/缓存；pnpm 缺失；engines.dsh 不匹配；端口；凭据

## 九、高级：手动装进已有 profile
旧的 `--from-default-profile web` + `plugin add` + `scaffold` 路径；标注"不推荐，产品路径是 launcher"
```

- 产品示例一律 `deep-research`；`research` 只在"开发/兼容"句出现。
- 不写死本机路径；示例用 `<workspace>` / `~/...`。
- 不写"之前/现在"。

## 4. `docs/00-index.md` §先分流

建议表格（首行产品）：

| 用户说法 | 走哪 | 首个动作 |
|---|---|---|
| "用它/启动/跑研究/装到我的 DSH" | pack README + `_dist` 手册 | `dsh-deep-research --workspace <dir>`（或安装后直接 `dsh-deep-research`） |
| "改这个仓库/跑开发通道/改插件" | guides/60/61/62 | `source dev/env.sh`；`node dev/run-driver.mjs up` |
| "只验证挂载/安装" | guides/60 §2 | preset-smoke/release-smoke |
| ... | ... | ... |

- 把"别直接 `dsh --profile research`"改成"开发通道别绕 run-driver 的漂移门；产品用户走 launcher"。
- 开跑前置分产品/开发两套：产品 = 装 launcher、dsh、pnpm、工作区；开发 = 仓内 install/submodule/vendor 构建/runtime home/3083。
- 预算 102/120；可加 ~18 行；超限先下放。

## 5. `docs/guides/65`

- §1 形态表：
  - M1-product：launcher → 产品 profile（`deep-research`）+ 用户工作区；入口 `dsh-deep-research`。
  - M1-manual：`--from-default-profile web` + `plugin add` + `scaffold`；旧用户/高级。
  - M2-dev：仓内 `research` profile + `research-workspace` + run-driver。
  - M3-handoff：不变。
- §2 P/H/W：P 包；H `$DSH_HOME`（产品 profile + 设置；dev `runtime/harness-home`）；W 用户工作区（任意路径；dev 仓内实例）。
- §3 安装/升级/卸载：产品路径与手动路径分列；launcher 设置文件；团队层。
- §4 多实例：产品用 `--profile`/`--home`/`--workspace`；dev 用现有 `DSH_RUN_*`。
- §6 证据：加 `product-smoke`/`product-boot-smoke`；说明档位。
- §7 限制：加 saved-session、共享 home、项目子目录、optional peers。

## 6. `docs/guides/62`

在 "Nothing is both" 后加一段：

```text
产品形态不改变这条：包仍是 bundle。launcher 是运行期装配器——它调用 dsh 创建 profile，
不把 profile 写进包 manifest；profile 是启动时产物，不是第二种分发单位。
```

交付拓扑表加 launcher 一行（"启动器：装配 profile + 起 Web；不新增应用进程"）。

## 7. `docs/guides/61`

页首加作用域：

```text
本页只服务开发通道（仓内 research profile + research-workspace + run-driver）。
产品用户启动/工作区/首屏 = pack README 与 _dist 手册；不要用本页的 3083/仓内路径。
```

把 `DSH_RUN_WORKSPACE` 生效说明补上（boot-run 真正 `cd`）。

## 8. `docs/project-map.md` / design / terms

- `project-map`：首段区分"产品路径"与"开发路径"；任务矩阵加产品行（启动/换工作区/首屏）；研究运行数据 = "用户工作区（dev 实例 = `research-workspace/`）"。
- `design/10`：层图把 `research-workspace/` 改为"研究工作区（用户选择；dev 实例在仓内）"；run bundle 路径 = `<workspace>/drt_<slug>/`。
- `design/50`：状态合同指针加产品面；安装侧状态仍归 pack README §Data。
- `terms.md`：
  - 产品启动 profile / product profile：`deep-research`（dev 镜像 `research`）。
  - 产品启动器 / product launcher：装配 profile + 起 Web，不是应用 bin。
  - 产品设置 / launcher settings：`deep-research.launcher.json`。
  - 工作区（用户提供）/ workspace root：任意目录；session `header.cwd`。
  - 产物 / artifacts = run bundle（`drt_<slug>/`）别名。
  - 种子部署副本 vs 包内种子源。

## 9. `docs/decisions.md` D38 内容清单

D38 至少写：

1. 产品形态 = 包（bundle）+ launcher（运行期装配器）+ Host 工作区注册；运行时仍 `dsh`，不新增应用进程/bin。
2. 产品 profile 默认 `deep-research`；dev 镜像 `research`；home 共享默认、`--home` 可选。
3. 工作区解析顺序；项目子目录默认；`--in-place`；危险目录拒绝；已有 `.gitignore` 不静默改。
4. 产物在用户工作区；种子是部署副本；启动器设置文件例外。
5. optional peers 是全局 launcher 分发必需。
6. 与 D1/D7/D17/D18/D21/D34 的边界；D21 意图分流改产品行。
7. 输掉的方案：手写 profile、自有 app bin、`--workspace` 传给 dsh、私有 home 默认、只读手册注入。
8. 未验证项：真实 `-g` bin、saved-session 自动切换、项目子目录 sandbox、Windows/Desktop/npm 发布。

Note（`notes/implemented/`）记录：决定理由、spike 证据、未验证项、与 D 号互链。

## 10. 预算与门禁

- `scripts/doc-budgets.json`：
  - `README.md` 31→45（理由：产品门面 + 产品/开发双入口）。
  - `AGENTS.md` 140→145（理由：布局/命令/入口链加产品行）。
  - 其余不变；新增 `AGENTS.md` 必须登记。
- `handbook-budget`：种子手册字节 ≤ 22,528-1024；当前 ~18,466，有 ~3KB 余量；改标题/首段不得净增行（行数 200/200）。
- `md-links`/`md-anchors`：新增链接用相对路径且目标 tracked；pack README 继续 GitHub 绝对链接。
- `dist-manual-version`：重导出后表头版本 = pack 版本 + tarball 名。
- `release-version`：root/pack 版本镜像；版本 bump 至少 0.2.0。
- `backlog-liveness`：本课题题名页/材料/issue 卡结构。
- `entry-chain`：若根 AGENTS 入口链改动，同 diff 改 `f-repo.mjs` 的成员清单。

## 11. 验收（文档面）

1. 根 README 首个动作 = 产品命令；开发入口一行可辨；产品/开发作用域首段可辨。
2. pack README 数据卡 10 列 + 启动器设置行；共享 home/`.gitignore`/saved-session 写明；de-repo 清单逐条完成。
3. `_dist` 手册由生成器重导出；产品示例 `deep-research`；含首屏/工作区/数据/升级/卸载/离线/高级手动。
4. 00-index/61/62/65/project-map/design/terms 不再互相矛盾；"别直接 dsh" 作用域正确。
5. `pnpm verify` 绿；预算升顶有 `_raises` 理由；种子手册行数不净增、字节不超。
6. 全仓 grep `research-workspace` 只剩 dev 实例/示例/开发通道；安装态 grep 不到用户可执行的仓内脚本指引。
