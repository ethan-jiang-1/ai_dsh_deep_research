---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-236：发布 tarball 的 `package.json` 仍带 14 条 `workspace:*` devDependencies

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行 pack 触面；发布 manifest 剥离 devDependencies） — 结论：export-dist 在 staging 副本剥离 devDependencies 后打包；tarball manifest 零 workspace 协议（pack.e2e 断言）；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-runtime-deps-install-boundary.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 干净室三入口（2026-11-17）
>
> 位置：`_dist/dsh-deep-research-pack-0.3.6.tgz` 内的 `package/package.json` 第 168 行起
> （源 = `packages/deep-research-pack/package.json` 的 `devDependencies`）。探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-deps-install-boundary.md) 第三轮。

## 症状

发布 tarball 的 `package.json` 仍带着 workspace 协议的 devDependencies：

```sh
tar -xOf _dist/dsh-deep-research-pack-0.3.6.tgz package/package.json | grep -c 'workspace:\*'   # 14
tar -xOf _dist/dsh-deep-research-pack-0.3.6.tgz package/package.json | sed -n '168,175p'
# "@deepseek-ai/cordis": "workspace:*",
# "@deepseek-ai/dsh-api-remotes": "workspace:*",
# …
```

这些包是**本仓 workspace 的 dev link**；`npm pack` 不会把 `workspace:*` 改写成版本（`pnpm publish` 会）。
发布物因此带 14 条 npm/pnpm 无法解析的版本声明，并暴露内部 dev 包清单。`lifecycle` 的 `plugin add`
能过是因为安装器/缓存路径容忍（或未安装 devDeps），但这是发布元数据缺陷，不是「运行时依赖」。

## 分诊与授权

- 严重级：P2 — 发布元数据；正常依赖安装不装 devDeps，故不阻断；但 npm/pnpm 消费者工具链可能报错/告警，
  且 dev 包清单进入发布物。
- 表面 / 边界：发布 manifest / ② 静态（tarball package.json）
- DSH 不变量：可发布性；发布 manifest 的版本声明必须可被标准包管理器解析
- 触及面：pack 公共行为（发布元数据）
- 授权：用户 2026-11-17 放行（pack 触面 → 修复就绪 = P2 修复授权；剥离 devDependencies 已拍板）
- 批：运行时/开发边界第三轮（发布元数据）

## 复现

复现状态：稳定。

```sh
tar -xOf _dist/dsh-deep-research-pack-0.3.6.tgz package/package.json | grep -n 'workspace:\*' | head
tar -xOf _dist/dsh-deep-research-pack-0.3.6.tgz package/package.json | grep -c 'workspace:\*'
```

## 根因（已证）

`tools/release` 的导出用 `npm pack`（或 `pack` 产物流），不做 `workspace:` 协议改写；源
`package.json` 的 devDependencies 是 `workspace:*`。`pack-manifest`/`pack.e2e` 只查 `dsh`/`files`/必需件，
不查 tarball manifest 的 devDependencies 协议；`release.entry` 也不断言。

## 牵出的失败类

- 发布面 C2/C11（开发元数据进入发布物）；与 [BUG-219](BUG-219-pack-types-unexported-dts-overshipped.md) /
  [BUG-228](BUG-228-pack-files-broad-allowlist-no-set-assertion.md) 同族的「发布清单未按公开合同收口」。
- 14 条 dev 包清单也让消费者看到内部依赖面（信息面）。

## 修法

1. 发布前用 `pnpm pack`/`pnpm publish` 的 workspace 协议改写，或在 `prepack` 里生成发布 manifest（剥离/改写
   `devDependencies`；发布包通常不需要 devDependencies）；
2. `pack.e2e`/`pack-manifest` 加断言：tarball `package.json` 零 `workspace:` 协议；负控 = 注入一条；
3. `release.entry` 用该 tarball 安装后断言 manifest 可解析（`npm install --package-lock-only` 或等价）。

## 修复判据

- tarball `package.json` 零 `workspace:*`（devDependencies 可整体剥离或改写为可解析版本）；
- 新断言在注入 `workspace:*` 时红；`lifecycle`/`release` 绿；
- `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "tools/release/export-dist.mjs",
    "checks/lib/repo/publish-manifest.mjs",
    "tests/checks/publish-manifest.test.mjs",
    "checks/smoke/pack.e2e.mjs"
  ],
  "red": {
    "command": "node checks/smoke/pack.e2e.mjs",
    "exit": 1,
    "output": "FAIL  tarball manifest 无 devDependencies（发布面剥离，BUG-236） — [\"@deepseek-ai/cordis\", …,\"zod\"]；FAIL tarball manifest 无 workspace 协议 — devDependencies.@deepseek-ai/cordis 仍是 workspace 协议"
  },
  "green": {
    "command": "node checks/smoke/pack.e2e.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/publish-manifest.test.mjs"
  }
}
```
