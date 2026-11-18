---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-247：`pack-deps` 只看 JS 的 `require` 与 `.d.ts` 的 import——`lib/*.js` 的动态 `import()` 不在依赖闭包

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：pack-deps 抽动态 import() 进闭包；端到端用例覆盖；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-move-residuals-ii.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 三干净室入口
>
> 位置：[checks/lib/repo/pack-deps.mjs](../../../checks/lib/repo/pack-deps.mjs) 的 `requiresOf`（`require(` 正则）与
> `externalImportsOf`（只喂 `.d.ts`）；消费 = `pack.e2e` 的 `jsTexts` / `dtsTexts`。
> 探索轮 = [搬家残差 II](../settled_issues/2026-11-18-move-residuals.md) A/B。

## 症状

发布 JS 的依赖抽取只认 `require("…")`：

```js
/require\(\s*['"]([^'"]+)['"]\s*\)/g
```

`lib/*.js` 里的 `await import('@deepseek-ai/…')`（或 `import('react')`）不会被计入 `requires`，
因此它可以在 `peerDependencies` 缺失的情况下通过 `pack-deps` 的正向检查；当前 `lib/*.js` 恰好没有
动态 import，所以测试绿——这是**闭包形态**的缺口，不是当前实例。

```sh
grep -n 'import(' packages/deep-research-pack/lib/*.js | head    # 当前空
```

## 分诊与授权

- 严重级：P2 — 守卫的扫描面窄于 JS 的模块加载形态；新增动态 import 时静默漏 peer。
- 表面 / 边界：发布依赖闭包 / ② 行为（静态抽取）
- DSH 不变量：fail-loud；运行时依赖 = require ∪ 静态 import ∪ 动态 import
- 触及面：none（守卫/测试）
- 授权：自授权（P2 修理型）
- 批：搬家残差 II（A/B）

## 复现

复现状态：稳定（注入）。

```sh
# 在 lib/client.js 注入 await import('@deepseek-ai/dsh-unknown/x') → pack-deps 正向仍绿
node --input-type=module -e "
import {requiresOf,externalImportsOf} from './checks/lib/repo/pack-deps.mjs';
console.log(requiresOf(\"const m = await import('@deepseek-ai/foo/bar')\"));
console.log(externalImportsOf(\"const m = await import('@deepseek-ai/foo/bar')\"));
"
```

## 根因（已证）

`requiresOf` 只匹配 `require(`；`externalImportsOf` 的消费方只传 `.d.ts` 文本；`lib/*.js` 的
`import()`/`import` 形态没有抽取器。`pack-deps.test` 的抽取器矩阵也只测 require/d.ts。

## 牵出的失败类

- 发布面 C2/C4（加载形态边界）；与 [BUG-232](BUG-232-row-deps-scope-no-lib-types.md) 同模块。
- 类级方向 = 一个 JS 模块级提取器（require/import/import()）供正反向共用。

## 修法

1. 加 `dynamicImportsOf(text)`：`import\s*\(\s*['"]…['"]\s*\)` + 静态 `import … from '…'`；
2. `packDepsIssues` 对 `jsTexts` 同时跑 require + import；`pack.e2e` 的 `jsTexts` 已覆盖 tarball `lib/*.js`；
3. 测试注入 `import('@deepseek-ai/foo')` → 正向红；合法 peer 绿；
4. 负控：`import('node:fs')`/相对路径忽略。

## 修复判据

- 动态 import 的包名进入前向/反向闭包；注入未声明包红；
- 现有 `pack-deps.test` / `pack.e2e` 绿；`pnpm test` 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/repo/pack-deps.mjs",
    "checks/smoke/pack.e2e.mjs",
    "tests/checks/repo/pack-deps.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/repo/pack-deps.test.mjs",
    "exit": 1,
    "output": "not ok 5 - 汇总闭包：动态 import() 进入 packDepsIssues… 动态 import() 未声明 peer 必须被汇总判出"
  },
  "green": {
    "command": "node --test tests/checks/repo/pack-deps.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/repo/pack-deps.test.mjs"
  }
}
```
