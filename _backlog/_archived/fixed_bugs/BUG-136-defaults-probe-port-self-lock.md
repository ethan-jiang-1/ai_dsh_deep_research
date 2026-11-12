---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-136：defaults-probe 自锁——泄漏的 3124 宿主 + 身份检查 → 拒绝收割、探针永远「未跑」

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — probe 端口冲突自动改用临时端口，finally 整组 SIGKILL；不再被历史宿主自锁（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`probes/behavior/defaults-probe.mjs`（默认 `--port 3124`；boot 用 `bootWeb(..., detached:true)`）
> 与 `scripts/lib/port-reclaim.mjs`（BUG-113 的身份检查）。

## 症状

```
$ node probes/behavior/defaults-probe.mjs
defaults-probe: 端口 3124 预收割失败：端口 3124 的 listener pid 73948 身份不可读
                ——拒绝收割（未确认 ≠ 本仓进程）      (exit 2，未跑)
```

盘上事实：

```
$ lsof -nP -iTCP:3124 -sTCP:LISTEN
node 73948 bowhead … TCP 127.0.0.1:3124 (LISTEN)
$ lsof -p 73948 | grep cwd
cwd … /Users/bowhead/ai_dsh_deep_research     ← 本仓 cwd 的 dsh web 宿主（此前探针/冒烟泄漏）
```

即：**这很可能是本仓此前某次 probe/boot 泄漏的宿主**（cwd = 仓库根、监听 probe 的默认端口），但身份检查
认不出它 → 拒绝收割 → 探针直接 exit 2。探针的默认端口是**固定 3124**，于是它被自己的历史残留永久锁死，
直到有人手工 kill。`--port` 可以绕过，但报错文案没说（只说「拒绝收割」）。

**第二例（本卡实测，失败路径泄漏）**：探针在 3125 上跑出 1 项判定失败（C5）→ exit 1，却**把宿主留在
3125**（pid 81155，cwd=仓根）；紧接着 `--port 3125` 重跑 → 「身份不可读——拒绝收割」exit 2。即**失败退出
不清理宿主**，一次红就把该端口永久占掉（本仓库现在 3124/3125 各有一个这样的宿主）。

## 复现

```sh
lsof -nP -iTCP:3124 -sTCP:LISTEN          # 有本仓 node 宿主时
node probes/behavior/defaults-probe.mjs   # → exit 2「身份不可读——拒绝收割」（未跑）
node probes/behavior/defaults-probe.mjs --port 3125   # 换端口可跑（本卡即用此路径绕过）
```

## 根因（已证）

1. **固定默认端口**：3124 是 probe 的默认值；多个 probe/冒烟都占固定端口族（3117/3123/3124…），残留即冲突；
2. **宿主可泄漏**：`bootWeb(detached:true)` 起的是独立进程组；仅当调用方 finally 里整组 kill 才回收。
   历史 run 被 Ctrl-C/超时/异常打断时宿主留存（本次的 73948 即证据）；
3. **身份检查无法识别自家宿主**：BUG-113 收紧成「身份不可读 = 拒绝收割」（正确的保守），但 probe 没有
   给宿主打**可识别标记**（env/argv/parent-pid/owner 文件），于是自己的遗留被当成陌生人；
4. **无自动退避**：预收割失败直接 exit 2，不尝试「换一个空闲端口」——固定端口的可用性完全依赖人工。

## 影响面

- **探针整条不可跑**（本机实测）；D50 的回归每次都要人先查 3124；
- 同类固定端口探针（`--port 3117` 的 session-replay、3123 的 wave probe 等）共享该风险；
- 「未跑 ≠ 通过」纪律下，探针静默变成永远未跑，比红更难发现（没有红项，只有 exit 2）。

## 修复判据

1. **默认可退避**：端口被占且预收割拒绝时，自动改用内核分配的临时端口（`--port 0` 语义）或扫描下一个
   空闲端口，并在输出里写「已改用 <port>」——不因端口冲突整条未跑；
2. **自家宿主可识别**：boot 时注入标记（如 `DSH_SMOKE_OWNER=<probe name>:<pid>` 环境变量/argv 标记 +
   写 `.owner` 临时文件），`port-reclaim` 见到**本仓标记**的宿主即可安全收割（仍拒绝无标记的陌生进程）；
3. **泄漏兜底**：所有退出路径（含异常/信号）杀进程组；启动时先登记 pid/组，`finally` 按登记收割；
4. 先红后绿：构造「本仓标记的宿主占着默认端口」——修复前 exit 2（红），修复后自动收割或以临时端口跑通；
   「陌生进程占端口」仍 exit 2（保守不回归）；
5. `pnpm test` + `pnpm verify` 绿；文档（guides/66 或 probe 头注）写明 `--port` 与自动退避语义。

## 修复关联

[BUG-113](BUG-113-port-own-listener-overmatch.md)（端口身份精确化）
的**反面后果**：收紧身份后缺少「自家宿主标记 + 退避」。发现方式 = 按上轮遗留「固定端口/孤儿宿主」
面跑真模型探针时撞到（不是代码静态分析）。

## 已落地（2026-11-13）

- 证据 = `probes/behavior/defaults-probe.mjs` 实跑：3124 被占 → 自动 61996 → ALL PASS；61996 已释放。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
