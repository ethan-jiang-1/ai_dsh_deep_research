---
topic: plugin-as-product
intent: 把 launcher / 产品 profile / Host 工作区注册 / 打包写成可实现的工程规格，并记录真机 spike 证据
---

# 运行时实现规格：launcher、Host 注册与打包

本文是[产品启动运行时](../../issues/2026-11-01-product-launch-runtime.md)的技术支撑；不是新合同，父卡拍板后以实现与 D38 为准。所有路径以 pack 根为基准。

## 1. 文件与构建落点

```text
packages/deep-research-pack/
  scripts/
    launch.mjs                     # bin: dsh-deep-research
    lib/
      launcher/
        args.mjs                   # 产品 flag 解析 + 透传剩余
        workspace.mjs              # 解析/模式/守卫/模式提示
        profile.mjs                # profile 装配 + 读回 + 半装修复
        settings.mjs               # 产品设置文件读写
        team-layer.mjs             # 从 scaffold 抽出的团队层 ensure（复用）
        ui.mjs                     # 进度/错误/帮助文本
      dsh-home.mjs                 # 已有：DSH_HOME/path 解析
      install-anchor.mjs           # 已有：运行中的 dsh 定位
      version-range.mjs            # 已有：engines.dsh 比较
      workspace-guard.mjs          # 已有：危险目录判据
  src/
    workspace-boot/
      index.ts                     # Host 插件：workspaceRegistry.create
  cordis.patch.yml                 # + insert row research-workspace-boot
  package.json                     # + bin / exports / optional peers
  tsdown.config.ts                 # + workspace-boot 入口
```

`scaffold.mjs` 里团队层 ensure 逻辑（`scaffold.mjs:569-609`）抽到 `scripts/lib/team-layer.mjs`，launcher 与 scaffold 共用；避免两套版本派生。

## 2. 启动器 CLI

```text
dsh-deep-research [产品 flag] [web flag...]

产品 flag（启动器消费，不转发）:
  --workspace <dir>       工作区/项目锚（相对路径按 cwd 解析）
  --root <dir>            研究根（默认 <workspace> 或 <workspace>/research）
  --profile <name>        产品 profile（默认 deep-research）
  --home <dir>            本次启动使用该 DSH_HOME（设置子进程；默认继承）
  --check                 只读检查，不安装、不起 Web
  --no-seed               跳过种子铺开（工作区已有契约时）
  --in-place              用 <workspace> 本身作为研究根（不建子目录）
  --gitignore-append      用户确认后向已有 .gitignore 追加研究数据拒绝规则
  -h, --help              启动器帮助
  -V, --version           启动器版本
其余 token 原样转发给 dsh（--port / --no-open / --host / --public-url / ...）
```

解析实现要点：

- 用 `node:util.parseArgs` 或手写线性扫描；遇到第一个不属于产品 flag 的 token 后，剩余全部进 `forwarded`。不要用 shell 拼接；spawn 参数数组。
- `--workspace`/`--root`/`--profile`/`--home` 缺值时 exit 2，给用法；不要吞下一个 flag。
- `--help` 只打印启动器帮助（不启动 dsh）；`--version` 打印 `package.json` 版本。
- 未知的 `--xxx` 默认转发给 dsh（可能是 Web flag）；不静默丢弃。
- `--check` 与 `--gitignore-append` 互斥不需要；`--check` 不写任何文件。

## 3. 工作区解析与模式

### 3.1 解析顺序

```text
1. --workspace <dir>
2. process.env.DEEP_RESEARCH_WORKSPACE
3. $DSH_HOME/profiles/<profile>/deep-research.launcher.json 的 workspace（存在且目录可用）
4. process.stdin.isTTY：提示输入（默认值 = 当前目录，回车接受；空输入 = 当前目录）
5. 非 TTY：exit 2，打印三种指定方式
```

- 相对路径按 `process.cwd()` 解析；`~` 展开复用 `scripts/lib/dsh-home.mjs` 的 `resolvePathInput`。
- 存在即 `realpath` 规范化（`workspace-guard.mjs` 的 canonical 语义）；不在此时创建目录（创建在模式判定后）。
- 保存设置只在成功启动一次后写；`--check` 不写。

### 3.2 模式判定

```text
if (exists && !isDirectory) error
assertSafeWorkspace({ workspace, home, dshHome, packDir, profileDir })
if (--root given) root = resolve(root)
else if (hasResearchContract(dir)) root = dir
else if (isEmptyDir(dir)) root = dir
else if (--in-place) root = dir
else root = join(dir, 'research')       // 项目模式：不碰项目文件
if (root !== dir) mkdir(root)
assertSafeWorkspace for root as well
```

