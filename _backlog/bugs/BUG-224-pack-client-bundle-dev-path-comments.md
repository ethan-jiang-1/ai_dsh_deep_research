---
status: 修复就绪
severity: P2
opened: 2026-11-17
---

# BUG-224：发布物 `lib/client.js` 带 12+ 条开发面路径注释（`tests/`、`checks/`、`_backlog/`）

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：修复就绪（自授权 P2：改源注释/构建剥离 + 加扫描）
>
> 位置：`packages/deep-research-pack/lib/client.js`（构建产物，gitignored；随 tarball 发布）
> （构建产物，随 tarball 发布）；源 = `packages/deep-research-pack/src/**`。
> 探索轮 = [运行时/开发边界卡](../issues/2026-11-17-runtime-dev-boundary.md) R3。

## 症状

发布用 client bundle 里保留了源码头注，含开发仓测试/门禁/问题卡路径：

```text
lib/client.js:1348  tests/journal-wire.spec.mjs
lib/client.js:2997  checks/lib/repo/note-scan.mjs（L0 门禁）
lib/client.js:2998  tests/contracts/markdown-mask-conformance.spec.mjs
lib/client.js:3228  tests/run/gates/node-gate-delivery.spec.mjs
lib/client.js:3241  checks/smoke/client-load.entry.mjs
lib/client.js:3242  checks/lib/ops/run-dashboard-core.mjs
lib/client.js:4447/4585/4609/4613  tests/library-fold
lib/client.js:4982  _backlog/issues/2026-10-18-research-method-config-ux.md
```

这些路径在发布物里不存在；注释不是运行期依赖，但发布代码把「开发者去哪看」写给了用户/未来维护者，
且其中 `checks/lib/ops/…` 已是迁移后的旧路径（自身也漂移）。

## 分诊与授权

- 严重级：P2 — 发布物文本边界/可读性；不影响功能。
- 表面 / 边界：发布代码（client bundle 注释）/ ② 静态（构建产物文本）
- DSH 不变量：fail-loud/可发布性 —— 发布物不应引用未发布的开发面
- 触及面：none（注释清理；不改行为/门禁）
- 授权：自授权（P2 修理型）
- 批：运行时/开发边界第一轮（R3）

## 复现

复现状态：稳定。

```sh
grep -nE 'tests/|checks/|_backlog|docs/' packages/deep-research-pack/lib/client.js | wc -l   # 12+
grep -rhoE '(tests|checks|_backlog)/([A-Za-z0-9_./-]+)' packages/deep-research-pack/lib/client.js | sort | uniq -c
```

## 根因（已证）

`src/**` 的头注是开发文档（谁消费、哪个测试钉住），构建保留注释；`files: lib/**` 把它们带进发布物。
没有构建后/打包前的「发布物文本零 dev 路径」扫描（见 [BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md)）。

## 牵出的失败类

- 发布面 C11（开发文档进入发布物）+ C2；与 [BUG-225](BUG-225-pack-dts-dev-path-comments.md) 同源（源注释保留）。
- 修法可选「源注释改写为行为描述」或「构建剥离注释」；前者保可读，后者批量。

## 修法

1. 源注释里的 `tests/…`/`checks/…`/`_backlog/…` 改为行为/契约描述（不写仓内路径），或
2. 构建对 client bundle 剥离注释（确认 sourcemap 不需要这些注释）；
3. 发布物扫描（BUG-227）覆盖 `lib/*.js`，负控 = 注入 `tests/__gone__.mjs` 注释必红。

## 修复判据

- `lib/client.js` 零 `tests/|checks/|_backlog|docs/` 路径；`lib/*.js` 其余入口同样；
- 行为不变（client-load / cockpit 相关测试绿）；`pnpm build` 后重扫为空；
- 发布物扫描在注入路径时红。

## 修复关联

与 [BUG-225](BUG-225-pack-dts-dev-path-comments.md) / [BUG-226](BUG-226-runtime-scripts-config-dev-path-comments.md)
同批（发布物文本）；与 [BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md) 的守卫同变更。
