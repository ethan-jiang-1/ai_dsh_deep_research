---
status: 已结
opened: 2026-10-28
---

# 推敲：FAQ 24 数据面审计后的收口（执行者 / 时间 / 可移植性）

> 立卡：2026-10-28 ｜ 状态：已结（2026-10-28） ｜ 类型：Task ｜ 结论倾向：现在做——P0/P1 落地，P1-⑥ 收窄，P2 按可观察条件延后 ｜ 可关闭：是

**关闭结论（2026-10-28）：** 六处缺口按 D32–D36 收口。P0 全部落地（回执三态、原生时钟、整数契约 + created、
数据卡可移植列）；P1 四项落地、一项复核后收窄（见证链已存在，manifest 不是见证——D36）。
自审轮补了三处回归：schema 形态的见证下界改取 `created`（`epochDateOf`）、manifest 记有效日期 + `schema`、
`schema` 形态缺 `created` 判红。证据 = `pnpm verify` 全绿、`pnpm test` 943、L1 真挂载四角色 ALL PASS、
L2 `release-smoke`/`pack-smoke`/`preflight-smoke`/`run-accept-smoke`/`gates-smoke` ALL PASS、
四角色 fixture 真模型重录后 `snapshot-replay-smoke` ALL PASS（time-context 进比对面，只比注入 turn/step）。
去向：implemented — [Note](../../../notes/implemented/2026-10-28-data-plane-hardening.md)（业务验收 owner = 用户，已确认"授权推进"）。
缺口 6（W/D 同路径）与 P2（随包 audit bin / host 半只读 `bundle_check`）转 [triggers](../../triggers.md)。

**问题与期望结果：** 按 DSH FAQ 24（插件发布与智能体数据平面）对账本仓数据设计后，
发现三处结构缺口 + 三处收尾项（下详）。用户已明确「都修复」。期望结果：**契约能被履行、
时间有原生来源、每条事实能回答「随不随 bundle 走」**，且这些结论有机械把守而不是散文。

**当前情况：** 六个平面（D/C/W/U/S/H/K/X）的映射与承诺本身成立且已机械化（`data-smoke`
证包目录零写入、`e-workspace` 禁 harness-home 化石镜像、`handbook-budget` 按字节守手册注入、
驾驶舱零 localStorage/零新 RPC/`:memory:` 检索）。缺的不是平面，是**执行者、时间与可移植性**。

**未决问题：** 仅 P2 两项（随包只读 audit bin、host 半只读自检工具）是否落地——需下一场
run 的实测证据，不在本卡预支。

**下一步：** 按「验收标准」P0→P1 落地；P2 留待新证据后另立卡。

## 已知与未决

### 缺口 1（最硬）：写契约的是模型，查契约的是开发仓

- 实证（2026-10-28 只读跑 `node scripts/run-gates/schema-scan.mjs`）：archive 契约期 **0/32** 红；
  在飞 **2/2** 全红——`drt_eu-us-cn-ai-stack`（未登记顶层 `leads-eu.md` / `leads-supply.md` +
  `journal.md` 含跨 bundle `[来源:]`）、`drt_cn-open-vs-us-closed-agentic`
  （`drafts/t1-questionlist.md` 含绝对路径 + `journal.md` 跨 bundle `[来源:]`）。
- 结构：第三方插件没有「写时校验」原生位；可用面只有 ①模型可见只读工具 ②宿主 hook（非第三方可移植）
  ③事后 ops。本仓只有 ③，所以 D28 卫生契约在写入侧没有任何反馈。
- 装态更硬：pack README §5 明写审计「开发仓，不随包发布」，而研究手册的完成判据把
  `audit.md` / `delivered.json` 列进交付回执；`accepted` 的收口在 `run-accept` 侧。
  M1 用户手里没有工具能履行这条判据——`data-smoke` 证得了「包不写状态」，证不了「契约可被履行」。

### 缺口 2：模型没有钟，却用日期当 schema 版本

- 手册 §日期最小契约 自认「角色会话无命令执行能力」，用网页日期校准；archive 扫描仍有
  **4 处 journal 未来日期**（2027-04-30 / 2027-09-22 / 2026-11-02 / 2030-12-31）。
- `run.md` 的 `contract: YYYY-MM-DD` 兼任契约纪元，门禁按 `date >= CONTRACT_DATE` 分档；
  日期常量散在 schema-scan / node-gate（leads 2026-10-03、hitl 10-05、heading 10-06、
  audit 10-08、reader 10-23）/ reader-gate 三处。写一个合法的早日期 = 整份核心检查豁免（fail-open）。
