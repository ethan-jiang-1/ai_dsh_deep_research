---
status: 已修
severity: P1
opened: 2026-11-15
---

# BUG-192：snapshot-replay 的离线预载仍指搬家前路径——A 层离线闸没装上，required CI job 会红

> 严重级别：P1 ｜ 发现：2026-11-15 ｜ 状态：已修 — 离线预载改 `scripts/lib/harness/` + boot 前缺失 exit 2；分段路径静态守卫（去向：implemented — [批 E Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)，审查：agent — 前置红证 + 静态守卫红绿）（2026-11-16）
>
> 位置：[scripts/smoke/snapshot-replay.entry.mjs](../../../scripts/smoke/snapshot-replay.entry.mjs) 第 78 行
> （`OFFLINE_PRELOAD`）、第 221 行（注入 dsh 子进程的 `NODE_OPTIONS`）；
> 真件 = [scripts/lib/harness/replay-network-offline.cjs](../../../scripts/lib/harness/replay-network-offline.cjs)
> （2026-11-15 `a81f9424` 从 `scripts/lib/` 搬入 `scripts/lib/harness/`）。

## 症状

```js
const OFFLINE_PRELOAD = join(ROOT, 'scripts', 'lib', 'replay-network-offline.cjs'); // ← 已不存在
...
NODE_OPTIONS: [process.env.NODE_OPTIONS, `--require ${OFFLINE_PRELOAD}`].filter(Boolean).join(' '),
```

`--require` 指向不存在的文件时，Node 在加载任何用户代码前就 `MODULE_NOT_FOUND` 退出 1 ——
`bootWeb` 拿到的子进程直接死掉。A 层回放（BUG-064 的离线不变量）因此既没「在线跑」，也没「离线跑」：
连 boot 都起不来。CI 的 required job `snapshot-replay` 用同一入口：
[.github/workflows/ci.yml](../../../.github/workflows/ci.yml) `node scripts/smoke/snapshot-replay.entry.mjs
--read-only --layers a,b --port 3110`。

## 分诊与授权

- 严重级：P1 — 打断产品证据链的 required CI job（A 层回放 = 快照/交付证据的地基）；离线闸失效是
  安全侧不变量（BUG-064 回归）。不阻断普通 `pnpm test`，故非 P0。
- 表面 / 边界：run / ④ 真挂载（boot 前置）——同一 env 形态的最小边界即 `--require` 子进程自检
- DSH 不变量：fail-loud（preload 缺席必须点名，而不是让 boot 以 banner 超时收场）
- 触及面：none（smoke 入口，非门禁/入口链/文档合同）
- 授权：自授权（P1 修理型修复；本卡只报未修）
- 批：第十轮搬家探索 M3 —— 同批 BUG-191…198

## 复现

复现状态：稳定（两条命令，keyless）。

```sh
ls scripts/lib/replay-network-offline.cjs
# ls: No such file or directory
NODE_OPTIONS="--require $PWD/scripts/lib/replay-network-offline.cjs" node -e "console.log('child started')"
# Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/scripts/lib/replay-network-offline.cjs'
# exit 1（不打印 child started）
ls scripts/lib/harness/replay-network-offline.cjs   # 真件在此
```

## 根因（已证）

2026-11-15 的 owner 分层搬家重写了 import 语句，但这条路径是**分段字面量**
（`join(ROOT, 'scripts', 'lib', ...)`），不在 import 图上：

- `repo-conventions` 只扫 `dev/*.sh` 与 `dev/hooks/*` 的 `scripts/…` 字面量；
- `tests/checks/smoke-imports.test.mjs` 只跟 import/require 闭包，且遇到 `.cjs` 目标不递归；
- `tests/run/harness/replay-network-offline.spec.mjs` 读的是**新**路径（它已跟搬），只证明判据文件本身，
  不证明入口把新路径传给了子进程。

根因证据：上面三条命令 + `git log -1 --format=%h a81f9424`（搬家批次）+ 入口第 221 行的
`NODE_OPTIONS` 注入点。这是「消费者面没有跟进」的静默断链（C2/M3），不是离线闸逻辑错误。

## 牵出的失败类

- **M3 非 JS 字面量**：分段路径没有车道；C2 消费者遗忘。
- 同机制第 1 次（本次搬家）；类修方向 = 入口脚本对「传给子进程的路径」做 `existsSync` 前置，
  或在 `repo-conventions` 增加 `join(ROOT, …)` 分段字面量的扫描（与 BUG-191 同批决定）。

## 修法

1. 路径改为 `join(ROOT, 'scripts', 'lib', 'harness', 'replay-network-offline.cjs')`。
2. 在 boot 前加前置断言：`existsSync(OFFLINE_PRELOAD)` 为假 → 打印「离线预载缺席（真因 = 路径搬家未跟）」
   并 `exit 2`（未跑 ≠ 假红），避免未来同类以 banner 超时误诊。

## 修复判据

- `NODE_OPTIONS="--require <新路径>" node -e 1` exit 0；
- `node scripts/smoke/snapshot-replay.entry.mjs --read-only --layers a --port <free>` 能过 boot 阶段
  （离线闸生效：DNS/fetch 出网被拒，loopback 通——同 BUG-064 判据）；
- 负控：把常量指向不存在路径 → exit 2 且消息点名 `OFFLINE_PRELOAD`，不是 `等待启动横幅超时`；
- `pnpm verify` 绿。

## 修复关联

去向：implemented — [批 E 搬家副作用 Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)。
修复已进树；本卡同变更归档。守卫 = `tests/checks/smoke-child-paths.test.mjs`（AST 扫
`join(ROOT, …)` 全字面量路径）；运行前置 = 入口 boot 前 `existsSync(OFFLINE_PRELOAD)`，缺席
exit 2 并点名常量。

## 修复落地（2026-11-16）

前置负控（同入口，未 source）：把常量指回 `scripts/lib/replay-network-offline.cjs` →
`snapshot-replay.entry: 离线预载缺席（OFFLINE_PRELOAD=…）——路径搬家未跟；本次未跑（exit 2）`，
exit 2；恢复后前置通过（随后因 dev profile 不在场 exit 2，未跑 ≠ 通过）。静态守卫红绿见块内。

```json fix-evidence
{
  "changes": [
    "scripts/smoke/snapshot-replay.entry.mjs",
    "tests/checks/smoke-child-paths.test.mjs"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/smoke-child-paths.test.mjs", "exit": 1, "output": "not ok 1 - 子进程/前置的分段路径字面量全部可解析（BUG-192 / BUG-193 类级守卫）；__child-path-probe.mjs: join(ROOT, 'scripts', 'lib', '__moved-probe__.cjs') -> scripts/lib/__moved-probe__.cjs 不存在" },
  "green": { "command": "node --import tsx/esm --test tests/checks/smoke-child-paths.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/smoke-child-paths.test.mjs" }
}
```
