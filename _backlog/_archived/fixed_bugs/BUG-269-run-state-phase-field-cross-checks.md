---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-269：run.md 的 next/delivered/parked 只做“非空/终态”浅检——active phase 可写 `next: none`

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：run.md phase×next/delivered/parked 矩阵
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：`checks/lib/gates/schema-scan-core.mjs:244–253`（`next` 只正则非空；`delivered` 只在 accepted
> 阶段判 none）；模板 = `content/templates/run/run.md:8–11`（next 可执行；delivered 指针；parked 原因/复活）。
> 探索轮 = [20 卡低置信区](../settled_issues/2026-11-18-low-confidence-20.md)。

## 症状

`run.md` 状态头只有一个浅检：

```js
if (!/^\s*[-*]?\s*next\s*[:：]\s*\S/m.test(run)) core.push('run.md 缺 next（D28）')
...
if (phase === 'accepted' && (deliveredValue === '' || /^none$/i.test(deliveredValue))) core.push(...)
```

因此：

- `phase: research` + `next: none` → 通过（“下一步”不可执行，run 卡死）；
- `phase: delivery` + `delivered: none` → 通过（交付段没有回执指针）；
- `phase: research` + `parked: 用户暂停` → 通过（非停放期有停放原因）；
- `next` 可以写任意垃圾（非空即可），不校验是否可执行/与 phase 一致。

## 分诊与授权

- 严重级：P2 — 状态头的“下一步/交付/停放”是恢复与交付的入口，当前只有非空/终态浅检。
- 表面 / 边界：run 状态 / ② 静态
- DSH 不变量：fail-loud；状态字段必须与其 phase 一致
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
sed -n '244,253p' checks/lib/gates/schema-scan-core.mjs
# 临时 run.md: phase research / next none → scanBundle core []
# 临时 run.md: phase delivery / delivered none → core []
# 临时 run.md: phase research / parked 用户暂停 → core []
```

## 根因（已证）

`scanBundle` 只对 `accepted` 的 `delivered: none` 做一项交叉；`next`/`parked`/`delivered` 没有 phase
矩阵。`run.md` 注释里的“可执行/非交付期 none/非停放期 none”只活在散文。

## 牵出的失败类

- 语义 C2（状态矩阵无消费者）+ C7；与 270（URL 字段）同族。
- 类级方向 = phase × state-field 矩阵：active 段 next≠none；delivery 段 delivered≠none；
  parked 段 parked≠none；非对应段必须 none。

## 修法

1. `scanBundle` 加 phase × next/delivered/parked 矩阵；
2. `next` 允许值：`HITL1/HITL2/none/可执行短句`，至少禁止 active 段 none；
3. 测试：上述三种矛盾 → 红；一致 → 绿；
4. 旧场按断代（无 run.md）。

## 修复判据

- phase 与 next/delivered/parked 矛盾 → 红；一致 → 绿；
- 旧场不误伤；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/schema-scan-core.mjs",
    "tests/run/gates/schema-scan.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/schema-scan.spec.mjs",
    "exit": 1,
    "output": "not ok 31 - phase 与 next/delivered/parked 矛盾 → 核心违约（BUG-269）"
  },
  "green": {
    "command": "node --test tests/run/gates/schema-scan.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/schema-scan.spec.mjs"
  }
}
```
