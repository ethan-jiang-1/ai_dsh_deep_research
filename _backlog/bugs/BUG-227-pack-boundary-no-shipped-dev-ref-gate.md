---
status: 等人拍板
severity: P2
opened: 2026-11-17
---

# BUG-227：发布面没有「零 dev 引用」守卫——`doc-paths`/`call-surface` 验仓内存在，`pack.e2e` 只验必需件在场

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：发布面判据缺口。`doc-paths` / `call-surface` 扫仓内 tracked 文本；
> [checks/smoke/pack.e2e.mjs](../../checks/smoke/pack.e2e.mjs) 只断言 tarball 含必需件（第 37 行）；
> `readme-shape` / `content-shape` 只查形状。探索轮 = [运行时/开发边界卡](../issues/2026-11-17-runtime-dev-boundary.md) R4。

## 症状

同一句 `checks/lib/shared/plan-card.mjs`：

- 在**仓内** skill 里 → `doc-paths` 绿（仓内存在）；
- 在**发布 tarball** 里 → 该文件不存在（`package/checks/` 0 条），但没有任何门禁看这一层。

即：所有「发布文本引用开发面」的缺陷（[BUG-220](BUG-220-pack-readme-user-section-dev-smokes.md)–[BUG-226](BUG-226-runtime-scripts-config-dev-path-comments.md)）
都能在 `pnpm verify` / `pnpm test` / `pack.e2e` 全绿的情况下发布出去。

```sh
node checks/verify/verify.mjs --only=doc-paths,call-surface   # 绿
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | grep -c '^package/checks/'   # 0
grep -n "required of" checks/smoke/pack.e2e.mjs                # 只列必需件，不列禁止项
```

## 分诊与授权

- 严重级：P2 — 门禁假绿；发布边界没有机械判据，本次一次就带出 7 类实例。
- 表面 / 边界：发布面门禁 / ② 静态（tarball 解包文本）
- DSH 不变量：fail-loud —— 发布物中不可达的开发引用必须红
- 触及面：门禁与验收合同（新增发布面扫描测试/门禁）
- 授权：等人拍板（门禁触面）
- 批：运行时/开发边界第一轮（R4）

## 复现

复现状态：稳定（只读）。

```sh
# 仓内绿 = 发布面盲区
node checks/verify/verify.mjs --only=doc-paths,call-surface
# tarball 内缺
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | grep -E 'package/(checks|tests|tools|docs)/' | wc -l   # 0
```

## 根因（已证）

现有路径门禁的**存在性 oracle = 开发仓**；它们没有「发布物解包树」模式。`pack.e2e` 是
**必需件在场**型断言（`has(required)`），没有「禁止引用」型断言；`readme-shape`/`content-shape`
是形状判据。三层都没有「shipped text 的引用必须在 shipped 包内可解析」这一条。

## 牵出的失败类

- 发布面 C2/C11 + C7（门禁假绿）；类级方向 = 发布物文本零 dev 引用 + 类型/文件集合对账。
- 同族 = BUG-198（spec 头注旧路径被账本固化）在发布面的镜像：仓内验存在，发布面没人验。

## 修法

新增 `tests/checks/shipped-refs.test.mjs`（或 `pack.e2e` 扩面）：

1. `npm pack` / `tar -xzf _dist/*.tgz` 到临时目录；
2. 扫 `package/**` 的 `.md/.js/.d.ts/.yml/.json`，禁 `checks/|tests/|tools/|probes/|_backlog|docs/|runtime/|notes/|vendor/` 与
   `node checks/|pnpm |npm pack|source tools/env.sh`；允许运行期词（`drt_`、`research_pack_root`、`content/`、`presets/`、`lib/`、`scripts/`、`@deepseek-ai/`）；
3. 断言命中数为 0；负控 = 往临时树 skill 注入 `tests/__gone__.mjs` → 红；正控 = 清空后绿；
4. 防空语料：扫到的文件数下限（防止 tarball 缺席时空转）。

## 修复判据

- 新测试对当前树红（先看到失败），修完 219–226 后绿；
- 负控/正控/防空三态齐；`pnpm verify` / `pnpm test` 绿；
- 不把仓内 `doc-paths` 的存在性 oracle 改坏（开发仓仍绿）。

## 修复关联

与 [BUG-219](BUG-219-pack-types-unexported-dts-overshipped.md)–[BUG-226](BUG-226-runtime-scripts-config-dev-path-comments.md)
同一批；建议 219/228 的文件集合断言与 227 的文本断言同一次评审。
