---
topic: plugin-as-product
intent: 把 dev 工作区根解析、会话组编码、测试迁移与产品 smoke 写成可实现的工程规格
---

# 仓库工具与测试实现规格：根解析、会话组、产品 smoke

本文是[仓库对齐与证据](../../settled_issues/2026-11-01-repo-alignment-and-evidence.md)的技术支撑。核心发现：会话组目录不是任意的 substring，而是 vendor 的确定性 `projectKey(cwd)` 编码；可以直接算出来，不必扫描会话。

## 1. `scripts/lib/workspace-root.mjs`

### 1.1 API

```js
/** 解析 dev 工具的工作区根。顺序：显式参数 → DSH_RUN_WORKSPACE → 仓内默认。 */
export function workspaceRoot({ argv = process.argv.slice(2), env = process.env, defaultRoot, flag = '--workspace' } = {}) {
  const arg = takeFlag(argv, flag)            // --workspace <dir> 或 --workspace=<dir>
  const raw = arg ?? env.DSH_RUN_WORKSPACE ?? defaultRoot
  return { root: resolvePathInput(raw), source: arg ? 'flag' : env.DSH_RUN_WORKSPACE ? 'env' : 'default' }
}

/** 产品 Host 用的环境变量名；dev 工具也认它（产品 run 调试）。 */
export const PRODUCT_WORKSPACE_ENV = 'DEEP_RESEARCH_WORKSPACE'
```

- `resolvePathInput` 复用 `scripts/lib/dsh-home.mjs`（`~` 展开、相对路径按 cwd）。
- 不做目录创建；调用方负责。
- 不在这里判断研究契约；只解析根。

### 1.2 调用点迁移

| 文件 | 现状 | 迁移 |
|---|---|---|
| `dev/boot-run.sh:26` | 定义 `WORKSPACE` 但 `dsh` 继承调用者 cwd | `cd "$WORKSPACE"` 后再起 `dsh`；导出 `DEEP_RESEARCH_WORKSPACE`；操作文本用 `<workspace>` |
| `dev/run-kickoff.mjs:34` | 已读 `DSH_RUN_WORKSPACE` | 改用 `workspaceRoot()`；`:184` 的 `bundleDirOf(join(ROOT,'research-workspace'),…)` 改用 `bundleDirOf(root, …)` |
| `dev/hitl-answer.mjs:90,138,429,475` | 写死 `join(ROOT,'research-workspace')` | 用 `workspaceRoot()` |
| `scripts/lib/run-dashboard-core.mjs:20-29` | `SCENE_ROOTS` 写死 | 由调用方传入 `workspaceRoot`；默认仍仓内 |
| `scripts/run-ops/watch-run.mjs:47` | 写死 | 用 `workspaceRoot()` |
| `scripts/run-gates/{node-gate,schema-scan,evidence-audit}.mjs` | `--latest` 写死 | 用 `workspaceRoot()`；显式 `--workspace` 优先 |
| `scripts/lib/session-log.mjs` | substring 组查找 | 新增 `projectKey`/`groupDirFor`（见 §2）；legacy 保留 |
| `scripts/smoke/client-*.mjs` | 仓内 workspace | 保持默认；新增 `--workspace`/env 支持按需 |

## 2. 会话组：确定性 `projectKey(cwd)`

vendor `packages/session/session-persistence-jsonl/src/format.ts:207-245` 的 `projectKey`：

```text
'/','\\',':' → '-'（连续分隔符合并为一个 '-'）
[A-Za-z0-9._-] → 原样
其他 code unit → '~' + hex(code).padStart(4,'0')
去掉开头 '-'，空则 'root'
`--${slug.slice(0,251)}--`
```

spike 证据：cwd `/private/tmp/dsh-product-boot/ws` → 组目录 `--private-tmp-dsh-product-boot-ws--`（实际盘上目录）。

### 2.1 实现

在 `scripts/lib/session-log.mjs` 增加：

```js
export function projectKey(cwd) { /* 上面算法；与 vendor 同形 */ }
export function projectGroupDir(sessionsRoot, cwd) {
  return join(sessionsRoot, projectKey(realpathNormalize(cwd)))
}
```

