---
status: 推敲中
opened: 2026-10-25
---

# 推敲：运行态数据边界与移交

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 结论倾向：未定 ｜ 可关闭：否

**问题与期望结果：** 插件的智能体定义（P）已经和 DSH 状态（H）、研究产物（W）在概念上分开；但物理边界仍靠 `.gitignore` 与路径约定，运行态可以落在源码树里，目录一旦被 `cp -r`/压缩/交给别人，凭据、会话与 run 数据会一起走。期望把“包只读、状态按人/实例、产物按研究”变成可检查的边界，并给出一条干净的移交路径。

**当前情况：** 设计上的分离是成立的：pack 的 `files` 白名单只发运行所需；驾驶舱通过 `workspaceFiles` 只读；`scaffold` 只写用户选的工作区；`method-library.md` 是用户数据、种子保持空架子。物理上仍有四处混装：

- `research-workspace/` 同时是 harness 正本（`AGENTS.md`/`NODES.md`/`templates`，tracked）、开发草稿（`drafts/`，tracked）、用户方法库（ignored）、run 数据（`drt_*`/`archive/`/`_abandoned/`，ignored）。
- DSH 状态在源码树内：`runtime/harness-home/` 含 `.credentials.yaml`、sessions、profiles；`dev/harness-home/` 还留着一个误落位的 run bundle。根 `.gitignore` 拒收它们，但管不到目录复制。
- 开发通道固定使用仓内 `runtime/harness-home` 与 `research-workspace`；没有“数据根”参数，两个独立实例会共享/互撞（详见 [独立环境冷启动与多实例](2026-10-25-standalone-cold-start.md)）。
- run bundle 内含本机绝对路径：抽扫 `research-workspace/drt_*` 与 `archive/` 可见 home 前缀的绝对路径（来源/回执/草稿）；把 bundle 交给别人会泄漏路径或断链。

**未决问题：** 数据根是否要移出源码树，还是保留仓内默认但提供 `DSH_HOME`/workspace 显式参数；`dev/harness-home` 是删除、迁走还是保留为历史；“移交”的产物是什么（tarball + 种子 + run bundle）；run bundle 的绝对路径是归一化、脱敏还是只在移交时重写；多实例的最小支持面是什么。

**下一步：** 等 [运行形态合同](2026-10-25-run-form-contract.md) 定 Q2（给不同人使用的范围）后选择 A/B/C。当前先把“`--force` 覆盖方法库”与 `dev/harness-home` 误落位作为确定缺陷处理；数据根与移交产物写成候选验收。若选择 A，优先做“可配置数据根 + 干净 handoff”，不强行搬迁现有开发数据。

## 范围与依赖

本卡拥有**运行态边界与移交**：P/H/W 的物理归属、开发数据根、干净移交、run bundle 路径可移植性。它不拥有工作区种子版本（[工作区所有权与升级](2026-10-25-workspace-ownership-and-upgrade.md)）与安装兼容（[分发合同](2026-10-25-distribution-contract.md)）。

依赖：

- D17（harness / run bundle 分离）与 D28（位置=操作桶）是现行语义；本卡不改语义，只补物理边界。
- `packages/deep-research-pack/package.json` 的 `files` 与 `scripts/dist/export-dist.mjs` 的 inventory 是发布边界的执行面。
- `dev/env.sh`、`dev/boot-run.sh`、`dev/run-driver.mjs` 是开发数据根的执行面。

## 已知事实

- `packages/deep-research-pack` 的 tarball 只含 `LICENSE`、`presets/**`、`cordis.patch.yml`、`lib/**`、`workspace/**`、`scripts/**`；`export-dist.mjs` 在产物本体重申必备/禁止条目。
- 驾驶舱只读 `remote.workspaceFiles`，唯一的写操作是复制到剪贴板；不写文件。
- `scaffold.mjs` 只写 `--workspace` 指定的目录；不写 `DSH_HOME` 与 pack 安装目录。
- `research-workspace/method-library.md` 是用户数据，根 `.gitignore` 拒收；pack 种子是空架子。
- `dev/harness-home/drt_civil-gpu-flash-llm/` 是一个活跃 run bundle 形态的误落位；根 `.gitignore` 末尾有 `dev/harness-home/` 兜底。
- 工作区 `.gitignore.example` 已列 `drt_*/`、`archive/`、`_abandoned/`、`method-library.md`；但它是 git 边界，不是复制/移交边界。

## 方案与取舍

| 路线 | 做法 | 收益 | 成本 / 风险 |
|---|---|---|---|
| **A 物理边界 + 可配置数据根 + 干净移交**（推荐） | 保留仓内默认，但 `DSH_HOME`/workspace 可显式指向外部；新增 clean handoff（只含源/种子/可选 bundle，排除 runtime、凭据、会话、run 数据）；run bundle 路径归一化或移交时重写；清 `dev/harness-home` | 不打断现有开发流；移交有明确产物；多实例可支持 | 需要改 `dev/env.sh`/boot-run/run-driver、加 handoff 脚本与门禁；绝对路径治理要定规则 |
| **B 全部运行态移出源码树** | 默认 `DSH_HOME`/workspace 都在仓库外，仓内只留源码 | 边界最干净；复制仓库天然不带数据 | 打断现有 `source dev/env.sh` 与 run 通道；迁移成本高；作者日常路径变化大 |
| **C 文档说明** | 继续靠 `.gitignore` 与“别复制目录” | 改动最小 | 移交仍会泄漏；多实例仍互撞；审计缺口仍在 |

推荐 A：它把“包/状态/产物”的边界做成可执行参数与移交脚本，而不是要求所有人改变日常路径。B 只有在用户明确要求“源码树绝不允许运行态”时再评估；当前证据不足以承担迁移成本。无论 A/B，`dev/harness-home` 的误落位与 `--force` 覆盖方法库都应先修。

## 候选验收标准

翻「现在做」时，至少覆盖：

- pack 发布物零状态：tarball inventory 无 `drt_*`、`.credentials.yaml`、`sessions/`、`logs/`、用户方法库；`files` 白名单与 inventory 断言同 diff。
- `DSH_HOME` 与研究工作区可指向仓外；`dev/env.sh`、`boot-run.sh`、`run-driver.mjs` 在显式参数/环境变量下使用它们，不再只有仓内固定路径。
- 两个独立实例可以同时存在（不同 home/workspace/profile/port），互不读写对方数据；至少有一个可复跑的验证。
- 干净的 handoff 产物：一条命令生成只含源/种子/可选 run bundle 的归档或目录；断言不含凭据、会话、日志、`runtime/`、`node_modules`、`lib/` 之外的构建中间物。
- `dev/harness-home/` 不再有运行态；门禁或测试断言 `dev/` 下无 `drt_*`/`sessions/`/凭据形态；历史 bundle 有明确去向。
- run bundle 路径规则：新产出不写本机绝对路径，或移交时提供归一化/脱敏；用 fixture 断言 `final/`、`acceptance.md`、`provenance/` 的路径形态。
- 文档：P/H/W 的 owner、可写方、复制/移交边界写在一处；`guides/63` 与 pack README 只留链接。

## 关闭条件

数据根、移交产物、绝对路径规则、`dev/harness-home` 去向都有结论并落盘；相关脚本/门禁/文档同 diff；验证证据覆盖 pack 零状态、两实例、干净 handoff、路径形态；结论去向记录。未定期间保持活跃。
