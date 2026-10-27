# 65 · 运行形态合同：安装、独立启动与移交

> 层：指南（当前合同）。本页回答“这个插件以什么形态运行、数据归谁、怎么升级/移交、用什么证据证明”。
> 安装步骤与用户视角细节 = [pack README](../../packages/deep-research-pack/README.md)；开发操作 = [guides/60](60-dev-loop.md)；
> 入库/跨环境 = [guides/63](63-git-boundary.md)；版本与发布 = [guides/64](64-release-versioning.md)。
>
> **编号消歧**：本文 M1/M2/M3 = 运行形态（mode：安装 / 独立开发 / 移交），不是 [evaluation §3](../evaluation.md) 的里程碑 M1/M2/M3+；跨文档引用写「运行形态 M1」。

## 1. 三种运行形态

| 形态 | 谁在用 | 入口 | 边界 |
|---|---|---|---|
| **M1 安装形态** | 外部用户 | npm（发布后）/ tarball → `dsh plugin add` → profile | 用户自己的 `DSH_HOME` + 自选研究工作区 |
| **M2 独立开发形态** | 贡献者 / 本地验证 | 本仓 + `bash dev/bootstrap.sh` + `node dev/run-driver.mjs up --bootstrap` | 默认仓内 `runtime/harness-home`；可用 `DSH_DEV_HOME` 指到仓外 |
| **M3 移交形态** | 交给另一人或另一台机器 | `scripts/dist/export-handoff.mjs`（源码）或 `export-dist.mjs`（插件） | 不是复制工作树；运行态/凭据/run 数据不随包 |

**决定：A 为主，B 作为可安装门槛，C 不做。** A = 独立 `DSH_HOME` + profile + workspace；B = pack 目录在
`pnpm build` 后可 `dsh plugin add file:<目录>`（安装时复制进 profile；移动源目录后旧路径不能重装/升级，需 remove 后从新路径 add；`link:` 才是移动即断链）；C = `cp -r` 整个工作树，
会带走凭据/会话/run 数据，不提供。移交改用 M3。

## 2. 三块存储

| 存储 | 内容 | owner / 可写方 | 升级与移交 |
|---|---|---|---|
| **P 插件 / 智能体定义** | pack 的 `presets/`、`skills/`、`cordis.patch.yml`、`workspace/` 种子、`lib/` | 包 = 只读；安装副本不改 | 换包版本；`workspace/seed.json` 记录种子版本/哈希 |
| **H DSH 状态** | sessions、credentials、profiles、settings | 用户 / 实例；`$DSH_HOME` | 按 home 隔离；不随源/包移交 |
| **W 研究数据** | `drt_<slug>/`、`archive/`、`_abandoned/`、`method-library.md` | 用户工作区；角色按手册 owner 表写 | 用户所有；方法库不随插件升级覆盖；run bundle 单独移交 |

P 里的 `workspace/` 是**只读种子**：落地后归 W，由用户工作区拥有；它不是运行时智能体定义的第四份副本。

`research-workspace/` 是 M2 的工作区，不是包的一部分；`dev/` 只住源码驱动，运行态住 `runtime/` 或工作区
（门禁 `dev-runtime-clean` 直接看盘）。pack 的 `files` 白名单只发运行所需，发布物不含状态。

**与 DSH 6+2 数据平面的映射**（FAQ 24 的切法；P/H/W 是导航粗分，不是排他分区）：

| DSH 平面 | 本仓落点 | 本插件怎么碰 |
|---|---|---|
| D 定义 | `presets/`、`skills/`、`cordis.patch.yml` | 只读；包版本绑定 |
| C 代码 | `lib/`、`src/` | 只读；安装副本不改 |
| W workspace | `research-workspace/`（`AGENTS.md`/`NODES.md`/`drt_*`/`method-library.md`） | 角色读写；client 只读 |
| U home | `$DSH_HOME/`（AGENTS.md、skills、storages、sessions、profiles、cache、credentials）与 `~/.agents` | 本包只经 DSH 服务；不手写 |
| S session | `$DSH_HOME/sessions/`（物理在 home，逻辑独立） | 经会话服务/日志；不新增 event 类型 |
| H host state | `$DSH_HOME/storages/` | 本包不声明 storage domain |
| K cache | `$DSH_HOME/cache/` | 不使用 |
| X credentials | `$DSH_HOME/.credentials.yaml` / 环境变量 | 经凭据服务；不打包、不进日志 |

## 3. 安装、升级、卸载

