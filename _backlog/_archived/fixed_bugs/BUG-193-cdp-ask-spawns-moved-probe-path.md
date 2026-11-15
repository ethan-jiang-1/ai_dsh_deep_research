---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-193：cdp-ask.entry 启动搬家前的探针路径——真模型档的干预面 spawn 不到文件

> 严重级别：P2 ｜ 发现：2026-11-15 ｜ 状态：已修 — 探针改 `probes/browser/cdp-probe.mjs` + spawn 前缺失 exit 2；分段路径静态守卫（去向：implemented — [批 E Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)，审查：agent — 前置红证 + 静态守卫红绿）（2026-11-16）
>
> 位置：[scripts/smoke/cdp-ask.entry.mjs](../../../scripts/smoke/cdp-ask.entry.mjs) 第 131 行；
> 真件 = [probes/browser/cdp-probe.mjs](../../../probes/browser/cdp-probe.mjs)（2026-11-10 `960f3b88` 探针迁根）。

## 症状

```js
const probe = spawn(process.execPath,
  [join(ROOT, 'scripts', 'probe', 'cdp-probe.mjs'), …])   // ← 该路径不存在
```

`scripts/probe/` 目录早已不存在（探针迁到 `probes/{behavior,browser,stream}/`）。spawn 的 node
进程以 `MODULE_NOT_FOUND` 退出 1，`cdp-ask.entry` 拿不到任何探针输出，最终以断言红收场——而它的契约
是「空闲 Send / 在飞 Queue 双路径 + journal 落盘对账」（BUG-021 的常驻证据）。

## 分诊与授权

- 严重级：P2 — 只影响 dev-only 真模型档入口（registry `tier: dev-only`，keyless CI 不跑），
  但它正是 run 期间唯一可用的「自由消息干预面」验收，坏了没人知道。
- 表面 / 边界：run / ② 行为（子进程入口）——`spawn` 前的前置即最低边界
- DSH 不变量：fail-loud（前置缺席要显式 exit 2，不是断言红）
- 触及面：none（smoke 入口）
- 授权：自授权（P2 修理型修复；本卡只报未修）
- 批：第十轮搬家探索 M3 —— 同批 BUG-191…198

## 复现

复现状态：稳定（keyless 即可证路径死）。

```sh
node scripts/probe/cdp-probe.mjs --help
# Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/scripts/probe/cdp-probe.mjs'
git ls-files | grep cdp-probe
# probes/browser/cdp-probe.mjs
```

真跑该 entry 需要已起的 GUI + 真模型档（未授权），故本卡以「路径 + spawn 位置 + 探针落点」三项为证据。

## 根因（已证）

探针迁根（`960f3b88`）改写了 probes 内部 import，但 `cdp-ask.entry` 用 `join(ROOT, 'scripts','probe',…)`
的分段字面量启动探针——不在 import 图，`smoke-imports` 不跟子进程 argv，`repo-conventions` 只扫 dev shell。

根因证据：`git ls-files` 无 `scripts/probe/*`；`probes/browser/cdp-probe.mjs` 在盘上；
入口第 131 行是唯一 spawn 点；registry 该 entry `tier: dev-only` 解释为何 keyless 车道从不覆盖它。

## 牵出的失败类

- **M3 非 JS 字面量** / C2 消费者遗忘；与 [BUG-192](BUG-192-snapshot-replay-offline-preload-stale-path.md)
  同一类（入口把路径当字符串传给子进程），同一轮两次命中 → 支持「入口脚本的 spawn 路径要有机械扫描」的类修。
- 同机制第 2 次（BUG-192 是第 1 次）。

## 修法

1. 改为 `join(ROOT, 'probes', 'browser', 'cdp-probe.mjs')`。
2. spawn 前 `existsSync` 前置：缺席 → 打印「cdp-probe 探针缺席（路径搬家未跟）」并 `exit 2`。

## 修复判据

- 新路径存在；`node probes/browser/cdp-probe.mjs --help` exit 0（探针自身可启动）；
- 负控：把常量指向不存在路径 → entry 在 spawn 前 exit 2 并点名该常量，而**不是**以断言红或空输出收场；
- `pnpm verify` 绿（`smoke-contract` 的 closed set 不变）。

## 修复关联

去向：implemented — [批 E 搬家副作用 Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)。
修复已进树；本卡同变更归档。真模型档未跑（Y9 未授权）；本卡证据 = 前置负控（常量指回
`scripts/probe/cdp-probe.mjs` → `cdp-ask.entry: cdp-probe 探针缺席（PROBE=…）——路径搬家未跟；
本次未跑（exit 2）`，exit 2）+ 静态守卫红绿。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "scripts/smoke/cdp-ask.entry.mjs",
    "tests/checks/smoke-child-paths.test.mjs"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/smoke-child-paths.test.mjs", "exit": 1, "output": "not ok 1 - 子进程/前置的分段路径字面量全部可解析（BUG-192 / BUG-193 类级守卫）；__child-path-probe.mjs: join(ROOT, 'scripts', 'lib', '__moved-probe__.cjs') -> scripts/lib/__moved-probe__.cjs 不存在" },
  "green": { "command": "node --import tsx/esm --test tests/checks/smoke-child-paths.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/smoke-child-paths.test.mjs" }
}
```
