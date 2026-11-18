---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-264：topics 的重复 T# 被 Map 静默覆盖——后出现的 role/lenses 顶掉先出现的

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：[checks/lib/gates/findings-core.mjs](../../checks/lib/gates/findings-core.mjs) 的
> `parseTopicsOf`（`topics.set(h[1], cur)`）；消费 = `findings-core` / `node-gate` 的 coverage/lens。
> 模板 = `content/templates/run/topics.md`。探索轮 = [20 卡低置信区](../issues/2026-11-18-low-confidence-20.md)。

## 症状

`parseTopicsOf` 用 `Map` 以 `T#` 为键；两个 `## T1` 时后者覆盖前者，无任何报错。实测：

```text
## T1
- scope_role: primary
## T1
- scope_role: comparison
→ Map<T1, {role:'comparison', lenses:[]}>
```

后果：

- 第一个 T1 的 `lenses` 丢失，`findings` 的 lens 差集少一整个 topic；
- 第一个 T1 的 `primary` 被 `comparison` 顶掉，L2 覆盖要求改变；
- 重复本身不可能被任何门发现。

## 分诊与授权

- 严重级：P2 — topic 主键重复导致覆盖/lens 集合静默变化。
- 表面 / 边界：topics 合同 / ② 静态（ID 唯一性）
- DSH 不变量：fail-loud；重复主键不得静默覆盖
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
node --input-type=module -e "
import {parseTopicsOf} from './checks/lib/gates/findings-core.mjs';
console.log([...parseTopicsOf('## T1\n- scope_role: primary\n## T1\n- scope_role: comparison\n')]);
"
# → [['T1',{role:'comparison',lenses:[]}]]（第一个消失）
```

## 根因（已证）

`Map.set` 无条件覆盖；没有 `seen`/重复判据。与 findings F#（263）同族。

## 牵出的失败类

- 语义 C2（主键重复）+ C7（覆盖不报）；与 263 同族。
- 类级方向 = ID 唯一性判据统一；Map 构建时发现重复即记 issue。

## 修法

1. `parseTopicsOf` 返回 `{topics, duplicates}` 或抛 issue；重复 T# → 红；
2. 归一化 `T01`/`T1`？按契约禁止前导零或归一；
3. 测试：两个 T1 → 红；T1/T2 → 绿；
4. 与 findings F# 同变更。

## 修复判据

- 重复 T# → 红；唯一 → 绿；旧场按断代；`pnpm test` / run-gates 绿。