- **前置**：DSH 满足包内 `engines.dsh`（值以 `package.json` 为准）；Node 满足 `engines.node`；`dsh` 在 PATH，
  首次补团队层需要 pnpm。团队机制层 `@deepseek-ai/dsh-experimental-agent-team-profile` 是 **N2 experimental**
  （上游可改/撤，不是产品稳定性承诺；层级表与风险见 pack README §Compatibility），须与运行中的 DSH 版本一致
  （scaffold 自动补；已在场且版本一致时**不改写来源**，要刷新用 `--refresh-team`）。`dsh` 不在 PATH 时用
  `--install-anchor <@deepseek-ai/dsh 安装目录或 package.json>` / `DSH_INSTALL_ANCHOR`。
- **安装**：`dsh --profile <p> --from-default-profile web --dump-config` → `dsh plugin --profile <p> add <npm|tarball|目录>`；
  `scaffold --workspace <w> --profile <p>` 铺种子 + 补团队层 + preflight。首装发现工作区已有别人的
  AGENTS/NODES/模板会拒绝（`--force` 覆盖，或 `--upgrade` 生成 sidecar 合并，合并/确认后用 `--adopt`
  显式接受当前工作区）；工作区不能是 HOME/DSH_HOME/pack/profile 的本身、祖先或内部；种子父目录经
  symlink 指向工作区外也拒绝。
- **升级**：先停正在跑的 profile（避免运行中替换 `node_modules`）→ 装新版包 → 重启 profile → `scaffold --check` →
  `scaffold --upgrade`。升级只覆盖“用户未改过且种子已更新”的文件；改过的文件保留原样并写 `<文件>.seed-new`
  （已有 sidecar 不覆盖，新种子写 `<文件>.seed-new-<版本>`）；`--adopt` 过的文件按 modified 处理，
  `--upgrade` 也不覆盖；`method-library.md` 任何模式都不覆盖。
- **回滚**：装回旧版包；工作区种子不回滚（用户数据不随插件降级），`--check` 如实报告版本关系；DSH 必须满足旧包
  `engines.dsh`，否则宿主拒绝加载。
- **卸载**：先停 profile；`dsh plugin --profile <p> remove dsh-deep-research-pack`；工作区保留，数据清理是用户显式动作。
  团队层不在本包内、卸载不删——不需要时显式 `dsh plugin --profile <p> remove @deepseek-ai/dsh-experimental-agent-team-profile`。
  scaffold 自己的残留（未改孤儿 / `.seed-new` / 陈旧锁 / 临时状态）用 `scaffold --clean` 报告；
  `--clean --write` 清未改孤儿/陈旧锁/临时件，**sidecar 默认保留**（可能是未合并的种子更新），
  加 `--discard-sidecars` 才丢弃；改过的孤儿、种子、`drt_*`、方法库永不删。

## 4. 独立环境与多实例

```sh
bash dev/bootstrap.sh --check          # 预检（不安装/不构建；仍会确保隔离 home 与 hooks 配置）：Node/pnpm/git/submodule/install/vendor 产物/env/凭据/端口工具
bash dev/bootstrap.sh                  # 缺件时执行 submodule/install/vendor 构建（幂等）
node dev/run-driver.mjs up --bootstrap # 准备 + 起通道 + 浏览器面验证
```

多实例用四个变量区分（默认值 = 单实例）：

| 变量 | 默认 | 作用 |
|---|---|---|
| `DSH_DEV_HOME` | `runtime/harness-home` | 隔离 DSH home（可指仓外） |
| `DSH_RUN_PROFILE` | `research` | profile 名 |
| `DSH_RUN_PORT` | `3083` | web 端口 |
| `DSH_RUN_STATE_DIR` | `runtime/smoke-workspace` | web.log/仪表盘/run-pack/npm-cache 的实例状态根 |
| `DSH_RUN_WORKSPACE` | `research-workspace` | 研究会话 cwd（角色手册从这里注入；多实例请各自指定） |

不同 `DSH_RUN_STATE_DIR` 的实例允许并行；默认 state 的重复启动检查仍生效，自定义 state 由端口检查兜底（两个实例请用不同端口）。**同一 workspace 不支持两个实例共用**：插件没有对 run/method 文件加跨进程锁，写会交叉；多实例必须各自指定 `DSH_RUN_WORKSPACE`。冷启动证据 =
`node scripts/smoke/cold-start-smoke.mjs`（独立 home/profile/端口/state，MCP 关闭，浏览器面 GREEN）。

## 5. 移交

- **源码移交**：`node scripts/dist/export-handoff.mjs` → `_dist/ai_dsh_deep_research-src-<version>-<head>.tar.gz`；
  只含 tracked 源与 `.gitmodules`，对方 `tar xzf` → `git submodule update --init` → `pnpm install`。
- **插件移交**：`node scripts/dist/export-dist.mjs` → tarball + 安装手册（含 sha256、升级/回滚、离线矩阵）。
- **研究数据移交**：run bundle 单独拷贝/归档；新 run 不写本机 home 绝对路径，旧 bundle 的历史路径按 epoch 豁免。移交前跑 `node scripts/run-gates/path-hygiene.mjs <bundle>`（旧场加 `--allow-legacy`）。
- **不做**：`cp -r` 工作树、把 `runtime/` 或 `research-workspace/drt_*` 打进源码包、把凭据/会话随包发送。