- DSH 原生位在位：`@deepseek-ai/dsh-time-context`（vendor `packages/context/time-context`；
  `standard/cordis/ptc` 预设声明，出厂 web 组合不声明）；本仓四个 preset 均未声明。

### 缺口 3：只画了归属与生命周期，没画「可移植性」

- `present` 是会话事件，不随 bundle 走；bundle 内只有 `delivered.json` 的相对标签与
  `run.md` 的 `delivered:` 声明——移交后的 bundle 无法自证「被交付过」。
- `audit.md` / `delivered.json` 的哈希只能从 `$DSH_HOME/sessions` 复算；换机器 / 删日志后不可复核。
- `run.md` 无 `created`；`remote.workspaceFiles` 不给 mtime（50 已把这个坑写明）——
  「这次 run 何时开始」在文件里没有答案。

### 缺口 4：种子的三种所有权没有声明

`seed.json` 只有整表 + 哈希；处置实际上三档分散在代码里：`method-library.md` 永不覆盖、
`.gitignore` 用户所有、其余按哈希 + sidecar。语义上应是**契约类**（跟包版本，漂移 = 契约漂移）/
**语料类**（应生长，包只给底本）/ **用户类**（永不覆盖）。

### 缺口 5：`method-library.md` 的承诺与作用域不一致

被称为「用户研究偏好库」但住在每个工作区（UI 写「方法库（本工作区）」「我的偏好库」）；
工作区可多开是本仓明确支持的形态。DSH 判据：关于「这个人」的 → U/home 或 profile。
面板读不到 `$DSH_HOME`，搬去 home 需要新增 host 半与决策——**先改承诺，不搬家**。

### 缺口 6：两处措辞漂移（低成本）

- `research-workspace/_abandoned/README.md` 写「位置=状态」，与 D28「位置只是操作桶」直接冲突。
- `research-workspace/` 同时是 M2 运行时与包种子源（sync 方向 W→D），且从未被 scaffold 过；
  仅 `pack-workspace-fresh` 在 verify 时把守。**本轮只记不动**（改动面大于收益）。

## 方案与取舍

按三档处置，先便宜后贵：

| 档 | 动作 | 取舍 |
|---|---|---|
| **D0**（本卡） | 回执三态 + `accepted` 归属；接 `time-context`；`schema:` 整数契约 + `created`；数据卡补「可移植」列 | 让契约**可被履行/可被核对**，不新增运行时 |
| **D1**（本卡） | `seed.json` 三类 `policy`；回执 `sourceHashes` + `stale`；method-library 承诺归位 | 契约纪律机械化，改动面在工具与文档 |
| **D2**（本卡以外） | 随包只读 audit bin；host 半只读 `bundle_check` 给 Lead 自愈 | 需新 D 号（D7 第三处例外）、动工具面、重录 snapshot；**等下一场 run 还红不红再决定** |

明确不做（沿用既有决定）：加 storage domain / home 账本；把 run 状态搬进 H；新增 session
event 类型；给驾驶舱加 host 索引或文件尾随；把 run bundle 做成数据库；按 slug 建 home 键
（slug 只在工作区内唯一，未来账本须 `w_<path-hash>` + slug）。

输掉的方案：

- **把 `contract` 日期继续当唯一纪元**：与「模型没有钟」冲突，且早日期 fail-open；
  但整表废弃会打断 32 个契约期 bundle 的判定——改为**整数优先、日期读兼容**。
- **给四个角色加 bash 让它们自己跑门禁**：能力面扩张远大于收益（网络/文件系统 shell），
  且与「角色无命令执行能力」的既有纪律冲突。
- **把 method-library 搬进 `$DSH_HOME`**：面板读不到 home（`remote.workspaceFiles` 只到会话
  工作区），要新增 host 半与新的数据面承诺；需求未证。
- **让 M2 也走 scaffold（D→W 翻转）**：方向正确但改动面覆盖 dev 环、门禁、snapshot 与多份文档，
  本轮不动。

## 验收标准

每条都要有机械证据（红先绿后或等价反证），并同步种子（`dev/sync-pack-workspace.mjs`）。

1. **回执三态**：手册与 NODES 的交付判据写明「有审计工具 → `audit.md` 绿；无工具 → 显式
   `no machine audit (install-only)`，禁止声称 `CRITICAL=0`」；`accepted` 由谁在什么条件下写
   写清（含装态无 run-accept 时的去向）。契约测试断言两处手册副本含该三态标记。
