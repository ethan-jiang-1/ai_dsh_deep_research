---
topic: bare-path 裸路径死指针盘点
intent: 为 company 钉版复核 Note「盘点后定」候选 bare-path 提供审计结论与处置决定（不立门禁；16 条真断链已清偿/裁定）。
---

# live 文档反引号裸路径死指针盘点（2026-10-10）

> 服务 = [company 钉版复核 Note](../../../notes/implemented/2026-10-09-company-repin-review.md)
> 「盘点后定」候选（company 同款盘点实测 21.3% 死指针率）。方法 = 只读脚本扫 tracked .md 的
> inline code span（剥 frontmatter/围栏块），三级解析（相对所在目录 → 仓库根 → vendor/dsh
> 前缀回退）+ 盘上存在性判活；死后按同名/同主干/历史归因。判定规则与豁免类全录于
> [钉版复核会话报告]（本材料为其持久化结论——脚本与全量 JSON 是抛弃型产物住 /tmp，不复现
> 依赖它们；判定规则本身在本节已足够重建）。审计快照 = `06686f8` 干树（431 篇唯一 .md）。

## 总账

| 段 | 文件 | 引用 | 死 | 率 | 浅/真断链 |
|---|---|---|---|---|---|
| **主范围（live 合同面）** | 32 | 630 | 193 | **30.6%** | 177 / **16（2.5%）** |
| 宽范围（全部 tracked .md） | 237 | 727 | 234 | 32.2% | 215 / 19 |
| notes/ | 123 | 1004 | 552 | 55.0% | 469 / 75 |
| _backlog/ | 71 | 372 | 208 | 55.9% | 158 / 45 |

- **浅引用（177，28.1%）= 大头且非断链**：pack 省前缀 ≈75（`src/client`/`presets/<role>.patch.yml` 类，包内语境可读）、bundle 相对名 ≈45（`final`/`review.md`/`drt_*`）、脚本名 ≈13、子树目录名 ≈15、运行态 4、产物 glob 5——本仓书写风格，强判 = 恒红或白名单膨胀。
- notes/_backlog 的高 X 率是**外指残渣上界**（方法论源仓产物名、company 仓布局、OSS 文件树）——本仓断链判断以主范围为准。
- company 21.3% 口径未知，对照只定性；两边数字都不当管理指标用。

## 真断链 16 条的逐条裁定与清偿

**改写清偿 ×7**：
1. `docs/00-index.md`：`packages/preset/agent-presets` 复数笔误 → `agent-preset`（实包名单数）；
2. `docs/discipline-map.md`：`vendor/README.md` 缺 /dsh 段 → `vendor/dsh/README.md`；
3. `docs/design/10-architecture.md`：`tool-agent-team/README.md` 补全 → `packages/experimental/tool-agent-team/README.md`；
4. `docs/AGENTS.md` ×2 + `docs/discipline-map.md` ×1：`.i18n.yaml` / `website/.generated/` 为 vendor 侧机制/产物，注记"产物不入库"消歧；
5. `docs/guides/60-dev-loop.md:3-5`：幽灵引用——`2026-09-23-dsh-inround-task-surface.md` 在本仓全历史、company 钉版树（`59551f2`）均不存在（审计 + 本轮 `ls-tree` 复核双证），"轮内任务面"真实权威 = D11/D20 台账行 + [Backlog 方法论吸收 Note](../../../notes/implemented/2026-10-09-backlog-methodology-absorption.md)，已改指。

**裁定不改 ×9**（机械规则的边界误报，留档免得复扫再报）：
- `research-workspace/drt_<slug>/` 占位符 ×7（00-index ×2、design/10、design/50、discipline-map、guides/61、project-map）：`drt_<slug>` 是模式 token 不是字面指针——位置=状态语义（在飞根 / `archive/` 已交付）各行都在或由 D17 承载；当前无在飞 run 属合法状态，非断链；
- `docs/evaluation.md:54` 的 `src/lib/session-v5.ts`：align-ledger 行反证记录里的**假想探针产物**（"造 X 时门禁照旧全绿"叙事），非指针；
- `notes/README.md:24` 的 `notes/intents.md`：退役自注（"2026-10-04 退役——冻结存档"），良性。

宽范围多出的 5 条 X（.agents/skills/ 四件技能文档）= 同款 `drt_*` 占位符与 `presets/<role>/README.md` 约定表（"可选但推荐"的将来形态），同裁定不改。

## 处置决定：**不立通用 bare-path 门禁**

按「有消费者才建」纪律，三条理由：
1. **无消费者**：真断链里的 vendor 源移位类已有 align-ledger 门禁覆盖（`session-v5.ts` 类正是其设计目标），bare-path 门禁与之重叠——先划界防双门禁打架；
2. **存量太小**：真断链仅 16 条且已清偿/裁定归零，门禁防"再犯"，先清偿再观察；
3. **浅引用是风格**：177 条浅引用在包内语境可读，强判 = 恒红或大量白名单维护。

重启条件（登记）：若未来真断链复发且现有门禁判不到，立窄门禁——只钉主范围、只判 X 类、浅引用显式白名单，按 [writing-a-gate](../../../.agents/skills/writing-a-gate/SKILL.md) 带反证。
