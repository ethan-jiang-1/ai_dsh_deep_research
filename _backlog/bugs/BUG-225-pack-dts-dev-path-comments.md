---
status: 修复就绪
severity: P2
opened: 2026-11-17
---

# BUG-225：发布物 `lib/types/**/*.d.ts` 10 个文件带开发面路径注释（`tests/`、`checks/`、`_backlog/`）

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：修复就绪（自授权 P2：改源注释 + 加扫描）
>
> 位置：`packages/deep-research-pack/lib/types` 下 10 个
> `.d.ts`（随 tarball 发布）；源 = `packages/deep-research-pack/src/**`。
> 探索轮 = [运行时/开发边界卡](../issues/2026-11-17-runtime-dev-boundary.md) R3。

## 症状

声明文件是消费者可见的类型面，却保留开发仓测试/门禁/问题卡路径：

```text
lib/types/fetch-fallback/policy.d.ts:4            tests/pack/fetch-fallback/fetch-fallback.spec.mjs
lib/types/lib/shared/markdown-mask.d.ts:14-15     checks/lib/repo/{note-scan,fix-evidence}.mjs；tests/contracts/…
lib/types/lib/shared/i18n.d.ts:11                 tests/cockpit/locales-data.spec.mjs
lib/types/lib/shared/config-tables.d.ts:28        _backlog/_archived/research/…
lib/types/lib/review/review-readiness.d.ts:8      tests/run/gates/node-gate-delivery.spec.mjs
lib/types/index.d.ts / client/index.d.ts          docs/、_backlog/、checks/…
```

这些文件在 tarball 内、在 `exports` 的部分入口链上（`index.d.ts`/`client/index.d.ts` 是公开入口）；
路径在包内不存在。

## 分诊与授权

- 严重级：P2 — 发布类型面文本边界；不影响类型解析。
- 表面 / 边界：发布类型声明 / ② 静态（构建产物文本）
- DSH 不变量：可发布性；模型/消费者可见声明不应引用未发布开发面
- 触及面：none（注释清理；不改类型形状）
- 授权：自授权（P2 修理型）
- 批：运行时/开发边界第一轮（R3）

## 复现

复现状态：稳定。

```sh
grep -rlE 'tests/|checks/|_backlog|docs/' packages/deep-research-pack/lib/types --include='*.d.ts'
# 10 个文件（见症状）
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | grep '^package/lib/types/' | wc -l   # 111
```

## 根因（已证）

- `.d.ts` 由 tsc 从源注释生成，源注释写的是开发侧「谁消费/哪个测试钉」，没有剥离；
- `files: lib/**` 把 `lib/types` 全带（见 [BUG-219](BUG-219-pack-types-unexported-dts-overshipped.md)）；
- 发布物扫描缺失（[BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md)），所以 10 个文件一直绿。

## 牵出的失败类

- 发布面 C11 + C2；与 [BUG-224](BUG-224-pack-client-bundle-dev-path-comments.md) 同源（源注释保留），
  但载体是公开类型面。
- 与 219 的修法可并为一件：收窄 `files` 后，仅 7 个公开类型入口需要清注释。

## 修法

1. 源注释改为行为/契约描述，不写 `tests/`/`checks/`/`_backlog/`；或
2. 声明输出阶段剥离注释（确认 `@remarks` 等公开文档不依赖）；
3. 发布物扫描覆盖 `lib/types/**/*.d.ts`，负控同 224。

## 修复判据

- 10 个 `.d.ts`（收窄后 7 个公开入口）零 dev 路径；
- 类型形状/导出不变（`tsc -b` / `typecheck` 绿，`exports.types` 可解析）；
- 发布物扫描在注入 `tests/__gone__.mjs` 时红；`pnpm verify` / `pnpm test` 绿。

## 修复关联

与 [BUG-219](BUG-219-pack-types-unexported-dts-overshipped.md) / [BUG-224](BUG-224-pack-client-bundle-dev-path-comments.md) /
[BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md) 同变更更省。
