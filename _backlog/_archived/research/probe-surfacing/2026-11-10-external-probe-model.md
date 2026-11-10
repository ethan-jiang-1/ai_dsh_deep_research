---
topic: ai_dsh_company 探针体系的机制审计
intent: 为「探针凸显化」研究提供可核的外部证据——组织、索引、头注门、发现链、实际缺口与不可照抄项
---

# 外部探针体系：机制审计（ai_dsh_company / probes）

> 只读审计，2026-11-10。对象 = `/Users/bowhead/ai_dsh_company/probes`（68 支）、
> `checks/INDEX.generated.md`、`checks/gates/script-{status,triggers,index}.mjs`、
> `tools/lib/{repository-layout,checks-index}.mjs`；方法综述 =
> `/tmp/probe-playbook/probes-playbook.md`（sha256 `c6b59db3…`，41,805 bytes，2026-11-10 20:15）。
> 本材料只写核过的事实；playbook 的概括与仓库实况不一致处单独标出——借鉴以仓库为准。
>
> **身份注意**：company 当前 HEAD = `7326271d64`（2026-11-10），与
> [外部材料登记](../../../../docs/external-materials.md) 钉的 `bf76d36` 不是同一可解析对象。
> 本轮是**未重钉的借鉴**：结论只覆盖上述盘上文件，不冒充已重审全仓；实施前按钉版纪律补身份。

## 1. 它怎么组织

| 域 | 支数 | 失败面 |
|---|---|---|
| `team/` | 23 | 多 actor：认领、并发、屏障、委派生命周期 |
| `session-context/` | 18 | 会话上下文：时间、预算、签字、HITL、日志边界 |
| `browser-visual/` | 17 | 用户可见渲染：面板、页签、布局、实时更新 |
| `fs-taskboard/` | 10 | 文件持久化：CAS、写冲突、任务发现 |

- 顶层独立目录 `probes/`，按**失败面**分域，域内平铺 `<mechanism>-probe.mjs`，不按
  unit/integration/e2e 分。
- 没有域 README；这是刻意选择——`notes/archived/2026-10-07-driver-purpose-top-level.md:57`
  把「probes 只加 README 不分子目录」列为否决项。
- 共享代码在 `tools/lib/`（probe-kit / probe-web），探针之间不互相 import。

## 2. 它怎么让 agent 找到（发现链）

- 根 `AGENTS.md:23` 一行布局：`probes/ 调试面：窄机制与视觉探针，按机制域四子目录…`。
- `AGENTS.md:5` 把脚本索引指向 `checks/README.md`；`checks/README.md:3` 说「要跑/新增门禁、
  冒烟、探针或审计时」读它，并链接 `checks/INDEX.generated.md`。
- 索引在 `checks/INDEX.generated.md:35`：「窄机制与视觉探针（probes/，68）」，按域列出
  （`:37`/`:57`/`:70`/`:91`）。**不是** `probes/INDEX.generated.md`（不存在）。
- 从症状反查很薄：`docs/project-map.md:84` 只有一行「页面挂载或面板异常 → … cdp-probe」；
  `:94` 一句「调试 = probes/」；`docs/guides/cdp-probe.md` 是单件指南。`README.md` 与
  `docs/index.md` 零探针词。
- playbook §5 主张的四层发现链——布局块 / 生成索引 / 头注 / 症状表——前两层与头注在场，
  **症状表基本缺席**。

## 3. 什么被机械化了

| 项 | 实况 | 证据 |
|---|---|---|
| 索引新鲜度 | `checks/INDEX.generated.md` 与目录**字节级**比对；增删探针不重生成 → verify 红 | `checks/gates/script-index.mjs:20-32`；生成器 `tools/lib/checks-index.mjs:12`（`PUBLIC_DIRS` 含 probes）、`:82-91` |
| `状态` | 68/68 有；首个 8 行内正则校验 `常驻` / `已耗（YYYY-MM-DD…）` | `tools/lib/repository-layout.mjs:41-44`；`checks/gates/script-status.mjs` |
| `何时跑` | 67/68 有（唯一豁免是 `probes/team/read-barrier/index.mjs`，非 `-probe` 后缀）；只对 `-(smoke|probe|audit|check|eval).mjs` 要求 | `repository-layout.mjs:33,41`；`checks/gates/script-triggers.mjs` |
| `成本` / `用法` / `判据` / `不证明` / `为什么` | 22 / 53 / 48 / 7 / 29（共 68），**无门禁**，是惯例不是合同 | 全目录头注计数 |
| 探针执行 | 不在 CI、不在 `pnpm verify/test`；只查头注与索引。keyless `--self-test` 也手动 | `package.json:17-18`；`.github/workflows/ci.yml:32`；`tests/harness/repo/layering.spec.ts:65,108` |

