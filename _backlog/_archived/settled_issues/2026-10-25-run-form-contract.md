---
status: 已结
opened: 2026-10-25
---

# 推敲：运行形态合同——分发、智能体/数据分离、独立启动

> 立卡：2026-10-25 ｜ 状态：已结（2026-10-25） ｜ 类型：Task ｜ 结论倾向：并入已有——合同 guides/65 + Note 已交付；子卡已结归档 ｜ 可关闭：是

**关闭结论（2026-10-25）：** 运行形态合同 = [guides/65](../../../docs/guides/65-run-forms.md)（M1/M2/M3、P/H/W、A+B、per-user、升级/移交/证据矩阵）；Q1–Q3 已定（用户授权静默自主推进）；未改变 D17/D18/D21。 去向：implemented — [运行形态合同 Note](../../../notes/implemented/2026-10-25-run-form-contract.md)。

**问题与期望结果：** 这个插件同时以三种形态存在：安装进用户的 DSH profile、在本仓的独立开发环境里跑、以及把目录或产物交给别人。当前没有一份合同把“包（智能体定义）/ DSH 状态 / 研究产物”在三种形态下的归属、生命周期、前置和证据写死。结果是分发、跨人使用与独立启动各自缺一块，且同一件事在不同文档里说法不一致。期望产出一份可执行的运行形态合同，并把待决问题、证据和子工作显性化。

> 事实以盘上文件为准；标「推荐」的是建议，不是已定结论；标「候选」的是待选方案。

**当前情况：** 本仓已有 `packages/deep-research-pack/`（bundle + presets + workspace 种子 + 部署 bin）、`research-workspace/`（研究工作区）、`runtime/harness-home/`（开发 DSH home）与 `dev/`（环境/启动驱动）。设计上 D17 已区分 harness 与 run bundle；但形态边界、升级归属和独立启动的可重复性没有统一合同。分发的已知缺口见 [分发合同](2026-10-25-distribution-contract.md)，工作区所有权见 [工作区所有权与升级](2026-10-25-workspace-ownership-and-upgrade.md)，运行态边界见 [运行态数据边界与移交](2026-10-25-runtime-data-boundary.md)，独立启动见 [独立环境冷启动与多实例](2026-10-25-standalone-cold-start.md)。DSH 官方惯例的事实依据见 [research/2026-10-25-dsh-plugin-conventions.md](../research/2026-10-25-dsh-plugin-conventions.md)。

**未决问题：** 三个问题决定合同形状，当前都未定：

1. **“插件目录独立启动”指什么**——A 独立 DSH 环境（隔离 home + profile + workspace）、B pack 目录自安装、C 整目录复制；推荐 A 为主、B 作为可安装门槛、C 改为显式 handoff（见下）。
2. **“给不同人使用”是哪种**——每人自己机器安装、多人共用一台机器/一个 checkout、还是把 run bundle 交给别人；推荐按“per-user 分发 + bundle 移交”设计，多实例通过独立数据根支持，不把共享 checkout 当目标。
3. **本轮授权边界**——只补文档/门禁，还是允许改包公共行为（兼容声明、团队层钉版、workspace 版本、数据根）；涉及 D17/D18/D21 的变更是否先立新 D 号。推荐先出合同与 D 号，再按切片改公共行为。

**下一步：** 合同与 Note 已交付；本卡保留活跃以跟踪子卡残余（Linux/真实版本升级/run bundle 路径机械校验/MCP 冷启动）。子卡各自记录证据与残余，不再等待本卡决策。

## 结论（2026-10-25，用户授权静默自主推进）

- **Q1：独立启动 = A 为主 + B 作为可安装门槛，C 不做。** A = 独立 `DSH_HOME` + profile + workspace；B = pack 目录在已构建后可通过 `dsh plugin add file:<目录>` 安装；C（整目录复制）改为显式 handoff。依据：DSH 原生单位是 bundle + profile + workspace，没有“插件目录自己变成应用”的概念；目录安装不替你构建。A 的完整支持 = bootstrap + 可配置数据根/端口/profile + 冷启动 smoke。
- **Q2：按 per-user 分发 + bundle 移交设计。** 每人自己的 `DSH_HOME` 与工作区；同机多实例用独立数据根/端口/profile 支持；不把“多人共享一个 checkout/一个 home”作为目标。run bundle 是协作移交单位，插件本身沿 tarball/目录分发。
- **Q3：允许为纠正合同缺口改公共行为，但不改 D17/D18/D21 的边界。** 兼容字段、团队层钉版、种子升级、数据根参数、clean handoff 属于合同缺口修复；若后续需要改变 harness/run bundle 或驾驶舱边界，另立 D 号。实现期间按切片推进，收尾统一写 Note；当前判断不需要新 D。
- **授权记录：** 用户 2026-10-25 明确要求“静默自主推进、克服障碍、别问我除非迫不得已”。本卡据此按推荐结论推进；事实/证据仍按本仓门禁与 L2 证明，不把“已决定”当成“已实现”。

**合同落点：** 当前合同 = [guides/65](../../../docs/guides/65-run-forms.md)；决定理由/输掉的方案/证据 = [Note](../../../notes/implemented/2026-10-25-run-form-contract.md)。

## 范围与依赖

本卡拥有**形态与归属的判断**：三种运行形态、三块存储、每种形态的安装/升级/卸载/移交边界，以及三个待确认问题的结论。它不拥有实现细节；每个可独立验收的面由子卡承担。

依赖与边界：

- 现有决定：D17（harness / run bundle 分离）、D18（驾驶舱单点例外）、D21（启动意图分流）、D20（不设独立 roadmap，执行顺序由会话内计划表达）。
- 合同若改变 D17/D18/D21 的边界，按 [decisions.md](../../../docs/decisions.md) 的规则立新 D 号；需要显式评审时再建 `notes/proposed/`。
- 本卡不是实施授权；子卡翻「现在做」时才写 `## 验收标准` 并进入实施。

