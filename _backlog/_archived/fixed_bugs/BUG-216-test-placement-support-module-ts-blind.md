---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-216：test-placement 的非测试模块闭集只认 `.mjs/.cjs`——`.ts/.tsx/.js` 助手可零规则落位

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行门禁触面：扩到 .ts/.tsx/.js + 未知扩展名红） — 结论：支援模块闭集扩到 .ts/.tsx/.js + -helpers.<ext>，未知扩展名兜底红；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-namespace-move-residual-fixes.md)；审查：agent — 红证回放 + 全量 verify/test（2026-11-17）
>
> 位置：[checks/lib/repo/test-placement.mjs](../../../checks/lib/repo/test-placement.mjs) 的
> `isSupportModule` / `placementIssues`；门禁 = `test-placement`；
> 探索轮 = [2026-11-17 卡](../settled_issues/2026-11-17-exploratory-namespace-move.md) N5 邻接。

## 症状

`isSupportModule` 只匹配 `.mjs|.cjs`；`.ts` / `.tsx` / `.js` 的非测试模块被两个判据同时放过：

```sh
node --input-type=module -e "
import {placementIssues,isSupportModule} from './checks/lib/repo/test-placement.mjs';
for (const p of ['tests/pack/__probe-helpers.ts','tests/pack/__probe-helpers.tsx','tests/pack/__probe-helpers.js','tests/pack/__probe.mjs'])
  console.log(p, isSupportModule(p), JSON.stringify(placementIssues([p])));
"
# tests/pack/__probe-helpers.ts   false  []
# tests/pack/__probe-helpers.tsx  false  []
# tests/pack/__probe-helpers.js   false  []
# tests/pack/__probe.mjs          true   ["…必须以 -helpers.mjs 结尾…"]
```

即：一个 `.ts` 读取缝/夹具助手可以住在 `tests/` 根、未知子树或任意深度，不触发位置门禁；
它也不在 `listTestFiles`/asset-ledger 的 `.spec/.test` 发现面里，`node --test` 也不会跑它。
规则的正向闭集只对 `.mjs/.cjs` 成立，而本仓的 client 侧测试大量 import `.ts` 源——
`.ts` 助手是现实形态，不是臆测。

## 分诊与授权

- 严重级：P2 — 落点门禁的闭集窄于「tests/ 下的非测试模块」这个声称面；没有运行期错误，但 M1/M4 类
  （未知落点 + 账本吸收）对 TS 家族重新打开。
- 表面 / 边界：tests 落点门禁 / ② 行为（纯函数 + 门禁）
- DSH 不变量：fail-loud —— 未规则化的落点必须红，而不是因为扩展名不在枚举里静默通过
- 触及面：门禁与验收合同（`test-placement` 判据 + gates.e2e 案例）
- 授权：用户 2026-11-17 放行（门禁与验收合同触面 → 修复就绪 = P2 修复授权）
- 批：2026-11-17 命名空间搬家探索（N5 邻接）；前序 = [BUG-191](BUG-191-placement-gates-unknown-subtree-unruled.md) / [BUG-196](BUG-196-test-surface-cjs-coverage-blind.md)（同族：扩展名盲）

## 复现

复现状态：稳定（纯函数，无仓库改动）。

```sh
node --input-type=module -e "
import {placementIssues} from './checks/lib/repo/test-placement.mjs';
console.log(placementIssues(['tests/pack/__probe-helpers.ts','tests/pack/sub/__probe.js']));
"   # []（应至少报「未规则化落点/缺 -helpers 后缀」）
```

## 根因（已证）

`isSupportModule` 的正则 `\.(?:mjs|cjs)$` 与 `isTestFile` 的 `.spec.mjs/.test.mjs` 共同定义了
「tests 下会被发现/约束的模块」；TS/JS 扩展名不在任何一边 → 不在闭集、也不进发现面。
`placementIssues` 先 `isTestFile` 再 `isSupportModule`，两者都 false 时 `continue`，无兜底
「未知扩展名」分支（与 BUG-200 的「未知深度 = 红」是同一形状的另一种未知）。

## 牵出的失败类

- M1 落点补集 / M4 生成器吸收：扩展名枚举之外 = 无人管。
- 同机制第 2 次：BUG-196（`.cjs` 覆盖盲）——处置：类修（闭集按「文件角色」而非扩展名，或加
  「tests 下未知扩展名 = 红」兜底）。

## 修法

1. `isSupportModule` 扩到 `.ts/.tsx/.js`（用户 2026-11-17 拍板），支援模块后缀统一 `-helpers.<ext>`；
   `tests/` 下未知扩展名（`.py` 等）兜底报红；
2. `placementIssues` 加兜底：`tests/` 下既非测试也非支援模块的普通文件（非 fixtures）→ 红并点名；
3. `gates.e2e` 加 `test-placement-support-ts` 注入案例；`test-placement.test.mjs` 加纯函数矩阵。

## 修复判据

- `placementIssues(['tests/pack/x.ts'])` 红；`tests/pack/x-helpers.ts` 按选定规则绿/红；
- `.mjs/.cjs` 既有行为不回退（BUG-191/196/207 案例全绿）；
- `pnpm verify` / `pnpm test` 绿；新增 gates.e2e 案例先红后绿。

## 修复关联

与 [BUG-214](BUG-214-cost-baseline-108-stale-count-free-vocabulary.md) 同批（测试制度），但不同机制。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/lib/repo/test-placement.mjs",
    "tests/checks/test-placement.test.mjs",
    "checks/lib/harness/gates-cases.mjs",
    "docs/evaluation.md"
  ],
  "red": {
    "command": "node --test tests/checks/test-placement.test.mjs",
    "exit": 1,
    "output": "not ok 4 - 非测试模块：落点与 -helpers.<ext> 后缀（审计 2026-11-17 / BUG-216）"
  },
  "green": {
    "command": "node --test tests/checks/test-placement.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/test-placement.test.mjs"
  }
}
```
