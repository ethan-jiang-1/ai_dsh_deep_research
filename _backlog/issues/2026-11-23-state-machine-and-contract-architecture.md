---
status: 待落地
opened: 2026-11-23
---

# 实施计划：结构治本——Hook 纯状态机抽干、判别联合收紧与防御模式内化

> 立卡：2026-11-23 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：implemented — `notes/implemented/2026-11-23-state-machine-and-contract-architecture.md`；业务验收：用户
> 研究依据：[预防试点后缺陷复盘调研](../research/post-pilot-bug-prevention-and-discovery/README.md) · [代码实践调研](../research/post-pilot-bug-prevention-and-discovery/2026-11-23-defensive-and-contract-coding-practices.md) · [实证基线](../research/post-pilot-bug-prevention-and-discovery/2026-11-23-empirical-baseline-and-issue-plan.md)

**问题与期望结果：** 仅靠外部工具和后验测试仍是在“写完再抓”；从根本上减少 bug 生成，必须让数据结构本身使“非法状态不可表示”。目前 `useStatusFeed.ts`（414 行）等 Hook 把异步副作用与 13 个分散 `useState` 耦合在一起，`BriefInputs`（17 个散可选字段）与 `deriveSteps` 允许调用方传入互相矛盾的布尔值，`readArtifact` 返回 `json: unknown` 让下游各自猜测字段，且模型 skill/模板样例与门禁 parser 仍需手动同步。期望完成结构级治本，同时按 [discipline-map.md](../../docs/discipline-map.md) 原定触发将 `vendor/dsh` 防御模式清单本地化。

**当前情况：** `packages/deep-research-pack/src/` 已扩展到 114 个 `.ts/.tsx` 文件，触发了 `docs/discipline-map.md` 第 189 行的重估条件（*「本仓 TS 面扩大到需独立缺陷模式清单时」*）。前置保护依赖于 [Issue 1](../_archived/settled_issues/2026-11-23-static-semantic-guardrails.md) 与 [Issue 2](2026-11-23-l0-client-and-property-testing.md) 提供的 L0 回归护栏。

**未决问题：** `BriefInputs`、`deriveSteps`、`readArtifact` 属于包内导出/跨测试接口，收紧类型时需同步更新所有合法调用方和测试夹具（不保留两套平行旧接口）。

**下一步：** 原则上在 [Issue 2](2026-11-23-l0-client-and-property-testing.md) 建立 Hook+jsdom 行为回归护栏后启动，确保重构零行为退化；每阶段独立小步提交。

## 已知与未决

- **前置依赖**：强烈建议 Issue 2 的 Hook/Tab 测试到位后再动手抽干 `useStatusFeed`/`useGraphFeed`/`useConfigFeed`，避免“无网高空走钢丝”。
- **已有先行先例**：`pack-production-prevention` 的 D 切片已验证“单一解码器 + 位置诊断”在 `plan-index` 上的可行性；本卡把同款哲学推广到 JSON 工件解码、状态折算与 Hook 状态机。

## 方案与取舍

| 候选 | 取舍 | 理由 |
|---|---|---|
| Hook 抽干（Humble Object：`reduceStatusState` 纯 Reducer 状态机 + <80 行薄 Hook + `collectStatusNotices` 数据驱动渲染） | **选** | 一次 dispatch 保证原子一致性，消灭 13 个分散 `useState` 撕裂与 `ResearchStatusTab` 7 遍重复告警 JSX |
| `BriefInputs` / `deriveSteps` 改强判别联合 + `readArtifact` 支持 Typed Schema 解码器 | **选** | 让非法组合与未校验 JSON 访问在编译期报错，贯彻 *Make Illegal States Unrepresentable* 与 *Parse, Don't Validate* |
| 落地「Skill / 模板 ↔ Parser 双向契约扫描器」 | **选** | 把 P3 手写 `contract-fixture` 自动化为全仓双向对账，防模型产出与门禁再次漂移 |
| 本地化吸收 `vendor/dsh/docs/defensive-patterns/` 关键规则 | **选** | 对接 *One value states one fact* 等已踩坑条目，并与 Issue 1 静态扫描互补 |
| 用结构化数据库/JSON 完全取代 Markdown run bundle | **不选** | 改变公开产物格式与人类可读性合同，代价过大（延续 D 切片否决结论） |

## 判据形状

