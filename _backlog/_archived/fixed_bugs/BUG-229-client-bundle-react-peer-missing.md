---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-229：发布 client bundle `require("react")` / `react-dom`，但 peerDependencies 没有 React

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行 pack 触面并拍板：React 加 peer，不进 bundle） — 结论：client bundle 的 React 运行期 require 进 peers（^18.2.0，optional）；依赖闭包守卫正向红证；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-runtime-deps-install-boundary.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 干净室三入口（2026-11-17）
>
> 位置：`packages/deep-research-pack/lib/client.js` 第 8–10 行（构建产物，随 tarball 发布）；
> 构建外置规则 = `packages/deep-research-pack/tsdown.config.ts`（`external: ['react','react-dom','react/jsx-runtime', ...]`）；
> `peerDependencies` = `packages/deep-research-pack/package.json`。探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-deps-install-boundary.md) 第三轮。

## 症状

发布 client bundle 在运行时要求宿主提供 React，但 `peerDependencies` 里没有 React：

```text
lib/client.js:8   let react_jsx_runtime = require("react/jsx-runtime");
lib/client.js:9   let react = require("react");
lib/client.js:10  let react_dom = require("react-dom");
```

```sh
node -e "const p=require('./packages/deep-research-pack/package.json'); console.log('react' in p.peerDependencies, 'react-dom' in p.peerDependencies)"  # false false
```

DSH 的 web 宿主通常自带 React，所以 dev/`client-load`/`preset.e2e` 都绿；但发布契约里没有声明这两个 peer，
换宿主/最小安装时 client 模块的 `require` 无处解析；npm/pnpm 也不会为用户补齐。

## 分诊与授权

- 严重级：P2 — 宿主通常兜底；缺的是发布契约（peer 完整性），换 DSH 发行形态时可能直接挂 client。
- 表面 / 边界：发布 client bundle / ② 静态（构建产物 + manifest）
- DSH 不变量：fail-loud/可发布性 —— 运行时 require 的包必须在 peerDependencies 声明
- 触及面：pack 公共行为（peer 契约）
- 授权：用户 2026-11-17 放行（pack 触面 → 修复就绪 = P2 修复授权；React 加 peer 已拍板）
- 批：运行时/开发边界第三轮（依赖面）

## 复现

复现状态：稳定。

```sh
grep -n 'require("react' packages/deep-research-pack/lib/client.js
node -e "const p=require('./packages/deep-research-pack/package.json'); for (const k of ['react','react-dom']) console.log(k, k in p.peerDependencies)"
```

## 根因（已证）

`tsdown.config.ts` 把 React 运行时外置，交给宿主模块表；`peerDependencies` 只列了 DSH 包，漏了 React 运行时。
`row-deps` 只检查 preset/bundle 行的 `@deepseek-ai/*`，不检查 `lib/*.js` 的 `require`（[BUG-232](BUG-232-row-deps-scope-no-lib-types.md)）；
`pack-manifest`/`client-half` 也不查 peer 完整性。

## 牵出的失败类

- 发布面 C2/C7（运行时 require 未声明 peer + 门禁只验在场）；同族 = [BUG-230](BUG-230-shipped-surface-devref-lookbehind-bypass.md)
  （类型面）/ [BUG-232](BUG-232-row-deps-scope-no-lib-types.md)（守卫面）。
- 修法可选：把 React 加入 peer（与 DSH web 宿主版本对齐），或把 React 打进 bundle（体积换独立性；不推荐重复 React）。

## 修法

1. `peerDependencies` 加 `react` / `react-dom`（范围与 DSH web 宿主一致）或显式文档化「宿主必须提供」并加入 peer 以便解析；
2. 若选择打包，改 `tsdown` external 并从 peer 删除；两选一，不要两边都不声明；
3. 发布面守卫（BUG-232）覆盖 `lib/*.js` 的 require。

## 修复判据

- `lib/client.js` 的每个非相对 `require` 都能在 `peerDependencies`（或显式决策的打包集）找到；
- 注入一个未声明的 `require('react')` → 守卫红；`client-load` / `preset.e2e` 绿；
- `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/package.json",
    "checks/lib/repo/pack-deps.mjs",
    "tests/checks/pack-deps.test.mjs",
    "checks/smoke/pack.e2e.mjs"
  ],
  "red": {
    "command": "node checks/smoke/pack.e2e.mjs",
    "exit": 1,
    "output": "FAIL  发布物依赖闭包 = peers（正向/反向/范围） — 发布物 require/import「react/jsx-runtime」不在 peerDependencies（包名 react）；…「react-dom」…"
  },
  "green": {
    "command": "node checks/smoke/pack.e2e.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/pack-deps.test.mjs"
  }
}
```