- `projectKey` 是纯函数，keyless 单测覆盖：普通路径、空格、冒号、中文/非 ASCII `~XXXX`、长路径截断、连续分隔符、根路径。
- `researchWorkspaceGroup()` 改为 `projectGroupDir(sessionsRoot, workspaceRoot())`；legacy `findGroup(root,'research-workspace')` 保留给旧场。
- 四个 `--group` 默认值：先 `projectGroupDir`，不存在再 legacy substring；不再把 `research-workspace` 当唯一。
- `web-ui-nav` 的候选组：用 `projectGroupDir` 计算，不再写死候选。
- 性能：O(1)，不扫会话；比 header 扫描更稳。

### 2.2 测试

| 用例 | 期望 |
|---|---|
| `/private/tmp/dsh-product-boot/ws` | `--private-tmp-dsh-product-boot-ws--`（与 spike 盘上一致） |
| `/Users/me/My Work` | `--Users-me-My~0020Work--`（空格转义） |
| `/data/中文` | `--data-~4E2D~6587--` |
| 连续 `//`/`\\`/`:` | 合并为一个 `-` |
| 空/根 | `--root--` |
| 长路径 | 251 截断 + `--` |
| legacy | `findGroup(root,'research-workspace')` 仍返回旧组 |

## 3. 测试迁移

| 现状 | 迁移 | 理由 |
|---|---|---|
| `docs-consistency` 枚举 `research-workspace/` 根实体 | 改枚举 `packages/deep-research-pack/workspace/seed.json`；仓内目录只作 dev 断言 | 随包权威 = 种子 |
| `run-bundle-charter` / `rerun-triage-contract` / `evaluation-contract` / `navigability-contract` / `presets.test` / `schema-scan.test` 读 `ROOT/research-workspace` | 改读 `packages/deep-research-pack/workspace/`（`pack-workspace-fresh` 已证两份一致） | 同上 |
| `data-plane-invariants` 两份手册断言 | 保留双份（同步门需要），新增启动器设置行形状 | 同步 + 数据卡 |
| `hitl1-intake-samples` 读 `research-workspace/drafts/` | 移到 `tests/fixtures/` | 该文件不是随包种子 |
| `replay-scene` 写死 `profile: research` / `workspace: research-workspace` | dev 场景保留；新增临时/绝对工作区用例；允许 `workspace` 为非仓内路径 | 产品工作区任意 |
| `run-driver-contract` 禁止 `--profile research` | 改为"dev 通道不得绕过漂移门"；允许产品 launcher 存在 | 两套启动作用域 |
| `session-log` substring 测试 | 加 `projectKey` 单测；legacy 用例保留 | 不依赖目录名 |

## 4. `product-smoke`（L2，真装）

### 4.1 前置与档位

- 需要 `dsh`（PATH 或 `DSH_BIN`）、`pnpm`、团队层 registry/缓存。
- 缺任一 → **exit 2**，不报绿；登记 `smoke-contract` 的 keyless/L2 档位要写清。
- 不调用模型；不建真研究。

### 4.2 临时布局

```text
runtime/smoke-workspace/product-<pid>/
  home/                       DSH_HOME
  ws/                         空工作区
  bin/dsh                     shim：exec node --import <repo>/node_modules/tsx/dist/loader.mjs <repo>/vendor/dsh/apps/cli/src/bin.ts "$@"
  state/                      日志
```

shim 必须**保持调用者 cwd**（不 `cd` 到 repo），否则产品 launcher 设置的 `cwd=workspace` 失效。已实测：外部 cwd + 绝对 tsx loader 可跑 `--version`。

### 4.3 步骤与断言