2. **时间原生**：四个 preset 各声明 `@deepseek-ai/dsh-time-context`（peerDependencies 同步、
   `row-deps` 绿）；手册日期契约改为「以 time-context 读数为准，无读数如实说」；
   契约测试在删掉某 preset 的该行时红。
3. **整数契约**：模板写 `schema: 2` + `created:`；`schema-scan` 在 schema 模式不看日期、
   未来版本判红、`schema`/`contract` 全缺判红；`node-gate` 各门断代在 schema 模式下与日期无关；
   `contract` 旧形态读兼容（既有 32 个契约期 bundle 的扫描结论不变）。
4. **可移植列**：pack README 数据卡增「可移植」列（随 bundle / 仅本机 / 可重建），
   形状测试同步；`present` 与回执行的「仅本机」写清。
5. **种子三类**：`seed.json` 每文件带 `policy: contract|corpus|user`；`scaffold --check`
   分开报告「契约类漂移」与「用户已改」；`user` 类永不覆盖的行为不变。
6. **回执 stale（复核后收窄，见 D36）**：见证 = `delivered.json` 的 final/readable/audit 哈希 +
   present 事件，门 A 已复算；`manifest.json` 是目录快照、不是见证，**不新增**全量校验（合法追加会
   被判 stale，且与 delivered 重复见证）。验收改为：数据卡与 README 写清"回执随 bundle、审计仅本机"，
   且 `manifest` 不再被描述为见证。
7. **措辞**：method-library 的承诺改为「本工作区」（手册 / README / 面板文案一致）；
   `_abandoned/README.md` 改为 D28 口径（位置 = 操作桶）。
8. `pnpm verify` 全绿、`pnpm test` 全绿；新增门禁/测试带反证记录；持久决定进 `docs/decisions.md`
   与 `notes/implemented/`；本卡与 Note 互链。

## 落地记录（2026-10-28）

| 条 | 结果 | 证据 |
|---|---|---|
| 1 回执三态 | 已交付 | 手册 §交付与审查终局 + 完成判据；`data-plane-invariants` 断言两处副本含 `no machine audit (install-only)` |
| 2 时间原生 | 已交付 | 四 preset 时钟行 + peer dep；`preset-structure` 先红后绿；gates-smoke `preset-structure-clock-missing` |
| 3 整数契约 | 已交付 | 模板 `schema: 2` + `created`；`schema-scan`/`node-gate` 断代；**自审补 `epochDateOf`**（新形态见证下界取 `created`，防 present/见证扫描丢下界）；四例 + 三形态 + charter 同源 |
| 4 可移植列 | 已交付 | README 数据卡 10 列；`data-plane-invariants` 形状锁；65 §2 可移植段 |
| 5 种子三类 | 已交付 | `seed.json.policy`；scaffold/preflight 标注；seed-core / workspace-audit 增例 |
| 6 回执 stale | **收窄** | D36：见证已由 `receiptProblems` 覆盖；manifest 不是见证，不新增校验 |
| 7 措辞 | 已交付 | 手册/种子方法库标题；`_abandoned/README.md` 改为 D28 口径 |
| 门禁与证据 | 已交付 | `pnpm verify` 全绿；`pnpm test` 943 pass；L1 `DSH_SMOKE_REAL=1 preset-smoke` 四角色真挂载 ALL PASS；L2 `release-smoke` + `pack-smoke` + `preflight-smoke` + `run-accept-smoke` + `gates-smoke` ALL PASS；生成物同步 |

**快照重录（2026-10-28 收口）：** 四角色 fixture 用真模型重录；`time-context` 进比对面，判据 =
**注入的 turn/step**（载荷是墙钟，逐字不可复现——理由写进 [snapshots/README](../../../snapshots/README.md)）；
C 金标准 `--update-expected` 重写并人审（只差 lead 一句总结措辞）。`snapshot-replay-smoke` ALL PASS。
未做（转触发器）：P2 随包 audit bin / host 半 `bundle_check`；缺口 6 的 W/D 同路径结构面。

## 关闭条件（已满足，2026-10-28 归档）

验收标准 1–8 满足；`去向：implemented — [Note](../../../notes/implemented/2026-10-28-data-plane-hardening.md)` 已记录；
业务验收（"契约可履行"的产品承诺）由用户确认（2026-10-28「授权推进弄好」）。
缺口 6（W/D 同路径）与 P2（随包 audit bin / host 只读 `bundle_check`）已移交 [triggers](../../triggers.md)。
