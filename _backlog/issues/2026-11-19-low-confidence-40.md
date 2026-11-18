---
status: 推敲中
opened: 2026-11-19
---

# 推敲：低置信区 20 卡（第 9 轮）——锁/端口/缓存读写的并发残差

> 立卡：2026-11-19 ｜ 状态：推敲中（20 张卡 320–339） ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> **一句话**：上一轮加了动态端口与启动锁；这一轮专挖**锁/端口/缓存读写的并发残差**，以及 plan 快照、
> threshold 范围、长度计数三个语义浅检。20 张卡，只报不修。

**当前情况：**

- `bf386685` 已修 300–319；active bugs 为空。
- `pnpm verify` / `pnpm test` 绿；cold-start/lifecycle/release/client-load 本机均 ALL PASS。
- 新发现：`boot-run --drift-only` 在 `--drift-only` 分支之前抢 `boot-run.lock`；boot 进程在 web 存活期间持锁，
  所以 `run-driver up` 复用活通道时的漂移检查必 EEXIST（320）。
- boot-run 的 mkdir 锁无 owner/stale；start-lock 的 stale 回收是 rm+mkdir 竞态，release 无 token；
  两套入口两把锁；probe 读键含 MCP、写键不含；端口参数无校验；pickFreePort TOCTOU；trap 无 token。
- plan 快照只拒“与当前文本完全相同”；threshold 在 claims 缺失时退化为全部 evidence；length 仍启发式。

**未决问题：**

- `boot-run --drift-only` 是否应在锁之前；读-only 与启动锁的边界。
- 启动锁 owner token：mkdir 后写 owner 失败、stale 回收竞态、release/trap 的删除权。
- 两套入口是否共享一把锁，或明确“服务端锁 + CLI 客户端锁”的分层。
- probe 缓存读/写键是否由同一函数生成；MCP 写入漏参。
- 端口参数/范围/TOCTOU；固定 env 的 NaN/0。
- plan 快照内容、threshold critical 范围、length 结构块三者的合同粒度。

**下一步：** 320–327/331–339 为运行态/测试，`修复就绪`；328–330 触门禁/合同，`等人拍板`。

## 执行记录（2026-11-19）

| 卡 | 组 | 严重级 | 状态 | 一句话 |
|---|---|---|---|---|
| [BUG-320](../bugs/BUG-320-boot-run-drift-only-lock-regression.md) | 运行态/缓存 | P2 | 修复就绪 | drift-only 在活通道持锁时必失败 |
| [BUG-321](../bugs/BUG-321-boot-run-stale-lock-no-recovery.md) | 运行态/缓存 | P2 | 修复就绪 | boot-run 锁无 stale 回收 |
| [BUG-322](../bugs/BUG-322-start-lock-stale-reclaim-race.md) | 运行态/缓存 | P2 | 修复就绪 | stale 回收竞态可双拿锁 |
| [BUG-323](../bugs/BUG-323-start-lock-future-timestamp-blocks.md) | 运行态/缓存 | P2 | 修复就绪 | 未来时间锁永不过期 |
| [BUG-324](../bugs/BUG-324-start-lock-10min-steals-long-boot.md) | 运行态/缓存 | P2 | 修复就绪 | 10min stale 抢长启动 |
| [BUG-325](../bugs/BUG-325-start-lock-release-removes-new-owner.md) | 运行态/缓存 | P2 | 修复就绪 | 旧持有者 release 删新锁 |
| [BUG-326](../bugs/BUG-326-run-driver-boot-run-two-locks.md) | 运行态/缓存 | P2 | 修复就绪 | run-driver/boot-run 两把锁 |
| [BUG-327](../bugs/BUG-327-probe-cache-mcp-read-write-key-mismatch.md) | 运行态/缓存 | P2 | 修复就绪 | probe 读写键 MCP 不一致 |
| [BUG-328](../bugs/BUG-328-plan-snapshot-same-text-only.md) | plan/语义 | P2 | 等人拍板 | plan 快照只拒同文本 |
| [BUG-329](../bugs/BUG-329-threshold-critical-scope-null.md) | plan/语义 | P2 | 等人拍板 | claims 缺时 threshold 退全部 |
| [BUG-330](../bugs/BUG-330-output-length-heuristic-still.md) | plan/语义 | P2 | 等人拍板 | 长度仍启发式 |
| [BUG-331](../bugs/BUG-331-start-lock-owner-write-failure-leaks.md) | 运行态/缓存 | P2 | 修复就绪 | owner 写失败留锁 |
| [BUG-332](../bugs/BUG-332-start-lock-no-pid-liveness.md) | 运行态/缓存 | P2 | 修复就绪 | 只按时间不按 pid |
| [BUG-333](../bugs/BUG-333-run-driver-port-nan.md) | 运行态/缓存 | P2 | 修复就绪 | --port NaN/0 未校验 |
| [BUG-334](../bugs/BUG-334-cold-start-port-env-nan.md) | 运行态/缓存 | P2 | 修复就绪 | COLD_START_PORT NaN |
| [BUG-335](../bugs/BUG-335-snapshot-port-nan.md) | 运行态/缓存 | P2 | 修复就绪 | snapshot --port NaN |
| [BUG-336](../bugs/BUG-336-client-load-port-nan.md) | 运行态/缓存 | P2 | 修复就绪 | client-load --port NaN |
| [BUG-337](../bugs/BUG-337-boot-run-port-invalid.md) | 运行态/缓存 | P2 | 修复就绪 | DSH_RUN_PORT 未校验 |
| [BUG-338](../bugs/BUG-338-pick-free-port-toctou.md) | 运行态/缓存 | P2 | 修复就绪 | pickFreePort TOCTOU |
| [BUG-339](../bugs/BUG-339-boot-run-trap-removes-new-lock.md) | 运行态/缓存 | P2 | 修复就绪 | trap 删新锁 |

