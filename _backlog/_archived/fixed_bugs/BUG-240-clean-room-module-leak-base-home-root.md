---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-240：clean-room 的 moduleLeakOf 从 `home` 根解析——profile 里的仓内依赖泄漏永远看不见

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：moduleLeakOf 解析基改 home/profiles/<profile>；profile 缺席红；home 根泄漏仍可达（向上解析）；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-move-residuals-ii.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 三干净室入口
>
> 位置：[checks/lib/harness/clean-room.mjs](../../../checks/lib/harness/clean-room.mjs) 的 `moduleLeakOf`（第 66–73 行）；
> 消费方 = `checks/smoke/{cold-start,release,lifecycle}.entry.mjs`。
> 探索轮 = [搬家残差 II](../settled_issues/2026-11-18-move-residuals.md) A/B。

## 症状

`moduleLeakOf` 用**clean home 根**建 require：

```js
const requireFromHome = createRequire(join(home, 'clean-room-probe.cjs'))
```

但 `dsh plugin add` 把包和 peer 解析树装在 `home/profiles/<profile>/node_modules/…`。从 `home`
根解析 `react` / `react-dom` / `@deepseek-ai/dsh-client-ui-primitives` 会走 `home/node_modules`、
`/tmp/node_modules`、`/node_modules`，**看不到 profile 下的依赖**；于是：

- 若 profile 的依赖是仓内 symlink（不干净室），`leaks` 仍为空；
- 三个 L2 安装测试的「解析不落仓根」判据是空转的。

现场证明（临时 home + profile symlink）：

```text
home 解析 react      → MISS
profile 解析 react   → /Users/…/node_modules/.pnpm/react@…/react/index.js（仓内）
```

即判据应从 `home/profiles/<profile>`（或已安装包的目录）解析，而不是 `home`。

## 分诊与授权

- 严重级：P2 — 干净室的核心判据假绿；L2 安装测试仍能证明「能装/能起」，但不能证明「依赖不来自仓内」。
- 表面 / 边界：干净室安装测试 / ② 行为（模块解析）
- DSH 不变量：verify the world；解析祖先必须从**安装位置**开始
- 触及面：none（测试基础设施；不改产品）
- 授权：自授权（P2 修理型）
- 批：搬家残差 II（A 最近搬家 / B 原命名空间）

## 复现

复现状态：稳定（临时 home，无仓库改动）。

```sh
node --input-type=module -e "
import {mkdtempSync,mkdirSync,symlinkSync} from 'node:fs';
import {join} from 'node:path'; import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
const root=process.cwd(), home=mkdtempSync(join(tmpdir(),'leak-'));
const prof=join(home,'profiles','p'); mkdirSync(join(prof,'node_modules'),{recursive:true});
symlinkSync(join(root,'node_modules','react'),join(prof,'node_modules','react'));
for(const [k,p] of [['home',home],['profile',prof]]){try{console.log(k,createRequire(join(p,'probe.cjs')).resolve('react'))}catch{console.log(k,'MISS')}}
"
```

## 根因（已证）

干净室的 home 与 profile 是两级；`moduleLeakOf` 的 `home` 参数语义是「安装根」，但实现按「home 根」
解析。三个调用方都只传 `home`，且 `cold-start` 已算出 `installed` 路径却没用它做解析基。

## 牵出的失败类

- 干净室 C7 假绿 + C2（消费者位置错）；与 [BUG-241](BUG-241-clean-room-leak-names-hardcoded.md) 同族。
- 类级方向 = 安装测试按「安装位置」解析，而不是按 home 根。

## 修法

1. `moduleLeakOf({ home, profile, root, names })`：用 `join(home,'profiles',profile)` 或 `installed` 路径
   建 `createRequire`；若 profile 路径不存在 → 红（未装完不是干净）；
2. 三个调用方传 profile/installed；同时保留 home 根作 fallback 仅用于对照；
3. 纯函数矩阵加一条：profile 内 symlink 到仓根 → `repoLeaksOf` 命中；home 根有 symlink、profile 无 →
   不命中（证明解析基正确）。

## 修复判据

- 临时 home 的 profile 内 symlink 会被 `moduleLeakOf` 报出；干净安装的空 profile 为空；
- cold-start/release/lifecycle 的 `leaks` 判据在注入仓内 symlink 时红；
- `pnpm test` / `pnpm test:entry` 相关件绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/harness/clean-room-policy.mjs",
    "checks/lib/harness/clean-room.mjs",
    "checks/smoke/cold-start.entry.mjs",
    "checks/smoke/release.entry.mjs",
    "checks/smoke/lifecycle.entry.mjs",
    "tests/checks/harness/clean-room-policy.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/harness/clean-room-policy.test.mjs",
    "exit": 1,
    "output": "not ok 5 - 解析基 = profile/installed… profile 内的仓内 symlink 必须被报出（解析基 = home/profiles/<profile>）"
  },
  "green": {
    "command": "node --test tests/checks/harness/clean-room-policy.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/harness/clean-room-policy.test.mjs"
  }
}
```
