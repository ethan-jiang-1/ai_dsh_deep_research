---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-104：port-reclaim 对端口上的任意 listener SIGKILL，无进程身份校验——无关服务被冒烟脚本杀掉

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — port-reclaim 先校验 listener 命令行，只杀本仓 DSH web；无关进程拒绝（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`scripts/lib/port-reclaim.mjs`（`listenersOn` + `process.kill(pid,'SIGKILL')`）。

## 症状

`reclaimPort(port)` 只按端口查 LISTEN pid，然后直接 SIGKILL，不校验该 pid 是否是 DSH web /
冒烟自己的进程。用一个无关的 node listener 占端口：

```json
{
  "before": ["65694"],
  "reclaimed": null,
  "childExited": true,
  "childExitCode": null,
  "childSignalCode": "SIGKILL",
  "killedArbitraryListener": true
}
```

无关 listener 被 SIGKILL；`reclaimed=null` 让调用方以为「端口已干净」。

## 复现（keyless，只读外部进程）

```sh
node --import tsx/esm runtime/explore-20261112/port-reclaim-kills-any-listener.mjs
```

脚本自己起一个 `net.createServer` 子进程占 3127，再调 `reclaimPort(3127)`；子进程
`signalCode: "SIGKILL"`。

## 影响与触发面

- 冒烟/probe 默认端口（3103/3104/3116/3124…）若被用户服务/另一个应用占用，脚本会把它杀掉；
- `--port` 允许用户指定任意端口，误传即杀；
- `port-exclusive` 门禁只保证仓库脚本之间不撞端口，不保护外部进程；
- 杀的是无关进程，可能丢未保存数据；且脚本随后正常启动自己的 web，用户不知道为什么服务没了。

## 根因（已证）

- `listenersOn` 只返回 pid；
- `reclaimPort` 对每个 pid 无条件 `SIGKILL`，没有命令行/cwd/进程组/标记校验；
- 注释的「端口所有者 = 各站点」只是约定，不是运行时身份。

## 修法候选（未实施）

1. 杀前读 `ps -o command= -p <pid>`（或 `/proc/<pid>/cmdline`）校验包含 DSH web / 本仓入口；
2. 冒烟启动时写一个 pid/端口锁文件，只杀锁文件对应的进程；
3. 端口被非己方占用时 fail-loud，让用户换端口，不自动杀。

倾向 1/3；本卡不改代码。

## 修复判据

- [ ] 端口上是无关 listener 时，reclaimPort 不杀它并返回明确错误/让用户换端口；
- [ ] 端口上是本仓遗留 DSH web 时仍能收割；
- [ ] lsof 缺席/权限失败语义不变；复现脚本断言按所选修法通过；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明 macOS/Linux `ps` 命令差异；不证明进程组/孙进程的完整身份链；
- 不证明所有冒烟站点的端口占用形态。

## 已落地（2026-11-13）

- 证据 = `tests/run/port-reclaim.test.mjs` 身份判定 + `port-reclaim-policy`。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
