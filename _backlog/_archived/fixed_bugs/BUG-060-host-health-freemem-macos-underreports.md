---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-060：host-health 的 free 判据在 macOS 系统性误报——`os.freemem()` 只算 free pages，client-load 常态 NOT-RUN

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：修复落地 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；可用内存按平台采集（macOS vm_stat 的 free+inactive+speculative+purgeable；Linux MemAvailable，回退 MemFree+Buffers+Cached），采集失败 → null（fail-loud）；本机实测 7931MB vs `os.freemem()` 58MB；`client-load-smoke` 修复后真跑（exit 1 产品断言红，非 NOT-RUN；meta 记录 load 6.3 / free 7134MB / 主机健康=yes）（2026-11-11，去向：none — 机械修复，审查：agent 自审 + 机械门禁）

## 症状

`client-load-smoke`（L0 的浏览器观察面）在本机**常态 NOT-RUN**：

```
client-load-smoke: NOT-RUN — 主机不健康（load 7.77 / free 86MB / 10 CPU：free 86MB < 512MB）
——先释放主机再跑；未跑 ≠ 通过
```

但同一时刻主机完全可用：load/cpu = 0.88（阈值 1.5），macOS 的**可回收内存**约 6.9GB：

| 指标 | 值 |
|---|---|
| `os.freemem()`（判据用的就是这个） | **182 MB** |
| `vm_stat` Pages free（10404 × 16KB） | ≈ 162 MB |
| `vm_stat` Pages **inactive**（430601 页） | ≈ 6.57 GB（**可回收**） |
| `vm_stat` Pages speculative（1201 页） | ≈ 19 MB |
| `vm_stat` Pages purgeable | ≈ 11 MB |

macOS 会把大部分空闲 RAM 用于 cache/inactive，`os.freemem()` 只报 free pages，于是
`minFreeMB = 512` 在开发机上几乎永远不满足 → 该项检查把「主机健康」判成「不健康」。

## 复现

```sh
node -e "const os=require('os'); console.log(Math.round(os.freemem()/1048576),'MB free')"   # 常见 < 512
vm_stat | head -6                                                                          # inactive 往往数 GB
source dev/env.sh && node --import tsx/esm scripts/smoke/client-load-smoke.mjs; echo "exit=$?"
# → exit 2 NOT-RUN（free < 512MB）
```

判据实现：[classifyHostHealth](../../../scripts/lib/host-health.mjs)（`freeMB < 512` 即 unhealthy）；
指标来源：[client-load-smoke](../../../scripts/smoke/client-load.entry.mjs) 的
`freeMB: Math.round(freemem() / 1024 / 1024)`（`node:os`）。

## 根因（已证）

- `os.freemem()` 在 macOS 的语义是「free pages」，不含 inactive / speculative / purgeable；
- 阈值 512MB 是**为 Linux 语义**定的（Linux 的 `MemFree` 也偏低，但 `MemAvailable` 才是可用量）；
- 于是同一句判据在两个平台含义不同：Linux 上大致可用，macOS 上系统性偏严；
- 该判据同时被 `client-load-smoke` 的启动预检与失败收口（`isHostUnhealthyVerdict`）使用，
  误报会把**真实产品红**收口成 NOT-RUN（exit 2）——「未跑 ≠ 通过」在开发机上退化为长期未跑。

## 影响面

- 观察面（驾驶舱）在 macOS 开发机上几乎拿不到机械证据：每次跑都可能直接 NOT-RUN；
- 真实失败被 NOT-RUN 吞掉的风险：`isHostUnhealthyVerdict` 只要求「有失败 + 不健康 + 连接死亡」，
  不健康判据误报时，产品红会被显性化成「环境红」；
- CI（Linux）不一定复现，问题只在开发者机出现——最难被看见的一类。

## 修复判据

1. `freeMB` 改为**平台相关可用量**：macOS 用 `vm_stat` 的 `free + inactive + speculative`（可按需加
   purgeable）；Linux 用 `/proc/meminfo` 的 `MemAvailable`（或至少 `MemFree + Buffers + Cached`）；
   无法测量时保持「unknown → unhealthy」的 fail-loud 语义；
2. 阈值语义写清「可用内存」而非「free pages」，并在 [host-health](../../../scripts/lib/host-health.mjs)
   头注登记平台差异；
3. 判据纯函数 `classifyHostHealth` 不变（仍吃 `freeMB`），新增「指标采集」纯函数并单测
   （喂 macOS/Linux 两种 vm_stat/meminfo 文本）；
4. 先红后绿：用本机实测值复跑 `client-load-smoke`——修复前 NOT-RUN，修复后真跑并给出产品 verdict；
5. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-11）：`scripts/lib/host-health.mjs` 新增 `availableMemoryMBFromVmStat` / `availableMemoryMBFromMeminfo`（纯解析，读不出 → null），`client-load-smoke` 的 `hostFreeMB()` 按平台采集（macOS `vm_stat`、Linux `/proc/meminfo`，其它平台回退 `os.freemem()`；采集异常 → null → fail-loud）。证据 = `tests/run/host-health.test.mjs` BUG-060 三例先红后绿（10/10）；本机对比 = vm_stat 7931MB vs `os.freemem()` 58MB。client-load 复跑 = exit 1（产品断言红：方法库新建流程的 10 条失败；NOT-RUN 已消失，meta 明确 `free 7134MB / 主机健康=yes`）——本卡只修主机判据，产品断言失败不在本卡范围。去向 = none — 机械修复。

原始处置（留档）：修复改变 NOT-RUN 的判定（证据语义），按 [_backlog/AGENTS](../../AGENTS.md) 不由本卡自授权。
与 [BUG-059](BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) 同属「观察面的机械证据在
真实开发机上不可达」这一类：一条是文案 locale，一条是主机资源口径。
