# 2026-11-16 · 值级 oracle 的边界：ask-user timeout 为什么不该钉死

> 状态：implemented

## 决定

- L2 探针曾记录「改 `lead.patch.yml` 的 `tool-ask-user.timeout: 600 → 601`，全部门禁绿」——判定为**不是缺陷**：该值的**合法性与类型**由 vendor 的 Config schema 在装载期 fail-loud 保证（`vendor/dsh/packages/interaction/tool-ask-user/src/index.ts:25`：`timeout: z.union([-1, z.number().step(1).min(1).max(2_147_483)]).default(120)`），越界/非整数/字符串在 boot 即被拒。600 与 601 都是合法值，属**调参**。
- 因此不加「值等于 600」的断言：那会把合法调参判红，违反「测试描述行为，不描述正确性」（[tests/AGENTS](../../tests/AGENTS.md)）。机械守卫的正确落点 = schema（已在 vendor），不是本文档仓的测试。
- 本仓在值级上保留的判据是**结构**：`preset-structure` 校验行/插件形状，`row-deps` 校验引用的包都在 peerDependencies；值本身交给 schema。

## 输掉的方案

- **把 600 钉进 spec**：拦住一切合法调参（600→601 正是）。放弃。
- **静态扫 vendor zod 键集、断言 preset config 键 ⊆ 它**：能抓「键名写错被 zod 静默忽略」，但要解析 vendor 的 schema 源码，等于在本仓复制一份 schema——升 pin 即漂移。放弃；改为登记触发条件（见下）。
- **给 timeout 加范围断言（1s–1h）**：与 vendor schema 重复，且边界值由 vendor 决定，本仓再写一份就是第二个事实源。放弃。

## 实际跑过的验证

- 探针（L2）：改 `timeout: 600 → 601` → `pnpm verify` 与 `pnpm test` 全绿；语料依据 = 上面的 vendor schema 行（范围/类型由它钉住）。
- 反向确认：schema 的 `.min(1).max(2_147_483)` 意味着 `0`、`2_147_484`、`"600"` 都在装载期被拒——非法值不依赖测试就能 fail-loud。
- **未验证（登记触发条件）**：preset config 键名拼错会被 zod **静默忽略**（zod 默认 strip 未知键）。本仓暂无该形态的实例；一旦出现「配置写了不生效」的真实事故，或升 pin 后 zod 改为 strict，则在 `preset-structure` 加「config 键必须命中 vendor Config 键集」的判据（从 vendor 单文件静态提取，同 diff 登记漂移风险）。