`hasResearchContract(dir)`：`.dsh-research-seed.json` 存在，或 `AGENTS.md` 与 `NODES.md` 同时存在。**不要**把任意 `AGENTS.md` 当研究契约（用户项目自己的 AGENTS.md 很常见）。

`isEmptyDir(dir)`：`readdirSync(dir)` 只有 `.`/`..`，或不存在；隐藏文件也算非空（保守）。

项目模式提示（一次）：

```text
deep-research: 项目目录不是研究工作区；研究根 = <dir>/research
  （不碰项目文件；要用项目根本身加 --in-place）
```

### 3.3 `.gitignore`

- 研究工作区根已有 `.gitignore`：**不静默改**。打印建议规则（`drt_*/`、`archive/`、`_abandoned/`、`method-library.md`、`.dsh-research-*`）与 `--gitignore-append` 提示。
- `--gitignore-append`：在用户明确加 flag 时，追加一个带标记的块：
  ```gitignore
  # deep-research (managed)
  drt_*/
  archive/
  _abandoned/
  method-library.md
  .dsh-research-*
  ```
  已存在标记则跳过（幂等）；不删除用户内容。
- 研究工作区根没有 `.gitignore`：scaffold 的种子会落地 `.gitignore`（user-owned）；launcher 不重复写。

### 3.4 危险目录

复用 `assertSafeWorkspace`：

- 不能是 HOME / `DSH_HOME` / pack / profile 本身、祖先或内部。
- profile 目录在 workspace 内或反之都拒绝。
- 父目录 symlink 越界：种子写入时 `assertSeedTargetInsideWorkspace` 拒绝。
- 错误消息带具体路径与补救（换目录 / `--root` / `--home`）。

## 4. 产品 profile 装配

### 4.1 算法

```text
profileDir = $DSH_HOME/profiles/<profile>
if (!exists(profileDir/package.json)):
    run dsh --profile <profile> --from-default-profile web --dump-config
    // 失败：打印 dsh 输出尾部 + 补救；exit 1
manifest = read(profileDir/package.json)
bundles = manifest.dsh.profile.bundles ?? []
if (!bundles.includes('@deepseek-ai/dsh-web-app')):
    error "profile 不是 Web-backed；换 --profile 或删除 profile 后重试"
packSpec = 'file:' + PACK_DIR
installedPack = read(profileDir/node_modules/dsh-deep-research-pack/package.json) ?? null
if (!bundles.includes('dsh-deep-research-pack') || installedPack?.version !== packVersion):
    require pnpm
    run dsh plugin --profile <profile> add <packSpec>
    re-read; if still missing or version mismatch:
        error "半装；先 dsh plugin remove 再 add" + 命令
teamSpec = '@deepseek-ai/dsh-experimental-agent-team-profile@' + runningDshVersion
ensureTeamLayer(profile, teamSpec)   // 复用 scaffold 逻辑；版本不符默认不改写，--refresh 语义留给 scaffold
re-read bundles/deps; if team missing: error + remedy
```

- `runningDshVersion`：`dsh --version` 的输出，或 install anchor 的 package.json；复用 `install-anchor.mjs`。
- `pnpm` 检测：`spawnSync('pnpm', ['--version'])`；缺失时在安装前 error，提示安装 pnpm。
- `dsh --version` 与 `engines.dsh` 不满足：安装前 error，提示升级 DSH 或换 pack 版本；不进入半装。
- `PACK_DIR` 在 profile 内（launcher 从安装副本运行）：跳过 pack 安装；只检查版本。
- profile 已有用户 patch：**不触碰**；`--from-default-profile` 只在 profile 不存在时调用。
- profile 已存在但不是 web-backed：拒绝，不尝试加 web-app（避免改用户组合）。
- `--home`：所有路径（profile/settings/子进程 `DSH_HOME`）都用该 home；默认 `resolveDshHome()`。
- 读回四层状态（FAQ 35）：包版本、`dsh.profile.bundles`、patch 里的行、effective dump（可选 `--check` 跑 `--dump-config` 并 grep 关键行）。

### 4.2 半装/损坏