- **权威事实**：各页面状态唯一权威 = 纯 Reducer 状态机输出；JSON 工件类型唯一权威 = 边界 Schema 解码器；产物契约唯一权威 = 模板/Skill 样例与对应门禁共享约束。
- **读取方**：`ResearchStatusTab`、`ResearchGraphTab`、`ResearchConfigTab`、`ResearchFinalTab`、L0 单测、浏览器真入口（`cockpit-truth*.entry.mjs`）、双向契约扫描。
- **坏输入**：互斥布尔组合 / 缺字段 JSON / 模板样例字段漏掉或偏离门禁要求 → 编译期类型错误或双向扫描红。
- **旧形态**：删掉 `BriefInputs` 冗余散字段（如 `reviewFail: boolean|null` 与 `reviewUnconfirmed`/`reviewConflict` 并存的拆平字段）、删掉 `ResearchStatusTab` 重复 7 遍的告警 JSX 与手写正则复制，不保留双套兼容。
- **反证**：在类型收紧与 Reducer 抽干后，Issue 2 的全部恶意 `RunSource` 故障矩阵、PBT 与现有浏览器真入口必须全部绿；人为在模板样例删掉必填字段或删掉某个状态分支时，分别在扫描器与 `tsc` 红。

## 验收标准

| 行为 | 类 | 输入/状态 | 通过/失败信号与独立期望 | 负控/恢复 | 证据 owner | 人工判断 |
|---|---|---|---|---|---|---|
| 1. Hook 纯状态机抽干与 UI 数据驱动 | 确定性 + 编排 | `useStatusFeed`、`useGraphFeed`、`useConfigFeed`、`ResearchStatusTab` | 异步状态跃迁全部收进纯 Reducer 并有直测；Hook 仅负责订阅/定时器/abort/dispatch；重复告警条改为纯函数列表 `.map()` | 保留 Issue 2 全部 Hook+jsdom 行为测试与 `cockpit-truth*.entry.mjs` 浏览器真入口全绿；抽干后分支逻辑可不挂 React 独立红绿 | `packages/deep-research-pack/src/lib/` 新纯状态机、对应 `.spec.mjs`、既有 `cockpit-truth*.entry` | 无 |
| 2. 判别联合收紧与边界解码器 | 确定性 | `deriveSteps`、`deriveBusinessBrief`、`readArtifact`（`delivered.json`、`readiness.json`、`claims.json` 等） | 非法组合（如 `unknown` 与 `done` 分家、冲突与 pass 共存、`json: unknown` 直访）在 `tsc` 编译期即红 | 尝试向 `deriveBusinessBrief`/`deriveSteps` 构造互斥状态或绕过 decoder 访问 `json` → `pnpm typecheck` 报红 | `src/lib/`、`pnpm typecheck`、`pnpm test:spec` | 确认公共导出签名调整范围 |
| 3. Skill/模板 ↔ Parser 双向契约扫描 | 确定性 | `presets/*/skills/*/SKILL.md`、`content/templates/run/*` ↔ `checks/lib/gates/` | 自动抽取样例并过对应门禁/parser，字段双向对账零漂移 | 故意在某 skill fenced 样例漏写必填字段或在门禁加未写入模板的字段 → 扫描红 | `tests/contracts/` 或 `checks/verify/` 新守卫 | 无 |
| 4. 防御模式本地化落地 | 文档/规则 | `docs/discipline-map.md` 与本仓开发/评审指引 | `discipline-map` 第 189 行重估落定（标记采纳/适配规则落点），与 Issue 1 静态检查形成“文档少量规则 + 机器强制把关”闭环 | `pnpm verify`（含 `align-ledger` / `discipline-state-vocab` / `doc-budgets`）全绿 | `docs/discipline-map.md`、相关指引与 `verify.mjs` | 用户验收整体结构收益与维护成本 |

## 实施顺序与停损边界

1. **P0 类型与接口设计**：先冻结 `deriveSteps`/`BriefInputs`/typed `readArtifact` 的判别联合接口及旧测试迁移清单（同步更新 `tests/` 中旧构造输入，不削弱原有行为断言）。
2. **P1 边界解码器 + 双向契约扫描**：先让 `readArtifact` 支持带 Schema 解码器并落双向契约扫描（先抓现有 skill/模板样例是否已有轻微漂移）。
3. **P2 Hook 抽干（一 Hook 一提交）**：依次抽干 `useStatusFeed` → `useGraphFeed` → `useConfigFeed`，每步必须跑通 Issue 2 的 Hook+jsdom 测试与对应 `cockpit-truth*.entry.mjs` 浏览器真入口。
4. **P3 防御清单本地化与收口**：更新 `docs/discipline-map.md` 等，跑全量 `pnpm verify` / `pnpm test` / `pnpm typecheck` / `pnpm build`。
5. **停损**：若某一 Hook（如 `useConfigFeed` 含复杂指令发送队列）抽干后收益不抵复杂度，在验证 `BriefInputs` 类型收紧已完成的基础上可将该单个 Hook 的 Reducer 化独立记录残余理由，不为了“整齐”硬改低风险代码。

## 关闭条件

全部 4 条验收标准有实测命令与反证结果，[notes/implemented](../../notes/implemented/README.md) 落地对应 Note，用户完成验收后本卡同变更归档至 `_archived/settled_issues/`。