结论：**可复制的硬机制只有「状态 + 何时跑 + 生成索引字节级新鲜度」**；playbook 里
「每支必须写不证明」是应然而非实然（7/68）。

## 4. 生命周期与证据

- 生命周期字段存在但**从未行使**：探针 68/68 `常驻`，0 支 `已耗`；全仓只有两支已耗，都在
  `tools/archive/`。
- 证据没有单一归宿：4 支写 `snapshots/probes/<scene>/<date>`，2 支写
  `runtime/harness-home/probe-evidence`，其余 `mkdtemp`。
- 清理：`tools/prune-runtime.mjs` 清 runtime 探针证据（>7 天）；`snapshots-budget` 封顶
  snapshots 总量；没有「探针证据」专门规则。

## 5. 可移植 / 必须替换 / 不要照抄

**可移植**

- 顶层 `probes/` 作为独立调试目录（company 形态；本仓用户 2026-11-10 定调，S1 采纳）。
- 扫描器 + 渲染器 + **字节级新鲜度门**（`--write` / `--check`）：新增、移动、删除未重生成即红。
- 头注门按字段拆：`状态` 全量、`何时跑` 只对行为后缀，正则校验；门禁自己的头注记录负例实跑。
- 目录即地图：顶层按用途、域按失败面、索引只答「有哪些、在哪」，触发与成本归头注。
- 两档证据纪律：`runtime/` 可清残留 vs `snapshots/` 冻结证据（带预算）。

**必须替换**

- 域名与数量：从本仓接缝推导，不抄 team/fs-taskboard/browser-visual/session-context。
- 索引落点：company 把探针索引塞进 `checks/INDEX.generated.md`；本仓放在
  `probes/INDEX.generated.md`，与目录同根。
- 端口：company 惯例 `--port 0`；本仓 `port-exclusive` 要求每个脚本独占固定端口
  （`scripts/verify/gates/f-repo.mjs:196`），**保留本仓约定**。
- 证据归宿：本仓已有 `runtime/smoke-workspace/`，不新建第二套。

**不要照抄**

- 68 支、每域 23 支的起点；playbook §10 自己也说先三支。
- 把 `成本` / `判据` / `不证明` / `为什么` 当成已被门禁的事实。
- 「已耗」生命周期已被验证的叙事——company 零退休。
- 用 `checks/` 单索引路径承载所有区域。

## 6. 对本仓最有用的三条

1. **组织可借，发现链不可照抄**：company 自己的发现链也只有根布局一行 + 索引 + 一行症状。
   本仓要解决「想不起来用」，必须在任务路由与技能层再加一层。
2. **只机械化确定字段**：`状态`、`何时跑`、索引新鲜度；`判据` / `不证明` 先做头注协议与评审，
   不假装门禁能判语义。
3. **索引是生成物**：头注是唯一事实源，索引只投影；字节级比对是最便宜、最不会漂的门。

## 7. 二轮借镜（本仓根 `probes/` 分域后）

| 还能借的 | 状态 | 落法 / 理由 |
|---|---|---|
| 域计数索引 | **已借** | 索引标题带「（N 支）」；覆盖一眼可见，生成物不漂 |
| 布局存在性门 | **已借** | `entry-chain` 成员加 `probes/README.md`；门牌被删即红 |
| 类型地图（十类） | **已借** | [guides/66 §7.1](../../../../docs/guides/66-probe-playbook.md)；按「证明什么」选型，空白显式 |
| 域 = 共享 harness | **已借** | `behavior/`（真模型行为）/ `browser/`（真浏览器）/ `stream/`（流取证）；新域按 harness 分，不按 unit/integration |
| probe-kit 共享 verdict/check | **暂缓** | 本仓六支各有 harness 与 verdict 形状；再增 2–3 支或出现重复 verdict 再抽，过早统一会捆住场景 |
| `--self-test` 约定 | **暂缓** | 只有 keyless 审计类需要；本仓暂无 keyless 探针，`_index.mjs --check` 已是索引自证 |
| `snapshots/probes/<scene>/<date>` | **暂缓** | 无持久消费者；冻结证据才进 `snapshots/`，先不建空目录 |
| `成本` 字段门禁 | **不借** | company 只有 22/68 有、无门禁；本仓 `档位` 已表达成本 |
| 68 支 / 四域名 / 嵌套 `read-barrier` | **不借** | 规模与形态都不适配本仓；公司自己也把它放在 `probes/team/read-barrier/`，违反域内平铺 |