| 状态 | 检测 | 处置 |
|---|---|---|
| dependency 在、bundle list 缺 | `dependencies[name]` 有、`bundles` 无 | `dsh plugin remove` + `add`（提示用户确认，或自动补偿后读回） |
| bundle list 在、安装副本缺 | `bundles` 有、`node_modules/.../package.json` 无 | `dsh plugin add` 重装 |
| 版本旧 | 安装副本版本 ≠ 启动器版本 | `dsh plugin add file:<PACK_DIR>`；读回 |
| 团队层缺/版本不符 | bundles/deps 检查 | `ensureTeamLayer`；版本不符默认不改写（N2 风险），提示 `scaffold --refresh-team` |
| profile package.json 不可读 | JSON parse error | exit 1，打印路径与补救（删除/重建 profile） |

## 5. 产品设置文件

路径：`$DSH_HOME/profiles/<profile>/deep-research.launcher.json`

```json
{
  "schemaVersion": 1,
  "workspace": "/abs/path",
  "profile": "deep-research",
  "updatedAt": "2026-11-01T00:00:00.000Z"
}
```

- 读写：同目录 temp 文件 + `renameSync`；失败回退到直接写并报告；不跟随 symlink 目标（用 `lstat` 拒绝 symlink 文件）。
- 读：缺失/JSON 错/schemaVersion 未知 → 当作无设置（提示重新选择），不崩。
- 路径守卫：`realpath(dirname(file))` 必须在 profile 目录内；否则拒绝写。
- 不含秘密、不含工作区内容；删 profile 即删。
- 运行时 Host 插件**不读**该文件；它只读 `DEEP_RESEARCH_WORKSPACE`（避免手动 `dsh --profile` 被旧设置干扰）。

## 6. Host 工作区注册插件

`src/workspace-boot/index.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'
import { resolve } from 'node:path'
import { stat } from 'node:fs/promises'

export const inject: readonly string[] = ['workspaceRegistry']

export async function apply(ctx: Context): Promise<void> {
  const raw = process.env.DEEP_RESEARCH_WORKSPACE
  if (raw === undefined || raw === '') return
  const path = resolve(raw)
  const s = await stat(path)
  if (!s.isDirectory()) throw new Error(`DEEP_RESEARCH_WORKSPACE is not a directory: ${path}`)
  const ws = await ctx.workspaceRegistry.create(path, `Deep Research — ${path.split(/[\\/]/).pop() ?? 'workspace'}`)
  ctx.logger.info(`deep-research workspace registered: ${ws.path}`)
}
```

- `apply` 返回 Promise；app-boot 在 commit ready 前等待（spike 已证实注册先于 Web URL 打印）。
- env 缺席零行为：手动 `dsh --profile` 的旧用法不受影响。
- 失败：log error；**不要**静默回退 Documents。launcher 已先验证，故失败是防御性。
- `create` 按 canonical path 幂等；已有 registration 返回原记录，标题不改。
- 不建 Session：Web Client 首屏 `restoreSelection` 会选 recent workspace 并 `connectWorkspace`，创建/复用 blank Session；默认 preset 由 pack 的 `agent-preset-registry.default: lead` 决定。
- 不加 storage domain / localStorage / session event；`data-plane-invariants` 保持。
- `cordis.patch.yml`：
  ```yaml
  - insert:
      - id: research-workspace-boot
        name: 'dsh-deep-research-pack/workspace-boot'
  ```
- `package.json`：`exports["./workspace-boot"] = { types: "./lib/types/workspace-boot/index.d.ts", default: "./lib/workspace-boot.js" }`；`tsdown` entry `'workspace-boot': 'lib/types/workspace-boot/index.js'`；`files` 的 `lib/**` 覆盖。
- `@deepseek-ai/dsh-workspace` 进 `peerDependencies`（type-only import + service 语义），peer 全部 optional。
- `row-deps`：如果 row 的 `name` 是子路径，确保 `peerDependencies` 有 `@deepseek-ai/dsh-workspace`；`dsh.client.inject` 不含它（不是 client 模块）。

### 6.1 spike 证据（2026-11-01，本机）

用临时 home + 临时 Web profile + 临时 `file://` Host 插件（与上面同形）+ 真 Web：

```text
SPIKE_ENV /tmp/dsh-product-boot/ws
SPIKE_REGISTERED /private/tmp/dsh-product-boot/ws 0d7e22fe-2bb4-4bbc-bcf7-b9a48032d6ca
dsh web: http://127.0.0.1:3211/?token=...
```

`$DSH_HOME/storages/workspace.json`：

```json
{
  "workspaces": {
    "0d7e22fe-...": {
      "path": "/private/tmp/dsh-product-boot/ws",
      "title": "ws",
      "sessionIds": ["session-e7861c78-..."]
    }
  }
}
```

Session header（zstd 解压首行）：

```json
{"type":"session","version":4,"id":"session-e7861c78-...","cwd":"/private/tmp/dsh-product-boot/ws","agentPreset":"lead"}
```

