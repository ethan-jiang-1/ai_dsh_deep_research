---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-233：cold-start 在仓内跑——TEMP 在 `runtime/smoke-workspace`、启动走 vendor 源码，缺 peer 可由 repo node_modules 补

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（自授权 P2：测试边界 + 可执行性） — 结论：cold-start 改干净室：仓外 home + 钉版 dsh + _dist tarball + 解析祖先不落仓根；浏览器面归 client-load；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-runtime-deps-install-boundary.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 干净室三入口（2026-11-17）
>
> 位置：[checks/smoke/cold-start.entry.mjs](../../../checks/smoke/cold-start.entry.mjs) 第 21 行
> （`TEMP = join(ROOT,'runtime','smoke-workspace',…)`）与第 48 行（`run-driver.mjs up --bootstrap`）；
> `run-driver` 从 `ROOT/packages` 取 pack、从 `vendor/dsh` 起源码。探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-deps-install-boundary.md) 第三轮。

## 症状

cold-start 声称「独立 DSH_HOME + 独立 profile + 独立端口/状态根」，但：

- `TEMP` 在**仓内** `runtime/smoke-workspace/…`；Node/DSH 的模块解析会一路向上走到仓根
  `node_modules`（根 `devDependencies` 里就有 React、`@deepseek-ai/dsh-client-ui-*`、
  `dsh-experimental-agent-team` 等）；
- `run-driver up --bootstrap` 用 `ROOT/packages/deep-research-pack` 与 `vendor/dsh` 源码，不是 tarball
  安装、也不是用户 DSH。

因此 229/230/231 的 peer 缺口在这个「冷启动」里自动被根 devDeps 补齐；它证明的是「仓内独立 home/profile
能起」，不是「用户拿到 tarball + 自己的 DSH 能起」。名字里的 cold 是 home 冷，不是依赖面冷。

## 分诊与授权

- 严重级：P2 — 测试边界假绿；不阻断运行，但让人误以为安装面已被独立验证。
- 表面 / 边界：L2 冷启动测试 / ② 静态（路径 + 模块解析）
- DSH 不变量：verify the world —— 冷启动必须独立于开发仓的依赖供给
- 触及面：none（测试调整；不改产品）
- 授权：自授权（P2 修理型：测试边界）
- 批：运行时/开发边界第三轮（安装面）

## 复现

复现状态：稳定（读码 + 路径）。

```sh
sed -n '21p;48p' checks/smoke/cold-start.entry.mjs
# TEMP = join(ROOT, 'runtime', 'smoke-workspace', ...)
# spawn(node, [join(ROOT,'tools','channel','run-driver.mjs'), 'up', '--bootstrap'])
ls node_modules/react node_modules/@deepseek-ai/dsh-client-ui-session 2>/dev/null   # 根 devDeps 在场
```

## 根因（已证）

cold-start 设计目标是「不依赖既有 profile/凭据/会话」，不是「不依赖仓内 node_modules」；`run-driver` 是 dev
通道，天然从 `ROOT/packages` 与 `vendor` 起。缺失 peer 在 root `node_modules` 有，故全绿。`release.entry`/
`lifecycle.entry` 才装 tarball，但它们各自也有边界（[BUG-234](BUG-234-release-entry-pins-dev-dsh-home.md) /
[BUG-235](BUG-235-lifecycle-uses-global-dsh.md)）。

## 牵出的失败类

- 测试边界 C7（假绿）：安装面测试的依赖供给不是用户面。
- 类级方向 = 干净室安装测试：tarball + 钉版 DSH + 空 home + 无仓内 node_modules 祖先。

## 修法

1. `TEMP` 改用 `mkdtemp(join(tmpdir(),'dsh-cold-start-'))`，放在仓外；
2. 启动用 tarball 安装到该 home 的 `deep-research` profile（`dsh plugin add file:<tarball>`），而不是
   `run-driver` 的源树；DSH 用钉版 `vendor/dsh` 的 bin（通过 `DSH_SRC`/tsx）或明确记录「用户 DSH 版本」；
3. 加一条断言：`resolve` 的 pack 路径 / 模块解析链**不经过** `ROOT/node_modules`（或用 `NODE_PATH` 隔离）；
4. 与 `release.entry`/`lifecycle.entry` 统一「干净室」定义，避免三个测试三种边界。

## 修复判据

- cold-start 的 home/TEMP 在仓外；pack 来自 tarball；依赖解析不经过仓根 `node_modules`；
- 229/230/231 的缺失 peer 在该测试里暴露（红）或显式接入 peer 后绿；
- `pnpm test:entry`/`pnpm test` 绿；冷启动仍能起 web 并呈交 URL。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/smoke/cold-start.entry.mjs",
    "checks/lib/harness/clean-room.mjs",
    "checks/lib/harness/clean-room-policy.mjs",
    "tests/checks/clean-room-policy.test.mjs"
  ],
  "red": {
    "command": "NODE_PATH=\"$PWD/node_modules\" node checks/smoke/cold-start.entry.mjs",
    "exit": 1,
    "output": "cold-start.entry: 红 — 依赖解析落到仓根 node_modules（不是干净室）：…/node_modules/.pnpm/react@18.3.1/…；…/vendor/dsh/packages/client/ui-primitives/lib/index.js"
  },
  "green": {
    "command": "node checks/smoke/cold-start.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/clean-room-policy.test.mjs"
  }
}
```
