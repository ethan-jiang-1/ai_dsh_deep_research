---
status: 修复就绪
severity: P2
opened: 2026-11-17
---

# BUG-235：`lifecycle.entry` 用 PATH 上的全局 `dsh`/`pnpm`——peer 缺口由全局 DSH 兜底，pinned 版本未验

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：修复就绪（自授权 P2：测试边界）
>
> 位置：[checks/smoke/lifecycle.entry.mjs](../../checks/smoke/lifecycle.entry.mjs) 第 12 行
> （「前置：PATH 上有 `dsh` 与 `pnpm`」）、第 84–89 行（`mkdtemp(tmpdir())` + `spawn` `dsh`）、
> 第 193–195 行（`plugin add file:<tarball>`）。探索轮 = [运行时/开发边界卡](../issues/2026-11-17-runtime-deps-install-boundary.md) 第三轮。

## 症状

`lifecycle.entry` 的 home 在 `tmpdir`（好），但安装器是**全局 `dsh`**（PATH），不是 `vendor/dsh` 的钉版：

- 全局 DSH 的 `node_modules` 里有 React / `@deepseek-ai/dsh-client-ui-*` / 实验包；229/230/231 的
  peer 缺口被它补齐；
- 全局 DSH 版本随环境漂移（AGENTS 明确「日用全局安装与本 repo 开发无关；行为不作机制依据」）；
- 安装成功只证明「这个全局 DSH 能装」，不证明「`engines.dsh` 范围内的 DSH 都能装」。

生命周期断言（apply/dispose/roster）本身有价值，但它不是干净室发布验收；release/cold-start 各自补了
home 或钉版的一半（[BUG-233](BUG-233-cold-start-inside-repo-not-clean-room.md) / [BUG-234](BUG-234-release-entry-pins-dev-dsh-home.md)）。

## 分诊与授权

- 严重级：P2 — 测试边界；不阻断 dev，发布面证据不足。
- 表面 / 边界：L2 生命周期安装 / ② 静态（PATH 解析 + 模块供给）
- DSH 不变量：verify the world；版本/依赖边界必须是发布合同的一部分
- 触及面：none（测试调整）
- 授权：自授权（P2 修理型）
- 批：运行时/开发边界第三轮（安装面）

## 复现

复现状态：稳定（读码 + 环境）。

```sh
sed -n '12p;84,89p;193,195p' checks/smoke/lifecycle.entry.mjs
which dsh; dsh --version   # 全局版本，非 vendor tag
```

## 根因（已证）

脚本用 `spawn('dsh', ...)`（PATH）以复用用户安装路径；`pkg` 的 `engines.dsh`/peers 未在测试里被校验。
`mkdtemp` 只隔离 home，不隔离宿主 DSH 的依赖供给；全局 DSH 是「随版本漂移的第三方」——与
`AGENTS.md` 的「全局安装不作机制依据」冲突。

## 牵出的失败类

- 测试边界 C7/C10（安装/发布）；与 233/234 同族，载体是「全局 DSH」。
- 类级方向 = 干净室矩阵 + 断言 `dsh --version` ∈ `engines.dsh` + 安装后依赖解析不经过仓根/全局兜底。

## 修法

1. 用 `vendor/dsh` 的钉版 bin（`--import tsx/esm vendor/dsh/apps/cli/src/bin.ts`）或临时 `npm pack` 的
   DSH 包；`dsh --version` 断言 ∈ `engines.dsh`；
2. 若保留全局模式，改名 `lifecycle/dev` 并对 `dsh --version` 与 peer 完整性做显式记录；
3. 安装后检查 `profile/node_modules` 的解析链，确认 229/230 的 peer 缺口不会被全局兜底掩盖。

## 修复判据

- 默认生命周期测试使用钉版 DSH（或显式分模式）；`dsh --version` 与 `engines.dsh` 对账；
- 缺失 peer 在干净室红/接入后绿；`pnpm test:entry`/`test` 绿；
- 生命周期 apply/dispose/roster 断言不回退。