## 范围排除

- 不在本卡实施代码、改 preset/skill 文本或写实施计划；这些归子卡。
- 不新建 roadmap 或仓库任务队列（D20）；执行顺序由会话内计划与 todo 表达。
- 不把 M2 的现有运行数据搬迁作为本卡前置；数据边界的实施归子卡。
- 不改变 D17/D18/D21 的现有边界，除非另立 D 号。
- 不把“已讨论”当成用户已确认；Q1–Q3 的翻转只认用户明确答复。

## 已知与未决

### 三种形态

| 形态 | 谁在用 | 当前入口 | 数据落点 |
|---|---|---|---|
| M1 安装形态 | 外部用户 | npm / tarball → `dsh plugin add` → profile | 用户 `DSH_HOME` + 用户自选 workspace |
| M2 独立开发形态 | 作者 / 贡献者 | 本仓 + `dev/env.sh` + `node dev/run-driver.mjs up` | 仓内 `runtime/harness-home` + 仓内 `research-workspace` |
| M3 目录移交形态 | 想把整个目录复制给别人跑 | 无正式入口 | 会连同 M2 的仓内数据一起带走 |

### 三块存储

| 存储 | 内容 | 当前边界 |
|---|---|---|
| P 包 / 智能体定义 | pack 的 presets、skills、cordis 行、workspace 种子、client | `package.json` 的 `files` 白名单；安装副本只读 |
| H DSH 状态 | sessions、credentials、profiles、settings | `DSH_HOME`；开发环境在 `runtime/harness-home` |
| W 研究数据 | `drt_*`、`archive/`、`_abandoned/`、`method-library.md` | 研究工作区；根 `.gitignore` 拒收运行区 |

### Q1：独立启动的三种读法

| 读法 | 具体动作 | DSH 对应物 | 现状 |
|---|---|---|---|
| A 独立环境 | 建隔离 `DSH_HOME` + profile + workspace，再 `dsh --profile` | 原生 profile 模式 | 能跑，但 home/workspace 在源码树内、固定 profile/端口、无 bootstrap、无冷启动证据 |
| B pack 目录自安装 | 只拿 pack 目录，`dsh plugin add file:<目录>`，再起 profile | 官方支持的目录安装；要求 `lib/` 已构建 | `lib/` 是 gitignored，`prepack` 依赖根 workspace；按 git 内容复制走不能直接装 |
| C 整目录复制 | 复制整个仓库目录直接跑 | 不是 DSH 概念 | 会带走凭据、会话、run 数据与 `dev/harness-home`；gitignore 管不到 `cp -r` |

**推荐：A 为主，B 作为“目录也能装”的门槛，C 不做（改为显式 handoff）。** 理由与 DSH 官方依据见 [research 材料](../research/2026-10-25-dsh-plugin-conventions.md)：DSH 的原生单位是 bundle + profile + workspace；没有“插件目录自己变成应用”的概念。独立环境应做成可重复的隔离实例，而不是发明第四种运行时。B 值得保留，因为它让“把 pack 目录给人”成立；但它要求先构建，属于打包属性，不是第二套架构。C 与“智能体/数据分离”直接冲突，应改成 handoff 产物。

### Q2：给不同人使用的范围（待过）

候选：每人自己机器安装（分发）；多人共用一台机器/一个 checkout（多租户）；把 run bundle 交给别人（数据可携带）。三者设计不同。当前推荐：按 per-user 分发 + bundle 移交设计；同一台机器上的多实例用独立数据根支持；不把共享 checkout 作为目标。该项待用户确认后写入合同。

### Q3：授权边界（待过）

候选：只补文档/门禁；允许改包公共行为；先立 D 号/RFC 再改。当前推荐：先出合同与 D 号，再按切片改公共行为；不在未确认前动 D17/D18/D21 的边界。

## 方案与取舍

| 方案 | 收益 | 成本 / 风险 | 结论 |
|---|---|---|---|
| A 独立环境为主 | 与 DSH 原生模型一致；安装/开发/冷启动共用一套 profile 逻辑 | 需要 bootstrap、外部数据根、多实例与冷启动证据 | 推荐 |
| B pack 目录自安装为主 | 不用 npm，目录即可交付 | 需要自包含构建/`prepare`、profile 初始化、数据根；等于在 DSH 外再包安装器 | 作为门槛，不作为主形态 |
| C 整目录复制 | 最省事 | 带凭据/会话/run 数据；无法保证干净；与分离目标冲突 | 不做；改为 handoff |
| 维持现状 + 文档说明 | 改动最小 | 缺口仍在；不同人使用时会踩同一批坑 | 不推荐 |

## 验收标准

本卡是决策卡；定稿时至少满足：

- 三种形态与三块存储的矩阵写在一处，并指明每格的 owner、可写方、升级/移交规则。
- Q1–Q3 有明确结论；涉及 D17/D18/D21 的变更有 D 号或 RFC，未变更的部分写明“不改变”。
- 每个子卡有独立的验收面、证据类型与依赖；本卡不把子卡的实现当成自己的完成条件。
- 合同落点唯一：新增 guides 页或并入现有 guides，其他页面只留链接，不复制矩阵。
- `pnpm verify` 对新增/修改的文档与 backlog 结构为绿。

## 关闭条件

Q1–Q3 已定（用户 2026-10-25 授权静默自主推进；结论见本卡 §结论）；合同正文落盘；未改变 D17/D18/D21 边界（无需新 D）；子卡已按合同改写并链接；本卡结论倾向翻为「并入已有」并记录去向。
