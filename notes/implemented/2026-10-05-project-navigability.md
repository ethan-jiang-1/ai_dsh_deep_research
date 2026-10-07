# 目录与入口治理

> 状态：implemented

## 问题

项目同时包含运行入口、门禁、确定性回归、浏览器与回放证据、真模型验收和研究 bundle。职责分散在开发驱动、检查脚本、产品包、运行数据与指南中，接手者需要先判断入口、证据档位和事实 owner。

本条目确认三处实现缺口：默认回归经导入模块间接触发外部解压进程；L2 安装形状与研究凭据检查共用 verdict；HTML 仪表盘的日志选择、HITL 状态和步骤投影与驾驶舱存在分叉。

## 决定

### 导航与物理布局

[项目地图](../../docs/project-map.md) 以任务连接环境、组合、漂移门、并行观察、GUI/RPC 会话、方法论和交付判据，并标出脚本、测试、夹具、录制语料和运行产物的职责。根入口链仍是唯一开工程序。

物理目录保持现状。`packages/deep-research-pack` 继续拥有角色配置、runtime skills、驾驶舱、发布种子和部署 bin；`dev/` 拥有环境、构建/同步驱动和运行通道；`scripts/` 拥有门禁、分级 smoke、探针、run 运维、观察和分发；`tests/` 拥有默认确定性回归；研究工作区拥有会话手册、模板和 run 文件事实。`verification`、`run-ops`、`distribution` 作为项目地图中的概念分组，不引入物理转发目录。

拆分目录需要稳定 owner、独立命令入口、独立生命周期和路径/发现范围/门禁的机械反证；本次审计没有同时满足这些条件的迁移对象。

### BUG-010：默认回归读取器

新增 [session-log](../../scripts/lib/session-log.mjs) 作为 canonical 日志选择与读取接口（[BUG-010](../../_backlog/_done/_fixed_bugs/BUG-010-regression-indirect-subprocess.md)）。它按 v4、v3 代际选择物理日志，使用 Node 原生 zstd 解码，校验连续 Zstandard 帧边界，并把坏帧、截断尾帧和坏 JSONL 行作为整份日志不可读。`run-state` 与 `watch-run` 共用该接口，默认回归的 `.jsonl`、压缩多帧、损坏尾部和缺席路径都在真实导入执行路径覆盖。

### BUG-011：安装与研究就绪分层

[preflight](../../packages/deep-research-pack/scripts/preflight.mjs) 提供显式 `--install-only`（[BUG-011](../../_backlog/_done/_fixed_bugs/BUG-011-release-smoke-keyless-mismatch.md)）。该模式检查发布安装所需的版本、peer、团队层、工作区和构建产物，但跳过模型凭据检查并明确不宣称研究就绪；默认模式仍检查环境变量或 DSH 凭据文件。[scaffold](../../packages/deep-research-pack/scripts/scaffold.mjs) 转发模式，[release-smoke](../../scripts/release-smoke.mjs) 以清洗环境运行非模型子进程，并验证默认 preflight 会拒绝空凭据 home。

### BUG-012：观察面事实适配

[run-dashboard](../../scripts/run-dashboard.mjs) 的公开适配器修复 [BUG-012](../../_backlog/_done/_fixed_bugs/BUG-012-dashboard-state-divergence.md)，通过 `resolveSessionLog`、`readSessionEvents`、共享 `foldHitlPending` 和共享 `deriveSteps` 取得 canonical 日志、HITL 状态和步骤事实，同时保留 dashboard 的 `deriveStep`、`detectHitlWait`、`buildModel`、`renderHtml` 与 `decompressSessionLog` 公开适配器。它继续只读、fail-soft，并保留自身的内容统计与文件计数投影；观察面不是交付判定。

## 输掉的方案

### 立即拆分 scripts/runtime、debug、test

脚本的证据类型与运行模式交叉，目录移动不会自动修复接口重复、日志读取路径或门禁覆盖范围；新增转发层还会扩大同步面。

### 让 L2 继续要求凭据

L2 不调用模型，要求凭据会把安装结构证据与生产研究前置混在一起。伪造凭据文件只能掩盖合同错位，不能证明 provider 可用。

### 只扩充静态 layering 或只依赖端到端验收

静态顶层扫描无法证明导入执行路径；真模型端到端成本高、定位粗，也不能替代 native reader、部署 CLI 和观察投影的局部契约测试。两者分别保留在适合的证据档位。

## 验证

- `pnpm test`：194 passed，0 failed。
- `pnpm exec node --import tsx/esm --test tests/run-state.test.mjs tests/run-dashboard.test.mjs tests/hitl-fold.test.mjs`：50 passed，0 failed。
- `node --test tests/deploy-bin.test.mjs`：10 passed，0 failed。
- BUG-011 隔离 CLI：空凭据 home 下 `--install-only` 退出 0，默认模式退出 1，且默认模式只拒绝模型密钥检查。
- `tsc -p packages/deep-research-pack/tsconfig.json --noEmit` 与相关脚本语法检查通过。
- `source dev/env.sh && node scripts/release-smoke.mjs`：ALL PASS；npm pack、干净 profile 安装、scaffold 真铺种子、空凭据安装模式通过、默认模式拒绝，以及安装域四角色真挂载全部通过。
- `source dev/env.sh && node --import tsx/esm scripts/client-load-smoke.mjs`：ALL PASS；真实浏览器 client 装配、HITL 锚点、步骤条与盘侧文件对账通过。未绑定会话负样本候选不可打开，该断言跳过。
- `source dev/env.sh && node scripts/entry-chain-probe.mjs`：ALL PASS；正确识别空队列、入口 owner 与开发环，人工复核 [探针原文](../../runtime/smoke-workspace/entry-chain-probe-2026-10-05T10-03-28-369Z.md)。
- `source dev/env.sh && node scripts/snapshot-replay-smoke.mjs`：四角色 A 回放、B2 工具 schema、非 Lead 的 B1 persona，以及 Lead C 渲染金标准通过；Lead B1 persona 失败。失败源为本次未修改的既有 persona 与旧录制语料错位，记为 [BUG-013](../../_backlog/_done/_fixed_bugs/BUG-013-lead-replay-persona-stale.md)（2026-10-05 当日修复闭卡），未放宽比较器或重写金标准。
- `pnpm verify` 全绿；结构门禁最终通过临时 Git 索引把新增文件纳入 tracked 扫描，真实暂存区保持原样。
- 执行路径探针：`node --experimental-test-isolation=none --import ./dev/smoke-workspace/regression-process-guard.mjs --test tests/*.test.mjs`，194 项通过、0 次子进程调用。向 guard 注入被吞掉的 `execSync` 后退出 1，证明监测可咬中原缺陷类型。
- 反证：日志选择器临时用跟随 symlink 的 `statSync` 替代目录项检查，断链 v4 选择与 dashboard 测试变红；`sceneState.done` 临时改成最后步索引加一，final-only 断言变红。合计 3 项失败，还原后同套用例通过。

上述验证日期为 2026-10-05。源码域独立 L1、完整研究质量验收与 L4-lite 未跑，本条目没有修改研究角色、方法论文本或模型工具 schema。

## 收口边界

用户决定暂缓后续 BUG 修复、优先完成目录治理 goal。BUG-010/011/012 的已完成修复保留，BUG-013 作为活跃缺陷单独登记；回放 B1 红不扩大本条目修复范围。RFC 正文改为交付事实，队列条目离队，缺陷修复后续按用户选择推进。
