---
status: 修复就绪
severity: P2
opened: 2026-11-18
---

# BUG-244：发布 `lib/client.js` 仍带 10 条 `src/` / `packages/` 开发源路径注释——上一轮的 dev 引用清单漏了源码根

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：修复就绪（自授权 P2：源注释/构建清理）
>
> 位置：`packages/deep-research-pack/lib/client.js`（构建产物，随 tarball 发布；源 = `src/client/**`）。
> 探索轮 = [搬家残差 II](../issues/2026-11-18-move-residuals.md) B。

## 症状

上一轮 224/225 把 `tests/`、`checks/`、`_backlog/` 注释清了，但 `src/`（开发源码根）与 `packages/`
（仓根）不在当时的 dev-root 词表里，所以发布 bundle 仍带：

```text
lib/client.js:1530   vendor `packages/util/workspace-path/src/file-address.ts`
lib/client.js:1876/1877  src/lib 纯函数 / tsc client 面含 src/lib
lib/client.js:3906   src/lib 纯函数
lib/client.js:5529   `src/defaults/`
lib/client.js:5869   `src/lib/research-defaults.ts`
lib/client.js:6829   src/lib/library-fold
lib/client.js:10089  `src/lib/`
lib/client.js:12653  `src/lib/plan-graph.ts` / `src/lib/plan-index.ts`
lib/client.js:13137  `src/lib/final-target.ts`
```

`src/` 与 `packages/` 都不在 tarball；发布 client bundle 指向开发源码，正是 224 的同类残余。

## 分诊与授权

- 严重级：P2 — 发布文本边界；不影响 client 运行（注释）。
- 表面 / 边界：发布构建产物 / ② 静态（文本）
- DSH 不变量：可发布性；发布物不引用未发布源码
- 触及面：none（源注释/构建剥离）
- 授权：自授权（P2 修理型）
- 批：搬家残差 II（B）

## 复现

复现状态：稳定。

```sh
grep -nE '(^|[^A-Za-z0-9_.-])(src|packages)/' packages/deep-research-pack/lib/client.js | head
grep -cE '(^|[^A-Za-z0-9_.-])(src|packages)/' packages/deep-research-pack/lib/client.js   # 10
```

## 根因（已证）

224/225 的 dev-root 词表 = `checks/tests/tools/probes/_backlog/_dist/.agents`（+ docs/notes/runtime/vendor 歧义根），
**没有 `src/` 与 `packages/`**；源码注释按「行为/契约描述」改写时只改了前者。`shipped-surface` 的词表同样
没有 `src`/`packages`（见 [BUG-245](BUG-245-shipped-surface-misses-src-packages-roots.md)），所以守卫绿。

## 牵出的失败类

- 发布面 C11（开发源码引用进发布物）+ C2；是 224/225 的**词表残留**，不是新机制。
- 类级方向 = dev-root 词表由「发布物 vs 源码树」派生，而不是手抄；`src`/`packages` 应入表。

## 修法

1. 源注释改行为/契约描述（或构建剥离注释）；`packages/util/workspace-path/...` 这类 vendor 源引用也删；
2. `shipped-surface` 词表补 `src`/`packages`（245），并负控注入；
3. 重构建后 `grep -c` 为 0；`pack.e2e` 的构建产物文本扫描应覆盖 `src`/`packages`。

## 修复判据

- `lib/client.js` 零 `src/`/`packages/` 引用；其余 `lib/*.js` 同；
- 构建/客户端测试绿；发布物扫描在注入 `src/__gone__.ts` 时红；
- `pnpm test` / `pack.e2e` 绿。