## 基线与负对照

- `pnpm verify` / `pnpm test` 绿；cold-start/lifecycle/release/client-load 全 PASS。
- `boot-run` 锁在 `--drift-only` 之前；`run-driver.mirrorDrift` 调 `boot-run --drift-only`。
- probe 读键 `probeIdentityOf({..., mcp})`，写键 `probeIdentityOf({...})` 无 mcp（327）。
- `acquireStartLock` stale 分支 rm+mkdir；release/trap 无条件删；无 pid liveness；无未来时间下界。
- plan 快照只 `snapText === text`；threshold `criticalEvidence === null` 时全部 evidence；
  length 用 Segmenter/非空行。
- 端口：cold-start 用 `pickFreePort`，snapshot/client-load 用 `--port`/pickFreePort；env/参数无非数字校验；
  boot-run `PORT="${DSH_RUN_PORT:-3083}"`。

## 覆盖地图

| 面 | 状态 | 判定 |
|---|---|---|
| boot-run 锁/drift-only | 已探 → 2 卡 | 320/321 |
| start-lock 竞态/释放 | 已探 → 4 卡 | 322–325 / 331/332/339 |
| 两入口锁/probe 键 | 已探 → 2 卡 | 326/327 |
| plan/threshold/length | 已探 → 3 卡 | 328–330 |
| 端口/TOCTOU | 已探 → 5 卡 | 333–338 |

## 验收标准

1. 320–339 有复现/证据/修法；锁/端口/缓存/plan 四类有判定。
2. 旧场/合法路径豁免写清；实例卡可逐条修。
3. `pnpm verify` / `pnpm test` 绿；本轮不改产品代码。

## 关闭条件

- 20 张卡有去向；锁 owner/stale、probe 键、端口、plan 快照决策落定；
- 覆盖地图更新；审查记录 `审查：agent｜用户｜跳过 — 理由`。

## 范围与排除

**范围**：`tools/channel/{run-driver,boot-run}`、`checks/lib/channel/{start-lock,channel-cache}.mjs`、
`checks/smoke/{cold-start,snapshot-replay,client-load}.entry.mjs`、`checks/lib/gates/{plan-gate,protocol-audit-core}.mjs`。
**排除**：改产品代码/发布配置；真模型/完整 run；重跑 209–319 已闭面；把纯设计边界当 bug（除非合同声明）。

## 判据形状

不适用（本卡不改产品判据；四类判据 = 上表；各卡修复判据自理）。
