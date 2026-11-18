---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-249：发布 tarball 的 `package.json` 仍带开发 `scripts`（`build` / `prepack: pnpm build`）——manifest 只剥了 devDependencies

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（pack 公共行为/发布元数据）
>
> 位置：`_dist/dsh-deep-research-pack-0.3.6.tgz` 内 `package/package.json` 的 `scripts`；
> 收口实现 = [checks/lib/repo/publish-manifest.mjs](../../checks/lib/repo/publish-manifest.mjs)（只 `stripDevDependencies`）。
> 探索轮 = [搬家残差 II](../issues/2026-11-18-move-residuals.md) B。

## 症状

236 已把 `devDependencies` 剥离（tarball 零 `workspace:*`），但发布 manifest 仍保留：

```json
"scripts": {
  "build": "node -e \"require('node:fs').rmSync('lib', …)\" && tsc -b . && tsdown",
  "prepack": "pnpm build"
}
```

消费者拿到包后看到开发构建命令；`pnpm` 不一定是安装前提；`prepack` 由 `npm pack`/git 安装触发，
tarball 安装不触发——两份语境混在同一 manifest。`publish-manifest` 的注释说「发布包不需要
devDependencies」，但没有说/处理 `scripts`；`pack.e2e` 只验 `workspace:*` 与 file set，不验 scripts。

## 分诊与授权

- 严重级：P2 — 发布元数据；不影响运行时加载，但开发命令进入用户 manifest，且 `prepack` 的
  `pnpm build` 在无 pnpm 的环境下会失败（若被触发）。
- 表面 / 边界：发布 manifest / ② 静态（tarball package.json）
- DSH 不变量：可发布性；发布 manifest 的 scripts 不应引用开发工具链
- 触及面：pack 公共行为（发布元数据）
- 授权：等人拍板（pack 触面）
- 批：搬家残差 II（B）

## 复现

复现状态：稳定。

```sh
tar -xOf _dist/dsh-deep-research-pack-0.3.6.tgz package/package.json | sed -n '/"scripts"/,/},/p'
# build / prepack: pnpm build
grep -n 'stripDevDependencies\|scripts' checks/lib/repo/publish-manifest.mjs
```

## 根因（已证）

`publish-manifest` 只剥离 `devDependencies`；`export-dist` 的 staging manifest 不处理 `scripts`；
`pack.e2e` 的 manifest 断言只看 `workspace:` 协议与 files/类型集合，不看 scripts。发布包**需要**
哪些 scripts（通常一个也不需要；`bin` 已在）没有决策记录。

## 牵出的失败类

- 发布面 C11（开发命令进入发布物）+ C2；与 236（devDependencies）/220（README 用户段）同族。
- 类级方向 = 发布 manifest 白名单（name/version/exports/files/bin/engines/peer/icon/description…）；
  scripts 是显式决策项，不是默认保留。

## 修法

1. `publish-manifest` 加 `publishScripts` 决策：无运行时 scripts → 删除 `scripts`（或只保留明确的
   `start`/`postinstall` 空集）；`prepack`/`build` 不入发布；
2. `pack.e2e`/`publish-manifest.test` 加断言：tarball scripts 为空或等于白名单；负控注入 `prepack`；
3. 若确需保留（例如 tarball 用户可重构建），在 README/合同写明并改白名单。

## 修复判据

- tarball `scripts` 为空（或显式白名单），不含 `pnpm`/`tsc`/`tsdown`；
- 新断言在注入 `prepack` 时红；`lifecycle`/`release` 安装绿；
- `pnpm test` / `pack.e2e` 绿。