浏览器首屏（pack 已装入临时 profile）：

```text
Orca | 新会话 | 工作区 ws | 探索未至之境 | ws | Deep Research Lead | [composer]
ERRORS []
```

结论：Host boot 注册 → Web Client 首屏选中 → blank Lead Session（cwd = 工作区）全链成立。**边界**：这是在临时 profile 手工加 pack；launcher 的 pack/team 装配、种子、设置、`--check` 仍需 product-smoke 证明。

## 7. 启动与信号

```text
spawn(dshBin, ['--profile', profile, ...forwarded], {
  cwd: workspace,
  env: { ...process.env, DEEP_RESEARCH_WORKSPACE: workspace, ...(home ? { DSH_HOME: home } : {}) },
  stdio: 'inherit',
})
```

- `dshBin`：默认 `dsh`；测试用 `DSH_BIN`（不暴露给用户文档，或作为高级 flag `--dsh-bin`）。
- `ENOENT`：exit 2，提示安装 DSH / `PATH` / `--install-anchor`。
- 信号：`SIGINT`/`SIGTERM` 转发子进程；子进程退出后 launcher 以同 code 退出；不要吞信号导致 Web 残留。
- 启动前打印：
  ```text
  deep-research: profile = deep-research
  deep-research: workspace = /abs/ws
  deep-research: starting dsh ...
  ```
- 不解析/打印 token；dsh 自己打印 URL 并开浏览器。`--no-open` 透传。

## 8. 打包

`package.json` 变更：

```json
{
  "bin": { "dsh-deep-research": "./scripts/launch.mjs" },
  "exports": {
    "./workspace-boot": { "types": "./lib/types/workspace-boot/index.d.ts", "default": "./lib/workspace-boot.js" }
  },
  "peerDependenciesMeta": { "@deepseek-ai/...": { "optional": true } }
}
```

- 所有 peer 都 optional（spike：不加时全局安装 ERESOLVE；加了只装 1 个包、bins 正常）。
- `files` 已有 `scripts/**`、`lib/**`；无需新增（`launch.mjs` 在 scripts，`workspace-boot` 在 lib）。
- 无 `dependencies`、无 install hooks（package-contract 硬约束）。
- `scripts/dist/export-dist.mjs` 的 `must` 加 `package/scripts/launch.mjs`、`package/lib/workspace-boot.js`；inventory 断言。
- `tests/pack/package-contract.test.mjs`：所有 peer 都有 `peerDependenciesMeta.optional === true`；bin 存在；files 覆盖。
- 真实 `npm i -g --prefix` spike：optional peers 下 `global/bin/dsh-deep-research-preflight` / `scaffold` 已链接；launcher bin 同理待补测。

## 9. 测试用例（launcher 单测，fake dsh）

| 用例 | 期望 |
|---|---|
| 无 profile | 记录 `--from-default-profile web --dump-config`，然后 pack add、team add |
| profile 有 web+pack+team 当前版本 | 不再 add；直接 spawn |
| profile 有 pack 但 bundle 缺 | 读回失败 → 重装/报错，不 spawn |
| profile 不是 web-backed | exit 1 + 补救，不尝试加 web-app |
| `dsh --version` 不满足 | 安装前 exit 2，不产生半装 |
| pnpm 缺席 | 安装前 exit 2，提示 |
| 危险 workspace | exit 2，不写盘 |
| 项目目录 | 记录 `root=<dir>/research`，不碰项目文件 |
| `--in-place` | root = dir |
| 已有 `.gitignore` | 不改写；提示规则；`--gitignore-append` 才追加标记块 |
| `--home` | profile/settings/子进程 `DSH_HOME` 一致 |
| `--check` | 零写盘；报告状态；exit 0/1 |
| 半装 dependency/bundle | 读回失败 → 重装/报错 |
| 设置损坏 | 忽略并重新询问；不崩 |
| 信号 | 子进程收到 SIGINT/TERM，launcher 退出码一致 |

## 10. 未定/风险

- 真实 `npm i -g` 的 launcher bin（已测 preflight/scaffold，未测 launcher）。
- 团队层离线/registry 不可用；launcher 的失败文案与 `scaffold` 一致。
- profile 已有旧 blank Session（preset snapshot 为 standard）时，launcher 不会重建；产品文档要说明"换 pack 后新开会话"。spike 中已观察到此行为。
- Windows 不承诺；`spawn` 的 `.cmd` 解析未做。
- 项目子目录的 sandbox 边界需用户接受（agent 可读项目、写入留在子目录）。