1. `PATH=<tmp>/bin:$PATH DSH_HOME=<tmp>/home node <pack>/scripts/launch.mjs --workspace <tmp>/ws --profile product-smoke --check` → exit 0；零写盘（profile 不存在时 `--check` 报"未装配"，exit 1；先跑非 `--check` 的 setup 或在检查前允许 `--check --allow-missing`）。
2. 跑非 `--check` 的 `--no-open` setup（或直接起 Web 后立即停）：装配 profile。
3. 读 `home/profiles/product-smoke/package.json`：bundles = base、web-app、pack、team；deps 有 pack、team。
4. 读 `home/profiles/product-smoke/node_modules/dsh-deep-research-pack/package.json`：版本 = pack 版本。
5. 读工作区：`AGENTS.md`/`NODES.md`/`question-patterns.md`/`templates/run/`/`.gitignore`/`.dsh-research-seed.json` 在场；`method-library.md` 只在缺席时创建。
6. 读 `home/profiles/product-smoke/deep-research.launcher.json`：workspace = `<tmp>/ws`；schemaVersion = 1。
7. 再跑一次：无新增安装、无重写、exit 0。
8. 负例：HOME/pack/profile/祖先 → 非零；非空项目 → 子目录；已有 `.gitignore` 不改写；半装 bundle → 读回失败/重装。
9. 包目录零写入：pack 的 `presets/`/`workspace/`/`scripts/`/`cordis.patch.yml` 哈希前后一致（`lib/` 不构建）。
10. 清理：路径守卫 + `rm -rf` 临时根（fail 时保留现场）。

## 5. `product-boot-smoke`（真 Web + 浏览器）

复用 `scripts/lib/playwright.mjs`（`loadChromium`/`launchChromium`）+ 临时 home/ws。

1. 启动 `launch.mjs --workspace <ws> --profile product-boot --port <free> --no-open`（后台），把 stdout/stderr 写日志。
2. 等日志出现 `dsh web: http://.../?token=...`；解析 URL。
3. `chromium.launch()` → page → `goto(url)` → 等 `[data-composer-input][contenteditable="true"]`。
4. 页面断言：body 含 `Orca`、`Deep Research Lead`、工作区标题/路径、起步三步文案、凭据提示；composer 可输入；`pageerror` 为空。
5. 读 `$DSH_HOME/storages/workspace.json`：workspace path = `<ws>` realpath；`sessionIds` 非空。
6. 读 session header（`scripts/lib/session-log.mjs` 的 `readSessionText`/`resolveSessionLog` 或 `zstd -dc`）：`cwd` = `<ws>` realpath，`agentPreset` = `lead`。
7. saved-session 用例：先在另一个 workspace 建 session（可用浏览器/API），再启动到 `<ws>`；断言首屏有可见当前工作区 + 切换入口（P0 不要求自动切换）。
8. 停进程、`reclaimPort`、清理；失败保留日志/截图。

spike 模板（已跑通）：

```sh
DSH_HOME=/tmp/.../home DEEP_RESEARCH_WORKSPACE=/tmp/.../ws \
  node --import <repo>/node_modules/tsx/dist/loader.mjs \
  <repo>/vendor/dsh/apps/cli/src/bin.ts --profile deep-research-spike \
  --patch /tmp/.../overlay.yml --no-open --port 3211
# Host 插件先打印 SPIKE_REGISTERED，再打印 dsh web URL
```

浏览器断言用 `scripts/lib/playwright.mjs`，不要直接 `import 'playwright'`（根 node_modules 没有；helper 从 `.pnpm` 找）。

## 6. 门禁/台账

- `smoke-contract`：`product-smoke` 标 L2（需 pnpm/registry），`product-boot-smoke` 标 keyless（无模型；需浏览器），不要把两者混成一个 keyless 条目。
- `docs/evaluation.md` §L2 + `scripts/verify/context.mjs` 的 gates 数组（若新增门禁）；`gate-ledger-sync` 对账。
- `package-contract`：launcher/bin/所有 peer optional。
- `data-plane-invariants`：启动器设置行 + 运行时零 home 写入的措辞。
- `export-dist` inventory：`package/scripts/launch.mjs`、`package/lib/workspace-boot.js`。
- `dist-manual-version`/`release-version`：版本 bump 后重导出。

## 7. 风险

- 团队层 registry/cache 在 CI/离线不可用 → product-smoke exit 2；产品验收需在有缓存的环境跑。
- `product-boot-smoke` 的 URL/token 解析依赖 dsh 输出格式；沿用 `client-load-smoke` 的解析/认证工具，避免第二套。
- session header 可能是 zstd；用仓库现有 `readSessionText`，不要新写解压。
- 首屏断言依赖 vendor slot 文案/结构；随 pin 重校，失败时先看 `client-load-smoke` 的既有断言。
