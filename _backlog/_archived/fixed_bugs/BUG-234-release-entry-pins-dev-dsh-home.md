---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-234：`release.entry` 把 DSH_HOME 钉在仓内 `runtime/harness-home`，拒绝非开发 home——安装验收不是干净用户现场

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（自授权 P2：测试边界 + 可执行性） — 结论：release.entry 默认仓外 home + 钉版 dsh（--dev-home 保留旧模式）；清理白名单按模式分判；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-runtime-deps-install-boundary.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 干净室三入口（2026-11-17）
>
> 位置：[checks/smoke/release.entry.mjs](../../../checks/smoke/release.entry.mjs) 第 47–55 行
> （`DSH_HOME` 必须 = `ROOT/runtime/harness-home`，否则 exit 2）与 `dshSrc = process.env.DSH_SRC ?? ROOT`、
> `bin = vendor/dsh/.../bin.ts`。探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-deps-install-boundary.md) 第三轮。

## 症状

`release.entry`（L2 安装/发布验收）明确拒绝仓外 home：

```text
release.entry: refusing non-development DSH_HOME: <home> (source tools/env.sh)
```

它只接受 `runtime/harness-home`，并从 `vendor/dsh` 源码起 `dsh`。因此它验证的是「仓内开发 home + 钉版源码」
的安装路径，不是「用户干净 home + 发布 DSH」的路径。缺失 peer（229/230）在这个 home 的 profile 里可由
仓内/全局依赖补齐；用户换机器/换 DSH 发行时不受此测试保护。

## 分诊与授权

- 严重级：P2 — 安装验收边界；不阻断 dev，但把「发布验收」的适用范围说大了。
- 表面 / 边界：L2 发布安装 / ② 静态（home 约束 + dsh 来源）
- DSH 不变量：verify the world；真入口 = 发布产物 + 干净 profile
- 触及面：none（测试边界；不改产品）
- 授权：自授权（P2 修理型）
- 批：运行时/开发边界第三轮（安装面）

## 复现

复现状态：稳定（读码）。

```sh
sed -n '47,55p' checks/smoke/release.entry.mjs
DSH_HOME=/tmp/whatever node checks/smoke/release.entry.mjs; echo $?   # 2（refusing）
```

## 根因（已证）

为了复用 `runtime/harness-home` 的凭据/模型与 vendor 源码，脚本加了「只许开发 home」的守卫；这让
「release」测试与 dev home 强绑定，无法覆盖用户 home 的依赖供给。`lifecycle.entry` 用了 `tmpdir`
（[BUG-235](BUG-235-lifecycle-uses-global-dsh.md)），但用全局 `dsh`；两个测试各缺一半。

## 牵出的失败类

- 测试边界 C7（安装面假绿）；与 [BUG-233](BUG-233-cold-start-inside-repo-not-clean-room.md) 同族，载体是 L2 安装。
- 类级方向 = 干净室矩阵：home（仓内/仓外）× DSH（vendor 钉版/全局/发布）× pack（源码/tarball）。

## 修法

1. 把 `release.entry` 的 home 改为 `mkdtemp(tmpdir())`，用 `vendor/dsh` 的 tsx 源起（保留钉版）——即
   「仓外 home + 钉版 DSH」；
2. 保留一个显式的 `--dev-home` 模式（当前行为）用于需要既有凭据的端到端；两种模式分名；
3. 断言安装后的 profile 依赖解析链不经过仓根 `node_modules`；对 229/230 的 peer 缺口给红/绿判据；
4. 与 cold-start/lifecycle 统一「干净室」定义（见 BUG-233）。

## 修复判据

- `release.entry` 默认在仓外 home、钉版 DSH 上安装 tarball 并跑验收；
- 非开发 home 不再被拒绝（或改为显式 `--dev-home`）；`pnpm test:entry`/`test` 绿；
- peer 缺口在干净室暴露；安装/卸载/roster 断言不回退。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/smoke/release.entry.mjs",
    "checks/lib/harness/clean-room.mjs",
    "checks/lib/harness/clean-room-policy.mjs",
    "tests/checks/clean-room-policy.test.mjs"
  ],
  "red": {
    "command": "DSH_HOME=/tmp/fake-home node checks/smoke/release.entry.mjs --dev-home",
    "exit": 2,
    "output": "release.entry: refusing non-development DSH_HOME: /tmp/fake-home (source tools/env.sh)（旧行为：非 dev home 一律拒绝）"
  },
  "green": {
    "command": "node checks/smoke/release.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/clean-room-policy.test.mjs"
  }
}
```
