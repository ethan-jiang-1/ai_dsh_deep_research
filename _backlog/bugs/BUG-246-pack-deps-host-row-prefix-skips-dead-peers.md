---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-246：`pack-deps` 反向检查跳过所有 `@deepseek-ai/dsh-*`——死 host peer 无法被发现

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（pack 公共行为/门禁触面）
>
> 位置：[checks/lib/repo/pack-deps.mjs](../../checks/lib/repo/pack-deps.mjs) 的 `unusedPeerIssues`（第 75–83 行，
> `hostRowPrefix = '@deepseek-ai/dsh-'` 过滤）；实例 = `peerDependencies` 里的
> `@deepseek-ai/dsh-experimental-client-ui-agent-team`（仅 README 提到，pack 的 src/presets/workers/cordis 无引用）。
> 探索轮 = [搬家残差 II](../issues/2026-11-18-move-residuals.md) A/B。

## 症状

`pack-deps` 的「死 peer」反向判据只检查**非 host-row**：

```js
.filter((name) => !name.startsWith(hostRowPrefix))
```

于是任何 `@deepseek-ai/dsh-*` peer 即使既不被发布物 require/import、也不在随包 YAML 行里点名，
也不会被报。当前 `@deepseek-ai/dsh-experimental-client-ui-agent-team` 只出现在 README 的团队层说明，
pack 的实现/YAML 均无引用——它要么是给团队层预留的 host peer（应显式登记理由），要么是死 peer
（应删除）。两种都不该静默通过。

## 分诊与授权

- 严重级：P2 — 发布 peer 合同的“反向”缺口；不会立刻坏运行，但死 peer 让消费者多装/多满足一个约束。
- 表面 / 边界：发布 peer 闭包 / ② 静态（结构）
- DSH 不变量：fail-loud；peer 集 = 真实消费 ∪ 显式 host-row 理由，不允许“前缀豁免”
- 触及面：pack 公共行为 + 门禁与验收合同
- 授权：等人拍板（pack/门禁触面）
- 批：搬家残差 II（A/B）

## 复现

复现状态：稳定。

```sh
node -e "const p=require('./packages/deep-research-pack/package.json'); console.log('@deepseek-ai/dsh-experimental-client-ui-agent-team' in p.peerDependencies)"  # true
grep -rn 'experimental-client-ui-agent-team' packages/deep-research-pack/src packages/deep-research-pack/presets packages/deep-research-pack/workers packages/deep-research-pack/cordis.patch.yml  # 空
grep -n 'hostRowPrefix' checks/lib/repo/pack-deps.mjs
```

## 根因（已证）

host-row peer（`@deepseek-ai/dsh-*`）是 preset 依赖的 base 行包，行以 `id` 引用、不以包名出现，所以
反向检查对它们“不可判”；实现选择整前缀豁免，而不是「显式 host 行清单 ∪ YAML 点名 ∪ 实现使用」。
结果是死 host peer 与合法 host peer 不可分。

## 牵出的失败类

- 发布面 C2（peer 双份事实）/ C7（前缀豁免）；与 [BUG-232](../_archived/fixed_bugs/BUG-232-row-deps-scope-no-lib-types.md)
  同一模块的“反向”半边。
- 类级方向 = host-row 的合法集来自 `presets/workers/cordis` 的行（或显式 allowlist），不是前缀。

## 修法

1. 去掉前缀豁免，改为：peer 被发布物使用 ∪ 在随包 YAML 行点名 ∪ 在 `HOST_ROW_ALLOWLIST`（带理由）
   ——三者之一；
2. 当前 `experimental-client-ui-agent-team` 若确为团队层 host peer，加入 allowlist 并写明“由 team layer 消费”；
   否则从 peers 删除；
3. 测试：注入一个死 `@deepseek-ai/dsh-foo` peer → 红；合法 host peer + 理由 → 绿。

## 修复判据

- 所有 peers 要么被用/点名，要么在显式 allowlist（带理由）；
- 当前树死 host peer 被点名或删除；`pack-deps.test` / `pack.e2e` 绿；
- 前缀豁免不再作为判据。
