---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-248：`test-owner-mirror` 只认 test 的直接 import——经 `-helpers` 间接依赖 owner 的 test 可藏在 shared

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：owner = 直接 import ∪ 经本地 helper 递归；跨 owner 归 shared；探针红证；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-move-residuals-ii.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 三干净室入口
>
> 位置：[tests/checks/shared/test-owner-mirror.test.mjs](../../../tests/checks/shared/test-owner-mirror.test.mjs) 的
> checks 车道循环（第 94–110 行：只 `parseKeylessImports` test 文件的直接 import）；
> 对照 = [checks/lib/repo/test-placement.mjs](../../../checks/lib/repo/test-placement.mjs) 允许 `tests/<domain>/…-helpers.<ext>`。
> 探索轮 = [搬家残差 II](../settled_issues/2026-11-18-move-residuals.md) A（tests/checks 搬家）。

## 症状

新搬家把 `tests/checks` 按 `checks/lib/<owner>` 六分，并加 owner 规则：

```text
单 owner → 该 owner；2+ owner → shared；无 checks/lib 依赖 → repo
```

但 owner 只从**测试文件的直接 import** 抽取。`test-placement` 明确允许 `tests/checks/<owner>/…-helpers.mjs`
（不进默认 glob，由 consumer import）；一个 test 若：

- 直接 import 一个 `shared` 模块（owners={shared}）；
- 再 import 一个 `-helpers.mjs`，该 helper 只 import `checks/lib/repo/…`；

则 owner 集合只看到 `{shared}` → 推断 dir=`shared`，**repo 依赖被 helper 隐藏**。这是 BUG-205
（`tests/run/shared` 藏单 owner）在 checks 车道的同类缺口；当前 `tests/checks` 恰好没有 helper，所以绿。

## 分诊与授权

- 严重级：P2 — 落点规则可被一层 helper 绕过；不阻断运行，但 owner 镜像的语义失效。
- 表面 / 边界：tests 落点/owner / ② 静态（import 图）
- DSH 不变量：fail-loud；owner 判定应看可达依赖，而不是直接 import 子集
- 触及面：none（测试规则）
- 授权：自授权（P2 修理型）
- 批：搬家残差 II（A）

## 复现

复现状态：稳定（合成；无 live helper）。

```text
tests/checks/shared/x.test.mjs:
  import { h } from './x-helpers.mjs'      // helper 只 import checks/lib/repo/a.mjs
  import { s } from '../../../checks/lib/shared/s.mjs'
// 直接 owners = {shared} → 规则认为 shared 合法；repo 依赖不可见
```

```sh
find tests/checks -name '*-helpers*'      # 当前空（缺口是规则，不是实例）
sed -n '94,110p' tests/checks/shared/test-owner-mirror.test.mjs
```

## 根因（已证）

owner 抽取只遍历 `parseKeylessImports(test)` 的直接 specifier；`localImportPath` 解析到
`checks/lib` 才计 owner；落在 `tests/` 的 helper 被当作普通相对 import 跳过，不递归其依赖。
`test-placement` 允许 helper；`test-surface` 不审 owner。

## 牵出的失败类

- 落点 C2（间接依赖不可见）+ C7（规则自认为绿）；与 BUG-205 同族、不同车道。
- 类级方向 = owner 判定递归**同一 tests 域内的 `-helpers`**（有界深度/防环），或禁止 helper 跨 owner 引入 lib。

## 修法

1. `ownersOf(test)` 递归解析 `tests/**/…-helpers.*` 的 import（有界、防环），合并 owner；
2. 或更窄：规定 `tests/<domain>/<owner>/…-helpers` 的 owner 固定为其目录，helper 不得跨 owner；
3. 测试矩阵：shared test + repo-only helper → 红（应归 repo 或拆 helper）；shared test + shared helper → 绿；
4. 与 `test-placement` 的 helper 规则同变更。

## 修复判据

- 注入 shared test + repo helper → owner 规则红；直接/间接两种形态都覆盖；
- 现有 61 个 tests/checks 文件不误伤；`pnpm test` 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "tests/checks/shared/test-owner-mirror.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/shared/test-owner-mirror.test.mjs",
    "exit": 1,
    "output": "not ok 4 - tests/checks 根零平铺… tests/checks/repo/__probe.test.mjs 住 repo/，但只依赖 channel——归位到 channel/ 或改登记"
  },
  "green": {
    "command": "node --test tests/checks/shared/test-owner-mirror.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/shared/test-owner-mirror.test.mjs"
  }
}
```
