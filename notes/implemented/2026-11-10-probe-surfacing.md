# 探针凸显化：根 `probes/`、生成索引与头注门（已落地）

> 状态：implemented
>
> 首提 2026-11-10 ｜ 卡 [探针凸显化](../../_backlog/_archived/settled_issues/2026-11-10-probe-surfacing.md)（已结，用户验收 2026-11-10） ｜
> 研究 [probe-surfacing](../../_backlog/_archived/research/probe-surfacing/README.md) ｜
> 指南 [guides/66](../../docs/guides/66-probe-playbook.md) ｜
> 目录 [probes/](../../probes/README.md) ｜ 索引 [INDEX.generated.md](../../probes/INDEX.generated.md) ｜
> 门禁 [`probe-registry`](../../scripts/verify/gates/f-repo.mjs) ｜
> 技能 [using-a-probe](../../.agents/skills/using-a-probe/SKILL.md)

## 决定

**探针从 `scripts/probe/` 迁到根 `probes/`，并配「头注 → 生成索引 → 字节级门」的保鲜链与
任务路由/技能回忆层。** 用户 2026-11-10 定调：方向可以、探针必须在仓库根部（像 company 的
`probes/`），且 agent 一进来就要知道它在哪；不要靠人记。

- **目录**：根 `probes/`（与 company 同名）；`git mv` 保留历史；六件资产 =
  五支 `*-probe.mjs` + 一支 `llm-stream-tee.cjs` 仪器。`scripts/` 不再承载探针。
- **分域**：`behavior/`（真模型行为）/ `browser/`（真浏览器）/ `stream/`（流取证仪器）；
  域 = 共享 harness + 证据来源 + 失败模式。用户追加「目录会发展」，所以先分域；新域按 harness 增，
  不按 unit/integration 分。
- **头注协议**：每支探针前 16 行必有 `状态` / `一句话` / `何时跑` / `档位` / `判据` / `不证明`
  六字段（`为什么存在` 推荐）；字段只判在场，语义归评审。
- **生成索引**：`scripts/lib/probe-index.mjs` 纯函数（递归扫描/解析/按域渲染）+ `probes/_index.mjs`
  （`--write` / `--check`）；`probes/INDEX.generated.md` 按域分组并带域计数，头注是唯一事实源。
- **门禁**：`probe-registry`（f-repo）查头注六字段 + 索引字节一致 + `probes/README` 链接索引；
  零探针即红。登记 = `context.gates` + evaluation §L0 + `gates.e2e` 案例
  `probe-registry-missing-header`。
- **回忆层**：`docs/guides/66-probe-playbook.md`（定义/选择/新增/证据/边界）、
  `.agents/skills/using-a-probe/SKILL.md`（description 每轮进目录）、根 `AGENTS.md` 布局独立一行 +
  「证据匹配面」一句、`00-index` 先分流行、`project-map` 任务矩阵/症状表/词汇表、guides/60 §2 任务行、
  `terms.md` 词条、`evaluation.md` 一句「不是第六个评估面」。
- **边界适配**：不搬 68 支/company 四域名/65 道门/`--port 0`；本仓三域按自己的 harness 分；
  探针端口仍由 `port-exclusive` 守；真模型探针不进 CI；一次性实验留 `_backlog`/`notes`，
  复现第二次才升格。

迁移的机械面：`smoke-contract` 扫描面扩到 `scripts/` 各组 + `probes/` 各域（`REAL_MODEL` 路径
改仓根相对）；`navigability` lib 消费图加 `probes/`；`layering` 驱动面禁令加 `probes/`；
`port-exclusive` 与 `host-paths` 的扫描/豁免面加 `probes/`；`no-unused-code` 扫描根加 `probes/`。

**前置适配（实跑发现）**：无参实跑四支行为探针时，ambient `DSH_HOME=~/.dsh` 让它们 boot 平台
home 后以 exit 1 崩——违反「未 source 自拒 exit 2」。加 `isDevHome` / `requireDevHome`
（`env.mjs`）：只认 `runtime/harness-home` 或 `DSH_DEV_HOME` 隔离实例；ambient 平台 home → exit 2
自拒，不 boot。直测 = `tests/run/env-credentials.spec.mjs`。

## 输掉的方案

- **只加指南、目录继续住 `scripts/probe/`**：改动最小，但用户明确要根目录的可见性；探针仍是
  「检查逻辑里的一个子目录」，agent 不会把它当调试第一入口。否决。
