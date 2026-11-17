---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-228：`files` 是广白名单 + 负模式，`pack.e2e` 只验必需件在场——tarball 集合没有对账

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行 pack 触面；files 显式允许集 + 集合断言） — 结论：files 显式允许集 + pack.e2e 集合断言（顶层/类型 = 公开合同反投影）；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-shipped-boundary-self-contained.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e（2026-11-17）
>
> 位置：[packages/deep-research-pack/package.json](../../../packages/deep-research-pack/package.json) 的 `files`；
> [checks/smoke/pack.e2e.mjs](../../../checks/smoke/pack.e2e.mjs) 的 `required` 列表。
> 探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-dev-boundary.md) R1/R4。

## 症状

`files` 用广 glob（`lib/**`、`scripts/**`、`content/**`、`presets/**`、`workers/**`、`locale*`）加负模式
（只排 `.js.map`、`.tsbuildinfo`、`lib/types/**/*.js`、`.map`）；没有「发布物集合 = 允许集」的断言：

```sh
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | wc -l            # 186
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | grep -c '^package/lib/types/.*\.d\.ts$'   # 111
grep -n "for (const required of" checks/smoke/pack.e2e.mjs          # 只列 10 个必需件
```

`pack.e2e` 证明「该有的在」，不证明「不该有的不在」；`lib/types` 的 104 个内部 `.d.ts`
（[BUG-219](BUG-219-pack-types-unexported-dts-overshipped.md)）就是从这个缺口进包的。
README 由 npm 自动包含、不在 `files` 里，也不在任何集合断言内（[BUG-220](BUG-220-pack-readme-user-section-dev-smokes.md)）。

## 分诊与授权

- 严重级：P2 — 发布清单机制；直接导致过度发布，未来新增内部类型/开发文件会继续进包。
- 表面 / 边界：发布清单（files/manifest）/ ② 静态（tarball 集合）
- DSH 不变量：fail-loud —— 发布集合应与允许集双向相等（多/少都红）
- 触及面：pack 公共行为（发布内容）
- 授权：用户 2026-11-17 放行（pack 触面 → 修复就绪 = P2 修复授权；显式允许集已拍板）
- 批：运行时/开发边界第一轮（R1/R4）

## 复现

复现状态：稳定。

```sh
node -e "const p=require('./packages/deep-research-pack/package.json'); console.log(p.files.join('\n'))"
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | awk -F/ '{print $2}' | sort | uniq -c
```

## 根因（已证）

- `files` 以「目录全带 + 少量负模式」表达允许集；负模式只针对 JS/map/tsbuildinfo，未覆盖 `.d.ts` 内部树；
- `pack.e2e` 是 presence-only（`has(required)`），没有 actual-set vs allowed-set 的 diff；
- `pack-manifest` 只查 `files` 的若干字段形状（含 locale/icon、不含 src），不查 tarball 实际条目集合。

## 牵出的失败类

- 发布面 C2（过度交付）+ C7（只验在场）；与 [BUG-219](BUG-219-pack-types-unexported-dts-overshipped.md)
  同源，但 219 是实例、本卡是机制。
- 类级方向 = 发布清单 allowlist + `npm pack --dry-run` 集合对账（与 BUG-227 的文本扫描互补）。

## 修法

1. `files` 改为显式允许集（或由 `exports` + 必需资产生成），不再「目录全带」；
2. `pack.e2e` 加 `actual === expected` 集合断言（允许集 + 自动 README/LICENSE 的显式登记）；
3. 负控：临时多放一个 `lib/types/lib/__gone__.d.ts` → tarball 集合对账红；
   少一个必需件 → 现有 required 仍红。

## 修复判据

- tarball 条目集合 = 允许集（含显式 README/LICENSE/README.zh）；
- `lib/types` 只含 exports 的 7 个类型入口（或构建为单文件声明）；
- `pack.e2e` 集合断言先红（当前树）后绿；`lifecycle.entry` / `release.entry` 绿；
- `pnpm verify` / `pnpm test` 绿。

## 修复关联

与 [BUG-219](BUG-219-pack-types-unexported-dts-overshipped.md) / [BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md)
同一评审：一个定清单、一个扫文本。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/package.json",
    "checks/lib/repo/shipped-surface.mjs",
    "tests/checks/shipped-surface.test.mjs",
    "checks/smoke/pack.e2e.mjs",
    "tests/pack/contract/package-contract.spec.mjs"
  ],
  "red": {
    "command": "node checks/smoke/pack.e2e.mjs",
    "exit": 1,
    "output": "FAIL  发布集合 = 允许集 / exports.types — files 的「lib/**」是广模式；files 缺公开类型入口 lib/types/client/index.d.ts"
  },
  "green": {
    "command": "node checks/smoke/pack.e2e.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/pack.e2e.mjs"
  }
}
```
