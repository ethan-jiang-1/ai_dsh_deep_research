---
status: 已定性
opened: 2026-11-14
---

# D55 验证层 Oracle 落地复盘与缺口取证：来龙去脉、实测反例与收口方案

> 状态：已定性
> 问题：已归档卡 [2026-11-14-verification-oracle](../../settled_issues/2026-11-14-verification-oracle.md)（D55，`a3c98989..42b589e7`）从何而来、原本要终结哪类结构病灶、实际交付在哪些面上流于形式，以及在打包零运行时依赖与 `layering` 门禁约束下如何真正闭环？
> 消费者：用户本轮审查委托；落地消费者 = [已结卡 2026-11-14-verification-oracle-hardening](../../settled_issues/2026-11-14-verification-oracle-hardening.md)；收益落点 = [decisions.md#d55](../../../../docs/decisions.md#d55)、[guides/67](../../../../docs/guides/67-test-strategy.md)、`packages/deep-research-pack/src/lib/`、`scripts/lib/`、`scripts/verify/gates/`、`tests/`
> 产出的卡：[2026-11-14-verification-oracle-hardening](../../settled_issues/2026-11-14-verification-oracle-hardening.md)
> 结论：D55 诊断准确（终结「手写子集解析器 + 自证单测 + 散文守卫」导致的第 6–9 轮同类复发），但首轮交付在五个面上只做了外围补丁而未触及根因：① Markdown 遮罩仍保留两份约 90 行手写状态机副本，5 类相邻 CommonMark 输入与 `mdast` 分歧，录制器自身含 UTF-16/码点错位 bug；② CI 工作流漏做写入侧规范 `run:` 门、保留 360 行手写 YAML 状态机、`BUG-190` 为假 `external` 关闭（删 `parseEvents` 仍全绿）；③ `fix-evidence` / `backlog-liveness` / `guard-red-record` 存在 4 条绕过链与 1 条死正则（`conformance.test.mjs` 全仓零命中）；④ `guard-ledger` 与 `asset-ledger` 在 10 个测试文件（11 条 BUG）上 `oracleType` 直接自相矛盾，且缺 `class`/`cost` 与 `guides/67` 同步；⑤ S1 多处用源码字面 grep 冒充行为守卫、`BUG-013/080` 缺五角色快照 B 层 keyless 内容对账、普查 D-2（17 卡）与探索批 A–C（24 卡）账本蒸发。实测确认 Node `v22.23.1` 原生支持 `.ts` 直引、仓内 `.pnpm` 已有 `mdast-util-from-markdown@2.0.3` 与 `yaml@2.9.1`，五分片闭环方案在现有架构约束下完全可行。
> 归档：2026-11-14

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-14-d55-provenance-and-oracle-audit.md](2026-11-14-d55-provenance-and-oracle-audit.md) | D51→D55 因果链、架构约束实测、五大缺陷面逐项复现输出、D-1/D-2/批 A–D 全账对账与五分片方案对比 | 2026-11-14 |