- **照 company 的 68 支 / 四域名 / 65 门规模起步**：本仓只有六支；域名是 DSH 形态不是
  本仓接缝。改为本仓自己的三域（behavior/browser/stream）。
- **先平铺、≥8 支再分域**：用户 2026-11-10 追加「目录会发展」；域 = 共享 harness 的分法在六支时
  已经成立，拖到 8 支只会让根目录继续堆。分域成本低，先分。
- **手维护 `scripts/README` 探针表**：company 的教训就是手写清单必漂；本仓也没有门禁能咬住
  「新增探针漏登记」。改为生成索引 + 字节级门，README 只做指针。
- **`--port 0`（playbook 推荐）**：与本仓 `port-exclusive` 的独占固定端口约定冲突；保留本仓约定。
- **把 `判据` / `不证明` 的语义交给门禁**：语义不可机械判定；只要求字段在场，内容归评审。
- **真模型探针进 CI**：成本与凭据不成立；靠 `何时跑` 头注与人工触发。

## 实际跑过的验证

- `pnpm verify`：全绿（含 `probe-registry`、`gate-ledger-sync`、`md-links`、`doc-budgets`；
  根 `AGENTS.md` 140/140 行）。
- `pnpm test`：**1100/1100 通过**（含 `smoke-contract` 双区闭集、`navigability` lib 消费图、
  `layering` 驱动面禁令、`probe-index` 纯函数直测）。
- `node scripts/smoke/gates.e2e.mjs`：**全绿**（零注入对照组 + 107 个注入案例均点名报红）；
  新案例 `probe-registry-missing-header` 单独跑绿。
- `node probes/_index.mjs --check`：一致（六支）。
- **红证（索引失鲜）**：临时在 `INDEX.generated.md` 末尾加一行 → `verify --only=probe-registry`
  报 `probes/INDEX.generated.md 与目录不一致`（exit 1）；还原 → `--check` 绿。
- **红证（缺头注）**：`gates.e2e --case=probe-registry-missing-header` 删 `cdp-probe` 的
  `何时跑` → 门禁点名红；案例组绿。
- **冷读**：fresh-context agent 只看根目录 + `AGENTS.md` + `00-index.md` → PASS：能指出根
  `probes/`、索引、指南与「单点机制用探针」。当时的缺口 = 两份入口只有泛化「模型行为」，
  未点「不按纪律」；已补 `AGENTS.md` 证据匹配面「含模型不按纪律」、`00-index` 行
  「模型不按纪律/角色」、`probes/README` 一条 `discipline-probe` 命令示例。
- **无参前置实跑**：四支行为探针在 ambient `DSH_HOME=~/.dsh` 下修复前 exit 1（boot 平台 home）；
  加 `requireDevHome` 后 exit 2 + 明确「不是开发 home——先 source dev/env.sh」；`cdp-probe` /
  `llm-stream-tee` 无参均 exit 2（用法）。证明导入/ROOT 与 verdict 契约在迁域后仍成立。
- **全量探针实跑（2026-11-10）**：
  - `entry-chain-probe` **ALL PASS**（Q1 授权范围、Q2 RFC 条件、Q3 guides/60 路由；留档
    `runtime/smoke-workspace/entry-chain-probe-2026-11-10T14-16-47-918Z.md`）；
  - `rerun-triage-probe` **ALL PASS**（a–e 五条；空工作区 + 自建已交付 bundle）；
  - `method-library-probe` **ALL PASS**（D40 空工作区；零工具 prompt；Q2/Q3 接受「未核实」诚实态，
    只拦编造条目/假称已执行）；
  - `discipline-probe` **ALL PASS**（5 场景：a2-escalation / b1-diff-questions /
    acceptance-missing-file / acceptance-unverifiable / hitl1-plan-card）；
  - `cdp-probe` verdict：`booted=true` / `frameMounted=true` / `statusPaneOpen=true` /
    `expectFaceHeld=true`，`consoleProblems=[]`、`exceptions=[]`；
  - `llm-stream-tee --port 3083` 预检 exit 0（打印 attach 命令）。
- **D40 适配（实跑发现）**：`method-library-probe` / `rerun-triage-probe` 引用了已删除的
  `packages/deep-research-pack/workspace` 与 `scaffold.mjs`；改为空工作区 / 自建 bundle。
  `method-library-probe` 的 Q2/Q3 在零工具下接受「未核实」诚实态，只拦编造条目与假称已执行。
- **用户验收**：2026-11-10「可以，不错，我们探针已经开始用起来了」；卡与研究题同日归档。
- **未跑**：完整研究 run。
