# 三场部署模拟：第二机、冷 store 离线、下一版迁移

> 状态：implemented

> 来源：用户 2026-10-26「第二机真人走查、冷 store 离线、真实下一版迁移」。模拟产物住 `runtime/field-sim*/`（gitignored，不随仓）；代码/合同修订随本 Note。

## 决定

- **第二机走查以安装手册为准，不要求先有模型 key。** 安装/启动可达即可用 `--install-only` 验安装形状；研究就绪另要求 key。手册补此说明，并把团队层说明改为按 profile 的 app-boot 解析。
- **冷 store 离线只承诺 pack tarball 可装，不承诺整条 scaffold 链零前置。** 团队层需预置或缓存，且 pnpm registry metadata/cache 必须保留；只预装 node_modules 不够。手册与 guides/65 写明 `ERR_PNPM_NO_OFFLINE_META` 边界。
- **下一版迁移必须防降级覆盖。** 工作区记录版本高于 pack 种子时，`--check` 报“记录比 pack 新”，`--upgrade` 拒绝；只有显式 `--force` 才降级。`scaffold-smoke` 增反证段。

## 输掉的方案

- **把无 key 时的 scaffold 红当安装失败**：它只是研究就绪检查；会让第二机用户误以为装坏了。改为文档引导 `--install-only`。
- **把“团队层 node_modules 已预装”当离线完成**：清空 pnpm metadata 后 `plugin add` 仍会 `ERR_PNPM_NO_OFFLINE_META`；这不是文件在不在的问题，是包管理器要重解析 direct dependency。
- **回滚时让旧版 `--upgrade` 自动覆盖新种子**：实测会丢 0.1.3 的 NODES 新内容；改为拒绝 + 显式 `--force`。
- **把同机隔离 home 称为“第二台物理机”**：不真实；Note 边界如实标注 macOS 同机模拟。

## 实际跑过的验证

### 1. 第二机真人走查

- 只拿 `_dist/dsh-deep-research-pack-0.1.2.tgz` + 安装手册，在独立 `DSH_HOME` 用全局 rc.3 按手册走：init → `plugin add` → `dump-config`（preset-lead 等 15 个标记）→ scaffold → web 启动横幅；全部可达。
- 无 key 时默认 `scaffold` 红在“模型密钥”；补 `--install-only` 后 exit 0（安装验收通过，不代表研究就绪）。
- web 启动出 `dsh web: http://127.0.0.1:3160/?token=…`，端口监听存在。

### 2. 冷 store 离线

- 空 `npm` cache / pnpm store、`offline=true`：**pack tarball 本身可离线安装**（无 dependencies、peers-only）。
- 没有预置团队层时，`scaffold` 在 `dsh plugin add team-profile` 处红，preflight 报团队层缺席。
- 即使团队层 node_modules 已预装，清空 pnpm metadata/cache 后 `dsh plugin add file:tarball` 仍以 `ERR_PNPM_NO_OFFLINE_META` 失败。
- 结论：当前“完全离线、空缓存、无预置团队层”不是绿色路径；可离线的是 pack tarball，不是整条 scaffold 链。

### 3. 真实下一版迁移

- 造 0.1.3 模拟包：version 0.1.3、`NODES.md` 新内容、新增模板、更新 `workspace/seed.json`。0.1.2 安装并铺工作区 → 用户改 `AGENTS.md`/方法库 → 装 0.1.3。
- `--check` 正确报：`AGENTS.md modified`、`NODES stale`、新模板 `missing`、版本落后；`--upgrade` 写入 2 个、保留 AGENTS + `.seed-new`、方法库原样、状态 0.1.3；复查 `--check` 绿（仅 modified）。
- **修复真实缺陷**：回滚到 0.1.2 后，旧版 `--upgrade` 把 0.1.3 的 `NODES.md` 当 stale 覆盖，丢失新种子。现在 `--check` 报“工作区记录比 pack 新——拒绝自动降级”退出 1；`--upgrade` 拒绝退出 1 并保留新种子；`--force` 才降级。
- 回归资产：[scaffold-smoke](../../scripts/smoke/scaffold-smoke.mjs) 增加“记录 99.9.9 > pack 9.9.9”的反证段；手跑红证显示修复前会覆盖，修复后保留。
- 新增 [upgrade-smoke](../../scripts/smoke/upgrade-smoke.mjs)：profile 安装当前版 → 模拟下一版覆盖 → 种子升级 → 回滚拒绝降级 → 卸载，PROFILE 与 W 双面一次跑绿。
- 新增 [profile-matrix-smoke](../../scripts/smoke/profile-matrix-smoke.mjs)：多 profile 独立安装/卸载、损坏 tarball 不半装、卸载重装后 workspace 数据保留。

