---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-195：gates.e2e 的 `--jobs` 不校验——非法值 0 个案例真跑，却报「N 处失败 - undefined」

> 严重级别：P2 ｜ 发现：2026-11-15 ｜ 状态：已修 — `--jobs` 正整数校验（非法 exit 2）+ 有界并发 fail-loud（去向：implemented — [批 E Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)，审查：agent — 旧解析红 / 新解析绿 + CLI 实跑）（2026-11-16）
>
> 位置：[scripts/smoke/gates.e2e.mjs](../../../scripts/smoke/gates.e2e.mjs) 第 146–147 行
> （`Math.max(1, Number(...))`）与 `mapLimit`（第 85–96 行）。

## 症状

```sh
node scripts/smoke/gates.e2e.mjs --jobs=abc --case=md-links-redirect-stale
# gates.e2e: 1 处失败：
#   - undefined
# 临时目录保留复查：/var/folders/…/gates.e2e-…（两个空壳临时目录）
# exit 1
```

全量跑同判：**108 个案例一个也没跑**，却报 108 条 `- undefined` 失败，并以 1 退出。
`--jobs=1e999` 则得到 `Infinity` → 一次性起满全部案例（有界并行变无界）。`--jobs=0`/`--jobs=-1`
被 `Math.max(1, …)` 静默改成 1（这条尚可接受，但与非法值共用一条「不报错」路径）。

## 分诊与授权

- 严重级：P2 — 诊断车道工具，不影响 `pnpm test`/`pnpm verify`；但它正是「改门禁必跑」的自测台，
  报错形态 `undefined` 会让人以为门禁钝化，浪费下一次事故的定位时间。
- 表面 / 边界：研发面（门禁自测）/ ② 行为（CLI 输入）
- DSH 不变量：fail-loud（非法输入要点名输入，不是制造假失败）
- 触及面：门禁与验收合同（自测台的输入契约）
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（门禁与验收合同触面）」解除
- 批：第十轮搬家探索 C4/C7 —— 同批 BUG-191…198

## 复现

复现状态：稳定。

```sh
node scripts/smoke/gates.e2e.mjs --jobs=abc --case=md-links-redirect-stale; echo $?   # 1，失败项字面是 undefined
node scripts/smoke/gates.e2e.mjs --jobs=1e999 --case=md-links-redirect-stale; echo $?  # 并发=1（单案例看不出），全量即无界
node scripts/smoke/gates.e2e.mjs --case=md-links-redirect-stale; echo $?               # 0（负控：正常输入）
```

## 根因（已证）

1. `const jobs = Math.max(1, Number(argv))`：`Number('abc')` = `NaN`；`Math.max(1, NaN)` = `NaN`；
   `Number('1e999')` = `Infinity`（`Math.min(Infinity, items.length)` 退化为无界）。
2. `mapLimit`：`Array.from({ length: Math.max(1, Math.min(NaN, items.length)) })` → `{length: NaN}` →
   空数组 → 零 worker，`results` 全是 `undefined`。
3. 聚合：`for (const failure of caseResults) if (failure !== null) failures.push(failure)` →
   `undefined !== null` 为真 → 每条都进 failures。

根因证据：上面三条命令 + 源码三处（147/89/171 行）。这是「输入未归一 + 哨兵用 `null`」的合成缺陷，
同族先例 = BUG-164（`--why` 把 flag 当载体），可参照同一判据风格。

## 牵出的失败类

- **C4 边界/解析**（CLI 数值输入未归一）+ **C7 假绿/假红**（`undefined` 混进失败清单）。
- 同机制第 2 次（BUG-164 是第 1 次）；类修 = 数值型 CLI 参数统一「正整数校验，否则 exit 2」。

## 修法

1. 解析后校验 `Number.isInteger(jobs) && jobs >= 1`；否则 `console.error('gates.e2e: --jobs 需要正整数（收到 X）')` + `exit 2`。
2. `mapLimit` 对非法 limit 也 fail-loud（防御第二入口），并把聚合判据从 `!== null` 改为 `!= null`
   或显式 `typeof === 'string'`（防 `undefined` 冒充失败）。

## 修复判据

- `--jobs=abc`、`--jobs=0`、`--jobs=-1`、`--jobs=1.5`、`--jobs=1e999` 全部 exit 2 并点名收到的值；
- `--jobs=1` 与默认的案例结果一致（负控：同案例同绿）；
- `tests/checks/verify-gates.test.mjs` 无新增静态断层；`pnpm verify` 绿。

## 修复关联

去向：implemented — [批 E 搬家副作用 Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)。
修复已进树；本卡同变更归档。守卫 = `tests/run/harness/gates-cli.spec.mjs`（纯函数 invalid 矩阵）
+ `gates.e2e` 的 `--jobs` 解析入口（非法值 exit 2，已实跑六个值）。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "scripts/lib/harness/gates-cli.mjs",
    "scripts/smoke/gates.e2e.mjs",
    "tests/run/harness/gates-cli.spec.mjs",
    "scripts/README.md"
  ],
  "red": { "command": "node --import tsx/esm --test tests/run/harness/gates-cli.spec.mjs", "exit": 1, "output": "not ok 2 - parseJobsArg 对 NaN/Infinity/小数/0/负数/非数字 fail-loud 并点名原值（BUG-195）；not ok 4 - boundedMap 对非法 limit 在起 worker 前抛错（BUG-195）" },
  "green": { "command": "node --import tsx/esm --test tests/run/harness/gates-cli.spec.mjs", "exit": 0 },
  "guard": { "path": "tests/run/harness/gates-cli.spec.mjs" }
}
```