## 6. 证据

证据档位、命令与选择规则 = [guides/60 §2](60-dev-loop.md)（唯一 owner，本页不复述）。本合同的增量证据：

- `cold-start-smoke`：独立 `DSH_DEV_HOME` + profile + 端口 + state，到浏览器面 GREEN；
- `export-handoff` 自检：只含 tracked 源，不含运行态/凭据/run 数据/依赖；
- `dev-runtime-clean` 门禁：`dev/` 下无运行态。
- `compat-smoke`：全局 rc.3 宿主上的 install / dump / scaffold / remove（本机无 rc.3 时 exit 2）。
- `compat-client-smoke`：全局 rc.3 宿主上真起 web + headless 浏览器，断言本包 client 挂载零失败、
  三个研究页签可见（数据面机制已由 rc.2↔rc.3 diff 确认一致；本烟测证客户端面）。
- `data-smoke`：包目录零写入 / 假 token 不泄漏 / 卸载后 workspace 用户文件 + session 日志保留；双会话/storage 标 N/A。
- `pack-smoke`：T0 tarball 形状、exports 可解析、无安装期脚本/凭据。
- `workspace-isolation-smoke`：两套 home/profile/port/state/workspace，会话组绑定各自 W；只证接线/绑定，不证模型沙箱。
- `interrupt-smoke`：SIGKILL 中断 scaffold → stale lock 接管 → 重跑补齐种子；真双进程锁竞争第二个 exit 2。
- `profile-concurrency-smoke`：两个 `plugin add` / 两个 `remove` 同 profile 并发后 profile 仍可解析/最终无本包。
- `scaffold-smoke`：参数严格性（未知 flag/缺值/吞 flag）、HOME/DSH_HOME 根守卫、父目录 symlink 越界、种子 symlink/目录目标、锁、atomic state、orphan、哈希篡改、sidecar 保护与回滚保护。
- `preflight-smoke`：fake anchor 的行依赖齐全/缺件、无锚未验证、base-only profile、untracked AGENTS、空凭据、workspace `.env`；home/profile/anchor 全在仓库外。
- `real-home-smoke`：仓库外 home + 全局 dsh + tarball 的 init → install → scaffold/preflight → 真 web 页面；同时证团队层 `link:` 不被改写与重跑幂等（缺全局 dsh/tarball exit 2）。
- `upgrade-smoke`：安装当前版 → 模拟下一版 → 种子升级 → 回滚拒绝降级 → 卸载（profile + W 双面）。
- `profile-matrix-smoke`：多 profile 独立安装/卸载、损坏 tarball 无半装、用户 overlay 不改写、卸载重装后 workspace 数据保留。
- `user-env-smoke`：已有别的 bundle + 用户 overlay + session/凭据/workspace 时，安装/卸载不改写用户数据，别的 bundle 仍在。

## 7. 已知限制与延后工作

- 不把“多人共享一个 checkout / 一个 `DSH_HOME`”作为支持面；协作单位 = 包版本 + 工作区/run bundle 移交。
- 不承诺 Windows；macOS 实测；Linux 的 keyless deploy smokes（scaffold / preflight / pack）进 CI，但 Linux 上的真安装 + web 页面仍未在 CI 跑。`sed` 使用 BSD/GNU 兼容形态。
- 离线不是零前置：tarball 不需要 registry，但团队层需预装/缓存（含 pnpm registry metadata；只装 node_modules 不够）、Playwright MCP 首次需 npx、模型 API 需网络。
- DSH Desktop、真实 npm registry 发布、活升级/卸载、多人共享 home 仍无证据；自定义 AGENTS 合并后用 `--adopt` 显式接受（记 baseline，`--upgrade` 不覆盖），不采用 `--adopt` 时 preflight 会继续保持 untracked 红。
- 包目录安装的 profile 依赖记录绝对路径，但安装副本已复制；移动源目录后旧路径不能重装/升级（需 remove 后从新路径 add），`link:` 移动即断链；正式分发用 tarball/npm。
- **数据保留/权限/版本线**：run bundle 无自动 GC；一 Host 一用户、bundle 继承工作区权限；一个工作区
  只跟一条 pack 版本线；`method-library.md` 无锁无版本史，run 活跃时不手改。用户视角细节 = pack README §Data。
- 研究方法论本身不在本页：角色/preset/skill 见 [guides/62](62-plugin-authoring.md) 与 pack 内容；run 操作见 [guides/61](61-run-playbook.md)。

> 决定理由、输掉的方案与实际证据 = [运行形态合同 Note](../../notes/implemented/2026-10-25-run-form-contract.md)。