### 4. 其他边界矩阵

- 路径含空格/中文：`scaffold --seed-only` / `--check` 均通过。
- 用户先在新种子路径放了文件：升级写 `.seed-new`，用户文件原样保留。
- 无状态文件：`--check` 报“无记录”而非“版本一致”；`--upgrade` 建基线。
- `--workspace` 指向文件：exit 2 并给“必须是目录”，不再抛栈。
- 同版本重装：`plugin add` + `--check` 幂等，无 sidecar/状态漂移。
- 只读 workspace：写模式 exit 2 并提示修权限；`--check` 仍可只读（不再抛栈）。
- 种子目标为 symlink / hardlink / FIFO：`--force` 只替换入口 inode，不写穿目标、不阻塞；`--upgrade` 写 sidecar；state 文件是 symlink 时 exit 2 拒绝。
- 种子目标被替换为目录：`--force` exit 2 并保留目录，不再抛 Node 栈。
- 包内种子源被篡改但 `seed.json` 未更新：`scaffold` 现在先校验哈希，exit 2 拒绝铺错内容。
- 损坏的状态 JSON：按无状态处理，`--upgrade` 不覆盖用户文件。

### 5. 分发矩阵补测

- 多 profile 并存/独立卸载：A 卸载不影响 B。
- 损坏 tarball：失败后 profile 无 `dependencies`/`bundles`/`node_modules` 半装，随后有效 tarball 可恢复安装。
- 用户 `cordis.patch.yml`：安装/卸载前后字节相同，`dump-config` 仍见用户 overlay。
- 卸载/重装：workspace 用户文件、`sessions/` 日志都保留。
- `scaffold` 写模式：活跃 pid 锁 exit 2、陈旧锁接管、state 原子写无 `.tmp` 残留。
- 包内种子源被篡改：`scaffold` 先校验 `seed.json` 哈希，exit 2 不铺错内容。
- 种子清单路径穿越：恶意 `../escaped.txt` 键曾可写出工作区；现在拒绝 `..`/绝对路径/反斜杠，源也必须留在 `workspace/`，并有回归。
- 目录 `file:` 安装：移动源目录后已装副本仍可 dump-config，但旧路径重装失败；必须 `plugin remove` 后从新路径 add。文档已从“移动即断链”改正为“旧路径不能重装/升级；link: 才断链”。
- 用户 `cordis.patch.yml`：安装/卸载前后字节相同，`dump-config` 仍见用户 overlay。
- 损坏 tarball：失败后 dependencies/bundles/node_modules 无半装，有效 tarball 可恢复。
- 并发 scaffold：活跃 pid 锁 exit 2、陈旧锁接管、state 原子写无 `.tmp` 残留。

## 边界

- “第二机”是同一台 macOS 上的隔离 `DSH_HOME` + 全局 rc.3，不是另一台物理机/另一 OS；Linux/Windows 仍未实测。
- “冷 store”是空 cache/store + pnpm offline flag，不是断网拔线；registry 仍可能被其他路径访问，但 `ERR_PNPM_NO_OFFLINE_META` 是真实离线失败形态。
- “下一版迁移”是模拟 0.1.3 包（复制 pack + 改 version/seed），不是 npm 已发布版本；真实发布还需 tag/npm 流程。
- 旧 bundle 的 `--allow-legacy` 与本次无关；本次不新增 D 号。
